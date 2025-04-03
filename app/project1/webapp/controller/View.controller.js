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
            this._setModel()
            // let oData = new ODataModel({
            //     serviceUrl: "/project/", 
            //     synchronizationMode: "None",
            //     operationMode: "Server"
            // })
            // this.getView().setModel(oData)

            // oData.getMetaModel().requestObject("/").then(function () {
            //     sap.m.MessageToast.show("OData 모델이 성공적으로 로드되었습니다.");
            // }).catch(function (oError) {
            //     sap.m.MessageToast.show("OData 모델 로드 실패: " + oError.message);
            // });

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

        _setModel: function () {
            this.getHieracyTree("/project/Project_tableView").then((result) => {

                this.getView().setModel(new JSONModel(result), "tableModel");
            })
            const oViewModel = new JSONModel({
                editMode: true
            });
            this.getView().setModel(oViewModel, "view");
        },

        mergeData: function (result) {
            const mergedMap = {};

            result.forEach(entry => {
                const {
                    node_id,
                    organization_name,
                    parent_id,
                    year,
                    totalMargin,
                    totalRevenue,
                    totalTargetMargin,
                    totalTargetRevenue
                } = entry;

                const key = node_id;

                if (!mergedMap[key]) {
                    mergedMap[key] = {
                        node_id,
                        parent_id,
                        organization_name
                    };
                }

                const yearKey = `year${year}`;

                mergedMap[key][`${yearKey}marginTotal`] = parseFloat(totalMargin || "0");
                mergedMap[key][`${yearKey}revenueTotal`] = parseFloat(totalRevenue || "0");
                mergedMap[key][`${yearKey}marginTargetTotal`] = parseFloat(totalTargetMargin || "0");
                mergedMap[key][`${yearKey}revenueTargetTotal`] = parseFloat(totalTargetRevenue || "0");
            });
            return Object.values(mergedMap)

        },

        onButtonPress: function (oEvent) {
            this.getOwnerComponent().getRouter().navTo("EnterpriseView")
        },
        onDialogOrgaOpen: function () {
            this.getHieracyTree("/project/Project_view").then((result) => {
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
        getHieracyTree: function (sUrl) {
            let settings = {
                type: "get",
                async: false,
                url: sUrl,
            };

            return new Promise((resolve) => {
                $.ajax(settings).done((result) => {
                    // 1. 원본 데이터
                    let rawData = result.value;

                    // 2. 먼저 데이터 머지 (연도별로 컬럼 생성)
                    let mergedData = this.mergeData(rawData); //

                    // 3. 리프 노드 판단
                    let oData = markLeafNodes(mergedData);

                    // 4. 트리 구조로 변환
                    let nodeMap = {};
                    oData.forEach(item => {
                        nodeMap[item.node_id] = {
                            ...item,
                            children: []
                        };
                    });

                    let rootNodes = [];
                    oData.forEach(item => {
                        if (!item.parent_id) {
                            rootNodes.push(nodeMap[item.node_id]);
                        } else if (nodeMap[item.parent_id]) {
                            nodeMap[item.parent_id].children.push(nodeMap[item.node_id]);
                        }
                    });

                    resolve(rootNodes); // 계층 구조 반환

                    // 내부 함수들 ------------------
                    function markLeafNodes(data) {
                        const parentSet = new Set(data.map(d => d.parent_id).filter(Boolean));
                        return data.map(d => {
                            d.isLeaf = !parentSet.has(d.node_id);
                            return d;
                        });
                    }
                }).fail((xhr) => {
                    resolve(xhr);
                });
            });
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
        },

        onCreate: function (oEvent) {

        },

		onButtonPress2: function(oEvent) {
            this.getOwnerComponent().getRouter().navTo("DemoView")
		}
    });
});