
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.acountMonthlyContent2_2.card", {
        _aCanvasId: [],
        _aContainerId: [],
        _oEventBus: EventBus.getInstance(),
        _oMyChart: [],


        onInit: function () {
            // component별 id 설정
            this._createId();

            // 차트 설정
            // this._setChart();

            this._oEventBus.subscribe("aireport", "accountContent2_2", this._setChart, this);

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
            this._oMyChart[0].data.datasets[0].data = aResults.aRodr
            this._oMyChart[0].data.datasets[1].data = aResults.aEmpty
            this._oMyChart[0].data.datasets[2].data = aResults.aSales
            this._oMyChart[0].data.datasets[3].data = aResults.aEmpty

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

            this._oEventBus.subscribe("aireport", "accountContent2_2", this._updateChart, this);

            for (let i = 0; i < this._aCanvasId.length; i++) {
                let oHTML = this.byId("html" + i);
                oHTML.setContent(`<div id='${this._aContainerId[i]}' class='custom-chart-container' style='width:950px; height:320px;'><canvas id='${this._aCanvasId[i]}' /></div>`);
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
                                    label: "수주",
                                    data: aData.aRodr,
                                    backgroundColor: "pink",
                                    yAxisID: "y",
                                    stack: 1,


                                },
                                {
                                    label: "empty(수주)",
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
                                    label: "매출",
                                    data: aData.aSales,
                                    backgroundColor: "red",
                                    yAxisID: "y",
                                    stack: 2,


                                },

                                {
                                    label: "empty(매출)",
                                    data: aData.aEmpty,
                                    yAxisId: "y",
                                    stack: 2,
                                    datalabels: {
                                        color: "red",
                                        offset: 0,
                                        size: 12,
                                        anchor: 'start',
                                        align: 'top'
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
                                    display: false,
                                    position: 'bottom',
                                },
                                tooltip: {
                                    enabled: false
                                },
                                datalabels: {
                                    clip: false,
                                    display: true,
                                    color: 'red',
                                    anchor: 'start',
                                    align: 'bottom',
                                    font: {
                                        weight: 'bold',
                                        size: 12
                                    },
                                    offset: -3,
                                    formatter: function (value, context) {
                                        if (context.dataset.label === '수주') {
                                            return "수주"
                                        } else if (context.dataset.label === '매출') {
                                            return "매출"
                                        } else if (context.dataset.label === 'empty(수주)') {
                                            value = context.chart.data.datasets[0].data[context.dataIndex]
                                        } else if (context.dataset.label === 'empty(매출)') {
                                            value = context.chart.data.datasets[2].data[context.dataIndex]
                                        }


                                        if (value >= 100000000) {
                                            var oNumberFormat = NumberFormat.getFloatInstance({
                                                groupingEnabled: true,
                                                groupingSeparator: ',',
                                                groupingSize: 3,
                                                decimals: 0
                                            });

                                            return oNumberFormat.format(value / 100000000) + "억";

                                        } else if (value < 100000000 || value > 0) {
                                            return "0억"
                                        } else if (value <= 0) {
                                            return null;
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
            let aRodr = [];
            let aSales = [];
            let aEmpty = [];
            aResults.forEach(
                function (result) {
                    aLabel.push(result.org_name)
                    aRodr.push(result.rodr)
                    aSales.push(result.sale)
                    aEmpty.push(0)
                }
            )
            aData = { aLabel, aSales, aRodr, aEmpty }

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

            let sOrgPath = `/get_actual_m_sale_rodr_org_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`

            let aData;
            await Promise.all([
                oModel.bindContext(sOrgPath).requestObject(),
            ]).then(function (aResults) {
                // //console.log(aResults[0].value)       
                aData = aResults[0].value
            }.bind(this))
                .catch((oErr) => {
                    Module.displayStatus(this.getOwnerComponent().oCard, oErr.error.code, this.byId("cardContent"));
                });
            return aData;
        },

        dataLoad: function () {
            this._oEventBus.publish("CardChannel", "CardFullLoad", {
                cardId: this.getView().getId()
            })
        },
    });
});           