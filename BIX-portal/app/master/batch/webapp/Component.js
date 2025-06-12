sap.ui.define([
    "sap/ui/core/UIComponent",
    "bix/master/batch/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("bix.master.batch.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init:async function() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");
            
            // size Limit 설정
            let oModel = this.getModel();
            oModel.setSizeLimit(2000);

            // enable routing
            this.getRouter().initialize();
        },
    });
});