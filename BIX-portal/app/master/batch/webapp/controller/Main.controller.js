sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "bix/common/library/control/Modules",
    "sap/ui/core/Messaging",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/library",
    "sap/ui/core/format/DateFormat",
], (Controller, JSONModel, MessageToast, Module, Messaging, Filter, FilterOperator, coreLib, DateFormat) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.ui.table.Table} Table
     * @typedef {sap.m.Input} Input
     * @typedef {sap.ui.model.odata.v4.Context} v4Context
     * @typedef {sap.m.ColumnListItem} ColumnListItem
     * @typedef {sap.ui.model.CompositeBinding} CompositeBinding
     */
    return Controller.extend("bix.master.batch.controller.Main", {
        /**
         * 초기 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteMain");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);


        },

        /**
         * 배치 관리 페이지로 라우팅했을 때
         */
        onMyRoutePatternMatched: function () {
            // 초기 모델 설정
            this._setModel();
        },

        /**
         * 초기 모델 설정
         */
        _setModel: async function () {
            //처음 searchModel 설정
            this.getView().setModel(new JSONModel({ status: "all", category: "PL" }), "searchModel");
            const aFilters = [];
            const batchTable = this.byId("batchTable");
            aFilters.push(
                new Filter("ver", FilterOperator.NotContains, "TEST"),
            )
            // 테이블 바인딩
            batchTable.bindRows({
                path: "/interface_log_view",
                filters: aFilters,
                events: {
                    dataRequested: function () {
                        batchTable.setBusy(true);
                    }.bind(this),
                    dataReceived: function (oEvent) {
                        batchTable.setBusy(false);
                    }.bind(this),
                },
            });

            this.getView().setModel(new JSONModel([{ value: "all", name: "전체" }, { value: true , name: "성공" }, { value: false , name: "실패" }]), "codeModel");

        },


        /**
         * 검색, 초기화 버튼 클릭 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag search : 검색, refresh : 초기화
         */
        onVerSearch: function () {
            const oTable = this.byId("batchTable");
            const oBinding = oTable.getBinding("rows");
            let aFilters = [];
            const oSearchModel = this.getView().getModel("searchModel").getData();

            


            if(oSearchModel.ver){
                aFilters.push(new Filter("ver", FilterOperator.EQ, oSearchModel.ver));
            }else{
                aFilters.push(new Filter("ver", FilterOperator.NotContains, "TEST"));
            }

            //status 가 all이 아니면 필터 추가
            if (oSearchModel.success_yn !== "all") {
                aFilters.push(new Filter("success_yn", FilterOperator.EQ, oSearchModel.success_yn));
            }
            oBinding.filter(aFilters);
        },

        /**
         * 
         */
        onSelectionChange:function(oEvent){
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            this.getView().getModel("searchModel").setProperty("/success_yn",sSelectedKey);
            
            //
            this.onVerSearch();
        },



        //날짜 구간 선택 후 검색 시
        onDateChange: function () {

            const oSelect = this.byId("version");
            oSelect.unbindItems();

            const sCategory = this.getView().getModel("searchModel").getData().category;
            if (sCategory === "PL") {
                const oDateRangeYear = this.byId("datePickerYear").getDateValue().getFullYear();

                oSelect.bindItems({
                    path: '/Version',
                    filters: new Filter("year", FilterOperator.EQ, oDateRangeYear),
                    template: new sap.ui.core.Item({
                        key: "{ver}",
                        text: "{ver}"
                    }),
                    templateShareable: false
                })
            } else {
                const oDateRangeYear2 = this.byId("datePickerMonth").getDateValue().getFullYear();
                const oDateRangeMonth = this.byId("datePickerMonth").getDateValue().getMonth() + 1;
                const iMonth = oDateRangeMonth.toString().padStart(2,'0');
                oSelect.bindItems({
                    path: '/Version',
                    filters: new Filter({
                        filters: [
                            new Filter("year", FilterOperator.EQ, oDateRangeYear2),
                            new Filter("month", FilterOperator.EQ, iMonth)
                        ],
                        and: true
                    }),
                    template: new sap.ui.core.Item({
                        key: "{ver}",
                        text: "{ver}"
                    }),
                    templateShareable: false
                })


            }



        },

        //위의 카테고리 토글버튼에 따른 검색
        onTogglePress: function (oEvent) {
            const oPressButton = oEvent.getSource()
            const oToolbar = oPressButton.getParent();
            const sPressedKey = oPressButton.getText();
            
            const oSelect = this.byId("version");
            oSelect.unbindItems();

            //선택된버튼을 제외하고는 pressed false로 변경
            oToolbar.getContent().forEach(function (oControl) {
                if (oControl instanceof sap.m.ToggleButton) {
                    const sKey = oControl.getText();
                    oControl.setPressed(sKey === sPressedKey)
                }
            })

            const oDatePickerYear = this.byId("datePickerYear");
            const oDatePickerMonth = this.byId("datePickerMonth");

            const isDealStage = sPressedKey === "DealStage";
            oDatePickerMonth.setVisible(isDealStage)
            oDatePickerYear.setVisible(!isDealStage)


            this.getView().getModel("searchModel").setProperty("/category", sPressedKey);



        },

        /**
         * 배치 그룹 테이블 상세 버튼 클릭 이벤트
         * @param {Event} oEvent 
         */
        onDetail: async function (oEvent) {
            let oContext = oEvent.getParameter("rowContext");

            if(oContext){
                this.getOwnerComponent().getRouter().navTo("RouteDetail", {
                    ver: oContext.getObject("ver"),
                    if_step: oContext.getObject("if_step"),
                    table_name: oContext.getObject("table_name"),
                    procedure_name: oContext.getObject("procedure_name"),
                    success_yn: oContext.getObject("success_yn"),
                   });
   
            }
        },

    });
});