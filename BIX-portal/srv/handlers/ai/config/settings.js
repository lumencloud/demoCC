/**
 * AI Agent 설정 매개변수
 */
// 현재 환경
const ENV = process.env.NODE_ENV || 'dev';

// 비즈니스 컨텍스트 정보
const BUSINESS_CONTEXT_SETTINGS = {
    baseInfo: `회사: SK(주) AX (IT SI 기업)
시스템: 차세대 경영정보 시스템 (SAP BTP 기반)
목적: 전사 실적 데이터 통합 및 AI 기반 의사결정 지원
핵심 시스템: ERP, PROMIS(프로젝트 관리), SFDC(영업관리)
주요 모듈: PL 장표, SG&A 관리, 투자상품 관리, AI 시뮬레이션
데이터 흐름: PROMIS→ERP 원가 데이터, SFDC→BTP 영업 데이터 연계
운영 방식: 실적 기반 운영 (추정 데이터 최소화)

실적: 매출, 마진, 인건비, 진척도 등 실제로 일어난 결과 및 이미 발생한 실제 수치
당월 실적: 2025년(현재) 당월까지의 누계 실적
전년 동기 실적: 전년도 동기의 누계 실적
GAP: 당월 누계 실적과 전년 동기 누계 실적의 차이
진척도: 목표 대비 실제 성과가 얼마나 달성되었는지를 백분율로 표현한 지표

추정: 아직 일어나지 않았지만, 실적을 기반으로 특정 시점 이후에 예상되는 수치
확보: 이미 계약이 완료되었거나 수주 확정된 사업기회에서 발생할 것으로 예상되는 매출/마진/BR 등의 수치
미확보: 아직 계약되지 않았지만 Pipeline상 유력하게 추정되는 매출/마진/BR 등의 수치
전년비: 올해 추정과 전년도 한 해 실적과의 비교 수치

하나의 부문에 대한 하위 본부가 데이터로 주어지면 합계는 해당 부문에 대한 값이고,
하나의 Account에 대한 하위 고객사가 데이터로 주어지면 합계는 해당 Account에 대한 값임` // metastore 적용되면 없어질 부분
};

// 로그 설정
const LOGGING_SETTINGS = {
    // 로그 모듈명 설정
    moduleNames: {
        general: 'AI-AGENT',    // INFO, WARN용
        detailed: 'AI-AGENT'    // ERROR, DEBUG용 접두사 (실제로는 AI-AGENT_클래스명)
    },
    // 로그 레벨별 설정
    levels: {
        enableDebug: true,
        enableInfo: true,
        enableWarn: true,
        enableError: true
    }
};

// 진행률 설정
const PROGRESS_SETTINGS = {
    masterAgentComplete: 10,
    agentSelected: 50,
    agentExecuted: 70,
    resultGenerated: 90
};

// 마스터 에이전트 설정
const MASTER_AGENT_SETTINGS = {
    // 템플릿 정보
    template: {
        name: 'master-selector_agent',
        scenario: 'foundation-models',
        version: '1.0.0'
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
            model_params: {
                temperature: 0.3,
                max_tokens: 1000
            },
            model_version: '002'
        },
        stag: {
            model_name: 'gemini-1.5-flash',
            model_params: {
                temperature: 0.3,
                max_tokens: 1000
            },
            model_version: '002'
        },
        prod: {
            model_name: 'gemini-1.5-flash',
            model_params: {
                temperature: 0.3,
                max_tokens: 1000
            },
            model_version: '002'
        }
    }
};

// 프롬프트 템플릿 설정
const PROMPT_TEMPLATE_SETTINGS = {
    // 분석 에이전트 템플릿
    analysisAgent: {
        static: {
            reportGeneration: {
                name: 'analysis_report_generation',
                scenario: 'foundation-models',
                version: '1.0.0'
            },
            goal: {
                name: 'analysis_goal',
                scenario: 'foundation-models',
                version: '1.0.0'
            }
        }
    },
    
    // 일반 질의 에이전트 템플릿
    generalQaAgent: {
        static: {
            termExtractor: {
                name: 'general_qa-term_extractor',
                scenario: 'foundation-models',
                version: '1.0.0'
            },
            answerGenerator: {
                name: 'general_qa-answer_generator',
                scenario: 'foundation-models',
                version: '1.0.0'
            }
        }
    },
    
    // 네비게이션 에이전트 템플릿
    navigatorAgent: {
        static: {
            menuMatcher: {
                name: 'navigator-menu_matcher',
                scenario: 'foundation-models',
                version: '1.0.0'
            }
        }
    },
    
    // 즉답형 에이전트 템플릿
    quickAnswerAgent: {
        static: {
            tableSelector: {
                name: 'quick_answer-table_selector',
                scenario: 'foundation-models',
                version: '1.0.0'
            },
            sqlQueryGenerator: {
                name: 'quick_answer-sql_query_generator',
                scenario: 'foundation-models',
                version: '1.0.0'
            },
            interpretation: {
                name: 'quick_answer-interpretation',
                scenario: 'foundation-models',
                version: '1.0.0'
            }
        }
    },
    
    // 리포트 에이전트 템플릿
    reportAgent: {
        dynamic: {
            'aiReportView': {
                name: 'report_content_weekly',
                scenario: 'foundation-models',
                version: '1.0.0'
            },
            'aiReportBauView': {
                name: 'report_content_weekly',
                scenario: 'foundation-models',
                version: '1.0.0'
            },
            'deliveryMonthlyContent1_1View': {
                name: 'report_content_monthly_now',
                scenario: 'foundation-models',
                version: '1.0.0'
            },
            'deliveryMonthlyContent3_2View': {
                name: 'report_content_monthly_forecast',
                scenario: 'foundation-models',
                version: '1.0.0'
            },
            'aiReportMonthlyAiInsightView': {
                name: 'report_content_monthly_insight',
                scenario: 'foundation-models',
                version: '1.0.0'
            }
        }
    }
};

// 에이전트 분류 설정
const AGENT_CLASSIFICATION_SETTINGS = {
    directLlm: ['visualization_agent'],
    generalQa: ['general_qa_agent'],
    quickAnswer: ['quick_answer_agent'],
    navigation: ['navigator_agent'],
    analysis: ['analysis_agent'],
    reportContent: ['report_content_agent']
};

// 메뉴 설정
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

// 데이터 조회 설정 
const DATA_FETCHER_SETTINGS = {
    apis: {
        'get_actual_m_pl_oi': {
            description: '당월 실적 현황 조회',
            params: ['year', 'month', 'org_id', 'org_tp'],
            handlerPath: '../../pl/api/get_actual_m_pl_oi'
        },
        'get_actual_m_rate_gap_pl_oi': {
            description: '전년동기 대비 목표 진척도 Gap 조회',
            params: ['year', 'month', 'org_id', 'org_tp'],
            handlerPath: '../../pl/api/get_actual_m_rate_gap_pl_oi'
        },
        'get_actual_m_account_sale_pl': {
            description: '당월 고객사 별 매출/마진/마진율 현황 조회',
            params: ['year', 'month', 'org_id', 'org_tp'],
            handlerPath: '../../pl/api/get_actual_m_account_sale_pl'
        },
        'get_actual_m_sale_org_pl': {
            description: '당월 조직 별 매출/마진/마진율 현황 조회',
            params: ['year', 'month', 'org_id', 'org_tp'],
            handlerPath: '../../pl/api/get_actual_m_sale_org_pl'
        },
        'get_actual_m_br_org_detail': {
            description: '당월 조직 별 BR 현황 조회',
            params: ['year', 'month', 'org_id', 'org_tp'],
            handlerPath: '../../pl/api/get_actual_m_br_org_detail'
        },
        'get_actual_m_rohc_org_oi': {
            description: '당월 조직 별 RoHC 현황 조회',
            params: ['year', 'month', 'org_id', 'org_tp'],
            handlerPath: '../../pl/api/get_actual_m_rohc_org_oi'
        },
        'get_ai_forecast_pl': {
            description: '당해년도 추정(연간 목표, 미확보 현황) 조회',
            params: ['year', 'org_id', 'org_tp'],
            handlerPath: '../../pl/api/get_ai_forecast_pl'
        },
        'get_ai_forecast_m_pl': {
            description: '당해년도 월 별 확보 실적 및 미확보 추정 조회',
            params: ['year', 'month', 'org_id', 'org_tp'],
            handlerPath: '../../pl/api/get_ai_forecast_m_pl'
        },
        'get_ai_forecast_deal_pipeline': {
            description: '당월 DealStage 별 Pipeline 현황 조회',
            params: ['year', 'month', 'org_id', 'org_tp'],
            handlerPath: '../../pl/api/get_ai_forecast_deal_pipeline'
        },
        'get_ai_forecast_rodr_pipeline': {
            description: '당월 수주금액 별 Pipeline 현황 조회',
            params: ['year', 'month', 'org_id', 'org_tp'],
            handlerPath: '../../pl/api/get_ai_forecast_rodr_pipeline'
        },
        'get_ai_forecast_deal_type_pl': {
            description: '당월 DealStage 별 사업기회 상세 테이블',
            params: ['year', 'month', 'org_id', 'deal_stage_cd', 'org_tp'],
            handlerPath: '../../pl/api/get_ai_forecast_deal_type_pl'
        },
        'get_actual_m_sga': {
            description: '당월 조직 별 SG&A 현황 조회',
            params: ['year', 'month', 'org_id', 'org_tp'],
            handlerPath: '../../pl/api/get_actual_m_sga'
        },
        'get_actual_m_sale_rodr_org_pl': {
            description: '당월 해당 조직에서 관리하는 Account(고객사) 별 수주액/매출액 현황 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_actual_m_sale_rodr_org_pl'
        },
        'get_ai_agent_view_lead_now': {
            description: '금주 신규 등록된 DT 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_view2'
        },
        'get_ai_agent_view_lead_last': {
            description: '전주 신규 등록된 DT 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_view2'
        },
        'get_ai_agent_view_lost_now': {
            description: '금주 실주된 DT 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_view3'
        },
        'get_ai_agent_view_lost_last': {
            description: '전주 실주된 DT 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_view3'
        },
        'get_ai_agent_view_nego_now': {
            description: '금주 우선협상단계로 진입한 DT 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_view4'
        },
        'get_ai_agent_view_nego_last': {
            description: '전주 우선협상단계로 진입한 DT 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_view4'
        },
        'get_ai_agent_view_contract_now': {
            description: '금주 계약완료된 DT 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_view5'
        },
        'get_ai_agent_view_contract_last': {
            description: '전주 계약완료된 DT 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_view5'
        },
        'get_ai_agent_view_qualified_now': {
            description: '금주 조회된 반기별 입찰 예정 DT 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_view6'
        },
        'get_ai_agent_view_qualified_last': {
            description: ' 전주 조회된 반기별 입찰 예정 DT 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_view6'
        },
        'get_ai_agent_view_bau_lead_now': {
            description: '금주 신규 등록된 BAU 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_bau_view2'
        },
        'get_ai_agent_view_bau_lead_last': {
            description: '전주 신규 등록된 BAU 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_bau_view2'
        },
        'get_ai_agent_view_bau_lost_now': {
            description: '금주 실주된 BAU 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_bau_view3'
        },
        'get_ai_agent_view_bau_lost_last': {
            description: '전주 실주된 BAU 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_bau_view3'
        },
        'get_ai_agent_view_bau_nego_now': {
            description: '금주 우선협상단계로 진입한 BAU 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_bau_view4'
        },
        'get_ai_agent_view_bau_nego_last': {
            description: '전주 우선협상단계로 진입한 BAU 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_bau_view4'
        },
        'get_ai_agent_view_bau_contract_now': {
            description: '금주 계약완료된 BAU 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_bau_view5'
        },
        'get_ai_agent_view_bau_contract_last': {
            description: '전주 계약완료된 BAU 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_bau_view5'
        },
        'get_ai_agent_view_bau_qualified_now': {
            description: '금주 조회된 차주 입찰 예정 BAU 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_bau_view6'
        },
        'get_ai_agent_view_bau_qualified_last': {
            description: '전주 조회된 차주 입찰 예정 BAU 프로젝트 현황 조회',
            params: ['start_date', 'end_date'],
            handlerPath: '../../report/get_ai_agent_bau_view6'
        },
        'get_plan_cstco_by_biz_account': {
            description: '로그인한 사용자가 접근 가능한 조직 목록 조회',
            params: ['year', 'org_id', 'account_cd'],
            handlerPath: '../../pl/api/get_plan_cstco_by_biz_account'
        },
        'get_available_org_list': {
            description: '로그인한 사용자가 접근 가능한 조직 목록 조회',
            params: ['org_name'],
            handlerPath: '../../function/get_available_org_list'
        },
        'get_actual_sale_org_pl': {
            description: '실적PL 매출/마진-조직별 데이터 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_actual_sale_org_pl'
        },
        'get_cstco_by_biz_account': {
            description: '매출/마진-Account 데이터 조회',
            params: ['year', 'month', 'org_id', 'account_cd'],
            handlerPath: '../../pl/api/get_cstco_by_biz_account'
        },
        /*
        'get_actual_sale_account_pl': {
            description: '실적PL 매출/마진-Account 데이터 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_actual_sale_account_pl'
        },
        */
        'get_actual_sale_relsco_pl': {
            description: '실적PL 매출/마진-대내/대외 데이터 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_actual_sale_relsco_pl'
        },
        'get_actual_sale_crov_pl': {
            description: '실적PL 매출/마진-신규/이월 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_actual_sale_crov_pl'
        },
        'get_actual_sga': {
            description: '실적PL SG&A 데이터 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../sga/api/get_actual_sga'
        },
        'get_actual_dt_org_oi': {
            description: '실적PL DT 매출-조직별 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_actual_dt_org_oi'
        },
        'get_cstco_by_biz_account_dt': {
            description: 'DT 매출-Account 데이터 조회',
            params: ['year', 'month', 'org_id', 'account_cd'],
            handlerPath: '../../pl/api/get_cstco_by_biz_account_dt'
        },
        'get_actual_dt_account_oi': {
            description: '실적PL DT 매출-Account 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_actual_dt_account_oi'
        },
        'get_actual_br_org_detail': {
            description: '실적PL BR 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_actual_br_org_detail'
        },
        'get_actual_rohc_org_oi': {
            description: '실적PL RoHC 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_actual_rohc_org_oi'
        },
        'get_forecast_m_pl': {
            description: '월별 추정 미확보PL 데이터 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_forecast_m_pl'
        },
        'get_forecast_pl_pipeline_detail': {
            description: '추정PL 전사 Pipeline 상세 조회',
            params: ['year', 'month', 'org_id', 'type'],
            handlerPath: '../../pl/api/get_forecast_pl_pipeline_detail'
        },
        'get_forecast_pl_pipeline_org_detail': {
            description: '추정PL 부문 Pipeline 상세 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_forecast_pl_pipeline_org_detail',
            category: 'forecast_pl',
            tags: ['forecast', 'pipeline']
        },
        'get_forecast_pl_sale_margin_org_detail': {
            description: '추정PL 매출/마진-조직별 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_forecast_pl_sale_margin_org_detail'
        },
        'get_forecast_pl_sale_margin_account_detail': {
            description: '추정PL 매출/마진-Account 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_forecast_pl_sale_margin_account_detail'
        },
        'get_forecast_pl_sale_margin_crov_detail': {
            description: '추정PL 매출/마진-대내/대외 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_forecast_pl_sale_margin_crov_detail'
        },
        'get_forecast_pl_sale_margin_relsco_detail': {
            description: '추정PL 매출/마진-신규/이월 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_forecast_pl_sale_margin_relsco_detail'
        },
        'get_forecast_dt_org_oi': {
            description: '추정PL DT 매출-조직별 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_forecast_dt_org_oi'
        },
        'get_forecast_dt_account_oi': {
            description: '추정PL DT 매출-Account 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_forecast_dt_account_oi'
        },
        'get_forecast_br_org_detail': {
            description: '추정PL BR 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_forecast_br_org_detail'
        },
        'get_forecast_pl_pipeline_account': {
            description: '추정PL Account 상세 조회',
            params: ['year', 'month', 'org_id'],
            handlerPath: '../../pl/api/get_forecast_pl_pipeline_account',
            category: 'forecast_pl',
            tags: ['forecast', 'pipeline']
        },
        'get_plan_cstco_by_biz_account_dt': {
            description: '추정PL DT 매출-Account 데이터 조회',
            params: ['year', 'month', 'org_id', 'account_cd'],
            handlerPath: '../../pl/api/get_plan_cstco_by_biz_account_dt'
        },
        'get_cstco_by_biz_account_dt': {
            description: '실적PL DT 매출-Account 데이터 조회',
            params: ['year', 'month', 'org_id', 'account_cd'],
            handlerPath: '../../pl/api/get_cstco_by_biz_account_dt'
        },
        'get_plan_account_by_cstco': {
            description: '추정PL Account상세 데이터 조회',
            params: ['year', 'month', 'org_id', 'account_cd', 'type'],
            handlerPath: '../../pl/api/get_plan_account_by_cstco'
        }
    },
    defaultParams: {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        org_id: '5' // MENU_SETTINGS의 기본값과 연동
    }
};

// 에이전트별 현재 환경에 맞는 모델 설정 가져오기
const getModelConfig = (agent) => {
    const envConfig = agent.model[ENV] || agent.model.dev;
    return { ...envConfig };
};
  
module.exports = {
    // 비즈니스 컨텍스트 설정
    businessContext: BUSINESS_CONTEXT_SETTINGS,

    // 로깅 관련 설정
    logging: LOGGING_SETTINGS,

    // 진행률 관련 설정
    progress: PROGRESS_SETTINGS,
    
    // 마스터 에이전트 관련 설정
    masterAgent: {
        templates: {
            masterAgent: MASTER_AGENT_SETTINGS.template
        },
        models: {
            masterAgent: getModelConfig(MASTER_AGENT_SETTINGS)
        },
        fallback: {
            masterAgent: MASTER_AGENT_SETTINGS.fallback
        },
        rawSettings: {
            masterAgent: MASTER_AGENT_SETTINGS
        }
    },
    
    // 프롬프트 템플릿 설정 추가
    promptTemplates: PROMPT_TEMPLATE_SETTINGS,
    
    // 개별 에이전트 설정
    agentClassification: AGENT_CLASSIFICATION_SETTINGS,

    // 메뉴 관련 설정
    menu: {
        settings: MENU_SETTINGS
    },

    // 데이터 조회 관련 설정 
    dataFetcher: DATA_FETCHER_SETTINGS,

    // 공통 유틸리티 
    utils: {
        getModelConfig
    }
};