sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "../../main/util/Module",
    "sap/ui/model/json/JSONModel",

  ],
  function (BaseController, EventBus, Module, JSONModel) {
    "use strict";
    return BaseController.extend("bix.card.scheduledBiddingProjects.card", {
      _oEventBus: EventBus.getInstance(),

      onInit: function () {     
       this._dataSet();
      },

      _dataSet : function (){
        let data = [
          { 
            customer : "SK 실트론",
            account : "Hi-Tech사업부문",
            delivery : "제조 서비스 부문",
            org_name : "SK실트론 '25년 P1 1F-4F Lift 완제품 창고자동화",
            org_detail : "(42.6억, 예상 계약일: 05-30)"
          },
          { 
            customer : "SK 실트론",
            account : "Hi-Tech사업부문",
            delivery : "제조 서비스 부문",
            org_name : "SK실트론 '25년 P1 1F AMR 완제품 창고자동화",
            org_detail : "(42.6억, 예상 계약일: 05-30)"
          },
          { 
            customer : "SK 실트론",
            account : "Hi-Tech사업부문",
            delivery : "제조 서비스 부문",
            org_name : "SK실트론 '25년 P1 11F Hybox 완제품 창고자동화",
            org_detail : "(38.3억, 예상 계약일: 05-30)"
          },
          { 
            customer : "SK 하이닉스",
            account : "Hi-Tech사업부문1",
            delivery : "제조 서비스 부문1",
            org_name : "SKHy '25년 청주 M15X 설비제어 시스템(TGMS) 구축",
            org_detail : "(64.9억, 예상 계약일: 06-01)"
          },
        ]

        this.getView().setModel(new JSONModel(data), "model")
        let oTable = this.byId("table")
        Module.setTableMerge(oTable, "model", 3);
      },
     
    })
  }
)
