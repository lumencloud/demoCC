//Copyright (c) 2009-2024 SAP SE, All Rights Reserved

/**
 * @file WorkPageBuilder controller for WorkPageBuilder view
 * @version 1.134.0
 */
sap.ui.define([
    "sap/base/Log",
    "sap/base/i18n/Localization",
    "sap/base/util/ObjectPath",
    "sap/base/util/deepExtend",
    "sap/f/GridContainerItemLayoutData",
    "sap/m/library",
    "sap/ui/core/Component",
    "sap/ui/core/Element",
    "sap/ui/core/Fragment",
    "sap/ui/core/InvisibleMessage",
    "sap/ui/core/library",
    "sap/ui/core/mvc/Controller",
    "sap/ui/integration/ActionDefinition",
    "../../../utils/workpage/WorkPageHost",
    "sap/ui/integration/widgets/Card",
    "sap/ui/model/json/JSONModel",
    "sap/ushell/adapters/cdm/v3/_LaunchPage/readUtils",
    "sap/ushell/adapters/cdm/v3/_LaunchPage/readVisualizations",
    "sap/ushell/adapters/cdm/v3/utilsCdm",
    "../../../ui/launchpad/VizInstanceCdm",
    "sap/ushell/utils",
    "sap/ushell/utils/workpage/WorkPageVizInstantiation",
    "sap/ushell/components/workPageBuilder/controller/WorkPageBuilder.accessibility",
    "./WorkPageBuilder.layout",
    "sap/ui/integration/library"
], function (
    Log,
    Localization,
    ObjectPath,
    deepExtend,
    GridContainerItemLayoutData,
    mLibrary,
    Component,
    Element,
    Fragment,
    InvisibleMessage,
    coreLibrary,
    Controller,
    ActionDefinition,
    WorkPageHost,
    Card,
    JSONModel,
    readUtils,
    readVisualizations,
    utilsCdm,
    VizInstanceCdm,
    utils,
    WorkPageVizInstantiation,
    WorkPageBuilderAccessibility,
    WorkPageBuilderLayoutHelper,
    integrationLibrary
) {
    "use strict";

    // shortcut for sap.ui.core.ValueState
    let ValueState = coreLibrary.ValueState;

    // PR: Provider, CO: (Content) Administrator, PG: Page Administrator, US: End User
    // US is commented for now, because we do not have personalization yet.
    let CONFIGURATION_LEVELS = ["PR", "CO", "PG" /*, "US"*/];
    let MIN_GRID_COLUMN_WIDTH = 6;
    let MAX_GRID_COLUMN_WIDTH = 24;
    let STEP_SIZE = 2;
    let MAX_COLUMNS_PER_ROW = 4;

    let LoadState = mLibrary.LoadState;
    let InvisibleMessageMode = coreLibrary.InvisibleMessageMode;

    let CardPreviewMode = integrationLibrary.CardPreviewMode;

    /**
     * Controller of the WorkPageBuilder view.
     *
     * @param {string} sId Controller id
     * @param {object} oParams Controller parameters
     * @class
     * @assigns sap.ui.core.mvc.Controller
     * @private
     * @since 1.99.0
     * @alias sap.ushell.components.workPageBuilder.controller.WorkPages
     */
    return Controller.extend("sap.ushell.components.workPageBuilder.controller.WorkPageBuilder", /** @lends sap.ushell.components.workPageBuilder.controller.WorkPageBuilder.prototype */ {

        onInit: async function () {
           
            let oWorkPage = this.byId("workPage");
            this._fnDeleteRowHandler = this.deleteRow.bind(this);
            this._fnDeleteCellHandler = this.deleteCell.bind(this);
            this._fnSaveCardConfiguration = this._onSaveCardEditor.bind(this);
            this._fnResetCardConfiguration = this._onResetCardConfigurations.bind(this);

            this.oModel = new JSONModel({
                maxColumns: MAX_COLUMNS_PER_ROW,
                editMode: false,
                previewMode: false,
                loaded: false,
                navigationDisabled: false,
                showFooter: false,
                showPageTitle: false,
                data: {
                    workPage: null,
                    visualizations: [],
                    usedVisualizations: []
                }
            });
            this.oModel.setSizeLimit(Infinity);
            this._saveHost();

            oWorkPage.bindElement({
                path: "/data/workPage"
            });

            this.oWorkPageBuilderAccessibility = new WorkPageBuilderAccessibility();
            this.oWorkPageVizInstantiation = await WorkPageVizInstantiation.getInstance();

            this.getView().setModel(this.oModel);

            WorkPageBuilderLayoutHelper.register(oWorkPage);
            this.getView().setModel(WorkPageBuilderLayoutHelper.getModel(), "viewSettings");

            this.oContentFinderPromise = new Promise((fnResolve) => {
                this.fnContentFinderPromiseResolve = fnResolve;
            });
        },
        /**
         * handler for the "visualizationFilterApplied" event .
         * @param {sap.base.Event} oAppliedEvent The "visualizationFilterApplied" event.
         * @private
         */
        _onVisualizationFilterApplied: function (oAppliedEvent) {
            this.getOwnerComponent().fireEvent("visualizationFilterApplied", oAppliedEvent.getParameters());
        },

        onExit: function () {
            WorkPageBuilderLayoutHelper.deregister();

            if (this.oContentFinderPromise) {
                this.oContentFinderPromise.then((oComponent) => {
                    oComponent.destroy();
                });
            }

            if (this.oCardEditorDialogPromise) {
                this.oCardEditorDialogPromise.then((oDialog) => {
                    oDialog.destroy();
                });
            }
            if (this.oCardResetDialogPromise) {
                this.oCardResetDialogPromise.then((oDialog) => {
                    oDialog.destroy();
                });
            }
            if (this.oDeleteCell) {
                this.oDeleteCell.then((oDialog) => {
                    oDialog.destroy();
                });
            }

            if (this.oLoadDeleteDialog) {
                this.oLoadDeleteDialog.then((oDialog) => {
                    oDialog.destroy();
                });
            }
        },

        /**
         * Handler for the "borderReached" event of the GridContainer.
         * Calculates which GridContainer in the given direction is the nearest to the currently focused one.
         * Afterwards shifts the focus to the found GridContainer. If none is found nothing happens and the focus stays with the current one.
         *
         * @param {sap.base.Event} oEvent The "borderReached" event of the GridContainer
         */
        onGridContainerBorderReached: function (oEvent) {
            let oWorkPage = this.byId("workPage");
            this.oWorkPageBuilderAccessibility._handleBorderReached(oEvent, oWorkPage);
        },

        /**
         * Handler for the "addColumn" event of the WorkPageColumn.
         * Creates an empty column on the left or the right of the event source and calculates
         * the new width of the neighboring columns.
         *
         * @param {sap.base.Event} oEvent The "addColumn" event.
         */
        onAddColumn: function (oEvent) {
            let oModel = this.getView().getModel();
            let oColumnControl = oEvent.getSource();
            let oRow = oColumnControl.getParent();
            let iColumnIndex = oRow.indexOfAggregation("columns", oColumnControl);
            let sRowBindingContextPath = oRow.getBindingContext().getPath();
            let sColumnPath = sRowBindingContextPath + "/columns/";
            let sColumnColumnWidthPath = oColumnControl.getBindingContext().getPath() + "/descriptor/value/columnWidth";
            let aColumnsData = oModel.getProperty(sColumnPath);
            let iColumnCount = aColumnsData.length;
            let bAddToLeft = oEvent.getParameter("left");
            if (iColumnCount >= MAX_COLUMNS_PER_ROW) {
                return;
            }
            let iColumnWidth = oColumnControl.getProperty("columnWidth");
            let iColSize = Math.floor(iColumnWidth / 2) >= MIN_GRID_COLUMN_WIDTH ? Math.floor(iColumnWidth / 2) : MIN_GRID_COLUMN_WIDTH;
            let iModulo = iColSize % 2;
            oModel.setProperty(sColumnColumnWidthPath, iColSize + iModulo);

            let iIndex = oRow.indexOfAggregation("columns", oColumnControl) + (bAddToLeft === true ? 0 : 1);
            let oNewColumn = this._createEmptyColumn(iColSize - iModulo);

            // Insert the new column by creating a new array to avoid mutation of the original array.
            let aNewColumnsData = [aColumnsData.slice(0, iIndex), oNewColumn, aColumnsData.slice(iIndex)].flat();

            let iTotalColumns = aNewColumnsData.reduce(function (iAccumulator, oSingleColumn) {
                return iAccumulator + this._getColumnWidth(oSingleColumn);
            }.bind(this), 0);

            if (iTotalColumns > MAX_GRID_COLUMN_WIDTH) {
                this._calculateColWidths(aNewColumnsData, iColumnIndex, iTotalColumns);
            }
            oModel.setProperty(sColumnPath, aNewColumnsData);
            this.getOwnerComponent().fireEvent("workPageEdited");
        },

        /**
         * Sets the focus on the first item in the first GridContainer on the WorkPage.
         *
         * @param {sap.base.Event} oEvent The afterRendering event.
         * @since 1.116.0
         * @private
         */
        focusFirstItem: function (oEvent) {
            let oWorkPage = oEvent.getSource();
            this.oWorkPageBuilderAccessibility.focusFirstItem(oWorkPage);
        },

        /**
         * Set the editMode to true or false
         * @param {boolean} bEditMode true or false
         *
         * @private
         * @since 1.109.0
         */
        setEditMode: function (bEditMode) {
            this.oModel.setProperty("/editMode", !!bEditMode);
        },

        /**
         * Set the previewMode to true or false
         * @param {boolean} bPreviewMode true or false
         *
         * @private
         * @since 1.116.0
         */
        setPreviewMode: function (bPreviewMode) {
            this.oModel.setProperty("/previewMode", !!bPreviewMode);
        },

        /**
         * Get the previewMode property from the model
         * @returns {boolean} the previewMode property value
         * @private
         * @since 1.116.0
         */
        getPreviewMode: function () {
            return this.oModel.getProperty("/previewMode");
        },

        /**
         * Get the editMode property from the model
         * @returns {boolean} the editMode property value
         * @private
         * @since 1.109.0
         */
        getEditMode: function () {
            return this.oModel.getProperty("/editMode");
        },

        /**
         * Set the showFooter property to true or false
         * @param {boolean} bVisible true or false
         *
         * @private
         * @since 1.110.0
         */
        setShowFooter: function (bVisible) {
            this.oModel.setProperty("/showFooter", !!bVisible);
        },

        /**
         * Set the showPageTitle property to true or false
         * @param {boolean} bVisible true or false
         *
         * @private
         * @since 1.116.0
         */
        setShowPageTitle: function (bVisible) {
            this.oModel.setProperty("/showPageTitle", false);
        },

        /**
         * Set the model data with the WorkPage data
         * @param {{workPage: object, usedVisualizations: object[]}} oPageData WorkPage data object
         *
         * @private
         * @since 1.109.0
         */
        setPageData: function (oPageData) {
            let oMappedVisualizations = {};
            let aUsedVisualizations = ObjectPath.get("workPage.usedVisualizations.nodes", oPageData);
            let oWorkPageContents = ObjectPath.get("workPage.contents", oPageData);

            if (aUsedVisualizations && aUsedVisualizations.length > 0) {
                // create a map for the usedVisualizations using the id as a key.
                oMappedVisualizations = aUsedVisualizations.reduce(function (oAcc, oViz) {
                    oAcc[oViz.id] = oViz;
                    return oAcc;
                }, {});
            }

            this.oModel.setProperty("/data/usedVisualizations", oMappedVisualizations);
            this.oModel.setProperty("/data/workPage", oWorkPageContents);
            this.oModel.setProperty("/loaded", true);
        },

        /**
         * Get the WorkPage data from the model.
         * It must also include the usedVisualizations array, because of the reuse scenario.
         * It is necessary that the same data structure is returned that is put into setPageData.
         *
         * @returns {{workPage: {contents: object, usedVisualizations: {nodes: object[]} }}} The WorkPage data to save.
         * @private
         * @since 1.109.0
         */
        getPageData: function () {
            let oMappedVisualizations = this.oModel.getProperty("/data/usedVisualizations") || {};
            return {
                workPage: {
                    contents: this.oModel.getProperty("/data/workPage"),
                    usedVisualizations: {
                        nodes: Object.values(oMappedVisualizations)
                    }
                }
            };
        },

        /**
         * Set the paginated visualization data for the ContentFinder.
         *
         * @param {{visualizations: {nodes: object[]}}} oVizNodes an Array of Visualizations' objects
         * @returns {Promise} A promise resolving when the data has been set to the contentFinder
         *
         * @private
         * @since 1.115.0
         */
        setVisualizationData: function (oVizNodes) {
            return this.oContentFinderPromise.then(function (oContentFinder) {
                oContentFinder.setVisualizationData(oVizNodes);
            });
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
         * The category tree does not support pagination. All tree data must be set at once.
         *
         * @param {CategoryTreeItem[]|[]|undefined} aCategoryTree A tree of category objects, undefined to hide the category tree or empty array to show message in DT.
         * @returns {Promise} A promise resolving when the data was set.
         *
         * @since 1.130.0
         * @private
         */
        setCategoryTree: function (aCategoryTree) {
            return this.oContentFinderPromise.then(function (oContentFinder) {
                oContentFinder.setCategoryTree(aCategoryTree);
            });
        },

        /**
         * Called if the amount of grid columns in the GridContainer of a WorkPageCell changes.
         * Sets all the cards in the cell to the new amount of columns.
         *
         * @param {sap.base.Event} oEvent The gridColumnsChange event.
         */
        onGridColumnsChange: function (oEvent) {
            let iColumnCount = oEvent.getParameter("columns");
            let oCell = oEvent.getSource();

            oCell.getWidgets().filter(function (oItem) {
                return oItem.isA("sap.ui.integration.widgets.Card");
            }).forEach(function (oCard) {
                oCard.setLayoutData(new GridContainerItemLayoutData({
                    columns: iColumnCount,
                    minRows: 1
                }));
            });
        },

        /**
         * Handler for the "removeColumn" event of the WorkPageColumn.
         * Removes the column that issues the event and calculates the width of the remaining columns.
         *
         * @param {sap.base.Event} oEvent The "removeColumn" event.
         */
        onDeleteColumn: function (oEvent) {
            let oModel = this.getView().getModel();
            let oColumn = oEvent.getSource();
            let iColumnWidth = oColumn.getColumnWidth();
            let oRow = oColumn.getParent();
            let iColumnIndex = oRow.indexOfAggregation("columns", oColumn);
            let sRowBindingContextPath = oRow.getBindingContext().getPath();
            let sColumnPath = sRowBindingContextPath + "/columns/";
            let aColumns = oModel.getProperty(sColumnPath);

            // filter out the column at the iColumnIndex instead of splicing to avoid mutation of the original array.
            let aNewColumns = aColumns.filter(function (oCol, iIndex) {
                return iIndex !== iColumnIndex;
            });

            // split the columnWidth among remaining cols
            let iLoopCount = (iColumnWidth / 2);
            let iIndex = iColumnIndex - 1 < 0 ? iColumnIndex : iColumnIndex - 1;
            while (iLoopCount > 0) {
                let oCurrentColumn = aNewColumns[iIndex];
                this._setColumnWidth(oCurrentColumn, (this._getColumnWidth(oCurrentColumn)) + STEP_SIZE);
                iIndex = ++iIndex >= aNewColumns.length ? 0 : iIndex++;
                iLoopCount--;
            }

            oModel.setProperty(sColumnPath, aNewColumns);
            // Invalidate row to render correct css class for amount of columns.
            oRow.invalidate();
            this.getOwnerComponent().fireEvent("workPageEdited");
        },

        /**
         * Handler for the "Add Row" button on an empty WorkPage.
         * Creates an array with an empty row and sets it to the model.
         *
         */
        onAddFirstRow: function () {
            let sRowsPath = "/data/workPage/rows/";
            this.getView().getModel().setProperty(sRowsPath, [this._createEmptyRow()]);
            this.getOwnerComponent().fireEvent("workPageEdited");
        },

        /**
         * Handler for the "Add Row" button on a WorkPageRow.
         * Creates a new empty row and adds it to the existing rows.
         *
         * @param {sap.base.Event} oEvent The "addRow" event.
         */
        onAddRow: function (oEvent) {
            let oModel = this.getView().getModel();
            let oRow = oEvent.getSource();
            let oPage = this.byId("workPage");
            let sRowsPath = "/data/workPage/rows/";
            let aRows = oModel.getProperty(sRowsPath);
            let oNewRow = this._createEmptyRow();

            let iIndex = oPage.indexOfAggregation("rows", oRow) + (oEvent.getParameter("bottom") === true ? 1 : 0);

            // Insert the new row into the array by creating a new array to avoid mutation.
            let aNewRows = [aRows.slice(0, iIndex), oNewRow, aRows.slice(iIndex)].flat();

            oModel.setProperty(sRowsPath, aNewRows);
            this.getOwnerComponent().fireEvent("workPageEdited");
        },

        /**
         * Handler for the "columnResized" event issued by the WorkPageColumn.
         * Calculates the required resize steps left or right and updates the model accordingly.
         *
         * @param {sap.base.Event} oEvent The "columnResized" event.
         */
        onResize: function (oEvent) {
            let iDiff = oEvent.getParameter("posXDiff");
            let oColumn = oEvent.getSource();
            let oRow = oColumn.getParent();
            let iSingleColumnWidthPx = oRow.getSingleColumnWidth();

            if (iSingleColumnWidthPx <= 0) { return; }

            let bRtl = Localization.getRTL();
            let fDeltaFromOrigin = iDiff / iSingleColumnWidthPx;

            if (fDeltaFromOrigin > -1 && fDeltaFromOrigin < 1) { return; }

            let iColumnsDelta = fDeltaFromOrigin < 0 ? Math.floor(iDiff / iSingleColumnWidthPx) : Math.ceil(iDiff / iSingleColumnWidthPx);
            let sDragDirection = iColumnsDelta >= 0 ? "right" : "left";
            let iFlexStep = sDragDirection === "right" ? STEP_SIZE : -STEP_SIZE;
            let iRightColumnIndex = oRow.indexOfAggregation("columns", oColumn);
            let iLeftColumnIndex = iRightColumnIndex - 1;
            let aColumnFlexValues = oRow.getColumnFlexValues();

            iFlexStep = bRtl ? iFlexStep : -iFlexStep;

            if (!this._resizeAllowed(
                aColumnFlexValues.length,
                aColumnFlexValues[iLeftColumnIndex],
                aColumnFlexValues[iRightColumnIndex],
                iFlexStep
            )) {
                return;
            }

            aColumnFlexValues[iLeftColumnIndex] -= iFlexStep;
            aColumnFlexValues[iRightColumnIndex] += iFlexStep;

            oRow.setGridLayoutString(aColumnFlexValues);
            this._updateModelWithColumnWidths(oRow, iLeftColumnIndex, iRightColumnIndex, aColumnFlexValues[iLeftColumnIndex], aColumnFlexValues[iRightColumnIndex]);
        },

        /**
         * Checks if WorkPageColumn resize is allowed based on the given input parameters.
         *
         * @param {int} iColumnCount The count of WorkPageColumns in this row.
         * @param {int} iLeftFlex The old flex value of the left column.
         * @param {int} iRightFlex The old flex value of the right column.
         * @param {int} iFlexStep The step to decrease / increase both columns.
         * @returns {boolean} The result.
         * @private
         * @since 1.118.0
         */
        _resizeAllowed: function (iColumnCount, iLeftFlex, iRightFlex, iFlexStep) {
            let oViewSettingsModel = this.getView().getModel("viewSettings");
            let iColumnMinFlex = oViewSettingsModel.getProperty("/currentBreakpoint/columnMinFlex");

            // resize to left would result in too small column on the left
            if (iLeftFlex - iFlexStep < iColumnMinFlex) { return false; }

            // resize to right would result in too small column on the right
            if (iRightFlex + iFlexStep < iColumnMinFlex) { return false; }

            let iMaxColumnsPerRow = oViewSettingsModel.getProperty("/currentBreakpoint/maxColumnsPerRow");

            // no resize allowed if there is a line break for WorkPageRows
            if (iColumnCount > iMaxColumnsPerRow) { return false; }

            return true;
        },

        /**
         * Handler for the "columnResizeCompleted" event issued by the WorkPageColumn.
         * Fires the "workPageEdited" event to indicate that there was a data change.
         *
         */
        onResizeCompleted: function () {
            this.getOwnerComponent().fireEvent("workPageEdited");
        },

        /**
         * Handler for the "press" event in the WorkPageCell OverflowToolbar button.
         * Opens a confirmation dialog for widgets, except cards.
         *
         * @param {sap.base.Event} oEvent The button click event.
         * @returns {Promise} A promise resolving when the dialog was opened or the card was deleted.
         */
        onDeleteCell: function (oEvent) {
            let oCell = oEvent.getSource().getParent().getParent();

            // No dialog is shown if the ell contains only a card.
            let aWidgets = oCell.getWidgets();
            if (aWidgets?.[0] && aWidgets.length === 1 && aWidgets[0].isA("sap.ui.integration.widgets.Card")) {
                return this.deleteCell(oEvent, {
                    cell: oCell,
                    dialog: false
                });
            }

            // Show dialog for all other widgets.
            if (!this.oDeleteCell) {
                let oRootView = this.getOwnerComponent().getRootControl();
                this.oDeleteCell = Fragment.load({
                    id: oRootView.createId("cellDeleteDialog"),
                    name: "sap.ushell.components.workPageBuilder.view.WorkPageCellDeleteDialog",
                    controller: this
                }).then(function (oDialog) {
                    oDialog.setModel(this.getView().getModel("i18n"), "i18n");
                    return oDialog;
                }.bind(this));
            }

            return this.oDeleteCell.then(function (oDialog) {
                oDialog.getBeginButton().detachEvent("press", this._fnDeleteCellHandler);
                oDialog.getBeginButton().attachEvent("press", {
                    cell: oCell,
                    dialog: true
                }, this._fnDeleteCellHandler);
                oDialog.open();
            }.bind(this));
        },

        /**
         * Deletes the cell from the model.
         *
         * @param {sap.base.Event} oEvent The button click event.
         */

        /**
         * Deletes the provided cell.
         *
         * @param {sap.base.Event} oEvent The "press" event.
         * @param {object} cellData Object containing the cell to delete.
         * @param {sap.ushell.components.workPageBuilder.controls.WorkPageCell} cellData.cell The cell to delete.
         * @param {boolean} cellData.dialog True if a dialog is shown to confirm the deletion.
         * @returns {Promise} A promise resolving when the cell has been deleted.
         */
        deleteCell: function (oEvent, cellData) {
            let oCell = cellData.cell;
            let oModel = this.getView().getModel();
            let oColumn = oCell.getParent();
            let iCellIndex = oColumn.indexOfAggregation("cells", oCell);
            let sCellsPath = oColumn.getBindingContext().getPath() + "/cells";
            let aCells = oModel.getProperty(sCellsPath);

            // Filter out the cell at iCellIndex instead of splicing to avoid mutation of the original array.
            let aNewCells = aCells.filter(function (oOriginalCell, iIndex) {
                return iIndex !== iCellIndex;
            });

            oModel.setProperty(sCellsPath, aNewCells);
            this.getOwnerComponent().fireEvent("workPageEdited");
            if (cellData.dialog) {
                return this.oDeleteCell.then(function (oDialog) {
                    oDialog.close();
                });
            }
            return Promise.resolve();
        },

        /**
         * Handler for the "deleteVisualization" event issued by the VizInstance.
         * Deletes the visualization from the model.
         *
         * @param {sap.ushell.ui.launchpad.VizInstanceCdm|sap.ushell.ui.launchpad.VizInstanceLink} oVizInstance the viz instance.
         */
        _deleteVisualization: function (oVizInstance) {
            let oCell = oVizInstance.getParent().getParent();
            let oVizInstanceContext = oVizInstance.getBindingContext();
            let sVizInstancePath = oVizInstanceContext.getPath();
            let oModel = this.getView().getModel();
            let sWidgetsPath = sVizInstancePath.substring(0, sVizInstancePath.lastIndexOf("/"));
            let iWidgetIndex = oCell.indexOfAggregation("widgets", oVizInstance);
            let aWidgets = oModel.getProperty(sWidgetsPath);

            // Filter out the widget at iWidgetIndex instead of splicing to avoid mutation of the original array.
            let aNewWidgets = aWidgets.filter(function (oWidget, iIndex) {
                return iIndex !== iWidgetIndex;
            });

            oModel.setProperty(sWidgetsPath, aNewWidgets);
            this.getOwnerComponent().fireEvent("workPageEdited");
        },

        /**
         * Handler for the "change" event of the edit title input.
         * Set the dirty flag
         */
        onEditTitle: function () {
            this.getOwnerComponent().fireEvent("workPageEdited");
        },

        /**
         * Handler for the "addWidget" event of the ContentFinderDialog.
         * Set the dirty flag
         */
        onWidgetAdded: function () {
            this.getOwnerComponent().fireEvent("workPageEdited");
        },

        /**
         * Called when the ContentFinder component was created.
         *
         * Defines the ContentFinder on the controller and attaches the required event handling.
         *
         * @param {sap.base.Event} oEvent The 'componentCreated' event.
         * @returns {Promise} A Promise that resolves the ContentFinderComponent
         *
         * @since 1.132.0
         * @private
         */
        onContentFinderComponentCreated: async function (oEvent) {
            const oContentFinder = oEvent.getParameter("component");
            oContentFinder.attachContentFinderClosed(null, function () {
                oContentFinder?.detachVisualizationsAdded(this._onAddVisualization, this);
                oContentFinder?.detachVisualizationFilterApplied(this._onVisualizationFilterApplied, this);
                oContentFinder?.setContextData({ restrictedVisualizations: [] });
            }, this);
            this.fnContentFinderPromiseResolve(oContentFinder);
        },

        /**
         * Opens the ContentFinder.
         *
         * @param {sap.base.Event} oEvent The "addWidget" event.
         * @returns {Promise} When resolved, opens the ContentFinder dialog.
         *
         * @since 1.132.0
         * @public
         */
        openContentFinder: function (oEvent) {
            const oSource = oEvent.getSource(); // WorkPageColumn
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            return this.oContentFinderPromise.then(function (oContentFinderComponent) {
                oContentFinderComponent.attachVisualizationsAdded(oSource, this._onAddVisualization, this);
                oContentFinderComponent.attachVisualizationFilterApplied(oSource, this._onVisualizationFilterApplied, this);
                oContentFinderComponent.show({
                    visualizationFilters: {
                        displayed: ["cards"],
                        available: [
                            {
                                key: "cards",
                                title: oResourceBundle.getText("ContentFinder.AppSearch.VisualizationsFilter.Cards"),
                                types: ["sap.card"]
                            }
                        ]
                    }
                });
            }.bind(this));
        },

        /**
         * Open ContentFinder's AppSearch view
         * @param {sap.base.Event} oEvent The "addApplications" event
         * @returns {Promise} Promise that resolves the ContentFinder Component
         *
         * @since 1.113.0
         * @public
         */
        openTilesAppSearch: function (oEvent) {
            const oSource = oEvent.getSource().getParent().getParent(); // WorkPageCell
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();

            return this.oContentFinderPromise.then(function (oContentFinderComponent) {
                oContentFinderComponent.setContextData({ restrictedVisualizations: this._getRestrictedVisualizationIds(oSource) });
                oContentFinderComponent.attachVisualizationsAdded(oSource, this._onAddVisualization, this);
                oContentFinderComponent.attachVisualizationFilterApplied(oSource, this._onVisualizationFilterApplied, this);
                oContentFinderComponent.show({
                    visualizationFilters: {
                        displayed: ["cards"],
                        available: [
                            {
                                key: "cards",
                                title: oResourceBundle.getText("ContentFinder.AppSearch.VisualizationsFilter.Cards"),
                                types: ["sap.card"]
                            }
                        ]
                    }
                });
            }.bind(this));
        },

        /**
         * Returns an array of Widget's VizRefIds. The Widgets are contained in the WorkPageCell
         *
         * @param {sap.ushell.components.workPageBuilder.controls.WorkPageCell} oCell The WorkPageCell control.
         * @returns {string[]} The VizRefIds array
         *
         * @since 1.113.0
         * @private
         */
        _getRestrictedVisualizationIds: function (oCell) {
            return oCell.getWidgets().map(function (oWidget) {
                if (oWidget.isA("sap.ushell.ui.launchpad.VizInstanceCdm")) {
                    return oWidget.getProperty("vizRefId");
                }
            });
        },

        /**
         * Add Visualization to the WorkPageColum or WorkPageCell
         * @param {sap.base.Event} oEvent The "addApplications" event.
         * @param {sap.ushell.components.workPageBuilder.controls.WorkPageCell|sap.ushell.components.workPageBuilder.controls.WorkPageColumn} oSource The WorkPageColumn or WorkPageCell control
         *
         * @since 1.113.0
         * @private
         */
        _onAddVisualization: function (oEvent, oSource) {
            const oModel = this.getView().getModel();
            let aSelectedVisualizations = oEvent.getParameter("visualizations");

            if (aSelectedVisualizations.length > 0) {
                aSelectedVisualizations.forEach(function (oVisualization) {
                    let sVizSelectedItemPath = "/data/usedVisualizations/" + oVisualization.id;
                    if (!oModel.getProperty(sVizSelectedItemPath)) {
                        oModel.setProperty(sVizSelectedItemPath, oVisualization.vizData);
                    }
                });

                let aWidgetData = this._instantiateWidgetData(aSelectedVisualizations);

                if (oSource.isA("sap.ushell.components.workPageBuilder.controls.WorkPageCell")) {
                    this._setCellData(oSource, aWidgetData);
                }
                if (oSource.isA("sap.ushell.components.workPageBuilder.controls.WorkPageColumn")) {
                    this._setColumnData(oSource, aWidgetData);
                }
            }

        },

        /**
         * For each selected visualization in the ContentFinder, instantiate the initial WidgetData
         * @param {object[]} aSelectedVisualizations The ContentFinder's selected visualizations
         * @returns {object[]} The WidgetData array
         *
         * @since 1.113.0
         * @private
         */
        _instantiateWidgetData: function (aSelectedVisualizations) {
            let aIds = [];
            let sId;

            return aSelectedVisualizations.map(function (oTile) {
                sId = this._generateUniqueId(aIds);
                aIds = aIds.concat([sId]);
                return {
                    id: sId,
                    visualization: {
                        id: oTile.vizData.id
                    }
                };
            }.bind(this));
        },

        /**
         * Add Widgets into the WorkPageCell's Widgets aggregation
         * @param {sap.ushell.components.workPageBuilder.controls.WorkPageCell} oCell The WorkPageCell control.
         * @param {object[]} aWidgetData The WidgetData array
         *
         * @since 1.113.0
         * @private
         */
        _setCellData: function (oCell, aWidgetData) {
            const oModel = this.getView().getModel();
            let sCellPath = oCell.getBindingContext().getPath();
            let oCellData = Object.assign({}, oModel.getProperty(sCellPath));

            oCellData.widgets = oCellData.widgets.concat(aWidgetData);

            oModel.setProperty(sCellPath, oCellData);
            this.onWidgetAdded();
        },

        /**
         * Add Widgets into WorkPageColumn's Cell aggregation
         * @param {sap.ushell.components.workPageBuilder.controls.WorkPageColumn} oColumn The WorkPageCell control.
         * @param {object[]} aWidgetData The WidgetData array
         * @param {int|undefined} iPosition The position where the new Cell should be placed. Defaults to the end if undefined
         *
         * @since 1.113.0
         * @private
         */
        _setColumnData: function (oColumn, aWidgetData, iPosition) {
            const oModel = this.getView().getModel();
            const sColumnPath = oColumn.getBindingContext().getPath();
            const oColumnData = Object.assign({}, oModel.getProperty(sColumnPath));
            const oNewCellData = {
                id: this._generateUniqueId(),
                descriptor: {
                    value: {},
                    schemaVersion: "3.2.0"
                },
                widgets: aWidgetData.concat([])
            };

            if (!oColumnData.cells) {
                oColumnData.cells = [];
            }

            if (iPosition === undefined || iPosition > oColumnData.cells.length) {
                iPosition = oColumnData.cells.length;
            }

            const aCellCopy = oColumnData.cells.concat([]);
            aCellCopy.splice(iPosition, 0, oNewCellData);
            oColumnData.cells = aCellCopy;

            oModel.setProperty(sColumnPath, oColumnData);
            this.onWidgetAdded();
        },

        /**
         * Handler for the "press" event in the WorkPageRow OverflowToolbar button.
         * Opens a confirmation dialog.
         * @returns {Promise} A promise resolving when the dialog was opened.
         * @param {sap.base.Event} oEvent The "deleteRow" event.
         */
        onDeleteRow: function (oEvent) {
            let oRootView = this.getOwnerComponent().getRootControl();
            let oWorkPageRowContext = oEvent.getSource().getBindingContext();

            if (!this.oLoadDeleteDialog) {
                this.oLoadDeleteDialog = Fragment.load({
                    id: oRootView.createId("rowDeleteDialog"),
                    name: "sap.ushell.components.workPageBuilder.view.WorkPageRowDeleteDialog",
                    controller: this
                }).then(function (oDialog) {
                    oDialog.setModel(this.getView().getModel("i18n"), "i18n");
                    return oDialog;
                }.bind(this));
            }

            return this.oLoadDeleteDialog.then(function (oDialog) {
                oDialog.getBeginButton().detachEvent("press", this._fnDeleteRowHandler);
                oDialog.getBeginButton().attachEvent("press", {
                    rowContext: oWorkPageRowContext
                }, this._fnDeleteRowHandler);
                oDialog.open();
            }.bind(this));
        },

        /**
         * Deletes the row with the context given in oRowData.
         *
         * @returns {Promise} A promise resolving when the row has been deleted.
         *
         * @param {sap.base.Event} oEvent The "press" event.
         * @param {object} oRowData Object containing the WorkPageRow context to delete.
         */
        deleteRow: function (oEvent, oRowData) {
            let oModel = this.getView().getModel();
            let oWorkPageRowContext = oRowData.rowContext;
            let aRows = oModel.getProperty("/data/workPage/rows");
            let oRowContextData = oWorkPageRowContext.getObject();

            // Filter out the row with the given id to avoid mutation of the original array.
            let aFilteredRows = aRows.filter(function (oRow) {
                return oRow.id !== oRowContextData.id;
            });

            oModel.setProperty("/data/workPage/rows", aFilteredRows);
            this.getOwnerComponent().fireEvent("workPageEdited");
            return this.oLoadDeleteDialog.then(function (oDialog) {
                oDialog.close();
            });
        },

        /**
         * Called when the "Cancel" button is pressed on the RowDelete dialog.
         * @returns {Promise} A promise resolving when the dialog has been closed
         */
        onRowDeleteCancel: function () {
            return this.oLoadDeleteDialog.then(function (oDialog) {
                oDialog.close();
            });
        },

        /**
         * Called when the "Cancel" button is pressed on the cell delete dialog.
         *
         * @returns {Promise} A promise resolving when the dialog has been closed
         */
        onCellDeleteCancel: function () {
            return this.oDeleteCell.then(function (oDialog) {
                oDialog.close();
            });
        },

        /**
         * Returns a GenericTile control instance to render in error case.
         *
         * @returns {sap.m.GenericTile} A GenericTile with state: failed
         * @private
         */
        _createErrorTile: function () {
            return new VizInstanceCdm({
                state: LoadState.Failed
            })
                .attachPress(this.onVisualizationPress, this)
                .bindEditable("/editMode")
                .bindSizeBehavior("viewSettings>/currentBreakpoint/sizeBehavior")
                .setLayoutData(new GridContainerItemLayoutData({
                    columns: 2,
                    rows: 2
                }));
        },

        /**
         * Creates a widget based on the given widgetContext.
         *
         * @param {string} sWidgetId The id for the widget.
         * @param {sap.ui.model.Context} oWidgetContext The widget context.
         * @returns {sap.ushell.ui.launchpad.VizInstance|sap.m.GenericTile|sap.ui.integration.widgets.Card} The resulting control.
         */
        widgetFactory: function (sWidgetId, oWidgetContext) {
            let sVizId = oWidgetContext.getProperty("visualization/id");

            if (!sVizId) {
                Log.error("No vizId found in widget context.");
                return this._createErrorTile();
            }

            let oVizData = this.getView().getModel().getProperty("/data/usedVisualizations/" + sVizId);

            if (!oVizData || !oVizData.type) {
                Log.error("No viz or vizType found for vizId " + sVizId);
                return this._createErrorTile();
            }

            let aWidgetConfigurations = oWidgetContext.getProperty("configurations") || [];
            let aVizConfigurations = oVizData.configurations || [];
            let aMergedAndSortedConfigurations = this._getMergedAndSortedConfigurations(aWidgetConfigurations, aVizConfigurations);
            let sWidgetContextPath = oWidgetContext.getPath();

            switch (oVizData.type) {
                case "sap.card":
                    return this._createCard(oVizData, aWidgetConfigurations, aMergedAndSortedConfigurations, sWidgetContextPath);
                case "sap.ushell.StaticAppLauncher":
                case "sap.ushell.DynamicAppLauncher":
                    return this._createVizInstance(oVizData);
                default:
                    Log.error("Unknown type for widget " + oVizData.type);
                    return this._createErrorTile();
            }
        },

        /**
         * @typedef {object} Configuration A configuration entry.
         * @property {string} id the id of the configuration entry.
         * @property {string} level the level of the configuration entry.
         * @property {object} settings map of values that the configuration entry overrides.
         */

        /**
         * Group the widget configurations and the visualization configurations by level and then merge settings for each level.
         * The widget configurations override the viz configurations.
         *
         * @since 1.114.0
         * @param {Configuration[]} aWidgetConfigurations The widget configuration items.
         * @param {Configuration[]} aVizConfigurations The viz configuration items.
         * @returns {object[]} The merged array of configurations, sorted by level.
         * @private
         */
        _getMergedAndSortedConfigurations: function (aWidgetConfigurations, aVizConfigurations) {
            // No configurations -> return
            if (aWidgetConfigurations.length === 0 && aVizConfigurations.length === 0) {
                return [];
            }

            // First, widget configurations and viz configurations are merged for each level in CONFIGURATION_LEVELS
            // Second, the merged configurations are sorted
            let oConfigurations = CONFIGURATION_LEVELS.reduce(function (oMergedConfigurations, sLevel) {
                let oWidgetConfigByLevel = aWidgetConfigurations.find(function (oWidgetConfig) {
                    return oWidgetConfig.level === sLevel;
                });
                let oVizConfigByLevel = aVizConfigurations.find(function (oVizConfig) {
                    return oVizConfig.level === sLevel;
                });

                let oMergedConfigurationsByLevel = deepExtend({}, oVizConfigByLevel, oWidgetConfigByLevel);

                if (Object.keys(oMergedConfigurationsByLevel).length > 0) {
                    oMergedConfigurations[sLevel] = oMergedConfigurationsByLevel;
                }

                return oMergedConfigurations;
            }, {});

            return this._sortConfigurations(Object.values(oConfigurations));
        },


        /**
         * Sort the widget's configuration by level: PR: Provider, CO: (Content) Administrator, PG: Page Administrator, US: End User
         *
         * @since 1.114.0
         * @param {Configuration[]} aConfigurations The configurations.
         * @returns {Configuration[]} The configurations sorted by level.
         * @private
         */

        _sortConfigurations: function (aConfigurations) {
            let oSortedConfigurations = aConfigurations && aConfigurations.sort(function (oWidgetConfigA, oWidgetConfigB) {
                return CONFIGURATION_LEVELS.indexOf(oWidgetConfigA.level) - CONFIGURATION_LEVELS.indexOf(oWidgetConfigB.level);
            });

            // PR —> CO —> PG —> US
            return oSortedConfigurations.map(function (oWidgetConfiguration) {
                return oWidgetConfiguration.settings.value;
            });
        },

        /**
         * Creates a VizInstance with given vizData using the VizInstantiation service.
         *
         * @since 1.110.0
         * @param {object} oVizData VisualizationData for the visualization.
         * @returns {sap.ushell.ui.launchpad.VizInstance|sap.m.GenericTile} The CDM VizInstance.
         * @private
         */
        _createVizInstance: function (oVizData) {

            const oExtendedVizData = deepExtend({}, oVizData, {
                preview: this.oModel.getProperty("/previewMode")
            });

            if (this.oModel.getProperty("/navigationDisabled") && oExtendedVizData._siteData) {
                delete oExtendedVizData._siteData.target;
                delete oExtendedVizData._siteData.targetURL;
            }

            let oVizInstance = this.oWorkPageVizInstantiation.createVizInstance(oExtendedVizData);

            if (!oVizInstance) {
                Log.error("No VizInstance was created.");
                return this._createErrorTile();
            }

            return oVizInstance
                .setActive(true)
                .bindPreview("/previewMode")
                .attachPress(this.onVisualizationPress, this)
                .bindEditable("/editMode")
                .bindSizeBehavior("viewSettings>/currentBreakpoint/sizeBehavior")
                .bindClickable({
                    path: "/navigationDisabled",
                    formatter: function (bValue) {
                        return !bValue;
                    }
                })
                .setLayoutData(new GridContainerItemLayoutData(oVizInstance.getLayout()));
        },

        /**
         * Returns the aria label for a WorkPageRow (section).
         *
         * If there is a title, the title will be returned in a translated string.
         * If there is no tile, the translated string for unnamed sections will be returned, including the position of the section.
         *
         * @param {string} sId The section dom id.
         * @param {object[]} aRows The rows array of the work page.
         * @param {string} sTitle The title of the section.
         * @returns {string} The string to be used as aria-label attribute.
         */
        formatRowAriaLabel: function (sId, aRows = [], sTitle) {
            const i18nBundle = this.getView().getModel("i18n").getResourceBundle();

            if (sTitle) { return i18nBundle.getText("WorkPage.Row.Named.AriaLabel", [sTitle]); }

            const iIndex = aRows.findIndex((oRow) => oRow.id === sId);
            if (iIndex < 0) { return ""; }

            return i18nBundle.getText("WorkPage.Row.Unnamed.AriaLabel", [iIndex + 1]);
        },

        /**
         * Called if a vizInstance was pressed and proceeds to delete it from the data.
         *
         * @param {sap.base.Event} oEvent The press event.
         */
        onVisualizationPress: function (oEvent) {
            let sScope = oEvent.getParameter("scope");
            let sAction = oEvent.getParameter("action");

            if (sScope === "Actions" && sAction === "Remove") {
                this._deleteVisualization(oEvent.getSource());
            }
        },

        /**
         * Creates a new Card.
         *
         * @since 1.110.0
         * @param {object} oViz The visualization data. Defaults to {}.
         * @param {Configuration[]} aWidgetConfigurations The configurations on widget level. Defaults to [].
         * @param {object[]} aManifestChangesToApply The configurations to apply to the card. Defaults. to [].
         * @param {string} sWidgetContextPath The widget configurations path. Defaults to "".
         * @returns {sap.ui.integration.widgets.Card} The card instance.
         * @private
         */
        _createCard: function (oViz = {}, aWidgetConfigurations = [], aManifestChangesToApply = [], sWidgetContextPath = "") {
            let oOptions = {};
            let bHasDescriptor = oViz.descriptor && oViz.descriptor.value && oViz.descriptor.value["sap.card"];
            let bHasDescriptorResources = oViz.descriptorResources && (oViz.descriptorResources.baseUrl || oViz.descriptorResources.descriptorPath);
            let bPgLevelConfigurationsExist = aWidgetConfigurations.some(function (oConfig) { return oConfig.level === "PG"; });
            let bIsConfigurable;

            if (!bHasDescriptor && !bHasDescriptorResources) {
                Log.error("No descriptor or descriptorResources for Card");
                return new Card().setLayoutData(new GridContainerItemLayoutData({
                    columns: 2,
                    rows: 2
                }));
            }

            if (bHasDescriptor) {
                oOptions.manifest = oViz.descriptor.value;
                bIsConfigurable = !!ObjectPath.get(["descriptor", "value", "sap.card", "configuration"], oViz);

                if (bHasDescriptorResources) {
                    oOptions.baseUrl = oViz.descriptorResources.baseUrl + oViz.descriptorResources.descriptorPath;
                }
            } else if (bHasDescriptorResources) {
                oOptions.manifest = oViz.descriptorResources.baseUrl + oViz.descriptorResources.descriptorPath;

                if (!oOptions.manifest.endsWith(".json")) {
                    oOptions.manifest += "/manifest.json";
                }
            }

            oOptions.referenceId = oViz?.provider?.id;

            // Ensure trailing slash for base url
            if (oOptions.baseUrl && oOptions.baseUrl.substr(-1) !== "/") {
                oOptions.baseUrl += "/";
            }

            let oCard = new Card(oOptions);

            if (bIsConfigurable) {
                let oConfigureActionDefinition = this._createCardConfigurationActionDefinition(
                    oCard,
                    sWidgetContextPath,
                    this._openCardConfigurationEditor.bind(this)
                );
                oCard.addActionDefinition(oConfigureActionDefinition);
            }

            if (bPgLevelConfigurationsExist) {
                let oResetActionDefinition = this._createCardResetActionDefinition(
                    aWidgetConfigurations,
                    sWidgetContextPath,
                    this._openResetCardConfigurationDialog.bind(this)
                );
                oCard.addActionDefinition(oResetActionDefinition);
            }

            return oCard
                .setModel(this.oModel, "workPageModel")
                .bindProperty("previewMode", {
                    path: "workPageModel>/previewMode",
                    formatter: function (bValue) {
                        return bValue ? CardPreviewMode.MockData : CardPreviewMode.Off;
                    }
                })
                .setManifestChanges(aManifestChangesToApply)
                .addStyleClass("workpageCellWidget")
                .setHost(this.oHost)
                .setLayoutData(new GridContainerItemLayoutData({
                    columns: 16,
                    minRows: 1
                }));
        },

        /**
         * Create an ActionDefinition to enable the user to configure the card with the CardEditor.
         *
         * @since 1.114.0
         * @param {sap.ui.integration.widgets.Card} oCard The card to configure.
         * @param {string} sWidgetContextPath The card to configure.
         * @param {function} fnOnPress Handler function, called when the ActionDefinition button is pressed.
         *
         * @returns {sap.ui.integration.ActionDefinition} The ActionDefinition item.
         * @private
         */
        _createCardConfigurationActionDefinition: function (oCard, sWidgetContextPath, fnOnPress) {
            const sActionDefinitionText = this.getView().getModel("i18n").getResourceBundle().getText("WorkPage.Card.ActionDefinition.Configure");
            const oActionDefinition = new ActionDefinition({
                type: "Custom",
                visible: "{/editMode}",
                buttonType: "Transparent",
                text: sActionDefinitionText
            });

            oActionDefinition.setModel(this.oModel);
            oActionDefinition.attachPress({
                card: oCard,
                widgetContextPath: sWidgetContextPath
            }, fnOnPress);
            return oActionDefinition;
        },

        /**
         * Create an ActionDefinition to enable the user to reset the card when some configuration was made.
         *
         * @since 1.117.0
         * @param {Configuration[]} aWidgetConfigurations The widget configuration items.
         * @param {string} sWidgetContextPath The path of the card data in the model.
         * @param {function} fnOnPress Handler function, called when the ActionDefinition button is pressed.
         *
         * @returns {sap.ui.integration.ActionDefinition} The ActionDefinition item.
         * @private
         */
        _createCardResetActionDefinition: function (aWidgetConfigurations, sWidgetContextPath, fnOnPress) {
            const sActionDefinitionText = this.getView().getModel("i18n").getResourceBundle().getText("WorkPage.Card.ActionDefinition.Reset");
            const oActionDefinition = new ActionDefinition({
                type: "Custom",
                visible: "{/editMode}",
                buttonType: "Transparent",
                text: sActionDefinitionText
            });

            oActionDefinition.setModel(this.oModel);
            oActionDefinition.attachPress({
                widgetContextPath: sWidgetContextPath,
                widgetConfigurations: aWidgetConfigurations
            }, fnOnPress);
            return oActionDefinition;
        },

        /**
         * Adds the CardEditor into the Dialog and opens it.
         *
         * @since 1.113.0
         * @param {sap.base.Event} oEvent The event object.
         * @param {{card: sap.ui.integration.widgets.Card, widgetContextPath: string}} oContextData The context data.
         * @returns {Promise} Promise that will resolve the Dialog
         * @private
         */
        _openCardConfigurationEditor: function (oEvent, oContextData) {
            if (!this.oCardEditorDialogPromise) {
                this.oCardEditorDialogPromise = this._createCardEditorDialog(oContextData.card);
            }

            let oCardEditorPromise = this._createCardEditor(oContextData.card);

            return Promise.all([oCardEditorPromise, this.oCardEditorDialogPromise]).then(function (aInstances) {
                this.oCardEditorDialog = aInstances[1];
                this.oCardEditorDialog.removeAllContent();
                this.oCardEditorDialog.getBeginButton()
                    .detachPress(this._fnSaveCardConfiguration)
                    .attachPress(oContextData.widgetContextPath, this._fnSaveCardConfiguration);
                this._setCardDialogTitle(this.oCardEditorDialog, oContextData.card);
                this.oCardEditorDialog.addContent(aInstances[0]);
                this.oCardEditorDialog.open();
            }.bind(this));
        },


        /**
         * Opens the card reset dialog and attaches the reset button handler.
         *
         * @since 1.117.0
         * @param {sap.base.Event} oEvent The press event.
         * @param { {
         *  card: sap.ui.integration.widgets.Card,
         *  widgetContextPath: string,
         *  widgetConfigurations: Configuration[],
         *  vizConfigurations: Configuration[]
         * } } oContextData The required context data.
         * @returns {Promise} A promise resolving when the card dialog was opened.
         * @private
         */
        _openResetCardConfigurationDialog: function (oEvent, oContextData) {
            if (!this.oCardResetDialogPromise) {
                this.oCardResetDialogPromise = this._createResetCardConfigurationDialog();
            }

            return this.oCardResetDialogPromise.then(function (oCardResetDialog) {
                this.oCardResetDialog = oCardResetDialog;
                this.getView().addDependent(this.oCardResetDialog);
                this.oCardResetDialog.getBeginButton()
                    .detachPress(this._fnResetCardConfiguration)
                    .attachPress(oContextData, this._fnResetCardConfiguration);
                this.oCardResetDialog.open();
            }.bind(this));
        },

        /**
         *
         * @param {sap.base.Event} oEvent The press event.
         * @param {{ widgetContextPath: string, widgetConfigurations: Configuration[] }} oContextData The context data object.
         * @since 1.117.0
         * @private
         */
        _onResetCardConfigurations: function (oEvent, oContextData) {
            let oDialog = oEvent.getSource().getParent();
            let aWidgetConfigurations = oContextData.widgetConfigurations;
            let sWidgetConfigurationsPath = oContextData.widgetContextPath + "/configurations";
            let aRemainingConfigurations = aWidgetConfigurations.filter(function (oConfig) {
                return oConfig.level !== "PG";
            });

            this.oModel.setProperty(sWidgetConfigurationsPath, aRemainingConfigurations);

            this.getOwnerComponent().fireEvent("workPageEdited");

            oDialog.close();
        },

        /**
         * Resets the configuration of the card after confirming a failsafe dialog.
         * @returns {Promise<sap.m.Dialog>} A Promise resolving the the sap.m.Dialog control.
         *
         * @since 1.117.0
         * @private
         */
        _createResetCardConfigurationDialog: function () {
            let oI18nBundle = this.getView().getModel("i18n").getResourceBundle();
            let sDialogTitle = oI18nBundle.getText("WorkPage.CardEditor.DeleteConfigurationDialog.Title");
            let sDialogContent = oI18nBundle.getText("WorkPage.CardEditor.DeleteConfigurationDialog.Content");
            let sBeginButtonText = oI18nBundle.getText("WorkPage.CardEditor.DeleteConfigurationDialog.Accept");
            let sEndButtonText = oI18nBundle.getText("WorkPage.CardEditor.DeleteConfigurationDialog.Deny");

            return new Promise((resolve, reject) => {
                sap.ui.require(["sap/m/Dialog", "sap/m/Button", "sap/m/Text"], (Dialog, Button, Text) => {
                    let oDialog = new Dialog({
                        id: this.createId("cardConfigurationResetDialog"),
                        type: mLibrary.DialogType.Message,
                        state: ValueState.Warning,
                        title: sDialogTitle,
                        content: new Text({
                            text: sDialogContent
                        }),
                        beginButton: new Button({
                            type: mLibrary.ButtonType.Emphasized,
                            text: sBeginButtonText
                        }),
                        endButton: new Button({
                            text: sEndButtonText,
                            press: function () {
                                oDialog.close();
                            }
                        })
                    });
                    resolve(oDialog);
                }, reject);
            });
        },

        /**
         *
         * @param {sap.m.Dialog} oDialog The dialog control.
         * @param {sap.ui.integration.widgets.Card} oCard The card control.
         * @private
         */
        _setCardDialogTitle: function (oDialog, oCard) {
            let oI18nBundle = this.getView().getModel("i18n").getResourceBundle();
            let sCardEditorTitle = this._getCardTitle(oCard)
                ? oI18nBundle.getText("WorkPage.CardEditor.Title", [this._getCardTitle(oCard)])
                : oI18nBundle.getText("WorkPage.CardEditor.Title.NoCardTitle");
            oDialog.setTitle(sCardEditorTitle);
        },

        /**
         * Creates and returns the CardEditor.
         * @param {sap.ui.integration.widgets.Card} oCard The card control.
         * @since 1.114.0
         *
         * @returns {sap.ui.integration.designtime.editor.CardEditor} The CardEditor instance.
         * @private
         */
        _createCardEditor: function (oCard) {
            return new Promise((fResolve, fReject) => {
                sap.ui.require(["sap-ui-integration-card-editor"],
                    () => {
                        sap.ui.require(["sap/ui/integration/designtime/editor/CardEditor"], (CardEditor) => {
                            fResolve(
                                new CardEditor({
                                    previewPosition: "right",
                                    card: oCard,
                                    mode: "content"
                                })
                            );
                        },
                            fReject
                        );
                    },
                    fReject
                );
            });
        },

        /**
         * Creates a dialog to be used with the CardEditor.
         * @since 1.114.0
         * @param {sap.ui.integration.widgets.Card} oCard The card control instance.
         * @returns {Promise<sap.m.Dialog>} Promise that will resolve the Dialog
         * @private
         */
        _createCardEditorDialog: function (oCard) {
            let oI18nBundle = this.getView().getModel("i18n").getResourceBundle();
            let sCardEditorSaveText = oI18nBundle.getText("WorkPage.CardEditor.Save");
            let sCardEditorCancelText = oI18nBundle.getText("WorkPage.CardEditor.Cancel");

            return new Promise((resolve, reject) => {
                sap.ui.require(["sap/m/Dialog", "sap/m/Button"], (Dialog, Button) => {
                    let oDialog = new Dialog({
                        id: this.createId("cardEditorDialog"),
                        contentWidth: "40rem",
                        beginButton: new Button({
                            text: sCardEditorSaveText,
                            type: mLibrary.ButtonType.Emphasized
                        }),
                        endButton: new Button({
                            text: sCardEditorCancelText,
                            press: function () {
                                oDialog.close();
                            }
                        })
                    });
                    resolve(oDialog);
                }, reject);
            });
        },

        /**
         * Returns the card title. First checks if the card has a header title, falls back to the manifest title.
         *
         * @param {sap.ui.integration.widgets.Card} oCard The card control instance.
         * @returns {string} The card title.
         * @since 1.114.0
         */
        _getCardTitle: function (oCard) {
            if (oCard.getCardHeader() && oCard.getCardHeader().getTitle()) {
                return oCard.getCardHeader().getTitle();
            }
        },

        /**
         * Saves the card's new configuration
         * @since 1.114.0
         * @param {sap.base.Event} oEvent The event object.
         * @param {string} sWidgetContextPath The path to the card.
         * @private
         */
        _onSaveCardEditor: function (oEvent, sWidgetContextPath) {
            let oDialog = oEvent.getSource().getParent();
            let oCardEditor = oDialog.getContent()[0];
            let oCard = oCardEditor.getCard();
            let sWidgetConfigurationsPath = sWidgetContextPath + "/configurations";
            let oCurrentSettings = oCardEditor.getCurrentSettings();
            let aWidgetConfigurations = this.oModel.getProperty(sWidgetConfigurationsPath) || [];

            let oWidgetConfiguration = aWidgetConfigurations.find(function (oConfiguration) {
                return oConfiguration.level === "PG";
            });

            if (!oWidgetConfiguration) {
                oWidgetConfiguration = {};
                oWidgetConfiguration.id = this._generateUniqueId();
                oWidgetConfiguration.level = "PG";
                oWidgetConfiguration.settings = {
                    value: oCurrentSettings,
                    schemaVersion: "3.2.0"
                };
                aWidgetConfigurations.push(oWidgetConfiguration);
            } else {
                aWidgetConfigurations = aWidgetConfigurations.map(function (oConfiguration) {
                    if (oConfiguration.level === "PG") {
                        oConfiguration.settings.value = deepExtend({}, oConfiguration.settings.value, oCurrentSettings);
                    }
                    return oConfiguration;
                });
            }

            this.oModel.setProperty(sWidgetConfigurationsPath, aWidgetConfigurations);

            oCard.setManifestChanges([oCurrentSettings]);

            this.getOwnerComponent().fireEvent("workPageEdited");

            oDialog.close();
        },

        /**
         * Close the edit mode and request to save changes by firing the "closeEditMode" event. The edit mode needs to be managed
         * the outer component to also handle the UserAction Menu button for edit mode.´
         */
        saveEditChanges: function () {
            this.getOwnerComponent().fireEvent("closeEditMode", {
                saveChanges: true
            });
        },

        /**
         * Close the edit mode and request to cancel changes by firing the "closeEditMode" event. The edit mode needs to be managed
         * the outer component to also handle the UserAction Menu button for edit mode.´
         */
        cancelEditChanges: function () {
            this.getOwnerComponent().fireEvent("closeEditMode", {
                saveChanges: false
            });
        },

        /**
         * Called if a WorkPageCell is dropped before or after another WorkPageCell in a WorkPageColumn.
         *
         * @param {sap.base.Event} oEvent The drop event.
         *
         * @since 1.116.0
         * @private
         */
        onCellDrop: function (oEvent) {
            let oSourceCell = oEvent.getParameter("draggedControl");
            let oTargetCell = oEvent.getParameter("droppedControl");
            let sDropPosition = oEvent.getParameter("dropPosition");
            let oSourceColumn = oSourceCell.getParent();
            let oTargetColumn = oTargetCell.getParent();

            let iSourceIndex = oSourceColumn.indexOfAggregation("cells", oSourceCell);
            let iTargetIndex = oTargetColumn.indexOfAggregation("cells", oTargetCell);

            // Increase the drop position if the dragged element is moved below the target element.
            if (sDropPosition === "After") {
                iTargetIndex++;
            }

            this._moveCell(oSourceColumn, oTargetColumn, iSourceIndex, iTargetIndex);
        },

        /**
         * Called if a WorkPageCell is dropped on an empty WorkPageColumn.
         *
         * @param {sap.base.Event} oEvent The drop event.
         *
         * @since 1.116.0
         * @private
         */
        onCellDropOnEmptyColumn: function (oEvent) {
            let oSourceCell = oEvent.getParameter("draggedControl");
            let oTargetColumn = oEvent.getParameter("droppedControl");
            let oSourceColumn = oSourceCell.getParent();

            let iSourceIndex = oSourceColumn.indexOfAggregation("cells", oSourceCell);
            let iTargetIndex = 0;

            this._moveCell(oSourceColumn, oTargetColumn, iSourceIndex, iTargetIndex);
        },

        /**
         * Called if a Visualization is dropped between Cells (e.g. a tile is dropped between two cards)
         *
         * @param {sap.base.Event} oEvent The drop event
         *
         * @since 1.118.0
         * @private
         */
        onVisualizationDropBetweenCells: function (oEvent) {
            const oSourceVisualization = oEvent.getParameter("draggedControl");
            const oTargetCell = oEvent.getParameter("droppedControl");
            const sDropPosition = oEvent.getParameter("dropPosition");
            const oSourceCell = oSourceVisualization.getParent().getParent();
            const oTargetColumn = oTargetCell.getParent();
            let iPositionInTargetColumn = oTargetColumn.indexOfAggregation("cells", oTargetCell);

            if (sDropPosition === "After") {
                iPositionInTargetColumn++;
            }

            this._moveVisualizationToCellOrColumn(oSourceVisualization, oSourceCell, oTargetColumn, iPositionInTargetColumn);
        },

        /**
         * Called when a Visualization is dropped on top of a Cell (e.g. a tile is dropped on top of an empty cells illustrated message)
         *
         * @param {sap.base.Event} oEvent The drop event.
         *
         * @since 1.118.0
         * @private
         */
        onVisualizationDropOnCell: function (oEvent) {
            const oSourceVisualization = oEvent.getParameter("draggedControl");
            const oTargetColumn = oEvent.getParameter("droppedControl");
            const oSourceCell = oSourceVisualization.getParent().getParent();
            const iPositionInTargetColumn = 0;

            this._moveVisualizationToCellOrColumn(oSourceVisualization, oSourceCell, oTargetColumn, iPositionInTargetColumn);
        },

        /**
         * Called when a Visualization is dropped on an empty Widget Container
         *
         * @param {sap.base.Event} oEvent The drop event.
         *
         * @since 1.118.0
         * @private
         */
        onVisualizationDropOnEmptyWidgetContainer: function (oEvent) {
            const oSourceVisualization = oEvent.getParameter("draggedControl");
            const oTargetCell = oEvent.getParameter("droppedControl");
            const oSourceCell = oSourceVisualization.getParent().getParent();

            this._moveVisualizationToCellOrColumn(oSourceVisualization, oSourceCell, oTargetCell);
        },

        /**
         * Moves a visualization to an empty spot in a Column or into an empty Cell
        *
         * @param {object} oVisualization The Visualization
         * @param {object} oSourceCell The Cell where the tile was initially
         * @param {object} oTargetControl The target control (Column or empty Cell)
         * @param {int} [iPositionInTargetColumn] The position in the target column. Only needed when target control is a WorkPageColumn
         *
         * @since 1.118.0
         * @private
         */
        _moveVisualizationToCellOrColumn: function (oVisualization, oSourceCell, oTargetControl, iPositionInTargetColumn) {
            const oModel = this.getView().getModel();
            const sCellWidgetsPath = oSourceCell.getBindingContext().getPath() + "/widgets";
            const aCellWidgets = oModel.getProperty(sCellWidgetsPath);
            const iIndexInSourceCell = oSourceCell.indexOfAggregation("widgets", oVisualization);
            const sSourceVisPath = oVisualization.getBindingContext().getPath();
            const oSourceVisWidgetData = oModel.getProperty(sSourceVisPath);

            aCellWidgets.splice(iIndexInSourceCell, 1);

            // Insert the dragged object into a new target array to avoid mutation.
            const aNewCellWidgets = [].concat(aCellWidgets);

            oModel.setProperty(sCellWidgetsPath, aNewCellWidgets);
            if (oTargetControl.isA("sap.ushell.components.workPageBuilder.controls.WorkPageCell")) {
                this._setCellData(oTargetControl, [oSourceVisWidgetData]);
            } else if (oTargetControl.isA("sap.ushell.components.workPageBuilder.controls.WorkPageColumn")) {
                this._setColumnData(oTargetControl, [oSourceVisWidgetData], iPositionInTargetColumn);
            }
            InvisibleMessage.getInstance().announce(this.getView().getModel("i18n").getResourceBundle().getText("WorkPage.Message.WidgetMoved"), InvisibleMessageMode.Assertive);
            this.getOwnerComponent().fireEvent("workPageEdited");
        },

        /**
         * Moves a cell between two columns and updates the model accordingly.
         *
         * @param {sap.ushell.components.workPageBuilder.controls.WorkPageColumn} oSourceColumn The column from where the cell originates from
         * @param {sap.ushell.components.workPageBuilder.controls.WorkPageColumn} oTargetColumn The column where the cell will be moved to
         * @param {int} iSourceIndex The position in the column where the cell originates from
         * @param {int} iTargetIndex The position in the column where the cell will be moved to
         *
         * @private
         * @since 1.116.0
         */
        _moveCell: function (oSourceColumn, oTargetColumn, iSourceIndex, iTargetIndex) {
            let oModel = this.getView().getModel();

            let bSameContainer = oTargetColumn.getId() === oSourceColumn.getId();

            let sSourceColumnCellsPath = oSourceColumn.getBindingContext().getPath() + "/cells";
            let sTargetColumnCellsPath = oTargetColumn.getBindingContext().getPath() + "/cells";

            let aSourceColumnCells = oModel.getProperty(sSourceColumnCellsPath);
            let aTargetColumnCells = oModel.getProperty(sTargetColumnCellsPath);

            if (bSameContainer) {
                // Decrease drop position if the dragged element is taken from before the drop position in the same container.
                if (iSourceIndex < iTargetIndex) {
                    iTargetIndex--;
                }
                // Return if the result is the same for drag position and drop position in the same container (and prevent the MessageToast).
                if (iSourceIndex === iTargetIndex) {
                    return;
                }
            }

            // Filter the dragged item from the source array instead of splicing to avoid mutation.
            let aNewDragColumnCells = aSourceColumnCells.filter(function (oWidget, iIndex) {
                return iIndex !== iSourceIndex;
            });

            // If dnd happened in the same cell, the drop cells become the dragged cells without the dragged object.
            if (bSameContainer) {
                aTargetColumnCells = aNewDragColumnCells;
            }

            // Insert the dragged object into a new target array to avoid mutation.
            let aNewDropColumnCells = [aTargetColumnCells.slice(0, iTargetIndex), aSourceColumnCells[iSourceIndex], aTargetColumnCells.slice(iTargetIndex)].flat();

            oModel.setProperty(sSourceColumnCellsPath, aNewDragColumnCells);
            oModel.setProperty(sTargetColumnCellsPath, aNewDropColumnCells);

            InvisibleMessage.getInstance().announce(this.getView().getModel("i18n").getResourceBundle().getText("WorkPage.Message.WidgetMoved"), InvisibleMessageMode.Assertive);
            this.getOwnerComponent().fireEvent("workPageEdited");
        },

        /**
         * Called if a widget is dropped on the WorkPageCell.
         * @since 1.116.0
         * @param {sap.base.Event} oEvent The drop event.
         */
        onWidgetOnCellDrop: function (oEvent) {
            let oDragged = oEvent.getParameter("draggedControl");
            let oSourceCell = oDragged.getParent().getParent();
            let oTargetCell = oEvent.getParameter("droppedControl");
            let iDragPosition = oSourceCell.indexOfAggregation("widgets", oDragged);
            let iDropPosition = oTargetCell.getBindingContext().getProperty("widgets").length;

            this._moveVisualization(oSourceCell, oTargetCell, iDragPosition, iDropPosition);
        },

        /**
         * Called when a Widget is dragged over a Cell. Prevents the drop for Cells with tiles or based on conditions defined by the parameters.
         * Note: The Tile drop event is prevented here because it is handled by a different drag/drop option via the GridContainer
         *
         * @param {sap.base.Event} oEvent The dragEnter event.
         * @param {object} bEmptyCellExpected Determines whether it is expected that Widgets are already present in the target Cell
         */
        onWidgetOnCellDragEnter: function (oEvent, bEmptyCellExpected) {
            const oCell = oEvent.getParameter("target");
            const bWidgetsPresent = !!oCell.getBindingContext().getProperty("widgets").length;
            if (oCell.getTileMode() && bWidgetsPresent || bEmptyCellExpected === bWidgetsPresent) {
                oEvent.preventDefault();
            }
        },

        /**
         * Called if a widget is dropped to a certain position in the GridContainer.
         * @since 1.110.0
         * @param {sap.base.Event} oEvent The drop event.
         */
        onGridDrop: function (oEvent) {
            let oTargetCell = oEvent.getSource();
            let oDragged = oEvent.getParameter("draggedControl");
            let oDropped = oEvent.getParameter("droppedControl");
            let sInsertPosition = oEvent.getParameter("dropPosition");
            let oSourceCell = oDragged.getParent().getParent();

            let iDragPosition = oSourceCell.indexOfAggregation("widgets", oDragged);
            let iDropPosition = oTargetCell.indexOfAggregation("widgets", oDropped);

            let bSameContainer = oTargetCell.getId() === oSourceCell.getId();

            // Increase the drop position if the dragged element is moved to the right.
            if (sInsertPosition === "After") {
                iDropPosition++;
            }

            if (bSameContainer) {
                // Decrease drop position if the dragged element is taken from before the drop position in the same container.
                if (iDragPosition < iDropPosition) {
                    iDropPosition--;
                }
                // Return if the result is the same for drag position and drop position in the same container (and prevent the MessageToast).
                if (iDragPosition === iDropPosition) {
                    return;
                }
            }

            this._moveVisualization(oSourceCell, oTargetCell, iDragPosition, iDropPosition);
        },

        /**
         * Updates the model according to the new positions.
         * Removes the widget data from the widgets in the source cell at the drag position.
         * Inserts the object into the widgets array in the target cell at the drop position.
         *
         * @since 1.110.0
         * @param {sap.ushell.components.workPageBuilder.controls.WorkPageCell} oSourceCell The cell from which the widget was dragged.
         * @param {sap.ushell.components.workPageBuilder.controls.WorkPageCell} oTargetCell The cell into which the widget was dropped.
         * @param {int} iDragPosition The position the widget was dragged from.
         * @param {int} iDropPosition The position the widget was dropped to.
         * @private
         */
        _moveVisualization: function (oSourceCell, oTargetCell, iDragPosition, iDropPosition) {
            let oModel = this.getView().getModel();

            let sDragContainerWidgetsPath = oSourceCell.getBindingContext().getPath() + "/widgets";
            let sDropContainerWidgetsPath = oTargetCell.getBindingContext().getPath() + "/widgets";
            let bSameCell = sDragContainerWidgetsPath === sDropContainerWidgetsPath;

            let aDragContainerWidgets = oModel.getProperty(sDragContainerWidgetsPath);
            let aDropContainerWidgets = oModel.getProperty(sDropContainerWidgetsPath);

            let oDraggedObject = aDragContainerWidgets[iDragPosition];

            // Filter the dragged item from the source array instead of splicing to avoid mutation.
            let aNewDragContainerWidgets = aDragContainerWidgets.filter(function (oWidget, iIndex) {
                return iIndex !== iDragPosition;
            });

            // If dnd happened in the same cell, the drop widgets become the dragged widgets without the dragged object.
            if (bSameCell) {
                aDropContainerWidgets = aNewDragContainerWidgets;
            }

            // Insert the dragged object into a new target array to avoid mutation.
            let aNewDropContainerWidgets = [aDropContainerWidgets.slice(0, iDropPosition), oDraggedObject, aDropContainerWidgets.slice(iDropPosition)].flat();

            oModel.setProperty(sDragContainerWidgetsPath, aNewDragContainerWidgets);
            oModel.setProperty(sDropContainerWidgetsPath, aNewDropContainerWidgets);

            InvisibleMessage.getInstance().announce(this.getView().getModel("i18n").getResourceBundle().getText("WorkPage.Message.WidgetMoved"), InvisibleMessageMode.Assertive);
            this.getOwnerComponent().fireEvent("workPageEdited");
        },

        /**
         * Returns true if the aWidgets array does not contain cards.
         *
         * @param {sap.ui.core.Control[]} aWidgets The array of widget controls.
         * @returns {boolean} The result indicating if tileMode is active.
         */
        tileMode: function (aWidgets) {
            let oModel = this.getView().getModel();
            let oUsedViz;

            return !!aWidgets && (aWidgets.length > 1 || !aWidgets.some(function (oWidget) {
                oUsedViz = oModel.getProperty("/data/usedVisualizations/" + ObjectPath.get("visualization.id", oWidget));
                return ObjectPath.get("type", oUsedViz) === "sap.card";
            }));
        },

        /**
         * Formatter for the appsearch button. Returns true if the cell is in tileMode and editMode is active.
         *
         * @param {object[]} aWidgets The widgets array.
         * @param {boolean} bEditMode The editMode flag
         * @returns {boolean} The result.
         */
        showAppSearchButton: function (aWidgets, bEditMode) {
            return this.tileMode(aWidgets) && bEditMode;
        },

        /**
         * Updates the model with the columnWidths.
         *
         * @param {sap.ushell.components.workPageBuilder.controls.WorkPageRow} oRow The surrounding row.
         * @param {int} iLeftColumnIndex The index of the left column to update.
         * @param {int} iRightColumnIndex The index of the right column to update.
         * @param {int} iNewLeftColumnWidth The new columnWidth value for the left column.
         * @param {int} iNewRightColumnWidth The new columnWidth value for the right column.
         * @private
         */
        _updateModelWithColumnWidths: function (oRow, iLeftColumnIndex, iRightColumnIndex, iNewLeftColumnWidth, iNewRightColumnWidth) {
            let oModel = this.getView().getModel();
            let oRowBindingContext = oRow.getBindingContext();
            let sRowBindingContextPath = oRowBindingContext.getPath();
            let sLeftColumnPath = sRowBindingContextPath + "/columns/" + iLeftColumnIndex + "/descriptor/value/columnWidth";
            let sRightColumnPath = sRowBindingContextPath + "/columns/" + iRightColumnIndex + "/descriptor/value/columnWidth";
            oModel.setProperty(sLeftColumnPath, iNewLeftColumnWidth);
            oModel.setProperty(sRightColumnPath, iNewRightColumnWidth);
        },

        /**
         * Gets the column width from the column descriptor entry, falls back to max column width if the columnWidth is empty.
         *
         * @param {object} oColumn The column data object.
         * @returns {int} The column width as an integer.
         * @private
         */
        _getColumnWidth: function (oColumn) {
            return ObjectPath.get("descriptor.value.columnWidth", oColumn) || MAX_GRID_COLUMN_WIDTH;
        },

        /**
         * Sets the column width to the column descriptor.
         *
         * @param {object} oColumn The column data object.
         * @param {int} iColumnWidth The column data object.
         * @private
         */
        _setColumnWidth: function (oColumn, iColumnWidth) {
            ObjectPath.set("descriptor.value.columnWidth", iColumnWidth, oColumn);
        },

        /**
         *
         * @param {sap.ushell.components.workPageBuilder.controls.WorkPageColumn[]} aColumns An array of WorkPageColumn controls.
         * @param {int} iColumnIndex The column index.
         * @param {int} iTotalColumns The total number of columns.
         * @returns {sap.ushell.components.workPageBuilder.controls.WorkPageColumn[]} The updated array of WorkPageColumn controls.
         * @private
         */
        _calculateColWidths: function (aColumns, iColumnIndex, iTotalColumns) {
            let oColumn = aColumns[iColumnIndex];

            if (this._getColumnWidth(oColumn) - STEP_SIZE >= MIN_GRID_COLUMN_WIDTH) {
                this._setColumnWidth(oColumn, this._getColumnWidth(oColumn) - STEP_SIZE);
                iTotalColumns = iTotalColumns - STEP_SIZE;
            }

            if (iTotalColumns > MAX_GRID_COLUMN_WIDTH) {
                let nextIndex = iColumnIndex - 1 >= 0 ? iColumnIndex - 1 : aColumns.length - 1;
                this._calculateColWidths(aColumns, nextIndex, iTotalColumns);
            }

            return aColumns;
        },

        /**
         * Returns the data representation of an empty WorkPageColumn.
         *
         * @param {int} iColumnWidth The columnWidth for the column.
         * @returns {object} The WorkPageColumn data object.
         * @private
         */
        _createEmptyColumn: function (iColumnWidth) {
            return {
                id: this._generateUniqueId(),
                descriptor: {
                    value: {
                        columnWidth: iColumnWidth
                    },
                    schemaVersion: "3.2.0"
                },
                configurations: [],
                cells: []
            };
        },

        /**
         * Returns the data representation of an empty WorkPageRow.
         *
         * @returns {object} The WorkPageRow data object.
         * @private
         */
        _createEmptyRow: function () {
            return {
                id: this._generateUniqueId(),
                descriptor: {
                    value: {
                        title: ""
                    },
                    schemaVersion: "3.2.0"
                },
                columns: [this._createEmptyColumn(MAX_GRID_COLUMN_WIDTH)]
            };
        },

        /**
         * Saves the host in a variable to be attached to a card.
         *
         * @private
         */
        _saveHost: function () {
            this.oHost = Element.getElementById("sap.shell.host.environment");
            if (!this.oHost) {
                this.oHost = new WorkPageHost("sap.shell.host.environment");
                // set the ushell container on the host for navigation service access
                this.oHost._setContainer(this.getOwnerComponent().getUshellContainer());
                // create a property binding for navigationDisabled to forward to host if a model is present.
                if (this.oModel) {
                    let oNavDisabledBinding = this.oModel.bindProperty("/navigationDisabled");
                    this.oHost._setNavigationDisabled(oNavDisabledBinding.getValue());
                    // listen to changes on navigationDisabled and propagate to host
                    oNavDisabledBinding.attachChange(function (oEvent) {
                        this.oHost._setNavigationDisabled(oEvent.getSource().getValue());
                    }.bind(this));
                }
            }
        },

        /**
         * Check if Navigation is disabled
         *
         * @private
         * @since 1.109.0
         */

        getNavigationDisabled: function () {
            return this.oModel.getProperty("/navigationDisabled");
        },

        /**
         * Disable the navigation on tiles and widgets
         * @param {boolean} bNavigation true or false
         *
         * @private
         * @since 1.109.0
         */

        setNavigationDisabled: function (bNavigation) {
            this.oModel.setProperty("/navigationDisabled", bNavigation);
        },

        /**
         * Returns a unique id which does not yet exist on the WorkPage.
         * Optionally an array of existing IDs can be given as an argument.
         * This can be helpful if new entities are created in a loop but not yet entered into the model.
         *
         * @since 1.112.0
         * @param {string[]} [aExistingIds] An array of existing IDs as strings.
         * @returns {string} A unique ID.
         * @private
         */
        _generateUniqueId: function (aExistingIds) {
            // make a copy to not change the passed array.
            let aIds = (aExistingIds || []).concat([]);
            let oWorkPage = this.oModel.getProperty("/data/workPage");
            let fnCollectIds = this._collectIds.bind(this);

            aIds = aIds.concat(fnCollectIds(oWorkPage));

            (oWorkPage.rows || []).forEach(function (oRow) {
                aIds = aIds.concat(fnCollectIds(oRow));
                (oRow.columns || []).forEach(function (oColumn) {
                    aIds = aIds.concat(fnCollectIds(oColumn));
                    (oColumn.cells || []).forEach(function (oCell) {
                        aIds = aIds.concat(fnCollectIds(oCell));
                        (oCell.widgets || []).forEach(function (oWidget) {
                            aIds = aIds.concat(fnCollectIds(oWidget));
                        });
                    });
                });
            });

            aIds = aIds.filter(function (sId) {
                return !!sId;
            });

            return utils.generateUniqueId(aIds);
        },

        /**
         * Collects the id and all the configuration ids of an entity on the WorkPage.
         *
         * @param {object} oEntity An entity on the WorkPage
         * @returns {string[]} An array of all ids related to this entity.
         * @private
         * @since 1.116.0
         */
        _collectIds: function (oEntity) {
            let aIds = [oEntity.id];
            let aSettings = oEntity.configurations || [];

            let aConfigIds = aSettings.map(function (oConfig) {
                return oConfig.id;
            });

            return aIds.concat(aConfigIds);
        }
    });
});
