sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
  ],
  function (BaseController, EventBus,) {
    "use strict";
    return BaseController.extend("bix.card.aiInsightBau.card", {
      _oEventBus: EventBus.getInstance(),

      onInit: function () {     
       
      },
     
    })
  }
)
