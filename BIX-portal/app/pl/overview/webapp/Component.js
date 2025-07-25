sap.ui.define([
    "sap/ui/core/UIComponent",
    "bix/pl/overview/model/models",
    "sap/ui/model/json/JSONModel",
    'sap/ui/core/Component',
    'sap/ui/core/Element'
], (UIComponent, models, JSONModel, Component, Element) => {
    "use strict";

    return UIComponent.extend("bix.pl.overview.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init: function () {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            this._asyncInit();

            // enable routing
            this.getRouter().initialize();
        },
        _asyncInit: async function () {
            // QA 버튼 비활성화 처리 모델
            let sEnv = window.location.host.includes('skax') ? 'PRD' : (window.location.host.includes('qa') ? 'QA' : 'DEV');
            this.setModel(new JSONModel({ env: sEnv }), "envModel");

            //sgaDetailTable ai관련 orgId 초기화
            sessionStorage.setItem("aiModel",
                JSON.stringify({
                    orgId: "",
                    type: "",
                    aiOrgTypeCode: false
                })
            )

            // // 로그인한 사용자 정보를 담는 모델
            // const oUserModel = new JSONModel("/self");
            // this.setModel(oUserModel, "userModel");

            this.oUserModel = Component.getOwnerComponentFor(Element.getElementById("container-bix.main---App"))?.getModel("main_userModel");
            this.setModel(this.oUserModel, "main_userModel");

            // 검색 조건 정보를 담는 모델
            this.setModel(new JSONModel({}), "searchModel");

            // ui 제어에 사용하는 해시 모델
            this.setModel(new JSONModel({}), "hashModel");

            const oMenuContext = this.getModel("cm").bindContext("/Menus", null, {
                $filter: "isApp eq 'sub' and category eq 'pl' and code eq 'overview' and use_yn eq true and delete_yn ne true",
                $orderby: "sort_order asc"
            });
            const oMenuRequest = await oMenuContext.requestObject();

            // 메뉴 목록 설정
            oMenuRequest.value.forEach((oMenu) => {
                if (oMenu.detail_path === "offshoring") {
                    oMenu["disabled"] = true;
                }
            })
            this.setModel(new JSONModel(oMenuRequest.value), "detailModel");
        },
    });
});