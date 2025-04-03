sap.ui.define([
    "sap/ui/core/UIComponent",
    "project1/model/models",
    "sap/ui/model/odata/v4/ODataModel"
], (UIComponent,
	models,
	ODataModel) => {
    "use strict";

    return UIComponent.extend("project1.Component", {
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

            // OData V4 모델 인스턴스 생성
            const oODataModel = new ODataModel({
                serviceUrl: "/project/", // 실제 OData V4 서비스 경로
                synchronizationMode: "None",
                operationMode: "Server",
                autoExpandSelect: true
            });

            // 전역 모델로 설정 ("" = default model)
            this.setModel(oODataModel);

            // enable routing
            this.getRouter().initialize();
        }
    });
});