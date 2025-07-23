
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

    return Controller.extend("bix.card.actualSMAccountChartContainer.card", {

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
       

            let sOrgPath = `/get_actual_sale_account_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',display_type='chart')`           
            
            let aData = [];

            await Promise.all([
                oModel.bindContext(sOrgPath).requestObject()                
            ]).then(function(aResults){
                this._chartSetting(aResults[0].value)
            }.bind(this)
            )
        },

        _chartSetting: function (aData){
            let aModelData = [];


            for(let i = 0; i < aData.length; i += 3){
                let org_name = aData[i].account_nm;
                let curr_sale = this.onFormatPerformance(aData[i].actual_curr_ym_value, "billion")
                let curr_margin = this.onFormatPerformance(aData[i+1].actual_curr_ym_value, "billion")
                let margin_rate = this.onFormatPerformance(aData[i+2].actual_curr_ym_value, "percent")
                let target = this.onFormatPerformance(aData[i+2].target_curr_y_value, "percent")
                let convert_contrast;
                if(aData[i].actual_last_ym_value === 0){
                    convert_contrast = 0
                } else {convert_contrast = this.onFormatPerformance((aData[i].actual_curr_ym_value - aData[i].actual_last_ym_value)/aData[i].actual_last_ym_value*100, "percent")}
                
                let convert_margin_contrast;
                if(aData[i+1].actual_last_ym_value === 0){
                    convert_margin_contrast = 0
                } else {convert_margin_contrast = this.onFormatPerformance((aData[i+1].actual_curr_ym_value - aData[i+1].actual_last_ym_value)/aData[i+1].actual_last_ym_value*100, "percent")}
                let type, type2, type3

                if((aData[i].actual_curr_ym_value - aData[i].actual_last_ym_value)/aData[i].actual_last_ym_value*100  > 0){
                    type = true
                } else if ((aData[i].actual_curr_ym_value - aData[i].actual_last_ym_value)/aData[i].actual_last_ym_value*100  > 0){
                    type = false
                }

                if((aData[i+1].actual_curr_ym_value - aData[i+1].actual_last_ym_value)/aData[i+1].actual_last_ym_value*100  > 0){
                    type2 = true
                } else if ((aData[i+1].actual_curr_ym_value - aData[i+1].actual_last_ym_value)/aData[i+1].actual_last_ym_value*100 < 0 ){
                    type2 = false
                }

                if(aData[i+2].actual_curr_ym_value>0){
                    type3 = true
                } else if(aData[i+2].actual_curr_ym_value<0){
                    type3 = false
                }


                let oModel = {
                    "org_name" : org_name,
                    "curr_sale" : curr_sale,
                    "curr_margin" : curr_margin,
                    "margin_rate" : margin_rate,
                    "target" : target,
                    "sale_contrast" : convert_contrast,
                    "margin_contrast" : convert_margin_contrast,
                    "type" : type,
                    "type2" : type2,
                    "type3" : type3
                }
                aModelData.push(oModel)
            }

            this.getView().setModel(new JSONModel(aModelData), "model")
        },


        onFormatPerformance: function (iValue, sType) {
            if(!iValue){iValue=0}

            // 단위 조정
            if (sType === "percent") {
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