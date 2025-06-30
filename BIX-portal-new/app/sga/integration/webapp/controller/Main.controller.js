sap.ui.define([
    "sap/ui/core/mvc/Controller",
], (Controller) => {
    "use strict";

    return Controller.extend("bix.sga.integration.controller.Main", {

        /**
         * 초기 실행 메소드
         */
        onInit: async function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("Main");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        onMyRoutePatternMatched: function () {
            this.byId("columnLabel").setText(`${String(new Date().getFullYear()).substring(2, 4)}년`)
        },
    });
});