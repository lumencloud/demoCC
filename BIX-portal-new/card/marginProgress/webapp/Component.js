sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.marginProgress.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
			
			this.oCard.getAggregation("_header").setIconSrc("sap-icon://checklist-item-2");
			this.oCard.getAggregation("_header").setIconSize("XS");
			this.oCard.getAggregation("_header").setIconBackgroundColor("Accent6");
		}
	});
});
