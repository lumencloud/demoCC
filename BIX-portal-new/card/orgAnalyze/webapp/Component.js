sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.orgAnalyze.Component", {
		metadata: {
			manifest: "json"
		},

        onCardReady: function(oCard) {
            this.oCard = oCard;
			oCard.addStyleClass("custom-dashboard-card-header")		

        }
	});
});
