// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/base/Log"
  ], function (
      Log
    ) {
  
    "use strict";
  
    /**
     * @alias sap.ushell.utils.tilecard.TileCard
     * @class
     * @classdesc Util to create a TileCardConfiguration.
     * @since 1.123.0
     * @private
     */
  
    /**
     * @typedef {object} TileCardConfiguration ConfigurationData for the pagebuilder to instaniate a card.
     * @property {string} displayVariant The expected displayVariant for the tile card.
     * @property {string[]} availableDisplayVariants The available display variants for the tile card.
     * @property {boolean} error indicates if an error occured.
     */
  
    const sStaticAppLauncher = "sap.ushell.StaticAppLauncher";
    const sDynamicAppLauncher = "sap.ushell.DynamicAppLauncher";
    const sTileExtension = "module:sap/ushell/utils/tilecard/TileCardExtension";
    const oLogger = Log.getLogger("sap.ushell.utils.tilecard.TileCard");
  
  
    const errorTile = {
      _version: "1.41.0",
      "sap.app": {
          id: "sap.ushell.utils.tilecard.Error",
          type: "card",
          applicationVersion: {
              version: "1.123.0"
          },
          i18n: {
            bundleName: "sap.ushell.utils.tilecard.resources/resources"
          }
      },
      "sap.card": {
        type: "List",
        header: {
          title: "{{TileCard.Widget.NotAvailable}}",
          icon: {
            src: "sap-icon://sys-cancel"
          }
        }
      }
    };
  
    /**
     * Creates the TileCard Configuration based on the extended vizData.
     * The configuration contains additional data, besides the descriptor.value used to initialize a
     * card correctly.
     * @param {TileConfigurationData} oData the extended vizData.
     * @returns {TileCardConfiguration} The configuration object for a card.
     * @private
     * @since 1.123.0
     */
    function createTileCardConfiguration (oData) {
  
      let oResult;
      try {
        oResult = {
          descriptor: {
            value: createManifest(oData)
          },
          displayVariant: getDisplayVariant(oData.displayFormatHint || "standard"),
          availableDisplayVariants: getAvailableDisplayVariants(oData),
          error: false
        };
        // error case, not a custom tile and no descriptor
        if (!oResult.descriptor.value) {
          throw new Error("No custom tile and no descriptor value");
        }
        oLogger.debug("TileCard was initialized.", JSON.stringify(oData));
  
      } catch (ex) {
        oLogger.debug("TileCard cannot be initialized.", JSON.stringify(oData));
        oLogger.info("TileCard initialization failed", ex.message);
        oResult = {
          descriptor: {
            value: errorTile
          },
          displayVariant: getDisplayVariant(oData.displayFormatHint || "standard"),
          availableDisplayVariants: getAvailableDisplayVariants([
            "TileStandard",
            "TileFlat",
            "TileFlatWide",
            "TileStandardWide"
          ]),
          error: true
        };
      }
      return oResult;
    }
  
    /**
     * Creates and returns the Card manifest json for a static and dynamic tile
     * @param {ExtendedVizData} oData the extended viz data from WorkPageVizInstantiation
     * @returns {object | null} The manifest to be applied or null.
     * @private
     * @since 1.123.0
    */
    function createManifest (oData) {
      if (oData.vizType === sDynamicAppLauncher || oData.vizType === sStaticAppLauncher) {
        // always create a Numeric header for the card
        return getManifest(oData.vizType === sDynamicAppLauncher, oData);
      }
      return null;
    }
  
    /**
     * Returns the available display variants for the given oData.
     * If no supportedDisplayFormats are available, the TileStandard display variant is returned.
     *
     * @param {object} oData the vizConfig from the extended viz data.
     * @returns {string[]} The available display variants or ["TileStandard"]
     * @private
     * @since 1.123.0
     */
    function getAvailableDisplayVariants (oData) {
      if (!Array.isArray(oData.supportedDisplayFormats) || oData.supportedDisplayFormats.length === 0) {
        return ["TileStandard"];
      }
      const aFormats = oData.supportedDisplayFormats || [
        "flat",
        "standard",
        "standardWide",
        "flatWide",
        "compact"
      ];
  
      return aFormats.map(function (sFormat) {
        return getDisplayVariant(sFormat);
      });
    }
  
    /**
     * Returns the generated TileCard manifest for the static and dynamic tile described by the given oData.
     * @param {boolean} bDynamic true for a dynamic tile.
     * @param {ExtendedVizData} oData the extended viz data from WorkPageVizInstantiation.
     * @returns {object} The generated manifest.
     * @private
     * @since 1.123.0
    */
    function getManifest (bDynamic, oData) {
      return {
        _version: "1.41.0",
        "sap.app": {
            id: oData.id,
            type: "card",
            tags: { keywords: oData.keywords },
            i18n: {
              bundleName: "sap.ushell.utils.tilecard.resources/resources"
            }
        },
        "sap.ui": oData.vizConfig["sap.ui"] || {},
        "sap.flp": oData.vizConfig["sap.flp"] || {},
        "sap.fiori": oData.vizConfig["sap.fiori"] || {},
        "sap.card": {
          extension: bDynamic ? sTileExtension : "",
          header: getHeader(bDynamic, oData),
          type: "List",
          configuration: {
            parameters: {
              dataPath: {
                value: getDataPath(oData)
              }
            }
          }
        }
      };
    }
  
    /**
     * Returns the card header settings for the static and dynamic tile described by the given oData.
     * @param {boolean} bDynamic true for a dynamic tile.
     * @param {ExtendedVizData} oData the extended viz data from WorkPageVizInstantiation.
     * @returns {object} The header settings.
     * @private
     * @since 1.123.0
    */
    function getHeader (bDynamic, oData) {
      // use a numeric header to allow details/info to be shown
      const oHeaderConfig = {
        type: "Numeric",
        title: oData.title || "",
        titleMaxLines: oData.subtitle ? 2 : 3, // if there is a subtitle, we have 2 lines for title, otherwise 3
        subTitle: oData.subtitle || "", // card title is otherwise not top aligned. will be fixed to top soon.
        subTitleMaxLines: 1,
        wrappingType: "Hyphenated",
        icon: {
            src: oData.icon || "",
            shape: "Square",
            visible: !!oData.icon
        },
        actions: getNavigationAction(oData),
        details: {
          text: oData.info || "",
          state: "None"
        },
        banner: oData.displayProviderLabel ? [
          {
            text: oData.contentProviderLabel
          }
        ] : []
      };
  
      // dynamic tile specific settings and bindings
      if (bDynamic) {
        const dataSource = oData.indicatorDataSource;
        // initialize a data request later handled in TileCardExtension
        oHeaderConfig.data = {
          updateInterval: dataSource && dataSource.refresh ? dataSource.refresh : 0,
          path: "/",
          request: {
            method: "GET",
            url: "{parameters>/dataPath/value}",
            withCredentials: true,
            retryAfter: 1
          }
        };
  
        // all data bindings will be resolved after the TileCard Extension has loaded the data.
  
        // set or bind icon src and its visibility
        oHeaderConfig.icon.src = "{= ${/_data/icon} || '" + (oData.icon || "") + "'}";
        oHeaderConfig.icon.visible = "{= !!${/_data/icon}}";
        // set or bind number units
        oHeaderConfig.unitOfMeasurement = "{= ${/numberUnit} || '" + (oData.numberUnit || "") + "'}";
        // bind indicator to data
        oHeaderConfig.mainIndicator = {
            number: "{/_data/number}",
            unit: "{/_data/unit}",
            trend: "{/_data/trend}",
            state: "{/_data/state}"
        };
        // bind details
        oHeaderConfig.details = {
          text: "{= ${/_data/details/text} || '" + (oData.info || " ") + "'}", // bug, will be fixed, for blank text [Object object] is shown.
          state: "{= ${/_data/details/state} || 'None'}"
        };
      }
      return oHeaderConfig;
    }
  
    /**
     * Returns the navigation action for the header settings for the static and dynamic tile described by the given oData.
     * @param {ExtendedVizData} oData the extended viz data from WorkPageVizInstantiation.
     * @returns {object} The navigation action settings.
     * @private
     * @since 1.123.0
    */
    function getNavigationAction (oData) {
      // Can we only use the targetURL, what about the parameters like hint?
      const oTarget = oData.target;
      if (!oTarget) {
        return [];
      }
      if (oTarget.semanticObject && oTarget.action) {
          return [
              {
                  type: "Navigation",
                  parameters: {
                      ibnTarget: {
                          semanticObject: oTarget.semanticObject,
                          action: oTarget.action
                      },
                      ibnParams: oTarget.mParameters
                  }
              }
          ];
      } else if (oTarget.type && oTarget.type === "URL") {
        return [
          {
              type: "Navigation",
              parameters: {
                  url: oTarget.url
              }
          }
       ];
      } else if (oData.targetURL) {
        return [
          {
              type: "Navigation",
              parameters: {
                  url: oData.targetURL
              }
          }
        ];
      }
      return [];
    }
  
    /**
     * Returns the data path for dynamic data based on the indicatorDataSource and (if available) the corresponding dataSource.
     * @param {ExtendedVizData} oData the extended viz data from WorkPageVizInstantiation.
     * @returns {string} The dataPath.
     * @private
     * @since 1.123.0
    */
    function getDataPath (oData) {
      const oIndicatorDataSource = oData.indicatorDataSource;
      if (!oIndicatorDataSource) {
        return "";
      }
      let sPath = oIndicatorDataSource.path;
      if (oIndicatorDataSource.dataSource && oData.dataSource && oData.dataSource.uri) {
        if (!oData.dataSource.uri.endsWith("/")) {
          oData.dataSource.uri = oData.dataSource.uri + "/"; // ensure slash at end.
        }
        sPath = oData.dataSource.uri + oIndicatorDataSource.path;
        sPath = sPath.replaceAll("//", "/"); //avoid double slashes from concats.
      }
      return sPath || "/";
    }
  
    /**
     * Returns the display variant for the card settings derived from the displayFormatHint.
     * @param {string} sHint the displayFormatHint (standard, flat, flatWide, standardWide)
     * @returns {object} The display variant for the card.
     * @private
     * @since 1.123.0
    */
    function getDisplayVariant (sHint) {
      switch (sHint) {
        case "flat" : return "TileFlat";
        case "standardWide" : return "TileStandardWide";
        case "flatWide" : return "TileFlatWide";
        case "compact" : return "LinkHeader";
        default: return "TileStandard";
      }
    }
    return {
      createTileCardConfiguration: createTileCardConfiguration
    };
  });
  