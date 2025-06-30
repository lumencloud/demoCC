sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/json/JSONModel',
    "bix/common/library/control/Modules",
    "bix/common/library/util/Formatter",
  ],
  function (BaseController, JSONModel, Modules, formatter) {
    "use strict";
    return BaseController.extend("bix.card.overview.card", {
      formatter: formatter,
      onInit: function () {
        this.datasetting();
      },
      datasetting: async function () {
        
      },
      // onAfterRendering: function() {
      //   // debugger;
      //   const ctx = document.getElementById('overView');
      //   if (!this.oChartInstance) {
      //     this.oChartInstance = new Chart(ctx, {
      //       type: 'bar',
      //       data: {
      //         labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
      //         datasets: [
      //           {
      //             label: '수익',
      //             data: [30, 80, 70, 40, 40, 70, 30, 45, 90, 45, 70, 45],
      //             backgroundColor: '#1e63f0', // 진한 파랑
      //             barThickness: 10,
      //             borderRadius: {
      //               topLeft: 20,
      //               topRight: 20,
      //               bottomLeft: 0,
      //               bottomRight: 0
      //             },
      //             stack: 'stack1'
      //           },
      //           {
      //             label: '부채',
      //             data: [30, 0, 30, 0, 30, 30, 30, 30, 0, 30, 30, 0],
      //             backgroundColor: '#9ecbff', // 연한 파랑
      //             borderRadius: {
      //               topLeft: 20,
      //               topRight: 20,
      //               bottomLeft: 0,
      //               bottomRight: 0
      //             },
      //             barThickness: 10,
      //             stack: 'stack1'
      //           }
      //         ]
      //       },
      //       options: {
      //         maintainAspectRatio: false,
      //         responsive: true,
      //         plugins: {
      //           legend: {
      //             labels: {
      //               boxWidth: 7,   
      //               boxHeight: 7,
      //               usePointStyle: true,  
      //               pointStyle: 'circle'
      //             },
      //             position: 'bottom'
      //           }
      //         },
      //         scales: {
      //           x: {
      //             stacked: true,
      //             barPercentage: 1,
      //             categoryPercentage: 1
      //           },
      //           y: {
      //             stacked: true,
      //             beginAtZero: true,
      //             ticks: {
      //               stepSize: 50
      //             },
      //             max: 100
      //           }
      //         }
      //       }
      //     });
      //   }
      // },
    });
  }
);
