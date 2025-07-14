sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "../../main/util/Module",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
  ],
  function (BaseController, EventBus, Module, JSONModel, ODataModel, NumberFormat) {
    "use strict";
    return BaseController.extend("bix.card.monthlyScheduledBiddingProjects.card", {
      _oEventBus: EventBus.getInstance(),

      onInit: function () {
        this._dataSetting();
        this._oEventBus.subscribe("aireport", "infoSet", this._dataSetting, this)
      },

      _dataSetting: async function () {
        this.byId("cardContent").setBusy(true);
        let oData = JSON.parse(sessionStorage.getItem("aiReport"));
        let iYear = oData.year;
        let sMonth = oData.month;
        let sOrgId = oData.orgId;

        const oModel = new ODataModel({
          serviceUrl: "../odata/v4/pl_api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });

        // 전사 api
        let sAllPath = `/get_ai_forecast_deal_type_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',deal_stage_cd='qualified')`
        // Account api
        let sAccountPath = `/get_ai_forecast_deal_type_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',deal_stage_cd='qualified',org_tp='${oData.type}')`

        let sPath = oData.type ? sAccountPath : sAllPath

        await oModel.bindContext(sPath).requestObject().then(
          function (aResult) {
            Module.displayStatusForEmpty(this.byId("table"), aResult.value, this.byId("cardContent"));
         
            this._modelSetting(aResult.value);
            this.dataLoad();
          }.bind(this))
          .catch((oErr) => {
            Module.displayStatus(this.byId("table"), oErr.error.code, this.byId("cardContent"));
          });
        this.byId("cardContent").setBusy(false);
      },

      dataLoad: function () {
        const oEventBus = sap.ui.getCore().getEventBus();
        oEventBus.publish("CardChannel", "CardFullLoad", {
          cardId: this.getView().getId()
        })
      },

      _modelSetting: function (aResult) {
        // 총 건수
        let iCount = aResult.length;
        let ietcAmount = 0;
        // Account 코드 삭제
        aResult.forEach(a => {
          a.biz_tp_account_nm = a.biz_tp_account_nm.slice(4)
        })

        let topPart, etcPart
        if (aResult[4]) {
          topPart = aResult.slice(0, 4)
          etcPart = aResult.slice(4)
        } else {
          topPart = aResult
        }
        if (etcPart) {
          // 기타 총 금액 합산
          etcPart.forEach((oResult) => ietcAmount += Number(oResult.rodr_amt))
          topPart['majorAccount'] = etcPart[0].account_div_name
          topPart['count'] = etcPart.length
          topPart['total'] = ietcAmount.toFixed(0)
        }

        let oTable = this.byId("table")
        Module.setTableMerge(oTable, "model", 3);
        oTable.setVisibleRowCountMode("Fixed")
        oTable.setVisibleRowCount(4)
        this.getView().setModel(new JSONModel(topPart), "model");

        // oTable.setNoData("입찰 예정 건이 없습니다.")

        // let subTitle = `(총 ${iAmount.toFixed(2)}억원 / ${iCount}건)`
        // if (this.getOwnerComponent().oCard.getAggregation("_header")) {
        //   this.getOwnerComponent().oCard.getAggregation("_header").setProperty("subtitle", subTitle)
        // }
      },

      _setDate: function () {
        let today = new Date();
        let day = today.getDay();

        let monday = new Date(today);
        monday.setDate(today.getDate() - ((day + 6) % 7));

        let sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        return {
          monday: this._formatDate(monday),
          sunday: this._formatDate(sunday)
        }
      },

      _formatDate: function (date) {
        let year = date.getFullYear();
        let month = String(date.getMonth() + 1).padStart(2, '0');
        let day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`
      },

      _formatTotal: function (sValue) {
        if (!sValue) return;

        let fNumber = parseFloat(sValue);
        if (Number.isInteger(fNumber)) {
          let oFormatter = NumberFormat.getIntegerInstance({
            groupingEnabled: true
          });
          return oFormatter.format(fNumber);
        } else {
          let fTruncated = Math.floor(sValue * 10) / 10;
          let oFormatter = NumberFormat.getFloatInstance({
            minFractionDigits: 0,
            maxFractionDigits: 1,
            groupingEnabled: true
          });
          return oFormatter.format(fTruncated);
        }
      }
    })
  }
)
