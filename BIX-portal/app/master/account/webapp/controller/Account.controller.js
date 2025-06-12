sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/ui/core/format/NumberFormat",
    "sap/m/MessageToast",
    "sap/ui/core/library",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/Token",
    "sap/ui/core/Messaging",
], (Controller, JSONModel, Fragment, NumberFormat, MessageToast, coreLib, Filter, FilterOperator, MessageBox, Token, Messaging) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Input} Input
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     */
    return Controller.extend("bix.master.account.controller.Account", {
        _accountDetailDialog: undefined,

        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("Account");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: function () {
            // UI Table 스크롤 초기화
            this._setTable();

            this._setModel();

            // 검색창 초기화
            this.getView().setModel(new JSONModel(), "searchModel");
        },

        /**
         * 양쪽 테이블 스크롤 초기화
         */
        _setTable: function () {
            // 테이블 스크롤 초기 설정 (수직, 수평)
            let oAccountTable = this.byId("accountTable");
            let oVerticalScroll1 = oAccountTable._getScrollExtension().getVerticalScrollbar();
            oVerticalScroll1?.scrollTo(0, 0);

            let oHorizontalScroll1 = oAccountTable._getScrollExtension().getHorizontalScrollbar();
            oHorizontalScroll1?.scrollTo(0, 0);

            let oCustomerTable = this.byId("customerTable");
            let oVerticalScroll2 = oCustomerTable._getScrollExtension().getVerticalScrollbar();
            oVerticalScroll2?.scrollTo(0, 0);

            let oHorizontalScroll2 = oCustomerTable._getScrollExtension().getHorizontalScrollbar();
            oHorizontalScroll2?.scrollTo(0, 0);

            // 두 테이블 바인딩 해제 및 noData 설정
            oAccountTable.unbindRows();

            oCustomerTable.unbindRows();

            setTimeout(() => {
                this.onSearch(this, 'refresh');
            }, 0);
        },


        /**
         * 초기 모델 설정
         */
        _setModel: function () {
            // ui 모델 설정
            this.getView().setModel(new JSONModel({
                save: false,
                hasError: false,
            }), "uiModel");

            // 메시지 모델 설정
            Messaging.removeAllMessages();
            let oMessageModel = Messaging.getMessageModel();
            let oMessageModelBinding = oMessageModel.bindList("/", undefined, [],
                new Filter("technical", FilterOperator.EQ, true)
            );

            this.getView().setModel(oMessageModel, "messageModel");
            oMessageModelBinding.attachChange((oEvent) => {

                //error인 경우 버튼 비활성화
                const sFragment = this.createId("accountDetailDialog");
                const oSaveButton = Fragment.byId(sFragment, "accountSaveButton");
                if (oSaveButton) {
                    oSaveButton.setEnabled(false);
                }
            });
        },

        /**
         * 검색창 검색 이벤트
         * @param {Event} oEvent 
         */

        onSearch: function (oEvent, sFlag) {
            let oSearchData = this.getView().getModel("searchModel").getData();
            let oAccountTable = this.byId("accountTable");
            let aFilters = [];
            if (sFlag === "search") {//검색시 필터 설정
                // account값이 있는 경우 
                if (oSearchData.account) {
                    //biz_tp_account_nm 필터 추가
                    aFilters.push(
                        new Filter({
                            path: "biz_tp_account_nm",
                            operator: FilterOperator.Contains,
                            value1: oSearchData.account,
                            caseSensitive: false,
                        })
                    );
                }
                // 고객사명이 있는 경우 
                if (oSearchData.customer) {
                    //customer_detail 의 name 포함 여부 필터 추가
                    aFilters.push(
                        new Filter({
                            path: "customer_detail",
                            operator: FilterOperator.Any,
                            variable: "customer_detail",
                            condition: new Filter(`customer_detail/name`, FilterOperator.Contains, oSearchData.customer),
                            caseSensitive: false,
                        })
                    );
                }
            } else if (sFlag === "refresh") { //초기화 버튼시 검색창 초기화
                this.getView().setModel(new JSONModel(), "searchModel");
            }

            //삭제 안된 필터 추가 
            aFilters.push(
                new Filter({
                    path: "delete_yn",
                    operator: FilterOperator.Contains,
                    value1: false,
                })
            );


            // 테이블 바인딩
            oAccountTable.bindRows({
                path: "/Account",
                filters: aFilters,
                parameters: {
                    $count: true,
                    $expand: "customer_detail",
                    $orderby: "sort_order"
                },
                events: {
                    dataRequested: function () {
                        oAccountTable.setBusy(true);
                    }.bind(this),
                    dataReceived: function (oEvent) {

                        // Account Table Title 에 count 설정
                        let oHeaderContext = oEvent.getSource().getHeaderContext();
                        this.byId("accountTitle").setBindingContext(oHeaderContext);

                        oAccountTable.setNoData("데이터가 없습니다.");
                        oAccountTable.setBusy(false);
                    }.bind(this),
                },
            });

            //스크롤  초기화 
            let oScroll = oAccountTable._getScrollExtension().getVerticalScrollbar();
            oScroll?.scrollTo(0, 0);


            //account 행삭제 활성화 비활성화 체크
            this.selctionAccountChange();
            //customr 행삭제 비활성화 와 customer table 언바인드
            this.byId("deleteCustomer").setEnabled(false);
            this.byId("customerTable").unbindRows();
        },

        //account 행삭제 활성화 비활성화
        selctionAccountChange: function () {
            const oTable = this.byId("accountTable");
            const oButton = this.byId("deleteAccount");

            //선택된게 없는 경우 비활성화
            const iSelected = oTable.getSelectedIndices().length;
            oButton.setEnabled(iSelected > 0);
        },

        //customer 행삭제 활성화 비활성화
        selctionCustomerChange: function () {
            const oTable = this.byId("customerTable");
            const oButton = this.byId("deleteCustomer");

            //선택된게 없는 경우 비활성화
            const iSelected = oTable.getSelectedIndices().length;
            oButton.setEnabled(iSelected > 0);
        },


        /**
         * Account 생성, 수정, 삭제
         * @param {Event} oEvent 
         * @param {String} sFlag  // Create, Update, Delete
         */
        onAccountTableButton: async function (oEvent, sFlag) {
            var oBindingContext;   // 수정 및 삭제 시 선택한 아이템 Context
            let oModel = this.getOwnerComponent().getModel();

            if (sFlag === "Create") {   // 생성

            } else if (sFlag === "Delete") {    // 삭제
                let oTable = this.byId("accountTable");
                let aSelectedIndices = oTable.getSelectedIndices();
                if (aSelectedIndices.length > 0) {

                    //메세지박스 출력
                    let isConfirm = await new Promise((resolve) => {
                        MessageBox["warning"]("선택한 Account를 삭제하시겠습니까?", {
                            title: "Account 삭제",
                            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                            emphasizedAction: MessageBox.Action.OK,
                            onClose: function (oAction) {
                                if (oAction === "OK") {
                                    resolve(true);
                                } else {
                                    resolve(false);
                                }
                            }
                        })
                    });

                    // 취소 시 닫기
                    if (!isConfirm) return;

                    // 선택한 Index의 Context를 Batch에 삭제 요청 생성
                    let aBindingContexts = oTable.getBinding("rows").getContexts();

                    const aAccount =[];

                    //delete_yn으로 삭제 
                    for (const i of aSelectedIndices) {
                        const oContext = aBindingContexts[i];
                        oContext.setProperty("delete_yn", true);

                        //account 코드 추출
                        const oData= oContext.getObject();
                        aAccount.push(oData.biz_tp_account_cd)
                    }

                    //삭제된 account의 코드를 가지고 있는 customer 필터 추가
                    const sFilter = aAccount.map(cd => `account_cd eq '${cd}'`).join(" or ");


                    //customer 필터 적용해서 바인딩
                    const oBinding = oModel.bindList(`/Customer`, undefined, undefined, undefined, {
                        $filter: sFilter,
                        $$updateGroupId: "delete"
                    });


                    oBinding.initialize();
                    const aContexts = await oBinding.requestContexts(0, Infinity);

                    //필터를 통해서 삭제된 account_cd를 가지고 있는 customer 에 있는 account_cd 초기화 
                    if (aContexts) {
                        aContexts.forEach(oContext => {
                            oContext.setProperty("account_cd", null);
                        })
                    }

                    


                    // 삭제된 Context가 가리키는 데이터는 submitBatch에서 요청을 모아서 서버에 한 번에 전달함
                    oModel.submitBatch("delete").then(function () {
                        let aChanges = oModel.hasPendingChanges("delete");
                        if (!aChanges) {
                            MessageToast.show("삭제가 완료되었습니다.");

                            this.byId("customerTable").unbindRows();
                        } else {
                            MessageToast.show("삭제에 실패하였습니다.");
                        }

                        // 모델 및 데이터 초기화
                        this.onSearch(this, 'refresh');
                       
                    }.bind(this));
                } else {
                    MessageBox.warning("선택한 Account가 없습니다.", {
                        title: "Account 삭제"
                    })
                }
                return;
            } else if (sFlag === "Update") {    // 수정

                //선택된 행의 값 바인딩
                let oSelectedItem = oEvent.getParameters()["item"];
                oBindingContext = oSelectedItem.getBindingContext();
            }

            //create , update 는  _accountDetailDialog 오픈

            if (!this._accountDetailDialog) {
                let sComponentName = this.getOwnerComponent().getMetadata().getComponentName();

                await this.loadFragment({
                    id: "accountDetailDialog",
                    name: `${sComponentName}.view.fragment.AccountDetail`,
                    controller: this,
                }).then(function (oDialog) {
                    this._accountDetailDialog = oDialog;


                    oDialog.attachBeforeOpen(function (oEvent) {
                        let oDialog = this._accountDetailDialog;
                        let sFlag = oDialog.getModel("uiModel").getProperty("/flag");
                        let oSimpleForm = this.byId(Fragment.createId("accountDetailDialog", "simpleForm"));
                        oSimpleForm.unbindElement();    // Form 초기화


                        //저장버튼 비활성화
                        const sFragment = this.createId("accountDetailDialog");
                        Fragment.byId(sFragment, "accountSaveButton").setEnabled(false);


                        // 모든 입력 필드 valueState 해제
                        oSimpleForm.getControlsByFieldGroupId("Required").forEach(function (object) {
                            if (object.getFieldGroupIds().length > 0) {
                                object.setValueState("None");
                            }
                        }.bind(this));

                        if (sFlag === "Create") {   // 생성
                            let oBinding = oModel.bindList("/Account", undefined, undefined, undefined, {
                                $$updateGroupId: "account"
                            });

                            // 더미 데이터 바인딩
                            let oDummyContext = oBinding.create();


                            //VER 임시 추가
                            //년/월/일/시/분/초/ 로 ver 임시 추가
                            const now = new Date();
                            const ver = now.getFullYear().toString()+
                            String(now.getMonth()+1).padStart(2,'0') +
                            String(now.getDate()).padStart(2,'0') +
                            String(now.getHours()).padStart(2,'0') +
                            String(now.getMinutes()).padStart(2,'0') +
                            String(now.getSeconds()).padStart(2,'0') 

                            oDummyContext.setProperty("ver", ver)

                            //삭제 false
                            oDummyContext.setProperty("delete_yn", false)


                            oSimpleForm.setBindingContext(oDummyContext);
                        } else if (sFlag === "Update") {    // 수정

                            // 선택한 아이템 바인딩
                            let sBindingPath = oDialog._oBindingContext.getPath();
                            let oBinding = oModel.bindContext(sBindingPath, undefined, {
                                $$updateGroupId: "account"
                            });

                            let oContext = oBinding.getBoundContext();
                            oSimpleForm.setBindingContext(oContext);
                        }
                    }.bind(this));
                }.bind(this));
            }

            // Dialog 전용 모델 설정 (Title, Enabled)
            this._accountDetailDialog.setModel(new JSONModel({
                flag: sFlag,
                title: (sFlag === "Create") ? "Account 생성" : `Account 수정`,
                enabled: (sFlag === "Create") ? true : false
            }), "uiModel");
            this._accountDetailDialog._oBindingContext = oBindingContext || null;
            this._accountDetailDialog.open();
        },

        /**
         * Account 생성, 수정, 삭제
         * @param {Event} oEvent 
         * @param {String} sFlag  // Create, Update, Delete
        */
        onCustomerTableButton: async function (oEvent, sFlag) {
            let oModel = this.getOwnerComponent().getModel();
            let sComponentName = this.getOwnerComponent().getMetadata().getComponentName();
            let oBindingSource = oEvent.getSource();
            let oCustomerTable = this.byId("customerTable");

            if (sFlag === "Create") {   // 생성
                // Account를 선택하지 않았을 때
                if (!oCustomerTable.getBinding("rows")) {
                    MessageBox["warning"]("Account를 선택해주세요.");
                    return;
                }

                // 고객사 선택 Fragment Open
                await this.onOpenCustomerSelectDialog();

                this._customerSelectDialog._oBindingSource = oBindingSource;
                this._customerSelectDialog.open();
                return;
            } else if (sFlag === "Delete") {    // 삭제
                let aSelectedIndices = oCustomerTable.getSelectedIndices();
                if (aSelectedIndices.length > 0) {
                    let isConfirm = await new Promise((resolve) => {
                        MessageBox["warning"]("선택한 고객사를 삭제하시겠습니까?", {
                            title: "고객사 삭제",
                            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                            emphasizedAction: MessageBox.Action.OK,
                            onClose: function (oAction) {
                                if (oAction === "OK") {
                                    resolve(true);
                                } else {
                                    resolve(false);
                                }
                            }
                        })
                    });

                    // 취소 시 닫기
                    if (!isConfirm) return;

                    // 선택한 Index의 Context를 Batch에 삭제 요청 생성
                    let aBindingContexts = oCustomerTable.getBinding("rows").getContexts();
                    aSelectedIndices.forEach(function (oSelectedIndex) {
                        let oBindingContext = aBindingContexts[oSelectedIndex];
                        let sBindingPath = oBindingContext.getPath();
                        let oContext = oModel.bindContext(sBindingPath, undefined, {
                            $$updateGroupId: "delete"
                        })
                        // 선택된 행의 account_cd를 null전환
                        oContext.getBoundContext().setProperty("account_cd", null);
                    })

                    // 삭제된 Context가 가리키는 데이터는 submitBatch에서 요청을 모아서 서버에 한 번에 전달함
                    oModel.submitBatch("delete").then(function () {
                        let aChanges = oModel.hasPendingChanges("delete");
                        if (!aChanges) {
                            MessageToast.show("삭제가 완료되었습니다.");

                            // 모델 및 데이터 초기화
                            oModel.refresh();
                        } else {
                            MessageToast.show("삭제에 실패하였습니다.");
                        }
                    }.bind(this));
                } else {
                    MessageBox.warning("선택한 고객사가 없습니다.", {
                        title: "고객사 삭제"
                    })
                }

                return;
            } else if (sFlag === "Update") {    // 수정
                let oSelectedItem = oEvent.getParameters()["item"];
                var oBindingContext = oSelectedItem.getBindingContext();
            }

            if (!this._customerDetailDialog) {
                await this.loadFragment({
                    id: "customerDetailDialog",
                    name: `${sComponentName}.view.fragment.CustomerDetail`,
                    controller: this,
                }).then(function (oDialog) {
                    this._customerDetailDialog = oDialog;

                    oDialog.attachBeforeOpen(async function (oEvent) {
                        let oDialog = this._customerDetailDialog;
                        let oSimpleForm = this.byId(Fragment.createId("customerDetailDialog", "simpleForm"));
                        oSimpleForm.unbindElement();    // Form 초기화

                        // SimpleForm에 선택한 아이템 바인딩
                        let sBindingPath = oDialog._oBindingContext.getPath();
                        oSimpleForm.bindElement(sBindingPath, {
                            $select: "code,name",
                            $expand: "account_detail"
                        });

                        // Input 설정
                        let oInput = this.byId(Fragment.createId("customerDetailDialog", "customerInput"));
                        // ValueHelp 설정
                        oInput.attachEvent("valueHelpRequest", async function (oEvent) {
                            // 고객사 선택 Fragment Open
                            await this.onOpenCustomerSelectDialog();

                            this._customerSelectDialog._oBindingSource = oInput;
                            this._customerSelectDialog.open();
                        }.bind(this));

                        // liveChange 이벤트를 통해 문자 입력 방지
                        oInput.attachEvent("liveChange", async function (oEvent) {
                            let oSource = oEvent.getSource();
                            if (oSource.getValue()) oSource.setValue(null);
                        }.bind(this));

                        // tokenUpdate 이벤트를 통해 토큰 제거 시 SimpleForm 바인딩 해제
                        oInput.attachEvent("tokenUpdate", async function (oEvent) {
                            let sType = oEvent.getParameters()["type"];
                            if (sType === "removed") {
                                oSimpleForm.unbindElement();
                            }
                        }.bind(this));

                        // Input에 Token 추가
                        oInput.setTokens([new Token({ key: "{code}", text: "{name}" })]);
                        oInput.setValueState(null);

                        // biz_tp_account_nm 이름 설정
                        let oContext = oModel.bindContext(sBindingPath, undefined, {
                            $expand: "account_detail",
                            $$updateGroupId: "Customer"
                        });

                        let oAccountObject = await oContext.requestObject();
                        let sAccountName = oAccountObject["account_detail"]["biz_tp_account_nm"]
                        let oAccountName = this.byId(Fragment.createId("customerDetailDialog", "accountName"));
                        oAccountName.setValue(sAccountName);

                        //detail 초기 저장버튼 비활성화
                        const sFragment = this.createId("customerDetailDialog");
                        const oSaveButton = Fragment.byId(sFragment, "customerDeatilSaveButton");
                        oSaveButton.setEnabled(false)


                    }.bind(this));
                }.bind(this));
            }

            this._customerDetailDialog._oBindingContext = oBindingContext || null;
            this._customerDetailDialog.open();
        },

        /**
         * 
         * @param {Event} oEvent 
         */
        //고객사 선택 Dialog
        onOpenCustomerSelectDialog: async function () {
            if (!this._customerSelectDialog) {
                let sFragmentId = "customerSelectDialog";
                let sComponentName = this.getOwnerComponent().getMetadata().getComponentName();

                await this.loadFragment({
                    id: sFragmentId,
                    name: `${sComponentName}.view.fragment.CustomerSelect`,
                    controller: this,
                }).then(function (oDialog) {
                    this._customerSelectDialog = oDialog;

                    oDialog.attachBeforeOpen(function (oEvent) {
                        // 테이블 초기 바인딩
                        let oTable = this.byId(Fragment.createId(sFragmentId, "table"));
                        let oBinding = {
                            path: '/Customer',
                            parameters: {
                                $select: "code,name,account_cd",
                                $count: true
                            },
                            events: {
                                dataRequested: function () {
                                    oTable.setBusy(true);
                                }.bind(this),
                                dataReceived: function () {
                                    oTable.setBusy(false);
                                }.bind(this),
                            },
                        };
                        oTable.bindRows(oBinding);

                        // 서치필드 초기화 및 검색 로직 적용
                        let oSearchField = this.byId(Fragment.createId(sFragmentId, "searchField"));
                        oSearchField.setValue(null);
                        oSearchField.attachEvent("search", function (oEvent) {
                            let sQuery = oEvent.getParameters()["query"];
                            oBinding.filters = new Filter({
                                path: "name",
                                operator: FilterOperator.Contains,
                                value1: sQuery,
                                caseSensitive: false,
                            });

                            oTable.bindRows(oBinding);
                        }.bind(this));

                        // Customer 수정일 때 Single Select로 변경
                        let sSelectionMode = (oDialog._oBindingSource.getFieldGroupIds().includes("Single")) ? "Single" : "MultiToggle";
                        oDialog.setModel(new JSONModel({ selectionMode: sSelectionMode }), "uiModel");
                    }.bind(this));


                    // 테이블 rowSelectionChange 이벤트 설정
                    let oTable = this.byId(Fragment.createId(sFragmentId, "table"));
                    oTable.attachEvent("rowSelectionChange", function (oEvent) {
                        let oTable = oEvent.getSource();
                        let oParameters = oEvent.getParameters();
                        let iSelectedIndex = oParameters.rowIndex;
                        let isSelected = oTable.isIndexSelected(oParameters.rowIndex);

                        // 선택을 해제했을 때만 해당 행의 고객사가 다른 Account에 속해있는지 확인
                        if (isSelected) {
                            let oBindingContext = oEvent.getParameters()["rowContext"];
                            let oBindingObject = oBindingContext.getObject();

                            //이미 account_cd 가 있는 경우 행선택 취소
                            if (oBindingObject.account_cd) {
                                // 선택한 행의 체크박스 해제
                                oTable.removeSelectionInterval(iSelectedIndex, iSelectedIndex);

                                MessageBox["warning"]("이미 Account에 속한 고객사입니다.");
                            }
                        }
                    }.bind(this));
                }.bind(this));
            }
        },

        /**
         * 
         * @param {Event} oEvent 
         * @param {String} sFlag Save, Close
         */
        onCustomerSelectDialogButton: async function (oEvent, sFlag) {
            let oModel = this.getOwnerComponent().getModel();
            let oCustomerDialog = this._customerSelectDialog;

            if (sFlag === "Save") {
                // 선택한 고객사가 있는지 검사
                let oTable = this.byId(Fragment.createId("customerSelectDialog", "table"));
                let aSelectedIndices = oTable.getSelectedIndices();
                if (aSelectedIndices.length === 0) {
                    MessageToast.show("고객사를 선택해주세요.");
                    return;
                }

                // 단일 선택일 때 CustomerDetail Dialog에 바인딩된 고객사 변경
                let oBindingSource = oCustomerDialog._oBindingSource;
                let isSingleSelect = oBindingSource.getFieldGroupIds().includes("Single");
                if (isSingleSelect) {
                    // Context 생성
                    let aBindingContexts = oTable.getBinding("rows").getContexts();
                    let oSelectedContext = aBindingContexts[aSelectedIndices[0]];
                    let oSelectedPath = oSelectedContext.getPath();
                    let oSelectedCustomer = oSelectedContext.getObject();

                    // Input에 토큰 설정
                    let oInput = this.byId(Fragment.createId("customerDetailDialog", "customerInput"));
                    oInput.setTokens([new Token({ key: oSelectedCustomer.code, text: oSelectedCustomer.name })]);
                    oInput.setValueState("None");

                    // 선택한 아이템 바인딩
                    let oSimpleForm = this.byId(Fragment.createId("customerDetailDialog", "simpleForm"));
                    oSimpleForm.bindElement(oSelectedPath, {
                        $select: "code,name",
                        $expand: "account_detail"
                    });

                    if (oCustomerDialog) {
                        oCustomerDialog.close();
                    }

                    //detail 토큰 추가와 함께 버튼 활성화
                    const sFragment = this.createId("customerDetailDialog");
                    const oSaveButton = Fragment.byId(sFragment, "customerDeatilSaveButton");

                    oSaveButton.setEnabled(true)


                    return;
                }

                // Account Code 반환
                let sCustomerPath = this.byId("customerTable").getBinding("rows").getPath();
                let aAccountContexts = this.byId("accountTable").getBinding("rows").getContexts();
                let oAccountContext = aAccountContexts.find(oContext => sCustomerPath.includes(oContext.getPath()));
                let sAccountCode = oAccountContext.getObject("biz_tp_account_cd");

                // 선택한 고객사의 account_cd 설정
                let aBindingContexts = oTable.getBinding("rows").getContexts();
                aSelectedIndices.forEach(function (oSelectedIndex) {
                    let sBindingPath = aBindingContexts[oSelectedIndex].getPath();
                    let oContext = oModel.bindContext(sBindingPath, undefined, {
                        $$updateGroupId: "Customer"
                    });

                    oContext.getBoundContext().setProperty("account_cd", sAccountCode);
                });

                // 삭제된 Context가 가리키는 데이터는 submitBatch에서 요청을 모아서 서버에 한 번에 전달함
                oModel.submitBatch("Customer").then(function () {
                    let aChanges = oModel.hasPendingChanges("Customer");
                    if (!aChanges) {
                        MessageToast.show("고객사가 \n추가되었습니다.");

                        if (oCustomerDialog) {
                            oCustomerDialog.close();
                        }

                        // 모델 및 데이터 초기화
                        oModel.refresh();
                    } else {
                        MessageToast.show("고객사 추가에 \n실패하였습니다.");
                    }
                }.bind(this));
            } else if (sFlag === "Close") {
                if (oCustomerDialog) {
                    oModel.resetChanges("Customer");

                    oCustomerDialog.close();
                }
            }
        },

        /**
         * Account Dialog의 저장 및 취소 버튼
         * @param {Event} oEvent 
         * @param {String} sFlag 
         */
        onAccountDetailDialogButton: async function (oEvent, sFlag) {
            let oModel = this.getOwnerComponent().getModel();

            if (sFlag === "Save") { // 저장
                let oSimpleForm = this.byId(Fragment.createId("accountDetailDialog", "simpleForm"));
                let isInvalid = oSimpleForm.getControlsByFieldGroupId("Required").find(function (object) {
                    if (object.getFieldGroupIds().length > 0) {
                        return object.getValueState() === "Error" || !object.getValue();
                    }
                }.bind(this));

                // 입력하지 않은 필드가 존재할 때
                if (isInvalid) {
                    MessageToast.show('필수 필드를 확인해주세요.');
                    return;
                }

                oModel.submitBatch("account").then(async function () {
                    let aChanges = oModel.hasPendingChanges("account");
                    if (!aChanges) {
                        MessageToast.show("저장이 완료되었습니다.");

                        // 모델 및 데이터 초기화
                        oModel.refresh();

                        this._accountDetailDialog.close();
                    } else {
                        MessageToast.show("저장에 실패하였습니다.");
                    }
                }.bind(this));
            } else if (sFlag === "Close") { // 취소 및 닫기
                if (this._accountDetailDialog) {
                    this._accountDetailDialog.close();

                    // 요청 초기화
                    oModel.resetChanges("account");
                }
            }
        },

        /**
         * Account 생성 및 수정 change event
         * @param {Event} oEvent 
         * @param {String} sField code, name, sort_order
         */
        onAccountChange: async function (oEvent, sField) {

            const sFragment = this.createId("accountDetailDialog");
            const oSaveButton = Fragment.byId(sFragment, "accountSaveButton");


            let oSource = oEvent.getSource();
            let sValue = oEvent.getParameters()["value"];

            if (!sValue) {
                oSource.setValueStateText("값을 입력해주세요.");
                oSource.setValueState("Error");
                oSaveButton.setEnabled(false);
                return;
            } else {
                oSource.setValueState("None");
            }

            // Code 값이 다른 데이터 중, sField 필드와 값이 일치하는 데이터 반환
            let sFlag = this._accountDetailDialog.getModel("uiModel").getProperty("/flag");
            let aFilters = [];
            if (sFlag === "Create") {   // 생성일 때 전체 데이터에서 해당 필드 필터링
                aFilters.push(new Filter({ path: sField, operator: FilterOperator.EQ, value1: sValue }))
            } else if (sFlag === "Update") {    // 수정일 때 다른 데이터에 대해서만 필터링
                aFilters.push(new Filter({ path: "biz_tp_account_cd", operator: FilterOperator.NE, value1: sValue }));
                aFilters.push(new Filter({ path: sField, operator: FilterOperator.EQ, value1: sValue }))
            }
            

            //delete_yn으로 삭제로 되어있는것은 제외
            aFilters.push(new Filter({ path: "delete_yn", operator: FilterOperator.EQ, value1: false }))

            // 값이 동일한 데이터 존재 시 에러 메시지 
            let oModel = this.getOwnerComponent().getModel();
            let oExistedBinding = oModel.bindList("/Account", undefined, undefined, aFilters);
            let aExistedContexts = await oExistedBinding.requestContexts(0, 1);
            if (aExistedContexts.length) {
                oSource.setValueStateText("동일한 값이 존재합니다.")
                oSource.setValueState("Error");
            }

            //버튼 활성화 체크
            this.checkAccountEnable();

        },



        //전체 valid체크 후 버튼 활성 비활성화 
        checkAccountEnable: function () {
            const sFragment = this.createId("accountDetailDialog");
            const oForm = Fragment.byId(sFragment, "simpleForm");

            //input을 따로 추출하여 배열
            const aInputs = oForm.findElements(true).filter(
                oControl => oControl.isA("sap.m.Input")
            );

            //값이 없거나 error가 있는 경우 버튼 비활성화
            const bAllValid = aInputs.every(oInput => {
                const sValue = oInput?.getValue?.();
                const sState = oInput?.getValueState?.();
                return !!sValue && sState !== "Error";
            })

            //return 된 값을 기준으로 enable 설정
            const oSaveButton = Fragment.byId(sFragment, "accountSaveButton");
            oSaveButton.setEnabled(bAllValid);
        },

        //cutomerDeatil 에서 선택된 customer가 없는 경우 저장버튼 비활성화
        checkCustomerDetail: function (oEvent) {
            const sFragment = this.createId("customerDetailDialog");
            const oSaveButton = Fragment.byId(sFragment, "customerDeatilSaveButton");

            const sType = oEvent.getParameter("type");
            if (sType === "removed") {
                oSaveButton.setEnabled(false)
            }

        },





        /**
         * Customer Dialog의 저장 및 취소 버튼
         * @param {Event} oEvent 
         * @param {String} sFlag 
         */
        onCustomerDetailDialogButton: async function (oEvent, sFlag) {
            let oModel = this.getOwnerComponent().getModel();
            let oCustomerDetailDialog = this._customerDetailDialog;

            if (sFlag === "Save") { // 저장
                // 선택된 토큰이 있는지 유효성 검사
                let oSimpleForm = this.byId(Fragment.createId("customerDetailDialog", "simpleForm"));
                let isInvalid = oSimpleForm.getControlsByFieldGroupId("Required").find(function (object) {
                    if (object.getFieldGroupIds().length > 0) {
                        if (!object.getTokens().length) {
                            object.setValueState("Error");
                            return true;
                        }
                    }
                }.bind(this));

                // 입력하지 않은 필드가 존재할 때
                if (isInvalid) {
                    MessageToast.show('필수 필드를 확인해주세요.');
                    return;
                }

                // 처음 선택한 고객사의 account_cd를 null로 설정
                let oFirstBindingContext = oCustomerDetailDialog._oBindingContext;
                let sAccountCode = oFirstBindingContext.getObject("account_detail/biz_tp_account_cd");
                oFirstBindingContext.setProperty("account_cd", null, "Customer");

                // 마지막으로 선택한 고객사의 account_cd를 현재 선택한 Account Code로 변경
                let oLastBindingContext = oSimpleForm.getBindingContext();
                oLastBindingContext.setProperty("account_cd", sAccountCode, "Customer");

                // 서버에 Batch 요청
                oModel.submitBatch("Customer").then(async function () {
                    let aChanges = oModel.hasPendingChanges("Customer");
                    if (!aChanges) {
                        MessageToast.show("저장이 완료되었습니다.");

                        // 모델 및 데이터 초기화
                        oModel.resetChanges("Dummy");
                        oModel.refresh();

                        this._customerDetailDialog.close();
                    } else {
                        MessageToast.show("저장에 실패하였습니다.");
                    }
                }.bind(this));
            } else if (sFlag === "Close") { // 취소 및 닫기
                if (this._customerDetailDialog) {
                    this._customerDetailDialog.close();
                }
            }
        },

        /**
         * Account 테이블 상세 페이지 클릭 이벤트
         * @param {Event} oEvent 
         */
        onNavCustomer: function (oEvent) {
            let oSelectedItem = oEvent.getParameters()["item"];
            let oSelectedContext = oSelectedItem.getBindingContext();
            let sBindingPath = oSelectedContext.getPath();

            // Customer 바인딩
            let oCustomerTable = this.byId("customerTable");
            oCustomerTable.bindRows({
                path: `${sBindingPath}/customer_detail`,
                parameters: {
                    $expand: "account_detail",
                    $count: true,
                },
                events: {
                    dataRequested: function () {
                        oCustomerTable.setBusy(true);
                    }.bind(this),
                    dataReceived: function (oEvent) {
                        // Customer Table Title 설정
                        let oBinding = oEvent.getSource();
                        let oHeaderContext = oBinding.getHeaderContext();

                        // 고객사 개수 설정
                        let oTitle = this.byId("customerTitle");
                        oTitle.setBindingContext(oHeaderContext);

                        // Account Name 부분에 선택한 Account의 Context를 적용
                        let oTitle2 = this.byId("customerTitle2");
                        oTitle2.setBindingContext(oSelectedContext);

                        oCustomerTable.setBusy(false);
                    }.bind(this),
                }
            })

            //기존 선택된 행으로 인한 행삭제 활성 초기화
            this.selctionCustomerChange();
        },


    });
});