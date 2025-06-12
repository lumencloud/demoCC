// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/m/library",
    "../../library",
    "sap/m/GenericTile",
    "./VizInstance",
    "sap/ui/thirdparty/hasher",
    "../../Config",
    "../../utils/WindowUtils",
    "sap/m/ActionSheet",
    "../../EventHub",
    "../../Container"
], function (
    mobileLibrary,
    ushellLibrary,
    GenericTile,
    VizInstance,
    hasher,
    Config,
    WindowUtils,
    ActionSheet,
    EventHub,
    Container
) {
    "use strict";

    // shortcut for sap.m.GenericTileMode
    let GenericTileMode = mobileLibrary.GenericTileMode;

    // shortcut for sap.m.GenericTileScope
    let GenericTileScope = mobileLibrary.GenericTileScope;

    // shortcut for sap.ushell.AppType
    let AppType = ushellLibrary.AppType;

    // shortcut for sap.ushell.DisplayFormat
    let DisplayFormat = ushellLibrary.DisplayFormat;

    /**
     * @alias sap.ushell.ui.launchpad.VizInstanceLink
     * @class
     * @classdesc Constructor for a new sap.ushell.ui.launchpad.VizInstanceLink control.
     * Displays header and subheader in a compact link format.
     *
     * @param {string} [sId] ID for the new managed object; generated automatically if no non-empty ID is given
     * @param {object} [mSettings] Optional map/JSON-object with initial property values, aggregated objects etc. for the new object
     *
     * @extends sap.m.GenericTile
     *
     * @since 1.84.0
     *
     * @private
     */
    let VizInstanceLink = GenericTile.extend("sap.ushell.ui.launchpad.VizInstanceLink", /** @lends sap.ushell.ui.launchpad.VizInstanceLink.prototype */ {
        metadata: {
            library: "sap.ushell",
            properties: {
                title: {
                    type: "string",
                    defaultValue: "",
                    group: "Appearance",
                    bindable: true
                },
                subtitle: {
                    type: "string",
                    defaultValue: "",
                    group: "Appearance",
                    bindable: true
                },
                editable: {
                    type: "boolean",
                    defaultValue: false,
                    group: "Behavior",
                    bindable: true
                },
                removable: { // The remove icon is visible in edit mode
                    type: "boolean",
                    defaultValue: true,
                    group: "Behavior",
                    bindable: true
                },
                active: {
                    type: "boolean",
                    group: "Misc",
                    defaultValue: false
                },
                targetURL: {
                    type: "string",
                    group: "Misc"
                },
                mode: {
                    type: "sap.m.GenericTileMode",
                    group: "Appearance",
                    defaultValue: GenericTileMode.LineMode
                },
                displayFormat: {
                    type: "sap.ushell.DisplayFormat",
                    defaultValue: DisplayFormat.Compact
                },
                supportedDisplayFormats: {
                    type: "sap.ushell.DisplayFormat[]",
                    defaultValue: [DisplayFormat.Compact]
                },
                dataHelpId: {
                    type: "string",
                    defaultValue: ""
                },
                vizRefId: {
                    type: "string",
                    defaultValue: ""
                }
            },
            defaultAggregation: "tileActions",
            aggregations: {
                tileActions: {
                    type: "sap.m.Button",
                    forwarding: {
                        getter: "_getTileActionSheet",
                        aggregation: "buttons"
                    }
                }
            },
            events: {
                beforeActionSheetOpen: {},
                afterActionSheetClose: {}
            }
        },
        renderer: GenericTile.getMetadata().getRenderer()
    });

    VizInstanceLink.prototype.init = function () {
        GenericTile.prototype.init.apply(this, arguments);
        this.attachPress(this._handlePress, this);
    };

    VizInstanceLink.prototype.exit = function () {
        if (this._oActionSheet) {
            this._oActionSheet.destroy();
        }
    };

    /**
     * Returns a new ActionSheet. If it was already created it will return the instance.
     *
     * @returns {sap.m.ActionSheet} The ActionSheet control.
     */
    VizInstanceLink.prototype._getTileActionSheet = function () {
        if (!this._oActionSheet) {
            this._oActionSheet = new ActionSheet();
            this._oActionSheet.attachAfterClose(this.fireAfterActionSheetClose.bind(this));
        }
        return this._oActionSheet;
    };

    /**
     * Navigates to an intent or to a target URL if one is provided.
     *
     * @private
     */
    VizInstanceLink.prototype._handlePress = function () {
        if (this.getEditable()) {
            if (!this._getTileActionSheet().isOpen()) {
                this.fireBeforeActionSheetOpen();
            }
            this._getTileActionSheet().openBy(this);
            return;
        }

        let sTargetURL = this.getTargetURL();
        if (!sTargetURL) {
            return;
        }
        EventHub.emit("UITracer.trace", {
            reason: "LaunchApp",
            source: "Link",
            data: {
                targetUrl: sTargetURL
            }
        });
        if (sTargetURL[0] === "#") {
            hasher.setHash(sTargetURL);
        } else {
            // add the URL to recent activity log
            let bLogRecentActivity = Config.last("/core/shell/enableRecentActivity") && Config.last("/core/shell/enableRecentActivityLogging");
            if (bLogRecentActivity) {
                let oRecentEntry = {
                    title: this.getTitle(),
                    appType: AppType.URL,
                    url: this.getTargetURL(),
                    appId: this.getTargetURL()
                };
                Container.getRendererInternal("fiori2").logRecentActivity(oRecentEntry);
            }

            WindowUtils.openURL(sTargetURL, "_blank");
        }
    };

    VizInstanceLink.prototype.load = VizInstance.prototype.load;

    VizInstanceLink.prototype.setVizRefId = function (value) {
        if (!this.getDataHelpId()) {
            this.data("tile-id", value, true);
        }
        return this.setProperty("vizRefId", value);
    };

    VizInstanceLink.prototype.setDataHelpId = function (value) {
        this.data("help-id", value, true);
        this.data("tile-id", value, true);
        return this.setProperty("dataHelpId", value);
    };

    VizInstanceLink.prototype.setTitle = function (value) {
        this.setHeader(value);
        return this.setProperty("title", value);
    };

    VizInstanceLink.prototype.setSubtitle = function (value) {
        this.setSubheader(value);
        return this.setProperty("subtitle", value);
    };

    VizInstanceLink.prototype.setTargetURL = function (value) {
        this.setUrl(value);
        return this.setProperty("targetURL", value);
    };

    VizInstanceLink.prototype.setProperty = function (propertyName, value, suppressInvalidate) {
        if (propertyName === "title") {
            this.setProperty("header", value, suppressInvalidate);
        }

        if (propertyName === "subtitle") {
            this.setProperty("subheader", value, suppressInvalidate);
        }

        if (propertyName === "targetURL") {
            this.setProperty("url", value, suppressInvalidate);
        }

        if (propertyName === "editable") {
            if (value && this.getRemovable()) {
                this.setProperty("scope", GenericTileScope.Actions, suppressInvalidate);
            } else if (value) { // Editable but not removable
                this.setProperty("scope", GenericTileScope.ActionMore, suppressInvalidate);
            } else {
                this.setProperty("scope", GenericTileScope.Display, suppressInvalidate);
            }
        }

        if (propertyName === "removable") {
            let bEditable = this.getEditable();
            if (value && bEditable) {
                this.setProperty("scope", GenericTileScope.Actions, suppressInvalidate);
            } else if (bEditable) { // Editable but not removable
                this.setProperty("scope", GenericTileScope.ActionMore, suppressInvalidate);
            } else {
                this.setProperty("scope", GenericTileScope.Display, suppressInvalidate);
            }
        }

        return GenericTile.prototype.setProperty.apply(this, arguments);
    };

    VizInstanceLink.prototype.getAvailableDisplayFormats = VizInstance.prototype.getAvailableDisplayFormats;

    return VizInstanceLink;
});
