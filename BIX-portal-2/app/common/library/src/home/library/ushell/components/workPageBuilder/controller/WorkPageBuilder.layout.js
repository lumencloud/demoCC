// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

/**
 * @file WorkPageBuilder layout helper for breakpoints, theme params, sizeBehavior handling.
 */
sap.ui.define([
    "sap/m/library",
    "sap/ui/core/ResizeHandler",
    "sap/base/Log",
    "sap/ui/model/json/JSONModel",
    "../../../Config",
    "../../../EventHub",
    "../../../utils"
], function (
    mLibrary,
    ResizeHandler,
    Log,
    JSONModel,
    Config,
    EventHub,
    ushellUtils
) {
    "use strict";

    let TileSizeBehavior = mLibrary.TileSizeBehavior;


    /**
     * Creates a new LayoutHelper, which exposes a model instance, in which the current breakpoint is updated according
     * to the width of the registered control.
     * @private
     */
    let LayoutHelper = function () {
        this._oLayoutModel = new JSONModel({
            currentBreakpoint: {}
        });
    };

    /**
     * Called if the layout parameters, such as theme change or sizeBehavior change.
     * Calls the onResize function to trigger a recalculation.
     *
     * @private
     * @since 1.116.0
     */
    LayoutHelper.prototype._onLayoutChange = function () {
        let oDomElement;

        if (!this._oControl) {
            return;
        }

        if (this._oControl instanceof Element) {
            oDomElement = this._oControl;
        } else {
            oDomElement = this._oControl.isA("sap.ui.core.Control") ? this._oControl.getDomRef() : null;
        }

        if (!oDomElement) {
            return;
        }

        this.onResize({
            size: {
                width: oDomElement.getBoundingClientRect().width
            }
        });
    };


    /**
     * Registers a ResizeHandler on the given control. Skips if a resizeHandlerId already exists.
     * When the browser is resized, the current breakpoint config is set to the model.
     *
     * @param {sap.ui.core.Control} oControl The control to attach the resize handler to.
     * @since 1.116.0
     * @private
     */
    LayoutHelper.prototype.register = function (oControl) {
        if (this._sResizeHandlerId) {
            Log.warning("A ResizeHandler is already registered. Deregister first.");
            return;
        }
        this._oControl = oControl;
        this._sResizeHandlerId = ResizeHandler.register(this._oControl, this.onResize.bind(this));
        Config.on("/core/home/sizeBehavior").do(this._onLayoutChange.bind(this));
        EventHub.on("themeChanged").do(this._onLayoutChange.bind(this));
    };

    /**
     * Returns the layout model.
     *
     * @returns {sap.ui.model.json.JSONModel} The model instance.
     * @private
     * @since 1.116.0
     */
    LayoutHelper.prototype.getModel = function () {
        return this._oLayoutModel;
    };

    /**
     * De-registers the resizeHandler.
     * @private
     * @since 1.116.0
     */
    LayoutHelper.prototype.deregister = function () {
        if (this._sResizeHandlerId) {
            ResizeHandler.deregister(this._sResizeHandlerId);
            this._sResizeHandlerId = null;
        }
    };

    /**
     * Called when the browser window is resized. Sets the current breakpoint to the model.
     *
     * @param {sap.base.Event|{size: {width: int}}} oEvent The resize event, containing the new width.
     * @private
     * @since 1.116.0
     */
    LayoutHelper.prototype.onResize = async function (oEvent) {
        if (this.iWidth === oEvent.size.width) {
            return;
        }
        this.iWidth = oEvent.size.width;
        let oBreakpoint = await this._getBreakpointSettingsForWidth(oEvent.size.width);
        this._oLayoutModel.setProperty("/currentBreakpoint", oBreakpoint);
    };

    /**
     * Returns the breakpoint for the given width.
     *
     * @param {int} iWidth The width.
     * @returns {Promise<BreakpointSetting>} The breakpoint config.
     * @private
     * @since 1.116.0
     */
    LayoutHelper.prototype._getBreakpointSettingsForWidth = async function (iWidth) {
        let aBreakpoints = await this._getBreakpointSettings();
        return aBreakpoints[3]; //고정
        // for (let i in aBreakpoints) {
        //     if (iWidth <= aBreakpoints[i].high && iWidth >= aBreakpoints[i].low) {
        //         return aBreakpoints[i];
        //     }
        // }
    };

    /**
     * Returns a .rem value based on the tile gap or width parameter
     *
     * @param {string} sValue Tile spacing parameter
     * @returns {string} Value in .rem
     * @private
     * @since 1.116.0
     */
    LayoutHelper.prototype._formatNumericThemeParam = function (sValue) {
        if (sValue && sValue.indexOf(".") === 0) {
            sValue = "0" + sValue;
        }
        return sValue;
    };

    /**
     * Calculates the minimum flex for the given columnMinWidth, taking into account the width of the first WorkPageRow.
     *
     * @param {int} iColumnMinWidthPx The minimum width for the WorkPageColumn in px.
     * @returns {int} The min flex value.
     * @private
     * @since 1.118.0
     */
    LayoutHelper.prototype._getWorkPageColumnMinFlex = function (iColumnMinWidthPx) {
        const oDomRef = this._oControl.getDomRef();

        if (!oDomRef) { return 4; }

        const oRowInnerDomRef = oDomRef.querySelector(".workPageRowInner");

        if (!oRowInnerDomRef) { return 4; }
        if (oRowInnerDomRef.offsetWidth <= 0) { return 4; }

        return Math.ceil(iColumnMinWidthPx / (oRowInnerDomRef.offsetWidth / 24));
    };

    /**
     * @typedef BreakpointSetting
     *
     * @property {int} high The highest pixel width for this breakpoint.
     * @property {int} low The lowest pixel width for this breakpoint.
     * @property {sap.m.TileSizeBehavior} sizeBehavior The sizeBehavior for this breakpoint.
     * @property {string} gap The css value for the grid gap.
     * @property {string} rowSize The css value for the grid rowSize.
     * @property {string} name The shorthand name for the breakpoint.
     * @property {int} maxColumnsPerRow The maximum amount of columns to show in one row.
     * @property {int} columnMinFlex The minimum flex for a WorkPageColumn.
     */

    /**
     * Returns an array of all existing breakpoint settings.
     * The settings take into account the global config for tile sizeBehavior and the theme parameters for grid gap and tile size.
     *
     * @returns {Promise<BreakpointSetting[]>} An array of all existing breakpoints.
     * @private
     * @since 1.116.0
     */
    LayoutHelper.prototype._getBreakpointSettings = async function () {
        let sCurrentConfigSizeBehavior = Config.last("/core/home/sizeBehavior");
        let sSizeBehaviorResponsive = sCurrentConfigSizeBehavior === TileSizeBehavior.Small
            ? TileSizeBehavior.Small
            : TileSizeBehavior.Responsive;

        let sSpacingParamResponsive = sCurrentConfigSizeBehavior === TileSizeBehavior.Small
            ? "_sap_ushell_Tile_SpacingXS"
            : "_sap_ushell_Tile_Spacing";

        let sTileWidthParamResponsive = sCurrentConfigSizeBehavior === TileSizeBehavior.Small
            ? "_sap_ushell_Tile_WidthXS"
            : "_sap_ushell_Tile_Width";

        let mColumnMinFlex = {
            "lt-lp": this._getWorkPageColumnMinFlex(416),
            "lt-sp": this._getWorkPageColumnMinFlex(400),
            "st-lp": this._getWorkPageColumnMinFlex(352),
            "st-sp": this._getWorkPageColumnMinFlex(336)
        };

        const [sSpacing, sSpacingXS] = await ushellUtils.getThemingParameters([sSpacingParamResponsive, "_sap_ushell_Tile_SpacingXS"]);

        let mGap = {
            lt: this._formatNumericThemeParam(sSpacing),
            st: this._formatNumericThemeParam(sSpacingXS)
        };

        const [sWidth, sWidthXS] = await ushellUtils.getThemingParameters([sTileWidthParamResponsive, "_sap_ushell_Tile_WidthXS"]);

        let mRowSize = {
            lt: this._formatNumericThemeParam(sWidth),
            st: this._formatNumericThemeParam(sWidthXS)
        };

        return [
            {
                /**
                 * Large Tiles, Large Padding, 4 columns max
                 */
                high: Infinity,
                low: 1724,
                sizeBehavior: sSizeBehaviorResponsive,
                gap: mGap.lt,
                rowSize: mRowSize.lt,
                name: "lt-lp-4",
                maxColumnsPerRow: 4,
                columnMinFlex: mColumnMinFlex["lt-lp"]
            },
            {
                /**
                 * Large Tiles, Small Padding, 4 columns max
                 */
                high: 1723,
                low: 1660,
                sizeBehavior: sSizeBehaviorResponsive,
                gap: mGap.lt,
                rowSize: mRowSize.lt,
                name: "lt-sp-4",
                maxColumnsPerRow: 4,
                columnMinFlex: mColumnMinFlex["lt-sp"]
            },
            {
                /**
                 * Small Tiles, Large Padding, 4 columns max
                 */
                high: 1659,
                low: 1468,
                sizeBehavior: TileSizeBehavior.Small,
                gap: mGap.st,
                rowSize: mRowSize.st,
                name: "st-lp-4",
                maxColumnsPerRow: 4,
                columnMinFlex: mColumnMinFlex["st-lp"]
            },
            {
                /**
                 * Small Tiles, Small Padding, 4 columns max
                 */
                high: 1467,
                low: 1404,
                sizeBehavior: TileSizeBehavior.Small,
                gap: mGap.st,
                rowSize: mRowSize.st,
                name: "st-sp-4",
                maxColumnsPerRow: 4,
                columnMinFlex: mColumnMinFlex["st-sp"]
            },
            {
                /**
                 * Large Tiles, Large Padding, 3 columns max
                 */
                high: 1403,
                low: 1296,
                sizeBehavior: sSizeBehaviorResponsive,
                gap: mGap.lt,
                rowSize: mRowSize.lt,
                name: "lt-lp-3",
                maxColumnsPerRow: 3,
                columnMinFlex: mColumnMinFlex["lt-lp"]
            },
            {
                /**
                 * Large Tiles, Small Padding, 3 columns max
                 */
                high: 1295,
                low: 1248,
                sizeBehavior: sSizeBehaviorResponsive,
                gap: mGap.lt,
                rowSize: mRowSize.lt,
                name: "lt-sp-3",
                maxColumnsPerRow: 3,
                columnMinFlex: mColumnMinFlex["lt-sp"]
            },
            {
                /**
                 * Small Tiles, Large Padding, 3 columns max
                 */
                high: 1247,
                low: 1104,
                sizeBehavior: TileSizeBehavior.Small,
                gap: mGap.st,
                rowSize: mRowSize.st,
                name: "st-lp-3",
                maxColumnsPerRow: 3,
                columnMinFlex: mColumnMinFlex["st-lp"]
            },
            {
                /**
                 * Small Tiles, Small Padding, 3 columns max
                 */
                high: 1103,
                low: 1056,
                sizeBehavior: TileSizeBehavior.Small,
                gap: mGap.st,
                rowSize: mRowSize.st,
                name: "st-sp-3",
                maxColumnsPerRow: 3,
                columnMinFlex: mColumnMinFlex["st-sp"]
            }, {
                /**
                 * Large Tiles, Large Padding, 2 columns max
                 */
                high: 1055,
                low: 880,
                sizeBehavior: sSizeBehaviorResponsive,
                gap: mGap.lt,
                rowSize: mRowSize.lt,
                name: "lt-lp-2",
                maxColumnsPerRow: 2,
                columnMinFlex: mColumnMinFlex["lt-lp"]
            },
            {
                /**
                 * Large Tiles, Small Padding, 2 columns max
                 */
                high: 879,
                low: 848,
                sizeBehavior: sSizeBehaviorResponsive,
                gap: mGap.lt,
                rowSize: mRowSize.lt,
                name: "lt-sp-2",
                maxColumnsPerRow: 2,
                columnMinFlex: mColumnMinFlex["lt-sp"]
            },
            {
                /**
                 * Small Tiles, Large Padding, 2 columns max
                 */
                high: 847,
                low: 752,
                sizeBehavior: TileSizeBehavior.Small,
                gap: mGap.st,
                rowSize: mRowSize.st,
                name: "st-lp-2",
                maxColumnsPerRow: 2,
                columnMinFlex: mColumnMinFlex["st-lp"]
            },
            {
                /**
                 * Small Tiles, Small Padding, 2 columns max
                 */
                high: 751,
                low: 720,
                sizeBehavior: TileSizeBehavior.Small,
                gap: mGap.st,
                rowSize: mRowSize.st,
                name: "st-sp-2",
                maxColumnsPerRow: 2,
                columnMinFlex: mColumnMinFlex["st-sp"]
            },
            {
                /**
                 * Large Tiles, Large Padding, 1 column max
                 */
                high: 719,
                low: 456,
                sizeBehavior: sSizeBehaviorResponsive,
                gap: mGap.lt,
                rowSize: mRowSize.lt,
                name: "lt-lp-1",
                maxColumnsPerRow: 1,
                columnMinFlex: mColumnMinFlex["lt-lp"]
            },
            {
                /**
                 * Large Tiles, Small Padding, 1 column max
                 */
                high: 455,
                low: 440,
                sizeBehavior: sSizeBehaviorResponsive,
                gap: mGap.lt,
                rowSize: mRowSize.lt,
                name: "lt-sp-1",
                maxColumnsPerRow: 1,
                columnMinFlex: mColumnMinFlex["lt-sp"]
            },
            {
                /**
                 * Small Tiles, Large Padding, 1 column max
                 */
                high: 439,
                low: 392,
                sizeBehavior: TileSizeBehavior.Small,
                gap: mGap.st,
                rowSize: mRowSize.st,
                name: "st-lp-1",
                maxColumnsPerRow: 1,
                columnMinFlex: mColumnMinFlex["st-lp"]
            },
            {
                /**
                 * Small Tiles, Small Padding, 1 column max
                 */
                high: 391,
                low: 376,
                sizeBehavior: TileSizeBehavior.Small,
                gap: mGap.st,
                rowSize: mRowSize.st,
                name: "st-sp-1",
                maxColumnsPerRow: 1,
                columnMinFlex: mColumnMinFlex["st-sp"]
            },
            {
                /**
                 * Small Tiles, Small Padding, 1 column max
                 */
                high: 375,
                low: 0,
                sizeBehavior: TileSizeBehavior.Small,
                gap: mGap.st,
                rowSize: mRowSize.st,
                name: "st-sp-0",
                maxColumnsPerRow: 1,
                columnMinFlex: mColumnMinFlex["st-sp"]
            }
        ];
    };

    return new LayoutHelper();
});
