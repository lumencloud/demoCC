sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/HTML",
    "sap/ui/core/format/NumberFormat"
], (Controller, JSONModel, HTML, NumberFormat) => {
    "use strict";
    /**
     * @typedef {sap.ui.base.Event} Event
     */

    return Controller.extend("bix.test.close_org.controller.Org_Table", {
        /**
         * 초기 실행 메소드
         */
        onInit: async function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("Org_Table");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        onMyRoutePatternMatched: function () {
            this._setData();
        },

        _setData: async function () {
            let oDateModel = this.getOwnerComponent().getModel("cm");
            let aData = await oDateModel.bindContext('/OrgType').requestObject();
            this.getView().setModel(new JSONModel(aData.value), "closeOrgTableModel");
        }
    });
});