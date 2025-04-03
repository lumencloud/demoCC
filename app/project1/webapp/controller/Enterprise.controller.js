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
            // const oData = new ODataModel({
            //     serviceUrl: "/project/",
            //     synchronizationMode: "None",
            //     operationMode: "Server"
            // })
            // this.getView().setModel(oData);

            let oDataModel = this.getView().getModel()

            let oBinding = oDataModel.bindList("/Project_tableView", undefined, [new sap.ui.model.Sorter("rank")], [new sap.ui.model.Filter("year", "EQ", "2024")])
            oBinding.requestContexts().then((aContext) => {
                const aData = aContext.map(ctx => ctx.getObject());
                console.log("aData 바인딩된 데이터:", aData);

                const oTalbeModel = this._findChildNode(aData)

                this.getView().setModel(new JSONModel(oTalbeModel), "TableModel")

                const oData = this.getView().getModel("TableModel").getProperty("/");
                const oBackupModel = new JSONModel(JSON.parse(JSON.stringify(oData)));

                this.getView().setModel(oBackupModel, "BackupTableModel");
            })


            // let oContextBinding = oData.bindContext("/Project_tableView")
            // let oPropertyBinding = oData.bindProperty("year", oContextBinding.getBoundContext());

            console.log("oContextBinding:", oContextBinding);
            console.log("oPropertyBinding:", oPropertyBinding);

            // let oTable = this.byId("tableId");
            // oTable.bindRows({
            //     path:'Project_tableView'
            // })
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
            let bHasChanges = false; // 기존 데이터와 변경된 값 확인 flag

            const oModel = this.getView().getModel();   // oData V4 모델
            const sUpdateGroupId = "MainUpdateGroup";   // Batch 처리할 GroupId

            const aCurrentData = this.getView().getModel("TableModel").getProperty("/");    // 수정된 현재 View Model
            const aOriginalData = this.getView().getModel("BackupTableModel").getProperty("/");  // 복사된 backup Model

            //bindList를 통해서 엔터티셋을 가져옴
            const oOrgBinding = oModel.bindList("/Organization", null, [], [], {
                $$updateGroupId: sUpdateGroupId
            });

            // 백업model vs 변경model 비교하여 변경된 값만 저장
            const aChangedRows = aCurrentData.filter(row => {
                if (row.isNew) return true; //새로 추가된 열이 있는지 확인

                const oOriginal = aOriginalData.find(orig => // 변경값 비교 확인
                    orig.totalTargetMargin === row.totalTargetMargin &&
                    orig.organization_name === row.organization_name &&
                    orig.totalTargetRevenue === row.totalTargetRevenue
                );

                if (!oOriginal) return true;  // 변경된 것이 하나도 없으면 true

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

            // 변경된 데이터들만 서버 요청
            for (const row of aChangedRows) {
                if (row.isNew) { // create일 경우
                    if (row.organization_name) {
                        oOrgBinding.create({    // create 요청을 즉시 서버로 전송하지 않음 Pending Changes 에 보관
                            id: row.node_id,
                            name: row.organization_name
                        });
                        bHasChanges = true;
                    }
                    row.isNew = false;
                } else {
                    if (row.organization_name) {
                        const oOrgContextBinding = oModel.bindContext(
                            `/Organization(id='${row.node_id}')`,
                            null,
                            { $$updateGroupId: sUpdateGroupId }
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

                    if (row.totalTargetRevenue != null && row.totalTargetMargin != null) {
                        const oTargetBinding = oModel.bindContext(
                            `/Targets(organization_id='${row.node_id}',year=${row.year},month=${row.month})`,
                            null,
                            { $$updateGroupId: sUpdateGroupId }
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
                await oModel.submitBatch(sUpdateGroupId);

                sap.m.MessageToast.show("저장 완료!");

                const aCloned = JSON.parse(JSON.stringify(aCurrentData));
                this.getView().getModel("BackupTableModel").setProperty("/", aCloned);
            } catch (err) {
                sap.m.MessageToast.show("저장 실패: " + err.message);
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

        onDelete: function () {
            const oTable = this.byId("tableId");
            const aIndices = oTable.getSelectedIndices();

            if (!aIndices.length) {
                sap.m.MessageToast.show("삭제할 행을 선택해주세요.");
                return;
            }

            const oModel = this.getView().getModel();
            const sUpdateGroupId = "OrganizationUpdateGroup";

            const aDeletePromises = [];
            const aDeletedNodeIds = [];

            aIndices.forEach(iIndex => {
                const oContext = oTable.getContextByIndex(iIndex);
                const oRowData = oContext.getObject();
                const sPath = `/Organization(id='${oRowData.node_id}')`;

                // 삭제 context 구성
                const oDeleteContext = oModel.bindContext(sPath, null, {
                    $$updateGroupId: sUpdateGroupId
                }).getBoundContext();

                // 삭제 요청 준비 (requestObject는 생략 가능, 에러 시 delete에서 catch됨)
                const pDelete = oDeleteContext
                    .requestObject()
                    .then(() => {
                        oDeleteContext.delete(); // 삭제 마킹
                        aDeletedNodeIds.push(oRowData.node_id); // 이후 ViewModel 정리용
                    }).catch((err) => {
                        console.warn(`삭제 실패(${oRowData.node_id}):`, err.message);
                    });

                aDeletePromises.push(pDelete);
            });

            Promise.all(aDeletePromises).then(() => {
                return oModel.submitBatch(sUpdateGroupId);
            }).then(() => {
                sap.m.MessageToast.show("삭제 완료!");

                // 테이블 선택 해제
                oTable.clearSelection();

                // ViewModel에서 삭제된 항목 제거
                const oTableModel = this.getView().getModel("TableModel");
                const aCurrentData = oTableModel.getProperty("/");
                const aNewData = aCurrentData.filter(row => !aDeletedNodeIds.includes(row.node_id));
                oTableModel.setProperty("/", aNewData);
            }).catch(err => {
                sap.m.MessageBox.error("삭제 중 오류 발생: " + err.message);
            });
        },

        onRefresh: function () {
            this._setOdataModel();
            sap.m.MessageToast.show("초기화 완료")
        },

        onCancel: function (oEvent) {
            this.getView().getModel("view").setProperty("/hasUIChanges", false);
        },

        onSearch: async function (oEvent) {
            /// Project?$filter=organization/name eq 'LG에너지솔루션'&$expand=organization
            let sQuery = this.getView().byId("searchId").getValue();
            let oTable = this.byId("testTable");
       
            // const oFilter = new sap.ui.model.Filter({
            //     path: "detail_customer/name",
            //     operator: sap.ui.model.FilterOperator.Contains,
            //     value1: sQuery
            //   });

            
            const oFilter = new sap.ui.model.Filter({
                path: "detail_customer",
                operator: sap.ui.model.FilterOperator.Any,
                variable: "c",
                condition: new sap.ui.model.Filter(`c/name`, sap.ui.model.FilterOperator.Contains, sQuery)
            });
            
            const oBinding = oTable.getBinding("rows");
            oBinding.filter([oFilter]);
            // oTable.bindRows({
            //     path: "/Account",
            //     parameters: {
            //         $expand: "detail_customer",
            //         $filter: `any(d:contains(d/name,'${sQuery}'))`
            //     }
            // });
        },

        onLocaleTest: async function (oEvent) {
            const oModel = this.getView().getModel(); // OData V4 모델

            const sKey = `Books_texts(ID='1',locale='us')`;

            const oContextBinding = oModel.bindContext("/" + sKey, null, {
                $$updateGroupId: "textsUpdateGroup"
            });

            try {
                // 실제 엔터티 객체 요청
                const oData = await oContextBinding.requestObject();

                if (oData) {
                    const oContext = oContextBinding.getBoundContext();

                    // 수정할 값 지정
                    oContext.setProperty("title", "Test");
                    oContext.setProperty("descr", "Test Description");
                }
                oModel.submitBatch("textsUpdateGroup")
                    .then(() => {
                        sap.m.MessageToast.show("Books_texts 업데이트 완료!");
                    })
                    .catch((err) => {
                        sap.m.MessageBox.error("업데이트 실패: " + err.message);
                    });
            } catch (err) {
                sap.m.MessageBox.error("요청 실패: " + err.message);
            }
        },

    });
});