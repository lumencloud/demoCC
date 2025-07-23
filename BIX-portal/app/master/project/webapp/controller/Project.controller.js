sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "bix/common/library/control/Modules",
    "bix/common/library/customDialog/OrgSingleSelect",
    "sap/ui/core/EventBus",
], (Controller, JSONModel, MessageToast, Filter, FilterOperator, Modules, OrgSingleSelect, EventBus) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Input} Input
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     */
    return Controller.extend("bix.master.project.controller.Project", {
        _oEventBus: EventBus.getInstance(),

        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("Project");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: async function (oEvent) {
            this.getView().setBusy(true);
            Modules.setIconTab(oEvent); // hash 값 , 새로고침 시 메뉴, 사이드메뉴 select 모듈함수
            // 초기 모델 설정
            await this._setModel();


            // 모델 속성 변경 시 발생하는 이벤트
            this.getOwnerComponent().getModel().attachPropertyChange(function (oEvent) {
                this.getView().getModel("uiModel").setProperty("/hasPendingChanges", true);
            }.bind(this))




            this.getView().setBusy(false);
        },

        /**
         * 초기 모델 설정
         */
        _setModel: async function () {
            // 검색창 , UI 초기화
            this.getView().setModel(new JSONModel({ edit: false, hasPendingChanges: false }), "uiModel");

            const andFilter = new Filter([
                    new Filter("org_id", FilterOperator.NE, null),
                    new Filter([
                        new Filter("org_parent", FilterOperator.EQ, null),
                        new Filter("org_parent", FilterOperator.EQ, ''),
                    ], false)
                ], true)

            const oBinding = this.getOwnerComponent().getModel().bindContext("/org_full_level", null, null, andFilter);
            let oRequest = await oBinding.requestObject();            
            
            // 최상위 부모 값
            let oParentOrg = oRequest.value[0];

            this.getView().setModel(new JSONModel({
                orgId: oParentOrg.id,
                orgNm: oParentOrg.name
            }), "searchModel");

            this.byId("orgInput").setValue("")

            // 테이블 데이터 바인딩
            setTimeout(() => {
                this.onSearch(this, 'start');
            }, 0);

        },

        /**
       * Footer 버튼 클릭 이벤트
       * @param {Event} oEvent 
       * @param {String} sFlag save: 저장, cancel: 취소 
       */
        onFooterButton: async function (oEvent, sFlag) {
            if (sFlag === "edit") { // 수정 버튼 클릭
                this.getView().getModel("uiModel").setProperty("/edit", true);
            } else if (sFlag === "save") { // 저장

                let bConfirm = await Module.messageBoxConfirm('information', '저장하시겠습니까?', '도메인 저장');
                if (!bConfirm) return;

                this.getView().setBusy(true);

                const oModel = this.getView().getModel();
                if (oModel.hasPendingChanges("batchDomain")) {
                    oModel.submitBatch("batchDomain").then(
                        // 저장 성공 시
                        function () {
                            this.getView().setBusy(false);

                            MessageToast.show("저장이 완료되었습니다.");
                            this.getView().setModel(new JSONModel({ edit: false, hasPendingChanges: false }), "uiModel");
                        }.bind(this),
                        // 저장 실패 시
                        function () {
                            this.getView().setBusy(false);

                            MessageToast.show("저장에 실패하였습니다.");
                        }.bind(this)
                    )
                }
            } else if (sFlag === "cancel") { // 취소
                // 수정 사항이 있을 경우 확인
                const oModel = this.getView().getModel();
                if (oModel.hasPendingChanges("batchDomain")) {
                    let bConfirm = await Module.messageBoxConfirm('warning', '작성된 내용은 저장되지 않습니다. 취소하시겠습니까?', '취소 확인');
                    if (!bConfirm) return;
                }

                // 변경 취소 및 데이터 모델 새로고침
                oModel.resetChanges("batchDomain");
                oModel.resetChanges("projectMaster");
                oModel.refresh();

                // uiModel 초기화
                this.getView().setModel(new JSONModel({ edit: false, hasPendingChanges: false }), "uiModel");
            };
        },

        /**
        * 입력 필드 liveChange 이벤트
        * @param {Event} oEvent 
        */
        onLiveChange: async function (oEvent) {
            let oSource = /** @type {Input} */ (oEvent.getSource());
            let sNewValue = oSource.getValue();
            let oTableRowContext = oSource.getBindingContext();
            let oRowData = oTableRowContext.getObject();

            //현재 입력한 input의 바인딩된 model의 key 값을 가져옴 
            let sPrjKey = oRowData.prj_no;

            let oModel = this.getView().getModel();
            //현재 입력한 input 의 필드값을 가져옴 ex) bd_n3_cd
            let sField = oSource.getBindingInfo("value").parts[0].path

            let sPath = `/project_biz_domain(prj_no='${sPrjKey}')`;

            // 먼저 DB에 key값과 동일한 데이터가 있는지 확인하기위해 binding
            let oListBinding = oModel.bindList("/project_biz_domain", undefined, undefined, [
                new Filter("prj_no", FilterOperator.EQ, sPrjKey)], {
                $$updateGroupId: "batchDomain"
            }
            )
            await oListBinding.requestContexts(0, 1);

            // DB에 prj_no 데이터가 있으면 Update
            if (oListBinding.getLength() > 0) {
                let oContext = await oModel.bindContext(sPath, undefined, {
                    $$updateGroupId: "batchDomain"
                })
                oContext.getBoundContext().setProperty(`${sPath}/${sField}`, sNewValue)

                // DB에 prj_no 데이터가 있으면 Create
            } else {
                let oBinding = await oModel.bindList("/project_biz_domain", undefined, undefined, undefined, {
                    $$updateGroupId: "batchDomain"
                })
                oBinding.create({
                    prj_no: sPrjKey,
                    [sField]: sNewValue
                })
                this.getView().getModel("uiModel").setProperty("/hasPendingChanges", true);
            }
        },

        /**
         * 검색창 검색 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag search : 검색, refresh : 초기화 
         */
        onSearch: async function (oEvent, sFlag) {
            let oTable = this.byId("projectTable");
            let aFilters = [];

            // 초기화 시
            if (sFlag === "refresh") {
                await this._setModel();

                this.byId("orgInput").setValueState("None")

                MessageToast.show("검색조건이 초기화되었습니다.")
            }  else if (sFlag === "search") {
                let oComponentData = this.getView().getModel("searchModel")
                let oSearchData = oComponentData.getData();
                // 조직 (부문, 본부, 팀 전체 검색)
                if (oSearchData.orgId) {
                    const aOrgFilters = [
                        new Filter({
                            path: "lv1_id",
                            operator: FilterOperator.EQ,
                            value1: oSearchData.orgId,
                            caseSensitive: false,
                        }),
                        new Filter({
                            path: "lv2_id",
                            operator: FilterOperator.EQ,
                            value1: oSearchData.orgId,
                            caseSensitive: false,
                        }),
                        new Filter({
                            path: "lv3_id",
                            operator: FilterOperator.EQ,
                            value1: oSearchData.orgId,
                            caseSensitive: false,
                        }),
                        new Filter({
                            path: "div_id",
                            operator: FilterOperator.EQ,
                            value1: oSearchData.orgId,
                            caseSensitive: false,
                        }),
                        new Filter({
                            path: "hdqt_id",
                            operator: FilterOperator.EQ,
                            value1: oSearchData.orgId,
                            caseSensitive: false,
                        })
                    ]
                    aFilters.push(new Filter(aOrgFilters, false)) // AND 조건


                    // 프로젝트 번호로 검색
                    if (oSearchData.prj_no) {
                        aFilters.push(
                            new Filter({
                                path: "prj_no",
                                operator: FilterOperator.Contains,
                                variable: "prj_no",
                                value1: oSearchData.prj_no,
                                caseSensitive: false,
                            })
                        );
                    }

                    //프로젝트 명
                    if (oSearchData.prj_nm) {
                        aFilters.push(
                            new Filter({
                                path: "prj_nm",
                                operator: FilterOperator.Contains,
                                variable: "prj_nm",
                                value1: oSearchData.prj_nm,
                                caseSensitive: false,
                            })
                        );
                    }
                    MessageToast.show("검색이 완료되었습니다.")
                }
            }
            // 테이블 바인딩
            oTable.bindRows({
                path: "/project_biz_domain_view",
                filters: aFilters,
                parameters: {
                    $count: true,
                    $$updateGroupId: "projectMaster",
                    $orderby: "modifiedAt desc"
                },
                events: {
                    dataRequested: function () {
                        oTable.setBusy(true);
                    }.bind(this),
                    dataReceived: function (oEvent) {
                        let oHeaderContext = oEvent.getSource().getHeaderContext();
                        this.byId("projectTitle").setBindingContext(oHeaderContext);

                        oTable.setNoData("데이터가 없습니다.");
                        oTable.setBusy(false);
                    }.bind(this),
                },
            });
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
                afterSave: function () {
                    let oSearchData = this.getView().getModel("searchModel").getData();
                    let oEventData = {
                        orgId: oSearchData.orgId,
                    }
                    // EventBus Publish
                    this._oEventBus.publish("pl", "search");
                }.bind(this),
            });
            this._oOrgSingleSelectDialog.open();
        },
        /**
        * 조직 선택 Suggestion 선택 시
        * @param {Event} oEvent 
        */
        onOrgSingleChange: function (oEvent) {
            let oSource = oEvent.getSource();
            let sValue = oEvent.getParameters()["value"];
            let aItems = oSource.getSuggestionItems();
            let isValid = aItems.find(oItem => oItem.getText() === sValue);

            // 조직 데이터 중 입력한 조직 유효성 검사
            if (!isValid && sValue) {
                oSource.setValueState("Error");
            }
            else if (!isValid && sValue === "") {
                oSource.setValueState("None");
                return;
            }
            else {
                oSource.setValueState("None");
                // 검색 EventBus Publish
                let oSearchData = this.getView().getModel("searchModel").getData();
                let oEventData = {
                    orgId: oSearchData.orgId,
                }
                this._oEventBus.publish("pl", "search", oEventData);
            }
        },
    });
});