sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "bix/common/ai/service/AgentService"
], (BaseController, MessageToast, JSONModel, AgentService) => {
    "use strict";

    return BaseController.extend("bix.ai.component.controller.AI", {
        onInit() {
            this._initializeChatModel();
            this.onAiTilePress(null);
        },
        // ai tile 클릭 이벤트
        onAiTilePress: function (oEvent) {
            if (oEvent) {
                let aTiles = this.getView().getControlsByFieldGroupId("aiTile").filter(oControl => oControl.isA("sap.m.GenericTile") && oEvent.getParameter("id") !== oControl.getId());
                aTiles.forEach(oTile => oTile.removeStyleClass("tileActive"));
                oEvent.getSource().addStyleClass("tileActive");
                this.getView().getModel("ui").setProperty("/tileSelectTitle", oEvent.getSource().getHeader());
            } else {
                this.byId("initTile").addStyleClass("tileActive");
                this.getView().setModel(new JSONModel({tileSelectTitle: this.byId("initTile").getHeader()}),"ui");
            }
        },
        /**
         * 미리 정의된 버튼 클릭 이벤트
         */
        onQuickActionPress: function(oEvent) {
            var sText = oEvent.getSource().getText();
            this._sendMessage(sText);
        },
        
        /**
         * 검색 버튼 클릭 또는 엔터키 이벤트
         */
        onSearch: function(oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getSource().getValue();
            if (sQuery && sQuery.trim()) {
                this._sendMessage(sQuery.trim());
                oEvent.getSource().setValue("");
            }
        },

        /**
         * 채팅창 토글
         */
        onToggleChat: function() {
            var oChatModel = this.getView().getModel("chat");
            var bShowWelcome = oChatModel.getProperty("/showWelcome");
            
            oChatModel.setProperty("/showWelcome", !bShowWelcome);
            
            if (!bShowWelcome) {
                oChatModel.setProperty("/messages", []);
                oChatModel.setProperty("/isLoading", false);
            }
        },

        /**
         * 메인 화면 네비게이션
         */
        onMainNavigationPress: function() {
            this._navigateToPage("/main/index.html#");
        },

        /**
         * 메뉴 네비게이션
         */
        onMenuNavigationPress: function(oEvent) {
            var oBindingContext = oEvent.getSource().getBindingContext("chat");
            if (oBindingContext) {
                var oMenuData = oBindingContext.getObject();
                if (oMenuData && oMenuData.url) {
                    this._navigateToPage(oMenuData.url);
                }
            }
        },

        /**
         * 에이전트 이름 포맷터
         */
        formatAgentName: function(agentId) {
            var agentMapping = {
                "general_qa_agent": "일반 질의 에이전트",
                "quick_answer_agent": "즉답형 에이전트", 
                "navigator_agent": "네비게이터 에이전트",
                "report_agent": "리포트 에이전트",
                "visualization_agent": "시각화 에이전트"
            };
            return agentMapping[agentId] || agentId;
        },

        /**
         * 에이전트 아이콘 포맷터
         */
        formatAgentIcon: function(agentId) {
            var iconMapping = {
                "general_qa_agent": "sap-icon://discussion-2",
                "quick_answer_agent": "sap-icon://responsive",
                "navigator_agent": "sap-icon://map-3",
                "report_agent": "sap-icon://generate-shortcut",
                "visualization_agent": "sap-icon://multi-select"
            };
            return iconMapping[agentId] || "sap-icon://robot";
        },

        /**
         * 에이전트 색상 포맷터
         */
        formatAgentColor: function(agentId) {
            var colorMapping = {
                "general_qa_agent": "#6c5ce7",
                "quick_answer_agent": "#fdcb6e",
                "navigator_agent": "#00b894",
                "report_agent": "#e17055",
                "visualization_agent": "#0984e3"
            };
            return colorMapping[agentId] || "#00b894";
        },
        
        /**
         * 숫자 포맷터
         */
        formatNumber: function(value) {
            if (!value && value !== 0) return "";
            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },

        /**
         * 채팅 모델 초기화
         * @private
         */
        _initializeChatModel: function() {
            var oChatModel = new JSONModel({
                messages: [],
                isLoading: false,
                showWelcome: true,
                currentDate: this._getCurrentDate()
            });
            this.getView().setModel(oChatModel, "chat");
        },

        /**
         * 현재 날짜 포맷팅
         * @private
         */
        _getCurrentDate: function() {
            var oDate = new Date();
            var aWeekdays = ['일', '월', '화', '수', '목', '금', '토'];
            var sYear = oDate.getFullYear();
            var sMonth = (oDate.getMonth() + 1).toString().padStart(2, '0');
            var sDay = oDate.getDate().toString().padStart(2, '0');
            var sWeekday = aWeekdays[oDate.getDay()];
            
            return `${sYear}.${sMonth}.${sDay}(${sWeekday})`;
        },

        /**
         * 페이지 네비게이션
         * @private
         */
        _navigateToPage: function(url) {
            try {
                var sBaseURL = window.location.protocol + "//" + window.location.host;
                var sFullURL = url.startsWith('/') ? sBaseURL + url : 
                              sBaseURL + `/main/index.html#/pl/performance2&/#/${url}`;
                
                console.log("페이지 이동:", sFullURL);
                window.location.href = sFullURL;
            } catch (error) {
                console.error("페이지 네비게이션 오류:", error);
            }
        },

        /**
         * 메시지 전송
         * @private
         */
        _sendMessage: function(sMessage) {
            var oChatModel = this.getView().getModel("chat");
            var aMessages = oChatModel.getProperty("/messages");
            
            // 웰컴 메시지 숨기기 및 사용자 메시지 추가
            oChatModel.setProperty("/showWelcome", false);
            aMessages.push({
                id: this._generateMessageId(),
                type: "user",
                content: sMessage,
                timestamp: new Date(),
                displayTime: this._formatTime(new Date())
            });

            oChatModel.setProperty("/messages", aMessages);
            oChatModel.setProperty("/isLoading", true);
            
            this._scrollToBottom();
            this._executeAgent(sMessage);
        },

        /**
         * 에이전트 실행
         * @private
         */
        _executeAgent: function(sPrompt) {
            var oChatModel = this.getView().getModel("chat");
            
            var interactionData = {
                type: "chat_input",
                source: "ai_chat",
                timestamp: new Date().toISOString(),
                content: { text: sPrompt },
                context: { userInput: sPrompt }
            };

            var options = {
                showBusyDialog: false,
                showProgressPercentage: false,
                onProgress: function(progress) {
                    console.log("AI 처리 진행률:", progress + "%");
                },
                pollOptions: {
                    pollInterval: 2000,
                    maxTries: 30,
                    initialDelay: 500
                }
            };
            
            AgentService.processInteraction(interactionData, options)
            .then(function(result) {
                var parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
                this._addAIMessage(parsedResult);
            }.bind(this))
            .catch(function(error) {
                console.error("AI 처리 오류:", error);
                this._addAIMessage({
                    type: "error",
                    content: "처리 중 오류가 발생했습니다. 다시 시도해 주세요."
                });
                MessageToast.show("처리 중 오류가 발생했습니다.");
            }.bind(this))
            .finally(function() {
                oChatModel.setProperty("/isLoading", false);
            });
        },

        /**
         * AI 메시지 추가
         * @private
         */
        _addAIMessage: function(result) {
            var oChatModel = this.getView().getModel("chat");
            var aMessages = oChatModel.getProperty("/messages");
            
            var sContent = this._extractContent(result);
            var sSelectedAgent = result.master_result?.selected_agent || "";
            var oTableData = this._extractTableData(result.agent_result?.execution_results);
            var oNavigationData = null;

            // 네비게이터 에이전트 특별 처리
            if (sSelectedAgent === "navigator_agent" && result.agent_result?.executive_summary) {
                oNavigationData = this._processNavigatorResult(result.agent_result.executive_summary);
                sContent = oNavigationData.message;
            }
            
            var oAIMessage = {
                id: this._generateMessageId(),
                type: "ai",
                content: sContent,
                timestamp: new Date(),
                displayTime: this._formatTime(new Date()),
                selectedAgent: sSelectedAgent,
                tableData: oTableData,
                hasAgent: !!sSelectedAgent,
                hasTableData: !!oTableData,
                navigationData: oNavigationData,
                hasNavigation: !!oNavigationData
            };
            
            aMessages.push(oAIMessage);
            oChatModel.setProperty("/messages", aMessages);
            
            // 네비게이션 처리 (1개 메뉴인 경우 자동 이동)
            if (oNavigationData?.shouldNavigate && oNavigationData.targetUrl) {
                this._navigateToPage(oNavigationData.targetUrl);
            }
            
            setTimeout(this._scrollToBottom.bind(this), 100);
        },

        /**
         * 응답 내용 추출
         * @private
         */
        _extractContent: function(result) {
            if (result.type === "error") return result.content;
            
            return result.agent_result?.executive_summary ||
                   result.agent_result?.content ||
                   result.content ||
                   result.message ||
                   "응답을 받았습니다.";
        },

        /**
         * 네비게이터 결과 처리
         * @private
         */
        _processNavigatorResult: function(executiveSummary) {
            try {
                var oResult = JSON.parse(executiveSummary);
                var aSelectedMenus = oResult.selected_menus || [];
                
                switch (aSelectedMenus.length) {
                    case 0:
                        return {
                            type: "no_menu",
                            message: "",
                            menus: [],
                            shouldNavigate: false
                        };
                    case 1:
                        return {
                            type: "single_menu",
                            message: `'${aSelectedMenus[0].name}' 화면으로 이동합니다.`,
                            menus: aSelectedMenus,
                            shouldNavigate: true,
                            targetUrl: aSelectedMenus[0].url
                        };
                    default:
                        return {
                            type: "multiple_menus",
                            message: "",
                            menus: aSelectedMenus,
                            shouldNavigate: false
                        };
                }
            } catch (error) {
                console.error("네비게이터 결과 처리 오류:", error);
                return {
                    type: "error",
                    message: "화면 정보를 처리하는 중 오류가 발생했습니다.",
                    menus: [],
                    shouldNavigate: false
                };
            }
        },

        /**
         * execution_results에서 테이블 데이터 추출
         * @private
         */
        _extractTableData: function(executionResults) {
            if (!executionResults) return null;

            try {
                for (var key in executionResults) {
                    var stepResult = executionResults[key];
                    
                    if (Array.isArray(stepResult)) {
                        return stepResult;
                    }
                    
                    if (stepResult && typeof stepResult === 'object') {
                        for (var subKey in stepResult) {
                            if (Array.isArray(stepResult[subKey])) {
                                return stepResult[subKey];
                            }
                        }
                    }
                }
                return null;
            } catch (error) {
                console.error("테이블 데이터 추출 오류:", error);
                return null;
            }
        },

        /**
         * 채팅 영역을 맨 아래로 스크롤
         * @private
         */
        _scrollToBottom: function() {
            setTimeout(function() {
                var oChatContainer = this.byId("chatContainer");
                if (oChatContainer) {
                    var oDomRef = oChatContainer.getDomRef();
                    if (oDomRef) {
                        oDomRef.scrollTop = oDomRef.scrollHeight;
                    }
                }
            }.bind(this), 50);
        },
        
        /**
         * 메시지 ID 생성
         * @private
         */
        _generateMessageId: function() {
            return "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        },
        
        /**
         * 시간 포맷팅
         * @private
         */
        _formatTime: function(date) {
            return date.getHours().toString().padStart(2, '0') + ":" + 
                   date.getMinutes().toString().padStart(2, '0');
        }
    });
});