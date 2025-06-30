sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",

], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus ) {
    "use strict";

    return Controller.extend("bix.card.monthlyPlan.card", {
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
                    console.log(aData)
                    this._oMyChart[i] = new Chart(ctx, {
                        type: "bar",
                        data: {
                            labels: aData.label,
                            datasets: [
                                {
                                    label: "마진율(%)",
                                    data: aData.actual,
                                    backgroundColor: Orange,
                                    borderColor: Orange,
                                    datalabels:{
                                        display: false
                                    },
                                    type: "line",
                                    yAxisID: 'y1',
                                    

                                },
                                {
                                    label: "마진율 추이(%)",
                                    data: aData.plan,
                                    backgroundColor: Orange,
                                    borderColor: Orange,
                                    type: "line",
                                    borderWidth:2,
                                    borderDash: [5,5],
                                    fill:false,
                                    datalabels:{
                                        display: false
                                    },
                                    yAxisID: 'y1'

                                },
                                {
                                    label: "매출액",
                                    data: aData.sale,
                                    borderRadius: 3,
                                    backgroundColor: Blue,
                                    borderColor : Blue,
                                    yAxisID: "y",
                                    stack: 'stack2', //동일한 스택 이름으로 묶음


                                },
                                {
                                    label: "매출액 추정",
                                    data: aData.salePlan,
                                    borderRadius: 3,
                                    backgroundColor: "white",
                                    borderColor: Blue,
                                    borderWidth: 1,
                                    yAxisID: "y",
                                    datalabels:{
                                        display: true,
                                        color:Blue
                                    },
                                    stack: 'stack2', //동일한 스택 이름으로 묶음



                                },
                                {
                                    label: "마진",
                                    data: aData.margin,
                                    borderRadius: 3,
                                    backgroundColor: Green,
                                    yAxisID : "y",
                                    stack: 'stack1', //동일한 스택 이름으로 묶음
                                },
                                
                                {
                                    label: "마진 추정",
                                    data: aData.marginPlan,
                                    borderRadius: 3,
                                    backgroundColor: 'white',
                                    borderColor : Green,
                                    borderWidth: 1,
                                    yAxisID : "y",
                                    datalabels:{
                                        display: true,
                                        color:Green
                                    },
                                    stack: 'stack1', //동일한 스택 이름으로 묶음
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
                                    stacked: true,
                                    barPercentage: 1, // 바의 두께
                                    categoryPercentage : 1, // 카테고리 내 바의 두께 
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
                                    display: true,
                                    position: 'left',   
                                    title:{
                                        display:true,
                                        text: '금액(억원)',
                                        
                                    },                              
                                    ticks: {
                                        callback: function (value) {
                                            if (value % 100000000 === 0) {
                                                return (value / 100000000).toLocaleString() + '억';
                                            };
                                        }
                                    },
                                    stacked:true,  
                                   
                                       

                                },
                                y1: {
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
            let oResults = await this._setData();
            let aData;
            let aSale = [];
            let aSalePlan = [];
            let aMargin = [];
            let aActual = [];
            let aPlan = [];
            let aMarginPlan=[];
            let aLabel = [];

            let aResults = Object.entries(oResults[0]).map(([key, value])=>({
                name: key,
                value: value
            }))
            let p = 1;
            for(let i = 0; i<aResults.length; i+=4){
                aLabel.push(p+"월")
                p++
               
                if(aResults[i+2].value==="actual"){
                    aSale.push(aResults[i].value)
                    aSalePlan.push(null)
                    aMargin.push(aResults[i+1].value)
                    aMarginPlan.push(null)
                    aActual.push(aResults[i+3].value)
                    aPlan.push(null)
                } else {
                    aSalePlan.push(aResults[i].value)
                    aSale.push(null)
                    aMarginPlan.push(aResults[i+1].value)
                    aMargin.push(null)
                    aActual.push(null)
                    aPlan.push(aResults[i+3].value)
                }
            }
            
            for(let i = 0; i<12; i++){
                if(aPlan[i] !== null){
                    aPlan[i-1]  = aActual[i-1]
                    i += 12
                }
            }


            aData = {
                "label" : aLabel,
                "sale" : aSale,
                "marginPlan" : aMarginPlan,
                "salePlan" : aSalePlan,
                "margin" : aMargin,
                "actual" : aActual,
                "plan" : aPlan
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

              let sPath = `/get_actual_m_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            
            let aData ;

            //subtitle 설정
            let subTitle;
            if(sMonth === '12'){
                subTitle=''
            } else {
                subTitle = `(${dYearMonth.getMonth()+2}~12월 추정)`
            }
            
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