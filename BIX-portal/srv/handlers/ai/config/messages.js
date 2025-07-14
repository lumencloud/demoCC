/**
 * AI 시스템 메시지 관리 클래스
 */
class MessageManager {
    constructor() {
        this.messages = {
            // 마스터 에이전트 관련
            masterAgent: {
                templateLoadFailed: "템플릿 로드 실패로 기본 에이전트 선택합니다.",
                responseParsingFailed: "응답 파싱 실패로 기본 에이전트 선택합니다.",
                executionFailed: "실행 오류로 기본 에이전트 선택합니다."
            },
            
            // LLM 서비스 관련
            llmService: {
                callFailed: "AI 서비스를 점검하고 있습니다. 잠시 후 다시 시도해 주세요.",
                timeout: "응답 시간이 초과 되었습니다. 잠시 후 다시 시도해 주세요.",
                serverError: "AI 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요."
            },
            
            // 태스크 매니저 관련
            asyncTaskManager: {
                taskFailed: "요청하신 내용을 확인하고 있습니다. 잠시 후 다시 시도해 주세요.",
                startFailed: "요청을 확인하고 있습니다."
            },
            
            // 에이전트 처리 관련
            agentProcessing: {
                processingFailed: "요청하신 정보를 준비하고 있습니다. 잠시 후 다시 시도해 주세요.",
                dataProcessing: "요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
                navigationFailed: "메뉴 정보를 확인하고 있습니다. 잠시만 기다려 주세요.",
                reportFailed: "보고서를 준비하고 있습니다. 잠시만 기다려 주세요.",
                llmAgentFailed: "답변을 준비하고 있습니다. 잠시만 기다려 주세요."
            },
            
            // 상태 메시지
            status: {
                processing: "processing",
                analyzing: "analyzing", 
                preparing: "preparing",
                completed: "completed",
                error: "error"
            },

            // 작업 상태 관련 메시지
            taskStatus: {
                running: "요청을 처리하고 있습니다.",
                completed: "처리가 완료되었습니다.",
                failed: "요청을 다시 확인하고 있습니다.",
                timeout: "처리 시간이 지연되고 있습니다."
            },

            // 보안 관련 메시지
            security: {
                promptInjectionDetected: "보안 정책 위반으로 요청이 차단되었습니다.",
                unauthorizedAccess: "권한이 없는 접근입니다.",
                suspiciousActivity: "의심스러운 활동이 감지되었습니다."
            }
        };
    }
    
    /**
     * 메시지 가져오기
     * @param {string} category - 카테고리 (masterAgent, llmService 등)
     * @param {string} key - 메시지 키
     * @returns {string} 메시지
     */
    getMessage(category, key) {
        return this.messages[category]?.[key] || "요청을 처리하고 있습니다";
    }
    
    /**
     * 폴백 응답 생성
     * @param {string} agentId - 기본 에이전트 ID
     * @param {string} reason - 이유
     * @returns {Object} 폴백 응답
     */
    createFallbackResponse(agentId, reason) {
        return {
            selected_agent: agentId,
            reason: reason
        };
    }
    
    /**
     * 에러 응답 생성
     * @param {string} status - 상태
     * @param {string} message - 메시지
     * @param {string} error - 에러 정보
     * @returns {Object} 에러 응답
     */
    createErrorResponse(status, message, error = null) {
        const response = {
            status: status,
            content: message
        };
        
        if (error && process.env.NODE_ENV === 'development') {
            response.error = error;
        }
        
        return response;
    }

    /**
     * 에이전트별 폴백 응답 생성
     * @param {string} agentType - 에이전트 타입 (navigation, report, llm)
     * @param {string} agentId - 에이전트 ID
     * @param {string} error - 에러 정보
     * @returns {Object} 에이전트 처리 결과
     */
    createAgentErrorResponse(agentType, agentId, error = null) {
        const messageKey = `${agentType}Failed`;
        return {
            execution_id: this.generateExecutionId(),
            agent_id: agentId,
            status: this.getMessage('status', 'processing'),
            executive_summary: this.getMessage('agentProcessing', messageKey),
            execution_time: {
                start: new Date(),
                end: new Date(),
                seconds: "0.00"
            },
            error: error && process.env.NODE_ENV === 'development' ? error : undefined
        };
    }

    /*
     * 보안 에러 응답 생성
     * @param {string} errorCode - 보안 에러 코드 (예: 'SECURITY_VIOLATION', 'PROMPT_INJECTION')
     * @param {string} message - 사용자에게 표시할 보안 에러 메시지
     * @param {string|null} details - 보안 에러 상세 정보 (선택적, 로깅용)
     * @returns {Object} 표준화된 보안 에러 응답 객체
     */
    createSecurityErrorResponse(errorCode, message, details = null) {
        return {
            execution_id: `security_${Date.now()}`,
            agent_id: 'security_agent',
            status: 'SECURITY_BLOCKED',
            executive_summary: message,
            error_code: errorCode,
            error_details: details,
            execution_time: {
                start: new Date().toISOString(),
                end: new Date().toISOString(),
                seconds: "0.00"
            },
            security_violation: true
        };
    }
    
    /**
     * 실행 ID 생성 (유틸리티)
     * @returns {string} 실행 ID
     */
    generateExecutionId() {
        return 'exec_' + Math.random().toString(36).substring(2, 15);
    }
}

module.exports = new MessageManager();