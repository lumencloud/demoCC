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
    return BaseController.extend("bix.card.monthlyNegotiationStage.card", {
      _oEventBus: EventBus.getInstance(),

      onInit: function () {
        this._dataSetting();
        this._oEventBus.subscribe("aireport", "infoSet", this._dataSetting, this)
      },

      _dataSetting: async function () {
        this.byId("cardContent").setBusy(true);
        let oData = JSON.parse(sessionStorage.getItem("aiReport"));
        let iYear = oData.year;
        let sMonth = oData.month
        let sOrgId = oData.orgId;
        // 데이터 호출 병렬 실행
        const oModel = new ODataModel({
          serviceUrl: "../odata/v4/pl_api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });

        // 전사 api
        let sAllPath = `/get_ai_forecast_deal_type_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',deal_stage_cd='nego')`
        // Account api
        let sAccountPath = `/get_ai_forecast_deal_type_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',deal_stage_cd='nego',org_tp='${oData.type}')`

        let sPath = oData.type ? sAccountPath : sAllPath

        await oModel.bindContext(sPath).requestObject().then(
          function (aResult) {
            Module.displayStatusForEmpty(this.getOwnerComponent().oCard,aResult.value, this.byId("cardContent"));
            this._modelSetting(aResult.value);

            this.dataLoad();
          }.bind(this))
          .catch((oErr) => {
            Module.displayStatus(this.getOwnerComponent().oCard,oErr.error.code, this.byId("cardContent"));
        });
        this.byId("cardContent").setBusy(false)
      },

      dataLoad: function () {
        const oEventBus = sap.ui.getCore().getEventBus();
        oEventBus.publish("CardChannel", "CardFullLoad", {
          cardId: this.getView().getId()
        })
      },

      _modelSetting: function (aResult) {

        // 총 금액
        let iAmount = 0;
        aResult.forEach((oResult) => iAmount += Number(oResult.rodr_amt))

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

        // 총 건수
        let iCount = aResult[4] ? Number(aResult[4].rodr_cnt + 4) : aResult.length;
       
        // Account 코드 삭제
        aResult.forEach(a => {
          if (a.biz_tp_account_nm !== '기타') {
            a.biz_tp_account_nm = a.biz_tp_account_nm.slice(4)
          } else {
            a.biz_opp_nm = a.biz_opp_nm.slice(4)
          }
        })

        // 모델용 객체 생성
        let oModel = {
          iCount: iCount || 0,
          iAmount: iAmount.toFixed(0) || 0,
          first: aResult[0],
          second: aResult[1],
          third: aResult[2],
          forth: aResult[3]
        }

        if (aResult[4]) {
          oModel["account1thName"] = aResult[4].biz_opp_nm
          oModel["etcCount"] = aResult[4].rodr_cnt
          oModel["etcAmount"] = aResult[4].rodr_amt.toFixed(1)
          oModel["etcName"] = aResult[4].biz_tp_account_nm
        }

        this._oEventBus.publish("aiReport", "negoMonthData", oModel)
        this.getOwnerComponent().setModel(new JSONModel(oModel), "Model");

        let subTitle = `(총 ${iAmount.toFixed(2)}억원 / ${iCount}건)`
        if (this.getOwnerComponent().oCard.getAggregation("_header")) {
          this.getOwnerComponent().oCard.getAggregation("_header").setProperty("subtitle", subTitle)
        }

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
