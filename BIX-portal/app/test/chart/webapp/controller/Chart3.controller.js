sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/HTML"
], (Controller, JSONModel, HTML) => {
    "use strict";
    /**
     * @typedef {sap.ui.base.Event} Event
     */

    return Controller.extend("bix.test.chart.controller.Chart3", {
        /**
         * 초기 실행 메소드
         */
        onInit: async function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("Chart3");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: async function () {
            this._setChartTest();
        },

        _setChartTest: function () {
            let oBox = this.byId("chartBox");
            oBox.removeAllItems();

            const oHTML = new HTML({
                content: "<canvas id='chart1' width='480' height='240' >"
            });
            oBox.addItem(oHTML);

            oHTML.attachEvent("afterRendering", function () {
                const ctx = document.getElementById('chart1');

                // 데이터 설정
                const data = {
                    labels: ["Test Label", "Test Label2", "Test Label3"],
                    datasets: [
                        {
                            label: "Test1",
                            data: [10000, 20000, 30000],
                            yAxisID: "y",
                        },
                        {
                            label: "Test2",
                            data: [30000, 40000, 50000],
                            yAxisID: "y",
                        },
                        {
                            label: "Test3",
                            data: [50, -40, 10],
                            type: "line",
                            yAxisID: "y1",
                        },
                    ]
                };

                //차트 설정
                const options = {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: "Test Chart",
                            position: "top"
                        }
                    },
                    scales: {
                        x: {
                            stacked: true
                        },
                        y: {
                            position: "left",
                            stacked: true
                        },
                        y1: {
                            position: "right",
                            min: -100,
                            max: 100,
                            grid: {
                                display: false
                            }
                        }
                    }
                };

                new Chart(ctx, {
                    type: 'bar',
                    data: data,
                    options: options,
                });
            }.bind(this));
        },
    });
});