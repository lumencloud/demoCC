sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Sorter",
    "sap/ui/core/EventBus",
    "sap/ui/model/json/JSONModel",

], function (Controller, Sorter, EventBus, JSONModel) {
    "use strict";

    return Controller.extend("bix.card.plPlanOffshoringTable.Main", {
        _sTableId: "plPlanOffshoringTable",
        _sMyKeyword : "Account",
        _oEventBus: EventBus.getInstance(),

        onInit: function () {           
            // 기본 테이블 셋팅
            // this._bindTable();
            // select 칸 셋팅
            this._selectDataSetting();
        },

        /**
         * 
         * @param {*} oEvent 
         */

        onChange: async function (oEvent) {            
            this._sMyKeyword = oEvent.getSource().getSelectedKey();
            this._bindTable();            
        },

        _selectDataSetting: function () {
            let oTemp1 = [{
                key: "Account",
                value: "Account"
            }, {
                key: "사업유형",
                value: "사업유형"
            }]
            this.getView().setModel(new JSONModel(oTemp1), "conditionSelect");
        },
        
        _bindTable: async function () {
            this.getView().setBusy(true);

            // 세션스토리지에서 데이터 가져오기
            let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;
            let sMyKeyword = this._sMyKeyword

            // 테이블 패스 설정
            let sPath = "";

            // 테이블 바인딩           
            let oTable = this.byId(this._sTableId);

            oTable.bindRows({
                path: sPath,
                sorter: new Sorter({ path: "seq" }),
                events: {
                    dataRequested: function () {
                        oTable.setBusy(true);
                    }.bind(this),
                    dataReceived: function () {
                        oTable.setBusy(false);
                    }.bind(this),
                }
            })            

            this.getView().setBusy(false);
        }
    });
});