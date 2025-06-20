sap.ui.define([
    "sap/ui/core/UIComponent",
    "bix/master/orgtarget/model/models",
    "sap/ui/model/json/JSONModel",
], (UIComponent, models,JSONModel) => {
    "use strict";

    return UIComponent.extend("bix.master.orgtarget.Component", {
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
            
            const iYear = new Date().getFullYear();
            this.setModel(new JSONModel({ year: iYear, refresh: false, edit:false, table:'조직별'}), "uiModel");

            let oModel = this.getModel();
            let sCodeUrl = "/GetCodeItemView(category='target_code')/Set";
            const oCodeBinding = oModel.bindContext(sCodeUrl);
            let oCodeRequest= await oCodeBinding.requestObject();
            this.setModel(new JSONModel(oCodeRequest.value),"propertyModel");
        },

        _requestMetadata: async function () {
            let oModel = this.getModel();
            let oMetaModel = oModel.getMetaModel();
            await Promise.all([
                oMetaModel.requestObject("/mis_year_amount"),
            ])
        },
    });
});