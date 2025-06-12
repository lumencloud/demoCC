sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller"
], function (JSONModel, Controller) {
	"use strict";

	return Controller.extend("bix.pl.performance.controller.PL", {
		onInit() {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RoutePL");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        onMyRoutePatternMatched: async function () {
            let oLayoutModel = this.getOwnerComponent().getModel("layoutControl");
            oLayoutModel.setProperty("/3depth_usage", true);
            oLayoutModel.setProperty("/3depth_size", "65%");
        },

        /**
         * Grid <-> Table 전환 버튼 클릭 이벤트
         * @param {sap.ui.base.Event} oEvent 
         * @param {String} sFlag 
         */
        onSwitchPL(oEvent, sFlag) {
            this.getOwnerComponent().getModel("uiModel").setProperty("/plView", sFlag);
        }
	});
});
