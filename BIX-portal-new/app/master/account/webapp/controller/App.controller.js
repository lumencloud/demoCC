sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/Messaging",
], (BaseController,Messaging) => {
  "use strict";

  return BaseController.extend("bix.master.account.controller.App", {
    onInit: function () {
      // 이 어플리케이션의 view에 Messaging 적용
      Messaging.registerObject(this.getView(), true);

    }
  });
});