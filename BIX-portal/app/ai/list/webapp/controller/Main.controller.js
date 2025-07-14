sap.ui.define([
    "sap/m/library",
    "sap/ui/core/library",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "bix/common/library/control/Modules",
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (
        mLibrary,
        coreLibrary,
        Controller,
        JSONModel,
        Modules,
    ) {
        "use strict";

        return Controller.extend("bix.ai.list.controller.Main", {
            onInit: function () {
                const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteMain");
                myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
            },
            onMyRoutePatternMatched: async function (oEvent) {
                this._setModel()
            },

            _setModel: function () {
                this.getOwnerComponent().getModel("aiModel");
            },

            _bindTable: function () {
                // this.byId("aiTable")
            },

            onNavDetail: function (oEvent) {
                const sPath = oEvent.getParameters().rowBindingContext.getPath()
                const sId = sPath.slice(sPath.indexOf("(") + 1, sPath.lastIndexOf(")"));
                this.getOwnerComponent().getRouter().navTo('Detail', { seq: sId });
            },

            onOpenTab: function (oEvent) {
                let oContext = oEvent.getParameters()["rowContext"];
                let sId = oContext.getObject("ID");
                const sHash = window.location.origin;

                const newTabConfig = "width=1200,height=800,top=100,left=200,scrollbar=yes,resizable=yes"

                switch (sId) {
                    case "ID1":
                        // this.getOwnerComponent().getRouter().navTo("PipelineWeekly");
                        window.open(sHash + "/main/aiReportWeek.html#/PipelineWeekly", "_blank");
                        break;
                    case "ID2":
                        this.getOwnerComponent().getRouter().navTo("DeliveryMonthly");
                        break;
                    case "ID3":
                        this.getOwnerComponent().getRouter().navTo("CloudMonthly");
                        break;
                    case "ID4": //MainMonthly
                        window.open(sHash + "/main/aiReportMonth.html#/MainMonthly", "_blank");
                        // this.getOwnerComponent().getRouter().navTo("MainMonthly");
                        break;
                    case "ID5":
                        this.getOwnerComponent().getRouter().navTo("AccountMonthly");
                        break;
                }
            },

        });
    });
