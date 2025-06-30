sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.aiInsightBau.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			oCard.getAggregation("_header").addStyleClass("hide")
		}
	});
});
