sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/format/NumberFormat",
	"sap/ui/core/EventBus"
], function (Controller, JSONModel, NumberFormat, EventBus) {
	"use strict";

	return Controller.extend("bix.card.homePerformance.Main", {
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
			
			let oModel = this.getOwnerComponent().getModel();

			const oBinding = oModel.bindContext("/get_actual_pl(year='2024',month='09',org_id='5')");

			let aResults = await oBinding.requestObject();

			let oNumberFormat = NumberFormat.getFloatInstance({
                groupingSeparator: ',',
                decimals: 2
			});

			let oData = {
				sale: aResults.value.find(oResult => oResult.display_order == "1").actual_curr_ym_value,
				saleProgress: oNumberFormat.format(aResults.value.find(oResult => oResult.display_order == "1").actual_curr_ym_rate) || "-",
				margin: aResults.value.find(oResult => oResult.display_order == "2").actual_curr_ym_value,
				marginProess: oNumberFormat.format(aResults.value.find(oResult => oResult.display_order == "2").actual_curr_ym_rate) || "-",
				marginRate: aResults.value.find(oResult => oResult.display_order == "3").actual_curr_ym_value,
			}
			this.getView().setModel(new JSONModel(oData), "cardModel");

			this.getView().setBusy(false);
		},
	});
});