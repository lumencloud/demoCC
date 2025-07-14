//Copyright (c) 2009-2023 SAP SE, All Rights Reserved
/**
 * @fileOverview ContentFinder Component
 *
 * @version 1.132.0
 */

sap.ui.define([
    "sap/base/Log",
    "sap/base/util/deepExtend",
    "sap/base/util/ObjectPath",
    "sap/ui/core/UIComponent",
    "sap/ushell/components/contentFinder/model/GraphQLModel",
    "sap/ui/model/json/JSONModel",
    "bix/common/library/home/library/ushell/adapters/cdm/v3/utilsCdm",
    "bix/common/library/home/library/ushell/Config",
    "sap/f/library"
], function (Log, deepExtend, ObjectPath, UIComponent, GraphQLModel, JSONModel, utilsCdm, Config, fLibrary) {
    "use strict";

    const LayoutType = fLibrary.LayoutType;

    /**
     * Event for the visualizations to be added
     *
     * @event sap.ushell.components.contentFinder.Component#visualizationsAdded
     * @type {object}
     * @property {string[]} visualizationIds The list of visualization IDs to be added.
     */

    /**
     * Event if a widget (type) without target was selected in the widget gallery.
     *
     * @event sap.ushell.components.contentFinder.Component#visualizationsAdded
     * @type {object}
     * @property {string} widgetId The ID of the selected widget type
     */

    /**
     * Component of the ContentFinder view.
     *
     * @param {string} sId Component id.
     * @param {object} mSettings Optional map for component settings.
     *
     * @class
     * @extends sap.ui.core.UIComponent
     * @alias sap.ushell.components.contentFinder.Component
     * @since 1.113.0
     * @private
     */
    return UIComponent.extend("sap.ushell.components.contentFinder.Component", /** @lends sap.ushell.components.contentFinder.Component.prototype */{
        metadata: {
            manifest: "json",
            library: "sap.ushell",
            interfaces: ["sap.ui.core.IAsyncContentCreation"],
            properties: {
                enablePersonalization: {
                    type: "boolean",
                    defaultValue: true,
                    group: "Behavior"
                },
                noItemsInCatalogDescription: {
                    type: "string",
                    defaultValue: "",
                    group: "Appearance"
                },
                showAppBoxFieldsPlaceholder: {
                    type: "boolean",
                    defaultValue: true,
                    group: "Appearance"
                },
                showCategoryTreeWhenEmpty: {
                    type: "boolean",
                    defaultValue: true,
                    group: "Appearance"
                },
                showApplicationLaunchButton: {
                    type: "boolean",
                    defaultValue: false,
                    group: "Appearance"
                }
            },
            events: {
                /**
                 * Fires when additional visualizations must be requested:
                 * - Search term or filters changed
                 * - End of the page is reached (growing)
                 * - The selection in the category tree changed
                 *
                 * In the event handler new data should be provided by the embedding component. The
                 * Content Finder is set to busy until <code>setVisualizationData</code> is called.
                 *
                 * @type {object}
                 * @since 1.115.0
                 * @private
                 */
                visualizationFilterApplied: {
                    allowPreventDefault: true,
                    parameters: {
                        /**
                         * A string array of visualization types that shall be requested. E.g.:
                         * - sap.ushell.StaticAppLauncher
                         * - sap.ushell.DynamicAppLauncher
                         */
                        types: { type: "string[]" },
                        /**
                         * The search term that was entered by the user for the visualization search
                         */
                        searchTerm: { type: "string" },
                        /**
                         * Current pagination information of the visualizations GridList
                         */
                        pagination: {
                            type: {
                                skip: "integer",
                                top: "integer"
                            }
                        },
                        filter: { type: "any" },
                        /**
                         * The currently selected category ID if any
                         */
                        categoryId: { type: "string" }
                    }
                },
                /**
                 * Fires when the Content Finder dialog is closed.
                 * @type {object}
                 * @since 1.113.0
                 * @private
                 */
                contentFinderClosed: {
                    parameters: {}
                },
                /**
                 * Fires when a widget is selected.
                 * @type {object}
                 * @since 1.112.0
                 * @private
                 */
                widgetSelected: {
                    parameters: {
                        /**
                         * The currently selected widget ID.
                         */
                        widgetId: { type: "string" }
                    }
                }, /**
                 * Fires the event which provides the added visualizations.
                 * @type {object}
                 * @since 1.112.0
                 * @private
                 */
                visualizationsAdded: {
                    parameters: {
                        /**
                         * The visualizations object
                         */
                        visualizations: { type: "object[]" }
                    }
                }
            }
        },

        /**
         * The string of the current contentFinder component for usage in Error Logs.
         * @type {string}
         */
        logComponent: "sap.ushell.components.ContentFinder.Component",

        /**
         * The init function called when the component is initialized.
         *
         * @since 1.113.0
         * @private
         */
        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            this.oResourceBundle = this.getModel("i18n").getResourceBundle();

            // The "ui" model is used for the external and internal settings
            // (e.g. component settings and internal configuration)
            this.setModel(this.getUiModel(), "ui");

            // The "unnamed" model is used for (external) data provided from the API.
            // (e.g. "categoryTree", "visualizations")
            this.setModel(this.getDataModel());

            // The "data" model is just an alias for the "unnamed" model which is used
            // to swap the data and selection models on the GridList and Table.
            // It is only used for this purpose.
            this.setModel(this.getDataModel(), "data");

            // The "selection" model is used for the selection mode in the GridList and the Table
            this.setModel(this.getSelectionModel(), "selection");

            this.initializeUiModel(false);
            this.initializeDataModel();
            this.initializeSelectionModel();
            // Keep in mind that applySettings is called after the init function and hence don't contain
            // the properties (settings) provided with the component constructor.
            // Property changes that require updates of dependent properties need to be triggered by
            // binding events. Check the following method for an example:
            this._initializeSidebarStatus();

            const oComponentData = this.getComponentData();
            if (oComponentData?.visualizationFilters) {
                this.setVisualizationsFilters(oComponentData.visualizationFilters);
            }
            

            // Initialize Map which stores the restricted visualizations, which are visualizations
            // that are already present on the section. This allows direct access to the keys and can be used in a
            // formatter to indicate used visualizations.
            this.oRestrictedVisualizationsMap = new Map();

            // Indicates if the visualizations are currently loading to prevent additional events for data retrieval to be fired.
            this._bLoading = false;
        },

        /**
         * @typedef {object} VisualizationFilter A visualization filter.
         * @property {string} key The key of the filter to be used. For example, in the "displayed" array.
         * @property {string} title The translated title of the filter.
         * @property {array<string>} types The visualization types (e.g. "sap.ushell.StaticAppLauncher", "sap.ushell.DynamicAppLauncher", "sap.card")
         */
        /**
         * @typedef {object} VisualizationsFilters
         * @property {VisualizationFilter[]} available The available visualization filters configuration objects.
         * @property {string[]} displayed The keys of the displayed visualization filters.
         * @property {string} selected The key of the selected visualization filter.
         */
        /**
         * Sets the visualization filters used by the type selection filter.
         *
         * @param {VisualizationsFilters} oVisualizationsFilters The visualization filters.
         *
         * @since 1.132.0
         * @private
         */
        setVisualizationsFilters: function (oVisualizationsFilters) {
            const oUiModel = this.getUiModel();
            if (oVisualizationsFilters?.available) {
                oUiModel.setProperty("/visualizations/filters/available", oVisualizationsFilters.available);
            }
            if (oVisualizationsFilters?.displayed) {
                oUiModel.setProperty("/visualizations/filters/displayed", oVisualizationsFilters.displayed);
            }
        },

        /**
         * Returns the "ui" model.
         *
         * Creates a new JSONModel if it does not exist.
         *
         * @returns {sap.ui.model.json.JSONModel} The model.
         *
         * @since 1.132.0
         * @private
         */
        getUiModel: function () {
            if (!this.oUiModel) {
                this.oUiModel = new JSONModel();
            }
            return this.oUiModel;
        },

        /**
         * Returns the "data" model.
         *
         * Creates a new GraphQLModel if it does not exist.
         *
         * @returns {sap.ushell.components.contentFinder.model.GraphQLModel} The model.
         *
         * @since 1.132.0
         * @private
         */
        getDataModel: function () {
            if (!this.oDataModel) {
                this.oDataModel = new GraphQLModel();
                this.oDataModel.setSizeLimit(Infinity);
            }
            return this.oDataModel;
        },

        /**
         * Returns the "selection" model.
         *
         * Creates a new JSONModel if it does not exist.
         *
         * @returns {sap.ui.model.json.JSONModel} The model.
         *
         * @since 1.132.0
         * @private
         */
        getSelectionModel: function () {
            if (!this.oSelectionModel) {
                this.oSelectionModel = new JSONModel();
                this.oSelectionModel.setSizeLimit(Infinity);
            }
            return this.oSelectionModel;
        },

        /**
         * Sets a component setting as a property in the "ui" model.
         *
         * Helper method to set a property in the component properties and the "ui" model.
         * The name of the property must be the same in the component and the model.
         *
         * @param {string} sPropertyName The name of the property in the component and the model
         * @param {any} vValue The value of the property.
         * @returns {sap.ushell.components.contentFinder.Component} The Content Finder component instance.
         *
         * @since 1.132.0
         * @private
         */
        _setComponentSettingsProperty: function (sPropertyName, vValue) {
            this.setProperty(sPropertyName, vValue);
            this.getModel("ui").setProperty("/componentSettings/" + sPropertyName, vValue);
            return this;
        
        },

        /**
         * Sets the enablePersonalization property.
         *
         * If set to true, the visualizations are selectable and can be added to the page.
         *
         * @param {boolean} bEnablePersonalization True if personalization is enabled.
         * @returns {sap.ushell.components.contentFinder.Component} The Content Finder component instance.
         *
         * @since 1.132.0
         * @public
         */
        setEnablePersonalization: function (bEnablePersonalization) {
            return this._setComponentSettingsProperty("enablePersonalization", !!bEnablePersonalization);
        },

        /**
         * Sets the description for the "No items in catalog" message.
         *
         * The description is shown when no items are available in the catalog. This translation is provided
         * from the consumer because the ContentFinder does not know if it is in design or runtime mode.
         *
         * @param {string} sNoItemsInCatalogDescription The actual string for the description and not the i18n key.
         * @returns {sap.ushell.components.contentFinder.Component} The Content Finder component instance.
         *
         * @since 1.132.0
         * public
         */
        setNoItemsInCatalogDescription: function (sNoItemsInCatalogDescription) {
            return this._setComponentSettingsProperty("noItemsInCatalogDescription", sNoItemsInCatalogDescription);
        },

        /**
         * Sets the visibility of the app box fields which are empty.
         *
         * @param {boolean} bShowAppBoxFieldsPlaceholder True if all app box fields should be shown.
         * @returns {sap.ushell.components.contentFinder.Component} The Content Finder component instance.
         *
         * @since 1.132.0
         * @public
         */
        setShowAppBoxFieldsPlaceholder: function (bShowAppBoxFieldsPlaceholder) {
            return this._setComponentSettingsProperty("showAppBoxFieldsPlaceholder", !!bShowAppBoxFieldsPlaceholder);
        },

        /**
         * Sets the visibility of the category tree when it is empty.
         *
         * @param {boolean} bShowCategoryTreeWhenEmpty True if the category tree should be shown when empty.
         * @returns {sap.ushell.components.contentFinder.Component} The Content Finder component instance.
         *
         * @since 1.132.0
         * @public
         */
        setShowCategoryTreeWhenEmpty: function (bShowCategoryTreeWhenEmpty) {
            return this._setComponentSettingsProperty("showCategoryTreeWhenEmpty", !!bShowCategoryTreeWhenEmpty);
        },

        /**
         * Sets the visibility of the application launch button.
         *
         * @param {boolean} bShowApplicationLaunchButton True if the application launch button should be shown.
         * @returns {sap.ushell.components.contentFinder.Component} The Content Finder component instance.
         *
         * @since 1.132.0
         * @public
         */
        setShowApplicationLaunchButton: function (bShowApplicationLaunchButton) {
            return this._setComponentSettingsProperty("showApplicationLaunchButton", !!bShowApplicationLaunchButton);
        },

        /**
         * @typedef {Object} CatalogItem
         * @property {string} id The ID of the catalog.
         * @property {string} title The title of the catalog.
         */
        /**
         * @typedef {Object} CategoryTreeItem
         * @property {string|undefined} id The ID of the category node.
         * @property {string} title The title of the category node.$
         * @property {boolean} inactive Indicates if the category node is inactive.
         * @property {number} [$count] The count of catalogs inside the node.
         * @property {CatalogItem[]} [nodes] The child nodes of the category node.
         */
        /**
         * Sets the category tree data for the Content Finder model.
         *
         * The category tree does not support pagination. All tree data must be set at once.
         * If a category tree is available, the category tree is shown in the Content Finder by setting
         * the FlexibleColumnLayout to TwoColumnsMidExpanded.
         *
         * @param {CategoryTreeItem[]|[]} aCategoryTree A tree of category objects.
         *
         * @experimental
         * @since 1.123.0
         * @private
         */
        setCategoryTree: function (aCategoryTree) {
            const oDataModel = this.getDataModel();
            if (!Array.isArray(aCategoryTree)) {
                Log.error("Category tree data must be an array.");
                aCategoryTree = [];
            }
            oDataModel.setProperty("/categoryTree", aCategoryTree);
        },

        /**
         * Fires the event to query for visualizations.
         *
         * @param {int} iSkip Number of entries already displayed.
         * @param {string} [sSearchTerm] The search term.
         * @param {string} [sCategoryId] The category ID resulting from the category tree selection
         *
         * @since 1.115.0
         * @private
         */
        queryVisualizations: function (iSkip, sSearchTerm, sCategoryId) {
            const oUiModel = this.getUiModel();
            const aAvailableVisualizationFilters = oUiModel.getProperty("/visualizations/filters/available");
            const oSelected = aAvailableVisualizationFilters.find((oElement) => oElement.key === 'cards');

            if (!this._bLoading) {
                this._bLoading = true;
                oUiModel.setProperty("/visualizations/loaded", false);
                this.fireEvent("visualizationFilterApplied", {
                    pagination: {
                        skip: iSkip || 0,
                        top: oUiModel.getProperty("/visualizations/growingThreshold")
                    },
                    types: oSelected?.types || [],
                    search: sSearchTerm || null,
                    categoryId: sCategoryId || null
                });
            }
        },

        /**
         * Replaces or concatenates the visualization data.
         *
         * @param {object} oVisualizationData An object containing all the visualization data as arrays.
         * @param {boolean} [bReplaceVisualizations] If true, the visualizations will be replaced.
         *
         * @since 1.115.0
         * @private
         */
        setVisualizationData: function (oVisualizationData, bReplaceVisualizations = false) {
            const aVisualizations = ObjectPath.get("visualizations.nodes", oVisualizationData) || [];
            const iTotalCount = ObjectPath.get("visualizations.totalCount", oVisualizationData) || 0;
            const oDataModel = this.getDataModel();
            const oUiModel = this.getUiModel();

            // Prepare object structure for visualizations
            const aPreparedVisualizations = this._prepareVisualizations(aVisualizations);

            // Replace or append to existing visualizations
            let aExistingVisualizations;
            if (bReplaceVisualizations) {
                aExistingVisualizations = [];
            } else {
                aExistingVisualizations = oDataModel.getProperty("/visualizations/items");
            }
            oDataModel.setProperty("/visualizations/items", aExistingVisualizations.concat(deepExtend([], aPreparedVisualizations)));

            oDataModel.setProperty("/visualizations/totalCount", iTotalCount);
            oUiModel.setProperty("/visualizations/loaded", true);

            this._bLoading = false;
        },

        /**
         * Adds context data to visualization data.
         *
         * This context can be used to set restricted visualizations. Restricted visualizations are
         * visualizations which are already present in the section.
         *
         * @param {object} oContextData The context data with the restricted visualizations.
         * @param {array<string>} [oContextData.restrictedVisualizations] An array of restricted visualization IDs.
         *
         * @since 1.113.0
         * @public
         */
        setContextData: function (oContextData) {
            const aRestrictedVisualizations = ObjectPath.get("restrictedVisualizations", oContextData) || [];
            const oModel = this.getDataModel();

            this.oRestrictedVisualizationsMap.clear();
            aRestrictedVisualizations.forEach((sId) => {
                this.oRestrictedVisualizationsMap.set(sId, true);
            });

            // Should be called last to trigger the bindings
            oModel.setProperty("/visualizations/restrictedItems", deepExtend([], aRestrictedVisualizations));
        },

        /**
         * @typedef {Object} Visualization
         * @property {string} id - Unique identifier for the visualization.
         * @property {string} title - Title of the visualization.
         * @property {string} subtitle - Subtitle or description of the visualization.
         */

        /**
         * Fires the <code>visualizationAdded</code> event which provides the added visualizations.
         *
         * @fires sap.ushell.components.contentFinder.Component#visualizationsAdded
         * @param {Visualization[]} aVisualizationsToAdd An array of visualizations to be added.
         *
         * @since 1.113.0
         * @private
         */
        addVisualizations: function (aVisualizationsToAdd) {
            if (aVisualizationsToAdd.length > 0) {
                this.fireEvent("visualizationsAdded", {
                    visualizations: aVisualizationsToAdd
                });
            }
        },

        /**
         * Function to trigger the <code>contentFinderClosed</code> event.
         * It will fire the `contentFinderClosed` without any parameters.
         *
         * @since 1.132.0
         * @private
         */
        triggerContentFinderClosed: function () {
            this.fireEvent("contentFinderClosed");
        },

        /**
         * Fires the <code>widgetSelected</code> event .
         *
         * @param {string} [widgetId] The widget ID resulting from the widget selection.
         *
         * @since 1.132.0
         * @private
         */
        triggerWidgetSelected: function (widgetId) {
            if (widgetId) {
                this.fireEvent("widgetSelected", {widgetId: widgetId});
            }
        },

        /**
         * Resets the AppSearch, but keeps originally passed settings in the model.
         *
         * Should net empty visualizations, but reset all the data which needs to be initialized again
         * if the consumer closes and opens the Content Finder again.
         *
         * @since 1.113.0
         * @private
         */
        resetAppSearch: function () {
            this.initializeUiModel(true);
            this.initializeSelectionModel();
            this.useSelectionModel(false);
            this.updateSidebarStatus();
        },

        /**
         * Switches the default model to the selection model or the data model.
         *
         * @param {boolean} bEnable True if the selection model or false if the data model should be used.
         *
         * @since 1.132.0
         * @private
         */
        useSelectionModel: function (bEnable) {
            let oModel;
            if (bEnable) {
                oModel = this.getSelectionModel();
            } else {
                oModel = this.getDataModel();
            }
            this.setModel(oModel, "data");
        },

        /**
         * Initializes the content finder model.
         *
         * @param {boolean} [bPreserveData] If true, the data is preserved.
         *
         * @since 1.132.0
         * @private
         */
        initializeUiModel: function (bPreserveData = false) {
            const oModel = this.getUiModel();

            let oPreservedData;
            if (bPreserveData) {
                oPreservedData = {
                    preservedLayoutType: oModel.getProperty("/preservedLayoutType"),
                    categoryTree: oModel.getProperty("/categoryTree"),
                    visualizations: {
                        filters: oModel.getProperty("/visualizations/filters"),
                        listView: oModel.getProperty("/visualizations/listView")
                    }
                };
            }

            oModel.setData({
                // Settings which are only used internally
                layoutType: LayoutType.TwoColumnsMidExpanded,
                preservedLayoutType: LayoutType.TwoColumnsMidExpanded,
                maxColumnsCount: 2,

                // Settings provided to the component as settings parameter
                componentSettings: {
                    enablePersonalization: this.getEnablePersonalization(),
                    noItemsInCatalogDescription: this.getNoItemsInCatalogDescription(),
                    showAppBoxFieldsPlaceholder: this.getShowAppBoxFieldsPlaceholder(),
                    showCategoryTreeWhenEmpty: this.getShowCategoryTreeWhenEmpty(),
                    showApplicationLaunchButton: this.getShowApplicationLaunchButton()
                },

                categoryTree: {
                    // If the categoryTree has data (array is not empty)
                    hasData: false,
                    itemPressed: false,
                    selectedId: undefined,
                    selectedTitle: undefined,
                    // If the categoryTree is currently visible by considering the available space.
                    visible: true
                },

                visualizations: {
                    appliedSearchTerm: "",
                    filters: {
                        displayed: [],
                        filterIsTitle: true,
                        selected: "cards",
                        available: []
                    },
                    growingThreshold: 100,
                    listView: false,
                    loaded: false,
                    searchFieldValue: "",
                    searchTerm: "",
                    showSelectedPressed: false
                }
            });

            if (bPreserveData) {
                oModel.setData(oPreservedData, true);
            }
        },

        /**
         * Initializes the data model.
         *
         * @since 1.132.0
         * @private
         */
        initializeDataModel: function () {
            this.getDataModel().setData({
                categoryTree: [],
                visualizations: {
                    items: [],
                    totalCount: 0,
                    restrictedItems: []
                }
            });
        },

        /**
         * Initializes the selection model.
         *
         * @since 1.132.0
         * @private
         */
        initializeSelectionModel: function () {
            this.getSelectionModel().setData({
                visualizations: {
                    items: [],
                    totalCount: 0,
                    restrictedItems: []
                }
            });
        },

        /**
         * Resets the visualizations in the data model.
         *
         * @since 1.132.0
         * @private
         */
        resetVisualizations: function () {
            const oDataModel = this.getDataModel();
            oDataModel.setProperty("/visualizations/items", []);
            oDataModel.setProperty("/visualizations/totalCount", 0);
        },

        /**
         * Initializes the sidebar status.
         *
         * The sidebar status is set to MidColumnFullScreen (no category tree) if the category tree is empty in run time.
         *
         * @since 1.132.0
         * @private
         */
        _initializeSidebarStatus: function () {
            const oDataModel = this.getDataModel();
            const oUiModel = this.getUiModel();

            this.oCategoryTreeLengthBinding = oDataModel.bindProperty("/categoryTree/length");
            this.oShowCategoryTreeWhenEmptyBinding = oUiModel.bindProperty("/componentSettings/showCategoryTreeWhenEmpty");
            this.oMaxColumnsCountBinding = oUiModel.bindProperty("/maxColumnsCount");
            this.oVisualizationsFilterSelectedBinding = oUiModel.bindProperty("/visualizations/filters/selected");

            [
                this.oCategoryTreeLengthBinding,
                this.oShowCategoryTreeWhenEmptyBinding,
                this.oMaxColumnsCountBinding,
                this.oVisualizationsFilterSelectedBinding
            ].forEach((fn) => fn.attachChange(this.onUpdateSidebarStatus, this));

            this.updateSidebarStatus();
        },

        /**
         * Called when the sidebar status needs to be updated.
         *
         * Several bindings are used to determine if the sidebar status needs to be updated.
         * this method is called when one of the bindings changes. The setTimeout ensures that
         * it is only called once or called as least as possible.
         * The bindings are initialized in _initializeSidebarStatus.
         *
         * @since 1.132.0
         * @private
         */
        onUpdateSidebarStatus: function () {
            this.iUpdateSidebarStatusTimeout = this.iUpdateSidebarStatusTimeout || setTimeout(() => {
                this.updateSidebarStatus();
                this.iUpdateSidebarStatusTimeout = null;
            }, 0);
        },

        updateSidebarStatus: function (sLayoutType) {
            const oDataModel = this.getDataModel();
            const oUiModel = this.getUiModel();
            const iMaxColumnsCount = oUiModel.getProperty("/maxColumnsCount");
            const bCategoryTreeHasData = oDataModel.getProperty("/categoryTree")?.length > 0;
            const bShowCategoryTreeWhenEmpty = oUiModel.getProperty("/componentSettings/showCategoryTreeWhenEmpty");
            const sVisualizationsFilterSelected = oUiModel.getProperty("/visualizations/filters/selected");
            let sNewLayoutType;

            // Temporary: Layout type override for the visualizations filter "cards" because they don't have catalogs.
            if (sVisualizationsFilterSelected === "cards") {
                sNewLayoutType = LayoutType.MidColumnFullScreen;
            } else if (sLayoutType) {
                sNewLayoutType = sLayoutType;
            } else if (bShowCategoryTreeWhenEmpty || bCategoryTreeHasData) {
                sNewLayoutType = oUiModel.getProperty("/preservedLayoutType");
                // This happens only if the layout was resized to a larger width when only the category tree is displayed,
                // then the layout needs to leave the "OneColumn" state because there are more columns available.
                // Otherwise, we just update the layoutType property.
                if (sNewLayoutType === LayoutType.OneColumn && iMaxColumnsCount > 1) {
                    sNewLayoutType = LayoutType.TwoColumnsMidExpanded;
                }
            } else {
                sNewLayoutType = LayoutType.MidColumnFullScreen;
            }

            // If the layout is currently TwoColumnsMidExpanded and maxColumnsCount is only 1,
            // the category tree should not be visible because there is no space.
            let bCategoryTreeVisible = true;
            if ((sNewLayoutType === LayoutType.TwoColumnsMidExpanded && iMaxColumnsCount === 1)
                || (sNewLayoutType === LayoutType.MidColumnFullScreen)
            ) {
                bCategoryTreeVisible = false;
            }

            if (sLayoutType && sLayoutType !== LayoutType.OneColumn) {
                oUiModel.setProperty("/preservedLayoutType", sLayoutType);
            }

            oUiModel.setProperty("/layoutType", sNewLayoutType);
            oUiModel.setProperty("/categoryTree/hasData", bCategoryTreeHasData);
            oUiModel.setProperty("/categoryTree/visible", bCategoryTreeVisible);
        },

        /**
         * @typedef preparedVizualization
         *
         * @property {string} id The vizId.
         * @property {string} appId The appId.
         * @property {string} icon The icon src.
         * @property {string} info The info string.
         * @property {string} launchUrl The launch url for the visualization.
         * @property {string} subtitle The subtitle.
         * @property {string} title The title.
         * @property {string} type The type.
         * @property {string} dataHelpId The data-help-id for the assistant.
         * @property {object} vizData The whole vizData object.
         * @property {boolean} added The added flag. True if the visualization was already added to the cell.
         * @property {string} systemLabel The system label.
         */

        /**
         * Prepares visualizations from the visualizationData and enriches them.
         *
         * @param {object[]} aVisualizationData The visualizationData from the consumer
         * @returns {preparedVizualization[]} The prepared visualizations
         * @since 1.113.0
         * @private
         */
        _prepareVisualizations: function (aVisualizationData) {
            return aVisualizationData.reduce((aResult, oViz) => {
                if (!oViz?.descriptor || !oViz?.descriptor?.value) {
                    Log.error("No descriptor available. Cannot load this visualization.", null, this.logComponent);
                    return aResult;
                }
                const oVizSapApp = oViz.descriptor.value["sap.app"];
                const oVizSapFiori = oViz.descriptor.value["sap.fiori"];

                let sAppID = "";
                if (oVizSapFiori?.registrationIds[0]) {
                    sAppID = oVizSapFiori.registrationIds[0];
                } else if (oVizSapApp?.id) {
                    sAppID = oVizSapApp.id;
                }

                let sLaunchUrl;
                if (oViz.targetAppIntent) {
                    sLaunchUrl = utilsCdm.toHashFromTargetIntent(oViz.targetAppIntent, oViz.descriptor.value["sap.flp"]?.target);
                }

                aResult.push({
                    id: oViz.id,
                    appId: sAppID,
                    icon: ObjectPath.get("icons.icon", oViz.descriptor.value["sap.ui"]) || "",
                    info: oVizSapApp && oVizSapApp.info || "",
                    launchUrl: sLaunchUrl || "",
                    subtitle: oVizSapApp && oVizSapApp.subTitle || "",
                    title: oVizSapApp && oVizSapApp.title || "",
                    type: oViz.type,
                    dataHelpId: oViz.id,
                    vizData: oViz,
                    added: false,
                    systemLabel: oViz.systemLabel || ""
                });
                return aResult;
            }, []);
        }
    });
});
