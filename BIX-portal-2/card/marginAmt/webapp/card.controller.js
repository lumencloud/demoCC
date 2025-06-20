sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "bix/common/library/util/Formatter",
    "sap/ui/core/EventBus",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/NumberFormat",


  ],
  function (BaseController, formatter, EventBus, ODataModel,JSONModel, NumberFormat) {
   "use strict";
    return BaseController.extend("bix.card.marginAmt.card", {      
      formatter: formatter,
      _oEventBus: EventBus.getInstance(),

      onInit: function () {     
        this._dataSetting();
        this._oEventBus.subscribe("home", "search", this._dataSetting, this);
      },

      _dataSetting: async function(){
        this.getView().setBusy(true);

            // 세션스토리지에서 데이터 가져오기
            let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;            
            
            const oModel = new ODataModel({
              serviceUrl: "../odata/v4/cm/",
              synchronizationMode: "None",
              operationMode: "Server"
            });

            let aResult = await oModel.bindContext(`/get_dashboard_chart(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`).requestObject();
            console.log(aResult)
            this.getView().setModel(new JSONModel(aResult.value[0]), "InfoModel")
            this._setUi(aResult.value[0].margin_last_ym_rate)

            this.getView().setBusy(false);
      },

      _setUi: function(iChk){        
        let oIcon = this.byId("Icon");
        let oIconText = this.byId("Icon_text")
        if(iChk > 0){
            oIcon.setSrc("sap-icon://trend-up");
            oIcon.setColor("Positive");
            oIconText.addStyleClass("custom-positive-state")
        }else if(iChk < 0){
            oIcon.setSrc("sap-icon://trend-down");
            oIcon.setColor("Negative");
            oIconText.addStyleClass("custom-negative-state")

        }else{
            oIcon.setSrc("");
        };
      },

      /**
         * 필드 Formatter
         * @param {String} sType 
         * @param {*} iValue 기본값
         */
      onFormatPerformance: function (iValue, sType) {
        if (sType === "percent") {         
            var oNumberFormat = NumberFormat.getFloatInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
                decimals: 2,
            });
            return oNumberFormat.format(iValue) + "%";
        } else if(sType === "tooltip" ){
            var oNumberFormat = NumberFormat.getFloatInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
            });
            return oNumberFormat.format(iValue);
        } else if(sType === "billion"){          
            
             {
              var oNumberFormat = NumberFormat.getFloatInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
                decimals: 2
              });
              return oNumberFormat.format(iValue/100000000)+"억";
            }            
        } else if(sType === "건수"){
            var oNumberFormat = NumberFormat.getFloatInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
                decimals: 0
            });
            return oNumberFormat.format(iValue);
        }

    },

     
}
)
}
)
