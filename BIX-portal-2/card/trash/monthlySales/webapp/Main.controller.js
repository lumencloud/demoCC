
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/EventBus",

], function (Controller, ODataModel, EventBus) {
    "use strict";

    return Controller.extend("bix.card.monthlySales.Main", {        
        _sCanvasId: undefined,
        _sContainerId: undefined,
        _oMyChart: undefined,
        _aOriginalData: [],
        _oEventBus: EventBus.getInstance(),

        _oSessionData: 
        {
            'sOrgId': undefined,
            'sYear' : undefined,
            'sMonth' : undefined
        },

        onInit: function () {
            //component별 id 설정
            this._createId()
            // 차트 초기 설정            
            this._setChart();
            // 이벤트 버스 발생시 차트 업데이트
            this._oEventBus.subscribe("pl", "search", this._updateChart, this);                                        
        },    
        _createId: function (){
            this._sCanvasId = this.createId("canvas");
            this._sContainerId = this.createId("container");
            this._iMinHeight = 600;
        },

        _updateChart: async function () {
            let oResult = await this._setSessionData();

            this._oMyChart.data.labels = oResult.label;
            this._oMyChart.data.datasets[0].data = oResult.contract;
            this._oMyChart.data.datasets[1].data = oResult.sale;
            this._oMyChart.data.datasets[2].data = oResult.margin;
            this._oMyChart.data.datasets[3].data = oResult.target;
            this._oMyChart.data.datasets[4].data = oResult.last;
            this._oMyChart.data.datasets[5].data = oResult.current;
            this._oMyChart.data.datasets[6].data = oResult.br;

            this._oMyChart.update();


        },

        _setChart: async function () {            

            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 100);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 100);

            let oHTML = this.byId("html");
            oHTML.setContent(`<div id='${this._sContainerId}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._sCanvasId}' style='padding: 0 2.5rem'/></div>`);
            oHTML.attachEventOnce("afterRendering", async function () {
                const canvas = document.getElementById(this._sCanvasId);
                const ctx = canvas.getContext("2d");

                //데이터 셋팅 부분
                let oResult = await this._setSessionData();

                this._oMyChart = new Chart(ctx, {
                    type: 'bar',
                    data: {                                        
                        labels: oResult.label,
                        datasets: [{
                            type: "bar",
                            label: "수주",
                            data: oResult.contract,
                            stack: "barStack",
                        },
                        {
                            type: "bar",
                            label: "매출",
                            data: oResult.sale,
                            stack: "barStack",
                        },
                        {
                            type: "bar",
                            label: "마진",
                            data: oResult.margin,
                        },
                        {
                            type: "bar",
                            label: "매출 실적/확보/미확보",
                            data: oResult.target,
                        },
                        {
                            type: "line",
                            label: "전년도",
                            data: oResult.last,
                        },
                        {
                            type: "line",
                            label: "당해년도",
                            data: oResult.current,
                        },
                        {
                            type: "line",
                            label: "연 목표",
                            data: oResult.br,
                            legend :{
                                display :true,
                                position: 'top'
                            }
                        },
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {                       
                            legend :{
                                display :true,
                                position: 'bottom'
                            }
                        },     
                        scales: {
                            y: {
                                ticks: {
                                    callback: function (value) {
                                        if (value % 100000000 === 0) {
                                            return (value / 100000000).toLocaleString();
                                        };
                                    }
                                }
                            }
                        }              
                    }  
                });           

            }.bind(this));

        },

        _setSessionData: async function () {
            
			let oInitData = JSON.parse(sessionStorage.getItem("initSearchModel"))
            let dYearMonth = new Date(oInitData.yearMonth)
            let sOrgId = oInitData.orgId
            let sYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");

            // 데이터 변화를 감지해서 차트 렌더링
            if(this._oSessionData.sOrgId != sOrgId || this._oSessionData.sYear != sYear || this._oSessionData.sMonth != sMonth){
                this._oSessionData.sOrgId = sOrgId
                this._oSessionData.sYear = sYear
                this._oSessionData.sMonth = sMonth
            } else {
                return
            }
                
			const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl-api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            const oBinding = oModel.bindContext(`/get_pl_performance_month_progress(year='${sYear}',month='${sMonth}',org_id='${sOrgId}')`);
			let aResults = await oBinding.requestObject();
            let oResult = await this._setChartData(aResults);
            return oResult
		},

        _setChartData: function(aData){
            let aLabel = [], aSale = [], aMargin = [], aCurrent = [],
                aLast = [], aBr = [], aContract = [], aTarget = []

                aData.value.forEach(data => {
                    aLabel.push(data.month + "월")
                    aSale.push(data.sale)
                    aMargin.push(data.margin)
                    aCurrent.push(data.current)
                    aLast.push(data.last)
                    aBr.push(data.br)
                    aContract.push(data.contract)
                    aTarget.push(data.target)
                })
            
            return {label : aLabel, sale : aSale, margin : aMargin,current: aCurrent, last : aLast, br:aBr, contract:aContract, target:aTarget };
        },
    });
});