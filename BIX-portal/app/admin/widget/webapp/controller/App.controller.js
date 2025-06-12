sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
    ],
    function(BaseController, JSONModel) {
      "use strict";
  
      return BaseController.extend("bix.admin.widget.controller.App", {
        onInit: function () {
          this.getOwnerComponent().getRouter().attachRouteMatched(this._onRouteMatched, this);
        },
  
        _onRouteMatched: async function () {
        }
      });
    }
  );
  