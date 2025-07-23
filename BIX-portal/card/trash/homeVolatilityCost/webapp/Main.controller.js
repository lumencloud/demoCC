sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/HTML",
    "sap/ui/core/EventBus"
], function (Controller, ODataModel, HTML, EventBus) {
	"use strict";

	return Controller.extend("bix.card.homeVolatilityCost.Main", {
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
            const oBinding = oModel.bindContext(`/get_home_chart_volatility_cost(year='${sYear}',org_id='${sOrgId}')`);
            let aChartData = await oBinding.requestObject();
            let aLabel = []
            let aSale = []
            let aCos = []
            let aSgna = []

            aChartData.value.forEach(data =>{
                aLabel.push(data.month)
                aSale.push(data.sale)
                aCos.push(data.cos)
                aSgna.push(data.sgna)
            })
            let oBox = this.byId("chartBox5");
            oBox.removeAllItems();

            const oHTML = new HTML({
                content: "<canvas id='chart01' width='550' height='480' >"
            });
            oBox.addItem(oHTML);

            oHTML.attachEventOnce("afterRendering", function () {
                const ctx = document.getElementById('chart01');

                // 데이터 설정
                const data = {
                    labels: aLabel,
                    datasets: [
                        {
                            label: "매출(원)",
                            data: aSale,
                            yAxisID: "y",
                        },
                        {
                            label: "기초원가(프로젝트비용 등)(원)",
                            data: aCos,
                            yAxisID: "y",
                            type: "line"
                        },
                        {
                            label: "사업SG&A(원)",
                            data: aSgna,
                            yAxisID: "y",
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