// srv/handlers/ai/config/settings.js

/**
 * AI Agent 설정 매개변수
 */

// 현재 환경
const ENV = process.env.NODE_ENV || 'dev';

// 마스터 에이전트 설정
const masterAgent = {
    // 템플릿 정보
    template: {
        name: 'master-agent-test',
        scenario: 'foundation-models',
        version: '0.0.1'
    },

    // 폴백 설정 추가
    fallback: {
        default_agent: 'general_qa_agent',
        retry_attempts: 3,
        timeout_ms: 30000
    },

    // 모델 설정
    model: {
        dev: {
            model_name: 'gemini-1.5-flash',
            temperature: 0.3,
            max_tokens: 1000,
            model_version: '002'
        },
        stag: {
            model_name: 'anthropic--claude-3.5-sonnet',
            temperature: 0.3,
            max_tokens: 1000,
            model_version: '2'
        },
        prod: {
            model_name: 'anthropic--claude-3.5-sonnet',
            temperature: 0.3,
            max_tokens: 1000,
            model_version: '2'
        }
    }
};

// 에이전트별 현재 환경에 맞는 모델 설정 가져오기
const getModelConfig = (agent) => {
    const envConfig = agent.model[ENV] || agent.model.dev;
    return { ...envConfig };
};
  
module.exports = {
    // 템플릿 정보
    templates: {
        masterAgent: masterAgent.template
    },

    // 현재 환경에 맞는 모델 설정
    models: {
        masterAgent: getModelConfig(masterAgent)
    },

    // 폴백 설정 추가
    fallback: {
        masterAgent: masterAgent.fallback
    },

    // 원본 설정 (필요 시 접근 가능)
    rawSettings: {
        masterAgent
    },

    // 유틸리티 함수
    getModelConfig
};