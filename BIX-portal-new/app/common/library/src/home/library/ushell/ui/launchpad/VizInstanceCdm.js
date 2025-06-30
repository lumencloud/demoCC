// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

sap.ui.define([
    "./VizInstance",
    "sap/m/library",
    "sap/ui/core/Component",
    "sap/base/util/ObjectPath",
    "sap/base/util/deepExtend",
    "sap/ui/core/ComponentContainer",
    "../../UI5ComponentType",
    "./VizInstanceRenderer",
    "../../Container"
], function (
    VizInstance,
    mobileLibrary,
    Component,
    ObjectPath,
    deepExtend,
    ComponentContainer,
    UI5ComponentType,
    VizInstanceRenderer,
    Container
) {
    "use strict";

    let LoadState = mobileLibrary.LoadState;

    /**
     * @alias sap.ushell.ui.launchpad.VizInstanceCDM
     * @class
     * @classdesc for a VizInstance for CDM data
     *
     * @extends sap.ushell.ui.launchpad.VizInstance
     *
     * @since 1.78
     */
    let VizInstanceCdm = VizInstance.extend("sap.ushell.ui.launchpad.VizInstanceCdm", /** @lends sap.ushell.ui.launchpad.VizInstanceCDM.prototype */ {
        metadata: {
            library: "sap.ushell"
        },
        renderer: VizInstanceRenderer
    });

    /**
     * Creates the CDM visualization component and sets it as the content
     * of the VizInstance
     * @param {boolean} [bIsCustomVizType] Should be true if the visualization is a custom one.
     *
     * @returns {Promise<undefined>} Resolves when the component is loaded
     * @override
     * @since 1.78
     */
    VizInstanceCdm.prototype.load = function (bIsCustomVizType) {
        let oComponentPromise;

        if (bIsCustomVizType === true) {
            oComponentPromise = this._loadCustomVizType();
        } else {
            oComponentPromise = this._loadStandardVizType();
        }

        return oComponentPromise.then(function (oComponent) {
            this._oComponent = oComponent;
            let oContainer = new ComponentContainer({ component: oComponent });
            oComponent.setParent(this);
            this.setContent(oContainer);
            if (this.getSizeBehavior()) {
                this.setTileSizeBehavior(this.getSizeBehavior());
            }
            // notify component about its active state
            this._setComponentTileVisible(this.getActive());
            this.setTileEditable(this.getEditable());
        }.bind(this))
        .catch(function (oError) {
            this.setState(LoadState.Failed);
            return Promise.reject(oError);
        }.bind(this));
    };

    /**
     * Helper function that instantiates a standard (non-custom)
     * CDM visualization component using Component.create
     *
     * @returns {Promise<undefined>} Resolves when the component is loaded
     * @since 1.92
     * @private
     */
    VizInstanceCdm.prototype._loadStandardVizType = function () {
        let oComponentData = this._getComponentConfiguration();
        return Component.create(oComponentData);
    };

    /**
     * Helper function that instantiates a custom CDM visualization
     * component using the Ui5ComponentLoader
     *
     * @returns {Promise<undefined>} Resolves when the component is loaded
     * @since 1.92
     * @private
     */
    VizInstanceCdm.prototype._loadCustomVizType = function () {
        let oAppProperties = this._getCustomComponentConfiguration();
        let oParsedShellHash = {};
        let aWaitForBeforeInstantiation = [];

        return Container.getServiceAsync("Ui5ComponentLoader")
            .then(function (oComponentLoader) {
                let oUI5ComponentDeferred = oComponentLoader.createComponent(
                    oAppProperties,
                    oParsedShellHash,
                    aWaitForBeforeInstantiation,
                    UI5ComponentType.Visualization
                );
                // UI5ComponentLoader returns a deferred object, which we need to wrap in a native promise
                return new Promise(function (resolve, reject) {
                    oUI5ComponentDeferred.done(function (oUI5Component) {
                        resolve(oUI5Component);
                    });
                });
            })
            .then(function (oUI5Component) {
                // Custom tiles are instantiated with the Ui5ComponentLoader which returns
                // a wrapper, so we need to extract the component from it.
                if (oUI5Component && oUI5Component.componentHandle && oUI5Component.componentHandle.getInstance) {
                    return oUI5Component.componentHandle.getInstance();
                }
                throw new Error("Create component failed: no instance found in the component handle.");
            });
    };

    /**
     * Creates the configuration object for the component creation
     * from the visualization data
     *
     * @returns {object} The component configuration
     * @since 1.78
     */
    VizInstanceCdm.prototype._getComponentConfiguration = function () {
        let oVizType = this.getInstantiationData().vizType;
        let oVizConfig = this.getVizConfig();

        let oComponentProperties = ObjectPath.get(["sap.platform.runtime", "componentProperties"], oVizType);
        oComponentProperties = deepExtend({}, this._getComponentProperties(), oComponentProperties);

        let oComponentConfiguration = {
            name: oVizType["sap.ui5"].componentName,
            componentData: {
                properties: oComponentProperties
            },
            // this property can contain a URL from where the visualization type component
            // should be loaded
            url: ObjectPath.get(["sap.platform.runtime", "componentProperties", "url"], oVizType),
            // this property can contain a URL to a manifest that should be used instead of the
            // component's default manifest or a boolean or the manifest as object
            manifest: ObjectPath.get(["sap.platform.runtime", "componentProperties", "manifest"], oVizType),
            asyncHints: ObjectPath.get(["sap.platform.runtime", "componentProperties", "asyncHints"], oVizType)
        };

        let bIncludeVizType = ObjectPath.get(["sap.platform.runtime", "includeManifest"], oVizType);
        let bIncludeVizConfig = ObjectPath.get(["sap.platform.runtime", "includeManifest"], oVizConfig);

        if (bIncludeVizType || bIncludeVizConfig) {
            // the viz type already contains the component's complete manifest
            // so there is no need for the component factory to load it
            // the vizConfig can only be added to the manifest if there is a manifest
            oComponentConfiguration.manifest = deepExtend({}, oVizType, oVizConfig);
        }

        // This is a workaround for SSB tiles.
        // We expose the manifest in componentData properties. In case the manifest is available
        // the SSB tile handles this as "cdm" based tile, otherwise as "abap" chip-based tile.
        if (typeof oComponentConfiguration.manifest === "object") {
            oComponentProperties.manifest = oComponentConfiguration.manifest;
        }

        return oComponentConfiguration;
    };

    /**
     * Creates the configuration object for the component creation
     * of a custom visualization from its data
     *
     * @returns {object} The component configuration
     * @since 1.92
     * @private
     */
    VizInstanceCdm.prototype._getCustomComponentConfiguration = function () {
        let oComponentConfiguration = this._getComponentConfiguration();

        let oAppProperties = {
            loadCoreExt: true, // custom tiles may need modules from core-ext-light
            loadDefaultDependencies: false,
            componentData: oComponentConfiguration.componentData,
            url: oComponentConfiguration.url,
            applicationConfiguration: {},
            reservedParameters: {},
            applicationDependencies: oComponentConfiguration,
            ui5ComponentName: oComponentConfiguration.name
        };

        return oAppProperties;
    };

    /**
     * Extracts those properties from the visualization data that are passed to the
     * visualization component as component data.
     *
     * @returns {object} The properties for the component data.
     * @since 1.78
     */
    VizInstanceCdm.prototype._getComponentProperties = function () {
        return {
            title: this.getTitle(),
            subtitle: this.getSubtitle(),
            icon: this.getIcon(),
            info: this.getInfo(),
            indicatorDataSource: this.getIndicatorDataSource(),
            dataSource: this.getDataSource(),
            contentProviderId: this.getContentProviderId(),
            contentProviderLabel: this.getContentProviderLabel(),
            targetURL: this.getTargetURL(),
            displayFormat: this.getDisplayFormat(),
            numberUnit: this.getNumberUnit(),
            preview: this.getPreview()
        };
    };

    /**
     * Updates the visible state of the component by calling tileSetVisible.
     * This method might not exist for some visualizations.
     *
     * @param {boolean} bVisible The visualization component's active state.
     *
     * @since 1.84.0
     * @private
     */
    VizInstanceCdm.prototype._setComponentTileVisible = function (bVisible) {
        if (this._oComponent && typeof this._oComponent.tileSetVisible === "function") {
            this._oComponent.tileSetVisible(bVisible);
        }
    };

    /**
     * Updates the tile's active state.
     * Inactive dynamic tiles do not send requests.
     *
     * @param {boolean} active The visualization's updated active state.
     * @param {boolean} refresh The visualization's updated refresh state.
     * @returns {sap.ushell.ui.launchpad.VizInstanceCdm} this to allow method chaining.
     * @since 1.78.0
     */
    VizInstanceCdm.prototype.setActive = function (active, refresh) {
        this._setComponentTileVisible(active);

        if (refresh) {
            this.refresh();
        }
        return this.setProperty("active", active, false);
    };

    /**
     * Overrides the VizInstance method. Calls the component API to activate edit mode on the tile.
     *
     * @param {boolean} editable The edit mode flag.
     * @returns {this} Reference to <code>this</code> for method chaining.
     * @since 1.104.0
     */
    VizInstanceCdm.prototype.setTileEditable = function (editable) {
        if (this._oComponent && typeof this._oComponent.tileSetEditMode === "function") {
            this._oComponent.tileSetEditMode(editable);
        }
        return this;
    };

    /**
     * Overrides the VizInstance method. Calls the component API to set sizeBehavior on the tile.
     *
     * @param {sap.m.TileSizeBehavior} sSizeBehavior The sizeBehavior.
     * @returns {this} Reference to <code>this</code> for method chaining.
     * @since 1.116.0
     */
    VizInstanceCdm.prototype.setTileSizeBehavior = function (sSizeBehavior) {
        if (this._oComponent && typeof this._oComponent.tileSetSizeBehavior === "function") {
            this._oComponent.tileSetSizeBehavior(sSizeBehavior);
        }
        VizInstance.prototype.setTileSizeBehavior.apply(this, arguments);
        return this;
    };

    /**
     * Overrides the VizInstance method. Calls the component API to set preview to true|false on the component.
     * If the preview is switched from true to false, refresh is called.
     *
     * @param {boolean} bPreview The preview flag.
     * @returns {this} Reference to <code>this</code> for method chaining.
     * @since 1.116.0
     */
    VizInstanceCdm.prototype.setPreview = function (bPreview) {
        let bRefresh = !!this.getProperty("preview") && !bPreview;

        if (this._oComponent && typeof this._oComponent.tileSetPreview === "function") {
            this._oComponent.tileSetPreview(bPreview);
        }

        if (bRefresh) {
            this.refresh();
        }

        VizInstance.prototype.setPreview.apply(this, arguments);
        return this;
    };

    /**
     * Updates the tile refresh state to determine if a tile needs to be updated.
     *
     * @since 1.78.0
     */
    VizInstanceCdm.prototype.refresh = function () {
        if (this._oComponent && typeof this._oComponent.tileRefresh === "function") {
            this._oComponent.tileRefresh();
        }
    };

    return VizInstanceCdm;
});
