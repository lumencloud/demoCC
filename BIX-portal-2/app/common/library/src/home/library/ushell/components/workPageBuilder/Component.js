//Copyright (c) 2009-2023 SAP SE, All Rights Reserved
/**
 * @fileOverview WorkPageBuilder Component
 * This UIComponent gets initialized by the FLP renderer upon visiting a work page if work pages are enabled (/core/workPages/enabled).
 *
 * @version 1.132.0
 */

sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/base/util/ObjectPath",
    "sap/base/Log"
], function (UIComponent, ObjectPath, Log) {
    "use strict";

    /**
     * Component of the WorkPagesRuntime view.
     *
     * @param {string} sId Component id
     * @param {object} oSParams Component parameter
     *
     * @class
     * @extends sap.ui.core.UIComponent
     *
     * @private
     * @since 1.99.0
     * @alias sap.ushell.components.workPageBuilder.Component
     */
    return UIComponent.extend("bix.common.library.home.library.ushell.components.workPageBuilder.Component", /** @lends sap.ushell.components.workPageBuilder.Component.prototype */{
        metadata: {
            manifest: "json",
            library: "sap.ushell",
            events: {
                workPageEdited: {},
                visualizationFilterApplied: {
                    parameters: {
                        /**
                         * An array with objects containing {filterKey: "<key>", filterValue: "<value>"}
                         */
                        filters: { type: "array" }
                    }
                },
                closeEditMode: {
                    parameters: {
                        /**
                         * Indicates if the changes have to be saved
                         */
                        saveChanges: { type: "boolean" }
                    }
                }
            }
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
        },

        /**
         * API to call the getEditMode function on the WorkPageBuilder controller.
         * @returns {boolean} Returns the value of editMode
         * @since 1.109.0
         * @private
         * @ui5-restricted skportal-cf-*
         */
        getEditMode: function () {
            return this.getRootControl().getController().getEditMode();
        },

        /**
         * API to call the setEditMode function on the WorkPageBuilder controller.
         * @param {boolean} bEditMode true or false
         *
         * @since 1.109.0
         * @private
         * @ui5-restricted skportal-cf-*
         */
        setEditMode: function (bEditMode) {
            this.getRootControl().getController().setEditMode(bEditMode);
        },

        /**
         * API to call the setPreviewMode function on the WorkPageBuilder controller.
         * @param {boolean} bPreviewMode true or false
         *
         * @since 1.116.0
         * @private
         * @ui5-restricted skportal-cf-*
         */
        setPreviewMode: function (bPreviewMode) {
            this.getRootControl().getController().setPreviewMode(bPreviewMode);
        },

        /**
         * API to call the getPreviewMode function on the WorkPageBuilder controller.
         * @returns {boolean} Returns the value of previewMode
         *
         * @since 1.116.0
         * @private
         * @ui5-restricted skportal-cf-*
         */
        getPreviewMode: function () {
            return this.getRootControl().getController().getPreviewMode();
        },

        /**
         * API to call the getPageData function on the WorkPageBuilder controller.
         * @returns {{workPage: {contents: object }}} Returns the pageData which might have been modified by the user.

         * @since 1.109.0
         * @private
         * @ui5-restricted skportal-cf-*
         */
        getPageData: function () {
            return this.getRootControl().getController().getPageData();
        },

        /**
         * API to call the setPageData function on the WorkPageBuilder controller.
         * @param {{workPage: {contents: object, usedVisualizations: {nodes: object}}}} oPageData WorkPage data object
         * @returns {Promise} A promise resolving when the data was set.
         *
         * @since 1.109.0
         * @private
         * @ui5-restricted skportal-cf-*
         */
        setPageData: function (oPageData) {
            this.getRootControl().getController().setPageData(oPageData);
            return Promise.resolve();
        },

        /**
         * API to call the setVisualizationDataPaginated function on the WorkPageRuntime controller.
         * @param {{visualizations: {nodes: object[], totalCount: int}}} oVizNodes Array of Visualizations
         * @returns {Promise} A promise resolving when the data was set.
         *
         * @since 1.115.0
         * @private
         * @ui5-restricted skportal-cf-*
         */
        setVisualizationData: function (oVizNodes) {
            return this.getRootControl().getController().setVisualizationData(oVizNodes);
        },


        /**
         * @typedef {Object} CatalogItem
         * @property {string} id The ID of the catalog.
         * @property {string} title The title of the catalog.
         */
        /**
         * @typedef {Object} CategoryTreeItem
         * @property {string|undefined} id The ID of the category node.
         * @property {string} title The title of the category node.$
         * @property {boolean} inactive Indicates if the category node is inactive.
         * @property {number} [$count] The count of catalogs inside the node.
         * @property {CatalogItem[]} [nodes] The child nodes of the category node.
         */
        /**
         * Sets the category tree data for the Content Finder model.
         * The category tree does not support pagination. All tree data must be set at once.
         *
         * @param {CategoryTreeItem[]|[]|undefined} aCategoryTree A tree of category objects, undefined to hide the category tree or empty array to show message in DT.
         * @returns {Promise} A promise resolving when the data was set.
         *
         * @since 1.130.0
         * @private
         * @ui5-restricted skportal-cf-*
         */
        setCategoryTree: async function (aCategoryTree) {
            return this.getRootControl().getController().setCategoryTree(aCategoryTree);
        },

        /**
         * API to check if navigation is disabled
         * @returns {boolean} Returns navigationDisabled
         * @since 1.110.0
         * @private
         * @ui5-restricted skportal-cf-*
         */
        getNavigationDisabled: function () {
            return this.getRootControl().getController().getNavigationDisabled();
        },

        /**
         * API for enabling/disabling navigation
         * @param {boolean} bNavigation true or false
         *
         * @since 1.110.0
         * @private
         * @ui5-restricted skportal-cf-*
         */
        setNavigationDisabled: function (bNavigation) {
            this.getRootControl().getController().setNavigationDisabled(bNavigation);
        },

        /**
         * Helper method to retrieve the sap.ushell.Container from the current frame or the parent frame.
         *
         * @since 1.110.0
         * @private
         * @returns {sap.ushell.Container} The ushell container
         */
        getUshellContainer: function () {
            return sap.ui.require("sap/ushell/Container") || window.parent.sap.ui.require("sap/ushell/Container");
        },

        /**
         * API for showing/hiding Footer bar
         * @param {boolean} bVisible true or false
         *
         * @since 1.110.0
         * @private
         * @ui5-restricted skportal-cf-*
         */
        setShowFooter: function (bVisible) {
            this.getRootControl().getController().setShowFooter(bVisible);
        },


        /**
         * API for showing/hiding Page title
         * @param {boolean} bVisible true or false
         *
         * @since 1.116.0
         * @private
         * @ui5-restricted skportal-cf-*
         */
        setShowPageTitle: function (bVisible) {
            this.getRootControl().getController().setShowPageTitle(bVisible);
        }
    });
});
