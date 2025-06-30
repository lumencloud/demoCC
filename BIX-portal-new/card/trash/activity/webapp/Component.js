sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	return UIComponent.extend("bix.card.activity.Component", {
		onCardReady: function (oCard) {
			this.oCard = oCard;
		}
	});
});
