sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "bix/common/library/customDialog/OrgSingleSelect",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/library",
    "sap/m/Token",
    "sap/ui/core/EventBus"

], (BaseController, JSONModel, OrgSingleSelect, MessageBox, MessageToast, coreLib, Token, EventBus) => {
    "use strict";

    return BaseController.extend("bix.pl.performance.controller.Splitter", {
        _oOrgSingleSelectDialog: undefined,
        _oEventBus: EventBus.getInstance(),

        onInit: function () {
            // let oRootRouter = sap.ui.core.Component.getComponentById("container-bix.main").getRouter();

            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteSGA");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        onMyRoutePatternMatched: function (oEvent) {

        },

        /**
         * 초기 설정
         */
        onAfterRendering: function () {
            this._oEventBus.publish("mainApp", "busy", { loaded: true })

            let oDatePicker = this.byId("datePicker");
            // oDatePicker.setDateValue(new Date());
            oDatePicker.setDateValue(new Date("2024-09"));
            oDatePicker.setMinDate(new Date(2024, 0, 1));
            oDatePicker.setMaxDate(new Date());

            // 토큰 최상위 조직으로 설정
            let oToken = new Token({
                key: "5",
                text: "SK주식회사 AX"
            })
            this.byId("orgId").setTokens([oToken]);
            this.getOwnerComponent().getModel("searchModel").setProperty("/orgId", "5");

            let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();

            let dYearMonth = oSearchData.yearMonth;
            let iYear = dYearMonth.getFullYear();
            let iMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");

            //다른 manifest에 속한 카드에 초기 데이터 넘겨주기용 세션스토리지
            sessionStorage.setItem("initSearchModel", 
                JSON.stringify({ 
                    yearMonth: new Date(iYear + "-" + iMonth),
                    orgId : oSearchData.orgId
                })
            )

            setTimeout(()=>{
                this._oEventBus.publish("pl", "search", { orgId: oSearchData.orgId, year: iYear, month: iMonth});
            }, 1500)
        },

        /**
         * Example 테이블 조직 검색 체인지 이벤트
         * @param {Event} oEvent 
         */
        onAddDepInputLiveChange: function (oEvent) {
            let oSource = /** @type {sap.m.MultiInput} */ (oEvent.getSource());
            if (oSource.getValue()) oSource.setValue(null);
        },

        /**
         * 조직 검색 토큰 삭제 시
         * @param {Event} oEvent 
         */
        onAddDepTokenUpdate: function (oEvent) {
            let oSource = /** @type {sap.m.MultiInput} */ (oEvent.getSource());
            let sType = oEvent.getParameters()["type"];

            // 필드가 필수값일 때
            if (oSource.getFieldGroupIds().includes("Required")) {
                if (oSource.getTokens().length === 0) {
                    oSource.setValueState(coreLib.ValueState.Error);
                } else {
                    oSource.setValueState(coreLib.ValueState.None);
                }
            }

            // 토큰 삭제 시 바인딩된 모델의 Property 값 삭제
            if (sType === "removed") {
                let oBindingModel = oSource.getBinding("selectedKey").getModel();
                let sBindingPath = oSource.getBinding("selectedKey").getPath();
                oBindingModel.setProperty(sBindingPath, null);
            }
        },

        /**
         * 매출조직명 Dialog Open
         * @param {Event} oEvent 
         */
        onOrgSingleSelectDialogOpen: async function (oEvent) {
            let oSource = oEvent.getSource();

            this._oOrgSingleSelectDialog = new OrgSingleSelect({
                fragmentController: this,
                bindingSource: oSource,
            });

            this._oOrgSingleSelectDialog.open();
        },

        /**
         * Pl 대시보드 검색 이벤트
         * @param {Event} oEvent 
         */
        onSearch: async function (oEvent) {
            // 유효성 검사
            let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();

            let dYearMonth = oSearchData.yearMonth;
            let iYear = dYearMonth.getFullYear();
            let iMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");

            //다른 manifest에 속한 카드에 초기 데이터 넘겨주기용 세션스토리지
            sessionStorage.setItem("initSearchModel", 
                JSON.stringify({ 
                    yearMonth: new Date(iYear + "-" + iMonth),
                    orgId : "5"
                })
            )

            this._oEventBus.publish("pl", "search", { orgId: oSearchData.orgId, year: iYear, month: iMonth});

            let oMultiInput = this.byId("orgId");
            if (!oSearchData.orgId) {
                oMultiInput.setValueState("Error");
                this._messageBox('warning', '필수 필드값을 확인해주세요.');
                return;
            } else {
                oMultiInput.setValueState("None");
            }

            // 선택된 페이지 검색
            let aBindFunctions = [];

            let sPage = this.getView().getModel("uiModel").getProperty("/page");
            let oController = this.getOwnerComponent().getModel("controllerModel").getProperty("/" + sPage);
            let oController2 = this.getOwnerComponent().getModel("controllerModel").getProperty("/plgrid");
            if (oController) {
                aBindFunctions.push(oController._bindTable.bind(oController));
            }
            if (oController2) {
                aBindFunctions.push(oController._bindTable.bind(oController2));
            }

            let is3depth = this.getOwnerComponent().getModel("layoutControl").getProperty("/3depth_usage");
            let sThirdPage = this.getView().getModel("layoutControl").getProperty("/page");
            let oThirdController = this.getOwnerComponent().getModel("controllerModel").getProperty("/" + sThirdPage);
            if (is3depth) {
                if (sThirdPage === "sga") {
                    //sga 페이지 내부에 2개의 페이지가 있으므로 forEach 사용. 3depth_page에 2개 페이지 담았음.
                    let sThirdPageDetail = this.getView().getModel("layoutControl").getProperty("/3depth_page");
                    if(Array.isArray(sThirdPageDetail)){
                        sThirdPageDetail.forEach(data => {
                            let oTemp = this.getOwnerComponent().getModel("controllerModel").getProperty("/" + data);
                            aBindFunctions.push(oTemp._bindThird.bind(oTemp));
                        });
                    }else{
                        let oTemp = this.getOwnerComponent().getModel("controllerModel").getProperty("/" + sThirdPageDetail);
                        if(oTemp && oTemp._bindThird) aBindFunctions.push(oTemp._bindThird.bind(oTemp));
                    };
                } else {
                    aBindFunctions.push(oThirdController._bindThird.bind(oThirdController));
                };
            };

            Promise.all(aBindFunctions.map(fn => fn())).then(aResults => {
                MessageToast.show("검색이 완료되었습니다.");
            });
        },

        /**
         * 검색 조건 변경 이벤트
         * @param {Event} oEvent 
         */
        onChangeSearch: function (oEvent) {
            let oSource = oEvent.getSource();

            let isValidValue1 = oSource.isValidValue();
            let isValidValue2 = oSource.getDateValue();
            if (!isValidValue1 || !isValidValue2) {
                oEvent.getSource().setValueState("Error");
                return;
            } else {
                oEvent.getSource().setValueState("None");
            };
        },

        /**
         * 메시지 박스 생성 함수
         * @param {String} status 
         * @param {String} message 
         * @param {String} title 
         */
        _messageBox: function (status, message, title) {
            MessageBox[status](message, {
                title: title,
            })
        },
    });
});