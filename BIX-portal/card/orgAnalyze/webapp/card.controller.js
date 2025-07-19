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
            this._oEventBus.subscribe("home", "search", this._updateChart, this);

        },

        _updateChart: async function (sChannelId, sEventId, oData) {
            this.byId("cardContent").setBusy(true)
            let aResults = await this._dataSetting();            

            this._oMyChart[0].data.labels = aResults.label
            this._oMyChart[0].data.datasets[0].data = aResults.sale
            this._oMyChart[0].data.datasets[1].data = aResults.margin
            this._oMyChart[0].data.datasets[2].data = aResults.marginRate
            this._oMyChart[0].update()

            this.byId("cardContent").setBusy(false)
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
            this._iMinHeight = 400;
        },

        _setChart: async function () {
            this.getView().setBusy(true)
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 95);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 90);

            let Orange = "#FF7135"
            let Blue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart1');
            let Green = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart22');



            for (let i = 0; i < this._aCanvasId.length; i++) {
                let oHTML = this.byId("html" + i);
                oHTML.setContent(`<div id='${this._aContainerId[i]}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._aCanvasId[i]}' /></div>`);
                oHTML.attachEvent("afterRendering", async function () {                                       
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
                                    label: "매출",
                                    data: aData.sale,
                                    borderRadius: 3,
                                    backgroundColor: Blue,
                                    yAxisID: "y",
                                    order:1,
                                    datalabels:{
                                        color: Blue
                                    },

                                },
                                {
                                    label: "마진",
                                    data: aData.margin,
                                    borderRadius: 3,
                                    backgroundColor: Green,
                                    yAxisID : "y",
                                    order:2,
                                    datalabels:{
                                        color: Green                                                              
                                    },
                                },
                                {
                                    label: "마진율(%)",
                                    data: aData.marginRate,
                                    backgroundColor : Orange,
                                    borderColor: Orange,
                                    type: "line",
                                    yAxisID: 'y1',
                                    pointBackgroundColor : Orange,
                                    pointBorderColor : "White",
                                    pointBorderWidth: 3,
                                    pointRadius: 6,
                                    datalabels:{
                                        color: "white",
                                        offset: 10,
                                        size:12,
                                        backgroundColor : Orange,
                                        borderColor: Orange,
                                        borderWidth: 2,
                                        borderRadius: 15,
                                        padding : 5,                                                              
                                    },
                                    order:0
                                },
                                

                            ]
                        },

                        options: {
                            layout:{
                                padding: {
                                    top: 40,
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                }
                            },
                            responsive: true,
                            maintainAspectRatio: false,       
                            plugins:{                                
                                legend: {
                                    display: true,
                                    position: 'bottom',
                                    labels:{
                                        usePointStyle: true,
                                        pointStyle: "circle",
                                        sort: (a, b) => {
                                            let aList = ["매출", "마진", "마진율(%)"]                                            
                                            return aList.indexOf(a.text) - aList.indexOf(b.text)
                                        }
                                      } ,

                                },
                                tooltip:{
                                    callbacks:{
                                        label :
                                        function(context){
                                            let type = context.dataset.label
                                            let label = context.label || '';
                                            let value = context.parsed.y;
                                            if(type){
                                                if (type === "매출" || type === "마진") {
                                                    var oNumberFormat = NumberFormat.getFloatInstance({
                                                        groupingEnabled: true,
                                                        groupingSeparator: ',',
                                                        groupingSize: 3,
                                                        decimals: 0
                                                    });
                                                    return `${label} : ${oNumberFormat.format(value / 100000000)}억`;
                                                } else if (type === "마진율(%)"){
                                                    var oNumberFormat = NumberFormat.getFloatInstance({
                                                        groupingEnabled: true,
                                                        groupingSeparator: ',',
                                                        groupingSize: 3,
                                                        decimals: 2
                                                    });
                                                    return `${label} : ${oNumberFormat.format(value)}%`;
                                                    
                                                }
                                            }
                                        }
                                    }

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
                                    clip:false,
                                    display:
                                    function(context){
                                        if(context.dataset.label === '매출' || context.dataset.label === '마진'){
                                            if(context.dataset.data[context.dataIndex] < 100000000){
                                                return false
                                            } else {
                                                return true
                                            }
                                        } else {return true}
                                    },
                                    color: '#333333',
                                    anchor: 'end',
                                    align: 'top',
                                    font:{
                                        weight: 'bold',
                                        size: 12
                                    },
                                    offset: -3,
                                    formatter: function(value){
                                            if (value > 100) {
                                                var oNumberFormat = NumberFormat.getFloatInstance({
                                                    groupingEnabled: true,
                                                    groupingSeparator: ',',
                                                    groupingSize: 3,
                                                    decimals: 0
                                                });
                                                return oNumberFormat.format(value / 100000000);                                                
                                            }  else if (value <= 100){                                                
                                                var oNumberFormat = NumberFormat.getFloatInstance({
                                                    groupingEnabled: true,
                                                    groupingSeparator: ',',
                                                    groupingSize: 3,
                                                    decimals: 1
                                                });
                                                return oNumberFormat.format(value)+"%";
                                                
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
                //this._ovserveResize(this.byId(this._aContainerId[i]), i)

                }.bind(this));
            }
        this.getView().setBusy(false)
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
                        aLabel.push(result.org_name)
                    } else if(result.type==="마진"){
                        aMargin.push(result.actual_curr_ym_value)
                    } else if(result.type === "마진율"){
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

              let sPath = `/get_actual_sale_org_pl_total(year='${iYear}',month='${sMonth}')`
            
            let aData ;

             //subtitle 설정
             let subTitle= `(${dYearMonth.getMonth()+1}월 누계)`
             this.getOwnerComponent().oCard.getAggregation("_header").setProperty("subtitle", subTitle)
             this.getOwnerComponent().oCard.getAggregation("_header").setProperty("title", "[부문별] 매출 / 마진 / 마진율")
             
           await Promise.all([
                oModel.bindContext(sPath).requestObject(),                
            ]).then(function(aResults){
                
                aData = aResults[0].value                
            }.bind(this))
            .catch((oErr) => {
                Module.displayStatus(this.getOwnerComponent().oCard,oErr.error.code, this.byId("cardContent"));
            });
        return aData;
    },

    _ovserveResize: function(oElement, i){

        if(!this._resizeObserver){
            this._resizeObserver = new ResizeObserver(()=> {
                this._oMyChart[i].resize()
            })
               
        }
    }

        
    });
});           