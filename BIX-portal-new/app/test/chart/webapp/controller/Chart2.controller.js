sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/HTML"
], (Controller, JSONModel, HTML) => {
    "use strict";
    /**
     * @typedef {sap.ui.base.Event} Event
     */

    return Controller.extend("bix.test.chart.controller.Chart2", {
        /**
         * 초기 실행 메소드
         */
        onInit: async function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("Chart2");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: async function () {
            this._setMixChartTest();
            this._setBubbleChartTest();
            // this._setChartTest();
            this._setChartTest1();
            this._setChartTest5();
            this._setChartTest6();
            this._setChartTest7();
            this._setChartTest8();
            this._setChartTest9();
        },

        _setMixChartTest: function () {
            let oBox = this.byId("chartBox");
            oBox.removeAllItems();

            const oHTML = new HTML({
                content: "<canvas id='chart' width='480' height='240' >"
            });
            oBox.addItem(oHTML);

            oHTML.attachEventOnce("afterRendering", function () {
                const ctx = document.getElementById('chart');

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
        _setChartTest1: function () {
            let oBox = this.byId("chartBox1");
            oBox.removeAllItems();

            const oHTML = new HTML({
                content: "<canvas id='chart1' width='480' height='240' >"
            });
            oBox.addItem(oHTML);

            oHTML.attachEventOnce("afterRendering", function () {
                const ctx = document.getElementById('chart1');

                // 데이터 설정
                const data = {
                    labels: ["3월", "4월", "5월"],
                    datasets: [
                        {
                            label: "총비용(원)",
                            data: [30000, 40000, 50000],
                            yAxisID: "y",
                        },
                    ]
                };

                //차트 설정
                const options = {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: "비용 실적",
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
        _setChartTest5:async function () {
            
            let oModel = this.getOwnerComponent().getModel();
            const oBinding = oModel.bindContext("/get_home_chart_volatility_cost(year='2024',org_id='5')");
            let aChartData = await oBinding.requestObject();
            let aLabel = []
            let aSale = []
            let aCos = []
            let aSgna = []

            aChartData.value.forEach(data =>{
                aLabel.push(data.month)
                aSale.push(data.sale)
                aCos.push(data.cos)
                aSgna.push(data.sgna)
            })
            let oBox = this.byId("chartBox5");
            oBox.removeAllItems();

            const oHTML = new HTML({
                content: "<canvas id='chart5' width='480' height='240' >"
            });
            oBox.addItem(oHTML);

            oHTML.attachEventOnce("afterRendering", function () {
                const ctx = document.getElementById('chart5');

                // 데이터 설정
                const data = {
                    labels: aLabel,
                    datasets: [
                        {
                            label: "매출(원)",
                            data: aSale,
                            yAxisID: "y",
                        },
                        {
                            label: "기초원가(프로젝트비용 등)(원)",
                            data: aCos,
                            yAxisID: "y",
                            type: "line"
                        },
                        {
                            label: "사업SG&A(원)",
                            data: aSgna,
                            yAxisID: "y",
                            type: "line"
                        }
                    ]
                };

                //차트 설정
                const options = {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: "매출 대비 비용 변동성 추이",
                            position: "top"
                        }
                    },
                    scales: {
                        y: {
                            position: "left",
                            stacked: true
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
        _setChartTest6:async function () {
            
            let oModel = this.getOwnerComponent().getModel();
            const oBinding = oModel.bindContext("/get_home_chart_sgna_pie(year='2024',month='09',org_id='5')");
            let aChartData = await oBinding.requestObject();            
            let aLabel = []
            let aData = []
            aChartData.value.forEach(element => {
                aLabel.push(element.type)
                aData.push({"amount":element.amount,"percent":element.rate})
            });
            let oBox = this.byId("chartBox6");
            oBox.removeAllItems();

            const oHTML = new HTML({
                content: "<canvas id='chart6' width='480' height='240' >"
            });
            oBox.addItem(oHTML);

            oHTML.attachEventOnce("afterRendering", function () {
                const ctx = document.getElementById('chart6');
                // 데이터 설정
                const data = {
                    labels: aLabel,
                    datasets: [
                        {
                            label: "data",
                            data: aData,
                            backgroundColor:['red','blue','yellow']
                        }
                    ]
                };
                //차트 설정
                const options = {
                    parsing:{
                        key: 'amount'
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: "비용 구성",
                            position: "top"
                        },
                        tooltip:{
                            callbacks:{
                                label: function(context){
                                    const dataItem = context.raw;
                                    return [
                                        `amount: ${dataItem.amount.toLocaleString()}`,
                                        `percent: ${dataItem.percent}%`
                                    ]
                                }
                            }
                        }
                    }
                };

                new Chart(ctx, {
                    type: 'pie',
                    data: data,
                    options: options,
                });
            }.bind(this));
        },
        _setChartTest7:async function () {
            
            let oModel = this.getOwnerComponent().getModel();
            const oBinding = oModel.bindContext("/get_home_chart_year(year='2024',range='3',org_id='5')");
            let aChartData = await oBinding.requestObject();
            let aLabel = []
            let aBill = []
            let aOpp = []
            let aYoy = []
            aChartData.value.forEach(data =>{
                aLabel.push(data.year)
                aBill.push(data.bill)
                aOpp.push(data.opp)
                aYoy.push(data.sale_yoy)
            })
            let oBox = this.byId("chartBox7");
            oBox.removeAllItems();

            const oHTML = new HTML({
                content: "<canvas id='chart7' width='480' height='240' >"
            });
            oBox.addItem(oHTML);

            oHTML.attachEventOnce("afterRendering", function () {
                const ctx = document.getElementById('chart7');

                // 데이터 설정
                const data = {
                    labels: aLabel,
                    datasets: [
                        {
                            label: "확보매출(원)",
                            data: aBill,
                            yAxisID: "y",
                        },
                        {
                            label: "미확보매출(원)",
                            data: aOpp,
                            yAxisID: "y",
                        },
                        {
                            label: "YoY(%)",
                            data: aYoy,
                            yAxisID: "y1",
                            type: "line"
                        }
                    ]
                };

                //차트 설정
                const options = {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: "매출 추이",
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
                            min: 0,
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
        _setChartTest8:async function () {
            
            let oModel = this.getOwnerComponent().getModel();
            const oBinding = oModel.bindContext("/get_home_chart_year(year='2024',range='3',org_id='5')");
            let aChartData = await oBinding.requestObject();
            let aLabel = []
            let aMargin = []
            let aYoy = []
            aChartData.value.forEach(data =>{
                aLabel.push(data.year)
                aMargin.push(data.margin)
                aYoy.push(data.margin_yoy)
            })
            let oBox = this.byId("chartBox8");
            oBox.removeAllItems();

            const oHTML = new HTML({
                content: "<canvas id='chart8' width='480' height='240' >"
            });
            oBox.addItem(oHTML);

            oHTML.attachEventOnce("afterRendering", function () {
                const ctx = document.getElementById('chart8');

                // 데이터 설정
                const data = {
                    labels: aLabel,
                    datasets: [
                        {
                            label: "마진(원)",
                            data: aMargin,
                            yAxisID: "y",
                        },
                        {
                            label: "YoY(%)",
                            data: aYoy,
                            yAxisID: "y1",
                            type: "line"
                        }
                    ]
                };

                //차트 설정
                const options = {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: "마진 추이",
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
                            min: 0,
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
        _setChartTest9:async function () {
            
            let oModel = this.getOwnerComponent().getModel();
            const oBinding = oModel.bindContext("/get_home_chart_year(year='2024',range='3',org_id='5')");
            let aChartData = await oBinding.requestObject();
            let aLabel = []
            let aCont = []
            let aYoy = []
            aChartData.value.forEach(data =>{
                aLabel.push(data.year)
                aCont.push(data.cont)
                aYoy.push(data.cont_yoy)
            })
            let oBox = this.byId("chartBox9");
            oBox.removeAllItems();

            const oHTML = new HTML({
                content: "<canvas id='chart9' width='480' height='240' >"
            });
            oBox.addItem(oHTML);

            oHTML.attachEventOnce("afterRendering", function () {
                const ctx = document.getElementById('chart9');

                // 데이터 설정
                const data = {
                    labels: aLabel,
                    datasets: [
                        {
                            label: "공헌이익(원)",
                            data: aCont,
                            yAxisID: "y",
                        },
                        {
                            label: "YoY(%)",
                            data: aYoy,
                            yAxisID: "y1",
                            type: "line"
                        }
                    ]
                };

                //차트 설정
                const options = {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: "공헌이익 추이",
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

        _setBubbleChartTest: function () {
            let oBox = this.byId("chartBox2");
            oBox.removeAllItems();

            const oHTML = new HTML({
                content: "<canvas id='chart2' width='480' height='240' >"
            });
            oBox.addItem(oHTML);

            oHTML.attachEventOnce("afterRendering", function () {
                const ctx = document.getElementById('chart2');

                // 데이터 설정 (x: x축, y: y축, r: 반지름)
                const data = {
                    datasets: [
                        {
                            label: "Test1",
                            data: [
                                { x: 10, y: 20, r: 10 },
                                { x: 15, y: 25, r: 15 },
                                { x: 12, y: 18, r: 12 },
                            ]
                        },
                        {
                            label: "Test2",
                            data: [
                                { x: 20, y: 10, r: 10 },
                                { x: 25, y: 15, r: 15 },
                                { x: 22, y: 8, r: 12 },
                            ]
                        },
                        {
                            label: "Test3",
                            data: [
                                { x: 30, y: 30, r: 10 },
                                { x: 35, y: 35, r: 15 },
                                { x: 32, y: 28, r: 12 },
                            ]
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
                    }
                };

                new Chart(ctx, {
                    type: 'bubble',
                    data: data,
                    options: options,
                });
            }.bind(this));
        },
    });
});