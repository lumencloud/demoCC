sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "bix/common/library/util/Formatter",
        "sap/ui/core/format/DateFormat",
        "sap/m/MessageToast",
    ],
    function (Controller, JSONModel, formatter, DateFormat, MessageToast) {
        "use strict";

        let _this, sId

        return Controller.extend("bix.admin.widget.controller.WidgetDetail", {
            formatter: formatter,
            onInit: function () {
                const myRoute = this.getOwnerComponent().getRouter();
                myRoute.getRoute("WidgetDetail").attachPatternMatched(this.onMyRoutePatternMatched, this);
                _this = this
            },
            onMyRoutePatternMatched: async function (oEvent) {
                sId = oEvent.getParameter("arguments").objectId;
                const oBindingObject = await this.getView().getModel("widget").bindContext(`/get_widget_detail(ID='${sId}')/Set`).requestObject()
                this.getView().setModel(new JSONModel(oBindingObject.value[0]), "widgetDetailModel");
            },

            onFormatCategoryContentForVisible: function (sCategoryType) {
                let oResult = sCategoryType === "content";
                return oResult;
            },
            onSwitch: function (oEvent) {
                let bState = oEvent.getParameter("state");
                let oWidgetModel = this.getOwnerComponent().getModel("widget")
                let oBinding = oWidgetModel.bindContext(`/card('${sId}')`, undefined, undefined, undefined, {
                    $$updateGroupId: "UpdateWidget"
                });

                oBinding.getBoundContext().setProperty("useFlag", bState);
                // let aChanges = oWidgetModel.hasPendingChanges("UpdateWidget")
                //   if(aChanges)
                oWidgetModel.submitBatch("UpdateWidget").then(() => {
                    this.getOwnerComponent().getModel("widget").refresh();
                });
                if (!bState) {
                    MessageToast.show("위젯이 비활성화 됐습니다.");
                } else {
                    MessageToast.show("위젯이 활성화 됐습니다.");
                }
            },
            onFormatDateTime: function (sDate) {
                if (!sDate) {
                    return "";
                }
                const oDate = new Date(sDate);
                const oDateFormat = DateFormat.getDateTimeInstance({
                    pattern: 'yyyy. M. d. a hh:mm:ss'
                })
                return oDateFormat.format(oDate);
            },
            onEdit: function () {
                this.getOwnerComponent().getRouter().navTo("WidgetUpdate", {
                    objectId: sId
                });
            },
            onBack: function (oEvent) {
                this.getOwnerComponent().getRouter().navTo("RouteMain");
            },
        });
    }
);