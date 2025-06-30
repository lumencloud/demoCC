// Copyright (c) 2009-2023 SAP SE, All Rights Reserved
/**
 * @fileOverview This file handles the resource bundles.
 */

sap.ui.define([
    "sap/base/i18n/Localization",
    "sap/ui/model/resource/ResourceModel"
], function (
    Localization,
    ResourceModel
) {
    "use strict";

    // ensure that sap.ushell exists
    let oResources = {};

    oResources.getTranslationModel = function (sLocale) {
        if (!this._oResourceModel) {
            // create translation resource model
            this._oResourceModel = new ResourceModel({
                bundleUrl: sap.ui.require.toUrl("sap/ushell/renderer/resources/resources.properties"),
                bundleLocale: sLocale
            });
        }
        return this._oResourceModel;
    };

    /**
     * The function decodes given custom JSON string with translations and returns text in a current user language.
     * If JSON data does not contain current user language, default value is returned.
     * If the provided string is not a JSON file, the input string is returned under assumption, that the given text is the same for all languages.
     * The input JSON should have the following format:
     * <pre>
     * { "en-US" : "XYZ Corporation", "de" : "Firma XYZ", "default" : "XYZ"}
     * </pre>
     * @private
     * @since 1.124
     * @param {string} sJSON JSON string containing translated texts
     * @returns {string} Translated text or the input string, when the string is not a JSON model
     */
    oResources.getTranslationFromJSON = function (sJSON) {
        if (!sJSON) {
            return "";
        }

        try {
            const oTranslationTexts = JSON.parse(sJSON);
            const sCurrentLanguage = Localization.getLanguage().toLowerCase();

            // Exact match has highest priority
            for (const [key, text] of Object.entries(oTranslationTexts)) {
                if (key.toLowerCase() === sCurrentLanguage) {
                    return text;
                }
            }
            // Current language: "en" - take text from language key: "en-GB"
            // Current language: "en-GB" - take text from language key: "en"
            for (const [key, text] of Object.entries(oTranslationTexts)) {
                const sKey = key.toLowerCase();
                if (sKey.startsWith(sCurrentLanguage) || sCurrentLanguage.startsWith(sKey)) {
                    return text;
                }
            }
            // If the current user launguage is not in JSON, take the text under the "default" key
            return oTranslationTexts.default || "";
        } catch (err) {
            // A customer may provide one text for all languages instead of JSON
            return sJSON;
        }
    };

    // Proxy to avoid adding dependency to Localization in modules where a check for RTL is needed
    oResources.getRTL = function () {
        return Localization.getRTL();
    };

    oResources.i18nModel = oResources.getTranslationModel(Localization.getLanguage());
    oResources.i18n = oResources.i18nModel.getResourceBundle();

    return oResources;
}, /* bExport= */ true);
