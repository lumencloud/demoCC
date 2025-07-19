
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.allMonthlyContent3_4.card", {
        _aCanvasId: [],
        _aContainerId: [],
        _oEventBus: EventBus.getInstance(),
        _oMyChart: [],


        onInit: function () {
            // component별 id 설정
            this._createId();

            // 차트 설정
            // this._setChart();

            this._oEventBus.subscribe("aireport", "allContent3_4", this._setChart, this);
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
            this._oMyChart[0].data.datasets[0].data = aResults.aChance
            this._oMyChart[0].data.datasets[1].data = aResults.aTake
            this._oMyChart[0].data.datasets[2].data = aResults.aSale

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

            let lightYellow = "#FFF2d4"
            let red = "#EA002d"
            let orange = "#ff8211"

            this._oEventBus.subscribe("aireport", "allContent3_4", this._updateChart, this);

            for (let i = 0; i < this._aCanvasId.length; i++) {
                let oHTML = this.byId("html" + i);
                oHTML.setContent(`<div id='${this._aContainerId[i]}' class='custom-chart-container' style='width:450px; height:250px; min-height:250px'><canvas id='${this._aCanvasId[i]}' /></div>`);
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
                                    label: "사업 기회",
                                    data: aData.aChance,
                                    backgroundColor: orange,
                                    borderColor: orange,
                                    type: "line",
                                    yAxisID: 'y1',
                                    fill: false,
                                    pointBackgroundColor: orange,
                                    pointBorderColor: "white",
                                    pointBorderWidth: 3,
                                    pointRadius: 6,

                                },
                                {
                                    label: "수주액",
                                    data: aData.aTake,
                                    backgroundColor: red,
                                    yAxisID: "y",

                                },
                                {
                                    label: "매출액",
                                    data: aData.aSale,
                                    backgroundColor: lightYellow,
                                    yAxisId: "y",

                                },
                            ]
                        },

                        options: {
                            responsive: true,
                            maintainAspectRatio: false,

                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'bottom',
                                    labels: {
                                        usePointStyle: true,
                                        generateLabels(chart) {
                                            return [
                                                {
                                                    text: '사업 기회',
                                                    fillStyle: orange,
                                                    strokeStyle: orange,
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 0,
                                                    pointStyle: 'line'
                                                },
                                                {
                                                    text: '수주액',
                                                    fillStyle: red,
                                                    strokeStyle: red,
                                                    lineWidth: 1,
                                                    hidden: false,
                                                    datasetIndex: 2,
                                                    pointStyle: 'rect'
                                                },
                                                {
                                                    text: '매출액',
                                                    fillStyle: lightYellow,
                                                    strokeStyle: lightYellow,
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
                            },

                            scales: {
                                x: {
                                    barPercentage: 1,
                                    categoryPercentage: 1,
                                    border: {
                                    },
                                    grid: {
                                        display: false
                                    },
                                    ticks: {
                                        padding: 5,
                                        font: {
                                            size: 8,
                                            weight: 500
                                        },

                                    }
                                },
                                y: {
                                    display: true,
                                    position: 'left',
                                    ticks: {
                                        callback: function (value) {
                                            return (value).toLocaleString() + '억';

                                        },
                                        stepSize: 5
                                    },
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
                                            return value + '건';
                                        },
                                        stepSize: 1

                                    },
                                    title: {
                                        display: false,
                                        text: '수주건수(건)',
                                    }


                                }


                            }
                        },
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
            let aTake = [];
            let aSale = [];
            let aChance = [];

            aResults.forEach(
                function (oResult) {
                    aLabel.push(oResult.deal_stage_cd)
                    aTake.push(oResult.rodr_amt_sum)
                    aSale.push(oResult.sale_amt_sum)
                    aChance.push(oResult.total_rodr_cnt)
                }
            )
            aData = { aLabel, aTake, aSale, aChance }

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

            let sOrgPath = `/get_ai_forecast_deal_pipeline(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',org_tp='${sType}')`

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