sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        'bix/common/library/control/Modules',
        "sap/ui/model/json/JSONModel",
    ],
    function(BaseController, Modules, JSONModel) {
      "use strict";
  
      return BaseController.extend("bix.admin.publish.controller.App", {
        onInit: function () {
          this.getOwnerComponent().getRouter().attachRouteMatched(this._onRouteMatched, this);
        },
  
        _onRouteMatched: async function () {
        }
      });
    }
  );
  
  