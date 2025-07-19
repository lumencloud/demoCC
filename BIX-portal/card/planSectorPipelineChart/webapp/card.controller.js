sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.planSectorPipelineChart.card", {
        _aCanvasId: [],
        _aContainerId: [],
        _oEventBus: EventBus.getInstance(),
        _oMyChart: [],


        onInit: function () {
            // component별 id 설정
            this._createId();

            // select 설정
            this._setUiModel();

            // 차트 설정
            this._setChart();

            // 이벤트 버스 설정
            this._oEventBus.subscribe("pl", "search", this._updateChart, this);

        },

        _updateChart: async function (sChannelId, sEventId, oData) {
            this.byId("cardContent").setBusy(true);
            let aResults = await this._dataSetting();



            for (let i = 0; i < this._oMyChart.length; i++) {
                this._oMyChart[i].data.labels = aResults[i].aLabel
                this._oMyChart[i].data.datasets[0].data = aResults[i].aChance
                this._oMyChart[i].data.datasets[1].data = aResults[i].aTake
                this._oMyChart[i].data.datasets[2].data = aResults[i].aSale
                this._oMyChart[i].update();
            }
            this.byId("cardContent").setBusy(false);
        },

        _setUiModel: function () {
            this.getView().setModel(new JSONModel({
                tableKind: "stage"
            }), "uiModel");
            this._setSelect();

        },

        onUiChange: function (oEvent) {
            let oUiModel = this.getView().getModel("uiModel");
            oUiModel.setProperty("/tableKind", oEvent.getSource().getSelectedKey())

        },

        _setSelect: function () {
            this.getView().setModel(new JSONModel({}), "selectModel");

            let aTemp = [{
                key: "stage",
                name: "Deal Stage 현황"
            }, {
                key: "month",
                name: "월 현황"
            }, {
                key: "money",
                name: "수주금액별 현황"
            }
            ];
            this.getView().setModel(new JSONModel(aTemp), "selectModel");
        },

        /**
         * Component별 유일한 ID 생성
         */
        _createId: function () {
            this._aCanvasId = [];
            this._aContainerId = [];
            for (let i = 0; i < 3; i++) {
                this._aCanvasId.push(this.createId("canvas" + i))
                this._aContainerId.push(this.createId("container" + i))
            }
            this._iMinHeight = 400;
        },

        _setChart: async function () {
            this.byId("cardContent").setBusy(true);
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 100);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 90);


            for (let i = 0; i < this._aCanvasId.length; i++) {
                let oHTML = this.byId("html" + i);
                oHTML.setContent(`<div id='${this._aContainerId[i]}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._aCanvasId[i]}' /></div>`);
                oHTML.attachEvent("afterRendering", async function () {
                    // 차트 구성
                    const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId[i])).getContext("2d");
                    //데이터 요청
                    let aData = await this._dataSetting();

                    this._oMyChart[i] = new Chart(ctx, {
                        type: "bar",
                        data: {
                            labels: aData[i].aLabel,
                            datasets: [
                                {
                                    label: "사업기회",
                                    data: aData[i].aChance,
                                    backgroundColor: "Green",
                                    borderColor: "Green",
                                    type: "line",
                                    yAxisID: 'y1'

                                },
                                {
                                    label: "수주",
                                    data: aData[i].aTake,
                                    borderRadius: 3,
                                    backgroundColor: "Blue",
                                    yAxisID: "y",
                                },
                                {
                                    label: "매출",
                                    data: aData[i].aSale,
                                    borderRadius: 3,
                                    backgroundColor: "Red",
                                    yAxisID: "y"


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
                                },
                                title: {
                                    display: true,
                                    text: aData[i].sTitle,
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
                                        display: false
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
                                    ticks: {
                                        callback: function (value) {
                                            if (value % 100000000 === 0) {
                                                return (value / 100000000).toLocaleString() + '억';
                                            };
                                        }
                                    }


                                },
                                y1: {
                                    type: "linear",
                                    display: true,
                                    grid: {
                                        display: false
                                    },
                                    position: 'right',


                                }


                            }
                        }
                    })

                    this.byId("cardContent").setBusy(false);
                    //this._ovserveResize(this.byId(this._aContainerId[i]), i)
                }.bind(this));

                ``
            }
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
            let aData = [];
            let oData1 = {
                aLabel: ["Lead", "Identified", "Validated", "Qualified", "Negotiated"],
                aTake: this._convertData(aResults[0].value.find(sType => sType.type === "수주")),
                aChance: this._convertData(aResults[0].value.find(sType => sType.type === "건수")),
                aSale: this._convertData(aResults[0].value.find(sType => sType.type === "매출")),
                sTitle: "Deal Stage 현황"
            }

            aData.push(oData1);

            let oConvertData = await this._monthSetting(aResults[1].value)

            let oData2 = {
                aLabel: oConvertData.aLabel,
                aTake: oConvertData.aTake,
                aChance: oConvertData.aChance,
                aSale: oConvertData.aSale,
                sTitle: "월 현황"
            }

            aData.push(oData2);

            let oData3 = {
                aLabel: ["100억 이상", "50억~100억", "30억~50억", "10억~30억", "5억~10억", "1억~5억", "1억 미만"],
                aTake: this._convertMoneyData(aResults[2].value.find(sType => sType.type === "수주")),
                aChance: this._convertMoneyData(aResults[2].value.find(sType => sType.type === "건수")),
                aSale: this._convertMoneyData(aResults[2].value.find(sType => sType.type === "매출")),
                sTitle: "수주금액별 현황"
            }

            aData.push(oData3);

            return aData;
        },

        _monthSetting: function (aResults) {


            let aLabel = [];
            let aTake = [];
            let aChance = [];
            let aSale = [];

            aResults.forEach(
                function (aResult) {
                    for (let i = 1; i < 13; i++) {
                        let sFindColumn = "m_" + String(i).padStart(2, "0") + "_data"
                        let bResult = aResult.hasOwnProperty(sFindColumn)
                        if (bResult) {
                            if (!aLabel.find(sMonth => sMonth === i + "월")) {
                                aLabel.push(i + "월")
                            }
                            switch (aResult.type) {
                                case "수주":
                                    aTake.push(aResult[sFindColumn])
                                    break;
                                case "매출":
                                    aSale.push(aResult[sFindColumn])
                                    break;
                                case "건수":
                                    aChance.push(aResult[sFindColumn])
                                    break;
                            }
                        }


                    }
                }

            )

            return { aLabel, aTake, aSale, aChance };
        },

        _convertData: function (oData) {
            return [
                oData.lead_data,
                oData.identified_data,
                oData.validated_data,
                oData.qualified_data,
                oData.negotiated_data,
                oData.contracted_data,
                oData.deal_lost_data,
                oData.deselected_data
            ]
        },

        _convertMoneyData: function (oData) {
            return [
                oData["more10bil"],
                oData["5bil_10bil"],
                oData["3bil_5bil"],
                oData["1bil_3bil"],
                oData["500mil_1bil"],
                oData["100mil_500mil"],
                oData["less100mil"]
            ]
        },




        _setData: async function () {
            let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;

            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            let sDealPath = `/get_forecast_pl_pipeline_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='deal',display_type='chart')`
            let sMonthPath = `/get_forecast_pl_pipeline_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='month',display_type='chart')`
            let sRodrPath = `/get_forecast_pl_pipeline_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='rodr',display_type='chart')`

            let aData;
            await Promise.all([
                oModel.bindContext(sDealPath).requestObject(),
                oModel.bindContext(sMonthPath).requestObject(),
                oModel.bindContext(sRodrPath).requestObject(),
            ]).then(function (aResults) {
                aData = aResults
            }.bind(this))
                .catch((oErr) => {
                    Module.displayStatus(this.getOwnerComponent().oCard, oErr.error.code, this.byId("cardContent"));
                });
            return aData;
        },




    });
});           