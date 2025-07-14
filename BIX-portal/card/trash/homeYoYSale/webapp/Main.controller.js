sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/HTML",
    "sap/ui/core/EventBus"

], function (Controller, ODataModel, HTML, EventBus) {
    "use strict";

    return Controller.extend("bix.card.homeYoYSale.Main", {
        _sCanvasId: undefined,
        _sContainerId: undefined,
        _oMyChart: undefined,
        _oEventBus: EventBus.getInstance(),


        onInit: function () {
            //component별 id 설정
            this._createId()
            // 차트 초기 설정            
            this._setChart();
            // 이벤트 버스 발생시 차트 업데이트
            this._oEventBus.subscribe("home", "search", this._updateChart, this);
        },

        _createId: function () {
            this._sCanvasId = this.createId("canvas");
            this._sContainerId = this.createId("container");
            this._iMinHeight = 20;
        },

        _updateChart: async function (sChannelId, sEventId, oData) {
            let oResult = await this._setEventBusData(oData);

            this._oMyChart.data.labels = oResult.aLabel;
            this._oMyChart.data.datasets[0].data = oResult.aBill;
            this._oMyChart.data.datasets[1].data = oResult.aOpp;
            this._oMyChart.data.datasets[2].data = oResult.aYoy;

            this._oMyChart.update();
        },

        _setEventBusData: async function (oData) {
            let sOrgId, sYear, sMonth
            if (!oData) {
                let oInitData = JSON.parse(sessionStorage.getItem("initSearchModel"))
                let dYearMonth = new Date(oInitData.yearMonth)
                sYear = dYearMonth.getFullYear();
                sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
                sOrgId = oInitData.orgId;
            } else {
                sYear = oData.year;
                sMonth = oData.month;
                sOrgId = oData.orgId;

            };

            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl-api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            let sPath = `/get_home_chart_year(year='${sYear}',range='3',org_id='${sOrgId}')`
            const oBinding = oModel.bindContext(sPath);
            let aResults = await oBinding.requestObject();
            let oResult = await this._setChartData(aResults.value);
            return oResult;
        },

        _setChartData: function (aData) {
            let aLabel = [], aBill = [], aOpp = [], aYoy = []

            aData.forEach(data => {
                aLabel.push(data.year)
                aBill.push(data.bill)
                aOpp.push(data.opp)
                aYoy.push(data.sale_yoy);
            });

            return { aLabel: aLabel, aBill: aBill, aOpp: aOpp, aYoy: aYoy };
        },

        _setChart: async function () {

            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 100 * 0.93);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 100);

            let oHTML = this.byId("html");
            oHTML.setContent(`<div id='${this._sContainerId}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}rem'><canvas id='${this._sCanvasId}' style='padding: 0 0.5rem'/></div>`);
            oHTML.attachEvent("afterRendering", async function () {

                const canvas = document.getElementById(this._sCanvasId);
                const ctx = canvas.getContext("2d");

                // 차트 색상
                let sChartColor1 = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart12');
                let sChartColor2 = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart21');
                let sChartColor3 = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart6');
                let sChartColor4 = getComputedStyle(document.documentElement).getPropertyValue('--custom_black9');
                let sChartColor5 = getComputedStyle(document.documentElement).getPropertyValue('--custom_black2');
                const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, sChartColor3); // 위쪽은 더 진하게
                gradient.addColorStop(1, 'rgba(33, 150, 243, 0)');   // 아래는 투명

                //데이터 셋팅 부분
                let oResult = await this._setEventBusData();

                //차트 구성
                this._oMyChart = new Chart(ctx, {
                    type:"bar",
                    plugins: [ChartDataLabels],
                    data: {
                        labels: oResult.aLabel,
                        datasets: [
                            {
                                label: "확보매출(억원)",
                                data: oResult.aBill,
                                yAxisID: "y",
                                barThickness: 50,
                                order: 2,
                                borderRadius: 5,
                                backgroundColor : sChartColor1,
                                datalabels : {
                                    align: "top",
                                    anchor: "end",
                                    color: sChartColor5,
                                    formatter: function (iValue) {
                                        return Math.floor(iValue / 100000000).toLocaleString() + "억";
                                    }
                                }
                            },
                            {
                                label: "미확보매출(억원)",
                                data: oResult.aOpp.map(iValue => iValue === 0 ? null : iValue),
                                yAxisID: "y",
                                barThickness: 50,
                                order: 3,
                                borderRadius: 5,
                                backgroundColor : sChartColor2,
                                minBarLength: 5,
                                datalabels : {
                                    color: sChartColor5,
                                    formatter: function (iValue) {
                                        return Math.floor(iValue / 100000000) + "억";
                                    }
                                }
                            },
                            {
                                label: "YoY(%)",
                                data: oResult.aYoy,
                                yAxisID: "y1",
                                type: "line",
                                backgroundColor : sChartColor3,
                                borderColor : sChartColor3,
                                pointBackgroundColor : sChartColor3,
                                order: 1,
                                datalabels : {
                                    borderColor : sChartColor3,
                                    borderWidth : 2,
                                    backgroundColor : sChartColor4,
                                    color: sChartColor3,
                                    formatter: function (iValue) {
                                        return iValue + "%";
                                    }
                                }
                            }
                        ]
                    },
                    options: {
                        clip: false,
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: false,
                                text: "매출 추이",
                                position: "top"
                            },
                            datalabels: {   // 데이터라벨 플러그인
                                display: function(oContext) {
                                  return oContext.dataset.data[oContext.dataIndex] !== 0 && oContext.dataset.data[oContext.dataIndex] !== null;
                                },
                                align: "top",
                                anchor: "end",
                            },
                        },
                        scales: {
                            x: {
                                grid : {
                                    display: false
                                }
                            },
                            y: {
                                position: "left",
                                grid : {
                                    display: false
                                },
                                ticks: {
                                    callback: function (value) {
                                        if (value % 100000000 === 0) {
                                            return (value / 100000000).toLocaleString() + '억';
                                        };
                                    }
                                }
                            },
                            y1: {
                                position: "right",
                                min: 0,
                                max: 100,
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    callback: function (value) {
                                        return value + '%';
                                    }
                                }
                            }
                        }
                    },
                });
            }.bind(this));
        },


        // _setChart: async function (sChannelId, sEventId, oData) {
        //     if (!oData) {
        //         var sOrgId = '5';
        //         var sYear = new Date().getFullYear();
        //         var sMonth = String(new Date().getMonth() + 1).padStart(2, "0");
        //     } else {
        //         var sOrgId = oData.orgId;
        //         var sYear = oData.year;
        //         var sMonth = oData.month;
        //     }

        //     const oModel = new ODataModel({
        //         serviceUrl: "../odata/v4/pl-api/",
        //         synchronizationMode: "None",
        //         operationMode: "Server"
        //     });
        //     const oBinding = oModel.bindContext(`/get_home_chart_year(year='${sYear}',range='3',org_id='${sOrgId}')`);
        //     let aChartData = await oBinding.requestObject();
        //     let aLabel = []
        //     let aBill = []
        //     let aOpp = []
        //     let aYoy = []
        //     aChartData.value.forEach(data => {
        //         aLabel.push(data.year)
        //         aBill.push(data.bill)
        //         aOpp.push(data.opp)
        //         aYoy.push(data.sale_yoy)
        //     })
        //     let oBox = this.byId("chartBox7");
        //     oBox.removeAllItems();

        //     const oHTML = new HTML({
        //         content: "<canvas id='chart03' width='450' height='240' >"
        //     });
        //     oBox.addItem(oHTML);

        //     oHTML.attachEvent("afterRendering", function () {
        //         const ctx = document.getElementById('chart03');

        //         // 데이터 설정
        //         const data = {
        //             labels: aLabel,
        //             datasets: [
        //                 {
        //                     label: "확보매출(원)",
        //                     data: aBill,
        //                     yAxisID: "y",
        //                 },
        //                 {
        //                     label: "미확보매출(원)",
        //                     data: aOpp,
        //                     yAxisID: "y",
        //                 },
        //                 {
        //                     label: "YoY(%)",
        //                     data: aYoy,
        //                     yAxisID: "y1",
        //                     type: "line"
        //                 }
        //             ]
        //         };

        //         //차트 설정
        //         const options = {
        //             responsive: true,
        //             plugins: {
        //                 title: {
        //                     display: false,
        //                     text: "매출 추이",
        //                     position: "top"
        //                 }
        //             },
        //             scales: {
        //                 x: {
        //                     stacked: true
        //                 },
        //                 y: {
        //                     position: "left",
        //                     stacked: true
        //                 },
        //                 y1: {
        //                     position: "right",
        //                     min: 0,
        //                     max: 100,
        //                     grid: {
        //                         display: false
        //                     }
        //                 }
        //             }
        //         };
        //         new Chart(ctx, {
        //             type: 'bar',
        //             data: data,
        //             options: options,
        //         });
        //     }.bind(this));
        // },
    });
});