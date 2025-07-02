sap.ui.define([
    "sap/ui/core/UIComponent",
    "bix/ai/list/model/models",
    "sap/ui/model/json/JSONModel",
], (UIComponent, models, JSONModel) => {
    "use strict";

    return UIComponent.extend("bix.ai.list.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
            this.setModel(new JSONModel({
                values: [{
                    ID: "ID1",
                    Parent_ID: "",
                    child: [],
                    title: "pipeline 주간 리포트",
                    name: "20028200",
                    createdby: "Lee",
                    bFlage: true,
                    content: "",
                    createdAt: "2025-07-01"
                }, {
                    ID: "ID2",
                    Parent_ID: "",
                    child: [],
                    title: "SG&A 주간 리포트",
                    name: "20028200",
                    createdby: "Lee",
                    bFlage: true,
                    content: "",
                    createdAt: "2025-07-01"
                }, {
                    ID: "ID3",
                    Parent_ID: "",
                    child: [],
                    title: "Delivery 월마감 리포트",
                    name: "20028200",
                    createdby: "Lee",
                    bFlage: true,
                    content: "",
                    createdAt: "2025-07-02"
                }]
            }), 'aiModel');

            this.setModel(new JSONModel(
                [
                    {
                        name: "5월 3주차",
                        start_date: "2025-05-12",
                        end_date: "2025-05-18",
                        key: "1"
                    },
                    {
                        name: "5월 4주차",
                        start_date: "2025-05-19",
                        end_date: "2025-05-25",
                        key: "2"
                    }, {
                        name: "5월 5주차",
                        start_date: "2025-05-26",
                        end_date: "2025-06-01",
                        key: "3"
                    },
                ]

            ), "dateModel")
            this.getModel("dateModel").setProperty("selectedKey", "1")

        }
    });
});