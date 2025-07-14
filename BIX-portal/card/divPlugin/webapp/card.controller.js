sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
    "sap/ui/model/odata/v4/ODataModel",
    "../../main/util/Module",



], function (Controller, NumberFormat, EventBus, ODataModel, Module) {
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

            
            this._oEventBus.subscribe("home", "search", this._updateChart, this);

        },

        _updateChart: async function (){
            let aData = await this._setData()

            let oChart = this._oMyChart
            oChart.data.labels = aData.aLabel
            oChart.data.datasets[0].data = aData.aLast;
            oChart.data.datasets[1].data = aData.aCurr;
            oChart.config._config.options.plugins.groupLabels.divNameSums = aData.aGroup
            oChart.config._config.options.plugins.groupLabels.labels =  aData.aGroupValue
            oChart.update();


        },

        /**
         * Component별 유일한 ID 생성
         */
        _createId: function () {
            this._sCanvasId = this.createId("canvas");
            this._sContainerId = this.createId("container");
            this._iMinHeight = 400;
          },

        _setChart: async function () {
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 95);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 90);

            const oNumberFormat = NumberFormat.getFloatInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                decimals: 0
            });

            //subLabels

            let subLabels = {
                id: "subLabels",
                afterDatasetsDraw(chart, args, pluginOptions) {

                    const ctx = chart.ctx;
                    const { bottom, top } = chart.chartArea;
                    const xScale = chart.scales.x;
                    const aSubLabel = chart.options.plugins.groupLabels.labels;
                    const divNameSums = chart.options.plugins.groupLabels.divNameSums;

                    let grouped = {}
                    aSubLabel.forEach((divName, idx) => {
                        if (!grouped[divName]) {
                            grouped[divName] = { start: idx + 1, end: idx };
                        } else {
                            grouped[divName].end = idx;
                        }
                    })

                    const sumMap = new Map();
                    divNameSums.forEach(obj => {
                        sumMap.set(obj.div_name, obj.sum);
                    })
                    

                    const groupNames = Object.keys(grouped);
                    groupNames.forEach((divName, i) => {
                        let info = grouped[divName];
                        let centerIdx = Math.floor((info.start + info.end) / 2);
                        let labelX = xScale.getPixelForValue(centerIdx);

                        if (i === 1 || i === 3) {
                            labelX -= 30;
                        }

                        // 1. 부문명
                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.font = 'bold 12px sans-serif'
                        ctx.fillStyle = '#222'
                        ctx.fillText(divName, labelX, top + 40);

                        // 2. 금액(합계)
                        let sumValue = sumMap.get(divName);
                        if (sumValue !== undefined) {
                            let format = oNumberFormat.format(sumValue/100000000);
                            let sign = sumValue >= 0 ? '+' : '';
                            let color = sumValue >= 0 ? "#222" : "red";
                            ctx.font = 'bold 12px sans-serif'
                            ctx.fillStyle = color
                            ctx.fillText(sign + format, labelX, top +20)
                        }

                        ctx.restore();
                        // if (i === groupNames.length - 1) {
                        //     labelX = xScale.getPixelForValue(info.end) + 20;
                        // }
                        if (i === groupNames.length - 1) { return; }

                        let lastIdx = info.end;
                        let lineX = xScale.getPixelForValue(lastIdx) + 25;
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(lineX, top);
                        ctx.lineTo(lineX, bottom);
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([4.2]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.restore();
                    })
                }
            }
            let aData = await this._setData()

            let oHTML = this.byId("html");
            oHTML.setContent(`<div id='${this._sContainerId}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._sCanvasId}' /></div>`);
            oHTML.attachEvent("afterRendering", function () {

                

                
                // 차트 색상
                let sChartColor1 = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart5');
                let sChartColor2 = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart6');
                let sChartColor3 = getComputedStyle(document.documentElement).getPropertyValue('--custom_black4');
                let sChartColor4 = getComputedStyle(document.documentElement).getPropertyValue('--custom_black5');
                let sChartColor5 = getComputedStyle(document.documentElement).getPropertyValue('--custom_black6');
                const ctx = /** @type {HTMLCanvasElement} */ (document.getElementById(this._sCanvasId)).getContext("2d");
                this._oMyChart = new Chart(ctx, {
                    type: "bar",
                    data: {
                        labels: aData.aLabel,
                        datasets: [
                            {
                                label: "전년도",
                                data: aData.aLast,
                                borderRadius: 3,
                                backgroundColor: sChartColor4,
                                yAxisID: 'y'
                            },
                            {
                                label: "올해",
                                data: aData.aCurr,
                                borderRadius: 3,
                                backgroundColor: function (oContext) {  // 0보다 작으면 빨간색 적용
                                    let index = oContext.dataIndex;
                                    return (aData.aCurr[index] - aData.aLast[index] < 0) ?  sChartColor1 : sChartColor2;
                                },
                                yAxisID: 'y'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: {
                            padding: {
                                top: 40,
                                bottom: 0,
                                left: 0,
                                right: 0,
                            }
                        },
                        plugins: {
                            legend: {
                                display: true,
                                position: 'bottom',
                            },
                            // annotation: {
                            //     annotations: [
                            //         {
                            //             type: "line",
                            //             scaleID: "x",
                            //             value: 2.5, // 세로 구분선 X축 위치
                            //             borderColor: sChartColor3,   // 점선 색
                            //             borderWidth: 2, // 점선 두께
                            //             borderDash: [5, 5],   // 점선 패턴 길이
                            //         },
                            //         {
                            //             type: "line",
                            //             scaleID: "x",
                            //             value: 4.5, // 세로 구분선 X축 위치
                            //             borderColor: sChartColor3,   // 점선 색
                            //             borderWidth: 2, // 점선 두께
                            //             borderDash: [5, 5],   // 점선 패턴 길이
                            //         },
                            //         {
                            //             type: "line",
                            //             scaleID: "x",
                            //             value: 8.5, // 세로 구분선 X축 위치
                            //             borderColor: sChartColor3,   // 점선 색
                            //             borderWidth: 2, // 점선 두께
                            //             borderDash: [5, 5],   // 점선 패턴 길이
                            //         },

                            //         {
                            //             type: "label",
                            //             xValue: 1,
                            //             yValue: 2750,
                            //             content: ["AT/DT", "+175"],
                            //             color: sChartColor2,
                            //             font: [{ size: 20 }, { size: 20, weight: "bold" }],
                            //         },
                            //         {
                            //             type: "label",
                            //             xValue: 3.5,
                            //             yValue: 2750,
                            //             content: ["Hi-Tech.", "+119"],
                            //             color: sChartColor2,
                            //             font: [{ size: 20 }, { size: 20, weight: "bold" }],
                            //         },
                            //         {
                            //             type: "label",
                            //             xValue: 6.5,
                            //             yValue: 2750,
                            //             content: ["제조/Global", "△182"],
                            //             color:  sChartColor1,
                            //             font: [{ size: 20 }, { size: 20, weight: "bold" }],
                            //         },
                            //         {
                            //             type: "label",
                            //             xValue: 11,
                            //             yValue: 2750,
                            //             content: ["금융/전략", "+100"],
                            //             color: sChartColor2,
                            //             font: [{ size: 20 }, { size: 20, weight: "bold" }],
                            //         },

                            //         {
                            //             type: "label",
                            //             xValue: 1,
                            //             yValue: 2000,
                            //             content: ["SKT +151", "SKB +24", "기타ICT계열 +0"],
                            //             color: sChartColor2,
                            //             font: { size: 14 },
                            //             color: [ sChartColor1,  sChartColor1, sChartColor2, sChartColor2],
                            //         },
                            //         {
                            //             type: "label",
                            //             xValue: 3.5,
                            //             yValue: 2000,
                            //             content: ["SKHy +99", "반도체계열 +20"],
                            //             color: sChartColor2,
                            //             font: { size: 14 }
                            //         },
                            //         {
                            //             type: "label",
                            //             xValue: 7.5,
                            //             yValue: 2000,
                            //             content: ["SKI △120", "SKON △114", "대내기타제조 +32", "대외제조 + 19"],
                            //             color: [ sChartColor1,  sChartColor1, sChartColor2, sChartColor2],
                            //             font: { size: 14 }
                            //         },
                            //         {
                            //             type: "label",
                            //             xValue: 11,
                            //             yValue: 2000,
                            //             content: ["금융 △90", "공공 + 8", "대내물류/서비스 △9", "유통/물류/서비스 +57", "대외Cloud + 134"],
                            //             color: [ sChartColor1, sChartColor2,  sChartColor1, sChartColor2, sChartColor2],
                            //             font: { size: 14 }
                            //         },
                            //     ]
                            // },
                            datalabels: {   // 데이터라벨 플러그인
                                
                                color: "#555",
                                align: "top",
                                anchor: "end",
                                formatter: function (iValue) {
                                    if(iValue < 100000000){
                                        return null
                                    } else {
                                    return oNumberFormat.format(iValue / 100000000);
                                }
                                },
                                font: {
                                    weight: 700
                                }

                            },
                             groupLabels: {
                                labels: aData.aGroup,
                                divNameSums: aData.aGroupValue
                            }
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
                                type:"linear",
                                display: true,
                                beginAtZero: true,
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    callback: function (value) {
                                        if (value % 100000000 === 0) {
                                            return (value / 100000000).toLocaleString() + '억';
                                        };
                                    }
                                },
                            }
                        }
                    },
                    plugins: [ChartDataLabels, subLabels],

                })

            }.bind(this));
        },

        _setData: async function () {

            this.byId("cardContent").setBusy(true);

            // 세션스토리지에서 데이터 가져오기
            let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;
    
            // 데이터 호출 병렬 실행
            const oModel = new ODataModel({
              serviceUrl: "../odata/v4/pl_api/",
              synchronizationMode: "None",
              operationMode: "Server"
            });
            
              let aResult = await oModel.bindContext(`/get_actual_q_account_sale_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`).requestObject().catch((oErr) => {
                Module.displayStatus(this.getOwnerComponent().oCard,oErr.error.code, this.byId("cardContent"));
              });
              
            this.byId("cardContent").setBusy(false);

            let aData = await this._convertData(aResult.value);

            return aData
          },

          _convertData: function(aData){
            let aLabel = [];
            let aCurr = [];
            let aLast = [];
            let aGroup = [];
            let aGroupValue = [];

            aData.forEach(
                function(oData){
                    aLabel.push(oData.acc_name)
                    aCurr.push(oData.curr_sale)
                    aLast.push(oData.last_sale)                    
                    aGroup.push(oData.org_name)
                    aGroupValue.push({
                        div_name : oData.org_name,
                        sum : oData.org_sale_sum_gap
                    })
                }
            )
            
            
            return {aLabel, aCurr, aLast, aGroup, aGroupValue}
          }
    });
});           