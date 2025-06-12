sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../../test/ai/service/AgentService",
    "../../../test/ai/util/InteractionUtils",
    "sap/ui/core/EventBus",
    "sap/ui/core/routing/HashChanger",
    "sap/m/MessageToast",
], (BaseController, JSONModel, AgentService, InteractionUtils, EventBus, HashChanger, MessageToast) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     */
    return BaseController.extend("bix.pl.performance2.controller.Splitter", {
        _oEventBus: EventBus.getInstance(),

        onInit: function () {
            const oRouteMain = this.getOwnerComponent().getRouter().getRoute("RouteMain");
            oRouteMain.attachPatternMatched(this.onMyRoutePatternMatched, this);


            // detail(메인 에뉴) 변경 시
            // this._oEventBus.subscribe("pl", "page", this._getEventBus, this);
            // this._oEventBus.subscribe("pl", "detail", this._getEventBus, this);
            this._oEventBus.subscribe("pl", "hashChange", this._setHash, this);
            this._oEventBus.subscribe("pl", "setHashModel", this._setHashModel, this);

            // this._oEventBus.publish("mainApp", "busy", { loaded: true });
        },

        /**
         * 
         * @param {Event} oEvent 
         */
        onMyRoutePatternMatched: function (oEvent) {
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

            let oHashModel = this.getOwnerComponent().getModel("hashModel");

            if (!aHash) {
                // 해시가 존재하지 않을 때 기본값 설정
                let oHashData = {
                    page: "actual",
                    pageView: "table",
                    detail: "saleMargin",
                    detailType: "chart"
                }
                oHashModel.setData(oHashData);
            } else if (aHash[1] && aHash[2] && aHash[3] && aHash[4]) {
                let sPattern = this.getOwnerComponent().getRouter().getRoute("RouteMain").getPattern();
                let aArguments = [...sPattern.matchAll(/:([^:\/]+):/g)].map(match => match[1]);

                // 현재 URL을 기반으로 hashModel 업데이트
                let oHashData = {};
                aArguments.forEach((oArguments, index) => oHashData[oArguments] = aHash[index + 1]);

                oHashModel.setData(oHashData);
            } else {
                MessageToast.show("url을 확인해주세요.");
            }
        },
    });
});


