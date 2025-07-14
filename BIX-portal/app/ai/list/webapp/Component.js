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

            this.setModel(new JSONModel({
                values: [{
                    ID: "ID1",
                    Parent_ID: "",
                    child: [],
                    title: "Pipeline 주간 AI 리포트",
                    name: "20028200",
                    createdby: "Lee",
                    bFlage: true,
                    content: "",
                    createdAt: "2025-07-01"
                }, 
                // {
                //     ID: "ID2",
                //     Parent_ID: "",
                //     child: [],
                //     title: "Delivery 월마감 리포트",
                //     name: "20028200",
                //     createdby: "Lee",
                //     bFlage: true,
                //     content: "",
                //     createdAt: "2025-07-02"
                // },
                {
                    ID: "ID4",
                    Parent_ID: "",
                    child: [],
                    title: "월마감 AI 리포트",
                    name: "20028200",
                    createdby: "Lee",
                    bFlage: true,
                    content: "",
                    createdAt: "2025-07-02"
                },
                // {
                //     ID: "ID5",
                //     Parent_ID: "",
                //     child: [],
                //     title: "Account 월마감 리포트",
                //     name: "20028200",
                //     createdby: "Lee",
                //     bFlage: true,
                //     content: "",
                //     createdAt: "2025-07-02"
                // },
                // {
                //     ID: "ID3",
                //     Parent_ID: "",
                //     child: [],
                //     title: "Cloud 월마감 리포트",
                //     name: "20028200",
                //     createdby: "Lee",
                //     bFlage: true,
                //     content: "",
                //     createdAt: "2025-07-02"
                // }
            ]
            }), 'aiModel');

            this.setModel(new JSONModel({}), "hashModel");

            // enable routing
            this.getRouter().initialize();
        }
    });
});