sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/core/Control",
    "sap/m/Token",
    "sap/ui/model/odata/v4/ODataModel",
    "../../../main/util/Module",
],
    function (Fragment, Control, Token, ODataModel, Module) {
        "use strict";

        var oExtendControl = {
            metadata: {
                properties: {
                    cardName: { type: "string" },
                    fragmentController: { type: "object" },
                    aiAgentName: { type: "string", defaultValue: "AI 에이전트" },
                    aiContent: { type: "string", defaultValue: "" },
                    tokenData: { type: "object", defaultValue: null }
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

            _convertToHtml: function(sText) {
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
            },

            _loadFragment: async function () {
                if (!this._pDialog) {
                    this._pDialog = new Promise(function (resolve) {
                        let oController = this.getFragmentController();

                        Fragment.load({
                            id: this.getId(),
                            name: `bix.common.library.customDialog.AiReport`,
                            controller: oController,
                        }).then(function (oDialog) {
                            this._oDialog = oDialog;

                            // 버튼 이벤트 설정
                            Fragment.byId(this.getId(), "cancelButton").attachPress(() => this.close());
                            
                            // PDF 다운로드 버튼 이벤트 (두 번째 파일에서 가져옴)
                            Fragment.byId(this.getId(), "downloadButton").attachPress(async () => {
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
                                if (oCardContent.isA("sap.ui.table.Table")) {   // 테이블일 때
                                    Module.pdfTableDownload(oCardContent, "AiReport", dom);
                                }
                                else {    // 차트일 때
                                    console.log("차트 PDF 다운로드는 구현되지 않음");
                                    return;
                                }
                            });

                            // AI Agent 버튼 이벤트 (기능 없음)
                            Fragment.byId(this.getId(), "aiAgentButton").attachPress(() => {
                                console.log(`${this.getAiAgentName()} 버튼 클릭`);
                            });

                            // Dialog 열기 전 실행 로직
                            oDialog.attachBeforeOpen(function () {
                                this._setupDialog();
                            }.bind(this));

                            // 이벤트 연결
                            oDialog.attachBeforeClose(() => this.fireBeforeClose());
                            oDialog.attachAfterOpen(() => this.fireAfterOpen());
                            oDialog.attachAfterClose(() => this.fireAfterClose());

                            resolve(oDialog);
                        }.bind(this));
                    }.bind(this));
                }
                return this._pDialog;
            },

            _setupDialog: function() {
                // 버튼 텍스트 설정
                let oAgentButton = Fragment.byId(this.getId(), "aiAgentButton");
                if (oAgentButton) {
                    oAgentButton.setText(this.getAiAgentName());
                }
                
                // 카드 설정
                let oCard = Fragment.byId(this.getId(), "card");
                oCard.setManifest(`../bix/card/${this.getCardName()}/manifest.json`);

                // AI 하이라이트 설정
                let oHighlightText = Fragment.byId(this.getId(), "highlighText");
                let sHtmlContent = this._convertToHtml(this.getAiContent());
                oHighlightText.setHtmlText(sHtmlContent);

                // 토큰 설정
                this._setupTokens();
            },

            _setupTokens: function() {
                try {
                    let oTokenizer = Fragment.byId(this.getId(), "searchTokenizer");
                    oTokenizer.removeAllTokens();

                    // 전달받은 토큰 데이터 사용
                    let oTokenData = this.getTokenData();
                    if (!oTokenData) {
                        console.warn("토큰 데이터가 전달되지 않았습니다.");
                        return;
                    }

                    // 연월 토큰
                    if (oTokenData.yearMonth) {
                        let sYearMonthText;
                        if (oTokenData.yearMonth instanceof Date) {
                            // Date 객체인 경우
                            sYearMonthText = `${oTokenData.yearMonth.getFullYear()}년 ${oTokenData.yearMonth.getMonth() + 1}월`;
                        }
                        else if (typeof oTokenData.yearMonth === 'string') {
                            // 이미 포맷된 문자열인 경우
                            sYearMonthText = oTokenData.yearMonth;
                        }
                        
                        if (sYearMonthText) {
                            oTokenizer.addToken(new Token({
                                text: sYearMonthText
                            }));
                        }
                    }
                    
                    // 조직 토큰
                    if (oTokenData.orgName) {
                        oTokenizer.addToken(new Token({
                            text: oTokenData.orgName
                        }));
                    }
                    
                    // 메뉴 토큰
                    if (oTokenData.menuName) {
                        oTokenizer.addToken(new Token({
                            text: oTokenData.menuName
                        }));
                    }
                } catch (error) {
                    console.error("토큰 설정 중 오류:", error);
                }
            },

            open: async function () {
                this._loadFragment().then(oDialog => oDialog.open());
            },

            close: function () {
                if (this._oDialog) {
                    this._oDialog.close();
                }
            },
        };

        return Control.extend("bix.common.library.customDialog.AiReport", oExtendControl);
    })