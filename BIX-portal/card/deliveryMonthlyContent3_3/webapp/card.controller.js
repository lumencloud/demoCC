sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus ) {
    "use strict";

    return Controller.extend("bix.card.deliveryMonthlyContent3_3.card", {
        _aCanvasId: [],
        _aContainerId: [],
        _oEventBus: EventBus.getInstance(),
        _oMyChart : [],


        onInit: function () {
            // component별 id 설정
            this._createId();

            // 차트 설정
            this._setChart();

            this._oEventBus.subscribe("aireport", "infoSet", this._updateChart, this);	



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

        _updateChart: async function () {
            this.byId("cardContent").setBusy(true)
            let aResults = await this._dataSetting();

            this._oMyChart[0].data.labels = aResults.aLabel
            this._oMyChart[0].data.datasets[0].data = aResults.aEmpty
            this._oMyChart[0].data.datasets[1].data = aResults.aActual
            this._oMyChart[0].data.datasets[2].data = aResults.aPlan
            this._oMyChart[0].data.datasets[3].data = aResults.aTotal

            // 파라미터
            let oData = JSON.parse(sessionStorage.getItem("aiReport"));
            let sMonth = Number(oData.month)
            let actualText, planText;
            if(sMonth === 1){
                actualText = `실적(${sMonth}월)`
                planText = `추정치(${Number(sMonth)+1}~12월)`
            } else if(sMonth === 12){
                actualText = `실적(1~${sMonth}월)`
                planText = `추정치(-)`
            } else {
                actualText = `실적(1~${sMonth}월)`
                planText = `추정치(${Number(sMonth)+1}~12월)`
            }

            this._oMyChart[0].options.plugins.legend.labels.generateLabels = 
            function(chart){
                return[
                    {
                        text:'목표치',
                        fillStyle:'red',
                        strokeStyle: 'red',
                        lineWidth: 1,
                        hidden: false,
                        datasetIndex: 0,
                        pointStyle: 'rect'
                    },
                    {
                        text: actualText                                                    ,
                        fillStyle:'pink',
                        strokeStyle: 'pink',
                        lineWidth: 1,
                        hidden: false,
                        datasetIndex: 1,
                        pointStyle: 'rect'
                    },
                    {
                        text:planText,
                        fillStyle: '#ddd',
                        strokeStyle: '#ddd',
                        lineWidth: 1,
                        hidden: false,
                        datasetIndex: 2,
                        pointStyle: 'rect'
                    }
                ]
            }




            
            this._oMyChart[0].update();
            this.byId("cardContent").setBusy(false)
        },

        _setChart: async function () {
            this.byId("cardContent").setBusy(true)
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 90);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 90);

            //커스텀 플러그인: 막대의 윗부분에서 오른쪽으로 선 긋기
            let connectorPlugin={
                id: 'barConnector',
                afterDatasetsDraw(chart){
                    let {ctx, chartArea: {top, bottom}, scales: {x,y}} = chart;
                    
                    let datasetMeta = chart.getDatasetMeta(1);
                    let datasetMeta2 = chart.getDatasetMeta(2);
                    ctx.save();
                    ctx.strokeStyle = '#ddd';
                    ctx.setLineDash([2,2])
                    ctx.lineWidth = 1;

                    for(let i = 0; i<datasetMeta.data.length - 1; i++){
                        let curr = datasetMeta.data[i];
                        let next = datasetMeta.data[i+1];

                        let currX = curr.x + curr.width / 2;
                        let currY = curr.y;
                        let nextX = next.x - next.width / 2;
                        let nextY = next.y;

                        ctx.beginPath();
                        ctx.moveTo(currX, currY);
                        ctx.lineTo(nextX, currY);
                        ctx.stroke();
                    }

                    for(let i = 0; i<datasetMeta2.data.length - 1; i++){
                        let curr = datasetMeta2.data[i];
                        let next = datasetMeta2.data[i+1];

                        let currX = curr.x + curr.width / 2;
                        let currY = curr.y;
                        let nextX = next.x - next.width / 2;
                        let nextY = next.y;

                        ctx.beginPath();
                        ctx.moveTo(currX, currY);
                        ctx.lineTo(nextX, currY);
                        ctx.stroke();
                    }

                    ctx.restore();
                }
            };


            // 파라미터
            let oData = JSON.parse(sessionStorage.getItem("aiReport"));
            let sMonth = Number(oData.month)
            let actualText, planText;
            if(sMonth === 1){
                actualText = `실적(${sMonth}월)`
                planText = `추정치(${Number(sMonth)+1}~12월)`
            } else if(sMonth === 12){
                actualText = `실적(1~${sMonth}월)`
                planText = `추정치(-)`
            } else {
                actualText = `실적(1~${sMonth}월)`
                planText = `추정치(${Number(sMonth)+1}~12월)`
            }






            for (let i = 0; i < this._aCanvasId.length; i++) {
                let oHTML = this.byId("html" + i);
                oHTML.setContent(`<div id='${this._aContainerId[i]}' class='custom-chart-container' style='width:950px; height:380px; min-height:380px'><canvas id='${this._aCanvasId[i]}' /></div>`);
                oHTML.attachEvent("afterRendering", async function () {                                       
                    // 차트 구성
                    const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId[i])).getContext("2d");
                    //데이터 요청
                    let aData = await this._dataSetting();
                    this._oMyChart[i] = new Chart(ctx, {
                        type: "bar",
                        data: {
                            labels: aData.aLabel,
                            datasets: [      
                                {
                                    label: "Empty",
                                    data: aData.aEmpty,
                                    backgroundColor: "transparent",
                                    yAxisID: "y",
                                    stack:1,                                 

                                },                          
                                {
                                    label: "실적",
                                    data: aData.aActual,
                                    backgroundColor: "pink",
                                    yAxisID : "y",
                                    stack:1,
                                    datalabels:{
                                        color: "pink",                                        
                                        size:12,                                                                                                 
                                    },    
                                },
                                {
                                    label: "추정치",
                                    data: aData.aPlan,
                                    backgroundColor: "#ddd",
                                    yAxisID: "y",
                                    stack:1,
                                    datalabels:{
                                        color: "#ddd",                                        
                                        size:12,                                                                                                 
                                    },
                                },
                                
                                {
                                    label: "목표치",
                                    data: aData.aTotal,
                                    backgroundColor: "red",
                                    yAxisID : "y",
                                    stack:1, 
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
                                        generateLabels(chart){
                                            return[
                                                {
                                                    text:'목표치',
                                                    fillStyle:'red',
                                                    strokeStyle: 'red',
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 0,
                                                    pointStyle: 'rect'
                                                },
                                                {
                                                    text: actualText                                                    ,
                                                    fillStyle:'pink',
                                                    strokeStyle: 'pink',
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 1,
                                                    pointStyle: 'rect'
                                                },
                                                {
                                                    text:planText,
                                                    fillStyle: '#ddd',
                                                    strokeStyle: '#ddd',
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 2,
                                                    pointStyle: 'rect'
                                                }
                                            ]
                                        }
                                    }                                    
                                                             
                                },
                                datalabels:{
                                    clip:false,
                                    display:
                                    function(context){ 
                                        if(context.dataset.label === 'Empty'){
                                                return false
                                            } else {
                                                return true
                                            }
                                    },
                                    color: 'red',
                                    anchor: 'end',
                                    align: 'top',
                                    font:{
                                        weight: 'bold',
                                        size: 12
                                    },
                                    offset: -3,
                                    formatter: function(value){                                          
                                            var oNumberFormat = NumberFormat.getIntegerInstance({
                                                groupingEnabled: true,
                                                groupingSeparator: ',',
                                                groupingSize: 3,
                                                decimals: 0
                                            });
                                            return oNumberFormat.format(value);                                                
                                        }
                                }                            
                            },                     
                            scales: {
                                x: {
                                    stacked: true,
                                    barPercentage: 1,
                                    categoryPercentage : 1,
                                    border:{
                                    },
                                    grid: {
                                        display: false
                                    },
                                    ticks: {
                                        padding: 20,
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
                                    stacked:true,
                                    ticks: {
                                        callback: function (value) {
                                            var oNumberFormat = NumberFormat.getIntegerInstance({
                                                groupingEnabled: true,
                                                groupingSeparator: ',',
                                                groupingSize: 3,
                                                decimals: 0
                                            });
                                            return oNumberFormat.format(value)+"억";  
                                        }
                                    },
                                    beginAtZero:true,
                                    min:0,
                                    title:{
                                        display:false,
                                        text: '금액(억원)',
                                        padding: {
                                            top : 0,
                                            bottom: 0,                                            
                                        }
                                        
                                      
                                    },
                                }          
                            }
                        },
                        plugins: [ChartDataLabels, connectorPlugin],

                    })

                    
                    this.dataLoad();

                    this._ovserveResize(this.byId(this._aContainerId[i]), i)
                }.bind(this));
                
``            }
        this.byId("cardContent").setBusy(false)
        },

		dataLoad : function(){
			const oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.publish("CardChannel","CardFullLoad",{
				cardId:this.getView().getId()
			})
		},

        _ovserveResize: function(oElement, i){

            if(!this._resizeObserver){
                this._resizeObserver = new ResizeObserver(()=> {
                    this._oMyChart[i].resize()
                })
                   
            }
        },

        _dataSetting: async function () {
            let aResults = await this._setData();
            let aData;

            let aLabel=[];
            let aActual = [];
            let aEmpty = [];
            let aPlan=[];
            let aTotal = [];

            for(let i = 1; i<13; i++){                
                aLabel.push(i+"월")
                aTotal.push(null)

                if(aResults["m_"+i+"_type"] === "actual"){                    
                    aActual.push(aResults["m_"+i+"_sale"])
                    aPlan.push(null)
                } else if (aResults["m_"+i+"_type"] === "plan"){                    
                    aActual.push(null)
                    aPlan.push(aResults["m_"+i+"_sale"])
                }

                let iEmpty = 0;
                for(let j=1; j<i; j++){
                    iEmpty = iEmpty + aResults["m_"+j+"_sale"]
                }
                aEmpty.push(iEmpty)
            }



            aLabel.push("Total")
            aActual.push(null)
            aPlan.push(null)
            aEmpty.push(null)
            aTotal.push(aResults.target)            
            
            aData = {aLabel, aActual, aPlan, aEmpty, aTotal}
            return aData;
        },

        _setData: async function(){
            let oData = JSON.parse(sessionStorage.getItem("aiReport"));

            // 파라미터
            let iYear = oData.year
            let sMonth = oData.month
            let sOrgId = oData.orgId;
            let sType = oData.type;
            
            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server",
              });

              let sPath = `/get_ai_forecast_m_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',org_tp='${sType}')`
            
            let aData ;
           await Promise.all([
                    oModel.bindContext(sPath).requestObject(),                
                ]).then(function(aResults){        
                    aData = aResults[0].value[0]                
                }.bind(this))
                .catch((oErr) => {
                    Module.displayStatus(this.getOwnerComponent().oCard,oErr.error.code, this.byId("cardContent"));
                });
            return aData;
        },

        
    });
});           