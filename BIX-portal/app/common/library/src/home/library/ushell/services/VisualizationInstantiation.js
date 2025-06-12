// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

/**
 * @fileOverview This module deals with the instantiation of visualizations in a platform independent way.
 * @version 1.125.0
 */
sap.ui.define([
    "../ui/launchpad/VizInstance",
    "../ui/launchpad/VizInstanceAbap",
    "../ui/launchpad/VizInstanceCdm",
    "../ui/launchpad/VizInstanceLaunchPage",
    "../ui/launchpad/VizInstanceLink",
    "sap/m/library",
    "../library",
    "sap/base/util/ObjectPath",
    "../EventHub",
    "../adapters/cdm/v3/_LaunchPage/readVisualizations"
], function (
    VizInstance,
    VizInstanceAbap,
    VizInstanceCdm,
    VizInstanceLaunchPage,
    VizInstanceLink,
    MobileLibrary,
    ushellLibrary,
    ObjectPath,
    EventHub,
    readVisualizations
) {
    "use strict";

    let LoadState = MobileLibrary.LoadState;

    // shortcut for sap.ushell.DisplayFormat
    let DisplayFormat = ushellLibrary.DisplayFormat;

    /**
     * @alias sap.ushell.services.VisualizationInstantiation
     * @class
     * @classdesc The Unified Shell's VisualizationInstantiation service.
     *
     * <b>Note:</b> To retrieve a valid instance of this service, it is necessary to call {@link sap.ushell.Container#getServiceAsync}.
     * <pre>
     *   sap.ui.require(["sap/ushell/Container"], async function (Container) {
     *     const VisualizationInstantiation = await Container.getServiceAsync("VisualizationInstantiation");
     *     // do something with the VisualizationInstantiation service
     *   });
     * </pre>
     *
     * @hideconstructor
     *
     * @since 1.77.0
     * @private
     * @ui5-restricted sap.esh.search.ui
     */
    function VisualizationInstantiation () { }

    /**
     * A factory function to create a VizInstance of type corresponding to source platform {ABAP|CDM|LINK|LAUNCHPAGE}
     *
     * @param {object} vizData VisualizationData for one single visualization
     *
     * @returns {sap.ushell.ui.launchpad.VizInstanceBase} A VizInstance based on the source platform
     * @since 1.77
     *
     * @private
     * @ui5-restricted sap.esh.search.ui
     */
    VisualizationInstantiation.prototype.instantiateVisualization = function (vizData) {
        let oVizInstance;
        let sPlatform = ObjectPath.get("_instantiationData.platform", vizData);

        let oVizInstanceData = {
            vizRefId: vizData.id,
            title: vizData.title,
            subtitle: vizData.subtitle,
            icon: vizData.icon,
            keywords: vizData.keywords,
            instantiationData: vizData._instantiationData,
            indicatorDataSource: vizData.indicatorDataSource,
            dataSource: vizData.dataSource,
            contentProviderId: vizData.contentProviderId,
            contentProviderLabel: vizData.contentProviderLabel,
            vizConfig: vizData.vizConfig,
            supportedDisplayFormats: vizData.supportedDisplayFormats,
            displayFormat: vizData.displayFormatHint,
            numberUnit: vizData.numberUnit,
            dataHelpId: vizData.vizId,
            preview: vizData.preview
        };

        // This prevents the path to be used as a binding path... yes its ugly... deal with it!
        if (oVizInstanceData.indicatorDataSource) {
            oVizInstanceData.indicatorDataSource.ui5object = true;
        }

        // Use VizInstanceLink instead of platform VizInstance in case the displayFormat is "compact"
        if ((sPlatform === "ABAP" || sPlatform === "CDM") && oVizInstanceData.displayFormat === DisplayFormat.Compact) {
            this._cleanInstantiationDataForLink(oVizInstanceData);
            sPlatform = "LINK";
        }

        if (sPlatform === "ABAP") {
            oVizInstance = new VizInstanceAbap(oVizInstanceData);
        } else if (sPlatform === "CDM") {
            oVizInstance = new VizInstanceCdm(oVizInstanceData);
        } else if (sPlatform === "LINK") {
            oVizInstance = new VizInstanceLink(oVizInstanceData);
        }
        /**
         * @deprecated As of version 1.120
         */
        if (sPlatform === "LAUNCHPAGE") {
            oVizInstance = new VizInstanceLaunchPage(oVizInstanceData);
        }
        if (!oVizInstance) {
            return new VizInstance({
                state: LoadState.Failed
            });
        }

        // we need to set these properties separately because it is likely that they contain stringified objects
        // which might be interpreted as complex binding
        // e.g. appSpecificRoute of search
        // BCP: 2070390842
        // BCP: 002075129400006346412020
        // BCP: 2180362150
        oVizInstance.setTargetURL(vizData.targetURL);
        if (sPlatform !== "LINK") {
            oVizInstance.setInfo(vizData.info);
        }

        if (readVisualizations.isStandardVizType(vizData.vizType)) {
            try {
                oVizInstance.load().then(function () {
                    // this event is currently only used to measure the TTI for which only standard VizTypes are relevant
                    EventHub.emit("VizInstanceLoaded", vizData.id);
                });
            } catch (error) {
                oVizInstance.setState(LoadState.Failed);
                // this event is currently only used to measure the TTI for which only standard VizTypes are relevant
                EventHub.emit("VizInstanceLoaded", vizData.id);
            }
        } else {
            oVizInstance.setState(LoadState.Loading);
            // load custom visualizations only after the core-ext modules have been loaded
            // to prevent that the custom visualizations trigger single requests
            EventHub.once("CoreResourcesComplementLoaded").do(function () {
                try {
                    // The parameter signals that this is a custom visualization.
                    // Only relevant for CDM
                    oVizInstance.load(true).then(function () {
                        oVizInstance.setState(LoadState.Loaded);
                    });
                } catch (error) {
                    oVizInstance.setState(LoadState.Failed);
                }
            });
        }

        return oVizInstance;
    };

    /**
     * Removes unnecessary properties for VizInstanceLink
     *
     * @param {object} oVizInstanceData The vizInstance data which should be modified
     *
     * @private
     * @since 1.84.0
     */
    VisualizationInstantiation.prototype._cleanInstantiationDataForLink = function (oVizInstanceData) {
        delete oVizInstanceData.info;
        delete oVizInstanceData.icon;
        delete oVizInstanceData.keywords;
        delete oVizInstanceData.instantiationData;
        delete oVizInstanceData.dataSource;
        delete oVizInstanceData.contentProviderId;
        delete oVizInstanceData.contentProviderLabel;
        delete oVizInstanceData.vizConfig;
        delete oVizInstanceData.numberUnit;
        delete oVizInstanceData.indicatorDataSource;
        delete oVizInstanceData.preview;
    };

    VisualizationInstantiation.hasNoAdapter = true;

    return VisualizationInstantiation;
});
