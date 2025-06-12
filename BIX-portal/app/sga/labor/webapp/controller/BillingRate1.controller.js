sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/library",
    "bix/common/library/customDialog/OrgSingleSelect",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/Fragment",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/FilterOperator",
    "../../../main/util/Module",
], (Controller, JSONModel, MessageBox, MessageToast, coreLib, OrgSingleSelect, NumberFormat, Fragment, oDataModel, FilterOperator, Module) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     */
    return Controller.extend("bix.sga.labor.controller.BillingRate1", {
        _oOrgSingleSelectDialog: undefined,

        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("BillingRate");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
           
        },

        
        _setUiModel:function(){
            this.getView().setModel(new JSONModel({
                
            }), "uIModel");
            this._setSelect();

        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: function () {
            // 검색창 초기화
            this.getView().getControlsByFieldGroupId("Search").forEach(function (object) {
                if (object.getFieldGroupIds().length > 0) {
                    object.setValue?.(null);
                    // object.removeAllTokens?.();
                }
            }.bind(this));

            // 초기 모델 설정
            let dNow = new Date();
            this.getView().setModel(new JSONModel({
                org_id: null,
                yearMonth: new Date(dNow.getFullYear() - 1, dNow.getMonth(), 1)
            }), "searchModel");

            // 목표액 추가 테이블 스크롤 초기 설정 (수직, 수평)
            let oTable = this.byId("table");
            let oVerticalScroll = oTable._getScrollExtension().getVerticalScrollbar();
            oVerticalScroll?.scrollTo(0, 0);

            let oHorizontalScroll = oTable._getScrollExtension().getHorizontalScrollbar();
            oHorizontalScroll?.scrollTo(0, 0);

            // 년월의 최소, 최댓값 설정
            this.byId("searchMonthYear").setMinDate(new Date(2024, 0, 1));
            this.byId("searchMonthYear").setMaxDate(new Date(dNow.getFullYear(), 11));

            // 바인딩 해제
            oTable.setNoData("검색 조건 입력 후 검색해주세요.");
        },

        /**
         * 검색 및 초기화 버튼 클릭 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag 
         */
        onSearch: async function (oEvent, sFlag) {
            if (sFlag === "Search") {
                // 유효성 검사
                let isValid = this.getView().getControlsByFieldGroupId("Required").filter(
                    function (object) {
                        if (object.getFieldGroupIds().includes("Search")) {
                            if (!object.getDateValue?.() && !object.getValue?.().length) {
                                object.setValueState("Error");
                                return true;
                            } else {
                                object.setValueState("None");
                            }
                        }
                    }.bind(this));

                if (isValid.length > 0) {
                    this._messageBox('warning', '필수 필드값을 확인해주세요.');
                    return;
                };

                // 테이블 컬럼 설정
                // this._setTableColumn();

                // 검색 조건
                let oSearchData = this.getView().getModel("searchModel").getData();
                let iYear = oSearchData.yearMonth.getFullYear();
                let iMonth = String(oSearchData.yearMonth.getMonth() + 1).padStart(2, "0");

                let oModel = this.getOwnerComponent().getModel("pl")
                let sPath = `/get_forecast_br(org_id='${oSearchData.orgId}',year='${iYear}',month='${iMonth}')`

                await Promise.all([
                    oModel.bindContext(sPath).requestObject()
                ]).then(
                    function(aResults){
                        console.log(aResults[0])
                        this.getView().setModel(new JSONModel(aResults[0].value), "brTableModel")


                        let tableVisibleModel = {
                            hdqt:true,
                            div:true,
                            team:true,
                        }        

                        if(aResults[0].value[1]){
                            if(oSearchData.orgId===aResults[0].value[1].team_id){
                                tableVisibleModel.div=false
                                tableVisibleModel.hdqt=false
                                tableVisibleModel.team=true
                            } else if(oSearchData.orgId===aResults[0].value[1].hdqt_id){
                                tableVisibleModel.div=false
                                tableVisibleModel.hdqt=true
                                tableVisibleModel.team=true
                            } else if(oSearchData.orgId===aResults[0].value[1].div_id){
                                tableVisibleModel.div=true
                                tableVisibleModel.hdqt=true
                                tableVisibleModel.team=true
                            } 
                        } else if(aResults[0].value[0]){
                            if(oSearchData.orgId===aResults[0].value[0].team_id){
                                tableVisibleModel.div=false
                                tableVisibleModel.hdqt=false
                                tableVisibleModel.team=true
                            } else if(oSearchData.orgId===aResults[0].value[0].hdqt_id){
                                tableVisibleModel.div=false
                                tableVisibleModel.hdqt=true
                                tableVisibleModel.team=true
                            } else if(oSearchData.orgId===aResults[0].value[0].div_id){
                                tableVisibleModel.div=true
                                tableVisibleModel.hdqt=true
                                tableVisibleModel.team=true
                            } 
                        }
                        
                        this.getView().setModel(new JSONModel(
                            tableVisibleModel
                        ), "tableVisibleModel")

                        let oTable =  this.byId("table")
                        Module.setTableMerge(oTable, "brTableModel", 3);

                    }.bind(this)
                )

                // oTable.setNoData("데이터가 없습니다.");
                MessageToast.show("테이블을 \n검색하였습니다.");
            } else if (sFlag === "Refresh") {
                MessageToast.show("테이블 검색 조건을 \n초기화 하였습니다.");

                this.getView().getControlsByFieldGroupId("Search").forEach(function (object) {
                    if (object.getFieldGroupIds().length > 0) {
                        object.setDateValue?.(null);
                        object.setValue?.(null);
                        object.setTokens?.([]);
                    };
                }.bind(this));
            };
        },


        // /**
        //  * 테이블 열의 경로 설정
        //  */
        // _setTableColumn: function () {
        //     let oTable = this.byId("table");

        //     let oSearchDate = this.getView().getModel("searchModel").getProperty("/yearMonth");
        //     let iSelectedMonth = oSearchDate.getMonth() + 1;

        //     // 열 경로 설정
        //     oTable.getControlsByFieldGroupId("Amount").forEach(function (object) {
        //         if (object.getFieldGroupIds().length > 0) {
        //             object.bindProperty("text", {
        //                 parts: [
        //                     { path: `sga>bill_m${iSelectedMonth}_amt`, targetType: 'any' },
        //                     { path: `sga>opp_m${iSelectedMonth}_amt`, targetType: 'any' },
        //                     { path: `sga>total_m${iSelectedMonth}_amt`, targetType: 'any' }
        //                 ],
        //                 formatter: function (iBill, iOpp, iTotal) {
        //                     try {
        //                         if (object.getFieldGroupIds().includes("Total")) {  // 전체BR
        //                             var iResult = (iBill + iOpp) / iTotal;
        //                         } else if (object.getFieldGroupIds().includes("Bill")) {    // 확보 추정
        //                             var iResult = iBill / iTotal;
        //                         } else if (object.getFieldGroupIds().includes("Opp")) { // 미확보 추정
        //                             var iResult = iOpp / iTotal;
        //                         }

        //                         var oPercentInstance = NumberFormat.getPercentInstance({
        //                             groupingEnabled: true,
        //                             groupingSeparator: ',',
        //                             groupingSize: 3,
        //                             decimals: 2,
        //                         });

        //                         return (iResult) ? oPercentInstance.format(iResult) : null;
        //                     } catch {
        //                         return null;
        //                     }
        //                 }
        //             })
        //         }
        //     }.bind(this));
        // },

        /**
         * 매출조직명 Dialog Open
         * @param {Event} oEvent 
         * @param {String} sFlag Department(일반), AddTarget(목표액 추가) 
         */
        onOrgSingleSelectDialogOpen: async function (oEvent, sFlag) {
            let oSource = oEvent.getSource();

            this._oOrgSingleSelectDialog = new OrgSingleSelect({
                fragmentController: this,
                bindingSource: oSource,
            });

            this._oOrgSingleSelectDialog.open();
        },

        /**
         * 검색 조건 변경 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag 
         */
        onChangeSearch: function (oEvent, sFlag) {
            let oSource = oEvent.getSource();

            if (sFlag === "month") {
                let isValidValue1 = oSource.isValidValue();
                let isValidValue2 = oSource.getDateValue();
                if (!isValidValue1 || !isValidValue2) {
                    oEvent.getSource().setValueState("Error");
                    return;
                } else {
                    oEvent.getSource().setValueState("None");
                };
            }
        },

        // /**
        //  * 
        //  * @param {Event} oEvent 
        //  */
        // onBillingRateDetailDialogOpen: async function (oEvent) {
        //     let oSource = /** @type {sap.m.ObjectNumber} */ (oEvent.getSource());
        //     let oBindingContext = oSource.getBindingContext("sga");
        //     let oBindingObject = oBindingContext.getObject();

        //     // this._oOrgSingleSelectDialog가 없을 때 호출
        //     if (!this._oBillingRateDetailDialog) {
        //         let sComponentName = this.getOwnerComponent().getMetadata().getComponentName();

        //         await this.loadFragment({
        //             id: "billingRateDetailDialog",
        //             name: `${sComponentName}.view.fragment.BillingRateDetail`,
        //             controller: this,
        //         }).then(function (oDialog) {
        //             this._oBillingRateDetailDialog = oDialog;

        //             // Title 설정
        //             oDialog.attachBeforeOpen(function () {
        //                 let oTitle = this.byId(Fragment.createId("billingRateDetailDialog", "title"));
        //                 oTitle.setText(oBindingObject.level3);
        //             }.bind(this));
        //         }.bind(this));
        //     };

        //     this._oBillingRateDetailDialog.setModel(new JSONModel([{
        //         test1: "SK온 차세대 ERP",
        //         test2: "SI-AD",
        //         test3: 120,
        //         test4: 60,
        //         test5: 20,
        //     }, {}, {}]), "detailModel");
        //     this._oBillingRateDetailDialog.open();
        // },

        /**
         * 
         * @param {Event} oEvent 
         * @param {String} sFlag 
         */
        onBillingRateDetailDialogButton: function (oEvent, sFlag) {
            if (sFlag === "Close") {
                this._oBillingRateDetailDialog.close();                
            }
        },

        /**
         * 메시지 박스 생성 함수
         * @param {String} status 
         * @param {String} message 
         * @param {String} title 
         */
        _messageBox: function (status, message, title) {
            MessageBox[status](message, {
                title: title,
            })
        },
    });
});