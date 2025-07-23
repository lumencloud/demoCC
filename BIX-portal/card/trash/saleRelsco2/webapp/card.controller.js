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
    return BaseController.extend("bix.card.saleRelsco2.card", {
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
      
      oChart.data.datasets[0].data = [oData.Percentage, oData.Percentage2];

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
       
        // this.byId("donughtTextBox").setHeight(`${iBoxHeight}vh`)
        // this.byId("donughtTextBox").addStyleClass("custom-donught-title2")


        let Gray = getComputedStyle(document.documentElement).getPropertyValue('--custom_black8');
        let Blue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart1');
        let LightBlue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart21');
        let oData = await this._dataSetting();


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
                        labels: ["대내","대외"],
                        datasets: [
                            {
                                data: [oData.Percentage, oData.Percentage2],
                                backgroundColor: ["#2d99ff", "#80caee"],                                
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
                        cutout: 40,
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
                              color: "#2d99ff",
                              display: true,
                              
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
                                      decimals: 2
                                      });
                                    return oNumberFormat.format(value)+"%";                                                
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
        let subTitle = `(${dYearMonth.getMonth() + 1}월 누계)`
        this.getOwnerComponent().oCard.getAggregation("_header").setProperty("subtitle", subTitle)
        this.getOwnerComponent().oCard.getAggregation("_header").setProperty("title", "매출구성 | 대내 vs 대외")

        const oModel = new ODataModel({
          serviceUrl: "../odata/v4/pl_api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });

        let aResult = await oModel.bindContext(`/get_actual_sale_relsco_pl_total(year='${iYear}',month='${sMonth}')`).requestObject().catch((oErr) => {
          Module.displayStatus(this.getOwnerComponent().oCard,oErr.error.code, this.byId("cardContent"));
      });

      let oResult = aResult.value.find((result) => result.org_name === "합계" && result.type === "매출" && result.relsco_type === "대내")
      let oResult2 = aResult.value.find((result) => result.org_name === "합계" && result.type === "매출" && result.relsco_type === "대외")


        let InRelscoContrast, OutRelscoContrast;
        let type

        if(oResult.actual_last_ym_value === 0 || oResult.actual_last_ym_value === null ){
          InRelscoContrast = null
        } else {
          InRelscoContrast =  (oResult.actual_curr_ym_value - oResult.actual_last_ym_value) / oResult.actual_last_ym_value * 100
          if(InRelscoContrast){
            type="up"
          } else {
            type="down"
          }
        }
        let type2;
        if(oResult2.actual_last_ym_value === 0 || oResult2.actual_last_ym_value === null){
          OutRelscoContrast = null
        } else {
          OutRelscoContrast = (oResult2.actual_curr_ym_value - oResult2.actual_last_ym_value) / oResult2.actual_last_ym_value * 100
            if(OutRelscoContrast > 0){
              type2 = "up"
            } else {
              type2 = "down"
            }
         }

         
      
        let oChangeData = {
          "Percentage" : oResult.actual_curr_ym_value / (oResult.actual_curr_ym_value + oResult2.actual_curr_ym_value) * 100,
          "Percentage2" : oResult2.actual_curr_ym_value / (oResult.actual_curr_ym_value + oResult2.actual_curr_ym_value) * 100,
          "InRelsco" : oResult2.actual_curr_ym_value / 100000000, // 현재 대내
          "OutReslco" : oResult.actual_curr_ym_value / 100000000, // 현재 대외
          "PurposeContrast" : InRelscoContrast, // 전년 대비 목표 => 전년 대비 대내
          "OutRelsco" : OutRelscoContrast, // 전년 대비 실적 => 전년 대비 대외
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
        if (sType === "percent_little") {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
            decimals: 2,
          });
          return "(" + oNumberFormat.format(iValue) + "%)";
        }else if (sType === "percent_contrast") {
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
        }else if(sType === "rate") {
          var oNumberFormat = NumberFormat.getFloatInstance({
            groupingEnabled: true,
            groupingSeparator: ',',
            groupingSize: 3,
            decimals: 0,
          });
          return oNumberFormat.format(iValue);
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
