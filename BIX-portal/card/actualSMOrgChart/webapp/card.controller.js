
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus ) {
    "use strict";

    return Controller.extend("bix.card.actualSMOrgChart.card", {
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

        /**
         * Component별 유일한 ID 생성
         */
        _createId: function () {
            this._aCanvasId = [];
            this._aContainerId = [];
            for(let i=0; i<2; i++){
                this._aCanvasId.push(this.createId("canvas"+ [i]))
                this._aContainerId.push(this.createId("container"+ [i]))                    
            }

        },

        
        _updateChart: async function (sChannelId, sEventId, oData) {
            let aData = await this._dataSetting();

            let iHeight = aData.aLabel.length * 4 * 16 * 1.01// 라벨 갯수 * 4rem * 16pixel
            let iHeight2 = aData.aLabel.length * 4 * 16 * 0.99// 라벨 갯수 * 4rem * 16pixel
            document.getElementById(this._aCanvasId[0]).height = iHeight
            document.getElementById(this._aCanvasId[1]).height = iHeight2

            

            this._myChart1.data.labels = aData.aLabel
            this._myChart1.data.datasets[0].data = aData.aMarginPurpose
            this._myChart1.data.datasets[1].data = aData.aMargin
            this._myChart1.data.datasets[2].data = aData.aSalePurpose
            this._myChart1.data.datasets[3].data = aData.aSale

            this._myChart2.data.labels = aData.aLabel
            this._myChart2.data.datasets[0].data = aData.aMarginRate

            console.log(this._myChart1.data)
            console.log(this._myChart2.data)

            
            try{
                this._myChart1.update();
            this._myChart2.update();

            } catch(e){
                console.error(e)
            }
            
            


        
          },

    
        _setChart: async function () {
             // 카드
             const oCard = this.getOwnerComponent().oCard;

             // Card 높이를 컨테이너 높이와 동일하게 구성
             let sCardId = oCard.getId();
             let oParentElement = document.getElementById(sCardId).parentElement;

            // chart 색
            
            let lightBlue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart12');
            let Blue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart1');
            let lightRed = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart4');
            let Red = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart13');
            let aData = await this._dataSetting();

           
                let oHTML = this.byId("html0");

                let iHeight = aData.aLabel.length * 4 * 16 * 1.01// 라벨 갯수 * 4rem * 16pixel
                let iHeight2 = aData.aLabel.length * 4 * 16 * 0.99// 라벨 갯수 * 4rem * 16pixel

                oHTML.setContent(`<canvas id='${this._aCanvasId[0]}' height="${iHeight}px" />`);

                oHTML.attachEvent("afterRendering", async function () {                                       
                    // 차트 구성
                    const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId[0])).getContext("2d");
                    //데이터 요청
                    ;
                    this._myChart1 = new Chart(ctx, {
                        type: "bar",
                        data: {
                            labels: aData.aLabel,
                            datasets: [                               
                                
                                {
                                    label: "마진목표",
                                    data: aData.aMarginPurpose,
                                    backgroundColor: lightBlue,
                                    borderColor: lightBlue,
                                    xAxisID: 'x',
                                    stack:"마진",
                                    order:2
                                },
                                {
                                    label: "마진",
                                    data: aData.aMargin,
                                    backgroundColor: Blue,
                                    borderColor: Blue,
                                    xAxisID: 'x',
                                    stack:"마진",
                                    order:1

                                },
                                {
                                    label: "매출 목표",
                                    data: aData.aSalePurpose,
                                    backgroundColor: lightRed,
                                    borderColor: lightRed,
                                    xAxisID: 'x',
                                    stack:"매출",
                                    order:2

                                },
                                {
                                    label: "매출 실적",
                                    data: aData.aSale,
                                    backgroundColor: Red,
                                    borderColor: Red,
                                    xAxisID : 'x',
                                    stack:"매출",
                                    order:1

                                },
                            ]
                        },

                        options: {
                            responsive: false,
                            maintainAspectRatio: false,   
                            indexAxis: 'y',    
                            
                            plugins:{
                                legend: {
                                    display: false,
                                    position: 'bottom',                                    
                                },
                            },                     
                            scales: {
                                y:{
                                    ticks:{
                                        display:true,
                                        padding: 0
                                    },
                                    title:{
                                        display:true
                                    },
                                    grid:{
                                        display:false
                                    }, 
                                    stacked:'true',
                                    
                                    
                                },
                                x: {
                                    position:'bottom',                                    
                                    
                                    display: false,
                                    min:0,
                                    title:{
                                        display:false,
                                    },                            
                                    grid:{
                                        display:false
                                    },              
                                   

                                },

                                x1: {
                                    display: false,
                                    position: 'top',
                                    min:0,
                                    title:{
                                        display:false,
                                    },                            
                                    grid:{
                                        display:false
                                    },  
                                }
                             

                            }
                        }
                    })
                    this._ovserveResize(this.byId(this._aCanvasId[0].parentElement), 0)

                }.bind(this)); 

                let oHTML2 = this.byId("html1");
                oHTML2.setContent(`<canvas id='${this._aCanvasId[1]}' height="${iHeight2}" />`);

                oHTML2.attachEvent("afterRendering", async function () {                                       
                    // 차트 구성
                    const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId[1])).getContext("2d");
                    //데이터 요청
                    ;
                    this._myChart2 = new Chart(ctx, {
                        type: "bar",
                        data: {
                            labels: aData.aLabel,
                            datasets: [
                                
                                {
                                    label: "마진율",
                                    data: aData.aMarginRate,
                                    backgroundColor: Blue,
                                    borderColor: Blue,
                                    type: "line",
                                    xAxisID:'x1'

                                }
                            ]
                        },

                        options: {
                            responsive: false,
                            maintainAspectRatio: false,   
                            indexAxis: 'y',    
                            plugins:{
                                legend: {
                                    display: false,
                                    position: 'bottom',                                    
                                },
                                
                            },                     
                            scales: {
                                y:{
                                    ticks:{
                                        display:false
                                    },
                                    title:{
                                        display:false
                                    },                         
                                    grid:{
                                        display:false
                                    },   
                                },
                                x: {
                                    type:"linear",
                                    position:'bottom',
                                    display: false,                                    
                                    title:{
                                        display:false,
                                    },                            
                                    grid:{
                                        display:false
                                    },              
                                   

                                },

                                x1: {
                                    display: false,
                                    position: 'top',
                                    grid:{
                                        drawOnChartArea: false
                                    }
                                }
                             

                            }
                        }
                    })

                    this._ovserveResize(this.byId(this._aCanvasId[0].parentElement), 0)
                }.bind(this)); 

            
        },

        _ovserveResize: function(oElement, i){

            if(!this._resizeObserver){
                this._resizeObserver = new ResizeObserver(()=> {
                    this._oMyChart[i].resize()
                })
                   
            }
        },
        
        waitForAfterRendering: function(oControl){
            return new Promise(resolve => {
                oControl.attachEvent("afterRendering", () => resolve())
            })
        },


        _dataSetting: async function () {
            let aResults = await this._setData();
            
            let aData = [];

            let aLabel = [];
            let aMarginRate = [];
            let aMargin = [];
            let aMarginPurpose = [];
            let aMarginPurpose2 = [];
            let aSale = [];
            let aSalePurpose = [];
            let aSalePurpose2 = [];
            aResults[0].value.forEach(
                function(oData){

                    if(aLabel.find(sData => sData === oData.org_name)){
                        
                    } else {
                        aLabel.push(oData.org_name);
                    }

                    if(oData.type === "마진율"){
                        aMarginRate.push(oData.actual_curr_ym_value)

                    } else if(oData.type ==="마진"){
                        aMargin.push(oData.actual_curr_ym_value)
                        aMarginPurpose2.push(oData.target_curr_y_value  * 100000000)
                        if(oData.actual_curr_ym_value < 0){
                            aMarginPurpose.push(oData.target_curr_y_value  * 100000000)
                        } else {
                            if((oData.target_curr_y_value  * 100000000 - oData.actual_curr_ym_value) > 0){
                                aMarginPurpose.push(oData.target_curr_y_value  * 100000000 - oData.actual_curr_ym_value)
                            } else {
                                aMarginPurpose.push(0)
                            }
                        }

                    } else if(oData.type ==="매출"){
                        aSale.push(oData.actual_curr_ym_value)
                        aSalePurpose2.push(oData.target_curr_y_value  * 100000000)

                        if(oData.actual_curr_ym_value < 0){
                            aSalePurpose.push(oData.target_curr_y_value  * 100000000)
                        } else {
                            if((oData.target_curr_y_value  * 100000000 - oData.actual_curr_ym_value) > 0){
                                aSalePurpose.push(oData.target_curr_y_value  * 100000000 - oData.actual_curr_ym_value)
                            } else {
                                aSalePurpose.push(0)
                            }
                        }
                        
                    }                    
                }             
            )

            let oData = {
                aLabel,
                aMarginRate,
                aMargin,
                aMarginPurpose,
                aSale,
                aSalePurpose                
                }

            let aTableArray=[];

            for(let i=0; i<aLabel.length; i++){
                let oTableData={
                    "label" : aLabel[i],
                    "margin" : aMargin[i],
                    "marginPurpose" : aMarginPurpose[i],
                    "marginTotal" : aMarginPurpose2[i],
                    "sale" : aSale[i],
                    "salePurpose" : aSalePurpose[i],
                    "saleTotal" : aSalePurpose2[i],
                    "html" : "html" + i
                }

                aTableArray.push(oTableData)
            }

            this.getView().setModel(new JSONModel(aTableArray), "tableModel")

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