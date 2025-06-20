// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

/**
 * @fileOverview This module provides utilities for creating visualization instances for work pages.
 * @version 1.132.0
 */
sap.ui.define([
    "../../services/VisualizationInstantiation",
    "sap/base/util/ObjectPath",
    "sap/base/Log",
    "sap/base/util/deepExtend",
    "sap/base/util/deepClone",
    "../../adapters/cdm/v3/utilsCdm",
    "../../adapters/cdm/v3/_LaunchPage/readUtils",
    "../../adapters/cdm/v3/_LaunchPage/readVisualizations",
    "../../services/CommonDataModel/vizTypeDefaults/VizTypeDefaults",
    "../tilecard/TileCard",
    "../../Config"
], function (
    VisualizationInstantiation,
    ObjectPath,
    Log,
    deepExtend,
    deepClone,
    utilsCdm,
    readUtils,
    readVisualizations,
    VizTypeDefaults,
    TileCard,
    Config
) {
    "use strict";

    /**
     * @typedef {object} SiteData Additional visualization properties retrieved from the CDM Runtime Site
     * @property {object} [target] The harmonized navigation target of the visualization
     * @property {string} [targetURL] The target URL of the visualization
     * @property {object} [dataSource] The data source for the indicator data source of the visualization
     * @property {string} [contentProviderId] The content provider id of the visualization
     */

    /**
     * @typedef {object} WorkPageVizInstantiationData An extension of a visualization retrieved from the content API
     * @property {string} id The id of the visualization
     * @property {string} type The type of the visualization
     * @property {object} descriptor The descriptor of the visualization
     * @property {object} descriptorResources The descriptor resources of the visualization
     * @property {SiteData} [_siteData] The additional app properties retrieved from the CDM Runtime Site
     * @property {boolean} [previewMode] Flag for the preview mode
     */

    /**
     * Utilities for creating visualization instances for work pages.
     * <p>
     * This class MAY be used without a running ushell container.
     *
     * @since 1.121.0
     * @private
     */
    class WorkPageVizInstantiation {

        static #instance;

        #oVizInstantiationService;
        #oStandardVizTypes;

        /**
         * Gets an instance of WorkPageVizInstantiation class.
         *
         * @private
         * @since 1.121.0
         */
        static async getInstance () {
            if (!WorkPageVizInstantiation.#instance) {
                // VisualizationInstantiation is directly constructed, because the ushell container is not available in the design-time
                const oVizInstantiationService = new VisualizationInstantiation();
                const oStandardVizTypes = await VizTypeDefaults.getAll();

                WorkPageVizInstantiation.#instance = new WorkPageVizInstantiation(oVizInstantiationService, oStandardVizTypes);
            }

            return WorkPageVizInstantiation.#instance;
        }

        /**
         * Creates a new WorkPageVizInstantiation
         *
         * @param {object} oVizInstantiationService An instance of the VisualizationInstantiation service.
         * @param {object} oStandardVizTypes An object containing hte standard viz types.
         * @private
         * @since 1.123.0
         */
        constructor (oVizInstantiationService, oStandardVizTypes) {
            // VisualizationInstantiation is directly constructed, because the ushell container is not available in the design-time
            this.#oVizInstantiationService = oVizInstantiationService;
            this.#oStandardVizTypes = oStandardVizTypes;
        }

        /**
         * Returns the extended instantiation data for the visualization.
         * @param {WorkPageVizInstantiationData} oVizData The visualization data.
         * @returns {object} The extended instantiation data.
         * @private
         * @since 1.123.0
         */
        _getVizInstantiationData (oVizData) {
            // viz instantiation service modifies the indicatorDataSource which breaks if objects are frozen
            const oVizType = this.#oStandardVizTypes[oVizData.type];

            if (!oVizType && oVizData.type?.startsWith("ssuite.smartbusiness.tiles.") && Config.last("/core/workPages/enableSmartBusiness")) {
                return this._getSMBVizInstantiationData(oVizData);
            }

            const bProviderInfoEnabled = Config.last("/core/contentProviders/providerInfo/enabled");
            const bShowProviderInfoInSystemInfo = bProviderInfoEnabled && Config.last("/core/contentProviders/providerInfo/showContentProviderInfoOnVisualizations");
            const bUseIntentNavigation = Config.last("/core/shell/intentNavigation");

            return {
                id: oVizData.id,
                title: ObjectPath.get(["descriptor", "value", "sap.app", "title"], oVizData),
                subtitle: ObjectPath.get(["descriptor", "value", "sap.app", "subTitle"], oVizData),
                info: ObjectPath.get(["descriptor", "value", "sap.app", "info"], oVizData),
                icon: ObjectPath.get(["descriptor", "value", "sap.ui", "icons", "icon"], oVizData),
                keywords: ObjectPath.get(["descriptor", "value", "sap.app", "tags", "keywords"], oVizData) || [],
                _instantiationData: {
                    platform: "CDM",
                    vizType: oVizType
                },
                indicatorDataSource: ObjectPath.get("indicatorDataSource", oVizData),
                vizType: ObjectPath.get("type", oVizData),
                dataSource: ObjectPath.get(["_siteData", "dataSource"], oVizData),
                contentProviderId: ObjectPath.get(["_siteData", "contentProviderId"], oVizData),
                contentProviderLabel: ObjectPath.get(["_siteData", "contentProviderLabel"], oVizData),
                displayProviderLabel: bShowProviderInfoInSystemInfo,
                target: bUseIntentNavigation ? ObjectPath.get("target", oVizData) : ObjectPath.get(["_siteData", "target"], oVizData),
                targetURL: bUseIntentNavigation ? ObjectPath.get("targetURL", oVizData) : ObjectPath.get(["_siteData", "targetURL"], oVizData),
                vizConfig: ObjectPath.get(["descriptor", "value"], oVizData),
                supportedDisplayFormats: ObjectPath.get(["descriptor", "value", "sap.flp", "vizOptions", "displayFormats", "supported"], oVizData),
                displayFormatHint: ObjectPath.get(["descriptor", "value", "sap.flp", "vizOptions", "displayFormats", "default"], oVizData) || "standard",
                numberUnit: ObjectPath.get(["descriptor", "value", "sap.flp", "numberUnit"], oVizData),
                vizId: oVizData.id,
                preview: oVizData.preview
            };
        }

        /**
         * Returns the extended instantiation data for the SMB visualization.
         * @param {WorkPageVizInstantiationData} oVizData The visualization data.
         * @returns {object} The extended instantiation data.
         * @private
         * @since 1.131.0
         */
        _getSMBVizInstantiationData (oVizData) {
            const bProviderInfoEnabled = Config.last("/core/contentProviders/providerInfo/enabled");
            const bShowProviderInfoInSystemInfo = bProviderInfoEnabled && Config.last("/core/contentProviders/providerInfo/showContentProviderInfoOnVisualizations");
            const bUseIntentNavigation = Config.last("/core/shell/intentNavigation");

            return {
                id: oVizData.id,
                title: ObjectPath.get(["_siteData", "title"], oVizData),
                subtitle: ObjectPath.get(["_siteData", "subtitle"], oVizData),
                info: ObjectPath.get(["_siteData", "info"], oVizData),
                icon: ObjectPath.get(["_siteData", "icon"], oVizData),
                keywords: ObjectPath.get(["_siteData", "keywords"], oVizData),
                _instantiationData: {
                    platform: "CDM",
                    vizType: oVizData.vizType
                },
                indicatorDataSource: ObjectPath.get("indicatorDataSource", oVizData),
                vizType: oVizData.type,
                dataSource: ObjectPath.get(["_siteData", "dataSource"], oVizData),
                contentProviderId: ObjectPath.get(["provider", "id"], oVizData),
                contentProviderLabel: ObjectPath.get(["_siteData", "contentProviderLabel"], oVizData),
                displayProviderLabel: bShowProviderInfoInSystemInfo,
                target: bUseIntentNavigation ? ObjectPath.get("target", oVizData) : ObjectPath.get(["_siteData", "target"], oVizData),
                targetURL: bUseIntentNavigation ? ObjectPath.get("targetURL", oVizData) : ObjectPath.get(["_siteData", "targetURL"], oVizData),
                vizConfig: ObjectPath.get(["descriptor", "value"], oVizData),
                supportedDisplayFormats: ObjectPath.get(["_siteData", "supportedDisplayFormats"], oVizData),
                displayFormatHint: ObjectPath.get(["_siteData", "displayFormatHint"], oVizData) || "standard",
                numberUnit: ObjectPath.get(["descriptor", "value", "sap.flp", "numberUnit"], oVizData),
                vizId: oVizData.id,
                preview: oVizData.preview
            };
        }

        /**
         * Creates a visualization instance for the provided data.
         *
         * @param {WorkPageVizInstantiationData} oVizData Extended visualization data for instantiation.
         * @returns {sap.ushell.ui.launchpad.VizInstance|sap.m.GenericTile} The CDM VizInstance.
         * @private
         * @since 1.121.0
         */
        createVizInstance (oVizData) {
            var oVizInstance = this.#oVizInstantiationService.instantiateVisualization(this._getVizInstantiationData(oVizData));
            if (oVizInstance) {
                oVizInstance.setActive(true);
            }

            return oVizInstance;
        }

        /**
         * Creates the tile card configuration for the pagebuilder to render a tile as a card.
         *
         * @param {WorkPageVizInstantiationData} oVizData Extended visualization data for instantiation.
         * @returns {sap.ushell.utils.tilecard.TileCardConfiguration} Configuration for the page builder.
         * @private
         * @since 1.123.0
         */
        createTileCardConfiguration (oVizData) {
            return TileCard.createTileCardConfiguration(this._getVizInstantiationData(oVizData));
        }
    }

    return WorkPageVizInstantiation;
}, /*export=*/ true);
