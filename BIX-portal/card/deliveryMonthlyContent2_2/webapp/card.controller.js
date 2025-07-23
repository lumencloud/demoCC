sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.deliveryMonthlyContent2_2.card", {
        _aCanvasId: [],
        _aContainerId: [],
        _oEventBus: EventBus.getInstance(),
        _oMyChart: [],
        _sOrgTp: undefined,

        onInit: function () {
            // component별 id 설정
            this._createId();
            this._oEventBus.publish("aireport", "isCardSubscribed");
            // 차트 설정
            // this._setChart();
            this._oEventBus.subscribe("aireport", "deliContent2_2", this._setChart, this);
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
            if (this.getView()._sOrgTp !== oData.org_tp) return;
            let aResults = await this._dataSetting(oData.data);

            this._oMyChart[0].data.labels = aResults.aLabel
            this._oMyChart[0].data.datasets[0].data = aResults.aBRmm
            this._oMyChart[0].data.datasets[1].data = aResults.aBRCost
            this._oMyChart[0].update();
            this.dataLoad();
        },


        _setChart: async function (sChannel, sEventId, oData) {
            if (!this.getView()._sOrgTp) {
                this.getView()._sOrgTp = oData.org_tp
            }
            if (this.getView()._sOrgTp !== oData.org_tp) return;
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 90);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 90);

            let orange = "#ff7a01"
            let red = "#ea002d"

            this._oEventBus.subscribe("aireport", "deliContent2_2", this._updateChart, this);

            for (let i = 0; i < this._aCanvasId.length; i++) {
                let oHTML = this.byId("html" + i);
                oHTML.setContent(`<div id='${this._aContainerId[i]}' class='custom-chart-container' style='width:600px; height:280px; min-height:280px'><canvas id='${this._aCanvasId[i]}' /></div>`);
                oHTML.attachEventOnce("afterRendering", async function () {
                    // 차트 구성
                    const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId[i])).getContext("2d");
                    //데이터 요청
                    let aData = await this._dataSetting(oData.data);
                    this._oMyChart[i] = new Chart(ctx, {
                        type: "line",
                        data: {
                            labels: aData.aLabel,
                            datasets: [

                                {
                                    label: "BR(MM)",
                                    data: aData.aBRmm,
                                    borderRadius: 3,
                                    backgroundColor: red,
                                    borderColor: red,
                                    yAxisID: "y",
                                    fill: false,
                                    pointBackgroundColor: red,
                                    pointBorderColor: "white",
                                    pointBorderWidth: 3,
                                    pointRadius: 6,
                                    dataLabels: {
                                        color: red
                                    }

                                },
                                {
                                    label: "BR(Cost)",
                                    data: aData.aBRCost,
                                    borderRadius: 3,
                                    backgroundColor: orange,
                                    borderColor: orange,
                                    yAxisID: "y",
                                    fill: false,
                                    pointBackgroundColor: orange,
                                    pointBorderColor: "white",
                                    pointBorderWidth: 3,
                                    pointRadius: 6,
                                    dataLabels: {
                                        color: orange
                                    }
                                }


                            ]
                        },

                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                tooltip: {
                                    enabled: false
                                },
                                legend: {
                                    display: true,
                                    position: 'bottom',
                                    labels: {
                                        usePointStyle: true,
                                        generateLabels(chart) {
                                            return [
                                                {
                                                    text: 'BR(MM)',
                                                    fillStyle: red,
                                                    strokeStyle: red,
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 0,
                                                    pointStyle: 'line'
                                                },
                                                {
                                                    text: 'BR(Cost)',
                                                    fillStyle: orange,
                                                    strokeStyle: orange,
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 1,
                                                    pointStyle: 'line'
                                                }
                                            ]
                                        }
                                    },
                                },
                                datalabels: {
                                    display: true,
                                    // anchor: function (context) {
                                    //     if (context.dataIndex === context.dataset.data.length) {
                                    //         return 'start'
                                    //     }
                                    //     return 'center';
                                    // },
                                    anchor: 'end',
                                    align: function (context) {
                                        const dataIndex = context.dataIndex;
                                        const datasets = context.chart.data.datasets;
                                        const brMM = datasets[0].data[dataIndex];
                                        const brCost = datasets[1].data[dataIndex];
                                        if (context.dataIndex === context.dataset.data.length - 1) {
                                            return 'left';
                                        }
                                        if (Math.abs(brMM - brCost) <= 10) {
                                            if (context.datasetIndex === 0) {
                                                return brMM > brCost ? 'top' : 'bottom';
                                            } else {

                                            } return brCost > brMM ? 'top' : 'bottom';
                                        }
                                        return 'top'
                                    },
                                    font: {
                                        weight: 'bold',
                                        size: 12
                                    },
                                    formatter: function (value) {
                                        return value.toFixed(0) + "%"
                                    }
                                },
                                title: {
                                    display: false,
                                    font: {
                                        size: 25,
                                        weight: 'bold'

                                    },
                                    position: "top"

                                },

                            },
                            scales: {
                                x: {
                                    stacked: false,
                                    border: {
                                    },
                                    grid: {
                                        display: true,
                                        borderDash: [5, 5]
                                    },
                                    ticks: {
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
                                    max: 130,
                                    gird: {
                                        display: true,
                                        borderDash: [5, 5]
                                    }
                                },

                            }
                        },
                        plugins: [ChartDataLabels]
                    })


                    //this._ovserveResize(this.byId(this._aContainerId[i]), i)
                }.bind(this));

            }
            this.dataLoad();
            this.getView().getModel("ui").setProperty("/bBusyFlag", false);
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
            let aBRCost = [];
            let aBRmm = [];
            let aLabel = [];

            aResults.forEach(
                function (result) {
                    aLabel.push(result.org_name)
                    aBRmm.push(result.br_mm * 100)
                    aBRCost.push(result.br_cost * 100)
                }
            )

            aData = { aLabel, aBRmm, aBRCost }

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

            let sPath = `/get_actual_m_br_org_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',org_tp='${sType}')`

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