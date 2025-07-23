sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.orderAmt.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			this.oCard.getAggregation("_header").setIconSrc("sap-icon://information");
			this.oCard.getAggregation("_header").setIconSize("XS");
			this.oCard.getAggregation("_header").setIconBackgroundColor("Accent7");
			oCard.addStyleClass("custom-manifest-card orderAmt")		
		}
	});
});
