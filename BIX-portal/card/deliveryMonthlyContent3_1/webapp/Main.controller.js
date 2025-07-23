sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/odata/v4/ODataModel",
	"sap/ui/core/format/NumberFormat",
	"sap/ui/core/EventBus",
	"../../main/util/Module",
], function (Controller, JSONModel, ODataModel, NumberFormat, EventBus, Module) {
	"use strict";

	return Controller.extend("bix.card.deliveryMonthlyContent3_1.Main", {
		_oEventBus: EventBus.getInstance(),
		onInit: function () {
			this._oEventBus.publish("aireport", "isCardSubscribed");
			// this._dataSetting();
			this._oEventBus.subscribe("aireport", "deliContent3_1", this._modelSetting, this);
			this._oEventBus.subscribe("aireport", "setBusy", this._setBusy, this);
			this._setModel();
		},
		_setModel: function () {
			this.getView().setModel(new JSONModel({ bBusyFlag: true }), "ui")
		},
		_setBusy: function () {
			this.getView().setModel(new JSONModel({ bBusyFlag: true }), "ui")
		},
		_dataSetting: async function () {
			this.byId("cardContent").setBusy(true);
			let oData = JSON.parse(sessionStorage.getItem("aiReport"));

			let iYear = oData.year;
			let sOrgId = oData.orgId;
			let sOrgType = oData.type;

			const oModel = new ODataModel({
				serviceUrl: "../odata/v4/pl_api/",
				synchronizationMode: "None",
				operationMode: "Server"
			});

			let sAccountpath = `/get_ai_forecast_pl(year='${iYear}',org_id='${sOrgId}',org_tp='account')`
			let sDeliveryPath = `/get_ai_forecast_pl(year='${iYear}',org_id='${sOrgId}',org_tp='delivery')`
			let sAllpath = `/get_ai_forecast_pl(year='${iYear}',org_id='${sOrgId}')`
			let sPath;

			switch (sOrgType) {
				case 'account': sPath = sAccountpath
					break;
				case 'delivery': sPath = sDeliveryPath
					break;
				default:
					sPath = sAllpath
			}

			await oModel.bindContext(sPath).requestObject().then(
				function (aResult) {
					Module.displayStatusForEmpty(this.getOwnerComponent(),aResult.value, this.byId("cardContent"));
					this._modelSetting(aResult.value);
					
					this.byId("cardContent").setBusy(false);
					this.dataLoad();
				}.bind(this))
				.catch((oErr) => {
					Module.displayStatus(this.getOwnerComponent().oCard,oErr.error.code, this.byId("cardContent"));
				});
		},

		dataLoad : function(){
			const oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.publish("CardChannel","CardFullLoad",{
				cardId:this.getView().getId()
			})
		},
		_modelSetting: function (sChannel, sEventId, oData) {
			this.getView().setModel(new JSONModel(oData.data), "Model");
			this.dataLoad();
			this.getView().getModel("ui").setProperty("/bBusyFlag", false);
		},

		onFormatPerformance: function (iValue, sType) {

			if (sType === "percent") {
				// 단위 조정(% 사용 소숫점 2번째까지 사용)

				var oNumberFormat = NumberFormat.getPercentInstance({
					groupingSeparator: ',',
					decimals: 1
				});
				return oNumberFormat.format(iValue);
			} if (sType === "number") {
				// 단위 조정(% 사용 소숫점 2번째까지 사용)

				var oNumberFormat = NumberFormat.getFloatInstance({
					groupingSeparator: ',',
					decimals: 0
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