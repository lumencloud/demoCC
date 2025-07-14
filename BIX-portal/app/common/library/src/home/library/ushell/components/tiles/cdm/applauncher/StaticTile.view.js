// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ui/core/mvc/View",
    "sap/m/GenericTile",
    "sap/m/ImageContent",
    "sap/m/TileContent"
], function (View, GenericTile, ImageContent, TileContent) {
    "use strict";

    return View.extend("BaseFiles.home..library.ushell.components.tiles.cdm.applauncher.StaticTile", {
        getControllerName: function () {
            return "BaseFiles.home.library.ushell.components.tiles.cdm.applauncher.StaticTile";
        },
        createContent: function (oController) {
            this.setHeight("100%");
            this.setWidth("100%");

            //Return the GenericTile if it already exists instead of creating a new one
            if (this.getContent().length === 1) {
                return this.getContent()[0];
            }

            return new GenericTile({
                mode: "{/properties/mode}",
                header: "111",
                scope: "{/properties/scope}",
                subheader: "222",
                sizeBehavior: "{= ${/properties/customSizeBehavior} || ${/properties/configSizeBehavior}}",
                frameType: "{/properties/frameType}",
                wrappingType: "{/properties/wrappingType}",
                url: {
                    path: "/properties/targetURL",
                    formatter: oController._getLeanUrl.bind(oController)
                },
                tileContent: new TileContent({
                    footer: "{/properties/info}",
                    content: new ImageContent({ src: "{/properties/icon}" })
                }),
                press: [oController.onPress, oController],
                additionalTooltip: "{/properties/contentProviderLabel}"
            });
        }
    });
});
