sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "bix/common/library/control/Modules",
    "sap/ui/core/Messaging",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/library",
    "sap/ui/core/format/DateFormat",
], (Controller, JSONModel, MessageToast, Module, Messaging, Filter, FilterOperator, coreLib, DateFormat) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.ui.table.Table} Table
     * @typedef {sap.m.Input} Input
     * @typedef {sap.ui.model.odata.v4.Context} v4Context
     * @typedef {sap.m.ColumnListItem} ColumnListItem
     * @typedef {sap.ui.model.CompositeBinding} CompositeBinding
     */
    return Controller.extend("bix.admin.codes.controller.Main", {
        /**
         * 초기 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteMain");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * 코드 관리 페이지로 라우팅했을 때
         */
        onMyRoutePatternMatched: function (oEvent) {
            // 초기 모델 설정
            this._setModel();

            // 검색창 초기화
            this.byId("codeRefreshButton").firePress();

            // Model의 속성이 변경되었을 때 hasPendingChanges를 true로 설정
            let oModel = this.getOwnerComponent().getModel();
            oModel.attachPropertyChange(() => {
                this.getView().getModel("uiModel").setProperty("/hasPendingChanges", true);
            });
        },

        /**
         * 초기 모델 설정
         */
        _setModel: async function () {
            this.getView().setModel(new JSONModel({ use: "all" }), "searchModel");
            this.getView().setModel(new JSONModel({
                edit: false, // true: 수정, false:조회
                codeHeaderDeleteButton: false,
                codeItemDeleteButton: false,
                hasError: false, // messageModel에 에러가 있을 때
                hasPendingChanges: false,   // pendingChange가 존재할 때
                hasEmptyField: false,   // 생성한 행이 비어있을 때 true
            }), "uiModel");

            // 카테고리 데이터 모델 설정 (여러번 호출해 로드가 많아서 JSONModel로 변경)
            let oModel = this.getOwnerComponent().getModel();
            let oCodeContext = oModel.bindContext("/GetCodeItemView(category='')/Set");
            let oCodeData = await oCodeContext.requestObject();
            this.getView().setModel(new JSONModel(oCodeData.value), "codeModel");

            // 코드 아이템 테이블에 코드 데이터 모델 바인딩
            let oCodeItemTable = this.byId("codeItemTable");
            oCodeItemTable.setModel(new JSONModel(oCodeData.value));

            // 메시지 모델 설정
            Messaging.removeAllMessages();
            let oMessageModel = Messaging.getMessageModel();
            let oMessageModelBinding = oMessageModel.bindList("/", undefined, [],
                // new Filter("technical", FilterOperator.EQ, true)
            );

            this.getView().setModel(oMessageModel, "messageModel");
            oMessageModelBinding.attachChange((oEvent) => {
                // let aContexts = oEvent.getSource().getContexts();

                // ValueState Error인 것이 있을 때 hasError 속성을 true로 설정
                let hasError = this.getView().getModel("messageModel").getData().length > 0;
                this.getView().getModel("uiModel").setProperty("/hasError", hasError);
            });
        },

        /**
         * 검색, 초기화 버튼 클릭 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag search : 검색, refresh : 초기화
         */
        onSearch: function (oEvent, sFlag) {
            if (sFlag === "search") {    // 검색 버튼 클릭 시
                // Code Header 테이블 바인딩
                this._bindCodeHeaderTable();

                // 코드 아이템 테이블 바인딩 해제
                this.byId("codeItemTable").unbindRows();

                // 코드 그룹 테이블 선택 초기화
                let oCodeHeaderTable = this.byId("codeHeaderTable");
                oCodeHeaderTable.setSelectedIndex(-1);
            } else if (sFlag === "refresh") {    // 초기화 버튼 클릭 시
                // 검색조건(searchModel), uiModel 초기화
                this._setModel();

                // 초기화된 검색 조건으로 검색
                this.byId("codeSearchButton").firePress();
            };
        },

        /**
         * 코드 그룹 테이블 툴바 버튼 클릭 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag add: 행추가, delete: 행삭제, edit: 수정
         */
        onCodeHeaderTableButton: async function (oEvent, sFlag) {
            let oTable = this.byId("codeHeaderTable");

            if (sFlag === "add") { // 코드그룹 테이블 행 추가
                const oBinding = oTable.getBinding("rows");
                oBinding.create({ use_yn: true });

                // 필수값이 비었는지 유효성 검사를 한 후 uiModel의 hasEmptyField 속성에 반영
                // this._setEmptyField();

                // 테이블 수직 스크롤 초기화
                let oScroll = oTable._getScrollExtension().getVerticalScrollbar();
                oScroll?.scrollTo(0, 0);
                console.log(oScroll);
            } else if (sFlag === "delete") { // 코드그룹 테이블 행 제거
                let isConfirm = await Module.messageBoxConfirm('warning', '선택한 코드 그룹을 삭제하시겠습니까?', '코드 그룹 삭제');
                if (!isConfirm) {
                    return;
                }

                // 선택한 행 delete 요청 생성 (reverse를 통해 거꾸로 순회)
                const aSelectedIndices = oTable.getSelectedIndices();
                aSelectedIndices.reverse().forEach(function (index) {
                    let oContext = oTable.getContextByIndex(index);
                    // oContext.isTransient()   // 기존에 존재하던 Context인지 확인
                    oContext.delete("CodesItem");
                }.bind(this));

                // 필수값이 비었는지 유효성 검사를 한 후 uiModel의 hasEmptyField 속성에 반영
                this._setEmptyField();

                // uiModel에 hasPendingChanges 반영
                this.getView().getModel("uiModel").setProperty("/hasPendingChanges", true);

                // 코드그룹 테이블 행 선택 해제
                oTable.clearSelection();

                MessageToast.show("삭제가 완료되었습니다.");
            }
        },

        /**
         * 코드 아이템 테이블 툴바 버튼 클릭 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag add : 행추가 / delete : 행제거
         * @returns 
         */
        onCodeItemTableButton: async function (oEvent, sFlag) {
            let oTable = this.byId("codeItemTable");
            if (sFlag === "add") {    //code item 행추가
                // 테이블이 바인딩되어있지 않을 때 메시지 박스
                const oBinding = oTable.getBinding("rows");
                if (!oBinding) {
                    Module.messageBox('warning', '코드 그룹을 먼저 선택해주세요.', '코드 그룹 선택');
                    return;
                }

                // 행 추가
                oBinding.create({
                    datatype: "string",
                    use_yn: true,
                })

                // 필수값이 비었는지 유효성 검사를 한 후 uiModel의 hasEmptyField 속성에 반영
                await this._setEmptyField();

                // 테이블 수직 스크롤 초기화
                let oScroll = oTable._getScrollExtension().getVerticalScrollbar();
                oScroll?.scrollTo(0, 0);
            } else if (sFlag === "delete") { //code item 행삭제
                // 삭제 확인
                let isConfirm = await Module.messageBoxConfirm('warning', '선택한 코드 아이템을 삭제하시겠습니까?', '코드 아이템 삭제');
                if (!isConfirm) return;

                // 선택한 행 delete 요청 생성 (reverse를 통해 거꾸로 순회)
                const aSelectedIndices = oTable.getSelectedIndices();
                aSelectedIndices.reverse().forEach(function (index) {
                    let oContext = oTable.getContextByIndex(index);
                    oContext.delete("CodesItem");
                }.bind(this));

                // 필수값이 비었는지 유효성 검사를 한 후 uiModel의 hasEmptyField 속성에 반영
                this._setEmptyField();

                // 행 선택 초기화
                oTable.clearSelection();

                // uiModel에 hasPendingChanges 반영
                this.getView().getModel("uiModel").setProperty("/hasPendingChanges", true);

                MessageToast.show("삭제가 완료되었습니다.");
            };
        },

        /**
         * 필수값이 비었는지 유효성 검사를 한 후 uiModel의 hasEmptyField 속성에 반영
         */
        _setEmptyField: function () {
            let oCodeHeaderTable = this.byId("codeHeaderTable");
            let aHeaderContexts = oCodeHeaderTable.getBinding("rows").getContexts();

            let oCodeItemTable = this.byId("codeItemTable");
            let aItemContexts = oCodeItemTable.getBinding("rows")?.getContexts();

            // 헤더 테이블에 필수값이 입력되어 있는지 확인        
            let isHeaderEmpty, isItemEmpty;
            if (aHeaderContexts) {  // 헤더 테이블 (코드그룹명, 설명)
                isHeaderEmpty = aHeaderContexts.find(oContext => !oContext.getProperty("category") || !oContext.getProperty("description"));
            }

            // 아이템 테이블에 필수값이 입력되어 있는지 확인        
            if (aItemContexts) { // 아이템 테이블 (코드명, 코드값, 순서)
                isItemEmpty = aItemContexts.find(oContext => {
                    return !oContext.getProperty("value") || !oContext.getProperty("name");
                });
            }

            // 유효성 검사에 걸렸을 때 hasEmptyField를 true로 설정
            this.getView().getModel("uiModel").setProperty("/hasEmptyField", !!isHeaderEmpty || !!isItemEmpty);
        },

        /**
         * Footer 버튼 클릭 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag save: 저장, cancel: 취소 
         */
        onFooterButton: async function (oEvent, sFlag) {
            let oModel = this.getOwnerComponent().getModel();
            let oUiModel = this.getView().getModel("uiModel");

            if (sFlag === "edit") { // 수정 버튼 클릭
                this.getView().getModel("uiModel").setProperty("/edit", true);
            } else if (sFlag === "save") { // 저장 버튼 클릭
                // try catch 필요
                // this.byId("codeHeaderTable").getRows()[0].getCells()[0].getContentEdit().getBinding("value").getType().validateValue(null)

                // 저장 확인
                let bConfirm = await Module.messageBoxConfirm('information', '저장하시겠습니까?', '코드 저장');
                if (!bConfirm) return;

                this.getView().setBusy(true);

                // 코드 헤더, 코드 아이템 submitBatch
                await Promise.all([
                    oModel.submitBatch("CodesHeader"),
                    oModel.submitBatch("CodesItem"),
                ]).then(function () {
                    MessageToast.show("저장이 완료되었습니다.");

                    // UI 초기 상태로 설정
                    oUiModel.setData({
                        edit: false, // true: 수정, false:조회
                        codeHeaderDeleteButton: false,
                        codeItemDeleteButton: false,
                        hasError: false, // messageModel에 에러가 있을 때
                        hasPendingChanges: false,   // pendingChange가 존재할 때
                        hasEmptyField: false,   // 생성한 행이 비어있을 때 true
                    })
                }.bind(this)).catch(function (oError) {
                    MessageToast.show("저장에 실패하였습니다.");
                }.bind(this));

                this.getView().setBusy(false);
            } else if (sFlag === "cancel") {     // 취소
                // 수정 사항이 있을 경우 확인
                if (oUiModel.getProperty("/hasPendingChanges")) {
                    let isConfirm = await Module.messageBoxConfirm('warning', '작성된 내용은 저장되지 않습니다. 취소하시겠습니까?', '취소 확인');
                    if (!isConfirm) return;
                }

                // 코드 그룹 테이블 행 선택 해제
                let oTable = this.byId("codeHeaderTable");
                oTable.setSelectedIndex(-1);

                // 변경 취소 및 데이터 모델 새로고침
                oModel.resetChanges("CodesHeader");
                oModel.resetChanges("CodesItem");
                oModel.refresh();

                // uiModel 초기화
                oUiModel.setData({
                    edit: false,
                    codeHeaderDeleteButton: false,
                    codeItemDeleteButton: false,
                    hasError: false, // messageModel에 에러가 있을 때
                    hasPendingChanges: false,   // pendingChange가 존재할 때
                    hasEmptyField: false,   // 생성한 행이 비어있을 때 true
                    sortOrder: false,   // 정렬 순서에 오류가 있을 때
                });
            };

            // 메시지 모델의 메시지 삭제
            Messaging.removeAllMessages();
        },

        /**
         * 입력 필드 LiveChange 이벤트
         * @param {Event} oEvent 
         * @param {String} sTable 테이블 구분자
         * @param {String} sFlag 같은 값이 있는지 확인할 필드
         */
        onLiveChange: function (oEvent, sTable, sFlag) {
            let oSource = /** @type {Input} */ (oEvent.getSource());
            let oModel = this.getOwnerComponent().getModel();
            let oUiModel = this.getView().getModel("uiModel");

            // sTable에 따른 테이블 반환
            let oTable;
            if (sTable === "header") {  // 헤더 테이블
                oTable = this.byId("codeHeaderTable");
            } else if (sTable === "item") { // 아이템 테이블
                oTable = this.byId("codeItemTable");
            }

            // 바인딩된 데이터 반환
            let aBindingContexts = oTable.getBinding("rows").getContexts();
            let oBindingContext = /** @type {v4Context} */ (oSource.getBindingContext());

            // 같은 값이 존재하는지 확인 (코드그룹명, 코드명, 순서)
            if (sFlag === "category" || sFlag === "value") {
                // 동일한 코드그룹명이 존재할 때
                let sNewValue = oBindingContext.getProperty(sFlag);
                let hasSameValue = aBindingContexts.find(oContext => {
                    // 현재 수정한 행 제외
                    if (oContext !== oBindingContext) {
                        return oContext.getProperty(sFlag) === sNewValue;
                    }
                });
                oSource.setValueState(coreLib.ValueState.None);

                // 같은 값이 존재할 때 valueState 및 valueStateText 설정
                oSource.closeValueStateMessage();

                oSource.setValueStateText(!!hasSameValue ? "동일한 값이 존재합니다." : null);
                oSource.setValueState(!!hasSameValue ? coreLib.ValueState.Error : coreLib.ValueState.None);
            } else if (sFlag === "datatype") {  // 값 형식 변경
                let sSelectedKey = oSource.getSelectedKey();
                if (sSelectedKey === "int") {   // int로 변경 시에만 코드값을 null로 변경
                    oBindingContext.setProperty("name", null);
                }
            } else if (sFlag === "code") {    // 옵션1, 2
                // 사용자가 입력한 값이 name(코드 아이템)과 일치하는 Row가 있는지 확인
                let sValue = oEvent.getParameters()["value"];
                let aRows = oSource.getSuggestionRows();

                // 입력한 값과 SuggestionRow의 name이 같을 때
                let oSelectedRow = /** @type {ColumnListItem} */ (
                    aRows.find(
                        /** @param {ColumnListItem} oRow */
                        function (oRow) {
                            let oBindingObject = /** @type {Object} */ (oRow.getBindingContext("codeModel").getObject());
                            return oBindingObject.name.toLowerCase() === sValue.toLowerCase();
                        }
                    )
                );

                // Input에 입력한 값이 비었을 때
                if (!sValue) {
                    oSource.setValueState(coreLib.ValueState.None);
                } else if (!!oSelectedRow) {    // Row가 존재할 때 
                    let oBindingObject = /** @type {Object} */ (oSelectedRow.getBindingContext("codeModel").getObject());
                    oSource.setValue(`${oBindingObject.name} (${oBindingObject.category})`);
                    oSource.setValueState(coreLib.ValueState.None);
                } else {    // Row가 존재하지 않을 때
                    oSource.setValueState(coreLib.ValueState.Error);
                }
            }

            // 필수값이 비었는지 유효성 검사를 한 후 uiModel의 hasEmptyField 속성에 반영
            this._setEmptyField();

            // uiModel의 hasPendingChanges 속성 true로 설정
            oUiModel.setProperty("/hasPendingChanges", true);
            // oUiModel.refresh();
        },

        /**
         * 코드 아이템 Drop 이벤트
         * @param {Event} oEvent 
         */
        onCodeItemDrop: function (oEvent) {
            const oTable = this.byId("codeItemTable");
            const oModel = oTable.getBinding().getModel();

            const oDragSession = oEvent.getParameters()["dragSession"];
            const sDropPosition = oEvent.getParameters()["dropPosition"];

            const oDraggedRow = oDragSession.getDragControl();
            oDraggedRow.getIndex()

            const oDroppedRow = oDragSession.getDropControl();
            const iDroppedIndex = oDroppedRow.getIndex();
            const iNewIndex = (sDropPosition === "After") ? iDroppedIndex + 1 : iDroppedIndex;

            const oDroppedRowContext = oTable.getContextByIndex(iDroppedIndex); // 옮겨질 위치의 node context


            oDraggedRow.getBindingContext().setProperty("sort_order", 9);

            let oSortColumn = oTable.getColumns().find(oColumn => oColumn.getName() === "sort_order");

            // oTable.sort(oSortColumn);
        },

        /**
         * 코드 그룹 테이블 행 선택 이벤트
         * @param {Event} oEvent 
         */
        onCodeHeaderTableSelect: async function (oEvent) {
            let oUiModel = this.getView().getModel("uiModel");
            let oTable = /** @type {Table} */ (oEvent.getSource());

            // 선택된 행이 있을 때 삭제 버튼 활성화
            let isSelected = oTable.getSelectedIndices().length > 0;
            oUiModel.setProperty("/codeHeaderDeleteButton", isSelected);
        },

        /**
         * 코드 아이템 테이블 행 선택 이벤트
         * @param {Event} oEvent 
         */
        onCodeItemTableSelect: function (oEvent) {
            let oTable = /** @type {Table} */ (oEvent.getSource());

            // 선택한 행이 있을 때 true로 설정
            let isSelected = oTable.getSelectedIndices().length > 0;
            this.getView().getModel("uiModel").setProperty("/codeItemDeleteButton", isSelected);
        },

        /**
         * Input의 SuggestionItem 선택 이벤트
         * @param {Event} oEvent 
         */
        onSuggestionItemSelected: function (oEvent) {
            let oInput = /** @type {Input} */ (oEvent.getSource());

            // 선택한 suggestionRow의 정보
            let oSelectedRow = oEvent.getParameters()["selectedRow"];
            let oBindingContext = oSelectedRow.getBindingContext("codeModel");
            let oBindingObject = oBindingContext.getObject();

            // parts에 바인딩된 path로 헤더옵션 (1,2) 구분
            let aBindings = /** @type {CompositeBinding} */ (oInput.getBinding("value")).getBindings();
            let iOptionNumber = aBindings[0].getPath().split("_")[1].slice(-1);

            // 서버에 수정 요청 생성
            let oItemContext = /** @type {v4Context} */ (oInput.getBindingContext());
            oItemContext.setProperty(`header_opt${iOptionNumber}_ID`, oBindingObject.header_ID); // header_opt
            oItemContext.setProperty(`value_opt${iOptionNumber}`, oBindingObject.value); // value_opt

            // 아이템 이름 (카테고리)로 텍스트 설정
            // oInput.setValue(`${oBindingObject.name} (${oBindingObject.category})`);
            oInput.setValueState(coreLib.ValueState.None);

            // uiModel의 hasPendingChanges 속성 true로 설정
            this.getView().getModel("uiModel").setProperty("/hasPendingChanges", true);
        },

        /**
         * 코드 그룹 테이블 상세 버튼 클릭 이벤트
         * @param {Event} oEvent 
         */
        onNavItem: async function (oEvent) {
            // 이벤트 파라미터 정보
            let oEventParameter = oEvent.getParameters();

            // 선택한 코드 그룹 정보
            const oModel = this.getOwnerComponent().getModel();
            const oSelectedItem = oEventParameter["item"];
            let oSelectedContext = oSelectedItem.getBindingContext();
            let oBindingObject = oSelectedItem.getBindingContext().getObject();
            let sBindingPath = oSelectedContext.getPath();

            // 선택한 코드 그룹이 새로 생성한 코드그룹일 때
            if (!oBindingObject.ID) {
                Module.messageBox('warning', '새로 생성한 코드그룹에 아이템을 추가하려면\n먼저 생성한 코드그룹을 저장해야 합니다.', '코드그룹 생성');
                return;
            }

            // 변경된 코드 아이템이 있는 경우 
            if (oModel.hasPendingChanges("CodesItem")) {
                let bConfirm = await Module.messageBoxConfirm('informawarningtion', '작성된 내용은 저장되지 않습니다. 취소하시겠습니까?', '취소 확인');
                if (!bConfirm) return;

                // 변경 사항 초기화
                oModel.resetChanges("CodesItem");
            }

            // 선택한 코드 그룹의 카테고리를 바인딩
            let oCodeItemTable = this.byId("codeItemTable");
            oCodeItemTable.bindRows({
                path: "/",
                filters: [
                    new Filter({
                        path: "category",
                        operator: FilterOperator.EQ,
                        value1: oBindingObject.category
                    })
                ]
            });

            // CodeItem 테이블 Title 설정
            let oTitle = this.byId("codeItemTitle");
            let aBindingContexts = oCodeItemTable.getBinding("rows").getContexts();
            oTitle.setText(`총 ${aBindingContexts.length}개`);

            // 선택한 코드 그룹 표기
            let oTitle2 = this.byId("codeItemTitle2");
            oTitle2.setText(`(${oBindingObject.category})`);

            return;

            oCodeItemTable.bindRows({
                path: "codeModel>/",
                parameters: {
                    $count: true,
                },
                events: {
                    dataRequested: function () {
                        oCodeItemTable.setBusy(true);
                    }.bind(this),
                    dataReceived: function (oEvent) {
                        // CodeItem Table Title 설정
                        let oBinding = oEvent.getSource();
                        let oHeaderContext = oBinding.getHeaderContext();

                        // CodeItem 개수 설정
                        let oTitle = this.byId("codeItemTitle");
                        oTitle.setBindingContext(oHeaderContext);

                        let oTitle2 = this.byId("codeItemTitle2");
                        oTitle2.setBindingContext(oSelectedContext);

                        oCodeItemTable.setBusy(false);
                    }.bind(this),
                }
            });


            // oCodeItemTable.bindRows({
            //     path: `${sBindingPath}/items`,
            //     parameters: {
            //         $$updateGroupId: "CodesItem",
            //         // $expand: "header,header_opt1,header_opt2",
            //         // $select: "header_opt1/*,header_opt1/items/*",
            //         $orderby: "sort_order asc",
            //         $count: true,
            //     },
            //     events: {
            //         dataRequested: function () {
            //             oCodeItemTable.setBusy(true);
            //         }.bind(this),
            //         dataReceived: function (oEvent) {
            //             // CodeItem Table Title 설정
            //             let oBinding = oEvent.getSource();
            //             let oHeaderContext = oBinding.getHeaderContext();

            //             // CodeItem 개수 설정
            //             let oTitle = this.byId("codeItemTitle");
            //             oTitle.setBindingContext(oHeaderContext);

            //             let oTitle2 = this.byId("codeItemTitle2");
            //             oTitle2.setBindingContext(oSelectedContext);

            //             oCodeItemTable.setBusy(false);
            //         }.bind(this),
            //     }
            // });
        },

        /**
         * 검색 조건을 기반으로 CodeHeader 테이블 바인딩
         */
        _bindCodeHeaderTable: function () {
            // 검색 필터 설정
            const oTable = this.byId("codeHeaderTable");
            const aFilters = [];

            // 사용 여부가 전체가 아닐 때만 조건에 추가
            const oSearchData = this.getView().getModel("searchModel").getData();
            const sUseKey = oSearchData.use;
            if (sUseKey == "true" || sUseKey == "false") {
                // aFilters에 use_yn 필터 추가
                let oFilter = new Filter({
                    path: "use_yn",
                    operator: FilterOperator.EQ,
                    value1: (sUseKey == "true"),
                });
                aFilters.push(oFilter);
            }

            // 코드 그룹명 조건 추가
            const sCodeName = oSearchData.name;
            if (sCodeName) {
                // aFilters에 category 필터 추가
                let oFilter = new Filter({
                    path: "category",
                    operator: FilterOperator.Contains,
                    value1: sCodeName,
                    caseSensitive: false,   // 대소문자 구분하지 않음
                })
                aFilters.push(oFilter);
            }

            // 코드 헤더 아이템 바인딩
            oTable.bindRows({
                path: "/CodesHeader",
                parameters: {
                    $count: true,
                    $$updateGroupId: "CodesHeader",
                    $orderby: "category asc"
                },
                events: {
                    dataRequested: function () {
                        oTable.setBusy(true);
                    }.bind(this),
                    dataReceived: function (oEvent) {
                        // Account Table Title 설정
                        let oHeaderContext = oEvent.getSource().getHeaderContext();
                        this.byId("codeHeaderTitle").setBindingContext(oHeaderContext);

                        oTable.setBusy(false);
                    }.bind(this),
                },
                filters: aFilters
            });
        },

        /**
         * 타임스탬프를 날짜로 변경하는 포매터
         * @param {String} sValue 타임스탬프
         */
        formatDate: function (sValue) {
            // 값이 없을 때 Return
            if (!sValue) {
                return;
            } else {
                // 연-월-일로 반환
                let oDateInstance = DateFormat.getDateInstance({
                    pattern: "yyyy-MM-dd"
                });

                return oDateInstance.format(new Date(sValue));
            }
        },

        /**
         * 수정 모드에서의 코드값 formatter (Select)
         * @param {String} sDatatype 
         * @returns {Boolean}
         */
        formatDatatypeVisible: function (sDatatype) {
            // 수정 모드일 때 datatype이 boolean이고 경우 true 반환
            let isEdit = this.getView().getModel("uiModel").getProperty("/edit");

            return (sDatatype === "boolean" && isEdit);
        },

        /**
         * 수정 모드에서의 코드값 formatter (Input)
         * @param {String} sDatatype 
         * @returns {Boolean}
         */
        formatDatatypeInvisible: function (sDatatype) {
            // 수정 모드일 때 datatype이 boolean이 아닌 경우 true 반환
            let isEdit = this.getView().getModel("uiModel").getProperty("/edit");

            return (sDatatype !== "boolean" && isEdit);
        },

        /**
         * 옵션 1, 2 Formatter
         * @param {String} sHeaderId 
         * @param {String} sValue 
         * @returns {String}
         */
        formatHeaderOption: function (sHeaderId, sValue) {
            // header_opt_ID와 value_opt가 존재할 때
            if (sHeaderId && sValue) {
                // 파라미터에 맞는 코드 아이템 반환
                let aCodeData = this.getView().getModel("codeModel").getData();
                let oItem = aCodeData.find(oData => oData.header_ID === sHeaderId && oData.value === sValue);

                // 선택한 코드 아이템이 존재할 때 Formatter 적용
                if (oItem) {
                    return `${oItem.name} (${oItem.category})`;
                }
            }
        },
    });
});