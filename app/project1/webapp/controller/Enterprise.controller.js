sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "project1/model/formatter",
    "sap/ui/core/Fragment",
    "sap/ui/model/odata/v4/ODataModel"
], function (
    Controller, JSONModel, formatter, Fragment, ODataModel
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
            }) // 프래그먼트 모델

            this._setOdataModel()
            const oViewModel = new JSONModel({
                editMode: true,
                hasUIChanges: false
            });
            this.getView().setModel(oViewModel, "view");
        },

        _setOdataModel: function () {
            const oData = new ODataModel({
                serviceUrl: "/project/",
                synchronizationMode: "None",
                operationMode: "Server"
            })
            this.getView().setModel(oData);

            let oDataModel = this.getView().getModel()

            let oBinding = oDataModel.bindList("/Project_tableView", undefined, [new sap.ui.model.Sorter("rank")], [new sap.ui.model.Filter("year", "EQ", "2024")])
            oBinding.requestContexts().then((aContext) => {
                const aData = aContext.map(ctx => ctx.getObject());
                console.log("aData:", aData);
                const oTalbeModel = this._findChildNode(aData)
                console.log("oTalbeModel:", oTalbeModel)

                this.getView().setModel(new JSONModel(oTalbeModel), "TableModel")
                
                const oData = this.getView().getModel("TableModel").getProperty("/");
                const oBackupModel = new JSONModel(JSON.parse(JSON.stringify(oData)));

                this.getView().setModel(oBackupModel, "BackupTableModel");
            })


            let oContextBinding = oData.bindContext("/Project_tableView")
            let oPropertyBinding = oData.bindProperty("year", oContextBinding.getBoundContext());

            console.log("oContextBinding:", oContextBinding);
            console.log("oPropertyBinding:", oPropertyBinding);
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

        _findChildNode: function markLeafNodes(data) {
            const parentSet = new Set(data.map(d => d.parent_id).filter(Boolean));
            return data.map(d => {
                d.isLeaf = !parentSet.has(d.node_id);
                return d;
            });
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

        onBack: function (oEvent) {
            this.getOwnerComponent().getRouter().navTo("RouteView1")
        },

        onSave: async function () {
            const oView = this.getView();
            const oModel = oView.getModel();
            const aCurrentData = oView.getModel("TableModel").getProperty("/");
            const aOriginalData = oView.getModel("BackupTableModel").getProperty("/");

            const oOrgBinding = oModel.bindList("/Organization", null, [], [], {
                $$updateGroupId: "OrganizationUpdateGroup"
            });

            let bHasChanges = false;

            // 변경 감지 (isNew || 필드 비교)
            const aChangedRows = aCurrentData.filter(row => {
                if (row.isNew) return true;

                const oOriginal = aOriginalData.find(orig =>
                    orig.totalTargetMargin === row.totalTargetMargin &&
                    orig.organization_name === row.organization_name &&
                    orig.totalTargetRevenue === row.totalTargetRevenue
                );

                if (!oOriginal) return true; // 혹시 원본에 없으면 무조건 변경된 것으로 간주

                return (
                    oOriginal.totalTargetRevenue !== row.totalTargetRevenue ||
                    oOriginal.totalTargetMargin !== row.totalTargetMargin ||
                    oOriginal.organization_name !== row.organization_name
                );
            });

            if (aChangedRows.length === 0) {
                sap.m.MessageToast.show("변경된 데이터가 없습니다.");
                return;
            }

            for (const row of aChangedRows) {
                if (row.isNew) {
                    // 신규 Organization 생성
                    if (row.organization_name) {
                        const oContext = oOrgBinding.create({
                            id: row.node_id,
                            name: row.organization_name
                        });

                        try {
                            await oContext.created();
                            bHasChanges = true;
                        } catch (err) {
                            sap.m.MessageBox.error("Organization 생성 실패: " + err.message);
                        }
                    }

                    row.isNew = false;
                } else {
                    // 기존 Organization 수정
                    if (row.organization_name) {
                        const oOrgContextBinding = oModel.bindContext(
                            `/Organization(id='${row.node_id}')`,
                            null,
                            { $$updateGroupId: "OrganizationUpdateGroup" }
                        );

                        try {
                            const oOrgData = await oOrgContextBinding.requestObject();
                            if (oOrgData) {
                                const oOrgContext = oOrgContextBinding.getBoundContext();
                                oOrgContext.setProperty("name", row.organization_name);
                                bHasChanges = true;
                            }
                        } catch (err) {
                            if (err.message.includes("404")) {
                                console.log(`Organization 없음 → 생략: ${row.node_id}`);
                            } else {
                                console.error("Organization 체크 실패:", err);
                            }
                        }
                    }

                    // 기존 Target 수정 (존재하는 경우에만)
                    if (row.totalTargetRevenue != null && row.totalTargetMargin != null) {
                        const oTargetBinding = oModel.bindContext(
                            `/Targets(organization_id='${row.node_id}',year=${row.year},month=${row.month})`,
                            null,
                            { $$updateGroupId: "TargetUpdateGroup" }
                        );

                        try {
                            const oTargetData = await oTargetBinding.requestObject();
                            if (oTargetData) {
                                const oTargetContext = oTargetBinding.getBoundContext();
                                oTargetContext.setProperty("targetRevenue", row.totalTargetRevenue);
                                oTargetContext.setProperty("targetMargin", row.totalTargetMargin);
                                bHasChanges = true;
                            }
                        } catch (err) {
                            if (err.message.includes("404")) {
                                console.log(`Target 없음 → 생략: ${row.node_id} (${row.year}/${row.month})`);
                            } else {
                                console.error("Target 체크 실패:", err);
                            }
                        }
                    }
                }
            }

            if (!bHasChanges) {
                sap.m.MessageToast.show("변경된 데이터가 없습니다.");
                return;
            }

            try {
                await Promise.all([
                    oModel.submitBatch("TargetUpdateGroup"),
                    oModel.submitBatch("OrganizationUpdateGroup")
                ]);

                sap.m.MessageToast.show("저장 완료!");

                // 최신 상태로 원본 백업 다시 업데이트
                const aCloned = JSON.parse(JSON.stringify(aCurrentData));
                oView.getModel("BackupTableModel").setProperty("/", aCloned);
            } catch (err) {
                sap.m.MessageBox.error("저장 실패: " + err.message);
            }
        },

        addRow: function () {
            const oModel = this.getView().getModel("TableModel");
            const aData = oModel.getProperty("/") || [];

            aData.push({
                node_id: "",
                organization_name: "",
                totalTargetRevenue: 0,
                totalTargetMargin: 0,
                isLeaf: true,
                isNew: true
            });

            oModel.setProperty("/", aData);
        },

        onCancel: function (oEvent) {
            this.getView().getModel("view").setProperty("/hasUIChanges", false);
        },

        onDelete: function () {
            const oTable = this.byId("tableId");
            const aIndices = oTable.getSelectedIndices();

            if (!aIndices.length) {
                sap.m.MessageToast.show("삭제할 행을 선택해주세요.");
                return;
            }
            const iIndex = aIndices[0];
            const oContext = oTable.getContextByIndex(iIndex);
            const oRowData = oContext.getObject();
            const oModel = this.getView().getModel();

            const sPath = `/Organization(id='${oRowData.node_id}')`;

            const oDeleteContext = oModel.bindContext(sPath, null, {
                $$updateGroupId: "OrganizationUpdateGroup"
            }).getBoundContext();

            oDeleteContext.requestObject().then(() => {
                oDeleteContext.delete();

                return oModel.submitBatch("OrganizationUpdateGroup");
            }).then(() => {
                sap.m.MessageToast.show("삭제 완료!");

                // 선택 해제 및 테이블 리프레시
                oTable.clearSelection();

                // 또는 ViewModel 사용 중이면 직접 갱신
                const aData = this.getView().getModel("TableModel").getProperty("/");
                const aNewData = aData.filter(row => row.node_id !== oRowData.node_id);
                this.getView().getModel("TableModel").setProperty("/", aNewData);
            }).catch((oError) => {
                sap.m.MessageBox.error("삭제 실패: " + oError.message);
            });
        },
        onRefresh: function () {
            this._setOdataModel();
            sap.m.MessageToast.show("초기화 완료")
        },
    });
});