
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

    return Controller.extend("bix.card.planSMTypeChartContainer.card", {

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
       

            let sOrgPath = `/get_forecast_pl_sale_margin_org_detail(year='${iYear}',org_id='${sOrgId}')`
            
            let aData = [];

            await Promise.all([
                oModel.bindContext(sOrgPath).requestObject()                
            ]).then(function(aResults){
                debugger
                this._chartSetting(aResults[0].value)
            }.bind(this)
            )
        },

        _chartSetting: function (aData){
            let aModelData = [];

            for(let i = 0; i < aData.length; i += 2){
                let org_name = aData[i].org_name;
                let curr_sale = aData[i].secured_value;
                let curr_margin = aData[i+1].secured_value;
                let margin_rate = aData[i].yoy;
                let plan = aData[i].plan_ratio;               

                let type, type2, type3
                if(aData[i].yoy>0){
                    type =  true
                    type3 = true
                } else if(aData[i].yoy<0) {
                    type = false
                    type3 = false
                }
                let convert_contrast = this.onFormatPerformance(aData[i].yoy, 'billion')
                


                let oModel = {
                    "org_name" : org_name,
                    "curr_sale" : curr_sale,
                    "curr_margin" : curr_margin,
                    "margin_rate" : margin_rate, //전년비
                    "plan" : plan, //계획비
                    "sale_contrast" : convert_contrast, // 매출 전년대비
                    "margin_contrast" : convert_margin_contrast, //마진 전년대비
                    "type" : type,
                    "type2" : type2,
                    "type3" : type3,
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