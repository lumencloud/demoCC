sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.salesProgress.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			this.oCard.getAggregation("_header").setIconSrc("sap-icon://in-progress-2");
			this.oCard.getAggregation("_header").setIconSize("XS");
			this.oCard.getAggregation("_header").setIconBackgroundColor("Accent7");
		}
	});
});
