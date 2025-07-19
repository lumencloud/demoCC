sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.amountCard.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			
			oCard.addStyleClass("custom-dashboard-top-card custom-card-header-hide")				
		}
	});
});
