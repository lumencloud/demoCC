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

    return Controller.extend("bix.card.actualCompanyChart.card", {
        _oEventBus: EventBus.getInstance(),
        _oDetailDialog: undefined,

        onInit: function () {
            
            this._dataRequest(); // 데이터 셋팅
            this._setSelect(); // selet 셋팅

            
            // EventBus 수신
            this._oEventBus.subscribe("pl", "search", this._dataRequest, this);

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

        _dataRequest: async function(){
            
            this.byId("flexBox").setBusy(true)    
            // 카드
            const oCard = this.getOwnerComponent().oCard;

            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oParentElement = document.getElementById(sCardId).parentElement;            
            let iBoxHeight = Math.floor(oParentElement.clientHeight / window.innerHeight * 90);

            // 각 카드 크기 지정
            // this.byId("vBox").setHeight(iBoxHeight*0.8+"vh")
            // this.byId("vBox2").setHeight(iBoxHeight*0.8+"vh")
            this.byId("vbm").setHeight(iBoxHeight*0.9+"vh")
                    
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
                
            let sMapPath = `/get_actual_sale_sub_company_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`

            await Promise.all([
                oModel.bindContext(sMapPath).requestObject()
            ]).then(function(aResults){
                this.getView().setModel(new JSONModel(aResults[0].value), "totalData")
                this._regionSetting(aResults[0].value)
            
            }.bind(this))
            .catch((oErr) => {
                Modules.displayStatus(this.getOwnerComponent().oCard,oErr.error.code, this.byId("flexBox"));
            });

            this.byId("flexBox").setBusy(false)
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
            //console.log(aResults)
            let aData = [
                {
                    name: aResults[3].org_name,
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
                        // 데이터 가져오기
                        let aData = this.getView().getModel("totalData").getData()

                        // uiModel 설정
                        let oRegionData = this.getView().getModel("regionModel").getData();
                        let oSelectedRegion = oRegionData.find(oData => oData.code === oDialog._code);
                        // 지정된 법인 이외의 지역 클릭 시 Dialog 열지 않기
                        if (!oSelectedRegion) {
                            oEvent.preventDefault();
                        } else {
                            oDialog.setModel(new JSONModel({ title: oSelectedRegion.name }), "uiModel");
                            let aResult = aData.filter(oData => oData.org_name === oSelectedRegion.name);                            
                            
                            let bindData = [];
                            
                            aResult.forEach(
                                function(result){
                                    let oData = {
                                        type : result.type,
                                        value : this.onFormatRegion(result.actual_curr_ym_value, result.type, "value"),
                                        purpose : this.onFormatRegion(result.target_curr_y_value, result.type, "purpose"),
                                    }
                                    bindData.push(oData)
                                }.bind(this)                                
                            )

                            oDialog.setModel(new JSONModel(bindData), "tableModel");
                        }
                    }.bind(this));
                }.bind(this));
            };

            // Dialog Open
            this._oDetailDialog._code = sCode;
            this._oDetailDialog.open();
        },

        onFormatRegion: function (iValue, sType, sType2) {
            if(sType==="매출" || sType==="마진"){
                if(sType2 === "purpose"){iValue = iValue*100000000}
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 1
                });
                return oNumberFormat.format(iValue/100000000) + "억";
            } else if(sType === "마진율"){
                if(sType2 === "value"){iValue = iValue*100}
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2
                });
                return oNumberFormat.format(iValue)+ "%";

            };
        },

        onCloseDetailDialog: function () {
            if (this._oDetailDialog) {
                this._oDetailDialog.close();
            }
        },
    });
});           