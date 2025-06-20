sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/HTML",
    "sap/ui/core/format/NumberFormat"
], (Controller, JSONModel, HTML, NumberFormat) => {
    "use strict";
    /**
     * @typedef {sap.ui.base.Event} Event
     */

    return Controller.extend("bix.test.v4.controller.Chart", {
        /**
         * 초기 실행 메소드
         */
        onInit: async function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("Chart");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },


        onMyRoutePatternMatched: function () {
            this.chart1();
        },

        chart1: async function () {
            const oBox = this.byId("newChartBox");

            const oHTML = new HTML({
                content: `<canvas id='${this._sCanvasId}' width="100%" />`
            });
            oBox.addItem(oHTML);

            oHTML.attachEventOnce("afterRendering", function () {
                const oNumberFormat = NumberFormat.getIntegerInstance({
                    groupingEnabled: true,
                    groupingSeparator: ','
                });

                const ctx = document.getElementById(this._sCanvasId).getContext("2d");

                let aBefore = [942, 258, 51, 746, 78, 467, 2223, 202, 42, 578, 110, 259, 141, 648];
                let aAfter = [1093, 282, 51, 845, 98, 347, 2109, 234, 63, 488, 118, 250, 198, 782];

                new Chart(ctx, {
                    type: "bar",
                    plugins: [ChartDataLabels],
                    data: {
                        labels: ["SKT", "SKB", "기타 ICT계열", "SKHy", "반도체계열", "SKI", "SKON", "대내기타제조", "대외제조", "금융", "공공", "대내물류/서비스", "유통/물류/서비스", "대외Cloud"],
                        datasets: [
                            {
                                label: "24.1Q",
                                data: aBefore,
                                backgroundColor: "lightgray",
                            },
                            {
                                label: "25.1Q",
                                data: aAfter,
                                backgroundColor: function (oContext) {  // 0보다 작으면 빨간색 적용
                                    let index = oContext.dataIndex;
                                    return (aAfter[index] - aBefore[index] < 0) ? "red" : "blue";
                                },
                            }
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
                            annotation: {
                                annotations: [
                                    {
                                        type: "line",
                                        scaleID: "x",
                                        value: 2.5, // 세로 구분선 X축 위치
                                        borderColor: "black",   // 점선 색
                                        borderWidth: 2, // 점선 두께
                                        borderDash: [5, 5],   // 점선 패턴 길이
                                    },
                                    {
                                        type: "line",
                                        scaleID: "x",
                                        value: 4.5, // 세로 구분선 X축 위치
                                        borderColor: "black",   // 점선 색
                                        borderWidth: 2, // 점선 두께
                                        borderDash: [5, 5],   // 점선 패턴 길이
                                    },
                                    {
                                        type: "line",
                                        scaleID: "x",
                                        value: 8.5, // 세로 구분선 X축 위치
                                        borderColor: "black",   // 점선 색
                                        borderWidth: 2, // 점선 두께
                                        borderDash: [5, 5],   // 점선 패턴 길이
                                    },

                                    {
                                        type: "label",
                                        xValue: 1,
                                        yValue: 2750,
                                        content: ["AT/DT", "+175"],
                                        color: "blue",
                                        font: [{ size: 20 }, { size: 20, weight: "bold" }],
                                    },
                                    {
                                        type: "label",
                                        xValue: 3.5,
                                        yValue: 2750,
                                        content: ["Hi-Tech.", "+119"],
                                        color: "blue",
                                        font: [{ size: 20 }, { size: 20, weight: "bold" }],
                                    },
                                    {
                                        type: "label",
                                        xValue: 6.5,
                                        yValue: 2750,
                                        content: ["제조/Global", "△182"],
                                        color: "red",
                                        font: [{ size: 20 }, { size: 20, weight: "bold" }],
                                    },
                                    {
                                        type: "label",
                                        xValue: 11,
                                        yValue: 2750,
                                        content: ["금융/전략", "+100"],
                                        color: "blue",
                                        font: [{ size: 20 }, { size: 20, weight: "bold" }],
                                    },

                                    {
                                        type: "label",
                                        xValue: 1,
                                        yValue: 2000,
                                        content: ["SKT +151", "SKB +24", "기타ICT계열 +0"],
                                        color: "blue",
                                        font: { size: 14 },
                                        color: ["red", "red", "blue", "blue"],
                                    },
                                    {
                                        type: "label",
                                        xValue: 3.5,
                                        yValue: 2000,
                                        content: ["SKHy +99", "반도체계열 +20"],
                                        color: "blue",
                                        font: { size: 14 }
                                    },
                                    {
                                        type: "label",
                                        xValue: 7.5,
                                        yValue: 2000,
                                        content: ["SKI △120", "SKON △114", "대내기타제조 +32", "대외제조 + 19"],
                                        color: ["red", "red", "blue", "blue"],
                                        font: { size: 14 }
                                    },
                                    {
                                        type: "label",
                                        xValue: 11,
                                        yValue: 2000,
                                        content: ["금융 △90", "공공 + 8", "대내물류/서비스 △9", "유통/물류/서비스 +57", "대외Cloud + 134"],
                                        color: ["red", "blue", "red", "blue", "blue"],
                                        font: { size: 14 }
                                    },
                                ]
                            },
                            datalabels: {   // 데이터라벨 플러그인
                                align: "top",
                                anchor: "end",
                                formatter: function (iValue) {
                                    return oNumberFormat.format(iValue);
                                }
                            },
                        },
                        scales: {
                            x: {
                                stacked: false,
                            },
                            y: {
                                beginAtZero: true,
                                max: 3000
                            }
                        }
                    }
                })
            }.bind(this));
        }
    });
});