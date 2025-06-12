// srv/handlers/ai/ai_handler.js
const cds = require('@sap/cds');
const messages = require('./config/messages');
const settings = require('./config/settings');
const masterAgent = require('./core/master_agent');
const agentExecutor = require('./core/agent_executor');
const llmService = require('./llm/llm_service');
const asyncTaskManager = require('./util/async_task_manager');
const dataProcessor = require('./util/data_processor');

module.exports = (srv) => {
    // LLM 서비스 초기화
    agentExecutor.setLLMService(llmService);

    /**
     * 직접 LLM 호출로 처리하는 에이전트
     */
    const handleDirectLlmAgent = async (selectedAgentId, context, llmService, progressCallback) => {
        console.log(`${selectedAgentId}는 직접 LLM 호출로 처리`);
        
        const agentConfigs = {
            'general_qa_agent': {
                prefix: '다음 질문에 상세하게 답변해주세요:\n\n',
                temperature: 0.7,
                maxTokens: 1000
            },
            'visualization_agent': {
                prefix: '다음 데이터 시각화 요청을 처리해주세요:\n\n',
                temperature: 0.4,
                maxTokens: 1000
            }
        };
        
        const config = agentConfigs[selectedAgentId];
        const userInput = context.userInput || JSON.stringify(context);
        
        const startTime = new Date();
        
        // LLM 직접 호출
        const llmResponse = await llmService.callLLM(
            config.prefix + userInput, 
            { 
                temperature: config.temperature, 
                max_tokens: config.maxTokens 
            }
        );
        
        const endTime = new Date();
        const executionTimeSeconds = (endTime - startTime) / 1000;
        
        progressCallback(70);
        
        return {
            execution_id: generateExecutionId(),
            agent_id: selectedAgentId,
            status: 'COMPLETED',
            executive_summary: llmResponse,
            execution_time: {
                start: startTime,
                end: endTime,
                seconds: executionTimeSeconds.toFixed(2)
            }
        };
    };

    /**
     * 즉답형 에이전트 처리
     */
    const handleQuickAnswerAgent = async (selectedAgentId, context, processedData, agentExecutor, progressCallback) => {
        console.log(`${selectedAgentId}는 즉답형 에이전트로 처리`);

        let parsedContext;
        if (typeof context === 'string') {
            try {
                parsedContext = JSON.parse(context);
            } catch (error) {
                console.error("JSON 파싱 오류:", error);
                parsedContext = context;
            }
        }
        else {
            parsedContext = context;
        }

        const userInput = parsedContext.context?.userInput || parsedContext.content?.text;
        
        // 에이전트 실행
        const agentResult = await agentExecutor.executeAgent(selectedAgentId, {
            userInput: userInput
        });
        
        progressCallback(70);
        
        // 결과 포맷팅
        return {
            execution_id: agentResult.execution_id,
            agent_id: agentResult.agent_id,
            status: agentResult.status,
            executive_summary: agentResult.results.final_outputs.final,
            execution_time: {
                start: agentResult.start_time,
                end: agentResult.end_time,
                seconds: agentResult.execution_time_seconds || "N/A"
            },
            execution_stats: agentResult.results.execution_stats
        };
    };
    
    /**
     * 네비게이션 에이전트 처리
     */
    const handleNavigatorAgent = async (selectedAgentId, context, processedData, agentExecutor, progressCallback) => {
        console.log(`${selectedAgentId}는 네비게이션 에이전트로 처리`);
        
        // 메뉴 리스트 데이터 로드
        const menuData = dataProcessor.loadMenuListData();

        let parsedContext;
        if (typeof context === 'string') {
            try {
                parsedContext = JSON.parse(context);
            } catch (error) {
                console.error("JSON 파싱 오류:", error);
                parsedContext = context;
            }
        }
        else {
            parsedContext = context;
        }

        const userInput = parsedContext.context?.userInput || parsedContext.content?.text;
        
        // 에이전트 실행
        const agentResult = await agentExecutor.executeAgent(selectedAgentId, {
            userInput: userInput,
            data: JSON.stringify(menuData)
        });
        
        progressCallback(70);
        
        // 결과 포맷팅
        return {
            execution_id: agentResult.execution_id,
            agent_id: agentResult.agent_id,
            status: agentResult.status,
            executive_summary: dataProcessor.enhanceNavigatorResult(agentResult.results.final_outputs.final),
            execution_time: {
                start: agentResult.start_time,
                end: agentResult.end_time,
                seconds: agentResult.execution_time_seconds || "N/A"
            },
            execution_stats: agentResult.results.execution_stats
        };
    };

    /**
     * 리포트 에이전트 처리
     */
    const handleReportAgent = async (selectedAgentId, context, processedData, agentExecutor, progressCallback) => {
        console.log(`${selectedAgentId}는 에이전트 실행으로 처리`);
        
        // 입력 데이터 추출
        const selectedItem = dataProcessor.extractData(context, 'grid', 'selectedItem');
        const params = dataProcessor.extractData(context, 'grid', 'params');
        const functionName = dataProcessor.extractData(context, 'grid', 'functionName');

        // 백그라운드 정보 생성
        const backgroundInfo = generateBackgroundInfo(selectedItem, context);
        
        // 에이전트 실행
        const agentResult = await agentExecutor.executeAgent(selectedAgentId, {
            function_name: functionName,
            function_params: params,
            filter_type: selectedItem,
            selected_info: JSON.stringify(processedData.agentInput),
            key_definition: backgroundInfo
        });
        
        progressCallback(70);
        
        // 결과 포맷팅
        return {
            execution_id: agentResult.execution_id,
            agent_id: agentResult.agent_id,
            status: agentResult.status,
            executive_summary: agentResult.results.final_outputs.final,
            execution_time: {
                start: agentResult.start_time,
                end: agentResult.end_time,
                seconds: agentResult.execution_time_seconds || "N/A"
            },
            execution_stats: agentResult.results.execution_stats
        };
    };

    /**
     * 백그라운드 정보 생성
     */
    const generateBackgroundInfo = (selectedItem, context) => {
        const keyDefinitions = {
            "매출": "실제 수익으로 인정되는 확정 금액",
            "마진": "매출액에서 원가를 제외한 순이익",
            "마진율": "매출액 대비 마진의 비율",
            "SG&A": "해당 조직 발생 간접 비용(NB 인건비, 경비)",
            "공헌이익": "매출에서 변동비를 제외하고 남는 금액으로, 조직의 고정비 부담을 커버하고 추가 이익을 창출하는 데 기여하는 핵심 지표",
            "영업이익": "매출에서 원가와 SG&A를 제외한 기업의 본업에서 발생한 이익",
            "DT매출/마진": "AI/Data 기술 기반의 디지털 전환 사업에서 발생하는 매출/마진, AI 기반 프로젝트",
            "Offshoring(MM 비례 절감액)": "AGS 인력을 활용한 비용 효율화 방식, 국내 BP(외주) 사용대비 AGS(해외개발인력)을 통한 효율 비용",
            "Non-M/M": "구독형 서비스, 기존 수주 베이스가 아닌 사업",
            "BR": "BR(Billing Rate)은 프로젝트에 참여한 인력의 투입 비율과 인건비 수준을 반영하여, 각 인력이 프로젝트에 얼마만큼의 비용 가치를 기여했는지를 계산하는 지표",
            "RoHC": "당생산성을 의미하며, 구성원 한 명이 얼마만큼의 매출을 만들어내는지를 나타내는 지표",
            "OR/UR/Normal": "OR (Over Run): 초기 계획보다 기간이나 비용이 초과된 상태 → 손해 발생 가능. UR (Under Run): 초기 계획보다 빠른 완료 또는 예산 절감 → 마진 증가. Normal: 계획대로 마무리된 경우",
            "EXPENSE": "경비, 사업 수행을 위해 발생하는 일반적 운영비용으로, SG&A에 포함되는 간접 비용",
            "INVEST": "투자비, 당장은 매출에 마이너스가 되지만 추후 더 큰 이익을 기대하고 사용하는 비용",
            "LABOR": "인건비, 프로젝트를 수행하는 사내 및 외주 인력 등에게 지급되는 비용",
            "수주": "고객사와 새롭게 진행하기로 계약한 프로젝트의 금액으로, 아직 프로젝트를 시작하지는 않아서 매출에 잡히지는 않음",
            "수주 건수": "새로운 프로젝트를 진행할 것으로 계약을 끝낸 건의 개수"
        };

        const baseInfo = `우리 회사는 IT SI기업입니다.\n프로젝트 목적: 전사 차원의 실적 데이터 통합 및 AI 기반 의사결정 지원 시스템 구축`;

        if (selectedItem) {
            const key = JSON.parse(context).context.grid.selectedItem;
            const definition = keyDefinitions[key];
            return `${baseInfo}\n\n${key}의 정의: ${definition}`;
        }

        return baseInfo;
    };

    /**
     * 실행 ID 생성
     */
    const generateExecutionId = () => {
        return 'exec_' + Math.random().toString(36).substring(2, 15);
    };

    // 작업 시작 API
    srv.on('process_interaction', async (req) => {
        try {
            const { context } = req.data;

            // 데이터 처리
            const processedData = dataProcessor.processInteractionData(context);

            // 새 작업 생성
            const taskId = asyncTaskManager.createTask();
            
            // 비동기로 작업 실행
            asyncTaskManager.startTask(taskId, async (taskId, progressCallback) => {
                try {
                    const totalStartTime = new Date();

                    // 마스터 에이전트 실행
                    progressCallback(10);
                    const masterResult = await masterAgent.execute(context);
                    
                    progressCallback(50);
                    const selectedAgentId = masterResult.selected_agent;
                    console.log(`선택된 에이전트: ${selectedAgentId}`);
                    
                    let formattedResult;
                    
                    // 일부 에이전트들은 LLM 직접 호출
                    const directLlmAgents = ['general_qa_agent', 'visualization_agent'];
                    const quickAnswerAgent = ['quick_answer_agent'];
                    const navigationAgent = ['navigator_agent'];
                    const reportAgent = ['report_agent'];
                    
                    try {
                        if (quickAnswerAgent.includes(selectedAgentId)) {
                            // 즉답형 에이전트 처리
                            formattedResult = await handleQuickAnswerAgent(selectedAgentId, context, processedData, agentExecutor, progressCallback);
                        }
                        else if (navigationAgent.includes(selectedAgentId)) {
                            // 네비게이션 에이전트 처리
                            formattedResult = await handleNavigatorAgent(selectedAgentId, context, processedData, agentExecutor, progressCallback);
                        }
                        else if (reportAgent.includes(selectedAgentId)) {
                            // 보고서 에이전트 처리
                            formattedResult = await handleReportAgent(selectedAgentId, context, processedData, agentExecutor, progressCallback);
                        }
                        else {
                            formattedResult = await handleDirectLlmAgent(selectedAgentId, context, llmService, progressCallback);
                        }
                    } catch (agentError) {
                        console.error(`에이전트 처리 오류 (${selectedAgentId}):`, agentError);
                        // 에이전트 타입별 에러 처리
                        let agentType = 'llm';  // 기본값

                        if (navigationAgent.includes(selectedAgentId)) {
                            agentType = 'navigation';
                        }
                        else if (reportAgent.includes(selectedAgentId)) {
                            agentType = 'report';
                        }
                        
                        // messages 사용하여 에이전트별 에러 응답 생성
                        formattedResult = messages.createAgentErrorResponse(agentType, selectedAgentId, agentError.message);
                    }
                    
                    const totalEndTime = new Date();
                    const totalExecutionSeconds = (totalEndTime - totalStartTime) / 1000;
                    
                    console.log('처리 완료', { 
                        agentId: selectedAgentId,
                        status: formattedResult.status,
                        totalTime: `${totalExecutionSeconds.toFixed(2)}초`
                    });
                    
                    // 최종 결과 생성
                    const result = {
                        master_result: masterResult,
                        agent_result: formattedResult,
                        total_execution_time: {
                            start: totalStartTime.toISOString(),
                            end: totalEndTime.toISOString(),
                            seconds: totalExecutionSeconds.toFixed(2)
                        }
                    };
                    
                    progressCallback(90);
                    return JSON.stringify(result);
                    
                } catch (innerError) {
                    // 내부 실행 전체 실패 시 기본 응답 반환
                    console.error('내부 작업 실행 오류:', innerError);

                    const fallbackResult = {
                        master_result: messages.createFallbackResponse(
                            settings.fallback.masterAgent.default_agent,
                            messages.getMessage('masterAgent', 'executionFailed')
                        ),
                        agent_result: messages.createErrorResponse(
                            messages.getMessage('status', 'analyzing'),
                            messages.getMessage('agentProcessing', 'dataProcessing'),
                            innerError.message
                        ),
                        total_execution_time: {
                            start: new Date().toISOString(),
                            end: new Date().toISOString(),
                            seconds: "0.00"
                        }
                    };

                    return JSON.stringify(fallbackResult);
                }
            }).catch(error => {
                console.error('작업 실행 오류:', error);
        
                // 메시지 매니저 사용
                const fallbackTaskId = `fallback_${Date.now()}`;
                
                return { 
                    taskId: fallbackTaskId,
                    error: true,
                    message: messages.getMessage('asyncTaskManager', 'startFailed')
                };
            });
            
            return { taskId: taskId };
        } catch (error) {
            console.error('작업 시작 오류:', error);
            
            // 작업 시작 자체가 실패한 경우에도 기본 응답 반환
            const fallbackTaskId = `fallback_${Date.now()}`;
            return { 
                taskId: fallbackTaskId,
                error: true,
                message: "작업 시작 중 오류가 발생했습니다."
            };
        }
    });

    // 작업 진행 상태 확인 API
    srv.on('check_task_status', async (req) => {
        try {
            const { taskId } = req.data;
            return asyncTaskManager.getTaskStatus(taskId);
        } catch (error) {
            console.error('상태 확인 오류:', error);
            throw new Error(`상태 확인 중 오류 발생: ${error.message}`);
        }
    });
};