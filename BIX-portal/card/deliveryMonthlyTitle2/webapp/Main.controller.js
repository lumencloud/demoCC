sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/EventBus"
], function (Controller, JSONModel, EventBus) {
	"use strict";

	return Controller.extend("bix.card.deliveryMonthlyTitle2.Main", {
		_oEventBus: EventBus.getInstance(),
		onInit: function () {
			this._dataSetting();
			this._oEventBus.subscribe("aireport", "infoSet", this._dataSetting, this);	
		},

		_getToday: function () {
			let today = new Date();
	
			return {
				year: today.getFullYear(),
			  	month: String(today.getMonth() + 1).padStart(2, "0")
			}
		},
		_dataSetting: function (sChannelId, sEventId, oData) {
			this.byId("cardContent").setBusy(true);
			let oSessionData = JSON.parse(sessionStorage.getItem("aiReport"))			

			this.getView().setModel(new JSONModel({month: String(Number(oSessionData.month)), title: oSessionData.title}),"ui");

			this.byId("cardContent").setBusy(false);
			this.dataLoad();
		},

		dataLoad : function(){
			const oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.publish("CardChannel","CardFullLoad",{
				cardId:this.getView().getId()
			})
		},
	});
});