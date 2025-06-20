// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

/**
 * @namespace sap.ushell.services
 * @description Default namespace for Unified Shell services.
 * @see sap.ushell.Container.getServiceAsync
 * @since 1.15.0
 * @public
 */

/**
 * @name sap.ushell.services.Service
 * @class
 * @classdesc Abstract base class for ushell services. For details, see {@link sap.ushell.Container#getServiceAsync}.
 *
 * @hideconstructor
 * @abstract
 *
 * @see sap.ushell.Container.getServiceAsync
 * @since 1.121.0
 * @public
 */

/**
 * An enumeration for the application work protect mode state.
 * @typedef {object} sap.ushell.Container.DirtyState
 *
 * @property {"CLEAN"} CLEAN The embedded application is clean, there is no unsaved data.
 * @property {"DIRTY"} DIRTY The embedded application is dirty, the user has entered data that is not yet saved.
 * @property {"MAYBE_DIRTY"} MAYBE_DIRTY The embedded application container's dirty state cannot be determined because of technical reasons.
 *
 * @since 1.90.0
 * @public
 */

sap.ui.define([
    "sap/base/assert",
    "sap/base/Log",
    "sap/base/util/deepExtend",
    "sap/base/util/extend",
    "sap/base/util/uid",
    "sap/ui/base/EventProvider",
    "sap/ui/core/Control",
    "sap/ui/core/EventBus",
    "sap/ui/core/service/ServiceFactoryRegistry",
    "sap/ui/performance/Measurement",
    "sap/ui/thirdparty/jquery",
    "sap/ui/thirdparty/URI",
    "sap/ui/util/Mobile",
    "./bootstrap/common/common.util",
    "./EventHub",
    "./System",
    "./Ui5ServiceFactory",
    "./utils",
    "./utils/UrlParsing",
    "./renderer/ShellLayout",
    "sap/base/util/Deferred",
    "sap/base/util/ObjectPath"
], function (
    assert,
    Log,
    deepExtend,
    extend,
    uid,
    EventProvider,
    Control,
    EventBus,
    ServiceFactoryRegistry,
    Measurement,
    jQuery,
    URI,
    MobileSupport,
    commonUtils,
    EventHub,
    System,
    oUi5ServiceFactory,
    ushellUtils,
    UrlParsing,
    ShellLayout,
    Deferred,
    ObjectPath
) {
    "use strict";

    /* global OData */

    let S_COMPONENT_NAME = "sap.ushell.Container";
    let S_DIRTY_STATE_PREFIX = "sap.ushell.Container.dirtyState.";
    // The configuration as read from window["sap-ushell-config"]
    let oConfigSetting = {};
    let oConfig;
    // Map with platform-specific packages for the service adapters.
    // This map is passed in bootstrap and is valid for the given logon platform
    let mPlatformPackages;
    let aAsyncLogoutEventFunctions = []; //async logout even functions that return a promise
    let oContainerInstance;

    // Try to close window. Note: Most browsers do NOT allow closing windows by JS if they were opened manually.
    function closeWindow () {
        close();
    }

    // Redirect window to something other than "/sap/public/bc/icf/logoff".
    function redirectWindow () {
        document.location = "about:blank";
    }

    /**
     * Gets the platform specific package of the adapters.
     *
     * @param {string} sPlatform the platform
     * @returns {string} platform specific package
     */
    function getPlatformPackage (sPlatform) {
        if (mPlatformPackages && mPlatformPackages[sPlatform]) {
            return mPlatformPackages[sPlatform];
        }
        return "sap.ushell.adapters." + sPlatform;
    }

    /**
     * Gets the service configuration from window["sap-ushell-config"].services[sServiceName].
     * Ensures to return an object.
     *
     * @param {string} sServiceName the service name
     * @returns {object} the service configuration
     */
    function getServiceConfig (sServiceName) {
        let oServices = oConfig.services;
        if (!oServices) {
            return {};
        }
        // Special case: Notifications and NotificationsV2 configurations are interchangeable.
        // Notifications service configuration has priority
        if (sServiceName === "Notifications" || sServiceName === "NotificationsV2") {
            return oServices.Notifications || oServices.NotificationsV2 || {};
        }
        return oServices[sServiceName] || {};
    }

    /**
     * Creates an adapter. Loads the adapter module if necessary. The resulting module name is
     * <code>"sap.ushell.adapters." + oSystem.platform + "." + sName + "Adapter"</code> unless configured differently.
     *
     * @param {string} sName the service name
     * @param {sap.ushell.System} oSystem the target system.
     * @param {string} [sParameter] a parameter which is passed to the constructor.
     * @param {boolean} [bAsync] if true, the adapter is loaded asynchronously and a Promise is returned.
     * @param {boolean} [bUseConfiguredAdapterOnly=false] If set to <code>true</code> no platform-specific adapter will be loaded, even
     *      when no adapter is given in the configuration of the service.
     * @returns {object|Promise} the adapter or, in asynchronous mode, a Promise that returns the adapter
     */
    function createAdapter (sName, oSystem, sParameter, bAsync, bUseConfiguredAdapterOnly) {
        let oAdapterConfig = getServiceConfig(sName).adapter || {};
        let sAdapterName;

        async function getAdapterInstance (AdapterModule) {
            let AdapterClass;
            try {
                [AdapterClass] = await ushellUtils.requireAsync([AdapterModule]);
            } catch (oError) {
                if (AdapterModule.endsWith("PersonalizationV2Adapter")) {
                    const sNewAdapterModule = AdapterModule.replace("PersonalizationV2Adapter", "PersonalizationAdapter");
                    return getAdapterInstance(sNewAdapterModule);
                }
                if (AdapterModule.endsWith("FlpLaunchPageAdapter")) {
                    const sNewAdapterModule = AdapterModule.replace("FlpLaunchPageAdapter", "LaunchPageAdapter");
                    return getAdapterInstance(sNewAdapterModule);
                }
                throw oError;
            }
            let oAdapterInstance = new AdapterClass(oSystem, sParameter, { config: oAdapterConfig.config || {} });
            return oAdapterInstance;
        }

        if (bUseConfiguredAdapterOnly === true) {
            sAdapterName = oAdapterConfig.module;
            if (sAdapterName === undefined) {
                return (bAsync ? Promise.resolve() : undefined);
            }
        } else {
            sAdapterName = oAdapterConfig.module || getPlatformPackage(oSystem.getPlatform()) + "." + sName + "Adapter";
        }

        let sModule = sAdapterName.replace(/\./g, "/");

        /**
         * @deprecated As of version 1.100
         * @private
         */
        function getAdapterInstanceSync (AdapterModule) {
            let AdapterClass;
            try {
                AdapterClass = sap.ui.requireSync(AdapterModule); // LEGACY API (deprecated)
            } catch (oError) {
                if (AdapterModule.endsWith("PersonalizationV2Adapter")) {
                    const sNewAdapterModule = AdapterModule.replace("PersonalizationV2Adapter", "PersonalizationAdapter");
                    AdapterClass = sap.ui.requireSync(sNewAdapterModule); // LEGACY API (deprecated)
                } else {
                    throw oError;
                }
            }
            return new AdapterClass(oSystem, sParameter,
                { config: oAdapterConfig.config || {} }
            );
        }

        /**
         * @deprecated As of version 1.100
         * @private
         */
        if (!bAsync) {
            return getAdapterInstanceSync(sModule);
        }
        return getAdapterInstance(sModule);
    }

    /**
     * @alias sap.ushell.Container
     * @namespace
     * @description The Unified Shell's container. Manages renderers, services, and adapters.
     * The container is designed to be a singleton, therefore instead of creating an instance, access the central one via
     * <pre>
     *   sap.ui.require(["sap/ushell/Container"], async function (Container) {
     *     // do something with the container
     *   });
     * </pre>
     *
     * @since 1.15.0
     * @public
     */
    function Container () {
        let oEventProvider = new EventProvider();
        let isDirty = false;
        let aRegisteredDirtyMethods = [];
        let oRenderers = {};
        let sRemoteSystemPrefix;
        let mRemoteSystems = {};
        let oGlobalDirtyDeferred;
        let fnStorageEventListener;
        let oLocalStorage = ushellUtils.getLocalStorage();
        let mServicesByName = new ushellUtils.Map();
        let mServicesByNamePromise = new ushellUtils.Map();
        let sSessionTerminationKey;
        let that = this;

        let oAdapter;
        let bInitialized = false;

        let oContainerReadyDeferred = new Deferred();

        /**
         * @param {string} sPlatform The platform to initialize
         * @param {object} mAdapterPackagesByPlatform The adapters
         * @returns {Promise} Resolves once the container is initialized
         *
         * @private
         * @alias sap.ushell.Container#init
         */
        this.init = function (sPlatform, mAdapterPackagesByPlatform) {
            ObjectPath.set("sap.ushell.Container", oContainerInstance);
            return this._init(sPlatform, mAdapterPackagesByPlatform)
                .then(function (oCreatedAdapter) {
                    oAdapter = oCreatedAdapter;
                })
                .then(function () {
                    sRemoteSystemPrefix = "sap.ushell.Container." + oAdapter.getSystem().getPlatform() + ".remoteSystem.";
                    sSessionTerminationKey = "sap.ushell.Container." + oAdapter.getSystem().getPlatform() + ".sessionTermination";
                    afterInit();
                    bInitialized = true;
                    oContainerReadyDeferred.resolve();
                    return;
                });
        };

        /**
         * @returns {boolean} Whether the container is initialized
         *
         * *Note*: ONLY for ushell-internal use!
         * This API must not be used by any consumer outside ushell lib.
         *
         * Other SAP-internal consumers can use ready() on request (after
         * the consuming lib has been added to the restriced list) when
         * they need a definite trigger to run code after FLP's bootstrap.
         * Besides that, sap.ui.require("sap/ushell/Container") (Container proping)
         * should be used to identify if a FLP environment has been launched, i.e. if
         * an app is running stand-alone or hosted in a Fiori launchpad.
         *
         * @private
         */
        this.isInitialized = function () {
            return bInitialized;
        };

        /**
         * Cancels the logon procedure in the current frame, if any.
         * This MUST be used by the logon frame provider in case the user wants to close the logon frame for good.
         * It will report "Authentication cancelled" and let all pending requests for the current realm fail.
         * As a side-effect, it also calls <code>destroy</code> on the logon frame provider.
         *
         * @since 1.21.2
         * @public
         * @see sap.ushell.Container#setLogonFrameProvider
         * @deprecated since 1.120
         * @alias sap.ushell.Container#cancelLogon
         */
        this.cancelLogon = function () {
            if (this.oFrameLogonManager) {
                this.oFrameLogonManager.abortLogon();
            }
        };

        /**
         * Creates a new renderer instance for the given renderer name.
         *
         * Names without a dot are interpreted as package names within the default naming convention and will be expanded to
         * <code>"sap.ushell.renderers." + sRendererName + ".Renderer"</code>.
         * Names containing a dot are used "as is".
         *
         * The resulting name must point to a SAPUI5 object which is first required and then instantiated (without arguments).
         * The object is expected to be a UI component (i.e. extend <code>sap.ui.core.UIComponent</code>), which is then automatically
         * wrapped into a <code>sap.ui.core.ComponentContainer</code> control by this method.
         * The <code>sap.ui.core.ComponentContainer</code> is created with <code>height</code> and <code>width</code>
         * set to "100%" to accommodate the complete available space.
         * Besides UIComponents a control (i.e. extend <code>sap.ui.core.Control</code>) is accepted, too.
         *
         * The returned renderer is supposed to be added to a direct child (for example <code>div</code>) of the <code>body</code>
         * of the page and there should be no other parts of the page consuming space outside the renderer.
         * Use CSS class <code>sapUShellFullHeight</code> at <code>html</code>, <code>body</code> and at the element
         * to which the renderer is added to allow the renderer to use 100% height.
         *
         * @param {string} [sRendererName] The renderer name, such as "standard" or "acme.foo.bar.MyRenderer";
         *   it is taken from the configuration property <code>defaultRenderer</code> if not given here.
         * @param {boolean} [bAsync] If <code>true</code>, the renderer is created asynchronously and a <code>Promise</code> is returned.
         *
         * @returns {sap.ui.core.Control|Promise<sap.ui.core.Control>|sap.ui.core.ComponentContainer|Promise<sap.ui.core.ComponentContainer>} the renderer or Promise (in asynchronous mode)
         * @since 1.15.0
         * @public
         * @deprecated since 1.120.0
         * @alias sap.ushell.Container#createRenderer
         */
        this.createRenderer = function (sRendererName, bAsync) {
            // shift params if necessary
            if (typeof sRendererName === "boolean") {
                bAsync = sRendererName;
                sRendererName = undefined;
            }

            let oComponentData = { async: !!bAsync };
            let sComponentName;
            let oRendererConfig;

            Measurement.start("FLP:Container.InitLoading", "Initial Loading", "FLP");
            ushellUtils.setPerformanceMark("FLP - renderer created");
            sRendererName = sRendererName || oConfig.defaultRenderer;
            if (!sRendererName) {
                throw new Error("Missing renderer name");
            }
            oRendererConfig = (oConfig && oConfig.renderers && oConfig.renderers[sRendererName]) || {};
            sComponentName = oRendererConfig.module || (sRendererName.indexOf(".") < 0
                ? "sap.ushell.renderers." + sRendererName + ".Renderer"
                : sRendererName);

            // this migration only fails for launchpads overwriting the resource path of the renderer
            if (sComponentName === "sap.ushell.renderers.fiori2.Renderer") {
                sComponentName = "sap.ushell.renderer.Renderer";
            }

            if (oRendererConfig.componentData && oRendererConfig.componentData.config) {
                oComponentData.config = oRendererConfig.componentData.config;
            }

            function getRendererInstance (Module) {
                let ModuleClass = sap.ui.requireSync(Module); // LEGACY API (deprecated)
                let oRenderer = new ModuleClass({ componentData: oComponentData });
                let oShellControl;
                let UIComponent = sap.ui.requireSync("sap/ui/core/UIComponent"); // LEGACY API (deprecated)

                if (oRenderer instanceof UIComponent) {
                    let ComponentContainer = sap.ui.requireSync("sap/ui/core/ComponentContainer"); // LEGACY API (deprecated)
                    oShellControl = new ComponentContainer({ component: oRenderer, height: "100%", width: "100%" });
                } else {
                    oShellControl = oRenderer;
                }

                if (!(oShellControl instanceof Control)) {
                    throw new Error("Unsupported renderer type for name " + sRendererName);
                }

                replacePlaceAt(oShellControl);
                replaceDestroy(oShellControl);
                oRenderers[sRendererName] = oRenderer;

                oEventProvider.fireEvent("rendererCreated", {
                    renderer: oRenderer
                });
                return oShellControl;
            }

            function getRendererInstanceAsync (Module) {
                return new Promise(function (resolve, reject) {
                    sap.ui.require([
                        Module,
                        "sap/ui/core/ComponentContainer",
                        "sap/ui/core/UIComponent",
                        "sap/ui/core/routing/Router" // As ushell.Renderer does not use manifest-first the router needs to be loaded async beforehand
                    ], function (RendererClass, ComponentContainer, UIComponent) {
                        let oRenderer = new RendererClass({ componentData: oComponentData });

                        if (oRenderer instanceof UIComponent) {
                            let oComponentContainer = new ComponentContainer({
                                component: oRenderer,
                                height: "100%",
                                width: "100%",
                                async: true
                            });
                            replacePlaceAt(oComponentContainer);
                            replaceDestroy(oComponentContainer);
                            oRenderers[sRendererName] = oRenderer;
                            oRenderer.rootControlLoaded().then(function () {
                                oEventProvider.fireEvent("rendererCreated", { renderer: oRenderer });
                                resolve(oComponentContainer);
                            });
                        } else if (oRenderer instanceof Control) {
                            replacePlaceAt(oRenderer);
                            replaceDestroy(oRenderer);
                            oRenderers[sRendererName] = oRenderer;
                            oEventProvider.fireEvent("rendererCreated", { renderer: oRenderer });
                            resolve(oRenderer);
                        } else {
                            reject(new Error("Unsupported renderer type!"));
                        }
                    });
                });
            }

            function replacePlaceAt (RendererControl) {
                // Some applications place the shell directly into the body element.
                // However, this breaks the layout with separate UI Areas.
                // Wrap the control into the #canvas div in this case.
                RendererControl.placeAt = function (sRef, vPosition) {
                    let oContainer = sRef;
                    let canvasId = "canvas";
                    let body = document.body;
                    if (sRef === body.id) {
                        oContainer = document.createElement("div");
                        oContainer.setAttribute("id", canvasId);
                        oContainer.classList.add("sapUShellFullHeight");
                        switch (vPosition) {
                            case "first":
                                if (body.firstChild) {
                                    body.insertBefore(oContainer, body.firstChild);
                                    break;
                                }
                            /* falls through */
                            case "only":
                                body.innerHTML = "";
                            /* falls through */
                            default:
                                body.appendChild(oContainer);
                        }
                        sRef = canvasId;
                        vPosition = "";
                    }
                    ShellLayout.applyLayout(sRef);
                    EventHub.emit("ShellLayoutApplied", Date.now());
                    Control.prototype.placeAt.call(this, sRef, vPosition);
                };
            }

            function replaceDestroy (oControl) {
                let fnOriginalDestroy = oControl.destroy;
                oControl.destroy = function () {
                    if (oControl.isA("sap.ui.core.ComponentContainer")) {
                        return Promise.resolve(oControl.getComponentInstance().destroy()).then(function () {
                            return fnOriginalDestroy.apply(oControl, arguments);
                        });
                    }
                    return Promise.resolve(fnOriginalDestroy.apply(oControl, arguments));
                };
            }

            let sModule = sComponentName.replace(/\./g, "/");
            if (bAsync) {
                return getRendererInstanceAsync(sModule);
            }

            Log.error("sap.ushell.Container.createRenderer() should always be called with bAsync:true.");
            return getRendererInstance(sModule);
        };

        /**
         * Creates a new renderer instance for the given renderer name.
         *
         * Names without a dot are interpreted as package names within the default naming convention and will be expanded to
         * <code>"sap.ushell.renderers." + sRendererName + ".Renderer"</code>.
         * Names containing a dot are used "as is".
         *
         * The resulting name must point to a SAPUI5 object which is first required and then instantiated (without arguments).
         * The object is expected to be a UI component (i.e. extend <code>sap.ui.core.UIComponent</code>), which is then automatically
         * wrapped into a <code>sap.ui.core.ComponentContainer</code> control by this method.
         * The <code>sap.ui.core.ComponentContainer</code> is created with <code>height</code> and <code>width</code>
         * set to "100%" to accommodate the complete available space.
         * Besides UIComponents a control (i.e. extend <code>sap.ui.core.Control</code>) is accepted, too.
         *
         * The returned renderer is supposed to be added to a direct child (for example <code>div</code>) of the <code>body</code>
         * of the page and there should be no other parts of the page consuming space outside the renderer.
         * Use CSS class <code>sapUShellFullHeight</code> at <code>html</code>, <code>body</code> and at the element
         * to which the renderer is added to allow the renderer to use 100% height.
         *
         * @param {string} [sRendererName] The renderer name, such as "standard" or "acme.foo.bar.MyRenderer";
         *   it is taken from the configuration property <code>defaultRenderer</code> if not given here.
         *
         * @returns {Promise<sap.ui.core.Control>|Promise<sap.ui.core.ComponentContainer>} the renderer or Promise (in asynchronous mode)
         *
         * @since 1.120.0
         * @private
         * @alias sap.ushell.Container#createRendererInternal
         */
        this.createRendererInternal = async function (sRendererName) {
            let oComponentData = { async: true };
            let sComponentName;
            let oRendererConfig;

            Measurement.start("FLP:Container.InitLoading", "Initial Loading", "FLP");
            ushellUtils.setPerformanceMark("FLP - renderer created");
            sRendererName = sRendererName || oConfig.defaultRenderer;
            if (!sRendererName) {
                throw new Error("Missing renderer name");
            }
            oRendererConfig = (oConfig.renderers && oConfig.renderers[sRendererName]) || {};
            sComponentName = oRendererConfig.module || (sRendererName.indexOf(".") < 0
                ? "sap.ushell.renderers." + sRendererName + ".Renderer"
                : sRendererName);

            // this migration only fails for launchpads overwriting the resource path of the renderer
            if (sComponentName === "sap.ushell.renderers.fiori2.Renderer") {
                sComponentName = "sap.ushell.renderer.Renderer";
            }

            if (oRendererConfig.componentData && oRendererConfig.componentData.config) {
                oComponentData.config = oRendererConfig.componentData.config;
            }

            function replacePlaceAt (RendererControl) {
                // Some applications place the shell directly into the body element.
                // However, this breaks the layout with separate UI Areas.
                // Wrap the control into the #canvas div in this case.
                RendererControl.placeAt = function (sRef, vPosition) {
                    let oContainer = sRef;
                    let canvasId = "canvas";
                    let body = document.body;
                    if (sRef === body.id) {
                        oContainer = document.createElement("div");
                        oContainer.setAttribute("id", canvasId);
                        oContainer.classList.add("sapUShellFullHeight");
                        switch (vPosition) {
                            case "first":
                                if (body.firstChild) {
                                    body.insertBefore(oContainer, body.firstChild);
                                    break;
                                }
                            /* falls through */
                            case "only":
                                body.innerHTML = "";
                            /* falls through */
                            default:
                                body.appendChild(oContainer);
                        }
                        sRef = canvasId;
                        vPosition = "";
                    }
                    ShellLayout.applyLayout(sRef);
                    EventHub.emit("ShellLayoutApplied", Date.now());
                    Control.prototype.placeAt.call(this, sRef, vPosition);
                };
            }

            function replaceDestroy (oControl) {
                let fnOriginalDestroy = oControl.destroy;
                oControl.destroy = function () {
                    if (oControl.isA("sap.ui.core.ComponentContainer")) {
                        return Promise.resolve(oControl.getComponentInstance().destroy()).then(function () {
                            return fnOriginalDestroy.apply(oControl, arguments);
                        });
                    }
                    return Promise.resolve(fnOriginalDestroy.apply(oControl, arguments));
                };
            }

            let sModule = sComponentName.replace(/\./g, "/");
            const [
                RendererClass,
                ComponentContainer,
                UIComponent
            ] = await ushellUtils.requireAsync([
                sModule,
                "sap/ui/core/ComponentContainer",
                "sap/ui/core/UIComponent",
                "sap/ui/core/routing/Router" // As ushell.Renderer does not use manifest-first the router needs to be loaded async beforehand
            ]);
            let oRenderer = new RendererClass({ componentData: oComponentData });

            if (oRenderer instanceof UIComponent) {
                let oComponentContainer = new ComponentContainer({
                    component: oRenderer,
                    height: "100%",
                    width: "100%",
                    async: true
                });
                replacePlaceAt(oComponentContainer);
                replaceDestroy(oComponentContainer);
                oRenderers[sRendererName] = oRenderer;

                await oRenderer.rootControlLoaded();
                oEventProvider.fireEvent("rendererCreated", { renderer: oRenderer });
                return oComponentContainer;
            } else if (oRenderer instanceof Control) {
                replacePlaceAt(oRenderer);
                replaceDestroy(oRenderer);
                oRenderers[sRendererName] = oRenderer;

                oEventProvider.fireEvent("rendererCreated", { renderer: oRenderer });
                return oRenderer;
            }

            throw new Error("Unsupported renderer type!");
        };

        /**
         * Gets a renderer instance for the given renderer name, that was created by the createRenderer method.
         *
         * @param {string} [sRendererName] The renderer name, such as "standard" or "fiori2";
         *   it is taken from the configuration property <code>defaultRenderer</code> if not given here.
         * @returns {sap.ui.core.Control|sap.ui.core.Component} the renderer with the specified name; the returned object is either a control
         *   (i.e. extend <code>sap.ui.core.Control</code>) or a UI component (i.e. extend <code>sap.ui.core.UIComponent</code>),
         *   i.e. this method unwraps the renderer component from its <code>sap.ui.core.ComponentContainer</code>;
         *   if no renderer name can be determined and a single renderer instance has been created, this single instance is returned.
         *
         * @since 1.30.0
         * @public
         * @deprecated since 1.120. Use {@link sap.ushell.services.Extension} for shell extensions instead.
         * @alias sap.ushell.Container#getRenderer
         */
        this.getRenderer = function (sRendererName) {
            let oRendererControl;

            sRendererName = sRendererName || oConfig.defaultRenderer;

            if (sRendererName) {
                oRendererControl = oRenderers[sRendererName];
            } else {
                let aRendererNames = Object.keys(oRenderers);
                if (aRendererNames.length === 1) {
                    oRendererControl = oRenderers[aRendererNames[0]];
                } else {
                    Log.warning(
                        "getRenderer() - cannot determine renderer, because no default renderer is configured and multiple instances exist.",
                        null,
                        S_COMPONENT_NAME);
                }
            }

            // unwrap the component instance in case of components
            if (oRendererControl && oRendererControl.isA("sap.ui.core.ComponentContainer")) { //pending dependency migration
                return oRendererControl.getComponentInstance();
            }

            // maybe undefined
            return oRendererControl;
        };

        /**
         * Gets a renderer instance for the given renderer name, that was created by the createRenderer method.
         *
         * @param {string} [sRendererName] The renderer name, such as "standard" or "fiori2";
         *   it is taken from the configuration property <code>defaultRenderer</code> if not given here.
         * @returns {sap.ui.core.Control|sap.ui.core.Component} the renderer with the specified name; the returned object is either a control
         *   (i.e. extend <code>sap.ui.core.Control</code>) or a UI component (i.e. extend <code>sap.ui.core.UIComponent</code>),
         *   i.e. this method unwraps the renderer component from its <code>sap.ui.core.ComponentContainer</code>;
         *   if no renderer name can be determined and a single renderer instance has been created, this single instance is returned.
         *
         * @since 1.120.0
         * @private
         * @alias sap.ushell.Container#getRendererInternal
         */
        this.getRendererInternal = function (sRendererName) {
            let oRendererControl;

            sRendererName = sRendererName || oConfig.defaultRenderer;

            if (sRendererName) {
                oRendererControl = oRenderers[sRendererName];
            } else {
                let aRendererNames = Object.keys(oRenderers);
                if (aRendererNames.length === 1) {
                    oRendererControl = oRenderers[aRendererNames[0]];
                } else {
                    Log.warning(
                        "getRendererInternal() - cannot determine renderer, because no default renderer is configured and multiple instances exist.",
                        null,
                        S_COMPONENT_NAME);
                }
            }

            // unwrap the component instance in case of components
            if (oRendererControl && oRendererControl.isA("sap.ui.core.ComponentContainer")) { //pending dependency migration
                return oRendererControl.getComponentInstance();
            }

            // maybe undefined
            return oRendererControl;
        };

        /**
         * An enumeration for the application work protect mode state.
         * @type {sap.ushell.Container.DirtyState}
         *
         * @since 1.21.1
         * @public
         * @member
         * @alias sap.ushell.Container#DirtyState
         */
        this.DirtyState = {
            /**
             * The embedded application is clean, there is no unsaved data.
             *
             * @public
             * @constant
             * @default "CLEAN"
             * @since 1.21.1
             * @type string
             */
            CLEAN: "CLEAN",

            /**
             * The embedded application is dirty, the user has entered data that is not yet saved.
             *
             * @public
             * @constant
             * @default "DIRTY"
             * @since 1.21.1
             * @type string
             */
            DIRTY: "DIRTY",

            /**
             * The embedded application container's dirty state cannot be determined because of technical reasons.
             *
             * @public
             * @constant
             * @default "MAYBE_DIRTY"
             * @since 1.21.1
             * @type string
             */
            MAYBE_DIRTY: "MAYBE_DIRTY",

            /**
             * Technical state telling that the dirty state is currently being determined.
             *
             * @private
             * @constant
             * @default "PENDING"
             * @since 1.21.1
             * @type string
             */
            PENDING: "PENDING",

            /**
             * Technical state for the initial value of the localStorage dirty state key.
             *
             * @private
             * @constant
             * @default "INITIAL"
             * @since 1.21.2
             * @type string
             */
            INITIAL: "INITIAL"
        };

        /**
         * Returns the global dirty state.
         *
         * All open UShell browser windows for the same origin are asked about their global dirty state.
         *
         * @returns {jQuery.Promise} Resolves the dirty state (see {@link sap.ushell.Container.DirtyState}).
         * @throws  {Error} Raises an exception, if called again before promise is resolved.
         *
         * @since 1.21.1
         * @public
         * @deprecated since 1.120
         * @alias sap.ushell.Container#getGlobalDirty
         */
        this.getGlobalDirty = function () {
            let oDeferred = new jQuery.Deferred();
            let sUid = uid();
            let iPending = 0;
            let oDirtyState = this.DirtyState.CLEAN;

            function tryResolve () {
                if (iPending === 0 || oDirtyState === that.DirtyState.DIRTY) {
                    // no PENDING or already dirty, so we can end the process
                    oDeferred.resolve(oDirtyState);
                    Log.debug(
                        "getGlobalDirty() Resolving: " + oDirtyState,
                        null,
                        "sap.ushell.Container"
                    );
                }
            }

            function onStorageEvent (oStorageEvent) {
                if (oStorageEvent.key.indexOf(S_DIRTY_STATE_PREFIX) === 0
                    && oStorageEvent.newValue !== that.DirtyState.INITIAL
                    && oStorageEvent.newValue !== that.DirtyState.PENDING) {
                    Log.debug(
                        "getGlobalDirty() Receiving event key: " + oStorageEvent.key
                        + " value: " + oStorageEvent.newValue,
                        null,
                        "sap.ushell.Container"
                    );
                    if (oStorageEvent.newValue === that.DirtyState.DIRTY
                        || oStorageEvent.newValue === that.DirtyState.MAYBE_DIRTY) {
                        oDirtyState = oStorageEvent.newValue;
                    }
                    iPending -= 1;
                    tryResolve();
                }
            }

            // check for private browsing mode in Safari
            try {
                oLocalStorage.setItem(sUid, "CHECK");
                oLocalStorage.removeItem(sUid);
            } catch (e) {
                Log.warning("Error calling localStorage.setItem(): " + e, null,
                    "sap.ushell.Container");
                return oDeferred.resolve(this.DirtyState.MAYBE_DIRTY).promise();
            }

            if (oGlobalDirtyDeferred) {
                throw new Error("getGlobalDirty already called!");
            }

            oGlobalDirtyDeferred = oDeferred;
            window.addEventListener("storage", onStorageEvent);
            oDeferred.always(function () {
                window.removeEventListener("storage", onStorageEvent);
                oGlobalDirtyDeferred = undefined;
            });

            for (let i = oLocalStorage.length - 1; i >= 0; i -= 1) {
                let sStorageKey = oLocalStorage.key(i);
                if (sStorageKey.indexOf(S_DIRTY_STATE_PREFIX) === 0) {
                    if (oLocalStorage.getItem(sStorageKey) === "PENDING") {
                        // cleanup unanswered PENDINGS from call before
                        oLocalStorage.removeItem(sStorageKey);
                        Log.debug(
                            "getGlobalDirty() Cleanup of unresolved 'PENDINGS':" + sStorageKey,
                            null,
                            "sap.ushell.Container"
                        );
                    } else {
                        iPending += 1;
                        ushellUtils.localStorageSetItem(sStorageKey,
                            this.DirtyState.PENDING, true);
                        Log.debug(
                            "getGlobalDirty() Requesting status for: " + sStorageKey,
                            null,
                            "sap.ushell.Container"
                        );
                    }
                }
            }
            tryResolve();

            //Timeout to resolve the deferred
            //If deferred is not resolved during iPending * 2000, resolve with "MAYBE_DIRTY" status
            setTimeout(function () {
                if (oDeferred.state() !== "resolved") {
                    // no use of constants because the Container may not exist anymore
                    oDeferred.resolve("MAYBE_DIRTY");
                    Log.debug(
                        "getGlobalDirty() Timeout reached, - resolved 'MAYBE_DIRTY'",
                        null,
                        "sap.ushell.Container"
                    );
                }
            }, iPending * 2000);

            return oDeferred.promise();
        };

        /**
         * Returns the logon system.
         *
         * @returns {sap.ushell.System} object providing information about the system where the container is logged in.
         *
         * @since 1.15.0
         * @private
         * @ui5-restricted sap.ui.fl
         * @alias sap.ushell.Container#getLogonSystem
         */
        this.getLogonSystem = function () {
            if (!oAdapter) {
                Log.error("getLogonSystem: Container is not yet initialized - system cannot be determined!");
            }
            return oAdapter.getSystem();
        };

        /**
         * Returns a Promise that resolves when the Container instance has been initialized completely.
         *
         * @returns {Promise} Promise that resolves after init.
         *
         * @since 1.120.0
         * @private
         * @ui5-restricted sap.ui.fl
         * @alias sap.ushell.Container#ready
         */
        this.ready = function () {
            return oContainerReadyDeferred.promise;
        };

        /**
         * Returns the logged-in user.
         *
         * @returns {sap.ushell.User} object providing information about the logged-in user
         *
         * @since 1.15.0
         * @private
         * @alias sap.ushell.Container#getUser
         */
        this.getUser = function () {
            return oAdapter.getUser();
        };

        /**
         * If the dirty state was set to 'false' using 'setDirtyFlag' the registered dirty
         * state provider methods get called to determine the actual dirty state. The determined
         * dirty state is then returned.
         *
         * However, if the dirty state was previously set to 'true' using 'setDirtyFlag' the registered dirty
         * state provider methods are ignored and the function simply returns 'true'.
         *
         * @returns {boolean} The value of the dirty flag or the determined dirty state returned by the dirty state providers.
         *
         * @since 1.27.0
         * @public
         * @deprecated since 1.120
         * @alias sap.ushell.Container#getDirtyFlag
         */
        this.getDirtyFlag = function () {
            let bDirty = isDirty; // in case it was set
            let oNavigationContext = this._oShellNavigationInternal.getNavigationContext();
            for (let i = 0; i < aRegisteredDirtyMethods.length; i++) {
                bDirty = bDirty || aRegisteredDirtyMethods[i](oNavigationContext);
            }
            return bDirty;
        };

        this.fnAsyncDirtyStateProvider = null;

        /**
         * Fetches the fnAsyncDirtyStateProvider which might be set by the appruntime.
         * The result of getDirtyFlag is mixed with appruntime result.
         * If fnAsyncDirtyStateProvider is not set only getDirtyFlag gets evaluated.
         * The fnAsyncDirtyStateProvider gets evaluated during navigation.
         * The onload event (tab close) is handled within the appruntime.
         * @returns {Promise<boolean>} The value of the dirty flag or the determined dirty state returned by the dirty state providers.
         *
         * @since 1.98.0
         * @private
         * @alias sap.ushell.Container#getDirtyFlagsAsync
         */
        this.getDirtyFlagsAsync = function () {
            if (!this.fnAsyncDirtyStateProvider) {
                return Promise.resolve(this.getDirtyFlag());
            }

            let oNavigationContext = this._oShellNavigationInternal.getNavigationContext();
            return this.fnAsyncDirtyStateProvider(oNavigationContext)
                .then(function (bIsDirty) {
                    return bIsDirty || this.getDirtyFlag();
                }.bind(this));
        };

        //Remove this API once the OPA test iframe issue is solved. see Shell-controller.js@handleDataLoss
        /**
         * Checks whether the async dirtyState provider is set
         * @returns {boolean} Whether the async dirtyState provider is set
         *
         * @since 1.98.0
         * @private
         * @alias sap.ushell.Container#isAsyncDirtyStateProviderSet
         */
        this.isAsyncDirtyStateProviderSet = function () {
            return typeof this.fnAsyncDirtyStateProvider === "function";
        };

        /**
         * Sets the async dirtyState provider.
         * This API should only be used by the appruntime!
         * The dirtyState provider is required to resolve a native promise.
         * It might be unset by calling this method with null or undefined
         * @param {function} fnAsyncDirtyStateProvider The dirtyState provider resolving a promise
         *
         * @since 1.98.0
         * @private
         * @alias sap.ushell.Container#setAsyncDirtyStateProvider
         */
        this.setAsyncDirtyStateProvider = function (fnAsyncDirtyStateProvider) {
            this.fnAsyncDirtyStateProvider = fnAsyncDirtyStateProvider;
        };

        /**
         * Setter for the isDirty flag value.
         *
         * Default value is false
         *
         * @param {boolean} [bIsDirty] The value of the dirty flag.
         * @default false
         * @since 1.27.0
         * @public
         * @alias sap.ushell.Container#setDirtyFlag
         */
        this.setDirtyFlag = function (bIsDirty) {
            isDirty = bIsDirty;
        };

        /**
         * Instructs the platform/backend system to keep the session alive.
         *
         * @since 1.48.0
         * @private
         * @alias sap.ushell.Container#sessionKeepAlive
         */
        this.sessionKeepAlive = function () {
            if (oAdapter.sessionKeepAlive) {
                oAdapter.sessionKeepAlive();
            }
        };

        /**
         * Instructs the platform/backend system to keep the session alive.
         *
         * @since 1.96.0
         * @private
         * @alias sap.ushell.Container#extendSession
         */
        this.extendSession = function () {
            EventHub.emit("nwbcUserIsActive", Date.now());
        };

        /**
         * Register the work protection dirty callback function.
         * In the work protect mechanism, each platform can register their own method in order to check if data
         * was changed during the session, and notify the container about the change.
         * Registering multiple times the same function is allowed.
         *
         * Use <code>Function.prototype.bind()</code> to determine the callback's <code>this</code> or some of its arguments.
         *
         * @param {function(): boolean} fnDirty
         *  Function for determining the state of the application. The callback is used to determine the current dirty state during a navigation.
         *  The function must return a boolean which determines if the current application is dirty or not. If <code>true</code> is returned the end user is prompted
         *  with a dialog where they need to confirm the potential data loss.
         *  The callback is called with a navigation context as its first parameter which can be used to determine the dirty state:
         *  <pre>
         *  {
         *    status: "InProgress", // Enum which determines if a navigation currently takes place or if it is already finished. See sap.ushell.NavigationState.
         *    isCrossAppNavigation: true, // Boolean which indicates if the navigation is inner app our across two different applications.
         *    innerAppRoute: "&/SalesOrder/11" // If it is an inner app navigation, it describes the inner app route.
         *  }
         *  </pre>
         *
         * @since 1.31.0
         * @public
         * @alias sap.ushell.Container#registerDirtyStateProvider
         */
        this.registerDirtyStateProvider = function (fnDirty) {
            if (typeof fnDirty !== "function") {
                throw new Error("fnDirty must be a function");
            }
            aRegisteredDirtyMethods.push(fnDirty);
        };

        /**
         * Deregister the work protection dirty callback function.
         * See registerDirtyStateProvider for more information.
         * Only the last registered function will be deregistered (in case it was registered multiple times).
         *
         * @param {function(): boolean} fnDirty function for determining the state of the application
         *
         * @since 1.67.0
         * @public
         * @alias sap.ushell.Container#deregisterDirtyStateProvider
         */
        this.deregisterDirtyStateProvider = function (fnDirty) {
            if (typeof fnDirty !== "function") {
                throw new Error("fnDirty must be a function");
            }

            let nIndex = -1;
            for (let i = aRegisteredDirtyMethods.length - 1; i >= 0; i--) {
                if (aRegisteredDirtyMethods[i] === fnDirty) {
                    nIndex = i;
                    break;
                }
            }

            if (nIndex === -1) {
                return;
            }

            aRegisteredDirtyMethods.splice(nIndex, 1);
        };

        /**
         * Returns a service with the given name, creating it if necessary.
         * Services are singleton objects identified by their (resulting) name.
         *
         * Names without a dot are interpreted as service names within the default naming convention
         * and will be expanded to <code>"sap.ushell.services." + sServiceName</code>.
         * Names containing a dot are not yet supported. This name may be overridden via configuration. See example 2 below.
         *
         * The resulting name must point to a constructor function which is first required as a
         * SAPUI5 module and then called to create a service instance.
         * The service will be passed to a corresponding service adapter for the current logon system, as well as a callback
         * interface (of virtual type <code>sap.ushell.services.ContainerInterface</code>) to the
         * container providing a method <code>createAdapter(oSystem)</code> to create further
         * adapters for the same service but connected to remote systems.
         * The third parameter will be <code>sParameter</code> as passed to this function.
         * The fourth parameter will be an object with the property <code>config</code> supplied by the configuration. See example 2 below.
         *
         * The adapter for the logon system will be created before the service. Its constructor gets three parameters.
         * The first parameter is the logon system, the second parameter is <code>sParameter</code> and the third parameter is an object
         * with the property <code>config</code> supplied by the configuration.
         *
         * The service may declare itself adapterless by setting the property <code>hasNoAdapter = true</code> at the constructor function.
         * In this case no adapter will be created and passed to the constructor and all other parameters will be shifted.
         *
         * <b>Example 1:</b> The service <code>sap.ushell.services.UserInfo</code> is parameterless.
         * It indicates this by setting <code>sap.ushell.services.UserInfo.hasNoAdapter = true;</code>.
         *
         * <b>Example 2:</b> (Configuration)
         *   <pre>
         *   window["sap-ushell-config"] = {
         *     services: {
         *       Foo: {
         *         module: "my.own.Foo"
         *         config: {header: "hidden"},
         *         adapter: {
         *           module: "my.own.FooAdapter",
         *           config: {foo: "bar"}
         *         }
         *       }
         *     }
         *   }
         *   sap.ushell.Container.getServiceAsync("Foo", "runtimeConfig")
         *       .then(function (Foo) {
         *           // Do something with the service
         *       });
         *   </pre>
         * Now <code>oService</code> is an instance of <code>my.own.Foo</code>.
         * The third parameter of the constructor will be "runtimeConfig", the fourth parameter <code>{config: {header: "hidden"}}</code>.
         * Its adapter is an instance of <code>my.own.FooAdapter</code> constructed with the parameters logon system,
         * "runtimeConfig" and <code>{config: {foo: "bar"}}</code>.
         *
         * Note that the api will throw a runtime error (or reject for async mode)
         * if the service name does not reflect a service available.
         *
         * @template {sap.ushell.services.Service} ServiceType
         * @param {string} sServiceName The service name, such as "Menu"
         * @param {string} [sParameter] A parameter which is passed to the service constructor and every adapter constructor. (since 1.15.0)
         * @param {boolean} [bAsync] if true, the adapter is loaded asynchronously and a Promise is returned. (since 1.55.0)
         *
         * @returns {ServiceType|Promise<ServiceType>} the service or, in asynchronous mode, a Promise that returns the service
         *
         * @throws {Error} If <code>sServiceName</code> is not the name of an available service.
         *
         * @see sap.ushell.services.ContainerInterface
         *
         * @since 1.15.0
         * @deprecated since 1.77. Please use {@link #getServiceAsync} instead.
         * @public
         * @alias sap.ushell.Container#getService
         */
        this.getService = function (sServiceName, sParameter, bAsync) {
            return that._getServiceSync.apply(that, arguments);
        };

        /**
         * Returns a Promise that resolves a service with the given name, creating it if necessary.
         * Services are singleton objects identified by their (resulting) name.
         *
         * Names without a dot are interpreted as service names within the default naming convention
         * and will be expanded to <code>"sap.ushell.services." + sServiceName</code>.
         * Names containing a dot are not yet supported. This name may be overridden via configuration. See example 2 below.
         *
         * The resulting name must point to a constructor function which is
         * first required as a SAPUI5 module and then called to create a service instance.
         * The service will be passed to a corresponding service adapter for the current logon system, as well as a callback
         * interface (of virtual type <code>sap.ushell.services.ContainerInterface</code>) to the
         * container providing a method <code>createAdapter(oSystem)</code> to create further
         * adapters for the same service but connected to remote systems.
         * The third parameter will be <code>sParameter</code> as passed to this function.
         * The fourth parameter will be an object with the property <code>config</code> supplied by the configuration. See example 2 below.
         *
         * The adapter for the logon system will be created before the service. Its constructor
         * gets three parameters. The first parameter is the logon system, the second parameter is
         * <code>sParameter</code> and the third parameter is an object with the property
         * <code>config</code> supplied by the configuration.
         *
         * The service may declare itself adapterless by setting the property
         * <code>hasNoAdapter = true</code> at the constructor function. In this case no adapter
         * will be created and passed to the constructor and all other parameters will be shifted.
         *
         * <b>Example 1:</b> The service <code>sap.ushell.services.UserInfo</code> is parameterless.
         * It indicates this by setting <code>sap.ushell.services.UserInfo.hasNoAdapter = true;</code>.
         *
         * <b>Example 2:</b> (Configuration)
         *   <pre>
         *   window["sap-ushell-config"] = {
         *     services: {
         *       Foo: {
         *         module: "my.own.Foo"
         *         config: {header: "hidden"},
         *         adapter: {
         *           module: "my.own.FooAdapter",
         *           config: {foo: "bar"}
         *         }
         *       }
         *     }
         *   }
         *   sap.ushell.Container.getServiceAsync("Foo", "runtimeConfig")
         *       .then(function (Foo) {
         *           // Do something with the service
         *       });
         *   </pre>
         * Now the parameter provided in the promise handler is an instance of <code>my.own.Foo</code>.
         * The third parameter of the constructor will be "runtimeConfig", the fourth parameter <code>{config: {header: "hidden"}}</code>.
         * Its adapter is an instance of <code>my.own.FooAdapter</code> constructed with the parameters logon system,
         * "runtimeConfig" and <code>{config: {foo: "bar"}}</code>.
         *
         * @template {sap.ushell.services.Service} ServiceType
         * @param {string} sServiceName The service name, such as "Menu"
         * @param {string} [sParameter] A parameter which is passed to the service constructor and every adapter constructor.
         * @returns {Promise<ServiceType>} a Promise that returns the requested service
         * @see sap.ushell.services.ContainerInterface
         *
         * @since 1.55.0
         * @public
         * @alias sap.ushell.Container#getServiceAsync
         */
        this.getServiceAsync = function (sServiceName, sParameter) {
            // Some applications override .getService and the async flag is ignored then.
            // Wrap into Promise.resolve to make sure that a Promise is always returned
            return that._getServiceAsync(sServiceName, sParameter);
        };

        /**
         * @param {string} sServiceName The service name, such as "Menu"
         * @param {string} [sParameter] A parameter which is passed to the service constructor and every adapter constructor. (since 1.15.0)
         * @param {boolean} [bAsync] If true, the adapter is loaded asynchronously and a Promise is returned.
         *
         * @returns {object|Promise} The service or, in asynchronous mode, a Promise that returns the service
         * @throws {Error} If <code>sServiceName</code> is not the name of an available service.
         * @see sap.ushell.services.ContainerInterface
         *
         *
         * @deprecated As of version 1.120
         * @since 1.120
         * @private
         * @alias sap.ushell.Container#_getServiceSync
         */
        this._getServiceSync = function (sServiceName, sParameter, bAsync) {
            let oContainerInterface = {};

            /**
             * For the given remote system,
             * creates a new adapter that corresponds to the service to which this container interface was passed at construction time.
             *
             * @param {sap.ushell.System} oSystem information about the remote system to which the resulting adapter should connect
             * @returns {jQuery.Promise} Resolves the remote adapter.
             *
             * @since 1.15.0
             * @name sap.ushell.services.ContainerInterface#createAdapter
             */
            function createRemoteAdapter (oSystem) {
                let oDeferred = new jQuery.Deferred();
                if (!oSystem) {
                    throw new Error("Missing system");
                }
                // Note: this might become really asynchronous once the remote adapter is loaded
                // from the remote system itself
                oDeferred.resolve(createAdapter(sServiceName, oSystem, sParameter));
                oContainerInstance.addRemoteSystem(oSystem);
                return oDeferred.promise();
            }

            if (!sServiceName) {
                throw new Error("Missing service name");
            }
            if (sServiceName.indexOf(".") >= 0) {
                //  support this once we have some configuration and can thus find adapters
                throw new Error("Unsupported service name");
            }
            let oServiceConfig = getServiceConfig(sServiceName);
            let sModuleName = oServiceConfig.module || "sap.ushell.services." + sServiceName;
            let sKey = sModuleName + "/" + (sParameter || "");
            let oServiceProperties = { config: oServiceConfig.config || {} };

            function createService (ServiceClass, Adapter) {
                oContainerInterface.createAdapter = createRemoteAdapter;
                return new ServiceClass(Adapter, oContainerInterface, sParameter, oServiceProperties);
            }

            function getServiceInstance (ServiceClass, Async) {
                let oService;

                // Check again if the service has already been created to prevent re-instantiation during race conditions
                if (mServicesByName.containsKey(sKey)) {
                    oService = mServicesByName.get(sKey);
                } else if (ServiceClass.hasNoAdapter) {
                    // has no adapter: don't create and don't pass one
                    oService = new ServiceClass(oContainerInterface, sParameter, oServiceProperties);
                } else {
                    // create and pass adapter for logon system as first parameter
                    let oServiceAdapter = createAdapter(sServiceName, oAdapter.getSystem(),
                        sParameter, Async, ServiceClass.useConfiguredAdapterOnly);
                    if (Async) {
                        return oServiceAdapter.then(function (serviceAdapter) {
                            let oServiceInstance = createService(ServiceClass, serviceAdapter);
                            mServicesByName.put(sKey, oServiceInstance);
                            return oServiceInstance;
                        });
                    }
                    oService = createService(ServiceClass, oServiceAdapter);
                }

                mServicesByName.put(sKey, oService);
                return Async ? Promise.resolve(oService) : oService;
            }

            if (!mServicesByName.containsKey(sKey)) {
                /**
                 * @deprecated As of version 1.100
                 * @private
                 */
                if (!bAsync) {
                    // else - synchronous call
                    Log.error("Deprecated API call of 'sap.ushell.Container.getService'. Please use 'getServiceAsync' instead",
                        null,
                        "sap.ushell.Container"
                    );
                    let Service = sap.ui.requireSync(sModuleName.replace(/[.]/g, "/")); // LEGACY API (deprecated)
                    return getServiceInstance(Service);
                }

                // extract information about the requested service
                if (!mServicesByNamePromise.containsKey(sKey)) {
                    let oServicePromise = new Promise(function (resolve, reject) {
                        sap.ui.require([sModuleName.replace(/[.]/g, "/")], function (ServiceClass) {
                            resolve(getServiceInstance(ServiceClass, true));
                        }, reject);
                    });
                    mServicesByNamePromise.put(sKey, oServicePromise);
                    return oServicePromise;
                }
                return mServicesByNamePromise.get(sKey);
            }
            if (bAsync) {
                // If the service was first called sync and then async, there will be no
                // promise in mServicesByNamePromise, so we return wrap mServicesByName
                // just in case, as that will always contain the service.
                return Promise.resolve(mServicesByName.get(sKey));
            }
            return mServicesByName.get(sKey);
        };

        /**
         * @param {string} sServiceName The service name, such as "Menu"
         * @param {string} [sParameter] A parameter which is passed to the service constructor and every adapter constructor. (since 1.15.0)
         *
         * @returns {Promise} A Promise that returns the service
         * @throws {Error} If <code>sServiceName</code> is not the name of an available service.
         * @see sap.ushell.services.ContainerInterface
         *
         * @since 1.120
         * @private
         * @alias sap.ushell.Container#_getServiceAsync
         */
        this._getServiceAsync = function (sServiceName, sParameter) {
            let oContainerInterface = {};

            /**
             * For the given remote system,
             * creates a new adapter that corresponds to the service to which this container interface was passed at construction time.
             *
             * @param {sap.ushell.System} oSystem information about the remote system to which the resulting adapter should connect
             * @returns {jQuery.Promise} Resolves the remote adapter.
             *
             * @since 1.15.0
             * @name sap.ushell.services.ContainerInterface#createAdapter
             */
            function createRemoteAdapter (oSystem) {
                let oDeferred = new jQuery.Deferred();
                if (!oSystem) {
                    throw new Error("Missing system");
                }
                // Note: this might become really asynchronous once the remote adapter is loaded
                // from the remote system itself
                oDeferred.resolve(createAdapter(sServiceName, oSystem, sParameter));
                oContainerInstance.addRemoteSystem(oSystem);
                return oDeferred.promise();
            }

            if (!sServiceName) {
                throw new Error("Missing service name");
            }
            if (sServiceName.indexOf(".") >= 0) {
                //  support this once we have some configuration and can thus find adapters
                throw new Error("Unsupported service name");
            }
            let oServiceConfig = getServiceConfig(sServiceName);
            let sModuleName = oServiceConfig.module || "sap.ushell.services." + sServiceName;
            let sKey = sModuleName + "/" + (sParameter || "");
            let oServiceProperties = { config: oServiceConfig.config || {} };

            function createService (ServiceClass, Adapter) {
                oContainerInterface.createAdapter = createRemoteAdapter;
                return new ServiceClass(Adapter, oContainerInterface, sParameter, oServiceProperties);
            }

            function getServiceInstance (ServiceClass) {
                let oService;

                // Check again if the service has already been created to prevent re-instantiation during race conditions
                if (mServicesByName.containsKey(sKey)) {
                    oService = mServicesByName.get(sKey);
                } else if (ServiceClass.hasNoAdapter) {
                    // has no adapter: don't create and don't pass one
                    oService = new ServiceClass(oContainerInterface, sParameter, oServiceProperties);
                } else {
                    // create and pass adapter for logon system as first parameter
                    let oServiceAdapter = createAdapter(sServiceName, oAdapter.getSystem(),
                        sParameter, true, ServiceClass.useConfiguredAdapterOnly);
                        return oServiceAdapter.then(function (serviceAdapter) {
                            let oServiceInstance = createService(ServiceClass, serviceAdapter);
                            mServicesByName.put(sKey, oServiceInstance);
                            return oServiceInstance;
                        });
                }

                mServicesByName.put(sKey, oService);
                return Promise.resolve(oService);
            }

            if (!mServicesByName.containsKey(sKey)) {
                // extract information about the requested service
                if (!mServicesByNamePromise.containsKey(sKey)) {
                    let oServicePromise = new Promise(function (resolve, reject) {
                        sap.ui.require([sModuleName.replace(/[.]/g, "/")], function (ServiceClass) {
                            resolve(getServiceInstance(ServiceClass));
                        }, reject);
                    });
                    mServicesByNamePromise.put(sKey, oServicePromise);
                    return oServicePromise;
                }
                return mServicesByNamePromise.get(sKey);

            }
            // If the service was first called sync and then async, there will be no
            // promise in mServicesByNamePromise, so we return wrap mServicesByName
            // just in case, as that will always contain the service.
            return Promise.resolve(mServicesByName.get(sKey));
        };

        /**
         * Get list of remote systems currently in use.
         *
         * @returns {Object<string, sap.ushell.System>} map of sap.ushell.System
         *
         * @since 1.17.1
         * @private
         */
        function getRemoteSystems () {
            for (let i = oLocalStorage.length - 1; i >= 0; i -= 1) {
                let sKey = oLocalStorage.key(i);
                if (sKey.indexOf(sRemoteSystemPrefix) === 0) {
                    try {
                        let sSystemAlias = sKey.substring(sRemoteSystemPrefix.length);
                        let oSystemData = JSON.parse(oLocalStorage.getItem(sKey));
                        mRemoteSystems[sSystemAlias] = new System(oSystemData);
                    } catch (e) {
                        // local storage contained garbage (non-parsable)
                        oLocalStorage.removeItem(sKey);
                    }
                }
            }
            return mRemoteSystems;
        }

        /**
         * Stub OData.read() and OData.request() to intercept OData request during logout process.
         * After 5 seconds an error handler is invoked to let the caller know about still ongoing logout process.
         *
         * @since 1.17.1
         * @private
         */
        function suppressOData () {
            if (typeof OData === "undefined") {
                return;
            }

            function stub (sErrorMessage, fnSuccess, fnFailure) {
                Log.warning(sErrorMessage, null,
                    "sap.ushell.Container");
                if (fnFailure) {
                    setTimeout(fnFailure.bind(null, sErrorMessage), 5000);
                }
                // the original APIs provides abort handler which have to be stubbed also
                return {
                    abort: function () {
                        return;
                    }
                };
            }

            OData.read = function (oRequest, fnSuccess, fnFailure) {
                return stub("OData.read('" +
                    (oRequest && oRequest.Uri ? oRequest.requestUri : oRequest) +
                    "') disabled during logout processing",
                    fnSuccess, fnFailure);
            };
            OData.request = function (oRequest, fnSuccess, fnFailure) {
                return stub("OData.request('" + (oRequest ? oRequest.requestUri : "") +
                    "') disabled during logout processing", fnSuccess, fnFailure);
            };
        }

        /**
         * Adds a system to the list of remote systems currently in use.
         * On logout this list is processed and performs a logout for each system via the ContainerAdapter specific for its platform.
         *
         * @param {sap.ushell.System} oRemoteSystem Remote system to be added.
         *
         * @since 1.15.0
         * @public
         * @alias sap.ushell.Container#addRemoteSystem
         */
        this.addRemoteSystem = function (oRemoteSystem) {
            /*
             * Internal details
             * oRemoteSystem.getAlias() is the unique key within the remote systems list.
             * oRemoteSystem.getPlatform determines which ContainerAdapter implementation is used.
             * oRemoteSystem.getBaseUrl determines the logout request routing; there are 3 routing modes:
             * 1. empty baseUrl:
             *     The logout is done with its platform-specific, server-absolute service path e.g.
             *     oRemoteSystem.platform is 'abap':
             *     '/sap/public/bc/icf/logoff'
             *     oRemoteSystem.platform is 'hana':
             *     '<protocol://host:port>/sap/hana/xs/formLogin/token.xsjs'
             * 2. baseUrl beginning with '/' e.g. '/MY_PREFIX':
             *     The logout request was fired with the baseUrl as prefix e.g. platform 'abap':
             *     '<protocol://host:port>/MY_PREFIX/sap/public/bc/icf/logoff'
             * 3. baseUrl is ';o=':
             *     The logout request is fired with <code>;o=oRemoteSystem.alias</code>
             *     e.g. oRemoteSystem.platform 'abap' and oRemoteSystem.alias = 'MY_SYSTEM_ALIAS':
             *     '<protocol://host:port>/sap/public/bc/icf/logoff;o=MY_SYSTEM_ALIAS'
             * Note: Cases 2. and 3. require a corresponding Web Dispatcher rule.
             */
            let sAlias = oRemoteSystem.getAlias();
            let oOldSystem = mRemoteSystems[sAlias];

            if (this._isLocalSystem(oRemoteSystem)) {
                return;
            }

            if (oOldSystem) {
                if (oOldSystem.toString() === oRemoteSystem.toString()) { // --> JSON.stringify
                    return;
                }
                Log.warning("Replacing " + oOldSystem + " by " + oRemoteSystem,
                    null, "sap.ushell.Container");
            } else {
                Log.debug("Added " + oRemoteSystem, null, "sap.ushell.Container");
            }
            mRemoteSystems[sAlias] = oRemoteSystem;
            ushellUtils.localStorageSetItem(sRemoteSystemPrefix + sAlias, oRemoteSystem);
        };

        /**
         * The check if the given system is the same system as FLP system or not
         *
         * @param {sap.ushell.System} oSystem system object
         * @returns {boolean} return true if system has "LOCAL" alias or if system has the same baseURL and client as FLP
         *
         * @private
         * @alias sap.ushell.Container#_isLocalSystem
         */
        this._isLocalSystem = function (oSystem) {
            let sAlias = oSystem.getAlias();
            if (sAlias && sAlias.toUpperCase() === "LOCAL") {
                return true;
            }
            let oURI = new URI(ushellUtils.getLocationHref());
            let sClient = this.getLogonSystem().getClient() || "";
            if (oSystem.getBaseUrl() === oURI.origin() && oSystem.getClient() === sClient) {
                return true;
            }

            return false;
        };

        /**
         * Derives a remote system from the given OData service URL heuristically.
         * The platform is identified by the URL's prefix, the alias is derived from a segment parameter named "o".
         * If this succeeds, {@link #addRemoteSystem} is called accordingly with a base URL of ";o=".
         *
         * @param {string} sServiceUrl An OData service URL.
         *
         * @since 1.23.0
         * @private
         * @alias sap.ushell.Container#addRemoteSystemForServiceUrl
         */
        this.addRemoteSystemForServiceUrl = function (sServiceUrl) {
            let oSystemInfo = { baseUrl: ";o=" };

            if (!sServiceUrl || sServiceUrl.charAt(0) !== "/" || sServiceUrl.indexOf("//") === 0) {
                return;
            }

            // extract system alias from segment parameter named "o"
            let aMatches = /^[^?]*;o=([^/;?]*)/.exec(sServiceUrl);
            if (aMatches && aMatches.length >= 2) {
                oSystemInfo.alias = aMatches[1];
            }

            // heuristically determine platform from URL prefix
            sServiceUrl = sServiceUrl.replace(/;[^/?]*/g, ""); // remove all segment parameters
            if (/^\/sap\/(bi|hana|hba)\//.test(sServiceUrl)) {
                oSystemInfo.platform = "hana";
                oSystemInfo.alias = oSystemInfo.alias || "hana"; // use legacy hana as fallback
            } else if (/^\/sap\/opu\//.test(sServiceUrl)) {
                oSystemInfo.platform = "abap";
            }

            if (oSystemInfo.alias && oSystemInfo.platform) {
                this.addRemoteSystem(new System(oSystemInfo));
            }
        };

        /**
         * Attaches a listener to the logout event. In case the bAsyncFunction parameter
         * is true, the fnFunction must return a promise. FLP will wait for the promise
         * to be resolved before doing the actual logout.
         *
         * @param  {function} fnFunction Event handler to be attached.
         * @param  {boolean} bAsyncFunction Whether the function returns a Promise to wait for its resolvent (since 1.81.0).
         *
         * @since 1.19.1
         * @public
         * @alias sap.ushell.Container#attachLogoutEvent
         */
        this.attachLogoutEvent = function (fnFunction, bAsyncFunction) {
            let bFound = false;
            if (bAsyncFunction === true) {
                assert(typeof (fnFunction) === "function", "Container.attachLogoutEvent: fnFunction must be a function");
                for (let i = 0; i < aAsyncLogoutEventFunctions.length; i++) {
                    if (aAsyncLogoutEventFunctions[i] === fnFunction) {
                        bFound = true;
                        break;
                    }
                }
                if (!bFound) {
                    aAsyncLogoutEventFunctions.push(fnFunction);
                }
            } else {
                oEventProvider.attachEvent("Logout", fnFunction);
            }
        };

        /**
         * Detaches a listener from the logout event.
         *
         * @param  {function} fnFunction Event handler to be detached.
         *
         * @since 1.19.1
         * @public
         * @alias sap.ushell.Container#detachLogoutEvent
         */
        this.detachLogoutEvent = function (fnFunction) {
            oEventProvider.detachEvent("Logout", fnFunction);
            for (let i = 0; i < aAsyncLogoutEventFunctions.length; i++) {
                if (aAsyncLogoutEventFunctions[i] === fnFunction) {
                    aAsyncLogoutEventFunctions.splice(i, 1);
                    break;
                }
            }
        };

        /**
         * Attaches a listener to the rendererCreated event.
         *
         * @param  {function} fnFunction Event handler to be attached.
         *   If a renderer is created, this function is called with a parameter of instance <code>sap.ui.base.Event</code>.
         *   The event object provides the instance of the created renderer as parameter &quot;renderer&quot;.
         *   If the renderer is a SAPUI5 UI component (i.e. extend <code>sap.ui.core.UIComponent</code>),
         *   the event parameter returns the component instance, i.e. it unwraps the renderer component from its component container.
         *
         * @since 1.34.1
         * @public
         * @deprecated since 1.120
         * @alias sap.ushell.Container#attachRendererCreatedEvent
         */
        this.attachRendererCreatedEvent = function (fnFunction) {
            oEventProvider.attachEvent("rendererCreated", fnFunction);
        };

        /**
         * Detaches a listener from the rendererCreated event.
         *
         * @param  {function} fnFunction Event handler to be detached.
         *
         * @since 1.34.1
         * @public
         * @deprecated since 1.120
         * @alias sap.ushell.Container#detachRendererCreatedEvent
         */
        this.detachRendererCreatedEvent = function (fnFunction) {
            oEventProvider.detachEvent("rendererCreated", fnFunction);
        };

        /**
         * Logs out the current user from all relevant back-end systems, including the logon system itself.
         *
         * @returns {jQuery.Promise} Resolves when logout is finished, even when it fails.
         *
         * @since 1.15.0
         * @private
         * @alias sap.ushell.Container#defaultLogout
         */
        this.defaultLogout = function () {
            let oDeferred = new jQuery.Deferred();

            function resolve () {
                oAdapter.logout(true).always(function () {
                    oLocalStorage.removeItem(sSessionTerminationKey);
                    oDeferred.resolve();
                });
            }

            function logoutLogonSystem () {
                let oDeferredAsyncLogoutEvent = new jQuery.Deferred();
                let oPromiseAsyncLogoutEvent = oDeferredAsyncLogoutEvent.promise();
                let arrLogoutEventsPromises = [];

                if (aAsyncLogoutEventFunctions.length > 0) {
                    for (let i = 0; i < aAsyncLogoutEventFunctions.length; i++) {
                        arrLogoutEventsPromises.push(aAsyncLogoutEventFunctions[i]());
                    }
                    Promise.all(arrLogoutEventsPromises).then(oDeferredAsyncLogoutEvent.resolve);

                    //if after 4 seconds we did not get all the async callbacks
                    //promises resolved, we will continue with the logout process
                    setTimeout(oDeferredAsyncLogoutEvent.resolve, 4000);
                } else {
                    oDeferredAsyncLogoutEvent.resolve();
                }

                oPromiseAsyncLogoutEvent.done(function () {
                    if (oEventProvider.fireEvent("Logout", true)) {
                        resolve();
                    } else {
                        // defer UShell redirect to let NWBC receive message asynchronously
                        setTimeout(resolve, 1000);
                    }
                });
            }

            function federatedLogout () {
                let aRemoteLogoutPromises = [];

                if (fnStorageEventListener) {
                    // IE sends localStorage events also to the issuing window, -
                    // this is not needed hence we remove the listener in general at that point
                    window.removeEventListener("storage", fnStorageEventListener);
                }

                ushellUtils.localStorageSetItem(sSessionTerminationKey, "pending");
                that._suppressOData();
                let mSystems = that._getRemoteSystems();
                Object.keys(mSystems).forEach(function (sAlias) {
                    try {
                        aRemoteLogoutPromises.push(
                            createAdapter("Container", mSystems[sAlias]).logout(false)
                        );
                    } catch (e) {
                        Log.warning("Could not create adapter for " + sAlias,
                            e.toString(), "sap.ushell.Container");
                    }
                    oLocalStorage.removeItem(sRemoteSystemPrefix + sAlias);
                });
                // wait for all remote system logouts to be finished
                // Note: We use done() and not always(), and we require all adapters to resolve their logout(false) in any case.
                // If we use always() and any adapter's promise is rejected, the deferred object from when() is *immediately* rejected, too.
                // Then the redirect happens before all remote logouts are finished.
                //  force logoutLogonSystem after timeout?
                jQuery.when.apply(jQuery, aRemoteLogoutPromises).done(logoutLogonSystem);
            }

            if (typeof oAdapter.addFurtherRemoteSystems === "function") {
                oAdapter.addFurtherRemoteSystems().always(federatedLogout);
            } else {
                federatedLogout();
            }

            return oDeferred.promise();
        };

        /**
         * @function
         * Logs out the current user from all relevant back-end systems, including the logon system itself.
         * This member represents the default native implementation of logout.
         * If SessionHandler was created, we register the alternate logout function using registerLogout function.
         *
         * @returns {jQuery.Promise} Resolves when logout is finished, even when it fails.
         *
         * @since 1.15.0
         * @public
         * @deprecated since 1.120
         * @alias sap.ushell.Container#logout
         */
        this.logout = this.defaultLogout;

        /**
         * If SessionHandler was created, we will override the default native container logout
         * with an extended SessionHandler function.
         * This is so that we can logout additional systems before we can logout from the Shell.
         * In this case we will register a substitute logout func from the SessionHandler.
         * @param {function} fnLogout function to be set
         *
         * @since 1.15.0
         * @private
         * @alias sap.ushell.Container#registerLogout
         */
        this.registerLogout = function (fnLogout) {
            this.logout = fnLogout;
        };

        /**
         * Determines the current logon frame provider for the entire Unified Shell.
         * Initially, a rudimentary default provider is active and should be replaced as soon as possible by the current renderer.
         *
         * A logon frame provider is used to facilitate user authentication even for requests sent via <code>XMLHttpRequest</code>.
         * It is called back in order to create a hidden <code>IFRAME</code>, to show it to the user, then to hide and destroy it.
         * The frame must be treated as a black box by the provider; especially with respect to the source of the frame which is
         * managed by the Unified Shell framework. Showing the frame might require user interaction and some decoration around the frame.
         * The frame should be destroyed, not reused, to be on the safe side.
         * Note that in typical cases with SAML2, authentication happens automatically and the frame can stay hidden.
         *
         * The following order of method calls is guaranteed:
         *   <ol>
         *     <li> The <code>create</code> method is called first.
         *     <li> The <code>show</code> method may be called next (if there is HTML code to display).
         *     <li> The <code>destroy</code> method is called last.
         *     <li> A new cycle may start for a new logon process.
         *   </ol>
         *
         * @param {object} oLogonFrameProvider The new logon frame provider which needs to implement at least the methods documented here.
         * @param {function} oLogonFrameProvider.create A function taking no arguments and returning a DOM reference to an empty
         *   <code>IFRAME</code> which is initially hidden. The frame must not be moved around in the DOM later on.
         *   Make sure to add all necessary parent objects immediately, to render SAPUI5 controls as needed,
         *   and to return the DOM reference synchronously.
         * @param {function} oLogonFrameProvider.destroy A function taking no arguments which hides and destroys the current frame.
         * @param {function} oLogonFrameProvider.show A function taking no arguments which is called to indicate that the current frame
         *   probably needs to be shown to the user because interaction is required. Note that there may be false positives here.
         *   It is up to the provider how and when the frame is shown exactly; make sure to provide a good user interaction design here.
         * @see sap.ushell.Container#cancelLogon
         *
         * @since 1.21.2
         * @private
         * @alias sap.ushell.Container#setLogonFrameProvider
         */
        this.setLogonFrameProvider = function (oLogonFrameProvider) {
            if (this.oFrameLogonManager) {
                this.oFrameLogonManager.logonFrameProvider = oLogonFrameProvider;
            }
        };

        /**
         * Sets the timeout for XHR logon requests if a XHR logon frame manager is active.
         *
         * The shell runtime might support logon for XHR requests (if this feature is supported on the actual platform).
         * The XHR logon allows to define specific timeout settings per request path, until a logon frame is shown.
         *
         * This method is not a public API, it must only be called by shell internal services.
         *
         * @param {string} sPath the URL path for which the custom timeout will be applied
         * @param {int} iTimeout the timeout value in milliseconds
         *
         * @since 1.46.3
         * @private
         * @alias sap.ushell.Container#setXhrLogonTimeout
         */
        this.setXhrLogonTimeout = function (sPath, iTimeout) {
            if (this.oFrameLogonManager) {
                this.oFrameLogonManager.setTimeout(sPath, iTimeout);
            }
        };

        /**
         * Returns the current Configuration, the configuration will contains URL of the FLP, scopeId in the case of CDM
         *
         * @returns {Promise} Returns a Promise that resolves the configuration data.
         *
         * @since 1.71
         * @private
         * @alias sap.ushell.Container#getFLPConfig
         */
        this.getFLPConfig = function () {
            let oPromise = new Promise(function (resolve, reject) {
                let oRespObj = {
                    URL: this.getFLPUrl()
                };
                //get site scope
                if (oConfigSetting.CDMPromise) {
                    oConfigSetting.CDMPromise.then(function (oCommonDataModel) {
                        oCommonDataModel.getSiteWithoutPersonalization().then(function (oSite) {
                            oRespObj.scopeId = oSite.site.identification.id;
                            resolve(oRespObj);
                        });
                    });
                } else {
                    resolve(oRespObj);
                }
            }.bind(this));

            return oPromise;
        };

        /**
         * Returns the current URL of the FLP up to (and not including) the Hash Fragment
         *
         * @param {boolean} [bIncludeHash=false] defines if the hash is added to the result.
         * @returns {string} URL.
         *
         * @since 1.56
         * @private
         * @alias sap.ushell.Container#getFLPUrl
         */
        this.getFLPUrl = function (bIncludeHash) {
            let sUrl = ushellUtils.getLocationHref();
            let iHashPosition = sUrl.indexOf(UrlParsing.getShellHash(sUrl));

            if (iHashPosition === -1 || bIncludeHash === true) {
                return sUrl;
            }

            // Remove hash fragment from URL and return the result.
            return sUrl.substr(0, iHashPosition - 1); // -1 because the URLParsing service doesn't consider the "#" symbol
        };

        /**
         * Async version of getFLPUrl
         *
         * @param {boolean} [bIncludeHash=false] defines if the hash is added to the result.
         *
         * @returns {jQuery.Promise} Resolves the FLP URL.
         *
         * @since 1.87
         * @private
         * @alias sap.ushell.Container#getFLPUrlAsync
         */
        this.getFLPUrlAsync = function (bIncludeHash) {
            return new jQuery.Deferred().resolve(that.getFLPUrl(bIncludeHash)).promise();
        };

        /**
         * Returns indication is we are in AppRuntime (for special use cases handling)
         *
         * @returns {boolean}.
         * @since 1.87
         * @private
         * @alias sap.ushell.Container#inAppRuntime
         */
        this.inAppRuntime = function () {
            return false;
        };

        /**
         * Returns indication is we are in AppRuntime (for special use cases handling)
         * for backward compatibility
         * @returns {boolean}.
         * @private
         * @alias sap.ushell.Container#runningInIframe
         */
        this.runningInIframe = this.inAppRuntime;

        /**
         * Returns the adapter (for cflp appruntime internal usage only)
         * @returns {object} The adapter
         *
         * @private
         * @alias sap.ushell.Container#_getAdapter
         */
        this._getAdapter = function () {
            return oAdapter;
        };

        /**
         * Returns FLP's platform as specified in the configuration
         * @param {boolean} bSync return Platform string sync
         * @returns {object|Promise} if async - a Promise that returns the FLP Platform's value
         *
         * @since 1.96
         * @private
         * @alias sap.ushell.Container#getFLPPlatform
         */
        this.getFLPPlatform = function (bSync) {
            if (bSync === true) {
                return oConfig.flpPlatform;
            }
            return Promise.resolve(oConfig.flpPlatform);
        };

        // Attach private functions which should be testable via unit tests to the constructor of the Container
        // to make them available outside for testing.
        this._closeWindow = closeWindow;
        this._redirectWindow = redirectWindow;
        this._getRemoteSystems = getRemoteSystems;
        this._suppressOData = suppressOData;

        // constructor code -------------------------------------------------------
        // loose coupling to allow re-use from sap.ushell_abap.pbServices.ui2.Catalog#addSystemToServiceUrl
        EventBus.getInstance().subscribe("sap.ushell.Container",
            "addRemoteSystemForServiceUrl", function (sChannelId, sEventId, oData) {
                that.addRemoteSystemForServiceUrl(oData);
            });

        /**
         * Initializes the Unified Shell Container.
         *
         * @param {string} sPlatform the target platform, such as "abap" or "cdm".
         * @param {Object<string, string>} [mAdapterPackagesByPlatform={}] the map with platform specific package names for the service adapters.
         *   You only need to specify these package names if they differ from the standard name <code>"sap.ushell.adapters." + sPlatform</code>.
         * @returns {Promise} a promise that is resolved once the container is available
         *
         * @since 1.119
         * @private
         * @alias sap.ushell.Container#_init
         */
        this._init = function (sPlatform, mAdapterPackagesByPlatform) {
            let oPromise = new Promise(function (fnResolve) {
                // Init mobile support for the case when sap.m.App is not used
                MobileSupport.init();
                // remember the configuration independently of window["sap-ushell-config"]
                oConfig = extend({}, window["sap-ushell-config"]);
                // remember the platform package names
                mPlatformPackages = mAdapterPackagesByPlatform;

                if (typeof window["sap.ushell.bootstrap.callback"] === "function") {
                    setTimeout(window["sap.ushell.bootstrap.callback"]);
                }

                // Register all injectable ui5services
                registerInjectableUi5Services([
                    "Personalization",
                    "URLParsing",
                    "CrossApplicationNavigation"
                ], true);

                registerInjectableUi5Services(["Configuration"], false);

                // Waterfall:
                //   1. Create "Container" adapter
                //   2. Load "PluginManager" and "CommonDataModel" services
                //   3. Load plugins
                //   4. Register plugins
                let system = new System({
                    // this is the initial logon system object
                    alias: "",
                    platform: oConfig.platform || sPlatform
                });
                createAdapter("Container", system, null, true /* async */)
                    .then(function (oCreatedAdapter) {
                        oAdapter = oCreatedAdapter;
                        return oAdapter.load();
                    })
                    .then(function () {
                        // returns true if CDM Plugins are to be loaded
                        function _bLoadCDM () {
                            let oUshellConfig = window["sap-ushell-config"];
                            if (!oUshellConfig || !oUshellConfig.services) {
                                return false;
                            }
                            let oUShellPluginManagerConfig = oUshellConfig.services.PluginManager;
                            let oPluginManagerConfig = oUShellPluginManagerConfig && oUShellPluginManagerConfig.config;
                            return oPluginManagerConfig && oPluginManagerConfig.loadPluginsFromSite;
                        }

                        // Load CommonDataModel and PluginManager in parallel
                        let asyncServices = [this.getServiceAsync("PluginManager")];
                        if (_bLoadCDM()) {
                            //If we have CDM add the scope id to the response configuration
                            oConfigSetting.CDMPromise = this.getServiceAsync("CommonDataModel");
                            asyncServices.push(oConfigSetting.CDMPromise);
                        }
                        Promise.all(asyncServices)
                            .then(function (aServices) {
                                handlePlugins(aServices);
                            })
                            .then(lastSteps);

                        // preload given UI Services to allow sync access (via getService()) w/o triggering a sync request (CSP safeguarding of Neo Platform)
                        let servicesForPreloading = [];
                        if (oConfig.preloadServices !== undefined && Array.isArray(oConfig.preloadServices)) {
                            oConfig.preloadServices.forEach(function (serviceName) {
                                servicesForPreloading.push(this.getServiceAsync(serviceName));
                            }.bind(this));
                            Log.error("Ushell Config's preloadServices should not be used!");
                        }

                        let oShellNavigationInternalPromise = this.getServiceAsync("ShellNavigationInternal")
                            .then(function (oShellNavigationInternal) {
                                this._oShellNavigationInternal = oShellNavigationInternal;
                            }.bind(this));

                        servicesForPreloading.push(oShellNavigationInternalPromise);

                        Promise.all(servicesForPreloading)
                            .then(function () {
                                fnResolve(oAdapter); // Note that resolve might be called before the plugins are registered
                            });
                    }.bind(this));

                function handlePlugins (aServices) {
                    let oPluginManager = aServices[0];
                    let oCDM = aServices[1];
                    let getPlugins = oCDM ? oCDM.getPlugins() : jQuery.when({});

                    getPlugins.then(function (oCDMSitePlugins) {
                        let oAllPlugins = deepExtend({}, oConfig.bootstrapPlugins, oCDMSitePlugins);
                        oPluginManager.registerPlugins(oAllPlugins);
                    });
                }

                function lastSteps () {
                    prepareNWBC();

                    // Config should be required after bootstrap when sap-ushell-config is calculated
                    sap.ui.require(["sap/ushell/Config"], function (Config) {
                        handleDarkMode(Config);
                        initUITracer(Config);
                    });
                }

                function prepareNWBC () {
                    if (ushellUtils.hasFLPReady2NotificationCapability()) {
                        // Notify SAP Business Client (NWBC), that the Container and its Services, are ready to be used and
                        // send additional interface
                        sap.ui.require(["sap/ushell/NWBCInterface"], function (oNWBCInterface) {
                            ushellUtils.getPrivateEpcm().doEventFlpReady2(oNWBCInterface);
                        });
                    } else if (ushellUtils.hasFLPReadyNotificationCapability()) {
                        // Notify SAP Business Client (NWBC), that the Container and its Services, are ready to be used.
                        ushellUtils.getPrivateEpcm().doEventFlpReady();
                    }
                }

                function handleDarkMode (Config) {
                    if (Config.last("/core/darkMode/enabled")) {
                        oContainerInstance.getServiceAsync("DarkModeSupport").then(function (DarkModeSupportService) {
                            if (DarkModeSupportService && DarkModeSupportService.setup) { // Many qUnits mock getServiceAsync without DarkModeSupport
                                DarkModeSupportService.setup();
                            }
                        });
                    }
                }

                function initUITracer (Config) {
                    let bTraceEnabled = !!(new URLSearchParams(window.location.search)).get("sap-ui-xx-ushell-UITraceEnabled");
                    if (Config.last("/core/uiTracer/enabled") || bTraceEnabled) {
                        oContainerInstance.getServiceAsync("UITracer");
                    }
                }
            }.bind(this));

            return oPromise;
        };

        function afterInit () {
            // register event handler for storage events issued by other UShell windows
            if (typeof oAdapter.logoutRedirect === "function") {
                fnStorageEventListener = function (oStorageEvent) {
                    function closeAndRedirectWindow () {
                        // Most browsers do not allow closing windows via JS that aren't opened via JS
                        // hence we additionally redirect to get these manually opened windows redirected at least.
                        // NOTE: It is important to NOT redirect to  "/sap/public/bc/icf/logoff"
                        // because on iPad Safari e.g. the event is not processed until the window gets the focus.
                        // This would terminate any new session opened in between.
                        that._closeWindow();
                        that._redirectWindow();
                    }

                    if (oContainerInstance !== that) {
                        // In integration test suite, old listeners remain which do not belong to the current sap.ushell.Container instance.
                        // IE sends events also to own window. Then these old listeners react as if a remote window logged out...
                        return;
                    }
                    // IE9 seems to get the events, but not the values in another window!?
                    if (oStorageEvent.key.indexOf(sRemoteSystemPrefix) === 0
                        && oStorageEvent.newValue
                        && oStorageEvent.newValue !== oLocalStorage.getItem(oStorageEvent.key)) {
                        ushellUtils.localStorageSetItem(oStorageEvent.key, oStorageEvent.newValue);
                    }
                    if (oStorageEvent.key === sSessionTerminationKey) {
                        if (oStorageEvent.newValue === "pending") {
                            that._suppressOData();
                            if (oEventProvider.fireEvent("Logout", true)) {
                                closeAndRedirectWindow();
                            } else {
                                // defer UShell closeWindow to let NWBC receive message asynchronously
                                setTimeout(closeAndRedirectWindow, 1000);
                            }
                        }
                    }
                };
                window.addEventListener("storage", fnStorageEventListener);
            }
        }

        /**
         * Expose functions for unit testing.
         * Internal use only.
         *
         * @returns {object} An object containing the exposed functions.
         * @private
         * @alias sap.ushell.Container#_getFunctionsForUnitTest
         */
        this._getFunctionsForUnitTest = function () {
            return {
                createAdapter: createAdapter
            };
        };

        /**
         * Resets the internal service instance store.
         * NOTE:
         * Only meant to be used in QUnit tests!
         *
         * @since 1.119
         * @private
         * @alias sap.ushell.Container#resetServices
         */
        this.resetServices = function () {
            mServicesByName = new ushellUtils.Map();
            mServicesByNamePromise = new ushellUtils.Map();
        };

        /**
         * Resets internal state of the Container instance.
         * NOTE:
         * Only meant to be used in QUnit tests!
         *
         * @since 1.119
         * @private
         * @alias sap.ushell.Container#reset
         */
        this.reset = function () {
            this.resetServices();
            oLocalStorage = ushellUtils.getLocalStorage();
            isDirty = false;
            aRegisteredDirtyMethods = [];
            oRenderers = {};
            this.fnAsyncDirtyStateProvider = undefined;
            bInitialized = false;
            oContainerReadyDeferred = new Deferred();
        };
    }

    /**
     * Creates and registers injectable ui5services.
     *
     * @param {string[]} aServicesToRegister An array of service names to register.
     * @param {boolean} bAddCallProtection Whether to add call protection check.
     *   This may not be wanted in case the service is created via:
     *   ServiceFactoryRegistry#get("sap.ushell.ui5service.<service>").createInstance().
     * @private
     */
    function registerInjectableUi5Services (aServicesToRegister, bAddCallProtection) {
        aServicesToRegister.forEach(function (sUshellServiceName) {
            // create registerable factory
            let oServiceFactory = oUi5ServiceFactory.createServiceFactory(sUshellServiceName, bAddCallProtection);

            // register factory to allow UI5 to create the service
            ServiceFactoryRegistry.register("sap.ushell.ui5service." + sUshellServiceName, oServiceFactory);
        });
    }

    oContainerInstance = new Container();

    /**
     * Initializes the Unified Shell Container.
     *
     * This platform-specific method must be called exactly once in the very beginning to resolve all necessary dependencies and
     * prepare Unified Shell's global infrastructure. As soon as the returned promise has been resolved, the container will be available
     * as a singleton object in namespace <code>sap.ushell.Container</code>.
     *
     * <strong>Note:</strong> <code>sap.ushell.bootstrap</code> is used internally by the SAP Fiori launchpad. Developers who build apps or
     * plugins for the SAP Fiori launchpad should use <code>sap.ushell.bootstrap</code> in their code. However, there are special use cases where
     * a customized bootstrap of Unified Shell is helpful, e.g. when Unified Shell UI services need to be accessed without having loaded
     * the Unified Shell's UI. In such cases, additional dependencies need to be required to allow proper usage of the Unified Shell's functionality.
     *
     * <strong>Example:</strong>
     * <pre>
     * &lt;script id="sap-ui-bootstrap"
     *         src=".../sap-ui-core.js"
     *         data-sap-ui-libs="sap.ushell, sap.m"&gt;
     * &lt;/script&gt;
     *
     * &lt;!--...--&gt;
     *
     * &lt;script&gt;
     *   sap.ui.getCore().attachInit(function () {
     *   // Container needs to be required to make sap.ushell.bootstrap available
     *     sap.ui.require(["sap/ushell/Container", ... ], function (Container) {
     *       window["sap-ushell-config"] = {...};
     *
     *       sap.ushell.bootstrap("abap", {
     *         abap: "sap.ushell_abap.adapters.abap"
     *       }).then(function () {
     *         sap.ushell.Container.getServiceAsync(\/* Service *\/).then(function (serviceInstance) {
     *           ...
     *         });
     *       });
     *     });
     *   });
     * &lt;/script&gt;
     * </pre>
     *
     * @param {string} sPlatform the target platform, such as "abap" or "cdm".
     * @param {Object<string, string>} [mAdapterPackagesByPlatform={}] the map with platform specific package names for the service adapters.
     *   You only need to specify these package names if they differ from the standard name <code>"sap.ushell.adapters." + sPlatform</code>.
     * @returns {jQuery.Promise} Resolves once the container is available.
     *
     * @since 1.15.0
     * @ui5-global-only
     * @public
     * @deprecated since 1.120
     */
    sap.ushell.bootstrap = function (sPlatform, mAdapterPackagesByPlatform) {
        /*
         * Migrations are only done as part of platform specific bootstrap coding.
         * However the 'local' platform might called without the actual migration steps.
         * This additional migration step shall not be done in UI5 2.0.
         * Any deprecated usage of the 'direct' 'local' bootstrap shall be replaced with
         * the 'sandbox' scenario.
         */
        if (!window["sap-ushell-config-migration"]) {
            if (sPlatform === "local") {
                Log.error("Deprecated usage of the 'local' platform! Please replace it with the 'sandbox' scenario.", null, "sap.ushell.bootstrap");
            } else {
                Log.error(`Deprecated API call of sap.ushell.bootstrap. Please adapt the platform '${sPlatform}' accordingly.`, null, "sap.ushell.bootstrap");
            }
            commonUtils.migrateV2ServiceConfig(window["sap-ushell-config"]);
        }

        let oDeferred = new jQuery.Deferred();
        oContainerInstance.init(sPlatform, mAdapterPackagesByPlatform)
            .then(function () {
                oDeferred.resolve();
            });
        return oDeferred.promise();
    };

    return oContainerInstance;
});
