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

            const dNow = new Date();
            this.setModel(new JSONModel({
                yearMonth: new Date(dNow.getFullYear(), dNow.getMonth() - 2),   // 임시로 2025년 3월로 고정
                orgId: oParentOrg.id,
                orgNm: oParentOrg.name
            }), "searchModel");

            //다른 manifest에 속한 카드에 초기 데이터 넘겨주기용 세션스토리지
            sessionStorage.setItem("initSearchModel",
                JSON.stringify({
                    yearMonth: new Date(dNow.getFullYear(), dNow.getMonth() - 2),   // 임시로 2025년 3월로 고정
                    orgId: oParentOrg.id,
                    orgNm: oParentOrg.name
                })
            )

            // 로그인한 사용자 정보를 담는 모델
            const oUserModel = new JSONModel("/self");
            this.setModel(oUserModel, "userModel");

            // ui 제어에 사용하는 해시 모델
            this.setModel(new JSONModel({}), "hashModel");

            // 메뉴 목록 설정
            this._aDetail = [
                { page: "actual", detail: "saleMargin", text: "매출/마진" },
                { page: "actual", detail: "sga", text: "SG&A" },
                { page: "actual", detail: "dtSaleMargin", text: "DT 매출/마진" },
                { page: "actual", detail: "nonMm", text: "Non-MM" },
                { page: "actual", detail: "br", text: "BR" },
                { page: "actual", detail: "rohc", text: "RoHC" },

                { page: "plan", detail: "enterprisePipeline", text: "전사 Pipeline 상세" },
                { page: "plan", detail: "saleMargin", text: "매출/마진" },
                { page: "plan", detail: "sga", text: "SG&A" },
                { page: "plan", detail: "dtSaleMargin", text: "DT 매출/마진" },
                { page: "plan", detail: "offshoring", text: "Offshoring" },
                { page: "plan", detail: "nonMm", text: "Non-MM" },
                { page: "plan", detail: "br", text: "BR" },
                { page: "plan", detail: "account", text: "Account" },
                { page: "plan", detail: "divPipeline", text: "부문 Pipeline 상세" }
            ];
            this.setModel(new JSONModel(this._aDetail), "detailModel");

            // enable routing
            this.getRouter().initialize();
        },
    });
});