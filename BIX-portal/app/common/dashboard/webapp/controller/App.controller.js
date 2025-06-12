sap.ui.define(
    [
        "sap/ui/core/mvc/Controller"
    ],
    function(BaseController) {
      "use strict";
  
      return BaseController.extend("bix.common.dashboard.controller.App", {
        onInit: function() {
          this.getOwnerComponent().getRouter().attachRouteMatched(this._onRouteMatched, this);
        },
  
        _onRouteMatched: async function () {
        }
        
        
      });
    }
  );
  