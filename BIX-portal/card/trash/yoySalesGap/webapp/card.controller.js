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
    return BaseController.extend("bix.card.yoySalesGap.card", {
      _sCanvasId: undefined,
      _sContainerId: undefined,
      _oMyChart: undefined,
      formatter: formatter,
      _oEventBus: EventBus.getInstance(),

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
        this._iMinHeight = 5;
        this._iMaxHeight = 6.25;
      },

      _updateChart: async function (sChannelId, sEventId, oData) {
        let oResult = await this._setEventBusData(oData);

        this._oMyChart.data.labels = oResult.aLabels;
        this._oMyChart.data.datasets[0].data = oResult.aChartData;

        this._oMyChart.options.scales.y.min = Math.min(...oResult.aChartData) * 0.8
        this._oMyChart.options.scales.y.max = Math.max(...oResult.aChartData) * 1.2

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
          serviceUrl: "../odata/v4/pl_api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });

        let aRequests = [];
        let aLabels = [];
        for (let i = 3; i > 0; i--) {
          // Path 설정
          let dNewDate = new Date(sYear, sMonth - i);
          let sNewYear = dNewDate.getFullYear();
          let sNewMonth = String(dNewDate.getMonth() + 1).padStart(2, "0");
          aLabels.push(`${sNewYear}`);
          let sPath = `/get_actual_pl(year='${sNewYear}',month='${sNewMonth}',org_id='${sOrgId}')`;

          // 함수 저장
          let oBinding = oModel.bindContext(sPath);
          let fnRequest = () => oBinding.requestObject();
          aRequests.push(fnRequest);
        };

        let oResult = await this._setChartData(aRequests, aLabels);
        return oResult;
      },

      _setChartData: async function (aRequests, aLabels) {
        // 차트 데이터
        let aResults = await Promise.all(aRequests.map(fn => fn()));
        let aChartData = aResults.map(oResult => {
          return Math.floor(oResult.value.find(oData => oData.display_order == "2").actual_curr_ym_value)
        });

        // 차트 제목 및 주요지표 설정
        let oNumberFormat = NumberFormat.getFloatInstance({
          groupingEnabled: true,
          groupingSeparator: ','
        });
        
        //진척도
        let aProgress = aResults.map(oResult => {        
          let iRes = 0;
          iRes = oResult.value.find(oData => oData.display_order == "2")?.target_curr_y_value ? Math.floor(oResult.value.find(oData => oData.display_order == "2").actual_curr_ym_value) / Math.floor(oResult.value.find(oData => oData.display_order == "2")?.target_curr_y_value * 100000000) * 100 : 0;
          return Math.floor(iRes);
        })

        let oChartInfo = {
          date: aLabels[aLabels.length - 1],
          value: `${aProgress[aChartData.length - 1]}%`      
        }
        this.getView().setModel(new JSONModel(oChartInfo), "chartModel");
        
        if(!isNaN(aChartData[aChartData.length-1]) && !isNaN(aChartData[aChartData.length-2])){
          let iChk = aChartData[aChartData.length-1] - aChartData[aChartData.length-2];
          let oIcon = this.byId("plGrid1ChartIcon");
          if(iChk > 0){
              oIcon.setSrc("sap-icon://trend-up");
              oIcon.setColor("Positive");
          }else if(iChk < 0){
              oIcon.setSrc("sap-icon://trend-down");
              oIcon.setColor("Negative");
          }else{
              oIcon.setSrc("");
          };
        };
        return { aChartData: aChartData, aLabels : aLabels };
      },

      _setChart: async function () {
        // 카드
        const oCard = this.getOwnerComponent().oCard;

        // Card 높이를 컨테이너 높이와 동일하게 구성
        let sCardId = oCard.getId();
        let oParentElement = document.getElementById(sCardId).parentElement;
        let iBoxWidth = Math.floor(oParentElement.clientWidth / window.innerWidth * 100 * 0.4);
        let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 100 * 0.7);

        let oHTML = this.byId("html");
        oHTML.setContent(`<div id='${this._sContainerId}' class='custom-chart-container' style='width:${iBoxWidth}vw; height:${iBoxHeight}vh; min-height:${this._iMinHeight}rem; max-height:${this._iMaxHeight}rem;'><canvas id='${this._sCanvasId}' style='padding: 0 0rem'/></div>`);
        oHTML.attachEventOnce("afterRendering", async function () {

          const canvas = document.getElementById(this._sCanvasId);
          const ctx = canvas.getContext("2d");
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, 'rgba(33, 150, 243, 0.4)'); // 위쪽은 더 진하게
          gradient.addColorStop(1, 'rgba(33, 150, 243, 0)');   // 아래는 투명

          //데이터 셋팅 부분
          let oResult = await this._setEventBusData();

          //차트 구성
          this._oMyChart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: oResult.aLabels,
              datasets: [{
                data: oResult.aChartData,
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
                y: {
                  display: false,
                  min: Math.min(...oResult.aChartData) * 0.8,
                  max: Math.max(...oResult.aChartData) * 1.2,
                }
              }
            }
          });
        }.bind(this));
      },


      // _setChart: async function (sChannelId, sEventId, oData) {
      //   if (!oData) {
      //     var sOrgId = '5';
      //     var sYear = new Date().getFullYear();
      //     var sMonth = String(new Date().getMonth() + 1).padStart(2, "0");
      //   } else {
      //     var sOrgId = oData.orgId;
      //     var sYear = oData.year;
      //     var sMonth = oData.month;
      //   }

      //   // 데이터 호출 병렬 실행
      //   const oModel = new ODataModel({
      //     serviceUrl: "../odata/v4/pl-api/",
      //     synchronizationMode: "None",
      //     operationMode: "Server"
      //   });

      //   let sPath = `/get_home_chart_quarter(year='${sYear}',month='${sMonth}',org_id='${sOrgId}')`;
      //   let oBinding = oModel.bindContext(sPath);

      //   // 차트 데이터
      //   let aResults = await oBinding.requestObject();
      //   let aChartData = aResults.value.map(oResult => oResult.cos);
      //   let aLabels = aResults.value.map(oResult => `${oResult.year}-${String(oResult.month).padStart(2, "0")}`);

      //   let oChartInfo = {
      //     date: aLabels[aLabels.length - 1],
      //     value: `${Math.floor(aChartData[aChartData.length - 1] / 100000000)}억`
      //   }
      //   this.getView().setModel(new JSONModel(oChartInfo), "chartModel");

      //   // 차트 생성
      //   const canvas = document.getElementById('yoySalesGap');
      //   const ctx = canvas.getContext('2d');

      //   const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      //   gradient.addColorStop(0, 'rgba(33, 150, 243, 0.4)'); // 위쪽은 더 진하게
      //   gradient.addColorStop(1, 'rgba(33, 150, 243, 0)');   // 아래는 투명
      //   if (!this.oChartInstance) {
      //     this.oChartInstance = new Chart(ctx, {
      //       type: 'line',
      //       data: {
      //         // labels: aLabels,
      //         labels: ['2025', '2025', '2025'],
      //         datasets: [{
      //           data: [1550329178142, 1850329178142, 2050329178142],

      //           backgroundColor: gradient,
      //           fill: true,
      //           borderColor: "#2196f3",
      //           tension: 0.4,
      //           pointBackgroundColor: "#2196f3",
      //           pointRadius: [0, 0, 5]  // 마지막 점 강조
      //         }]
      //       },
      //       options: {
      //         plugins: { legend: { display: false } },
      //         scales: {
      //           x: { display: false },
      //           y: {
      //             display: false,
      //             min: Math.min(...aChartData) * 0.8,
      //             max: Math.max(...aChartData) * 1.2,
      //           }
      //         }
      //       }
      //     });
      //   }
      // },

      //아래 주석 처리 된 데이터가 원본 데이터. 사용중인 데이터는 하드 코딩용 데이터
      //     _setChart: async function (sChannelId, sEventId, oData) {
      //       if (!oData) {
      //         var sOrgId = '5';
      //         var sYear = new Date().getFullYear();
      //         var sMonth = String(new Date().getMonth() + 1).padStart(2, "0");
      //       } else {
      //         var sOrgId = oData.orgId;
      //         var sYear = oData.year;
      //         var sMonth = oData.month;
      //       }

      //       // 데이터 호출 병렬 실행
      //       const oModel = new ODataModel({
      //         serviceUrl: "../odata/v4/pl-api/",
      //         synchronizationMode: "None",
      //         operationMode: "Server"
      //       });
      //       let aRequests = [];
      //       let aLabels = [];
      //       for (let i = 3; i > 0; i--) {
      //         // Path 설정
      //         let dNewDate = new Date(sYear, sMonth - i);
      //         let sNewYear = dNewDate.getFullYear();
      //         let sNewMonth = String(dNewDate.getMonth() + 1).padStart(2, "0");
      //         aLabels.push(`${sNewYear}`);
      //         let sPath = `/get_pl_performance(year='${sNewYear}',month='${sNewMonth}',org_id='${sOrgId}')`;

      //         // 함수 저장
      //         let oBinding = oModel.bindContext(sPath);
      //         let fnRequest = () => oBinding.requestObject();
      //         aRequests.push(fnRequest);
      //       };

      //       // 차트 데이터
      //       let aResults = await Promise.all(aRequests.map(fn => fn()));
      //       let aChartData = aResults.map(oResult => {
      //         return Math.floor(oResult.value.find(oData => oData.seq == "1").goal)
      //       });

      //       // 차트 제목 및 주요지표 설정
      //       let oNumberFormat = NumberFormat.getFloatInstance({
      //         groupingEnabled: true,
      //         groupingSeparator: ','
      //       });

      //       let oChartInfo = {
      //         date: aLabels[aLabels.length - 1],
      //         value: `${(Math.floor(aChartData[aChartData.length - 1] / 100000000)).toLocaleString()}억`

      //         // value: `${aChartData[aChartData.length - 1]}%`
      //       }
      //       this.getView().setModel(new JSONModel(oChartInfo), "chartModel");

      //       // 차트 생성
      //       const canvas = document.getElementById('yoySalesGap');
      //       const ctx = canvas.getContext('2d');

      //       const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      //       gradient.addColorStop(0, 'rgba(33, 150, 243, 0.4)'); // 위쪽은 더 진하게
      //       gradient.addColorStop(1, 'rgba(33, 150, 243, 0)');   // 아래는 투명
      //       if (!this.oChartInstance) {
      //         this.oChartInstance = new Chart(ctx, {
      //           type: 'line',
      //           data: {
      //             labels: ['2025', '2025', '2025'],
      //             datasets: [{
      //               data: [1550329178142, 1850329178142, 2050329178142],
      //               backgroundColor: gradient,
      //               fill: true,
      //               borderColor: "#2196f3",
      //               tension: 0.4,
      //               pointBackgroundColor: "#2196f3",
      //               pointRadius: [0, 0, 5]  // 마지막 점 강조
      //             }]
      //           },
      //           options: {
      //             plugins: { legend: { display: false } },
      //             scales: {
      //               x: { display: false },
      //               y: {
      //                 display: false,
      //                 min: Math.min(...aChartData) * 0.8,
      //                 max: Math.max(...aChartData) * 1.2,
      //               }
      //             }
      //           }
      //         });
      //       }
      //     },
    });
  }
);
