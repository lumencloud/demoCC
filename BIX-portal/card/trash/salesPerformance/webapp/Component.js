sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.salesPerformance.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			this.oCard.addStyleClass("salesPerformColor");
			this.oCard.getAggregation("_header").addStyleClass("salesPerformColor");
			this.oCard.getAggregation("_header").getAggregation("_title").addStyleClass("salesPerformColor");
		}
	});
});
