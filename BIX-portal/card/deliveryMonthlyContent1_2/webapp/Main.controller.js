sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/odata/v4/ODataModel",
	"sap/ui/core/format/NumberFormat",
	"sap/ui/core/EventBus",
	"../../main/util/Module",
], function (Controller, JSONModel, ODataModel, NumberFormat, EventBus, Module) {
	"use strict";

	return Controller.extend("bix.card.deliveryMonthlyContent1_2.Main", {
		_oEventBus: EventBus.getInstance(),
		onInit: function () {
			// this._dataSetting();
			// this.byId("cardContent").setBusy(true)
			this.getOwnerComponent().oCard.setBusy(true)
			this._oEventBus.subscribe("aireport", "deliContent1_2", this._modelSetting, this);
			this.getOwnerComponent().oCard.setBusy(false)
		},

		_dataSetting: async function () {

			let oData = JSON.parse(sessionStorage.getItem("aiReport"));

			let iYear = oData.year;
			let sMonth = oData.month
			let sOrgId = oData.orgId;
			let sOrgType = oData.type;
			this.getView().setModel(new JSONModel({
				profitVisible: false
			}), "viewModel")
			if (sOrgId === "5" && sOrgType === "delivery") {
				this.getView().getModel("viewModel").setProperty("/profitVisible", true)
			}

			const oModel = new ODataModel({
				serviceUrl: "../odata/v4/pl_api/",
				synchronizationMode: "None",
				operationMode: "Server"
			});

			let sPath = `/get_actual_m_pl_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',org_tp='${sOrgType}')`

			await oModel.bindContext(sPath).requestObject().then(
				function (aResult) {
					Module.displayStatusForEmpty(this.getOwnerComponent().oCard, aResult.value, this.byId("cardContent"));
					
					this._modelSetting(aResult.value);
				}.bind(this)
			).catch((oErr) => {
				Module.displayStatus(this.getOwnerComponent().oCard, oErr.error.code, this.byId("cardContent"));
			})
			this.getOwnerComponent().oCard.setBusy(false)
		},

		dataLoad: function () {
			const oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.publish("CardChannel", "CardFullLoad", {
				cardId: this.getView().getId()
			})
		},

		_modelSetting: function (sChannel, sEventId, oData) {
			this.getOwnerComponent().oCard.setBusy(true)

			let oSessionData = JSON.parse(sessionStorage.getItem("aiReport"));

			const oResult = oData.data
			if (oSessionData.org_id === "5" && oSessionData.org_tp === "delivery") {
				this.getView().getModel("viewModel").setProperty("/profitVisible", true)
			}
			let oModelData = oResult.length > 0 ? oResult[0] : {};
			this.getView().setModel(new JSONModel(oModelData), "Model");
			this.dataLoad();
			setTimeout(() => {
                this.getOwnerComponent().oCard.setBusy(false);
            }, 300)
		},

		onFormatPerformance: function (iValue) {

            var oNumberFormat = NumberFormat.getFloatInstance({
					groupingEnabled: true,
					groupingSeparator: ',',
					groupingSize: 3,
                });
                return oNumberFormat.format(iValue);
            
        },
	});
});