
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",

], function (Controller, ODataModel, JSONModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.plGrid4.Main", {
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
            this._iMinHeight = 60;
        },

        _updateChart: async function () {
            let oResult = await this._setSessionData();

            this._oMyChart.data.labels = oResult.aLabels;
            this._oMyChart.data.datasets[0].data = oResult.oResult;

            this._oMyChart.update();


        },

        _setSessionData: async function () {
            this.getView().setModel(new JSONModel([]), "chartModel");
            let oInitData = JSON.parse(sessionStorage.getItem("initSearchModel"))
            let dYearMonth = new Date(oInitData.yearMonth)
            let sOrgId = oInitData.orgId
            let sYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");

             // 데이터 변화를 감지해서 차트 렌더링
            //  if(this._oSessionData.sOrgId != sOrgId || this._oSessionData.sYear != sYear || this._oSessionData.sMonth != sMonth){
            //     this._oSessionData.sOrgId = sOrgId
            //     this._oSessionData.sYear = sYear
            //     this._oSessionData.sMonth = sMonth
            // } else {
            //     return
            // }

            // 데이터 호출 병렬 실행                
            let oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            let aRequests = [];
            let aLabels = [];

            for (let i = 3; i > 0; i--) {
                // Path 설정
                let dDate = new Date(sYear, parseInt(sMonth) - i);
                let iYear = dDate.getFullYear();
                let iMonth = String(dDate.getMonth() + 1).padStart(2, "0");
                aLabels.push(`${iYear}-${iMonth}`);
                let sPath = `/get_actual_pl(year='${iYear}',month='${iMonth}',org_id='${sOrgId}')`;

                // 함수 저장
                let oBinding = oModel.bindContext(sPath);
                let fnRequest = () => oBinding.requestObject();
                aRequests.push(fnRequest);
            };

            // 차트 데이터
            let aResults = await Promise.all(aRequests.map(fn => fn()));
            let oResult = await this._setChartData(aResults, aLabels);
            return{oResult, aLabels};
        },

        _setChartData: function (aResults, aLabels) {
            // let aChartData = aResults.map(oResult => oResult.value.find(oData => oData.seq == "1").performanceCurrentYearMonth);
            // let aChartData2 = aResults.map(oResult => oResult.value.find(oData => oData.seq == "2").performanceCurrentYearMonth);
            // let aChartData3 = aResults.map(oResult => oResult.value.find(oData => oData.seq == "4").performanceCurrentYearMonth);
            let aChartData4 = aResults.map(oResult => oResult.value.find(oData => oData.display_order == "5").actual_curr_ym_value);
            // let aChartData5 = aResults.map(oResult => oResult.value.find(oData => oData.seq == "6").performanceCurrentYearMonth);
            // let aChartData6 = aResults.map(oResult => oResult.value.find(oData => oData.seq == "7").performanceCurrentYearMonth);

            // 차트 제목 및 주요지표 설정
            let oNumberFormat = NumberFormat.getFloatInstance({
                groupingEnabled: true,
                groupingSeparator: ','
            });

            // let oChartInfo = {
            //     title: aLabels[aLabels.length - 1],
            //     value: `${oNumberFormat.format((aChartData[aChartData.length - 1] / 100000000).toFixed(0))}억`
            // }
            // this.getView().getModel("chartModel").setProperty("/0", oChartInfo);            

            // let oChartInfo2 = {
            //     title: aLabels[aLabels.length - 1],
            //     value: `${oNumberFormat.format((aChartData2[aChartData2.length - 1] / 100000000).toFixed(0))}억`
            // }
            // this.getView().getModel("chartModel").setProperty("/1", oChartInfo2);

            // let oChartInfo3 = {
            //     title: aLabels[aLabels.length - 1],
            //     value: `${oNumberFormat.format((aChartData3[aChartData3.length - 1] / 100000000).toFixed(0))}억`
            // }
            // this.getView().getModel("chartModel").setProperty("/2", oChartInfo3);

            let oChartInfo4 = {
                title: aLabels[aLabels.length - 1],
                value: `${oNumberFormat.format((aChartData4[aChartData4.length - 1] / 100000000).toFixed(0))}억`
            }
            this.getView().getModel("chartModel").setProperty("/3", oChartInfo4);

            // let oChartInfo5 = {
            //     title: aLabels[aLabels.length - 1],
            //     value: `${oNumberFormat.format((aChartData5[aChartData5.length - 1] / 100000000).toFixed(0))}억`
            // }
            // this.getView().getModel("chartModel").setProperty("/4", oChartInfo5);

            // let oChartInfo6 = {
            //     title: aLabels[aLabels.length - 1],
            //     value: `${oNumberFormat.format((aChartData6[aChartData6.length - 1] / 100000000).toFixed(0))}억`
            // }
            // this.getView().getModel("chartModel").setProperty("/5", oChartInfo6);

            if(!isNaN(aChartData4[aChartData4.length-1]) && !isNaN(aChartData4[aChartData4.length-2])){
                let iChk = aChartData4[aChartData4.length-1] - aChartData4[aChartData4.length-2];
                let oIcon = this.byId("plGrid4ChartIcon");
                if(iChk > 0){
                    oIcon.setSrc("sap-icon://trend-up");
                    oIcon.setColor("Positive");
                }else if(iChk < 0){
                    oIcon.setSrc("sap-icon://trend-down");
                    oIcon.setColor("Negative");
                }else{
                    oIcon.setSrc("sap-icon://less");
                    oIcon.setColor("Neutral");
                };
            };

            return aChartData4;
        },

        _setChart: async function () {

            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 100 * 0.63);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 100);

            let oHTML = this.byId("html");
            oHTML.setContent(`<div id='${this._sContainerId}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._sCanvasId}' style='padding: 0 2.5rem'/></div>`);
            oHTML.attachEventOnce("afterRendering", async function () {
                const oCanvas = document.getElementById(this._sCanvasId)
                const ctx = oCanvas.getContext("2d");

                let gradient = ctx.createLinearGradient(0, 0, 0, oCanvas.height);
                gradient.addColorStop(0, "rgba(33, 150, 243, 0.4)");
                gradient.addColorStop(1, "rgba(33, 150, 243, 0)");

                //데이터 셋팅 부분
                let oResult = await this._setSessionData();


                //차트 구성
                this._oMyChart = new Chart(ctx, {
                    type: "line",
                    data: {
                        labels: oResult.aLabels,
                        datasets: [{
                            data: oResult.oResult,
                            backgroundColor: gradient,
                            fill: true,
                            borderColor: "#2196f3",
                            tension: 0.4,
                            pointBackgroundColor: "#2196f3",
                            pointRadius: [0, 0, 5]  // 마지막 점 강조
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { display: false },
                            y: { display: false }
                        }
                    }
                    
                });
            }.bind(this));
        },


        onAfterRendering: function (){            
            this._oEventBus.publish("pl", "plGridCard1");
        }
    });
});