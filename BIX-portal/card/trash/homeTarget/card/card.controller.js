sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/odata/v4/ODataModel",
	"sap/ui/core/EventBus"
], function (Controller, JSONModel, ODataModel, EventBus) {
	"use strict";

	return Controller.extend("bix.card.homeTarget.card", {
		_oEventBus: EventBus.getInstance(),

		onInit: function () {
			// this._oEventBus.subscribe("pl", "search", this._setChart, this);

			this._setChart();
		},

		/**
		 * ChartJS 차트 구성 로직
		 */
		_setChart: async function () {
			this.getView().setBusy(true);

			const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

			const oBinding = oModel.bindContext("/get_actual_pl(year='2024',month='09',org_id='5')");

			let aResults = await oBinding.requestObject();

			let oData = {
				sale: aResults.value.find(oResult => oResult.display_order == "1").target_curr_y_value,
				margin: aResults.value.find(oResult => oResult.display_order == "2").target_curr_y_value,
				marginRate: aResults.value.find(oResult => oResult.display_order == "3").target_curr_y_value,
			}
			this.getView().setModel(new JSONModel(oData), "cardModel");

			this.getView().setBusy(false);
		},
	});
});