//Copyright (c) 2009-2023 SAP SE, All Rights Reserved
/**
 * @fileOverview ContentFinder Component
 *
 * @version 1.132.0
 */

sap.ui.define([
    "sap/base/Log",
    "sap/base/util/deepExtend",
    "sap/base/util/ObjectPath",
    "sap/ui/core/UIComponent",
    "sap/ushell/components/contentFinder/model/GraphQLModel",
    "sap/ui/model/json/JSONModel",
    "sap/ushell/adapters/cdm/v3/utilsCdm",
    "sap/ushell/Config",
    "sap/f/library",
    "sap/ui/core/mvc/XMLView",
    "../Component"
], function (
    Log,
    deepExtend,
    ObjectPath,
    UIComponent,
    GraphQLModel,
    JSONModel,
    utilsCdm,
    Config,
    fLibrary,
    XMLView,
    ContentFinderComponent
) {
    "use strict";

    /**
     * Component of the ContentFinder view.
     *
     * @param {string} sId Component id.
     * @param {object} mSettings Optional map for component settings.
     * @class
     * @extends sap.ushell.components.contentFinder.Component
     * @private
     * @since 1.113.0
     * @alias sap.ushell.components.contentFinder.dialog.Component
     */
    return ContentFinderComponent.extend("bix.common.library.home.library.ushell.components.contentFinder.dialog.Component", /** @lends sap.ushell.components.contentFinder.dialog.Component.prototype */{
        metadata: {
            manifest: "json",
            library: "sap.ushell"
        },

        /**
         * Resolves with the dialog control of the ContentFinder.
         *
         * @returns {Promise<sap.m.Dialog>} Resolves with the dialog control.
         *
         * @since 1.132.0
         * @private
         */
        getDialog: function () {
            return this.rootControlLoaded().then((oRootView) => {
                return oRootView.byId("contentFinderDialog");
            });
        },

        /**
         * @typedef {object} VisualizationFilter A visualization filter.
         * @property {string} key The key of the filter to be used. For example, in the "displayed" array.
         * @property {string} title The translated title of the filter.
         * @property {array<string>} types The visualization types (e.g. "sap.ushell.StaticAppLauncher", "sap.ushell.DynamicAppLauncher", "sap.card")
         */
        /**
         * Opens the content finder dialog.
         *
         * @param {object} oComponentData The component data.
         * @param {string} oComponentData.visualizationFilters The visualization filters.
         * @param {array<VisualizationFilter>} oComponentData.visualizationFilters.available The available filters as object containing its configuration.
         * @param {array<string>} oComponentData.visualizationFilters.displayed The keys of the filters which should be displayed in the UI.
         * @param {string} oComponentData.visualizationFilters.selected The filter which is selected by default.
         * @returns {Promise<undefined>} Resolves with <code>undefined</code>.
         *
         * @since 1.132.0
         * @public
         */
        show: async function (oComponentData) {
            const oVisualizationFilters = oComponentData?.visualizationFilters || this.getComponentData()?.visualizationFilters;
            if (oVisualizationFilters) {
                this.setVisualizationsFilters(oVisualizationFilters);
            }

            this.resetVisualizations();
            this.initializeSelectionModel();
            this._bLoading = false;
            this.queryVisualizations(0);
            (await this.getDialog()).open();
        }
    });
});
