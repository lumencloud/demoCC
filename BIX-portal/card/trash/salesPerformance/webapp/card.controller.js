sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/json/JSONModel',
    "bix/common/library/control/Modules",
    "bix/common/library/util/Formatter",
    "sap/ui/core/EventBus"
  ],
  function (BaseController, JSONModel, Modules, formatter, EventBus) {
    "use strict";
    return BaseController.extend("bix.card.salesPerformance.card", {
      formatter: formatter,
      _oEventBus: EventBus.getInstance(),

      onInit: function () {
        this.dateYearSetting();        
        this._oEventBus.subscribe("home", "search", this.dateYearSetting, this);

      },
      dateYearSetting: async function (sChannelId, sEventId, oData) {
        let sYear;
        if(!oData){
          let oInitData = JSON.parse(sessionStorage.getItem("initSearchModel"))
          let dYearMonth = new Date(oInitData.yearMonth)
          sYear = dYearMonth.getFullYear();
        }else {
          sYear = oData.year
        }


        let sYearText = (Number(sYear) - 2)+ "년 ~ " + (sYear) + "년"        

        //카드 텍스트
        let oChartInfo = {
          date: sYearText
        }

        this.getView().setModel(new JSONModel(oChartInfo), "chartModel");
        
      },
      // onAfterRendering: function() {
      //   // 3초 자동 스와이프
      //   // let oCarousel = this.byId("salesCarousel"); // Carousel의 ID
      //   // let iTotalPages = oCarousel.getPages().length;
      //   // let iCurrentPage = 0;

      //   // setInterval(function () {
      //   //   iCurrentPage = (iCurrentPage + 1) % iTotalPages;
      //   //   oCarousel.setActivePage(oCarousel.getPages()[iCurrentPage]);
      //   // }, 3000); // 3초마다 자동 전환
        
      //   const ctx1 = document.getElementById('salesPerformance1');
      //   if (!this.oChartInstance1) {
      //     this.oChartInstance1 = new Chart(ctx1, {
      //       type: 'line',
      //       data: {
      //         labels: ['Jan', 'Mar', 'May', 'Jul'],
      //         datasets: [{
      //           label: 'Sales',
      //           data: [3000, 1800, 4890, 2200],
      //           borderColor: '#4A6CF7',
      //           backgroundColor: 'rgba(74, 108, 247, 0.1)',
      //           tension: 0.4,
      //           fill: true,
      //           pointRadius: 5,
      //           pointHoverRadius: 7,
      //           pointBackgroundColor: '#4A6CF7',
      //         }]
      //       },
      //       options: {
      //         maintainAspectRatio: false,
      //         plugins: {
      //           tooltip: {
      //             callbacks: {
      //               label: function (context) {
      //                 if (context.dataIndex === 2) {
      //                   return '4,890: Low sales in June';
      //                 }
      //                 return context.formattedValue;
      //               }
      //             }
      //           },
      //           legend: {
      //             display: false
      //           }
      //         },
      //         scales: {
      //           x: {
      //             grid: {
      //               display: false
      //             },
      //             ticks: {
      //               color: function (context) {
      //                 return context.tick.label === "Jul" ? "#7C3AED" : "#666";
      //               }
      //             }
      //           },
      //           y: {
      //             grid: {
      //               drawBorder: false
      //             },
      //             ticks: {
      //               callback: value => '$' + value
      //             }
      //           }
      //         }
      //       }
      //     });
      //   }
      //   // salesPerformance2
      //   const ctx2 = document.getElementById('salesPerformance2');
      //   if (!this.oChartInstance2) {
      //     this.oChartInstance2 = new Chart(ctx2, {
      //       type: 'line',
      //       data: {
      //         labels: ['Jan', 'Mar', 'May', 'Jul'],
      //         datasets: [{
      //           label: 'Sales',
      //           data: [3000, 1800, 4890, 2200],
      //           borderColor: '#4A6CF7',
      //           backgroundColor: 'rgba(74, 108, 247, 0.1)',
      //           tension: 0.4,
      //           fill: true,
      //           pointRadius: 5,
      //           pointHoverRadius: 7,
      //           pointBackgroundColor: '#4A6CF7',
      //         }]
      //       },
      //       options: {
      //         plugins: {
      //           tooltip: {
      //             callbacks: {
      //               label: function (context) {
      //                 if (context.dataIndex === 2) {
      //                   return '4,890: Low sales in June';
      //                 }
      //                 return context.formattedValue;
      //               }
      //             }
      //           },
      //           legend: {
      //             display: false
      //           }
      //         },
      //         scales: {
      //           x: {
      //             grid: {
      //               display: false
      //             },
      //             ticks: {
      //               color: function (context) {
      //                 return context.tick.label === "Jul" ? "#7C3AED" : "#666";
      //               }
      //             }
      //           },
      //           y: {
      //             grid: {
      //               drawBorder: false
      //             },
      //             ticks: {
      //               callback: value => '$' + value
      //             }
      //           }
      //         }
      //       }
      //     });
      //   }
      //   // salesPerformance3
      //   const ctx3 = document.getElementById('salesPerformance3');
      //   if (!this.oChartInstance3) {
      //     this.oChartInstance3 = new Chart(ctx3, {
      //       type: 'line',
      //       data: {
      //         labels: ['Jan', 'Mar', 'May', 'Jul'],
      //         datasets: [{
      //           label: 'Sales',
      //           data: [3000, 1800, 4890, 2200],
      //           borderColor: '#4A6CF7',
      //           backgroundColor: 'rgba(74, 108, 247, 0.1)',
      //           tension: 0.4,
      //           fill: true,
      //           pointRadius: 5,
      //           pointHoverRadius: 7,
      //           pointBackgroundColor: '#4A6CF7',
      //         }]
      //       },
      //       options: {
      //         plugins: {
      //           tooltip: {
      //             callbacks: {
      //               label: function (context) {
      //                 if (context.dataIndex === 2) {
      //                   return '4,890: Low sales in June';
      //                 }
      //                 return context.formattedValue;
      //               }
      //             }
      //           },
      //           legend: {
      //             display: false
      //           }
      //         },
      //         scales: {
      //           x: {
      //             grid: {
      //               display: false
      //             },
      //             ticks: {
      //               color: function (context) {
      //                 return context.tick.label === "Jul" ? "#7C3AED" : "#666";
      //               }
      //             }
      //           },
      //           y: {
      //             grid: {
      //               drawBorder: false
      //             },
      //             ticks: {
      //               callback: value => '$' + value
      //             }
      //           }
      //         }
      //       }
      //     });
      //   }
      // },
    });
  }
);
