sap.ui.define([
    "sap/m/library",
    "sap/ui/core/library",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "bix/common/library/home/library/ushell/utils/workpage/WorkPageVizInstantiation",
    "bix/common/library/home/library/ushell/components/workPageBuilder/controller/WorkPageBuilder.accessibility",
    "bix/common/library/home/library/ushell/components/workPageBuilder/controller/WorkPageBuilder.layout",
    "sap/ui/integration/library",
    "bix/common/library/control/Modules",
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (
        mLibrary,
        coreLibrary,
        Controller,
        JSONModel,
        WorkPageVizInstantiation,
        WorkPageBuilderAccessibility,
        WorkPageBuilderLayoutHelper,
        integrationLibrary,
        Modules,
    ) {
        "use strict";

        let _this, MenuSeq, WorkPageBuilderData, oI18n, CONFIGURATION_LEVELS;
        let MIN_GRID_COLUMN_WIDTH, MAX_GRID_COLUMN_WIDTH, MAX_COLUMNS_PER_ROW, STEP_SIZE;
        let ValueState, LoadState, InvisibleMessageMode, CardPreviewMode, aVisualizations;
        let widgetlist;

        return Controller.extend("bix.admin.publish.controller.PublishManagementDetail", {
            onInit: function () {
                _this = this;
                this._globalVarSet();
                const myRoute = this.getOwnerComponent().getRouter().getRoute("PublishManagementDetail");
                myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
            },
            onMyRoutePatternMatched: async function (oEvent) {
                oI18n = _this.getView().getModel("i18n").getResourceBundle();
                _this.oDetailEvent = oEvent;
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
                MenuSeq = oEvent.getParameter('arguments').seq;
                // sTarget = this.byId('publishType').getSelectedKey()
                let oModel = this.getOwnerComponent().getModel("publish");
                
                let sDashBoardPath = `/dashboard_set('${MenuSeq}')`;
                const oDashBoardBinding = oModel.bindContext(sDashBoardPath);
                let oDashBoardRequest = await oDashBoardBinding.requestObject();
                
                this.getView().setModel(new JSONModel(oDashBoardRequest), "publishModel");
                
                let sWidgetPath = `/get_all_card_list`;
                const oWidgetBinding = oModel.bindContext(sWidgetPath);
                let oWidgetRequest = await oWidgetBinding.requestObject();

                let sContentPath = `/get_dashboard_content(dashboard_id='${MenuSeq}')`;
                const oContentBinding = oModel.bindContext(sContentPath);
                let oContentRequest = await oContentBinding.requestObject();

                this._setHome([], oWidgetRequest.value, oContentRequest.value);
                
                if (sap.ui.getCore().byId(this.byId('workpagesBuilder').mAggregations.content[1].mAssociations.component + '---workPageBuilder--workPage')) {
                    sap.ui.getCore().byId(this.byId('workpagesBuilder').mAggregations.content[1].mAssociations.component + '---workPageBuilder--workPage').setBreakpoint('st-lp-4')
                }
            },

            onEdit: function () {
                this.getOwnerComponent().getRouter().navTo('PublishManagementUpdate', { seq: MenuSeq });
            },

            onCancel: function () {
                // _this.getOwnerComponent().getRouter().navTo('PublishManagementTarget', { target: sTarget });
                _this.getOwnerComponent().getRouter().navTo("PublishManagement");
            },

            _setHome: async function (tile, card, content) {
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
                                let oTemp4 = {
                                    visualization: { id: data[i].children[j].children[k].children[z].widget_id }
                                }
                                WorkPageBuilderData.workPage.contents.rows[i].columns[j].cells[k].widgets.push(oTemp4)
                            }
                        }
                    }
                }
            },

            _globalVarSet: async function () {

                ValueState = coreLibrary.ValueState;
                CONFIGURATION_LEVELS = ["PR", "CO", "PG" /*, "US"*/];
                MIN_GRID_COLUMN_WIDTH = 6;
                MAX_GRID_COLUMN_WIDTH = 24;
                STEP_SIZE = 2;
                MAX_COLUMNS_PER_ROW = 4; //섹션 갯수
                LoadState = mLibrary.LoadState;
                InvisibleMessageMode = coreLibrary.InvisibleMessageMode;
                CardPreviewMode = integrationLibrary.CardPreviewMode;

                this.oWorkPageBuilderAccessibility = new WorkPageBuilderAccessibility();
                this.oWorkPageVizInstantiation = await WorkPageVizInstantiation.getInstance();
            },

            workPageBuilderComponentCreated: function (oEvent) {
                this.oComponent = oEvent.getParameter("component");
                this.oComponent.setShowPageTitle(false);
                this.oComponent.setNavigationDisabled(true);
                this.oComponent.attachEvent("visualizationFilterApplied", this.getVisualizations, this);
                this.oComponent.setPageData(WorkPageBuilderData);
                sap.ui.getCore().byId(this.byId('workpagesBuilder').mAggregations.content[1].mAssociations.component + '---workPageBuilder--workPage').setBreakpoint('st-lp-4')
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

            setWidgetData: function () {
                let Visualizations = JSON.parse(widgetlist);
                Visualizations.forEach(viz => {
                    WorkPageBuilderData.visualizations.nodes.push(JSON.parse(viz.src));
                    WorkPageBuilderData.workPage.usedVisualizations.nodes.push(JSON.parse(viz.src));
                });
            },
        });
    });
