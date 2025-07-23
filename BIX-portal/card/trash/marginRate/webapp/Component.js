sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.marginRate.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			this.oCard.getAggregation("_header").setIconSrc("sap-icon://mirrored-task-circle-2");
			this.oCard.getAggregation("_header").setIconSize("XS");
			this.oCard.getAggregation("_header").setIconBackgroundColor("Accent7");
			oCard.addStyleClass("custom-manifest-card marginRate")		
		}
	});
});
