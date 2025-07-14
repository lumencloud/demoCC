sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/HTML",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/EventBus"
], function (Controller, ODataModel, HTML, JSONModel, EventBus) {
	"use strict";

	return Controller.extend("bix.card.saleDetailOrg.Main", {
        _sCanvasId: undefined,
        _sContainerId: undefined,
        _oMyChart: undefined,
        _oSessionData: 
        {
            'sOrgId': undefined,
            'sYear' : undefined,
            'sMonth' : undefined
        },
        _oEventBus: EventBus.getInstance(),


		onInit: function () {
            //component별 id 설정
            this._createId()
            // 차트 초기 설정            
            this._setChart();
            // 이벤트 버스 발생시 차트 업데이트
            this._oEventBus.subscribe("pl", "search", this._updateChart, this);

		},

        _createId: function () {
            this._sCanvasId = this.createId("canvas");
            this._sContainerId = this.createId("container");
            this._iMinHeight = 600;
        },

        _updateChart: async function () {
            let oResult = await this._setSessionData();

            this._oMyChart.data.labels = oResult.aOrg;
            this._oMyChart.data.datasets[0].data = oResult.aSale;
            this._oMyChart.data.datasets[1].data = oResult.aRate;

            this._oMyChart.update();


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

            const oBinding = oModel.bindContext(`/get_sale_detail_org(year='${sYear}',month='${sMonth}',org_id='${sOrgId}')`);
			let aResults = await oBinding.requestObject();
            let oResult = await this._setChartData(aResults.value);
            this._setChart(oResult);
		},

		_setChartData: function(aData){
            let aOrg = [];
            let aSale = [];
            let aRate = [];

			aData.forEach(data =>{
				aOrg.push(data.org)
				aSale.push(data.actual)
				aRate.push(data.rate)
			});
            
            return {org: aOrg, sale: aSale, rate: aRate};
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
            oHTML.attachEvent("afterRendering", async function () {

                const ctx = document.getElementById(this._sCanvasId).getContext("2d");

                //데이터 셋팅 부분
                let oResult = await this._setSessionData();

                //차트 구성
                this._oMyChart = new Chart(ctx, {
                    data: {
                        labels: oResult.aOrg,
                        datasets: [
                            {
                                label: "매출액",
                                data: oResult.aSale,
                                yAxisID: "y",
                            },
                            {
                                label: "누적 백분률",
                                data: oResult.aRate,
                                yAxisID: "y1",
                                type: "line"
                            },
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: false,
                                text: "매출 파레트 차트",
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
                                    text: "매출액(억원)",
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
                            },
                            y1: {
                                title:{
                                    display: true,
                                    text: "누적 백분률(%)",
                                },
                                position: "right",
                                min: 0,
                                max: 100,
                                grid: {
                                    display: false
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

        

        
	});
});