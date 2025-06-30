sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "bix/common/library/util/Formatter",
    "sap/ui/core/EventBus",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/NumberFormat",


  ],
  function (BaseController, formatter, EventBus, ODataModel, JSONModel, NumberFormat) {
    "use strict";
    return BaseController.extend("bix.card.amountCard.card", {
      formatter: formatter,
      _oEventBus: EventBus.getInstance(),

      onInit: function () {
        this._dataSetting();
        this._oEventBus.subscribe("home", "search", this._dataSetting, this);
      },

      _dataSetting: async function () {
        this.getView().setBusy(true);

        // 세션스토리지에서 데이터 가져오기
        let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

        // 파라미터
        let dYearMonth = new Date(oData.yearMonth);
        let iYear = dYearMonth.getFullYear();
        let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
        let sOrgId = oData.orgId;

        const oModel = new ODataModel({
          serviceUrl: "../odata/v4/pl_api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });

        let aResult = await oModel.bindContext(`/get_actual_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`).requestObject();
                
        let aConvert = this._dataConvert(aResult.value);

        console.log(aConvert)
        this.getView().setModel(new JSONModel(aConvert[0]), "SaleModel")
        this.getView().setModel(new JSONModel(aConvert[1]), "MarginModel")
        this.getView().setModel(new JSONModel(aConvert[2]), "MarginRateModel")
        this.getView().setModel(new JSONModel(aConvert[3]), "SGAModel")
        this._setUi(aResult.value[0].actual_curr_ym_value, 1)
        this._setUi(aResult.value[1].actual_curr_ym_value, 2)
        this._setUi(aResult.value[2].actual_curr_ym_value, 3)
        this._setUi(aResult.value[3].actual_curr_ym_value, 4)

        this.getView().setBusy(false);
      },

      _dataConvert(aResult){
        let aConvert = [];

        aResult.forEach(
          function(oData){
            let value = oData.actual_curr_ym_value;
            let purpose = oData.target_curr_y_value;
            let percent;
            if(oData.target_curr_y_value===0){
              percent = 0;
            } else {percent = oData.actual_curr_ym_value/(oData.target_curr_y_value*100000000) * 100}
            
            let contrast;
            if(oData.actual_last_ym_value === 0){
              contrast = 0;
            } else {
              contrast = (oData.actual_curr_ym_value - oData.actual_last_ym_value) / oData.actual_last_ym_value * 100
            }

            let type;
            if(contrast > 0){
              type = true;
            } else if (contrast < 0){
              type = false;
            }
             

            let oConvertData = {
              "value" : value,
              "purpose" : purpose,
              "percent" : percent,
              "contrast" : contrast,
              "type" : type
            }

            aConvert.push(oConvertData)
          }
        )

        return aConvert

      },

      _setUi: function (iChk, sAdditionalId) {
        let oHBox = this.byId("icon_box"+sAdditionalId)
        let oIcon = this.byId("Icon"+sAdditionalId);
        let oIconText = this.byId("Icon_text"+sAdditionalId)
        if (iChk > 0) {
          oHBox.addStyleClass("custom-positive-box")
          oIcon.setSrc("sap-icon://trend-up");
          oIcon.setColor("Positive");
          oIconText.addStyleClass("custom-positive-state")
        } else if (iChk < 0) {
          oHBox.addStyleClass("custom-negative-box")
          oIcon.setSrc("sap-icon://trend-down");
          oIcon.setColor("Negative");
          oIconText.addStyleClass("custom-negative-state")

        } else {
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
            decimals: 1,
          });
          return oNumberFormat.format(iValue) + "%";
        } else if (sType === "tooltip") {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
          });
          return oNumberFormat.format(iValue);
        } else if (sType === "billion") {
            var oNumberFormat = NumberFormat.getFloatInstance({
              groupingEnabled: true,
              groupingSeparator: ',',
              groupingSize: 3,
              decimals: 0
            });
            return oNumberFormat.format(iValue / 100000000) + "억";
        } else {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
            decimals: 0
          });
          return oNumberFormat.format(iValue)+"억";
        }

      },


    }
    )
  }
)
