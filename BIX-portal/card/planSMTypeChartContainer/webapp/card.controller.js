
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
    "sap/ui/integration/widgets/Card",
    'sap/m/Panel',
    "../../main/util/Module",
], function (Controller, JSONModel, ODataModel, NumberFormat, EventBus, Card, Panel,Module ) {
    "use strict";

    return Controller.extend("bix.card.planSMTypeChartContainer.card", {

        onInit: function () {
       
            this._dataRequest();
            this._setSelect(); // selet 셋팅
            
        },

        _setSelect: function(){
            // Select
            this.getView().setModel(new JSONModel([
                {key: "org", name: "조직별" },
                {key: "Account", name: "Account별" },
            ]), "selectModel");

            //uiChange

            this.getView().setModel(new JSONModel({key : "org"}), "uiModel")
        },



        onUiChange:function(oEvent){   
            let ouiModel = this.getView().getModel("uiModel");
            ouiModel.setProperty("/key", oEvent.getSource().getSelectedKey())
            
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
            this.byId("flexBox").setBusy(true)    
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;            
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 90);

            // 각 카드 크기 지정
            this.byId("vBox").setHeight(iBoxHeight*0.8+"vh")
            this.byId("vBox2").setHeight(iBoxHeight*0.8+"vh")


            let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();  
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");          
            let sOrgId = oData.orgId;
            // let sOrgId = 5

            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            })
       

            let sOrgPath = `/get_forecast_pl_sale_margin_org_detail(year='${iYear}',org_id='${sOrgId}',org_tp='delivery',display_type='chart')`
            let sAccountPath = `/get_forecast_pl_sale_margin_account_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',display_type='chart')`
            let aData = [];

            await Promise.all([
                oModel.bindContext(sOrgPath).requestObject(),                
                oModel.bindContext(sAccountPath).requestObject()                
            ]).then(function(aResults){

                let oOrgModel = this._chartSetting(aResults[0].value)
                let oAccountModel = this._chartSetting2(aResults[1].value)

                this.getView().setModel(new JSONModel(oAccountModel), "model2")
                this.getView().setModel(new JSONModel(oOrgModel), "model")
            }.bind(this))
            // .catch((oErr) => {
            //     Module.displayStatus(this.getOwnerComponent().oCard,oErr.error.code, this.byId("flexBox"));
            // });
            this.byId("flexBox").setBusy(false)    

        },

        _chartSetting: function (aData){
            let aModelData = [];

            for(let i = 0; i < aData.length; i += 2){    
                let oModel = {
                    "org_name" : aData[i].org_name ? aData[i].org_name : aData[i].account_nm,
                    "target_margin" : aData[i+1].forecast_value - aData[i+1].plan_ratio,                    
                    "target_sale" : aData[i].forecast_value - aData[i].plan_ratio,
                    "curr_margin" : aData[i+1].forecast_value,
                    "curr_sale" : aData[i].forecast_value,
                    "yoy_margin_rate" : (aData[i+1].forecast_value - aData[i+1].yoy) === 0 ? 0 : aData[i+1].forecast_value/ (aData[i+1].forecast_value - aData[i+1].yoy),
                    "yoy_sale_rate" : (aData[i].forecast_value - aData[i].yoy)===0 ? 0 : aData[i].forecast_value/ (aData[i].forecast_value - aData[i].yoy),
                    "last_sale" : aData[i].forecast_value - aData[i].yoy,
                    "last_margin" : aData[i+1].forecast_value - aData[i+1].yoy,
                    "target_margin_rate" : (aData[i+1].forecast_value - aData[i].plan_ratio)===0?0:(aData[i+1].forecast_value - aData[i].plan_ratio) / (aData[i+1].forecast_value - aData[i].plan_ratio),
                    "plan_ratio" : (aData[i].forecast_value - aData[i].plan_ratio)===0? 0 : aData[i].forecast_value/(aData[i].forecast_value - aData[i].plan_ratio),
                }
                aModelData.push(oModel)

            }

            console.log(aModelData)

            let aTransData = [];
            aModelData.forEach(
                function(data){
                    let sale_type, margin_type, marginrate_type, sale_size, sale_size2, sale_difference, margin_size, margin_size2, margin_difference, yoy_type;
                    if(data.curr_sale>=data.last_sale){
                        sale_type = true
                        if(data.target_sale !== 0){
                            sale_size = data.curr_sale/data.target_sale * 100 + "%"
                            sale_size2 = (100 - (data.curr_sale/data.target_sale * 100)) + "%"
                            if(data.target_sale >= data.curr_sale){
                                sale_difference = data.target_sale - data.curr_sale
                            } else {
                                sale_difference = 0
                            }
                            
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
                            if(data.target_sale >= data.curr_sale){
                                sale_difference = data.target_sale - data.curr_sale
                            } else {
                                sale_difference = 0
                            }
                            
                        } else {
                            sale_size = "100%"
                            sale_size2 = "0%"
                            sale_difference = 0
                        }
                    }

                    if(data.curr_margin>=data.last_margin){
                        margin_type = true
                        if(data.target_margin !== 0){
                            margin_size = data.curr_margin/data.target_margin * 100 + "%"
                            margin_size2 = (100 - (data.curr_margin/data.target_margin * 100)) + "%"

                            if(data.target_margin >= data.curr_margin){
                                margin_difference = data.target_margin - data.curr_margin
                            } else {
                                margin_difference = 0
                            }
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
                            
                            if(data.target_margin >= data.curr_margin){
                                margin_difference = data.target_margin - data.curr_margin
                            } else {
                                margin_difference = 0
                            }
                            
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
                        // "target" : data.target,
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
                        "marginRate_target" : this.onFormatPerformance(data.target_sale === 0 ? 0 : data.target_margin / data.target_sale * 100, 'percent2'),
                        "marginRate" : this.onFormatPerformance(data.curr_sale===0? 0 : data.curr_margin / data.curr_sale * 100, 'percent2'),
                        "marginRate_type" : (data.curr_margin / data.curr_sale) >=0 ? true : false,
                        "circleRate" : this.onFormatPerformance(circleRate, 'percent2'),
                        "talkingRate" : this.onFormatPerformance(circleRate-8.2, 'percent2'),
                        "planRatio" : this.onFormatPerformance(data.plan_ratio, 'percent2')
                    }

                    aTransData.push(oModel)
                }.bind(this)
            )

            console.log(aTransData)
            return aTransData
            
        },

        _chartSetting2: function (aData){
            let aModelData = [];

            for(let i = 0; i < aData.length; i ++){    
                let oModel = {
                    "org_name" : aData[i].org_name ? aData[i].org_name : aData[i].account_nm,
                    "target_sale" : aData[i].forecast_value - aData[i].plan_ratio,
                    "curr_sale" : aData[i].forecast_value,
                    "yoy_sale_rate" : (aData[i].forecast_value - aData[i].yoy)===0 ? 0 : aData[i].forecast_value/ (aData[i].forecast_value - aData[i].yoy),
                    "last_sale" : aData[i].forecast_value - aData[i].yoy,
                    "plan_ratio" : (aData[i].forecast_value - aData[i].plan_ratio)===0? 0 : aData[i].forecast_value/(aData[i].forecast_value - aData[i].plan_ratio),
                }
                aModelData.push(oModel)

            }

            console.log(aModelData)

            let aTransData = [];
            aModelData.forEach(
                function(data){
                    let sale_type, margin_type, marginrate_type, sale_size, sale_size2, sale_difference, margin_size, margin_size2, margin_difference, yoy_type;
                    if(data.curr_sale>=data.last_sale){
                        sale_type = true
                        if(data.target_sale > 0){
                            sale_size = data.curr_sale/data.target_sale * 100 + "%"
                            sale_size2 = (100 - (data.curr_sale/data.target_sale * 100)) + "%"
                            if(data.target_sale >= data.curr_sale){
                                sale_difference = data.target_sale - data.curr_sale
                            } else {
                                sale_difference = 0
                            }
                            
                        } else {
                            sale_size = "100%"
                            sale_size2 = "0%"
                            sale_difference = 0
                        }
                        
                    } else {
                        sale_type = false
                        if(data.target_sale > 0){
                            sale_size = data.curr_sale/data.target_sale * 100 + "%"
                            sale_size2 = (100 - (data.curr_sale/data.target_sale * 100) - data.last_sale/data.target_sale * 100) + "%"
                            if(data.target_sale >= data.curr_sale){
                                sale_difference = data.target_sale - data.curr_sale
                            } else {
                                sale_difference = 0
                            }
                            
                        } else {
                            sale_size = "100%"
                            sale_size2 = "0%"
                            sale_difference = 0
                        }
                    }

                    

                    
                    
                    let oModel = {
                        "org_name" : data.org_name,
                        "curr_sale" : this.onFormatPerformance(data.curr_sale, 'billion'),
                        // "margin_rate" : data.margin_rate,
                        // "target" : data.target,
                        "sale_contrast" : data.yoy_sale_rate,
                        // "margin_contrast" : data.yoy_margin_rate,
                        "sale_type" : sale_type,
                        // "margin_type" : margin_type,
                        "yoy_sale_rate":  this.onFormatPerformance(data.yoy_sale_rate,'percent'),
                        "yoy_sale_type": data.yoy_sale_rate >= 0 ? true : false,
                        "sale_size" : sale_size,
                        "sale_size2" : sale_size2,
                        // "margin_size" : margin_size,
                        // "margin_size2" : margin_size2,
                        "sale_target": this.onFormatPerformance(data.target_sale, 'billion'),
                        "sale_difference" : this.onFormatPerformance(sale_difference, 'billion'),
                        "margin_difference" : this.onFormatPerformance(margin_difference, 'billion'),
                        "planRatio" : this.onFormatPerformance(data.plan_ratio, 'percent2')
                    }

                    aTransData.push(oModel)
                }.bind(this)
            )

            console.log(aTransData)
            return aTransData
            
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