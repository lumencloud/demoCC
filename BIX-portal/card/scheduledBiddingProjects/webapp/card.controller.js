sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "../../main/util/Module",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat"
  ],
  function (BaseController, EventBus, Module, JSONModel, ODataModel, NumberFormat) {
    "use strict";
    return BaseController.extend("bix.card.scheduledBiddingProjects.card", {
      _oEventBus: EventBus.getInstance(),
      _bFlag: true,// 페이지 체인지 데이터 재요청으로 인해 카드 로딩되는 카운트가 늘어 분기처리

      onInit: function () {
        this._dataSetting();
        this._oEventBus.subscribe("aiReport", "dateDataTable", this._dataSetting, this)
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

        let sPath = oData ? `/ai_agent_view6(start_date='${oData.start_date}',end_date=${oData.end_date})/Set` :
          `/ai_agent_view6(start_date='${monday}',end_date=${sunday})/Set`

        await oModel.bindContext(sPath).requestObject().then(
          function (aResult) {
            Module.displayStatusForEmpty(this.byId("table"), aResult.value, this.byId("cardContent"));
            this._modelSetting(aResult.value);
           
          }.bind(this))
          .catch((oErr) => {
            Module.displayStatus(this.getOwnerComponent().oCard, oErr.error.code, this.byId("cardContent"));
          });
        this.byId("cardContent").setBusy(false);
      },

      _modelSetting: function (aResult) {
        // 총 건수
        let iCount = 0;
        aResult.forEach((oResult) => iCount += oResult.record_count);
        // 총 금액
        let iAmount = 0;

        let oModel = aResult;

        // 기타를 최하단으로 정렬
        if (oModel) {
          oModel.sort((a, b) => {
            if (a.biz_opp_nm === '기타' && b.biz_opp_nm !== '기타') {
              return 1;
            }
            if (a.biz_opp_nm !== '기타' && b.biz_opp_nm === '기타') {
              return -1;
            }
            return 0;
          })
        }
        // Account 코드 삭제
        aResult.forEach(a => {
          if (a.biz_tp_account_nm) {
            a.biz_tp_account_nm = a.biz_tp_account_nm.slice(4)
          } else {
            a.biz_tp_account_nm = ''
          }
        })

        if (oModel[4]) {
          oModel["etcName"] = oModel[4].biz_tp_account_nm
          oModel["etcCount"] = iCount - 4;
          oModel["etcAmount"] = oModel[4].total_target_amt;
          oModel.splice(4, 1)
        }
        this.getView().setModel(new JSONModel(oModel), "model");
        let oTable = this.byId("table")

        Module.setTableMerge(oTable, "model", 3);

        if (this._bFlag) {
          this.dataLoad();
        }

        oTable.setVisibleRowCountMode("Fixed")
        oTable.setVisibleRowCount(oModel.length)
        oTable.setNoData("상반기 입찰 예정 건이 없습니다.")

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
