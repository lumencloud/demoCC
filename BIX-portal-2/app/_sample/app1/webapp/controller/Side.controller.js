sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller"
], function (JSONModel, Controller) {
	"use strict";

	return Controller.extend("bix.sample.app1.controller.Side", {
		onInit() {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteMain2");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        onMyRoutePatternMatched: async function () {
            let oLayoutModel = this.getOwnerComponent().getModel("layoutControl");
            oLayoutModel.setProperty("/3depth_usage", true);
            oLayoutModel.setProperty("/3depth_size", "50%");
        },

        onPress() {
            this.getOwnerComponent().getRouter().navTo("RouteMain2")
        },

        onPress2() {
            this.getOwnerComponent().getRouter().navTo("RouteMain")
        }
	});
});
