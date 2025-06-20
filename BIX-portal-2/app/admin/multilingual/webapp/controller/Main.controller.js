sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/ui/core/format/NumberFormat",
    "sap/m/MessageToast",
    "sap/ui/core/library",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/m/MessageBox",
    "sap/ui/core/format/DateFormat",
], (Controller, JSONModel, Fragment, NumberFormat, MessageToast, coreLib, Filter, FilterOperator, Sorter, MessageBox, DateFormat) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Input} Input
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     * @typedef {sap.ui.mdc.Field} Field
     * @typedef {sap.m.Select} Select
     */
    return Controller.extend("bix.admin.multilingual.controller.Main", {
        /**
         * @type {Array} 
         */
        _aAddTargetData: [],
        _excelUploadDialog: undefined,
        _I18nPropertiesContexts: [],

        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("Main");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: function () {
            this.getView().setModel(new JSONModel({}), "searchModel");

            // 목표액 추가 테이블 스크롤 초기 설정 (수직, 수평)
            let oLangTable = this.byId("langTable");
            let oVerticalScroll = oLangTable._getScrollExtension().getVerticalScrollbar();
            oVerticalScroll?.scrollTo(0, 0);

            let oHorizontalScroll = oLangTable._getScrollExtension().getHorizontalScrollbar();
            oHorizontalScroll?.scrollTo(0, 0);

            // 바인딩 해제
            oLangTable.unbindRows();
            oLangTable.setNoData("검색 조건 입력 후 검색해주세요.");
        },

        /**
         * 검색 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag Search, Refresh
         */
        onSearch: function (oEvent, sFlag) {
            // 검색
            if (sFlag === "Search") {
                let oTable = this.byId("langTable");

                let aFilters = [];
                let oSearchData = this.getView().getModel("searchModel").getData();

                // 카테고리
                if (oSearchData.category) {
                    let oFilter = new Filter({
                        path: "category",
                        operator: FilterOperator.EQ,
                        value1: oSearchData.category,
                    })
                    aFilters.push(oFilter);
                }

                // 타입
                if (oSearchData.type) {
                    let oFilter = new Filter({
                        path: "type",
                        operator: FilterOperator.EQ,
                        value1: oSearchData.type,
                    })
                    aFilters.push(oFilter);
                }

                oTable.bindRows({
                    path: `/I18nProperties_view('${encodeURI(oSearchData.text || '')}')/Set`,
                    sorter: new Sorter({ path: "i18nKey" })
                })
                oTable.setNoData("데이터가 없습니다.");
                oTable.getBinding("rows").filter(aFilters);

                // 요청 초기화
                let oModel = this.getOwnerComponent().getModel();
                oModel.resetChanges("Multilingual");
            } else if (sFlag === "Refresh") {   // 초기화
                this.getView().setModel(new JSONModel({}), "searchModel");
            }
        },

        /**
         * 카테고리 Formatter
         * @param {String} sCategory 
         */
        onFormatCategory: function (sCategory) {
            if (sCategory === "Portal") {
                return "포탈"
            } else if (sCategory === "App") {
                return "어플리케이션"
            }
        },

        /**
         * Type Formatter
         * @param {String} sType 
         */
        onFormatType: function (sType) {
            if (sType === "Msg") {
                return "메시지"
            } else if (sType === "Text") {
                return "텍스트"
            }
        },

        /**
         * Date Formatter
         * @param {*} sTimestamp 
         * @returns 
         */
        onFormatDate: function (sTimestamp) {
            if (!sTimestamp) return;
            
            let oDateInstance = DateFormat.getDateInstance({
                pattern: "yyyy-MM-dd"
            })

            return oDateInstance.format(new Date(sTimestamp));
        },

        /**
         * 수정 버튼 클릭 이벤트
         * @param {Event} oEvent 
         */
        onEdit: function (oEvent) {
            let oRow = oEvent.getParameters()["row"];
            oRow.getCells().forEach(oCell => {
                if (oCell.isA("sap.ui.mdc.Field")) {
                    oCell.setEditMode("Editable");
                }
            })
        },

        /**
         * 삭제 버튼 클릭 이벤트
         * @param {Event} oEvent 
         */
        onDelete: function (oEvent) {
            let oRow = /** @type {sap.ui.table.Row} */ (oEvent.getSource());
            let oBindingContext = /** @type {sap.ui.model.odata.v4.Context} */ (oRow.getBindingContext());
            let sKey = oBindingContext.getObject()["i18nKey"];
            let oModel = this.getOwnerComponent().getModel();

            MessageBox.warning("해당 데이터를 삭제하시겠습니까?", {
                title: "데이터 삭제",
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: async function (sAction) {
                    if (sAction === "OK") {
                        // 직접 삭제
                        // let oBinding = oModel.delete(`/I18nProperties('${sKey}')`, "$auto");

                        // I18nProperties에서 삭제 요청 생성
                        let oBinding = oModel.bindList(`/I18nProperties`, undefined, undefined, [
                            new Filter({
                                path: "i18nKey", operator: FilterOperator.EQ, value1: sKey
                            })
                        ]);

                        // Context 호출 후 delete 요청 생성
                        oBinding.requestContexts(0, 1).then(function (aContexts) {
                            aContexts.forEach(function (oContext) {
                                oContext.delete("Save");
                            }.bind(this))
                        }.bind(this));

                        // 테이블에서 제거
                        oBindingContext.delete();
                    }
                }.bind(this),
            });
        },

        /**
         * 텍스트 수정 이벤트
         * @param {Event} oEvent 
         */
        onChange: function (oEvent) {
            let oSource = /** @type {Field} */ (oEvent.getSource());
            let sFieldName = oSource.getBindingPath("value");
            let sKey = oSource.getBindingContext().getObject()["i18nKey"];
            let sNewValue = oSource.getValue();

            // 변경된 Context 수정 요청 생성
            let oModel = this.getOwnerComponent().getModel();
            // let sPath = `/I18nProperties('Text')/texts(locale='en',i18nKey='Text')`;
            let sPath = `/I18nProperties('${sKey}')`;

            // I18nProperties에서 삭제 요청 생성
            let oBinding = oModel.bindList(`/I18nProperties`, undefined, undefined, [
                new Filter({
                    path: "i18nKey", operator: FilterOperator.EQ, value1: sKey
                })
            ], { $expand: "texts" });

            // Context 호출 후 delete 요청 생성
            oBinding.requestContexts(0, 1).then(function (aContexts) {
                aContexts.forEach(function (oContext) {
                    let object = oContext.getObject();

                    // oContext.setProperty(`texts(locale='en',i18nKey='Test4')/i18nText`, sNewValue, "Update")
                    oContext.delete("Save")
                }.bind(this))
            }.bind(this));


            // let oData = { "i18nText": sNewValue };
            // $.ajax({
            //     url: `/odata/v4/common${sPath}`,
            //     type: "GET",
            //     beforeSend: function (xhr) {
            //         xhr.setRequestHeader('X-CSRF-Token', "Fetch");
            //     },
            // })
            //     .done((result, textStatus, xhr) => {
            //         let token = xhr.getResponseHeader("X-CSRF-Token");
            //         $.ajax({
            //             type: 'PATCH',
            //             async: false,
            //             data: JSON.stringify(oData),
            //             url: `/odata/v4/common${sPath}`,
            //             beforeSend: function (xhr) {
            //                 xhr.setRequestHeader('X-CSRF-Token', token);
            //                 xhr.setRequestHeader('Content-type', 'application/json');
            //             }
            //         })
            //             .done(function (status) {
            //                 debugger;
            //             })
            //             .fail(function (xhr) {
            //                 debugger;
            //             })
            //     })
            //     .fail(function (xhr) {
            //         debugger;
            //     })

            // oModel.changeHttpHeaders({
            //     // Accept: */*,
            //     "content-Type": "application/json",
            // })
            // let oContext = oModel.bindContext(sPath, undefined, {
            //     $$updateGroupId: "Multilingual"
            // });

            // oContext.setParameter("texts")
            // oContext.getBoundContext().setProperty("i18nText", sNewValue);
        },

        /**
         * 저장 버튼 클릭 이벤트
         */
        onSave: async function () {
            let oModel = this.getOwnerComponent().getModel();
            if (!oModel.hasPendingChanges("Save")) {
                MessageToast.show("변경된 데이터가 없습니다.");
                return;
            }

            // Context 생성 및 수정 요청
            oModel.submitBatch("Save").then(function (oEvent) {
                let aChanges = oModel.hasPendingChanges("Save");
                if (!aChanges) {
                    MessageToast.show("저장이 완료되었습니다.");

                    // 모델 및 데이터 초기화
                    // oModel.refresh();
                } else {
                    MessageToast.show("저장에 실패하였습니다.");
                }
            }.bind(this));
        },

        /**
         * 엑셀 템플릿 다운로드
         */
        onExcelTemplateDownload: async function () {
            // 데이터 존재 여부 확인
            let oLangTable = this.byId("langTable");
            let aBindingContexts = await oLangTable.getBinding("rows")?.requestContexts(0, Infinity);
            if (!aBindingContexts?.length) {
                this._messageBox('warning', '검색된 데이터가 없습니다.');
                return;
            }

            // 열 구성
            let workbook = new ExcelJS.Workbook();
            let worksheet = workbook.addWorksheet("Sheet1");
            worksheet.columns = oLangTable.getColumns().map(oColumn => {
                return {
                    key: oColumn.getLabel().getText(),
                    width: parseFloat(oColumn.getWidth())
                }
            })

            // 헤더(첫 줄) 추가
            let aColumns = worksheet.columns.map(oColumn => oColumn.key);
            worksheet.addRow(aColumns);

            // 데이터 행 추가
            // aBindingContexts.forEach(function (oContext) {
            //     let oBindingObject = oContext.getObject();

            //     let oExcelRow = [
            //         oBindingObject.i18nKey,
            //         oBindingObject.category,
            //         oBindingObject.type,
            //         oBindingObject.i18nText_ko,
            //         oBindingObject.i18nText_en,
            //         oBindingObject.modifiedBy,
            //         oBindingObject.modifiedAt,
            //     ];
            //     worksheet.addRow(oExcelRow);
            // }.bind(this));

            workbook.xlsx.writeBuffer().then((buffer) => {
                let blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                let link = document.createElement("a");
                link.href = URL.createObjectURL(blob);

                const dNow = new Date();
                const sToday = `${dNow.getFullYear()}${String(dNow.getMonth() + 1).padStart(2, "0")}${String(dNow.getDate()).padStart(2, "0")}`;
                link.download = `다국어_${sToday}.xlsx`;
                link.click();
            });
        },

        /**
         * 엑셀 업로드
         * @param {Event} oEvent 
         */
        onExcelUpload: function (oEvent) {
            let aFile = oEvent.getParameters()["files"];
            let oFile = aFile && aFile[0];

            if (oFile && window.FileReader) {
                var reader = new FileReader();

                reader.onload = function (oEvent) {
                    var data = new Uint8Array(oEvent.target.result);
                    var workbook = XLSX.read(data, { type: 'array' });

                    workbook.SheetNames.forEach(async function (sheetName) {
                        let aExcelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);

                        //excelData 데이터 수정을 통해 원하는 데이터만 업로드
                        if (aExcelData.length > 0) {
                            if (!this._excelUploadDialog) {
                                let sComponentName = this.getOwnerComponent().getMetadata().getComponentName();

                                await this.loadFragment({
                                    id: "excelUploadMultilingualDialog",
                                    name: `${sComponentName}.view.fragment.ExcelUploadMultilingual`,
                                    controller: this,
                                }).then(function (oDialog) {
                                    this._excelUploadDialog = oDialog;

                                    oDialog.attachBeforeOpen(function () {
                                        this.getOwnerComponent().getModel().resetChanges("Test");
                                        this.getOwnerComponent().getModel().refresh("Test");
                                        
                                        let sExcelTableId = Fragment.createId("excelUploadMultilingualDialog", "Table");
                                        let oExcelTable = this.byId(sExcelTableId);

                                        aExcelData.forEach(function (oExcelData) {
                                            let oRowBinding = oExcelTable.getBinding("rows");
                                            let oContext = oRowBinding.create({
                                                i18nKey: oExcelData["Key"],
                                                category: oExcelData["카테고리"],
                                                type: oExcelData["타입"],
                                                i18nText_ko: oExcelData["한국어"],
                                                i18nText_en: oExcelData["영어"],
                                                modifiedBy: "Test",
                                            });

                                            return oContext;
                                        }.bind(this));

                                        oExcelTable.refreshAggregation("rows");
                                        oExcelTable.fireRowsUpdated();
                                    }.bind(this));
                                }.bind(this));
                            }

                            // Dialog Open
                            this._excelUploadDialog._aExcelData = aExcelData;
                            this._excelUploadDialog.open();
                        } else {
                            MessageToast.show("데이터가 없습니다.");
                        }
                    }.bind(this));
                }.bind(this);

                reader.onerror = function (oError) {
                    console.error(oError);
                };

                reader.readAsArrayBuffer(oFile);
            };
        },

        /**
         * 테이블 필드 LiveChange 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag Department, Number
         */
        onInputLiveChange: function (oEvent, sFlag) {
            let oSource = /** @type {Input} */ (oEvent.getSource());

            let sValue = oSource.getValue();
            let sLastValue = oSource.getLastValue();

            // 수정한 값과 기존 값이 같을 때 return
            if (sValue === sLastValue) return;

            // Input의 value 속성에 바인딩된 모델
            let oValueModel = /** @type {JSONModel} */ (oSource.getBinding("value").getModel());
            let oValueContext = oSource.getBinding("value").getContext();
            let sFieldName = oSource.getBinding("value").getPath();
            let sValuePath = `${oValueContext.getPath()}/${sFieldName}`;

            if (sFlag === "Department") { // 부서
                if (sValue) {
                    let oData = this._validateField(sValue, sFlag);

                    if (!!oData) {
                        oValueModel.setProperty(sValuePath, oData.id);
                        oValueModel.refresh();

                        // oSource.setValue(oData.org_kor_nm);
                        oSource.setValueState(coreLib.ValueState.None);
                    } else {
                        oSource.setValueState(coreLib.ValueState.Error);
                        oSource.setValueStateText("입력한 본부가 존재하지 않습니다.");
                    }
                } else {
                    oSource.setValueState(coreLib.ValueState.Error);
                    oSource.setValueStateText("본부를 입력해주세요.");
                }
            } else if (sFlag === "Number") { // 숫자
                if (sValue) {   // 값이 있을 때 유효성 검사
                    let sNewValue = this._validateField(sValue, sFlag);

                    if (sNewValue !== null) { // 값이 유효할 때
                        oValueModel.setProperty(sValuePath, Number(sNewValue));

                        // ValueState 제거
                        oSource.setValueState(coreLib.ValueState.None);

                        // 합산로직 수행
                        let aTreeData = oValueModel.getData();
                        this._updateTree(aTreeData);

                        oValueModel.refresh();
                    } else {    // 유효하지 않을 때
                        oSource.setValue(sLastValue);
                        oSource.setValueState(coreLib.ValueState.Error);
                        oSource.setValueStateText("숫자를 입력해주세요.");

                        // ValueState를 해제하는 focusout 이벤트 설정
                        oSource.attachBrowserEvent("focusout", function () {
                            oSource.setValueState(coreLib.ValueState.None);
                        }.bind(this));
                    }
                } else {
                    oValueModel.setProperty(sValuePath, 0);
                    oSource.setValueState(coreLib.ValueState.None);

                    oValueModel.refresh();
                }
            }
        },

        /**
         * ExcelUploadDialog 필드 LiveChange 이벤트
         * @param {Event} oEvent 
         */
        onExcelUploadLiveChange: async function (oEvent) {
            let oSource = /** @type {Field} */ (oEvent.getSource());
            let oContentEdit = oSource.getContentEdit();
            let sClassName = oContentEdit.getMetadata().getName();

            if (sClassName === "sap.m.Select") {    // Select
                let oSelect = /** @type {Select} */ (oContentEdit);
                let oSelectedItem = oSelect.getSelectedItem();

                // 선택된 아이템이 없을 때
                if (!oSelectedItem) {
                    oSelect.setValueState(coreLib.ValueState.Error);
                } else {
                    oSelect.setValueState(coreLib.ValueState.None);
                }
            } else if (sClassName === "sap.m.Input") {  // Input
                let oInput = /** @type {Field} */ (oContentEdit);
                let sNewValue = oEvent.getParameters()["value"];

                let oBinding = oSource.getBinding("value");
                if (oBinding && sNewValue) {
                    let sFieldName = oBinding.getPath?.();

                    // 필드가 Key일 때 Key값 중복 검사
                    if (sFieldName === "i18nKey") {
                        // Context가 없을 시 한 번 호출
                        if (this._I18nPropertiesContexts.length === 0) {
                            let oModel = this.getOwnerComponent().getModel();
                            let oListBinding = oModel.bindList("/I18nProperties", undefined, undefined, undefined, {
                                $$updateGroupId: "Multilingual"
                            });

                            this._I18nPropertiesContexts = await oListBinding.requestContexts(0, Infinity);
                        }

                        // 같은 Key를 가진 데이터가 있는지 확인
                        let isInvalid = !!this._I18nPropertiesContexts.find(function (oExistedContext) {
                            return oExistedContext.getObject()["i18nKey"] === sNewValue;
                        }.bind(this));

                        // Key가 중복되는 데이터가 존재할 때       
                        if (isInvalid) {
                            oInput.setValueState(coreLib.ValueState.Error);
                            oInput.setValueStateText("중복되는 Key가 존재합니다.");
                            return;
                        }
                    }
                }

                // 초기 필드 유효성 검사를 위해서
                oInput.setValue(null);
                oInput.setValue(sNewValue);

                // ValueState 설정
                if (!sNewValue) {
                    oInput.setValueState(coreLib.ValueState.Error);
                    oInput.setValueStateText("값을 입력해주세요.")
                } else {
                    oInput.setValueState(coreLib.ValueState.None);
                }
            }
        },

        /**
         * 엑셀 업로드 필드 유효성 검사
         * @param {String} sValue 필드값
         * @param {String} sFlag Department, Number
         * @returns {Object | String}
         */
        _validateField: function (sValue, sFlag) {
            if (sFlag === "Department") {
                return this._aAddTargetData.find(function (oDepartmentData) {
                    return oDepartmentData.org_kor_nm.replaceAll(" ", "").toLowerCase()
                        === String(sValue).replaceAll(" ", "").toLowerCase();
                }.bind(this));
            } else if (sFlag === "Number") {
                let iValue = sValue?.replaceAll(",", "");   // 콤마 제거

                let oNumberFormat = NumberFormat.getIntegerInstance({
                    groupingEnabled: true,
                    groupingSeparator: ','
                });

                // 숫자가 유효할 때만 Integer 값을 반환
                return !!oNumberFormat.format(iValue) ? iValue : null;
            }
        },

        /**
         * 테이블 행 업데이트 이벤트
         * @param {Event} oEvent 
         */
        onRowsUpdated: function (oEvent) {
            let oTable = /** @type {sap.ui.table.Table} */ (oEvent.getSource());
            oTable.getControlsByFieldGroupId("Input").forEach(
                /**
                 * @param {Input} oInput 
                 */
                function (oInput) {
                    if (oInput.getFieldGroupIds().length > 0) {
                        oInput.fireLiveChange({
                            value: oInput.getValue?.() || oInput.getSelectedKey?.()
                        });
                    }
                })
        },

        /**
         * 엑셀 업로드 Dialog 저장 및 취소 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag 저장, 취소
         */
        onExcelUploadDialogButton: async function (oEvent, sFlag) {
            let oModel = this.getOwnerComponent().getModel();

            if (sFlag === "Save") {
                let sExcelTableId = Fragment.createId("excelUploadMultilingualDialog", "Table");
                let oExcelTable = this.byId(sExcelTableId);
                let aBindingContexts = oExcelTable.getBinding("rows").getContexts();
                let aColumns = oExcelTable.getColumns();

                let oListBinding = oModel.bindList("/I18nProperties", undefined, undefined, undefined, {
                    $$updateGroupId: "Multilingual"
                });

                // 같은 Key를 가진 데이터가 있는지 확인
                this._I18nPropertiesContexts = await oListBinding.requestContexts(0, Infinity);
                let isInvalid = aBindingContexts.find(function (oContext) {
                    let sI18nKey = oContext.getObject()["i18nKey"];

                    return !!this._I18nPropertiesContexts.find(oExistedContext => {
                        return oExistedContext.getObject()["i18nKey"] === sI18nKey
                    })
                }.bind(this));

                // 같은 key가 있을 시 Retrun
                if (!!isInvalid) {
                    this._messageBox('warning', '같은 Key를 가진 데이터가\n이미 존재합니다.');
                    return;
                }

                // Post 요청 생성
                aBindingContexts.forEach(function (oContext) {
                    let oListBinding = oModel.bindList("/I18nProperties", undefined, undefined, undefined, {
                        $$updateGroupId: "Multilingual"
                    });

                    let oBindingObject = oContext.getObject();
                    oListBinding.create({
                        i18nKey: oBindingObject["i18nKey"],
                        i18nText: oBindingObject["i18nText_ko"],
                        category: oBindingObject["category"],
                        type: oBindingObject["type"],
                        texts: [
                            {
                                i18nKey: oBindingObject["i18nKey"],
                                locale: "ko",
                                i18nText: oBindingObject["i18nText_ko"],
                            },
                            {
                                i18nKey: oBindingObject["i18nKey"],
                                locale: "en",
                                i18nText: oBindingObject["i18nText_en"],
                            },
                        ]
                    });
                }.bind(this));

                // 서버에 요청 전송
                oModel.submitBatch("Multilingual").then(function (oEvent) {
                    let aChanges = oModel.hasPendingChanges("Multilingual");
                    if (!aChanges) {    // 저장 성공
                        MessageToast.show("저장이 완료되었습니다.");

                        // 새로고침 후 Fragment 닫기
                        oModel.refresh();
                        this._excelUploadDialog.close();
                    } else {    // 저장 실패
                        MessageToast.show("유효하지 않은 데이터가 존재합니다.");

                        oModel.resetChanges("Multilingual");
                    }
                }.bind(this));
            } else if (sFlag === "Close") {
                this._excelUploadDialog.close();
            }
        },

        /**
         * 메시지 박스 생성 함수
         * @param {String} status 
         * @param {String} message 
         * @param {String} title 
         */
        _messageBox: function (status, message, title) {
            MessageBox[status](message, {
                title: title,
            })
        },
    });
});