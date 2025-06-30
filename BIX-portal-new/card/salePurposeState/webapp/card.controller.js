sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/NumberFormat",


  ],
  function (BaseController,  EventBus, ODataModel, JSONModel, NumberFormat) {
    "use strict";
    return BaseController.extend("bix.card.salePurposeState.card", {
      _aCanvasId: [],
      _aContainerId: [],
      _oEventBus: EventBus.getInstance(),
      _oMyChart : [],


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
        let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 90);
        let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 50);        

        let Gray = getComputedStyle(document.documentElement).getPropertyValue('--custom_black8');
        let Blue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart1');
        let LightBlue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart21');


        for (let i = 0; i < this._aCanvasId.length; i++) {
            let oHTML = this.byId("html" + i);
            oHTML.setContent(`<div id='${this._aContainerId[i]}' style='width:${iBoxWidth+20}vh; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._aCanvasId[i]}' /></div>`);
            oHTML.attachEventOnce("afterRendering", async function () {                                       
                // 차트 구성
                const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId[i])).getContext("2d");
                //데이터 요청
                let oData = await this._dataSetting();
                
                this._oMyChart[i] = new Chart(ctx, {
                    type: "doughnut",
                    data: {
                        labels: ["연간 목표","현재 실적"],
                        datasets: [
                            {
                                data: [oData.Difference, oData.Sale],
                                backgroundColor: [Gray, Blue],                                
                            }
                        ]
                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false,       
                        plugins:{
                          tooltip:{
                            enabled:false
                          },
                          legend: {
                              display: false,
                              position: 'right',
                              labels:{
                                usePointStyle: true,
                                pointStyle: "circle"
                              } ,                                 
                            },
                          title:{
                            display: false,
                            font:{
                              size: 25,
                              weight: 'bold'
                              },
                            position: "top"
                            },
                            datalabels:{
                              color: 'white',
                              display: function(context){
                                return context.chart.data.labels[context.dataIndex] === '현재 실적';
                              },
                            anchor: 'end',
                            align: 'center',
                            font:{
                              weight: 'bold',
                              size: 24
                            },
                            backgroundColor : LightBlue,
                            borderColor: LightBlue,
                            borderWidth: 1,
                            borderRadius: 15,
                            padding : 1,
                            shadowColor: LightBlue,
                            shadowBlur:8,
                            shadowOffsetX: 2,
                            shadowOffsetY: 2,  
                            offset: -3,
                            formatter: function(value){
                              if(value){
                                if (value > 100) {
                                  var oNumberFormat = NumberFormat.getIntegerInstance({
                                      groupingEnabled: true,
                                      groupingSeparator: ',',
                                      groupingSize: 3,
                                      decimals: 0
                                      });
                                    return oNumberFormat.format(value)+"억";                                                
                                    }
                                  }
                              },                              
                          }
                        },
                    },
                    plugins: [ChartDataLabels],                       

                })
            }.bind(this));
            
``            }
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
        let subTitle= `(${dYearMonth.getMonth()+1}월 기준)`
        this.getOwnerComponent().oCard.getAggregation("_header").setProperty("subtitle", subTitle)


        const oModel = new ODataModel({
          serviceUrl: "../odata/v4/pl_api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });

        let aResult = await oModel.bindContext(`/get_actual_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`).requestObject();       

        let oResult = aResult.value.find((result)=> result.type === "매출")
        console.log(oResult)
        let PurposeContarst, SaleContarst;

        if(oResult.target_last_y_value === 0){
          PurposeContarst = null
        } else (
          PurposeContarst =  (oResult.target_curr_y_value - oResult.target_last_y_value) / oResult.target_last_y_value * 100
        )

        if(oResult.actual_last_y_value === 0){
          SaleContarst = null
        } else (
          SaleContarst = (oResult.actual_curr_ym_value - oResult.actual_last_ym_value) / oResult.actual_last_ym_value * 100
        )

        let oChangeData = {
          "Purpose" : oResult.target_curr_y_value, //연간 목표
          "Sale" : oResult.actual_curr_ym_value / 100000000, //현재 실적
          "Difference" : oResult.target_curr_y_value - (oResult.actual_curr_ym_value / 100000000),
          "Percentage" : (oResult.actual_curr_ym_value / 100000000) /  oResult.target_curr_y_value,
          "PurposeContrast" : PurposeContarst, // 전년 대비 목표
          "SaleContarst" : SaleContarst // 전년 대비 실적
        }

        console.log(oChangeData)
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
          return oNumberFormat.format(iValue*100) + "%";
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
        } else {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
            decimals: 0
          });
          return oNumberFormat.format(iValue) + "억";
        }

      },


    }
    )
  }
)
