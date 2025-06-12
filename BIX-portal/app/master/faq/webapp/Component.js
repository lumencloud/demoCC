sap.ui.define([
    "sap/ui/core/UIComponent",
    "bix/master/faq/model/models",
    "sap/ui/model/json/JSONModel",
], (UIComponent, models,JSONModel) => {
    "use strict";

    return UIComponent.extend("bix.master.faq.Component", {
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

            
            // 로그인한 사용자 정보를 담는 모델
            const oUserModel = new JSONModel("/self");
            this.setModel(oUserModel, "userModel");

            // enable routing
            this.getRouter().initialize();
        },

    });
});