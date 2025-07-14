sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "sap/ui/model/json/JSONModel",
    "sap/ui/vbm/AnalyticMap",
    "sap/m/MessageToast",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/model/odata/v4/ODataModel",
    "bix/common/library/control/Modules",

], function (Controller, EventBus, JSONModel, AnalyticMap, MessageToast, NumberFormat, ODataModel, Modules) {
    "use strict";

    AnalyticMap.GeoJSONURL = "https://sapui5.hana.ondemand.com/sdk/test-resources/sap/ui/vbm/demokit/media/analyticmap/L0.json";

    return Controller.extend("bix.card.actualSaleMarginChart.card", {
        _oEventBus: EventBus.getInstance(),
        _oDetailDialog: undefined,

        onInit: function () {
            
            this._dataRequest(); // 데이터 셋팅
            this._setSelect(); // selet 셋팅

            
            // EventBus 수신
            // this._oEventBus.subscribe("pl", "search", this._updateChart, this);

        },

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
            // this.byId("vbm").setHeight(iBoxHeight*0.9+"vh")
                    
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
       

            let sTypePath = `/get_actual_sale_account_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',display_type='chart')`           
            let sOrgPath =  `/get_actual_sale_chart_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`           
            // let sMapPath = `/get_actual_sale_sub_company_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            let aData = [];

            await Promise.all([
                oModel.bindContext(sTypePath).requestObject(),
                oModel.bindContext(sOrgPath).requestObject(),
                // oModel.bindContext(sMapPath).requestObject()
            ]).then(function(aResults){

                //열 정리
                aResults[0].value = aResults[0].value.sort((a, b) => a.display_order - b.display_order); // display_order 로 정렬
                
                this._chartSetting_account(aResults[0].value)
                this._chartSetting_type(aResults[1].value)
                // this._regionSetting(aResults[2].value)
            }.bind(this))
            .catch((oErr) => {
                Modules.displayStatus(this.getOwnerComponent().oCard,oErr.error.code, this.byId("flexBox"));
            });

            this.byId("flexBox").setBusy(false)
        },

        _chartSetting_type: function (aData){
            let aModelData = [];
            aData.forEach(
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
                        "marginRate_target" : this.onFormatPerformance(data.target_sale===0? 0 : (data.target_margin / data.target_sale * 100), 'percent2'),
                        "marginRate" : this.onFormatPerformance(data.curr_sale === 0 ? 0 : (data.curr_margin / data.curr_sale * 100), 'percent2'),
                        "marginRate_type" : (data.curr_margin / data.curr_sale) >=0 ? true : false,
                        "circleRate" : this.onFormatPerformance(circleRate, 'percent2'),
                        "talkingRate" : this.onFormatPerformance(circleRate-8.2, 'percent2'),
                    }

                    aModelData.push(oModel)
                }.bind(this)
            )

            this.getView().setModel(new JSONModel(aModelData), "orgModel")
        },

        _chartSetting_account: function (aData){
            let aModelData = [];


            for(let i = 0; i < aData.length; i += 3){
                let oModel = {
                    "org_name" : aData[i].account_nm,
                    "target_margin" : aData[i+1].target_curr_y_value * 100000000,
                    "target_margin_rate" : aData[i+2].target_curr_y_value * 100,
                    "target_sale" : aData[i].target_curr_y_value * 100000000,
                    "curr_margin" : aData[i+1].actual_curr_ym_value,
                    "curr_sale" : aData[i].actual_curr_ym_value,
                    "yoy_margin_rate" : aData[i+1].actual_last_ym_value === 0 ? 0 : aData[i+1].actual_curr_ym_value_gap/ aData[i+1].actual_last_ym_value * 100,
                    "yoy_sale_rate" : aData[i].actual_last_ym_value === 0 ? 0 : aData[i].actual_curr_ym_value_gap / aData[i].actual_last_ym_value * 100,
                    "last_sale" : aData[i].actual_last_ym_value,
                    "last_margin" : aData[i+1].actual_last_ym_value,
                }
                aModelData.push(oModel)
            }

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
                        "marginRate_target" : this.onFormatPerformance(data.target_sale === 0 ? 0 : data.target_margin / data.target_sale * 100, 'percent2'),
                        "marginRate" : this.onFormatPerformance(data.curr_sale === 0 ? 0 : data.curr_margin / data.curr_sale * 100, 'percent2'),
                        "marginRate_type" : (data.curr_margin / data.curr_sale) >=0 ? true : false,
                        "circleRate" : this.onFormatPerformance(circleRate, 'percent2'),
                        "talkingRate" : this.onFormatPerformance(circleRate-8.2, 'percent2'),
                    }

                    aTransData.push(oModel)
                }.bind(this)
            )

            this.getView().setModel(new JSONModel(aTransData), "accountModel")
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
            } else if(sType==="map"){
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 1
                });
                return "매출 : " + oNumberFormat.format(iValue/100000000) + "억원";
            } else if(sType==="map2"){
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 1
                });
                return "마진 : " + oNumberFormat.format(iValue/100000000) + "억원";
            };
        },

        _regionSetting: function (aResults){
            let aData = [
                {
                    name: "미국법인",
                    code: "US",
                    sale: aResults[3].actual_curr_ym_value,
                    margin: aResults[4].actual_curr_ym_value,
                    position: "-110;50;0",
                    color: "#9e86ff"
                },
                {
                    name: "유럽법인",
                    code: "FR",
                    sale: aResults[6].actual_curr_ym_value,
                    margin: aResults[7].actual_curr_ym_value,
                    position: "15;25;0",
                    color: "#60F1C8"
                },
                {
                    name: "중국법인",
                    code: "CN",
                    sale: aResults[9].actual_curr_ym_value,
                    margin: aResults[10].actual_curr_ym_value,
                    position: "105;20;0",
                    color: "#ff8f6d"
                },
                {
                    name: "일본법인",
                    code: "JP",
                    sale: aResults[12].actual_curr_ym_value,
                    margin: aResults[13].actual_curr_ym_value,
                    position: "170;40;0",
                    color: "#83cfff"
                },
            ]
            this.getView().setModel(new JSONModel(aData), "regionModel");
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

        
        

        /**
         * 영역 클릭 시
         * @param {sap.ui.base.Event} oEvent 
         */
        onRegionClick: async function (oEvent) {
            let sCode = oEvent.getParameters()["code"];
            // MessageToast.show("국가 코드: " + sCode)

            if (!this._oDetailDialog) {
                let sComponentName = this.getOwnerComponent().getMetadata().getComponentName();

                await this.loadFragment({
                    id: "detailDialog",
                    name: `${sComponentName}.fragment.Detail`,
                    controller: this,
                }).then(function (oDialog) {
                    this._oDetailDialog = oDialog;

                    // Dialog Open 전 실행
                    oDialog.attachBeforeOpen(function (oEvent) {
                        // 더미 데이터 설정
                        let oDummy = [
                            { type: "수주", month: "500", year: "5500" },
                            { type: "매출", month: "1500", year: "16000" },
                            { type: "마진", month: "300", year: "3200" },
                            { type: "SG&A", month: "200", year: "2100" },
                            { type: "공헌이익", month: "100", year: "10500" },
                        ]
                        oDialog.setModel(new JSONModel(oDummy), "tableModel");

                        // uiModel 설정
                        let oRegionData = this.getView().getModel("regionModel").getData();
                        let oSelectedRegion = oRegionData.find(oData => oData.code === oDialog._code);
                        // 지정된 법인 이외의 지역 클릭 시 Dialog 열지 않기
                        if (!oSelectedRegion) {
                            oEvent.preventDefault();
                        } else {
                            oDialog.setModel(new JSONModel({ title: oSelectedRegion.name }), "uiModel");
                        }
                    }.bind(this));
                }.bind(this));
            };

            // Dialog Open
            this._oDetailDialog._code = sCode;
            this._oDetailDialog.open();
        },

        onCloseDetailDialog: function () {
            if (this._oDetailDialog) {
                this._oDetailDialog.close();
            }
        },
    });
});           