sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "bix/common/library/control/Modules",
    "bix/common/library/util/Formatter",
    "sap/m/MessageToast",
    "sap/ui/core/EventBus"

],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (
        Controller,
        JSONModel,
        Modules,
        formatter,
        MessageToast,
        EventBus
    ) {
        "use strict";

        let _this

        return Controller.extend("bix.admin.publish.controller.PublishManagement", {
            formatter: formatter,
            _oEventBus: EventBus.getInstance(),

            onInit: function () {
                _this = this;
                const myRoute = this.getOwnerComponent().getRouter().getRoute("PublishManagement");
                myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
                const myRoute2 = this.getOwnerComponent().getRouter().getRoute("PublishManagementTarget");
                myRoute2.attachPatternMatched(this.onMyRoutePatternMatched, this);

                // FCL setBusy 해제
                // this._oEventBus.publish("mainApp", "busy", { loaded: true });
            },

            onMyRoutePatternMatched: async function (oEvent) {
                this.getView().setModel(new JSONModel({ deleteEnabled: false }), "ui");
                this.getView().getModel("publish").refresh();
                this.byId("DashBoardTable").clearSelection();
            },

            onCreate: function () {
                _this.getOwnerComponent().getRouter().navTo('RouteCreatePage');
            },
            onNavDetail: function (oEvent) {
                const oCellControl = oEvent.getParameter("cellControl");
                if (oCellControl instanceof sap.m.Switch) { return; }

                const sPath = oEvent.getParameters().rowBindingContext.getPath()
                const sId = sPath.slice(sPath.indexOf("(") + 1, sPath.lastIndexOf(")"));
                this.getOwnerComponent().getRouter().navTo('PublishManagementDetail', { seq: sId });
            },
            onDelete: async function () {
                let oModel = this.getView().getModel("publish");
                let aIndicies = this.byId('DashBoardTable').getSelectedIndices();
                aIndicies.sort((a, b) => b - a);
                Modules.messageBoxConfirm('warning', "삭제하시겠습니까?", "삭제").then(async (bCheck) => {
                    if (bCheck) {
                        for (const iIdx of aIndicies) {
                            let oRowBinding = this.byId("DashBoardTable").getBinding("rows");
                            oRowBinding.getContexts()[iIdx].delete();
                        }
                        oModel.submitBatch("DashBoard").then(() => {
                            if (oModel.hasPendingChanges()) {
                                MessageToast.show("삭제가 완료되었습니다.")
                            }
                            this.getOwnerComponent().getModel("publish").refresh();
                        });
                    }
                })
            },
            onSelectionChange: function () {
                let aIndicies = this.byId('DashBoardTable').getSelectedIndices();
                let bDeleteEnabled = aIndicies.length > 0;
                this.getView().getModel("ui").setProperty("/deleteEnabled", bDeleteEnabled);
            },
            onActivation: async function (oEvent) {
                let oSwitch = oEvent.getSource();
                let bStateFlag = oEvent.getParameter("state");
                if (!bStateFlag) {
                    Modules.messageBox('warning', "모든 메인 메뉴 비활성화는 할 수 없습니다.");
                    oSwitch.setState(!bStateFlag);
                } else {
                    Modules.messageBoxConfirm('information', "메인은 하나의 데이터만 활성화 할 수 있습니다." + '\n'
                        + "선택한 데이터로 변경하시겠습니까?",
                       "메인 메뉴 변경").then(async (bCheck) => {
                            if (bCheck) {
                                this.getOwnerComponent().getModel("publish").refresh();
                            } else {
                                oSwitch.setState(!bStateFlag);
                            }
                        })
                }
            },
        });
    });
