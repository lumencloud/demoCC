sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/EventBus",

], function (Controller, ODataModel, EventBus) {
	"use strict";

	return Controller.extend("bix.card.sgaDetailOrg.Main", {
        _sCanvasId: undefined,
        _sContainerId: undefined,
        _oMyChart: undefined,
        _oEventBus: EventBus.getInstance(),


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

        _updateChart: async function (sChannelId, sEventId, oData) {
            let oResult = await this._setEventBusData(oData);
            this._oMyChart.data.labels = oResult.aOrg;
            this._oMyChart.data.datasets[0].data = oResult.aLabor
            this._oMyChart.data.datasets[1].data = oResult.aInvest
            this._oMyChart.data.datasets[2].data = oResult.aExpense
            this._oMyChart.data.datasets[3].data = oResult.aRate
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
            oHTML.attachEvent("afterRendering", async function () {

                const ctx = document.getElementById(this._sCanvasId).getContext("2d");

                //데이터 셋팅 부분
                let oResult = await this._setEventBusData();

                //차트 구성
                this._oMyChart = new Chart(ctx, {
                    type:'bar',
                    data: {
                        labels: oResult.aOrg,
                        datasets: [
                            {
                                label: "인건비",
                                data: oResult.aLabor,
                                yAxisID: "y",
                            },
                            {
                                label: "투자비",
                                data: oResult.aInvest,
                                yAxisID: "y",
                            },
                            {
                                label: "경비",
                                data: oResult.aExpense,
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
                            x:{
                                stacked: true,
                            },
                            y: {
                                title:{
                                    display: true,
                                    text: "SG&A 금액(억원)",
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
                        clip:20,
                        elements:{
                            line:{
                                tension:0.4
                            }
                        }
                    }
                });
            }.bind(this));
        },

		_setEventBusData: async function (oData) {
			let sOrgId, sYear, sMonth
			if(!oData){
				let oInitData = JSON.parse(sessionStorage.getItem("initSearchModel"))
                let dYearMonth = new Date(oInitData.yearMonth)
                sYear = dYearMonth.getFullYear();
                sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
                sOrgId = oInitData.orgId
			}else{
				sOrgId = oData.orgId;
                sYear = oData.year;
                sMonth = oData.month;
			};
                
			const oModel = new ODataModel({
                serviceUrl: "../odata/v4/sga-api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            const oBinding = oModel.bindContext(`/get_sga_detail_org(year='${sYear}',month='${sMonth}',org_id='${sOrgId}')`);
			let aResults = await oBinding.requestObject();
            let oResult = await this._setChartData(aResults.value);
            return oResult;
		},

		_setChartData: function(aData){
            let aOrg = [];
            let aLabor = [];
            let aInvest = [];
            let aExpense = [];
            let aRate = [];

			aData.forEach(data =>{
				aOrg.push(data.level2)
				aLabor.push(data.labor)
				aInvest.push(data.invest)
				aExpense.push(data.expense)
				aRate.push(data.rate)
			});
            
            return {org: aOrg, labor: aLabor, invest: aInvest, expense: aExpense, rate: aRate};
        },


	});
});