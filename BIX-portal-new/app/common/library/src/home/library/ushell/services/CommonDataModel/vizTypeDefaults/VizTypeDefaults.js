// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

/**
 * @file Utility for loading the default visualization types for the CDM runtime.
 * @version 1.132.0
 */

sap.ui.define([
    "sap/base/Log",
    "sap/ui/core/Manifest",
    "sap/base/util/deepClone",
    "sap/base/util/extend",
    "sap/base/util/isEmptyObject",
    "sap/base/util/ObjectPath"
], function (
    Log,
    Manifest,
    deepClone,
    extend,
    isEmptyObject,
    ObjectPath
) {

    "use strict";

    const O_STANDARD_VIZ_TYPES = {
        STATIC_LAUNCHER: "sap.ushell.StaticAppLauncher",
        DYNAMIC_LAUNCHER: "sap.ushell.DynamicAppLauncher",
        CARD: "sap.ushell.Card"
    };

    class VizTypeDefaults {

        static #instance = null;
        #oVizTypes = null;

        /**
         * Gets all default viz types.
         * <p>
         * This method MAY be used without a running ushell container.
         *
         * @returns {Promise<object>}
         *   An object of default viz types, keys are the viz type IDs.
         *
         * @private
         * @since 1.121.0
         */
        static async getAll () {
            if (!VizTypeDefaults.#instance) {
                VizTypeDefaults.#instance = new VizTypeDefaults();
            }

            return VizTypeDefaults.#instance._getAll();
        }

        /**
         * Gets all viz types
         * @returns {Promise<object>} Resolves with an object of viz types
         *
         * @since 1.121.0
         * @private
         */
        async _getAll () {
            if (!this.#oVizTypes) {
                this.#oVizTypes = {};
                const oStandardManifests = {};
                oStandardManifests[O_STANDARD_VIZ_TYPES.STATIC_LAUNCHER] = "sap/ushell/components/tiles/cdm/applauncher/manifest.json";
                oStandardManifests[O_STANDARD_VIZ_TYPES.DYNAMIC_LAUNCHER] = "sap/ushell/components/tiles/cdm/applauncherdynamic/manifest.json";
                oStandardManifests[O_STANDARD_VIZ_TYPES.CARD] = "sap/ushell/services/CommonDataModel/vizTypeDefaults/cardManifest.json";

                await Promise.all(Object.keys(oStandardManifests).map(async (sVizType) => {
                    const sManifestUrl = oStandardManifests[sVizType];
                    const oManifest = await this._loadManifest(sManifestUrl);
                    this.#oVizTypes[sVizType] = oManifest;
                }));
            }

            return this.#oVizTypes;
        }

        /**
         * Loads the manifest
         * @param {string} sUrl
         * path to the manifest e.g. "sap/ushell/components/tiles/cdm/applauncher/manifest.json"
         * @returns {Promise<object>} Resolves the manifest
         *
         * @since 1.121.0
         * @private
         */
        async _loadManifest (sUrl) {
            const sManifestUrl = sap.ui.require.toUrl(sUrl);

            const oManifest = await Manifest.load({
                manifestUrl: sManifestUrl,
                async: true
            });

            // we need to clone the object since the original is read only
            // in addition we want to avoid inconsistencies
            return deepClone(oManifest.getRawJson());
        }
    }

    return VizTypeDefaults;
});
