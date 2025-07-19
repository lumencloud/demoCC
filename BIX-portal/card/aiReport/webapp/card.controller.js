sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "bix/common/ai/service/AgentService",
    "sap/ui/model/odata/v4/ODataModel",
    "../../main/util/Module",
], function (BaseController, EventBus, JSONModel, MessageToast, AgentService, ODataModel, Module) {
    "use strict";
    return BaseController.extend("bix.card.aiReport.card", {
        _oEventBus: EventBus.getInstance(),
        _bFlag: true,

        onInit: function () {
            // 초기 로딩 상태 설정
            this.getView().setModel(new JSONModel({
                "isLoading": true,
                "title": "",
                "summary": [],
                "insight": ""
            }), "LLMModel");

            // 데이터 설정 및 보고서 컨텐츠 로드
            this._dataSetting();
            this._oEventBus.subscribe("aiReport", "dateData", this._dataSetting, this);
        },

        /**
         * 데이터 설정 및 보고서 컨텐츠 생성
         * @param {Object} oEvent - 이벤트 객체
         * @param {string} sEventId - 이벤트 ID
         * @param {Object} oData - 이벤트 데이터
         * @private
         */
        _dataSetting: async function (oEvent, sEventId) {
            this.byId("cardContent").setBusy(true);
            
            let { monday, sunday } = this._setDate();
            let oData = JSON.parse(sessionStorage.getItem("aiWeekReport"));
            
            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });
            
            let sPath = oData ?
                `/get_ai_total_rodr(org_id='${oData.org_id}',start_date='${oData.start_date}',end_date=${oData.end_date},type='dt')` :
                `/get_ai_total_rodr(org_id='5',start_date='${monday}',end_date=${sunday},type='dt')`;
            
            let start_date = new Date(oData ? oData.start_date : monday);
            let end_date = new Date(oData ? oData.end_date : sunday);
            
            // 전주 날짜 계산
            let last_start_date = new Date(start_date.getFullYear(), start_date.getMonth(), start_date.getDate() - 7);
            let last_end_date = new Date(end_date.getFullYear(), end_date.getMonth(), end_date.getDate() - 7);
        
            try {
                const aResult = await oModel.bindContext(sPath).requestObject();
                
                // DT Pipeline 데이터 설정
                this._modelSetting(aResult.value);
                
                // DT Pipeline 로딩 완료
                this.byId("cardContent").setBusy(false);
                
                // 보고서 컨텐츠 생성 파라미터 구성
                const reportParams = {
                    start_date: oData ? oData.start_date : monday,
                    end_date: oData ? oData.end_date : sunday,
                    last_start_date: this._formatDate(last_start_date),
                    last_end_date: this._formatDate(last_end_date),
                };
        
                // AI 보고서 생성은 별도로 진행 (Summary 부분만 로딩)
                this._loadReportData(reportParams);
            } catch (oErr) {
                this.byId("cardContent").setBusy(false);
                Module.displayStatus(this.getOwnerComponent().oCard, oErr.error.code, this.byId("cardContent"));
                this._setFallbackData();
                this.dataLoad();
            }
        },

        /**
         * 보고서 컨텐츠 데이터 로드
         * @param {Object} params - 보고서 컨텐츠 생성 파라미터
         * @param {string} params.start_date - 금주 시작일
         * @param {string} params.end_date - 금주 종료일
         * @param {string} params.last_start_date - 전주 시작일
         * @param {string} params.last_end_date - 전주 종료일
         * @private
         */
        _loadReportData: function (params) {
            var oModel = this.getView().getModel("LLMModel");
            var sViewid = "aiReportView";
            
            // Summary만 로딩 상태로 설정
            oModel.setProperty("/isLoading", true);
            oModel.setProperty("/summary", []); // 빈 배열로 두면 noDataText가 표시됨

            console.log("보고서 생성 파라미터:", params);

            // 보고서 컨텐츠 에이전트 호출을 위한 데이터 구성
            var interactionData = {
                interaction: {
                    type: "context_fill",
                    timestamp: new Date().toISOString()
                },
                context: {
                    id: sViewid,
                    functions: [
                        {
                            name: "get_ai_agent_view_lead_now",
                            params: {
                                start_date: params.start_date,
                                end_date: params.end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_lead_last",
                            params: {
                                start_date: params.last_start_date,
                                end_date: params.last_end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_lost_now",
                            params: {
                                start_date: params.start_date,
                                end_date: params.end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_lost_last",
                            params: {
                                start_date: params.last_start_date,
                                end_date: params.last_end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_nego_now",
                            params: {
                                start_date: params.start_date,
                                end_date: params.end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_nego_last",
                            params: {
                                start_date: params.last_start_date,
                                end_date: params.last_end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_contract_now",
                            params: {
                                start_date: params.start_date,
                                end_date: params.end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_contract_last",
                            params: {
                                start_date: params.last_start_date,
                                end_date: params.last_end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_qualified_now",
                            params: {
                                start_date: params.start_date,
                                end_date: params.end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_qualified_last",
                            params: {
                                start_date: params.last_start_date,
                                end_date: params.last_end_date,
                            }
                        },
                    ],
                    global_params: {}
                }
            };
            var options = {
                showBusyDialog: false,
                showProgressPercentage: false,
                onProgress: function (progress) {
                    console.log("보고서 컨텐츠 생성 진행률:", progress + "%");
                },
                pollOptions: {
                    pollInterval: 3000,
                    maxTries: 40,
                    initialDelay: 1000
                }
            };

            AgentService.processInteraction(interactionData, options)
                .then(function (result) {
                    console.log("보고서 컨텐츠 생성 완료:", result);
                    var parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
                    this._processReportResult(parsedResult);
                }.bind(this))
                .catch(function (error) {
                    console.error("보고서 컨텐츠 생성 오류:", error);
                    this._setFallbackData();
                    MessageToast.show("보고서 컨텐츠 생성 중 오류가 발생했습니다.");
                }.bind(this))
                .finally(function () {
                    oModel.setProperty("/isLoading", false);
                });
        },

        /**
         * 보고서 컨텐츠 결과 처리
         * @param {Object} result - 보고서 컨텐츠 생성 결과
         * @private
         */
        _processReportResult: function (result) {
            var oModel = this.getView().getModel("LLMModel");

            try {
                // 보고서 컨텐츠 에이전트 응답에서 내용 추출
                var sReportContent = result.agent_result?.executive_summary ||
                    result.results?.final_report ||
                    result.final_output || "";

                if (!sReportContent) {
                    console.warn("보고서 컨텐츠 내용이 없습니다. 전체 결과:", result);
                    throw new Error("보고서 컨텐츠 내용이 없습니다.");
                }

                // 백엔드에서 받은 결과를 파싱 및 구조로 변환
                var oReportData = this._parseReportContent(sReportContent);

                // 기존 뷰 구조에 맞게 모델 업데이트
                oModel.setProperty("/title", oReportData.title || "");
                oModel.setProperty("/summary", oReportData.summary || []);
                oModel.setProperty("/insight", oReportData.insight || "");
                oModel.setProperty("/isLoading", false);
                
                // insight 결과 ai Insight 카드로 전달
                this._oEventBus.publish("aiReport", "aiInsight", { key: "dtSight", insight: oReportData.insight });
                console.log("보고서 컨텐츠 데이터 로드 완료:", oReportData);
                
                if(this._bFlag){
                    this.dataLoad();
                  }
            } catch (error) {
                console.error("보고서 컨텐츠 결과 처리 오류:", error);
                this._setFallbackData();
                this.dataLoad();
            }
        },

        /**
         * 보고서 컨텐츠 내용 파싱 - 백엔드 응답 구조 변환
         * @param {string} content - 보고서 컨텐츠 내용
         * @returns {Object} 파싱된 보고서 컨텐츠 데이터
         * @private
         */
        _parseReportContent: function (content) {
            try {
                // 백엔드에서 이미 JSON 구조로 보내주는 경우
                if (typeof content === 'object') {
                    return {
                        title: content.title || content.제목 || "",
                        summary: content.summary || content.요약 || [],
                        insight: content.insight || content.인사이트 || content.aiInsight || ""
                    };
                }

                // 문자열인 경우 JSON 파싱 시도
                if (typeof content === 'string' && content.trim().startsWith('{')) {
                    var jsonData = JSON.parse(content);
                    return {
                        title: jsonData.title || jsonData.제목 || "",
                        summary: jsonData.summary || jsonData.요약 || [],
                        insight: jsonData.insight || jsonData.인사이트 || jsonData.aiInsight || ""
                    };
                }

                // 텍스트 형태로 온 경우 파싱
                return this._parseTextToStructure(content);
            } catch (error) {
                console.error("보고서 컨텐츠 내용 파싱 오류:", error);
                console.log("파싱 실패한 원본 내용:", content);
                
                this._setFallbackData();
                this.dataLoad();
            }
        },

        /**
         * 텍스트를 구조화된 데이터로 변환
         * @param {string} content - 텍스트 내용
         * @returns {Object} 구조화된 보고서 컨텐츠 데이터
         * @private
         */
        _parseTextToStructure: function (content) {
            console.log("텍스트 파싱 대상:", content);

            var reportData = {
                title: "",
                summary: [],
                insight: ""
            };

            var lines = content.split('\n');
            var currentSection = "";

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();

                if (!line) continue;

                // 섹션 구분자 확인
                if (line.toLowerCase().includes("title") || line.includes("제목")) {
                    currentSection = "title";
                    // 제목: 뒤의 내용 추출
                    var titleMatch = line.match(/(?:title|제목)\s*:\s*(.+)/i);
                    if (titleMatch) {
                        reportData.title = titleMatch[1];
                    }
                    continue;
                }

                if (line.toLowerCase().includes("summary") || line.includes("요약")) {
                    currentSection = "summary";
                    continue;
                }

                if (line.toLowerCase().includes("insight") || line.includes("인사이트")) {
                    currentSection = "insight";
                    // insight: 뒤의 내용 추출
                    var insightMatch = line.match(/(?:insight|인사이트)\s*:\s*(.+)/i);
                    if (insightMatch) {
                        reportData.insight = insightMatch[1];
                    }
                    continue;
                }

                // 내용 처리
                if (currentSection === "title" && !reportData.title) {
                    reportData.title = line;
                }
                else if (currentSection === "summary") {
                    // 불릿 포인트나 번호 제거
                    var cleanLine = line.replace(/^[\-\*\•\d\.]\s*/, '').trim();
                    if (cleanLine) {
                        reportData.summary.push(cleanLine);
                    }
                }
                else if (currentSection === "insight" && !reportData.insight) {
                    reportData.insight = line;
                }
            }
            
            return reportData;
        },

        /**
         * 기본 데이터 설정 (오류 시)
         * @private
         */
        _setFallbackData: function () {
            var oModel = this.getView().getModel("LLMModel");

            oModel.setData({
                "isLoading": false,
                "title": "우선협상·계약 실적 개선, 신규는 소액 중심·입찰 공백 지속",
                "summary": [
                    "금주 신규 등록은 2건, 총 8억 원으로 전주 0건 대비 신규 발생하였으나, 모두 5억 원 이하의 소액 과제로, 전략적 수익성 확보에는 기여 제한적.",
                    "우선협상 단계는 2건, 총 13억 원으로 전주 0건 대비 증가하며 고객과의 협상 진척도가 확인되었고, 대형 고객사 중심으로 타당성 검토가 이루어지는 중.",
                    "계약 완료는 5건, 총 11억 원으로 전주 대비 건수 +66.7%, 금액 +71.9% 증가하여 계약 전환력이 개선되었으며, DT 기반 솔루션 구축이 주된 유형.",
                    "Deal Lost 및 Deselected는 금주에도 0건으로 유지되며 손실 리스크는 낮았으나, 상반기 입찰 예정 사업은 전무하여 차주 이후 파이프라인 확보 필요."
                ],
                "insight": "우선협상과 계약 완료 흐름은 안정적으로 이어지고 있으나, 소액 위주의 신규 구조와 입찰 공백은 중장기 실적 관점에서 리스크로 판단되며, 즉시 고액 과제 발굴과 차기 입찰 연계 전략이 필요함."
            });
        },

        /**
         * 메인 타이틀 모델 설정
         * @param {Array} aResult - API 결과 데이터
         * @private
         */
        _modelSetting: function (aResult) {
            let rodrAmount = (Number(aResult[0].rodr_amt) / 100000000).toFixed(0) || 0;
            let rodrCount = aResult[0].rodr_cnt || 0;
            let lastAmountGap = (Number(aResult[0].curr_last_rodr_amt) / 100000000).toFixed(0) || 0;
            let lastCountGap = aResult[0].curr_last_rodr_cnt || 0;

            function formatJoAmount(amount, withSign = false) {
                amount = Math.floor(Number(amount));
                let sign = "";
                if (withSign) {
                    sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
                }
                amount = Math.abs(amount);
                if (amount >= 10000) {
                    let jo = Math.floor(amount / 10000);
                    let eok = amount % 10000;
                    if (eok === 0) {
                        return `${sign}${jo}조`;
                    }
                    else {
                        return `${sign}${jo}조 ${eok.toLocaleString()}`;
                    }
                }
                else {
                    return `${sign}${amount.toLocaleString()}`;
                }
            }

            const oModel = {
                sTotalRodr: `총 사업 규모 ${formatJoAmount(rodrAmount)}억 / ${rodrCount}건 ( 전주대비`,
                sTotalGap: `${formatJoAmount(lastAmountGap, true)}억 / ${formatJoAmount(lastCountGap, true)}건`,
            };
            ;
            this.getView().setModel(new JSONModel(oModel), "mainTitleModel");
        },

        /**
         * 주간 날짜 설정 (월요일 ~ 일요일)
         * @returns {Object} 월요일과 일요일 날짜
         * @private
         */
        _setDate: function () {
            let today = new Date();
            let day = today.getDay();

            let monday = new Date(today);
            monday.setDate(today.getDate() - ((day + 6) % 7));

            let sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);

            return {
                monday: this._formatDate(monday),
                sunday: this._formatDate(sunday)
            };
        },

        /**
         * 날짜 포맷팅
         * @param {Date} date - 날짜 객체
         * @returns {string} 포맷된 날짜 문자열 (YYYY-MM-DD)
         * @private
         */
        _formatDate: function (date) {
            let year = date.getFullYear();
            let month = String(date.getMonth() + 1).padStart(2, '0');
            let day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        dataLoad: function () {
            this._oEventBus.publish("CardWeekChannel", "CardWeekFullLoad", {
                cardId: this.getView().getId()
            });
            this._bFlag = false;
        }
    });
});