sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "bix/common/library/util/Formatter",
    "sap/ui/core/EventBus",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/NumberFormat",
    "bix/common/library/control/Modules",

  ],
  function (BaseController, formatter, EventBus, ODataModel, JSONModel, NumberFormat, Modules) {
    "use strict";
    return BaseController.extend("bix.card.amountCard.card", {
      formatter: formatter,
      _oEventBus: EventBus.getInstance(),

      onInit: function () {
        this._dataSetting();
        this._oEventBus.subscribe("home", "search", this._dataSetting, this);
      },

      _dataSetting: async function () {
        this.byId("cardContent").setBusy(true);

        // 세션스토리지에서 데이터 가져오기
        let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

        // 파라미터
        let dYearMonth = new Date(oData.yearMonth);
        let iYear = dYearMonth.getFullYear();
        let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
        let sOrgId = oData.orgId;

        //subtitle 설정
        let subTitle = `(${dYearMonth.getMonth() + 1}월 누계)`
        this.getOwnerComponent().oCard.getAggregation("_header").setProperty("subtitle", subTitle)
        this.getOwnerComponent().oCard.getAggregation("_header").setProperty("title", "진척률")



        const oModel = new ODataModel({
          serviceUrl: "../odata/v4/pl_api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });

        let aResult = await oModel.bindContext(`/get_actual_pl_total(year='${iYear}',month='${sMonth}')`).requestObject().catch((oErr) => {
          Modules.displayStatus(this.getOwnerComponent().oCard,oErr.error.code, this.byId("cardContent"));
        });          

        //console.log(aResult)
        let aConvert = await this._dataConvert(aResult.value);
        let oSumeData = await this._dataSum(aConvert)
        this.getView().setModel(new JSONModel(aConvert[0]), "SaleModel")
        this.getView().setModel(new JSONModel(aConvert[1]), "MarginModel")
        this.getView().setModel(new JSONModel(oSumeData), "SGAModel")
        this.getView().setModel(new JSONModel(aConvert[6]), "ProfitModel")
        // this._setUi(aConvert[0].contrast, 1)
        // this._setUi(aConvert[7].contrast, 2)
        // this._setUi(aConvert[2].contrast, 3)
        // this._setUi(oSumeData.contrast, 4)

        this.byId("cardContent").setBusy(false);
      },

      _dataSum(aConvert){
        return {
          "value" : aConvert[3].value + aConvert[5].value,
          "purpose" : aConvert[3].purpose + aConvert[5].purpose,
          "percent" : aConvert[3].percent + aConvert[5].percent,
          "contrast" : aConvert[3].contrast + aConvert[5].contrast,
          "type" : (aConvert[3].contrast + aConvert[5].contrast) > 0 ? true : false,
        }
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
            } else {
              // if(oData.type === "마진율" || oData.type === "영업이익률"){
              //   percent = oData.actual_curr_ym_value/(oData.target_curr_y_value) * 100
              // } else {
                percent = oData.actual_curr_ym_value/(oData.target_curr_y_value*100000000) * 100
              // }
              
            }
            
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

            let name = oData.type

             

            let oConvertData = {
              "value" : value,
              "purpose" : purpose,
              "percent" : percent,
              "contrast" : contrast,
              "type" : type,
              "name" : name
            }
            
            aConvert.push(oConvertData)
          }
        )
        return aConvert

      },

      _setUi: function (iChk, sAdditionalId) {
        // let oHBox = this.byId("icon_box"+sAdditionalId)
        let oIconText = this.byId("Icon_text"+sAdditionalId)
        if (iChk > 0) {
          // oHBox.addStyleClass("custom-box-empty green sapUiTinyMarginTop")
          oIconText.addStyleClass("custom-positive-state")
        } else if (iChk < 0) {
          // oHBox.addStyleClass("custom-box-empty red sapUiTinyMarginTop")
          oIconText.addStyleClass("custom-negative-state")

        }
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
          return oNumberFormat.format(iValue*100) + "%";
        } else if(sType === "percent2") {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
            decimals: 2,
          });
          return oNumberFormat.format(iValue) + "%";
        } else if (sType === "contrast_percent") {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
            decimals: 2,
          });
          if(iValue > 0) {
            return " " + oNumberFormat.format(iValue) + "%" + " 증가";
          } else if(iValue<0){
            return " " + oNumberFormat.format(iValue) + "%" + " 감소";
          } 
          
        } else if (sType === "tooltip") {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
            decimals:0
          });
          return oNumberFormat.format(iValue);
        } else if (sType === "tooltip_billion") {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
            decimals:0
          });
          return oNumberFormat.format(iValue * 100000000);
        }
        else if (sType === "tooltip_percent") {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
            decimals:4
          });
          return oNumberFormat.format(iValue);
        }else if (sType === "billion") {
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
