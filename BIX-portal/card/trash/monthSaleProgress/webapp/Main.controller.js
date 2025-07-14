sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/odata/v4/ODataModel",
	"sap/ui/core/HTML",
    "sap/ui/core/EventBus"
], function (Controller, ODataModel, HTML, EventBus) {
	"use strict";

	return Controller.extend("bix.card.monthSaleProgress.Main", {
        _oEventBus: EventBus.getInstance(),

		onInit: function () {
			this._oEventBus.subscribe("pl", "search", this._setChart, this);
			this._setChart();
		},

		_setChart: async function (sChannelId, sEventId, oData) {
			let sOrgId, sYear, sMonth
			if(!oData){
				sOrgId = "5";
                sYear = "2024";
                sMonth = "09";
			}else{
				sOrgId = oData.orgId;
                sYear = oData.year;
                sMonth = oData.month;
			};

			const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl-api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

			const oBinding = oModel.bindContext(`/get_pl_performance_month_progress(year='${sYear}',month='${sMonth}',org_id='${sOrgId}')`);
			let aResults = await oBinding.requestObject();
            // let oResult = await this._makeChartData(aResults.value);
            this._makeChart(aResults.value);
		},
		
		_makeChart: async function (aValue) {
            let aLabel = [], aSale = [], aMargin = [], aCurrent = [],
                aLast = [], aBr = [], aContract = [], aTarget = []

			aValue.forEach(data => {
                aLabel.push(data.month + "월")
                aSale.push(data.sale)
                aMargin.push(data.margin)
                aCurrent.push(data.current)
                aLast.push(data.last)
                aBr.push(data.br)
                aContract.push(data.contract)
                aTarget.push(data.target)
            })

			let oBox = this.byId("chartBox6");
			oBox.removeAllItems();

            const oHTML = new HTML({
                content: "<canvas id='monthlyChart' width='600' heigth='500'>"
            });

            oBox.addItem(oHTML);

            oHTML.attachEvent("afterRendering", function () {
                const ctx = document.getElementById("monthlyChart").getContext("2d");

                const cData = {
                    labels: aLabel,
                    datasets: [{
                        type: "bar",
                        label: "수주",
                        data: aContract,
                        stack: "barStack",
                    },
                    {
                        type: "bar",
                        label: "매출",
                        data: aSale,
                        stack: "barStack",
                    },
                    {
                        type: "bar",
                        label: "마진",
                        data: aMargin,
                    },
                    {
                        type: "bar",
                        label: "매출 실적/확보/미확보",
                        data: aTarget,
                    },
                    {
                        type: "line",
                        label: "전년도",
                        data: aLast,
                    },
                    {
                        type: "line",
                        label: "당해년도",
                        data: aCurrent,
                    },
                    {
                        type: "line",
                        label: "연 목표",
                        data: aBr,
                        legend :{
                            display :true,
                            position: 'top'
                        }
                    },
                    ]
                }
                const cOptions = {
                    responsive: true,
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
                };
                new Chart(ctx, {
                    data: cData,
                    options: cOptions
                })
            })
        }

        // _makeChart:function(org, sale, rate){
		// 	let aLabel = [], aSale = [], aMargin = [], aCurrent = [],
		// 	aLast = [], aBr = [], aContract = [], aTarget = []

        //     let oBox = this.byId("chartBox1");
        //     oBox.removeAllItems();

        //     const oHTML = new HTML({
        //         content: "<canvas id='chart1' width='500' height='350' >"
        //     });
        //     oBox.addItem(oHTML);

        //     oHTML.attachEvent("afterRendering", function () {

        //         // 데이터 설정
        //         const data = {
        //             labels: aOrg,
        //             datasets: [
        //                 {
        //                     label: "매출액",
        //                     data: aSale,
        //                     yAxisID: "y",
        //                 },
        //                 {
        //                     label: "누적 백분률",
        //                     data: aRate,
        //                     yAxisID: "y1",
        //                     type: "line"
        //                 },
        //             ]
        //         };

        //         //차트 설정
        //         const options = {
        //             responsive: true,
        //             plugins: {
        //                 title: {
        //                     display: false,
        //                     text: "매출 파레트 차트",
        //                     position: "top"
        //                 },
		// 				legend:{
		// 					position:'bottom'
		// 				}
        //             },
        //             scales: {
        //                 y: {
        //                     title:{
        //                         display: true,
        //                         text: "매출액(억원)",
        //                     },
        //                     position: "left",
        //                     stacked: true,
        //                     ticks:{
        //                         callback:function(value){
        //                             if(value % 100000000 === 0){
        //                                 return(value / 100000000).toLocaleString();
        //                             };
        //                         }
        //                     }
        //                 },
        //                 y1: {
        //                     title:{
        //                         display: true,
        //                         text: "누적 백분률(%)",
        //                     },
        //                     position: "right",
        //                     min: 0,
        //                     max: 100,
        //                     grid: {
        //                         display: false
        //                     }
        //                 }
        //             },
		// 			clip:20,
		// 			elements:{
		// 				line:{
		// 					tension:0.4
		// 				}
		// 			}
        //         };
                
        //         if(Chart.getChart('chart1')){
        //             Chart.getChart('chart1').destroy();
        //         };

        //         const ctx = document.getElementById('chart1');
        //         new Chart(ctx, {
        //             type: 'bar',
        //             data: data,
        //             options: options,
        //         });
        //     }.bind(this));
        // },

		

		
	});
});