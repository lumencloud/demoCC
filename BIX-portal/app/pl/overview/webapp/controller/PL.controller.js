sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/EventBus",
    "bix/common/library/customDialog/OrgSingleSelect",
    'sap/m/Panel',
    "sap/ui/integration/widgets/Card",
    "../../../main/util/Module",
], function (Controller, MessageToast, EventBus, OrgSingleSelect, Panel, Card, Modules) {
    "use strict";

    return Controller.extend("bix.pl.overview.controller.PL", {
        _oEventBus: EventBus.getInstance(),

        onInit: function () {
            this.bInit = true;

            const oRouteActual = this.getOwnerComponent().getRouter().getRoute("RouteActual");
            oRouteActual.attachPatternMatched(this.onMyRoutePatternMatched, this);

            const oRoutePlan = this.getOwnerComponent().getRouter().getRoute("RoutePlan");
            oRoutePlan.attachPatternMatched(this.onMyRoutePatternMatched, this);

            // 해시 모델을 기준으로 PL Card 설정
            this._oEventBus.subscribe("pl", "page", this._setCard, this);
            this._oEventBus.subscribe("pl", "selectMasterTable", this._setCard, this);
        },

        onMyRoutePatternMatched: async function () {

        },

        onAfterRendering: function () {
            let oSegmentedButton = this.byId("plTypeButton");
            let oSelectedButton = oSegmentedButton.getItems().find(oButton => oButton.getId() === oSegmentedButton.getSelectedItem());

            // 최초 구동시에만 처리 되도록
            if(this.bInit){
                this.bInit = false;
                oSegmentedButton.fireSelectionChange({
                    item: oSelectedButton
                });
            }
        },

        onExpandAI() {
            this._oEventBus.publish("mainApp", "chatBotBtn");
            this._oEventBus.publish("splitter", "chatBotBtn");
        },

        /**
         * 차트 <-> 테이블 뷰 전환
         * @param {sap.ui.base.Event} oEvent 
         * @param {String} sFlag 구분자
         */
        onSwitchPL: function (oEvent, sFlag) {
            if (sFlag) {
                this.getOwnerComponent().getModel("hashModel").setProperty("/pageView", sFlag);
                this._oEventBus.publish("pl", "setHashModel", {system: true});
            }
        },

        /**
         * Actual <-> Plan PL SegmentedButton 버튼 변경 이벤트
         */
        onSelectionChange: function (oEvent) {
            let oParameters = oEvent.getParameters();
            let oItem = oParameters["item"];
            let sKey = oItem.getKey();

            // 변경된 plType을 모델에 저장
            let oHashModel = this.getOwnerComponent().getModel("hashModel");
            oHashModel.setProperty("/page", sKey);

            this._oEventBus.publish("pl", "page");

            // Shell Icon 변경 요청
            this._oEventBus.publish("mainApp", "topIcon");
        },

        /**
         * PL 엑셀 다운로드
         */
        onExcelDownload: async function (oEvent) {
            // 검색 조건 반환
            // 새로운 검색 조건이 같은 경우 return
            // let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            // let aKeys = Object.keys(oData);
            // let isDiff = aKeys.find(sKey => oData[sKey] !== this._oSearchData[sKey]);
            // if (!isDiff) return;

            // Select모델 다시 설정
            // await this._setModel();

            // detailSelect 해시에 따른 Select 선택
            // let oSelect = this.byId("detailSelect");
            // let aHash = Modules.getHashArray();
            // let sDetailKey = aHash?.[4];
            // if (sDetailKey) {   // 해시가 있는 경우 Select 설정
            //     oSelect.setSelectedKey(sDetailKey);
            // } else {    // 없는 경우 첫 번째 Select 항목 선택
            //     let oFirstDetailKey = this.getView().getModel("selectModel").getProperty("/0/sub_key");
            //     oSelect.setSelectedKey(oFirstDetailKey);
            // }

            // 새로운 검색 조건 저장
            // this._oSearchData = oData;

            // 검색 파라미터
            // this._setBusy(true);

            // let dYearMonth = new Date(oData.yearMonth);
            // let iYear = dYearMonth.getFullYear();
            // let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");

            const oBtn = oEvent.getSource();
            MessageToast.show("엑셀 다운로드 중 입니다!")
            oBtn?.setBusy(true);
            
            // 데이터 반환
            const oPlModel = this.getOwnerComponent().getModel("pl");
            const oPlBindingContext = oPlModel.bindContext(`/get_pl_excel()`);

            // Excel Workbook 생성
            const workbook = new ExcelJS.Workbook();

            await Promise.all([
                oPlBindingContext.requestObject()
            ]).then(function (aResult) {
                //excel download 데이터 및 파일 네임 넘김.
                Modules.rowExcelDownload(aResult[0].value[0], `BIX_raw_data.xlsx`);
            }.bind(this));

            MessageToast.show("엑셀 다운로드 완료 되었습니다")
            oBtn?.setBusy(false);

            // this._setBusy(false);
        },

        /**
         * 검색 조건 변경 이벤트
         * @param {Event} oEvent 
         */
        onChangeSearch: function (oEvent) {
            let oSource = oEvent.getSource();

            let isValidValue1 = /** @type {sap.m.Input} */ (oSource).isValidValue();
            let isValidValue2 = oSource.getDateValue();
            if (!isValidValue1 || !isValidValue2) {
                oEvent.getSource().setValueState("Error");
                return;
            } else {
                oEvent.getSource().setValueState("None");

                // 검색 조건 변경 EventBus Publish
                let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();
                // let oEventData = {
                //     year: oSearchData.yearMonth.getFullYear(),
                //     month: String(oSearchData.yearMonth.getMonth() + 1).padStart(2, "0"),
                //     orgId: oSearchData.orgId,
                // }

                // 초기 차트 데이터용 세션 업데이트
                let oSessionData = JSON.parse(sessionStorage.getItem("initSearchModel"));
                oSessionData.yearMonth = new Date(oSearchData.yearMonth);
                sessionStorage.setItem("initSearchModel", JSON.stringify(oSessionData));

                // 검색 이벤트버스 실행
                this._oEventBus.publish("pl", "search");
            };
        },

        /**
         * 조직 선택 Suggestion 선택 시
         * @param {Event} oEvent 
         */
        onOrgSingleChange: function (oEvent) {
            let oSource = oEvent.getSource();
            let sValue = oEvent.getParameters()["value"];
            let aItems = oSource.getSuggestionItems();
            let oSelectedItem = aItems.find(oItem => oItem.getText() === sValue);

            // 조직 데이터 중 입력한 조직 유효성 검사
            if (!oSelectedItem) {
                oSource.setValueState("Error");
            } else {
                oSource.setValueState("None");

                // 선택한 조직의 id
                let sOrgId = oSelectedItem.getKey();

                // 검색 EventBus Publish
                let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();
                // let oEventData = {
                //     year: oSearchData.yearMonth.getFullYear(),
                //     month: String(oSearchData.yearMonth.getMonth() + 1).padStart(2, "0"),
                //     orgId: sOrgId,
                //     orgType: oSearchData.orgType,
                //     org_level: oSearchData.org_level
                // }

                // 초기 차트 데이터용 세션 업데이트
                sessionStorage.setItem("initSearchModel",
                    JSON.stringify({
                        yearMonth: new Date(oSearchData.yearMonth),
                        orgId: sOrgId,
                        org_tp: oSearchData.org_tp,
                        orgType: oSearchData.orgType,
                        org_level: oSearchData.org_level
                    })
                )

                // 해시모델 변경 및 해시 변경
                let oHashModel = this.getOwnerComponent().getModel("hashModel");
                oHashModel.setProperty("/orgId", sOrgId);
                this._oEventBus.publish("pl", "setHash");

                // 검색 이벤트버스 실행
                this._oEventBus.publish("pl", "search");
            }
        },

        /**
         * 매출조직명 Dialog Open
         * @param {Event} oEvent yearMonth
         */
        onOrgSingleSelectDialogOpen: async function (oEvent) {
            let oSource = oEvent.getSource();

            this._oOrgSingleSelectDialog = new OrgSingleSelect({
                fragmentController: this,
                bindingSource: oSource,
                afterSave: function () {
                    let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();
                    let oEventData = {
                        year: oSearchData.yearMonth.getFullYear(),
                        month: String(oSearchData.yearMonth.getMonth() + 1).padStart(2, "0"),
                        orgId: oSearchData.orgId,
                        org_level: oSearchData.org_level
                    }

                    // 초기 차트 데이터용 세션 업데이트
                    sessionStorage.setItem("initSearchModel",
                        JSON.stringify({
                            yearMonth: new Date(oSearchData.yearMonth),
                            orgId: oSearchData.orgId,
                            org_tp: oSearchData.org_tp,
                            orgType: oSearchData.orgType,
                            org_level: oSearchData.org_level
                        })
                    )

                    //sgaDetailTable ai관련 orgId 초기화
                    sessionStorage.setItem("aiModel",
                        JSON.stringify({
                            orgId: "",
                            type: "",
                            org_level: ""
                        })
                    )

                    // 해시모델의 조직ID 변경
                    let oHashModel = this.getOwnerComponent().getModel("hashModel");
                    oHashModel.setProperty("/orgId", oSearchData.orgId);

                    // 변경된 해시모델을 기준으로 해시 변경
                    this._oEventBus.publish("pl", "setHash");

                    // EventBus Publish
                    this._oEventBus.publish("pl", "search");
                }.bind(this),
            });

            this._oOrgSingleSelectDialog.open();
        },

        /**
         * 카드 설정
         */
        _setCard: async function () {
            let oData = this.getOwnerComponent().getModel("hashModel").getData();
            let sUrl = `/pl_content_view(page_path='${oData.page}',position='master',grid_layout_info='${oData.pageView}',detail_path='${oData.page}',detail_info=null)/Set`;

            let oModel = this.getOwnerComponent().getModel('cm');

            const oBinding = oModel.bindContext(sUrl);
            let oRequest = await oBinding.requestObject();
            let aCardData = oRequest.value;

            // view가 없는 경우
            let oBox = this.byId("detailBox");
            if (aCardData.length < 1) {
                oBox.destroyItems();
                MessageToast.show("아직 구성되지 않은 \n메뉴입니다.");
                return;
            }

            let bCheck = false;

            oBox.getItems().forEach(oItem => {
                aCardData.forEach(oData => {
                    if (oItem.getContent()[0].getManifest() === `../bix/card/${oData.card_info}/manifest.json`) {
                        bCheck = true
                    }
                })

            })

            if (!bCheck) {
                oBox.removeAllItems();

                let oPanel1 = this._cardSetting(aCardData[0]);
                let oPanel2 = this._cardSetting(aCardData[1]);

                // setTimeout(()=>{
                //     if(!oCard.isReady()){
                //         oCard.setManifest(null);
                //     }
                // },15000);

                oBox.addItem(oPanel1);
                oBox.addItem(oPanel2);
                oBox.rerender();
            }
        },

        _cardSetting: function (oData) {
            let oCard = new Card({
                manifest: `../bix/card/${oData.card_info}/manifest.json`,
                width: "100%",
                height: "100%"
            });

            oCard._oComponent = this.getOwnerComponent();

            let oPanel = new Panel({
                expandable: false,
                expanded: true,
                width: "100%",
                busy: true,
                content: oCard
            })

            oPanel.addStyleClass("custom-panel-border custom-panel-no-content-padding");
            // if (index !== aCardData.length - 1) {   // 마지막 카드가 아닐 때만 MarginBottom 적용
            oPanel.addStyleClass("sapUiSmallMarginTop");
            // }
            return oPanel
        }
    });
});
