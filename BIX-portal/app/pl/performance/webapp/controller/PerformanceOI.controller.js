sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
],
/**
 * @param {typeof sap.ui.core.mvc.Controller} Controller 
 * @param {typeof sap.ui.model.json.JSONModel} JSONModel 
 * @param {sap.m.MessageToast} MessageToast 
 */
    function (Controller, JSONModel, MessageToast) {
        "use strict";

        /**
         * @typedef {sap.ui.base.Event} Event
         * @typedef {sap.ui.core.UIComponent} UIComponent
         */
        return Controller.extend("bix.pl.performance.controller.PerformanceOI", {
            /**
             * @type {Array} Oi 테이블 컬럼 구성
             */
            _aOiColumn: [],

            /**
             * 초기 실행 메소드
             */
            onInit: function () {
                const myRoute = /** @type {UIComponent} */ (this.getOwnerComponent()).getRouter().getRoute("RoutePL");
                myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
            },

            /**
             * 프로젝트 목록 페이지 라우팅 시 실행 코드
             */
            onMyRoutePatternMatched: function () {
                this._setData();
            },

            /**
             * 실적 데이터 기초 데이터 세팅
             */
            _setData: function () {
                let oTemp = { year: "25", agoYear: "24" };
                this.getView().setModel(new JSONModel(oTemp), "tableYearModel");

                this._aOiColumn = [
                    {
                        type: "DT 매출/마진",
                    }, {
                        type: "Offshoring",
                    }, {
                        type: "Non-MM",
                    }, {
                        type: "BR",
                    }, {
                        type: "RoHC",
                    }
                ];
                this.getView().setModel(new JSONModel(this._aOiColumn), "oiUiTableModel");
            },

            /**
             * O/I 테이블 검색
             * @param {Event} oEvent 
             * @param {String} sFlag 검색/초기화 구분
             */
            onOiSearch: async function (oEvent, sFlag) {
                if (sFlag === "Search") {
                    MessageToast.show("검색이 완료되었습니다.");
                } else if (sFlag === "Refresh") {
                    MessageToast.show("검색조건이 초기화되었습니다.");
                };
            },
        });
    });