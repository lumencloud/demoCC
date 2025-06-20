sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "sap/ui/model/json/JSONModel",
    "sap/ui/vbm/AnalyticMap",
    "sap/m/MessageToast",
], function (Controller, EventBus, JSONModel, AnalyticMap, MessageToast) {
    "use strict";

    AnalyticMap.GeoJSONURL = "https://sapui5.hana.ondemand.com/sdk/test-resources/sap/ui/vbm/demokit/media/analyticmap/L0.json";

    return Controller.extend("bix.card.actualSaleMarginChart.card", {
        _oEventBus: EventBus.getInstance(),
        _oDetailDialog: undefined,

        onInit: function () {
            let aData = [
                {
                    name: "미국법인",
                    code: "US",
                    sale: 500000000000,
                    margin: 880000000,
                    position: "-110;50;0"
                },
                {
                    name: "유럽법인",
                    code: "FR",
                    sale: 150000000000,
                    margin: 250000000,
                    position: "15;25;0"
                },
                {
                    name: "중국법인",
                    code: "CN",
                    sale: 300000000000,
                    margin: 3000000000,
                    position: "105;20;0"
                },
                {
                    name: "일본법인",
                    code: "JP",
                    sale: 120000000000,
                    margin: 10000000000,
                    position: "170;40;0"
                },
            ]
            this.getView().setModel(new JSONModel(aData), "regionModel");

            // Select
            this.getView().setModel(new JSONModel([{ key: "subsidiary", name: "자회사" }]), "selectModel");

            // EventBus 수신
            // this._oEventBus.subscribe("pl", "search", this._updateChart, this);

        },

        /**
         * 영역 클릭 시
         * @param {sap.ui.base.Event} oEvent 
         */
        onRegionClick: async function (oEvent) {
            let sCode = oEvent.getParameters()["code"];
            // MessageToast.show("국가 코드: " + sCode)

            if (!this._oDetailDialog) {
                let sComponentName = this.getOwnerComponent().getMetadata().getComponentName();

                await this.loadFragment({
                    id: "detailDialog",
                    name: `${sComponentName}.fragment.Detail`,
                    controller: this,
                }).then(function (oDialog) {
                    this._oDetailDialog = oDialog;

                    // Dialog Open 전 실행
                    oDialog.attachBeforeOpen(function (oEvent) {
                        // 더미 데이터 설정
                        let oDummy = [
                            { type: "수주", month: "500", year: "5500" },
                            { type: "매출", month: "1500", year: "16000" },
                            { type: "마진", month: "300", year: "3200" },
                            { type: "SG&A", month: "200", year: "2100" },
                            { type: "공헌이익", month: "100", year: "10500" },
                        ]
                        oDialog.setModel(new JSONModel(oDummy), "tableModel");

                        // uiModel 설정
                        let oRegionData = this.getView().getModel("regionModel").getData();
                        let oSelectedRegion = oRegionData.find(oData => oData.code === oDialog._code);
                        // 지정된 법인 이외의 지역 클릭 시 Dialog 열지 않기
                        if (!oSelectedRegion) {
                            oEvent.preventDefault();
                        } else {
                            oDialog.setModel(new JSONModel({ title: oSelectedRegion.name }), "uiModel");
                        }
                    }.bind(this));
                }.bind(this));
            };

            // Dialog Open
            this._oDetailDialog._code = sCode;
            this._oDetailDialog.open();
        },

        onCloseDetailDialog: function () {
            if (this._oDetailDialog) {
                this._oDetailDialog.close();
            }
        },
    });
});           