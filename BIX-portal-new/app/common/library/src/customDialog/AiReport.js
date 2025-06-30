sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/core/Control",
    "sap/m/Token",
    "../../../main/util/Module"
], function (Fragment, Control, Token, Module) {
    "use strict";

    var oExtendControl = {
        metadata: {
            properties: {
                cardName: { type: "string" },
                fragmentController: { type: "object" },
                agentInfo: { type: "object", defaultValue: null },
                aiContent: { type: "string", defaultValue: "" },
                tokenData: { type: "object", defaultValue: null },
                isLoading: { type: "boolean", defaultValue: false }
            },
            aggregations: {
                _table: { type: "object", multiple: false, visibility: "hidden" },
                _html: { type: "object", multiple: false, visibility: "hidden" }
            },
            events: {
                beforeOpen: {},
                beforeClose: {},
                afterOpen: {},
                afterClose: {}
            }
        },

        _pDialog: undefined,
        _oDialog: undefined,
        _pPopover: undefined,
        _hoveringButton: false,
        _PopoverTimer: null,

        constructor: function (sId, mSettings) {
            Control.prototype.constructor.apply(this, arguments);
            if (!this._oDialog) {
                this._loadFragment();
            }
        },

        init: function () {
            Control.prototype.init.apply(this, arguments);
        },

        /**
         * 다이얼로그 열기
         */
        open: async function () {
            this._loadFragment().then(oDialog => oDialog.open());
        },

        /**
         * 다이얼로그 닫기
         */
        close: function () {
            if (this._oDialog) {
                this._oDialog.close();
            }
        },

        /**
         * 콘텐츠 업데이트
         * @param {object} oContentData - 업데이트할 콘텐츠 데이터
         */
        updateContent: function (oContentData) {
            if (oContentData.agentInfo) {
                this.setAgentInfo(oContentData.agentInfo);
            }
            if (oContentData.aiContent !== undefined) {
                this.setAiContent(oContentData.aiContent);
            }
            if (oContentData.isLoading !== undefined) {
                this.setIsLoading(oContentData.isLoading);
            }

            // UI 업데이트
            this._updateDialogContent();
        },

        /**
         * 진행률 업데이트
         * @param {number} iProgress - 진행률 (0-100)
         */
        updateProgress: function (iProgress) {
            if (!this.getIsLoading()) return;

            let sProgressText;
            if (iProgress <= 20) {
                sProgressText = "데이터를 준비하고 있습니다";
            }
            else if (iProgress <= 50) {
                sProgressText = "AI 에이전트를 선택하고 있습니다";
            }
            else if (iProgress <= 80) {
                sProgressText = "분석을 수행하고 있습니다";
            }
            else {
                sProgressText = "결과를 정리하고 있습니다";
            }

            this.setAiContent(sProgressText);
            this._updateDialogContent();
        },

        /**
         * Fragment 로드
         * @private
         */
        _loadFragment: async function () {
            if (!this._pDialog) {
                this._pDialog = new Promise(function (resolve) {
                    // 기존 다이얼로그 close
                    sap.m.InstanceManager.closeAllDialogs();

                    let oController = this.getFragmentController();

                    Fragment.load({
                        id: this.getId(),
                        name: "bix.common.library.customDialog.AiReport",
                        controller: oController
                    }).then(function (oDialog) {
                        this._oDialog = oDialog;
                        this._attachEventHandlers();
                        this._attachDialogEvents(oDialog);
                        resolve(oDialog);
                    }.bind(this));
                }.bind(this));
            }
            return this._pDialog;
        },

        /**
         * 다이얼로그 이벤트 연결
         * @private
         */
        _attachDialogEvents: function (oDialog) {
            oDialog.attachBeforeOpen(() => {
                this._setupDialog();
                this.fireBeforeOpen();
            });

            oDialog.attachAfterOpen(() => {
                this._forceUpdateButtons();
                this.fireAfterOpen();
            });

            oDialog.attachBeforeClose(() => this.fireBeforeClose());
            oDialog.attachAfterClose(() => this.fireAfterClose());
        },

        /**
         * 이벤트 핸들러 설정
         * @private
         */
        _attachEventHandlers: function () {
            // 취소 버튼
            Fragment.byId(this.getId(), "cancelButton").attachPress(() => {
                this.close();
                this._resetAiModel();
            });

            // PDF 다운로드 버튼
            Fragment.byId(this.getId(), "downloadButton").attachPress(() => {
                this._handleDownload();
            });

            // AI Agent 버튼
            Fragment.byId(this.getId(), "aiAgentButton").attachPress(() => {
                const agentInfo = this.getAgentInfo();
                const agentName = agentInfo?.name || "AI 에이전트";
                console.log(`${agentName} 버튼 클릭`);
            });

            // 마우스 호버 이벤트
            Fragment.byId(this.getId(), "aiAgentButton").addEventDelegate({
                onmouseover: this._onHover.bind(this),
                onmouseout: this._onLeave.bind(this)
            });
        },

        /**
         * 마우스 호버 시 팝오버 표시
         * @private
         */
        _onHover: function (oEvent) {
            if (this.getIsLoading()) return;

            let oButton = oEvent.srcControl;
            this._hoveringButton = true;

            if (!this._pPopover) {
                this._pPopover = Fragment.load({
                    id: this.getId(),
                    name: "bix.common.library.customDialog.Popover",
                    controller: this
                }).then(function (oPopover) {
                    this.addDependent(oPopover);
                    return oPopover;
                }.bind(this));
            }

            this._pPopover.then(function (oPopover) {
                if (!this.getIsLoading() && !oPopover.isOpen()) {
                    this._updatePopoverContent(oPopover);
                    oPopover.openBy(oButton);
                }
            }.bind(this));
        },

        /**
         * 마우스 떠날 때 팝오버 닫기
         * @private
         */
        _onLeave: function () {
            this._hoveringButton = false;

            if (this._PopoverTimer) {
                clearTimeout(this._PopoverTimer);
            }

            this._PopoverTimer = setTimeout(() => {
                if (!this._hoveringButton && this._pPopover) {
                    this._pPopover.then(oPopover => oPopover.close());
                }
            }, 100);
        },

        /**
         * 다운로드 처리
         * @private
         */
        _handleDownload: function () {
            if (this.getIsLoading()) {
                console.warn("분석이 진행 중입니다. 완료 후 다운로드해주세요.");
                return;
            }

            try {
                const oHighlight = Fragment.byId(this.getId(), "highlightBox") ||
                    Fragment.byId(this.getId(), "highlighText");
                const dom = oHighlight.getDomRef();
                const oCard = Fragment.byId(this.getId(), "card");
                const oCardComponent = oCard.getCardContent()._oComponent;
                const oCardView = oCardComponent.getAggregation("rootControl");
                const oCardContent = oCardView.getControlsByFieldGroupId("content").find(object => {
                    return object.getFieldGroupIds().length > 0 && object?.getVisible();
                });

                if (oCardContent && oCardContent.isA("sap.ui.table.Table")) {
                    Module.pdfTableDownload(oCardContent, "AiReport", dom);
                }
                else {
                    console.log("차트 PDF 다운로드는 구현되지 않음");
                }
            } catch (error) {
                console.error("PDF 다운로드 중 오류:", error);
            }
        },

        /**
         * 다이얼로그 초기 설정
         * @private
         */
        _setupDialog: function () {
            // 초기 콘텐츠 업데이트
            this._updateDialogContent();

            // 카드 설정
            this._setupCard();

            // 토큰 설정
            this._setupTokens();
        },

        /**
         * 카드 설정
         * @private
         */
        _setupCard: function () {
            let oCard = Fragment.byId(this.getId(), "card");
            if (oCard && this.getCardName()) {
                oCard.setManifest(`../bix/card/${this.getCardName()}/manifest.json`);
            }
        },

        /**
         * 버튼 상태 강제 업데이트
         * @private
         */
        _forceUpdateButtons: function () {
            if (!this.getIsLoading()) return;

            const oAgentButton = Fragment.byId(this.getId(), "aiAgentButton");
            if (oAgentButton) {
                oAgentButton.setText("분석 중...");
                oAgentButton.setEnabled(false);
                oAgentButton.setBusy(true);
            }

            const oDownloadButton = Fragment.byId(this.getId(), "downloadButton");
            if (oDownloadButton) {
                oDownloadButton.setEnabled(false);
                oDownloadButton.setTooltip("분석 완료 후 다운로드 가능합니다");
            }
        },

        /**
         * 다이얼로그 콘텐츠 업데이트
         * @private
         */
        _updateDialogContent: function () {
            if (!this._oDialog) return;

            this._updateAgentButton();
            this._updateHighlightArea();
            this._updateDownloadButton();

            // 팝오버가 열려있다면 내용도 업데이트
            if (this._pPopover) {
                this._pPopover.then(oPopover => {
                    if (oPopover && oPopover.isOpen()) {
                        this._updatePopoverContent(oPopover);
                    }
                });
            }
        },

        /**
         * 에이전트 버튼 업데이트
         * @private
         */
        _updateAgentButton: function () {
            let oAgentButton = Fragment.byId(this.getId(), "aiAgentButton");
            if (!oAgentButton) return;

            if (this.getIsLoading()) {
                oAgentButton.setText("에이전트 선택 중");
                oAgentButton.setEnabled(false);
                oAgentButton.setBusy(true);
                oAgentButton.setIcon("");
                oAgentButton.setTooltip("");
            }
            else {
                const agentInfo = this.getAgentInfo();
                const agentName = agentInfo?.name || "AI 에이전트";
                const agentIcon = agentInfo?.iconPath || "sap-icon://ai";
                const agentDescription = agentInfo?.description || "";

                oAgentButton.setText(agentName);
                oAgentButton.setIcon(agentIcon);
                oAgentButton.setTooltip(agentDescription);
                oAgentButton.setEnabled(true);
                oAgentButton.setBusy(false);
            }
        },

        /**
         * 하이라이트 영역 업데이트
         * @private
         */
        _updateHighlightArea: function () {
            let oHighlightText = Fragment.byId(this.getId(), "highlighText");
            if (!oHighlightText) return;

            // Panel busy 상태 설정
            let oHighlightPanel = oHighlightText.getParent();
            if (oHighlightPanel && oHighlightPanel.setBusy) {
                oHighlightPanel.setBusy(this.getIsLoading());
                if (this.getIsLoading()) {
                    oHighlightPanel.setBusyIndicatorDelay(0);
                }
            }

            // 콘텐츠 설정
            const htmlContent = this.getIsLoading() ?
                this._createLoadingHtml() :
                this._convertToHtml(this.getAiContent());


            oHighlightText.setHtmlText(htmlContent);

            //console.log("fullHtmlContent",htmlContent)
        },

        /**
         * 다운로드 버튼 업데이트
         * @private
         */
        _updateDownloadButton: function () {
            let oDownloadButton = Fragment.byId(this.getId(), "downloadButton");
            if (!oDownloadButton) return;

            oDownloadButton.setEnabled(!this.getIsLoading());

            const tooltip = this.getIsLoading() ?
                "분석 완료 후 다운로드 가능합니다" :
                "PDF 다운로드";
            oDownloadButton.setTooltip(tooltip);
        },

        /**
         * 팝오버 내용 업데이트
         * @private
         */
        _updatePopoverContent: function (oPopover) {
            const agentInfo = this.getAgentInfo();

            if (agentInfo && oPopover) {
                this._setPopoverAgentInfo(oPopover, agentInfo);
            }
            else {
                this._setDefaultPopoverContent(oPopover);
            }
        },

        /**
         * 팝오버에 에이전트 정보 설정
         * @private
         */
        _setPopoverAgentInfo: function (oPopover, agentInfo) {

            //디자인 적용으로 인한 header 삭제 2025.06.27
            // // 헤더 아이콘 업데이트
            // const oHeaderImage = Fragment.byId(this.getId(), "popoverIcon");
            // if (oHeaderImage && agentInfo.iconPath) {
            //     oHeaderImage.setSrc(agentInfo.iconPath);
            // }

            // // 헤더 타이틀 업데이트
            // const oHeaderTitle = oPopover.getCustomHeader().getContent().find(control => 
            //     control.isA && control.isA("sap.m.Title")
            // );
            // if (oHeaderTitle && agentInfo.name) {
            //     oHeaderTitle.setText(agentInfo.name);
            // }

            // 본문 텍스트 업데이트
            const oContentVBox = oPopover.getContent()[0];
            if (oContentVBox && oContentVBox.isA("sap.m.VBox")) {
                const oContentText = oContentVBox.getItems().find(control =>
                    control.isA && control.isA("sap.m.Text")
                );
                if (oContentText && agentInfo.description) {
                    oContentText.setText(agentInfo.description);
                }
            }
        },

        /**
         * 팝오버 기본 내용 설정
         * @private
         */
        _setDefaultPopoverContent: function (oPopover) {
            if (!oPopover) return;

            // 기본 아이콘
            const oHeaderIcon = oPopover.getCustomHeader().getContent().find(control =>
                control.isA && control.isA("sap.ui.core.Icon")
            );
            if (oHeaderIcon) {
                oHeaderIcon.setSrc("sap-icon://manager-insight");
            }

            // 기본 타이틀
            const oHeaderTitle = oPopover.getCustomHeader().getContent().find(control =>
                control.isA && control.isA("sap.m.Title")
            );
            if (oHeaderTitle) {
                oHeaderTitle.setText("AI 에이전트");
            }

            // 기본 텍스트
            const oContentVBox = oPopover.getContent()[0];
            if (oContentVBox && oContentVBox.isA("sap.m.VBox")) {
                const oContentText = oContentVBox.getItems().find(control =>
                    control.isA && control.isA("sap.m.Text")
                );
                if (oContentText) {
                    oContentText.setText("AI 에이전트 선택 중입니다.");
                }
            }
        },

        /**
         * 토큰 설정
         * @private
         */
        _setupTokens: function () {
            try {
                let oTokenizer = Fragment.byId(this.getId(), "searchTokenizer");
                if (!oTokenizer) {
                    console.warn("토크나이저를 찾을 수 없습니다.");
                    return;
                }

                oTokenizer.removeAllTokens();

                let oTokenData = this.getTokenData();
                if (!oTokenData) {
                    console.warn("토큰 데이터가 전달되지 않았습니다.");
                    return;
                }

                // 연월 토큰
                this._addYearMonthToken(oTokenizer, oTokenData.yearMonth);

                // 조직 토큰
                this._addSimpleToken(oTokenizer, oTokenData.orgName);

                // account 토큰
                this._addSimpleToken(oTokenizer, oTokenData.account_nm);

                // 메뉴 토큰
                this._addSimpleToken(oTokenizer, oTokenData.menuName);

                // subtitle 토큰
                this._addSimpleToken(oTokenizer, oTokenData.subTitle);

                // 타입 토큰
                this._addSimpleToken(oTokenizer, oTokenData.type);


            } catch (error) {
                console.error("토큰 설정 중 오류:", error);
            }
        },

        /**
         * 연월 토큰 추가
         * @private
         */
        _addYearMonthToken: function (oTokenizer, yearMonth) {
            if (!yearMonth) return;

            let sYearMonthText;
            if (yearMonth instanceof Date) {
                sYearMonthText = `${yearMonth.getFullYear()}년 ${yearMonth.getMonth() + 1}월`;
            }
            else if (typeof yearMonth === 'string') {
                sYearMonthText = yearMonth;
            }
            else {
                return;
            }

            oTokenizer.addToken(new Token({ text: sYearMonthText }));
        },

        /**
         * 단순 토큰 추가
         * @private
         */
        _addSimpleToken: function (oTokenizer, sText) {
            if (sText) {
                oTokenizer.addToken(new Token({ text: sText }));
            }
        },

        /**
         * AI 모델 초기화
         * @private
         */
        _resetAiModel: function () {
            sessionStorage.setItem("aiModel", JSON.stringify({
                aiOrgId: '',
                aiType: '',
                aiOrgTypeCode: false
            }));
        },

        /**
         * 로딩 HTML 생성
         * @private
         */
        _createLoadingHtml: function () {
            return `
            <div style="
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                height: 200px; 
                text-align: center;
                color: #666;
            ">
                <div style="
                    width: 32px; 
                    height: 32px; 
                    border: 3px solid #f3f3f3; 
                    border-top: 3px solid #0078d4; 
                    border-radius: 50%; 
                    animation: aiSpin 1s linear infinite;
                    margin-bottom: 1rem;
                "></div>
                <div style="font-size: 1.1rem; margin-bottom: 0.5rem; font-weight: 500;">
                    ${this.getAiContent()}
                </div>
                <div style="font-size: 0.9rem; color: #888;">
                    데이터를 분석하고 있습니다...
                </div>
            </div>
            <style>
                @keyframes aiSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>`;
        },

        /**
         * 텍스트를 HTML로 변환
         * @private
         */
        _convertToHtml: function (sText) {
            if (!sText) {
                return "<ul><li>AI 분석 결과가 없습니다.</li></ul>";
            }

            let aLines = sText.split('\n');
            let sHtml = '<ul style="max-height: 300px; margin: 0; padding: 1rem; font-size: 0.9rem; line-height: 1.5;">';
            let bInSubList = false;

            aLines.forEach(line => {
                line = line.trim();
                if (!line) return;

                if (line.startsWith('•')) {
                    if (bInSubList) {
                        sHtml += '</ul></li>';
                        bInSubList = false;
                    }
                    sHtml += `<li style="margin-top: 1rem;"><strong>${line.substring(1).trim()}</strong>`;
                }
                else if (line.startsWith('-')) {
                    if (!bInSubList) {
                        sHtml += '<ul style="margin-top: 0.5rem;">';
                        bInSubList = true;
                    }
                    sHtml += `<li>${line.substring(1).trim()}</li>`;
                }
            });

            if (bInSubList) {
                sHtml += '</ul></li>';
            }

            sHtml += '</ul>';
            return sHtml;
        }
    };

    return Control.extend("bix.common.library.customDialog.AiReport", oExtendControl);
});