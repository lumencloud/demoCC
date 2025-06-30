sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",

], function (Controller, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.divPlugin.card", {
        _sCanvasId: undefined,
        _sContainerId: undefined,
        _oMyChart: undefined,
        _oEventBus: EventBus.getInstance(),


        onInit: function () {
            // component별 id 설정
            this._createId();

            // 차트 설정
            this._setChart();

            //
            // this._oEventBus.subscribe("pl", "search", this._updateChart, this);

        },

        /**
         * Component별 유일한 ID 생성
         */
        _createId: function () {
            this._sCanvasId = this.createId("canvas");
            this._sContainerId = this.createId("container");
            this._iMinHeight = 600;
          },

        _setChart: async function () {
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 100);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 100);


            let oHTML = this.byId("html");
            oHTML.setContent(`<div id='${this._sContainerId}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._sCanvasId}' /></div>`);
            oHTML.attachEventOnce("afterRendering", function () {
                const oNumberFormat = NumberFormat.getIntegerInstance({
                    groupingEnabled: true,
                    groupingSeparator: ','
                });

                let aBefore = [942, 258, 51, 746, 78, 467, 2223, 202, 42, 578, 110, 259, 141, 648];
                let aAfter = [1093, 282, 51, 845, 98, 347, 2109, 234, 63, 488, 118, 250, 198, 782];
                // 차트 색상
                let sChartColor1 = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart5');
                let sChartColor2 = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart6');
                let sChartColor3 = getComputedStyle(document.documentElement).getPropertyValue('--custom_black4');
                let sChartColor4 = getComputedStyle(document.documentElement).getPropertyValue('--custom_black5');
                let sChartColor5 = getComputedStyle(document.documentElement).getPropertyValue('--custom_black6');
                const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._sCanvasId)).getContext("2d");
                new Chart(ctx, {
                    type: "bar",
                    plugins: [ChartDataLabels],
                    data: {
                        labels: ["SKT", "SKB", "기타 ICT계열", "SKHy", "반도체계열", "SKI", "SKON", "대내기타제조", "대외제조", "금융", "공공", "대내물류/서비스", "유통/물류/서비스", "대외Cloud"],
                        datasets: [
                            {
                                label: "24.1Q",
                                data: aBefore,
                                borderRadius: 3,
                                backgroundColor: sChartColor4,
                            },
                            {
                                label: "25.1Q",
                                data: aAfter,
                                borderRadius: 3,
                                backgroundColor: function (oContext) {  // 0보다 작으면 빨간색 적용
                                    let index = oContext.dataIndex;
                                    return (aAfter[index] - aBefore[index] < 0) ?  sChartColor1 : sChartColor2;
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
                                        borderColor: sChartColor3,   // 점선 색
                                        borderWidth: 2, // 점선 두께
                                        borderDash: [5, 5],   // 점선 패턴 길이
                                    },
                                    {
                                        type: "line",
                                        scaleID: "x",
                                        value: 4.5, // 세로 구분선 X축 위치
                                        borderColor: sChartColor3,   // 점선 색
                                        borderWidth: 2, // 점선 두께
                                        borderDash: [5, 5],   // 점선 패턴 길이
                                    },
                                    {
                                        type: "line",
                                        scaleID: "x",
                                        value: 8.5, // 세로 구분선 X축 위치
                                        borderColor: sChartColor3,   // 점선 색
                                        borderWidth: 2, // 점선 두께
                                        borderDash: [5, 5],   // 점선 패턴 길이
                                    },

                                    {
                                        type: "label",
                                        xValue: 1,
                                        yValue: 2750,
                                        content: ["AT/DT", "+175"],
                                        color: sChartColor2,
                                        font: [{ size: 20 }, { size: 20, weight: "bold" }],
                                    },
                                    {
                                        type: "label",
                                        xValue: 3.5,
                                        yValue: 2750,
                                        content: ["Hi-Tech.", "+119"],
                                        color: sChartColor2,
                                        font: [{ size: 20 }, { size: 20, weight: "bold" }],
                                    },
                                    {
                                        type: "label",
                                        xValue: 6.5,
                                        yValue: 2750,
                                        content: ["제조/Global", "△182"],
                                        color:  sChartColor1,
                                        font: [{ size: 20 }, { size: 20, weight: "bold" }],
                                    },
                                    {
                                        type: "label",
                                        xValue: 11,
                                        yValue: 2750,
                                        content: ["금융/전략", "+100"],
                                        color: sChartColor2,
                                        font: [{ size: 20 }, { size: 20, weight: "bold" }],
                                    },

                                    {
                                        type: "label",
                                        xValue: 1,
                                        yValue: 2000,
                                        content: ["SKT +151", "SKB +24", "기타ICT계열 +0"],
                                        color: sChartColor2,
                                        font: { size: 14 },
                                        color: [ sChartColor1,  sChartColor1, sChartColor2, sChartColor2],
                                    },
                                    {
                                        type: "label",
                                        xValue: 3.5,
                                        yValue: 2000,
                                        content: ["SKHy +99", "반도체계열 +20"],
                                        color: sChartColor2,
                                        font: { size: 14 }
                                    },
                                    {
                                        type: "label",
                                        xValue: 7.5,
                                        yValue: 2000,
                                        content: ["SKI △120", "SKON △114", "대내기타제조 +32", "대외제조 + 19"],
                                        color: [ sChartColor1,  sChartColor1, sChartColor2, sChartColor2],
                                        font: { size: 14 }
                                    },
                                    {
                                        type: "label",
                                        xValue: 11,
                                        yValue: 2000,
                                        content: ["금융 △90", "공공 + 8", "대내물류/서비스 △9", "유통/물류/서비스 +57", "대외Cloud + 134"],
                                        color: [ sChartColor1, sChartColor2,  sChartColor1, sChartColor2, sChartColor2],
                                        font: { size: 14 }
                                    },
                                ]
                            },
                            datalabels: {   // 데이터라벨 플러그인
                                color: "#555",
                                align: "top",
                                anchor: "end",
                                formatter: function (iValue) {
                                    return oNumberFormat.format(iValue);
                                },
                                font: {
                                    weight: 700
                                }
                            },
                        },
                        scales: {
                            x: {
                                stacked: false,
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    font: {
                                        size: 13,
                                        weight: 500
                                    }
                                }
                            },
                            y: {
                                beginAtZero: true,
                                max: 3000,
                                grid: {
                                    display: false
                                },
                            }
                        }
                    }
                })
            }.bind(this));
        },
    });
});           