// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

/**
 * @file This file contains miscellaneous utility functions.
 * They are for exclusive use within the unified shell unless otherwise noted.
 */
sap.ui.define([
    "sap/base/Log",
    "sap/base/util/isPlainObject",
    "sap/base/util/ObjectPath",
    "sap/base/util/uid",
    "sap/ui/Device",
    "../ui/core/Element",
    "sap/ui/core/EventBus",
    "sap/ui/thirdparty/jquery",
    "sap/ui/thirdparty/URI",
    "sap/base/util/deepClone",
    "./utils/UrlParsing",
    "./utils/objectOperations",
    "./utils/type",
    "./renderer/History"
    //"sap/ushell/resources" --> cannot be declared here currently: utils is used very early - before core boot, but resources uses UI5 core.
], function (
    Log,
    isPlainObject,
    ObjectPath,
    uid,
    Device,
    Element,
    EventBus,
    jQuery,
    URI,
    deepClone,
    urlParsing,
    ushellObjectOperations,
    ushellType,
    History
) {
    "use strict";

    let utils = {};

    utils.isArray = ushellType.isArray;
    utils.isPlainObject = ushellType.isPlainObject;
    utils.isDefined = ushellType.isDefined;
    /**
     * @deprecated since 1.118
     */
    utils.clone = deepClone; // for compatibility

    utils.getMember = ushellObjectOperations.getMember;
    utils.updateProperties = ushellObjectOperations.updateProperties;
    utils.getNestedObjectProperty = ushellObjectOperations.getNestedObjectProperty;

    /**
     * Freezes the object and all its properties recursively.
     * @param {object} oObject The object to freeze.
     * @returns {object} The frozen object.
     * @throws {Error} If the object has cyclic references.
     *
     * @since 1.127.0
     * @private
     */
    utils.deepFreeze = function (oObject) {
        Object.keys(oObject)
            .filter((sProperty) => {
                const vNestedValue = oObject[sProperty];
                return isPlainObject(vNestedValue) || Array.isArray(vNestedValue);
            })
            .forEach((sProperty) => {
                oObject[sProperty] = this.deepFreeze(oObject[sProperty]);
            });

        return Object.freeze(oObject);
    };

    /**
     * Removes duplicated items from the actions array.
     *
     * @param {string[]} aActions List of actions.
     * @returns {string[]} Filtered list of unique actions in case of array or the same object otherwise.
     * @private
     */
    utils.removeDuplicatedActions = function (aActions) {
        if (Array.isArray(aActions)) {
            let aFilteredActions = aActions.reduce(function (aResult, sItem) {
                if (aResult.indexOf(sItem) < 0) {
                    aResult.push(sItem);
                }
                return aResult;
            }, []);
            return aFilteredActions;
        }
        return aActions;
    };

    /**
     * Stores sap system data into local storage.
     *
     * @param {object} oSapSystemData The SAP system data.
     * @param {string} [sSapSystemSrc] The SAP system src.
     */
    utils.storeSapSystemData = function (oSapSystemData, sSapSystemSrc) {
        let sKey,
            oLocalStorage,
            sStringifiedSapSystemData,
            aSystemIds = [oSapSystemData.id];

        if (arguments.length > 1) {
            aSystemIds.unshift(sSapSystemSrc);
        }

        try {
            sStringifiedSapSystemData = JSON.stringify(oSapSystemData);
        } catch (e) {
            Log.error("Cannot stringify and store expanded system data: " + e);
        }

        if (sStringifiedSapSystemData) {
            oLocalStorage = utils.getLocalStorage();

            sKey = utils.generateLocalStorageKey("sap-system-data", aSystemIds);
            oLocalStorage.setItem(sKey, sStringifiedSapSystemData);
        }
    };

    /**
     * Returns the ID and client of the local system in sid format.
     *
     * @returns {string} The local system/client in sid format, e.g. "sid(UR3.120)".
     * @private
     */
    utils.getLocalSystemInSidFormat = function () {
        const oContainer = sap.ui.require("sap/ushell/Container");
        let oSystem = oContainer.getLogonSystem();
        let sSystemName = oSystem.getSystemName();
        let sSystemClient = oSystem.getClient();

        return "sid(" + sSystemName + "." + sSystemClient + ")";
    };

    /**
     * Checks whether the given system is in sid format and matches the local system.
     *
     * @param {string} sSidOrName The sid or name representation of the system alias.
     * @returns {boolean} Whether the given system is in sid format and matches the local system.
     * @private
     */
    utils.matchesLocalSid = function (sSidOrName) {
        return utils.getLocalSystemInSidFormat().toLowerCase() === sSidOrName.toLowerCase();
    };

    /**
     * Stores SAP system data into local storage.
     *
     * @param {object} oArgs Might contain the SAP system data ("sap-system") and/or the the SAP system src ("sap-system-src").
     */
    utils.storeSapSystemToLocalStorage = function (oArgs) {
        let oParams = (oArgs || {}).params;

        if (!oParams || !oParams.hasOwnProperty("sap-system")) {
            return;
        }

        if (utils.isPlainObject(oParams["sap-system"])) {
            let oSapSystemData = oParams["sap-system"],
                sSapSystemSrc = oParams["sap-system-src"];

            if (typeof sSapSystemSrc === "string") {
                utils.storeSapSystemData(oSapSystemData, sSapSystemSrc);
                oParams["sap-system-src"] = sSapSystemSrc;
            } else {
                utils.storeSapSystemData(oSapSystemData);
            }

            oParams["sap-system"] = oSapSystemData.id;
        } else if (utils.matchesLocalSid(oParams["sap-system"])) {
            delete oParams["sap-system"];
        }
    };

    /**
     * Allows to safely set a performance mark via native "window.performance" browser API and evaluated by performance test tools.
     *
     * @param {string} sMarkName Name of the performance mark.
     * @param {object} oConfigMarks A configuration object to select the correct mark in case of several measurements for the same ID.
     * @param {boolean} oConfigMarks.bUseUniqueMark Whether to use only one measurement per mark.
     * @param {boolean} oConfigMarks.bUseLastMark Only used if "bUseUniqueMArk" is true.
     *   If true, use the _last_ measurement for a given mark; if falsy, use the first.
     */
    utils.setPerformanceMark = function (sMarkName, oConfigMarks) {
        if (performance && performance.mark) {
            // check if the config object exists and create an empty one if not the case
            if (!oConfigMarks) {
                oConfigMarks = {};
            }
            if (oConfigMarks.bUseUniqueMark) {
                if (oConfigMarks.bUseLastMark) {
                    // use only the new mark, erase any old ones
                    performance.clearMarks(sMarkName);
                } else if (performance.getEntriesByName(sMarkName, "mark").length > 0) {
                    // if a mark exists, ignore subsequent measurements
                    return;
                }
            }
            performance.mark(sMarkName);
        }
    };

    /**
     * Allows to safely set a performance measure via native "window.performance" browser API and evaluated by performance test tools.
     *
     * @param {string} sMeasureName Name of the performance measure.
     * @param {string} sStartingMark Name of the performance mark that starts the measure.
     * @param {string} sEndMark Name of the performance mark that ends the measure.
     */
    utils.setPerformanceMeasure = function (sMeasureName, sStartingMark, sEndMark) {
        if (performance && performance.measure && sStartingMark && sEndMark) {
            performance.measure(sMeasureName, sStartingMark, sEndMark);
        }
    };

    /**
     * Creates an <code>Error</code> object and logs the error message immediately.
     * Class representing an error that is written to the log.
     *
     * @param {string} sMessage The error message.
     * @param {string} [sComponent] The error component to log.
     * @class
     * @private
     * @since 1.15.0
     */
    utils.Error = function (sMessage, sComponent) {
        this.name = "sap.ushell.utils.Error";
        this.message = sMessage;
        Log.error(sMessage, null, sComponent);
    };

    utils.Error.prototype = new Error();

    /**
     * Wrapper for "localStorage.setItem()" including exception handling caused by exceeding storage quota limits
     * or exception is always thrown (safari private browsing mode).
     *
     * @param {string} sKey The key for the storage entry.
     * @param {string} sValue The value for the storage entry.
     * @param {boolean} [bLocalEvent=false] When true, the storage event is also fired for the source window.
     * @since 1.21.2
     * @private
     */
    utils.localStorageSetItem = function (sKey, sValue, bLocalEvent) {
        let oEvent;
        try {
            localStorage.setItem(sKey, sValue);
            if (bLocalEvent) {
                oEvent = document.createEvent("StorageEvent");
                // events are fired only if "setItem()" works
                // to decouple this (for eventing to the same window), provide a wrapper for "localStorage.getItem()" and ".removeItem()"
                oEvent.initStorageEvent("storage", false, false, sKey, "", sValue, "", localStorage);
                dispatchEvent(oEvent);
            }
        } catch (e) {
            Log.warning("Error calling localStorage.setItem(): " + e, null, "sap.ushell.utils");
        }
    };

    /**
     * Getter for <code>localStorage</code> to facilitate testing.
     *
     * @returns {Storage} The local storage instance.
     * @private
     * @since 1.34.0
     */
    utils.getLocalStorage = function () {
        return window.localStorage;
    };

    /**
     * Calls window.localStorage.getItem with sKey as key.
     *
     * @param {string} sKey Key to read the value from local storage.
     * @returns {string} Value from the localStorage.
     * @private
     * @since 1.58.0
     */
    utils.getLocalStorageItem = function (sKey) {
        return window.localStorage.getItem(sKey);
    };

    /**
     * Returns a unique ID based on "sap/base/util/uid".
     *
     * @param {function|object[]} vTestCondition An array of all existing IDs or a function that checks if the new generated ID is unique.
     *   In case of an array, "generateUniqueId" will generate new IDs until it finds a unique one.
     *   In case of a function, it will be called with every generated ID;
     *   the function shall check if the generated ID is unique and shall return true in that case.
     * @returns {string} A unique ID which passed the "fnCheckId" test.
     * @private
     * @since 1.42.0
     */
    utils.generateUniqueId = function (vTestCondition) {
        let sUniqueId,
            aExistingIds,
            fnIsUniqueId;

        if (Array.isArray(vTestCondition)) {
            aExistingIds = vTestCondition;

            fnIsUniqueId = function (sGeneratedId) {
                return aExistingIds.indexOf(sGeneratedId) === -1;
            };
        } else {
            fnIsUniqueId = vTestCondition;
        }

        do {
            sUniqueId = utils._getUid();
        } while (!fnIsUniqueId(sUniqueId)); // accepts falsy values

        return sUniqueId;
    };

    /**
     * Use to generate the uid based on the "sap/base/utils/uid".
     *
     * @returns {string} Generated uid.
     * @private
     */
    utils._getUid = function () {
        return uid();
    };

    /**
     * No redirect happens for a demo platform logout, but a reload is made to ensure the progress indicator is gone.
     * Used e.g. in ContainerAdapter as part of the local platform and in the cdm ContainerAdapter.
     *
     * @private
     * @since 1.34.0
     */
    utils.reload = function () {
        location.reload();
    };

    /**
     * Given a link tag (HTML "a") or a window object, calculates the origin (protocol, host, port)
     * especially for cases where the ".origin" property is not present on the DOM Member (IE11).
     *
     * @param {object} oDomObject A location bearing object, e.g. a link-tag DOMObject or a window.
     * @returns {string} The "protocol://host:port". The port might be absent.
     *   Examples: "http://www.sap.com:8080" or "https://somesubdomain.sap.com".
     * @private
     */
    utils.calculateOrigin = function (oDomObject) {
        let oURI;
        if (oDomObject.origin) {
            return oDomObject.origin;
        }
        if (oDomObject.protocol && oDomObject.hostname) {
            return oDomObject.protocol + "//" + oDomObject.hostname + (oDomObject.port ? ":" + oDomObject.port : "");
        }
        if (oDomObject.href) {
            oURI = new URI(oDomObject.href);
            // beware, URI does not treat ":" as part of the protocol
            return oURI.protocol() + "://" + oURI.hostname() + (oURI.port() ? ":" + oURI.port() : "");
        }
        return undefined;
    };

    /**
     * Exposes a private "epcm" object used for the NWBC for Desktop integration.
     *
     * @returns {object} A native browser object.
     * @private
     */
    utils.getPrivateEpcm = function () {
        if (window.external && window.external && typeof window.external.getPrivateEpcm !== "undefined") {
            return window.external.getPrivateEpcm();
        }
        return undefined;
    };

    /**
     * Detects whether the browser can open WebGui applications natively.
     *
     * This is expected to happen from NWBC Version 6 onwards.
     *
     * NWBC exposes a feature bit vector via the "getNwbcFeatureBits" method of the private "epcm" object.
     * This is expected to be a string in hex format representing 4 bits,
     * where the least significant bit represents native navigation capability.
     *
     * For example: "B" = 1011, last bit is 1, therefore native navigation capability is enabled.
     *
     * @returns {boolean} Whether the browser can open SapGui applications natively.
     */
    utils.hasNativeNavigationCapability = function () {
        return utils.isFeatureBitEnabled(1);
    };

    /**
     * Determine the shell type considering NWBC
     * Version 6.0+ client case.
     *
     * @returns {string}
     *   the shell type ("NWBC" or "FLP"), based on whether NWBC v6.0+
     *   Client is detected.
     */
    utils.getShellType = function () {
        return utils.isFeatureBitEnabled(1) ? "NWBC" : "FLP";
    };

    /**
     * Detects whether NWBC can logout natively.
     *
     * NWBC exposes a feature bit vector via the "getNwbcFeatureBits" method of the private "epcm" object.
     * This is expected to be a string in hex format representing 4 bits,
     * where the second least significant bit represents native logout capability.
     *
     * For example: "B" = 1011, second last bit is 1, therefore native logout capability is enabled.
     *
     * @returns {boolean} Whether the browser can logout natively.
     */
    utils.hasNativeLogoutCapability = function () {
        return utils.isFeatureBitEnabled(2);
    };

    /**
     * Detects whether NWBC can accept the navigation mode parameter.
     *
     * NWBC exposes a feature bit vector via the "getNwbcFeatureBits" method of the private "epcm" object.
     * This is expected to be a string in hex format representing 4 bits,
     * where the second most significant bit represents the capability to accept the navigation mode parameter.
     *
     * For example: "B" = 1011, the second most significant is 0,
     * therefore the capability to accept the navigation mode parameter is not enabled.
     *
     * @returns {boolean} Whether NWBC can accept the navigation mode parameter.
     */
    utils.hasNavigationModeCapability = function () {
        return utils.isFeatureBitEnabled(4);
    };

    /**
     * Detects whether NWBC can be notified that the Container and its services are ready to be used.
     *
     * NWBC exposes a feature bit vector via the "getNwbcFeatureBits" method of the private "epcm" object.
     * This is expected to be a string in hex format representing 4 bits,
     * where the most significant bit represents the FLP ready notification capability.
     *
     * For example: "B" = 1011, the most significant bit is 1, therefore the FLP ready notification capability is enabled.
     *
     * @returns {boolean} Whether NWBC can be notified that the Container and its services are ready to be used.
     */
    utils.hasFLPReadyNotificationCapability = function () {
        return utils.isFeatureBitEnabled(8);
    };

    /**
     * Detects whether NWBC can be notified that the Container and its services are ready to be used
     * and NWBC also supports the using of FLP interface for calling some FLP apis exposed to it via interface.
     *
     * NWBC exposes a feature bit vector via the "getNwbcFeatureBits" method of the private "epcm" object.
     * This is expected to be a string in hex format representing 4 bits,
     * where the most significant bit represents the FLP ready notification capability.
     *
     * For example: "B" = 1011, the most significant bit is 1, therefore the FLP ready notification capability is enabled.
     *
     * @returns {boolean} Whether NWBC can be notified that the Container and its services are ready to be used.
     */
    utils.hasFLPReady2NotificationCapability = function () {
        return utils.isFeatureBitEnabled(16);
    };

    /**
     * Determines whether a certain NWBC feature is enabled using the NWBC feature bit vector.
     *
     * @param {int} iFeatureBit The position of the feature bit to check, starting from the rightmost bit of the NWBC feature bit vector.
     * @returns {boolean} Whether the feature bit is enabled or not.
     */
    utils.isFeatureBitEnabled = function (iFeatureBit) {
        let sFeaturesHex = "0",
            oPrivateEpcm;

        // try to get the feature version number
        oPrivateEpcm = utils.getPrivateEpcm();
        if (oPrivateEpcm) {
            try {
                sFeaturesHex = oPrivateEpcm.getNwbcFeatureBits();
                Log.debug("Detected epcm getNwbcFeatureBits returned feature bits: " + sFeaturesHex);
            } catch (e) {
                Log.error("failed to get feature bit vector via call getNwbcFeatureBits on private epcm object", e.stack, "sap.ushell.utils");
            }
        }
        return (parseInt(sFeaturesHex, 16) & iFeatureBit) > 0;
    };

    /**
     * Determines whether the given application type is to be embedded in an iframe (like GUI or NWBC-wrapped WDA applications).
     *
     * @param {string} sApplicationType The type of the application.
     * @param {boolean} bWDA Whether the application is a WDA application.
     * @returns {boolean} Whether the ApplicationType is to be rendered embedded into an iframe
     *   and should be able to communicate via postMessage like GUI or WDA applications.
     * @private
     */
    utils.isApplicationTypeEmbeddedInIframe = function (sApplicationType, bWDA) {
        return sApplicationType === "NWBC" || sApplicationType === "TR" || sApplicationType === "WCF" ||
            (bWDA === true && sApplicationType === "WDA");
    };

    /**
     * Determines whether the given application type represents a legacy app.
     *
     * @param {string} sType The type of the application.
     * @param {string} sFramework The type of the application when in runs in BTP
     * @param {boolean} bGuiVariantsOnly check only GUI applications types.
     * @returns {boolean} Whether the ApplicationType is with legacy.
     * @private
     */
    utils.isSAPLegacyApplicationType = function (sType, sFramework, bGuiVariantsOnly) {
        let arrTypes = bGuiVariantsOnly === true ? ["TR", "GUI", "NWBC"] : ["TR", "GUI", "NWBC", "WDA", "WCF"];
        return arrTypes.includes(sType) || arrTypes.includes(sFramework);
    };

    /**
     * Determines whether the given application type is TR.
     *
     * @param {string} sType The type of the application.
     * @param {string} sFramework The type of the application when in runs in BTP
     * @returns {boolean} Whether the ApplicationType is TR.
     * @private
     */
    utils.isTRApplicationType = function (sType, sFramework) {
        return sType === "TR" || sFramework === "TR";
    };

    /**
     * Extract the app state parameters from the given url
     *
     * @param {string} sUrl The URL
     * @returns {object} object containing an array of the url parameters names and an array of the key values
     * @private
     */
    utils.getParamKeys = function (sUrl) {
        let aAppStateKeysArray = [],
            aAppStateNamesArray = [],
            aParams;

        if (sUrl.indexOf("sap-intent-param=") > 0) {
            aParams = /(?:sap-intent-param=)([^&/]+)/.exec(sUrl);
            if (aParams && aParams.length === 2) {
                aAppStateNamesArray.push("sap-intent-param-data");
                aAppStateKeysArray.push(aParams[1]);
            }
        }

        if (sUrl.indexOf("sap-xapp-state=") > 0) {
            aParams = /(?:sap-xapp-state=)([^&/]+)/.exec(sUrl);
            if (aParams && aParams.length === 2) {
                aAppStateNamesArray.push("sap-xapp-state-data");
                aAppStateKeysArray.push(aParams[1]);
            }
        } else if (sUrl.indexOf("sap-xapp-state-data=") > 0) {
            aParams = /(?:sap-xapp-state-data=)([^&/]+)/.exec(sUrl);
            if (aParams && aParams.length === 2) {
                try {
                    let sDecodedParam = decodeURIComponent(aParams[1]);
                    aAppStateNamesArray.push("sap-xapp-state-data");
                    aAppStateKeysArray.push(sDecodedParam);
                } catch (error) {
                    Log.error("Invalid encoding of the sap-xapp-state-data parameter in the url: ", aParams[1]);
                }
            }
        }

        if (sUrl.indexOf("sap-iapp-state=") > 0) {
            aParams = /(?:sap-iapp-state=)([^&/]+)/.exec(sUrl);
            if (aParams && aParams.length === 2) {
                aAppStateNamesArray.push("sap-iapp-state-data");
                aAppStateKeysArray.push(aParams[1]);
            }
        }

        return {
            aAppStateNamesArray: aAppStateNamesArray,
            aAppStateKeysArray: aAppStateKeysArray
        };
    };

    /**
     * Appends a "sap-shell" parameter to the given URL to indicate the FLP version to legacy applications.
     * This method should be called only when it is necessary to add the sap-shell parameter to the URL.
     *
     * @param {string} sUrl The URL to be amended.
     * @param {string} sApplicationType The application type for the given URL.
     * @param {string} sVersion The UI5 version.
     *
     * @returns {string} The URL where the parameter should be appended to.
     * @private
     */
    utils.appendSapShellParamSync = function (sUrl, sApplicationType, sVersion) {
        let sUrlSuffix = sApplicationType === "TR" ? "" : "-NWBC";
        if (sVersion) {
            // we pass it either completely or not at all
            sUrl += sUrl.indexOf("?") >= 0 ? "&" : "?"; // FIXME: This is a bug.
            sUrl += "sap-shell=" + encodeURIComponent("FLP" + sVersion + sUrlSuffix);
        }
        return sUrl;
    };

    /**
     * Appends a "sap-shell" parameter to the given URL to indicate the FLP version to legacy applications.
     * This method should be called only when it is necessary to add the sap-shell parameter to the URL.
     *
     * @param {string} sUrl The URL to be amended.
     * @param {string} sApplicationType The application type for the given URL.
     *
     * @returns {Promise<string>} The URL where the parameter should be appended to.
     * @private
     * @since 1.119.0
     */
    utils.appendSapShellParam = async function (sUrl, sApplicationType) {
        const sUrlSuffix = sApplicationType === "TR" ? "" : "-NWBC";
        const sVersion = await utils.getUi5Version();
        if (sVersion) {
            // we pass it either completely or not at all
            sUrl += sUrl.indexOf("?") >= 0 ? "&" : "?"; // FIXME: This is a bug.
            sUrl += "sap-shell=" + encodeURIComponent("FLP" + sVersion + sUrlSuffix);
        }
        return sUrl;
    };

    /**
     * Exclude non-relevant url parameters from a legacy applications url to be opened.
     *
     * @param {string} sUrl The URL to be checked.
     * @returns {string} The URL without the non-relevant parameters.
     * @private
     */
    utils.filterOutParamsFromLegacyAppURL = function (sUrl) {
        //These params should be excluded from the URL for WDA & WebGUI apps
        let URL_PARAMS_FILTER = ["sap-ach", "sap-fiori-id", "sap-hide-intent-link", "sap-priority", "sap-tag",
            "sap-ui-app-id-hint", "sap-ui-debug", "sap-ui-fl-control-variant-id", "sap-ui-fl-max-layer",
            "sap-ui-tech-hint", "sap-ui2-tcode", "sap-ui2-wd-app-id", "sap-ui2-wd-conf-id", "sap-ushell-cdm-site-url",
            "sap-ushell-navmode", "sap-ushell-next-navmode", "sap-ushell-url", "sap-app-origin-hint"];

        let uri = new URI(sUrl);
        uri = uri.removeSearch(URL_PARAMS_FILTER);
        return uri.toString();
    };

    /**
     * Get the iframe policies FLP allows iframes to access
     *
     * @returns {string} list of iframe policies.
     * @private
     */
    utils.getIframeFeaturePolicies = function () {
        return "autoplay;battery;camera;display-capture;geolocation;gyroscope;magnetometer;microphone;midi;clipboard-write;clipboard-read;fullscreen;serial;";
    };

    /**
     *  this function maches semantic versions in the following forms:
     *  - d
     *  - d.d
     *  - d.d.d
     *
     * @param {string} sVersion - version as string
     * @returns {string} version - major version is returned
     */
    function _extractUi5Version (sVersion) {
        // reggex explained in jsdoc
        let oMatch = /\d+(\.\d+){0,2}/.exec(sVersion);
        if (oMatch && oMatch[0]) {
            return oMatch[0];
        }
        return undefined;
    }

    /**
     * Returns the current UI5 version e.g. "1.119.0"
     * @returns {Promise<string>} the UI5 version
     * @since 1.119.0
     * @private
     */
    utils.getUi5Version = function () {
        return new Promise(function (resolve, reject) {
            sap.ui.require(["sap/ui/VersionInfo"], function (VersionInfo) {
                VersionInfo.load()
                    .then(function (oVersionInfo) {
                        resolve(_extractUi5Version(oVersionInfo.version));
                    })
                    .catch(function () {
                        Log.error("UI5 version could not be determined.");
                        resolve("");
                    });
            });
        });
    };

    /**
     * Determines whether the input "oResolvedNavigationTarget" represents a WebGui application that can be navigated natively by the browser.
     *
     * @param {object} oResolvedNavigationTarget The resolution result. Contains at least the "applicationType" property.
     * @returns {boolean} true if the resolution result represents a response which is to be treated by the Fiori Desktop client.
     * @private
     */
    utils.isNativeWebGuiNavigation = function (oResolvedNavigationTarget) {
        let sApplicationType = ObjectPath.get("applicationType", oResolvedNavigationTarget);
        let bNativeNWBCNavigation = ObjectPath.get("appCapabilities.nativeNWBCNavigation", oResolvedNavigationTarget);

        if (this.hasNativeNavigationCapability() && (sApplicationType === "TR" || bNativeNWBCNavigation)) {
            return true;
        }
        return false;
    };

    /**
     * A mapping from arbitrary string (!) keys (including "get" or "hasOwnProperty") to values of any type.
     * Creates an empty map.
     *
     * @class
     * @since 1.15.0
     */
    utils.Map = function () {
        this.entries = {};
    };

    /**
     * Associates the specified value with the specified key in this map.
     * If the map previously contained a mapping for the key, the old value is replaced by the specified value.
     * Returns the old value.
     * Note: It might be a good idea to assert that the old value is <code>undefined</code> in case you expect your keys to be unique.
     *
     * @param {string} sKey Key with which the specified value is to be associated.
     * @param {any} vValue Value to be associated with the specified key.
     * @returns {any} The old value.
     * @since 1.15.0
     */
    utils.Map.prototype.put = function (sKey, vValue) {
        let vOldValue = this.get(sKey);
        this.entries[sKey] = vValue;
        return vOldValue;
    };

    /**
     * Returns <tt>true</tt> if this map contains a mapping for the specified key.
     *
     * @param {string} sKey Key whose presence in this map is to be tested
     * @returns {boolean} true if this map contains a mapping for the specified key.
     * @since 1.15.0
     */
    utils.Map.prototype.containsKey = function (sKey) {
        if (typeof sKey !== "string") {
            throw new utils.Error("Not a string key: " + sKey, "sap.ushell.utils.Map");
        }
        return Object.prototype.hasOwnProperty.call(this.entries, sKey);
    };

    /**
     * Returns the value to which the specified key is mapped, or <code>undefined</code> if this map contains no mapping for the key.
     *
     * @param {string} sKey The key whose associated value is to be returned.
     * @returns {any} The value to which the specified key is mapped, or <code>undefined</code> if this map contains no mapping for the key.
     * @since 1.15.0
     */
    utils.Map.prototype.get = function (sKey) {
        if (this.containsKey(sKey)) {
            return this.entries[sKey];
        }
    };

    /**
     * Returns an array of this map's keys. This array is a snapshot of the map;
     * concurrent modifications of the map while iterating do not influence the sequence.
     *
     * @returns {string[]} This map's keys.
     * @since 1.15.0
     */
    utils.Map.prototype.keys = function () {
        return Object.keys(this.entries);
    };

    /**
     * Removes a key together with its value from the map.
     *
     * @param {string} sKey The map's key to be removed.
     * @since 1.17.1
     */
    utils.Map.prototype.remove = function (sKey) {
        delete this.entries[sKey];
    };

    /**
     * Returns this map's string representation.
     *
     * @returns {string} This map's string representation.
     * @since 1.15.0
     */
    utils.Map.prototype.toString = function () {
        let aResult = ["sap.ushell.utils.Map("];
        aResult.push(JSON.stringify(this.entries));
        aResult.push(")");
        return aResult.join("");
    };

    /**
     * Returns the parameter value of a boolean:
     * - "X", "x", "true", and all casing variations are true;
     * - "false", "", and all casing variations are false;
     * - anything else not specified here returns undefined.
     *
     * @param {string} sParameterName The name of the parameter to look for, case sensitive.
     * @param {string} [sParams] Specified parameter (search string). If omitted, search part of current URL is used.
     * @returns {boolean} true, false, or undefined.
     */
    utils.getParameterValueBoolean = function (sParameterName, sParams) {
        let oUriParameters = new URLSearchParams(sParams || window.location.search),
            aArr = oUriParameters.getAll(sParameterName),
            aTruthy = ["true", "x"],
            aFalsy = ["false", ""],
            sValue;
        if (!aArr || aArr.length === 0) {
            return undefined;
        }
        sValue = aArr[0].toLowerCase();
        if (aTruthy.indexOf(sValue) >= 0) {
            return true;
        }
        if (aFalsy.indexOf(sValue) >= 0) {
            return false;
        }
        return undefined;
    };

    /**
     * Calls the given success handler (a)synchronously.
     * Errors thrown in the success handler are caught and the error message is reported to the error handler;
     * if an error stack is available, it is logged.
     *
     * @param {function} fnSuccess Success handler.
     * @param {function(string)} [fnFailure] Error handler. Takes an error message. MUST NOT throw any errors itself.
     * @param {boolean} [bAsync=false] Whether the call shall be asynchronous.
     * @since 1.28.0
     */
    utils.call = function (fnSuccess, fnFailure, bAsync) {
        let sMessage;

        if (bAsync) {
            setTimeout(function () {
                utils.call(fnSuccess, fnFailure, false);
            }, 0);
            return;
        }

        try {
            fnSuccess();
        } catch (e) {
            sMessage = e.message || e.toString();
            Log.error("Call to success handler failed: " + sMessage,
                e.stack, // may be undefined: supported in Chrome, FF; not supported in Safari, IE
                "sap.ushell.utils");
            if (fnFailure) {
                fnFailure(sMessage);
            }
        }
    };

    /**
     * Sets Tiles visibility using the Visibility contract, according to the viewport position.
     */
    utils.handleTilesVisibility = function () {
        utils.getVisibleTiles();
    };

    /**
     * Refreshes visible Dynamic Tiles.
     */
    utils.refreshTiles = function () {
        EventBus.getInstance().publish("launchpad", "refreshTiles");
    };

    /**
     * Sets Tiles as not visible using the Visibility contract.
     * The affected tiles are only the visible tiles according to the viewport position.
     * This action happens immediately with no timers or timeouts.
     *
     * This method is currently used upon navigation (i.e. Shell.controller - openApp) as there is logic running in the background
     * such as OData count calls of the dynamic tiles which are still visible at navigation (as no one had marked it otherwise).
     */
    utils.setTilesNoVisibility = function () {
        EventBus.getInstance().publish("launchpad", "setTilesNoVisibility");
    };

    utils.validHash = function (hash) {
        return (hash && hash.constructor === String && hash.trim() !== "");
    };

    /**
     * Gets the device's form factor. Based on <code>sap.ui.Device.system</code> from SAPUI5.
     *
     * @returns {string} The device's form factor ("desktop", "tablet" or "phone").
     * @since 1.25.1
     */
    utils.getFormFactor = function () {
        let oSystem = Device.system;

        if (oSystem.desktop) {
            return oSystem.SYSTEMTYPE.DESKTOP;
        }
        if (oSystem.tablet) {
            return oSystem.SYSTEMTYPE.TABLET;
        }
        if (oSystem.phone) {
            return oSystem.SYSTEMTYPE.PHONE;
        }
        return undefined;
    };

    /**
     * Iterates over all Tiles and mark each one as visible or non-visible according to the viewport position.
     *
     * @returns {object[]} Tile objects, each one including the flag "isDisplayedInViewPort" indicating its visibility.
     */
    utils.getVisibleTiles = function () {
        let nWindowHeight = document.body.clientHeight;
        let oControl = Element.getElementById("dashboardGroups");
        let oNavContainer = Element.getElementById("viewPortContainer");
        let shellHdrHeight = 0;
        let aTiles = [];
        let aVisibleTiles = [];
        let oEventBus = EventBus.getInstance();
        let groupsIndex,
            tilesIndex,
            aElementsInd,
            group,
            groupTiles,
            groupLinks,
            oTile,
            tileDomRef,
            tileOffset,
            tileTop,
            tileBottom,
            aGrpDomElement,
            bIsInDashBoard,
            aGroups,
            oElementsByType,
            oElements,
            isDisplayedInViewPort;
        // in case of user move to new tab
        if (window.document.hidden) {
            oEventBus.publish("launchpad", "onHiddenTab");
        }

        if (oControl && oControl.getGroups() && oNavContainer) {
            // verify we are in the dashboard page
            aGrpDomElement = jQuery(oControl.getDomRef());
            bIsInDashBoard = aGrpDomElement ? aGrpDomElement.is(":visible") : false;
            aGroups = oControl.getGroups();

            // loop over all Groups
            for (groupsIndex = 0; groupsIndex < aGroups.length; groupsIndex = groupsIndex + 1) {
                group = aGroups[groupsIndex];
                groupTiles = group.getTiles();
                groupLinks = group.getLinks();

                oElementsByType = [groupTiles, groupLinks];
                for (aElementsInd = 0; aElementsInd < oElementsByType.length; aElementsInd++) {
                    oElements = oElementsByType[aElementsInd];

                    if (oElements) {
                        // loop over all Tiles in the current Group
                        for (tilesIndex = 0; tilesIndex < oElements.length; tilesIndex++) {

                            oTile = oElements[tilesIndex];

                            if (!bIsInDashBoard || window.document.hidden) {
                                // if current state is not dashboard ("Home"), set not visible
                                aTiles.push(oTile);
                            } else {
                                tileDomRef = jQuery(oTile.getDomRef());
                                tileOffset = tileDomRef.offset();

                                if (tileOffset) {
                                    tileTop = tileDomRef.offset().top;
                                    tileBottom = tileTop + tileDomRef.height();

                                    // if the Tile is located above or below the viewport
                                    isDisplayedInViewPort = group.getVisible() && (tileBottom > shellHdrHeight - 300) && (tileTop < nWindowHeight + 300);

                                    if (isDisplayedInViewPort) {
                                        aVisibleTiles.push({
                                            oTile: utils.getTileModel(oTile),
                                            iGroup: groupsIndex,
                                            bIsExtanded: !(tileBottom > shellHdrHeight) || !(tileTop < nWindowHeight)
                                        });
                                    } else if (aVisibleTiles.length > 0) {
                                        oEventBus.publish("launchpad", "visibleTilesChanged", aVisibleTiles);
                                        return aTiles;
                                    }
                                    aTiles.push(oTile);
                                }
                            }
                        }
                    }
                }
            }
        }

        if (aVisibleTiles.length > 0) {
            oEventBus.publish("launchpad", "visibleTilesChanged", aVisibleTiles);
        }

        return aTiles;
    };

    utils.getTileModel = function (ui5TileObject) {
        let bindingContext;
        if (ui5TileObject.isA("sap.ui.integration.widgets.Card")) {
            bindingContext = ui5TileObject.getBindingContext("ushellCardModel");
        } else {
            bindingContext = ui5TileObject.getBindingContext();
        }
        return bindingContext.getObject() ? bindingContext.getObject() : null;
    };

    utils.getTileObject = function (ui5TileObject) {
        let bindingContext;
        if (ui5TileObject.isA("sap.ui.integration.widgets.Card")) {
            bindingContext = ui5TileObject.getBindingContext("ushellCardModel");
        } else {
            bindingContext = ui5TileObject.getBindingContext();
        }
        return bindingContext.getObject() ? bindingContext.getObject().object : null;
    };

    utils.recalculateBottomSpace = function () {
        let jqContainer = jQuery("#dashboardGroups").find(".sapUshellTileContainer:visible"),
            lastGroup = jqContainer.last(),
            headerHeight = jQuery(".sapUshellShellHead > header").height(),
            lastGroupHeight = lastGroup.parent().height(),
            groupTitleMarginTop = parseInt(lastGroup.find(".sapUshellContainerTitle").css("margin-top"), 10),
            groupsContainerPaddingBottom = parseInt(jQuery(".sapUshellDashboardGroupsContainer").css("padding-bottom"), 10),
            nBottomSpace;

        if (jqContainer.length === 1) {
            nBottomSpace = 0;
        } else {
            nBottomSpace = jQuery(window).height() - headerHeight - lastGroupHeight - groupTitleMarginTop - groupsContainerPaddingBottom;
            nBottomSpace = (nBottomSpace < 0) ? 0 : nBottomSpace;
        }

        // add margin to the bottom of the screen in order to allow the lower TileContainer (in case it is chosen) to be shown on the top of the viewport
        jQuery(".sapUshellDashboardGroupsContainer").css("margin-bottom", nBottomSpace + "px");
    };

    utils.calcVisibilityModes = function (oGroup, personalization) {
        let bIsVisibleInNormalMode = true,
            bIsVisibleInActionMode = true,
            aLinks = oGroup.pendingLinks && oGroup.pendingLinks.length ? oGroup.pendingLinks : oGroup.links,
            hasVisibleTiles = utils.groupHasVisibleTiles(oGroup.tiles, aLinks);

        if (!hasVisibleTiles && (!personalization || (oGroup.isGroupLocked) || (oGroup.isDefaultGroup) || Device.system.phone || (Device.system.tablet && !Device.system.desktop))) {
            bIsVisibleInNormalMode = false;
        }

        if (!hasVisibleTiles && !personalization) {
            bIsVisibleInActionMode = false;
        }

        return [bIsVisibleInNormalMode, bIsVisibleInActionMode];
    };

    utils.groupHasVisibleTiles = function (groupTiles, groupLinks) {
        let visibleTilesInGroup = false,
            tileIndex,
            tempTile,
            tiles = !groupTiles ? [] : groupTiles,
            links = !groupLinks ? [] : groupLinks;

        tiles = tiles.concat(links);

        if (!tiles.length) {
            return false;
        }

        for (tileIndex = 0; tileIndex < tiles.length; tileIndex = tileIndex + 1) {
            tempTile = tiles[tileIndex];
            // check if the Tile is visible on the relevant device
            if (tempTile.isTileIntentSupported) {
                visibleTilesInGroup = true;
                break;
            }
        }
        return visibleTilesInGroup;
    };

    /**
     * Calls the handler with the provided list of arguments
     * simple case:
     *   aArguments=[a,b,c] => fnFunction(a,b,c)
     *   returns <return value of call>
     *
     * complex case:
     *   aArguments=[[
     *     [a,b,c],    // => fnFunction(a,b,c)
     *     [d,e,f],    // => fnFunction(d,e,f)
     *     [g,h,i]     // => fnFunction(g,h,i)
     *   ]]
     *   returns [
     *     [<return value of first call>],
     *     [<return value of second call>]
     *     [<return value of third call>]
     *   ]
     *
     * edge case:
     *   aArguments=[[]] => no call
     *   returns []
     *
     * @param {function} fnFunction The function to call
     * @param {object[]} aArguments A list of arguments or a list of calls with their arguments
     * @returns {jQuery.Promise} Resolves once all handlers are done.
     */
    utils.invokeUnfoldingArrayArguments = function (fnFunction, aArguments) {
        let that = this,
            aArgArray,
            oDeferred,
            aPromises,
            aRes,
            thePromise;

        if (!Array.isArray(aArguments[0])) {
            return fnFunction.apply(this, aArguments);
        }

        aArgArray = aArguments[0];
        if (aArgArray.length === 0) {
            return new jQuery.Deferred().resolve([]).promise();
        }

        oDeferred = new jQuery.Deferred();
        aPromises = [];
        aRes = [];
        thePromise = new jQuery.Deferred().resolve();

        aArgArray.forEach(function (nThArgs, iIndex) {
            if (!Array.isArray(nThArgs)) {
                let sErrorMsg = "Expected Array as nTh Argument of multivalue invocation: "
                    + "first Argument must be array of array of arguments: single valued f(p1,p2), f(p1_2,p2_2), f(p1_3,p2_3) : "
                    + "multivalued : f([[p1,p2],[p1_2,p2_2],[p1_3,p2_3]]";
                Log.error(sErrorMsg);
                throw new Error(sErrorMsg);
            }
            // nThArgs is an array of the arguments
            let pr = fnFunction.apply(that, nThArgs),
                pr2 = new jQuery.Deferred();

            pr.done(function () {
                let a = Array.prototype.slice.call(arguments);
                aRes[iIndex] = a;
                pr2.resolve();
            }).fail(pr2.reject.bind(pr2));
            aPromises.push(pr2.promise());
            thePromise = jQuery.when(thePromise, pr2);
        });

        jQuery.when.apply(jQuery, aPromises).done(function () {
            oDeferred.resolve(aRes);
        }).fail(function () {
            oDeferred.reject("failure");
        });

        // invoke directly
        return oDeferred.promise();
    };

    utils._getCurrentDate = function () {
        return new Date();
    };

    utils._convertToUTC = function (date) {
        return Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
            date.getUTCHours(),
            date.getUTCMinutes(),
            date.getUTCSeconds(),
            date.getUTCMilliseconds()
        );
    };

    /**
     * Formats the date to easy human readable format.
     * Requires the consuming module to require sap/ushell/resources before usage!
     * @param {string} sCreatedAt a stringified date
     * @returns {string} The formatted date e.g. 'Just now' or '10 minutes ago'
     *
     * @private
     */
    utils.formatDate = function (sCreatedAt) {
        let iCreatedAt,
            iNow,
            iTimeGap,
            iDays,
            iHours,
            iMinutes;

        let ushellResources = sap.ui.require("sap/ushell/resources");
        // Module probe might fail. Consumer has to require the module before usage
        if (!ushellResources) {
            throw new Error("sap/ushell/resources was not required before utils.formatDate usage!");
        }

        iCreatedAt = utils._convertToUTC(new Date(sCreatedAt));
        iNow = utils._convertToUTC(utils._getCurrentDate());
        iTimeGap = iNow - iCreatedAt;
        iDays = parseInt(iTimeGap / (1000 * 60 * 60 * 24), 10);
        if (iDays > 0) {
            if (iDays === 1) {
                return ushellResources.i18n.getText("time_day", [iDays]);
            }
            return ushellResources.i18n.getText("time_days", [iDays]);
        }
        iHours = parseInt(iTimeGap / (1000 * 60 * 60), 10);
        if (iHours > 0) {
            if (iHours === 1) {
                return ushellResources.i18n.getText("time_hour", [iHours]);
            }
            return ushellResources.i18n.getText("time_hours", [iHours]);
        }
        iMinutes = parseInt(iTimeGap / (1000 * 60), 10);
        if (iMinutes > 0) {
            if (iMinutes === 1) {
                return ushellResources.i18n.getText("time_minute", [iMinutes]);
            }
            return ushellResources.i18n.getText("time_minutes", [iMinutes]);
        }
        return ushellResources.i18n.getText("just_now");
    };

    /**
     * Navigates to a given set of given arguments using the sap.ushell.services.Navigation#navigate functionality.
     *
     * @param {string} semanticObject The semantic object that should be used as navigation target.
     * @param {string} action  The action that should be used as navigation target.
     * @param {object[]} parameters  The parameters that should be used during the navigation.
     * @returns {Promise<undefined>} A <code>Promise</code> which resolves once the navigation was triggered. The <code>Promise</code> might never reject or resolve
     * when an error occurs during the navigation.
     */
    utils.toExternalWithParameters = function (semanticObject, action, parameters) {
        return new Promise(function (resolve) {
            sap.ui.require(["sap/ushell/Container"], function (Container) {
                return Promise.all([
                    Container.getServiceAsync("URLParsing"),
                    Container.getServiceAsync("Navigation")
                ]).then(function (aResults) {
                    let oURLParsingService = aResults[0];
                    let oNavigationService = aResults[1];
                    let oNavigationArguments = {};

                    // if "&/" is contained in the action, we need to split it into the action and the appSpecificRoute property,
                    // so that it can be appended after the very end of the url after the application parameters.
                    let aActionParts = action.split("&/");
                    if (aActionParts.length > 1) {
                        oNavigationArguments.appSpecificRoute = "&/" + aActionParts[1];
                    }

                    oNavigationArguments.target = {
                        semanticObject: semanticObject,
                        action: aActionParts[0]
                    };

                    // building the parameters object to the navigation action
                    // preparing the navigation parameters according to the notification's data
                    if (parameters && parameters.length > 0) {
                        oNavigationArguments.params = {};
                        parameters.forEach(function (oParameter) {
                            oNavigationArguments.params[oParameter.Key] = oParameter.Value;
                        });
                    }

                    // navigate
                    resolve(oNavigationService.navigate({
                        target: {
                            shellHash: oURLParsingService.constructShellHash(oNavigationArguments)
                        }
                    }));
                });
            });
        });
    };

    /**
     * Moves an element (specified by the index) inside of an array to a new index.
     *
     * @param {object[]} aArray The elements.
     * @param {int} nSourceIndex The index of the element which needs to be moved.
     * @param {int} nTargetIndex The index where to element should be moved to.
     * @returns {object[]} The resulting elements after the move.
     * @throws "Incorrect input parameters passed" if no array or an empty array is provided.
     * @throws "Index out of bounds" if "nTargetIndex" or "nSourceIndex" are out of bounds in the array.
     * @since 1.39.0
     * @public
     */
    utils.moveElementInsideOfArray = function (aArray, nSourceIndex, nTargetIndex) {
        if (!utils.isArray(aArray) || nSourceIndex === undefined || nTargetIndex === undefined) {
            throw new Error("Incorrect input parameters passed");
        }
        if (nSourceIndex >= aArray.length || nTargetIndex >= aArray.length || nTargetIndex < 0 || nSourceIndex < 0) {
            throw new Error("Index out of bounds");
        }

        let oElement = aArray.splice(nSourceIndex, 1)[0];
        aArray.splice(nTargetIndex, 0, oElement);
        return aArray;
    };

    /**
     * Changes an input target object by assigning each property of one or more objects to it.
     *
     * @param {object} oTarget The base object.
     * @param {...object} oSource One or more source objects to extend the target with.
     * @returns {object} The extended target object.
     * @private
     */
    utils.shallowMergeObject = function (oTarget /*, ...rest */) {
        return Array.prototype.slice.call(arguments, 1, arguments.length)
            .map(function (oSource) {
                return {
                    sourceObject: oSource,
                    properties: Object.keys(oSource)
                };
            })
            .reduce(function (oResult, oSource) {
                oSource.properties.forEach(function (sProperty) {
                    oResult[sProperty] = oSource.sourceObject[sProperty];
                });
                return oResult;
            }, oTarget);
    };

    /**
     * Returns the current location href (URL).
     *
     * @returns {string} The current href.
     * @private
     */
    utils.getLocationHref = function () {
        return window.location.href;
    };

    /**
     * Returns the current location search.
     *
     * @returns {string} The current location search.
     * @private
     */
    utils.getLocationSearch = function () {
        return window.location.search;
    };

    /**
     * Reloads the current location
     * @private
     */
    utils.windowLocationReload = function () {
        window.location.reload();
    };

    /**
     * Updates the current location
     *
     * @param {string} url The URL to be assigned as location
     * @private
     */
    utils.windowLocationAssign = function (url) {
        window.location.assign(url);
    };


    /**
     * Generates a key to store or retrieve an item from the storage localStorage or sessionStorage).
     * This key allows to reach the information in the local storage starting from the given ids and prefix.
     * This key should not be parsed to detect prefix and ids.
     *
     * @param {string} sPrefix The key prefix. This prefix may contain #, @, $ characters.
     * @param {string[]} aIds A hierarchy of ids that identify the item to be stored or loaded in/from the storage.
     *   At least one item must be provided in this array when calling this method.
     * @returns {string} The storage key.
     * @private
     */
    utils.generateLocalStorageKey = function (sPrefix, aIds) {
        let iNumIds = aIds.length;
        if (iNumIds === 0) {
            throw new Error("At least one id should be provided when generating the local storage key");
        }

        let sSeparator = "$";
        if (iNumIds === 2) {
            sSeparator = "#";
        } else if (iNumIds > 2) {
            sSeparator = "@" + iNumIds + "@";
        }

        return sPrefix + sSeparator + aIds.join(":");
    };

    /**
     * Combines members of a JavaScript object into a parameter string.
     * Parameters are ordered in an arbitrary manner which might change.
     *
     * @param {object} parameters The parameter object, e.g. <code>{ ABC: [1, "1 2"], DEF: ["4"] }</code>.
     * @param {string} delimiter The parameter delimiter. Default is "&".
     * @param {string} assign The parameter assignment. Default is "=".
     * @returns {string} The result parameter string, e.g. <code>ABC=1&ABC=1%202&DEF=4</code>.
     *   The result is *not* prefixed with a "?". Parameter values are URI encoded.
     * @since 1.63.0
     * @private
     */
    utils.urlParametersToString = function (parameters, delimiter, assign) {
        // Implementation was moved to UrlParsing to resolve circular dependency of modules
        return urlParsing.privparamsToString(parameters, delimiter, assign);
    };

    /**
     * Checks whether the given intent is the configured root intent (apart from its parameters).
     * "#Shell-home" should never be hardcoded as it can be configured.
     *
     * @param {string} sIntent The intent to check, e.g. <code>#Employee-display</code>.
     *   The initial hash fragment is ignored during the check.
     *   For example if <code>#Employee-display</code> matches the root intent, also "Employee-display" does.
     * @returns {boolean} Whether the given intent is the root intent.
     * @throws {Error} When a wrong input parameter is given.
     * @private
     */
    utils.isRootIntent = function (sIntent) {
        if (typeof sIntent !== "string") {
            throw new Error("The given intent must be a string");
        }

        // validate configured intent
        let sRootIntentConfigPath = "renderers.fiori2.componentData.config.rootIntent";
        let sConfiguredIntent = ObjectPath.get(sRootIntentConfigPath, window["sap-ushell-config"]) || "#Shell-home";
        let sRootIntentNoHash = sConfiguredIntent.replace("#", "");
        let sIntentNoHash = sIntent.replace("#", "");
        return sIntentNoHash === "" || sIntentNoHash === sRootIntentNoHash;
    };

    /**
     * Checks whether the given intent is FLP homepage intent (classical or spaces/pages).
     *
     * @param {string} [sIntent] The intent to check, e.g. <code>#Employee-display</code>.
     *    If the intent is empty, the current intent is used for checking.
     * @returns {boolean} Whether the given intent is the FLP home intent.
     * @throws {Error} When a wrong input parameter is given.
     * @private
     */
    utils.isFlpHomeIntent = function (sIntent) {
        if (!sIntent) {
            sIntent = window.location.hash;
            if (!sIntent) {
                sIntent = ObjectPath.get("renderers.fiori2.componentData.config.rootIntent", window["sap-ushell-config"]) || "Shell-home";
            }
        } else if (typeof sIntent !== "string") {
            throw new Error("The given intent must be a string");
        }

        // validate configured intent
        let sIntentNoHash = sIntent.replace("#", "");
        return sIntentNoHash.indexOf("Shell-home") === 0 ||
            sIntentNoHash.indexOf("Launchpad-openFLPPage") === 0 ||
            sIntentNoHash.indexOf("Launchpad-openWorkPage") === 0;
    };

    /**
     * Returns a generated key.
     * This key is suitably random, but it is susceptible to brute force attacks.
     * Storages based on the generated key must not be used for sensitive data.
     *
     * @returns {string} 40 character string consisting of A-Z and 0-9 which can be used as a generated key for personalization container.
     *                   Every invocation returns a new key. Seed of random function is OS Random Seed.
     *
     * @private
     * @since 1.94.0
     */
    utils.generateRandomKey = function () {
        let sChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let sResult = "";
        let aRandomValues = new window.Uint32Array(40);

        window.crypto.getRandomValues(aRandomValues);

        let getRandomAlphaNumeric = function (i) {
            let randomIndex = aRandomValues[i] % sChars.length;
            return sChars[randomIndex];
        };

        while (sResult.length < 40) {
            sResult += getRandomAlphaNumeric(sResult.length);
        }

        return sResult;
    };

    /**
     * Copies text to the clipboard
     * @param {string} sText The text to copy
     * @returns {boolean} whether the copy action was successful or not
     *
     * @private
     * @since 1.100.0
     */
    utils.copyToClipboard = function (sText) {
        let bSuccessful;
        let oTemporaryDomElement = document.createElement("textarea");
        try {
            oTemporaryDomElement.contentEditable = true;
            oTemporaryDomElement.readonly = false;
            oTemporaryDomElement.textContent = sText;
            document.documentElement.appendChild(oTemporaryDomElement);

            oTemporaryDomElement.select();
            document.execCommand("copy");
            bSuccessful = true;
        } catch (oException) {
            bSuccessful = false;
        } finally {
            oTemporaryDomElement.parentNode.removeChild(oTemporaryDomElement);
        }
        return bSuccessful;
    };

    /**
     * Fetches the PersContainer for settings
     * @returns {Promise<object>} Resolves the Personalizer
     *
     * @private
     * @since 1.102.0
     */
    utils._getUserSettingPersContainer = function () {
        return new Promise(function (resolve) {
            sap.ui.require(["sap/ushell/Container"], function (Container) {
                return Container.getServiceAsync("PersonalizationV2").then(function (oPersonalizationService) {
                    let oPersId = {
                        container: "sap.ushell.usersettings.personalization",
                        item: "data"
                    };

                    let oScope = {
                        validity: "Infinity",
                        keyCategory: oPersonalizationService.KeyCategory.GENERATED_KEY,
                        writeFrequency: oPersonalizationService.WriteFrequency.HIGH,
                        clientStorageAllowed: false
                    };
                    resolve(oPersonalizationService.getPersonalizer(oPersId, oScope));
                });
            });
        });
    };

    /**
     * Calculates whether hideEmptySpaces is enabled by evaluating the user setting.
     * Updates the corresponding config value.
     * @returns {Promise<boolean>} Whether hide empty spaces is enabled
     *
     * @private
     * @since 1.102.0
     */
    utils.getHideEmptySpacesEnabled = function () {
        // Unfortunately it cannot be required since this file is used during/before bootstrap.
        return new Promise(function (resolve) {
            sap.ui.require(["sap/ushell/Config"], function (Config) {
                resolve(Config);
            });
        })
            .then(function (Config) {
                let bHideEmptySpacesEnabled = Config.last("/core/spaces/hideEmptySpaces/enabled");
                if (!bHideEmptySpacesEnabled) {
                    return Promise.resolve(false);
                }

                return utils._getUserSettingPersContainer()
                    .then(function (oPersContainer) {
                        return oPersContainer.getPersData();
                    })
                    .then(function (oUserSettings) {
                        let bUserEnabled = (oUserSettings || {}).hideEmptySpaces !== false;

                        if (Config.last("/core/spaces/hideEmptySpaces/userEnabled") !== bUserEnabled) {
                            Config.emit("/core/spaces/hideEmptySpaces/userEnabled", bUserEnabled);
                        }

                        return bUserEnabled;
                    });
            });
    };

    /**
     * Saves the new value to the PersContainer and updates the config.
     * @param {boolean} bHide Whether the user wants to hide empty spaces
     * @returns {Promise} Resolves after new value was saved
     *
     * @private
     * @since 1.102.0
     */
    utils.setHideEmptySpacesEnabled = function (bHide) {
        // Unfortunately it cannot be required earlier since this file is used during/before bootstrap.
        return new Promise(function (resolve) {
            sap.ui.require(["sap/ushell/Config"], function (Config) {
                resolve(Config);
            });
        })
            .then(function (Config) {
                let bHideEmptySpacesEnabled = Config.last("/core/spaces/hideEmptySpaces/enabled");
                if (!bHideEmptySpacesEnabled) {
                    return Promise.resolve();
                }

                return utils._getUserSettingPersContainer()
                    .then(function (oPersContainer) {
                        return oPersContainer.getPersData().then(function (oUserSettings) {
                            oUserSettings = oUserSettings || {};
                            let bOldValue = oUserSettings.hideEmptySpaces !== false;

                            if (bOldValue === !!bHide) {
                                return Promise.resolve();
                            }

                            oUserSettings.hideEmptySpaces = bHide;

                            return oPersContainer.setPersData(oUserSettings).then(function () {
                                Config.emit("/core/spaces/hideEmptySpaces/userEnabled", bHide);
                            });
                        });
                    });
            });
    };

    /**
     * Reduces the delay to the valid maximum
     * setTimeout triggers instantly when the maximum is exceeded.
     * @param {int} iDelay the number to sanitize
     * @returns {int} the sanitized delay
     *
     * @since 1.108.0
     * @private
     */
    utils.sanitizeTimeoutDelay = function (iDelay) {
        if (typeof iDelay !== "number") {
            throw new Error("Invalid type! Expected type 'number'.");
        }
        // setTimeout triggers instantly when overflowing the 32bit integer
        let iMaxDelay = 2147483647; // (2^31 − 1)
        return iDelay > iMaxDelay ? iMaxDelay : iDelay;
    };

    /**
     * Wraps any value in a promise.
     * Works with jQuery Deferred.
     * @param {*} vValue The value to wrap
     * @returns {Promise} The wrapped value
     */
    utils.promisify = function (vValue) {
        if (typeof vValue === "object") {
            if (vValue.done) { // jQuery.Deferred
                return new Promise((resolve, reject) => {
                    vValue
                        .done((...args) => {
                            if (args.length > 1) {
                                Log.warning("jQuery.Deferred provided multiple return values, but only single return values are supported!");
                            }
                            resolve(args[0]);
                        })
                        .fail(reject);
                });
            }
            if (vValue.then) { // native promise
                return vValue;
            }
        }
        return Promise.resolve(vValue);
    };

    /**
     * Wraps the sap.ui.require into a promise
     * @param {string[]} aModuleNames A list of module names
     * @returns {Promise<object[]>} Resolves the list of required modules
     * @private
     * @since 1.119.0
     */
    utils.requireAsync = function (aModuleNames) {
        return new Promise(function (resolve, reject) {
            sap.ui.require(aModuleNames, (...aModules) => {
                resolve(aModules);
            }, reject);
        });
    };

    /**
     * Wraps the setTimeout function into a promise
     * @param {int} [iDelay=0] The delay in milliseconds
     * @returns {Promise} Resolves after the given delay
     *
     * @since 1.129.0
     * @private
     */
    utils.awaitTimeout = function (iDelay = 0) {
        return new Promise(function (resolve) {
            setTimeout(resolve, iDelay);
        });
    };

    /**
     * Requests Theming Parameters in an async way
     * @param {string[]} aNames A list of ThemingParameters names
     * @returns {Promise<string[]>} Resolves the list of requested parameters
     *
     * @private
     * @since 1.119.0
     */
    utils.getThemingParameters = async function (aNames) {
        const vResolvedParameterMap = await new Promise((resolve, reject) => {
            sap.ui.require(["sap/ui/core/theming/Parameters"], (ThemingParameters) => {
                const vParameterMap = ThemingParameters.get({
                    name: aNames,
                    callback: resolve
                });
                if (vParameterMap) {
                    resolve(vParameterMap);
                }
            });
        });

        return aNames.map((sName) => {
            /*
             * If you request only one parameter as array and the parameter is already loaded,
             * the return value is not a map, it is the value.
             *
             * Additionally the async return value might be undefined if the parameter is not found.
             * This might happen if the custom theme is outdated or the parameter is not available.
             */
            if (typeof vResolvedParameterMap !== "object") {
                return vResolvedParameterMap;
            }
            return vResolvedParameterMap[sName];
        });
    };

    /**
     * Checks whether an application is cold started.
     * This method is scoped to checking the cold start conditions of applications only.
     *
     * A cold start state occurs whenever the user has previously opened the window.
     *
     * - page is refreshed
     * - URL is pasted in a new window
     * - user opens the page and pastes a URL
     *
     * @returns {boolean} whether the application is in a cold start state
     */
    utils.isColdStart = function () {
        let oContainer = sap.ui.require("sap/ushell/Container");
        let oRenderer = oContainer.getRendererInternal("fiori2");
        let bNoCoreViewNavigated = !oRenderer || !oRenderer.getCurrentCoreView();
        if (History.getHistoryLength() <= 1 && bNoCoreViewNavigated) {
            return true;
        }
        return false;
    };

    return utils;
});
