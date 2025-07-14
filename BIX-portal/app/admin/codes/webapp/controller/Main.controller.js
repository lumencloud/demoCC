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
    "sap/ui/core/Message",
], (Controller, JSONModel, MessageToast, Module, Messaging, Filter, FilterOperator, coreLib, DateFormat, Message) => {
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
            Module.setIconTab(oEvent);
            // 검색창 초기화
            this.refresh = null; //처음 패턴매치드 될때 messageToast 출력 방지 null
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
        onSearch: async function (oEvent, sFlag) {

            //기존 작성되던 내용 취소 되기때문에 확인
            let oUiModel = this.getView().getModel("uiModel");
            const oModel = this.getOwnerComponent().getModel();
            if (oUiModel.getProperty("/hasPendingChanges")) {
                let isConfirm = await Module.messageBoxConfirm('warning', '작성된 내용은 저장되지 않습니다. 취소하시겠습니까?', '취소 확인');

                if (!isConfirm) return;


                // uiModel의 hasPendingChanges 속성 false 설정
                this.getView().getModel("uiModel").setProperty("/hasPendingChanges", false);

                // 변경 사항 초기화
                oModel.resetChanges("CodesItem");
            }



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

                //초기 및 수정취소 될 때 messageToast 출력 방지
                if (this.refresh !== null) {
                    this.refresh = true;
                }

                // 초기화된 검색 조건으로 검색
                this.byId("codeSearchButton").firePress();
            };

            //스크롤  초기화 
            let oScroll = this.byId("codeHeaderTable")._getScrollExtension().getVerticalScrollbar();
            oScroll?.scrollTo(0, 0);


            //검색 및 초기화 할때 코드아이템 타이틀 초기화            
            let oTitle = this.byId("codeItemTitle");
            let oTitle2 = this.byId("codeItemTitle2");
            oTitle.setText("");
            oTitle2.setText("");
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
                oTable.setFirstVisibleRow(0);
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

                // jsonModel로 해서 create가 되지 않음
                const oModel = oTable.getModel();
                const aData = oModel.getProperty("/") || [];
                aData.unshift({
                    header_ID: this.sHeaderId,
                    datatype: "string",
                    use_yn: true,
                    sort_order: 1,
                    name: "",
                    _isNew: true // create save할때 _isNew 있는 것만 새로 create 만들기 위한 값,

                })

                oModel.setProperty("/", aData);

                //행추가 하면서 sortorder 정렬
                this.onAddCodeItemSort()

                // 필수값이 비었는지 유효성 검사를 한 후 uiModel의 hasEmptyField 속성에 반영
                await this._setEmptyField();
                // 테이블 수직 스크롤 초기화

                oTable.setFirstVisibleRow(0);
            } else if (sFlag === "delete") { //code item 행삭제
                // 삭제 확인
                let isConfirm = await Module.messageBoxConfirm('warning', '선택한 코드 아이템을 삭제하시겠습니까?', '코드 아이템 삭제');
                if (!isConfirm) return;


                // jsonModel로 해서 create가 되지 않음
                const oModel = oTable.getModel();
                const aData = oModel.getProperty("/") || [];




                // 선택한 행 delete 요청 생성 (reverse를 통해 거꾸로 순회)
                const aSelectedIndices = oTable.getSelectedIndices();
                aSelectedIndices.reverse().forEach(function (index) {
                    let oContext = oTable.getContextByIndex(index);

                    //기존작성 코드는 요청을 보내야됨
                    if (!oContext.getObject()._isNew) {
                        //delete_yn 수정 요청
                        let oUpdateContext = this.getOwnerComponent().getModel().bindContext(`/CodesItem('${oContext.getObject().item_ID}')`, null, { $$updateGroupId: "CodesItem" });
                        oUpdateContext.getBoundContext().setProperty("delete_yn", true)
                    }
                    //json 모델에서 임시 삭제
                    aData.splice(index, 1);
                }.bind(this));

                oModel.setProperty("/", aData);

                // 요청 생성 시 uiModel Update
                this.getView().getModel("uiModel").setProperty("/hasPendingChanges", true);


                //삭제되면서 sortorder 재정렬
                this.onDeleteCodeItemSort();

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
                let oUpdateContext = await oModel.bindList(`/CodesItem`, undefined, undefined, undefined, { $$updateGroupId: "CodesItem" });
                // try catch 필요
                // this.byId("codeHeaderTable").getRows()[0].getCells()[0].getContentEdit().getBinding("value").getType().validateValue(null)

                // 저장 확인
                let bConfirm = await Module.messageBoxConfirm('information', '저장하시겠습니까?', '코드 저장');
                if (!bConfirm) return;

                this.getView().setBusy(true);

                const oJsonModel = this.byId("codeItemTable").getModel();
                const aItems = oJsonModel.getProperty("/") || [];

                //임시로 추가한 _isNew 만 추출
                const createItems = aItems.filter(item => item._isNew).map(item => {
                    //안의 값들을 복사
                    const payload = { ...item };
                    //_isNew 는 새로 추가한거 확인용이므로 제거
                    delete payload._isNew;

                    return oUpdateContext.create(payload)
                })


                try {
                    // 코드 헤더, 코드 아이템 submitBatch
                    await Promise.all([
                        oModel.submitBatch("CodesHeader"),
                        oModel.submitBatch("CodesItem"),

                    ]);


                    // 코드 아이템 초기화를 위해 코드 아이템 테이블을 다시 바인딩
                    this._bindCodeItemTable();

                    // UI 초기 상태로 설정
                    oUiModel.setData({
                        edit: false, // true: 수정, false:조회
                        codeHeaderDeleteButton: false,
                        codeItemDeleteButton: false,
                        hasError: false, // messageModel에 에러가 있을 때
                        hasPendingChanges: false,   // pendingChange가 존재할 때
                        hasEmptyField: false,   // 생성한 행이 비어있을 때 true
                    })

                    MessageToast.show("저장이 완료되었습니다.");

                    this.getView().setBusy(false);
                } catch (error) {

                    MessageToast.show("저장에 실패하였습니다.");

                    this.getView().setBusy(false);
                }



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
                this.refresh = null;
                oModel.resetChanges("CodesHeader");
                oModel.resetChanges("CodesItem");
                oModel.refresh();


                // 코드 아이템 초기화를 위해 코드 아이템 테이블을 다시 바인딩
                this._bindCodeItemTable();

                // uiModel 초기화
                oUiModel.setData({
                    edit: false,
                    codeHeaderDeleteButton: false,
                    codeItemDeleteButton: false,
                    hasError: false, // messageModel에 에러가 있을 때
                    hasPendingChanges: false,   // pendingChange가 존재할 때
                    hasEmptyField: false,   // 생성한 행이 비어있을 때 true
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
            let sPath = oEvent.getSource().getBindingContext().getPath();
            let bNew = oEvent.getSource().getBindingContext().getObject();


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

            let sItemId = oSource.getBindingContext().getObject("item_ID");
            let oUpdateContext = oModel.bindContext(`/CodesItem('${sItemId}')`, null, { $$updateGroupId: "CodesItem" });

            // 테이블에 따른 유효성 검사 로직
            if (sTable === "header") {
                if (sFlag === "category") {
                    // 동일한 코드그룹명이 존재할 때
                    let sNewValue = oBindingContext.getProperty(sFlag);
                    let hasSameValue = aBindingContexts.find(oContext => {
                        // 현재 수정한 행 제외
                        if (oContext !== oBindingContext) {
                            return oContext.getProperty(sFlag) === sNewValue;
                        }
                    });
                    // 같은 값이 존재할 때 valueState 및 valueStateText 설정
                    oSource.setValueStateText(!!hasSameValue ? "동일한 값이 존재합니다." : null);
                    oSource.setValueState(!!hasSameValue ? coreLib.ValueState.Error : coreLib.ValueState.None);

                    //중복시 저장버튼 비활성화
                    this.getView().getModel("uiModel").setProperty("/hasError", hasSameValue);
                }
            } else if (sTable === "item") {
                // 같은 값이 존재하는지 확인 (코드명)
                if (sFlag === "value") {
                    // 동일한 코드그룹명이 존재할 때
                    let sNewValue = oBindingContext.getProperty(sFlag);
                    let hasSameValue = aBindingContexts.find(oContext => {
                        // 현재 수정한 행 제외
                        if (oContext !== oBindingContext) {
                            return oContext.getProperty(sFlag) === sNewValue;
                        }
                    });
                    // 같은 값이 존재할 때 valueState 및 valueStateText 설정
                    oSource.setValueStateText(!!hasSameValue ? "동일한 값이 존재합니다." : null);
                    oSource.setValueState(!!hasSameValue ? coreLib.ValueState.Error : coreLib.ValueState.None);

                    //중복시 저장버튼 비활성화
                    this.getView().getModel("uiModel").setProperty("/hasError", hasSameValue);
                } else if (sFlag === "name") {  // 코드값

                } else if (sFlag === "use_yn") {  // 사용유무 
                    const bState = oEvent.getSource().getState();
                    oUpdateContext.getBoundContext().setProperty(sFlag, bState)
                    oUiModel.setProperty("/hasPendingChanges", true);
                } else if (sFlag === "datatype") {  // 값 형식 변경
                    let sSelectedKey = oSource.getSelectedKey();
                    if (sSelectedKey === "int" || sSelectedKey === "string") {   // int, string으로 변경 시에 코드값을 null로 변경
                        oBindingContext.setProperty("name", "");
                    } else if (sSelectedKey === "boolean") {    // boolean으로 변경 시에는 true로 변경
                        oBindingContext.setProperty("name", "true");

                        //새로 행추가의 경우 제외
                        if (!bNew._isNew) {
                            oUpdateContext.getBoundContext().setProperty("name", "true");
                        }
                    }
                } else if (sFlag === "header_opt1_ID" || sFlag === "header_opt2_ID") {    // 옵션1, 2
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

                        this.getView().getModel("uiModel").setProperty("/hasError", false);
                    } else if (!!oSelectedRow) {    // Row가 존재할 때 
                        let oBindingObject = /** @type {Object} */ (oSelectedRow.getBindingContext("codeModel").getObject());
                        oSource.setValue(`${oBindingObject.name} (${oBindingObject.category})`);
                        oSource.setValueState(coreLib.ValueState.None);

                        this.getView().getModel("uiModel").setProperty("/hasError", false);
                    } else {    // Row가 존재하지 않을 때
                        oSource.setValueState(coreLib.ValueState.Error);

                        this.getView().getModel("uiModel").setProperty("/hasError", true);
                    }
                }
            }

            // CodeItem 테이블일 때 유효성 검사 추가
            if (sTable === "item") {
                // 올바른 값일 때 수동으로 수정 요청 생성
                if (oSource.getValueState() === "None") {
                    let sNewValue = oSource.getValue?.() || oSource.getSelectedKey?.();

                    //새로 행추가의 경우 제외
                    if (!bNew._isNew) {
                        oUpdateContext.getBoundContext().setProperty(sFlag, sNewValue);
                    }
                }

                // codeItem 테이블일 때 MessageModel 수동으로 처리
                this._managemessage(oSource);
            }

            // 필수값이 비었는지 유효성 검사를 한 후 uiModel의 hasEmptyField 속성에 반영
            this._setEmptyField();

            // uiModel의 hasPendingChanges 속성 true로 설정
            oUiModel.setProperty("/hasPendingChanges", true);
            // oUiModel.refresh();

            setTimeout(function () {
                oTable.invalidate("rows");
            }, 1);
        },


        //코드아이템 행추가시 sort_order
        onAddCodeItemSort: function () {
            const oTable = this.byId("codeItemTable");
            const oModel = this.getOwnerComponent().getModel();
            let aBindingContexts = oTable.getBinding("rows").getContexts();

            //기존에 있던 행 기준으로 +1
            const aContexts = oTable.getBinding().getContexts();
            for (let i = 1; i < aContexts.length; i++) {
                const oContext = aContexts[i];
                oContext.getObject().sort_order++;

                //저장된 데이터는 sort_order +1 요청 보내기
                if (!oContext.getObject()._isNew) {
                    let oUpdateContext = oModel.bindContext(`/CodesItem('${oContext.getObject().item_ID}')`, null, { $$updateGroupId: "CodesItem" });
                    oUpdateContext.getBoundContext().setProperty("sort_order", oContext.getObject().sort_order)
                }

                // index 재설정
                oContext.setProperty("sort_order", i + 1);
            }
            setTimeout(function () {
                oTable.invalidate("rows");
            }, 1);


            // 요청 생성 시 uiModel Update
            this.getView().getModel("uiModel").setProperty("/hasPendingChanges", true);
        },


        //코드아이템 행삭제 sort_order
        onDeleteCodeItemSort: function () {
            const oTable = this.byId("codeItemTable");
            const oModel = this.getOwnerComponent().getModel();
            let aBindingContexts = oTable.getBinding("rows").getContexts();

            // sort_order 오름차순으로 재정렬
            let oSortColumn = oTable.getColumns().find(oColumn => oColumn.getSortProperty() === "sort_order");
            oTable.sort(oSortColumn);


            // 재정렬된 행 순으로 sort_order 재설정
            aBindingContexts.forEach((oContext, index) => {
                let oBindingObject = oContext.getObject();

                //새로 추가된 경우 _isNew 가 있는 경우에는 update 요청 제외
                if (!oBindingObject._isNew) {
                    let oUpdateContext = oModel.bindContext(`/CodesItem('${oBindingObject.item_ID}')`, null, { $$updateGroupId: "CodesItem" });
                    oUpdateContext.getBoundContext().setProperty("sort_order", String(index + 1))
                } else {
                    oBindingObject.sort_order = index + 1;
                }
                // index 재설정
                oContext.setProperty("sort_order", index + 1);
            })

            setTimeout(function () {
                oTable.invalidate("rows");
            }, 1);

            // 요청 생성 시 uiModel Update
            this.getView().getModel("uiModel").setProperty("/hasPendingChanges", true);
        },

        /**
         * 코드 아이템 Drop 이벤트
         * @param {Event} oEvent 
         */
        onCodeItemDrop: function (oEvent) {
            const oTable = this.byId("codeItemTable");

            // 드래그한 행 정보
            const oDragSession = oEvent.getParameters()["dragSession"];
            const oDraggedRow = oDragSession.getDragControl();

            // 드랍한 행 정보
            const sDropPosition = oEvent.getParameters()["dropPosition"];
            const oDroppedRow = oDragSession.getDropControl();
            const iDroppedIndex = oDroppedRow.getIndex();

            // 행이 삽입될 index
            const iNewIndex = (sDropPosition === "After") ? iDroppedIndex + 1 : iDroppedIndex;

            // 삽입한 행의 sort_order 설정
            // oTable.insertRow(oDraggedRow, iNewIndex);
            oDraggedRow.getBindingContext().setProperty("sort_order", iNewIndex + 0.5);

            // sort_order 오름차순으로 재정렬
            let oSortColumn = oTable.getColumns().find(oColumn => oColumn.getSortProperty() === "sort_order");
            oTable.sort(oSortColumn);

            // 재정렬된 행 순으로 sort_order 재설정
            const oModel = this.getOwnerComponent().getModel();
            let aBindingContexts = oTable.getBinding("rows").getContexts();
            aBindingContexts.forEach((oContext, index) => {
                let oBindingObject = oContext.getObject();

                //기존 저장된 sort_order만 수정요청
                if (!oBindingObject._isNew) {

                    // sort_order가 변경되었을 때만 수정 요청 생성
                    if (oBindingObject.sort_order !== index + 1) {
                        let oUpdateContext = oModel.bindContext(`/CodesItem('${oBindingObject.item_ID}')`, null, { $$updateGroupId: "CodesItem" });
                        oUpdateContext.getBoundContext().setProperty("sort_order", String(index + 1));

                        // 요청 생성 시 uiModel Update
                        this.getView().getModel("uiModel").setProperty("/hasPendingChanges", true);
                    }
                }

                // index 재설정
                oContext.setProperty("sort_order", index + 1);
            })

            setTimeout(function () {
                oTable.invalidate("rows");
            }, 1);
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


            //기존 저장된 db에만 수정 요청 생성
            if (!oInput.getBindingContext().getObject("_isNew")) {
                // 서버에 수정 요청 생성
                let oModel = this.getOwnerComponent().getModel();
                let sItemId = oInput.getBindingContext().getObject("item_ID");
                let oUpdateContext = oModel.bindContext(`/CodesItem('${sItemId}')`, null, { $$updateGroupId: "CodesItem" });

                // let oItemContext = /** @type {v4Context} */ (oInput.getBindingContext());
                oUpdateContext.getBoundContext().setProperty(`header_opt${iOptionNumber}_ID`, oBindingObject.header_ID); // header_opt
                oUpdateContext.getBoundContext().setProperty(`value_opt${iOptionNumber}`, oBindingObject.value); // value_opt
            }

            //json 모델에 추가 
            oInput.getBindingContext().setProperty(`header_opt${iOptionNumber}_ID`, oBindingObject.header_ID);
            oInput.getBindingContext().setProperty(`value_opt${iOptionNumber}`, oBindingObject.value)

            // 아이템 이름 (카테고리)로 텍스트 설정
            oInput.setValue(`${oBindingObject.name} (${oBindingObject.category})`);
            oInput.setValueState(coreLib.ValueState.None);

            // uiModel의 hasPendingChanges 속성 true로 설정
            this.getView().getModel("uiModel").setProperty("/hasPendingChanges", true);


            // hasError 속성 false로 설정 저장버튼 활성화
            this.getView().getModel("uiModel").setProperty("/hasError", false);
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
            this.sHeaderId = oBindingObject.ID;
            // 선택한 코드 그룹이 새로 생성한 코드그룹일 때
            if (!oBindingObject.ID) {
                Module.messageBox('warning', '새로 생성한 코드그룹에 아이템을 추가하려면\n먼저 생성한 코드그룹을 저장해야 합니다.', '코드그룹 생성');
                return;
            }

            // 변경된 코드 아이템이 있는 경우 
            if (oModel.hasPendingChanges("CodesItem")) {
                let bConfirm = await Module.messageBoxConfirm('warning', '작성된 내용은 저장되지 않습니다. 취소하시겠습니까?', '취소 확인');
                if (!bConfirm) return;

                // 변경 사항 초기화
                oModel.resetChanges("CodesItem");

                // uiModel의 hasPendingChanges 속성 false 설정
                this.getView().getModel("uiModel").setProperty("/hasPendingChanges", false);
            }

            //originCategory 저장된 json모델과 선택된 행의 path 값이 같은걸로 수정되기전 category 값 가져오기
            const aCategories = this.getView().getModel("orginalCategories").getProperty("/categories");
            const sOriginalCategory = aCategories.find(e => e.path === sBindingPath).category;
            // 선택한 코드 그룹의 행을 기준으로 코드 아이템 바인딩
            this._bindCodeItemTable(sOriginalCategory);

            return;

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
            const that = this;

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


                        //input에서 category 수정중 navItem 에서 category이름을 수정된걸로 인식
                        //위의 상황을 방지하고자 기존 category를 따로 jsonModel로 저장
                        const aContexts = oTable.getBinding("rows").getContexts();
                        const aOrginalCategories = aContexts.map(ctx => ({
                            path: ctx.getPath(),
                            category: ctx.getProperty("category")
                        }));
                        const oJsonModel = new JSONModel({ categories: aOrginalCategories });
                        that.getView().setModel(oJsonModel, "orginalCategories")


                        //검색 기준에 따른 메세지 토스트 설정
                        if (this.refresh === null) { //처음 화면에서 메세지 출력 방지

                        } else if (this.refresh) {
                            MessageToast.show("검색조건이 초기화되었습니다.")
                        } else {
                            MessageToast.show("검색이 완료되었습니다.")
                        }
                        //기본적으로  false설정
                        this.refresh = false;

                        oTable.setBusy(false);
                    }.bind(this),
                },
                filters: aFilters
            });



        },

        /**
         * 코드 그룹을 기반으로 CodeItem 테이블 바인딩
         * @param {String} sCategory 코드그룹명 
         */
        _bindCodeItemTable: async function (sCategory) {
            let oModel = this.getOwnerComponent().getModel();
            let oCodeItemTable = this.byId("codeItemTable");

            // 입력받은 파라미터가 없을 때는 테이블에 저장된 파라미터 재사용
            if (!sCategory) {
                sCategory = oCodeItemTable._sCategory;
            };

            // 상세 페이지 클릭 시마다 선택한 코드 그룹 아이템 데이터 반환
            let oCodeContext = oModel.bindContext(`/CodeItemView(category='${sCategory}')/Set`);
            let oCodeData = await oCodeContext.requestObject();

            // 테이블 모델에 코드 그룹 아이템 데이터 삽입
            oCodeItemTable.getModel().setData(oCodeData.value);

            // 이름 없는 테이블 모델을 테이블에 바인딩
            oCodeItemTable.bindRows("/");

            // 재사용을 위해 기반이 된 코드그룹명을 테이블 객체에 저장
            oCodeItemTable._sCategory = sCategory;

            // CodeItem 테이블 Title 설정
            let oTitle = this.byId("codeItemTitle");
            let aBindingContexts = oCodeItemTable.getBinding("rows").getContexts();
            oTitle.setText(`총 ${aBindingContexts.length}개`);

            // 선택한 코드 그룹 표기
            let oTitle2 = this.byId("codeItemTitle2");
            oTitle2.setText(`(${sCategory})`);

            // //기존 남아있던 validation error 초기화
            // oCodeItemTable.getRows().forEach(row=>{
            //     row.getCells().forEach(cell=>{
            //         if(cell instanceof sap.m.Input){
            //             cell.setValueState("None");
            //         }
            //     })
            // })
            
        },

        /**
         * MessageManager를 통해 MessageModel 관리
         * @param {Object} oSource 사용자가 입력한 요소
         */
        _managemessage: function (oSource) {
            let sValueState = oSource.getValueState();
            let sId = oSource.getId();
            if (sValueState === "Error") {
                let oMessage = new Message({
                    type: "Error",
                    target: sId,
                    processor: this.getView().getModel("messageModel")
                });

                Messaging.addMessgaes(oMessage);
            } else if (sValueState === "None") {
                // debugger;
            }
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