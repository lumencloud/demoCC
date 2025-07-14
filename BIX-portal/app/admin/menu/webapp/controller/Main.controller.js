sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "bix/common/library/control/Modules",
    "sap/ui/core/dnd/DragDropInfo",
    "sap/ui/core/Messaging",


], (Controller, JSONModel, MessageToast, Modules, DragDropInfo, Messaging) => {
    "use strict";
    return Controller.extend("bix.admin.menu.controller.Main", {
        _aFolderTableData: [],
        _sNewId: "new0",
        /**
         * @type {Array} 
         * @typedef {sap.ui.table.Table} Table
         * @typedef {sap.ui.model.json.JSONModel} JSONModel
         */
        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteMain");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },
        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: async function (oEvent) {
            this.getView().setBusy(true);

            Modules.setIconTab(oEvent); // hash 값 , 새로고침 시 메뉴, 사이드메뉴 select 모듈함수
            await this._setModel();
            this._onRefreshTable();

            const oModel = this.getView().getModel("menuFolderTableModel")
            oModel.attachPropertyChange(function (oEvent) {
                const sPath = oEvent.getParameters()['path']
                const bCheckField = ['code', 'name', 'description', 'valueState', 'category', 'route'];
                const isWathced = bCheckField.some(field => sPath.includes(field));
                if (isWathced) {
                    this._validCheckAllRows();
                }
            }.bind(this))
            this.getView().setBusy(false);
        },

        /**
         * 테이블에 불러올 메뉴 구성 함수
         */
        _setModel: async function () {
            this.getView().setBusy(true);
            let oModel = this.getView().getModel();
            let oBinding = await oModel.bindList("/Menus", undefined, undefined, undefined, {
                $filter: "delete_yn ne true and isApp ne 'sub' and isApp ne 'card'",
            }).requestContexts(0, Infinity)
            let aData = await Promise.all(oBinding.map(ctx => ctx.requestObject()));

            this.getOwnerComponent().getModel("uiModel");
            // 메시지 모델 설정
            Messaging.removeAllMessages();
            let oMessageModel = Messaging.getMessageModel();
            let oMessageModelBinding = oMessageModel.bindList("/", undefined, [],
            );

            this.getView().setModel(oMessageModel, "messageModel");
            oMessageModelBinding.attachChange((oEvent) => {
                // ValueState Error인 것이 있을 때 hasErrorMessage 속성을 true로 설정
                let hasError = this.getView().getModel("messageModel").getData().length > 0;
                this.getView().getModel("uiModel").setProperty("/hasError", hasError);
            });

            // 트리 테이블 구조 바인딩
            let aTree = this._buildTree(aData);
            this.getView().setModel(new JSONModel(aTree), "menuFolderTableModel");
            this.getView().setModel(new JSONModel(this.flattenTreeWithPath(aTree)), "menuPathModel")

            // 이전 데이터 값을 담아놓은 복사된 객체
            this._aFolderTableData = JSON.parse(JSON.stringify(aTree));
            this.getView().setBusy(false);
        },
        // path 값을 저장한 트리데이터 펼친 데이터
        flattenTreeWithPath: function (tree, path = "") {
            const flatData = [];
            tree.forEach((node, idx) => {
                const currentPath = `${path}/${idx}`;
                const newNode = {
                    ...node,
                    path: currentPath
                }
                flatData.push(newNode);
                if (Array.isArray(node.children) && node.children.length > 0) {
                    const childFlatData = this.flattenTreeWithPath(node.children, `${currentPath}/children`)
                    flatData.push(...childFlatData)
                }
            })
            return flatData;
        },
        //메뉴 폴더 테이블 선택시 동작하는 함수
        onTableSelect: function (oEvent) {
            let oUiModel = this.getView().getModel("uiModel");
            let oTable = /** @type {Table} */ (oEvent.getSource());

            let iCheckLevel = oEvent.getParameters().rowContext?._mProxyInfo.level
            let isSelected = oTable.getSelectedIndices().length > 0;
            let bCheckLevel = iCheckLevel === 1 ? false : true;
            // 선택한행 && 2레벨 메뉴 선택 시 활성화
            oUiModel.setProperty("/tableMoveButton", bCheckLevel && isSelected);
            // 선택된 행이 있을 때 삭제 버튼 활성화
            oUiModel.setProperty("/tableEnabledButton", isSelected);
        },
        /**
         * 테이블 변경 버튼
         */
        onTableChange: async function (oEvent, sChk) {
            // 수정 버튼 클릭 시
            if (sChk === "Edit") {
                // 메시지 모델의 메시지 삭제
                Messaging.removeAllMessages();
                let oTable = this.byId("menuFolderTable");
                //테이블 드래그앤 드랍 객체 설정
                if (oTable) {
                    let oDragDropConfig = new DragDropInfo({
                        sourceAggregation: "rows",
                        targetAggregation: "rows",
                        dragStart: this._dragStart.bind(this),
                        drop: this._dragEnd.bind(this),
                        dropPosition: "OnOrBetween",
                    });
                    oTable.addDragDropConfig(oDragDropConfig);
                    oTable.setSelectionMode("Single");
                    // let oDataModel = this.getOwnerComponent().getModel();
                    // let aChanges = oDataModel.hasPendingChanges("AddMenuFolder")
                    // if (aChanges) {
                    //     const oModel = this.getView().getModel("menuFolderTableModel")
                    //     oModel.attachPropertyChange(function (oEvent) {
                    //         this._validCheckAllRows();
                    //     }.bind(this))
                    // }
                    // this.getView().getModel("uiModel").setProperty("/tableSaveButton", false);
                    this.getView().getModel("uiModel").setProperty("/tableVisibleButton", false);
                };
                this.byId("menuFolderTable").clearSelection();
                MessageToast.show("메뉴 폴더 수정을\n시작합니다.");

                // 추가 버튼 클릭 시 
            } else if (sChk === "Add") {
                let oTable = this.byId("menuFolderTable");
                let oModel = this.getView().getModel("menuFolderTableModel");
                let bCheckTable = oTable.getBinding("rows").getContexts()[oTable.getSelectedIndex()]
                let sPath = bCheckTable?.getPath();
                let oData = oModel.getProperty(sPath);

                this._sNewId = "new" + (parseInt(this._sNewId.split("new")[1]) + 1);

                let oTemp = {
                    name: "",
                    sort_order: 0,
                    iconSrc: "",
                    use_yn: false,
                    description: "",
                    Parent_ID: null,
                    i18nTitle_i18nKey: "",
                    ID: this._sNewId,
                    isApp: "main",
                    category: "",
                    code: "",
                }
                if (bCheckTable) {
                    oTemp.Parent_ID = oData.ID;
                    if (oData.ID.includes("new")) {
                        Modules.messageBox('warning', '새로 생성한 데이터의 하위 데이터 생성은 저장 후 가능합니다.');
                        this.byId("menuFolderTable").clearSelection();
                        return;
                    };
                    let iCount1 = sPath.split("/").length - 1;
                    let iCount2 = sPath.split("children").length; // 현재 레벨
                    if (iCount1 > 1 && iCount2 > 1) {
                        Modules.messageBox('warning', `${iCount2} 레벨 이상 데이터는 생성할 수 없습니다.`);
                        this.byId("menuFolderTable").clearSelection();
                        return;
                    };
                    let aChildren = oModel.getProperty(sPath + "/children") || [];
                    oTemp.sort_order = parseInt(aChildren.length + 1);
                    oTemp.isApp = "main";
                    aChildren.unshift(oTemp)
                    await oModel.setProperty(sPath + "/children", aChildren);
                } else {
                    let aChildren = oModel.getProperty("/")
                    oTemp.sort_order = parseInt(oModel.getData().length + 1);
                    aChildren.unshift(oTemp)
                    oTable.setFirstVisibleRow(0);
                    await oModel.setProperty("/", aChildren);
                    // this._checkDuplicateSortOrder('1Level')
                }
                this.byId("menuFolderTable").clearSelection();
                MessageToast.show("메뉴 폴더를\n추가 하였습니다.");

                // 제거 버튼 클릭 시
            } else if (sChk === "Delete") {
                let oModel = this.getView().getModel("menuFolderTableModel");
                let oTable = this.byId("menuFolderTable");
                let sPath = oTable.getBinding("rows").getContexts()[oTable.getSelectedIndex()].getPath();
                let oData = oModel.getProperty(sPath);
                let sParentPath = sPath.substring(0, sPath.lastIndexOf("/"));
                let oSameGroup = oModel.getProperty(sParentPath);
                let iIndex = parseInt(sPath.split("/").pop(), 10);
                let bCheckNewData = oData.ID.includes("new")
                let oDataModel = this.getOwnerComponent().getModel();

                //1레벨이고 기존 데이터인경우
                if (!oSameGroup && !bCheckNewData) {
                    let bChk = await Modules.messageBoxConfirm('warning', '최상위 폴더입니다. 하위 메뉴도 삭제됩니다.\n삭제하시겠습니까?', '폴더 삭제');
                    if (!bChk) { return; };
                    const aChild = oTable.getBinding().getModel().getProperty(sPath).children;
                    // 하위에 포함된 자식들도 삭제 처리
                    if (aChild.length > 0) {
                        aChild.forEach(async (child) => {
                            let sBindingPath = `/Menus(ID='${child.ID}')`
                            let oContext = await oDataModel.bindContext(sBindingPath, undefined, { $$updateGroupId: "AddMenuFolder" });
                            oContext.getBoundContext().setProperty("delete_yn", true);
                        })
                        let sBindingPath = `/Menus(ID='${oData.ID}')`
                        let oContext = await oDataModel.bindContext(sBindingPath, undefined, { $$updateGroupId: "AddMenuFolder" });
                        oContext.getBoundContext().setProperty("delete_yn", true);
                    } else {
                        // 자식없으면 자신만 삭제만 처리
                        let sBindingPath = `/Menus(ID='${oData.ID}')`
                        let oContext = await oDataModel.bindContext(sBindingPath, undefined, { $$updateGroupId: "AddMenuFolder" });
                        oContext.getBoundContext().setProperty("delete_yn", true);
                    }
                    // 삭제한 1레벨을 제외한 나머지 1레벨끼리 sort_order 정렬
                    const oModelData = oModel.getProperty("/");
                    oModelData.splice(iIndex, 1);
                    oModelData.forEach(async (node, idx) => {
                        node.sort_order = idx + 1;
                        let sBindingPath = `/Menus(ID='${node.ID}')`
                        let oContext = await oDataModel.bindContext(sBindingPath, undefined, { $$updateGroupId: "AddMenuFolder" });
                        oContext.getBoundContext().setProperty("sort_order", node.sort_order);
                    })
                    oModel.setProperty("/", oModelData);
                    oTable.clearSelection();

                } else if (oSameGroup && !bCheckNewData) {
                    //2레벨이고 기존 데이터 인 경우 
                    let bChk = await Modules.messageBoxConfirm('warning', '하위메뉴를 삭제하시겠습니까?', '어플리케이션 삭제');
                    if (!bChk) { return; };
                    const oModelData = oModel.getProperty(sParentPath);
                    oModel.setProperty(sParentPath, oModelData);
                    let sBindingPath = `/Menus(ID='${oData.ID}')`
                    let oContext = await oDataModel.bindContext(sBindingPath, undefined, { $$updateGroupId: "AddMenuFolder" });
                    oContext.getBoundContext().setProperty("delete_yn", true);

                    oModelData.splice(iIndex, 1);
                    oModelData.forEach(async (node, idx) => {
                        node.sort_order = idx + 1;
                        let sBindingPath = `/Menus(ID='${node.ID}')`
                        let oContext = await oDataModel.bindContext(sBindingPath, undefined, { $$updateGroupId: "AddMenuFolder" });
                        oContext.getBoundContext().setProperty("sort_order", node.sort_order);
                    })
                };
                // 추가버튼을 눌러서 DB에 저장하지 않은 새로운 데이터를 삭제할 땐 model에서만 삭제
                if (bCheckNewData) {
                    if (!oSameGroup) {
                        oModel.getData().splice(iIndex, 1)
                        oModel.refresh();
                        oTable.clearSelection();
                    } else {
                        oTable.getBinding().getModel().getProperty(sParentPath).splice(iIndex, 1)
                    }
                }
                let aFields = this.getView().getControlsByFieldGroupId("folderSaveCheck")
                aFields.forEach(oControl => {
                    if (oControl.setValueState) {
                        oControl.setValueState("None");
                    }
                })
                oModel.refresh();
                this.getView().getModel("uiModel").setProperty("/tableSaveButton", true)
                oTable.clearSelection();
                MessageToast.show("삭제가 완료되었습니다.");

                // 최상위 메뉴로 이동
            } else if (sChk === "Move") {
                let oModel = this.getView().getModel("menuFolderTableModel");
                let oTable = this.byId("menuFolderTable");
                let sPath = oTable.getBinding("rows").getContexts()[oTable.getSelectedIndex()].getPath();
                let oData = oModel.getProperty(sPath);
                let sParentPath = sPath.substring(0, sPath.lastIndexOf("/"));
                let iIndex = parseInt(sPath.split("/").pop(), 10);
                let bCheckNewData = oData.ID.includes("new")
                let iSortOrder = parseInt(oModel.getData().length + 1)

                oModel.setProperty(sPath + "/Parent_ID", null);
                oModel.setProperty(sPath + "/sort_order", iSortOrder);
                oTable.getBinding().getModel().getProperty("/").push(oData);
                oTable.getBinding().getModel().getProperty(sParentPath).splice(iIndex, 1)

                if (!bCheckNewData) {
                    let oDataModel = this.getOwnerComponent().getModel();
                    let sBindingPath = `/Menus(ID='${oData.ID}')`
                    let oContext = await oDataModel.bindContext(sBindingPath, undefined, { $$updateGroupId: "AddMenuFolder" });
                    oContext.getBoundContext().setProperty("Parent_ID", null);
                    oContext.getBoundContext().setProperty("sort_order", iSortOrder);
                };
                oModel.refresh();
                this.getView().getModel("uiModel").setProperty("/tableSaveButton", true)
                oTable.clearSelection();
                MessageToast.show("최상위 메뉴로\n이동 하였습니다.");
            };
        },
        /**
         *  테이블 저장 버튼
         */
        onSave: async function () {
            let bCheck = await Modules.messageBoxConfirm('information', '저장하시겠습니까?', '메뉴 저장');
            if (!bCheck) return
            let aTableData = this.getView().getModel("menuFolderTableModel").getData();
            //생성된 배열 추출 작업중
            async function flattenTree(tree, map = {}) {
                tree.forEach(node => {
                    if (node && node.ID) {
                        map[node.ID] = { ...node };
                        if (node.children) {
                            flattenTree(node.children, map);
                        };
                    };
                });
                return map;
            };
            // id 를 key 값으로 객체화된 객체로 구성된 객체
            const aModifiedMap = await flattenTree(aTableData);
            let createdNodes = [];
            for (const id in aModifiedMap) {
                let newNode = aModifiedMap[id];
                if (newNode && newNode['children']) {
                    delete newNode['children'];
                };

                if (newNode.ID.includes("new")) {// 생성용
                    let clone = { ...newNode };
                    delete clone.ID;
                    createdNodes.push(clone);
                };
            };
            this.getView().setBusy(true);
            let oModel = this.getOwnerComponent().getModel();

            // 변경된 생성 요청 생성
            createdNodes.forEach((oData) => {
                let oBinding = oModel.bindList("/Menus", undefined, undefined, undefined, {
                    $$updateGroupId: "AddMenuFolder"
                });
                oBinding.create({
                    name: oData.name,
                    i18nTitle_i18nKey: oData.i18nTitle_i18nKey,
                    sort_order: parseInt(oData.sort_order),
                    description: oData.description,
                    iconSrc: oData.iconSrc,
                    use_yn: oData.use_yn,
                    Parent_ID: oData.Parent_ID,
                    isApp: oData.isApp,
                    category: oData.category,
                    code: oData.code,
                });
            });

            oModel.submitBatch("AddMenuFolder").then(async function () {
                let aChanges = oModel.hasPendingChanges("AddMenuFolder");
                if (!aChanges) {
                    MessageToast.show("저장이 완료되었습니다.");
                    // 모델 및 데이터 초기화
                    await this._setModel();
                    this._aFolderTableData = JSON.parse(JSON.stringify(this.getView().getModel("menuFolderTableModel").getData()));
                    const oModel = this.getView().getModel("menuFolderTableModel")
                    oModel.attachPropertyChange(function (oEvent) {
                        this._validCheckAllRows();
                    }.bind(this))
                    this.getView().getModel("uiModel").setProperty("/tableSaveButton", false);
                } else {
                    Modules.messageBox('warning', '데이터 저장에 실패했습니다.');
                    return;
                };
            }.bind(this));

            this._onRefreshTable();
            this.getView().setBusy(false);
        },
        /**
         *  테이블 취소 버튼
         */
        onCancel: async function () {
            let oModel = this.getOwnerComponent().getModel();
            let aChanges = oModel.hasPendingChanges("AddMenuFolder");
            if (aChanges) {
                let bCheck = await Modules.messageBoxConfirm('warning', '작성된 내용은 저장되지 않습니다. 취소하시겠습니까?', '취소 확인');
                if (!bCheck) return
            }
            await oModel.resetChanges("AddMenuFolder");
            this._onRefreshTable();
        },
        /**
         *  테이블 refresh 해주는 모듈 함수
         */
        _onRefreshTable: function () {
            let oTable = this.byId("menuFolderTable");
            oTable.setSelectionMode("None");
            oTable.removeAllDragDropConfig();
            oTable.setRowActionCount(0);
            oTable.destroyRowActionTemplate();
            oTable.setFirstVisibleRow(0);
            let aFields = this.getView().getControlsByFieldGroupId("folderSaveCheck")
            aFields.forEach(oControl => {
                if (oControl.setValueState) {
                    oControl.setValueState("None");
                }
            })
            this.getView().getModel("uiModel").setProperty("/tableVisibleButton", true);
            this.getView().getModel("uiModel").setProperty("/tableSaveButton", false);
            this.getView().setModel(new JSONModel(JSON.parse(JSON.stringify(this._aFolderTableData))), "menuFolderTableModel");
            oTable.clearSelection();
            this._sNewId = "new0";
        },
        /**
         * 유효성 검사 및 model Batch 함수 모음
         * @param {*} oEvent  
         * @param {*} sChk view 타입별 유효성 체크
         */
        onChange: function (oEvent, sChk) {
            let oSource = oEvent.getSource();
            // Select UI 제어
            if (sChk === "typeMain") {
                let oData = oSource.getBindingContext("menuFolderTableModel").getProperty();
                let sPath = oSource.getBindingContext("menuFolderTableModel").getPath();
                // if (oData.isApp === "main") {
                //     this.getView().getModel("menuFolderTableModel").setProperty(sPath + "/category", oData.category || "");
                //     this.getView().getModel("menuFolderTableModel").setProperty(sPath + "/code", oData.code || "");
                // } else {
                //     this.getView().getModel("menuFolderTableModel").setProperty(sPath + "/route", oData.route || "");
                //     this.getView().getModel("menuFolderTableModel").setProperty(sPath + "/pattern", oData.pattern || "");
                // }

                let oModel = this.getOwnerComponent().getModel();
                let sBindingPath = `/Menus(ID='${oData.ID}')`
                let oContext = oModel.bindContext(sBindingPath, undefined, {
                    $$updateGroupId: "AddMenuFolder"
                })
                oContext.getBoundContext().setProperty("isApp", oData.isApp);
            }
            // String input UI 제어
            else if (sChk === "mainString") {
                let sValue = oSource.getValue();
                if (oSource.getValueState() === "None" && !oSource.getBindingContext("menuFolderTableModel").getProperty("ID").includes("new")) {
                    // 변경 데이터 bindContext에 담아 batch Update
                    let oModel = this.getOwnerComponent().getModel();
                    let sBindingPath = `/Menus(ID='${oSource.getBindingContext("menuFolderTableModel").getProperty("ID")}')`
                    let oContext = oModel.bindContext(sBindingPath, undefined, {
                        $$updateGroupId: "AddMenuFolder"
                    })
                    oContext.getBoundContext().setProperty(oSource.getBindingPath("value"), sValue);
                };
            }
            // Switch UI 제어 
            else if (sChk === "mainSwitch") {
                let sValue = oEvent.getParameter("state");
                if (!oSource.getBindingContext("menuFolderTableModel").getProperty("ID").includes("new")) {
                    // 변경 데이터 bindContext에 담아 batch Update
                    let oModel = this.getOwnerComponent().getModel();
                    let sBindingPath = `/Menus(ID='${oSource.getBindingContext("menuFolderTableModel").getProperty("ID")}')`
                    let oContext = oModel.bindContext(sBindingPath, undefined, {
                        $$updateGroupId: "AddMenuFolder"
                    })
                    oContext.getBoundContext().setProperty("use_yn", sValue);
                };
            };
            // 비어있는 input 있는지 전체 Row 검사 모듈함수
            this._validCheckAllRows();
        },
        _validCheckAllRows: function () {

            // let oTable = this.byId("menuFolderTable");


            // 비어있는 input 값 유효성 검사 로직
            let oModel = this.getView().getModel("menuFolderTableModel").getData()
            function flattenTree(data) {
                let result = [];
                data.forEach((item) => {
                    result.push({ ...item });
                    if (item.children && Array.isArray(item.children)) {
                        result = result.concat(flattenTree(item.children))
                    }
                })
                return result;
            }
            //평탄화된 전체 row 데이터
            let oFlatData = flattenTree(oModel);
            let bCheckAllInput = oFlatData.every(item => {
                let checkFields = ["code", "name", "category", "description", "valueState"]
                if (item.valueState === "Error") {
                    return false;
                }
                return checkFields.every(key => item[key] !== "" && item[key] !== null)
            })

            this.getView().getModel("uiModel").setProperty("/tableSaveButton", bCheckAllInput);
        },
        /**
         * @param {*} oEvent 
         * 트리테이블 부모 자식 간 드래그 앤 드롭 시작
         */
        _dragStart: function (oEvent) {
            const oTreeTable = this.byId("menuFolderTable");
            const oDragSession = oEvent.getParameter("dragSession");
            const oDraggedRow = oEvent.getParameter("target");
            const iDraggedRowIndex = oDraggedRow.getIndex();
            const aDraggedRowContext = [];
            aDraggedRowContext.push(oTreeTable.getContextByIndex(iDraggedRowIndex));
            oDragSession.setComplexData("hierarchymaintenance", {
                draggedRowContexts: aDraggedRowContext
            });
        },
        /**
         * @param {*} oEvent 
         * 트리테이블 부모 자식 간 드래그 앤 드롭 끝
         */
        _dragEnd: function (oEvent) {
            const that = this;
            const oTreeTable = this.byId("menuFolderTable");
            const oModel = oTreeTable.getBinding().getModel();
            const oDragSession = oEvent.getParameter("dragSession");
            const sDropPosition = oEvent.getParameter("dropPosition");
            const oDroppedRow = oDragSession.getDropControl();
            const aDraggedRowContext = oDragSession.getComplexData("hierarchymaintenance").draggedRowContexts // 옮기려는 node context
            const oDroppedRowContext = oTreeTable.getContextByIndex(oDroppedRow.getIndex()); // 옮겨질 위치의 node context

            // 드래그시 전체 적인 로직 처리 시작 함수
            for (const oDraggedContext of aDraggedRowContext) {
                //oModel = 트리테이블에 바인딩된 모델
                const dropInfo = classifyDropCase(oDraggedContext, oDroppedRowContext, oModel, sDropPosition);
                if (dropInfo.isDescendant) {
                    MessageToast.show("같은 레벨 간에는\n이동할 수 없습니다.")
                    return;
                }
                moveNode(dropInfo);
            }
            // 현재 드랍한 라인 (before || After) 상관없이 그 라인의 아래 , 위 노드의 레벨을 가져옴
            function findLevelBetweenNodes(position, sDroppedPath) {
                const oBinding = that.getView().getModel("menuPathModel").getData();
                const iLastIdx = that.getView().getModel("menuFolderTableModel").getData().length - 1
                const iDropIdx = oBinding.findIndex(child => child.path === sDroppedPath);
                const iPrevIdx = position === "Before" ? iDropIdx - 1 : iDropIdx;
                const iNextIdx = position === "Before" ? iDropIdx : iDropIdx + 1;

                const oPrevContext = oBinding[iPrevIdx] || null;
                const oNextContext = oBinding[iNextIdx] || null;
                const sPrevPath = oPrevContext?.path;
                const sNextPath = oNextContext?.path;
                const iCurrentIdx = sNextPath ? extractLastChildIndex(sNextPath) : iLastIdx;

                const iPrevLevel = sPrevPath ? getNodeDepthbyPath(sPrevPath) : null;  // 현재 드랍한 라인에 바로 상단 Node 레벨 , 최상단 node = null
                const iNextLevel = sNextPath ? getNodeDepthbyPath(sNextPath) : null; // 현재 드랍한 라인에 바로 하단 Node 레벨 , 최하단 node = null
                // retrun 값 between 드랍 시 바로 위 iPrevLevel: 레벨, sPrevPath: 경로값, 바로 아래 iNextLevel: 레벨, sNextPath: 경로값
                return {
                    iPrevLevel, iNextLevel, iCurrentIdx, sPrevPath, sNextPath
                }
            }
            // 드랍 조건 별 분류 통합 함수
            function classifyDropCase(oDraggedContext, oDroppedContext, oModel, position) {
                const sDroppedPath = oDroppedContext.getPath();
                const sDraggedPath = oDraggedContext.getPath()
                const dragNode = oDraggedContext.getProperty();
                const dropNode = oDroppedContext.getProperty();
                const { iPrevLevel, iNextLevel, iCurrentIdx, sPrevPath, sNextPath } = findLevelBetweenNodes(position, sDroppedPath);
                const sDraggedParentPath = sDraggedPath?.replace(/\/children\/\d+$/, "");
                const sDroppedParentPath = sNextPath?.replace(/\/children\/\d+$/, "");
                const iPrevIndex = extractLastChildIndex(sDraggedPath);
                return {
                    oModel,
                    sPrevPath, // position : After,Before 라인 드랍 시 상단 노드 경로
                    sNextPath, // position : After,Before 라인 드랍 시 하단 노드 경로
                    sDraggedPath,    // 드래그한 노드의 Path
                    sDroppedPath,    // 드랍한 노드의 Path
                    dragNode,        // 드래그 노드 객체 데이터
                    dropNode,        // 드랍   노드 객체 데이터
                    dragLevel: getNodeDepthbyPath(sDraggedPath),  // 드래그 노드의 레벨
                    dropLevel: getNodeDepthbyPath(sDroppedPath),  // 드랍 노드의 레벨
                    isDescendant: isDescendant(dragNode, dropNode),  // 자기 자신 자식 노드 방지
                    sPrevParentPath: sDraggedParentPath === sDraggedPath ? null : sDraggedParentPath,  // 부모가 있으면 부모 Path, 없으면 null
                    sNextParentPath: sDroppedParentPath,
                    iPrevLevel, // position : After,Before 라인 드랍 시 상단 노드 레벨
                    iNextLevel,  // position : After,Before 라인 드랍 시 하단 노드 레벨
                    iCurrentIdx,  // 노드를 라인에 옮길시 위치할 index
                    iPrevIndex,    // 옮긴 노드의 이전 index
                    position,
                    family: dragNode.Parent_ID === dropNode.ID,   //두개의 노드가 부모 자식 사이인지
                    sameParent: dropNode.Parent_ID === dragNode.Parent_ID // 같은 부모를 가진 그룹인지
                }
            }
            /**
             * 기존 부모에서 노드 삭제 후 새로운 부모에 노드 추가
             * @param {*} info   node 이동을 위한 정보를 담은 객체
             * @returns 
             */
            function moveNode(info) {
                const { dragLevel, iPrevLevel, iNextLevel, sameParent, position, dropLevel, dragNode, family, sNextPath, sPrevPath, sNextParentPath, oModel, dropNode } = info;
                const blocked = blockMoveToLevel({ dropLevel, dragLevel, dragNode, position });
                if (dragNode.isApp === 'none') {
                    MessageToast.show("폴더 메뉴는 \n이동 할 수 없습니다.")
                    return;
                }
                if (blocked) {
                    MessageToast.show("2레벨 이상으로 \n이동 할 수 없습니다.")
                    return;
                }
                if (family && position === "On") {
                    MessageToast.show("하위 메뉴에 \n이미 존재합니다.")
                    return;
                }
                const isLv1 = dragLevel === 1;     //  드래그 노드 1레벨인지
                const isLv2 = dragLevel === 2;     // 드래그 노드 2레벨인지
                const isPrevLv1 = iPrevLevel === 1; // 드랍한위치에 이전 row 레벨이 1레벨인지
                const isNextLv1 = iNextLevel === 1; // 드랍한위치에 이후 row 레벨이 1레벨인지
                const isPrevLv2 = iPrevLevel === 2;
                const isNextLv2 = iNextLevel === 2;
                const sPosition = position === "On";
                const isBetweenLv1 = isPrevLv1 && isNextLv1;   // 드랍한 위치가 1레벨 사이인지
                const isBetweenLv2 = isPrevLv2 && isNextLv2;   // 드랍한 위치가 2레벨 사이인지
                const isFirstToSecond = isPrevLv1 && isNextLv2;  // 1레벨 이전 2레벨 이후 사이인지
                const isSecondToFirst = isPrevLv2 && isNextLv1;  // 2레벨 이전 1레벨 이후 사이인지
                const isTopRow = iPrevLevel === null && isNextLv1;    // 최상단인지
                const isBottomRowLv1 = isPrevLv1 && iNextLevel === null;  // 1레벨 최하단인지
                const isBottomRowLv2 = isPrevLv2 && iNextLevel === null;  // 2레벨 최하단인지
                const sLastParentPath = sPrevPath?.replace(/\/children\/\d+$/, "");
                // 상위레벨과 하위레벨을 비교해서 하위로 이동하는 것인지 상위로 이동하는 것인지 조건 처리
                const levelRelation = dragLevel < dropLevel ? 'toChild' : dragLevel > dropLevel ? 'toParent' : 'sameLevel';
                // position = On || 최하단이면 = sPrevPath // position !== On || 최상단이면 === sPrevPath, sNextPath   // 가공된 path만 사용
                // sNextParentPath : 드래그 후 부모의 path값,, sPrevParentPath : 드래그 전 부모의 path값
                // 1. 최상단: 이전 노드 없음, 다음 노드가 1레벨
                if (isTopRow && !sPosition) {
                    if (isLv1) return spliceNodeFromTo(info, { levelRelation, positionCase: 'top', sameParent: true, sDroppedPath: sNextPath, sParentId: null });    // 1레벨->1레벨 최상단정렬
                    if (isLv2) return spliceNodeFromTo(info, { levelRelation, positionCase: 'top', sameParent: false, sDroppedPath: sNextPath, sParentId: null });   // 2레벨->1레벨 최상단정렬
                }  // 2. 최하단 노드가 1레벨 일 때 : 다음 노드 없음
                if (isBottomRowLv1 && !sPosition) {
                    if (isLv1) return spliceNodeFromTo(info, { levelRelation, positionCase: 'bottom', sameParent: true, sDroppedPath: sPrevPath, sParentId: null });  // 1레벨 -> 1레벨 최하단정렬
                    if (isLv2) return spliceNodeFromTo(info, { levelRelation, positionCase: 'bottom', sameParent: false, sDroppedPath: sPrevPath, sParentId: null }); // 2레벨 -> 1레벨 최하단정렬
                }   // 3. 최하단 노드가 2레벨 일 때 
                if (isBottomRowLv2 && !sPosition) {
                    if (isLv1) return spliceNodeFromTo(info, { levelRelation, positionCase: 'bottom', sameParent: false, sDroppedPath: sLastParentPath, sParentId: null }); // 1레벨 -> 1레벨 최하단정렬
                    if (isLv2 && sameParent) return spliceNodeFromTo(info, { levelRelation, positionCase: 'bottom', sameParent: true, sDroppedPath: sPrevPath, sParentId: null });// 2레벨 -> 최하단1레벨 자식정렬
                    if (isLv2 && !sameParent) return spliceNodeFromTo(info, { levelRelation, positionCase: 'bottom', sameParent: false, sDroppedPath: sPrevPath, sParentId: dropNode.Parent_ID });// 2레벨 -> 최하단1레벨 자식정렬
                }   // 3. 1레벨과 1레벨 사이
                if (isBetweenLv1 && !sPosition) {
                    if (isLv1) return spliceNodeFromTo(info, { levelRelation, positionCase: 'between', sameParent: true, sDroppedPath: sNextPath, sParentId: null });// 1레벨 ->  1레벨 정렬
                    if (isLv2) return spliceNodeFromTo(info, { levelRelation, positionCase: 'between', sameParent: false, sDroppedPath: sNextPath, sParentId: null });// 2레벨 -> 1레벨 정렬
                }   // 4. 2레벨과 2레벨 사이
                if (isBetweenLv2 && !sPosition) {
                    if (isLv1) return spliceNodeFromTo(info, { levelRelation, positionCase: 'between', sameParent: false, sDroppedPath: sNextPath, sParentId: oModel.getProperty(sNextParentPath)['ID'] });// 1레벨 -> 2레벨 정렬
                    if (isLv2 && sameParent) return spliceNodeFromTo(info, { levelRelation, positionCase: 'between', sameParent: true, sDroppedPath: sNextPath, sParentId: null });// 2레벨 -> 2레벨 정렬
                    if (isLv2 && !sameParent) return spliceNodeFromTo(info, { levelRelation, positionCase: 'between', sameParent: false, sDroppedPath: sNextPath, sParentId: oModel.getProperty(sNextParentPath)['ID'] });// 2레벨 -> 2레벨 정렬
                }   // 5. 1레벨과 2레벨 사이
                if (isFirstToSecond && !sPosition) {
                    if (isLv1) return spliceNodeFromTo(info, { levelRelation, positionCase: 'top', sameParent: false, sDroppedPath: sNextPath, sParentId: oModel.getProperty(sNextParentPath)['ID'] });// 1레벨 ->  해당 레벨 자식 최상단
                    if (isLv2 && sameParent) return spliceNodeFromTo(info, { levelRelation, positionCase: 'top', sameParent: true, sDroppedPath: sNextPath, sParentId: null });// 2레벨 -> 해당레벨 자식 최상단
                    if (isLv2 && !sameParent) return spliceNodeFromTo(info, { levelRelation, positionCase: 'top', sameParent: false, sDroppedPath: sNextPath, sParentId: oModel.getProperty(sNextParentPath)['ID'] });// 2레벨 -> 해당레벨 자식 최상단
                }   // 6. 2레벨과 1레벨 사이
                if (isSecondToFirst && !sPosition) {
                    if (isLv1) return spliceNodeFromTo(info, { levelRelation, positionCase: 'between', sameParent: true, sDroppedPath: sNextPath, sParentId: null });// 1레벨 -> 1레벨끼리 정렬
                    if (isLv2 && sameParent) return spliceNodeFromTo(info, { levelRelation, positionCase: 'between', sameParent: true, sDroppedPath: sPrevPath, sParentId: null });// 2레벨 -> 2레벨 정렬
                    if (isLv2 && !sameParent) return spliceNodeFromTo(info, { levelRelation, positionCase: 'bottom', sameParent: false, sDroppedPath: sPrevPath, sParentId: oModel.getProperty(sPrevPath)['Parent_ID'] });// 2레벨 -> 해당자식 2레벨 최하단
                }  // 7. position === "On" 일 때: 드롭 노드의 자식으로 들어감
                if (position === "On") {
                    if (isLv1) return spliceNodeFromTo(info, { levelRelation, positionCase: 'On', sameParent: false, sDroppedPath: sPrevPath, sParentId: oModel.getProperty(sPrevPath)['ID'] });// 1레벨 -> 해당레벨 자식 최하단정렬
                    if (isLv2) return spliceNodeFromTo(info, { levelRelation, positionCase: 'On', sameParent: false, sDroppedPath: sPrevPath, sParentId: oModel.getProperty(sPrevPath)['ID'] });// 2레벨 -> 해당레벨 자식 최하단정렬
                }
            }
            /**
             * 노드를 옮기기 위한 index, path값 처리 함수 // 로직 순서 
             * 삭제할 레벨 그룹, 삽입할 레벨 그룹을 가져 온 뒤 -> Parent_ID 변경 (oData set) -> 삭제 레벨 그룹에서 삭제 -> 삽입 위치 조건에 따른 삽입 index 변경 ->
             * 삽입할 레벨 그룹에 삽입 (상위노드->하위로 이동 시 path,index가 바뀌기 때문에 가공 필요) -> json모델,odata모델 업데이트
             */
            function spliceNodeFromTo(info, { levelRelation, positionCase, sameParent, sDroppedPath, sParentId }) {
                const { dragNode, iPrevIndex, oModel, sDraggedPath, iCurrentIdx, position } = info;
                const iDragIdx = iPrevIndex;
                const iDropIdx = position !== "On" ? iCurrentIdx : iCurrentIdx - 1;
                const sDropPath = sDroppedPath;  // moveNode에서 조건 별 가공된 path값을 넣어준다.
                const sDragPath = sDraggedPath;
                const oDragNode = JSON.parse(JSON.stringify(dragNode));

                let { iInsertIdx, bFlag } = getInsertIndex({ iDragIdx, iDropIdx, sameParent, position });  //삽입 Index;
                const iDeleteIdx = iDragIdx;                                            //삭제 Index;
                const { sInsertModelPath } = getInsertModelPath(sDropPath, position);           //삽입 모델 경로
                const { sDeletePath } = getDeleteModelPath(sDragPath, position, levelRelation);       //삭제 경로
                const { sDeleteModelPath } = getDeleteModelPath(sDragPath, position, levelRelation);       //삭제 모델 경로

                const oDeleteGroup = oModel.getProperty(sDeleteModelPath);  // 삭제할 그룹 준비
                const oInsertGroup = oModel.getProperty(sInsertModelPath);  // 삽입할 그룹 준비
                //Parent_ID 삽입
                if (!sameParent) {
                    oDragNode.Parent_ID = sParentId;
                }
                updateOdata(oDragNode);

                // 삭제 그룹에 삭제
                oDeleteGroup.splice(iDeleteIdx, 1);
                // 삽입하는 인덱스 positionCase 조건에 따라서 위치 재할당
                if (positionCase === "top" || positionCase === "bottom") {
                    iInsertIdx = positionCase === "top" ? 0 : parseInt(oInsertGroup.length);
                } else { iInsertIdx }
                //삽입 그룹에 드랍
                oInsertGroup.splice(iInsertIdx, 0, oDragNode);
                [oDeleteGroup, oInsertGroup]
                    .filter(group => Array.isArray(group) && group.length > 0)
                    .forEach(group => {
                        group.forEach((node, idx) => {
                            node.sort_order = idx + 1;
                            updateOdata(node);
                        })
                    })
                const sSetPath = getInsertSetPath(sInsertModelPath, position);

                // 모델 반영
                if (!sameParent || position === 'On' || levelRelation !== 'sameLevel') { //같은 그룹내에서는 두번 setProperty할 필요없기때문에 다른 그룹일때만 두번 setProperty
                    oModel.setProperty(`${sSetPath}`, oInsertGroup);
                } oModel.setProperty(`${sDeletePath}`, oDeleteGroup);

                // 플랫 모델 갱신
                const refreshPathModel = that.flattenTreeWithPath(oModel.getData())
                that.getView().getModel("menuPathModel").setData(refreshPathModel);

                function getInsertSetPath(sInsertModelPath, position) {
                    let sSetPath;
                    if (levelRelation === 'toChild' && position !== 'On' || levelRelation === 'sameLevel' && position === 'On' && bFlag) {
                        let sModelPath = convertPath(sInsertModelPath);
                        sSetPath = sModelPath;
                    }
                    else if (levelRelation === 'toParent' && position !== 'On' || levelRelation === 'sameLevel' && position !== 'On') {
                        sSetPath = sInsertModelPath;
                    } else { sSetPath = sInsertModelPath };
                    return sSetPath;
                }

                // 삽입그룹경로, 삽입경로 추출하는 함수  (모델경로 : 모델 setPropery해줄 때 사용하는 그룹, 삽입경로 : 해당 노드가 들어갈 경로 )
                function getInsertModelPath(sDropPath, position) {
                    let sInsertPath, sInsertModelPath
                    if (position === "On") {
                        sInsertPath = extractInsertPath(sDropPath);
                        sInsertModelPath = extractInsertPath(sDropPath);
                    } else {
                        sInsertPath = extractInsertPath(sDropPath);
                        sInsertModelPath = extractInsertPath(sDropPath)
                    }
                    return { sInsertPath, sInsertModelPath }
                }
                // 삭제그룹경로, 삭제경로 추출하는 함수 (모델경로 : 모델 setPropery해줄 때 사용하는 그룹, 삽입경로 : 해당 노드가 들어갈 경로 )
                function getDeleteModelPath(sDragPath, position, levelRelation) {
                    let sDeletePath, sDeleteModelPath
                    if (position !== "On" && levelRelation === 'toParent') {
                        sDeletePath = extractDeletePath(sDragPath);
                        sDeleteModelPath = extractDeletePath(sDragPath);
                    } else {
                        sDeletePath = extractDeletePath(sDragPath);
                        sDeleteModelPath = extractDeletePath(sDragPath);
                    }
                    return { sDeletePath, sDeleteModelPath }
                }

                function extractInsertPath(path) {    // path 값의 children 을 포함하고있으면 뒤에 숫자 인덱스만 삭제
                    if (path.includes("children")) {
                        const segments = path.split("/"); segments.pop();
                        return segments.join("/")
                    } else if (!path.includes("children") && position === 'On') {
                        // const sPath = convertPath(path);
                        return path + "/children"
                    }
                    return "/"
                }
                function extractDeletePath(path) {
                    if (path.includes("children")) {
                        const segments = path.split("/"); segments.pop();
                        return segments.join("/")
                    } return "/"
                }
                // Path 값 -1 해주는 함수
                function convertPath(sPath) {
                    if (!sPath) return sPath;
                    const result = sPath.replace(/\/(\d+)/, (match, num) => `/${parseInt(num) - 1}`)
                    return result.replace(/\/children\/.*/, '/children')
                }
                function getInsertIndex({ iDragIdx, iDropIdx, sameParent, position }) {
                    let iInsertIdx = position !== "On" && sameParent && iDragIdx < iDropIdx ? iDropIdx - 1 : iDropIdx;
                    let bFlag = iDragIdx < iDropIdx;
                    return { iInsertIdx, bFlag }  // bFlag가 true면 하위노드에서 상위 노드로 옮기는 flag값
                }
                return;
            }
            // Odata v4 모델 업데이트 함수
            function updateOdata(node) {
                let oDataModel = that.getOwnerComponent().getModel();
                let sBindingPath = `/Menus(ID='${node.ID}')`
                let oContext = oDataModel.bindContext(sBindingPath, undefined, {
                    $$updateGroupId: "AddMenuFolder"
                }).getBoundContext();
                oContext.setProperty("Parent_ID", node.Parent_ID ?? null);
                oContext.setProperty("sort_order", node.sort_order);
            }

            // Path 값으로 인덱스 추출 함수
            function extractLastChildIndex(sPath) {
                let iIndex = sPath.split("/").filter(Boolean);
                let iLasIndex = iIndex.pop();
                if (iLasIndex === "children" && iIndex.length > 0) {
                    return iIndex.pop();
                }
                return parseInt(iLasIndex);
            }
            // children 갯수로 해당 노드 레벨 확인 함수
            function getNodeDepthbyPath(sPath) {
                let matches = sPath.match(/children/g);
                return matches ? matches.length + 1 : 1;
            }
            // 참조 순환 방지 함수 (자기 자신의 하위로 들어 갔을 때)
            function isDescendant(parent, target) {
                if (!parent.children) return false;
                return parent.children.some(child => child.ID === target.ID || isDescendant(child, target))
            }
            // 레벨 이동 제한 함수
            function blockMoveToLevel({ dropLevel, dragLevel, dragNode, position }) {
                const draggedMaxDepth = getMaxDepth(dragNode);
                const iDropLevel = dropLevel;
                let target;
                if (position === "On") {
                    target = iDropLevel + 1;
                } else {
                    target = iDropLevel;
                }
                return target + draggedMaxDepth - 1 > 2;
            }
            function getMaxDepth(node) {
                if (!node.children || node.children.length === 0) return 1;
                const childDepths = node.children.map(getMaxDepth);
                return 1 + Math.max(...childDepths);
            }
            oTreeTable.expand(oDroppedRow.getIndex()); // 옮긴 부모 트리테이블이 접혀져 있을때 자식 옮긴 후 펼침
            that._validCheckAllRows();  // 비어있는 input 있는지 전체 Row 검사 모듈함수
        },
        /**
         * 메뉴 구성을 위한 재귀함수
         */
        _buildTree: function (data) {
            let aTree = [];
            let oLookup = {};
            data.forEach(item => {
                oLookup[item.ID] = { ...item, children: [] };
            });
            data.forEach(item => {
                if (item.Parent_ID !== null && oLookup[item.Parent_ID]) {
                    oLookup[item.Parent_ID].children.push(oLookup[item.ID]);
                } else {
                    aTree.push(oLookup[item.ID]);
                };
            });
            function sortTree(tree) { // 재귀적으로 정렬하는 함수
                tree.sort((a, b) => a.sort_order - b.sort_order);
                tree.forEach(node => {
                    if (node.children.length > 0) {
                        sortTree(node.children);
                    }
                });
            };
            sortTree(aTree); // 최상위 노드부터 정렬
            return aTree;
        },
    });
});