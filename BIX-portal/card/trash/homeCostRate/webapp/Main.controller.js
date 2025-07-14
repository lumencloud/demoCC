sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/HTML",
    "sap/ui/core/EventBus"

], function (Controller, ODataModel, HTML, EventBus) {
    "use strict";

    return Controller.extend("bix.card.homeCostRate.Main", {
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
            const oBinding = oModel.bindContext(`/get_home_chart_sgna_pie(year='${sYear}',month='${sMonth}',org_id='${sOrgId}')`);
            let aChartData = await oBinding.requestObject();
            let aLabel = []
            let aData = []
            aChartData.value.forEach(element => {
                aLabel.push(element.type)
                aData.push({ "amount": element.amount, "percent": element.rate })
            });
            let oBox = this.byId("chartBox01");
            oBox.removeAllItems();

            const oHTML = new HTML({
                content: "<canvas id='chart02' width='255' height='255' >"
            });
            oBox.addItem(oHTML);

            oHTML.attachEvent("afterRendering", function () {
                const ctx = document.getElementById('chart02');
                // 데이터 설정
                const data = {
                    labels: aLabel,
                    datasets: [
                        {
                            label: "data",
                            data: aData,
                            backgroundColor: ['red', 'blue', 'yellow']
                        }
                    ]
                };
                //차트 설정
                const options = {
                    parsing: {
                        key: 'amount'
                    },
                    plugins: {
                        title: {
                            display: false,
                            text: "비용 구성",
                            position: "top"
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const dataItem = context.raw;
                                    return [
                                        `amount: ${dataItem.amount.toLocaleString()}`,
                                        `percent: ${dataItem.percent}%`
                                    ]
                                }
                            }
                        }
                    }
                };

                new Chart(ctx, {
                    type: 'pie',
                    data: data,
                    options: options,
                });
            }.bind(this));
        },
    });
});