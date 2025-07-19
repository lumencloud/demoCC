
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
    "sap/ui/integration/widgets/Card",
    'sap/m/Panel',
    "../../main/util/Module",
], function (Controller, JSONModel, ODataModel, NumberFormat, EventBus, Card, Panel, Module) {
    "use strict";

    /**
     * @typedef {sap.m.Select} Select
     */
    return Controller.extend("bix.card.planSMTypeChartContainer.card", {
        _oEventBus: EventBus.getInstance(),
        _oSearchData:{},
        onInit: function () {
            this.getView().setModel(new JSONModel({}), "uiModel");
            this._asyncInit();

            // EventBus 수신
            this._oEventBus.subscribe("pl", "search", this._dataRequest, this);
            this._oEventBus.subscribe("pl", "search", this._setSelect, this);
            this._oEventBus.subscribe("pl", "detailSelect", this._changeDetailSelect, this);
        },

        _asyncInit: async function (){
            await this._setSelect(); // selet 셋팅

            this._dataRequest();
        },

        _setSelect: async function () {
            // 검색 조건
            let oSearchData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            
            // 현재 해시를 기준으로 DB에서 Select에 들어갈 카드 정보를 불러옴
            let oHashData = this.getOwnerComponent().oCard.getModel("hashModel").getData();

            let sSelectPath = `/pl_content_view(page_path='${oHashData.page}',position='detail',grid_layout_info=null,detail_path='${oHashData.detail}',detail_info='${oHashData.detailType}')/Set`;

            // 로직에 따라서 조직 필터링
            let aOrgFilter = [`(length(sub_key) gt 0 and sub_key ne 'org_delivery' and sub_key ne 'org_account' and sub_key ne 'org')`];
            if (oSearchData.org_level === "lv1" || oSearchData.org_level === "lv2") {   // lv1 또는 lv2
                aOrgFilter.push(`(sub_key eq 'org_delivery' or sub_key eq 'org_account')`);
            } else if ((oSearchData.org_level === "lv3" && oSearchData.org_tp === "hybrid") || oSearchData.org_tp === "account") {  // CCO 및 account조직
                aOrgFilter.push(`(sub_key eq 'org_account')`);
            } else {    // 그 외
                aOrgFilter.push(`(sub_key eq 'org')`);
            };

            // 조직 필터링 배열을 문자열로 변경
            let sOrgFilter = aOrgFilter.join(" or ");

            // 데이터 호출
            const oListBinding = this.getOwnerComponent().getModel("cm").bindList(sSelectPath, null, null, null, {
                $filter: sOrgFilter
            });
            let aSelectContexts = await oListBinding.requestContexts();
            let aSelectData = aSelectContexts.map(oContext => oContext.getObject());

            // 카드 정보를 selectModel로 설정 (sub_key, sub_text)
            if(oSearchData.org_level !== "lv1" && oSearchData.org_level !== "lv2"){
                let aOrgData = aSelectData.find(data => data.sub_key === 'org_delivery' || data.sub_key === 'org_account')
                if(!!aOrgData){
                    let aOrgSubText = aOrgData.sub_text.split(' ')
                    aOrgData.sub_text = aOrgSubText[aOrgSubText.length-1]
                }
            }
            this.getView().setModel(new JSONModel(aSelectData), "selectModel");
            
            // // Select
            // this.getView().setModel(new JSONModel([
            //     { key: "org", name: "조직별" },
            //     { key: "Account", name: "Account별" },
            // ]), "selectModel");

            //uiChange

            this.getView().setModel(new JSONModel({ key: "org" }), "uiModel")
        },

        /**
         * 뒤로가기, 앞으로가기에 의해 변경된 URL에 따라 detailSelect 다시 설정
         * @param {String} sChannelId 
         * @param {String} sEventId 
         * @param {Object} oEventData 
         */
        _changeDetailSelect: function (sChannelId, sEventId, oEventData) {
            // DOM이 있을 때만 detailSelect를 변경
            let oDom = this.getView().getDomRef();
            if (oDom) {
                let sKey = oEventData["detailSelect"];
                this.byId("detailSelect").setSelectedKey(sKey);
            }
        },

        onUiChange: function (oEvent) {
            // 선택한 key로 화면에 보여줄 테이블을 결정
            let oSelect = /** @type {Select} */ (oEvent.getSource());
            let sKey = (oSelect).getSelectedKey();
            let oUiModel = this.getView().getModel("uiModel");
            oUiModel.setProperty("/tableKind", sKey);

            // detailCard Component 반환
            let oCard = this.getOwnerComponent().oCard;
            let oCardComponent = oCard._oComponent;

            // PL 실적 hashModel에 detailSelect 업데이트
            let oHashModel = oCardComponent.getModel("hashModel");
            oHashModel.setProperty("/detailSelect", sKey);

            // PL 실적 Manifest Routing
            let oHashData = oHashModel.getData();
            let sRoute = (oHashData["page"] === "actual" ? "RouteActual" : "RoutePlan");
            oCardComponent.getRouter().navTo(sRoute, {
                pageView: oHashData["pageView"],
                detail: oHashData["detail"],
                detailType: oHashData["detailType"],
                orgId: oHashData["orgId"],
                detailSelect: oHashData["detailSelect"],
            });
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

        _dataRequest: async function (sChannelId, sEventId, oData) {
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 90);

            // 각 카드 크기 지정
            this.byId("vBox").setHeight(iBoxHeight * 0.8 + "vh")
            this.byId("vBox2").setHeight(iBoxHeight * 0.8 + "vh")
            this.byId("vBox3").setHeight(iBoxHeight * 0.8 + "vh")
            this.byId("vBox4").setHeight(iBoxHeight * 0.8 + "vh")

            // 새로운 검색 조건이 같은 경우 return
            oData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            let aKeys = Object.keys(oData);
            let isDiff = aKeys.find(sKey => oData[sKey] !== this._oSearchData[sKey]);
            if (!isDiff) return;

            // detailSelect 해시에 따른 Select 선택
            let oSelect = this.byId("detailSelect");
            let oHashData = this.getOwnerComponent().oCard.getModel("hashModel").getData();
            let sDetailKey = oHashData["detailSelect"];
            let oSelectData = this.getView().getModel("selectModel").getData();
            let bCheck = oSelectData.find(data => data.sub_key === sDetailKey)
            if (bCheck) {   // 해시가 있는 경우 Select 설정
                oSelect.setSelectedKey(sDetailKey);
            } else {    // 없는 경우 첫 번째 Select 항목 선택
                let oFirstDetailKey = this.getView().getModel("selectModel").getProperty("/0/sub_key");
                oSelect.setSelectedKey(oFirstDetailKey);
            }

            // 새로운 검색 조건 저장
            this._oSearchData = oData;

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");

            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            })


            let aBindingPath = {};

            if (oSelectData.find(oData => oData.sub_key === "org")) {   // 조직
                aBindingPath["org"]=(`/get_forecast_pl_sale_margin_org_detail(year='${iYear}',month='${sMonth}',org_id='${oData.orgId}')`);
            }

            if (oSelectData.find(oData => oData.sub_key === "org_delivery")) {  // Delivery 조직
                aBindingPath["org_delivery"]=(`/get_forecast_pl_sale_margin_org_detail(year='${iYear}',month='${sMonth}',org_id='${oData.orgId}',org_tp='delivery')`);
            }
            if (oSelectData.find(oData => oData.sub_key === "org_account")) {   // Account 조직
                aBindingPath["org_account"] = (`/get_forecast_pl_sale_margin_org_detail(year='${iYear}',month='${sMonth}',org_id='${oData.orgId}',org_tp='account')`);
            }

            aBindingPath["account"] = `/get_forecast_pl_sale_margin_account_detail(year='${iYear}',month='${sMonth}',org_id='${oData.orgId}')`


            let aData = []; 

            let aList = Object.keys(aBindingPath)
            let aPath = [];

            aList.forEach((sName)=>{
                aPath.push(aBindingPath[sName])
            })

            await Promise.all(
                aPath.map(sPath => oModel.bindContext(sPath).requestObject()))
            .then(function (aResults) {
                let i = 0;
                aList.forEach(
                    (sName)=>{
                    if(sName === "org"){
                        let oModel = this._chartSetting(aResults[i].value)
                        this.getView().setModel(new JSONModel(oModel), "model")
                        i++
                    } else if(sName === "org_delivery"){
                        let oModel = this._chartSetting(aResults[i].value)
                        this.getView().setModel(new JSONModel(oModel), "model3")
                        i++
                    } else if(sName === "org_account"){
                        let oModel = this._chartSetting(aResults[i].value)
                        this.getView().setModel(new JSONModel(oModel), "model4")
                        i++
                    } else if(sName === "account"){
                        let oModel = this._chartSetting2(aResults[i].value)
                        this.getView().setModel(new JSONModel(oModel), "model2")
                        i++
                    }
                })
                
            }.bind(this))
            // .catch((oErr) => {
            //     Module.displayStatus(this.getOwnerComponent().oCard,oErr.error.code, this.byId("flexBox"));
            // });

        },

        _chartSetting: function (aData) {
            let aModelData = [];
            let aSale = aData.filter(data => data.type === '매출')
            let aMargin = aData.filter(data => data.type === '마진')

            for (let i = 0; i < aSale.length; i++) {
                let oMargin = aMargin.find(margin => margin.org_id === aSale[i].org_id)
                let oModel = {
                    "org_name": aSale[i].org_name ? aSale[i].org_name : aSale[i].account_nm,
                    "target_margin": oMargin.forecast_value - oMargin.plan_ratio,
                    "target_sale": aSale[i].forecast_value - aSale[i].plan_ratio,
                    "curr_margin": oMargin.forecast_value,
                    "curr_sale": aSale[i].forecast_value,
                    "yoy_margin_rate": (oMargin.forecast_value - oMargin.yoy) === 0 ? 0 : oMargin.forecast_value / (oMargin.forecast_value - oMargin.yoy),
                    "yoy_sale_rate": (aSale[i].forecast_value - aSale[i].yoy) === 0 ? 0 : aSale[i].forecast_value / (aSale[i].forecast_value - aSale[i].yoy),
                    "last_sale": aSale[i].forecast_value - aSale[i].yoy,
                    "last_margin": oMargin.forecast_value - oMargin.yoy,
                    "target_margin_rate": (oMargin.forecast_value - aSale[i].plan_ratio) === 0 ? 0 : (oMargin.forecast_value - aSale[i].plan_ratio) / (oMargin.forecast_value - aSale[i].plan_ratio),
                    "plan_ratio": (aSale[i].forecast_value - aSale[i].plan_ratio) === 0 ? 0 : aSale[i].forecast_value / (aSale[i].forecast_value - aSale[i].plan_ratio),
                }
                aModelData.push(oModel)

            }

            //console.log(aModelData)

            let aTransData = [];
            aModelData.forEach(
                function (data) {
                    let sale_type, margin_type, marginrate_type, sale_size, sale_size2, sale_difference, margin_size, margin_size2, margin_difference, yoy_type;
                    if (data.curr_sale >= data.last_sale) {
                        sale_type = true
                        if (data.target_sale !== 0) {
                            sale_size = data.curr_sale / data.target_sale * 100 + "%"
                            sale_size2 = (100 - (data.curr_sale / data.target_sale * 100)) + "%"
                            if (data.target_sale >= data.curr_sale) {
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
                        if (data.target_sale !== 0) {
                            sale_size = data.curr_sale / data.target_sale * 100 + "%"
                            sale_size2 = (100 - (data.curr_sale / data.target_sale * 100) - data.last_sale / data.target_sale * 100) + "%"
                            if (data.target_sale >= data.curr_sale) {
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

                    if (data.curr_margin >= data.last_margin) {
                        margin_type = true
                        if (data.target_margin !== 0) {
                            margin_size = data.curr_margin / data.target_margin * 100 + "%"
                            margin_size2 = (100 - (data.curr_margin / data.target_margin * 100)) + "%"

                            if (data.target_margin >= data.curr_margin) {
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
                        if (data.target_margin !== 0) {
                            margin_size = data.curr_margin / data.target_margin * 100 + "%"
                            margin_size2 = (100 - (data.curr_margin / data.target_margin * 100) - data.last_margin / data.target_margin * 100) + "%"

                            if (data.target_margin >= data.curr_margin) {
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
                    if (data.curr_sale === 0) {
                        circleRate = 50 + 5
                    } else {
                        circleRate = (data.curr_margin / data.curr_sale * 100 / 2) + 50 + 5
                    }

                    let oModel = {
                        "org_name": data.org_name,
                        "curr_sale": this.onFormatPerformance(data.curr_sale, 'billion'),
                        "curr_margin": this.onFormatPerformance(data.curr_margin, 'billion'),
                        "margin_rate": data.margin_rate,
                        "sale_contrast": data.yoy_sale_rate,
                        "margin_contrast": data.yoy_margin_rate,
                        "sale_type": sale_type,
                        "margin_type": margin_type,
                        "yoy_margin_rate": this.onFormatPerformance(data.yoy_margin_rate, 'percent'),
                        "yoy_margin_type": data.yoy_margin_rate >= 0 ? true : false,
                        "yoy_sale_rate": this.onFormatPerformance(data.yoy_sale_rate, 'percent'),
                        "yoy_sale_type": data.yoy_sale_rate >= 0 ? true : false,
                        "sale_size": sale_size,
                        "sale_size2": sale_size2,
                        "margin_size": margin_size,
                        "margin_size2": margin_size2,
                        "sale_target": this.onFormatPerformance(data.target_sale, 'billion'),
                        "sale_difference": this.onFormatPerformance(sale_difference, 'billion'),
                        "margin_target": this.onFormatPerformance(data.target_margin, 'billion'),
                        "margin_difference": this.onFormatPerformance(margin_difference, 'billion'),
                        "marginRate_target": this.onFormatPerformance(data.target_sale === 0 ? 0 : data.target_margin / data.target_sale * 100, 'percent2'),
                        "marginRate": this.onFormatPerformance(data.curr_sale === 0 ? 0 : data.curr_margin / data.curr_sale * 100, 'percent2'),
                        "marginRate_type": (data.curr_margin / data.curr_sale) >= 0 ? true : false,
                        "circleRate": this.onFormatPerformance(circleRate, 'percent2'),
                        "talkingRate": this.onFormatPerformance(circleRate - 8.2, 'percent2'),
                        "planRatio": this.onFormatPerformance(data.plan_ratio, 'percent2')
                    }

                    aTransData.push(oModel)
                }.bind(this)
            )

            //console.log(aTransData)
            return aTransData

        },

        _chartSetting2: function (aData) {
            let aModelData = [];

            for (let i = 0; i < aData.length; i++) {
                let oModel = {
                    "org_name": aData[i].org_name ? aData[i].org_name : aData[i].account_nm,
                    "target_sale": aData[i].forecast_value - aData[i].plan_ratio,
                    "curr_sale": aData[i].forecast_value,
                    "yoy_sale_rate": (aData[i].forecast_value - aData[i].yoy) === 0 ? 0 : aData[i].forecast_value / (aData[i].forecast_value - aData[i].yoy),
                    "last_sale": aData[i].forecast_value - aData[i].yoy,
                    "plan_ratio": (aData[i].forecast_value - aData[i].plan_ratio) === 0 ? 0 : aData[i].forecast_value / (aData[i].forecast_value - aData[i].plan_ratio),
                }
                aModelData.push(oModel)

            }

            //console.log(aModelData)

            let aTransData = [];
            aModelData.forEach(
                function (data) {
                    let sale_type, margin_type, marginrate_type, sale_size, sale_size2, sale_difference, margin_size, margin_size2, margin_difference, yoy_type;
                    if (data.curr_sale >= data.last_sale) {
                        sale_type = true
                        if (data.target_sale > 0) {
                            sale_size = data.curr_sale / data.target_sale * 100 + "%"
                            sale_size2 = (100 - (data.curr_sale / data.target_sale * 100)) + "%"
                            if (data.target_sale >= data.curr_sale) {
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
                        if (data.target_sale > 0) {
                            sale_size = data.curr_sale / data.target_sale * 100 + "%"
                            sale_size2 = (100 - (data.curr_sale / data.target_sale * 100) - data.last_sale / data.target_sale * 100) + "%"
                            if (data.target_sale >= data.curr_sale) {
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
                        "org_name": data.org_name,
                        "curr_sale": this.onFormatPerformance(data.curr_sale, 'billion'),
                        "sale_contrast": data.yoy_sale_rate,
                        "sale_type": sale_type,
                        "yoy_sale_rate": this.onFormatPerformance(data.yoy_sale_rate, 'percent'),
                        "yoy_sale_type": data.yoy_sale_rate >= 0 ? true : false,
                        "sale_size": sale_size,
                        "sale_size2": sale_size2,
                        "sale_target": this.onFormatPerformance(data.target_sale, 'billion'),
                        "sale_difference": this.onFormatPerformance(sale_difference, 'billion'),
                        "margin_difference": this.onFormatPerformance(margin_difference, 'billion'),
                        "planRatio": this.onFormatPerformance(data.plan_ratio, 'percent2')
                    }

                    aTransData.push(oModel)
                }.bind(this)
            )

            //console.log(aTransData)
            return aTransData

        },


        onFormatPerformance: function (iValue, sType) {
            if (!iValue) { iValue = 0 }

            // 단위 조정
            if (sType === "percent") {
                if (iValue < 0) { iValue = -iValue };
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });
                return oNumberFormat.format(iValue) + "%";
            } else if (sType === "percent2") {
                if (iValue < 0) { iValue = -iValue };
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
            } else if (sType === "billion") {
                if (iValue >= 1000000000000) {
                    var oNumberFormat = NumberFormat.getFloatInstance({
                        groupingEnabled: true,
                        groupingSeparator: ',',
                        groupingSize: 3,
                        decimals: 1
                    });
                    return oNumberFormat.format(iValue / 1000000000000) + "조";

                } else if (iValue < 1000000000000 && iValue >= 100000000000) {
                    var oNumberFormat = NumberFormat.getFloatInstance({
                        groupingEnabled: true,
                        groupingSeparator: ',',
                        groupingSize: 3,
                        decimals: 1
                    });
                    return oNumberFormat.format(iValue / 100000000000) + "천억";
                } else if (iValue < 100000000000) {
                    var oNumberFormat = NumberFormat.getFloatInstance({
                        groupingEnabled: true,
                        groupingSeparator: ',',
                        groupingSize: 3,
                        decimals: 1
                    });
                    return oNumberFormat.format(iValue / 100000000) + "억";
                }
            };
        },







    });
});           