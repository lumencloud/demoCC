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
            model_name: 'gpt-4.1-mini',
            temperature: 0.3,
            max_tokens: 1000,
            model_version: '2025-04-14'
        },
        stag: {
            model_name: 'gemini-1.5-flash',
            temperature: 0.3,
            max_tokens: 1000,
            model_version: '002'
        },
        prod: {
            model_name: 'gpt-4.1-mini',
            temperature: 0.3,
            max_tokens: 1000,
            model_version: '2025-04-14'
        }
    }
};

const MENU_SETTINGS = {
    // 기본값 설정
    defaults: {
        org_id: '5'
    },
    
    // item 코드와 한글명 매핑
    itemCodeNames: {
        'org': '조직',
        'account': 'account',
        'relsco': '대내/대외',
        'crov': '신규/이월',
        'task': '과제',
        'lob': 'LOB',
        'deal_stage': 'Deal Stage 기준',
        'month': '월 기준',
        'rodr': '수주금액 기준',
        'member_year': '멤버사 연도별 합계',
        'task_year': '과제 연도별 합계'
    }
};

// 에이전트별 현재 환경에 맞는 모델 설정 가져오기
const getModelConfig = (agent) => {
    const envConfig = agent.model[ENV] || agent.model.dev;
    return { ...envConfig };
};
  
module.exports = {
    // 템플릿 정보
    masterAgent: {
        templates: {
            masterAgent: masterAgent.template
        },
        models: {
            masterAgent: getModelConfig(masterAgent)
        },
        fallback: {
            masterAgent: masterAgent.fallback
        },
        rawSettings: {
            masterAgent
        }
    },

    menu: {
        settings: MENU_SETTINGS
    },

    utils: {
        getModelConfig
    }
};