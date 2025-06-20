sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.marginRate.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			oCard.addStyleClass("custom-manifest-card marginRate")		
		}
	});
});
