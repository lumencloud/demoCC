sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/EventBus"
], function (Controller, ODataModel, JSONModel, EventBus) {
    "use strict";

    return Controller.extend("bix.card.saleDetailMonth.Main", {
        _sCanvasId: undefined,
        _sContainerId: undefined,
        _oMyChart: undefined,
        _oMyKeyword: "month",
        _aOriginalData: [],
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
            this._selectDataSetting();
        },

        _selectDataSetting: function () {
            this.getView().setModel(new JSONModel({ period: "month" }), "searchModel");
            let oTemp1 = [{
                key: "month",
                value: "월별"
            }, {
                key: "quarter",
                value: "분기별"
            }];
            this.getView().setModel(new JSONModel(oTemp1), "periodSelect");
        },

        _createId: function (){
            this._sCanvasId = this.createId("canvas");
            this._sContainerId = this.createId("container");
            this._iMinHeight = 600;
        },

        _updateChart: async function () {
            let oResult = await this._setSessionData();

            this._oMyChart.data.labels = oResult.aMonth;
            this._oMyChart.data.datasets[0].data = oResult.aSale;
            this._oMyChart.data.datasets[1].data = oResult.aRate;

            this._oMyChart.update();


        },

        _setChart: async function () {            

            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 100);
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 100);

            let oHTML = this.byId("html");
            oHTML.setContent(`<div id='${this._sContainerId}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}px'><canvas id='${this._sCanvasId}' style='padding: 0 2.5rem'/></div>`);
            oHTML.attachEventOnce("afterRendering", async function () {
                const canvas = document.getElementById(this._sCanvasId);
                const ctx = canvas.getContext("2d");

                //데이터 셋팅 부분
                let oResult = await this._setSessionData();

                this._oMyChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: oResult.aMonth,
                        datasets: [
                            {
                                label: "매출액",
                                data: oResult.aSale,
                                yAxisID: "y",
                            },
                            {
                                label: "YoY 성장률",
                                data: oResult.aRate,
                                yAxisID: "y1",
                                type: "line"
                            },
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,                       
                      }
                });           

            }.bind(this));


        },

        onChange: async function (oEvent) {
            let sKey = oEvent.getSource().getSelectedKey();
            this._oMyKeyword = sKey
            this._updateChart()
            
        },        

        _setChartData: function () {
            let aMonth = [];
            let aSale = [];
            let aRate = [];
            let sChk = this._oMyKeyword;

            if (sChk === "month") {
                this._aOriginalData.forEach(data => {
                    aMonth.push(parseInt(data.month) + "월")
                    aSale.push(data.saleLastYear)
                    aRate.push(data.rate)
                });
            } else if (sChk === "quarter") {
                let oData = { '1q': 0, '2q': 0, '3q': 0, '4q': 0, '1qLast': 0, '2qLast': 0, '3qLast': 0, '4qLast': 0, '1qRate': 0, '2qRate': 0, '3qRate': 0, '4qRate': 0, 'quarter': [] };
                this._aOriginalData.forEach(data => {
                    if (['01', '02', '03'].includes(data.month)) {
                        oData['1q'] += data.sale;
                        oData['1qLast'] += data.saleLastYear;
                        if (!oData.quarter.includes('1분기')) {
                            oData.quarter.push('1분기');
                        };
                    } else if (['04', '05', '06'].includes(data.month)) {
                        oData['2q'] += data.sale;
                        oData['2qLast'] += data.saleLastYear;
                        if (!oData.quarter.includes('2분기')) {
                            oData.quarter.push('2분기');
                        };
                    } else if (['07', '08', '09'].includes(data.month)) {
                        oData['3q'] += data.sale;
                        oData['3qLast'] += data.saleLastYear;
                        if (!oData.quarter.includes('3분기')) {
                            oData.quarter.push('3분기');
                        };
                    } else if (['10', '11', '12'].includes(data.month)) {
                        oData['4q'] += data.sale;
                        oData['4qLast'] += data.saleLastYear;
                        if (!oData.quarter.includes('4분기')) {
                            oData.quarter.push('4분기');
                        };
                    };
                });

                let aQuater = oData.quarter;
                aQuater.forEach(data => {
                    if (data === '1분기') {
                        aMonth.push(data);
                        aSale.push(oData["1q"]);
                        aRate.push(!oData["1qLast"] ? 0 : oData["1q"] / oData["1qLast"] * 100);
                    } else if (data === '2분기') {
                        aMonth.push(data);
                        aSale.push(oData["2q"]);
                        aRate.push(!oData["2qLast"] ? 0 : oData["2q"] / oData["2qLast"] * 100);
                    } if (data === '3분기') {
                        aMonth.push(data);
                        aSale.push(oData["3q"]);
                        aRate.push(!oData["3qLast"] ? 0 : oData["3q"] / oData["3qLast"] * 100);
                    } if (data === '4분기') {
                        aMonth.push(data);
                        aSale.push(oData["4q"]);
                        aRate.push(!oData["4qLast"] ? 0 : oData["4q"] / oData["4qLast"] * 100);
                    };
                })
            };
            return { month: aMonth, sale: aSale, rate: aRate };
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

            const oBinding = oModel.bindContext(`/get_sale_detail_month(year='${sYear}',month='${sMonth}',org_id='${sOrgId}')`);
            let aResults = await oBinding.requestObject();
            this._aOriginalData = JSON.parse(JSON.stringify(aResults.value));
            let oResult = await this._setChartData(this._oMyKeyword);
            return oResult;
        },

       
     
        
        
    });
});