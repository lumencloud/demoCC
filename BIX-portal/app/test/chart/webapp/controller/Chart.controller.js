
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/HTML"
], (Controller, JSONModel, HTML) => {
    "use strict";
    /**
     * @typedef {sap.ui.base.Event} Event
     */

    return Controller.extend("bix.test.chart.controller.Chart", {      

        /**
         * 초기 실행 메소드
         */
        onInit: async function () {
            let myRoute = this.getOwnerComponent().getRouter().getRoute("Chart");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: async function () {
            this.AnalyticalCardDataSetting1();
            this.ChartDataSetting();
            

        },

        AnalyticalCardDataSetting1: function () {
            let oModel = this.getOwnerComponent().getModel();
            let nMonth = 11
            let oBinding = oModel.bindContext("/get_actual_pl(year='2024',month='" + nMonth + "',org_id='5')");

            nMonth = nMonth - 1
            if (nMonth <= 0) { nMonth = 12 }
            let oBinding2 = oModel.bindContext("/get_actual_pl(year='2024',month='" + nMonth + "',org_id='5')");



            oBinding.requestObject().then((aData) => {
                aData.value.forEach((obj) => {
                    for (let key in obj) {
                        obj[key] = this._convertData(obj[key])
                    }
                })
                this.getView().setModel(new JSONModel(aData.value), "ACDS1_thisMonth")

            })


            oBinding2.requestObject().then((aData) => {
                this.getView().setModel(new JSONModel(aData.value), "ACDS1_lastMonth")
            })

        },
        _convertData: function (value) {
            let numericValue = Number(value);

            if (isNaN(numericValue)) {
                return value;
            }

            if (value < 10000) {
                return this._convertDecimalPoint(value)
            } else {
                return this._convertBillion(value)
            }
        },
        _convertDecimalPoint: function (value) {
            return Math.floor(Number(value) * 10) / 10
        },
        _convertBillion: function (value) {
            return Math.floor(Number(value) / 100000000)
        },

        ChartDataSetting: function () {
            let oModel = this.getOwnerComponent().getModel();
            //월별
            // for (let i = 0; i < 6; i++) {
            let aMonths = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
            
                

                let aDataList = []
                let aChartDataList = []
                let dataCall = aMonths.map((nMonth) => {
                    let oBinding = oModel.bindContext("/get_actual_pl(year='2024',month='" + nMonth + "',org_id='5')");
                    return oBinding.requestObject().then((oData)=>{                
                        aDataList.push(oData.value)
                    })                    
                })
                

                Promise.all(dataCall).then(()=>{
                    
                    for(let j=0; j<7; j++){

                        let oChartData = {
                            sId: '',
                            sTitle: '',
                            sLabel: '',
                            labels: [],
                            data: [],                    
                            target_curr_y_value: '',
                            actual_curr_ym_rate: ''
                        };
                        
                        for(let i = 0; i<aDataList.length; i++){                        
                            oChartData.sId = "Card_1_" + aDataList[i][j].seq
                            oChartData.sTitle = aDataList[i][j].type + " 실적"
                            let unit;
                            if (aDataList[i][j].type === "마진률" | "영업이익률") {
                                unit = "%"
                                oChartData.data.push(aDataList[i][j].actual_curr_ym_value)
                            } else {
                                unit = "억원"
                                oChartData.data.push(Math.floor(Number(aDataList[i][j].actual_curr_ym_value) / 1000000000))
                            }

                            oChartData.sLabel = "월 " + aDataList[i][j].type + "(" + unit + ")",
                            oChartData.labels.push((i+1) + "월")

                            // 목표
                            if (aDataList[i][j].target_curr_y_value) {
                                oChartData.target_curr_y_value = Math.floor(Number(aDataList[i][j].target_curr_y_value) / 1000000000);
                            }
                        }
                        
                        aChartDataList.push(oChartData);

                        
                    }
                    this._setChartTest(aChartDataList);
                    this._setChartTest2(aChartDataList);
                    this._setChartTest3(aChartDataList);
                })                

                
                // let aPromises = aMonths.map((nMonth) => {
                //     let oBinding = oModel.bindContext("/get_actual_pl(year='2024',month='" + nMonth + "',org_id='5')");

                //     return oBinding.requestObject().then((aData) => {
                //         oChartData.sId = "Card_1_" + aData.value[i].seq
                //         oChartData.sTitle = aData.value[i].type + " 실적"
                        // let unit;
                        // if (aData.value[i].type === "마진률" | "영업이익률") {
                        //     unit = "%"
                        //     oChartData.data.push(aData.value[i].actual_curr_ym_value)
                        // } else {
                        //     unit = "억원"
                        //     oChartData.data.push(Math.floor(Number(aData.value[i].actual_curr_ym_value) / 1000000000))
                        // }
                        
                        // oChartData.sLabel = "월 " + aData.value[i].type + "(" + unit + ")",
                        //     oChartData.labels.push((Number(nMonth)) + "월")
                        // oChartData.type = "bar"

                        // // 목표
                        // if (aData.value[i].target_curr_y_value) {
                        //     oChartData.target_curr_y_value = Math.floor(Number(aData.value[i].target_curr_y_value) / 1000000000);
                        // }
                //     });
                // })

                // Promise.all(aPromises).then(() => {
                //     this._setChartTest(oChartData)
                // })

            // }
        },

        _setChartTest2: function (aChartDataList) {
            
            let oBox = this.byId("Card_1_7_flex");

            if (oBox) {
                oBox.removeAllItems();
                let sWindowWidth = window.innerWidth;
                let dom = oBox.getDomRef();
                let nWidthRate = dom.offsetWidth / sWindowWidth * 90

                let oHTML = new HTML({
                    content: "<div class='custom-chart-container' style='position:relative !important margin:auto !important; height:auto !important ;width:" + nWidthRate + "vw !important;'><canvas id='Card_1_7' /></div>"
                });
                oBox.addItem(oHTML);

                oHTML.attachEventOnce("afterRendering", function () {
                    let ctx = document.getElementById("Card_1_7");

                    // 데이터 설정
                    let data = {
                        labels: aChartDataList[0].labels,
                        datasets: [
                            {
                                label: aChartDataList[0].sLabel,
                                data: aChartDataList[0].data,
                                type: 'bar',
                                yAxisID: "y",
                                order: 1,
                            },
                            {
                                label: aChartDataList[1].sLabel,
                                data: aChartDataList[1].data,
                                type: 'line',
                                order: 0,
                                yAxisID: "y-1",

                            },
                            {
                                label: aChartDataList[2].sLabel,
                                data: aChartDataList[2].data,
                                type: 'line',
                                order: 2,
                                yAxisID: "y-2",

                            },
                            {
                                label: aChartDataList[3].sLabel,
                                data: aChartDataList[3].data,
                                type: 'line',
                                order: 0,
                                yAxisID: "y-3",

                            },
                            {
                                label: aChartDataList[4].sLabel,
                                data: aChartDataList[4].data,
                                type: 'line',
                                order: 0,
                                yAxisID: "y-4",

                            },
                            {
                                label: aChartDataList[5].sLabel,
                                data: aChartDataList[5].data,
                                type: 'bar',
                                order: 0,
                                yAxisID: "y-5",

                            }

                        ]
                    }

                    //차트 설정
                    let options = {
                        responsive: true,
                        maintainAspectRatio: false, // ratio destroy
                        plugins: {

                            legend: {
                                position: 'left'
                            },
                            title: {
                                display: true,
                                text: "Multi Chart",
                                position: "top"
                            }
                        },
                        scales: {
                            x: {
                                ticks: {
                                    font: {
                                        size: 10
                                    }
                                },
                                stacked: true
                            },
                            y: {
                                display: false,
                            },
                            'y-1':{
                                display:false,
                                position: 'right'
                            },
                            'y-2':{
                                display:false
                            },
                            'y-3':{
                                display:false
                            },
                            'y-4':{
                                display:false
                            },
                            'y-5':{
                                display:false
                            },

                        }
                    };

                    new Chart(ctx, {
                        type: 'bar',
                        data: data,
                        options: options,
                    });                   

                }.bind(this));
            }
        
        },
        _setChartTest3: function (aChartDataList) {
            let aBoxList=["Card_1_8", "Card_1_9", "Card_1_10", "Card_1_11", "Card_1_12", "Card_1_13", "Card_1_14", "Card_1_15"]
            aBoxList.forEach((sBoxID)=>{
            let oBox = this.byId(sBoxID + "_flex");

            if (oBox) {
                oBox.removeAllItems();
                let sWindowWidth = window.innerWidth;
                let dom = oBox.getDomRef();
                let nWidthRate = dom.offsetWidth / sWindowWidth * 90

                let oHTML = new HTML({
                    content: "<div class='custom-chart-container' style='position:relative !important margin:auto !important; height:auto !important ;width:" + nWidthRate + "vw !important;'><canvas id='" + sBoxID + "' /></div>"

                    // content: "<canvas id='"+sBoxID+"' />"
                });
                oBox.addItem(oHTML);

                oHTML.attachEventOnce("afterRendering", function () {
                    let ctx = document.getElementById(sBoxID);

                    // 데이터 설정
                    let data = {
                        labels: aChartDataList[0].labels,
                        datasets: [
                            {
                                label: aChartDataList[0].sLabel,
                                data: aChartDataList[0].data,
                                type: 'bar',
                                yAxisID: "y",
                                order: 1,
                            },
                            {
                                label: aChartDataList[1].sLabel,
                                data: aChartDataList[1].data,
                                type: 'line',
                                order: 0,
                                yAxisID: "y-1",

                            },
                            {
                                label: aChartDataList[2].sLabel,
                                data: aChartDataList[2].data,
                                type: 'line',
                                order: 2,
                                yAxisID: "y-2",

                            },
                            {
                                label: aChartDataList[3].sLabel,
                                data: aChartDataList[3].data,
                                type: 'line',
                                order: 0,
                                yAxisID: "y-3",

                            },
                            {
                                label: aChartDataList[4].sLabel,
                                data: aChartDataList[4].data,
                                type: 'line',
                                order: 0,
                                yAxisID: "y-4",

                            },
                            {
                                label: aChartDataList[5].sLabel,
                                data: aChartDataList[5].data,
                                type: 'bar',
                                order: 0,
                                yAxisID: "y-5",

                            }

                        ]
                    }

                    //차트 설정
                    let options = {
                        responsive: true,
                        maintainAspectRatio: false, // ratio destroy
                        plugins: {

                            legend: {
                                position: 'left'
                            },
                            title: {
                                display: false,
                                text: "Multi Chart",
                                position: "top"
                            }
                        },
                        scales: {
                            x: {
                                ticks: {
                                    font: {
                                        size: 10
                                    }
                                },
                                stacked: true
                            },
                            y: {
                                display: false,
                            },
                            'y-1':{
                                display:false,
                                position: 'right'
                            },
                            'y-2':{
                                display:false
                            },
                            'y-3':{
                                display:false
                            },
                            'y-4':{
                                display:false
                            },
                            'y-5':{
                                display:false
                            },

                        }
                    };

                    new Chart(ctx, {
                        type: 'bar',
                        data: data,
                        options: options,
                    });                   

                }.bind(this));
            }
        })
        },

        _setChartTest: function (aChartDataList) {
            aChartDataList.forEach((oChartData)=>{
                console.log(oChartData);
            let oBox = this.byId(oChartData.sId + "_flex");

            if (oBox) {
                oBox.removeAllItems();
                let sWindowWidth = window.innerWidth;
                let dom = oBox.getDomRef();
                let nWidthRate = dom.offsetWidth / sWindowWidth * 90

                let oHTML = new HTML({
                    content: "<div class='custom-chart-container' style='position:relative !important margin:auto !important; height:auto !important ;width:" + nWidthRate + "vw !important;'><canvas id='" + oChartData.sId + "' /></div>"
                });
                oBox.addItem(oHTML);

                oHTML.attachEventOnce("afterRendering", function () {
                    let ctx = document.getElementById(oChartData.sId);

                    // 데이터 설정
                    let data = {
                        labels: oChartData.labels,
                        datasets: [
                            {
                                label: oChartData.sLabel,
                                data: oChartData.data,
                                type: 'bar',
                                yAxisID: "y",
                                order: 1,
                            }

                        ]
                    }

                    //차트 설정
                    let options = {
                        indexAxis: "y",
                        responsive: true,
                        maintainAspectRatio: false, // ratio destroy
                        plugins: {

                            legend: {
                                position: "left"
                            },
                            title: {
                                display: true,
                                text: oChartData.sTitle,
                                position: "top"
                            }
                        },
                        scales: {
                            x: {
                                ticks: {
                                    font: {
                                        size: 10
                                    }
                                },
                                stacked: true
                            },
                            y: {
                                display: true,
                            },
                            "y-1":{
                                display: true,
                                position:"right",
                            }

                        }
                    };

                    new Chart(ctx, {
                        type: 'bar',
                        data: data,
                        options: options,
                    });                   

                }.bind(this));
            }
        })
        },

        // _setLineTest: function (oChartData) {
        //     let oBox = this.byId(oChartData.sId);

        //     let oHTML = new HTML({
        //         content: `<div class="custom-chart-container"><canvas id='${oChartData.sId}' /></div>`
        //     });
        //     oBox.addItem(oHTML);

        //     oHTML.attachEventOnce("afterRendering", function () {
        //         let oCanvas = document.getElementById(oChartData.sId);
        //         let ctx = oCanvas.getContext("2d")

        //         const gradient = ctx.createLinearGradient(0, 0, 0, oCanvas.height);
        //         gradient.addColorStop(0, "rgba(33, 150, 243, 0.4)");
        //         gradient.addColorStop(1, "rgba(33, 150, 243, 0)");


        //         // 데이터 설정
        //         let data = {
        //             labels: oChartData.labels,
        //             datasets: [
        //                 {
        //                     label: oChartData.sLabel,
        //                     data: oChartData.data,
        //                     backgroundColor: gradient,
        //                     fill: true,
        //                     borderColor: "#2196f3",
        //                     tension: 0.4,
        //                     pointBackgroundColor: "#2196f3",
        //                     pointRadius: [0, 0, 5]  // 마지막 점 강조

        //                 },

        //             ]
        //         };

        //         //차트 설정
        //         const options = {
        //             responsive: false,
        //             maintainAspectRatio: false, // ratio destroy
        //             plugins: {

        //                 title: {
        //                     display: false,
        //                     text: oChartData.sTitle,
        //                     position: "top"
        //                 }
        //             },
        //             scales: {
        //                 x: {
        //                     ticks: {
        //                         font: {
        //                             size: 10,
        //                             autoSkip:false,
        //                             stepSize:1,
        //                         }
        //                     },
        //                     stacked: true
        //                 },
        //                 y: {
        //                     display: true
        //                 }

        //             }
        //         };

        //         new Chart(ctx, {
        //             type: 'line',
        //             data: data,
        //             options: options,
        //         });


        //     }.bind(this));
        // },
    });
});