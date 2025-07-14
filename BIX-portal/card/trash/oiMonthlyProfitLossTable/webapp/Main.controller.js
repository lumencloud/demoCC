sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Sorter",
    "sap/ui/core/EventBus",
    "sap/ui/model/json/JSONModel",

], function (Controller, Sorter, EventBus, JSONModel) {
    "use strict";

    return Controller.extend("bix.card.oiMonthlyProfitLossTable.Main", {
        _sTableId: "oiMonthlyProfitLossTable",
        _oEventBus: EventBus.getInstance(),

        onInit: function () {           
            // 기본 테이블 셋팅
            this._bindTable();           
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

            // 테이블 컬럼의 년도 표시
            this.getView().setModel(new JSONModel(), "column")
            let sYear = "'" + iYear.toString().slice(2) + "년"
            this.getView().getModel("column").setProperty("/year", sYear)

            // 테이블 패스 설정
            let sPath = `/get_actual_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`

            // 테이블 바인딩           
            let oTable = this.byId(this._sTableId);

            oTable.bindRows({
                path: sPath,
                sorter: new Sorter({ path: "display_order" }),
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