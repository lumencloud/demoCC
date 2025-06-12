sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/Sorter",
], function (JSONModel, Controller, MessageToast, Sorter) {
    "use strict";

    return Controller.extend("bix.pl.performance.controller.SaleDetail", {
        onInit() {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteSale");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        onMyRoutePatternMatched: async function () {
            //sga 페이지 내부에 2개의 페이지가 있으므로 3depth_page에 배열로 담음.
            // let aTemp = ["sgaDetail", "sgaChart"]
            // let oLayoutModel = this.getOwnerComponent().getModel("layoutControl");
            // oLayoutModel.setProperty("/3depth_size", "65%");
            // oLayoutModel.setProperty("/3depth_usage", true);
            // oLayoutModel.setProperty("/page", "sga");
            // oLayoutModel.setProperty("/3depth_page", aTemp);
            // oLayoutModel.setProperty("/3depth_page_sub", "chart");

            //차트제거
            let oLayoutModel = this.getOwnerComponent().getModel("layoutControl");
            oLayoutModel.setProperty("/3depth_size", "65%");
            oLayoutModel.setProperty("/3depth_usage", true);
            oLayoutModel.setProperty("/page", "sga");
            oLayoutModel.setProperty("/3depth_page", "sgaDetail");
            oLayoutModel.setProperty("/3depth_page_sub", "");
        },

    });
});
