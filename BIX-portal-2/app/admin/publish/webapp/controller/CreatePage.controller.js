sap.ui.define([
    "sap/base/util/ObjectPath",
    "sap/base/util/deepExtend",
    "sap/m/library",
    "sap/ui/core/Fragment",
    "sap/ui/core/library",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "bix/common/library/home/library/ushell/utils",
    "bix/common/library/home/library/ushell/utils/workpage/WorkPageVizInstantiation",
    "bix/common/library/home/library/ushell/components/workPageBuilder/controller/WorkPageBuilder.accessibility",
    "bix/common/library/home/library/ushell/components/workPageBuilder/controller/WorkPageBuilder.layout",
    "sap/ui/integration/library",
    "bix/common/library/control/Modules",
    "sap/m/Token",
    "sap/m/MessageToast"
],
    function (
        ObjectPath,
        deepExtend,
        mLibrary,
        Fragment,
        coreLibrary,
        Controller,
        JSONModel,
        utils,
        WorkPageVizInstantiation,
        WorkPageBuilderAccessibility,
        WorkPageBuilderLayoutHelper,
        integrationLibrary,
        Modules,
        Token,
        MessageToast
    ) {
        "use strict";

        let _this, oI18n, sEdit, MenuSeq, WorkPageBuilderData, roleList, PublishType;
        let ValueState, CONFIGURATION_LEVELS, MIN_GRID_COLUMN_WIDTH, MAX_GRID_COLUMN_WIDTH, STEP_SIZE;
        let MAX_COLUMNS_PER_ROW, LoadState, InvisibleMessageMode, CardPreviewMode, aVisualizations;
        let widgetlist = [], OriginalData;

        return Controller.extend("bix.admin.publish.controller.CreatePage", {
            onInit: function () {
                _this = this;
                WorkPageBuilderData = {
                    visualizations: {
                        nodes: []
                    },
                    workPage: {
                        id: "standard-workpage",
                        contents: {
                            descriptor: {
                                value: {
                                    title: "",
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
                this._viewDataSet();
                const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteCreatePage");
                myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
                const myRouteEdit = this.getOwnerComponent().getRouter().getRoute("PublishManagementUpdate");
                myRouteEdit.attachPatternMatched(this.onMyRoutePatternMatchedEdit, this);
            },

            onMyRoutePatternMatched: async function (oEvent) {
                await this._onClear();
                this._globalVarSet();

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
                                    title: "",
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
                roleList = [];
                MenuSeq = null;
                sEdit = false;
                this.getView().setModel(new JSONModel({}), "publishModel");

                _this.getView().setModel(new JSONModel({ edit: false }), "ui")
                let oModel = this.getOwnerComponent().getModel("publish");   // getModel() 의 파라미터는 모델명
                let sWidgetPath = `/get_all_card_list`;  // 함수 명과 함수에 들어가는 파라미터

                const oWidgetBinding = oModel.bindContext(sWidgetPath);
                let oWidgetRequest = await oWidgetBinding.requestObject();
                this._setHome([], oWidgetRequest.value, []);
                if (sap.ui.getCore().byId(this.byId('workpagesBuilder').mAggregations.content.mAssociations.component + '---workPageBuilder--workPage')) {
                    sap.ui.getCore().byId(this.byId('workpagesBuilder').mAggregations.content.mAssociations.component + '---workPageBuilder--workPage').setBreakpoint('st-lp-4')
                }
            },

            onMyRoutePatternMatchedEdit: async function (oEvent) {
                await this._onClear();
                this._globalVarSet();
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
                roleList = [];
                _this.getView().setModel(new JSONModel({ edit: true }), 'ui');
                _this.getView().getModel("ui").getData();
                MenuSeq = oEvent.getParameter('arguments').seq;
                this.getView().setModel(new JSONModel([]), "RoleToken");
                sEdit = true;
                this.byId('publishType').setEditable(false);

                let oModel = this.getOwnerComponent().getModel("publish");   // getModel() 의 파라미터는 모델명

                let sDashBoardPath = `/dashboard_set('${MenuSeq}')?$expand=content`;  // 함수 명과 함수에 들어가는 파라미터
                const oDashBoardBinding = oModel.bindContext(sDashBoardPath);
                let oDashBoardRequest = await oDashBoardBinding.requestObject();

                this.getView().setModel(new JSONModel(oDashBoardRequest), "publishModel");

                let sWidgetPath = `/get_all_card_list`;  // 함수 명과 함수에 들어가는 파라미터

                const oWidgetBinding = oModel.bindContext(sWidgetPath);
                let oWidgetRequest = await oWidgetBinding.requestObject();

                let sContentPath = `/get_dashboard_content(dashboard_id='${MenuSeq}')`;  // 함수 명과 함수에 들어가는 파라미터
                const oContentBinding = oModel.bindContext(sContentPath);
                let oContentRequest = await oContentBinding.requestObject();

                this._setHome([], oWidgetRequest.value, oContentRequest.value);
                if (sap.ui.getCore().byId(this.byId('workpagesBuilder').mAggregations.content.mAssociations.component + '---workPageBuilder--workPage')) {
                    sap.ui.getCore().byId(this.byId('workpagesBuilder').mAggregations.content.mAssociations.component + '---workPageBuilder--workPage').setBreakpoint('st-lp-4')
                }

            },

            onFieldCheck: function (oEvent) {
                Modules.fieldCheck(oEvent.getSource());
            },

            onSave: async function () {
                let oModel = this.getOwnerComponent().getModel("publish");
                if (sEdit) {
                    Modules.messageBoxConfirm("information", "저장하시겠습니까?",
                        "게시물 저장").then(async (bCheck) => {
                            if (bCheck) {
                                let oPublishData = this.getView().getModel("publishModel").getData();
                                let oTarget = [], oContent = [];
                                let oData = this.oComponent.getPageData();
                                let oRows = oData.workPage.contents.rows;
                                for (let i = 0; i < oRows.length; i++) {
                                    let oTemp = {
                                        title: oRows[i].descriptor.value.title,
                                        dashboard_ID: MenuSeq,
                                        ui_seq: i,
                                        Child: []
                                    }
                                    oContent.push(oTemp);
                                    for (let j = 0; j < oRows[i].columns.length; j++) {
                                        let oTemp2 = {
                                            ui_seq: j,
                                            column_width: oRows[i].columns[j].descriptor.value.column_width,
                                            Child: []
                                        }
                                        oTemp.Child.push(oTemp2);
                                        for (let k = 0; k < oRows[i].columns[j].cells.length; k++) {
                                            let oTemp3 = {
                                                ui_seq: k,
                                                Child: []
                                            }
                                            oTemp2.Child.push(oTemp3);
                                            for (let z = 0; z < oRows[i].columns[j].cells[k].widgets.length; z++) {
                                                let oTemp4 = {
                                                    title: "",
                                                    sub_title: "",
                                                    ui_seq: z,
                                                    widget_id: oRows[i].columns[j].cells[k].widgets[z].visualization.id,
                                                }
                                                oTemp3.Child.push(oTemp4);
                                            }
                                        }
                                    }
                                }
                                if (this.byId('publishType').getSelectedKey() !== 'team') {
                                    oTarget.push({ targetSeq: 'all' });
                                }
                                else {

                                    let oSelectedTarget = this.byId('publishRole').getTokens()
                                    for (let i = 0; i < oSelectedTarget.length; i++) {
                                        oTarget.push({ targetSeq: this.byId('publishRole').getTokens()[i].mProperties.text })
                                    }
                                }

                                let oBinding = oModel.bindContext(`/dashboard_set('${MenuSeq}')`, undefined, undefined, undefined, {
                                    $$updateGroupId: "UpdateDashBoard"
                                });
                                oBinding.getBoundContext().setProperty("name", oPublishData.name);

                                let oConentBinding = oModel.bindList(`/dashboard_content`, undefined, undefined, undefined, {
                                    $filter: `dashboard_ID eq '${MenuSeq}'`,
                                    $$updateGroupId: "UpdateContent"
                                });
                                let aContentContext = await oConentBinding.requestContexts()
                                for (const oContext of aContentContext) {
                                    oContext.delete();
                                }
                                // oBinding.getBoundContext().setProperty("content",oContent);
                                for (const oContentItem of oContent) {
                                    oConentBinding.create(oContentItem);
                                }
                                oModel.submitBatch("UpdateContent").then(async () => {
                                    _this.getOwnerComponent().getModel("publish").refresh();
                                    Modules.MessageToastCUDMsg("U");
                                    _this.getOwnerComponent().getRouter().navTo('PublishManagementDetail', { seq: MenuSeq });
                                })
                            }
                        })
                }
                else {
                    Modules
                        .messageBoxConfirm(
                            "information",
                            "저장하시겠습니까?",
                            "게시물 저장"
                        )
                        .then(async (bCheck) => {
                            if (bCheck) {
                                let oPublishData = this.getView().getModel("publishModel").getData();
                                let oTarget = [], oContent = [];
                                let oData = this.oComponent.getPageData();
                                let oRows = oData.workPage.contents.rows;
                                for (let i = 0; i < oRows.length; i++) {
                                    let oTemp = {
                                        title: oRows[i].descriptor.value.title,
                                        ui_seq: i,
                                        Child: []
                                    }
                                    oContent.push(oTemp);
                                    for (let j = 0; j < oRows[i].columns.length; j++) {
                                        let oTemp2 = {
                                            ui_seq: j,
                                            column_width: oRows[i].columns[j].descriptor.value.columnWidth,
                                            Child: []
                                        }
                                        oTemp.Child.push(oTemp2);
                                        for (let k = 0; k < oRows[i].columns[j].cells.length; k++) {
                                            let oTemp3 = {
                                                ui_seq: k,
                                                Child: []
                                            }
                                            oTemp2.Child.push(oTemp3);
                                            for (let z = 0; z < oRows[i].columns[j].cells[k].widgets.length; z++) {
                                                let oTemp4 = {
                                                    title: "",
                                                    sub_title: "",
                                                    ui_seq: z,
                                                    widget_id: oRows[i].columns[j].cells[k].widgets[z].visualization.id,
                                                    Child: []
                                                }
                                                oTemp3.Child.push(oTemp4);
                                            }
                                        }
                                    }
                                }
                                // if (this.byId('publishType').getSelectedKey() !== 'team') {
                                //     oTarget.push({ target_seq: 'all' });
                                // } else {
                                //     let oSelectedTarget = this.byId('publishRole').getTokens()
                                //     for (let i = 0; i < oSelectedTarget.length; i++) {
                                //         oTarget.push({ targetSeq: this.byId('publishRole').getTokens()[i].mProperties.text })
                                //     }
                                // }
                                let oTemp = {
                                    name: oPublishData.name,
                                    type: _this.byId('publishType').getSelectedKey() !== 'team' ? "all" : "role",
                                    use_flag: false,
                                    content: oContent,
                                    // target: oTarget,
                                };
                                // if (oTemp.target.length == 0) {
                                //     Modules.messageBox('warning', oI18n.getText("please_add_at_least_one_job_code"))
                                //     return
                                // }
                                let oBinding = oModel.bindList("/dashboard_set", undefined, undefined, undefined, {
                                    $$updateGroupId: "AddDashBoard"
                                });
                                oBinding.create(oTemp)
                                if (oModel.hasPendingChanges("AddDashBoard")) {
                                    let navTarget = _this.byId('publishType').getSelectedKey();
                                    oModel.submitBatch("AddDashBoard").then(async () => {
                                        this.getOwnerComponent().getModel("publish").refresh();
                                        MessageToast.show("메뉴가 생성되었습니다.")
                                        _this.getOwnerComponent().getRouter().navTo('PublishManagementTarget', { target: navTarget });
                                    })
                                } else {
                                    MessageToast.show("생성할 메뉴가 없습니다.")
                                    this.getOwnerComponent().getModel("publish").refresh();
                                    return;
                                }
                            }
                        })
                }
            },

            onCancel: async function () {
                await Modules.messageBoxConfirm(
                    "warning",
                    "작성된 내용은 저장되지 않습니다. 취소하시겠습니까?",
                    "취소 확인"
                ).then(async (bCheck) => {
                    if (bCheck) {
                        this.onNavBack();
                    }
                });
            },

            onNavBack: function () {
                // Modules.getSalesThis().onBusyIndicatorShow();
                let sTarget = this.byId('publishType').getSelectedKey()
                _this.getOwnerComponent().getRouter().navTo('PublishManagementTarget', { target: sTarget });
            },

            onNotInput: function (oEvent) {
                let sIn = oEvent.getSource().getValue();
                oEvent.getSource().setValue(sIn.slice(0, -1));
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
                // this._fnDeleteRowHandler = this.deleteRow.bind(this);
                // this._fnDeleteCellHandler = this.deleteCell.bind(this);
                // this._fnSaveCardConfiguration = this._onSaveCardEditor.bind(this);
                // this._fnResetCardConfiguration = this._onResetCardConfigurations.bind(this);

                // ValueState = coreLibrary.ValueState;
                // CONFIGURATION_LEVELS = ["PR", "CO", "PG" /*, "US"*/];
                // MIN_GRID_COLUMN_WIDTH = 6;
                // MAX_GRID_COLUMN_WIDTH = 24;
                // STEP_SIZE = 2;
                // MAX_COLUMNS_PER_ROW = 4; //섹션 갯수
                // LoadState = mLibrary.LoadState;
                // InvisibleMessageMode = coreLibrary.InvisibleMessageMode;
                // CardPreviewMode = integrationLibrary.CardPreviewMode;
                // aVisualizations = WorkPageBuilderData.visualizations.nodes;

                // this.oWorkPageBuilderAccessibility = new WorkPageBuilderAccessibility();
                // this.oWorkPageVizInstantiation = await WorkPageVizInstantiation.getInstance();
            },

            workPageBuilderComponentCreated: function (oEvent) {
                this.oComponent = oEvent.getParameter("component");
                this.oComponent.setShowPageTitle(false);
                this.oComponent.setNavigationDisabled(true);
                this.oComponent.setEditMode(true);
                this.oComponent.attachEvent("visualizationFilterApplied", this.getVisualizations, this);
                this.oComponent.setPageData(WorkPageBuilderData);
                // sap.ui.getCore().byId(this.byId('workpagesBuilder').mAggregations.content.mAssociations.component + '---workPageBuilder--workPage').setBreakpoint('st-lp-4')

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
                }.bind(this), 0);

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
        });
    });
