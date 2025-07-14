sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/odata/v4/ODataModel",
	"sap/ui/model/json/JSONModel",
    'sap/ui/model/BindingMode',
    'sap/viz/ui5/format/ChartFormatter',
    'sap/viz/ui5/api/env/Format',
    'sap/viz/ui5/controls/Popover',
    "sap/ui/core/format/NumberFormat",
    'sap/ui/core/HTML',
	"sap/ui/core/EventBus"
], function (Controller, ODataModel, JSONModel, BindingMode, ChartFormatter, Format, Popover, NumberFormat, HTMLControl, EventBus) {
	"use strict";

	return Controller.extend("bix.card.performanceBar.Main", {
		_oEventBus: EventBus.getInstance(),

		onInit: function () {
            this._oEventBus.subscribe("pl", "search", this._barChartData, this);
            this._oEventBus.subscribe("pl", "search", this._lineChartData, this);

			this._chartSetting1();
			this._chartSetting2();
		},
		
		_chartSetting1:function(){
			Format.numericFormatter(ChartFormatter.getInstance());
            let formatPattern = ChartFormatter.DefaultPattern;
			let oVizFrame = this.oVizFrame = this.byId("performanceBarChart");
            oVizFrame.setVizProperties({
				plotArea: {
					dataLabel: {
						visible: true
					},
					dataPointStyle: {
						rules: [{
							callback: function (oContext) {
								if (oContext.목표 > oContext.값) {
									return true;
								};
							},
							properties: {
								color: "red"
							},
							displayName: "미달성"
						}, {
							callback: function (oContext) {
								if (oContext.목표 <= oContext.값) {
									return true;
								};
							},
							properties: {
								color: "green"
							},
							displayName: "달성"
						}]
					}
				},
				categoryAxis:{
					title:{
						visible: false
					}
				},
				valueAxis:{
					label:{
						formatString: formatPattern.SHORTFLOAT_MFD2,
					},
					title:{
						visible: false
					}
				},
				legendGroup: { layout: { alignment: 'center', position: 'bottom' } },
                title: {
                    visible: true,
                    text: '실적'
                }
            });

			let popoverProps = {
                'customDataControl' : function(data){
                    let aData = this.getView().getModel("barChartModel").getData();
					let oRate = aData.find(data => data.type === "마진율");
                    if(data){
                        let divStr = "";
						if(data.data.val[0].value === '마진율'){
							divStr = divStr + "<div style = 'margin: 15px 30px 0 30px'>" + "분류:" + "<span style = 'float: right'>" + data.data.val[0].value + "</b></div>";
							divStr = divStr + "<div style = 'margin: 5px 30px 0 30px'>" + "마진율:" + "<span style = 'float: right'>" + this.percentFormat(oRate.oldRate) + "</span></div>";
							divStr = divStr + "<div style = 'margin: 5px 30px 0 30px'>" + "목표:" + "<span style = 'float: right'>" + this.percentFormat(oRate.oldTargetRate) + "</span></div>";
							divStr = divStr + "<div style = 'margin: 5px 30px 15px 30px'>" + "차이:" + "<span style = 'float: right'>" + this.percentFormat(oRate.oldTargetRate - oRate.oldRate) + "</span></div>";
						}else{
							divStr = divStr + "<div style = 'margin: 15px 30px 0 30px'>" + "분류:" + "<span style = 'float: right'>" + data.data.val[0].value + "</b></div>";
							divStr = divStr + "<div style = 'margin: 5px 30px 0 30px'>" + "금액:" + "<span style = 'float: right'>" + this.numberFormat(data.data.val[1].value) + "</span></div>";
							divStr = divStr + "<div style = 'margin: 5px 30px 0 30px'>" + "목표:" + "<span style = 'float: right'>" + this.numberFormat(data.data.val[2].value) + "</span></div>";
							divStr = divStr + "<div style = 'margin: 5px 30px 15px 30px'>" + "차이:" + "<span style = 'float: right'>" + this.numberFormat(data.data.val[2].value - data.data.val[1].value) + "</span></div>";
						};
                        return new HTMLControl({content:divStr});
                    }
                }.bind(this)
            };

            var oPopOver = new Popover(popoverProps);
            oPopOver.connect(oVizFrame.getVizUid());
		},

		_chartSetting2:function(){
			Format.numericFormatter(ChartFormatter.getInstance());
            let formatPattern = ChartFormatter.DefaultPattern;
			let oVizFrame = this.oVizFrame = this.byId("performanceLineChart");
            oVizFrame.setVizProperties({
				plotArea: {
                    primaryScale: {
                        autoMinValue: true
                    },
                    window: {
                        start: "firstDataPoint",
                        end: "lastDataPoint"
                    },
                    dataPoint: {
                        invalidity: "ignore"
                    }
                },
				timeAxis: {
                    levels: ["year", "month"],
                    title: { visible: false },
                },
				valueAxis:{
					title:{
						visible: false
					},
					label: {
                        formatString: `#,##0"%"`
                    }
				},
				legendGroup: { layout: { alignment: 'center', position: 'bottom' } },
                title: {
                    visible: true,
                    text: '월별 진척률'
                }
            });
			
            var oPopOver = new Popover();
            oPopOver.connect(oVizFrame.getVizUid());
            oPopOver.setFormatString(`#,##0.00"%"`);
		},

		_barChartData:function(sChannel, sEvent, oData, sKey){
			if(oData) {
                this.orgId = oData.orgId;
                this.year = oData.year;
                this.month = oData.month;
            };

			const oModel = new ODataModel({
				serviceUrl: "../odata/v4/pl-api/",
				synchronizationMode: "None",
				operationMode: "Server"
			});
			const oBinding = oModel.bindContext(`/get_pl_performance_bar_chart(year='${this.year}',month='${this.month}',org_id='${this.orgId}')`);

			oBinding.requestObject().then((oRes) => {
				let aResult = []
				let oSaleTarget = oRes.value.find(data => data.type === "매출");
				oRes.value.forEach(data=>{
					if(data.type === "마진율"){
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
                this.getOwnerComponent().setModel(new JSONModel(oRes.value), "barChartModel")
			}).catch((err)=> {
				console.log(err)
			});
		},

		_lineChartData:function(sChannel, sEvent, oData, sKey){
			if(oData) {
                this.orgId = oData.orgId;
                this.year = oData.year;
                this.month = oData.month;
            };

			const oModel = new ODataModel({
				serviceUrl: "../odata/v4/pl-api/",
				synchronizationMode: "None",
				operationMode: "Server"
			});
			const oBinding = oModel.bindContext(`/get_pl_performance_month_rate(year='${this.year}',month='${this.month}',org_id='${this.orgId}')`);

			oBinding.requestObject().then((oRes) => {
				// console.log(oRes.value);
				let aResult = []
				oRes.value.forEach(data=>{
					data.newDate = new Date(data.year, data.month -1);
					aResult.push({...data});
				});
				// 

				this.getOwnerComponent().setModel(new JSONModel(aResult), "lineChartModel");
                // this.getOwnerComponent().setModel(new JSONModel(oRes.value), "lineChartModel")
			}).catch((err)=> {
				console.log(err)
			});
		},

		numberFormat: function (iNum) {
            const oNumberFormat = NumberFormat.getIntegerInstance({
                groupingEnabled: true,
                groupingSeparator: ','
            });

            return oNumberFormat.format(iNum);
        },

        percentFormat: function (iNum) {
            const oNumberFormat = NumberFormat.getIntegerInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                decimals: 2
            });

            return oNumberFormat.format(iNum) + '%';
        },
	});
});