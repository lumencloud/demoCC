sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.scheduledBiddingProjectsBau.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			console.log(oCard);
			oCard.addStyleClass("custom-ai-report-card-table")		
			oCard.getAggregation("_header").addStyleClass("hide")	
		}
	});
});
