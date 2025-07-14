sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/json/JSONModel',
    "bix/common/library/control/Modules",
    "bix/common/library/util/Formatter",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus"
  ],
  function (BaseController, JSONModel, Modules, formatter, ODataModel, NumberFormat, EventBus) {
    "use strict";
    return BaseController.extend("bix.card.income.card", {
      _sCanvasId: undefined,
      _sContainerId: undefined,
      _oMyChart: undefined,
      _oEventBus: EventBus.getInstance(),


      formatter: formatter,
      onInit: function () {
        //component별 id 설정
        this._createId()
        // 차트 초기 설정            
        this._setChart();
        // 이벤트 버스 발생시 차트 업데이트
            this._oEventBus.subscribe("home", "search", this._updateChart, this);
      },

      _createId: function () {
        this._sCanvasId = this.createId("canvas");
        this._sContainerId = this.createId("container");
        this._iMinHeight = 28.6;
      },

      _updateChart: async function (sChannelId, sEventId, oData) {
        let oResult = await this._setEventBusData(oData);

        this._oMyChart.data.labels = oResult.aLabel;
        this._oMyChart.data.datasets[0].data = oResult.aLabor;
        this._oMyChart.data.datasets[1].data = oResult.aInvest;
        // this._oMyChart.data.datasets[0].data = [oResult.aChartData[0]];
        // this._oMyChart.data.datasets[0].label = oResult.aLabel[0];
        // this._oMyChart.data.datasets[1].data = [oResult.aChartData[1]]
        // this._oMyChart.data.datasets[1].label = oResult.aLabel[1];
        // this._oMyChart.data.datasets[2].data = [oResult.aChartData[2]]
        // this._oMyChart.data.datasets[2].label = oResult.aLabel[2];

        this._oMyChart.update();


      },

      _setEventBusData: async function (oData) {
        let sOrgId, sYear, sMonth
        if (!oData) {
          let oInitData = JSON.parse(sessionStorage.getItem("initSearchModel"))
          let dYearMonth = new Date(oInitData.yearMonth)
          sYear = dYearMonth.getFullYear();
          sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
          sOrgId = oInitData.orgId;
        } else {
          sYear = oData.year;
          sMonth = oData.month;
          sOrgId = oData.orgId;

        };

        const oModel = new ODataModel({
          serviceUrl: "../odata/v4/pl-api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });
        let sPath = `/get_home_chart_year(year='${sYear}',range='3',org_id='${sOrgId}')`;

        const oBinding = oModel.bindContext(sPath);

        let aResults = await oBinding.requestObject();

        let oResult = await this._setChartData(aResults.value);
        return oResult;
      },

      _setChartData: function (aData) {
        let aLabel = [], aLabor = [], aInvest = []

        aData.forEach(data => {
            aLabel.push(data.year)
            aLabor.push(data.labor)
            aInvest.push(data.invest);
        });

        return { aLabel: aLabel, aLabor: aLabor, aInvest: aInvest };
        // let aChartData = aData.map(oResult => {
        //   return {
        //     x: oResult.labor,
        //     y: oResult.invest,
        //   }
        // })

        // let aLabels = aData.map(oResult => oResult.year);

        // return { aLabel: aLabels, aChartData: aChartData };
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
        oHTML.setContent(`<div id='${this._sContainerId}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}rem'><canvas id='${this._sCanvasId}' /></div>`);
        oHTML.attachEvent("afterRendering", async function () {

          const canvas = document.getElementById(this._sCanvasId);
          const ctx = canvas.getContext("2d");

          // 차트 색상
          let sChartColor1 = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart5');
          let sChartColor2 = getComputedStyle(document.documentElement).getPropertyValue('--custom_Chart6');
          let sChartColor3 = getComputedStyle(document.documentElement).getPropertyValue('--custom_black5');
          
          //데이터 셋팅 부분
          let oResult = await this._setEventBusData();

          //차트 구성
          this._oMyChart = new Chart(ctx, {
            type: 'bar',
            plugins: [ChartDataLabels],
            data: {
              labels: oResult.aLabel,
              datasets: [
                {
                  label: "인건비",
                  data: oResult.aLabor,
                  borderRadius: 3,
                  backgroundColor: sChartColor1
                },
                {
                  label: "투자비",
                  data: oResult.aInvest,
                  borderRadius: 3,
                  backgroundColor: sChartColor2
                },
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true,
                  position: 'bottom',
                  labels: {
                    boxWidth: 7,
                    boxHeight: 7,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 10
                  },
                  tooltip: {
                    enabled: true
                  }
                },
                datalabels: {   // 데이터라벨 플러그인
                  display: function(oContext) {
                    return oContext.dataset.data[oContext.dataIndex] !== 0;
                  },
                  align: "center",
                  anchor: "center",
                  color: "#fff",
                  formatter: function (iValue) {
                      return Math.floor(iValue / 100000000) + "억";
                  }
                },
              },
              scales: {
                x: { 
                  display: true,
                  grid : {
                    display: false
                  }
                },
                y: {
                  display: true,
                  grid : {
                    color: function(oContext){
                      return oContext.tick.value ===0 ? sChartColor3 : 'transparent';
                    }
                  },
                  ticks: {
                    callback: function (value) {
                        if (value % 100000000 === 0) {
                            return (value / 100000000).toLocaleString() + '억';
                        };
                    }
                  }
                  // min: Math.ceil(Math.min(...oResult.aLabor,...oResult.aInvest)/10) * 10,
                  // max: Math.ceil(Math.max(...oResult.aLabor,...oResult.aInvest)/10) * 10,
                }
              }
            }
          });
        }.bind(this));
      },
      // onAfterRendering: async function () {
      //   // 검색창 검색 조건
      //   // let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();
      //   // let sOrgId = `${oSearchData.orgId}`;
      //   // let dYearMonth = oSearchData.yearMonth;
      //   // let iYear = dYearMonth.getFullYear();
      //   // let iMonth = dYearMonth.getMonth() + 1;


      //   let sOrgId = `5`;
      //   let iYear = `2024`

      //   // 데이터 호출 병렬 실행
      //   const oModel = new ODataModel({
      //     serviceUrl: "../odata/v4/pl-api/",
      //     synchronizationMode: "None",
      //     operationMode: "Server"
      //   });

      //   let sPath = `/get_home_chart_year(year='${iYear}',range='3',org_id='${sOrgId}')`;
      //   let oBinding = oModel.bindContext(sPath);

      //   // 차트 데이터
      //   let aResults = await oBinding.requestObject();

      //   let aChartData = aResults.value.map(oResult => {
      //     return {
      //       x: oResult.labor,
      //       y: oResult.invest,
      //     }
      //   });

      //   let aLabels = aResults.value.map(oResult => oResult.year);

      //   // let oChartInfo = {
      //   //   date: aLabels[aLabels.length - 1],
      //   //   value: `${Math.floor(aChartData[aChartData.length - 1] / 100000000)}억`
      //   // }
      //   // this.getView().setModel(new JSONModel(oChartInfo), "chartModel");

      //   // 차트 생성
      //   const canvas = document.getElementById('income');
      //   const ctx = canvas.getContext('2d');

      //   const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      //   gradient.addColorStop(0, 'rgba(33, 150, 243, 0.4)'); // 위쪽은 더 진하게
      //   gradient.addColorStop(1, 'rgba(33, 150, 243, 0)');   // 아래는 투명
      //   if (!this.oChartInstance) {
      //     this.oChartInstance = new Chart(ctx, {
      //       type: 'bubble',
      //       data: {
      //         labels: aLabels,
      //         datasets: [
      //           {
      //             label: aLabels[0],
      //             data: [aChartData[0]],
      //           },
      //           {
      //             label: aLabels[1],
      //             data: [aChartData[1]],
      //           },
      //           {
      //             label: aLabels[2],
      //             data: [aChartData[2]],
      //           },
      //         ]
      //       },
      //       options: {
      //         responsive: true,
      //         maintainAspectRatio: false,
      //         plugins: {
      //           legend: {
      //             display: true,
      //             position: 'bottom',
      //             labels: {
      //               boxWidth: 7,   
      //               boxHeight: 7,
      //               usePointStyle: true,  
      //               pointStyle: 'circle',
      //               padding: 10
      //             },
      //             tooltip: {
      //               enabled: true
      //             }  
      //           },
      //         },
      //         // scales: {
      //         //   x: { display: false },
      //         //   y: {
      //         //     display: false,
      //         //     min: Math.min(...aChartData) * 0.8,
      //         //     max: Math.max(...aChartData) * 1.2,
      //         //   }
      //         // }
      //       }
      //     });
      //   }
      // },
    });
  }
);
