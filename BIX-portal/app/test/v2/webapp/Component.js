sap.ui.define([
    "sap/ui/core/UIComponent",
    "bix/test/v2/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("bix.test.v2.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            this.getModel("v2").metadataLoaded().then(function () {
                // enable routing
                this.getRouter().initialize();
            }.bind(this))
        }
    });
});