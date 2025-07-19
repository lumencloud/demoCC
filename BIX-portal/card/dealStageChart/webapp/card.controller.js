sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus ) {
    "use strict";

    return Controller.extend("bix.card.dealStageChart.card", {
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
            let aResults = await this._dataSetting();
                for(let i = 0; i<this._oMyChart.length; i++){
                    this._oMyChart[i].data.labels = aResults[i].aLabel
                    this._oMyChart[i].data.datasets[0].data = aResults[i].aChance
                    this._oMyChart[i].data.datasets[1].data = aResults[i].aTake
                    this._oMyChart[i].data.datasets[2].data = aResults[i].aSale                                        
                    this._oMyChart[i].update();
                }
          },

 
        onUiChange: function (oEvent) {
            let oUiModel = this.getView().getModel("uiModel");
            oUiModel.setProperty("/tableKind", oEvent.getSource().getSelectedKey())

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
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 100);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 60);

            // Chart Color
            let Purple = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart16');
            let Blue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart12');
            let Red  = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart13');


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
                            labels: aData[i].aLabel,
                            datasets: [
                                {
                                    label: "건수",
                                    data: aData[i].aChance,
                                    backgroundColor: "#f0681a",
                                    borderColor: "#f0681a",
                                    pointBackgroundColor:"#ffffff",
                                    pointRadius:5,
                                    pointBorderWidth:7,
                                    pointBorderColor:"#f0681a",
                                    type: "line",
                                    yAxisID: 'y1'

                                },
                                {
                                    label: "수주액",
                                    data: aData[i].aTake,
                                    borderRadius: 3,
                                    backgroundColor: "#00c4ef",
                                    borderColor:"#00c4ef",
                                    yAxisID : "y",
                                },
                                {
                                    label: "매출액",
                                    data: aData[i].aSale,
                                    borderRadius: 3,
                                    backgroundColor: "#664dfe",
                                    borderColor:"#664dfe",
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
                                    labels: {
                                        usePointStyle: true,
                                        padding: 30,
                                        pointStyle: "circle",
                                        generateLabels:function(chart){
                                            return chart.data.datasets.map((dataset,i)=>{
                                                return{
                                                    text: dataset.label,
                                                    fillStyle: dataset.borderColor,
                                                    strokeStyle:dataset.borderColor,
                                                    lineWidth:1,
                                                    pointStyle: "circle",
                                                    index:i
                                                }
                                            })
                                        }
                                    }                                   
                                },                                
                            },                     
                            scales: {
                                x: {
                                    stacked: false,
                                    border:{
                                    },
                                    grid: {
                                        display:false

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
                                    title:{
                                        display:true,
                                        text:'금액 (억원)'
                                    },                  
                                    grid: {
                                        display: false
                                    },
                                    ticks: {
                                        callback: function (value) {
                                            if (value % 100000000 === 0) {
                                                return (value / 100000000).toLocaleString();
                                            };
                                        }
                                    }  
                                       

                                },
                                y1: {
                                    type:"linear",
                                    display: true,
                                    title:{
                                        display:true,
                                        text:'건수 (건)'
                                    },                  
                                    grid: {
                                        display: false
                                    },
                                    position: 'right',
                                    

                                }


                            }
                        }
                    })

                    //this._ovserveResize(this.byId(this._aContainerId[i]), i)
 
                }.bind(this));
                
``            }
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
            let aData = [];

                let oData1 = {
                    aLabel: ["Lead", "Identified", "Validated", "Qualified", "Negotiated"],
                    aTake: this._convertData(aResults[0].value.find(sType => sType.type==="수주")),
                    aChance: this._convertData(aResults[0].value.find(sType => sType.type==="건수")),
                    aSale: this._convertData(aResults[0].value.find(sType => sType.type==="매출")),
                    sTitle: "Deal Stage 현황"
                }

                aData.push(oData1);
                let totalTake = 0;
                let totalChance = 0;
                let totalSale = 0;
                oData1.aTake.forEach(
                    function(take){
                        totalTake += take
                    }
                )
                oData1.aChance.forEach(
                    function(chance){
                        totalChance += chance
                    }
                )
                oData1.aSale.forEach(
                    function(sale){
                        totalSale += sale
                    }
                )

               
                let oTotal = { "totalTake":totalTake, "totalChance":totalChance, "totalSale":totalSale}
                this.getView().setModel(new JSONModel(oTotal), "PipelineTotalModel")
                
            return aData;
        },

        _monthSetting : function(aResults) {


            let aLabel = [];
            let aTake = [];
            let aChance = [];
            let aSale = [];

            aResults.forEach(
                function(aResult){
                    for(let i=1; i<13; i++){
                        let sFindColumn = "m_"+String(i).padStart(2, "0")+"_data"
                        let bResult = aResult.hasOwnProperty(sFindColumn)
                        if(bResult){
                            if(!aLabel.find(sMonth => sMonth === i+"월")){
                                aLabel.push(i+"월")
                            }
                            switch(aResult.type){
                                case "수주" :
                                    aTake.push(aResult[sFindColumn])
                                    break;
                                case "매출" :
                                    aSale.push(aResult[sFindColumn])
                                    break;
                                case "건수" :
                                    aChance.push(aResult[sFindColumn])
                                    break;
                            }
                        }
                        
                        
                    }
                } 
                    
            )
            
            return {aLabel, aTake, aSale, aChance};
        },

        _convertData : function(oData){         
               return [
                   oData.lead_data,
                   oData.identified_data,
                   oData.validated_data,
                   oData.qualified_data,
                   oData.negotiated_data,
                   oData.contracted_data,
                   oData.deal_lost_data,
                   oData.deselected_data
               ]
        },

        _convertMoneyData : function(oData){         
            return [
                oData["more10bil"],
                oData["5bil-10bil"],
                oData["3bil-5bil"],
                oData["1bil-3bil"],
                oData["500mil-1bil"],
                oData["100mil-500mil"]
            ]
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

            let sDealPath =`/get_forecast_pl_pipeline_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='deal',display_type='chart')`
            // let sMonthPath = `/get_forecast_pl_pipeline_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='month')`
            // let sRodrPath = `/get_forecast_pl_pipeline_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='rodr')`
            
            let aData ;
           await Promise.all([
                oModel.bindContext(sDealPath).requestObject(),
                // oModel.bindContext(sMonthPath).requestObject(),
                // oModel.bindContext(sRodrPath).requestObject(),
            ]).then(function(aResults){
                aData = aResults
            }.bind(this)
        )
        return aData;
    },

    onFormatPerformance: function (iValue, sType){
        if(sType === "억") {
            var oNumberFormat = NumberFormat.getFloatInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
                decimals: 1
            });
            return oNumberFormat.format(iValue/100000000) + "억";            
        }else if(sType === "건수"){
            var oNumberFormat = NumberFormat.getFloatInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
                decimals: 0
            });
            return oNumberFormat.format(iValue) + "건";
        }else{
            var oNumberFormat = NumberFormat.getFloatInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
                decimals: 0
            });
            return oNumberFormat.format(iValue);
        };
    }

        
    });
});           