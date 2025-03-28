sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "project1/model/formatter",
     "sap/ui/core/Fragment"
], function (
    Controller, JSONModel, formatter, Fragment
) {
    "use strict";

    return Controller.extend("project1.controller.Enterprise", {
        formatter: formatter,

        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("EnterpriseView");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        onMyRoutePatternMatched: async function () {
            this.getHierachyTree("/project/Project_hierView").then((result) => {
                this.getView().setModel(new JSONModel(result), "organizModel")
            })
        },

        handleNav: function (oEvent) {
            let navCon = this.byId("navCon");
            let target = oEvent.getSource().data("target")
            if (target) {
                navCon.to(this.byId(target), "slide");
            } else {
                navCon.back();
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
        onDialogOrgaOpen: function () {
            this.getHierachyTree("/project/Project_tableView?$filter=year eq '2025'").then((result) => {
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

		onBack: function(oEvent) {
			this.getOwnerComponent().getRouter().navTo("RouteView1")
		}
    });
});