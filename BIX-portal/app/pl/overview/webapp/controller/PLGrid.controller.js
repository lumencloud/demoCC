sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
], (Controller, EventBus) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Input} Input
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     */
    return Controller.extend("bix.pl.overview.controller.PLGrid", {
        _oEventBus: EventBus.getInstance(),

        onInit: function () {
            const oRouteMain = this.getOwnerComponent().getRouter().getRoute("RouteMain");
            oRouteMain.attachPatternMatched(this.onMyRoutePatternMatched, this);

        },

        onMyRoutePatternMatched: function () {

        },

        onAfterRendering: function () {
            this._oEventBus.subscribe("pl", "plGridCard1", this._callPlGridCard, this);
            this._oEventBus.subscribe("pl", "plGridCard2", this._callPlGridCard, this);
            this._oEventBus.subscribe("pl", "plGridCard3", this._callPlGridCard, this);
            this._oEventBus.subscribe("pl", "plGridCard4", this._callPlGridCard, this);
            this._oEventBus.subscribe("pl", "plGridCard5", this._callPlGridCard, this);
            this._oEventBus.subscribe("pl", "plGridCard6", this._callPlGridCard, this);
        },

        _callPlGridCard: function (sChannelId, sEventId) {
            let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();
            let oEventData = {
                year: oSearchData.yearMonth.getFullYear(),
                month: String(oSearchData.yearMonth.getMonth() + 1).padStart(2, "0"),
                orgId: oSearchData.orgId,
            };

            this._oEventBus.publish(sChannelId, `${sEventId}Search`, oEventData);
        },
    });
});