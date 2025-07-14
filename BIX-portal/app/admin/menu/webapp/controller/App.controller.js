sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/Messaging",
], (BaseController, Messaging) => {
  "use strict";

  return BaseController.extend("bix.admin.menu.controller.App", {
      onInit() {
        // 이 어플리케이션의 view에 Messaging 적용
        Messaging.registerObject(this.getView(), true);
      },
  });
});