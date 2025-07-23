sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/EventBus"

], function (Controller, EventBus) {
	"use strict";

	return Controller.extend("bix.card.homePerformanceCost.Main", {
		_oEventBus: EventBus.getInstance(),

		onInit: function () {
			// this._oEventBus.subscribe("pl", "search", this._setChart, this);

			this._setChart();
		},

		/**
		 * ChartJS 차트 구성 로직
		 */
		_setChart: async function () {
			this.getView().setBusy(true);

			// 검색창 검색 조건
			let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();
			let sOrgId = `${oSearchData.orgId}`;
			let dYearMonth = oSearchData.yearMonth;
			let iYear = dYearMonth.getFullYear();
			let iMonth = dYearMonth.getMonth() + 1;

			// 데이터 호출 병렬 실행
			let oModel = this.getOwnerComponent().getModel();
			let aRequests = [];
			let aLabels = [];
			for (let i = 3; i > 0; i--) {
				// Path 설정
				let dDate = new Date(iYear, iMonth - i);
				let sYear = dDate.getFullYear();
				let sMonth = String(dDate.getMonth() + 1).padStart(2, "0");
				aLabels.push(`${sYear}-${sMonth}`);
				let sPath = `/get_home_chart_quarter(year='${sYear}',month='${sMonth}',org_id='${sOrgId}')`;

				// 함수 저장
				let oBinding = oModel.bindContext(sPath);
				let fnRequest = () => oBinding.requestObject();
				aRequests.push(fnRequest);
			};

			// 차트 데이터
			let aResults = await Promise.all(aRequests.map(fn => fn()));
			let aChartData = aResults.map(oResult => oResult.value.find(oData => oData.seq == "1").cos);

			// 차트 제목 및 주요지표 설정
			let oNumberFormat = NumberFormat.getIntegerInstance({
				groupingEnabled: true,
				groupingSeparator: ','
			});

			let oChartInfo = {
				date: aLabels[aLabels.length - 1],
				value: `${oNumberFormat.format((aChartData[aChartData.length - 1] / 100000000).toFixed(0))}억`
			}
			this.getView().getModel("chartModel").setProperty("/0", oChartInfo);

			// 차트 HTML 생성
			let oBox = this.byId("chartBox1");
			if (!this.chart1) {
				let oHTML = new HTML({
					content: `<canvas id='chart1' style="width: 100%; height: 100%" >`
				});
				oBox.addItem(oHTML);

				// 차트 바인딩
				oHTML.attachEventOnce("afterRendering", function () {
					const oCanvas = document.getElementById("chart1");
					const ctx = oCanvas.getContext("2d");

					const gradient = ctx.createLinearGradient(0, 0, 0, oCanvas.height);
					gradient.addColorStop(0, "rgba(33, 150, 243, 0.4)");
					gradient.addColorStop(1, "rgba(33, 150, 243, 0)");

					// 초기
					if (!this.chart1) {
						this.chart1 = new Chart(ctx, {
							type: "line",
							data: {
								labels: aLabels,
								datasets: [{
									data: aChartData,
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
						})
					}
				}.bind(this));
			} else {
				this.chart1.data.datasets[0].data = aChartData;
				this.chart1.data.labels = aLabels;
				this.chart1.update();
			}

			this.getView().setBusy(false);

		},
	});
});