// Copyright (c) 2009-2023 SAP SE, All Rights Reserved
sap.ui.define(["sap/ushell/bootstrap/common/common.debug.mode", "sap/base/util/deepExtend"], function(e, n) {
    "use strict";
    var a = {};
    var o = new URLSearchParams(document.location.search);
    function r(r) {
        var s = {};
        function i(e, n) {
            var a = n.split("/");
            var o = a.slice(0, a.length - 1).join("/");
            var s = a.pop();
            if (e.hasOwnProperty(o)) {
                return e[o][s]
            }
            var i = a.reduce(function(e, n) {
                if (!e || !e.hasOwnProperty(n)) {
                    return {}
                }
                return e[n]
            }, r);
            e[o] = i;
            return i[s]
        }
        function l(e, n) {
            var o = i(s, e);
            a[e] = n;
            return o !== undefined ? o : n
        }
        function t() {
            var e = "renderers/fiori2/componentData/config/enableBackGroundShapes";
            var n = !!i(s, e);
            if (n) {
                n = !l("ushell/spaces/enabled", false)
            }
            a[e] = n;
            return n
        }
        function c() {
            return l("renderers/fiori2/componentData/config/enablePersonalization", l("renderers/fiori2/componentData/config/applications/Shell-home/enablePersonalization", true))
        }
        function p() {
            var e = l("renderers/fiori2/componentData/config/rootIntent", "");
            if (e) {
                e = "#" + e
            }
            return e
        }
        function u() {
            return l("ushell/spaces/enabled", false) && !!l("ushell/homeApp/component", false)
        }
        var d = l("renderers/fiori2/componentData/config/applications/Shell-home/enableEasyAccess", true);
        var f = {
            enableEasyAccessOnTablet: l("renderers/fiori2/componentData/config/applications/Shell-home/enableEasyAccessUserMenuOnTablet", false),
            enableEasyAccessSAPMenu: l("renderers/fiori2/componentData/config/applications/Shell-home/enableEasyAccessSAPMenu", d),
            enableEasyAccessSAPMenuSearch: l("renderers/fiori2/componentData/config/applications/Shell-home/enableEasyAccessSAPMenuSearch", true),
            enableEasyAccessUserMenu: l("renderers/fiori2/componentData/config/applications/Shell-home/enableEasyAccessUserMenu", d),
            enableEasyAccessUserMenuSearch: l("renderers/fiori2/componentData/config/applications/Shell-home/enableEasyAccessUserMenuSearch", true)
        };
        function h(e) {
            if (d === true) {
                return f[e] ? f[e + "Search"] : false
            }
            return false
        }
        function m(e) {
            if (typeof e !== "string") {
                return []
            }
            return e.split(",").map(function(e) {
                return e.trim()
            })
        }
        function g() {
            return {
                name: "sap.ushell.components.workPageRuntime",
                asyncHints: {
                    preloadBundles: ["sap/ushell/preload-bundles/workpage-rt-common.js", "sap/ushell/preload-bundles/workpage-rt-0.js", "sap/ushell/preload-bundles/workpage-rt-1.js", "sap/ushell/preload-bundles/workpage-rt-2.js", "sap/ushell/preload-bundles/workpage-rt-3.js"]
                }
            }
        }
        var b = {
            core: {
                site: {
                    siteId: l("ushell/site/siteId", null)
                },
                extension: {
                    enableHelp: l("renderers/fiori2/componentData/config/enableHelp", false),
                    SupportTicket: l("services/SupportTicket/config/enabled", false)
                },
                services: {
                    allMyApps: {
                        enabled: l("services/AllMyApps/config/enabled", true),
                        showHomePageApps: l("services/AllMyApps/config/showHomePageApps", true),
                        showCatalogApps: l("services/AllMyApps/config/showCatalogApps", true)
                    }
                },
                navigation: {
                    enableInPlaceForClassicUIs: {
                        GUI: l("services/ClientSideTargetResolution/config/enableInPlaceForClassicUIs/GUI", false),
                        WDA: l("services/ClientSideTargetResolution/config/enableInPlaceForClassicUIs/WDA", false),
                        WCF: l("services/ClientSideTargetResolution/config/enableInPlaceForClassicUIs/WCF", true)
                    },
                    enableWebguiLocalResolution: true,
                    enableWdaLocalResolution: true,
                    flpURLDetectionPattern: l("services/ClientSideTargetResolution/config/flpURLDetectionPattern", "[/]FioriLaunchpad.html[^#]+#[^-]+?-[^-]+"),
                    enableWdaCompatibilityMode: l("ushell/navigation/wdaCompatibilityMode", false)
                },
                spaces: {
                    enabled: l("ushell/spaces/enabled", false),
                    configurable: l("ushell/spaces/configurable", false),
                    myHome: {
                        userEnabled: true,
                        enabled: l("startupConfig/spacesMyhome", false) || u(),
                        myHomeSpaceId: l("startupConfig/spacesMyhomeSpaceid", null),
                        myHomePageId: l("startupConfig/spacesMyhomePageid", null),
                        presetSectionId: "3WO90XZ1DX1AS32M7ZM9NBXEF"
                    },
                    hideEmptySpaces: {
                        enabled: l("ushell/spaces/enabled", false) && l("ushell/spaces/hideEmptySpaces/enabled", false),
                        userEnabled: true
                    },
                    extendedChangeDetection: {
                        enabled: l("ushell/spaces/extendedChangeDetection/enabled", true)
                    },
                    homeNavigationTarget: l("renderers/fiori2/componentData/config/homeNavigationTarget", undefined),
                    currentSpaceAndPage: undefined
                },
                workPages: {
                    enabled: l("ushell/spaces/enabled", false) && l("ushell/workPages/enabled", false),
                    defaultComponent: g(),
                    component: l("ushell/workPages/component", n(g(), {
                        addCoreResourcesComplement: false
                    })),
                    contentApiUrl: l("ushell/workPages/contentApiUrl", "/cep/graphql"),
                    tileCard: l("ushell/workPages/tileCard", !!o.get("sap-ushell-tilecard")),
                    customTileCard: l("ushell/workPages/customTileCard", !!o.get("sap-ushell-customtilecard")),
                    myHome: {
                        pageId: l("ushell/spaces/myHome/myHomePageId", null)
                    },
                    runtimeSwitcher: l("ushell/workPages/runtimeSwitcher", l("ushell/spaces/myHome/myHomePageId", null) === null),
                    contentFinderStandalone: !!l("core/workPages/contentFinderStandalone"),
                    contentFinderListView: l("core/workPages/contentFinderListView", false)
                },
                homeApp: {
                    enabled: u(),
                    component: l("ushell/homeApp/component", {})
                },
                menu: {
                    enabled: l("ushell/spaces/enabled", false) && l("ushell/menu/enabled") !== false || l("ushell/menu/enabled", false),
                    personalization: {
                        enabled: l("ushell/menu/personalization/enabled", false)
                    },
                    visibleInAllStates: l("ushell/menu/visibleInAllStates", false)
                },
                darkMode: {
                    enabled: l("ushell/darkMode/enabled", false),
                    supportedThemes: l("ushell/darkMode/supportedThemes", [{
                        dark: "sap_fiori_3_dark",
                        light: "sap_fiori_3"
                    }, {
                        dark: "sap_fiori_3_hcb",
                        light: "sap_fiori_3_hcw"
                    }, {
                        dark: "sap_horizon_dark",
                        light: "sap_horizon"
                    }, {
                        dark: "sap_horizon_hcb",
                        light: "sap_horizon_hcw"
                    }])
                },
                contentProviders: {
                    providerInfo: {
                        enabled: l("ushell/contentProviders/providerInfo/enabled", false),
                        userConfigurable: l("ushell/contentProviders/providerInfo/enabled", false) && l("ushell/contentProviders/providerInfo/userConfigurable", false),
                        showContentProviderInfoOnVisualizations: l("ushell/contentProviders/providerInfo/enabled", false) && l("ushell/contentProviders/providerInfo/userConfigurable", false)
                    }
                },
                productSwitch: {
                    enabled: !!l("ushell/productSwitch/url", ""),
                    url: l("ushell/productSwitch/url", "")
                },
                shellHeader: {
                    rootIntent: l("renderers/fiori2/componentData/config/rootIntent", ""),
                    homeUri: p()
                },
                companyLogo: {
                    accessibleText: l("ushell/companyLogo/accessibleText", ""),
                    url: l("ushell/companyLogo/url", "")
                },
                userPreferences: {
                    dialogTitle: "Settings",
                    isDetailedEntryMode: false,
                    activeEntryPath: null,
                    entries: [],
                    profiling: []
                },
                userSettings: {
                    displayUserId: l("renderers/fiori2/componentData/config/displayUserId", false)
                },
                shell: {
                    cacheConfiguration: l("renderers/fiori2/componentData/config/cacheConfiguration", {}),
                    enableAbout: l("renderers/fiori2/componentData/config/enableAbout", true),
                    enablePersonalization: c(),
                    enableRecentActivity: l("renderers/fiori2/componentData/config/enableRecentActivity", true),
                    enableRecentActivityLogging: l("renderers/fiori2/componentData/config/enableRecentActivityLogging", true),
                    enableFiori3: true,
                    // sessionTimeoutIntervalInMinutes: l("renderers/fiori2/componentData/config/sessionTimeoutIntervalInMinutes", -1),
                    enableFeaturePolicyInIframes: l("renderers/fiori2/componentData/config/enableFeaturePolicyInIframes", true),
                    enableOpenIframeWithPost: l("renderers/fiori2/componentData/config/enableOpenIframeWithPost", true),
                    favIcon: l("renderers/fiori2/componentData/config/favIcon", undefined),
                    enableMessageBroker: l("services/MessageBroker/config/enabled", true),
                    enablePersistantAppstateWhenSharing: l("services/AppState/config/persistentWhenShared", false),
                    homePageTitle: l("ushell/header/title/home", ""),
                    windowTitleExtension: l("ushell/window/title/extension", ""),
                    useAppTitleFromNavTargetResolution: m(l("ushell/useAppTitleFromNavTargetResolution")),
                    intentNavigation: l("ushell/intentNavigation", false),
                    model: {
                        enableSAPCopilotWindowDocking: undefined,
                        enableBackGroundShapes: t(),
                        personalization: undefined,
                        contentDensity: undefined,
                        setTheme: undefined,
                        userDefaultParameters: undefined,
                        disableHomeAppCache: undefined,
                        enableHelp: undefined,
                        enableTrackingActivity: undefined,
                        searchAvailable: false,
                        searchFiltering: true,
                        searchTerm: "",
                        isPhoneWidth: false,
                        enableNotifications: l("services/NotificationsV2/config/enabled", l("services/Notifications/config/enabled", false)),
                        enableNotificationsUI: false,
                        notificationsCount: 0,
                        currentViewPortState: "Center",
                        migrationConfig: undefined,
                        shellAppTitleState: "",
                        allMyAppsMasterLevel: undefined,
                        userStatus: undefined,
                        userStatusUserEnabled: true,
                        shellAppTitleData: {
                            currentViewInPopover: "navigationMenu",
                            enabled: false,
                            showGroupsApps: false,
                            showCatalogsApps: false,
                            showExternalProvidersApps: false
                        },
                        userImage: {
                            personPlaceHolder: null,
                            account: "sap-icon://account"
                        },
                        showRecentActivity: true
                    }
                },
                state: {
                    shellMode: l("renderers/fiori2/componentData/config/appState", "")
                },
                home: {
                    disableSortedLockedGroups: l("renderers/fiori2/componentData/config/applications/Shell-home/disableSortedLockedGroups", false),
                    draggedTileLinkPersonalizationSupported: true,
                    editTitle: false,
                    enableHomePageSettings: l("renderers/fiori2/componentData/config/applications/Shell-home/enableHomePageSettings", true),
                    enableRenameLockedGroup: l("renderers/fiori2/componentData/config/applications/Shell-home/enableRenameLockedGroup", false),
                    enableTileActionsIcon: l("renderers/fiori2/componentData/config/enableTileActionsIcon", l("renderers/fiori2/componentData/config/applications/Shell-home/enableTileActionsIcon", false)),
                    enableTransientMode: l("ushell/home/enableTransientMode", false),
                    featuredGroup: {
                        enable: l("ushell/home/featuredGroup/enable", false),
                        frequentCard: l("ushell/home/featuredGroup/frequentCard", true) && l("ushell/home/featuredGroup/enable", false),
                        recentCard: l("ushell/home/featuredGroup/recentCard", true) && l("ushell/home/featuredGroup/enable", false)
                    },
                    homePageGroupDisplay: l("renderers/fiori2/componentData/config/applications/Shell-home/homePageGroupDisplay", "scroll"),
                    isInDrag: false,
                    optimizeTileLoadingThreshold: l("renderers/fiori2/componentData/config/applications/Shell-home/optimizeTileLoadingThreshold", 100),
                    sizeBehavior: l("renderers/fiori2/componentData/config/sizeBehavior", "Responsive"),
                    sizeBehaviorConfigurable: l("renderers/fiori2/componentData/config/sizeBehaviorConfigurable", false),
                    wrappingType: l("ushell/home/tilesWrappingType", "Normal"),
                    segments: l("renderers/fiori2/componentData/config/applications/Shell-home/segments", undefined),
                    tileActionModeActive: false
                },
                catalog: {
                    enabled: c() || l("renderers/fiori2/componentData/config/enableAppFinder", false),
                    appFinderDisplayMode: l("renderers/fiori2/componentData/config/applications/Shell-home/AppFinderDisplayMode", l("renderers/fiori2/componentData/config/applications/Shell-home/appFinderDisplayMode", undefined)),
                    easyAccessNumbersOfLevels: l("renderers/fiori2/componentData/config/applications/Shell-home/easyAccessNumbersOfLevels", undefined),
                    enableCatalogSearch: l("renderers/fiori2/componentData/config/enableSearchFiltering", l("renderers/fiori2/componentData/config/applications/Shell-home/enableSearchFiltering", l("renderers/fiori2/componentData/config/applications/Shell-home/enableCatalogSearch", true))),
                    enableCatalogSelection: l("renderers/fiori2/componentData/config/enableCatalogSelection", l("renderers/fiori2/componentData/config/applications/Shell-home/enableCatalogSelection", true)),
                    enableCatalogTagFilter: l("renderers/fiori2/componentData/config/applications/Shell-home/enableTagFiltering", l("renderers/fiori2/componentData/config/applications/Shell-home/enableCatalogTagFilter", true)),
                    enableEasyAccess: d,
                    enableEasyAccessSAPMenu: d ? f.enableEasyAccessSAPMenu : false,
                    enableEasyAccessOnTablet: d ? f.enableEasyAccessOnTablet : false,
                    enableEasyAccessSAPMenuSearch: h("enableEasyAccessSAPMenu"),
                    enableEasyAccessUserMenu: d ? f.enableEasyAccessUserMenu : false,
                    enableEasyAccessUserMenuSearch: h("enableEasyAccessUserMenu"),
                    enableHideGroups: l("renderers/fiori2/componentData/config/enableHideGroups", l("renderers/fiori2/componentData/config/applications/Shell-home/enableHideGroups", true)),
                    sapMenuServiceUrl: undefined,
                    userMenuServiceUrl: l("renderers/fiori2/componentData/config/applications/Shell-home/userMenuServiceUrl", undefined)
                },
                esearch: {
                    defaultSearchScopeApps: l("renderers/fiori2/componentData/config/esearch/defaultSearchScopeApps", false),
                    searchBusinessObjects: l("renderers/fiori2/componentData/config/esearch/searchBusinessObjects", true),
                    searchScopeWithoutAll: l("renderers/fiori2/componentData/config/esearch/searchScopeWithoutAll", false)
                },
                customPreload: {
                    enabled: !e.isDebug() && l("ushell/customPreload/enabled", false),
                    coreResourcesComplement: l("ushell/customPreload/coreResourcesComplement", [])
                },
                ui5: {
                    timeZoneFromServerInUI5: l("ui5/timeZoneFromServerInUI5", false)
                },
                uiTracer: {
                    enabled: l("services/UITracer/config/enabled", false)
                }
            }
        };
        return b
    }
    function s() {
        return a
    }
    return {
        createConfigContract: r,
        getDefaultConfiguration: s
    }
});
//# sourceMappingURL=common.create.configcontract.core.js.map
