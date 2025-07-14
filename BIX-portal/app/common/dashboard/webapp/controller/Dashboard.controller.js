sap.ui.define([
    "sap/base/util/ObjectPath",
    "sap/base/util/deepExtend",
    "sap/m/library",
    "sap/ui/core/Fragment",
    "sap/ui/core/library",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "bix/common/library/control/Modules",
    "bix/common/library/home/library/ushell/utils",
    "bix/common/library/home/library/ushell/utils/workpage/WorkPageVizInstantiation",
    "bix/common/library/home/library/ushell/components/workPageBuilder/controller/WorkPageBuilder.accessibility",
    "bix/common/library/home/library/ushell/components/workPageBuilder/controller/WorkPageBuilder.layout",
    "bix/common/library/home/library/ushell/components/workPageBuilder/controller/WorkPageBuilder.controller",
    "sap/ui/integration/library",
    "sap/ui/core/EventBus"


],
    function (
        ObjectPath,
        deepExtend,
        mLibrary,
        Fragment,
        coreLibrary,
        Controller,
        JSONModel,
        Modules,
        utils,
        WorkPageVizInstantiation,
        WorkPageBuilderAccessibility,
        WorkPageBuilderLayoutHelper,
        WorkPageBuilder,
        integrationLibrary,
        EventBus
    ) {
        "use strict";

        let _this, CreateMenuList, EditMenuList, DeleteMenuList, MoveMenuList;
        let SelectedParentIndex, SelectedSeq, ParentFlag, ChildrenFlag;
        let widgetlist = [];
        let WorkPageBuilderData;
        let bInitCheck = false;
        let etag
        let oI18n
        let ValueState, CONFIGURATION_LEVELS, MIN_GRID_COLUMN_WIDTH, MAX_GRID_COLUMN_WIDTH, STEP_SIZE
        let MAX_COLUMNS_PER_ROW, LoadState, InvisibleMessageMode, CardPreviewMode, aVisualizations;


        return Controller.extend("bix.common.dashboard.controller.Home", {
            WorkPageBuilder: WorkPageBuilder,
            _oEventBus: EventBus.getInstance(),

            onInit: function () {
                _this = this;
                this.getView().setModel(new JSONModel({ "userName": null, "month": null, "deadline": null }), "information");
                WorkPageBuilderData = {
                    visualizations: {
                        nodes: []
                    },
                    workPage: {
                        id: "standard-workpage",
                        contents: {
                            descriptor: {
                                value: {
                                    title: "Home",
                                    description: ""
                                },
                                schemaVersion: "3.2.0"
                            },
                            rows: [
                            ]
                        },
                        usedVisualizations: { nodes: [] }
                    }

                };
                const myRoute = this.getOwnerComponent().getRouter().getRoute("Home");
                myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
                this.getView().setModel(new JSONModel({ edit: false }), "editUi");
            },
            onMyRoutePatternMatched: async function (oEvent) {
                let oDateModel = this.getOwnerComponent().getModel("cm");
                

                let aData = await oDateModel.bindContext('/Version').requestObject();
                let oData = aData.value.find((data) => data.tag === 'C')
                let sTodayYear = oData.year
                let sTodayMonth = oData.month

                this.getView().setModel(new JSONModel(oData), "date")
                // let sUserName = Modules.getSalesThis().getOwnerComponent().getModel("userInfo").getData().userName;
                // let sTodayMonth = (new Date().getMonth() + 1).length > 1 ? (new Date().getMonth() + 1) : "0" + (new Date().getMonth() + 1);
                // let sTodayMonth = (new Date().getMonth()).length > 1 ? (new Date().getMonth()) : "0" + (new Date().getMonth()); // 지난달 로직 임시로 -1, datepicker Date형식으로 기입 필요
                // let sTodayYear = new Date().getFullYear();
                // this.getView().getModel('information').setProperty("/userName", sUserName);
                this.getView().getModel('information').setProperty("/month", sTodayYear + "-" + sTodayMonth);
                this.getView().getModel('information').setProperty("/deadline", sTodayYear + "-" + sTodayMonth);
                this.byId('dashinfo').setText('사용자 님, ' + sTodayYear + "-" + sTodayMonth + ' 마감 실적 기준 현황입니다.');

                //다른 manifest에 속한 카드에 초기 데이터 넘겨주기 세션스토리지
                sessionStorage.setItem("initSearchModel", 
                    JSON.stringify({ 
                        yearMonth: new Date(sTodayYear + "-" + sTodayMonth),
                        orgId : "5"
                    })
                )

                // Eventbus publish를 위한 change 이벤트 발생
                // this.byId("monthpicker").
                // 
                // 
                // 
                // 
                // 
                // 
                // 
                // ({value: new Date()});

                oI18n = _this.getView().getModel("i18n").getResourceBundle();
                widgetlist = [];
                WorkPageBuilderData = {
                    visualizations: {
                        nodes: []
                    },
                    workPage: {
                        id: "standard-workpage",
                        contents: {
                            descriptor: {
                                value: {
                                    title: "Home",
                                    description: ""
                                },
                                schemaVersion: "3.2.0"
                            },
                            rows: [
                            ]
                        },
                        usedVisualizations: { nodes: [] }
                    }

                };
                CreateMenuList = [];
                EditMenuList = [];
                DeleteMenuList = [];
                MoveMenuList = [];
                bInitCheck = false;

                let oModel = this.getOwnerComponent().getModel("publish");
                
                // card list
                let sWidgetPath = `/get_all_card_list`;
                const oWidgetBinding = oModel.bindContext(sWidgetPath);
                let oWidgetRequest= await oWidgetBinding.requestObject();
                
                // content
                let sContentPath = `/get_dashboard_display_content`;
                const oContentBinding = oModel.bindContext(sContentPath);
                let oContentRequest= await oContentBinding.requestObject();

                this._setHome([], oWidgetRequest.value, oContentRequest.value);

                // let aData = oResult[0][1];
                // let customOrder = ["Main", "Team", "My Work"];
                // function sortData(aData) {
                //     let aCustomItems = [];
                //     let aOtherItems = [];
                //     aData.forEach(function (item) {
                //         if (!customOrder.includes(item.name)) {
                //             aOtherItems.push(item);
                //         }
                //     });

                //     aOtherItems.sort(function (a, b) {
                //         return a.seq - b.seq;
                //     });

                //     aData.forEach(function (item) {
                //         if (customOrder.includes(item.name)) {
                //             aCustomItems.push(item);
                //         }
                //     })
                //     aCustomItems.sort(function (a, b) {
                //         return customOrder.indexOf(a.name) - customOrder.indexOf(b.name);
                //     });
                //     aCustomItems.filter((item) => {
                //         item.name = oI18n.getText(item.name.toLowerCase().replace(" ", "_"));
                //         return item;
                //     })
                //     return aCustomItems.concat(aOtherItems);
                // }
                // let aSortedData = sortData(aData);
                // this.getView().setModel(new JSONModel(aSortedData), 'upmenu');
                _this.getView().getModel("editUi").setProperty("/edit", false);
                this.byId('workpagesBuilder').setShowFooter(false);
                _this._globalVarSet();

                // FCL setBusy 해제
                this._oEventBus.publish("mainApp", "busy", {loaded: true});
            },

            _setHome: async function (tile, card, content) {
                await this._tileSetting(tile);
                await this._cardSetting(card);

                widgetlist = JSON.stringify(widgetlist);
                await this._contentSetting(content);
                this.setWidgetData();
                if (this.oComponent) {
                    this.oComponent.setPageData(WorkPageBuilderData);
                }
            },

            _tileSetting: function (data) {
                for (let i = 0; i < data.length; i++) {
                    let oWidget = Modules.tileSetting(data[i]);
                    widgetlist.push({
                        id: oWidget.id,
                        src: JSON.stringify(oWidget),
                        type: oWidget.type
                    })
                }
            },
            _cardSetting: function (data) {
                for (let i = 0; i < data.length; i++) {
                    let oWidget = Modules.cardSetting(data[i]);
                    widgetlist.push({
                        id: oWidget.id,
                        src: JSON.stringify(oWidget),
                        type: oWidget.type
                    })
                }
            },
            _contentSetting: function (data) {
                if (data.length === 0) {
                    WorkPageBuilderData.workPage.contents.rows = [];
                }
                for (let i = 0; i < data.length; i++) {
                    let oTemp = {
                        id: globalThis.crypto.randomUUID(),
                        descriptor: {
                            schemaVersion: "3.2.0",
                            value: { title: data[i].title }
                        },
                        columns: []
                    }
                    WorkPageBuilderData.workPage.contents.rows.push(oTemp)
                    for (let j = 0; j < data[i].children.length; j++) {
                        let oTemp2 = {
                            descriptor: {
                                schemaVersion: "3.2.0",
                                value: { columnWidth: data[i].children[j].column_width }
                            },
                            cells: []
                        }
                        WorkPageBuilderData.workPage.contents.rows[i].columns.push(oTemp2)
                        for (let k = 0; k < data[i].children[j].children.length; k++) {
                            let oTemp3 = {
                                widgets: []
                            }
                            WorkPageBuilderData.workPage.contents.rows[i].columns[j].cells.push(oTemp3)
                            for (let z = 0; z < data[i].children[j].children[k].children.length; z++) {
                                let oTemp3 = {
                                    visualization: { id: data[i].children[j].children[k].children[z].widget_id }
                                }
                                WorkPageBuilderData.workPage.contents.rows[i].columns[j].cells[k].widgets.push(oTemp3)
                            }
                        }
                    }
                }

            },
            _globalVarSet: async function () {
                oI18n = this.getView().getModel("i18n").getResourceBundle();
                this._fnDeleteRowHandler = this.deleteRow.bind(this);
                this._fnDeleteCellHandler = this.deleteCell.bind(this);
                this._fnSaveCardConfiguration = this._onSaveCardEditor.bind(this);
                this._fnResetCardConfiguration = this._onResetCardConfigurations.bind(this);

                ValueState = coreLibrary.ValueState;
                CONFIGURATION_LEVELS = ["PR", "CO", "PG" /*, "US"*/];
                MIN_GRID_COLUMN_WIDTH = 6;
                MAX_GRID_COLUMN_WIDTH = 24;
                STEP_SIZE = 2;
                MAX_COLUMNS_PER_ROW = 4; //섹션 갯수
                LoadState = mLibrary.LoadState;
                InvisibleMessageMode = coreLibrary.InvisibleMessageMode;
                CardPreviewMode = integrationLibrary.CardPreviewMode;
                aVisualizations = WorkPageBuilderData.visualizations.nodes;

                this.oWorkPageBuilderAccessibility = new WorkPageBuilderAccessibility();
                this.oWorkPageVizInstantiation = await WorkPageVizInstantiation.getInstance();
            },

            workPageBuilderComponentCreated: function (oEvent) {
                this.oComponent = oEvent.getParameter("component");
                this.oComponent.setShowPageTitle(false);
                this.oComponent.setNavigationDisabled(true);
                this.oComponent.setEditMode(false); //****** */
                this.oComponent.attachEvent("visualizationFilterApplied", this.getVisualizations, this);
                this.oComponent.setPageData(WorkPageBuilderData);
                // sap.ui.getCore().byId(this.byId('workpagesBuilder').mAggregations.content.mAggregations.mainContents[1].mAssociations.component+'---workPageBuilder--workPage').setBreakpoint('st-lp-4')

            },

            getVisualizations: function (oEvent) {

                let iSkip = oEvent.getParameter("pagination").skip;
                let iTop = oEvent.getParameter("pagination").top;
                let aTypes = oEvent.getParameter("types") || [];
                let sSearchTerm = oEvent.getParameter("search");
                let aVisualizations = WorkPageBuilderData.visualizations.nodes;
                if (aTypes.length > 0) {
                    aVisualizations = aVisualizations.filter(function (oViz) {
                        return aTypes.indexOf(oViz.type) > -1;
                    });
                }

                if (sSearchTerm) {
                    aVisualizations = aVisualizations.filter(function (oViz) {
                        return oViz.descriptor.value["sap.app"].title.indexOf(sSearchTerm) > -1;
                    });
                }
                // Fake server call time
                setTimeout(function () {
                    this.oComponent.setVisualizationData({
                        visualizations: {
                            totalCount: aVisualizations.length,
                            nodes: aVisualizations.slice(iSkip, iSkip + iTop)
                        }
                    });
                }.bind(this), 2000);

            },
            _viewDataSet: function () {
                let oWorkPage = this.byId("workpagesBuilder");
                let loadData;
                if (localStorage.getItem("workpageData")) {
                    loadData = localStorage.getItem("workpageData");

                } else {
                    loadData = null;
                }

                this.oModel = new JSONModel({
                    maxColumns: MAX_COLUMNS_PER_ROW,
                    editMode: true,
                    previewMode: false,
                    loaded: false,
                    navigationDisabled: false,
                    showFooter: false,
                    showPageTitle: false,
                    data: {
                        workPage: loadData === null ? null : loadData.workPage,
                        visualizations: [],
                        usedVisualizations: loadData === null ? [] : loadData.usedVisualizations
                    }
                });
                this.oModel.setSizeLimit(Infinity);

                oWorkPage.bindElement({
                    path: "/data/workPage",
                });

                this.getView().setModel(this.oModel);
                this.getView().getModel();
                WorkPageBuilderLayoutHelper.register(oWorkPage);
                this.getView().setModel(WorkPageBuilderLayoutHelper.getModel(), "viewSettings");
            },

            setWidgetData: function () {
                let Visualizations = JSON.parse(widgetlist);
                Visualizations.forEach(viz => {
                    WorkPageBuilderData.visualizations.nodes.push(JSON.parse(viz.src));
                    WorkPageBuilderData.workPage.usedVisualizations.nodes.push(JSON.parse(viz.src));
                });

            },

            _onClear: function () {
                Modules.globalClear("Clear", this);
                Modules.globalClear("Input", this);
                Modules.globalClear("Required", this);
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
                this.oModel.setProperty("/showPageTitle", !!bVisible);
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
                let aUsedVisualizations = ObjectPath.get(
                    "workPage.usedVisualizations.nodes",
                    oPageData
                );
                let oWorkPageContents = ObjectPath.get(
                    "workPage.contents",
                    oPageData
                );

                if (aUsedVisualizations && aUsedVisualizations.length > 0) {
                    // create a map for the usedVisualizations using the id as a key.
                    oMappedVisualizations = aUsedVisualizations.reduce(function (
                        oAcc,
                        oViz
                    ) {
                        oAcc[oViz.id] = oViz;
                        return oAcc;
                    },
                        {});
                }

                this.oModel.setProperty(
                    "/data/usedVisualizations",
                    oMappedVisualizations
                );
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
                let oMappedVisualizations =
                    this.oModel.getProperty("/data/usedVisualizations") || {};
                return {
                    workPage: {
                        contents: this.oModel.getProperty("/data/workPage"),
                        usedVisualizations: {
                            nodes: Object.values(oMappedVisualizations),
                        },
                    },
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
             *
             * @param {sap.base.Event} oEvent The press event.
             * @param {{ widgetContextPath: string, widgetConfigurations: Configuration[] }} oContextData The context data object.
             * @since 1.117.0
             * @private
             */
            _onResetCardConfigurations: function (oEvent, oContextData) {
                let oDialog = oEvent.getSource().getParent();
                let aWidgetConfigurations = oContextData.widgetConfigurations;
                let sWidgetConfigurationsPath =
                    oContextData.widgetContextPath + "/configurations";
                let aRemainingConfigurations = aWidgetConfigurations.filter(function (
                    oConfig
                ) {
                    return oConfig.level !== "PG";
                });

                this.oModel.setProperty(
                    sWidgetConfigurationsPath,
                    aRemainingConfigurations
                );

                this.getOwnerComponent().fireEvent("workPageEdited");

                oDialog.close();
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
                let sWidgetConfigurationsPath =
                    sWidgetContextPath + "/configurations";
                let oCurrentSettings = oCardEditor.getCurrentSettings();
                let aWidgetConfigurations =
                    this.oModel.getProperty(sWidgetConfigurationsPath) || [];

                let oWidgetConfiguration = aWidgetConfigurations.find(function (
                    oConfiguration
                ) {
                    return oConfiguration.level === "PG";
                });

                if (!oWidgetConfiguration) {
                    oWidgetConfiguration = {};
                    oWidgetConfiguration.id = this._generateUniqueId();
                    oWidgetConfiguration.level = "PG";
                    oWidgetConfiguration.settings = {
                        value: oCurrentSettings,
                        schemaVersion: "3.2.0",
                    };
                    aWidgetConfigurations.push(oWidgetConfiguration);
                } else {
                    aWidgetConfigurations = aWidgetConfigurations.map(function (
                        oConfiguration
                    ) {
                        if (oConfiguration.level === "PG") {
                            oConfiguration.settings.value = deepExtend(
                                {},
                                oConfiguration.settings.value,
                                oCurrentSettings
                            );
                        }
                        return oConfiguration;
                    });
                }

                this.oModel.setProperty(
                    sWidgetConfigurationsPath,
                    aWidgetConfigurations
                );

                oCard.setManifestChanges([oCurrentSettings]);

                this.getOwnerComponent().fireEvent("workPageEdited");

                oDialog.close();
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
            },

            onDragStart: function (oEvent) {
                let oDraggedItem = oEvent.getParameter("dragSession").getDragControl();
                oEvent.getParameter("dragSession").setComplexData("draggedData", {
                    itemId: oDraggedItem.getId()
                });
            },

            onDrop: async function (oEvent) {

                let oDraggedItem = oEvent.getParameter("draggedControl");
                let oDroppedItem = oEvent.getParameter("droppedControl");

                let oDraggedContext = oDraggedItem.getBindingContext("editableModel");
                let oDroppedContext = oDroppedItem.getBindingContext("editableModel");

                // 1. seq값들을 모델 생성해서 담을 때, 기존 seq가 존재하는지 확인하고 없으면

                let oModel = this.getView().getModel("editableModel");
                let aItems = oModel.getData();

                let iDraggedPath = oDraggedContext.sPath[1]
                let iDroppedPath = oDroppedContext.sPath[1]

                let iDraggedIndex = this._findItemIndex(aItems[iDraggedPath].children, oDraggedContext.getProperty("seq"));
                let iDroppedIndex = this._findItemIndex(aItems, oDroppedContext.getProperty("seq"));

                // parentSeq : 드롭 된 Parent Seq
                // sSeq : drag 된 seq
                let sSeq = aItems[iDraggedPath].children[0].seq
                let sETag = aItems[iDraggedPath].children[0]["@etag"]
                let sParentSeq = aItems[iDroppedPath].seq


                let oData = {
                    seq: sSeq,
                    parentSeq: sParentSeq,
                    "@etag": sETag
                }
                MoveMenuList.push(oData)

                let oDraggedItemData = aItems[iDraggedPath].children.splice(iDraggedIndex, 1)[0];

                aItems[iDroppedPath].children.splice(iDroppedIndex, 0, oDraggedItemData);
                aItems.forEach(function (item, index) {
                    item.sprint = index + 1;
                });
                //결과 반영하기위한 로직
                oModel.setData(aItems);
                oModel.refresh(true);

                //DB전송전 저장
                this.aPendingChanges = aItems.map(function (item) {
                    return {
                        uiSeq: item.uiSeq
                    };
                });
            },
            _findItemIndex: function (aItems, sSeq) {
                for (let i = 0; i < aItems.length; i++) {
                    if (aItems[i].seq === sSeq) {
                        return i;
                    }
                }
                return -1;
            },

            onSelectTab: async function (oEvent) {
                if (oEvent.getParameters().previousKey == oEvent.getParameters().selectedKey) {
                    return;
                }
                let sMenuPath = oEvent.getParameter("selectedItem").getBindingContext("upmenu").getPath();
                let sSelectedItem = _this.getView().getModel("upmenu").getProperty(sMenuPath);

                if (sSelectedItem.type === "user") {
                    _this.getView().getModel("editUi").setProperty("/edit", true);
                } else {
                    _this.getView().getModel("editUi").setProperty("/edit", false);
                    this.oComponent.setEditMode(false);
                    this.byId('workpagesBuilder').setShowFooter(false);
                }

                WorkPageBuilderData.workPage.contents.rows = [];
                let selectedmenu = oEvent.getParameters().selectedKey
                const sContentUrl = "/odata/v4/home/GetMyHomeContent?$filter=menuSeq eq '" + selectedmenu + "'";
                const sMenuUrl = "/odata/v4/home/GetHomeMenuView?$filter=seq eq '" + selectedmenu + "'";
                await Promise.all([
                    Modules.getTree(sContentUrl, true),
                    Modules.getTree(sMenuUrl, true),
                ]).then(async (oResult) => {
                    _this.getView().setModel(new JSONModel(oResult[1][1][0]), 'menuModel')
                    const filteredResults = oResult[0][1].filter(item => item.menuSeq === selectedmenu)
                    await this._contentSetting(filteredResults);
                    await _this.oComponent.setPageData(WorkPageBuilderData);
                })
                    .catch((xhr) => {
                        Modules._xhrErrorMessage(xhr)
                    })

            },
            onEdit: async function (oEvent) {
                let oButton = oEvent.getSource();
                await Modules.openPopover(this, 'skhomeui.view.fragment.Edit', "menuAction", oButton);
            },
            onMyWork: async function () {
                Modules.openDialog(this, "skhomeui.view.fragment.EditMenu", "EditMenuDialog")
            },
            onWorkEdit: async function () {
                this.oComponent.setEditMode(true);
                this.byId('workpagesBuilder').setShowFooter(true);
            },

            onMenuAction: async function (oEvent) {
                let oItem = oEvent.getParameter('item');
                let sId = oItem.getId();
                const sEditableMenuUrl = "/odata/v4/home/GetEditableMenu?$orderby=name";
                const sParentMenuUrl = "/odata/v4/home/GetParentMenu";
                await Promise.all([
                    Modules.getTree(sEditableMenuUrl, true),
                    Modules.get(sParentMenuUrl, true),
                ]).then(async (oResult) => {
                    this.getView().setModel(new JSONModel(oResult[0][1]), "editableModel");
                    _this.getView().setModel(new JSONModel(oResult[1].value), "parentMenuModel");
                })

                if (sId.includes("menu")) {
                    Modules.openDialog(this, "skhomeui.view.fragment.EditMenu", "EditMenuDialog")
                } else if (sId.includes("layout")) {
                    this.oComponent.setEditMode(true);
                    this.byId('workpagesBuilder').setShowFooter(true);
                }
            },
            onAddMenu: async function () {
                Modules.openDialog(this, "skhomeui.view.fragment.AddMenu", "AddMenuDialog")
            },
            onSaveAddMenu: async function () {
                let iNewSeq = await Modules.getSeq('WM');

                let bCheck = Modules.globalCheck("Required", this);
                if (!bCheck) {
                    Modules.messageBox('warning', oI18n.getText("please_enter_the_required_information"))
                    return;
                }

                let oView = this.getView();
                let sInputValue = oView.byId("menuNameInput").getValue();
                let sSelectedMenuSeq = this.getView().getModel('parentMenuModel').getData()[0].seq
                let bNewParentMenu = false;
                let oNewMenu;

                oNewMenu = {
                    name: sInputValue,
                    parentSeq: sSelectedMenuSeq,
                    seq: iNewSeq.toString(),
                }



                Modules.messageBoxConfirm('confirm', oI18n.getText("are_you_sure_you_want_to_create_a_menu"), oI18n.getText("create_menu")).then(async (check) => {
                    if (check) {
                        if (bNewParentMenu === true) {
                            let oModel = _this.getView().getModel("parentMenuModel");
                            let oData = oModel.getData();
                            let oTemp = {
                                name: sInputValue,
                                seq: iNewSeq.toString(),
                            }
                            oData.push(oTemp)

                            let oTempModel = this.getView().getModel("editableModel");
                            let oTempData = oTempModel.getData();
                            oTempData.push(oNewMenu);
                            oTempModel.setData(oTempData);
                            oTempModel.refresh(true);

                        } else {
                            let oTempModel = this.getView().getModel("editableModel");
                            let oTempData = oTempModel.getData();
                            let sSelectedKey = _this.getView().getModel('parentMenuModel').getData()[0].seq
                            let sSelectedIndex;

                            for (let i = 0; i < oTempData.length; i++) {
                                if (oTempData[i].seq === sSelectedKey) {
                                    sSelectedIndex = i;
                                }
                            }

                            oTempData[sSelectedIndex].children.push(oNewMenu);
                            oTempModel.setData(oTempData);
                            oTempModel.refresh(true);

                        }
                        CreateMenuList.push(oNewMenu);

                        this.onCancelMenu();
                    }
                })
            },
            onCancelMenu: function () {
                Modules.closeDialog(this, "AddMenuDialog");
                let oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("Home");
            },
            onSaveMenu: async function () {
                let bCheck = Modules.globalCheck("Required", this);
                if (!bCheck) {
                    Modules.messageBox('warning', oI18n.getText("please_enter_the_required_information"))
                    return;
                }


                Modules.messageBoxConfirm('confirm', oI18n.getText("are_you_sure_you_want_to_save_it"), oI18n.getText("save_my_work_menu")).then(async (check) => {
                    if (check) {
                        // Modules.getSalesThis().onBusyIndicatorShow();

                        const sUrl = "/odata/v4/home/Menu";
                        const sGetMenuUrl = "/odata/v4/home/GetHomeMenuView";
                        let aPromiseAllCreate = [];
                        /* 생성 */
                        for (let i = 0; i < CreateMenuList.length; i++) {
                            let oNewMenu;

                            if (CreateMenuList[i].parentSeq === undefined) { // 새로운 부모 메뉴 생성인 경우
                                oNewMenu = {
                                    name: CreateMenuList[i].name,
                                    seq: CreateMenuList[i].seq,
                                    type: "user"
                                }
                            } else if (CreateMenuList[i].children === undefined) { // 자식 메뉴를 생성하는 경우
                                oNewMenu = {
                                    name: CreateMenuList[i].name,
                                    parentSeq: CreateMenuList[i].parentSeq,
                                    seq: CreateMenuList[i].seq,
                                    type: "user"
                                }
                            }

                            aPromiseAllCreate.push(Modules.post(sUrl, oNewMenu, true))
                            // aPromiseAllCreate.push(Modules.get("/odata/v4/home/SetHomeMenuTarget(menuSeq='" + CreateMenuList[i].seq + "')",true));

                        }
                        aPromiseAllCreate.push(Modules.get(sGetMenuUrl, true))
                        await Promise.all(aPromiseAllCreate).then(async (data) => {
                            let aPromiseRest = [];
                            let oData = data[data.length - 1].value;
                            let iCount = oData.length;


                            /* 수정 */
                            // 이름 변경
                            for (let i = 0; i < iCount; i++) {
                                for (let j = 0; j < EditMenuList.length; j++) {
                                    if (oData[i].seq === EditMenuList[j].seq) {

                                        const sMenuUrl = "/odata/v4/home/GetHomeMenuView?$filter=seq eq '" + EditMenuList[j].seq + "'";


                                        await Modules.getTree(sMenuUrl).then(async (oResult) => {
                                            _this.getView().setModel(new JSONModel(oResult[1][0]), 'menuModel')
                                        });


                                        let oTemp = {
                                            name: EditMenuList[j].name
                                        }

                                        let sPatchPath = "/odata/v4/home/Menu('" + oData[i].seq + "')";
                                        let etag = _this.getView().getModel("menuModel").getData()['@etag']


                                        aPromiseRest.push(Modules.patchETag(sPatchPath, oTemp, etag, true));
                                    }
                                }
                            }

                            // 순서 변경
                            let moveData = MoveMenuList
                            for (let i = 0; i < moveData.length; i++) {
                                let oTemp = {
                                    parentSeq: moveData[i].parentSeq
                                }

                                let sPatchPath = "/odata/v4/home/Menu('" + moveData[i].seq + "')";
                                aPromiseRest.push(Modules.patchETag(sPatchPath, oTemp, moveData[i]["@etag"], true));
                                Modules.MessageToastCUDMsg("U");
                            }
                            await Promise.all(aPromiseRest).then(async () => {
                                /* 삭제 */
                                let aPromiseDelete = [];
                                for (let i = 0; i < iCount; i++) {
                                    for (let j = 0; j < DeleteMenuList.length; j++) {
                                        if (oData[i].seq === DeleteMenuList[j].seq) {
                                            let sDeletePath = "/odata/v4/home/Menu('" + oData[i].seq + "')";

                                            const sMenuUrl = "/odata/v4/home/GetHomeMenuView?$filter=seq eq '" + oData[i].seq + "'";


                                            await Modules.getTree(sMenuUrl).then(async (oResult) => {
                                                _this.getView().setModel(new JSONModel(oResult[1][0]), 'menuModel')
                                            });



                                            let etag = _this.getView().getModel("menuModel").getData()['@etag']

                                            aPromiseDelete.push(Modules.deleteETag(sDeletePath, etag, true));

                                        }
                                        if (DeleteMenuList[j].seq === this.byId('iconTabHeader').getSelectedKey()) {
                                            this.onMyRoutePatternMatched();

                                        }
                                    }
                                }
                                await Promise.all(aPromiseDelete).then(async () => {
                                    Modules.closeDialog(this, "EditMenuDialog");
                                    Modules.getSalesThis().onBusyIndicatorHide();
                                    await _this.onMyRoutePatternMatched();
                                }).catch((xhr) => {
                                    Modules._xhrErrorMessage(xhr, false, _this._errorAction);
                                })
                                Modules.MessageToastCUDMsg("U");
                            }).catch((xhr) => {
                                Modules._xhrErrorMessage(xhr, false, _this._errorAction);
                            })
                        }).catch((xhr) => {

                            Modules._xhrErrorMessage(xhr);
                        });
                    }
                })
            },
            _errorAction: function () {
                // Modules.getSalesThis().onBusyIndicatorShow();
                if (_this.byId("EditMenuDialog")) {
                    Modules.closeDialog(_this, "EditMenuDialog");
                }
                _this.onMyRoutePatternMatched();
            },
            onCloseEditMenuDialog: async function () {
                Modules.messageBoxConfirm('warning', oI18n.getText('if_you_want_to_close') + "\n" + oI18n.getText('menu_does_not_change')).then(async (bCheck) => {
                    if (bCheck) {
                        // Modules.getSalesThis().onBusyIndicatorShow();

                        Modules.closeDialog(this, "EditMenuDialog");
                        _this.getView().getModel("editUi").setProperty("/edit", false);
                        this.oComponent.setEditMode(false);
                        this.byId('workpagesBuilder').setShowFooter(false);
                        _this.onMyRoutePatternMatched();
                    }
                })
            },
            onEditMenu: async function (oEvent) {
                let oButton = oEvent.getSource();
                let sPath = oEvent.getSource().oPropagatedProperties.oBindingContexts.editableModel.sPath;
                SelectedParentIndex = sPath.split("/")[1];
                let oModel = this.getView().getModel("editableModel");
                let oData = oModel.getData();
                ChildrenFlag = false;
                ParentFlag = false;

                if (sPath.includes("children")) { // 하위 메뉴를 선택한 경우
                    let sSelectedChildrenIndex = sPath.split("/")[3];
                    SelectedSeq = oData[SelectedParentIndex].children[sSelectedChildrenIndex].seq;
                } else { // 부모 메뉴를 선택한 경우
                    if (oData[SelectedParentIndex].children.length > 0) { // 부모 메뉴안에 하위 메뉴가 존재하는 경우
                        ChildrenFlag = true;
                    };

                    ParentFlag = true;
                    SelectedSeq = oData[SelectedParentIndex].seq;
                }
                await Modules.openPopover(this, 'skhomeui.view.fragment.EditMenuSelection', "EditMenuSelection", oButton);
            },
            EditMenuSelection: function (oEvent) {
                let oItem = oEvent.getParameter('item');
                let sId = oItem.getId();
                if (sId.includes("changeMenu")) {
                    _this.onEditMenuName();
                } else if (sId.includes("deleteMenu")) {
                    _this.onDeleteMenu();
                }
            },
            onEditMenuName: async function () {
                Modules.openDialog(this, "skhomeui.view.fragment.EditMenuName", "EditMenuNameDialog")
            },
            onDeleteMenu: async function () {
                let oModel = this.getView().getModel("editableModel");
                let oData = oModel.getData();

                if (!ParentFlag) { // 자식 메뉴를 삭제하는 경우
                    Modules.messageBoxConfirm('warning', oI18n.getText("are_you_sure_you_want_to_delete_the_menu"), oI18n.getText("delete_menu")).then(async (check) => {
                        if (check) {
                            for (let i = 0; i < oData.length; i++) {
                                if (oData[i].children !== undefined) {
                                    let iChildren = oData[i].children.length;
                                    for (let j = 0; j < iChildren; j++) {
                                        if (oData[i].children[j].seq === SelectedSeq) {
                                            let oTempForDelete = {
                                                seq: oData[i].children[j].seq
                                            };

                                            DeleteMenuList.push(oTempForDelete);
                                            oData[i].children.splice(j, 1);

                                            oModel.refresh();
                                        }
                                    }
                                }
                            }
                        }
                    })
                } else if (ParentFlag) { // 부모 메뉴를 삭제하는 경우
                    Modules.messageBoxConfirm('warning', oI18n.getText("delete_menu"), oI18n.getText("delete_menu")).then(async (check) => {
                        if (check) {
                            let oParentMenuModel = _this.getView().getModel("parentMenuModel");
                            let oTemp = oParentMenuModel.getData();

                            for (let i = 0; i < oData.length; i++) {
                                if (oData[i].seq === SelectedSeq) {
                                    let oTempForDelete = {
                                        seq: oData[i].seq
                                    };

                                    DeleteMenuList.push(oTempForDelete);
                                    if (oData[i].children.length > 0) {
                                        for (let j = 0; j < oData[i].children.length; j++) {
                                            let oTempForDeletechildren = {
                                                seq: oData[i].children[j].seq
                                            }
                                            DeleteMenuList.push(oTempForDeletechildren);
                                        }
                                    }
                                    oTemp.splice(i, 1);
                                    oData.splice(i, 1);

                                    oModel.refresh();
                                }
                            }
                        }
                    })
                }
            },
            onSaveMenuName: async function () {
                let sName = this.byId("EditNameInput").getValue();

                if (sName === "") {
                    Modules.messageBox('warning', oI18n.getText("please_enter_new_menu_name"))
                    return;
                }
                if (sName === "My Work") {
                    Modules.messageBox('warning', oI18n.getText("mywork_cannot_be_used"))
                    return;
                }

                let oData = {
                    name: sName,
                    seq: SelectedSeq,
                };

                Modules.messageBoxConfirm('confirm', "'" + sName + "'" + "\n" + oI18n.getText("are_you_sure_you_want_to_change_menu_name"), oI18n.getText("change_menu_name")).then(async (check) => {
                    if (check) {
                        let oTempModel = this.getView().getModel("editableModel");
                        let oTempData = oTempModel.getData();

                        if (ParentFlag) { // 부모 메뉴 메뉴명 변경인 경우
                            for (let i = 0; i < oTempData.length; i++) {
                                if (oTempData[i].seq === SelectedSeq) {
                                    let oModel = _this.getView().getModel("parentMenuModel");
                                    let oData = oModel.getData();
                                    oData[i].name = sName;

                                    oTempData[i].name = sName;
                                    oTempModel.setData(oTempData);
                                    oTempModel.refresh(true);
                                }
                            }
                        } else if (!ParentFlag) { // 자식 메뉴 메뉴명 변경인 경우
                            let oChildren = oTempData[SelectedParentIndex].children;
                            let iCount = oChildren.length;

                            for (let i = 0; i < iCount; i++) {
                                if (oTempData[SelectedParentIndex].children[i].seq === SelectedSeq) {
                                    oTempData[SelectedParentIndex].children[i].name = sName;
                                    oTempModel.setData(oTempData);
                                    oTempModel.refresh(true);
                                }
                            }
                        }

                        EditMenuList.push(oData);
                        Modules.closeDialog(this, "EditMenuNameDialog");
                    }
                })
            },
            onCancelEditMenu: function () {
                Modules.closeDialog(this, "EditMenuNameDialog");
            },
            onSave: async function () {
                let oData = this.oComponent.getPageData();
                let oRows = oData.workPage.contents.rows;
                let oContent = [];
                for (let i = 0; i < oRows.length; i++) {
                    let iNewSeq = await Modules.getSeq('HC');
                    let oTemp = {
                        seq: iNewSeq,
                        title: oRows[i].descriptor.value.title,
                        uiSeq: i,
                    }
                    oContent.push(oTemp);
                    for (let j = 0; j < oRows[i].columns.length; j++) {
                        let iNewSeq2 = await Modules.getSeq('HC');
                        let oTemp2 = {
                            seq: iNewSeq2,
                            parentSeq: oTemp.seq,
                            uiSeq: j,
                            columnWidth: oRows[i].columns[j].descriptor.value.columnWidth
                        }
                        oContent.push(oTemp2);
                        for (let k = 0; k < oRows[i].columns[j].cells.length; k++) {
                            let iNewSeq3 = await Modules.getSeq('HC');
                            let oTemp3 = {
                                seq: iNewSeq3,
                                parentSeq: oTemp2.seq,
                                uiSeq: k
                            }
                            oContent.push(oTemp3);
                            for (let z = 0; z < oRows[i].columns[j].cells[k].widgets.length; z++) {
                                let iNewSeq4 = await Modules.getSeq('HC');
                                let oTemp4 = {
                                    seq: iNewSeq4,
                                    parentSeq: oTemp3.seq,
                                    title: "",
                                    subTitle: "",
                                    uiSeq: z,
                                    widgetSeq: oRows[i].columns[j].cells[k].widgets[z].visualization.id,
                                }
                                oContent.push(oTemp4);
                            }
                        }
                    }
                }
                let sSelectedMenu = this.byId('iconTabHeader').getSelectedKey();
                // Modules.getSalesThis().onBusyIndicatorShow();
                etag = this.getView().getModel('menuModel').getData()['@etag']
                await Modules.patchETag("/odata/v4/home/Menu('" + sSelectedMenu + "')", { "content": oContent }, etag, false, _this._errorAction).then((oResult) => {
                    _this.getView().getModel("menuModel").setProperty('/@etag', oResult['@etag'])
                    this.oComponent.setEditMode(false);
                    this.byId('workpagesBuilder').setShowFooter(false);
                    Modules.MessageToastCUDMsg("U");
                    // Modules.getSalesThis().onBusyIndicatorHide();
                });
            },

            onCancel: async function () {
                WorkPageBuilderData.workPage.contents.rows = [];
                let selectedmenu = this.byId('iconTabHeader').getSelectedKey();
                const sContentUrl = "/odata/v4/home/GetMyHomeContent?$filter=menuSeq eq '" + selectedmenu + "'";
                await Modules.getTree(sContentUrl).then(async (oResult) => {
                    await this._contentSetting(oResult[1]);
                    _this.oComponent.setPageData(WorkPageBuilderData);
                });
                this.oComponent.setEditMode(false);
                this.byId('workpagesBuilder').setShowFooter(false);
            },
            removeWeekNum: function (oEvent) {
                oEvent.getSource()._getCalendar().setShowWeekNumbers(false);
            },
            deadlinchange: function (oEvent) {
                this.byId('dashinfo').setText('사용자 님, ' + oEvent.getSource().getValue() + ' 마감 실적 기준 현황입니다.');

                let dSelectedDate = oEvent.getSource().getDateValue();
                let sYear = String(dSelectedDate.getFullYear());
                let sMonth = String(dSelectedDate.getMonth() + 1).padStart(2, "0");


                 //다른 manifest에 속한 카드에 초기 데이터 넘겨주기용 세션스토리지
                 sessionStorage.setItem("initSearchModel", 
                    JSON.stringify({ 
                        yearMonth: new Date(sYear + "-" + sMonth),
                        orgId : "5"
                    })
                )

                this._oEventBus.publish("home", "search", { orgId: '5', year: sYear, month: sMonth });
            },
            // onDashboardMonthChange: function (oEvent) {
            //     let dSelectedDate = oEvent.getSource().getDateValue();
            //     let sYear = String(dSelectedDate.getFullYear());
            //     let sMonth = String(dSelectedDate.getMonth() + 1).padStart(2, "0");


            //      //다른 manifest에 속한 카드에 초기 데이터 넘겨주기용 세션스토리지
            //      sessionStorage.setItem("initSearchModel", 
            //         JSON.stringify({ 
            //             yearMonth: new Date(sYear + "-" + sMonth),
            //             orgId : "5"
            //         })
            //     )

            //     this._oEventBus.publish("home", "search", { orgId: '5', year: sYear, month: sMonth });

                
                
            // },
            
        });
    });
