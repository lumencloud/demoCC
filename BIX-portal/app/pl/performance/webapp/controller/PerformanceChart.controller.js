sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/core/format/NumberFormat",
    "sap/m/Token",
    "sap/m/MessageToast",
    "../util/Module",
    "sap/ui/core/library",
    "sap/ui/core/HTML",
], (Controller, JSONModel, MessageBox, Fragment, NumberFormat, Token, MessageToast, Module, coreLib, HTML) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     */
    return Controller.extend("bix.pl.performance.controller.PerformanceChart", {

        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RoutePLChart");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: function () {
            // this._chart0();

            let oLayoutModel = this.getOwnerComponent().getModel("layoutControl");
            oLayoutModel.setProperty("/3depth_usage", true);
            oLayoutModel.setProperty("/3depth_size", "50%");
            oLayoutModel.setProperty("/page", "chart");

            this.getOwnerComponent().getModel("controllerModel").setProperty("/chart", this);
        },

        /**
         * 차트 검색 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag 
         */
        _bindThird: async function (oEvent, sFlag) {
            // 유효성 검사
            this.getView().setBusy(true);

            // 선택값
            let oSearchData = this.getView().getModel("searchModel").getData();
            let iYear = oSearchData.yearMonth.getFullYear();

            let sUrl = `/odata/v4/common/mis_get_pl_sales(year='${iYear}',month='01',id='${oSearchData.orgId}')/Set`;
            let aResult = await Module._getData(sUrl);
            aResult = aResult.value;
            let oTemp = (!aResult[1].goal || aResult[1].goal === 0) ? 0 : ((aResult[1].performance / aResult[1].goal) * 100);

            if (aResult[1].goal == 0) {
                this._messageBox('warning', '목표 값이 존재하지 않습니다.');
            } else {
                let oForm = this.byId("pLPageChartBox1");
                oForm.removeAllItems();

                this._chart1(oTemp);
            }

            this.getView().setBusy(false);
        },

        /**
         * 검색 조건 변경 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag 
         */
        onChangeSearch: function (oEvent, sFlag) {
            let oSource = oEvent.getSource();

            if (sFlag === "month") {
                let isValidValue1 = oSource.isValidValue();
                let isValidValue2 = oSource.getDateValue();
                if (!isValidValue1 || !isValidValue2) {
                    oEvent.getSource().setValueState("Error");
                    return;
                } else {
                    oEvent.getSource().setValueState("None");
                };
            };
        },

        /**
         * 메시지 박스 생성 함수
         * @param {String} status 
         * @param {String} message 
         * @param {String} title 
         */
        _messageBox: function (status, message, title) {
            MessageBox[status](message, {
                title: title,
            })
        },

        _chart0: function () {
            const svgNamespace = "http://www.w3.org/2000/svg";

            const svg = document.createElementNS(svgNamespace, "svg");
            svg.setAttribute("version", "1.1");
            svg.setAttribute("xmlns", "svgNamespace");
            svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
            svg.setAttribute("viewBox", "0 0 200 200");
            svg.setAttribute("xml:space", "preserve");

            const paths = [
                {
                    id: "donut-outer",
                    d: "M100,200c55.228,0,100-44.772,100-100s-44.772-100-100-100S0,44.772,0,100s44.772,100-100s-44.772-100-100S0,44.772,0,100s44.772,100,100,100z"
                },
                {
                    id: "donut-inner",
                    d: "M100,160c33.137,0,60-26.863,60-60s-26.863-60-60-60S40,60,40,100s26.863,60,60,60z"
                }
            ]

            paths.forEach(pathData => {
                const path = document.createElementNS(svgNamespace, "path");
                path.setAttribute("data-shape-id", pathData.id);
                path.setAttribute("d", pathData.d);
                path.setAttribute("fill", pathData.id === "donut-inner" ? "white" : "lightblue");
                svg.appendChild(path);
            })

            // 가로로 반 자르기
            const clipPath = document.createElementNS(svgNamespace, "clipPath");
            clipPath.setAttribute("id", "halfClip");

            const rect = document.createElementNS(svgNamespace, "rect");
            rect.setAttribute("x", "0");
            rect.setAttribute("y", "0");
            rect.setAttribute("width", "200");
            rect.setAttribute("height", "100");

            clipPath.appendChild(rect);
            svg.appendChild(clipPath);

            // svg.setAttribute("clip-path", "url(#halfClip)");

            // document.body.appendChild(svg);

            const test = `<svg version="1.1" xmlns="svgNamespace" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 200 200" xml:space="preserve" clip-path="url(#halfClip)"><path data-shape-id="donut-outer" d="M100, 200c55.228,0,100-44.772,100-100s-44.772-100-100-100S0,44.772,0,100s44.772,100-100s-44.772-100-100S0,44.772,0,100s44.772,100,100,100z" fill="lightblue"></path><path data-shape-id="donut-inner" d="M100,160c33.137,0,60-26.863,60-60s-26.863-60-60-60S40,60,40,100s26.863,60,60,60z" fill="white"></path><clipPath id="halfClip">rect x="0" y="0" width="200" height="100"></rect></clipPath></svg>`
            this.byId("customShape0").setDefinition(test)

        },

        _chart1: function (sValue) {
            let oForm = this.byId("pLPageChartBox1");
            const oHTML = new HTML({
                content: "<canvas id='chart1' width='240' height='240' >"
            });
            oForm.addItem(oHTML);

            oHTML.attachEventOnce("afterRendering", function () {
                const ctx = document.getElementById('chart1');

                //차트에 넣을 데이터 수정
                let iData = sValue;
                let sData = this.onChartRate(sValue / 100);

                if (iData > 100) {
                    iData = 100;
                };

                //데이터 설정
                const data = {
                    labels: ["목표 대비 실적 진척률 (마진)"],
                    datasets: [{
                        data: [iData, 100 - iData],
                        backgroundColor: ['#65e6bd', '#ddd'],
                        borderWidth: 0
                    }]
                };

                //차트 설정
                const options = {
                    responsive: false,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    rotation: -90,
                    circumference: 180,
                    plugins: {
                        legend: {
                            display: false,
                            position: 'bottom',
                        },
                        tooltip: {
                            enabled: false
                        },
                        title: {
                            display: true,
                            text: "목표 대비 실적 진척률 (마진)",
                            position: "bottom",
                            padding: {
                                top: -50
                            },
                            font: {
                                size: 16
                            }
                        }
                    }
                };

                //도넛 차트 가운데 문자 설정
                let sCenterTextPlugin = {
                    id: 'centerText',
                    beforeDraw: function (chart) {
                        let width = chart.width,
                            height = chart.height,
                            ctx = chart.ctx;

                        // 상태 복원
                        ctx.restore();
                        let fontSize = 2;
                        ctx.font = fontSize + "em sans-serif";
                        ctx.fillStyle = '#000000';
                        ctx.textBaseline = "middle";

                        let text = sData,
                            textX = Math.round((width - ctx.measureText(text).width) / 2),
                            textY = 165;

                        ctx.fillText(text, textX, textY);

                        ctx.save();
                    }
                };
                Chart.unregister(sCenterTextPlugin);
                Chart.register(sCenterTextPlugin);

                new Chart(ctx, {
                    type: 'doughnut',
                    data: data,
                    options: options,
                });
            }.bind(this));
        },

        /**
         * 퍼센트 Formatter
         * @param {Number} iNum 
         * @returns {Number | null}
         */
        onChartRate: function (iNum) {
            const oNumberFormat = NumberFormat.getPercentInstance({
                groupingSeparator: ',',
                decimals: 2
            });

            return oNumberFormat.format(iNum);
        },
    });
});