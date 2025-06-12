sap.ui.define([
    "sap/ui/core/UIComponent",
    "bix/pl/performance/model/models",
    "sap/ui/model/json/JSONModel",
], (UIComponent, models, JSONModel) => {
    "use strict";

    return UIComponent.extend("bix.pl.performance.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init: async function () {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();

            let oModel = new JSONModel({
                "3depth_usage": false,
                "3depth_size": "0%"
            });
            this.setModel(oModel, "layoutControl");

            this.setModel(new JSONModel({ yearMonth: new Date() }), "searchModel");
            this.setModel(new JSONModel({ page: "pl",  plView: "table", orgSearch: false  }), "uiModel");
            this.setModel(new JSONModel({}), "controllerModel");
        }
    });
});