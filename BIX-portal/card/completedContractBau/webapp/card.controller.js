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
    return BaseController.extend("bix.card.completedContractBau.card", {
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

        const nextMonday = this._addWeekToDateString(monday);
        const nextSunday = this._addWeekToDateString(sunday);
        const nextStartDay = this._addWeekToDateString(oData.start_date);
        const nextEndDay = this._addWeekToDateString(oData.end_date);

        // 데이터 호출 병렬 실행
        const oModel = new ODataModel({
          serviceUrl: "../odata/v4/ai-api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });

        let sPath = oData ? `/ai_agent_bau_view5(start_date='${nextStartDay}',end_date=${nextEndDay})/Set` :
          `/ai_agent_bau_view5(start_date='${nextMonday}',end_date=${nextSunday})/Set`
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

      // 차주 입찰 예정 사업 테이블 "차주" 계산을 위한 1주 추가 함수
      _addWeekToDateString: function (sDate) {
        const date = new Date(sDate);
        date.setDate(date.getDate() + 7);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      },

      _modelSetting: function (aResult) {
        // 총 건수
        let iCount = 0;
        aResult.forEach((oResult) => iCount += oResult.record_count);

        // 총 금액
        let iAmount = 0;
        aResult.forEach((oResult) => iAmount += Number(oResult.total_target_amt) / 100000000)

        // 수주금액순 정렬
        if (aResult.length >= 1) {
          aResult.sort((a, b) => b.total_target_amt - a.total_target_amt)
          // 억 정리
          aResult.forEach((oResult) => oResult.total_target_amt = (oResult.total_target_amt / 100000000).toFixed(1))
        }
        // 기타를 최하단으로 정렬
        if (aResult) {
          aResult.sort((a, b) => {
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
        // 모델용 객체 생성
        let oModel = {
          iCount: iCount || 0,
          iAmount: this._formatTotal(iAmount.toFixed()) || 0,
          first: aResult[0],
          second: aResult[1],
          third: aResult[2],
          forth: aResult[3]
        }

        if (aResult[4]) {
          oModel["etcName"] = aResult[4].biz_tp_account_nm
          oModel["etcCount"] = aResult[4].record_count
          oModel["etcAmount"] = aResult[4].total_target_amt;
        }

        this._oEventBus.publish("aiReport", "comBauData", oModel)
        this.getOwnerComponent().setModel(new JSONModel(oModel), "Model");

        this.dataLoad();

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
