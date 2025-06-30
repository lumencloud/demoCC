// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

/**
 * @fileoverview This module provides a collection of utility functions.
 */
sap.ui.define([
    "sap/base/Log",
    "sap/base/util/ObjectPath"
], function (
    Log,
    ObjectPath
) {
    "use strict";

    const OBJECT_PROTOTYPE_KEYS = Object.getOwnPropertyNames(Object.prototype);

    /**
     * The method will fail if the given object has a cyclic reference.
     *
     * @param {object} o Object to deep freeze; it should not contain a cyclic reference anywhere in its tree.
     * @returns {object} The given object which is no longer mutable.
     *
     * @private
     */
    function deepFreeze (o) {
        Object.keys(o)
            .filter(function (sProperty) {
                return typeof o[sProperty] === "object";
            })
            .forEach(function (sProperty) {
                o[sProperty] = deepFreeze(o[sProperty]);
            });

        return Object.freeze(o);
    }

    /**
     * Returns the location's origin URL.
     * This is equivalent to reading the value of location.origin
     * (Needed for compatibility reasons)
     *
     * @returns {string} A String containing the canonical form of the origin of the specific location.
     *
     * @private
     */
    function getLocationOrigin () {
        // location.origin might not be supported by all browsers
        return location.protocol + "//" + location.host;
    }

    /**
     * Add trialing slash to the end of path if it is missing
     *
     * @param {string} sPath path
     *
     * @returns {string} The path with a trialing slash
     *
     * @private
     */
    function ensureTrailingSlash (sPath) {
        if ((typeof sPath === "string") && sPath.charAt(sPath.length - 1) !== "/") {
            return sPath + "/";
        }
        return sPath;
    }

    /**
     * Merge the object oConfigToMerge into oMutatedBaseConfig according to
     * sap-ushell-config merge rules. Note that the JSON serialized content of
     * oConfigToMerge is used, thus JSON serialization restrictions apply (e.g.
     * Infinity -> null ). Note that it is thus not possible to remove a
     * property definition or overriding with  {"propname" : undefined}. One
     * has to override with null or 0 etc.
     *
     * Note: Do not use this method for general merging of other objects, as
     * the rules may be enhanced/altered
     *
     * @param {object} oMutatedBaseConfig
     *     the configuration to merge into, modified in place
     * @param {object} oConfigToMerge
     *     the configuration to be merged with oMutatedBaseConfig
     * @param {boolean} bCloneConfigToMerge
     *     whether the oConfigToMerge must be cloned prior to the merge
     * @private
     */
    function mergeConfig (oMutatedBaseConfig, oConfigToMerge, bCloneConfigToMerge) {
        let oActualConfigToMerge;

        if (!oConfigToMerge) {
            return;
        }

        oActualConfigToMerge = bCloneConfigToMerge ? JSON.parse(JSON.stringify(oConfigToMerge)) : oConfigToMerge;

        Object.keys(oActualConfigToMerge).forEach(function (sKey) {
            // Prevent overriding of object prototype properties to avoid prototype pollution attacks
            if (OBJECT_PROTOTYPE_KEYS.includes(sKey)) {
                return;
            }

            if (typeof oMutatedBaseConfig[sKey] === "object" && typeof oActualConfigToMerge[sKey] === "object") {
                mergeConfig(oMutatedBaseConfig[sKey], oActualConfigToMerge[sKey], false);
                return;
            }

            oMutatedBaseConfig[sKey] = oActualConfigToMerge[sKey];
        });
    }

    /**
     * Checks if the sap-statistics setting as query parameter or via local storage, as
     * UI5 does it in some cases.
     * @param {string} sQueryToTest String to test. By default, take the window.location.search
     * @returns {boolean} true if the sap-statistics is set as query parameter or via local storage
     * @private
     */
    function isSapStatisticsSet (sQueryToTest) {
        let sWindowLocationSearch = sQueryToTest || window.location.search,
            bSapStatistics = /sap-statistics=(true|x|X)/.test(sWindowLocationSearch);
        if (!bSapStatistics) {
            try {
                // UI5's config cannot be used here, so check local storage
                bSapStatistics = window.localStorage.getItem("sap-ui-statistics") === "X";
            } catch (e) {
                Log.warning(
                    "failed to read sap-statistics setting from local storage",
                    null,
                    "sap.ushell.bootstrap.common.common.util"
                );
            }
        }
        return !!bSapStatistics; // needed for tests only
    }

    /**
     * Migrates the config for the v2 services based on their predecessor.
     * The migration happens INPLACE!
     * @param {object} ushellConfig The ushell config
     *
     * @since 1.120.0
     * @private
     */
    function migrateV2ServiceConfig (ushellConfig) {
        /**
         * Store whether some migration happened.
         * This allows us to provide a fallback as part of {@link sap.ushell.bootstrap}
         * @deprecated As of version 1.120
         */
        window["sap-ushell-config-migration"] = true;

        // migrate service config
        [
            { from: "services.Bookmark", to: "services.BookmarkV2" },
            { from: "services.CrossApplicationNavigation", to: "services.Navigation" },
            { from: "services.Notifications", to: "services.NotificationsV2" },
            { from: "services.Personalization", to: "services.PersonalizationV2" },
            { from: "services.LaunchPage", to: "services.FlpLaunchPage" },
            { from: "services.ShellNavigation", to: "services.ShellNavigationInternal" },
            { from: "services.NavTargetResolution", to: "services.NavTargetResolutionInternal" }
        ].forEach((oMigration) => {
            const sServiceFromName = oMigration.from.split(".")[1];
            const oConfigFrom = ObjectPath.get(oMigration.from, ushellConfig);
            const oConfigTo = ObjectPath.get(oMigration.to, ushellConfig);
            if (oConfigFrom && !oConfigTo) {
                Log.warning(`The service config for ${oMigration.from} is migrated to ${oMigration.to}`, "common.util");

                // we only need a shallow copy here, because we only want to change the module property
                const oConfigFromCopy = { ...oConfigFrom };

                // the module references the standard service name this might lead to infinite loops
                // because the old service can depend on the new service
                // DINC0103566
                if (oConfigFromCopy.module === `sap.ushell.services.${sServiceFromName}`) {
                    delete oConfigFromCopy.module;
                }

                ObjectPath.set(oMigration.to, oConfigFromCopy, ushellConfig);
            }
        });
    }

     /**
     * Migrates the config for the v2 services based on their predecessor.
     * Does only work for plain values, not for functions and class instances.
     * @param {object} ushellConfig The ushell config
     * @returns {object} The migrated config, ONLY the migrated part
     *
     * @since 1.121.0
     * @private
     */
    function getV2ServiceMigrationConfig (ushellConfig) {
        /**
         * Store whether some migration happened.
         * This allows us to provide a fallback as part of {@link sap.ushell.bootstrap}
         * @deprecated As of version 1.120
         */
        window["sap-ushell-config-migration"] = true;

        // migrate service config
        const oConfig = {};
        [
            { from: "services.Bookmark", to: "services.BookmarkV2" },
            { from: "services.CrossApplicationNavigation", to: "services.Navigation" },
            { from: "services.Notifications", to: "services.NotificationsV2" },
            { from: "services.Personalization", to: "services.PersonalizationV2" },
            { from: "services.LaunchPage", to: "services.FlpLaunchPage" },
            { from: "services.ShellNavigation", to: "services.ShellNavigationInternal" },
            { from: "services.NavTargetResolution", to: "services.NavTargetResolutionInternal" }
        ].forEach((oMigration) => {
            const sServiceFromName = oMigration.from.split(".")[1];
            const oConfigFrom = ObjectPath.get(oMigration.from, ushellConfig);
            const oConfigTo = ObjectPath.get(oMigration.to, ushellConfig);
            if (oConfigFrom && !oConfigTo) {
                Log.warning(`The service config for ${oMigration.from} is migrated to ${oMigration.to}`, "common.util");

                // we only need a shallow copy here, because we only want to change the module property
                const oConfigFromCopy = { ...oConfigFrom };

                // the module references the standard service name this might lead to infinite loops
                // because the old service can depend on the new service
                // DINC0103566
                if (oConfigFromCopy.module === `sap.ushell.services.${sServiceFromName}`) {
                    delete oConfigFromCopy.module;
                }

                ObjectPath.set(oMigration.to, oConfigFromCopy, oConfig);
            }
        });

        return JSON.parse(JSON.stringify(oConfig));
    }

    return {
        deepFreeze,
        getLocationOrigin,
        ensureTrailingSlash,
        mergeConfig,
        isSapStatisticsSet,
        migrateV2ServiceConfig,
        getV2ServiceMigrationConfig
    };
});
