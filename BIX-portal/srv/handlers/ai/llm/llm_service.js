const messages = require('../config/messages');
const aiCoreConnector = require('../core/ai_core_connector');
const { createLogger } = require('../util/logger');

/**
 * LLM 서비스 클래스
 */
class LLMService {
    constructor() {
        this.logger = createLogger('llm-service');
        
        // 기본 모델 설정
        this.defaultModelConfig = {
            model_name: 'gemini-1.5-flash',
            model_params: {
                temperature: 0.3,
                max_tokens: 1000
            },
            model_version: '002'
        };
    }

    /**
     * LLM API 호출
     * @param {string} prompt - 프롬프트 텍스트
     * @param {Object} modelConfig - 모델 설정 (기본 설정을 덮어씀)
     * @returns {Promise<string>} LLM 응답
     */
    async callLLM(prompt, modelConfig = {}) {
        try {
            this.logger.info('LLM 호출 시작');
            
            // 기본 설정과 사용자 설정 병합
            const mergedConfig = { ...this.defaultModelConfig, ...modelConfig };

            this.logger.debug('LLM 설정', {
                model: mergedConfig.model_name,
                temperature: mergedConfig.model_params.temperature,
                maxTokens: mergedConfig.model_params.max_tokens
            });
            
            // AI Core 커넥터 호출 (병합된 설정 전달)
            const response = await aiCoreConnector.callAiModel(prompt, mergedConfig);
            
            this.logger.info('LLM 응답 받음');
            return response;
        } catch (error) {
            this.logger.error('LLM 호출 오류', error);
            
            // 에러 발생 시 기본 메시지 반환
            return messages.getMessage('llmService', 'callFailed');
        }
    }
}

module.exports = new LLMService();