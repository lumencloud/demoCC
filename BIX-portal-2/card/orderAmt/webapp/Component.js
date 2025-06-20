sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.orderAmt.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			oCard.addStyleClass("custom-manifest-card orderAmt")		
		}
	});
});
