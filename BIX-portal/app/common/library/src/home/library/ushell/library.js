// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ui/core/Lib",
    "sap/ui/core/library",
    "sap/m/library",
    "sap/ushell/library"
], function (
    Library,
    coreLibrary,
    mobileLibrary,
    ushellLibrary
) {
    "use strict";

    /**
     * @namespace sap.ushell.api
     * @since 1.121.0
     * @private
     * @ui5-restricted
     */

    /**
     * @namespace sap.ushell.api.workpage
     * @since 1.122.0
     * @private
     * @ui5-restricted
     */

    /**
     * SAP library: sap.ushell
     *
     * @namespace
     * @alias sap.ushell
     * @since 1.15.0
     * @public
     */
    let oUshellLibrary = ushellLibrary;

    /**
     * Denotes the states of the all my apps menu.
     *
     * @enum {string}
     * @private
     */
    oUshellLibrary.AllMyAppsState = {
        /**
         * Show first level.
         * @private
         */
        FirstLevel: "FirstLevel",

        /**
         * Show second level.
         * @private
         */
        SecondLevel: "SecondLevel",

        /**
         * Show details.
         * @private
         */
        Details: "Details",

        /**
         * Show first level.
         * @private
         */
        FirstLevelSpread: "FirstLevelSpread"
    };

    /**
     * Denotes the provider types of the all my apps menu entries.
     *
     * @enum {int}
     * @private
     */
    oUshellLibrary.AllMyAppsProviderType = {
        /**
         * Homepage Apps
         * @private
         */
        HOME: 0,

        /**
         * External Apps
         * @private
         */
        EXTERNAL: 1,

        /**
         * Catalog Apps
         * @private
         */
        CATALOG: 2
    };

    /**
     * Denotes the states of the shell app title.
     *
     * @enum {string}
     * @private
     */
    oUshellLibrary.AppTitleState = {
        /**
         * Only the Shell Navigation menu is available.
         * @private
         */
        ShellNavMenuOnly: "ShellNavMenuOnly",

        /**
         * Only the All My Apps menu is available.
         * @private
         */
        AllMyAppsOnly: "AllMyAppsOnly",

        /**
         * The Shell Navigation menu is currently active.
         * This state is only relevant if both ShellNavMenu and AllMyApps are active
         * and the user can navigate between them.
         * @private
         */
        ShellNavMenu: "ShellNavMenu",

        /**
         * The All My Apps menu is currently active.
         * This state is only relevant if both ShellNavMenu and AllMyApps are active
         * and the user can navigate between them.
         * @private
         */
        AllMyApps: "AllMyApps"
    };

    /**
     * Denotes the types of the content nodes.
     *
     * @enum {string}
     * @public
     */
    oUshellLibrary.ContentNodeType = {
        /**
         * A group of the classic homepage
         * @public
         * @deprecated since 1.120
         */
        HomepageGroup: "HomepageGroup",
        /**
         * A space in spaces mode
         * @public
         */
        Space: "Space",
        /**
         * A page which is assigned to a space in spaces mode
         * @public
         */
        Page: "Page"
    };

    oUshellLibrary.components = oUshellLibrary.components || {};
    oUshellLibrary.components.container = oUshellLibrary.components.container || {};

    /**
     * The application types supported by the embedding container.
     *
     * @since 1.15.0
     * @enum {string}
     * @private
     */
    oUshellLibrary.components.container.ApplicationType = {
        NWBC: "NWBC",
        SAPUI5: "SAPUI5",
        TR: "TR",
        URL: "URL",
        WCF: "WCF",
        WDA: "WDA"
    };

    /**
     * Denotes display types for tiles in Spaces mode
     *
     * @private
     * @since 1.85
     */
    oUshellLibrary.DisplayFormat = {
        /**
         * Indicates a standard 2x2 tile.
         */
        Standard: "standard",

        /**
         * Indicates that the tile is displayed as a link.
         */
        Compact: "compact",

        /**
         * Indicates a flat 1x2 tile.
         */
        Flat: "flat",

        /**
         * Indicates a flat, wide 1x4 tile.
         */
        FlatWide: "flatWide",

        /**
         * Indicates a wide 2x4 tile.
         */
        StandardWide: "standardWide"
    };

    /**
     * The state of a navigation operation
     *
     * @enum {string}
     * @public
     */
    oUshellLibrary.NavigationState = {
        InProgress: "InProgress",
        Finished: "Finished"
    };

    oUshellLibrary.ui = oUshellLibrary.ui || {};
    oUshellLibrary.ui.launchpad = oUshellLibrary.ui.launchpad || {};

    /**
     * Denotes display states of the viewport
     *
     * @enum {string}
     * @public
     * @deprecated since 1.120.0. The ViewPortState is related to Fiori2 and not used anymore.
     */
    oUshellLibrary.ui.launchpad.ViewPortState = {
        /**
         * Indicates state, when only left content is in the viewport.
         * @public
         */
        Left: "Left",

        /**
         * Indicates state, when only center content is in the viewport.
         * @public
         */
        Center: "Center",

        /**
         * Indicates state, when only right content is in the viewport.
         * @public
         */
        Right: "Right",

        /**
         * Indicates state, when the left content as well as a part from the center content is in the viewport.
         * @public
         */
        LeftCenter: "LeftCenter",

        /**
         * Indicates state, when the center content as well as a part from the left content is in the viewport.
         * @public
         */
        CenterLeft: "CenterLeft",

        /**
         * Indicates state, when the right content as well as a part from the center content is in the viewport.
         * @public
         */
        RightCenter: "RightCenter",

        /**
         * Indicates state, when the center content as well as a part from the right content is in the viewport.
         * @public
         */
        CenterRight: "CenterRight"
    };

    oUshellLibrary.ui.tile = oUshellLibrary.ui.tile || {};

    /**
     * Denotes states for control parts and translates into standard SAP color codes
     *
     * @enum {string}
     * @private
     */
    oUshellLibrary.ui.tile.State = {
        /**
         * Indicates a state that is neutral, e.g. for standard display (Grey color)
         * @public
         */
        Neutral: "Neutral",

        /**
         * Alias for "None"
         * @public
         */
        None: "None",

        /**
         * Indicates a state that is negative,
         * e.g. marking an element that has to get attention urgently or indicates negative values (Red color)
         * @public
         */
        Negative: "Negative",

        /**
         * Alias for "Error"
         * @public
         */
        Error: "Error",

        /**
         * Indicates a state that is positive, e.g. marking a task successfully executed or a state where all is good (Green color)
         * @public
         */
        Positive: "Positive",

        /**
         * Alias for "Success"
         * @public
         */
        Success: "Success",

        /**
         * Indicates a state that is critical, e.g. marking an element that needs attention (Orange color)
         * @public
         */
        Critical: "Critical",

        /**
         * Alias for "Warning"
         * @public
         */
        Warning: "Warning"
    };

    /**
     * The state of an arrow as trend direction indicator, pointing either up or down
     *
     * @enum {string}
     * @private
     */
    oUshellLibrary.ui.tile.StateArrow = {
        /**
         * The trend direction indicator is invisible
         * @public
         */
        None: "None",

        /**
         * The trend direction indicator points up
         * @public
         */
        Up: "Up",

        /**
         * The trend direction indicator points down
         * @public
         */
        Down: "Down"
    };

    /**
     * Enumeration of possible VisualizationLoad statuses.
     *
     * @enum {string}
     * @private
     * @since 1.76.0
     */
    oUshellLibrary.VisualizationLoadState = {
        /**
         * The control is loading.
         * @private
         */
        Loading: "Loading",

        /**
         * The control has loaded.
         * @private
         */
        Loaded: "Loaded",

        /**
         * The control failed to load, because it has insufficient roles.
         * @private
         */
        InsufficientRoles: "InsufficientRoles",

        /**
         * The control is out of the selected role context.
         * @private
         */
        OutOfRoleContext: "OutOfRoleContext",

        /**
         * The control has no resolved navigation target.
         * @private
         */
        NoNavTarget: "NoNavTarget",

        /**
         * The control failed to load.
         * @private
         */
        Failed: "Failed",

        /**
         * The control is disabled.
         * @private
         */
        Disabled: "Disabled"
    };

    /**
     * Enumeration of possible application types.
     * Used by services in order to add activities of certain types.
     *
     * @enum {string}
     * @private
     * @since 1.94.0
     */
    oUshellLibrary.AppType = {
        /**
         * Overview page.
         * @private
         */
        OVP: "OVP",

        /**
         * Search.
         * @private
         */
        SEARCH: "Search",

        /**
         * Factsheet application.
         * @private
         */
        FACTSHEET: "FactSheet",

        /**
         * Co-pilot.
         * @private
         */
        COPILOT: "Co-Pilot",

        /**
         * External link.
         * @private
         */
        URL: "External Link",

        /**
         * Generic application.
         * @private
         */
        APP: "Application"
    };

    /**
     * Enumeration of possible floating number types/states.
     *
     * @enum {string}
     * @private
     * @since 1.106.0
     */
    oUshellLibrary.FloatingNumberType = {

        /**
         * Used when the "floatingNumber" should be disregarded.
         * @private
         */
        None: "None",

        /**
         * Used when the "floatingNumber" should represent the number of new notifications.
         * @private
         */
        Notifications: "Notifications",

        /**
         * Used when the "floatingNumber" should represent the number of new notifications,
         * but is displayed in an "overflow" button instead of the "notifications" button itself.
         * @private
         */
        OverflowButton: "OverflowButton"
    };

    return oUshellLibrary;
});
