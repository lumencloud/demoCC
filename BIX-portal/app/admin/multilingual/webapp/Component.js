sap.ui.define([
    "sap/ui/core/UIComponent",
], (UIComponent) => {
    "use strict";

    return UIComponent.extend("bix.admin.multilingual.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init: async function () {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            await this._requestMetadata();

            // enable routing
            this.getRouter().initialize();
        },

        _requestMetadata: async function () {
            let oModel = this.getModel();
            let oMetaModel = oModel.getMetaModel();
            await oMetaModel.requestObject("/Menus");
        },

    });
});