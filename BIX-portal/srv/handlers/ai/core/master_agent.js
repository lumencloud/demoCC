const messages = require('../config/messages');
const paths = require('../config/paths');
const settings = require('../config/settings');
const aiCoreConnector = require('./ai_core_connector');
const LLMService = require('../llm/llm_service');
const promptService = require('../prompt/prompt_service');
const { createLogger } = require('../util/logger');

/**
 * 마스터 에이전트 - 사용자 인터랙션을 분석하고 적절한 에이전트 선택
 */
class MasterAgent {
    constructor() {
        this.logger = createLogger('master-agent');
        this.logger.info('MasterAgent 생성자 호출');
        
        // LLMService가 클래스인 경우
        // this.llmService = new LLMService();

        // LLMService가 인스턴스인 경우
        this.llmService = LLMService;

        // 초기화 상태
        this.initialized = false;

        // 마스터 에이전트 템플릿 정보
        this.templateInfo = settings.masterAgent.templates.masterAgent;

        // 마스터 에이전트 모델 설정
        this.modelConfig = settings.masterAgent.models.masterAgent;

        // 설정에서 폴백 정보 가져오기
        this.fallbackConfig = settings.masterAgent.fallback.masterAgent;

        // 비동기 초기화
        this.agentList = null;
        this.promptTemplate = null;

        // 초기화 시도 (실패해도 객체는 생성됨)
        this.initialize();
    }

    /**
     * 초기화
     */
    async initialize() {
        try {
            this.logger.info('MasterAgent 초기화 시작');
            
            // 에이전트 목록 로드
            this.agentList = await this._loadAgentList();
            this.logger.info(`에이전트 목록 로드 완료: ${this.agentList.length}개 항목`);
            
            this.initialized = true;
            this.logger.info('MasterAgent 초기화 완료');
        } catch (error) {
            this.logger.error(`MasterAgent 초기화 실패: ${error.message}`);
            throw error;
        }
    }

    /**
     * 에이전트 목록 로드
     * @private
     */
    async _loadAgentList() {
        try {
            const agentListPath = paths.AGENT_LIST_PATH;
            
            this.logger.debug(`에이전트 목록 파일 경로: ${agentListPath}`);
            
            const fs = require('fs');
            
            if (!fs.existsSync(agentListPath)) {
                throw new Error(`에이전트 목록 파일이 존재하지 않습니다: ${agentListPath}`);
            }
            
            const agentListData = fs.readFileSync(agentListPath, 'utf8');
            return JSON.parse(agentListData);
        } catch (error) {
            this.logger.error(`에이전트 목록 로드 오류: ${error.message}`);
            throw new Error(`에이전트 목록 로드 중 오류 발생: ${error.message}`);
        }
    }
    
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
    
    /**
     * 마스터 에이전트 실행
     * @param {string} context - 사용자 컨텍스트 정보
     * @returns {Promise<Object>} 선택된 에이전트 정보
     */
    async execute(context) {
        try {
            this.logger.info('MasterAgent.execute() 메서드 호출됨');
            
            // 입력 검증 및 프롬프트 인젝션 사전 체크
            const preSecurityCheck = this._performSecurityCheck(context);
            if (preSecurityCheck.isBlocked) {
                this.logger.warn('사전 보안 체크에서 차단됨');
                return {
                    selected_agent: this.fallbackConfig.default_agent,
                    reasoning: '보안 정책 위반으로 기본 에이전트 선택',
                    prompt_injection: 'Y',
                    security_reason: preSecurityCheck.reason
                };
            }

            // 초기화 확인
            await this.ensureInitialized();
            
            // 이벤트 타입 기반 에이전트 목록 필터링
            const filteredAgents = this._filterAgentsByEvent(context);
            
            // 필터링된 에이전트가 1개인 경우 직접 라우팅
            if (filteredAgents.length === 1) {
                const agent = filteredAgents[0];
                this.logger.info(`이벤트 타입 기반 직접 라우팅: ${agent.agent_id}`);
                return {
                    selected_agent: agent.agent_id,
                    agent_name: agent.name,
                    agent_description: agent.description,
                    agent_icon_path: agent.icon_path,
                    reasoning: `이벤트 타입 기반 자동 선택: ${agent.name}`
                };
            }
            
            // AI Core에서 마스터 에이전트 템플릿 가져오기
            let templateContent;
            try {
                templateContent = await aiCoreConnector.getPromptTemplate(this.templateInfo);
                this.logger.info('AI Core에서 마스터 에이전트 템플릿 로드 성공');
            } catch (error) {
                this.logger.error(`AI Core 템플릿 로드 실패: ${error.message}`);
                // 템플릿 로드 실패 시 기본 에이전트 선택
                return messages.createFallbackResponse(
                    this.fallbackConfig.default_agent,
                    messages.getMessage('masterAgent', 'templateLoadFailed')
                );
            }
            
            // 변수 대체
            const inputVariables = {
                agent_list: JSON.stringify(this.agentList, null, 2),
                interaction_data: context
            };
            
            // promptService를 사용하여 변수 처리
            const prompt = promptService.processTemplateVars(templateContent, inputVariables);
            this.logger.info(`마스터 에이전트 프롬프트 생성 완료 (${prompt.length}자) - 대상 에이전트: ${filteredAgents.length}개`);
            this.logger.debug('프롬프트 상세 내용', { prompt });
            
            // LLM 호출
            const response = await this.llmService.callLLM(prompt, this.modelConfig);
            
            // JSON 응답 파싱
            try {
                // 응답에서 JSON 부분만 추출 (마크다운 코드 블록이 있을 수 있음)
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                const jsonString = jsonMatch ? jsonMatch[0] : response;
                const result = JSON.parse(jsonString);

                // LLM 응답에서 프롬프트 인젝션 플래그 확인
                if (!result.prompt_injection) {
                    result.prompt_injection = 'N';
                }

                const enhancedResult = this._addAgentInfo(result);
                return enhancedResult;
            } catch (error) {
                this.logger.error('마스터 에이전트 응답 파싱 오류', error);
                this.logger.debug('원본 응답 상세', { response });
                
                // JSON 응답 파싱 실패 시 기본 에이전트 선택
                return messages.createFallbackResponse(
                    this.fallbackConfig.default_agent,
                    messages.getMessage('masterAgent', 'responseParsingFailed')
                );
            }
        } catch (error) {
            this.logger.error(`마스터 에이전트 실행 오류: ${error.message}`);
            
            // 전체 실행 실패 시 기본 에이전트 선택
            return messages.createFallbackResponse(
                this.fallbackConfig.default_agent,
                messages.getMessage('masterAgent', 'executionFailed')
            );
        }
    }

    /**
     * LLM 결과에 에이전트 정보 추가
     * @private
     * @param {Object} llmResult - LLM 원본 응답
     * @returns {Object} 에이전트 정보가 추가된 결과
     */
    _addAgentInfo(llmResult) {
        const selectedAgentId = llmResult.selected_agent;

        // 선택된 에이전트 찾기
        const agentInfo = this.agentList.find(agent => agent.agent_id === selectedAgentId);
        
        if (agentInfo) {
            // 에이전트 정보 추가
            return {
                ...llmResult,
                agent_name: agentInfo.name,
                agent_description: agentInfo.description,
                agent_icon_path: agentInfo.icon_path
            };
        }
        else {
            // 에이전트를 찾을 수 없는 경우 원본 결과 그대로 반환
            this.logger.warn(`에이전트 정보를 찾을 수 없음: ${selectedAgentId}`);
            return llmResult;
        }
    }

    /**
     * 이벤트 타입에 따른 에이전트 필터링
     * @private
     * @param {string} context - 사용자 컨텍스트 정보
     * @returns {Array} 필터링된 에이전트 목록
     */
    _filterAgentsByEvent(context) {
        try {
            // 직접 접근으로 간소화
            let data = context;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            
            // interaction.type에서 이벤트 타입 추출
            const eventType = data.interaction?.type;
            this.logger.info(`이벤트 타입: ${eventType}`);
            
            if (!eventType) {
                this.logger.warn('이벤트 타입을 찾을 수 없음');
                return this.agentList;
            }
            
            // 해당 이벤트를 지원하는 에이전트만 필터링
            const filtered = this.agentList.filter(agent => 
                agent.trigger_events && agent.trigger_events.includes(eventType)
            );
            
            this.logger.info(`${eventType} 이벤트용 에이전트: ${filtered.length}개`);
            
            return filtered.length > 0 ? filtered : this.agentList;
        } catch (error) {
            this.logger.error('에이전트 필터링 오류:', error);
            return this.agentList;
        }
    }
    
    /**
     * 보안 체크 수행
     * @private
     * @param {string} context - 사용자 컨텍스트
     * @returns {Object} 보안 체크 결과
     */
    _performSecurityCheck(context) {
        try {
            // 기본적인 프롬프트 인젝션 패턴 검사
            const suspiciousPatterns = [
                /ignore\s+previous\s+instructions/i,
                /forget\s+everything/i,
                /system\s*:\s*/i,
                /\bprompt\b.*\binjection\b/i,
                /role\s*:\s*system/i,
                /act\s+as\s+if/i,
                /pretend\s+you\s+are/i
            ];
            
            const contextStr = typeof context === 'string' ? context : JSON.stringify(context);
            
            for (const pattern of suspiciousPatterns) {
                if (pattern.test(contextStr)) {
                    return {
                        isBlocked: true,
                        reason: 'suspicious_pattern_detected'
                    };
                }
            }
            
            // 길이 체크 (비정상적으로 긴 입력)
            if (contextStr.length > 50000) {
                return {
                    isBlocked: true,
                    reason: 'input_too_long'
                };
            }
            
            return {
                isBlocked: false,
                reason: null
            };
        } catch (error) {
            this.logger.error('보안 체크 중 오류:', error);
            return {
                isBlocked: false,
                reason: null
            };
        }
    }
}

// 싱글톤 인스턴스 생성 및 내보내기
const masterAgentInstance = new MasterAgent();
module.exports = masterAgentInstance;