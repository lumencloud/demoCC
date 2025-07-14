sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/EventBus"

], function (Controller, ODataModel, JSONModel, EventBus) {
	"use strict";

	return Controller.extend("bix.card.sgaDetailMonth.Main", {
        _sCanvasId: undefined,
        _sContainerId: undefined,
        _oMyChart: undefined,
        _sPeriodKeyword : "month",
        _sTypeKeyword : "all",
        _aOriginalData: [],
        _oSessionData: 
        {
            'sOrgId': undefined,
            'sYear' : undefined,
            'sMonth' : undefined
        },
        _oEventBus: EventBus.getInstance(),


		onInit: function () {
          //component별 id 설정
          this._createId()
          // 차트 초기 설정            
          this._setChart();
          // 이벤트 버스 발생시 차트 업데이트
          this._oEventBus.subscribe("pl", "search", this._updateChart, this);
          this._selectDataSetting()

		},

        _createId: function (){
            this._sCanvasId = this.createId("canvas");
            this._sContainerId = this.createId("container");
            this._iMinHeight = 600;
        },

        _updateChart: async function () {
            let oResult = await this._setSessionData();
            this._oMyChart.data.labels = oResult.aMonth;
            this._oMyChart.data.datasets = oResult.aDataset
            this._oMyChart.update();
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
                        labels: oResult.aMonth,
                        datasets: oResult.aDataset
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: sChk === 'all' ? false : true,
                                text: sTitle,
                                position: "top"
                            },
                            legend:{
                                position:'bottom'
                            }
                        },
                        scales: {
                            x:{
                                stacked: true,
                            },
                            y: {
                                title:{
                                    display: true,
                                    text: "SG&A 비용(억원)",
                                },
                                position: "left",
                                stacked: true,
                                ticks:{
                                    callback:function(value){
                                        if(value % 100000000 === 0){
                                            return(value / 100000000).toLocaleString();
                                        };
                                    }
                                }
                            },
                            y1: {
                                title:{
                                    display: true,
                                    text: "YoY(%)",
                                },
                                position: "right",
                                // min: 20,
                                // max: -20,
                                grid: {
                                    display: false
                                },
                                display : sChk === 'all' ? true : false
                            }
                        },
                        elements:{
                            line:{
                                tension:0.4
                            }
                        }
                    },
                });
            }.bind(this));
        },

        onChange:async function(oEvent, sChk){
            if(sChk === 'period'){
                let sKey = oEvent.getSource().getSelectedKey();                
                this._sPeriodKeyword = sKey                
            }else if(sChk === 'type'){
                let sKey2 = oEvent.getSource().getSelectedKey();
                this._sTypeKeyword = sKey2
            };
            this._updateChart()
        },

		_selectDataSetting: function(){
            this.getView().setModel(new JSONModel({period:"month", type:"all"}), "searchModel");
            let oTemp1 = [{
                key:"month",
                value:"월별"
            },{
                key:"quarter",
                value:"분기별"
            }];
            this.getView().setModel(new JSONModel(oTemp1), "periodSelect");

			let oTemp2 = [{
                key:"all",
                value:"전체"
            },{
                key:"labor",
                value:"인건비"
            },{
                key:"invest",
                value:"투자비"
            },{
                key:"expense",
                value:"경비"
            }];
            this.getView().setModel(new JSONModel(oTemp2), "typeSelect");
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
                serviceUrl: "../odata/v4/sga-api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            const oBinding = oModel.bindContext(`/get_sga_detail_month(year='${sYear}',month='${sMonth}',org_id='${sOrgId}')`);
			let aResults = await oBinding.requestObject();
            this._aOriginalData = JSON.parse(JSON.stringify(aResults.value));
            let oResult = await this._setChartData();
            return oResult;
		},

        

	});
});