sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",

], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus ) {
    "use strict";

    /**
     * @typedef {sap.m.Select} Select
     */
    return Controller.extend("bix.card.planPipelineDetailChart.card", {
        _aCanvasId: [],
        _aContainerId: [],
        _oEventBus: EventBus.getInstance(),
        _oMyChart : [],


        onInit: function () {
            // component별 id 설정
            this._createId();

            //select 모델 설정
            this._setSelect();

            // 차트 설정
            this._setChart();

            // 이벤트 버스 설정
            this._oEventBus.subscribe("pl", "search", this._updateChart, this);
            this._oEventBus.subscribe("pl", "detailSelect", this._changeDetailSelect, this);
        },
        
        _setSelect: async function () {
            // 검색 조건
            let oSearchData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            
            // 현재 해시를 기준으로 DB에서 Select에 들어갈 카드 정보를 불러옴
            let oHashData = this.getOwnerComponent().oCard.getModel("hashModel").getData();

            let sSelectPath = `/pl_content_view(page_path='${oHashData.page}',position='detail',grid_layout_info=null,detail_path='${oHashData.detail}',detail_info='${oHashData.detailType}')/Set`;

            // 로직에 따라서 조직 필터링
            let aOrgFilter = [`(length(sub_key) gt 0 and sub_key ne 'org_delivery' and sub_key ne 'org_account' and sub_key ne 'org')`];
            if (oSearchData.org_level === "lv1" || oSearchData.org_level === "lv2") {   // lv1 또는 lv2
                aOrgFilter.push(`(sub_key eq 'org_delivery' or sub_key eq 'org_account')`);
            } else if ((oSearchData.org_level === "lv3" && oSearchData.org_tp === "hybrid") || oSearchData.org_tp === "account") {  // CCO 및 account조직
                aOrgFilter.push(`(sub_key eq 'org_account')`);
            } else {    // 그 외
                aOrgFilter.push(`(sub_key eq 'org')`);
            };

            // 조직 필터링 배열을 문자열로 변경
            let sOrgFilter = aOrgFilter.join(" or ");

            // 데이터 호출
            const oListBinding = this.getOwnerComponent().getModel("cm").bindList(sSelectPath, null, null, null, {
                $filter: sOrgFilter
            });
            let aSelectContexts = await oListBinding.requestContexts();
            let aSelectData = aSelectContexts.map(oContext => oContext.getObject());

            // 카드 정보를 selectModel로 설정 (sub_key, sub_text)
            if(oSearchData.org_level !== "lv1" && oSearchData.org_level !== "lv2"){
                let aOrgData = aSelectData.find(data => data.sub_key === 'org_delivery' || data.sub_key === 'org_account')
                if(!!aOrgData){
                    let aOrgSubText = aOrgData.sub_text.split(' ')
                    aOrgData.sub_text = aOrgSubText[aOrgSubText.length-1]
                }
            }
            this.getView().setModel(new JSONModel(aSelectData), "selectModel");
            

            this.getView().setModel(new JSONModel({ key: "org" }), "uiModel")
        },

        /**
         * 뒤로가기, 앞으로가기에 의해 변경된 URL에 따라 detailSelect 다시 설정
         * @param {String} sChannelId 
         * @param {String} sEventId 
         * @param {Object} oEventData 
         */
        _changeDetailSelect: function (sChannelId, sEventId, oEventData) {
            // DOM이 있을 때만 detailSelect를 변경
            let oDom = this.getView().getDomRef();
            if (oDom) {
                let sKey = oEventData["detailSelect"];
                this.byId("detailSelect").setSelectedKey(sKey);
            }
        },
                
        onUiChange: function (oEvent) {
            // 선택한 key로 화면에 보여줄 테이블을 결정
            let oSelect = /** @type {Select} */ (oEvent.getSource());
            let sKey = (oSelect).getSelectedKey();
            let oUiModel = this.getView().getModel("uiModel");
            oUiModel.setProperty("/key", sKey);
            
            // detailCard Component 반환
            let oCard = this.getOwnerComponent().oCard;
            let oCardComponent = oCard._oComponent;

            // PL 실적 hashModel에 detailSelect 업데이트
            let oHashModel = oCardComponent.getModel("hashModel");
            oHashModel.setProperty("/detailSelect", sKey);
            this._oEventBus.publish("pl", "setHashModel", { system: true });

            // PL 실적 Manifest Routing
            let oHashData = oHashModel.getData();
            let sRoute = (oHashData["page"] === "actual" ? "RouteActual" : "RoutePlan");
            oCardComponent.getRouter().navTo(sRoute, {
                pageView: oHashData["pageView"],
                detail: oHashData["detail"],
                detailType: oHashData["detailType"],
                orgId: oHashData["orgId"],
                detailSelect: oHashData["detailSelect"],
            });
        },



        _updateChart: async function (sChannelId, sEventId, oData) {
            this.byId("cardContent").setBusy(true)
            let aResults = await this._dataSetting();           
            
            this._oMyChart[0].data.labels = aResults.label
            this._oMyChart[0].data.datasets[0].data = aResults.sale
            this._oMyChart[0].data.datasets[1].data = aResults.salePlan
            this._oMyChart[0].data.datasets[2].data = aResults.margin
            this._oMyChart[0].data.datasets[3].data = aResults.marginPlan
            this._oMyChart[0].data.datasets[4].data = aResults.actual
            this._oMyChart[0].data.datasets[5].data = aResults.plan

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
            this.byId("cardContent").setBusy(true)

            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 95);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 90);

            let Orange = "#FF7135";
            let Blue = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart1');
            let Green = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart22');
            let Orange2 = "#ff7034"


            for (let i = 0; i < this._aCanvasId.length; i++) {
                let oHTML = this.byId("html" + i);
                oHTML.setContent(`<div id='${this._aContainerId[i]}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._aCanvasId[i]}' /></div>`);
                oHTML.attachEvent("afterRendering", async function () {                                       
                    // 차트 구성
                    const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId[i])).getContext("2d");
                    //데이터 요청
                    let aData = await this._dataSetting();

                    // let blueUrl = "../resource/image/pattern_blue.png"
                    // let img1 = new Image();
                    // img1.src = blueUrl
                    // let oPatternBlue;

                    // img1.onload = () => {
                    //     oPatternBlue = ctx.createPattern(img1, 'repeat');
                    // }

                    // let pattern = new patternomaly();
                    // let oPatternBlue = pattern.draw('diagonal','red')
                    
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
                                    borderColor : Blue,
                                    yAxisID: "y",
                                    stack: 'stack2', //동일한 스택 이름으로 묶음
                                    order:1,
                                    datalabels:{
                                        color: Blue
                                        
                                    },


                                },
                                {
                                    label: "매출 추정",
                                    data: aData.salePlan,
                                    borderRadius: 3,
                                    backgroundColor: "white",
                                    borderColor: Blue,
                                    borderWidth: 1,
                                    yAxisID: "y",                                    
                                    stack: 'stack2', //동일한 스택 이름으로 묶음
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
                                    stack: 'stack1', //동일한 스택 이름으로 묶음
                                    order:2,
                                    datalabels:{
                                        color: Green                                        
                                    },

                                },
                                
                                {
                                    label: "마진 추정",
                                    data: aData.marginPlan,
                                    borderRadius: 3,
                                    backgroundColor: 'White',
                                    borderColor : Green,
                                    borderWidth: 1,
                                    yAxisID : "y",                                    
                                    stack: 'stack1', //동일한 스택 이름으로 묶음
                                    order:2,
                                    datalabels:{
                                        color: Green                                        
                                    },
                                },
                                {
                                    label: "마진율(%)",
                                    data: aData.actual,
                                    backgroundColor: Orange2,
                                    borderColor: Orange2,
                                    pointBackgroundColor : Orange2,
                                    pointBorderColor : "White",
                                    pointBorderWidth: 3,
                                    pointRadius: 6,
                                    datalabels:{
                                        offset: 10,
                                        color: "white",
                                        size:12,
                                        backgroundColor : Orange2,
                                        borderColor: Orange2,
                                        borderWidth: 2,
                                        borderRadius: 15,
                                        padding : 5,                                                              
                                    },
                                    type: "line",
                                    yAxisID: 'y1',
                                    order:0
                                    

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
                                    yAxisID: 'y1',
                                    order:0

                                },
                                
                                

                            ]
                        },
                            
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,  
                            layout:{
                                padding: {
                                    top: 40,
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                }
                            },                            
                            plugins:{
                                legend: {
                                    display: true,
                                    position: 'bottom',                                    
                                    labels:{
                                        padding: 40,
                                        usePointStyle: true,
                                        pointStyle: "circle",
                                        sort: (a, b) => {
                                            let aList = ["매출", "매출 추정", "마진", "마진 추정","마진율(%)", "마진율 추이(%)"]                                            
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
                                                    if (type === "매출" || type === "매출 추정" || type === "마진"|| type === "마진 추정") {
                                                        var oNumberFormat = NumberFormat.getFloatInstance({
                                                            groupingEnabled: true,
                                                            groupingSeparator: ',',
                                                            groupingSize: 3,
                                                            decimals: 0
                                                        });
                                                        return `${label} : ${oNumberFormat.format(value / 100000000)}억`;
                                                    } else if (type === "마진율(%)" || type === "마진율 추이(%)"){
                                                        var oNumberFormat = NumberFormat.getFloatInstance({
                                                            groupingEnabled: true,
                                                            groupingSeparator: ',',
                                                            groupingSize: 3,
                                                            decimals: 1
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
                                    color: '#333333',
                                    anchor: 'end',
                                    align: 'top',
                                    
                                    font:{
                                        weight: 'bold',
                                        size: 12
                                    },
                                    offset: -3,
                                    formatter: function(value){
                                            if (value > 100 || value < -100) {
                                                var oNumberFormat = NumberFormat.getFloatInstance({
                                                    groupingEnabled: true,
                                                    groupingSeparator: ',',
                                                    groupingSize: 3,
                                                    decimals: 0
                                                });
                                                return oNumberFormat.format(value / 100000000);                                                
                                            } else if(value === null){return null} else if (value < 100 && value > -100){
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
                                    grid: {
                                        display: false
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
                    
                    this.dataLoad();
                    //this._ovserveResize(this.byId(this._aContainerId[i]), i)
                }.bind(this));
                
           }
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

            //console.log(aData)

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

              let sPath = `/get_actual_m_pl_total_org(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            
            let aData ;

            //subtitle 설정
            let subTitle;
            if(sMonth === '12'){
                subTitle=''
            } else if ((sMonth === '11')){
                subTitle='(12월 추정)'
            } else {
                subTitle = `(${dYearMonth.getMonth()+2}~12월 추정)`
            }
           
           
           await Promise.all([
                oModel.bindContext(sPath).requestObject(),                
            ]).then(function(aResults){
                
                aData = aResults[0].value                
            }.bind(this))
            .catch((oErr) => {
                Module.displayStatus(this.getOwnerComponent().oCard,oErr.error.code, this.byId("cardContent"));
            })
        return aData;
    },

        
    });
});           