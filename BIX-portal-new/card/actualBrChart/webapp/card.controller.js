sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/core/EventBus",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "bix/common/library/control/Modules",
    "bix/common/ai/util/InteractionUtils",
    "bix/common/ai/service/AgentService",
    "bix/common/library/customDialog/AIPopupManager",
    "sap/m/MessageBox"
], function (Controller, JSONModel, Module, EventBus, ODataModel, NumberFormat, Modules, InteractionUtils, AgentService, AIPopupManager, MessageBox) {
    "use strict";

    return Controller.extend("bix.card.actualBrChart.card", {
        _aCanvasId: [],
        _aContainerId: [],
        _oEventBus: EventBus.getInstance(),
        _oMyChart: [],

        onInit: function () {
            // component별 id 설정
            this._createId();

            // // 차트 설정
            this._setChart();

            // 이벤트 버스 설정
            this._oEventBus.subscribe("pl", "search", this._updateChart, this);

        },

        _updateChart: async function (sChannelId, sEventId, oData) {
            let aResults = await this._dataSetting();
            this._oMyChart[0].data.labels = aResults[0].aLabel
            this._oMyChart[0].data.datasets[0].data = aResults[0].aChance
            this._oMyChart[0].update();
        },

        /**
         * Component별 유일한 ID 생성
         */
        _createId: function () {
            this._aCanvasId.push(this.createId("canvas"))
            this._aContainerId.push(this.createId("container"))
            this._iMinHeight = 400;
        },

        _setChart: async function () {
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 100);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 90);

            let oHTML = this.byId("html1");
            oHTML.setContent(`<div id='${this._aContainerId[0]}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._aCanvasId[0]}' /></div>`);
            oHTML.attachEventOnce("afterRendering", async function () {
                // 차트 구성
                const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._aCanvasId[0])).getContext("2d");
                //데이터 요청
                // let aData = await this._dataSetting();

                this._oMyChart[0] = new Chart(ctx, {
                    type: "line",
                    plugins: [ChartDataLabels],
                    data: {
                        labels: "2323", // 라벨 잡아야함
                        datasets: [
                            {
                                label: "BR(MM)",
                                data: [4,4,4,4],
                                backgroundColor: "blue",
                                borderColor: "blue",
                                fill: false,
                                tension: 0.3,
                                pointRadius: 5,
                                pointBackgroundColor: 'blue'
                            },
                            {
                                label: "BR(Cost)",
                                data: [4,4,4,4],
                                backgroundColor: "green",
                                borderColor: "green",
                                fill: false,
                                tension: 0.3,
                                pointRadius: 5,
                                pointBackgroundColor: 'green'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                display: true,
                                labels: {
                                    font: {
                                        size: 14
                                    }
                                },
                                position: 'bottom'
                            }
                        },
                        scales: {
                            y: {
                                min: 45,
                                max: 81,
                                ticks: {
                                    stepSize: 9,
                                    callback: function (value) {
                                        return value;
                                    }
                                }
                            }
                        }
                    },

                })
            }.bind(this));
        },

        _dataSetting: async function () {
            let aResults = await this._setData();
            let aData = [];

            let oData1 = {
                aLabel: ["Lead", "Identified", "Validated", "Qualified", "Negotiated", "Contracted", "Deal Lost", "Deselected"],
                aTake: this._convertData(aResults[0].value.find(sType => sType.type === "수주")),
                aChance: this._convertData(aResults[0].value.find(sType => sType.type === "건수")),
                aSale: this._convertData(aResults[0].value.find(sType => sType.type === "매출")),
                sTitle: "Deal Stage 현황"
            }

            aData.push(oData1);

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
                oData["5bil-10bil"],
                oData["3bil-5bil"],
                oData["1bil-3bil"],
                oData["500mil-1bil"],
                oData["100mil-500mil"]
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

            let sDealPath = `/get_actual_br_org_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`

            let aData;
            oModel.bindContext(sDealPath).requestObject()
                .then(function (aResults) {
                    aData = aResults
                }.bind(this)
                )
            return aData;
        },

    });
});