sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.saleRelsco2.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;			
			oCard.addStyleClass("custom-dashboard-card-header custom-donught-up-card")		

		}
	});
});
