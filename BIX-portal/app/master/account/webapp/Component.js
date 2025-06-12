sap.ui.define([
    "sap/ui/core/UIComponent",
    "bix/master/account/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("bix.master.account.Component", {
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

            await this._requestMetadata();

            // enable routing
            this.getRouter().initialize();
        },

        _requestMetadata: async function () {
            let oModel = this.getModel();
            let oMetaModel = oModel.getMetaModel();
            await Promise.all([
                oMetaModel.requestObject("/customer"),
            ])
        },
    });
});