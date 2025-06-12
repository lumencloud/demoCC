sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/json/JSONModel',
    "bix/common/library/control/Modules",
    "bix/common/library/util/Formatter",
  ],
  function (BaseController, JSONModel, Modules, formatter) {
    "use strict";
    return BaseController.extend("bix.card.activity.card", {
      formatter: formatter,
      onInit: function () {
        this.datasetting();
      },
      datasetting: async function () {
        
      },
      // onAfterRendering: function() {
      //   // debugger;
      //   const ctx = document.getElementById('activity');
      //   if (!this.oChartInstance) {
      //     this.oChartInstance = new Chart(ctx, {
      //       type: 'line',
      //       data: {
      //         labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
      //         datasets: [
      //           {
      //             label: '금년',
      //             data: [100, 110, 130, 180, 160, 150, 170, 210, 180, 170, 160, 155],
      //             borderColor: '#3A57E8',
      //             backgroundColor: 'rgba(58, 87, 232, 0.1)',
      //             tension: 0.4,
      //             fill: true,
      //             pointRadius: 0,
      //             pointHoverRadius: 6,
      //             pointBackgroundColor: '#3A57E8',
      //             pointHoverBackgroundColor: '#fff',
      //             pointBorderWidth: 2,
      //           },
      //           {
      //             label: '작년',
      //             data: [120, 105, 115, 135, 120, 100, 130, 160, 140, 150, 145, 148],
      //             borderColor: '#C4C4C4',
      //             backgroundColor: 'rgba(196,196,196,0.1)',
      //             tension: 0.4,
      //             fill: true,
      //             pointRadius: 0
      //           }
      //         ]
      //       },
      //       options: {
      //         plugins: {
      //           legend: {
      //             position: 'top',
      //             align: 'start',
      //             labels: {
      //               font: {
      //                 size: 15,
      //               },
      //               boxWidth: 10,   
      //               boxHeight: 10,
      //               usePointStyle: true,
      //               pointStyle: 'rectRounded',
      //             }
      //           },
      //           tooltip: {
      //             intersect: false,
      //             mode: 'index',
      //             callbacks: {
      //               title: (tooltipItems) => {
      //                 const label = tooltipItems[0].label;
      //                 return `${this._transferMonth(label)} 2024`; // 정적으로 예시 (동적으로 바꾸려면 추가 코드 필요)
      //               },
      //               label: (tooltipItem) => {
      //                 return `${tooltipItem.dataset.label}: ${tooltipItem.formattedValue}`;
      //               }
      //             },
      //             titleFont: {
      //               weight: 'bold',
      //               size: 16
      //             },
      //             bodyFont: {
      //               size: 14
      //             },
      //             padding: 12,
      //             backgroundColor: '#fff',
      //             titleColor: '#333',
      //             bodyColor: '#555',
      //             borderColor: '#eee',
      //             borderWidth: 1,
      //             displayColors: false
      //           }
      //         },
      //         interaction: {
      //           mode: 'index',
      //           intersect: false
      //         },
      //         scales: {
      //           y: {
      //             min: 0,
      //             max: 250,
      //             ticks: {
      //               stepSize: 50
      //             },
      //             grid: {
      //               drawTicks: false,
      //               color: '#eee'
      //             }
      //           },
      //           x: {
      //             grid: {
      //               display: false
      //             }
      //           }
      //         }
      //       },
      //       plugins: [{
      //         id: 'customLegendText',
      //         afterDraw(chart) {
      //           const { ctx, chartArea, legend } = chart;
      //           if (!legend) return;
            
      //           ctx.save();
      //           ctx.font = '15px Arial';
      //           ctx.fillStyle = '#999';
      //           ctx.textAlign = 'right';
      //           ctx.fillText('2024 - 2025', chart.width - 20, legend.top + 20);
      //           ctx.restore();
      //         }
      //       }] 
      //     });
      //   }
      // },
      _transferMonth: function (sMonth) {
        switch (sMonth) {
          case "Jan": sMonth = "January"; break;
          case "Feb": sMonth = "February"; break;
          case "Mar": sMonth = "March"; break;
          case "Apr": sMonth = "April"; break;
          case "May": sMonth = "May"; break;
          case "Jun": sMonth = "June"; break;
          case "Jul": sMonth = "July"; break;
          case "Aug": sMonth = "August"; break;
          case "Sep": sMonth = "September"; break;
          case "Oct": sMonth = "October"; break;
          case "Nov": sMonth = "November"; break;
          case "Dec": sMonth = "December"; break;
          default : break;
        }
        return sMonth;
      },
    });
  }
);
