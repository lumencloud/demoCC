sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/odata/v4/ODataModel",
	"sap/ui/core/format/NumberFormat",
	"sap/ui/core/EventBus",
	"../../main/util/Module",
], function (Controller, JSONModel, ODataModel, NumberFormat, EventBus, Module) {
	"use strict";

	return Controller.extend("bix.card.deliveryMonthlyContent1_2.Main", {
		_oEventBus: EventBus.getInstance(),
		onInit: function () {
			this._dataSetting();
			this._oEventBus.subscribe("aireport", "infoSet", this._dataSetting, this);		
		},

		_dataSetting : async function (){
			this.getOwnerComponent().oCard.setBusy(true)
			// this.byId("cardContent").setBusy(true);
			let oData = JSON.parse(sessionStorage.getItem("aiReport"));

			let iYear = oData.year;
            let sMonth = oData.month
            let sOrgId = oData.orgId;
            let sOrgType = oData.type;
			this.getView().setModel(new JSONModel({
				profitVisible:false
			}),"viewModel")
			if(sOrgId==="5" && sOrgType === "delivery"){
				this.getView().getModel("viewModel").setProperty("/profitVisible",true)
			}
	
			const oModel = new ODataModel({
			  serviceUrl: "../odata/v4/pl_api/",
			  synchronizationMode: "None",
			  operationMode: "Server"
			});
	
			let sPath = `/get_actual_m_pl_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',org_tp='${sOrgType}')`
	
			await oModel.bindContext(sPath).requestObject().then(
			  function(aResult){
				Module.displayStatusForEmpty(this.getOwnerComponent().oCard,aResult.value, this.byId("cardContent"));
				this.dataLoad();
				this._modelSetting(aResult.value);
			  }.bind(this)
			).catch((oErr) => {
				Module.displayStatus(this.getOwnerComponent().oCard, oErr.error.code, this.byId("cardContent"));
			})
			this.getOwnerComponent().oCard.setBusy(false)
		},

		dataLoad : function(){
			const oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.publish("CardChannel","CardFullLoad",{
				cardId:this.getView().getId()
			})
		},

		_modelSetting: function (aResult) {
			let oModelData = aResult.length > 0 ? aResult[0] : {};
			this.getView().setModel(new JSONModel(oModelData),"Model");
		},

		onFormatPerformance: function (iValue, sType) {

            if (sType === "percent") {
                // 단위 조정(% 사용 소숫점 2번째까지 사용)

                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingSeparator: ',',
                    decimals: 1
                });
                return oNumberFormat.format(iValue);
            } if (sType === "number") {
                // 단위 조정(% 사용 소숫점 2번째까지 사용)

                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingSeparator: ',',
                    decimals: 0
                });
                return oNumberFormat.format(iValue/100000000);
            } else {
                // 데이터에 단위 구분점
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2
                });
                return oNumberFormat.format(iValue);
            };
        },
	});
});