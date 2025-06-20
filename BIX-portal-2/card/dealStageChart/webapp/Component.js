sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.dealStageChart.Component", {
		metadata: {
			manifest: "json"
		},

        onCardReady: function(oCard) {
            this.oCard = oCard;
			oCard.addStyleClass("custom-manifest-card chart")
			oCard.getAggregation("_header").setProperty("subtitle","수주액/매출액: 억원 ")			
        }
	});
});
