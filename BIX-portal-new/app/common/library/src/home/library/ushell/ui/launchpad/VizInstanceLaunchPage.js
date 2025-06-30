// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

/**
 * @fileoverview VizInstance module for classical home page
 * @deprecated As of version 1.120
 */
sap.ui.define([
    "./VizInstance",
    "../../library",
    "./VizInstanceRenderer"
], function (VizInstance, ushellLibrary, VizInstanceRenderer) {
    "use strict";

    // shortcut for sap.ushell.DisplayFormat
    let DisplayFormat = ushellLibrary.DisplayFormat;

    /**
     * @alias sap.ushell.ui.launchpad.VizInstanceLaunchPage
     * @class
     * @classdesc for a VizInstance for Classic Homepage tiles
     * The only use case for this thing so far is to be able to instantiate visualizations that were
     * retrieved from the SearchableContent service for the classic homepage.
     * Only functionality that is needed by the search UI is implemented.
     *
     * @extends sap.ushell.ui.launchpad.VizInstance
     * @param {object} vizData The visualization entity
     *
     * @since 1.81
     */
    let VizInstanceLaunchPage = VizInstance.extend("sap.ushell.ui.launchpad.VizInstanceLaunchPage", /** @lends sap.ushell.ui.launchpad.VizInstanceLaunchPage.prototype */ {
        metadata: {
            library: "sap.ushell"
        },
        renderer: VizInstanceRenderer
    });

    /**
     * A function which sets the content of the VizInstance to a UI5 view
     *
     * @returns {Promise<undefined>} Resolves when the chip instance is loaded
     * @since 1.81
     */
    VizInstanceLaunchPage.prototype.load = function () {
        let oTile = this.getInstantiationData().launchPageTile;
        return sap.ushell.Container.getServiceAsync("FlpLaunchPage")
            .then((oLaunchPageService) => {
                return new Promise((resolve, reject) => {
                    // The abap platform instantiates CatalogTiles by default as preview true.
                    const bPreview = this.getPreview();
                    // on a classic homepage there can be different tiles where the data comes from different sources
                    // many of them will be catalog tiles but e.g. bookmarks are group tiles
                    // for catalog tiles
                    oLaunchPageService.getCatalogTileViewControl(oTile, bPreview)
                        .done(resolve)
                        .fail(() => {
                            // for group tiles
                            oLaunchPageService.getTileView(oTile)
                                .done(resolve)
                                .fail(reject);
                        });
                }).then((oTileView) => {
                    this._setDisplayFormatFromTileSize(oTile, oLaunchPageService);
                    this.setContent(oTileView);
                    if (oTileView.getComponentInstance?.()) {
                        oTileView.getComponentInstance().setParent(this);
                    }
                });
            });
    };

    /**
     * Gets the tile's size and translates it into a display format
     *
     * @param {object} oTile The tile
     * @param {object} oLaunchPageService The LaunchPage service
     * @since 1.90
     */
    VizInstanceLaunchPage.prototype._setDisplayFormatFromTileSize = function (oTile, oLaunchPageService) {
        // the tile size has to be retrieved via the LaunchPage service as it is
        // not available during the vizInstance instantiation.
        // the call of setDisplayFormat implicitly leads to a _setSize() call
        // due to the formatter in the vizInstance's placeholder.
        // tiles of the classic homepage only support the following display formats
        let sTileSize = oLaunchPageService.getTileSize(oTile);
        if (sTileSize === "1x2") {
            this.setDisplayFormat(DisplayFormat.StandardWide);
        } else {
            this.setDisplayFormat(DisplayFormat.Standard);
        }
    };

    // visibility and refresh handling should not be needed by the search UI

    return VizInstanceLaunchPage;
});
