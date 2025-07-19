
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.deliveryMonthlyContent1_3.card", {
        _aCanvasId: [],
        _aContainerId: [],
        _oEventBus: EventBus.getInstance(),
        _oMyChart: [],


        onInit: function () {
            // component별 id 설정
            this._createId();

            // 차트 설정
            // this._setChart();
            this._oEventBus.subscribe("aireport", "deliContent1_3", this._setChart, this);
        },

        /**
         * Component별 유일한 ID 생성
         */
        _createId: function () {
            this._aCanvasId = [];
            this._aContainerId = [];
            for (let i = 0; i < 1; i++) {
                this._aCanvasId.push(this.createId("canvas" + [i]))
                this._aContainerId.push(this.createId("container" + [i]))
            }

        },

        _updateChart: async function (sChannel, sEventId, oData) {
            this.getOwnerComponent().oCard.setBusy(true);
            let aResults = await this._dataSetting(oData.data);
            this._oMyChart.data.labels = aResults.aLabel
            this._oMyChart.data.datasets[0].data = aResults.aData
            this._oMyChart.update();
            this.dataLoad();
            setTimeout(() => {
                this.getOwnerComponent().oCard.setBusy(false);
            }, 300)
        },

        _setChart: async function (sChannel, sEventId, oData) {
            this.byId("cardContent").setBusy(true);
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 100);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 95);

            let aData = await this._dataSetting(oData.data);
            this._oEventBus.subscribe("aireport", "deliContent1_3", this._updateChart, this);

            let oHTML = this.byId("html0");
            oHTML.setContent(`<div id='${this._aContainerId}' class='custom-chart-container' style='width:300px; height:250px; min-height:250px'><canvas id='${this._aCanvasId}' /></div>`);
            oHTML.attachEvent("afterRendering", async function () {

                // 차트 구성
                const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId[0])).getContext("2d");
                //데이터 요청
                this._oMyChart = new Chart(ctx, {
                    type: "bar",
                    data: {
                        labels: aData.aLabel,
                        datasets: [

                            {
                                data: aData.aData,
                                backgroundColor:
                                    function (context) {
                                        if (context.dataset.data[context.dataIndex] > 0) {
                                            return "Blue";
                                        } else if (context.dataset.data[context.dataIndex] < 0) {
                                            return "Red";
                                        }
                                    },
                                xAxisID: 'x',
                            }

                        ]
                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        layout: {
                            padding: {
                                top: 0,
                                bottom: 0,
                                left: -20,
                                right: 50,
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
                                color: function (context) {
                                    if (context.dataset.data[context.dataIndex] > 0) {
                                        return "Blue";
                                    } else if (context.dataset.data[context.dataIndex] < 0) {
                                        return "Red";
                                    }
                                },
                                anchor: 'end',
                                align: 'right',
                                font: {
                                    weight: 'bold',
                                    size: 12
                                },
                                offset: -3,
                                formatter: function (value) {
                                    var oNumberFormat = NumberFormat.getFloatInstance({
                                        groupingEnabled: true,
                                        groupingSeparator: ',',
                                        groupingSize: 3,
                                        decimals: 1
                                    });
                                    if (value > 0) {
                                        return "+" + oNumberFormat.format(value) + "%";
                                    } else if (value < 0) {
                                        return oNumberFormat.format(value) + "%";
                                    }

                                }
                            },
                        },
                        scales: {
                            y: {
                                ticks: {
                                    display: true,
                                    padding: 0
                                },
                                title: {
                                    display: true
                                },
                                grid: {
                                    display: false
                                },
                                stacked: 'true',
                                categoryPercentage: 1.2

                            },
                            x: {
                                position: 'bottom',
                                display: true,
                                min: -100,
                                max: 100,
                                title: {
                                    display: false,
                                },
                                grid: {
                                    display: true,
                                },
                                ticks: {
                                    stepSize: 25,
                                    callback: function (value) {
                                        return value + "%"
                                    }
                                }


                            }


                        }
                    },
                    plugins: [ChartDataLabels],

                })


                
                
                this._ovserveResize(this.byId(this._aContainerId))
                
            }.bind(this));
            this.dataLoad();
            this.byId("cardContent").setBusy(false);
        },

        _ovserveResize: function (oElement, i) {

            if (!this._resizeObserver) {
                this._resizeObserver = new ResizeObserver(() => {
                    this._oMyChart.resize()
                })

            }
        },


        _dataSetting: async function (oDataResult) {
            // let aResults = await this._setData();
            let oSessionData = JSON.parse(sessionStorage.getItem("aiReport"))

            let oValue = oDataResult[0];
            let sOrgType = oSessionData['type'];
            let sOrgId = oSessionData['orgId'];
            let aLabel, aData;
            if (sOrgId === '5') {
                switch (sOrgType) {
                    case '': aLabel = ["매출", "마진", "마진율", "DT 매출"]
                        aData = [oValue.sale_gap, oValue.margin_gap, oValue.margin_rate_gap, oValue.dt_gap]
                        break;
                    case 'account': aLabel = ["매출", "DT 매출", "RoHC", "공헌이익"]
                        aData = [oValue.sale_gap, oValue.dt_gap, oValue.rohc_gap, oValue.contribution_gap]
                        break;
                    case 'delivery': aLabel = ["마진율", "DT 매출", "BR(Cost)", "RoHC"]
                        aData = [oValue.margin_rate_gap, oValue.dt_gap, oValue.br_cost_gap, oValue.rohc_gap]
                        break;
                }
            } else {
                // Cloud
                aLabel = ["매출", "마진율", "DT 매출", "BR(Cost)", "RoHC", "공헌이익", "Non-MM"]
                aData = [oValue.sale_gap, oValue.margin_rate_gap,
                oValue.dt_gap, oValue.br_cost_gap, oValue.rohc_gap, oValue.contribution_gap, oValue.nonmm_gap]
            }
            let oData = {
                aLabel,
                aData
            }
            return oData;
        },


        _setData: async function () {
            let oData = JSON.parse(sessionStorage.getItem("aiReport"));

            // 파라미터
            let iYear = oData.year;
            let sMonth = oData.month
            let sOrgId = oData.orgId;
            let sOrgType = oData.type;

            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            let sOrgPath = `/get_actual_m_rate_gap_pl_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',org_tp='${sOrgType}')`

            let aData;
            await Promise.all([
                oModel.bindContext(sOrgPath).requestObject(),
            ]).then(function (aResults) {
                aData = aResults
                aData.push({ orgType: sOrgType, orgId: sOrgId });
            }.bind(this))
                .catch((oErr) => {
                    Module.displayStatus(this.getOwnerComponent().oCard, oErr.error.code, this.byId("cardContent"));
                });
            return aData;
        },

        dataLoad: function () {
            const oEventBus = sap.ui.getCore().getEventBus();
            oEventBus.publish("CardChannel", "CardFullLoad", {
                cardId: this.getView().getId()
            })
        }

    });
});           