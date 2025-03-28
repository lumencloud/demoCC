sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "project1/model/formatter",
    "sap/ui/core/Fragment",
    "sap/ui/model/odata/v4/ODataModel"
], (Controller, JSONModel, formatter, Fragment, ODataModel) => {
    "use strict";


    return Controller.extend("project1.controller.View", {
        formatter: formatter,

        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteView1");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        onMyRoutePatternMatched: function () {
            let oData = new ODataModel({
                serviceUrl: "/project/", 
                synchronizationMode: "None",
                operationMode: "Server",
                autoExpandSelect: true
            })
            this.getView().setModel(oData, "odataModel")

            debugger;

            // let oDataModel = this.getView().getModel();

            // // OData V4에서 데이터 가져오기
            // let oListBinding = oDataModel.bindList("/Project_tableView", undefined, undefined, undefined, {
            //     $orderby: "rank"
            // });

            // oListBinding.requestContexts().then(function (aContexts) {       // aContext 는 배열을 반환한다.
            //     // 데이터 추출
            //     let aData = aContexts.map(function (oContext) {  // oContext[0].getObject() 데이터를 반환한다
            //         return oContext.getObject();
            //     });
            //     // 데이터를 가공
            //     let aProcessedData = this._processData(aData);
            //     // JSON 모델로 설정
            //     let oJSONModel = new JSONModel({ ProjectData: aProcessedData });
            //     this.getView().setModel(oJSONModel);
            // }).catch(function (oError) {
            // });
        },

        onButtonPress: function (oEvent) {
            this.getOwnerComponent().getRouter().navTo("EnterpriseView")
        },
        onDialogOrgaOpen: function () {
            this.getHierachyTree("/project/Project_view").then((result) => {
                this.getView().setModel(new JSONModel(result), "OrganizationModel")
                this.onDialogOpen();
            })
        },

        onDialogOpen: function () {
            let oView = this.getView();

            // 다이얼로그가 이미 존재하는지 확인
            if (!this._oDialog) {
                // Fragment를 비동기 방식으로 로드
                Fragment.load({
                    id: oView.getId(), // View ID를 Fragment의 ID prefix로 설정
                    name: "project1.view.fragment.Organization", // 실제 Fragment 경로로 수정
                    controller: this
                }).then(function (oDialog) {
                    // 다이얼로그를 뷰에 종속시킴 (life-cycle 관리)
                    oView.addDependent(oDialog);
                    oDialog.open();
                    this._oDialog = oDialog;
                }.bind(this));
            } else {
                this._oDialog.open();
            }
        },
        onDialogSelect: function () {
            const oTable = this.byId("organizationTreeTable");
            const aSelectedIndices = oTable.getSelectedIndices();

            if (aSelectedIndices.length === 0) {
                MessageToast.show("조직을 선택해주세요.");
                return;
            }

            const oSelectedContext = oTable.getContextByIndex(aSelectedIndices[0]);
            const oSelectedData = oSelectedContext.getObject();

            // 선택된 조직명 추출
            const sOrganizationName = oSelectedData.organization_name;
            let sParentId = oSelectedData.parent_id;

            // 외부 Input에 값 세팅
            const oInput = this.byId("inputOrganization");
            this._sSelectedParentId = sParentId;
            oInput.setValue(sOrganizationName);

            // Dialog 닫기
            this.byId("oraganizationDialog").close();
        },
        onDialogClose: function () {
            if (this._oDialog) {
                this._oDialog.close();
            }
        },
        getHierachyTree: function (sUrl) {
            let settings = {
                type: "get",
                async: false,
                url: sUrl,
            };
            return new Promise((resolve) => {
                $.ajax(settings).done((result) => {
                    let data = result.value
                    let nodeMap = {};
                    data.forEach(item => {
                        nodeMap[item.node_id] = {
                            ...item,
                            children: []
                        }
                    });

                    let rootNodes = [];
                    data.forEach(item => {
                        if (!item.parent_id) {
                            // 부모가 없는 노드는 루트 노드
                            rootNodes.push(nodeMap[item.node_id]);
                        } else if (nodeMap[item.parent_id]) {
                            // 부모가 있는 노드는 해당 부모의 children에 추가
                            nodeMap[item.parent_id].children.push(nodeMap[item.node_id]);
                        }
                    });
                    resolve(rootNodes); // 계층화된 데이터 반환  

                }).fail((xhr) => {
                    resolve(xhr);
                })
            })
        },
        onSearchPress: async function () {
            const oView = this.getView();
            const aSelectedYears = oView.byId("yearComboId").getSelectedKeys();
            const sOrganizationName = oView.byId("inputOrganization").getValue().trim();

            if (aSelectedYears == '' || sOrganizationName == '') {
                sap.m.MessageToast.show("검색 조건을 선택해주세요")
                return
            }

            // let sParentId = this._sSelectedParentId;

            let aFilters = [];

            if (aSelectedYears.length > 0) {
                const sYearFilter = aSelectedYears
                    .map((year) => `year eq ${year}`)
                    .join(" or ");
                aFilters.push(`(${sYearFilter})`);
            }

            if (sOrganizationName) {
                aFilters.push(`contains(name,'${sOrganizationName}')`);
            }

            const sFilterQuery = aFilters.length > 0 ? `$filter=${aFilters.join(" and ")}` : "";
            const sUrl = `/project/Project_view${sFilterQuery ? "?" + sFilterQuery : ""}`;

            try {
                const result = await $.ajax({
                    type: "GET",
                    url: sUrl
                });
                const sYearsText = aSelectedYears.length > 0 ? aSelectedYears.join(", ") + "년" : "전체 연도";
                const sOrgText = sOrganizationName ? sOrganizationName : "전체 조직";
                const sTitle = `프로젝트 (${sYearsText} / ${sOrgText})`;

                // 타이틀 텍스트 적용
                oView.byId("title").setText(sTitle);
                oView.setModel(new JSONModel(result.value), "mainModel");
            } catch (error) {
                console.error("검색 실패:", error);
            }
        },
        onReset: function () {
            const oView = this.getView();
            const oYearComboBox = oView.byId("yearComboId");
            oYearComboBox.removeAllSelectedItems(); // 선택 항목 초기화
            oYearComboBox.setSelectedKeys([]); // 키 배열도 초기화

            this.onMyRoutePatternMatched();
            oView.byId("title").setText("프로젝트");
            const oOrgInput = oView.byId("inputOrganization");
            oOrgInput.setValue(""); // 값 제거
        }
    });
});