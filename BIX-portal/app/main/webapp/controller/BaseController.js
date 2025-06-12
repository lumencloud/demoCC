sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/ui/model/resource/ResourceModel",
  "sap/ui/model/json/JSONModel"
], (BaseController, MessageToast, ResourceModel, JSONModel) => {
  "use strict";

  return BaseController.extend("bix.main.controller.BaseController", {
      onInit() {
        Log.info(this.getView().getControllerName(), "onInit");
      },

      onSetting() {
        const oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
        this.oBundle = oBundle;
        this.oRouter = this.getOwnerComponent().getRouter();
      },

      onPressHome() {
        this.oRouter.navTo("RouteHome", {},{"bix.admin.menu": {route: "Detail"}})
        MessageToast.show(this.oBundle.getText("p_m_goToHome"));
      }
  });
});