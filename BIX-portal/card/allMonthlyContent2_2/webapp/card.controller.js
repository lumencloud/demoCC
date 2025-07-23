sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.allMonthlyContent2_2.card", {
        _aCanvasId: [],
        _aContainerId: [],
        _oEventBus: EventBus.getInstance(),
        _oMyChart: [],


        onInit: function () {
            // component별 id 설정
            this._createId();
            this._oEventBus.publish("aireport", "isCardSubscribed");
            // 차트 설정
            // this._setChart();
            this._oEventBus.subscribe("aireport", "allContent2_2", this._setChart, this);
           
            this._oEventBus.subscribe("aireport", "setBusy", this._setBusy, this);

			this._setModel();
        },
        _setModel: function () {
			this.getView().setModel(new JSONModel({ bBusyFlag: true }), "ui")
		},
		_setBusy: function () {
			this.getView().setModel(new JSONModel({ bBusyFlag: true }), "ui")
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
           
            let aResults = await this._dataSetting(oData.data);

            this._oMyChart[0].data.labels = aResults.aLabel
            this._oMyChart[0].data.datasets[0].data = aResults.aMarginRate
            this._oMyChart[0].data.datasets[1].data = aResults.aMarginRateTarget
            this._oMyChart[0].data.datasets[2].data = aResults.aSales
            this._oMyChart[0].data.datasets[3].data = aResults.aEmpty
            this._oMyChart[0].data.datasets[4].data = aResults.aSalesTarget
            this._oMyChart[0].data.datasets[5].data = aResults.aMargin
            this._oMyChart[0].data.datasets[6].data = aResults.aEmpty
            this._oMyChart[0].data.datasets[7].data = aResults.aMarginTarget

            this.dataLoad();
            this._oMyChart[0].update();
            
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
            let gray = "#595959"
            let red = "#ea002d"
            let lightGray = "#edf0f4"

            this._oEventBus.subscribe("aireport", "allContent2_2", this._updateChart, this);

            for (let i = 0; i < this._aCanvasId.length; i++) {
                let oHTML = this.byId("html" + i);
                oHTML.setContent(`<div id='${this._aContainerId[i]}' class='custom-chart-container' style='width:950px; height:380px; min-height:380px'><canvas id='${this._aCanvasId[i]}' /></div>`);
                oHTML.attachEventOnce("afterRendering", async function () {
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
                                        size: 8,
                                    },
                                    fill: false,
                                    pointBackgroundColor: orange,
                                    pointBorderColor: "white",
                                    pointBorderWidth: 3,
                                    pointRadius: 6,

                                },
                                {
                                    label: "목표 마진율",
                                    data: aData.aMarginRateTarget,
                                    backgroundColor: gray,
                                    borderColor: gray,
                                    borderWidth: 2,
                                    borderDash: [5, 5],
                                    type: "line",
                                    yAxisID: 'y1'

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
                                    label: "empty(매출)",
                                    data: aData.aEmpty,
                                    yAxisId: "y",
                                    stack: 1,
                                    datalabels: {
                                        color: red,
                                        offset: 0,
                                        size: 12,
                                        anchor: 'start',
                                        align: 'top'
                                    },
                                },
                                {
                                    label: "목표 실적(매출)",
                                    data: aData.aSalesTarget,
                                    backgroundColor: lightGray,
                                    yAxisID: "y",
                                    stack: 1,


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
                                    label: "empty(마진)",
                                    data: aData.aEmpty,
                                    yAxisId: "y",
                                    stack: 2,
                                    datalabels: {
                                        color: red,
                                        offset: 0,
                                        size: 12,
                                        anchor: 'end',
                                        align: 'top'
                                    },
                                },
                                {
                                    label: "목표 실적(마진)",
                                    data: aData.aMarginTarget,
                                    backgroundColor: lightGray,
                                    yAxisID: "y",
                                    stack: 2,


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
                                                    pointStyle: 'line'
                                                },
                                                {
                                                    text: '목표 마진율',
                                                    fillStyle: gray,
                                                    strokeStyle: gray,
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 1,
                                                    pointStyle: 'line'
                                                },
                                                {
                                                    text: '목표 실적',
                                                    fillStyle: lightGray,
                                                    strokeStyle: lightGray,
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 4,
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
                                tooltip: {
                                    enabled: false
                                },
                                datalabels: {
                                    clip: false,
                                    display:
                                        function (context) {
                                            if (context.dataset.label === '목표 마진율') {
                                                return false
                                            } else {
                                                if (context.dataset.label === '목표 실적(마진)') {
                                                    return false
                                                }

                                                if (context.dataset.label === '목표 실적(매출)') {
                                                    return false

                                                }
                                                return true
                                            }
                                        },
                                    color: 'red',
                                    anchor: 'start',
                                    align: 'bottom',
                                    font: {
                                        weight: 'bold',
                                        size: 12
                                    },
                                    offset: -3,
                                    formatter: function (value, context) {
                                        if (context.dataset.label === '당월 마진율') {
                                            var oNumberFormat = NumberFormat.getFloatInstance({
                                                groupingEnabled: true,
                                                groupingSeparator: ',',
                                                groupingSize: 3,
                                                decimals: 1
                                            });
                                            return oNumberFormat.format(value) + "%";

                                        }
                                        else {


                                            if (context.dataset.label === '당월 실적(마진)') {
                                                return "마진"
                                            } else if (context.dataset.label === '당월 실적(매출)') {
                                                return "매출"
                                            } else if (context.dataset.label === 'empty(마진)') {
                                                value = context.chart.data.datasets[5].data[context.dataIndex]
                                            } else if (context.dataset.label === 'empty(매출)') {
                                                value = context.chart.data.datasets[2].data[context.dataIndex]
                                            }

                                            var oNumberFormat = NumberFormat.getFloatInstance({
                                                groupingEnabled: true,
                                                groupingSeparator: ',',
                                                groupingSize: 3,
                                                decimals: 0
                                            });
                                            if (value < 100000000) {
                                                return null
                                            } else {
                                                return oNumberFormat.format(value / 100000000);
                                            }
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
                                    grid: {
                                        display: false
                                    },
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
            this.getView().getModel("ui").setProperty("/bBusyFlag", false);
            this.byId("cardContent").setBusy(false);
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
            let aSales = [];
            let aSalesTarget = [];
            let aMargin = [];
            let aMarginTarget = [];
            let aMarginRate = [];
            let aMarginRateTarget = [];
            let aLabel = [];
            let aEmpty = [];
            aResults.forEach(
                function (result) {
                    aLabel.push(result.org_name)
                    aMargin.push(result.margin)
                    aSales.push(result.sale)
                    aSalesTarget.push(result.sale_target)
                    aMarginTarget.push(result.margin_target)
                    aMarginRate.push(result.margin_rate)
                    aMarginRateTarget.push(result.margin_rate_target)
                    aEmpty.push(0)

                }
            )

            aData = { aLabel, aMargin, aSales, aSalesTarget, aMarginTarget, aMarginRate, aMarginRateTarget, aEmpty }

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

            let sOrgPath = `/get_actual_m_sale_org_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`

            let aData;
            await Promise.all([
                oModel.bindContext(sOrgPath).requestObject(),
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