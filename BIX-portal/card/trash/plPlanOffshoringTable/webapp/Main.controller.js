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

        /**
         * @type {sap.ui.core.EventBus} 글로벌 이벤트버스
         */
        _oEventBus: EventBus.getInstance(),

        /**
         * @type {Number} 화면에 꽉 찬 테이블의 row 갯수
         */
        _iColumnCount: null,

        /**
         * @type {Object} 검색 조건 저장
         */
        _oSearchData: {},

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
        
        _bindTable: async function (sChannelId, sEventId, oData) {
            // 새로운 검색 조건이 같은 경우 return
            oData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            let aKeys = Object.keys(oData);
            let isDiff = aKeys.find(sKey => oData[sKey] !== this._oSearchData[sKey]);
            if (!isDiff) return;

            // 새로운 검색 조건 저장
            this._oSearchData = oData;

            // 검색 파라미터
            this.getView().setBusy(true);

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