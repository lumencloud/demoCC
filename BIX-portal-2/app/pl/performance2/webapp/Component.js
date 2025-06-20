sap.ui.define([
    "sap/ui/core/UIComponent",
    "bix/pl/performance2/model/models",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/HashChanger",
    "sap/m/MessageToast",
], (UIComponent, models, JSONModel, HashChanger, MessageToast) => {
    "use strict";

    return UIComponent.extend("bix.pl.performance2.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init: async function () {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // 데이터 검색 모델 (임시로 2024년 9월로 고정 / 초기는 전사로 고정)
            const oBinding = this.getModel("cm").bindContext("/latest_org", null, {
                $filter: "parent eq null"
            });
            let oRequest = await oBinding.requestObject();
            let oParentOrg = oRequest.value[0];


            //version 에서 tag가 C 를 가져와서 year month  가져오기
            const oContext = this.getModel("cm").bindContext("/Version", null, {
                $filter: "tag eq 'C'"
            });
            const oData = await oContext.requestObject();

            //Date형식으로 전환
            const dDate = new Date(
                oData.value[0].year, oData.value[0].month - 1
            )

            this.setModel(new JSONModel({
                yearMonth: dDate,
                orgId: oParentOrg.id,
                orgNm: oParentOrg.name
            }), "searchModel");

            //다른 manifest에 속한 카드에 초기 데이터 넘겨주기용 세션스토리지
            sessionStorage.setItem("initSearchModel",
                JSON.stringify({
                    yearMonth: dDate,
                    orgId: oParentOrg.id,
                    orgNm: oParentOrg.name,
                    orgType: oParentOrg.org_type
                })
            )

            // 로그인한 사용자 정보를 담는 모델
            const oUserModel = new JSONModel("/self");
            this.setModel(oUserModel, "userModel");

            // ui 제어에 사용하는 해시 모델
            this.setModel(new JSONModel({}), "hashModel");

            const oMenuContext = this.getModel("cm").bindContext("/Menus", null, {
                $filter: "isApp eq 'sub' and category eq 'pl' and code eq 'performance2' and use_yn eq true and delete_yn ne true",
                $orderby : "sort_order asc"
            });
            const oMenuRequest = await oMenuContext.requestObject();        

            // 메뉴 목록 설정
            this.setModel(new JSONModel(oMenuRequest.value), "detailModel");

            // enable routing
            this.getRouter().initialize();
        },
    });
});