sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.homePerformanceCost.Component", {
		metadata: {
			manifest: "json"
		},

        onCardReady(oCard) {
            this.oCard = oCard;
        }
	});
});
