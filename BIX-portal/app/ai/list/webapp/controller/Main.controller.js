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

                const w = 1200;
                const h = 820;

                const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
                const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

                const width = window.innerWidth
                    ? window.innerWidth
                    : document.documentElement.clientWidth
                        ? document.documentElement.clientWidth
                        : screen.width;

                const height = window.innerHeight
                    ? window.innerHeight
                    : document.documentElement.clientHeight
                        ? document.documentElement.clientHeight
                        : screen.height;

                const left = dualScreenLeft + (width - w) / 2;
                const top = dualScreenTop + (height - h) / 2;

                const newTabConfig = `width=${w},height=${h},top=${top},left=${left},scrollbars=yes,resizable=yes`;

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
