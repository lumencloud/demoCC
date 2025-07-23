
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("bix.card.deliveryMonthlyContent1_3.card", {
        _aCanvasId: [],
        _aContainerId: [],
        _oEventBus: EventBus.getInstance(),
        _oMyChart: [],
        _sOrgTp: undefined,

        onInit: function () {
            // component별 id 설정
            this._createId();
            this._setTopOrgModel();

            // 차트 설정
            // this._setChart();
            this._oEventBus.publish("aireport", "isCardSubscribed");

            this._oEventBus.subscribe("aireport", "deliContent1_3", this._setChart, this);

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
                this._aCanvasId.push(this.createId("canvas" + [i]))
                this._aContainerId.push(this.createId("container" + [i]))
            }

        },

        _updateChart: async function (sChannel, sEventId, oData) {
            if (this.getView()._sOrgTp !== oData.org_tp) return;
            let aResults = await this._dataSetting(oData.data);
            this._oMyChart.data.labels = aResults.aLabel
            this._oMyChart.data.datasets[0].data = aResults.aData
            this._oMyChart.update();
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
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 100);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 95);

            let aData = await this._dataSetting(oData.data);
            this._oEventBus.subscribe("aireport", "deliContent1_3", this._updateChart, this);

            let oHTML = this.byId("html0");
            oHTML.setContent(`<div id='${this._aContainerId}' class='custom-chart-container' style='width:300px; height:250px; min-height:250px'><canvas id='${this._aCanvasId}' /></div>`);
            oHTML.attachEventOnce("afterRendering", async function () {

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
            this.getView().getModel("ui").setProperty("/bBusyFlag", false);
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
            await this._setTopOrgModel();
            await this._setCloudOrgModel();
            const topOrgModel = this.getView().getModel("topOrgModel").getData();
            const cloudgModel = this.getView().getModel("cloudOrgModel").getData();

            let oSessionData = JSON.parse(sessionStorage.getItem("aiReport"))
            let oValue = oDataResult[0];
            let sOrgType = oSessionData['type'];
            let sOrgId = oSessionData['orgId'];
            let aLabel, aData;
            if (sOrgId === topOrgModel.org_id) {
                aLabel = ["매출", "마진", "마진율", "DT 매출"]
                aData = [oValue.sale_gap, oValue.margin_gap, oValue.margin_rate_gap, oValue.dt_gap]
            } else if (sOrgId != topOrgModel.org_id && sOrgType === 'account') {
                aLabel = ["매출", "DT 매출", "RoHC", "공헌이익"]
                aData = [oValue.sale_gap, oValue.dt_gap, oValue.rohc_gap, oValue.contribution_gap]
            } else if (sOrgId != topOrgModel.org_id && sOrgType === 'delivery' && sOrgId != cloudgModel.org_id) {
                aLabel = ["마진율", "DT 매출", "BR(Cost)", "RoHC"]
                aData = [oValue.margin_rate_gap, oValue.dt_gap, oValue.br_cost_gap, oValue.rohc_gap]
            } else if (sOrgId === cloudgModel.org_id && sOrgType === 'delivery') {
                aLabel = ["매출", "마진율", "DT 매출", "BR(Cost)", "RoHC", "공헌이익", "Non-MM"]
                aData = [oValue.sale_gap, oValue.margin_rate_gap,
                oValue.dt_gap, oValue.br_cost_gap, oValue.rohc_gap, oValue.contribution_gap, oValue.nonmm_gap]
            }
            let oData = {
                aLabel,
                aData
            }
            return oData;
            // if (sOrgId === topOrgModel.org_id) {
            //     switch (sOrgType) {
            //         case '': aLabel = ["매출", "마진", "마진율", "DT 매출"]
            //             aData = [oValue.sale_gap, oValue.margin_gap, oValue.margin_rate_gap, oValue.dt_gap]
            //             break;
            //         case 'account': aLabel = ["매출", "DT 매출", "RoHC", "공헌이익"]
            //             aData = [oValue.sale_gap, oValue.dt_gap, oValue.rohc_gap, oValue.contribution_gap]
            //             break;
            //         case 'delivery': aLabel = ["마진율", "DT 매출", "BR(Cost)", "RoHC"]
            //             aData = [oValue.margin_rate_gap, oValue.dt_gap, oValue.br_cost_gap, oValue.rohc_gap]
            //             break;
            //     }
            // } else {
            //     // Cloud
            //     aLabel = ["매출", "마진율", "DT 매출", "BR(Cost)", "RoHC", "공헌이익", "Non-MM"]
            //     aData = [oValue.sale_gap, oValue.margin_rate_gap,
            //     oValue.dt_gap, oValue.br_cost_gap, oValue.rohc_gap, oValue.contribution_gap, oValue.nonmm_gap]
            // }
        },

        /**
         * 최상위 조직 값 모델 설정
         */
        _setTopOrgModel: async function () {
            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/cm/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            const andFilter = new Filter([
                new Filter("org_id", FilterOperator.NE, null),
                new Filter([
                    new Filter("org_parent", FilterOperator.EQ, null),
                    new Filter("org_parent", FilterOperator.EQ, ''),
                ], false)
            ], true)

            // 전사조직 모델 세팅
            const oBinding = oModel.bindList("/org_full_level", undefined, undefined, andFilter)
            await oBinding.requestContexts().then((aContext) => {
                const aData = aContext.map(ctx => ctx.getObject());
                this.getView().setModel(new JSONModel(aData[0]), "topOrgModel");

            })
        },

        /**
         *  Cloud 부문 조직 값 모델 설정
         */
        _setCloudOrgModel: async function () {
            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/cm/",
                synchronizationMode: "None",
                operationMode: "Server"
            });
            const oBinding = oModel.bindList("/org_full_level", undefined, undefined, new Filter("org_ccorg_cd", FilterOperator.EQ, "195200"))
            await oBinding.requestContexts().then((aContext) => {
                const aData = aContext.map(ctx => ctx.getObject());
                this.getView().setModel(new JSONModel(aData[0]), "cloudOrgModel");
            })
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