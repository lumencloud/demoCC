const settings = require('../config/settings');
const aiCoreConnector = require('../core/ai_core_connector');
const { createLogger } = require('../util/logger');

/**
 * 프롬프트 처리 서비스
 */
class PromptService {
    constructor() {
        this.logger = createLogger('prompt-service');
    }
  
    /**
     * 프롬프트 컴포넌트 실행
     * @param {Object} component - 컴포넌트 설정
     * @param {Object} inputs - 현재 스텝의 입력 변수들
     * @param {Function} llmService - LLM 서비스 객체
     * @param {Object} executionContext - 전체 실행 컨텍스트 (동적 템플릿 선택용)
     * @returns {Promise<string>} 실행 결과
     */
    async executePromptComponent(component, inputs, llmService, executionContext = {}) {
        try {
            // 컴포넌트 타입 확인
            if (component.type !== 'prompt') {
                throw new Error(`지원되지 않는 컴포넌트 타입: ${component.type}`);
            }
        
            if (!llmService) {
                throw new Error('LLM 서비스가 제공되지 않았습니다.');
            }
            
            // 스텝 입력값 준비
            const componentInputs = this.prepareComponentInputs(component, inputs);
            
            let prompt;
            
            if (component.template) {
                // 객체 형태의 템플릿 설정만 지원
                if (typeof component.template === 'object') {
                    const templateInfo = this.resolveTemplate(component.template, executionContext);
                    const templateContent = await aiCoreConnector.getPromptTemplate(templateInfo);
                    prompt = this.processTemplateVars(templateContent, componentInputs);
                }
                else {
                    throw new Error('template은 객체 형태만 지원됩니다.');
                }
            }
            else {
                throw new Error('template이 지정되지 않았습니다.');
            }
        
            // 모델 설정 가져오기
            const modelConfig = component.model_config || {};
            
            // LLM 호출
            this.logger.debug('LLM 호출');
            const response = await llmService.callLLM(prompt, modelConfig);
            
            return response;
        } catch (error) {
            this.logger.error(`프롬프트 컴포넌트 실행 오류: ${error.message}`);
            throw new Error(`프롬프트 컴포넌트 실행 중 오류 발생: ${error.message}`);
        }
    }

    /**
     * 템플릿 해결 (동적/정적 통합)
     * @param {Object} templateConfig - 템플릿 설정 객체
     * @param {Object} executionContext - 실행 컨텍스트
     * @returns {Object} 템플릿 정보
     */
    resolveTemplate(templateConfig, executionContext) {
        if (templateConfig.type === 'static') {
            return this.getStaticTemplate(templateConfig);
        }
        else if (templateConfig.type === 'dynamic') {
            return this.getDynamicTemplate(templateConfig, executionContext);
        }
        else {
            throw new Error(`지원되지 않는 템플릿 타입: ${templateConfig.type}. static 또는 dynamic만 지원됩니다.`);
        }
    }

    /**
     * 정적 템플릿 가져오기
     * @param {Object} templateConfig - 템플릿 설정
     * @returns {Object} 템플릿 정보
     */
    getStaticTemplate(templateConfig) {
        const { path } = templateConfig;
        
        if (!path) {
            throw new Error('정적 템플릿에는 path가 필요합니다.');
        }
        
        const templateInfo = this.getTemplateFromSettings(path);
        
        if (!templateInfo) {
            throw new Error(`정적 템플릿을 찾을 수 없습니다: ${path}`);
        }
        
        return templateInfo;
    }

    /**
     * 동적 템플릿 가져오기
     * @param {Object} templateConfig - 템플릿 설정
     * @param {Object} executionContext - 실행 컨텍스트
     * @returns {Object} 템플릿 정보
     */
    getDynamicTemplate(templateConfig, executionContext) {
        const { path } = templateConfig;

        // context_id를 직접 사용
        const contextId = executionContext.context_id || 'default';
        
        // 동적 템플릿 매핑
        const templateKey = `${path}.dynamic`;
        const templateMapping = this.getTemplateFromSettings(templateKey);
        
        if (!templateMapping) {
            throw new Error(`동적 템플릿 매핑을 찾을 수 없습니다: ${templateKey}`);
        }
        
        // 직접 선택
        const selectedTemplate = templateMapping[contextId] || templateMapping.default;
        
        if (!selectedTemplate) {
            throw new Error(`default 템플릿이 정의되지 않았습니다: ${templateKey}`);
        }
        
        this.logger.info(`동적 템플릿 선택: ${contextId} -> ${selectedTemplate.name}`);
        return selectedTemplate;
    }
    
    /**
     * 설정에서 템플릿 정보 가져오기
     * @param {string} templateKey - 템플릿 키 (예: "analysisAgent.static.reportGeneration")
     * @returns {Object|null} 템플릿 정보
     */
    getTemplateFromSettings(templateKey) {
        try {
            const keys = templateKey.split('.');
            let templateInfo = settings.promptTemplates;
            
            for (const key of keys) {
                templateInfo = templateInfo[key];
                if (!templateInfo) {
                    return null;
                }
            }
            
            return templateInfo;
        } catch (error) {
            this.logger.error(`템플릿 키 파싱 오류: ${error.message}`);
            return null;
        }
    }
    
    /**
     * 컴포넌트 입력값 준비
     * @param {Object} component - 컴포넌트 설정
     * @param {Object} inputs - 현재 실행 컨텍스트의 입력값
     * @returns {Object} 처리된 입력값
     */
    prepareComponentInputs(component, inputs) {
        try {
            const componentInputs = {};

            // 정의된 입력 변수 처리
            for (const [key, value] of Object.entries(component.input_variables || {})) {
                let inputValue;
          
                // $input: 접두사가 있는 경우 입력값에서 가져오기
                if (typeof value === 'string' && value.startsWith('$input:')) {
                    const inputKey = value.substring(7); // '$input:' 이후 부분
                    inputValue = inputs[inputKey];
                    
                    if (inputValue === undefined) {
                        this.logger.warn(`입력값에서 '${inputKey}'를 찾을 수 없습니다.`);
                    }
                }
                // $var: 접두사가 있는 경우 변수 참조
                else if (typeof value === 'string' && value.startsWith('$var:')) {
                    const varName = value.substring(5); // '$var:' 이후 부분
                    inputValue = inputs[varName];
                  
                    if (inputValue === undefined) {
                        this.logger.warn(`변수 '${varName}'를 찾을 수 없습니다.`);
                    }
                }
                // 그 외는 직접 값으로 사용
                else {
                    inputValue = value;
                }
          
                // undefined인 경우 빈 문자열로 대체
                componentInputs[key] = (inputValue === undefined) ? '' : inputValue;
            }
        
            return componentInputs;
        } catch (error) {
            this.logger.error(`입력값 준비 오류: ${error.message}`);
            throw new Error(`컴포넌트 입력값 준비 중 오류 발생: ${error.message}`);
        }
    }
    
    /**
     * 템플릿 변수 처리
     * @param {string} template - 템플릿 문자열
     * @param {Object} variables - 변수 객체
     * @returns {string} 변수가 대체된 템플릿
     */
    processTemplateVars(template, variables) {
        try {
            let processedTemplate = template;
        
            // 변수 치환
            for (const [key, value] of Object.entries(variables)) {
                let replacementValue = value;
              
                // replacementValue가 undefined나 null이면 빈 문자열로 대체
                if (replacementValue === undefined || replacementValue === null) {
                    replacementValue = '';
                }
                
                // 변수 치환 패턴
                const patterns = [
                    `{{${key}}}`,   // Mustache 스타일
                    `{{?${key}}}`,  // 조건부 Mustache 스타일
                    `{${key}}`,     // 단순 중괄호
                    `%${key}%`      // 퍼센트 스타일
                ];
                
                // 모든 패턴에 대해 치환
                for (const pattern of patterns) {
                    // 정규표현식 특수문자 이스케이프
                    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    processedTemplate = processedTemplate.replace(
                        new RegExp(escapedPattern, 'g'), 
                        String(replacementValue)
                    );
                }
            }
        
            return processedTemplate;
        } catch (error) {
            this.logger.error(`템플릿 변수 처리 오류: ${error.message}`);
            throw new Error(`템플릿 변수 처리 중 오류 발생: ${error.message}`);
        }
    }
}

module.exports = new PromptService();