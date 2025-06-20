sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "bix/common/library/control/Modules",
        'sap/ui/model/Sorter',
        'sap/ui/model/Filter',
        'sap/ui/model/FilterOperator',
        'sap/ui/model/FilterType',
        "sap/ui/model/json/JSONModel",
        "sap/ui/core/EventBus",
        "sap/m/MessageToast"

    ],
    function (
        Controller,
        Modules,
        Sorter,
        Filter,
        FilterOperator,
        FilterType,
        JSONModel,
        EventBus,
        MessageToast
    ) {
        "use strict"
        return Controller.extend("bix.admin.widget.controller.Main", {
            _oEventBus: EventBus.getInstance(),

            onInit: function () {
                const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteMain");
                myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
                // FCL setBusy 해제
                // this._oEventBus.publish("mainApp", "busy", { loaded: true });
            },
            onMyRoutePatternMatched: async function () {
                this.getView().setModel(new JSONModel({ deleteEnabled: false }), "ui");
                this.byId("widgetCardTable").clearSelection();
            },
            onSelectionChange: async function () {
                let aIndicies = this.byId('widgetCardTable').getSelectedIndices();
                let bSelected = aIndicies.length > 0;
                this.getView().getModel("ui").setProperty("/deleteEnabled", bSelected);
            },
            onRegister: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("WidgetCreate", { category: "content" });
            },
            onDetail: function (oEvent) {
                const oCellControl = oEvent.getParameter("cellControl");
                if (oCellControl instanceof sap.m.Switch) {
                    return;
                }
                // let sId = oEvent.getParameter("row").getBindingContext("widget").getObject("ID")
                const sPath = oEvent.getParameters().rowBindingContext?.getPath()
                if (!sPath) return;
                const sId = sPath.slice(sPath.indexOf("(") + 1, sPath.lastIndexOf(")"));
                this.getOwnerComponent().getRouter().navTo("WidgetDetail", { objectId: sId });
            },
            onDelete: function () {
                const aSelectedIndices = this.byId('widgetCardTable').getSelectedIndices();
                Modules.messageBoxConfirm('warning', "삭제하시겠습니까?", "삭제").then(async (bCheck) => {
                    if (bCheck) {
                        const aContexts = this.byId("widgetCardTable").getBinding("rows").getContexts();
                        aSelectedIndices.forEach((idx) => {
                            const oContext = aContexts[idx];
                            if (oContext) {
                                oContext.delete();
                            }
                        })
                    }
                })
            },
            onSortDialog: function () {
                this.sortDialog = Modules.DialogSet(this, "bix.admin.widget.view.fragment.SortDialogContents", "ContentsSortDialog");
            },
            onSort: async function (oEvent) {
                let mParams = oEvent.getParameters()
                let sortKey = mParams.sortItem.getKey()
                let bSortDirection = mParams.sortDescending;
                this.byId("widgetCardTable").getBinding("rows").sort(new Sorter(sortKey, bSortDirection))
            },
            onSearch: async function (oEvent) {
                let sQuery = oEvent.getParameter("query");
                let oFilter = new Filter({
                    path: "name",
                    operator: FilterOperator.Contains,
                    value1: sQuery,
                    caseSensitive: false
                });
                this.byId("widgetCardTable").getBinding("rows").filter(oFilter, FilterType.Application)
            },

            onSwitch: function (oEvent) {
                let bState = oEvent.getParameter("state");
                if (!bState) {
                    MessageToast.show("위젯이 비활성화 됐습니다.");
                } else {
                    MessageToast.show("위젯이 활성화 됐습니다.");
                }
            },
        })
    }
)