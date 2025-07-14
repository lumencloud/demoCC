sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.allMonthlyContent2_1.card", {
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
            this.getOwnerComponent().oCard.setBusy(true);
            let aResults = await this._dataSetting();

            this._oMyChart[0].data.labels = aResults.aLabel
            this._oMyChart[0].data.datasets[0].data = aResults.aMarginRate
            this._oMyChart[0].data.datasets[1].data = aResults.aSales
            this._oMyChart[0].data.datasets[2].data = aResults.aEmpty
            this._oMyChart[0].data.datasets[3].data = aResults.aSalesTarget
            this._oMyChart[0].data.datasets[4].data = aResults.aMargin
            this._oMyChart[0].data.datasets[5].data = aResults.aEmpty
            this._oMyChart[0].data.datasets[6].data = aResults.aMarginTarget
            this._oMyChart[0].config._config.options.plugins.groupLabels.divNameSums = aResults.divNameSums
            this._oMyChart[0].config._config.options.plugins.groupLabels.labels = aResults.aSubLabel

            this._oMyChart[0].update();
            this.getOwnerComponent().oCard.setBusy(false);
        },

        _setChart: async function () {
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            let subLabels = {
                id: "subLabels",
                afterDatasetsDraw(chart, args, pluginOptions) {

                    const ctx = chart.ctx;
                    const { bottom, top } = chart.chartArea;
                    const xScale = chart.scales.x;
                    const aSubLabel = chart.options.plugins.groupLabels.labels;
                    const divNameSums = chart.options.plugins.groupLabels.divNameSums;
                    let grouped = {}
                    aSubLabel.forEach((divName, idx) => {
                        if (!grouped[divName]) {
                            grouped[divName] = { start: idx , end: idx };
                        } else {
                            grouped[divName].end = idx;
                        }
                    })

                    const sumMap = new Map();
                    divNameSums.forEach(obj => {
                        sumMap.set(obj.div_name, obj.sum);
                    })

                    const groupNames = Object.keys(grouped);
                    groupNames.forEach((divName, i) => {
                        let info = grouped[divName];
                        let centerIdx = (info.start + info.end) / 2;
                        let labelX = xScale.getPixelForValue(centerIdx);

                        // 1. 부문명
                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.font = 'bold 12px sans-serif'
                        ctx.fillStyle = '#222'
                        ctx.fillText(divName, labelX, bottom + 65);

                        // 2. 금액(합계)
                        let sumValue = sumMap.get(divName);
                        if (sumValue !== undefined) {
                            let format = sumValue.toFixed(0) + '억';
                            let sign = sumValue >= 0 ? '+' : '-';
                            let color = sumValue >= 0 ? "#222" : "red";
                            ctx.font = 'bold 12px sans-serif'
                            ctx.fillStyle = color
                            ctx.fillText(sign + format, labelX, bottom + 85)
                        }

                        ctx.restore();
                 
                        if (i === groupNames.length - 1) { return; }

                        let lastIdx = info.end;
                        let lineX = xScale.getPixelForValue(lastIdx) + 30;
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(lineX, bottom);
                        ctx.lineTo(lineX, bottom + 140);
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([4.2]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.restore();
                    })
                }
            }

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 90);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 90);

            for (let i = 0; i < this._aCanvasId.length; i++) {
                let oHTML = this.byId("html" + i);
                oHTML.setContent(`<div id='${this._aContainerId[i]}' class='custom-chart-container' style='width:950px; height:400px; min-height:400px'><canvas id='${this._aCanvasId[i]}' /></div>`);
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
                                    label: "당월 마진율",
                                    data: aData.aMarginRate,
                                    backgroundColor: "red",
                                    borderColor: "red",
                                    type: "line",
                                    yAxisID: 'y1',
                                    datalabels: {
                                        color: "red",
                                        offset: -25,
                                        size: 8,
                                    },

                                },
                                {
                                    label: "당월 실적(매출)",
                                    data: aData.aSales,
                                    backgroundColor: "red",
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
                                        color: "red",
                                        offset: 0,
                                        size: 12,
                                        anchor: 'start',
                                        align: 'top'
                                    },
                                },
                                {
                                    label: "목표 실적(매출)",
                                    data: aData.aSalesTarget,
                                    backgroundColor: "#ddd",
                                    yAxisID: "y",
                                    stack: 1,


                                },

                                {
                                    label: "당월 실적(마진)",
                                    data: aData.aMargin,
                                    backgroundColor: "red",
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
                                        color: "red",
                                        offset: 0,
                                        size: 12,
                                        anchor: 'end',
                                        align: 'top'
                                    },
                                },
                                {
                                    label: "목표 실적(마진)",
                                    data: aData.aMarginTarget,
                                    backgroundColor: "#ddd",
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
                                    bottom: 40,
                                    left: 0,
                                    right: 0,
                                }
                            },
                            plugins: {
                                legend: {
                                    display: false,
                                    position: 'bottom',
                                    labels: {
                                        usePointStyle: true,
                                        generateLabels(chart) {
                                            return [
                                                {
                                                    text: '당월 마진율',
                                                    fillStyle: 'red',
                                                    strokeStyle: 'red',
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 0,
                                                    pointStyle: 'line'
                                                },
                                                {
                                                    text: '목표 마진율',
                                                    fillStyle: 'pink',
                                                    strokeStyle: 'pink',
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 1,
                                                    pointStyle: 'line'
                                                },
                                                {
                                                    text: '목표 실적',
                                                    fillStyle: '#ddd',
                                                    strokeStyle: '#ddd',
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 2,
                                                    pointStyle: 'rect'
                                                },
                                                {
                                                    text: '당월 실적',
                                                    fillStyle: 'red',
                                                    strokeStyle: 'red',
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
                                        if (context.dataset.label === '당월 실적(마진)') {
                                            return "마진"
                                        } else if (context.dataset.label === '당월 실적(매출)') {
                                            return "매출"
                                        } else if (context.dataset.label === 'empty(마진)') {
                                            value = context.chart.data.datasets[4].data[context.dataIndex]
                                        } else if (context.dataset.label === 'empty(매출)') {
                                            value = context.chart.data.datasets[1].data[context.dataIndex]
                                        }

                                        if (value > 100) {
                                            var oNumberFormat = NumberFormat.getIntegerInstance({
                                                groupingEnabled: true,
                                                groupingSeparator: ',',
                                                groupingSize: 3,
                                                decimals: 0
                                            });
                                            if (value < 100000000) {
                                                return 0
                                            } else {
                                                return oNumberFormat.format(value / 100000000);
                                            }
                                        } else if (value <= 100 && value >= 0) {
                                            var oNumberFormat = NumberFormat.getIntegerInstance({
                                                groupingEnabled: true,
                                                groupingSeparator: ',',
                                                groupingSize: 3,
                                                decimals: 1
                                            });
                                            return oNumberFormat.format(value) + "%";
                                        } else if (value < 0) {
                                            return null;
                                        }
                                    }
                                }, groupLabels: {
                                    labels: aData.aSubLabel,
                                    divNameSums: aData.divNameSums
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
                                            size: 8,
                                            weight: 600
                                        },
                                        maxRotation : 0,
                                        minRotation : 0

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
                        plugins: [ChartDataLabels, subLabels],

                    })

                    this.dataLoad();


                    this._ovserveResize(this.byId(this._aContainerId[i]), i)
                }.bind(this));
            }
        },

        dataLoad: function () {
            const oEventBus = sap.ui.getCore().getEventBus();
            oEventBus.publish("CardChannel", "CardFullLoad", {
                cardId: this.getView().getId()
            })
        },

        _dataSetting: async function () {
            let aResults = await this._setData();
            let aData;
            let aSales = [];
            let aSalesTarget = [];
            let aMargin = [];
            let aMarginTarget = [];
            let aMarginRate = [];
            let aMarginRateTarget = [];
            let aLabel = [];
            let aSubLabel = [];
            let aEmpty = [];
            aResults.sort((a, b) => a.div_name.localeCompare(b.div_name));

            let divNamesOrdered = aResults.map(item => item.div_name).filter((v, i, arr) => arr.indexOf(v) === i);
            let divNameSums = divNamesOrdered.map(divName => ({
                div_name: divName,
                sum: aResults.filter(item => item.div_name === divName && item.type === "매출").reduce((sum, item) => sum + Number(item.div_value) / 100000000, 0)
            }))
            aResults.forEach(
                function (result) {
                    if (result.type === "매출") {
                        aSales.push(result.actual_curr_ym_value)
                        aSalesTarget.push(result.target_curr_y_value * 100000000 - result.actual_curr_ym_value)
                        aLabel.push(result.account_nm)
                        aSubLabel.push(result.div_name)

                    } else if (result.type === "마진") {
                        aMargin.push(result.actual_curr_ym_value)
                        aMarginTarget.push(
                            function () {
                                if (result.target_curr_y_value === 0) {
                                    return 0
                                } else {
                                    return result.target_curr_y_value * 100000000 - result.actual_curr_ym_value
                                }
                            }
                        )
                        aEmpty.push(0)
                    } else if (result.type === "마진율") {
                        aMarginRate.push(result.actual_curr_ym_value * 100)
                        aMarginRateTarget.push(result.target_curr_y_value * 100000000)
                    }

                }
            )
            aData = { aLabel, aMargin, aSales, aSalesTarget, aMarginTarget, aMarginRate, aMarginRateTarget, aEmpty, aSubLabel, divNameSums }


            return aData;
        },
        _ovserveResize: function (oElement, i) {

            if (!this._resizeObserver) {
                this._resizeObserver = new ResizeObserver(() => {
                    this._oMyChart[i].resize()
                })
                this._resizeObserver.observe(oElement)
            }
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

            let sOrgPath = `/get_actual_m_account_sale_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`

            let aData;
            await Promise.all([
                oModel.bindContext(sOrgPath).requestObject(),
            ]).then(function (aResults) {

                aData = aResults[0].value.map(oObj => {
                    oObj["account_nm"] = oObj["account_nm"].substring(4);
                    return oObj;
                });
            }.bind(this))
                .catch((oErr) => {
                    Module.displayStatus(this.getOwnerComponent().oCard, oErr.error.code, this.byId("cardContent"));
                });
                

            return aData;
        },


    });
});           