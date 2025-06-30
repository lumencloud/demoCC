
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Sorter",
    "sap/ui/core/EventBus",
], function (Controller, Sorter, EventBus) {
    "use strict";

    return Controller.extend("bix.card.plCategorySaleMarginTable.Main", {
        _sTableId: "plCategorySaleMarginTable",
        _oEventBus: EventBus.getInstance(),


        onInit: function () {            
            this._bindTable();
        },
        
        _bindTable: async function () {
            this.getView().setBusy(true);

            let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;

            // 테이블 바인딩
            let sPath = `/get_actual_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
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
        },

        



    });
});