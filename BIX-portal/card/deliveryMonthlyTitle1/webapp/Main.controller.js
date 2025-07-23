sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/EventBus"
], function (Controller, JSONModel, EventBus) {
	"use strict";

	return Controller.extend("bix.card.deliverymonthlytitle1.Main", {
		_oEventBus: EventBus.getInstance(),
		_bFlag : true,
		onInit: function () {
			this._dataSetting();
			this._oEventBus.publish("aireport", "isCardSubscribed");
			this._oEventBus.subscribe("aireport", "infoSet", this._dataSetting, this);
		},
		_dataSetting: function () {
			this.byId("cardContent").setBusy(true);
			let oDateInfo = JSON.parse(sessionStorage.getItem("aiReport"));

			let oInfoData = {
				date: String(oDateInfo.year) + "." + String(Number(oDateInfo.month) + 1).padStart(2, "0") + "." + "01"
			}

			this.getView().setModel(new JSONModel({ date: oInfoData.date }), "ui");

			this.byId("cardContent").setBusy(false);
			
			if (this._bFlag) {
				this.dataLoad();
			  }
		},

		dataLoad: function () {
			this._oEventBus.publish("CardChannel", "CardFullLoad", {
			  cardId: this.getView().getId()
			})
			this._bFlag = false;
		  },

		onPressLink: function () {
			const sHash = window.location.origin;
 
            window.open(sHash + "/main/index.html#", "_blank");
 
		}
	});
});