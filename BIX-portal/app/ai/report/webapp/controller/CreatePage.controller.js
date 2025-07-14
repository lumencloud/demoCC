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
    "sap/m/MessageToast",
    "sap/ui/core/ComponentContainer"
],
    function (
        ObjectPath, deepExtend, mLibrary, Fragment, coreLibrary, Controller, JSONModel, utils, WorkPageVizInstantiation, WorkPageBuilderAccessibility, WorkPageBuilderLayoutHelper, integrationLibrary, Modules, Token, MessageToast, ComponentContainer
    ) {
        "use strict";

        let _this, oI18n, sEdit, MenuSeq, WorkPageBuilderData, roleList, PublishType;
        let ValueState, CONFIGURATION_LEVELS, MIN_GRID_COLUMN_WIDTH, MAX_GRID_COLUMN_WIDTH, STEP_SIZE;
        let MAX_COLUMNS_PER_ROW, LoadState, InvisibleMessageMode, CardPreviewMode, aVisualizations;
        let widgetlist = [], OriginalData;

        return Controller.extend("bix.ai.report.controller.CreatePage", {
            onInit: function () {
                _this = this;
                this.oComponentMap = {};
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
                // this._viewDataSet();
                const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteCreatePage");
                myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
                const myRouteEdit = this.getOwnerComponent().getRouter().getRoute("PublishManagementUpdate");
                myRouteEdit.attachPatternMatched(this.onMyRoutePatternMatchedEdit, this);
            },
            onMyRoutePatternMatched: async function (oEvent) {
                await this._onClear();
                this.addSlide();
                // this._globalVarSet();
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
                this._setHome(oWidgetRequest.value, []);

                // if (sap.ui.getCore().byId(this.byId('workpagesBuilder').mAggregations.content.mAssociations.component + '---workPageBuilder--workPage')) {
                //     sap.ui.getCore().byId(this.byId('workpagesBuilder').mAggregations.content.mAssociations.component + '---workPageBuilder--workPage').setBreakpoint('st-lp-4')
                // }
            },

            onMyRoutePatternMatchedEdit: async function (oEvent) {
                await this._onClear();
                this.addSlide();
                // this._globalVarSet();
                this._setUiModel();
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
                sEdit = true;

                let oPublishModel = this.getOwnerComponent().getModel("publish");   // getModel() 의 파라미터는 모델명
                let oAiModel = this.getOwnerComponent().getModel("ai");

                let sDashBoardPath = `/ai_set('${MenuSeq}')?$expand=content`;  // 함수 명과 함수에 들어가는 파라미터
                const oDashBoardBinding = oAiModel.bindContext(sDashBoardPath);
                let aDashBoardRequestContexts = await oDashBoardBinding.requestObject();
                this.getView().setModel(new JSONModel(aDashBoardRequestContexts), "publishModel");

                let sWidgetPath = `/get_all_card_list`;  // 함수 명과 함수에 들어가는 파라미터

                const oWidgetBinding = oPublishModel.bindContext(sWidgetPath);
                let oWidgetRequest = await oWidgetBinding.requestObject();

                let sContentPath = `/get_ai_content(dashboard_id='${MenuSeq}')`;  // 함수 명과 함수에 들어가는 파라미터
                const oContentBinding = oAiModel.bindContext(sContentPath);
                let oContentRequest = await oContentBinding.requestObject();

                this._setHome(oWidgetRequest.value, oContentRequest.value);
                // if (sap.ui.getCore().byId(this.byId('workpagesBuilder').mAggregations.content.mAssociations.component + '---workPageBuilder--workPage')) {
                //     sap.ui.getCore().byId(this.byId('workpagesBuilder').mAggregations.content.mAssociations.component + '---workPageBuilder--workPage').setBreakpoint('st-lp-4')
                // }
            },

            _setUiModel: function () {
                let today = new Date();
                let month = today.getMonth() + 1;
                let firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                let dayOfMonth = today.getDate();
                let firstWeekday = firstDayOfMonth.getDay();
                let weekNumber = Math.ceil((dayOfMonth + firstWeekday) / 7)
                let date = month + "월 " + weekNumber + "주차"
                this.getView().setModel(new JSONModel({ "edit": true, "date": date }), "uiModel")
            },

            onSave: async function () {
                let oModel = this.getOwnerComponent().getModel("ai");
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

                                let oBinding = oModel.bindContext(`/ai_set('${MenuSeq}')`, undefined, undefined, undefined, {
                                    $$updateGroupId: "UpdateDashBoard"
                                });
                                oBinding.getBoundContext().setProperty("name", oPublishData.name);

                                let oConentBinding = oModel.bindList(`/ai_content`, undefined, undefined, undefined, {
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
                                    _this.getOwnerComponent().getModel("ai").refresh();
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
                                let oTemp = {
                                    name: oPublishData.name,
                                    content: oContent,
                                };
                                let oBinding = oModel.bindList("/ai_set", undefined, undefined, undefined, {
                                    $$updateGroupId: "AddDashBoard"
                                });
                                oBinding.create(oTemp)
                                if (oModel.hasPendingChanges("AddDashBoard")) {
                                    oModel.submitBatch("AddDashBoard").then(async () => {
                                        this.getOwnerComponent().getModel("ai").refresh();
                                        MessageToast.show("메뉴가 생성되었습니다.")
                                        _this.getOwnerComponent().getRouter().navTo('PublishManagement');
                                    })
                                } else {
                                    MessageToast.show("생성할 메뉴가 없습니다.")
                                    this.getOwnerComponent().getModel("ai").refresh();
                                    return;
                                }
                            }
                        })
                }
            },
            onEdit: function () {
                this.byId('workpagesBuilder').removeStyleClass("detail");
                this.oComponent.setEditMode(true);
                this.getView().getModel("uiModel").setProperty("/edit", false)
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
            addSlide: function () {
                let oSwipe = this.byId("containerSwipe");
                let slideIndex = oSwipe.getPages().length;
                let oComponent = new ComponentContainer({
                    name: "bix.common.library.home.library.ushell.components.workPageBuilder",
                    width: "100%",
                    height: "100%",
                    manifest: false,
                    componentCreated: this.workPageBuilderComponentCreated.bind(this),
                    async: true
                })
                oSwipe.addPage(oComponent);
                setTimeout(() => {
                    oSwipe.next();
                }, 0.1)
            },
            workPageBuilderComponentCreated: async function (oEvent) {
                let oSwipe = this.byId("containerSwipe");
                let slideIndex = oSwipe.getPages().length;
                let oCreatedComponent = oEvent.getParameter("component");
                //  this.oComponentMap[slideIndex] = oCreatedComponent;

                this.oComponent = oEvent.getParameter("component");
                this.oComponent.setShowPageTitle(false);
                this.oComponent.setNavigationDisabled(true);
                this.oComponent.setEditMode(true);
                this.oComponent.attachEvent("visualizationFilterApplied", this.getVisualizations, this);
                // let oModel = this.getOwnerComponent().getModel("publish");   // getModel() 의 파라미터는 모델명

                if (WorkPageBuilderData.workPage.contents.rows.length > 0) {
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
                    this.oComponent.setPageData(WorkPageBuilderData);
                } else {
                    this.oComponent.setPageData(WorkPageBuilderData);
                }

                // let sWidgetPath = `/get_all_card_list`;  // 함수 명과 함수에 들어가는 파라미터
                // const oWidgetBinding = oModel.bindContext(sWidgetPath);
                // let oWidgetRequest = await oWidgetBinding.requestObject();
                // this._setHome(oWidgetRequest.value, []);
            },
            _setHome: async function (card, content) {
                await this._cardSetting(card);

                widgetlist = JSON.stringify(widgetlist);
                await this._contentSetting(content);
                this.setWidgetData();

                if (this.oComponent) {
                    this.oComponent.setPageData(WorkPageBuilderData);
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
            setWidgetData: function () {
                let Visualizations = JSON.parse(widgetlist);
                Visualizations.forEach(viz => {
                    WorkPageBuilderData.visualizations.nodes.push(JSON.parse(viz.src));
                    WorkPageBuilderData.workPage.usedVisualizations.nodes.push(JSON.parse(viz.src));
                });
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
             * Disable the navigation on tiles and widgets
             * @param {boolean} bNavigation true or false
             *
             * @private
             * @since 1.109.0
             */
            setNavigationDisabled: function (bNavigation) {
                this.oModel.setProperty("/navigationDisabled", bNavigation);
            },
            onFieldCheck: function (oEvent) {
                Modules.fieldCheck(oEvent.getSource());
            },
            onNavBack: function () {
                // Modules.getSalesThis().onBusyIndicatorShow();
                // let sTarget = this.byId('publishType').getSelectedKey()
                let oSwipe = this.byId("containerSwipe");
                oSwipe.destroyPages();
                _this.getOwnerComponent().getRouter().navTo('PublishManagement');
            },
            onNotInput: function (oEvent) {
                let sIn = oEvent.getSource().getValue();
                oEvent.getSource().setValue(sIn.slice(0, -1));
            },
            _onClear: function () {
                Modules.globalClear("Clear", this);
                Modules.globalClear("Input", this);
                Modules.globalClear("Required", this);
            },
        });
    });
