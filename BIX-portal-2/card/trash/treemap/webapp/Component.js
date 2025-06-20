sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/model/odata/v4/ODataModel",
	"sap/ui/model/json/JSONModel"
], function (UIComponent, ODataModel, JSONModel) {
	"use strict";

	return UIComponent.extend("bix.card.treemap.Component", {
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
			const oBinding = oModel.bindContext("/get_pl_treemap(year='2024',month='09',org_id='5',category='sale')");
			const oBinding2 = oModel.bindContext("/get_pl_treemap_month_rate(year='2024',month='09',org_id='5',category='sale')");

			oBinding.requestObject().then((oRes) => {
				this.setModel(new JSONModel(oRes.value), "treemap")
			}).catch((err)=> {
				console.log(err)
			})

			oBinding2.requestObject().then((oRes) => {
				let aResult = []
				oRes.value.forEach(data=>{
					data.newDate = new Date(data.year, data.month -1);
					aResult.push({...data});
				});

				this.setModel(new JSONModel(aResult), "lineChartModel");
			}).catch((err)=> {
				console.log(err)
			});
		},

        onCardReady(oCard) {
            this.oCard = oCard;
        }
	});
});
