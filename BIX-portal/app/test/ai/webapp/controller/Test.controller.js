sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../service/AgentService",
    "../util/InteractionUtils"
], (Controller, JSONModel, MessageToast, AgentService, InteractionUtils) => {
    "use strict";

    return Controller.extend("bix.test.ai.controller.Test", {
        onInit: function () {
            // 샘플 그리드 데이터
            var oData = {
                // 첫 번째 그리드 데이터셋
                grid1Data: [
                    {
                      "category": "매출",
                      "yearly_target": "46250940634",
                      "monthly_result": "3503859139",
                      "previous_year": "2740252016",
                      "gap": "763607123",
                      "progress_rate": "87.9%",
                      "previous_year_rate": "70.12%",
                      "gap_rate": "17.78%"
                    },
                    {
                      "category": "마진",
                      "yearly_target": "8408421007",
                      "monthly_result": "2325516060",
                      "previous_year": "1493590563",
                      "gap": "831925497",
                      "progress_rate": "70.56%",
                      "previous_year_rate": "49.6%",
                      "gap_rate": "21%"
                    },
                    {
                      "category": "마진률",
                      "yearly_target": "30.24%",
                      "monthly_result": "66.37%",
                      "previous_year": "54.5%",
                      "gap": "11.87%",
                      "progress_rate": "80.25%",
                      "previous_year_rate": "75.6%",
                      "gap_rate": "4.6%"
                    },
                    {
                      "category": "SG&A",
                      "yearly_target": "23714014790",
                      "monthly_result": "2470209874",
                      "previous_year": "2223188886",
                      "gap": "247020988",
                      "progress_rate": "-25%",
                      "previous_year_rate": "2.12%",
                      "gap_rate": "-27.12%"
                    },
                    {
                      "category": "공헌이익",
                      "yearly_target": "6213748246",
                      "monthly_result": "-144693814",
                      "previous_year": "-729598323",
                      "gap": "584904509",
                      "progress_rate": "72.05%",
                      "previous_year_rate": "33%",
                      "gap_rate": "39%"
                    },
                    {
                      "category": "영업이익",
                      "yearly_target": "-",
                      "monthly_result": "-",
                      "previous_year": "-",
                      "gap": "-",
                      "progress_rate": "-",
                      "previous_year_rate": "-",
                      "gap_rate": "-"
                    },
                    {
                      "category": "영업이익률",
                      "yearly_target": "-",
                      "monthly_result": "-",
                      "previous_year": "-",
                      "gap": "-",
                      "progress_rate": "-",
                      "previous_year_rate": "-",
                      "gap_rate": "-"
                    }
                ],
                // 두 번째 그리드 데이터셋
                grid2Data: [
                    {
                      "category": "DT Revenue/Margin",
                      "yearly_target": 567821943500,
                      "monthly_result": 63248756200,
                      "previous_year": 58762149840,
                      "gap": 4486606360,
                      "progress_rate": "11.14%",
                      "previous_year_rate": "9.8%",
                      "gap_rate": "1.34%"
                    },
                    {
                      "category": "Offshoring",
                      "yearly_target": 125000000000,
                      "monthly_result": 12380750000,
                      "previous_year": 11250000000,
                      "gap": 1130750000,
                      "progress_rate": "9.90%",
                      "previous_year_rate": "8.75%",
                      "gap_rate": "1.15%"
                    },
                    {
                      "category": "Non-MM",
                      "yearly_target": 82500000000,
                      "monthly_result": 7640500000,
                      "previous_year": 7432100000,
                      "gap": 208400000,
                      "progress_rate": "9.26%",
                      "previous_year_rate": "8.94%",
                      "gap_rate": "0.32%"
                    },
                    {
                      "category": "BR",
                      "yearly_target": 145320000000,
                      "monthly_result": 15360520000,
                      "previous_year": 14250600000,
                      "gap": 1109920000,
                      "progress_rate": "10.57%",
                      "previous_year_rate": "9.89%",
                      "gap_rate": "0.68%"
                    },
                    {
                      "category": "RoHC",
                      "yearly_target": 95750400000,
                      "monthly_result": 8210785600,
                      "previous_year": 7660032000,
                      "gap": 550753600,
                      "progress_rate": "8.57%",
                      "previous_year_rate": "8.00%",
                      "gap_rate": "0.57%"
                    }
                ],
                gridTotalData: "",
                result: null,
                busy: false
            };
            
            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel);
            
            // 모든 그리드 데이터 통합
            var allGridData = {
                PL: oData.grid1Data,
                OI: oData.grid2Data
            };
            oModel.setProperty("/gridTotalData", JSON.stringify(allGridData, null, 2));

            // 인터랙션 정보 저장용 모델
            this._interactionModel = new JSONModel({
                lastInteraction: null,
                interactionHistory: []
            });
            this.getView().setModel(this._interactionModel, "interaction");
        },

        /**
         * AI 분석 실행 버튼 이벤트 핸들러
         */
        onExecuteAgent: function(oEvent) {
            var gridId;
            try {
                var sessionData = JSON.parse(sessionStorage.getItem("initSearchModel")) || {};
                gridId = sessionData.grid && sessionData.grid.id;
            } catch (e) {
                gridId = null;
            }
            
            if (!gridId) {
                MessageToast.show("분석할 데이터를 선택해주세요.");
                return;
            }
            
            // 추가 컨텍스트 객체 생성
            var additionalContext = {};
            var oModel = this.getView().getModel();
            // 인터랙션 데이터 생성
            var interactionData = InteractionUtils.createInteractionDataFromEvent(
                oEvent,
                oModel,
                additionalContext
            );

            // 인터랙션 기록
            InteractionUtils.recordInteraction(interactionData, oModel);
            
            // 처리 및 결과 표시
            oModel.setProperty("/busy", true);

            AgentService.processInteraction(interactionData, {
                onProgress: function(progress) {
                    this.getView().getModel().setProperty("/progress", progress);
                }.bind(this)
            })
            .then(function(result) {
                this._processResult(result);
                this.getView().getModel().setProperty("/busy", false);
            }.bind(this))
            .catch(function(error) {
                console.error("처리 오류:", error);
                MessageToast.show("처리 중 오류 발생: " + (error.message || "알 수 없는 오류"));
                this.getView().getModel().setProperty("/busy", false);
            }.bind(this));
        },        
        
        /**
         * 첫 번째 그리드 행 선택 이벤트 핸들러
         */
        onGrid1RowSelectionChange: function(oEvent) {
            InteractionUtils.handleTableRowSelection(
                this,
                oEvent,
                "PL",
                {
                    gridName: "첫 번째 PL 그리드",  
                    itemProperty: "category",
                    storageType: "session",
                    storageKey: "initSearchModel"
                }
            );
        },
        
        /**
         * 두 번째 그리드 행 선택 이벤트 핸들러
         */
        onGrid2RowSelectionChange: function(oEvent) {
            InteractionUtils.handleTableRowSelection(
                this,
                oEvent,
                "OI",
                {
                    gridName: "두 번째 OI 그리드",
                    itemProperty: "category",
                    storageType: "session",
                    storageKey: "initSearchModel"
                }
            );
        },

        // 결과 처리 로직
        _processResult: function(result) {
            try {
                if (typeof result === 'string') {
                    // 이미 JSON 객체인지 확인
                    try {
                        // 문자열을 JSON으로 파싱
                        result = JSON.parse(result);
                    } catch (parseError) {
                        console.warn("JSON 파싱 실패, 원본 문자열 사용:", parseError);
                        // 파싱 실패 시 원본 문자열 사용
                    }
                }
                
                var masterAgent = result.master_result
                var selectedAgent = masterAgent.selected_agent;

                // 선택된 에이전트 정보 표시
                this.getView().getModel().setProperty("/selectedAgentInfo", {
                    id: selectedAgent,
                    name: selectedAgent,
                    reasoning: masterAgent.reasoning || "",
                    timestamp: new Date().toISOString()
                });
                
                // 에이전트 실행 결과가 있는 경우 처리
                if (result.agent_result) {
                    // 모델에 결과 저장
                    this.getView().getModel().setProperty("/agentResult", result.agent_result);
                    // 분석 결과를 팝업으로 표시
                    this._showAnalysisPopup(result.agent_result);
                    MessageToast.show(selectedAgent + " analysis completed");
                }
                else {
                    MessageToast.show("Selected Agent: " + selectedAgent);
                }
            } catch (e) {
                console.error("결과 처리 오류:", e);
                MessageToast.show("결과 처리 중 오류 발생");
            }
        },

        // 분석 결과 팝업 표시
        _showAnalysisPopup: function(agentResult) {
            // 이미 팝업이 있으면 닫기
            if (this._oAnalysisPopup) {
                this._oAnalysisPopup.close();
                this._oAnalysisPopup.destroy();
                this._oAnalysisPopup = null;
            }
            
            // 분석 결과 확인
            var analysisContent = agentResult.analysis || agentResult.executive_summary || "";
            
            // 새 팝업 생성
            this._oAnalysisPopup = new sap.m.Dialog({
                title: "Analysis Result",
                contentWidth: "60%",
                contentHeight: "60%",
                resizable: true,
                draggable: true,
                content: new sap.m.TextArea({
                    value: analysisContent,
                    editable: false,
                    growing: true,
                    width: "100%",
                    height: "100%"
                }),
                beginButton: new sap.m.Button({
                    text: "Close",
                    press: function () {
                        this._oAnalysisPopup.close();
                    }.bind(this)
                }),
                endButton: new sap.m.Button({
                    text: "View Full Analysis",
                    visible: !!(agentResult.full_analysis || agentResult.detailed_analysis),
                    press: function () {
                        var fullContent = agentResult.full_analysis || agentResult.detailed_analysis;
                        this._showFullAnalysis(fullContent);
                    }.bind(this)
                })
            });
            
            // 팝업에 CSS 클래스 추가
            this._oAnalysisPopup.addStyleClass("sapUiContentPadding");
            
            // 팝업 열기
            this._oAnalysisPopup.open();
        },

        // 전체 분석 결과 표시 메서드 (마크다운 변환 없이)
        _showFullAnalysis: function(fullAnalysis) {
            if (!fullAnalysis) return;
            
            // 이미 팝업이 있으면 닫기
            if (this._oFullAnalysisPopup) {
                this._oFullAnalysisPopup.close();
                this._oFullAnalysisPopup.destroy();
                this._oFullAnalysisPopup = null;
            }
            
            // 새 팝업 생성
            this._oFullAnalysisPopup = new sap.m.Dialog({
                title: "Detailed Analysis",
                contentWidth: "80%",
                contentHeight: "80%",
                resizable: true,
                draggable: true,
                content: new sap.m.TextArea({
                    value: fullAnalysis,
                    editable: false,
                    growing: true,
                    width: "100%",
                    height: "100%"
                }),
                beginButton: new sap.m.Button({
                    text: "Close",
                    press: function () {
                        this._oFullAnalysisPopup.close();
                    }.bind(this)
                })
            });
            
            // 팝업에 CSS 클래스 추가
            this._oFullAnalysisPopup.addStyleClass("sapUiContentPadding");
            
            // 팝업 열기
            this._oFullAnalysisPopup.open();
        },

        /**
         * LLM 테스트 버튼 이벤트 핸들러
         */
        onTestLLM: function() {
            // 입력 다이얼로그 생성
            if (!this._oPromptDialog) {
                this._oPromptDialog = new sap.m.Dialog({
                    title: "에이전트 테스트",
                    contentWidth: "600px",
                    content: [
                        new sap.m.VBox({
                            items: [
                                new sap.m.Label({
                                    text: "테스트 내용 입력:",
                                    design: "Bold"
                                }),
                                new sap.m.TextArea("promptInput", {
                                    value: "안녕하세요, SG&A 용어란 무엇입니까?",
                                    rows: 5,
                                    width: "100%"
                                }),
                                new sap.m.Label({
                                    text: "선택된 에이전트:",
                                    design: "Bold",
                                    visible: "{= !!${/testAgentResult} && !!${/testAgentResult/master_result}}"
                                }),
                                new sap.m.Text({
                                    text: "{/testAgentResult/master_result/selected_agent}",
                                    visible: "{= !!${/testAgentResult} && !!${/testAgentResult/master_result}}"
                                }),
                                new sap.m.Label({
                                    text: "처리 결과:",
                                    design: "Bold",
                                    visible: "{= !!${/testAgentResult}}"
                                }),
                                new sap.m.TextArea({
                                    value: "{/testAgentResult/agent_result/executive_summary}",
                                    rows: 10,
                                    width: "100%",
                                    editable: false,
                                    visible: "{= !!${/testAgentResult}}"
                                })
                            ],
                            spacing: "0.5rem"
                        }).addStyleClass("sapUiSmallMargin")
                    ],
                    beginButton: new sap.m.Button({
                        text: "테스트 실행",
                        type: "Emphasized",
                        enabled: "{= ${/testStatus} !== 'RUNNING'}",
                        press: function() {
                            var sPrompt = sap.ui.getCore().byId("promptInput").getValue();
                            this._executeAgentTest(sPrompt);
                        }.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        text: "닫기",
                        press: function() {
                            this._oPromptDialog.close();
                        }.bind(this)
                    })
                });
                
                this.getView().addDependent(this._oPromptDialog);
            }
            
            // 모델 초기화
            var oModel = this.getView().getModel();
            oModel.setProperty("/testAgentResult", null);
            oModel.setProperty("/testStatus", "READY");
            oModel.setProperty("/testProgress", 0);
            
            // 다이얼로그 열기
            this._oPromptDialog.open();
        },

        /**
         * 에이전트 테스트 실행
         * @private
         */
        _executeAgentTest: function(sPrompt) {
            var oModel = this.getView().getModel();
            
            // 상태 초기화
            oModel.setProperty("/testStatus", "RUNNING");
            oModel.setProperty("/testProgress", 10);
            oModel.setProperty("/testAgentResult", null);
            
            // 인터랙션 데이터 생성
            var interactionData = {
                type: "chat_input",
                source: "agent_test",
                timestamp: new Date().toISOString(),
                content: {
                    text: sPrompt
                },
                context: {
                    userInput: sPrompt
                }
            };
            
            // 비동기 작업 시작
            AgentService.processInteraction(interactionData, {
                onProgress: function(progress) {
                    oModel.setProperty("/testProgress", progress);
                }.bind(this)
            })
            .then(function(result) {
                // 결과 파싱 (문자열인 경우)
                var parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
                
                // 모델에 결과 저장
                oModel.setProperty("/testAgentResult", parsedResult);
                oModel.setProperty("/testStatus", "COMPLETED");
                oModel.setProperty("/testProgress", 100);
                
                // 결과 로깅
                console.log("에이전트 테스트 결과:", parsedResult);
            }.bind(this))
            .catch(function(error) {
                console.error("테스트 처리 오류:", error);
                
                // 오류 상태 표시
                oModel.setProperty("/testStatus", "ERROR");
                oModel.setProperty("/testProgress", 0);
                
                // 사용자에게 오류 알림
                MessageToast.show("처리 중 오류 발생: " + (error.message || "알 수 없는 오류"));
            }.bind(this));
        },
    });
});