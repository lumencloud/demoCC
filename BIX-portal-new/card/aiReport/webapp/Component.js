sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.aiReport.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			oCard.getAggregation("_header").addStyleClass("hide")
			oCard.addStyleClass("ai-report-card")
		}	
	});
});
