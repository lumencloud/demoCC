
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
    "sap/ui/integration/widgets/Card",
    'sap/m/Panel',
], function (Controller, JSONModel, ODataModel, NumberFormat, EventBus, Card, Panel ) {
    "use strict";

    return Controller.extend("bix.card.actualSMTypeChartContainer.card", {

        onInit: function () {
       
            this._dataRequest();
            
        },

        // _clickVBoxSetting: async function(){
        //     let oVBox = this.byId("clickAbleVBox")
        //     oVBox.addEventDelegate({
        //         onclick:this.onVBoxClick.bind(this)
        //     })

        // },

        // onVBoxClick: function(oDomEvent){
        //     let sParentId = oDomEvent.currentTarget.id
        //     let bVisible = sap.ui.getCore().byId(sParentId).getItems()[1].getVisible()
        //     sap.ui.getCore().byId(sParentId).getItems()[1].setVisible(!bVisible)
        // },

        _dataRequest: async function(){
            let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;

            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            })
       

            let sOrgPath = `/get_actual_sale_chart_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`           
            
            let aData = [];

            await Promise.all([
                oModel.bindContext(sOrgPath).requestObject()                
            ]).then(function(aResults){
                //console.log(aResults[0].value)
                this._chartSetting(aResults[0].value)                
            }.bind(this)
            )
        },

        _chartSetting: function (aData){
            let aModelData = [];
            aData.forEach(
                function(data){
                    let sale_type, margin_type, marginrate_type, sale_size, sale_size2, sale_difference, margin_size, margin_size2, margin_difference, yoy_type;
                    if(data.curr_sale>=data.last_sale){
                        sale_type = true
                        if(data.target_sale !== 0){
                            sale_size = data.curr_sale/data.target_sale * 100 + "%"
                            sale_size2 = (100 - (data.curr_sale/data.target_sale * 100)) + "%"
                            sale_difference = data.target_sale - data.curr_sale
                        } else {
                            sale_size = "100%"
                            sale_size2 = "0%"
                            sale_difference = 0
                        }
                        
                    } else {
                        sale_type = false
                        if(data.target_sale !== 0){
                            sale_size = data.curr_sale/data.target_sale * 100 + "%"
                            sale_size2 = (100 - (data.curr_sale/data.target_sale * 100) - data.last_sale/data.target_sale * 100) + "%"
                            sale_difference = data.target_sale - data.curr_sale
                        } else {
                            sale_size = "100%"
                            sale_size2 = "0%"
                            sale_difference = 0
                        }
                    }

                    if(data.curr_margin>=data.last_margin){
                        margin_type = true
                        if(data.target_sale !== 0){
                            margin_size = data.curr_margin/data.target_margin * 100 + "%"
                            margin_size2 = (100 - (data.curr_margin/data.target_margin * 100)) + "%"
                            margin_difference = data.target_margin - data.curr_margin
                        } else {
                            margin_size = "100%"
                            margin_size2 = "0%"
                            margin_difference = 0
                        }
                        
                    } else {
                        margin_type = false
                        if(data.target_margin !== 0){
                            margin_size = data.curr_margin/data.target_margin * 100 + "%"
                            margin_size2 = (100 - (data.curr_margin/data.target_margin * 100) - data.last_margin/data.target_margin * 100) + "%"
                            margin_difference = data.target_margin - data.curr_margin
                        } else {
                            margin_size = "100%"
                            margin_size2 = "0%"
                            margin_difference = 0
                        }
                    }

                    let circleRate;
                    if(data.curr_sale===0){
                        circleRate = 50 + 5
                    }else {
                        circleRate = (data.curr_margin / data.curr_sale * 100 / 2) + 50 + 5
                     }
                    
                    let oModel = {
                        "org_name" : data.org_name,
                        "curr_sale" : this.onFormatPerformance(data.curr_sale, 'billion'),
                        "curr_margin" : this.onFormatPerformance(data.curr_margin, 'billion'),
                        "margin_rate" : data.margin_rate,
                        "target" : data.target,
                        "sale_contrast" : data.yoy_sale_rate,
                        "margin_contrast" : data.yoy_margin_rate,
                        "sale_type" : sale_type,
                        "margin_type" : margin_type,
                        "yoy_margin_rate":  this.onFormatPerformance(data.yoy_margin_rate,'percent'),
                        "yoy_margin_type": data.yoy_margin_rate >= 0 ? true : false,
                        "yoy_sale_rate":  this.onFormatPerformance(data.yoy_sale_rate,'percent'),
                        "yoy_sale_type": data.yoy_sale_rate >= 0 ? true : false,
                        "sale_size" : sale_size,
                        "sale_size2" : sale_size2,
                        "margin_size" : margin_size,
                        "margin_size2" : margin_size2,
                        "sale_target": this.onFormatPerformance(data.target_sale, 'billion'),
                        "sale_difference" : this.onFormatPerformance(sale_difference, 'billion'),
                        "margin_target" : this.onFormatPerformance(data.target_margin, 'billion'),
                        "margin_difference" : this.onFormatPerformance(margin_difference, 'billion'),
                        "marginRate_target" : this.onFormatPerformance(data.target_margin / data.target_sale * 100, 'percent2'),
                        "marginRate" : this.onFormatPerformance(data.curr_margin / data.curr_sale * 100, 'percent2'),
                        "marginRate_type" : (data.curr_margin / data.curr_sale) >=0 ? true : false,
                        "circleRate" : this.onFormatPerformance(circleRate, 'percent2'),
                        "talkingRate" : this.onFormatPerformance(circleRate-8.2, 'percent2'),
                    }

                    aModelData.push(oModel)
                }.bind(this)
            )

            this.getView().setModel(new JSONModel(aModelData), "orgModel")
        },


        onFormatPerformance: function (iValue, sType) {
            if(!iValue){iValue=0}

            // 단위 조정
            if (sType === "percent") {
                if(iValue<0){iValue = -iValue};
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });
                return oNumberFormat.format(iValue) + "%";
            } else  if (sType === "percent2") {
                if(iValue<0){iValue = -iValue};
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 1,
                });
                return oNumberFormat.format(iValue) + "%";
            } else if (sType === "tooltip") {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iValue);
            }else if (sType === "billion"){
                if(iValue >= 1000000000000){
                    var oNumberFormat = NumberFormat.getFloatInstance({
                        groupingEnabled: true,
                        groupingSeparator: ',',
                        groupingSize: 3,
                        decimals: 1
                    });
                    return oNumberFormat.format(iValue/1000000000000) + "조";

                } else if (iValue < 1000000000000 && iValue >= 100000000000){
                    var oNumberFormat = NumberFormat.getFloatInstance({
                        groupingEnabled: true,
                        groupingSeparator: ',',
                        groupingSize: 3,
                        decimals: 1
                    });
                    return oNumberFormat.format(iValue/100000000000) + "천억";
                } else if(iValue < 100000000000){
                    var oNumberFormat = NumberFormat.getFloatInstance({
                        groupingEnabled: true,
                        groupingSeparator: ',',
                        groupingSize: 3,
                        decimals: 1
                    });
                    return oNumberFormat.format(iValue/100000000) + "억";
                } 
            };
        },

        

        


        
    });
});           