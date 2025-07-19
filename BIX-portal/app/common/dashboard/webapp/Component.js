sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "bix/common/dashboard/model/models",
    "sap/base/util/ObjectPath",
    'sap/ui/core/Component',
    'sap/ui/core/Element'
],
    function (UIComponent, Device, models, ObjectPath, Component, Element) {
        "use strict";

        return UIComponent.extend("bix.common.dashboard.Component", {
            metadata: {
                manifest: "json",
                events: {
                    workPageEdited: {},
                    visualizationFilterApplied: {
                        parameters: {
                            filters: { type: "array" }
                        }
                    },
                    closeEditMode: {
                        parameters: {
                            saveChanges: { type: "boolean" }
                        }
                    }
                }
            },

            init: function () {
                UIComponent.prototype.init.apply(this, arguments);

                this.getRouter().initialize();

                this.oUserModel = Component.getOwnerComponentFor(Element.getElementById("container-bix.main---App"))?.getModel("main_userModel");
                this.setModel(this.oUserModel, "main_userModel");
            },

            getEditMode: function () {
                return this.getRootControl().getController().getEditMode();
            },

            setEditMode: function (bEditMode) {
                this.getRootControl().getController().setEditMode(bEditMode);
            },

            setPreviewMode: function (bPreviewMode) {
                this.getRootControl().getController().setPreviewMode(bPreviewMode);
            },

            getPreviewMode: function () {
                return this.getRootControl().getController().getPreviewMode();
            },

            getPageData: function () {
                return this.getRootControl().getController().getPageData();
            },

            setPageData: async function (oPageData) {
                return this.getRootControl().getController().setPageData(oPageData);
                return Promise.resolve();
            },

            setVisualizationData: function (oVizNodes) {
                return this.getRootControl().getController().setVisualizationData(oVizNodes);
            },

            getNavigationDisabled: function () {
                return this.getRootControl().getController().getNavigationDisabled();
            },

            setNavigationDisabled: function (bNavigation) {
                this.getRootControl().getController().setNavigationDisabled(bNavigation);
            },

            getUshellContainer: function () {
                return ObjectPath.get("sap.ushell.Container") || ObjectPath.get("parent.sap.ushell.Container") || ObjectPath.get("parent.parent.sap.ushell.Container");
            },

            setShowFooter: function (bVisible) {
                this.getRootControl().getController().setShowFooter(bVisible);
            },


            setShowPageTitle: function (bVisible) {
                this.getRootControl().getController().setShowPageTitle(bVisible);
            }
        });
    }
);