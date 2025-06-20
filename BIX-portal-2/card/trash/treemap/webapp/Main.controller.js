sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/BindingMode',
    'sap/ui/model/json/JSONModel',
    "sap/ui/model/odata/v4/ODataModel",
    'sap/viz/ui5/format/ChartFormatter',
    'sap/viz/ui5/api/env/Format',
    'sap/ui/core/HTML',
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus"
], function (Controller, BindingMode, JSONModel, ODataModel, ChartFormatter, Format, HTMLControl, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("treemap.Main", {
        year: '2024',
        month: '09',
        orgId: '5',
        category: 'sale',
        _oEventBus: EventBus.getInstance(),

        

        onInit: function () {
            this._oEventBus.subscribe("pl", "search", this._treemapChartData, this);
            this._oEventBus.subscribe("pl", "search", this._lineChartData, this);
			this._chartSetting1();
			this._chartSetting2();
            this._selectDataSetting()
        },

        _chartSetting1:function(){
            Format.numericFormatter(ChartFormatter.getInstance());
            var formatPattern = ChartFormatter.DefaultPattern;
            // set explored app's demo model on this sample
            // var oModel = new JSONModel(this.settingsModel);
            // oModel.setDefaultBindingMode(BindingMode.OneWay);
            // this.getView().setModel(oModel);

            var oVizFrame = this.oVizFrame = this.getView().byId("idVizFrame");
            oVizFrame.setVizProperties({
                plotArea: {
                    dataPointStyle: {
                        rules: [{
                            callback: function (oContext) {
                                if (0 <= oContext.진척률 && oContext.진척률 < 25) {
                                    return true;
                                };
                            },
                            properties: {
                                color: "#fc0303"
                            },
                            displayName: "0 ~ 25%"
                        },{
                            callback: function (oContext) {
                                if (25 <= oContext.진척률 && oContext.진척률 < 50) {
                                    return true;
                                };
                            },
                            properties: {
                                color: "#fc5e03"
                            },
                            displayName: "25 ~ 50%"
                        },{
                            callback: function (oContext) {
                                if (50 <= oContext.진척률 && oContext.진척률 < 75) {
                                    return true;
                                };
                            },
                            properties: {
                                color: "#fca503"
                            },
                            displayName: "50 ~ 75%"
                        },{
                            callback: function (oContext) {
                                if (75 <= oContext.진척률 && oContext.진척률 < 100) {
                                    return true;
                                };
                            },
                            properties: {
                                color: "#fcf403"
                            },
                            displayName: "75 ~ 100%"
                        },{
                            callback: function (oContext) {
                                if (100 <= oContext.진척률) {
                                    return true;
                                };
                            },
                            properties: {
                                color: "#7bfc03"
                            },
                            displayName: "100% 이상"
                        }]
                    }
                },
                dataLabel: {
                    formatString: formatPattern.SHORTFLOAT_MFD2,
                    visible: true
                },
                legend: {
                    visible: true,
                    formatString: formatPattern.SHORTFLOAT,
                    title: {
                        visible: false
                    }
                },
                title: {
                    visible: false,
                    text: 'Treemap'
                }
            });

            let popoverProps = {
                'customDataControl' : function(data){
                    let aData = this.getView().getModel("treemap").getData();
                    if(data){
                        let divStr = "";
                        divStr = divStr + "<div style = 'margin: 15px 30px 0 30px'>" + "조직:" + "<span style = 'float: right'>" + data.data.val[0].value + "</b></div>";
                        divStr = divStr + "<div style = 'margin: 5px 30px 0 30px'>" + "금액:" + "<span style = 'float: right'>" + this.numberFormat(data.data.val[1].value) + "</span></div>";
                        divStr = divStr + "<div style = 'margin: 5px 30px 0 30px'>" + "목표:" + "<span style = 'float: right'>" + this.numberFormat(aData[data.data.val[3].value].target) + "</span></div>";
                        divStr = divStr + "<div style = 'margin: 5px 30px 0 30px'>" + "차이:" + "<span style = 'float: right'>" + this.numberFormat(aData[data.data.val[3].value].difference) + "</span></div>";
                        divStr = divStr + "<div style = 'margin: 5px 30px 15px 30px'>" + "달성률:" + "<span style = 'float: right'>" + this.percentFormat(data.data.val[2].value) + "</span></div>";
                        return new HTMLControl({content:divStr});
                    }
                }.bind(this)
            }

            let oPopOver = new sap.viz.ui5.controls.Popover(popoverProps);
            oPopOver.connect(oVizFrame.getVizUid());
        },

        _chartSetting2:function(){
			Format.numericFormatter(ChartFormatter.getInstance());
            let formatPattern = ChartFormatter.DefaultPattern;
			let oVizFrame = this.oVizFrame = this.byId("divLineChart");
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
                    text: '월별 부문별 진척률'
                }
            });
			
            let oPopOver = new sap.viz.ui5.controls.Popover();
            oPopOver.connect(oVizFrame.getVizUid());
            oPopOver.setFormatString(`#,##0.00"%"`);
		},

        _selectDataSetting: function(){
            this.getView().setModel(new JSONModel({div:"hdqt", sale:"sale"}), "searchModel");
            let oTemp1 = [{
                key:"div",
                value:"부문별"
            },{
                key:"hdqt",
                value:"본부별"
            }];
            this.getView().setModel(new JSONModel(oTemp1), "divModel");

            let oTemp2 = [{
                key:"sale",
                value:"매출"
            },{
                key:"margin",
                value:"마진"
            }];
            this.getView().setModel(new JSONModel(oTemp2), "saleModel");
        },

        onSelectSale(oEvent) {
            const sKey = oEvent.getParameter("selectedItem").getKey();
            this._treemapChartData(null,null,null,sKey)
            this._lineChartData(null,null,null,sKey)
        },

//본부별 부문별 선택 이벤트 함수
        // onSelectDiv(oEvent) {
        //     const sKey = this.getView().getModel("searchModel").getData().sale;
        //     let aTemp = this.getView().getModel("treemap").getData();
        //     console.log(sKey)
        //     console.log(aTemp)

        //     // this._readChartData(null,null,null,sKey);
        // },

        _treemapChartData(sChannel, sEvent, oData, sKey) {
            if(oData) {
                this.orgId = oData.orgId;
                this.year = oData.year;
                this.month = oData.month;
            }
            if(sKey) this.category = sKey;
            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl-api/",
                synchronizationMode: "None",
                operationMode: "Server"
            })
            const oBinding = oModel.bindContext(`/get_pl_treemap(year='${this.year}',month='${this.month}',org_id='${this.orgId}',category='${this.category}')`);

            oBinding.requestObject().then((oRes) => {
                this.getOwnerComponent().setModel(new JSONModel(oRes.value), "treemap")
            }).catch((err) => {
                console.log(err)
            })
        },

        _lineChartData(sChannel, sEvent, oData, sKey) {
            if(oData) {
                this.orgId = oData.orgId;
                this.year = oData.year;
                this.month = oData.month;
            }
            if(sKey) this.category = sKey;

            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl-api/",
                synchronizationMode: "None",
                operationMode: "Server"
            })
            const oBinding = oModel.bindContext(`/get_pl_treemap_month_rate(year='${this.year}',month='${this.month}',org_id='${this.orgId}',category='${this.category}')`);

            oBinding.requestObject().then((oRes) => {
                let aResult = []
				oRes.value.forEach(data=>{
					data.newDate = new Date(data.year, data.month -1);
					aResult.push({...data});
				});
                // console.log(aResult)
                this.getOwnerComponent().setModel(new JSONModel(aResult), "lineChartModel")
            }).catch((err) => {
                console.log(err)
            })
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