sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/EventBus",
    "bix/common/ai/service/AgentService"
], (BaseController, MessageToast, JSONModel, EventBus, AgentService) => {
    "use strict";

    return BaseController.extend("bix.ai.component.controller.AI", {
        _oEventBus: EventBus.getInstance(),
        _agentMappings: {
            names: {
                "general_qa_agent": "일반 질의 에이전트",
                "quick_answer_agent": "즉답형 에이전트", 
                "navigator_agent": "네비게이터 에이전트",
                "analysis_agent": "현황분석 에이전트",
                "visualization_agent": "시각화 에이전트",
                "report_agent": "보고서 에이전트"
            },
            icons: {
                "general_qa_agent": "./resource/icon/ai_agent/general_qa.png",
                "quick_answer_agent": "./resource/icon/ai_agent/quick_answer.png",
                "navigator_agent": "./resource/icon/ai_agent/navigator.png",
                "analysis_agent": "./resource/icon/ai_agent/analysis.png",
                "visualization_agent": "./resource/icon/ai_agent/visualization.png",
                "report_agent": "./resource/icon/ai_agent/report.png"
            },
            colors: {
                "general_qa_agent": "#6c5ce7",
                "quick_answer_agent": "#fdcb6e",
                "navigator_agent": "#00b894",
                "analysis_agent": "#e17055",
                "visualization_agent": "#0984e3",
                "report_agent": "#1e3a8a"
            }
        },

        /**
         * 컨트롤러 초기화
         */
        onInit() {
            this._initializeChatModel();
            this.onAiTilePress(null);
        },

        /**
         * 채팅봇 종료 이벤트 처리
         */
        onChatBotExit: function () {
            this._cancelCurrentRequest();
            this._oEventBus.publish("mainApp", "chatBotBtn");
            this._oEventBus.publish("splitter", "chatBotBtn");
            this.getView().getModel("ui").setProperty("/initPage", true);
        },

        /**
         * AI 타일 클릭 이벤트 처리
         * @param {sap.ui.base.Event} oEvent - 클릭 이벤트
         */
        onAiTilePress: function (oEvent) {
            // 대화 진행 중에는 타일 클릭 불가
            if (this._isChatInProgress()) {
                return;
            }

            if (oEvent) {
                const oClickedTile = oEvent.getSource();

                // disabled 상태 체크
                if (oClickedTile.getState() === "Disabled" || !oClickedTile.getPressEnabled()) {
                    return;
                }
                
                this._setActiveTile(oClickedTile);
                this.getView().getModel("ui").setProperty("/tileSelectTitle", oClickedTile.getHeader());
            }
            else {
                const oInitTile = this.byId("initTile");
                this._setActiveTile(oInitTile);
                this.getView().setModel(new JSONModel({
                    tileSelectTitle: oInitTile.getHeader(), 
                    initPage: true
                }), "ui");
            }
        },

        /**
         * 미리 정의된 버튼 클릭 이벤트 처리
         * @param {sap.ui.base.Event} oEvent - 버튼 클릭 이벤트
         */
        onQuickActionPress: function(oEvent) {
            if (this._isChatInProgress()) {
                MessageToast.show("대화가 진행 중입니다. 잠시 후 다시 시도해주세요.");
                return;
            }

            const sText = oEvent.getSource().getText();
            this._sendMessage(sText);
        },
        
        /**
         * 검색 버튼 클릭 또는 엔터키 이벤트 처리
         * @param {sap.ui.base.Event} oEvent - 검색 이벤트
         */
        onSearch: function(oEvent) {
            if (this._isChatInProgress()) {
                MessageToast.show("대화가 진행 중입니다. 잠시 후 다시 시도해주세요.");
                return;
            }
        
            // SearchField 또는 Button 이벤트 모두 처리
            const oSearchField = this.byId("SearchFieldId");
            const sQuery = oEvent.getParameter("query") || oSearchField.getValue();
            
            // 빈 값이거나 공백만 있는 경우 체크
            if (!sQuery || !sQuery.trim()) {
                MessageToast.show("질문을 입력해 주세요.");
                oSearchField.focus(); // 포커스를 다시 입력창으로
                return;
            }
            
            this.getView().getModel("ui").setProperty("/initPage", false);
            this._sendMessage(sQuery.trim());
            oSearchField.setValue(""); // SearchField 값 초기화
        },

        /**
         * 대화 중지 버튼 클릭 이벤트 처리
         */
        onStopChat: function() {
            this._cancelCurrentRequest();
            
            // 중지 메시지를 AI 응답으로 추가
            this._addAIMessage({
                type: "cancelled",
                content: "사용자의 요청에 의해 대화가 중지되었습니다.",
                agent_result: {
                    status: "CANCELLED"
                }
            });
            
            MessageToast.show("대화가 중지되었습니다.");
        },

        /**
         * 채팅창 토글 이벤트 처리
         */
        onToggleChat: function() {
            const oChatModel = this.getView().getModel("chat");
            const bShowWelcome = oChatModel.getProperty("/showWelcome");

            oChatModel.setProperty("/showWelcome", !bShowWelcome);
            
            if (!bShowWelcome) {
                this._resetChat();
                this.onChatBotExit();
            }
        },

        /**
         * 메인 화면 네비게이션 이벤트 처리
         */
        onMainNavigationPress: function() {
            this._navigateToPage("/main/index.html#");
        },

        /**
         * 메뉴 네비게이션 이벤트 처리
         * @param {sap.ui.base.Event} oEvent - 메뉴 클릭 이벤트
         */
        onMenuNavigationPress: function(oEvent) {
            const oBindingContext = oEvent.getSource().getBindingContext("chat");
            if (oBindingContext) {
                const oMenuData = oBindingContext.getObject();
                if (oMenuData && oMenuData.url) {
                    this._navigateToPage(oMenuData.url);
                }
            }
        },
        
        /**
         * 기본 보고서(월마감) 팝업 열기 이벤트 처리
         */
        onDefaultReportPress: function() {
            this._openReportPopup("aiReportMonth.html#/MainMonthly", "전사 월마감 보고서");
        },

        /**
         * 보고서 팝업 열기 이벤트 처리 
         * @param {sap.ui.base.Event} oEvent - 버튼 클릭 이벤트
         */
        onReportOpenPress: function(oEvent) {
            const oBindingContext = oEvent.getSource().getBindingContext("chat");
            if (oBindingContext) {
                const oReportData = oBindingContext.getObject();
                if (oReportData && oReportData.url) {
                    this._openReportPopup(oReportData.url, oReportData.name);
                }
            }
        },

        /**
         * 에이전트 이름 포맷터
         * @param {string} agentId - 에이전트 ID
         * @returns {string} 한국어 에이전트 이름
         */
        formatAgentName: function(agentId) {
            return this._agentMappings.names[agentId] || agentId;
        },

        /**
         * 에이전트 아이콘 포맷터
         * @param {string} agentId - 에이전트 ID
         * @returns {string} 아이콘 파일 경로
         */

        formatAgentIcon: function(agentId) {
            return this._agentMappings.icons[agentId] || "sap-icon://robot";
        },

        /**
         * 에이전트 색상 포맷터
         * @param {string} agentId - 에이전트 ID
         * @returns {string} 색상 hex 코드
         */
        formatAgentColor: function(agentId) {
            return this._agentMappings.colors[agentId] || "#00b894";
        },
        
        /**
         * 숫자 포맷터
         * @param {number|string} value - 포맷할 숫자
         * @returns {string} 콤마가 추가된 숫자 문자열
         */
        formatNumber: function(value) {
            if (!value && value !== 0) return "";
            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },

        /**
         * 대화 진행 중인지 확인
         * @returns {boolean} 대화 진행 중 여부
         * @private
         */
        _isChatInProgress: function() {
            const oChatModel = this.getView().getModel("chat");
            return oChatModel && oChatModel.getProperty("/isLoading");
        },

        /**
         * 활성 타일 설정
         * @param {sap.m.GenericTile} oActiveTile - 활성화할 타일
         * @private
         */
        _setActiveTile: function(oActiveTile) {
            const aTiles = this.getView().getControlsByFieldGroupId("aiTile")
                .filter(oControl => oControl.isA("sap.m.GenericTile") && oControl.getId() !== oActiveTile.getId());

            aTiles.forEach(oTile => oTile.removeStyleClass("tileActive"));
            oActiveTile.addStyleClass("tileActive");
        },

        /**
         * 채팅 리셋
         * @private
         */
        _resetChat: function() {
            const oChatModel = this.getView().getModel("chat");
            oChatModel.setProperty("/messages", []);
            oChatModel.setProperty("/isLoading", false);
        },

        /**
         * 현재 요청 취소
         * @private
         */
        _cancelCurrentRequest: function() {
            if (this._abortController) {
                this._abortController.abort();
                console.log("현재 요청을 취소했습니다.");
            }

            // 새로운 요청 ID로 갱신 (이전 요청 결과 무시용)
            this._currentRequestId = this._generateMessageId();
            
            const oChatModel = this.getView().getModel("chat");
            if (oChatModel) {
                oChatModel.setProperty("/isLoading", false);
            }
            
            this._currentRequest = null;
            this._abortController = null;
        },

        /**
         * 채팅 모델 초기화
         * @private
         */
        _initializeChatModel: function() {
            const oChatModel = new JSONModel({
                messages: [],
                isLoading: false,
                showWelcome: true,
                currentDate: this._getCurrentDate()
            });
            this.getView().setModel(oChatModel, "chat");
        },

        /**
         * 현재 날짜 포맷팅
         * @returns {string} 포맷된 날짜 문자열 (YYYY.MM.DD(요일))
         * @private
         */
        _getCurrentDate: function() {
            const oDate = new Date();
            const aWeekdays = ['일', '월', '화', '수', '목', '금', '토'];
            const sYear = oDate.getFullYear();
            const sMonth = (oDate.getMonth() + 1).toString().padStart(2, '0');
            const sDay = oDate.getDate().toString().padStart(2, '0');
            const sWeekday = aWeekdays[oDate.getDay()];

            return `${sYear}.${sMonth}.${sDay}(${sWeekday})`;
        },

        /**
         * 페이지 네비게이션
         * @param {string} url - 이동할 URL
         * @private
         */
        _navigateToPage: function(url) {
            try {
                const sBaseURL = window.location.protocol + "//" + window.location.host;
                const sFullURL = url.startsWith('/') ? sBaseURL + url : 
                              sBaseURL + `/main/index.html#/${url}`;

                console.log("페이지 이동:", sFullURL);
                window.location.href = sFullURL;
            } catch (error) {
                console.error("페이지 네비게이션 오류:", error);
            }
        },

        /**
         * 메시지 전송
         * @param {string} sMessage - 전송할 메시지
         * @private
         */
        _sendMessage: function(sMessage) {
            const oChatModel = this.getView().getModel("chat");
            const aMessages = oChatModel.getProperty("/messages");

            // 고유한 요청 ID 생성
            this._currentRequestId = this._generateMessageId();
            
            // 대화 상태 설정
            oChatModel.setProperty("/showWelcome", false);
            oChatModel.setProperty("/isLoading", true);
            
            // 사용자 메시지 추가
            aMessages.push({
                id: this._generateMessageId(),
                type: "user",
                content: sMessage,
                timestamp: new Date(),
                displayTime: this._formatTime(new Date()),
                requestId: this._currentRequestId // 요청 ID 추가
            });
            
            oChatModel.setProperty("/messages", aMessages);
            this._scrollToBottom();
            this._executeAgent(sMessage);
        },

        /**
         * 에이전트 실행
         * @param {string} sPrompt - 사용자 질문
         * @private
         */
        _executeAgent: function(sPrompt) {
            const oChatModel = this.getView().getModel("chat");
            const sRequestId = this._currentRequestId; // 현재 요청 ID 저장
            
            // AbortController 생성 (취소용)
            this._abortController = new AbortController();
            
            const interactionData = {
                interaction: {
                    type: "chat_input",
                    timestamp: new Date().toISOString()
                },
                context: {
                    userInput: sPrompt
                }
            };
            
            const options = {
                showBusyDialog: false,
                showProgressPercentage: false,
                signal: this._abortController.signal,
                onProgress: function(progress) {
                    console.log("AI 처리 진행률:", progress + "%");
                },
                pollOptions: {
                    pollInterval: 2000,
                    maxTries: 30,
                    initialDelay: 500
                }
            };
            
            // 현재 요청 저장 (취소용)
            this._currentRequest = AgentService.processInteraction(interactionData, options)
                .then(function(result) {
                    // 요청 ID가 다르면 (새로운 요청이 시작된 경우) 결과 무시
                    if (sRequestId !== this._currentRequestId) {
                        console.log(`이전 요청 결과 무시: ${sRequestId} !== ${this._currentRequestId}`);
                        return;
                    }
                                        
                    // 취소되었으면 결과 처리하지 않음
                    if (this._abortController && this._abortController.signal.aborted) {
                        console.log("요청이 취소되어 결과를 무시합니다.");
                        return;
                    }
                    
                    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
                    this._addAIMessage(parsedResult, sRequestId);
                }.bind(this))
                .catch(function(error) {
                    // 요청 ID가 다르면 에러도 무시
                    if (sRequestId !== this._currentRequestId) {
                        console.log(`이전 요청 에러 무시: ${sRequestId} !== ${this._currentRequestId}`);
                        return;
                    }
                    
                    // 취소 에러는 무시
                    if (error.name === 'AbortError' || (this._abortController && this._abortController.signal.aborted)) {
                        console.log("요청이 사용자에 의해 취소되었습니다.");
                        return;
                    }
                    
                    console.error("AI 처리 오류:", error);
                    this._addAIMessage({
                        type: "error",
                        content: "처리 중 오류가 발생했습니다. 다시 시도해 주세요."
                    }, sRequestId);
                    MessageToast.show("처리 중 오류가 발생했습니다.");
                }.bind(this))
                .finally(function() {
                    // 현재 요청의 결과인 경우에만 로딩 상태 해제
                    if (sRequestId === this._currentRequestId) {
                        oChatModel.setProperty("/isLoading", false);
                    }
                    
                    // 현재 요청이 완료된 경우에만 정리
                    if (sRequestId === this._currentRequestId) {
                        this._currentRequest = null;
                        this._abortController = null;
                    }
                }.bind(this));
        },

        /**
         * AI 메시지 추가
         * @param {Object} result - AI 응답 결과
         * @param {string} requestId - 요청 ID (선택사항)
         * @private
         */
        _addAIMessage: function(result, requestId) {
            // 요청 ID가 다르면 메시지 추가하지 않음
            if (requestId && requestId !== this._currentRequestId) {
                console.log(`이전 요청 메시지 무시: ${requestId} !== ${this._currentRequestId}`);
                return;
            }

            const oChatModel = this.getView().getModel("chat");
            const aMessages = oChatModel.getProperty("/messages");
            
            const sSelectedAgent = result.master_result?.selected_agent || "";
            const oTableData = this._extractTableData(result.agent_result?.execution_results);
            let oNavigationData = null;
            let oReportData = null; 
            let sContent = this._extractContent(result);
        
            // 네비게이터 에이전트 특별 처리
            if (sSelectedAgent === "navigator_agent" && result.agent_result?.executive_summary) {
                oNavigationData = this._processNavigatorResult(result.agent_result.executive_summary);

                if (oNavigationData && oNavigationData.message) {
                    sContent = oNavigationData.message;
                }
            }

            // 보고서 에이전트 특별 처리
            if (sSelectedAgent === "report_agent" && result.agent_result?.executive_summary) {
                oReportData = this._processReportNavigatorResult(result.agent_result.executive_summary);

                if (oReportData && oReportData.message) {
                    sContent = oReportData.message;
                }
            }
            
            const oAIMessage = {
                id: this._generateMessageId(),
                type: "ai",
                content: this._contentFormat(sContent),
                timestamp: new Date(),
                displayTime: this._formatTime(new Date()),
                selectedAgent: sSelectedAgent,
                tableData: oTableData,
                hasAgent: !!sSelectedAgent,
                hasTableData: !!oTableData,
                navigationData: oNavigationData,
                hasNavigation: !!oNavigationData,
                reportData: oReportData,
                hasReport: !!oReportData,
                requestId: requestId // 요청 ID 추가
            };
            
            aMessages.push(oAIMessage);
            oChatModel.setProperty("/messages", aMessages);
            
            // 네비게이션 처리 (1개 메뉴인 경우 자동 이동)
            if (oNavigationData?.shouldNavigate && oNavigationData.targetUrl) {
                this._navigateToPage(oNavigationData.targetUrl);
            }

            // 보고서 처리 (1개 보고서인 경우 팝업으로 열기)
            if (oReportData?.shouldOpenReport && oReportData.reportUrl) {
                this._openReportPopup(oReportData.reportUrl, oReportData.reportName);
            }
            
            setTimeout(this._scrollToBottom.bind(this), 100);
        },

        /**
         * JSON형식 컨텐츠를 HTML형식으로 변환
         * @param {string} sContent - 변환할 컨텐츠
         * @returns {string} HTML 형태로 변환된 컨텐츠
         * @private
         */
        _contentFormat: function (sContent) {
            try {
                let oFormatContent = "";
                if (this._isValidJSON(sContent)) {
                    const oContent = JSON.parse(sContent);
                    if (oContent.answer) {
                        oFormatContent += `<dt>${oContent.answer}</dt>`;
                    }
                    if (oContent.insights) {
                        const sListItems = oContent.insights.map(sItem => `<dd>${sItem}</dd>`).join('');
                        oFormatContent += sListItems;
                    }
                }
                else {
                    oFormatContent = `<dt>${sContent}</dt>`;
                }
                return `<div class="bg_area"><dl class="list_type">${oFormatContent}</dl></div>`;
            } catch (error) {
                console.error("콘텐츠 포맷 오류:", error);
                return sContent;
            }
        },

        /**
         * JSON 유효성 검사
         * @param {string} str - 검사할 문자열
         * @returns {boolean} JSON 유효성 여부
         * @private
         */
        _isValidJSON: function(str) {
            try {
                JSON.parse(str);
                return true;
            } catch {
                return false;
            }
        },

        /**
         * 응답 내용 추출
         * @param {Object} result - AI 응답 결과
         * @returns {string} 추출된 메시지 내용
         * @private
         */
        _extractContent: function(result) {
            console.log("result::", result);

            if (result.type === "error") return result.content;
            if (result.type === "cancelled") return result.content; // 중지 타입 추가
            
            // 보안 위반 처리
            if (result.agent_result?.security_violation) {
                return result.agent_result.executive_summary || "보안 정책에 따라 요청이 제한되었습니다.";
            }
            
            // 에이전트 상태별 처리
            if (result.agent_result?.status === "SECURITY_BLOCKED") {
                return result.agent_result.executive_summary || "요청이 차단되었습니다.";
            }
            
            if (result.agent_result?.status === "CANCELLED") {
                return result.agent_result.executive_summary || "대화가 중지되었습니다.";
            }
            
            if (result.agent_result?.status === "error" || result.agent_result?.status === "ERROR") {
                return result.agent_result.executive_summary || "처리 중 오류가 발생했습니다.";
            }
            
            // 정상 응답 처리
            return result.agent_result?.executive_summary ||
                result.agent_result?.content ||
                result.content ||
                result.message ||
                "응답을 받았습니다.";
        },        

        /**
         * 네비게이터 결과 처리
         * @param {string} executiveSummary - 네비게이터 응답 JSON 문자열
         * @returns {Object|null} 네비게이션 데이터 객체 또는 null
         * @private
         */
        _processNavigatorResult: function(executiveSummary) {
            try {
                const oResult = JSON.parse(executiveSummary);
                const aSelectedMenus = oResult.map(function(menu) {
                    return {
                        id: menu.ID || menu.id,
                        name: menu.NAME || menu.name,
                        url: menu.URL || menu.url
                    };
                });

                switch (aSelectedMenus.length) {
                    case 0:
                        return {
                            type: "no_menu",
                            message: "요청하신 화면을 찾을 수 없습니다.",
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
                            message: "다음 화면 중 선택해주세요.",
                            menus: aSelectedMenus,
                            shouldNavigate: false
                        };
                }
            } catch (error) {
                console.error("네비게이터 결과 처리 오류:", error);
                return null;
            }
        },

        /**
         * 보고서 결과 처리
         * @param {string} executiveSummary - 보고서 응답 JSON 문자열
         * @returns {Object|null} 보고서 데이터 객체 또는 null
         * @private
         */
        _processReportNavigatorResult: function(executiveSummary) {
            try {
                const oResult = JSON.parse(executiveSummary);
                let aSelectedReports = [];
                
                // 단일 보고서 ID인 경우
                if (oResult.report_id) {
                    if (oResult.report_id === null) {
                        // null인 경우 빈 배열로 처리
                        aSelectedReports = [];
                    }
                    else {
                        aSelectedReports = [{
                            id: oResult.report_id,
                            name: oResult.report_name || "보고서",
                            url: oResult.route_template || ""
                        }];
                    }
                }
                // 배열 형태인 경우
                else if (Array.isArray(oResult)) {
                    aSelectedReports = oResult.map(function(report) {
                        return {
                            id: report.ID || report.id,
                            name: report.NAME || report.name,
                            url: report.ROUTE_TEMPLATE || report.url
                        };
                    });
                }
        
                switch (aSelectedReports.length) {
                    case 0:
                        return {
                            type: "no_report",
                            message: "요청하신 보고서를 찾을 수 없습니다.",
                            reports: [],
                            shouldOpenReport: false
                        };
                    case 1:
                        return {
                            type: "single_report",
                            message: `'${aSelectedReports[0].name}' 찾았습니다.`,
                            reports: aSelectedReports,
                            reportId: aSelectedReports[0].id,
                            reportName: aSelectedReports[0].name,
                            reportUrl: aSelectedReports[0].url,
                            shouldOpenReport: true
                        };
                    default:
                        return {
                            type: "multiple_reports",
                            message: "다음 보고서 중 선택해주세요.",
                            reports: aSelectedReports,
                            shouldOpenReport: false
                        };
                }
                
            } catch (error) {
                console.error("보고서 네비게이터 결과 처리 오류:", error);
                return {
                    type: "error",
                    message: "보고서 처리 중 오류가 발생했습니다.",
                    shouldOpenReport: false
                };
            }
        },

        /**
         * 테이블 데이터 추출
         * @param {Object} executionResults - 실행 결과 객체
         * @returns {Array|null} 테이블 데이터 배열 또는 null
         * @private
         */
        _extractTableData: function(executionResults) {
            if (!executionResults) return null;
            
            try {
                for (const key in executionResults) {
                    const stepResult = executionResults[key];

                    if (Array.isArray(stepResult)) {
                        return stepResult;
                    }
                    
                    if (stepResult && typeof stepResult === 'object') {
                        for (const subKey in stepResult) {
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
         * 보고서 팝업 열기
         * @param {string} reportUrl - 보고서 URL
         * @param {string} reportName - 보고서 이름
         * @private
         */
        _openReportPopup: function(reportUrl, reportName) {
            try {
                const sBaseURL = window.location.protocol + "//" + window.location.host;
                const sFullURL = reportUrl.startsWith('/') ? sBaseURL + reportUrl : 
                              sBaseURL + `/main/${reportUrl}`;
        
                console.log("보고서 팝업 열기:", sFullURL);
                
                // 팝업 크기
                const width = 1200;
                const height = 800;
                
                // 화면 가로/세로 중앙 위치 계산 (태스크바 고려)
                const left = Math.round((window.screen.availWidth - width) / 2);
                const top = Math.round((window.screen.availHeight - height) / 2);
                
                // 팝업 창 설정 (정확한 중앙 위치)
                const popupFeatures = `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`;
                
                // 새 창에서 보고서 열기
                const popup = window.open(sFullURL, `report_${Date.now()}`, popupFeatures);
                
                if (!popup) {
                    MessageToast.show("팝업이 차단되었습니다. 팝업 차단을 해제해주세요.");
                }
                else {
                    MessageToast.show(`${reportName} 보고서를 새 창에서 열었습니다.`);
                }
                
            } catch (error) {
                console.error("보고서 팝업 열기 오류:", error);
                MessageToast.show("보고서를 여는 중 오류가 발생했습니다.");
            }
        },
        
        /**
         * 채팅 영역을 맨 아래로 스크롤
         * @private
         */
        _scrollToBottom: function() {
            setTimeout(function() {
                const oChatContainer = this.byId("chatContainer");
                if (oChatContainer) {
                    const oDomRef = oChatContainer.getDomRef();
                    if (oDomRef) {
                        oDomRef.scrollTop = oDomRef.scrollHeight;
                    }
                }
            }.bind(this), 50);
        },
        
        /**
         * 메시지 ID 생성
         * @returns {string} 고유한 메시지 ID
         * @private
         */
        _generateMessageId: function() {
            return "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        },
        
        /**
         * 시간 포맷팅
         * @param {Date} date - 포맷할 Date 객체
         * @returns {string} HH:MM 형태의 시간 문자열
         * @private
         */
        _formatTime: function(date) {
            return date.getHours().toString().padStart(2, '0') + ":" + 
                   date.getMinutes().toString().padStart(2, '0');
        }
    });
});