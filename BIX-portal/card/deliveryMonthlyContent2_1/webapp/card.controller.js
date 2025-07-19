sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.deliveryMonthlyContent2_1.card", {
        _aCanvasId: [],
        _aContainerId: [],
        _oEventBus: EventBus.getInstance(),
        _oMyChart: [],


        onInit: function () {
            // component별 id 설정
            this._createId();

            // 차트 설정
            // this._setChart();

            this._oEventBus.subscribe("aireport", "deliContent2_1", this._setChart, this);

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

        _updateChart: async function (sChannel, sEventId, oData) {
            this.getOwnerComponent().oCard.setBusy(true);
            let aResults = await this._dataSetting(oData.data);

            this._oMyChart[0].data.labels = aResults.aLabel
            this._oMyChart[0].data.datasets[0].data = aResults.aMarginRate
            this._oMyChart[0].data.datasets[1].data = aResults.aMarginRateTarget
            this._oMyChart[0].data.datasets[2].data = aResults.aSales
            this._oMyChart[0].data.datasets[3].data = aResults.aSalesTarget
            this._oMyChart[0].data.datasets[4].data = aResults.aMargin
            this._oMyChart[0].data.datasets[5].data = aResults.aMarginTarget
            this._oMyChart[0].update();
            this.dataLoad();
            setTimeout(() => {
                this.getOwnerComponent().oCard.setBusy(false);
            }, 300)
        },

        _setChart: async function (sChannel, sEventId, oData) {
            this.byId("cardContent").setBusy(true)
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 90);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 90);

            let orange = "#ff7a01"
            let red = "#ea002d"
            let lightGray = "#EDF0F4"
            let gray = "#595959"

            this._oEventBus.subscribe("aireport", "deliContent2_1", this._updateChart, this);

            for (let i = 0; i < this._aCanvasId.length; i++) {
                let oHTML = this.byId("html" + i);
                oHTML.setContent(`<div id='${this._aContainerId[i]}' class='custom-chart-container' style='width:950px; height:360px; min-height:360px'><canvas id='${this._aCanvasId[i]}' /></div>`);
                oHTML.attachEvent("afterRendering", async function () {
                    // 차트 구성
                    const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId[i])).getContext("2d");
                    //데이터 요청
                    let aData = await this._dataSetting(oData.data);
                    this._oMyChart[i] = new Chart(ctx, {
                        type: "bar",
                        data: {
                            labels: aData.aLabel,
                            datasets: [

                                {
                                    label: "당월 마진율",
                                    data: aData.aMarginRate,
                                    backgroundColor: orange,
                                    borderColor: orange,
                                    type: "line",
                                    yAxisID: 'y1',
                                    datalabels: {
                                        color: orange,
                                        offset: -25,
                                        size: 12,
                                    },

                                },
                                {
                                    label: "목표 마진율",
                                    data: aData.aMarginRateTarget,
                                    backgroundColor: gray,
                                    borderColor: gray,
                                    type: "line",
                                    yAxisID: 'y1',
                                    borderWidth: 2,
                                    borderDash: [5, 5],
                                },
                                {
                                    label: "당월 실적(매출)",
                                    data: aData.aSales,
                                    backgroundColor: red,
                                    yAxisID: "y",
                                    stack: 1,
                                    datalabels: {
                                        color: "black",
                                        offset: 5,
                                        size: 12,
                                    },

                                },
                                {
                                    label: "목표 실적(매출)",
                                    data: aData.aSalesTarget,
                                    backgroundColor: lightGray,
                                    yAxisID: "y",
                                    stack: 1,
                                    datalabels: {
                                        color: red,
                                        offset: - 20,
                                        size: 12,
                                    },

                                },

                                {
                                    label: "당월 실적(마진)",
                                    data: aData.aMargin,
                                    backgroundColor: red,
                                    yAxisID: "y",
                                    stack: 2,
                                    datalabels: {
                                        color: "black",
                                        offset: 5,
                                        size: 12,
                                    },
                                },
                                {
                                    label: "목표 실적(마진)",
                                    data: aData.aMarginTarget,
                                    backgroundColor: lightGray,
                                    yAxisID: "y",
                                    stack: 2,
                                    datalabels: {
                                        color: red,
                                        offset: - 20,
                                        size: 12,
                                    },

                                },



                            ]
                        },

                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: {
                                padding: {
                                    top: 40,
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                }
                            },
                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'bottom',
                                    tooltip: {
                                        enabled: false
                                    },
                                    labels: {
                                        usePointStyle: true,
                                        generateLabels(chart) {
                                            return [
                                                {
                                                    text: '당월 마진율',
                                                    fillStyle: orange,
                                                    strokeStyle: orange,
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 0,
                                                    pointStyle: 'line',
                                                    pointBackgroundColor: orange,
                                                    pointBorderColor: "white",
                                                    pointBorderWidth: 3,
                                                    pointRadius: 6,
                                                },
                                                {
                                                    text: '목표 마진율',
                                                    fillStyle: gray,
                                                    strokeStyle: gray,
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 1,
                                                    pointStyle: 'line',
                                                    pointBackgroundColor: gray,
                                                    pointBorderColor: "white",
                                                    pointBorderWidth: 3,
                                                    pointRadius: 6,
                                                },
                                                {
                                                    text: '목표 실적',
                                                    fillStyle: lightGray,
                                                    strokeStyle: lightGray,
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 2,
                                                    pointStyle: 'rect'
                                                },
                                                {
                                                    text: '당월 실적',
                                                    fillStyle: red,
                                                    strokeStyle: red,
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 3,
                                                    pointStyle: 'rect'
                                                }

                                            ]
                                        }
                                    }

                                },
                                datalabels: {
                                    clip: false,
                                    display:
                                        function (context) {
                                            if (context.dataset.label === '목표 마진율') {
                                                return false
                                            } else {
                                                if (context.dataset.label === '목표 실적(마진)') {
                                                    if (context.chart.data.datasets[4].data[context.dataIndex] < 100000000) {
                                                        return false
                                                    }
                                                }

                                                if (context.dataset.label === '목표 실적(매출)') {
                                                    if (context.chart.data.datasets[2].data[context.dataIndex] < 100000000) {
                                                        return false
                                                    }
                                                }
                                                return true
                                            }
                                        },
                                    color: red,
                                    anchor: 'start',
                                    align: 'bottom',
                                    font: {
                                        weight: 'bold',
                                        size: 12
                                    },
                                    offset: -3,
                                    formatter: function (value, context) {
                                        if (context.dataset.label === '당월 실적(마진)') {
                                            return "마진"
                                        } else if (context.dataset.label === '당월 실적(매출)') {
                                            return "매출"
                                        } else if (context.dataset.label === '목표 실적(마진)') {
                                            value = context.chart.data.datasets[4].data[context.dataIndex]
                                        } else if (context.dataset.label === '목표 실적(매출)') {
                                            value = context.chart.data.datasets[2].data[context.dataIndex]
                                        }

                                        if (value > 100) {
                                            var oNumberFormat = NumberFormat.getFloatInstance({
                                                groupingEnabled: true,
                                                groupingSeparator: ',',
                                                groupingSize: 3,
                                                decimals: 0
                                            });
                                            return oNumberFormat.format(value / 100000000);
                                        } else if (value <= 100) {
                                            var oNumberFormat = NumberFormat.getFloatInstance({
                                                groupingEnabled: true,
                                                groupingSeparator: ',',
                                                groupingSize: 3,
                                                decimals: 1
                                            });
                                            return oNumberFormat.format(value) + "%";
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    stacked: true,
                                    barPercentage: 1,
                                    categoryPercentage: 1,
                                    border: {
                                    },
                                    grid: {
                                        display: false
                                    },
                                    ticks: {
                                        padding: 20,
                                        font: {
                                            size: 13,
                                            weight: 500
                                        },

                                    }
                                },
                                y: {
                                    type: "linear",
                                    display: true,
                                    position: 'left',
                                    stacked: true,
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
                                        display: false,
                                        text: '금액(억원)',
                                        padding: {
                                            top: 0,
                                            bottom: 0,
                                        }


                                    },


                                },
                                y1: {
                                    type: "linear",
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
                                    title: {
                                        display: false,
                                        text: '마진율(%)',
                                    }


                                }


                            }
                        },
                        plugins: [ChartDataLabels],

                    })

                    //this._ovserveResize(this.byId(this._aContainerId[i]), i)
                }.bind(this));
                
            }
            this.dataLoad();
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

        _dataSetting: async function (oData) {
            // let aResults = await this._setData();
            let aResults = oData;
            let aData;
            let aLabel = [];
            let aSalesTarget = [];
            let aSales = [];
            let aMargin = [];
            let aMarginTarget = [];
            let aMarginRate = [];
            let aMarginRateTarget = [];

            aResults.forEach(
                function (result) {
                    aLabel.push(result.org_name)
                    aMargin.push(result.margin)
                    aSales.push(result.sale)
                    aSalesTarget.push(result.sale_target - result.sale)
                    aMarginTarget.push(result.margin_target - result.margin)
                    aMarginRate.push(result.margin_rate)
                    if (result.sale_target === 0) {
                        aMarginRateTarget.push(0)
                    } else {
                        aMarginRateTarget.push(result.margin_target / result.sale_target * 100)
                    }
                }
            )

            aData = { aLabel, aMargin, aSales, aSalesTarget, aMarginTarget, aMarginRate, aMarginRateTarget }

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

            let sPath = `/get_actual_m_sale_org_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',org_tp='${sType}')`

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