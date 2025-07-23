sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.planSectorPipelineChart.Component", {
		metadata: {
			manifest: "json"
		},

        onCardReady: function(oCard) {
            this.oCard = oCard;
        }
	});
});
