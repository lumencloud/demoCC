sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "bix/common/ai/service/AgentService",
    "bix/common/ai/util/InteractionUtils",
    "sap/ui/core/EventBus",
    "sap/ui/core/routing/HashChanger",
    "sap/m/MessageToast",
    "sap/ui/core/mvc/XMLView",
], (BaseController, JSONModel, AgentService, InteractionUtils, EventBus, HashChanger, MessageToast, XMLView) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     */
    return BaseController.extend("bix.pl.performance2.controller.Splitter", {
        _oEventBus: EventBus.getInstance(),

        onInit: function () {
            const oRouteMain = this.getOwnerComponent().getRouter().getRoute("RouteMain");
            oRouteMain.attachPatternMatched(this.onRouteMainPatternMatched, this);

            const oRouteActual = this.getOwnerComponent().getRouter().getRoute("RouteActual");
            oRouteActual.attachPatternMatched(this.onRouteActualPatternMatched, this);

            const oRoutePlan = this.getOwnerComponent().getRouter().getRoute("RoutePlan");
            oRoutePlan.attachPatternMatched(this.onRoutePlanPatternMatched, this);

            // detail(메인 에뉴) 변경 시
            // this._oEventBus.subscribe("pl", "page", this._getEventBus, this);
            // this._oEventBus.subscribe("pl", "detail", this._getEventBus, this);
            this._oEventBus.subscribe("pl", "hashChange", this._setHash, this);
            this._oEventBus.subscribe("pl", "setHashModel", this._setHashModel, this);

            // SplitPane에 View 삽입
            let sComponentName = this.getOwnerComponent().getMetadata().getComponentName();
            this.byId("splitPane1").setContent(new XMLView({ viewName: `${sComponentName}.view.PL` }));
            this.byId("splitPane2").setContent(new XMLView({ viewName: `${sComponentName}.view.Detail`, width: "100%" }));

            // this._oEventBus.publish("mainApp", "busy", { loaded: true });
        },

        /**
         * RouteMain PatterMatched 이벤트
         * @param {Event} oEvent 
         */
        onRouteMainPatternMatched: function (oEvent) {
            // 해시가 없을 때 
            // let oHashModel = this.getOwnerComponent().getModel("hashModel");
            // let oHashData = {
            //     page: "actual",
            //     pageView: "table",
            //     detail: "saleMargin",
            //     detailType: "chart"
            // }
            // oHashModel.setData(oHashData);

            // this._setHash();

            this.getOwnerComponent().getRouter().navTo("RouteActual")
        },

        /**
         * RoutePlan PatterMatched 이벤트
         * @param {Event} oEvent 
         */
        onRoutePlanPatternMatched: function (oEvent) {
            // HashModel의 page를 plan으로 변경
            this.getOwnerComponent().getModel("hashModel").setProperty("/page", "plan");

            // 현재 URL을 기반으로 hashModel 업데이트
            this._setHashModel();
        },

        /**
         * RoutePlan PatterMatched 이벤트
         * @param {Event} oEvent 
         */
        onRouteActualPatternMatched: function (oEvent) {
            // HashModel의 page를 actual으로 변경
            this.getOwnerComponent().getModel("hashModel").setProperty("/page", "actual");

            // 현재 URL을 기반으로 hashModel 업데이트
            this._setHashModel();
        },

        /**
         * hashModel을 기반으로 URL Hash 업데이트
         */
        _setHash: function () {
            let oHashData = this.getOwnerComponent().getModel("hashModel").getData();

            let sCurrHash = HashChanger.getInstance().getHash();
            let sHash = sCurrHash.split("&")[0];
            let sNewHash = sHash + `&/#` + `/${oHashData.page}/${oHashData.pageView}/${oHashData.detail}/${oHashData.detailType}`;
            HashChanger.getInstance().setHash(sNewHash);

            // this._oEventBus.publish("mainApp", "busy", { loaded: true });
        },

        /**
         * 현재 URL을 기반으로 hashModel 업데이트
         */
        _setHashModel: function () {
            let sCurrHash = HashChanger.getInstance().getHash();
            let aHash = sCurrHash.split("#")[1]?.split("/");

            let oHashData = {
                page: aHash?.[1] || "actual",
                pageView: aHash?.[2] || "table",
                detail: aHash?.[3] || "saleMargin",
                detailType: aHash?.[4] || "chart",
                // orgId: aHash?.[5] || "5",
            }

            let oHashModel = this.getOwnerComponent().getModel("hashModel");
            oHashModel.setData(oHashData);
        },
    });
});


