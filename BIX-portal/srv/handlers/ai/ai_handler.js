const cds = require('@sap/cds');
const messages = require('./config/messages');
const settings = require('./config/settings');
const masterAgent = require('./core/master_agent');
const agentExecutor = require('./core/agent_executor');
const llmService = require('./llm/llm_service');
const asyncTaskManager = require('./util/async_task_manager');
const dataProcessor = require('./util/data_processor');
const { createLogger } = require('./util/logger');
const get_ai_content = require('./api/get_ai_content');
const check_user_auth = require('../function/check_user_auth');

module.exports = (srv) => {
    const logger = createLogger('ai-handler');
    
    // Settings에서 설정 가져오기
    const agentConfig = settings.agentClassification;
    const progressConfig = settings.progress;
    const businessConfig = settings.businessContext;

    // LLM 서비스 초기화
    agentExecutor.setLLMService(llmService);

    /**
     * 비즈니스 컨텍스트 정보 가져오기
     */
    const getBusinessContextInfo = () => {
        return businessConfig.baseInfo;
    };

    /**
     * 직접 LLM 호출로 처리하는 에이전트
     */
    const handleDirectLlmAgent = async (selectedAgentId, context, llmService, progressCallback) => {
        logger.info(`${selectedAgentId} 직접 LLM 호출로 처리`);
        
        const agentConfigs = {
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
        
        progressCallback(progressConfig.agentExecuted);
        
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

    /*
     * 일반질의 에이전트 처리
     */
    const handleGeneralQaAgent = async (selectedAgentId, context, processedData, agentExecutor, progressCallback) => {
        logger.info(`${selectedAgentId} 일반질의 에이전트로 처리`);

        let parsedContext;
        if (typeof context === 'string') {
            try {
                parsedContext = JSON.parse(context);
            } catch (error) {
                logger.error("JSON 파싱 오류:", error);
                parsedContext = context;
            }
        }
        else {
            parsedContext = context;
        }

        const userInput = parsedContext.context?.userInput || parsedContext.content?.text;
        
        // 에이전트 실행
        const agentResult = await agentExecutor.executeAgent(selectedAgentId, {
            user_input: userInput,
            business_context: getBusinessContextInfo()
        });
        
        progressCallback(progressConfig.agentExecuted);
        
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
     * 즉답형 에이전트 처리
     */
    const handleQuickAnswerAgent = async (selectedAgentId, context, processedData, agentExecutor, progressCallback) => {
        logger.info(`${selectedAgentId} 즉답형 에이전트로 처리`);

        let parsedContext;
        if (typeof context === 'string') {
            try {
                parsedContext = JSON.parse(context);
            } catch (error) {
                logger.error("JSON 파싱 오류:", error);
                parsedContext = context;
            }
        }
        else {
            parsedContext = context;
        }

        const userInput = parsedContext.context?.userInput || parsedContext.content?.text;
        
        // 에이전트 실행
        const agentResult = await agentExecutor.executeAgent(selectedAgentId, {
            user_input: userInput
        });
        
        progressCallback(progressConfig.agentExecuted);
        
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
        logger.info(`${selectedAgentId} 네비게이션 에이전트로 처리`);
        
        let parsedContext;
        if (typeof context === 'string') {
            try {
                parsedContext = JSON.parse(context);
            } catch (error) {
                logger.error("JSON 파싱 오류:", error);
                parsedContext = context;
            }
        }
        else {
            parsedContext = context;
        }

        const userInput = parsedContext.context?.userInput || parsedContext.content?.text;
        
        // 에이전트 실행
        const agentResult = await agentExecutor.executeAgent(selectedAgentId, {
            user_input: userInput
        });
        
        progressCallback(progressConfig.agentExecuted);
        
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
     * 현황분석 에이전트 처리
     */
    const handleAnalysisAgent = async (selectedAgentId, context, processedData, agentExecutor, progressCallback) => {
        logger.info(`${selectedAgentId} 현황분석 에이전트로 처리`);
        
        // 입력 데이터 추출
        const gridId = dataProcessor.extractData(context, 'grid', 'id');
        const selectedItem = dataProcessor.extractData(context, 'grid', 'selectedItem');
        const params = dataProcessor.extractData(context, 'grid', 'params');
        const functionName = dataProcessor.extractData(context, 'grid', 'functionName');

        // 백그라운드 정보 생성
        const backgroundInfo = generateBackgroundInfo(selectedItem, context);

        // 선택한 행 데이터 추출
        const selectedInfo = processedData.agentInput;
        
        // 에이전트 실행
        const agentResult = await agentExecutor.executeAgent(selectedAgentId, {
            table_name: gridId,
            function_name: functionName,
            function_params: params,
            filter_type: selectedItem,
            selected_info: JSON.stringify(selectedInfo),
            key_definition: backgroundInfo
        });
        
        progressCallback(progressConfig.agentExecuted);
        
        // 결과 포맷팅
        return {
            execution_id: agentResult.execution_id,
            agent_id: agentResult.agent_id,
            status: agentResult.status,
            executive_summary: (agentResult.results.final_outputs.final).replace(/\*/g, ""),
            execution_time: {
                start: agentResult.start_time,
                end: agentResult.end_time,
                seconds: agentResult.execution_time_seconds || "N/A"
            },
            execution_stats: agentResult.results.execution_stats
        };
    };

    /**
     * 보고서 에이전트 처리
     */
    const handleReportAgent = async (selectedAgentId, context, processedData, agentExecutor, progressCallback) => {
        logger.info(`${selectedAgentId} 보고서 에이전트로 처리`);
        
        let parsedContext;
        if (typeof context === 'string') {
            try {
                parsedContext = JSON.parse(context);
            } catch (error) {
                logger.error("JSON 파싱 오류:", error);
                parsedContext = context;
            }
        }
        else {
            parsedContext = context;
        }

        const userInput = parsedContext.context?.userInput || parsedContext.content?.text;
        
        // 에이전트 실행
        const agentResult = await agentExecutor.executeAgent(selectedAgentId, {
            user_input: userInput
        });
        
        progressCallback(progressConfig.agentExecuted);
        
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
     * 보고서 컨텐츠 에이전트 처리
     */
    const handleReportContentAgent = async (selectedAgentId, context, processedData, agentExecutor, progressCallback) => {
        logger.info(`${selectedAgentId} 보고서 컨텐츠 에이전트로 처리`);
        
        let parsedContext;
        if (typeof context === 'string') {
            try {
                parsedContext = JSON.parse(context);
            } catch (error) {
                logger.error("JSON 파싱 오류:", error);
                parsedContext = context;
            }
        } else {
            parsedContext = context;
        }
    
        // 필요한 데이터만 전달
        const reportInputs = {
            // table_names: parsedContext.context?.table_names || [],
            table_names: ["actualSaleMarginDetailTable1", "actualSaleMarginDetailTable2"],    // 임시
            functions: parsedContext.context?.functions || [],
            global_params: parsedContext.context?.global_params || {},
            context_id: parsedContext.context?.id || 'default'
        };
    
        // 에이전트 실행
        const agentResult = await agentExecutor.executeAgent(selectedAgentId, reportInputs);
        
        progressCallback(progressConfig.agentExecuted);
        
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
        // Settings에서 비즈니스 컨텍스트 정보 사용
        const baseInfo = businessConfig.baseInfo;

        // [삭제 예정] 키 정의 (메타스토어)
        const keyDefinitions = {
            "매출": "실제 수익으로 인정되는 확정 금액 (금액)",
            "마진": "매출액에서 원가를 제외한 순이익 (금액)",
            "마진율": "매출액 대비 마진의 비율 (비율) ",
            "SG&A": "해당 조직 발생 간접 비용(NB 인건비, 경비) (금액)",
            "공헌이익": "매출에서 변동비를 제외하고 남는 금액으로, 조직의 고정비 부담을 커버하고 추가 이익을 창출하는 데 기여하는 핵심 지표",
            "영업이익": "매출에서 원가와 SG&A를 제외한 기업의 본업에서 발생한 이익",
            "DT매출/마진": "AI/Data 기술 기반의 디지털 전환 사업에서 발생하는 매출/마진, AI 기반 프로젝트 (금액)",
            "Offshoring(MM 비례 절감액)": "AGS 인력을 활용한 비용 효율화 방식, 국내 BP(외주) 사용대비 AGS(해외개발인력)을 통한 효율 비용",
            "Non-M/M": "구독형 서비스, 기존 수주 베이스가 아닌 사업",
            "BR(MM)": "BR(Billing Rate)은 프로젝트에 참여한 인력의 투입 비율과 인건비 수준을 반영하여, 각 인력이 프로젝트에 얼마만큼의 비용 가치를 기여했는지를 계산하는 지표 (비율)",
            "BR(Cost)": "BR(Billing Rate)은 프로젝트에 참여한 인력의 투입 비율과 인건비 수준을 반영하여, 각 인력이 프로젝트에 얼마만큼의 비용 가치를 기여했는지를 계산하는 지표 (비율)",
            "RoHC": "인당생산성을 의미하며, 구성원 한 명이 얼마만큼의 매출을 만들어내는지를 나타내는 지표 (비율)",
            "OR/UR/Normal": "OR (Over Run): 초기 계획보다 기간이나 비용이 초과된 상태 → 손해 발생 가능. UR (Under Run): 초기 계획보다 빠른 완료 또는 예산 절감 → 마진 증가. Normal: 계획대로 마무리된 경우",
            // "EXPENSE": "경비, 사업 수행을 위해 발생하는 일반적 운영비용으로, SG&A에 포함되는 간접 비용",
            // "INVEST": "투자비, 당장은 매출에 마이너스가 되지만 추후 더 큰 이익을 기대하고 사용하는 비용",
            // "LABOR": "인건비, 프로젝트를 수행하는 사내 및 외주 인력 등에게 지급되는 비용",
            "경비": "사업 수행을 위해 발생하는 일반적 운영비용으로, SG&A에 포함되는 간접 비용 (금액)",
            "투자비": "당장은 매출에 마이너스가 되지만 추후 더 큰 이익을 기대하고 사용하는 비용 (금액)",
            "인건비": "프로젝트를 수행하는 사내 및 외주 인력 등에게 지급되는 비용 (금액)",
            "수주": "고객사와 새롭게 진행하기로 계약한 프로젝트의 금액으로, 아직 프로젝트를 시작하지는 않아서 매출에 잡히지는 않음 (금액)",
            "건수": "새로운 프로젝트를 진행할 것으로 계약을 끝낸 건의 개수 (개수)"
        };

        if (selectedItem) {
            let key = JSON.parse(context).context.grid.selectedItem;
            if (key === "EXPENSE"){
                key = "경비"
            }
            else if (key === "INVEST"){
                key = "투자비"
            }
            else if (key === "LABOR"){
                key = "인건비"
            }

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
            // 권한 체크
            // await check_user_auth(req);
            
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
                    progressCallback(progressConfig.masterAgentComplete);
                    const masterResult = await masterAgent.execute(context);

                    // 프롬프트 인젝션 체크 (즉시 차단)
                    if (masterResult.prompt_injection === 'Y') {
                        logger.warn('프롬프트 인젝션 공격 감지됨 - 처리 중단');
                        
                        const securityResult = {
                            master_result: masterResult,
                            agent_result: messages.createSecurityErrorResponse(
                                'SECURITY_VIOLATION',
                                '보안 정책 위반으로 요청이 차단되었습니다.',
                                'prompt_injection_detected'
                            ),
                            total_execution_time: {
                                start: totalStartTime.toISOString(),
                                end: new Date().toISOString(),
                                seconds: "0.00"
                            },
                            security_flag: true
                        };
                        
                        progressCallback(progressConfig.resultGenerated);
                        return JSON.stringify(securityResult);
                    }
                    
                    progressCallback(progressConfig.agentSelected);
                    const selectedAgentId = masterResult.selected_agent;
                    logger.info(`선택된 에이전트: ${selectedAgentId}`);
                    
                    let formattedResult;
                    
                    try {
                        // Settings 기반 에이전트 분류
                        if (agentConfig.generalQa.includes(selectedAgentId)) {
                            formattedResult = await handleGeneralQaAgent(selectedAgentId, context, processedData, agentExecutor, progressCallback);
                        }
                        else if (agentConfig.quickAnswer.includes(selectedAgentId)) {
                            formattedResult = await handleQuickAnswerAgent(selectedAgentId, context, processedData, agentExecutor, progressCallback);
                        }
                        else if (agentConfig.navigation.includes(selectedAgentId)) {
                            formattedResult = await handleNavigatorAgent(selectedAgentId, context, processedData, agentExecutor, progressCallback);
                        }
                        else if (agentConfig.analysis.includes(selectedAgentId)) {
                            formattedResult = await handleAnalysisAgent(selectedAgentId, context, processedData, agentExecutor, progressCallback);
                        }
                        else if (agentConfig.report.includes(selectedAgentId)) {
                            formattedResult = await handleReportAgent(selectedAgentId, context, processedData, agentExecutor, progressCallback);
                        }
                        else if (agentConfig.reportContent.includes(selectedAgentId)) {
                            formattedResult = await handleReportContentAgent(selectedAgentId, context, processedData, agentExecutor, progressCallback);
                        }
                        else {
                            formattedResult = await handleDirectLlmAgent(selectedAgentId, context, llmService, progressCallback);
                        }
                    } catch (agentError) {
                        logger.error(`에이전트 처리 오류 (${selectedAgentId}):`, agentError);
                        // 에이전트 타입별 에러 처리
                        let agentType = 'llm';  // 기본값

                        if (agentConfig.navigation.includes(selectedAgentId)) {
                            agentType = 'navigation';
                        }
                        else if (agentConfig.analysis.includes(selectedAgentId)) {
                            agentType = 'analysis';
                        }
                        else if (agentConfig.analysis.includes(selectedAgentId)) {
                            agentType = 'report';
                        }
                        else if (agentConfig.reportContent.includes(selectedAgentId)) {
                            agentType = 'reportContent';
                        }
                        
                        // messages 사용하여 에이전트별 에러 응답 생성
                        formattedResult = messages.createAgentErrorResponse(agentType, selectedAgentId, agentError.message);
                    }
                    
                    const totalEndTime = new Date();
                    const totalExecutionSeconds = (totalEndTime - totalStartTime) / 1000;
                    
                    logger.info('처리 완료', {agentId: selectedAgentId, status: formattedResult.status });
                    
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
                    
                    progressCallback(progressConfig.resultGenerated);
                    return JSON.stringify(result);
                } catch (innerError) {
                    // 내부 실행 전체 실패 시 기본 응답 반환
                    logger.error('내부 작업 실행 오류:', innerError);

                    const fallbackResult = {
                        master_result: messages.createFallbackResponse(
                            settings.masterAgent.fallback.masterAgent.default_agent,
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
                logger.error('작업 실행 오류:', error);
        
                const fallbackTaskId = `fallback_${Date.now()}`;
                
                return { 
                    taskId: fallbackTaskId,
                    error: true,
                    message: messages.getMessage('asyncTaskManager', 'startFailed')
                };
            });
            
            return { taskId: taskId };
        } catch (error) {
            logger.error('작업 시작 오류:', error);
            
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
            // 권한 체크
            // await check_user_auth(req);

            const { taskId } = req.data;
            return asyncTaskManager.getTaskStatus(taskId);
        } catch (error) {
            logger.error('상태 확인 오류:', error);
            throw new Error(`상태 확인 중 오류 발생: ${error.message}`);
        }
    });

    srv.on('get_ai_content', async (req) => {
        const {dashboard_id} = req.data;
        return get_ai_content(dashboard_id);
    });
};