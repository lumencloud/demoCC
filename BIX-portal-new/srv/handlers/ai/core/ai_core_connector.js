// srv/handlers/ai/core/ai_core_connector.js
const env = require('../config/env');
const messages = require('../config/messages');
const axios = require('axios');
const { createLogger } = require('../util/logger');

/**
 * SAP AI Core 연결 및 통신을 담당하는 클래스
 */
class AICoreConnector {
    constructor() {
        this.logger = createLogger('ai-core-connector');
        this.AI_API_URL = env.AI_API_URL || 'https://your-ai-api-url.com';
        this.DEPLOYMENT_ID = env.DEPLOYMENT_ID || 'your-deployment-id';
        this.CLIENT_ID = env.CLIENT_ID;
        this.CLIENT_SECRET = env.CLIENT_SECRET;
        this.TOKEN_URL = env.TOKEN_URL || 'https://your-auth-url.com/oauth/token';

        // 템플릿 ID 캐시 (이름_시나리오_버전 -> ID 매핑)
        this.templateIdCache = new Map();
        this.templateCache = new Map();
        this.cacheExpiry = 1000 * 60 * 30; // 30분
    }

    /**
     * OAuth 액세스 토큰 획득
     * @returns {Promise<string>} 액세스 토큰
     */
    async getAccessToken() {
        try {
            // Basic Auth 인증 헤더 생성
            const authString = `${this.CLIENT_ID}:${this.CLIENT_SECRET}`;
            const encodedAuth = Buffer.from(authString).toString('base64');
            
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${encodedAuth}`
            };
            
            const data = new URLSearchParams();
            data.append('grant_type', 'client_credentials');
            
            this.logger.info('액세스 토큰 요청 중...');
            const response = await axios.post(this.TOKEN_URL, data, {
                headers: headers,
                httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
            });
            
            this.logger.info('액세스 토큰 획득 성공');
            return response.data.access_token;
        }
        catch (error) {
            this.logger.error('토큰 획득 실패', error);

            if (error.response) {
                this.logger.error('토큰 요청 응답 상세', {
                    status: error.response.status,
                    data: error.response.data
                });
            }

            throw new Error(`토큰 획득 중 오류 발생: ${error.message}`);
        }
    }
    
    /**
     * AI Core API 호출
     * @param {string} prompt - 프롬프트 텍스트
     * @param {Object} modelConfig - 모델 설정
     * @returns {Promise<string>} AI 모델 응답
     */
    async callAiModel(prompt, modelConfig = {}) {
        try {
            // 액세스 토큰 획득
            const accessToken = await this.getAccessToken();
            
            const url = `${this.AI_API_URL}/v2/inference/deployments/${this.DEPLOYMENT_ID}/completion`;
            
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'ai-resource-group': 'default'
            };
            
            // 모델 설정은 외부에서 모두 제공받음
            const config = modelConfig;
            
            this.logger.info(`AI 프롬프트 생성 완료 (${prompt.length}자)`);
            this.logger.debug('프롬프트 상세 내용', { prompt });
            
            // orchestration 구조에 맞게 페이로드 구성
            const payload = {
                orchestration_config: {
                    module_configurations: {
                        templating_module_config: {
                            template: [
                                {
                                    role: 'user',
                                    content: prompt
                                }
                            ],
                            defaults: {}
                        },
                        llm_module_config: {
                            model_name: config.model_name,
                            model_params: {
                                temperature: config.temperature,
                                max_tokens: config.max_tokens
                            },
                            model_version: config.model_version
                        }
                    }
                },
                input_params: {}
            };

            this.logger.debug('API 요청 준비', { url, model: config.model_name });
            
            const response = await axios.post(url, payload, {
                headers: headers,
                httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
                timeout: 30000 // 30초 타임아웃 추가
            });
            
            this.logger.info('API 호출 성공');
            
            if (response.data && 
                response.data.orchestration_result && 
                response.data.orchestration_result.choices) {
                return response.data.orchestration_result.choices[0].message.content;
            }
            else {
                this.logger.warn('응답 구조가 예상과 다릅니다', { 
                    responseStructure: Object.keys(response.data)
                });
                return JSON.stringify(response.data);
            }
        }
        catch (error) {
            this.logger.error('API 호출 실패', error);

            // 단순한 폴백 메시지 반환
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                this.logger.error('요청 타임아웃 발생');
                
                return messages.getMessage('llmService', 'timeout');
            }
            
            if (error.response && error.response.status >= 500) {
                this.logger.error('서버 오류 발생', { status: error.response.status });
                
                return messages.getMessage('llmService', 'serverError');
            }
            
            throw new Error(`AI 모델 호출 중 오류 발생: ${error.message}`);
        }
    }

    /**
     * 프롬프트 템플릿 ID 조회
     * 이름, 시나리오, 버전을 기반으로 템플릿 ID를 가져옴
     * @param {Object} templateInfo - 템플릿 정보 (name, scenario, version)
     * @returns {Promise<string>} 템플릿 ID
     */
    async getPromptTemplateId(templateInfo) {
        try {
            // 필수 정보 확인
            if (!templateInfo.name || !templateInfo.scenario) {
                throw new Error('템플릿 이름과 시나리오는 필수입니다.');
            }
            
            // 버전 기본값 설정
            const version = templateInfo.version || '0.0.1';
            
            // 캐시 키 생성 (name_scenario_version)
            const cacheKey = `${templateInfo.name}_${templateInfo.scenario}_${version}`;
            
            // 캐시 확인
            if (this.templateIdCache.has(cacheKey)) {
                const cached = this.templateIdCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    this.logger.debug(`템플릿 ID 캐시 히트: ${cacheKey} -> ${cached.id}`);
                    return cached.id;
                }
            }
            
            // 템플릿 메타데이터 조회 URL 구성
            const queryParams = new URLSearchParams({
                name: templateInfo.name,
                scenario: templateInfo.scenario,
                version: version
            }).toString();
            
            const url = `${this.AI_API_URL}/v2/lm/promptTemplates?${queryParams}`;
            
            this.logger.debug(`템플릿 메타데이터 조회 URL: ${url}`);
            
            // 액세스 토큰 획득
            const accessToken = await this.getAccessToken();
            
            const headers = {
                'Authorization': `Bearer ${accessToken}`
            };
            
            const response = await axios.get(url, {
                headers: headers,
                httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
            });
            
            if (response.status !== 200 || !response.data) {
                throw new Error(`템플릿 메타데이터 조회 실패: ${response.status}`);
            }
            
            this.logger.info('템플릿 메타데이터 조회 성공');
            this.logger.debug('템플릿 메타데이터 상세', response.data);
            
            // 응답에서 템플릿 ID 추출
            if (!response.data.resources || response.data.resources.length === 0) {
                throw new Error(`템플릿을 찾을 수 없습니다: ${cacheKey}`);
            }
            
            const templateId = response.data.resources[0].id;
            
            // 캐시 업데이트
            this.templateIdCache.set(cacheKey, {
                id: templateId,
                timestamp: Date.now()
            });
            
            return templateId;
        } catch (error) {
            this.logger.error(`템플릿 ID 조회 오류: ${error.message}`);
            
            if (error.response) {
                this.logger.error('템플릿 메타데이터 API 응답 상세', {
                    status: error.response.status,
                    data: error.response.data
                });
            }
            
            throw new Error(`프롬프트 템플릿 ID 조회 중 오류 발생: ${error.message}`);
        }
    }
    
    /**
     * 프롬프트 템플릿 조회
     * @param {string|Object} templateIdOrInfo - 템플릿 ID 또는 템플릿 정보 객체 (name, scenario, version)
     * @returns {Promise<string>} 템플릿 내용
     */
    async getPromptTemplate(templateInfo) {
        try {
             // 템플릿 ID 조회
             const templateId = await this.getPromptTemplateId(templateInfo);
            
             // 캐시 확인
             if (this.templateCache.has(templateId)) {
                 const cached = this.templateCache.get(templateId);
                 if (Date.now() - cached.timestamp < this.cacheExpiry) {
                     this.logger.debug(`템플릿 콘텐츠 캐시 히트: ${templateId}`);
                     return cached.content;
                 }
             }
             
             this.logger.debug(`프롬프트 템플릿 조회: ${templateId}`);
             
             // AI Core 템플릿 API 엔드포인트
             const url = `${this.AI_API_URL}/v2/lm/promptTemplates/${templateId}`;
             
             this.logger.debug(`템플릿 URL: ${url}`);
             
             // 액세스 토큰 획득
             const accessToken = await this.getAccessToken();
             
             const headers = {
                 'Authorization': `Bearer ${accessToken}`
             };
             
             const response = await axios.get(url, {
                 headers: headers,
                 httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
             });
             
             if (response.status !== 200 || !response.data) {
                 throw new Error(`템플릿 조회 실패: ${response.status}`);
             }
             
             // 디버그 로그
             this.logger.info('템플릿 조회 성공');
             this.logger.debug('템플릿 상세 응답', response.data);
             
             // 응답에서 템플릿 콘텐츠 추출
             if (!response.data.spec || !response.data.spec.template) {
                 throw new Error('템플릿 spec을 찾을 수 없습니다');
             }
             
             // template 배열 확인
             const templateArray = response.data.spec.template;
             if (!Array.isArray(templateArray) || templateArray.length === 0) {
                 throw new Error('템플릿 배열이 비어있습니다');
             }
             
             // 첫 번째 템플릿 항목 사용 (주로 시스템 프롬프트)
             const templateItem = templateArray[0];
             
             // 템플릿 항목에서 content 값 추출
             if (!templateItem.content) {
                 throw new Error('템플릿 콘텐츠를 찾을 수 없습니다');
             }
             
             const templateContent = templateItem.content;
             
             // 캐시 업데이트
             this.templateCache.set(templateId, {
                 content: templateContent,
                 timestamp: Date.now()
             });
             
             return templateContent;
         } catch (error) {
             this.logger.error(`프롬프트 템플릿 조회 오류: ${error.message}`);
             
             if (error.response) {
                 this.logger.error('템플릿 API 응답 상세', {
                     status: error.response.status,
                     data: error.response.data
                 });
             }
             
             throw new Error(`프롬프트 템플릿 조회 중 오류 발생: ${error.message}`);
         }
    }

    /**
     * 템플릿 캐시 무효화
     */
    invalidateCache() {
        this.templateIdCache.clear();
        this.templateCache.clear();
        this.logger.debug('템플릿 캐시 무효화');
    }
}

module.exports = new AICoreConnector();