sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.monthlyScheduledBiddingProjects.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			oCard.addStyleClass("custom-ai-report-card-table")	
			if(oCard.getAggregation("_header"))	{
				oCard.getAggregation("_header").addStyleClass("hide")	
			}
			oCard.getAggregation("_content").addStyleClass("noPadding")	
		}
	});
});
