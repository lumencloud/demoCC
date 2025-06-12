// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

/**
 * @fileOverview a module exposing the ushell UI5ComponentTypes.
 * This enum is used during bootstrap and therefore cannot be included in the library.js.
 * BCP 2170190261
 */

sap.ui.define([], function () {
    "use strict";

    /**
     * @alias sap.ushell.UI5ComponentType
     * Denotes the types of UI5-components loaded by FLP
     *
     * @enum {string}
     * @since 1.89.0
     * @private
     */
    return {

        /**
         * An application
         */
        Application: "Application",

        /**
         * A plug-in
         */
        Plugin: "Plugin",

        /**
         * A visualization
         */
        Visualization: "Visualization"
    };
});
