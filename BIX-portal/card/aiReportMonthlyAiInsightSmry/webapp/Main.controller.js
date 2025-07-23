sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/EventBus"
], function (Controller, JSONModel, EventBus) {
	"use strict";

	return Controller.extend("bix.card.aiReportMonthlyAiInsightSmry.Main", {
		_oEventBus: EventBus.getInstance(),

		onInit: function () {
			// 초기 로딩 상태 설정
			this.getView().setModel(new JSONModel({
				"isLoading": true,
				"summary": ""
			}), "LLMModel");
			this._oEventBus.publish("aireport", "isCardSubscribed");
			this._oEventBus.subscribe("pl", "aiReportMonthlyAiInsightSmry", this._dataSetting, this);
		},

		_dataSetting: function (sChannelId, sEventId, oData) {
			this.byId("cardContent").setBusy(true);

			let sSummary = oData.summary;
			if (!sSummary) {
				console.warn("Summary 내용이 없습니다.");
				throw new Error("Summary 내용이 없습니다.");
			}
			this.getView().setModel(new JSONModel({summary: sSummary}), "LLMModel");

			var oModel = this.getView().getModel("LLMModel");
			oModel.setProperty("/isLoading", false);
			
			this.byId("cardContent").setBusy(false);
			this.dataLoad();
		},

		dataLoad: function () {
			const oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.publish("CardChannel", "CardFullLoad", {
				cardId: this.getView().getId()
			})
		},
	});
});