sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/HTML",
    "sap/ui/core/EventBus"
], function (Controller, ODataModel, HTML, EventBus) {
	"use strict";

	return Controller.extend("bix.card.homeYearBr.Main", {
        _oEventBus: EventBus.getInstance(),

        onInit: function () {
            this._oEventBus.subscribe("home", "search", this._setChart, this);
          },
          onAfterRendering: function () {
            this._setChart();
          },
    
          _setChart: async function (sChannelId, sEventId, oData) {
            if (!oData) {
                var sOrgId = '5';
                var sYear = new Date().getFullYear();
                var sMonth = String(new Date().getMonth() + 1).padStart(2, "0");
              } else {
                var sOrgId = oData.orgId;
                var sYear = oData.year;
                var sMonth = oData.month;
              }
                  
            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl-api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });
            const oBinding = oModel.bindContext(`/get_home_chart_year(year='${sYear}',range='3',org_id='${sOrgId}')`);
            let aChartData = await oBinding.requestObject();
            let aYear = []
            let aInvest = []
            let aBr = []
            let aRohc = []

            aChartData.value.forEach(data =>{
                aYear.push(data.year)
                aInvest.push(data.invest)
                aBr.push(parseFloat(data.br))
                aRohc.push(parseFloat(data.rohc))
            })
            let oBox = this.byId("chartBox05");
            oBox.removeAllItems();

            const oHTML = new HTML({
                content: "<canvas id='chart05' width='300' height='300' >"
            });
            oBox.addItem(oHTML);

            oHTML.attachEvent("afterRendering", function () {
                const ctx = document.getElementById('chart05');

                // 데이터 설정
                const data = {
                    labels: aYear,
                    datasets: [
                        {
                            label: "K.투자비(원)",
                            data: aInvest,
                            yAxisID: "y",
                        },
                        {
                            label: "BR(%)",
                            data: aBr,
                            yAxisID: "y1",
                            type: "line"
                        },
                        {
                            label: "RoHC(%)",
                            data: aRohc,
                            yAxisID: "y1",
                            type: "line"
                        }
                    ]
                };

                //차트 설정
                const options = {
                    responsive: true,
                    plugins: {
                        title: {
                            display: false,
                            text: "매출 대비 비용 변동성 추이",
                            position: "top"
                        }
                    },
                    scales: {
                        y: {
                            position: "left",
                            stacked: true
                        },
                        y1: {
                            position: "right",
                            min: 0,
                            max: 100,
                            grid: {
                                display: false
                            }
                        }
                    }
                };
                new Chart(ctx, {
                    type: 'bar',
                    data: data,
                    options: options,
                });
            }.bind(this));
        },
	});
});