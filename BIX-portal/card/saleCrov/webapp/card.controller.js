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
    return BaseController.extend("bix.card.saleCrov.card", {
      _aCanvasId: [],
      _aContainerId: [],
      _oEventBus: EventBus.getInstance(),
      _oMyChart: [],


      onInit: function () {
        // component별 id 설정
        this._createId();
        this._setChart();
        this._oEventBus.subscribe("home", "search", this._updateChart, this);
      },

      /**
         * Component별 유일한 ID 생성
         */
      _createId: function () {
        this._aCanvasId = [];
            this._aContainerId = [];
        for (let i = 0; i < 1; i++) {
          this._aCanvasId.push(this.createId("canvas" + i))
          this._aContainerId.push(this.createId("container" + i))
        }
      },

      _updateChart : async function (){
        this.getView().setBusy(true);

        let oData = await this._dataSetting();
        let oChart = this._oMyChart[0]
        
        oChart.data.datasets[0].data = [oData.newRate, oData.crovRate];

        oChart.update();

        this.getView().setBusy(false);
      },

      _setChart: async function () {
        this.getView().setBusy(true);

        // 카드
        const oCard = this.getOwnerComponent().oCard;

        // Card 높이를 컨테이너 높이와 동일하게 구성
        let sCardId = oCard.getId();
        let oParentElement = document.getElementById(sCardId).parentElement;
        let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 50);
        let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 50);

        // 옆의 박스 크기 차트 높이와 같게
        this.byId("sideBox").setHeight(`${iBoxHeight-0.5}vh`)


        for (let i = 0; i < this._aCanvasId.length; i++) {
          let oHTML = this.byId("html" + i);
          oHTML.setContent(`<div id='${this._aContainerId[i]}' class='custom-chart-container' style='width:100%; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._aCanvasId[i]}' /></div>`);
          oHTML.attachEvent("afterRendering", async function () {
            // 차트 구성
            const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId[i])).getContext("2d");
            //데이터 요청
            let oData = await this._dataSetting();

            let Blue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart1');
            let SkyBlue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart21');


            this._oMyChart[i] = new Chart(ctx, {
              type: "doughnut",
              data: {
                labels: ["신규 매출", "이월 매출"],
                datasets: [
                  {
                    data: [oData.newRate, oData.crovRate],
                    backgroundColor: ['#2D99FF', '#90d4f5'],
                  }
                ]
              },

              options: {
                cutout: '40%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  tooltip: {
                    enabled: false
                  },
                  
                  legend: {
                    display: true,
                    position: 'right',
                   
                    labels: {
                      font: {
                        size: 14,
                        weight: '550'
                      },
                      usePointStyle: true,
                      pointStyle: "circle",
                      boxHeight: 8,
                      padding: 18,
                      
                    },
                  },
                  datalabels: {
                    clip:false,                    
                    color: "#1768FA",
                    anchor: 'end',
                    align: 'top',                    
                    font: {
                      weight: 'bold',
                      size: 14,
                      
                    },

                    backgroundColor : "#ffffff",
                    borderColor: "#d1d3d3",
                    borderWidth: 0.5,
                    borderRadius: 23.16,
                    padding : 7,
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

            this._ovserveResize(this.byId(this._aContainerId[i]), i)

          }.bind(this));
        }
        this.getView().setBusy(false);

      },

      _ovserveResize: function(oElement, i){

        if(!this._resizeObserver){
            this._resizeObserver = new ResizeObserver(()=> {
                this._oMyChart[i].resize()
            })
               
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

        const oModel = new ODataModel({
          serviceUrl: "../odata/v4/pl_api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });

        //subtitle 설정
        let subTitle = `(${dYearMonth.getMonth() + 1}월 누계)`
        this.getOwnerComponent().oCard.getAggregation("_header").setProperty("subtitle", subTitle)
        this.getOwnerComponent().oCard.getAggregation("_header").setProperty("title", "매출구성 | 신규 vs 이월")
        

        let aResult = await oModel.bindContext(`/get_actual_sale_crov_pl_total(year='${iYear}',month='${sMonth}')`).requestObject().catch((oErr) => {
          Module.displayStatus(this.getOwnerComponent().oCard,oErr.error.code, this.byId("cardContent"));
        });


        let oResult = aResult.value.find((result) => result.org_name === "합계" && result.type === "매출" && result.crov_type === "신규")
        let oResult2 = aResult.value.find((result) => result.org_name === "합계" && result.type === "매출" && result.crov_type === "이월")

        let oChangeData = {
          "new": oResult.actual_curr_ym_value,
          "crov": oResult2.actual_curr_ym_value,
          "newRate": oResult.actual_curr_ym_value / (oResult.actual_curr_ym_value + oResult2.actual_curr_ym_value),
          "crovRate": oResult2.actual_curr_ym_value / (oResult.actual_curr_ym_value + oResult2.actual_curr_ym_value)
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
        } else if (sType === "percent_tooltip") {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
            decimals: 4,
          });
          return oNumberFormat.format(iValue * 100) + "%";
        }else if (sType === "tooltip") {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
            decimals: 0
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
        } else {
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
