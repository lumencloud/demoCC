sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus ) {
    "use strict";

    return Controller.extend("bix.card.orgAnalyze.card", {
        _aCanvasId: [],
        _aContainerId: [],
        _oEventBus: EventBus.getInstance(),
        _oMyChart : [],


        onInit: function () {
            // component별 id 설정
            this._createId();

            // 차트 설정
            this._setChart();

            // 이벤트 버스 설정
            this._oEventBus.subscribe("pl", "search", this._updateChart, this);

        },

        _updateChart: async function (sChannelId, sEventId, oData) {
            let aResults = await this._dataSetting();
            console.log(this._oMyChart)
            console.log(aResults)

                for(let i = 0; i<this._oMyChart.length; i++){
                    this._oMyChart[i].data.labels = aResults[i].aLabel
                    this._oMyChart[i].data.datasets[0].data = aResults[i].aChance
                    this._oMyChart[i].data.datasets[1].data = aResults[i].aTake
                    this._oMyChart[i].data.datasets[2].data = aResults[i].aSale                                        
                    this._oMyChart[i].update();
                }
          },

        


        /**
         * Component별 유일한 ID 생성
         */
        _createId: function () {
            for (let i = 0; i < 1; i++) {
                this._aCanvasId.push(this.createId("canvas" + i))
                this._aContainerId.push(this.createId("container" + i))
            }
            this._iMinHeight = 400;
        },

        _setChart: async function () {
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 100);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 90);

            let Orange = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart3');
            let Blue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart1');
            let Green = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart22');



            for (let i = 0; i < this._aCanvasId.length; i++) {
                let oHTML = this.byId("html" + i);
                oHTML.setContent(`<div id='${this._aContainerId[i]}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._aCanvasId[i]}' /></div>`);
                oHTML.attachEventOnce("afterRendering", async function () {                                       
                    // 차트 구성
                    const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId[i])).getContext("2d");
                    //데이터 요청
                    let aData = await this._dataSetting();
                    
                    this._oMyChart[i] = new Chart(ctx, {
                        type: "bar",
                        data: {
                            labels: aData.label,
                            datasets: [
                                {
                                    label: "마진률",
                                    data: aData.marginRate,
                                    backgroundColor : Orange,
                                    borderColor: Orange,
                                    type: "line",
                                    yAxisID: 'y1',
                                    datalabels:{
                                        size:10,
                                        backgroundColor : Orange,
                                        borderColor: Orange,
                                        borderWidth: 2,
                                        borderRadius: 15,
                                        padding : 1,
                                        shadowColor: Orange,
                                        shadowBlur:8,
                                        shadowOffsetX: 2,
                                        shadowOffsetY: 2,                                        
                                    },

                                },
                                {
                                    label: "마진",
                                    data: aData.margin,
                                    borderRadius: 3,
                                    backgroundColor: Green,
                                    yAxisID : "y",
                                },
                                {
                                    label: "매출액",
                                    data: aData.sale,
                                    borderRadius: 3,
                                    backgroundColor: Blue,
                                    yAxisID: "y"


                                },
                                

                            ]
                        },

                        options: {
                            responsive: true,
                            maintainAspectRatio: false,       
                            plugins:{                                
                                legend: {
                                    display: true,
                                    position: 'bottom',
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
                                    anchor: 'end',
                                    align: 'start',
                                    font:{
                                        weight: 'bold',
                                        size: 5
                                    },
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
                                                return oNumberFormat.format(value / 100000000);                                                
                                            } else if (value < 100){
                                                var oNumberFormat = NumberFormat.getIntegerInstance({
                                                    groupingEnabled: true,
                                                    groupingSeparator: ',',
                                                    groupingSize: 3,
                                                    decimals: 2
                                                });
                                                return oNumberFormat.format(value);
                                                
                                            }
                                        }
                                    }
                                }                            
                            },                     
                            scales: {
                                x: {
                                    stacked: false,
                                    border:{
                                    },
                                    grid: {
                                        display: false
                                    },
                                    ticks: {
                                        font: {
                                            size: 13,
                                            weight: 500
                                        },

                                    }
                                },
                                y: {
                                    type:"linear",
                                    display: true,
                                    position: 'left',
                                    ticks: {
                                        callback: function (value) {
                                            if (value % 100000000 === 0) {
                                                return (value / 100000000).toLocaleString() + '억';
                                            };
                                        }
                                    },
                                    beginAtZero:true,
                                    min:0,
                                    title:{
                                        display:true,
                                        text: '금액(억원)',
                                        padding: {
                                            top : 0,
                                            bottom: 0,                                            
                                        }
                                        
                                      
                                    },
                                       

                                },
                                y1: {
                                    type:"linear",
                                    display: true,
                                    grid: {
                                        display: false
                                    },
                                    position: 'right',
                                    ticks: {
                                        callback: function (value) {                                            
                                                return value + '%';
                                        }
                                    },
                                    title:{
                                        display:true,
                                        text: '마진율(%)',
                                    }
                                    

                                }


                            }
                        },
                        plugins: [ChartDataLabels], 
                    })
                }.bind(this));
                
``            }
        },

        _dataSetting: async function () {
            let aResults = await this._setData();
            let aData;
            let aSale = [];
            let aMargin = [];
            let aMarginRate = [];
            let aLabel = [];

            aResults.forEach(
                function(result){
                    if(result.type==="매출"){
                        aSale.push(result.actual_curr_ym_value)
                        aLabel.push(result.org_nm)
                    } else if(result.type==="마진"){
                        aMargin.push(result.actual_curr_ym_value)
                    } else if(result.type === "마진률"){
                        aMarginRate.push(result.actual_curr_ym_value*100)
                    }
                }
            )

            aData = {
                "label" : aLabel,
                "sale" : aSale,
                "margin" : aMargin,
                "marginRate" : aMarginRate
            }  

            return aData;
        },

             

       
       

        _setData: async function(){
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

              let sPath = `/get_actual_sale_org_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            
            let aData ;

             //subtitle 설정
             let subTitle= `(${dYearMonth.getMonth()+1}월 누계)`
             this.getOwnerComponent().oCard.getAggregation("_header").setProperty("subtitle", subTitle)
     
           await Promise.all([
                oModel.bindContext(sPath).requestObject(),                
            ]).then(function(aResults){
                console.log(aResults)
                aData = aResults[0].value                
            }.bind(this)
        )
        return aData;
    },

        
    });
});           