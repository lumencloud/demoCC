sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/core/Control",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/odata/v2/ODataModel",
],
    function (Fragment, Control, MessageBox, JSONModel, Filter, FilterOperator, ODataModel) {
        "use strict";

        var oExtendControl = {
            metadata: {
                properties: {
                    contentWidth: { type: "string", defaultValue: "30rem" },
                    contentHeight: { type: "string", defaultValue: "auto" },
                    fragmentController: { type: "object" },
                    fragmentLoaded: { type: "function" },
                    bindingSource: { type: "object" },
                },
                aggregations: {
                    _table: { type: "object", multiple: false, visibility: "hidden" }
                },
                events: {
                    beforeOpen: {},
                    beforeClose: {},
                    afterOpen: {},
                    afterClose: {},
                    afterSave: {},  // 저장 이후 실행할 로직
                }
            },

            _pDialog: undefined,
            _oDialog: undefined,
            _oSelectedData: {},

            constructor: function () {
                Control.prototype.constructor.apply(this, arguments);

                if (!this._oDialog) {
                    this._loadFragment();
                }
            },

            init: function () {
                Control.prototype.init.apply(this, arguments);
            },

            _loadFragment: async function () {
                if (!this._pDialog) {
                    this._pDialog = new Promise(function (resolve) {
                        let oController = this.getFragmentController();
                        let fnFragmentLoaded = this.getFragmentLoaded();

                        Fragment.load({
                            id: this.getId(),
                            name: `bix.common.library.customDialog.OrgSingleSelect`,
                            controller: oController,
                        }).then(function (oDialog) {
                            this._oDialog = oDialog;

                            // 속성 적용
                            oDialog.setContentWidth(this.getContentWidth());
                            oDialog.setContentHeight(this.getContentHeight());

                            // 취소 버튼 클릭 이벤트
                            let oCloseButton = Fragment.byId(this.getId(), "closeButton");
                            oCloseButton.attachPress(function () {
                                this.close();
                            }.bind(this));

                            // 취소 버튼 클릭 이벤트
                            let oCancelButton = Fragment.byId(this.getId(), "cancelButton");
                            oCancelButton.attachPress(function () {
                                this.close();
                            }.bind(this));

                            // 등록 버튼 클릭 이벤트
                            let oSaveButton = Fragment.byId(this.getId(), "saveButton");
                            oSaveButton.attachPress(function () {
                                //tree table 로직
                                let oTable = Fragment.byId(this.getId(), "treeTable");
                                let iSeletIndex = oTable.getSelectedIndex();

                                // 선택된 조직이 없을 때
                                if (!this._oSelectedData?.org_id) {
                                    MessageBox["warning"]('조직을 선택해주세요.')
                                    return;
                                };

                                // 멀티 인풋으로 열고 저장시 (value 속성 -> name / name 속성 -> id 입력)
                                let oBindingSource = this.getBindingSource();
                                let oValueModel = oBindingSource.getBinding("value").getModel();
                                let sValuePath = oBindingSource.getBinding("value").getPath();
                                oValueModel.setProperty(sValuePath, this._oSelectedData.org_name);

                                let oNameModel = oBindingSource.getBinding("name").getModel();
                                let sNamePath = oBindingSource.getBinding("name").getPath();
                                oNameModel.setProperty(sNamePath, this._oSelectedData.org_id);

                                // Input Value 및 ValueState 설정
                                oBindingSource.setValue?.(this._oSelectedData.org_name);
                                oBindingSource.setValueState("None");

                                // orgType 넘기기
                                let sType;
                                if (this._oSelectedData.org_level === "lv1") {
                                    sType = "전사"
                                } else if (this._oSelectedData.org_level === "div") {
                                    sType = "부문"
                                } else if (this._oSelectedData.org_level === "hdqt") {
                                    sType = "본부"
                                } else if (this._oSelectedData.org_level === "team") {
                                    sType = "팀"
                                }

                                this.getBindingSource().getBinding("value").getModel().oData["org_tp"] = this._oSelectedData.org_tp;
                                this.getBindingSource().getBinding("value").getModel().oData["orgType"] = sType;
                                this.getBindingSource().getBinding("value").getModel().oData["org_level"] = this._oSelectedData.org_level;

                                // Dialog 닫기
                                if (this._oDialog) {
                                    oCancelButton.firePress();

                                    // 사용자가 전달한 저장 이후 실행될 로직
                                    this.fireAfterSave();
                                };
                            }.bind(this));

                            // 검색창 검색 이벤트
                            let oSearchField = Fragment.byId(this.getId(), "searchField");
                            oSearchField.attachEvent("search", function (oEvent) {
                                this._onSearch(oEvent);
                            }.bind(this));

                            // 테이블 행 선택 이벤트
                            let oTable = Fragment.byId(this.getId(), "treeTable");
                            oTable.attachEvent("rowSelectionChange", function (oEvent) {
                                let oInput = Fragment.byId(this.getId(), "input");

                                if (oEvent.getSource().getSelectedIndex() === -1) {   // 선택된 데이터가 없을 때 Input 초기화
                                    this._oSelectedData = null;
                                    oInput.setValue(null);
                                } else {
                                    let oBindingObject = oEvent.getParameters()["rowContext"]?.getObject();

                                    this._oSelectedData = oBindingObject;
                                    oInput.setValue(oBindingObject.org_name);
                                }
                            }.bind(this));

                            // Dialog 열기 전 실행 로직
                            oDialog.attachBeforeOpen(async function (oEvent) {
                                // 테이블 행 선택 해제
                                let oTable = Fragment.byId(this.getId(), "treeTable");
                                oTable.setSelectedIndex(null);

                                // 테이블 스크롤 최상단으로 이동
                                oTable.setFirstVisibleRow(0);

                                // 서치필드 초기화
                                let oSearchField = Fragment.byId(this.getId(), "searchField");
                                oSearchField.setValue(null);

                                // 조직 데이터 호출
                                await this._bindTable(oEvent);

                                // 테이블에 바인딩된 데이터
                                let aBindingContexts = oTable.getBinding("rows").getContexts();
                                let oBindingObject = aBindingContexts.map(oContext => oContext.getObject());

                                // 기존에 선택했던 값이 있는 경우 Dialog의 하단 Input에 선택했던 값 입력
                                let oInput = Fragment.byId(this.getId(), "input");
                                let oBindingSource = this.getBindingSource();
                                let sBindingSourceValue = oBindingSource.getValue?.();
                                this._oSelectedData = oBindingObject.find(oData => oData.org_name === sBindingSourceValue) || null;

                                // valueHelp가 있는 요소에 입력된 조직 이름이 유효할 때 Fragment의 input에도 조직 이름 삽입
                                oInput.setValue(this._oSelectedData?.org_name || null);

                                // rowsUpdated 이벤트가 존재할 시 제거
                                if (oTable._fnRowsUpdated) {
                                    oTable.detachEvent("rowsUpdated", oTable._fnRowsUpdated);
                                }

                                // rowsUpdated 이벤트 추가 (스크롤 시 선택된 항목 체크 로직)
                                let fRowsUpdated = function (oEvent) {
                                    let oBindingSource = this.getBindingSource();
                                    let sValue = oBindingSource.getValue?.();

                                    if (sValue) {
                                        // 테이블 데이터 중 선택되어 있는 값이 있는 경우 Selected 처리
                                        let aRows = oTable.getRows();
                                        let oSelectedRow = aRows.find((oRow) => {
                                            let oBindingContext = oRow.getBindingContext("orgModel");
                                            if (!oBindingContext) return;

                                            let oBindingObject = oBindingContext.getObject();
                                            if (oBindingObject.org_name === sValue) {
                                                return true;
                                            }
                                        })

                                        if (oSelectedRow) {
                                            let iIndex = oSelectedRow.getIndex();
                                            oTable.setSelectedIndex(iIndex);
                                        }
                                    }
                                }.bind(this);
                                oTable._fnRowsUpdated = fRowsUpdated;
                                oTable.attachEvent("rowsUpdated", fRowsUpdated);
                            }.bind(this));

                            oDialog.attachEventOnce("beforeOpen", function () {
                                // 서치필드에 검색 이벤트 지정
                                let oSearchField = Fragment.byId(this.getId(), "searchField");
                                oSearchField.attachEvent("search", this._bindTable.bind(this));
                            }.bind(this));

                            oDialog.attachBeforeClose(function (oEvent) {
                                this.fireBeforeClose();
                            }.bind(this));

                            oDialog.attachAfterOpen(function (oEvent) {
                                this.fireAfterOpen();
                            }.bind(this));

                            oDialog.attachAfterClose(function (oEvent) {
                                this.fireAfterClose();
                            }.bind(this));

                            resolve(oDialog);
                        }.bind(this));

                    }.bind(this));
                }

                return this._pDialog;
            },

            /**
             * Dialog Open
             */
            open: async function () {
                this._loadFragment().then(function (oDialog) {
                    oDialog.open();
                }.bind(this));
            },

            /**
             * Dialog Close
             */
            close: function () {
                this._oDialog.close();
            },

            /**
             * 테이블 바인딩
             */
            _bindTable: async function (oEvent) {
                let oSource = oEvent.getSource();
                let oDataModel = new ODataModel("/odata/v2/cm", {
                    useBatch: true,
                    withCredentials: true,
                    defaultCountMode: "Inline",
                    OperationMode: "Server",
                });
                oSource.setModel(oDataModel);

                let oTable = Fragment.byId(this.getId(), "treeTable");

                // // 검색 값
                // let oSearchField = Fragment.byId(this.getId(), "searchField");
                // let sQuery = oSearchField.getValue();

                await new Promise((resolve, reject) => {
                    oSource.getModel().callFunction("/get_available_org_list", {
                        method: "GET",
                        urlParameters: {
                            isTree: true,
                            // isDelivery: true
                        },
                        success: function (oData) {
                            let aResults = oData.results;
                            oSource.setModel(new JSONModel(aResults), "orgModel");
                            resolve();
                        },
                        error: function (oError) {
                            console.error(oError);
                            reject();
                        }
                    })
                })
            },

            /**
             * 검색
             */
            _onSearch: function (oEvent) {
                const sQuery = oEvent.getParameter("query");
                let oTable = Fragment.byId(this.getId(), "treeTable");
                let oBinding = oTable.getBinding("rows");

                const aFilters = [];
                if (sQuery.length > 0) {
                    let oFilter = new Filter({
                        path: "org_name",
                        operator: FilterOperator.Contains,
                        value1: sQuery,
                        caseSensitive: false,
                    });
                    aFilters.push(oFilter);
                }
                oBinding.filter(aFilters);
                oTable.expandToLevel(6);
            }
        };

        return Control.extend("bix.common.library.customDialog.OrgSingleSelect", oExtendControl);
    })