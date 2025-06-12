sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/model/odata/v4/ODataModel",
], function (UIComponent, ODataModel) {
	"use strict";

	return UIComponent.extend("bix.card.homeYoYSale.Component", {
		metadata: {
			manifest: "json"
		},

        onCardReady(oCard) {
            this.oCard = oCard;
        }
	});
});
