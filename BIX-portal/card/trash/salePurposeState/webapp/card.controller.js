sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/NumberFormat",
    "../../main/util/Module",

  ],
  function (BaseController,  EventBus, ODataModel, JSONModel, NumberFormat, Module) {
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
      this.byId("cardContent").setBusy(true);

      let oData = await this._dataSetting();
      let oChart = this._oMyChart[0]
      
      oChart.data.datasets[0].data = [oData.Difference, oData.Sale];
      let add;
      if(oData.Sale >= 0){add =  "#1768FA"} else { add = "#FA4646"};
      oChart.data.datasets[0].backgroundColor[1] = add

      oChart.update();

      this.byId("cardContent").setBusy(false);
    },

      _setChart: async function () {
        this.byId("cardContent").setBusy(true);
        // 카드
        const oCard = this.getOwnerComponent().oCard;

        // Card 높이를 컨테이너 높이와 동일하게 구성
        let sCardId = oCard.getId();
        let oParentElement = document.getElementById(sCardId).parentElement;
        let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 80);
        let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 50);        
        this.byId("donughtTextBox").setHeight(`${iBoxHeight}vh`)



        let Gray = getComputedStyle(document.documentElement).getPropertyValue('--custom_black8');
        let Blue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart1');
        let LightBlue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart21');
        let oData = await this._dataSetting();

        let add = (oData.Difference < 0) ?  "#FA4646" : "#1768FA";


        for (let i = 0; i < this._aCanvasId.length; i++) {
            let oHTML = this.byId("html" + i);
            oHTML.setContent(`<div id='${this._aContainerId[i]}' style='width:${iBoxWidth+20}vh; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._aCanvasId[i]}' /></div>`);
            oHTML.attachEventOnce("afterRendering", async function () {                                       
                // 차트 구성
                const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId[i])).getContext("2d");
                //데이터 요청
                
                this._oMyChart[i] = new Chart(ctx, {
                    type: "doughnut",
                    data: {
                        labels: ["연간 목표","현재 실적"],
                        datasets: [
                            {
                                data: [oData.Difference, oData.Sale],
                                backgroundColor: [
                                  Gray, add  
                                ],                                
                            }
                        ]
                    },

                    options: {
                        layout:{
                          padding: {
                              top: 10,
                              bottom: 0,
                              left: 0,
                              right: 0,
                            }
                          },
                        cutout: 80,
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
                              color: function(context){        
                                if(context.chart.data.datasets[0].data[1] >= 0){
                                  return '#1768FA'
                                } else {
                                  return '#FA4646'
                                }
                              },
                              display: function(context){
                                return context.chart.data.labels[context.dataIndex] === '현재 실적';
                              },
                            anchor: 'end',
                            align: 'center',
                            font: {
                              weight: 'bold',
                              size: 14,
                              
                            },
                            backgroundColor : "#ffffff",
                            borderColor: "#d1d3d3",
                            borderWidth: 0.5,
                            borderRadius: 23.16,
                            padding : 7,
                            formatter: function(value){
                              if(value){
                                  var oNumberFormat = NumberFormat.getFloatInstance({
                                      groupingEnabled: true,
                                      groupingSeparator: ',',
                                      groupingSize: 3,
                                      decimals: 0
                                      });
                                    return oNumberFormat.format(value)+"억";                                                
                                    }
                              },                              
                          }
                        },
                    },
                    plugins: [ChartDataLabels],                       

                })
                //this._ovserveResize(this.byId(this._aContainerId[i]), i)

            }.bind(this));
       }
       this.byId("cardContent").setBusy(false);

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

        //subtitle 설정
        let subTitle= `(${dYearMonth.getMonth()+1}월 기준)`
        this.getOwnerComponent().oCard.getAggregation("_header").setProperty("subtitle", subTitle)


        const oModel = new ODataModel({
          serviceUrl: "../odata/v4/pl_api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });

        let aResult = await oModel.bindContext(`/get_actual_pl_total(year='${iYear}',month='${sMonth}')`).requestObject().catch((oErr) => {
          Module.displayStatus(this.getOwnerComponent().oCard,oErr.error.code, this.byId("cardContent"));
      });

        let oResult = aResult.value.find((result)=> result.type === "영업이익")
        
        let PurposeContarst, SaleContarst;
        let type
        if(oResult.target_last_y_value === 0 || oResult.target_last_y_value === null ){
          PurposeContarst = null
        } else {
          PurposeContarst =  (oResult.target_curr_y_value - oResult.target_last_y_value) / oResult.target_last_y_value * 100
          if(PurposeContarst){
            type="up"
          } else {
            type="down"
          }
        }
        let type2;
        if(oResult.actual_last_ym_value === 0 || oResult.actual_last_ym_value === null){
          SaleContarst = null
        } else {
          SaleContarst = (oResult.actual_curr_ym_value - oResult.actual_last_ym_value) / oResult.actual_last_ym_value * 100
            if(SaleContarst > 0){
              type2 = "up"
            } else {
              type2 = "down"
            }
         }

         let percentage;
         if(oResult.target_curr_y_value === 0){
          percentage = 0
          this.byId("donughtTextBox").addStyleClass("custom-donught-title2")
        } else {
          percentage = (oResult.actual_curr_ym_value / 100000000) /  oResult.target_curr_y_value*100
          this.byId("donughtTextBox").addStyleClass("custom-donught-title")

        }
      
        let oChangeData = {
          "Purpose" : oResult.target_curr_y_value, //연간 목표
          "Sale" : oResult.actual_curr_ym_value / 100000000, //현재 실적
          "Difference" : oResult.target_curr_y_value - (oResult.actual_curr_ym_value / 100000000),
          "Percentage" :percentage,
          "PurposeContrast" : PurposeContarst, // 전년 대비 목표
          "SaleContarst" : SaleContarst, // 전년 대비 실적
          "type" : type,
          "type2" : type2
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
            decimals: 1,
          });
          return oNumberFormat.format(iValue) + "%";
        }  else if (sType === "percent_contrast") {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
            decimals: 1,
          });
          if(iValue>0){
            return `${oNumberFormat.format(iValue)}% 증가`;
          } else if(iValue<0){
            return `${oNumberFormat.format(iValue)}% 감소`;
          }          
        }else if (sType === "tooltip_percent") {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
            decimals: 4,
          });
          return oNumberFormat.format(iValue) + "%";
        }else if (sType === "tooltip") {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
          });
          return oNumberFormat.format(iValue);
          
        } else if (sType === "tooltip_billion") {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
            decimals: 0
          });
          return oNumberFormat.format(iValue* 100000000);
        }
        else if (sType === "billion") {

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
