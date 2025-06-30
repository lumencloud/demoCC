sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/NumberFormat",


  ],
  function (BaseController, EventBus, ODataModel, JSONModel, NumberFormat) {
    "use strict";
    return BaseController.extend("bix.card.saleRelsco.card", {
      _aCanvasId: [],
      _aContainerId: [],
      _oEventBus: EventBus.getInstance(),
      _oMyChart: [],


      onInit: function () {
        // component별 id 설정
        this._createId();
        this._setChart();
        this._oEventBus.subscribe("home", "search", this._dataSetting, this);
      },

      /**
         * Component별 유일한 ID 생성
         */
      _createId: function () {
        for (let i = 0; i < 1; i++) {
          this._aCanvasId.push(this.createId("canvas" + i))
          this._aContainerId.push(this.createId("container" + i))
        }
      },

      _setChart: async function () {
        // 카드
        const oCard = this.getOwnerComponent().oCard;

        // Card 높이를 컨테이너 높이와 동일하게 구성
        let sCardId = oCard.getId();
        let oParentElement = document.getElementById(sCardId).parentElement;
        let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 50);
        let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 50);


        for (let i = 0; i < this._aCanvasId.length; i++) {
          let oHTML = this.byId("html" + i);
          oHTML.setContent(`<div id='${this._aContainerId[i]}' class='custom-chart-container' style='width:100%; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._aCanvasId[i]}' /></div>`);
          oHTML.attachEventOnce("afterRendering", async function () {
            // 차트 구성
            const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId[i])).getContext("2d");
            //데이터 요청
            let oData = await this._dataSetting();

            let Blue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart1');
            let SkyBlue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart21');


            this._oMyChart[i] = new Chart(ctx, {
              type: "doughnut",
              data: {
                labels: ["대내 매출", "대외 매출"],
                datasets: [
                  {
                    data: [oData.newRate, oData.RelscoRate],
                    backgroundColor: [Blue, SkyBlue],
                  }
                ]
              },

              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'right',
                    tooltip: {
                      enabled: false
                    },
                    labels: {
                      font: {
                        size: 10,
                        weight: 'bold'
                      },
                      usePointStyle: true,
                      pointStyle: "circle",
                      padding: 18
                    },
                  },
                  datalabels: {
                    color: 'white',
                    anchor: 'center',
                    align: 'center',
                    font: {
                      weight: 'bold',
                      size: 10
                    },
                    formatter: function (value) {
                      if (value) {
                        var oNumberFormat = NumberFormat.getFloatInstance({
                          groupingEnabled: true,
                          groupingSeparator: ',',
                          groupingSize: 3,
                          decimals: 0
                        });
                        return oNumberFormat.format(value * 100) + "%";


                      }
                    }
                  }


                },
              },
              plugins: [ChartDataLabels],
            })
          }.bind(this));

          ``
        }
      },

      _dataSetting: async function () {

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


        const oModel = new ODataModel({
          serviceUrl: "../odata/v4/pl_api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });

        let aResult = await oModel.bindContext(`/get_actual_sale_relsco_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`).requestObject();

        let oResult = aResult.value.find((result) => result.org_nm === "합계" && result.type === "매출")

        let oChangeData = {
          "new": oResult.actual_curr_ym_value,
          "Relsco": oResult.actual_last_ym_value,
          "newRate": oResult.actual_curr_ym_value / (oResult.actual_curr_ym_value + oResult.actual_last_ym_value),
          "RelscoRate": oResult.actual_last_ym_value / (oResult.actual_curr_ym_value + oResult.actual_last_ym_value)
        }
        this.getView().setModel(new JSONModel(oChangeData), "model");

        return oChangeData
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
            decimals: 0,
          });
          return oNumberFormat.format(iValue * 100) + "%";
        } else if (sType === "tooltip") {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
          });
          return oNumberFormat.format(iValue);
        } else if (sType === "billion") {

          {
            var oNumberFormat = NumberFormat.getFloatInstance({
              groupingEnabled: true,
              groupingSeparator: ',',
              groupingSize: 3,
              decimals: 0
            });
            return oNumberFormat.format(iValue / 100000000) + "억";
          }
        } else if (sType === "건수") {
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
