sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.monthlyPlan.Component", {
		metadata: {
			manifest: "json"
		},

        onCardReady: function(oCard) {
            this.oCard = oCard;
			oCard.addStyleClass("custom-dashboard-card-header")		
			// oCard.getAggregation("_header").addStyleClass("hide")	

        }
	});
});
