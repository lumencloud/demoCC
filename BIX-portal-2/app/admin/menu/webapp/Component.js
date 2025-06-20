sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
], (UIComponent, JSONModel) => {
    "use strict";

    return UIComponent.extend("bix.admin.menu.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init: async function () {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(new JSONModel({
                tableVisibleButton: true,  // 테이블 수정 버튼 클릭 제어
                tableEnabledButton: false,  // 테이블 추가 삭제 enable 제어 
                tableSaveButton: false, // 테이블 데이터 변경 시 저장 버튼 enable true
                tableMoveButton: false, // 테이블 최상위로 이동 제어 버튼
                hasError: false,
            }), "uiModel");

            await this._requestMetadata();

            // enable routing
            this.getRouter().initialize();
        },

        _requestMetadata: async function () {
            let oModel = this.getModel();
            let oMetaModel = oModel.getMetaModel();
            await oMetaModel.requestObject("/Menus");
        },

    });
});