sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.deliveryMonthlyContent2_3.card", {
        _oEventBus: EventBus.getInstance(),


        onInit: function () {
            this._dataSetting();
            this._oEventBus.subscribe("aireport", "infoSet", this._dataSetting, this);
        },

        _dataSetting: async function () {
            this.byId("cardContent").setBusy(true);
            let oData = JSON.parse(sessionStorage.getItem("aiReport"));
            // 파라미터
            let iYear = oData.year
            let sMonth = oData.month
            let sOrgId = oData.orgId;
            let sType = oData.type

            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            let sPath = `/get_actual_m_rohc_org_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',org_tp='${sType}')`

            await oModel.bindContext(sPath).requestObject().then(
                function (aResult) {
                    Module.displayStatusForEmpty(this.byId("table"), aResult.value, this.byId("cardContent"));
                    this._modelSetting(aResult.value);

                    this.byId("table").setVisibleRowCountMode("Fixed");
                    this.byId("table").setVisibleRowCount(aResult.value.length);

                    this.dataLoad();
                }.bind(this))
                .catch((oErr) => {
                    Module.displayStatus(this.byId("table"), oErr.error.code, this.byId("cardContent"));
                });
            this.byId("cardContent").setBusy(false)
        },

        dataLoad: function () {
            const oEventBus = sap.ui.getCore().getEventBus();
            oEventBus.publish("CardChannel", "CardFullLoad", {
                cardId: this.getView().getId()
            })
        },

        _modelSetting: function (aResult) {
            this.getView().setModel(new JSONModel(aResult), "Model");
        },

        onFormatPerformance: function (iValue, sType) {

            if (sType === "percent") {
                // 단위 조정(% 사용 소숫점 2번째까지 사용)

                var oNumberFormat = NumberFormat.getPercentInstance({
                    groupingSeparator: ',',
                    decimals: 1
                });
                return oNumberFormat.format(iValue);
            } if (sType === "figure") {
                // 단위 조정(% 사용 소숫점 2번째까지 사용)

                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingSeparator: ',',
                    decimals: 2
                });
                return oNumberFormat.format(iValue);
            } else {
                // 데이터에 단위 구분점
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2
                });
                return oNumberFormat.format(iValue);
            };
        },
    });
});           