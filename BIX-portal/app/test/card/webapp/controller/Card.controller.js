sap.ui.define([
    "sap/ui/core/mvc/Controller"
  ], (BaseController) => {
    "use strict";
  
    return BaseController.extend("bix.test.card.controller.Card", {
        onInit() {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteCard");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },
        onMyRoutePatternMatched: function () {

        }
    });
  });