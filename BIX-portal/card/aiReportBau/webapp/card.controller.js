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

        onInit: function () {
            this.getOwnerComponent().oCard.setBusy(true)
            // 초기 로딩 상태 설정
            this.getView().setModel(new JSONModel({
                "isLoading": true,
                "title": "",
                "summary": [],
                "insight": ""
            }), "LLMModel");

            // 데이터 설정 및 보고서 로드
            this._dataSetting();
            this._oEventBus.subscribe("aiReport", "dateData", this._dataSetting, this);
        },

        /**
         * 데이터 설정 및 보고서 생성
         * @param {Object} oEvent - 이벤트 객체
         * @param {string} sEventId - 이벤트 ID
         * @param {Object} oData - 이벤트 데이터
         * @private
         */
        _dataSetting: async function (oEvent, sEventId, oData) {
            this.byId("cardContent").setBusy(true);
            let { monday, sunday } = this._setDate();

            // 데이터 호출 병렬 실행
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

            await oModel.bindContext(sPath).requestObject().then(
                function (aResult) {
                    // 기존 모델 설정
                    this._modelSetting(aResult.value);

                    // 보고서 생성을 위한 파라미터 구성
                    const reportParams = {
                        start_date: oData ? oData.start_date : monday,
                        end_date: oData ? oData.end_date : sunday,
                        last_start_date: this._formatDate(last_start_date),
                        last_end_date: this._formatDate(last_end_date),
                    };

                    // 보고서 생성 호출
                    this._loadReportData(reportParams);
                }.bind(this))
                .catch((oErr) => {
                    Module.displayStatus(this.getOwnerComponent().oCard, oErr.error.code, this.byId("cardContent"));
                    this._setFallbackData();
                });

            this.byId("cardContent").setBusy(false);
        },

        /**
         * 보고서 데이터 로드
         * @param {Object} params - 보고서 생성 파라미터
         * @param {string} params.start_date - 금주 시작일
         * @param {string} params.end_date - 금주 종료일
         * @param {string} params.last_start_date - 전주 시작일
         * @param {string} params.last_end_date - 전주 종료일
         * @private
         */
        _loadReportData: function (params) {
            var oModel = this.getView().getModel("LLMModel");
            var sViewid = "aiReportBauView";

            console.log("보고서 생성 파라미터:", params);

            // 보고서 에이전트 호출을 위한 데이터 구성
            var interactionData = {
                interaction: {
                    type: "context_fill",
                    timestamp: new Date().toISOString()
                },
                context: {
                    id: sViewid,
                    functions: [
                        {
                            name: "get_ai_agent_view_bau_lead_now",
                            params: {
                                start_date: params.start_date,
                                end_date: params.end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_bau_lead_last",
                            params: {
                                start_date: params.last_start_date,
                                end_date: params.last_end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_bau_lost_now",
                            params: {
                                start_date: params.start_date,
                                end_date: params.end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_bau_lost_last",
                            params: {
                                start_date: params.last_start_date,
                                end_date: params.last_end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_bau_nego_now",
                            params: {
                                start_date: params.start_date,
                                end_date: params.end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_bau_nego_last",
                            params: {
                                start_date: params.last_start_date,
                                end_date: params.last_end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_bau_contract_now",
                            params: {
                                start_date: params.start_date,
                                end_date: params.end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_bau_contract_last",
                            params: {
                                start_date: params.last_start_date,
                                end_date: params.last_end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_bau_qualified_now",
                            params: {
                                start_date: params.start_date,
                                end_date: params.end_date,
                            }
                        },
                        {
                            name: "get_ai_agent_view_bau_qualified_last",
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
                    console.log("보고서 생성 진행률:", progress + "%");
                },
                pollOptions: {
                    pollInterval: 3000,
                    maxTries: 40,
                    initialDelay: 1000
                }
            };

            AgentService.processInteraction(interactionData, options)
                .then(function (result) {
                    console.log("보고서 생성 완료:", result);
                    var parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
                    this._processReportResult(parsedResult);
                }.bind(this))
                .catch(function (error) {
                    console.error("보고서 생성 오류:", error);
                    this._setFallbackData();
                    MessageToast.show("보고서 생성 중 오류가 발생했습니다.");
                }.bind(this))
                .finally(function () {
                    oModel.setProperty("/isLoading", false);
                });
        },

        /**
         * 보고서 결과 처리
         * @param {Object} result - 보고서 생성 결과
         * @private
         */
        _processReportResult: function (result) {
            var oModel = this.getView().getModel("LLMModel");

            try {
                // 보고서 에이전트 응답에서 내용 추출
                var sReportContent = result.agent_result?.executive_summary ||
                    result.results?.final_report ||
                    result.final_output || "";

                if (!sReportContent) {
                    console.warn("보고서 내용이 없습니다. 전체 결과:", result);
                    throw new Error("보고서 내용이 없습니다.");
                }

                // 백엔드에서 받은 결과를 파싱하여 title, summary, insight 구조로 변환
                var oReportData = this._parseReportContent(sReportContent);

                // 기존 뷰 구조에 맞게 모델 업데이트
                oModel.setProperty("/title", oReportData.title || "AI 보고서");
                oModel.setProperty("/summary", oReportData.summary || []);
                oModel.setProperty("/insight", oReportData.insight || "");
                oModel.setProperty("/isLoading", false);
                // insight 결과 ai Insight 카드로 전달
                this._oEventBus.publish("aiReport", "aiInsight", { key: "bauSight", insight: oReportData.insight });
                this.dataLoad();
                console.log("보고서 데이터 로드 완료:", oReportData);
                this.getOwnerComponent().oCard.setBusy(false)
            } catch (error) {
                console.error("보고서 결과 처리 오류:", error);
                this._setFallbackData();
            }
        },

        /**
         * 보고서 내용 파싱 - 백엔드 응답을 title, summary, insight 구조로 변환
         * @param {string} content - 보고서 내용
         * @returns {Object} 파싱된 보고서 데이터
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
                console.error("보고서 내용 파싱 오류:", error);

                // 파싱 실패 시 원본 텍스트를 기본 구조로 변환
                return {
                    title: "AI 보고서",
                    summary: [content],
                    insight: ""
                };
            }
        },

        /**
         * 텍스트를 구조화된 데이터로 변환
         * @param {string} content - 텍스트 내용
         * @returns {Object} 구조화된 보고서 데이터
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

            // 기본값 설정
            if (!reportData.title) {
                reportData.title = "AI 보고서";
            }

            if (reportData.summary.length === 0) {
                reportData.summary = [content];
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
                "title": "시스템 오류로 인해 기본 데이터를 표시합니다.",
                "summary": [
                    "일시적인 서비스 장애가 발생했습니다"
                ],
                "insight": "일시적인 서비스 장애가 발생했습니다"
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
            this.byId("aiTitleBox").setVisible(true)
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
            const oEventBus = sap.ui.getCore().getEventBus();
            oEventBus.publish("CardWeekChannel", "CardWeekFullLoad", {
                cardId: this.getView().getId()
            })
        },
    });
});