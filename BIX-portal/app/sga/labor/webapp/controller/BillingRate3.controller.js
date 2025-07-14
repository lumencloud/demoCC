sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
], (Controller, JSONModel) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     */
    return Controller.extend("bix.sga.labor.controller.BillingRate3", {

        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("BillingRate");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: function () {
            this.getView().setModel(new JSONModel([]), "testModel");
            this.getView().setModel(new JSONModel({}), "SearchModel");

            // 검색창 초기화
            // this.getView().getControlsByFieldGroupId("Search").forEach(function (object) {
            //     if (object.getFieldGroupIds().length > 0) {
            //         object.setValue?.(null);
            //         object.removeAllTokens?.();
            //     }
            // }.bind(this));

            // // 년월의 최소, 최댓값 설정
            // this.byId("searchMonthYear").setMinDate(new Date(2023, 0, 1));
            // this.byId("searchMonthYear").setMaxDate(new Date());

            this._setData();
        },

        /**
         * 실적 데이터 기초 데이터 세팅
         */
        _setData: function () {
            this.getView().setBusy(true);

            let aData = [
                {
                    test1: 100,
                    test2: 50,
                    month: new Date(2025, 1),
                },
                {
                    test1: 70,
                    test2: 80,
                    month: new Date(2025, 2),
                },
                {
                    test1: 90,
                    test2: 70,
                    month: new Date(2025, 3),
                },
            ];
            this.getView().setModel(new JSONModel(aData), "testModel");

            this.byId("chart1").setVizProperties({
                title: { visible: true, text: 'BR 변화 추이' },
                plotArea: {
                    primaryScale: {
                        autoMinValue: true
                    },
                    window: {
                        start: "firstDataPoint",
                        end: "lastDataPoint"
                    },
                },
                valueAxis: {
                    title: { visible: false },
                    axisLine: { size: 4 } // Column 너비
                },
                timeAxis: {
                    levels: ["month", "year"],
                    title: {
                        visible: false
                    },
                },
                legendGroup: {
                    layout: {
                        alignment: 'center',
                        position: 'bottom'
                    }
                }
            });

            // 차트 데이터에 팝오버 추가
            this.getView().getControlsByFieldGroupId("Chart").forEach(function (object) {
                if (object.getFieldGroupIds().length > 0) {
                    let oPopover = object.getDependents()[0];
                    oPopover.connect(object.getVizUid());
                }
            });

            this.getView().setBusy(false);
        },
    });
});