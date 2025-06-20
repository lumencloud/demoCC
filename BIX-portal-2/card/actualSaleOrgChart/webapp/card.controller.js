
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus ) {
    "use strict";

    return Controller.extend("bix.card.actualSaleOrgChart.card", {
        _aCanvasId: [],
        _aContainerId: [],
        _oEventBus: EventBus.getInstance(),
        _oMyChart : [],


        onInit: function () {
            // component별 id 설정
            this._createId();

            //select 설정
            this._setUiModel();


            // 차트 설정
            this._setChart();

            // 이벤트 버스 설정
            this._oEventBus.subscribe("home", "search", this._updateChart, this);

        },

        _setUiModel: function () {

            this.getView().setModel(new JSONModel({
                tableKind: ""
            }), "uIModel");
            this._setSelect();

        },

        _setSelect: function () {
            this.getView().setModel(new JSONModel({}), "SelectModel");

            let aTemp = [{
                key: "",
                name: "상세 정보"
            }
            ];
            this.getView().setModel(new JSONModel(aTemp), "SelectModel");
        },

        _updateChart: async function (sChannelId, sEventId, oData) {
            let aResults = await this._dataSetting();
            this._oMyChart.data.labels = aResults.aLabel
            this._oMyChart.data.datasets[0].data = aResults.aMarginRate
            this._oMyChart.data.datasets[1].data = aResults.aSale
            this._oMyChart.data.datasets[2].data = aResults.aMargin                                        
            this._oMyChart.update();
        
          },

      
        /**
         * Component별 유일한 ID 생성
         */
        _createId: function () {
           
            this._aCanvasId=this.createId("canvas")
            this._aContainerId=this.createId("container")
            this._iMinHeight = 400;

        },

        _setChart: async function () {
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 100);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 80);

            // chart 색
            let Yellow = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart3');
            let Green = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart9');
            let Blue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart1');
            



                let oHTML = this.byId("html0");
                oHTML.setContent(`<div id='${this._aContainerId}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._aCanvasId}' /></div>`);
                oHTML.attachEventOnce("afterRendering", async function () {                                       
                    // 차트 구성
                    const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId)).getContext("2d");
                    //데이터 요청
                    let aData = await this._dataSetting();
                    
                    
                    this._oMyChart = new Chart(ctx, {
                        type: "bar",
                        data: {
                            labels: aData.aLabel,
                            datasets: [
                                
                                {
                                    label: "마진율",
                                    data: aData.aMarginRate,
                                    backgroundColor: Yellow,
                                    borderColor: Yellow,
                                    type: "line",
                                    yAxisID: 'y1'

                                },
                                {
                                    label: "매출",
                                    data: aData.aSale,
                                    borderRadius: 3,
                                    backgroundColor: Blue,
                                    yAxisID: "y"


                                },
                                {
                                    label: "마진",
                                    data: aData.aMargin,
                                    borderRadius: 3,
                                    backgroundColor: Green,
                                    yAxisID : "y",
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
                                },
                                title:{
                                    display: true,
                                    text: aData.sTitle,
                                    font:{
                                        size: 25,
                                        weight: 'bold'

                                    },
                                    position: "top"

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
                                    title:{
                                        display:true,
                                        text:'금액(억원)'
                                    },                            
                                    grid:{
                                        display:false
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
                                        text:'마진율 (%)'
                                    },                                                      
                                    grid: {
                                        display: false
                                    },
                                    position: 'right',
                                    

                                }


                            }
                        }
                    })
                }.bind(this));               
``            
        },

        _dataSetting: async function () {
            let aResults = await this._setData();
            console.log(aResults)
            let aData = [];

            let aLabel = [];
            let aMarginRate = [];
            let aMargin = [];
            let aSale = [];
            aResults[0].value.forEach(
                function(oData){

                    if(aLabel.find(sData => sData === oData.org_nm)){
                        
                    } else {
                        aLabel.push(oData.org_nm);
                    }

                    if(oData.type === "마진율"){
                        aMarginRate.push(oData.actual_curr_ym_value)
                    } else if(oData.type ==="마진"){
                        aMargin.push(oData.actual_curr_ym_value)
                    } else if(oData.type ==="매출"){
                        aSale.push(oData.actual_curr_ym_value)
                    }                    
                }             
            )

            let oData = {
                aLabel,
                aMarginRate,
                aMargin,
                aSale
                }


            return oData;
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

            let sOrgPath =`/get_actual_sale_org_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`            
            
            let aData ;
           await Promise.all([
                oModel.bindContext(sOrgPath).requestObject(),                
            ]).then(function(aResults){
                aData = aResults
            }.bind(this)
        )
        return aData;
    },

        
    });
});           