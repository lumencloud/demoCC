sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/model/odata/v4/ODataModel",
	"sap/ui/model/json/JSONModel"
], function (UIComponent, ODataModel, JSONModel) {
	"use strict";

	return UIComponent.extend("bix.card.performanceBar.Component", {
		metadata: {
			manifest: "json"
		},

		init() {
			// call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);
			
			const oModel = new ODataModel({
				serviceUrl: "../odata/v4/pl-api/",
				synchronizationMode: "None",
				operationMode: "Server"
			})
			const oBinding = oModel.bindContext("/get_pl_performance_bar_chart(year='2024',month='09',org_id='5')");
			const oBinding2 = oModel.bindContext("/get_pl_performance_month_rate(year='2024',month='09',org_id='5')");

			oBinding.requestObject().then((oRes) => {
				let aResult = []
				let oSaleTarget = oRes.value.find(data => data.type === "매출");
				oRes.value.forEach(data=>{
					if(data.type === "마진률"){
						data.oldRate = data.performanceCurrentYearMonth;
						data.oldTargetRate = data.goal;
						if(Math.sign(data.performanceCurrentYearMonth) === -1){
							data.performanceCurrentYearMonth = data.performanceCurrentYearMonth * 10000000;
							data.goal = data.goal * 10000000;
						}else{
							data.performanceCurrentYearMonth = (oSaleTarget.goal / data.goal) * data.performanceCurrentYearMonth;
							data.goal = oSaleTarget.goal;
						};
					};
					aResult.push({...data});
				});
				console.log(aResult)
				this.setModel(new JSONModel(aResult), "barChartModel");
			}).catch((err)=> {
				console.log(err)
			});

			oBinding2.requestObject().then((oRes) => {
				// console.log(oRes.value)
				let aResult = []
				oRes.value.forEach(data=>{
					data.newDate = new Date(data.year, data.month -1);
					aResult.push({...data});
				});
				// console.log(aResult)

				this.setModel(new JSONModel(aResult), "lineChartModel");
				// this.setModel(new JSONModel(oRes.value), "lineChartModel");
			}).catch((err)=> {
				console.log(err)
			});
		},

        onCardReady(oCard) {
            this.oCard = oCard;
        }
	});
});
