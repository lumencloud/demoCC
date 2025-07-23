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
    return BaseController.extend("bix.card.newRegistBau.card", {
      _oEventBus: EventBus.getInstance(),
      _bFlag: true,

      onInit: function () {
        this._dataSetting();
        this._oEventBus.subscribe("aiReport", "dateData", this._dataSetting, this)
      },

      _dataSetting: async function (oEvent, sEventId) {
        this.byId("cardContent").setBusy(true);
        let { monday, sunday } = this._setDate();

        let oData = JSON.parse(sessionStorage.getItem("aiWeekReport"));

        const oModel = new ODataModel({
          serviceUrl: "../odata/v4/ai-api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });

        let sPath = oData ? `/ai_agent_bau_view2(start_date='${oData.start_date}',end_date=${oData.end_date})/Set` :
          `/ai_agent_bau_view2(start_date='${monday}',end_date=${sunday})/Set`

        await oModel.bindContext(sPath).requestObject().then(
          function (aResult) {
            Module.displayStatusForEmpty(this.getOwnerComponent().oCard, aResult.value, this.byId("cardContent"));
            this._modelSetting(aResult.value);

          }.bind(this))
          .catch((oErr) => {
            Module.displayStatus(this.getOwnerComponent().oCard, oErr.error.code, this.byId("cardContent"));
          });
        this.byId("cardContent").setBusy(false);
      },

      _modelSetting: function (aResult) {
        // 총 건수
        let iCount = aResult.length;

        // 총 금액
        let iAmount = 0;
        aResult.forEach((oResult) => iAmount += Number(oResult.total_target_amt))

        // 수주금액순 정렬
        aResult.sort((a, b) => b.total_target_amt - a.total_target_amt)

        // Account 코드 삭제
        aResult.forEach(a => {
          if (a.biz_tp_account_nm) {
            a.biz_tp_account_nm = a.biz_tp_account_nm.slice(4)
          } else {
            a.biz_tp_account_nm = ''
          }
        })

        // 그룹별로 분류
        let grouped = [];

        aResult.forEach((oResult) => {
          if (!grouped[oResult.biz_tp_account_nm]) {
            grouped[oResult.biz_tp_account_nm] = [];
          }
          grouped[oResult.biz_tp_account_nm].push(oResult);
        })

        // 그룹 건수에 따라 상위 2개 
        let aGroupedArray = Object.values(grouped)
        aGroupedArray.sort((a, b) => b.length - a.length)


        // 모델용 객체 생성
        let oModel = {
          iCount: iCount || 0,
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

        this._oEventBus.publish("aiReport", "newBauData", oModel)
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
      },
      dataLoad: function () {
        this._oEventBus.publish("CardWeekChannel", "CardWeekFullLoad", {
          cardId: this.getView().getId()
        })
        this._bFlag = false;
      },

    })
  }
)
