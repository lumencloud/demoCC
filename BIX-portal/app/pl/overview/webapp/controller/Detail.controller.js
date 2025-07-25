sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/EventBus",
    "bix/common/ai/service/AgentService",
    "bix/common/ai/util/InteractionUtils",
    "bix/common/library/customDialog/AiReport",
    "bix/common/library/control/Modules",
    "sap/ui/core/routing/HashChanger",
], function (JSONModel, Controller, MessageToast, MessageBox, EventBus, AgentService, InteractionUtils, AiReport, Modules, HashChanger) {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.ToggleButton} ToggleButton
     */
    return Controller.extend("bix.pl.overview.controller.Detail", {
        _aDetail: [],
        _aDepth2: [],
        _oEventBus: EventBus.getInstance(),

        onInit: function () {
            const oRouteActual = this.getOwnerComponent().getRouter().getRoute("RouteActual");
            oRouteActual.attachPatternMatched(this.onMyRoutePatternMatched, this);

            const oRoutePlan = this.getOwnerComponent().getRouter().getRoute("RoutePlan");
            oRoutePlan.attachPatternMatched(this.onMyRoutePatternMatched, this);


            // 첫 번째 SegmentedButton으로 초기 SegmentedButton EventBus Publish
            // let oSegmentedButton = this.byId("segmentedButton");
            // oSegmentedButton.fireSelectionChange({
            //     item: oSegmentedButton.getItems()[0]
            // })

            this._oEventBus.subscribe("pl", "page", this._getEventBus, this);
            this._oEventBus.subscribe("pl", "detail", this._getEventBus, this);
            this._oEventBus.subscribe("pl", "detailType", this._getEventBus, this);
            this._oEventBus.subscribe("pl", "setDetailMenu", this._setDetailMenu, this);

            // let aContents = this.byId("detailContainer").getContent();
            // let oFirstMenu = aContents[0];
            // oFirstMenu.firePress();

            // 카드에서 PL Component 접근을 위한 속성 설정
            this.byId("detailCard")._oComponent = this.getOwnerComponent();


            this._setFavorite();
        },

        onMyRoutePatternMatched: function (oEvent) {
        },

        /**
         * 이벤트 버스 수신
         * @param {String} sChannelId 
         * @param {String} sEventId 
         * @param {Object} oData 
         */
        _getEventBus: function (sChannelId, sEventId, oData) {
            // console.log("EventId",sEventId);
            if (sEventId === "detail" || sEventId === "detailType") {
                // headerContainer 설정
                this._setHeaderContainer(oData);
            }

            // (임시) 선택된 detail이 SG&A 상세일 때 detailType을 Detail로 고정
            let oHashModel = this.getOwnerComponent().getModel("hashModel");
            if (sEventId === "detail") {
                // if (oHashModel.getProperty("/detail") === "saleMargin" || oHashModel.getProperty("/detail") === "sga" || oHashModel.getProperty("/detail") === "dtSale") {

                // }
                // oHashModel.setProperty("/detailType", "detail");
                this._oEventBus.publish("pl", "detailType");
            } else if (sEventId === "detailType") {
                this._oEventBus.publish("pl", "setHashModel", { system: true });
            } else if (sEventId === "page") { // 상세 메뉴 리스트 from splitter
                // 해시 데이터가 없는 초기일 때 Return
                let hasHashData = Object.entries(oHashModel.getData()).length > 0;
                if (!hasHashData) return;

                let sPlType = oHashModel.getProperty("/page");
                let sDetail = oHashModel.getProperty("/detail");
                let sPageView = oHashModel.getProperty("/pageView");
                let sDetailType = oHashModel.getProperty("/detailType");
                let bPage = sPageView === "table" || sPageView === "grid" ? true : false;
                let bDetailType = sDetailType === "detail" || sDetailType === "chart" ? true : false;

                let oFirstMenu;
                let aDetailData = this.getOwnerComponent().getModel("detailModel").getData();
                let oCheckMenu = aDetailData.find(oDepth => oDepth.page_path === sPlType && oDepth.detail_path === sDetail);
                let oCheckPage = aDetailData.find(oDepth => oDepth.page_path === sPlType);
                let oCheckDepth = aDetailData.find(oDepth => oDepth.detail_path === sDetail);

                // PL실적 좌, 우측 segmentedButton 유효성 검사
                if (!bPage || !bDetailType) {
                    MessageToast.show("url을 확인해주세요.");
                    return
                }

                // 
                if (!oCheckMenu) {
                    if (!oCheckPage || !oCheckDepth) {
                        MessageToast.show("url을 확인해주세요.");
                        return;
                    }
                    oFirstMenu = oCheckPage;
                } else {
                    oFirstMenu = oCheckMenu
                }

                oHashModel.setProperty("/detail", oFirstMenu.detail_path);
                // oHashModel.setProperty("/page", oFirstMenu.page_path);
                this._oEventBus.publish("pl", "detail");

                // 선택한 메뉴 버튼 클릭
                let aContents = this.byId("detailContainer").getContent();
                let oButton = aContents.find(oContent => oContent.getBindingContext("detailModel").getObject().page_path === oFirstMenu.page_path && oContent.getBindingContext("detailModel").getObject().detail_path === oFirstMenu.detail_path);

                oButton.firePress({ pressed: true });
            }
        },

        /**
         * 선택한 타입들 기반으로 메뉴 컨테이너 설정
         */
        _setHeaderContainer: function (oData) {
            let oHashModel = this.getOwnerComponent().getModel("hashModel");

            // EventBus에서 detail을 전달받았을 때 hashModel에 detail 설정
            if (oData.detail) {
                oHashModel.setProperty("/detail", oData.detail);
            }
        },


        /**
         * 3depth 메뉴 선택 이벤트
         * @param {sap.ui.base.Event} oEvent 
         * @param {String} sCardName 
         */
        _setDetailMenu: async function (oEvent, sCardName) {
            // 선택한 메뉴 정보 반환
            let oData = this.getOwnerComponent().getModel("hashModel").getData();
            let sUrl = `/pl_content_view(page_path='${oData.page}',position='detail',grid_layout_info=null,detail_path='${oData.detail}',detail_info='${oData.detailType}')/Set`;
            let oModel = this.getOwnerComponent().getModel('cm');

            const oBinding = oModel.bindContext(sUrl);
            let oRequest = await oBinding.requestObject();
            let oCardData = oRequest.value[0];

            let oCard = this.byId("detailCard");
            if (!oCardData) { // view가 없는 경우
                MessageToast.show("아직 구성되지 않은 \n메뉴입니다.");
            } else {
                let sManifest = `../bix/card/${oCardData.card_info}/manifest.json`
                // 리랜더에러 수정 ==> 해당코드 setManifest 중첩적용으로 
                // 사이드네비게이션 작동시 리랜더링 버그에 영향있어보여 예외처리 (동일한 manifest가 적용되어있으면 새로 적용 안되게)
                // 추후 더 확인 필요
                if (sManifest !== oCard.getManifest()) {
                    oCard.setManifest(sManifest);
                }
                // 카드 로딩 3분 이내 처리 안될 시 강제 클리어
                // setTimeout(()=>{
                //     if(!oCard.isReady()){
                //         oCard.setManifest(null);
                //         // console.error(sManifest," : 카드 로딩 에러");
                //     }
                // },18000);
                // if (oCard.getManifest() !== sManifest) {
                //     oCard.setManifest(sManifest);
                // }
            }

            // 데이터가 없으면 카드를 보이지 않게 처리
            oCard.setVisible(!!oCardData);
        },

        /**
         * Charts <-> Detail SegmentedButton 버튼 변경 이벤트
         */
        onSelectionChange: function (oEvent) {
            let oParameters = oEvent.getParameters();
            let oItem = oParameters["item"];
            let sKey = oItem.getKey();

            // SegmentedButton 변경 이벤트를 Publish
            this.getOwnerComponent().getModel("hashModel").setProperty("/detailType", sKey);

            this._oEventBus.publish("pl", "detailType");

        },

        onPDFDownload: async function () {
            let oCard = this.byId("detailCard");
            let aBindingPath = Modules.getCardContentPath(oCard);
            return;

            const canvases = Array.from(document.querySelectorAll("canvas"))
                .filter(canvas => {
                    const r = canvas.getBoundingClientRect();
                    const s = getComputedStyle(canvas);
                    return r.width > 0 && r.height > 0 && s.visibility !== "hidden"
                });
            if (canvases.length === 0) {
                console.log("차트 없음");
                return;
            }
            try {

                const pdf = new window.jspdf.jsPDF("portrait", "mm", "a4");
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                let currentY = 25;
                pdf.setFontSize(14);
                pdf.text("pdf 연습", 10, 15)
                for (const canvas of canvases) {
                    const canvasImage = await html2canvas(canvas, {
                        scale: 3,
                        useCORS: true,
                        backgroundColor: null
                    });
                    const imgData = canvasImage.toDataURL("image/png");
                    const imgHeight = (canvasImage.height * pageWidth) / canvasImage.width;
                    if (currentY + imgHeight > pageHeight - 10) {
                        pdf.addPage();
                        currentY = 10;
                    }


                    pdf.addImage(imgData, "PNG", 0, currentY, pageWidth, imgHeight);
                    currentY += imgHeight + 10;
                }
                pdf.save("pdf.pdf");
            } catch (error) {
                console.log("차트 없음", error);
            }
        },


        onAddFavorite: async function () {
            let oDialog = new AiReport({
                fragmentController: this,
                cardName: "sgaDetailTable",
            });

            oDialog.open();



            return;
            let oModel = this.getOwnerComponent().getModel("cm");

            const oBindList = oModel.bindList("/Favorite", undefined, undefined, undefined, {
                $filter: "user_id eq '1' and chart_id eq 'add'",
                $$updateGroupId: "editFavorite"
            });
            let aFavoriteData = await oBindList.requestContexts();
            if (aFavoriteData.length > 0) {
                aFavoriteData[0].delete();
            } else {
                oBindList.create({ user_id: "1", chart_id: 'add' });
            }
            oModel.submitBatch("editFavorite").then(function () {
                let aChanges = oModel.hasPendingChanges("editFavorite");
                if (!aChanges) {
                    console.log("성공")
                } else {
                    console.log("실패")
                }
                this._setFavorite();
            }.bind(this));
        },

        _setFavorite: async function () {
            this.getView().setModel(new JSONModel({}), "favorite");
            let oModel = this.getOwnerComponent().getModel("cm");
            const oBinding = oModel.bindContext("/Favorite", null, {
                $filter: "user_id eq '1'"
            });
            let aFavoriteData = await oBinding.requestObject();

            aFavoriteData.value.forEach(item => {
                this.getView().getModel("favorite").setProperty("/" + item.chart_id, true);
            })
        },

        /**
         * 메뉴 선택 이벤트
         * @param {Event} oEvent 이벤트 정보
         * @param {String} sFlag 구분자
         */
        onPressMenuTitle: async function (oEvent, sFlag) {
            // 토글 버튼 선택 해제 시 강제로 다시 선택
            let isPressed = oEvent.getParameters()["pressed"];
            if (!isPressed) {
                let oButton = /** @type {ToggleButton} */ (oEvent.getSource());
                oButton.setPressed(true);
                return;
            }

            // 해시모델의 detail을 선택한 토글 버튼으로 설정
            let oModel = this.getOwnerComponent().getModel("hashModel");
            if (sFlag) {
                oModel.setProperty("/detail", sFlag);
                // oModel.setProperty("/detailType", 'detail'); // 차트 카드가 없을 시 세그먼트 버튼의 key를 detail 버튼 고정  /// 추후 삭제 예정
            }

            ////////// 디테일 세그먼트 버튼 차트 데이터 없을 시 차트 버튼 visible=false 처리 /////////////////////// 추후 삭제 예정
            let oData = this.getOwnerComponent().getModel("hashModel").getData();
            let sUrl = `/pl_content_view(page_path='${oData.page}',position='detail',grid_layout_info=null,detail_path='${oData.detail}',detail_info='chart')/Set`;
            let oDataModel = this.getOwnerComponent().getModel('cm');

            const oBinding = oDataModel.bindContext(sUrl);
            let oRequest = await oBinding.requestObject();
            let oCardData = oRequest.value[0];
            if (!oCardData) {
                this.byId("segmentedButton").getItems()[0].setVisible(false)
                this.byId("segmentedButton").getItems()[1].setWidth("50%")
            } else {
                this.byId("segmentedButton").getItems()[0].setVisible(true)
            }
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            // selectMasterTable 내부에 detail publish가 존재함
            // this._oEventBus.publish("pl", "selectMasterTable", oModel.getData());
            this._oEventBus.publish("pl", "detail");

            // 메뉴 변경 시 detailSelect 해시 제거
            // let sCurrHash = HashChanger.getInstance().getHash();
            // let aHash = sCurrHash.split("/");
            // aHash.pop();
            // let sNewHash = aHash.join("/");
            // HashChanger.getInstance().setHash(sNewHash);

            // 해시를 기준으로 해시모델 재설정
            // this._oEventBus.publish("pl", "setHashModel");
        },

        onPressAIAnalysis: function (oEvent) {
            // InteractionUtils를 사용하여 인터랙션 데이터 준비
            var result = InteractionUtils.prepareInteractionData(oEvent, {
                viewName: "overview",
                viewTitle: this.byId("menuTitle")?.getText() || "성과표"
            });

            var interactionData = result.interactionData;
            var sessionData = result.sessionData;

            // 필수 데이터 검증 (비즈니스 로직)
            if (!sessionData.yearMonth || !sessionData.orgId) {
                MessageBox.error("마감년월과 조직을 먼저 선택해주세요.");
                return;
            }

            // AgentService 호출 (비즈니스 로직)
            AgentService.processInteraction(interactionData, {
                onProgress: function (progress) {
                    console.log("AI 분석 진행률:", progress + "%");
                }
            })
                .then(function (result) {
                    console.log("AI 분석 결과:", result);
                    this._processResult(result);
                }.bind(this))
                .catch(function (error) {
                    console.error("AI 분석 오류:", error);
                    MessageBox.error("AI 분석 중 오류가 발생했습니다: " +
                        (error.message || "알 수 없는 오류"));
                });
        },

        // 결과 처리 로직
        _processResult: function (result) {
            try {
                console.log("최종 결과:", result);
                if (typeof result === 'string') {
                    try {
                        // 문자열을 JSON으로 파싱
                        result = JSON.parse(result);
                        console.log("파싱된 JSON:", result);
                    } catch (parseError) {
                        console.warn("JSON 파싱 실패, 원본 문자열 사용:", parseError);
                        // 파싱 실패 시 원본 문자열 사용
                    }
                }

                var masterAgent = result.master_result
                var selectedAgent = masterAgent.selected_agent;
                var selectedAgentReasoning = masterAgent.reasoning;


                // 에이전트 실행 결과가 있는 경우 처리
                if (result.agent_result) {
                    // 분석 결과를 팝업으로 표시
                    this._showAnalysisPopup(result.agent_result);

                    MessageBox.show(selectedAgent + ":" + selectedAgentReasoning);
                }
                else {
                    MessageBox.show("Selected Agent: " + selectedAgent);
                }
            } catch (e) {
                console.error("결과 처리 오류:", e);
                MessageBox.show("결과 처리 중 오류 발생");
            }
        },

        // 분석 결과 팝업 표시 메서드 (마크다운 변환 없이)
        _showAnalysisPopup: function (agentResult) {
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
    });
});
