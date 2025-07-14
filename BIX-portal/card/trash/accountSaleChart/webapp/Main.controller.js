sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/EventBus",


], function (Controller, ODataModel, EventBus) {
    "use strict";

    return Controller.extend("bix.card.accountSaleChart.Main", {
        _sCanvasId: undefined,
        _sContainerId: undefined,
        _oMyChart: undefined,
        _oEventBus: EventBus.getInstance(),

        _oSessionData: 
        {
            'sOrgId': undefined,
            'sYear' : undefined,
            'sMonth' : undefined
        },

        onInit: function () {
            //component별 id 설정
            this._createId()
            // 차트 초기 설정            
            this._setChart();
            // 이벤트 버스 발생시 차트 업데이트
            this._oEventBus.subscribe("pl", "search", this._updateChart, this);

        },

        _createId: function () {
            this._sCanvasId = this.createId("canvas");
            this._sContainerId = this.createId("container");
            this._iMinHeight = 600;
        },

        _updateChart: async function () {
            let oResult = await this._setSessionData();

            this._oMyChart.data.labels = oResult.aLabel;
            this._oMyChart.data.datasets[0].data = oResult.aContract;
            this._oMyChart.data.datasets[1].data = oResult.aSale;
            this._oMyChart.data.datasets[2].data = oResult.aMargin;

            this._oMyChart.update();


        },

        _setSessionData: async function () {
            let oInitData = JSON.parse(sessionStorage.getItem("initSearchModel"))
            let dYearMonth = new Date(oInitData.yearMonth)
            let sOrgId = oInitData.orgId
            let sYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");

             // 데이터 변화를 감지해서 차트 렌더링
             if(this._oSessionData.sOrgId != sOrgId || this._oSessionData.sYear != sYear || this._oSessionData.sMonth != sMonth){
                this._oSessionData.sOrgId = sOrgId
                this._oSessionData.sYear = sYear
                this._oSessionData.sMonth = sMonth
            } else {
                return
            }

            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl-api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

           

            const oBinding = oModel.bindContext(`/get_pl_account_sale_chart(year='${sYear}',month='${sMonth}')`);            
            let aResults = await oBinding.requestObject();
            let oResult = await this._setChartData(aResults.value);
            return oResult;
        },

        _setChartData: function (aData) {
            let aLabel = [], aSale = [], aContract = [], aMargin = []

            aData.forEach(data => {
                aLabel.push(data.name)
                aSale.push(data.sale)
                aContract.push(data.contract)
                aMargin.push(data.margin);
            });

            return { aLabel: aLabel, aSale: aSale, aContract: aContract, aMargin: aMargin };
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
            oHTML.setContent(`<div id='${this._sContainerId}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._sCanvasId}' style='padding: 0 2.5rem'/></div>`);
            oHTML.attachEvent("afterRendering", async function () {

                const ctx = document.getElementById(this._sCanvasId).getContext("2d");

                //데이터 셋팅 부분
                let oResult = await this._setSessionData();

                //차트 구성
                this._oMyChart = new Chart(ctx, {
                    data: {
                        labels: oResult.aLabel,
                        datasets: [{
                            type: "bar",
                            label: "수주",
                            data: oResult.aContract,
                        },
                        {
                            type: "bar",
                            label: "매출",
                            data: oResult.aSale,
                        },
                        {
                            type: "bar",
                            label: "마진",
                            data: oResult.aMargin,
                        }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: { text: '월별 매출' },
                            legend: {
                                display: true,
                                position: 'bottom'
                            }
                        },
                        indexAxis: 'y',
                        scales: {
                            y: {
                                stacked: true
                            },
                            x: {
                                stacked: true,
                                barPercentage: 0.5,
                                categoryPercentage: 0.7
                            }
                        },
                        elements: {
                            line: {
                                tension: 0.4
                            }
                        }
                    },
                    plugins: [ChartDataLabels]
                });
            }.bind(this));
        },

    });
});