sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.newRegist.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			// oCard.addStyleClass("custom-piepline-card")		
			// oCard.getAggregation("_header").setProperty("subtitle","(총 6,519억원/396건)")
		}
	});
});
