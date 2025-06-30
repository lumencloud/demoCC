sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.completedContractBau.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			oCard.addStyleClass("custom-ai-report-card")		
			// oCard.getAggregation("_header").setProperty("subtitle","(총 6,301.41억원/40건)")
			
		}
	});
});
