sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.aiReportBau.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			if(oCard.getAggregation("_header")){
				oCard.getAggregation("_header").addStyleClass("hide")
			}
			oCard.addStyleClass("ai-report-card")

		}
	});
});
