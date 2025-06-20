// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/m/ActionSheet",
    "sap/m/GenericTile",
    "sap/m/library",
    "sap/m/Popover",
    "sap/m/Text",
    "sap/m/VBox",
    "sap/ui/core/Component",
    "sap/ui/core/Icon",
    "sap/ui/core/Lib",
    "sap/ui/events/PseudoEvents",
    "../../library",
    "../../resources",
    "./VizInstanceBase",
    "./VizInstanceRenderer",
    "bix/common/library/control/Modules"
], function (
    ActionSheet,
    GenericTile,
    mobileLibrary,
    Popover,
    Text,
    VBox,
    Component,
    Icon,
    Library,
    PseudoEvents,
    ushellLibrary,
    resources,
    VizInstanceBase,
    VizInstanceRenderer,
    Modules
) {
    "use strict";

    // shortcut for sap.m.PlacementType
    let PlacementType = mobileLibrary.PlacementType;

    // shortcut for sap.m.FrameType
    let FrameType = mobileLibrary.FrameType;

    // shortcut for sap.m.GenericTileScope
    let GenericTileScope = mobileLibrary.GenericTileScope;

    // shortcut for sap.m.LoadState
    let LoadState = mobileLibrary.LoadState;

    // shortcut for sap.ushell.DisplayFormat
    let DisplayFormat = ushellLibrary.DisplayFormat;

    /**
     * @alias sap.ushell.ui.launchpad.VizInstance
     * @class
     * @classdesc Wrapper control for tiles. This control must only be created via {@link sap.ushell.services.VisualizationInstantiation#instantiateVisualization}
     *
     * @extends sap.ushell.ui.launchpad.VizInstanceBase
     *
     * @private
     */
    
    let VizInstance = VizInstanceBase.extend("bix.common.library.home.library.ushell.ui.launchpad.VizInstance", /** @lends sap.ushell.ui.launchpad.VizInstance.prototype*/ {
        metadata: {
            library: "sap.ushell",
            properties: {
                title: {
                    type: "string",
                    defaultValue: "",
                    bindable: true
                },
                subtitle: {
                    type: "string",
                    defaultValue: "",
                    bindable: true
                },
                height: {
                    type: "int",
                    defaultValue: 2
                },
                width: {
                    type: "int",
                    defaultValue: 2
                },
                info: {
                    type: "string",
                    defaultValue: "",
                    bindable: true
                },
                icon: {
                    type: "sap.ui.core.URI",
                    defaultValue: "",
                    bindable: true
                },
                numberUnit: {
                    type: "string",
                    defaultValue: "",
                    bindable: true
                },
                state: {
                    type: "sap.m.LoadState",
                    defaultValue: LoadState.Loaded,
                    bindable: true
                },
                sizeBehavior: {
                    type: "sap.m.TileSizeBehavior",
                    defaultValue: undefined,
                    bindable: true
                },
                editable: {
                    type: "boolean",
                    defaultValue: false,
                    bindable: true
                },
                removable: {
                    type: "boolean",
                    defaultValue: true,
                    bindable: true
                },
                clickable: {
                    type: "boolean",
                    defaultValue: true,
                    bindable: true
                },
                active: {
                    type: "boolean",
                    defaultValue: false
                },
                targetURL: {
                    type: "string"
                },
                indicatorDataSource: {
                    type: "object",
                    defaultValue: undefined
                },
                dataSource: {
                    type: "object",
                    defaultValue: undefined
                },
                keywords: {
                    type: "string[]",
                    defaultValue: []
                },
                instantiationData: {
                    type: "object",
                    defaultValue: {}
                },
                contentProviderId: {
                    type: "string",
                    defaultValue: ""
                },
                contentProviderLabel: {
                    type: "string",
                    defaultValue: ""
                },
                vizConfig: {
                    type: "object"
                },
                supportedDisplayFormats: {
                    type: "sap.ushell.DisplayFormat[]",
                    defaultValue: [DisplayFormat.Standard]
                },
                dataHelpId: {
                    type: "string",
                    defaultValue: ""
                },
                vizRefId: {
                    type: "string",
                    defaultValue: ""
                },
                /**
                 * displayFormat
                 * type === string: If we checked for the enum type here, all typos and unknown values
                 * would fail validation instead of falling back to default.
                 */
                displayFormat: {
                    type: "sap.ushell.DisplayFormat",
                    defaultValue: DisplayFormat.Standard
                },
                preview: {
                    type: "boolean",
                    defaultValue: false,
                    bindable: true
                }
            },
            defaultAggregation: "tileActions",
            aggregations: {
                content: {
                    type: "sap.ui.core.Control",
                    multiple: false
                },
                tileActions: {
                    type: "sap.m.Button",
                    forwarding: {
                        getter: "_getTileActionSheet",
                        aggregation: "buttons"
                    }
                }
            },
            events: {
                press: {
                    parameters: {
                        scope: { type: "sap.m.GenericTileScope" },
                        action: { type: "string" }
                    }
                },
                beforeActionSheetOpen: {},
                afterActionSheetClose: {}
            }
        },
        renderer: VizInstanceRenderer
    });

    VizInstance.prototype.init = function () {

        let oContent = new GenericTile({
            frameType: this._formatPlaceholderFrameType(this.getDisplayFormat()),
            state: this.getState()
        });

        this._disableTabindexOfGenericTile(oContent);

        this.setAggregation("content", oContent);
    };

    /**
     * Updates current displayFormat and sets the size accordingly
     * @param {sap.ushell.DisplayFormat} sDisplayFormat The new displayFormat
     * @returns {this} Reference to <code>this</code> for method chaining.
     *
     * @private
     */
    VizInstance.prototype.setDisplayFormat = function (sDisplayFormat) {
        this.setProperty("displayFormat", sDisplayFormat);
        this._setSize();

        let oContent = this.getContent();
        if (oContent && oContent.isA("sap.m.GenericTile")) {
            oContent.setFrameType(this._formatPlaceholderFrameType(sDisplayFormat));
        }
        return this;
    };

    /**
     * Updates current state
     * @param {sap.m.LoadState} sState The new state
     * @returns {this} Reference to <code>this</code> for method chaining.
     *
     * @private
     */
    VizInstance.prototype.setState = function (sState) {
        this.setProperty("state", sState);

        let oContent = this.getContent();
        if (oContent && oContent.isA("sap.m.GenericTile")) {
            oContent.setState(sState);
        }
        return this;
    };

    /**
     * @param {sap.m.TileSizeBehavior} sSizeBehavior The sizeBehavior.
     * @returns {this} Reference to <code>this</code> for method chaining.
     *
     * @since 1.116.0
     * @private
     */
    VizInstance.prototype.setSizeBehavior = function (sSizeBehavior) {
        this.setProperty("sizeBehavior", sSizeBehavior);
        this.setTileSizeBehavior(sSizeBehavior);
        return this;
    };

    /**
     * @param {boolean} editable The editable boolean.
     * @returns {this} Reference to <code>this</code> for method chaining.
     *
     * @private
     */
    VizInstance.prototype.setEditable = function (editable) {
        this.setProperty("editable", editable);
        this.setTileEditable(editable);
        return this;
    };

    /**
     * Checks if the current content is a GenericTile. If editable is true, set its scope to "ActionMore".
     * This method is supposed to be overridden by child classes.
     *
     * @param {boolean} editable The edit mode flag.
     * @returns {this} Reference to <code>this</code> for method chaining.
     *
     * @since 1.104.0
     * @private
     */
    VizInstance.prototype.setTileEditable = function (editable) {
        let sScope = editable ? GenericTileScope.ActionMore : GenericTileScope.Display;

        let oContent = this.getContent();
        if (oContent && oContent.isA("sap.m.GenericTile")) {
            oContent.setScope(sScope);
        }
        return this;
    };

    /**
     * Checks if the current content is a GenericTile and passes the given sizeBehavior.
     * This method is supposed to be overridden by child classes.
     *
     * @param {sap.m.TileSizeBehavior} sSizeBehavior The sizeBehavior.
     * @returns {this} Reference to <code>this</code> for method chaining.
     *
     * @since 1.104.0
     * @private
     */
    VizInstance.prototype.setTileSizeBehavior = function (sSizeBehavior) {
        let oContent = this.getContent();
        if (oContent && oContent.isA("sap.m.GenericTile")) {
            oContent.setSizeBehavior(sSizeBehavior);
        }
        return this;
    };

    /**
     * Converts the DisplayFormat to the according FrameType.
     * @param {sap.ushell.DisplayFormat} sDisplayFormat The DisplayFormat of the VizInstance
     * @returns {sap.m.FrameType} The FrameType
     *
     * @since 1.86.0
     * @private
     */
    VizInstance.prototype._formatPlaceholderFrameType = function (sDisplayFormat) {
        this._setSize();
        switch (sDisplayFormat) {
            case DisplayFormat.Flat:
                return FrameType.OneByHalf;
            case DisplayFormat.FlatWide:
                return FrameType.TwoByHalf;
            case DisplayFormat.StandardWide:
                return FrameType.TwoByOne;
            default:
                // DisplayFormat.Standard
                return FrameType.OneByOne;
        }
    };

    VizInstance.prototype.exit = function () {
        if (this._oActionModeButtonIconVBox) {
            this._oActionModeButtonIconVBox.destroy();
        }
        if (this._oActionDivCenter) {
            this._oActionDivCenter.destroy();
        }
        if (this._oActionSheet) {
            this._oActionSheet.destroy();
        }
        if (this._oRemoveIconVBox) {
            this._oRemoveIconVBox.destroy();
        }
    };

    /**
     * Returns the layout data for the GridContainer/Section.
     *
     * @returns {{columns: int, rows: int}} The layout data in "columns x rows" format. E.g.: "2x2"
     *
     * @since 1.77.0
     * @private
     */
    VizInstance.prototype.getLayout = function () {
        return {
            columns: this.getWidth(),
            rows: this.getHeight()
        };
    };

    /**
     * Updates the content aggregation of the control and recalculates its layout data
     *
     * @param {sap.ui.core.Control} content The control to be put inside the visualization
     *
     * @since 1.77.0
     * @private
     */
    VizInstance.prototype.setContent = function (content) {
        let oGridData = this.getLayoutData();
        if (oGridData && oGridData.isA("sap.f.GridContainerItemLayoutData")) {
            oGridData.setRows(this.getHeight());
            oGridData.setColumns(this.getWidth());
        }

        let sDataHelpId = this.getDataHelpId();
        let sVizRefId = this.getVizRefId();
        if (sDataHelpId) {
            content.data("help-id", sDataHelpId, true);
            content.data("tile-id", sDataHelpId, true);
        } else {
            content.data("tile-id", sVizRefId, true);
        }

        this._disableTabindexOfContent(content);

        this.setAggregation("content", content);
    };

    /**
     * Removes the tabindex of a possible genericTile inside of the given control.
     *
     * @param {sap.ui.core.Control} [content] the control to search in
     *
     * @since 1.121
     * @private
     */
    VizInstance.prototype._disableTabindexOfContent = function (content) {
        if (content) {
            if (content.isA("sap.ui.core.ComponentContainer")) {
                let sComponentName = content.getComponent();
                let oComponent = Component.getComponentById(sComponentName);
                if (oComponent) {
                    this._disableTabindexOfContent(oComponent.getRootControl());
                }
            } else if (content.isA("sap.m.FlexBox")) {
                // SSB tiles have a FlexBox around their View, that rerenders when a new genericTile is added
                let oFlexBox = content;
                let oItem = content.getItems()[0];
                oFlexBox.addEventDelegate({
                    onAfterRendering: this._disableTabindexOfContent.bind(this, oItem)
                });
                this._disableTabindexOfContent(oItem);
            } else if (content.isA("sap.ui.core.mvc.View")) {
                this._disableTabindexOfContent(content.getContent()[0]);
            } else if (content.isA("sap.cloudfnd.smartbusiness.lib.reusetiles.Singleton")) {
                // Some SSB tiles have a FlexBox-View-Singleton-GenericTile structure
                this._disableTabindexOfContent(content.getContent());
            } else if (content.isA("sap.m.GenericTile")) {
                this._disableTabindexOfGenericTile(content);
            }
        }
    };

    /**
     * Removes the tabindex of tile, so we avoid the inner and outer focus issue.
     *
     * @param {sap.m.GenericTile} genericTile the tile that should not be focusable
     *
     * @since 1.121
     * @private
     */
    VizInstance.prototype._disableTabindexOfGenericTile = function (genericTile) {
        function removeTabindex (control) {
            let oFocusDomRef = control.getFocusDomRef();
            if (oFocusDomRef) {
                if (oFocusDomRef.getAttribute("tabindex") === "0") {
                    oFocusDomRef.setAttribute("tabindex", -1);
                    oFocusDomRef.tabIndex = -1;
                }
            }
        }

        // Some SSB tiles are already rendered
        removeTabindex(genericTile);
        genericTile.addEventDelegate({
            onAfterRendering: removeTabindex.bind(this, genericTile)
        });
    };

    /**
     * Returns a new ActionSheet. If it was already created it will return the instance.
     *
     * @returns {sap.m.ActionSheet} The ActionSheet control.
     *
     * @private
     */
    VizInstance.prototype._getTileActionSheet = function () {
        if (!this._oActionSheet) {
            this._oActionSheet = new ActionSheet({
                placement: PlacementType.VerticalPreferedBottom
            });
            this._oActionSheet.attachAfterClose(this.fireAfterActionSheetClose.bind(this));
        }
        return this._oActionSheet;
    };

    /**
     * Press handler for action menu icon.
     *
     * @since 1.79.0
     * @private
     */
    VizInstance.prototype._openActionMenu = function () {
        if (this._oActionModeIcon) {
            if (!this._getTileActionSheet().isOpen()) {
                this.fireBeforeActionSheetOpen();
            }

            if (this.getTileActions().length === 0) {
                this._openNoActionsPopover();
                return;
            }

            this._getTileActionSheet().openBy(this._oActionModeIcon);
        }
    };

    /**
     * Does a lookup on the internal content aggregation and searches for a proper dom ref to focus
     * @returns {object} the dom ref to focus
     *
     * @private
     */
    VizInstance.prototype.getFocusDomRef = function () {
        if (this.getEditable()) {
            return this._oActionModeIcon && this._oActionModeIcon.getFocusDomRef();
        }

        let oContent = this.getContent();
        let aPossibleControls = oContent.findAggregatedObjects(true, function (oControl) {
            return oControl.isA("sap.m.GenericTile") || oControl.isA("sap.f.Card") || oControl.isA("sap.m.SlideTile");
        });

        if (aPossibleControls.length) {
            return aPossibleControls[0].getFocusDomRef();
        }

        // If oContent is a component container that does not have any aggregated objects,
        // return the first Generic Tile or Card in the component itself
        if (oContent.isA("sap.ui.core.ComponentContainer")) {
            const oComponent = oContent.getComponentInstance();
            if (oComponent?.findAggregatedObjects) {
                aPossibleControls = oComponent.findAggregatedObjects(true, function (oControl) {
                    return oControl.isA("sap.m.GenericTile") || oControl.isA("sap.f.Card") || oControl.isA("sap.m.SlideTile");
                });

                if (aPossibleControls.length) {
                    return aPossibleControls[0].getFocusDomRef();
                }
            }
        }

        return oContent.getFocusDomRef();
    };

    /**
     * Click handler. Prevents the navigation if the edit mode is active.
     * @param {Event} oEvent The Event object
     *
     * @since 1.78.0
     * @private
     */
    VizInstance.prototype.onclick = function (oEvent) {
        if (this._preventDefault(oEvent)) {
            this.firePress({
                scope: "Display",
                action: "Press"
            });
        } else if (this._oRemoveIconVBox && this._oRemoveIconVBox.getDomRef && this._oRemoveIconVBox.getDomRef() && this._oRemoveIconVBox.getDomRef().contains(oEvent.target)) {
            this.firePress({
                scope: "Actions",
                action: "Remove"
            });
        } else if (this.getEditable()) {
            this._openActionMenu();
        }
        else{
            Modules.getSalesThis().menurouting("$event", oEvent.target.innerText);
        }
    };

    VizInstance.prototype.onBeforeRendering = function () {
        let oDomRef = this.getDomRef();
        if (oDomRef) {
            oDomRef.removeEventListener("keyup", this._fnKeyupHandler);
            oDomRef.removeEventListener("touchend", this._fnTouchendHandler);
        }
    };

    /**
     * @private
     */
    VizInstance.prototype._openNoActionsPopover = function () {
        let oText = new Text({ text: resources.i18n.getText("tileHasNoActions") });
        new Popover({
            placement: PlacementType.VerticalPreferedBottom,
            showHeader: false,
            ariaLabelledBy: oText.getId(),
            content: oText
        }).addStyleClass("sapUiContentPadding").openBy(this._oActionModeIcon);
    };

    /**
     * SAPUI5 Lifecycle hook which is called after the control is rendered.
     * Prevents the navigation on keyup events while in the edit mode.
     * Event Capturing is enabled for these as we have no direct control over
     * inner elements but need to prevent their actions in the edit mode.
     *
     * @override
     * @since 1.78.0
     * @private
     */
    VizInstance.prototype.onAfterRendering = function () {
        let oDomRef = this.getDomRef();
        this._fnKeyupHandler = this.onkeyup.bind(this);
        this._fnTouchendHandler = this.onclick.bind(this);

        oDomRef.addEventListener("keyup", this._fnKeyupHandler, true);
        oDomRef.addEventListener("touchend", this._fnTouchendHandler, true);

        if (oDomRef.parentElement) {
            oDomRef.parentElement.setAttribute("aria-description", resources.i18n.getText("VizInstance.AriaDescription.Link"));
        }
    };

    /**
     * Handles the keyup event while edit mode is active
     * If delete or backspace is pressed, the focused VizInstance gets removes.
     * If space or enter is pressed, the navigation gets prevented.
     *
     * @param {sap.ui.base.Event} oEvent Browser Keyboard event
     *
     * @since 1.78.0
     * @private
     */
    VizInstance.prototype.onkeyup = function (oEvent) {
        if (this.getEditable()) {
            if ((PseudoEvents.events.sapdelete.fnCheck(oEvent) || PseudoEvents.events.sapbackspace.fnCheck(oEvent))) {
                this.firePress({
                    scope: "Actions",
                    action: "Remove"
                });
            }

            if (PseudoEvents.events.sapspace.fnCheck(oEvent) || PseudoEvents.events.sapenter.fnCheck(oEvent)) {
                this._openActionMenu();
                this._preventDefault(oEvent);
            }
        }
    };

    /**
     * Stops the given event from bubbling up or down the DOM and prevents its default behavior.
     *
     * @param {sap.ui.base.Event} oEvent The browser event
     * @returns {boolean} False if the default behavior is prevented, otherwise true.
     *
     * @since 1.78.0
     * @private
     */
    VizInstance.prototype._preventDefault = function (oEvent) {
        if (this.getEditable() || !this.getClickable()) {
            oEvent.preventDefault();
            oEvent.stopPropagation();
            oEvent.stopImmediatePropagation();
            return false;
        }
        return true;
    };

    /**
     * Loads the content of the VizInstance and resolves the returned Promise
     * when loading is completed.
     * @param {boolean} [bIsCustomVizType] Should be true if the visualization is a custom one. (Only used in CDM)
     * @returns {Promise} Resolves when loading is completed
     *
     * @abstract
     * @since 1.77.0
     * @private
     */
    VizInstance.prototype.load = function () {
        // As this is the base control that doesn't load anything, a resolved Promise is
        // returned always.
        return Promise.resolve();
    };

    /**
     * Sets the width and the height of the vizInstance based on the display format.
     *
     * @since 1.88.0
     * @private
     */
    VizInstance.prototype._setSize = function () {
        let oSize = {};
        switch (this.getDisplayFormat()) {
            case DisplayFormat.Flat:
                oSize.width = 2;
                oSize.height = 1;
                break;
            case DisplayFormat.FlatWide:
                oSize.width = 4;
                oSize.height = 1;
                break;
            case DisplayFormat.StandardWide:
                oSize.width = 4;
                oSize.height = 2;
                break;
            default:
                // DisplayFormat.Standard
                oSize.width = 2;
                oSize.height = 2;
                break;
        }

        this.setWidth(oSize.width);
        this.setHeight(oSize.height);
    };

    /**
     * Returns all display formats available after filtering out the current and non-eligible ones
     *
     * @returns {sap.ushell.DisplayFormat[]} aAvailableDisplayFormats The available display formats
     *
     * @since 1.85.0
     * @private
     */
    VizInstance.prototype.getAvailableDisplayFormats = function () {
        let aAvailableDisplayFormats;
        let aSupportedDisplayFormats = this.getSupportedDisplayFormats();
        let sDisplayFormat = this.getDisplayFormat();

        aAvailableDisplayFormats = aSupportedDisplayFormats.filter(function (displayFormat) {
            return displayFormat !== sDisplayFormat;
        });

        let iCompactIndex = aAvailableDisplayFormats.indexOf("compact");
        let sTitle = this.getTitle();
        let sTargetURL = this.getTargetURL();

        // link is only possible if both title and target url have value
        if (iCompactIndex > -1 && (!sTitle || !sTargetURL)) {
            aAvailableDisplayFormats.splice(iCompactIndex, 1);
        }
        return aAvailableDisplayFormats;
    };

    /**
     * Instantiates and returns the VBox containing the remove icon used in the edit mode
     *
     * @returns {sap.m.VBox} The VBox containing the remove icon
     *
     * @since 1.93.0
     * @private
     */
    VizInstance.prototype._getRemoveIconVBox = function () {
        if (!this._oRemoveIconVBox) {
            let oMBundle = Library.getResourceBundleFor("sap.m");
            let oRemoveIcon = new Icon({
                id: this.getId() + "-action-remove",
                alt: oMBundle.getText("GENERICTILE_ACTIONS_ARIA_TEXT"),
                decorative: false,
                noTabStop: true,
                src: "sap-icon://decline",
                tooltip: resources.i18n.getText("removeButtonTitle")
            }).addStyleClass("sapUshellTileDeleteIconInnerClass sapMPointer");

            this._oRemoveIconVBox = new VBox({
                items: [oRemoveIcon]
            }).addStyleClass("sapUshellTileDeleteIconOuterClass sapUshellTileDeleteClickArea sapMPointer");
            this._oRemoveIconVBox.setParent(this);
        }

        return this._oRemoveIconVBox;
    };

    /**
     * Instantiates and returns the VBox containing the Icon used to access the tile options menu
     *
     * @returns {sap.m.VBox} The VBox containing the Icon used to access the tile options menu
     *
     * @since 1.93.0
     * @private
     */
    VizInstance.prototype._getActionModeButtonIconVBox = function () {
        if (!this._oActionModeButtonIconVBox) {
            let oMBundle = Library.getResourceBundleFor("sap.m");

            this._oActionModeIcon = new Icon({
                id: this.getId() + "-action-more",
                decorative: false,
                alt: oMBundle.getText("LIST_ITEM_NAVIGATION"),
                noTabStop: true,
                src: "sap-icon://overflow",
                tooltip: resources.i18n.getText("configuration.category.tile_actions")
            }).addStyleClass("sapUshellTileActionIconDivBottomInner sapMPointer");

            // overwrite keyup function of icon
            let fnOriginalOnKeyUpFunction = this._oActionModeIcon.onkeyup;
            this._oActionModeIcon.onkeyup = function () {
                fnOriginalOnKeyUpFunction.apply(this._oActionModeIcon, arguments);
                this.onkeyup.apply(this, arguments);
            }.bind(this);

            this._oActionModeButtonIconVBox = new VBox({
                items: [this._oActionModeIcon]
            }).addStyleClass("sapUshellTileActionIconDivBottom sapMPointer");
            this._oActionModeButtonIconVBox.setParent(this);
        }

        return this._oActionModeButtonIconVBox;
    };

    return VizInstance;
});
