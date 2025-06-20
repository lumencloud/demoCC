sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/core/Control",
    "sap/m/Token",
    "sap/ui/model/odata/v4/ODataModel",
    "../../../main/util/Module",
], function (Fragment, Control, Token, ODataModel, Module) {
    "use strict";

    var oExtendControl = {
        metadata: {
            properties: {
                cardName: { type: "string" },
                fragmentController: { type: "object" },
                aiAgentName: { type: "string", defaultValue: "AI 에이전트" },
                aiContent: { type: "string", defaultValue: "" },
                tokenData: { type: "object", defaultValue: null },
                isLoading: { type: "boolean", defaultValue: false }
            },
            aggregations: {
                _table: { type: "object", multiple: false, visibility: "hidden" },
                _html: { type: "object", multiple: false, visibility: "hidden" },
            },
            events: {
                beforeOpen: {},
                beforeClose: {},
                afterOpen: {},
                afterClose: {},
            }
        },

        _pDialog: undefined,
        _oDialog: undefined,

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
        _onHover: function (oEvent) {
            let oButton = oEvent.srcControl;
            this._hoveringButton = true;
            if (!this._pPopover) {
                this._pPopover = Fragment.load({
                    id: this.getId(),
                    name: "bix.common.library.customDialog.Popover",
                    controller: this,
                }).then(function (oPopover) {
                    this.addDependent(oPopover);
                    return oPopover;
                }.bind(this));
            }
            this._pPopover.then(function (oPopover) {
                if (!oPopover.isOpen()) {
                    oPopover.openBy(oButton);
                }
            })

        },

        //마우스 떠낫을때 플라그먼트 종료
        _onLeave: function (oEvent) {
            this._hoveringButton = false;
            this._PopoverTimer = setTimeout(function () {
                if(!this._hoveringButton ){
                    this._pPopover.then(function (oPopover) {
                        oPopover.close();
                    })
                }
            }.bind(this),10);
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
         * @param {string} oContentData.aiAgentName - AI 에이전트 이름
         * @param {string} oContentData.aiContent - AI 콘텐츠
         * @param {boolean} oContentData.isLoading - 로딩 상태
         */
        updateContent: function (oContentData) {
            if (oContentData.aiAgentName !== undefined) {
                this.setAiAgentName(oContentData.aiAgentName);
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
            if (this.getIsLoading()) {
                // 진행률에 따라 메시지 변경
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
            }
        },

        /**
         * Fragment 로드
         * @private
         */
        _loadFragment: async function () {
            if (!this._pDialog) {
                this._pDialog = new Promise(function (resolve) {
                    let oController = this.getFragmentController();

                    Fragment.load({
                        id: this.getId(),
                        name: "bix.common.library.customDialog.AiReport",
                        controller: oController,
                    }).then(function (oDialog) {
                        this._oDialog = oDialog;

                        // 이벤트 핸들러 설정
                        this._attachEventHandlers();

                        // 다이얼로그 이벤트 연결
                        oDialog.attachBeforeOpen(() => {
                            this._setupDialog();
                            this.fireBeforeOpen();
                        });
                        
                        // 팝업이 열린 직후 즉시 버튼 상태 강제 업데이트
                        oDialog.attachAfterOpen(() => {
                            // 즉시 버튼들 상태 업데이트
                            this._forceUpdateButtons();
                            this.fireAfterOpen();
                        });
                        
                        oDialog.attachBeforeClose(() => this.fireBeforeClose());
                        oDialog.attachAfterClose(() => this.fireAfterClose());

                        resolve(oDialog);
                    }.bind(this));
                }.bind(this));
            }
            return this._pDialog;
        },

        /**
         * 버튼 상태 강제 업데이트
         * @private
         */
        _forceUpdateButtons: function() {
            // 로딩 상태가 아니면 업데이트하지 않음
            if (!this.getIsLoading()) {
                return;
            }
            
            // 에이전트 버튼 즉시 업데이트
            const oAgentButton = Fragment.byId(this.getId(), "aiAgentButton");
            if (oAgentButton) {
                oAgentButton.setText("분석 중...");
                oAgentButton.setEnabled(false);
                oAgentButton.setBusy(true);
            }
            
            // 다운로드 버튼 즉시 업데이트
            const oDownloadButton = Fragment.byId(this.getId(), "downloadButton");
            if (oDownloadButton) {
                oDownloadButton.setEnabled(false);
                oDownloadButton.setBusy(true);
                oDownloadButton.setTooltip("분석 완료 후 다운로드 가능합니다");
            }
        },

        /**
         * 이벤트 핸들러 설정
         * @private
         */
        _attachEventHandlers: function () {
            // 취소 버튼
            Fragment.byId(this.getId(), "cancelButton").attachPress(() => this.close());

            // PDF 다운로드 버튼
            Fragment.byId(this.getId(), "downloadButton").attachPress(() => {
                this._handleDownload();
            });

            // AI Agent 버튼
            Fragment.byId(this.getId(), "aiAgentButton").attachPress(() => {
                console.log(`${this.getAiAgentName()} 버튼 클릭`);
            });

            Fragment.byId(this.getId(), "aiAgentButton").addEventDelegate({
                onmouseover: this._onHover.bind(this),
                onmouseout: this._onLeave.bind(this)
            })
        },

        /**
         * 다운로드 처리
         * @private
         */
        _handleDownload: function () {
            // 로딩 중이면 다운로드 안 함
            if (this.getIsLoading()) {
                return;
            }

            try {
                const oHighlight = Fragment.byId(this.getId(), "highlightBox") ||
                    Fragment.byId(this.getId(), "highlighText");
                const dom = oHighlight.getDomRef();

                // 카드에서 visible이 true인 content 반환
                const oCard = Fragment.byId(this.getId(), "card");
                const oCardComponent = oCard.getCardContent()._oComponent;
                const oCardView = oCardComponent.getAggregation("rootControl");
                const oCardContent = oCardView.getControlsByFieldGroupId("content").find((object) => {
                    return object.getFieldGroupIds().length > 0 && object?.getVisible();
                });

                // 테이블에 바인딩된 데이터
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

                // 메뉴 토큰
                this._addSimpleToken(oTokenizer, oTokenData.menuName);

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

            oTokenizer.addToken(new Token({
                text: sYearMonthText
            }));
        },

        /**
         * 단순 토큰 추가
         * @private
         */
        _addSimpleToken: function (oTokenizer, sText) {
            if (sText) {
                oTokenizer.addToken(new Token({
                    text: sText
                }));
            }
        },

        /**
         * 다이얼로그 콘텐츠 업데이트
         * @private
         */
        _updateDialogContent: function () {
            if (!this._oDialog) return;

            // 버튼 상태 업데이트
            this._updateAgentButton();

            // 하이라이트 영역 업데이트
            this._updateHighlightArea();

            // 다운로드 버튼 상태 업데이트
            this._updateDownloadButton();
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
            }
            else {
                oAgentButton.setText(this.getAiAgentName());
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

            // Panel 찾기 및 busy 상태 설정
            let oHighlightPanel = oHighlightText.getParent();
            if (oHighlightPanel && oHighlightPanel.setBusy) {
                oHighlightPanel.setBusy(this.getIsLoading());
                if (this.getIsLoading()) {
                    oHighlightPanel.setBusyIndicatorDelay(0);
                }
            }

            // 콘텐츠 설정
            if (this.getIsLoading()) {
                oHighlightText.setHtmlText(this._createLoadingHtml());
            }
            else {
                oHighlightText.setHtmlText(this._convertToHtml(this.getAiContent()));
            }
        },

        /**
         * 다운로드 버튼 업데이트
         * @private
         */
        _updateDownloadButton: function () {
            let oDownloadButton = Fragment.byId(this.getId(), "downloadButton");
            if (!oDownloadButton) return;

            oDownloadButton.setEnabled(!this.getIsLoading());
            oDownloadButton.setBusy(this.getIsLoading());

            if (this.getIsLoading()) {
                oDownloadButton.setTooltip("분석 완료 후 다운로드 가능합니다");
            }
            else {
                oDownloadButton.setTooltip("PDF 다운로드");
            }
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