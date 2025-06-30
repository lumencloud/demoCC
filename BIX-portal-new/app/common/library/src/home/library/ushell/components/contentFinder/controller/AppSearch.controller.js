// Copyright (c) 2009-2023 SAP SE, All Rights Reserved

/**
 * @file AppSearch controller for AppSearch view
 * @version 1.132.0
 */
sap.ui.define([
    "./ContentFinderDialog.controller",
    "../model/formatter",
    "sap/m/library",
    "sap/f/library"
], function (
    ContentFinderController,
    formatter,
    mLibrary,
    fLibrary
) {
    "use strict";

    /**
     * @alias sap.ushell.components.contentFinder.controller.AppSearch
     * @class
     * @classdesc Controller of the AppSearch view.
     *
     * @param {string} sId Controller id
     * @param {object} oParams Controller parameters
     *
     * @extends sap.ui.core.mvc.Controller
     *
     * @since 1.113.0
     * @private
     */

    return ContentFinderController.extend("sap.ushell.components.contentFinder.controller.AppSearch", /** @lends sap.ushell.components.contentFinder.controller.AppSearch.prototype */{
        /**
         * The contentFinder formatters.
         *
         * @since 1.113.0
         * @private
         */
        formatter: formatter,

        /**
         * The init function called after the view is initialized.
         *
         * @since 1.113.0
         * @private
         */
        onInit: function () {
            this.oComponent = this.getOwnerComponent();
            this.oResourceBundle = this.oComponent.getModel("i18n").getResourceBundle();
            this.oUiModel = this.oComponent.getUiModel();
            this.oDataModel = this.oComponent.getDataModel();
            // this.oSelectionModel = this.oComponent.getSelectionModel();

            // this.byId("contentFinderAppSearchFlexibleColumnLayout").attachStateChange(
            //     this.onFlexibleColumnLayoutStateChange.bind(this)
            // );
            // Ensure the "ui" model is present, even if the view is not part of the control tree yet (dialog).
            // this.getView().setModel(this.oUiModel, "ui");
            // this._initializeVisualizationsFilter();
        },

        /**
        * Triggered when the search is executed. Fires the query to get visualizations with the search term.
        *
        * - Empties all visualizations.
        * - Leaves the selection view.
        *
        * @param {sap.base.Event} oEvent The 'search' event.
        *
        * @since 1.115.0
        * @private
        */
        onSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || "";
            this.sCurrentSearchTerm = sQuery;
            this.oComponent.resetVisualizations();
            // this.toggleSelectionView(false);
            const sCategoryId = this.oUiModel.getProperty("/categoryTree/selectedId");
            this.oComponent.queryVisualizations(0, sQuery, sCategoryId);
            this.oUiModel.setProperty("/visualizations/searchTerm", sQuery);
        },

        /**
        * Event handler which is called when an app box was selected.
        *
        * Updates the selection model when a app box is selected.
        * The selected items are added with a handler in the dialog.
        *
        * @param {sap.base.Event} oEvent The 'selected' event.
        *
        * @since 1.121.0
        * @private
        */
        onAppBoxSelected: function (oEvent) {
            const oVizData = oEvent.getParameters().rowBindingContext.getObject();
            this.oComponent.addVisualizations([oVizData]);
        },

        /**
        * Toggles the view between results and selection.
        *
        * @param {boolean} bActive Flag to activate the selection view.
        *
        * @since 1.121.0
        * @private
       //  */
        //  toggleSelectionView: function (bActive) {
        //     const sSearchTerm = bActive ? "" : this.sCurrentSearchTerm;
        //     this.oUiModel.setProperty("/visualizations/searchFieldValue", sSearchTerm);
        //     this.oUiModel.setProperty("/visualizations/showSelectedPressed", bActive);
        //     this.oComponent.useSelectionModel(bActive);
        // },

        /**
         * Triggered when the 'FlexibleColumnLayout' state changes.
         *
         * Updates only the maxColumnsCount property in the 'ui' model.
         *
         * @param {sap.base.Event} oEvent The 'stateChange' event.
         *
         * @since 1.129.0
         * @private
         */
        // onFlexibleColumnLayoutStateChange: function (oEvent) {
        //     // This value is required to calculate the correct layout type.
        //     // The calculation is done in the method updateSidebarStatus of the component which
        //     // is triggered via a binding on the 'maxColumnsCount' property.
        //     this.oUiModel.setProperty("/maxColumnsCount", oEvent.getParameter("maxColumnsCount"));
        // },

        /**
         * Triggered when the visualizations filter is changed.
         *
         * When the filter was changed, all visualizations are reset and the new filter is applied.
         *
         * @since 1.132.0
         * @private
         */
        // onSelectVisualizationsFilter: function () {
        //     this.oComponent.resetVisualizations();
        //     this.oComponent.queryVisualizations(
        //         0,
        //         this.oUiModel.getProperty("/visualizations/searchTerm"),
        //         this.oUiModel.getProperty("/categoryTree/selectedId")
        //     );
        // },

        /**
         * Triggered to search the catalog.
         *
         * @param {sap.base.Event} oEvent The event.
         * @returns {Promise<undefined>} Resolves with <code>undefined</code>.
         *
         * @private
         */
        // onCatalogSearch: async function (oEvent) {
        //     const sQuery = oEvent.getParameter("newValue") || "";
        //     const oTitleFilter = new Filter("title", FilterOperator.Contains, sQuery);
        //     const oProviderIdFilter = new Filter("contentProviderId", FilterOperator.Contains, sQuery);
        //     const oProviderLabelFilter = new Filter("contentProviderLabel", FilterOperator.Contains, sQuery);
        //     const oFilter = new Filter({
        //         filters: [
        //             oTitleFilter,
        //             oProviderIdFilter,
        //             oProviderLabelFilter
        //         ],
        //         and: false
        //     });
        //     this.byId("CategoryTreeFragment--CategoryTree").getBinding().filter(oFilter);
        // },

        /**
         * Fired when a data update on the list was started.
         *
         * Queries the new list of visualizations.
         *
         * @param {sap.base.Event} oEvent The 'updateStarted' event.
         *
         * @since 1.115.0
         * @private
         */
        // onUpdateStarted: function (oEvent) {
        //     if (oEvent.getParameter("reason") === "Growing") {
        //         const sSearchTerm = this.oUiModel.getProperty("/visualizations/searchTerm");
        //         const iSkip = oEvent.getParameter("actual");
        //         const sCategoryId = this.oUiModel.getProperty("/categoryTree/selectedId");
        //         this.oComponent.queryVisualizations(iSkip, sSearchTerm, sCategoryId);
        //     }
        // },

        /**
         * EventHandler which is called when the "show selected" button is pressed
         * to show only selected apps.
         *
         * @param {sap.ui.base.Event} oEvent Button Press Event object.
         *
         * @since 1.113.0
         * @private
         */
        // onShowSelectedPressed: function (oEvent) {
        //     const bPressed = oEvent.getParameter("pressed");
        //     this.toggleSelectionView(bPressed);
        // },

        /**
         * Toggles the between grid and list view.
         *
         * @param {sap.ui.base.Event} oEvent Button Press Event object.
         *
         * @since 1.129.0
         * @private
         */
        // onViewSelectionChange: function (oEvent) {
        //     const sKey = oEvent.getSource().getSelectedKey();
        //     const bToggleList = sKey === "list";
        //     this.oUiModel.setProperty("/visualizations/listView", bToggleList);
        //     this.toggleSelectionView(this.oUiModel.getProperty("/visualizations/showSelectedPressed"));
        // },



        /**
         * Resets all data related to the visualizations search field.
         *
         * @since 1.132.0
         * @private
         */
        // resetVisualizationsSearchField: function () {
        //     this.oUiModel.setProperty("/visualizations/searchTerm", "");
        //     this.oUiModel.setProperty("/visualizations/searchFieldValue", "");
        //     this.sCurrentSearchTerm = "";
        // },

        /**
         * EventHandler which is called when a category tree item is pressed.
         * @param {sap.ui.base.Event} oEvent The event.
         * @private
         */
        // onCategoryTreeItemPressed: function (oEvent) {
        //     const oItem = oEvent.getParameter("listItem");
        //     if (oItem.getType() === ListType.Inactive) {
        //         return;
        //     }
        //     this.oComponent.updateSidebarStatus(LayoutType.TwoColumnsMidExpanded);

        //     this.getOwnerComponent().resetVisualizations();
        //     this.resetVisualizationsSearchField();
        //     this.toggleSelectionView(false);
        //     const sCategoryId = oItem.getBindingContext().getProperty("id");
        //     const sCategoryTitle = oItem.getBindingContext().getProperty("title");
        //     this.oUiModel.setProperty("/categoryTree/selectedId", sCategoryId);
        //     this.oUiModel.setProperty("/categoryTree/selectedTitle", sCategoryTitle);
        //     this.getOwnerComponent().queryVisualizations(0, "" /* searchTerm */, sCategoryId);
        //     if (oItem.getBindingContext().sPath.includes("nodes")) {
        //         this.oUiModel.setProperty("/categoryTree/itemPressed", true);
        //     } else {
        //         this.oUiModel.setProperty("/categoryTree/itemPressed", false);
        //     }

        //     // Get data from the category tree item or from its parent.
        //     let aAllowedFilters = oItem.getBindingContext().getProperty("allowedFilters");
        //     let bFilterIsTitle = oItem.getBindingContext().getProperty("filterIsTitle");
        //     if (!aAllowedFilters) {
        //         aAllowedFilters = oItem.getParentNode()?.getBindingContext().getProperty("allowedFilters");
        //         bFilterIsTitle = oItem.getParentNode()?.getBindingContext().getProperty("filterIsTitle");
        //     }

        //     this.oUiModel.setProperty("/visualizations/filters/displayed", aAllowedFilters);
        //     this.oUiModel.setProperty("/visualizations/filters/filterIsTitle", !!bFilterIsTitle);
        // },

        /**
         * EventHandler which is called when the category tree is updated.
         *
         * @param {sap.ui.base.Event} oEvent The event.
         *
         * @private
         */
        // onCategoryTreeUpdateFinished: function (oEvent) {
        //     const oTree = oEvent.getSource();
        //     /** The <code>checkUpdate</code> implementation of the <code>ClientTreeBinding</code>
        //      * does not check for actual changes but always fires an update whenever a model property changes.
        //      * Hence, we check if there is already a selected item and only set an initial selection if there is none.
        //     */
        //     if (!oTree.getSelectedItem()) {
        //         const aItems = oTree.getItems();
        //         const oFirstItem = aItems[0];
        //         if (oFirstItem) {
        //             oTree.setSelectedItem(oFirstItem);
        //             // set the initial selectedCategory. This is expected by visualizationFilterApplied event
        //             // handlers and used to show the title for the visualizations GridList
        //             const oData = oFirstItem.getBindingContext().getObject() || {};
        //             this.oUiModel.setProperty("/categoryTree/selectedId", oData.id);
        //             this.oUiModel.setProperty("/categoryTree/selectedTitle", oData.title);
        //         }
        //     }
        // },

        /**
         * Updates the layout of the FlexibleColumnLayout based on the current layout and the maximum number of columns,
         * which causes the layout of the 'FlexibleColumnLayout' to change into it's new desired state.
         *
         * OneColumn: Only the SidePanel is shown.
         * MidColumnFullScreen: Only the visualizations are shown.
         * TwoColumnsMidExpanded: The SidePanel is shown and the other columns with the visualizations are expanded.
         *
         * For maxColumnsCount, possible values are:
         * 3 for browser size of 1280px or more
         * 2 for browser size between 960px and 1280px
         * 1 for browser size less than 960px
         *
         * @since 1.129.0
         * @private
         */
        // onCategoryTreeTogglePressed: function () {
        //     const sCurrentLayoutType = this.oUiModel.getProperty("/layoutType");
        //     const iMaxColumnsCount = this.oUiModel.getProperty("/maxColumnsCount");
        //     let sNewLayoutType;

        //     // Layout is currently in FullScreen, no side panel is shown.
        //     // Toggle to TwoColumnsMidExpanded or OneColumn to show the side panel.
        //     if (sCurrentLayoutType === LayoutType.MidColumnFullScreen) {
        //         // If enough space for two columns show the side panel with TwoColumnsMidExpanded,
        //         // otherwise show only the SidePanel in OneColumn.
        //         if (iMaxColumnsCount > 1) {
        //             sNewLayoutType = LayoutType.TwoColumnsMidExpanded;
        //         } else {
        //             sNewLayoutType = LayoutType.OneColumn;
        //         }
        //         // Layout is currently TwoColumnsMidExpanded and shows a side panel, but there is no space available.
        //         // May happen when the screen is resized to a smaller width while the layout is in expanded mode.
        //     } else if (sCurrentLayoutType === LayoutType.TwoColumnsMidExpanded && iMaxColumnsCount === 1) {
        //         sNewLayoutType = LayoutType.OneColumn;
        //         // If there is enough space available, hide the side panel.
        //     } else if (sCurrentLayoutType === LayoutType.TwoColumnsMidExpanded) {
        //         sNewLayoutType = LayoutType.MidColumnFullScreen;
        //         // Default to TwoColumnsMidExpanded layout.
        //     } else {
        //         sNewLayoutType = LayoutType.TwoColumnsMidExpanded;
        //     }

        //     this.oComponent.updateSidebarStatus(sNewLayoutType);
        // },

        /**
         * Triggered when the 'Launch Application' button is pressed.
         *
         * @param {sap.ui.base.Event} oEvent The event.
         *
         * @private
         */
        // onLaunchApplicationPressed: function (oEvent) {
        //     const sSelectedTileLaunchUrl = oEvent.getSource().getBindingContext("data").getObject().launchUrl;
        //     if (!sSelectedTileLaunchUrl) {
        //         Log.info("AppBox url property is not set.", null, "sap.ushell.components.Catalog.controller");
        //         return;
        //     }

        //     if (sSelectedTileLaunchUrl.indexOf("#") === 0) {
        //         hasher.setHash(sSelectedTileLaunchUrl);
        //     } else {
        //         WindowUtils.openURL(sSelectedTileLaunchUrl, "_blank");
        //     }
        // },


        /**
         * Triggered when one of the bindings related to the visualizations filters change any data.
         *
         * The bindings are created in the _initializeVisualizationsFilter method.
         *
         * @since 1.132.0
         * @private
         */
        // onUpdateVisualizationsFilterData: function () {
        //     this.iVisualizationsFilterDataTimeout = this.iVisualizationsFilterDataTimeout || setTimeout(() => {
        //         this._updateVisualizationsFilter();
        //         this.iVisualizationsFilterDataTimeout = null;
        //     }, 0);

        // },

        /**
         * Initializes the visualizations filter bindings.
         *
         * Observers all the bindings which are related to the visualizations filters.
         * If data of the bindings change, the visualizations filter is updated.
         *
         * @since 1.132.0
         * @private
         */
        // _initializeVisualizationsFilter: function () {
        //     this.oVisualizationsFilterInitialBinding = this.oUiModel.bindProperty("/visualizations/filters/displayed");
        //     this.oVisualizationsFilterAvailableBinding = this.oUiModel.bindProperty("/visualizations/filters/available");

        //     this.oVisualizationsFilterInitialBinding.attachChange(this.onUpdateVisualizationsFilterData, this);
        //     this.oVisualizationsFilterAvailableBinding.attachChange(this.onUpdateVisualizationsFilterData, this);

        //     this._updateVisualizationsFilter();
        // },

        /**
         * Initializes the visualizations filter.
         *
         * Takes the initial filter values provided from the ComponentData and creates a filter
         * for the "items" binding on the segmented button control.
         *
         * The "initial" visualizations filters are provided by the ComponentData to show the AppSearch
         * area while the CategoryTree is still loading. The CategoryTree filter data must match the
         * initial visualizations filter data in order and content.
         *
         * @since 1.132.0
         * @private
         */
        // _updateVisualizationsFilter: function () {
        //     this.byId("selectVisualizationsFilter")?.getBinding("items")?.filter(
        //         new Filter((this.oUiModel.getProperty("/visualizations/filters/displayed") || []).map((sKey) => {
        //             return new Filter("key", FilterOperator.EQ, sKey);
        //         }))
        //     );
        // }
    });
});
