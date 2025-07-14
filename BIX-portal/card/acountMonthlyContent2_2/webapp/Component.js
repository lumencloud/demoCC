sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.acountMonthlyContent2_2.Component", {
		metadata: {
			manifest: "json"
		},

        onCardReady: function(oCard) {
            this.oCard = oCard;
			// oCard.addStyleClass("custom-manifest-card chart-select")
			// oCard.getAggregation("_header").setProperty("subtitle","매출/마진: 억원, 마진율: %")						
        }
	});
});
