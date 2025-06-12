sap.ui.define([
    "sap/ui/core/UIComponent",
    "bix/test/chart/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("bix.test.chart.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init: function () {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            this.getRouter().initialize();
        }
    });
});