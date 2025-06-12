sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",

], function (Controller, JSONModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.accountSaleDetailTable.Main", {

        _oEventBus: EventBus.getInstance(),

        onInit: function () {
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);
            this._bTableRender = true
            this._bindTable();
        },

        _bindTable: async function (sChannelId, sEventId, oData = {}) {
            let oModel = this.getOwnerComponent().getModel()
            let sPath = "/get_pl_account_sale_detail(year='2024',month='09')"

            let oBinding = oModel.bindList(sPath)
            oBinding.requestContexts().then((ctx) => {
                console.log(ctx)
                let aData = ctx.map(aCtx => aCtx.getObject())                
                this.getView().setModel(new JSONModel(aData), "accountModel")
            })
        },

        onAfterRendering: function () {
            this._bindTable()

            let oTable = this.byId("accountDetailTable");
            if (this._bTableRender) {
                let oFixedRowMode = new sap.ui.table.rowmodes.Auto()
                oTable.setRowMode(oFixedRowMode)
            }
        },

        formatNumber: function (value) {
            if (value === undefined || value === null || value === "") return "";

            let oNumberFormat = NumberFormat.getIntegerInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
            });

            return oNumberFormat.format(value)
        },
        formatPercent: function (value) {
            if (value === undefined || value === null || value === "") return "";

            let oNumberFormat = NumberFormat.getPercentInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
                decimals: 2
            });

            return oNumberFormat.format(value / 100)
        },

        
    });
});