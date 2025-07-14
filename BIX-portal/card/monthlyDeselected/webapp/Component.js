sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.monthlyDeselected.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			oCard.addStyleClass("custom-ai-report-card")		

			// oCard.getAggregation("_header").setProperty("subtitle","(총 2,229.47억원/8건)")
			
		}
	});
});
