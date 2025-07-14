sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.deliveryMonthlyContent2_4.card", {
        _aCanvasId: [],
        _aContainerId: [],
        _oEventBus: EventBus.getInstance(),
        _oMyChart: [],


        onInit: function () {
            // component별 id 설정
            this._createId();

            // 차트 설정
            this._setChart();

            this._oEventBus.subscribe("aireport", "infoSet", this._updateChart, this);



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

        _updateChart: async function () {
            this.byId("cardContent").setBusy(true)
            let aResults = await this._dataSetting();

            this._oMyChart[0].data.labels = aResults.aLabel
            this._oMyChart[0].data.datasets[0].data = aResults.aLabor
            this._oMyChart[0].data.datasets[1].data = aResults.aInvest
            this._oMyChart[0].data.datasets[2].data = aResults.aExpense
            // this._oMyChart[0].data.datasets[3].data = aResults.aTotal
            this._oMyChart[0].config._config.options.plugins.groupLabels.labels = aResults.aTotal
            // this._oMyChart[0]._total = aResults.aTotal;
            this._oMyChart[0].update();
            this.byId("cardContent").setBusy(false)
        },


        _setChart: async function () {
            this.byId("cardContent").setBusy(true)
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            let aTotal = {
                id: "aTotal",
                afterDatasetsDraw(chart, args, pluginOptions) {

                    const ctx = chart.ctx;
                    const { bottom, top } = chart.chartArea;
                    const xScale = chart.scales.x;
                    const aTotal = chart.options.plugins.groupLabels.labels;

                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.font = 'bold 12px sans-serif'
                    ctx.fillStyle = '#222'

                    xScale.ticks.forEach((tick, i) => {
                        if (aTotal && aTotal[i] !== undefined) {
                            const x = xScale.getPixelForTick(i);
                            const y = xScale.bottom + 5;
                            const val = (aTotal[i] / 10000000).toFixed(0).toLocaleString() + "억";
                            ctx.fillText(val, x, y)
                        }
                    })
                    ctx.restore();
                }
            }

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 90);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 90);

            for (let i = 0; i < this._aCanvasId.length; i++) {
                let oHTML = this.byId("html" + i);
                oHTML.setContent(`<div id='${this._aContainerId[i]}' class='custom-chart-container' style='width:950px; height:380px; min-height:380px'><canvas id='${this._aCanvasId[i]}' /></div>`);
                oHTML.attachEvent("afterRendering", async function () {
                    // 차트 구성
                    const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId[i])).getContext("2d");
                    //데이터 요청
                    let aData = await this._dataSetting();
                    this._oMyChart[i] = new Chart(ctx, {
                        type: "bar",
                        data: {
                            labels: aData.aLabel,
                            datasets: [

                                {
                                    label: "NB 인건비",
                                    data: aData.aLabor,
                                    backgroundColor: "red",
                                    yAxisID: "y",
                                    order: 1

                                },
                                {
                                    label: "투자비",
                                    data: aData.aInvest,
                                    backgroundColor: "#d85871",
                                    yAxisID: "y",
                                    order: 2
                                },
                                {
                                    label: "경비",
                                    data: aData.aExpense,
                                    backgroundColor: "pink",
                                    yAxisID: "y",
                                    order: 2
                                },
                                // {
                                //     label: "Total",
                                //     data: aData.aTotal,
                                //     backgroundColor: "black",
                                //     yAxisID: "y",
                                //     order: 2,
                                //     display: false
                                // },
                            ]
                        },

                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: {
                                padding: {
                                    top: 10,
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                }
                            },
                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'bottom',
                                    padding: 100,
                                    labels: {
                                        usePointStyle: true,
                                        padding: 30,
                                        generateLabels(chart) {
                                            return [
                                                {
                                                    text: 'NB 인건비',
                                                    fillStyle: 'red',
                                                    strokeStyle: 'red',
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 0,
                                                    pointStyle: 'rect'
                                                },
                                                {
                                                    text: '투자비',
                                                    fillStyle: '#d85871',
                                                    strokeStyle: '#d85871',
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 1,
                                                    pointStyle: 'rect'
                                                },
                                                {
                                                    text: '경비',
                                                    fillStyle: 'pink',
                                                    strokeStyle: 'pink',
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 2,
                                                    pointStyle: 'rect'
                                                }
                                            ]
                                        }
                                    }
                                },
                                datalabels: {
                                    clip: false,
                                    color: function (context) {
                                        if (context.dataset.label === 'Total') {
                                            return "black"
                                        } else if (context.dataset.label === '경비') {
                                            return "pink"
                                        } else if (context.dataset.label === '투자비') {
                                            return "#d85871"
                                        } else if (context.dataset.label === 'NB 인건비') {
                                            return "red"
                                        }
                                    },
                                    anchor: 'end',
                                    align: function (context) {
                                        if (context.dataset.label === 'Total') {
                                            return "top"
                                        } else {
                                            return "top"
                                        }
                                    },
                                    font: {
                                        size: 9 // bar 에서 출력하는 데이터 사이즈
                                    },
                                    offset: function (context) {
                                        if (context.dataset.label === 'Total') {
                                            return "1"
                                        } else {
                                            return "5"
                                        }
                                    },
                                    display: function (context) {
                                        if (context.dataset.label === 'Total') {
                                            return "true"
                                        } else {
                                            if (context.dataset.data[context.dataIndex] <= 100000000) {
                                                return false;
                                            } else { return true; }
                                        }
                                    },
                                    formatter: function (value, context) {
                                        var oNumberFormat = NumberFormat.getIntegerInstance({
                                            groupingEnabled: true,
                                            groupingSeparator: ',',
                                            groupingSize: 3,
                                            decimals: 0
                                        });

                                        if (context.dataset.label === 'Total') {
                                            if (context.chart.data.datasets[0].data[context.dataIndex] < 0) { context.chart.data.datasets[0].data[context.dataIndex] = 0 }
                                            if (context.chart.data.datasets[1].data[context.dataIndex] < 0) { context.chart.data.datasets[1].data[context.dataIndex] = 0 }
                                            if (context.chart.data.datasets[2].data[context.dataIndex] < 0) { context.chart.data.datasets[2].data[context.dataIndex] = 0 }
                                            value = Number(oNumberFormat.format(context.chart.data.datasets[0].data[context.dataIndex] / 100000000))
                                                + Number(oNumberFormat.format(context.chart.data.datasets[1].data[context.dataIndex] / 100000000))
                                                + Number(oNumberFormat.format(context.chart.data.datasets[2].data[context.dataIndex] / 100000000));
                                            if (value === 0) { return null }
                                            return value
                                        } else {
                                            return oNumberFormat.format(value / 100000000);
                                        }
                                    }
                                }, groupLabels: {
                                    labels: aData.aTotal,
                                }
                            },

                            scales: {
                                x: {
                                    stacked: false,
                                    border: {
                                    },
                                    grid: {
                                        display: false
                                    },
                                    ticks: {
                                        font: {
                                            size: 10,
                                            weight: 500
                                        },
                                    }
                                },
                                y: {
                                    type: "linear",
                                    display: true,
                                    position: 'top',
                                    ticks: {
                                        callback: function (value) {
                                            if (value % 100000000 === 0) {
                                                return (value / 100000000).toLocaleString() + '억';
                                            };
                                        }
                                    },
                                    beginAtZero: true,
                                    min: 0,
                                    title: {
                                        display: true,
                                        text: '금액(억원)',
                                        padding: {
                                            top: 0,
                                            bottom: 0,
                                        }
                                    },
                                },
                            }
                        },
                        plugins: [ChartDataLabels, aTotal],

                    })
                    this.dataLoad();

                    this._ovserveResize(this.byId(this._aContainerId[i]), i)
                }.bind(this));

            }
            this.byId("cardContent").setBusy(false)
        },

        dataLoad: function () {
            const oEventBus = sap.ui.getCore().getEventBus();
            oEventBus.publish("CardChannel", "CardFullLoad", {
                cardId: this.getView().getId()
            })
        },
        _ovserveResize: function (oElement, i) {

            if (!this._resizeObserver) {
                this._resizeObserver = new ResizeObserver(() => {
                    this._oMyChart[i].resize()
                })
                   
            }
        },

        _dataSetting: async function () {
            let aResults = await this._setData();
            let aData;
            let aLabel = [];
            let aLabor = [];
            let aInvest = [];
            let aExpense = [];
            let aTotal = [];

            aResults.forEach(
                function (result) {
                    aLabel.push(result.org_name)
                    aLabor.push(result.labor)
                    aInvest.push(result.invest)
                    aExpense.push(result.expense)
                    aTotal.push(result.expense + result.invest + result.labor)
                }
            )

            // const aDisplayLabel = aLabel.map((label, index) => {
            //     const totalVal = aTotal[index];
            //     return totalVal
            //         ? label + "\n" + (totalVal / 10000000).toLocaleString() + "억"
            //         : label;
            // })

            aData = { aLabel, aLabor, aInvest, aExpense, aTotal }

            return aData;
        },






        _setData: async function () {
            let oData = JSON.parse(sessionStorage.getItem("aiReport"));
            // 파라미터
            let iYear = oData.year
            let sMonth = oData.month
            let sOrgId = oData.orgId;
            let sType = oData.type


            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            let sPath = `/get_actual_m_sga(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',org_tp='${sType}')`

            let aData;

            await Promise.all([
                oModel.bindContext(sPath).requestObject(),
            ]).then(function (aResults) {
                aData = aResults[0].value
            }.bind(this))
                .catch((oErr) => {
                    Module.displayStatus(this.getOwnerComponent().oCard, oErr.error.code, this.byId("cardContent"));
                });
            return aData;
        },
    });
});           