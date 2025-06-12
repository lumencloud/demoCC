sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "bix/common/library/control/Modules",
    "sap/ui/core/Messaging",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, JSONModel, MessageToast, Module, Messaging, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("bix.master.batch.controller.Detail", {
        /**
         * 초기 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteDetail");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * batch 상세 페이지로 라우팅했을 때
         */
        onMyRoutePatternMatched: function (oEvent) {
            const arg = oEvent.getParameter("arguments");
            const sPath = `/interface_log_view(ver='${arg.ver}',if_step='${arg.if_step}',procedure_name='${arg.procedure_name}',table_name='${arg.table_name}',success_yn=${arg.success_yn==='true'})`;

            this.byId("simpleForm").bindElement({
                path: sPath
            })
        },

        onBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteMain");
        }






    });
});