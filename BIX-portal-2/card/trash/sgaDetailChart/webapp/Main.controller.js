sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/EventBus",

], function (Controller, ODataModel, EventBus) {
	"use strict";

	return Controller.extend("bix.card.sgaDetailChart.Main", {
        _sCanvasId: undefined,
        _sContainerId: undefined,
        _oMyChart: undefined,
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
            this._oMyChart.data.labels = oResult.a부문;
            this._oMyChart.data.datasets[0].data = oResult.a인건비
            this._oMyChart.data.datasets[1].data = oResult.a투자비
            this._oMyChart.data.datasets[2].data = oResult.a경비
            this._oMyChart.update();
        },

        _setChart: async function () {

            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 100);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 100);

            let oHTML = this.byId("html");
            oHTML.setContent(`<div id='${this._sContainerId}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._sCanvasId}' style='padding: 0 2.5rem'/></div>`);
            oHTML.attachEventOnce("afterRendering", async function () {

                const ctx = document.getElementById(this._sCanvasId).getContext("2d");

                //데이터 셋팅 부분
                let oResult = await this._setSessionData();


                //차트 구성
                this._oMyChart = new Chart(ctx, {
                    data: {
                        labels: oResult.a부문,
                        datasets: [
                            {
                                label: "인건비",
                                data: oResult.a인건비,
                                yAxisID: "y",
                            },
                            {
                                label: "투자비",
                                data: oResult.a투자비,
                                yAxisID: "y",
                            },
                            {
                                label: "경비",
                                data: oResult.a경비,
                                yAxisID: "y",
                            },
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: false,
                                text: "인건비,투자비,경비 차트",
                                position: "top"
                            },
                            legend:{
                                position:'bottom'
                            }
                        },
                        scales: {
                            y: {
                                title:{
                                    display: true,                                
                                },
                                position: "left",
                                stacked: true,
                                ticks:{
                                    callback:function(value){
                                        if(value % 100000000 === 0){
                                            return(value / 100000000).toLocaleString();
                                        };
                                    }
                                }
                               
                            }
                        },
                        elements:{
                            line:{
                                tension:0.4
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
                serviceUrl: "../odata/v4/sga-api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            const oBinding = oModel.bindContext(`/get_sga_performance(year='${sYear}',month='${sMonth}',org_id='${sOrgId}')`);
			let aResults = await oBinding.requestObject();
            let oResult = await this._setChartData(aResults.value);
            return oResult;
		},

		_setChartData: function(aResults){
            //차트에 넣을 임시 데이터 
            let aChartData = [];
            console.log(aResults)
            aResults.forEach(oResult => {
                // 최상위 레벨일 때 Return
                if (oResult.level2 === null) return;

                // 부문이 같은 데이터
                let oFilteredData = aChartData.find(oChartData => {
                    return oChartData["부문"] === oResult.level2
                        && oChartData.level1 === oResult.level1;
                });


                if (!oFilteredData) {
                    aChartData.push({
                        level1 : oResult.level1,
                        부문: oResult.level2,
                        인건비: (oResult.type === "LABOR") ? oResult.performanceCurrentYearMonth : 0,
                        투자비: (oResult.type === "INVEST") ? oResult.performanceCurrentYearMonth : 0,
                        경비: (oResult.type === "EXPENSE") ? oResult.performanceCurrentYearMonth : 0,
                    })
                } else {
                    if (oResult.type === "LABOR") {
                        oFilteredData["인건비"] = oResult.performanceCurrentYearMonth;
                    } else if (oResult.type === "INVEST") {
                        oFilteredData["투자비"] = oResult.performanceCurrentYearMonth;
                    } else if (oResult.type === "EXPENSE") {
                        oFilteredData["경비"] = oResult.performanceCurrentYearMonth;
                    }
                }
            })


            let a부문 = [], a인건비 = [], a투자비=[], a경비 = []
            aChartData.forEach(data => {
                a부문.push(data.부문)
                a인건비.push(data.인건비)
                a투자비.push(data.투자비)
                a경비.push(data.경비)
            })
            
            return {a부문 : a부문, a인건비 : a인건비, a투자비 : a투자비, a경비 : a경비}
            
        },
      
	});
});