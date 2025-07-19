sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/NumberFormat",
    "../../main/util/Module",
  ],
  function (BaseController, EventBus, ODataModel, JSONModel, NumberFormat, Module) {
    "use strict";
    return BaseController.extend("bix.card.monthlyNewRegist.card", {
      _oEventBus: EventBus.getInstance(),

      onInit: function () {
        // this._dataSetting();
        this._oEventBus.subscribe("aireport", "new", this._modelSetting, this)
      },

      _dataSetting: async function () {
        this.byId("cardContent").setBusy(true);
        let oData = JSON.parse(sessionStorage.getItem("aiReport"));
        let iYear = oData.year;
        let sMonth = oData.month
        let sOrgId = oData.orgId;

        const oModel = new ODataModel({
          serviceUrl: "../odata/v4/pl_api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });
        // 전사 api
        let sAllPath = `/get_ai_forecast_deal_type_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',deal_stage_cd='new')`
        // Account api
        let sAccountPath = `/get_ai_forecast_deal_type_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',deal_stage_cd='new',org_tp='${oData.type}')`

        let sPath = oData.type ? sAccountPath : sAllPath

        await oModel.bindContext(sPath).requestObject().then(
          function (aResult) {
            Module.displayStatusForEmpty(this.getOwnerComponent().oCard, aResult.value, this.byId("cardContent"));
            this._modelSetting(aResult.value);

            this.dataLoad();
          }.bind(this))
          .catch((oErr) => {
            Module.displayStatus(this.getOwnerComponent().oCard, oErr.error.code, this.byId("cardContent"));
          });
        this.byId("cardContent").setBusy(false);
      },

      dataLoad: function () {
        const oEventBus = sap.ui.getCore().getEventBus();
        oEventBus.publish("CardChannel", "CardFullLoad", {
          cardId: this.getView().getId()
        })
      },

      _modelSetting: function (sChannel, sEventId, oData) {
        let aResult = oData.data
        // 총 건수
        let iCount = aResult.length;

        // 총 금액
        let iAmount = 0;
        aResult.forEach((oResult) => iAmount += Number(oResult.rodr_amt))
        aResult.map(o => o.rodr_amt.toFixed(1))
        // 기타를 최하단으로 정렬
        if (aResult) {
          aResult.sort((a, b) => {
            if (a.biz_tp_account_nm === '기타' && b.biz_tp_account_nm !== '기타') {
              return 1;
            }
            if (a.biz_tp_account_nm !== '기타' && b.biz_tp_account_nm === '기타') {
              return -1;
            }
            return 0;
          })
        }
        // Account 코드 삭제
        aResult.forEach(a => {
          if (a.biz_tp_account_nm !== '기타') {
            a.biz_tp_account_nm = a.biz_tp_account_nm.slice(4)
          } else {
            a.biz_opp_nm = a.biz_opp_nm.slice(4)
          }
        })

        let grouped = [];
        if (aResult[4]) {
          aResult.forEach((oResult) => {
            if (!grouped[oResult.biz_tp_account_nm]) {
              grouped[oResult.biz_tp_account_nm] = [];
            }
            grouped[oResult.biz_tp_account_nm].push(oResult);
          })
        }
        // 그룹 건수에 따라 상위 2개 
        let aGroupedArray = Object.values(grouped)
        aGroupedArray.sort((a, b) => b.length - a.length)

        // 모델용 객체 생성
        let oModel = {
          iCount: aResult[4]?.rodr_cnt || iCount,
          iAmount: this._formatTotal(iAmount.toFixed()) || 0,
          first: aResult[0] || null,
          second: aResult[1] || null,
          third: aResult[2] || null,
          forth: aResult[3] || null
        }
        if (aGroupedArray[0]) {
          oModel["account1thName"] = aGroupedArray[0][0].biz_tp_account_nm
          oModel["account1thCount"] = aGroupedArray[0].length
        }

        if (aGroupedArray[1]) {
          oModel["account2ndName"] = aGroupedArray[1][0].biz_tp_account_nm
          oModel["account2ndCount"] = aGroupedArray[1].length
        }

        this.dataLoad();
        this._oEventBus.publish("aiReport", "newMonthData", oModel)
        this.getOwnerComponent().setModel(new JSONModel(oModel), "Model");

        let subTitle = `(총 ${iAmount.toFixed(2)}억원 / ${iCount}건)`
        if (this.getOwnerComponent().oCard.getAggregation("_header")) {
          this.getOwnerComponent().oCard.getAggregation("_header").setProperty("subtitle", subTitle)
        }
        this.getView().setModel(new JSONModel({ header: subTitle }), "uiModel");
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
          let oFormatter = NumberFormat.getFloatInstance({
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
