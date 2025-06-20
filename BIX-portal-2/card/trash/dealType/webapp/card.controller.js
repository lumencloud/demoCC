sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/json/JSONModel',
    "bix/common/library/control/Modules",
    "bix/common/library/util/Formatter",
  ],
  function (BaseController, JSONModel, Modules, formatter) {
    "use strict";
    return BaseController.extend("bix.card.dealType.card", {
      formatter: formatter,
      onInit: function () {
        this.datasetting();
      },
      datasetting: async function () {
        
      },
      onAfterRendering: function() {
        // debugger;
        const ctx = document.getElementById('dealType');
        if (!this.oChartInstance) {
          this.oChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: ['SBA 504', 'SBA 7a', 'LOC'],
              datasets: [{
                data: [50, 80, 226], // 합쳐서 356
                backgroundColor: ['#76D3F7', '#B9C6D0', '#1C4DF2'],
                borderWidth: 0,
                radius: '70%',
                cutout: '90%', // 도넛 두께 조절
              }],
            },
            options: {
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
                },
                tooltip: {
                  enabled: true
                }
              }
            },
            plugins: [{
              id: 'totalText',
              afterDraw: (chart) => {
                const { ctx, width } = chart;
                const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                ctx.save();
                ctx.font = 'bold 1.875rem sans-serif';
                ctx.fillStyle = '#333';
                ctx.textAlign = 'center';
                ctx.fillText(total, width / 2, chart.chartArea.top + chart.chartArea.height / 2 - 5);
                ctx.font = '0.75rem sans-serif';
                ctx.fillStyle = '#888';
                ctx.fillText('합계', width / 2, chart.chartArea.top + chart.chartArea.height / 2 + 15);
                ctx.restore();
              }
            }]
          });
        }
      },
    });
  }
);
