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
    "sap/ui/core/EventBus",
    "sap/m/Input",
    "sap/m/Label",
    "sap/m/HBox",
    "sap/m/VBox",
    "sap/m/CheckBox",
    "sap/m/Text",
    "sap/ui/table/Column",
], (Controller, JSONModel, Fragment, NumberFormat, MessageToast, coreLib, Filter, FilterOperator, MessageBox,EventBus,Input,Label,HBox,VBox,CheckBox,Text,Column) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Input} Input
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     */
    return Controller.extend("bix.master.orgtarget.controller.DtTaskTarget", {
        /**
         * @type {Array} 
         */
        _aAddTargetData: [],
        _aPropertyList : [],
        _oEventBus: EventBus.getInstance(),
        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteTarget");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);

            this._oEventBus.subscribe("target", "targetrefresh", this._setData, this);
            this._oEventBus.subscribe("target", "targetsave", this.onSave, this);
        },
        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: function () {
            this._aPropertyList = this.getOwnerComponent().getModel("propertyModel").getData()
            
            let oAddTargetTable = this.byId("dtTaskTargetTable");
            this._setTable(oAddTargetTable)
            this._setData();
            // 목표액 추가 테이블 스크롤 초기 설정 (수직, 수평)
            let oVerticalScroll = oAddTargetTable._getScrollExtension().getVerticalScrollbar();
            oVerticalScroll?.scrollTo(0, 0);

            let oHorizontalScroll = oAddTargetTable._getScrollExtension().getHorizontalScrollbar();
            oHorizontalScroll?.scrollTo(0, 0);
        },

        onAfterRendering:function(){
            let oAddTargetTable = this.byId("dtTaskTargetTable");

                // 목표액 추가 테이블 스크롤 초기 설정 (수직, 수평)
                let oVerticalScroll = oAddTargetTable._getScrollExtension().getVerticalScrollbar();
                oVerticalScroll?.scrollTo(0, 0);
    
                let oHorizontalScroll = oAddTargetTable._getScrollExtension().getHorizontalScrollbar();
                oHorizontalScroll?.scrollTo(0, 0);
        },

        _setTable: function(oTable){
            this._aPropertyList.forEach(oProperty =>{
                if(oProperty.value !== 'D01'){
                    let oColumn = new Column({
                        hAlign:'Center',
                        width:'9rem',
                        label:new Label({
                            text:oProperty.value === 'A02' ? oProperty.name+'(계산)' : oProperty.name
                        }),
                        autoResizable:true
                    })
                    let oHBox = new HBox({
                        alignItems:'Center'
                    })
                    let oVBox = new VBox({
                        width:'100%'
                    })
                    let oCheckBox = new CheckBox({
                        selected:`{addTargetModel>new_${oProperty['value']}_total_yn}`,
                        select: ($event) => { this.onSelect($event) },
                        editable:'{uiModel>/edit}',
                    })
                    let oInput = new Input({
                        width:'100%',
                        textAlign:'End',
                        fieldGroupIds:'Input',
                        value:{
                            path:`addTargetModel>new_${oProperty['value']}_data`,
                            type:'sap.ui.model.type.Integer',
                            formatOptions:{
                                groupSeparator: ',',
                                groupingEnabled: true,
                                maxIntegerDigits: 99
                            }
                        },
                        visible:'{uiModel>/edit}',
                        liveChange: ($event) => { this.onInputLiveChange($event,'Number')},
                    })
                    let oText = new Text({
                        text:{
                            parts: [
                                {path: `addTargetModel>new_${oProperty['value']}_data`}
                            ],
                            formatter: function (iValue) {
                                if(!iValue){return ;}
                                var oNumberFormat = NumberFormat.getFloatInstance({
                                    groupingEnabled: true,
                                    groupingSeparator: ','
                                });
                                return oNumberFormat.format(iValue);                        
                            }
                        },
                        emptyIndicatorMode:'On',                        
                        wrapping:false,
                        width:'100%',
                        textAlign:'End',
                        visible:'{= !${uiModel>/edit}}'
                    })
                    if(oProperty.value === 'A02'){
                        oInput = new Input({
                            width:'100%',
                            textAlign:'End',
                            fieldGroupIds:'Input',
                            value:{
                                path:`addTargetModel>new_${oProperty['value']}_data`,
                                type:'sap.ui.model.type.Float',
                                formatOptions:{
                                    groupSeparator: ',',
                                    groupingEnabled: true,
                                    maxIntegerDigits: 99,
                                    maxFractionDigits: 2
                                }
                            },
                            description:"%",
                            fieldWidth:"70%",
                            visible:'{uiModel>/edit}',
                            liveChange: ($event) => { this.onInputLiveChange($event,'Number')},
                        })
                        oText = new Text({
                            text:{
                                parts: [
                                    {path: 'addTargetModel>new_A01_data'},
                                    {path: 'addTargetModel>new_A02_data'},
                                    {path: 'addTargetModel>new_A03_data'}
                                ],
                                formatter: function (iSale, iMarginRate, iMargin) {
                                    if(iMarginRate !== 0){
                                        return iMarginRate+"%";
                                    }else if (iSale !== 0 && iMargin !==0) {  // 분모 값이 있고, 0이 아닐 때
                                        return Math.floor(iMargin / iSale * 10000) / 100+"%";
                                    } else {
                                        return ;
                                    }
                                }
                            },
                            emptyIndicatorMode:'On',
                            wrapping:false,
                            width:'100%',
                            textAlign:'End',
                            visible:'{= !${uiModel>/edit}}'
                        })
                    }

                    oVBox.insertItem(oInput)
                    oVBox.insertItem(oText)
                    oCheckBox.addStyleClass("custom-checkBox")
                    oHBox.insertItem(oVBox)
                    oHBox.insertItem(oCheckBox)
                    oColumn.setTemplate(oHBox)
                    oTable.addColumn(oColumn)
                }
            })
        },

        
        _setExcelTable: function(oTable){
            if(oTable.getColumns().length>0){
                return
            }else{
                let oColumn = new Column({
                    hAlign:'Center',
                    width:'17rem',
                    label:new Label({
                        text:'DT과제'
                    }),
                    autoResizable:true
                }) 
                let oInput = new Input({
                    width:'100%',
                    textAlign:'Begin',
                    fieldGroupIds:'Input',
                    placeholder:'DT과제 입력',
                    value:'{excelUploadModel>DT과제}',
                    liveChange: ($event) => { this.onExcelUploadLiveChange($event,'Department')},
                })
                oColumn.setTemplate(oInput)
                oTable.addColumn(oColumn)

            }
            this._aPropertyList.forEach(oProperty =>{
                if(oProperty.value !== 'D01'){
                    let oColumn = new Column({
                        hAlign:'Center',
                        width:oProperty.value === 'A02' ? '11rem' : '9rem',
                        label:new Label({
                            text:oProperty.value === 'A02' ? oProperty.name+'(계산)' : oProperty.name
                        }),
                        autoResizable:true
                    })
                    let oHBox = new HBox({
                        alignItems:'Center'
                    })
                    let oCheckBox = new CheckBox({
                        selected:`{excelUploadModel>${oProperty['value']}_total_yn}`,
                    })
                    let oInput = new Input({
                        width:'100%',
                        textAlign:'End',
                        fieldGroupIds:'Input',
                        placeholder:'금액 입력',
                        value:{
                            path:`excelUploadModel>${oProperty['value']}`,
                            type:'sap.ui.model.type.Integer',
                            formatOptions:{
                                groupSeparator: ',',
                                groupingEnabled: true,
                                maxIntegerDigits: 99
                            }
                        },
                        liveChange: ($event) => { this.onExcelUploadLiveChange($event,'Number')},
                    })
                    if(oProperty.value === 'A02'){
                        oInput = new Input({
                            width:'100%',
                            textAlign:'End',
                            fieldGroupIds:'Input',
                            placeholder:'백분율 입력',
                            value:{
                                path:`excelUploadModel>${oProperty['value']}`,
                                type:'sap.ui.model.type.Float',
                                formatOptions:{
                                    groupSeparator: ',',
                                    groupingEnabled: true,
                                    maxIntegerDigits: 99,
                                    maxFractionDigits: 2
                                }
                            },
                            description:"%",
                            fieldWidth:"80%",
                            liveChange: ($event) => { this.onExcelUploadLiveChange($event,'Number')},
                        })
                    }

                    oCheckBox.addStyleClass("custom-checkBox")
                    oHBox.insertItem(oInput)
                    oHBox.insertItem(oCheckBox)
                    oColumn.setTemplate(oHBox)
                    oTable.addColumn(oColumn)
                }
            })
        },

        /**
         * 저장 버튼 클릭 이벤트
         */
        onSave: async function (sChannelId, sEventId, oData) {
            if(oData.type === "DT과제별"){
                const iYear = this.getOwnerComponent().getModel("uiModel").getProperty("/year");
    
                let aBindingModel = this.getView().getModel("addTargetModel").getData();
                let aChangedData = aBindingModel.filter(function (oData) {
                    return this._aPropertyList.some(oProperty => oData[oProperty["value"]+"_data"] !== oData["new_"+oProperty["value"]+"_data"] || oData[oProperty["value"]+"_total_yn"] !== oData["new_"+oProperty["value"]+"_total_yn"]);
                }.bind(this));
    
                if (aChangedData.length === 0) {
                    MessageToast.show('변경된 데이터가 없습니다.');
                    return;
                }
    
                let oModel = this.getOwnerComponent().getModel();
                let oBinding = oModel.bindList("/AnnualTarget", undefined, undefined, [
                    new Filter({
                        path: "year", operator: FilterOperator.EQ, value1: iYear
                    })
                ], { $$updateGroupId: "AddTarget" });
                let aExistedContexts = await oBinding.requestContexts(0, Infinity);
    
                // 변경된 Context 생성 및 수정 요청 생성
                aChangedData.forEach((oData) => {
                    this._aPropertyList.forEach((oProperty) => {
                        let bChangeData = oData[oProperty["value"]+"_data"] !== oData["new_"+oProperty["value"]+"_data"];
                        let bChangeTotalYn = oData[oProperty["value"]+"_total_yn"] !== oData["new_"+oProperty["value"]+"_total_yn"];
                        if ((oProperty["value"] !=="A02" && bChangeData) || bChangeTotalYn) {
    
                            let sBindingPath = `/AnnualTarget(year='${iYear}',target_type='dgtr_task_cd',target_type_cd='${oData.task_cd}',target_cd='${oProperty["value"]}')`
                            let isExist = aExistedContexts.find(oContext => oContext.getPath() === sBindingPath);
                            if (isExist) {
                                let oContext = oModel.bindContext(sBindingPath, undefined, {
                                    $$updateGroupId: "AddTarget"
                                })
                                if(bChangeData){
                                    oContext.getBoundContext().setProperty("target_val", Number(oData["new_"+oProperty["value"]+"_data"]));
                                }
                                if(bChangeTotalYn){
                                    oContext.getBoundContext().setProperty("is_total_calc", oData["new_"+oProperty["value"]+"_total_yn"]);
                                }
                            } else {    // 존재하지 않는 경우 생성
                                let oBinding = oModel.bindList("/AnnualTarget", undefined, undefined, undefined, {
                                    $$updateGroupId: "AddTarget"
                                });
                                let oCreateObject = {
                                    year: iYear.toString(),
                                    target_type:"dgtr_task_cd",
                                    target_type_cd: oData.task_cd,
                                    target_cd : oProperty["value"],
                                    target_val: oData["new_"+oProperty["value"]+"_data"],
                                    is_total_calc : oData["new_"+oProperty["value"]+"_total_yn"]
                                }
                                oBinding.create(oCreateObject);
                            }
                        }
                    })
                })
    
                oModel.submitBatch("AddTarget").then(async function () {
                    let aChanges = oModel.hasPendingChanges("AddTarget");
                    if (!aChanges) {
                        MessageToast.show("저장이 완료되었습니다.");
    
                        // 모델 및 데이터 초기화
                        oModel.refresh();
                        this._setData();
                    } else {
                        MessageToast.show("저장에 실패하였습니다.");
                    }
                }.bind(this));
                
                this.getOwnerComponent().getModel("uiModel").setProperty("/edit",false)                
            }
        },
        
        /**
         * 데이터 세팅
         * 1. 페이지 라우팅 시 실행
         * 2. eventBus를 통한 event 발생 시 해당 table이 visible = true일 경우에만 실행
         * @param {Event} oEvent 
         * @param {String} sEventId 이벤트 식별자
         * @param {Object} oData 선택되어있는 toggle button text값
         */
        _setData: async function (oEvent, sEventId, oData) {
            if(!sEventId || oData.type === "DT과제별"){
                this.getView().setBusy(true);

                // 데이터 호출
                let sPlUrl = "/get_org_target(type='task')";
                
                let oModel = this.getOwnerComponent().getModel();
                
                const oBinding = oModel.bindContext(sPlUrl);
                let oRequest= await oBinding.requestObject();
                
                let oJSONModel = new JSONModel(oRequest.value);
                oJSONModel.setSizeLimit(oRequest.value.length);
                this.getView().setModel(oJSONModel, "addTargetModel");
                this.getOwnerComponent().getModel("uiModel").setProperty("/refresh", false);            
                
                this.getView().setBusy(false);
            }
        },
        /**
         * 엑셀 템플릿 다운로드
         */
        onExcelTemplateDownload: function () {
            let workbook = new ExcelJS.Workbook();
            let worksheet = workbook.addWorksheet("Sheet1");

            // 열 구성
            let aColumns = ["DT과제"]
            let aColumnSetting = [{key : "DT과제",width : 25}];
            this._aPropertyList.forEach(oProperty => {
                if(oProperty.value !== 'D01'){
                    aColumns.push(oProperty.name+" 전사 포함 여부");
                    aColumnSetting.push({key : oProperty.name+" 전사 포함 여부",width : 25});
                    if (oProperty.value !== 'A02') {
                        aColumns.push(oProperty.name);
                        aColumnSetting.push({key : oProperty.name,width : 13});
                    }
                }
            })
            worksheet.columns = aColumnSetting;

            // 헤더 추가
            worksheet.addRow(aColumns);

            // DT과제 데이터 행 추가
            let aBindingModel = this.getView().getModel("addTargetModel").getData();
            aBindingModel.forEach(function (oContext) {
                let oExcelRow = [oContext.task_nm, ...Array(15).fill(null)];
                worksheet.addRow(oExcelRow);
            }.bind(this));

            workbook.xlsx.writeBuffer().then((buffer) => {
                let blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                let link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `DT과제별 목표실적 템플릿.xlsx`;
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
                                    id: "dtTaskExcelUpload",
                                    name: `${sComponentName}.view.fragment.DtTaskExcelUpload`,
                                    controller: this,
                                }).then(function (oDialog) {
                                    this._excelUploadDialog = oDialog;
                                }.bind(this));
                            }
                            let sExcelTableId = Fragment.createId("dtTaskExcelUpload", "Table");
                            let oExcelTable = this.byId(sExcelTableId);
                            this._setExcelTable(oExcelTable);
                            
                            aExcelData = aExcelData.filter(oExcelData => {
                                let aDataVal = Object.entries(oExcelData).filter(([key]) => key !== "DT과제");
                                return aDataVal.length > 0 && !aDataVal.every(([key,val]) => val === undefined || val === null)
                            })
                            aExcelData.forEach(oExcel => {
                                Object.keys(oExcel).forEach((sKey) => {
                                    let oNameProperty = this._aPropertyList.find((oProperty) => sKey.includes(oProperty["name"]));
                                    // let oNameProperty = this._aPropertyList.find((oProperty) => oProperty["name"] === sKey);
                                    if (oNameProperty) {
                                        if(oNameProperty["name"] === sKey){
                                            oExcel[oNameProperty["value"]] = Number(oExcel[sKey]);
                                        }else{
                                            oExcel[`${oNameProperty["value"]}_total_yn`] = oExcel[sKey].toLowerCase() === 'true' ? true : false;
                                        }
                                    }
                                })
                            })
                            let oJSONModel = new JSONModel(aExcelData)
                            oJSONModel.setSizeLimit(aExcelData.length);
                            this._excelUploadDialog.setModel(oJSONModel, "excelUploadModel");
                            this._excelUploadDialog.open();

                            oExcelTable.fireRowsUpdated();
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

            // console.log(sValue)

            // Input의 value 속성에 바인딩된 모델
            let oValueModel = /** @type {JSONModel} */ (oSource.getBinding("value").getModel());
            let oValueContext = oSource.getBinding("value").getContext();
            let sFieldName = oSource.getBinding("value").getPath();
            let sValuePath = `${oValueContext.getPath()}/${sFieldName}`;
            
            if (sValuePath.includes("A02")) {
                let iSales = oValueModel.getProperty(sValuePath.replace("A02","A01"))
                let iMarginRate = oValueModel.getProperty(sValuePath)
                if (iSales && iMarginRate) {
                    oValueModel.setProperty(sValuePath.replace("A02","A03"), this.onMargin(iSales, iMarginRate))
                }
            }

            // 수정한 값과 기존 값이 같을 때 return
            if (sValue === sLastValue) return;
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
                        oSource.setValueStateText("입력한 DT과제는 존재하지 않습니다.");
                    }
                } else {
                    oSource.setValueState(coreLib.ValueState.Error);
                    oSource.setValueStateText("DT과제를 입력해주세요.");
                }
            } else if (sFlag === "Number") { // 숫자
                if(Number(sValue) === 0 && !sValuePath.includes("A02") && sValue.includes(".")) {                   // 0일때 0넣기
                    oValueModel.setProperty(sValuePath, 0);
                    oSource.setValue(0);
                    oSource.setValueState(coreLib.ValueState.None);
                }
                else {   // 값이 있을 때 유효성 검사
                    let sNewValue = this._validateField(sValue, sFlag);
                    if (sNewValue !== null) { // 값이 유효할 때
                        if(!sValuePath.includes("A02") || (sValuePath.includes("A02") && sNewValue.split(".")[1] !== '')){
                            oValueModel.setProperty(sValuePath, Number(sNewValue));
                        }

                        // ValueState 제거
                        oSource.setValueState(coreLib.ValueState.None);

                    } else {    // 유효하지 않을 때
                        oSource.setValue(sLastValue);
                        oSource.setValueState(coreLib.ValueState.Error);
                        oSource.setValueStateText("숫자를 입력해주세요.");

                        // ValueState를 해제하는 focusout 이벤트 설정
                        oSource.attachBrowserEvent("focusout", function () {
                            oSource.setValueState(coreLib.ValueState.None);
                        }.bind(this));
                    }
                }

                // 마진/마진율 계산 예외처리를 위한 변수
                let aCurrentProperty = ["A01","A02","A03"].filter((sProperty) => sValuePath.includes(sProperty));
                if (aCurrentProperty.length > 0) {
                    let sSalesPath = sValuePath.replace(aCurrentProperty[0],"A01");
                    let sMarginRatePath = sValuePath.replace(aCurrentProperty[0],"A02");
                    let sMarginPath = sValuePath.replace(aCurrentProperty[0],"A03");

                    let iSales = Math.floor(oValueModel.getProperty(sSalesPath));
                    let iMarginRate = Math.floor(oValueModel.getProperty(sMarginRatePath) * 100) / 100;
                    let iMargin = Math.floor(oValueModel.getProperty(sMarginPath));
                    

                    if (iSales && iMargin && !iMarginRate) {
                        if (aCurrentProperty[0] === "A02" && iMarginRate === 0) {
                            oValueModel.setProperty(sMarginPath, 0);
                        } else {
                            oValueModel.setProperty(sMarginRatePath, this.onMarginRate(iSales, iMargin));
                        }
                    } else if (iSales && !iMargin && iMarginRate) {
                        if (aCurrentProperty[0] === "A03" && iMargin === 0) {
                            oValueModel.setProperty(sMarginRatePath, 0);
                        } else {
                            oValueModel.setProperty(sMarginPath, this.onMargin(iSales, iMarginRate));
                        }
                    } else if (!iSales && iMargin && iMarginRate) {
                        if (aCurrentProperty[0] === "A01" && iSales === 0) {
                            oValueModel.setProperty(sMarginRatePath, 0);
                        } else {
                            oValueModel.setProperty(sSalesPath, this.onSales(iMargin, iMarginRate));
                        }
                    } else if (iSales && iMargin && iMarginRate) {
                        if (aCurrentProperty[0] === "A01") {
                            oValueModel.setProperty(sMarginRatePath, this.onMarginRate(iSales, iMargin));
                        } else if (aCurrentProperty[0] === "A02") {
                            oValueModel.setProperty(sMarginPath, this.onMargin(iSales, iMarginRate));
                        } else if (aCurrentProperty[0] === "A03") {
                            oValueModel.setProperty(sMarginRatePath, this.onMarginRate(iSales, iMargin));
                        }
                    }
                }

                // 합산로직 수행
                let aData = oValueModel.getData();
                oValueModel.refresh();
                // 하나라도 변경된 필드가 있을 시 초기화 버튼 enabled true로 변경
                let isChanged = aData.find(oData => {
                    return this._aPropertyList.some(sProperty => {
                        if(sProperty["value"] !== "D01"){
                            return oData[sProperty["value"]+"_data"] !== oData["new_"+sProperty["value"]+"_data"]
                        }
                    });
                })
                this.getOwnerComponent().getModel("uiModel").setProperty("/refresh", !!isChanged);
                this._setHighlight()
            }
        },
        onSelect: function (oEvent) {
            let oSource = /** @type {Input} */ (oEvent.getSource());
            let oValueModel =/** @type {JSONModel} */ oSource.getBinding("selected").getModel();
            let aData = oValueModel.getData();
            // 하나라도 변경된 필드가 있을 시 초기화 버튼 enabled true로 변경
            let isChanged = aData.find(oData => {
                return this._aPropertyList.some(sProperty => {
                    if(sProperty["value"] !== "D01"){
                        return oData[sProperty["value"]+"_total_yn"] !== oData["new_"+sProperty["value"]+"_total_yn"]
                    }
                });
            })
            this.getOwnerComponent().getModel("uiModel").setProperty("/refresh", !!isChanged);
            this._setHighlight()
        },

        _setHighlight:function(){
            let oTable = this.byId('dtTaskTargetTable');
            let aContext = oTable.getBinding('rows').getContexts();
            let oModel = this.getView().getModel('addTargetModel')
            aContext.forEach((oContext,i) => {
                let bCheck = false;
                let oObject = oContext.getObject()
                this._aPropertyList.forEach(oProperty => {
                    if(oProperty.value !== 'D01'){
                        let bChangeData = oObject[`new_${oProperty.value}_data`] !== oObject[`${oProperty.value}_data`]
                        let bChangeTotalYn = oObject[`new_${oProperty.value}_total_yn`] !== oObject[`${oProperty.value}_total_yn`]
                        if(bChangeData || bChangeTotalYn){
                            bCheck = true
                            oModel.setProperty(`/${i}/highlight`,'Information');
                        }
                    }
                })
                if(!bCheck){
                    oModel.setProperty(`/${i}/highlight`,'None');
                }
            })
        },

        onSelectForamt: function (iFlag) {
            return Boolean(iFlag);
        },
        /**
         * dtTaskExcelUpload 필드 LiveChange 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag Department, Number
         */
        onExcelUploadLiveChange: function (oEvent, sFlag) {
            let oSource = /** @type {Input} */ (oEvent.getSource());
            let oBinding = oSource.getBinding("value")
            if(!oBinding || !oBinding.getContext()) return;

            let sValue = oSource.getValue();
            let sLastValue = oSource.getLastValue();
            // Input의 value 속성에 바인딩된 모델
            let oValueModel = /** @type {JSONModel} */ (oBinding.getModel());
            let oValueContext = oBinding.getContext();
            let sFieldName = oBinding.getPath();
            let sValuePath = `${oValueContext.getPath()}/${sFieldName}`;
            
            if (sValuePath.includes("A02")) {
                let iSales = oValueModel.getProperty(sValuePath.replace("A02","A01"))
                let iMarginRate = oValueModel.getProperty(sValuePath)
                if (iSales && iMarginRate) {
                    oValueModel.setProperty(sValuePath.replace("A02","A03"), this.onMargin(iSales, iMarginRate))
                }
            }

            if (sValue === sLastValue) {
                if (sValue === '') {
                    oValueModel.setProperty(sValuePath,null)
                }
                return;
            }

            // 부서
            if (sFlag === "Department") {
                if (sValue) {
                    let oData = this._validateField(sValue, sFlag);

                    if (!!oData) {
                        oSource.setValue(oData.task_nm);
                        oSource.setValueState(coreLib.ValueState.None);

                        let oBindingContext = oSource.getBindingContext("excelUploadModel");
                        let oExcelUploadModel = oBindingContext.getModel();
                        oExcelUploadModel.setProperty(`${oBindingContext.getPath()}/id`, oData.task_cd);

                        // 중복된 DT과제가 존재할 때
                        let sExcelTableId = Fragment.createId("dtTaskExcelUpload", "Table");
                        let oExcelTable = this.byId(sExcelTableId);
                        let aBindingContexts = oExcelTable.getBinding("rows").getContexts();
                        let aOrg = aBindingContexts.map(oContext => oContext.getObject()["DT과제"]);
                        let isInvalid = !!aOrg.find((sOrg, index) => aOrg.indexOf(sOrg) !== index);

                        if (isInvalid) {
                            oSource.setValueState(coreLib.ValueState.Error);
                            oSource.setValueStateText("중복되는 DT과제가 있습니다.");
                        }
                    } else {
                        oSource.setValueState(coreLib.ValueState.Error);
                        oSource.setValueStateText("입력한 DT과제는 존재하지 않습니다.");
                    }
                } else {
                    oSource.setValueState(coreLib.ValueState.Error);
                    oSource.setValueStateText("DT과제를 입력해주세요.");
                }
            } else if (sFlag === "Number") { // 숫자
                if (sValue) {   // 값이 있을 때 유효성 검사
                    let sNewValue = this._validateField(sValue, sFlag);

                    if (!!sNewValue) { // 값이 유효할 때
                        const oNumberFormat = NumberFormat.getIntegerInstance({
                            groupingEnabled: true,
                            groupingSeparator: ',',
                        });
                        let sFormatValue = Number(sNewValue);

                        oSource.setValue(sFormatValue);
                        oSource.setValueState(coreLib.ValueState.None);
                    } else {    // 유효하지 않을 때
                        oSource.setValue(sLastValue);
                        oSource.setValueState(coreLib.ValueState.Error);
                        oSource.setValueStateText("숫자를 입력해주세요.");

                        oSource.attachBrowserEvent("focusout", function () {
                            oSource.setValueState(coreLib.ValueState.None);
                        }.bind(this))
                    }
                } else {
                    // oSource.setValue("0");
                    oValueModel.setProperty(sValuePath,null)
                    oSource.setValueState(coreLib.ValueState.None);
                }

                // 마진/마진율 계산 예외처리를 위한 변수
                let aCurrentProperty = ["A01","A02","A03"].filter((sProperty) => sValuePath.includes(sProperty));
                if (aCurrentProperty.length > 0) {
                    let sSalesPath = sValuePath.replace(aCurrentProperty[0],"A01");
                    let sMarginRatePath = sValuePath.replace(aCurrentProperty[0],"A02");
                    let sMarginPath = sValuePath.replace(aCurrentProperty[0],"A03");

                    let iSales = Math.floor(oValueModel.getProperty(sSalesPath));
                    let iMarginRate = Math.floor(oValueModel.getProperty(sMarginRatePath) * 100) / 100;
                    let iMargin = Math.floor(oValueModel.getProperty(sMarginPath));
                    

                    if (iSales && iMargin && !iMarginRate) {
                        if (aCurrentProperty[0] === "A02" && iMarginRate === 0) {
                            oValueModel.setProperty(sMarginPath, 0);
                        } else {
                            oValueModel.setProperty(sMarginRatePath, this.onMarginRate(iSales, iMargin));
                        }
                    } else if (iSales && !iMargin && iMarginRate) {
                        if (aCurrentProperty[0] === "A03" && iMargin === 0) {
                            oValueModel.setProperty(sMarginRatePath, 0);
                        } else {
                            oValueModel.setProperty(sMarginPath, this.onMargin(iSales, iMarginRate));
                        }
                    } else if (!iSales && iMargin && iMarginRate) {
                        if (aCurrentProperty[0] === "A01" && iSales === 0) {
                            oValueModel.setProperty(sMarginRatePath, 0);
                        } else {
                            oValueModel.setProperty(sSalesPath, this.onSales(iMargin, iMarginRate));
                        }
                    } else if (iSales && iMargin && iMarginRate) {
                        if (aCurrentProperty[0] === "A01") {
                            oValueModel.setProperty(sMarginRatePath, this.onMarginRate(iSales, iMargin));
                        } else if (aCurrentProperty[0] === "A02") {
                            oValueModel.setProperty(sMarginPath, this.onMargin(iSales, iMarginRate));
                        } else if (aCurrentProperty[0] === "A03") {
                            oValueModel.setProperty(sMarginRatePath, this.onMarginRate(iSales, iMargin));
                        }
                    }
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
                let aTargetData = this.getView().getModel("addTargetModel").getData();
                
                return aTargetData.find(function (oDepartmentData) {
                    return oDepartmentData.task_nm.replaceAll(" ", "").toLowerCase()
                        === String(sValue).replaceAll(" ", "").toLowerCase();
                }.bind(this));
            } else if (sFlag === "Number") {
                let iValue = String(sValue).replaceAll?.(",", "");   // 콤마 제거

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
                            value: oInput.getValue()
                        });
                    }
                })
        },

        /**
         * 엑셀 업로드 Dialog 저장 및 취소 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag 저장, 취소
         */
        onExcelUploadDialogButton: function (oEvent, sFlag) {
            if (sFlag === "Save") {
                let sExcelTableId = Fragment.createId("dtTaskExcelUpload", "Table");
                let oExcelTable = this.byId(sExcelTableId);
                let aBindingContexts = oExcelTable.getBinding("rows").getContexts();
                let bInvalid = aBindingContexts.find(function (oContext) {
                    let oBindingObject = oContext.getObject();

                    // 중복된 DT과제가 존재할 때
                    let sExcelTableId = Fragment.createId("dtTaskExcelUpload", "Table");
                    let oExcelTable = this.byId(sExcelTableId);
                    let aBindingContexts = oExcelTable.getBinding("rows").getContexts();
                    let aDtTask = aBindingContexts.map(oContext => oContext.getObject()["DT과제"]);
                    let isInvalid = !!aDtTask.find((sDt, index) => aDtTask.indexOf(sDt) !== index);

                    // 하나라도 유효하지 않으면 true 반환
                    return !this._validateField(oBindingObject["DT과제"], "Department")
                        || this._aPropertyList.some((oProperty) => {
                            if (oProperty["value"] !== "A02"
                                && oProperty["value"] in oBindingObject
                                && oBindingObject[oProperty["value"]] !== undefined
                                && oBindingObject[oProperty["value"]] !== null) {
                                return !this._validateField(oBindingObject[oProperty["value"]], "Number")
                            } else {
                                return false
                            }
                        })
                        || isInvalid;
                }.bind(this));

                if (!!bInvalid) {
                    MessageToast.show("유효하지 않은 데이터가 존재합니다.");
                } else {
                    // 입력한 데이터 반영

                    aBindingContexts.forEach(function (oContext) {
                        let oBindingObject = oContext.getObject();

                        // 둘 다 0일 때 해당 항목 무시
                        // if (Object.entries(oBindingObject).filter(([key]) => key !== "DT과제").every(([key,val]) => val === 0)) return;
                        if (this._aPropertyList.every(oProperty => (oBindingObject[oProperty["value"]] === null || oBindingObject[oProperty["value"]] === undefined || oBindingObject[oProperty["value"]] === "") && !oBindingObject[`${oProperty["value"]}_total_yn`])) return;
                        let oAddTargeTable = this.byId("dtTaskTargetTable");
                        let aTableContext = oAddTargeTable.getBinding("rows").getContexts()
                        aTableContext.forEach(function (oAddTargetContext) {
                            if (oAddTargetContext.getObject()["task_nm"] === oBindingObject["DT과제"]) {
                                this._aPropertyList.forEach((oProperty) => {
                                    if (oProperty["value"] in oBindingObject
                                        && oBindingObject[oProperty["value"]] !== undefined
                                        && oBindingObject[oProperty["value"]] !== null) {
                                        oAddTargetContext.setProperty("new_"+oProperty["value"]+"_data", Number(oBindingObject[oProperty["value"]]));
                                    }
                                    oAddTargetContext.setProperty("new_"+oProperty["value"]+"_total_yn", oBindingObject[`${oProperty["value"]}_total_yn`]);
                                })
                            }
                        }.bind(this));
                    }.bind(this));

                    this._excelUploadDialog.close();

                    // 합계 다시 구하기
                    let aAddTargetTableData = this.getView().getModel("addTargetModel").getData();
                    aAddTargetTableData.forEach(oData =>{
                        oData.new_A02_data = this.onMarginRate(oData.new_A01_data, oData.new_A03_data);
                    })
                    let isChanged = aAddTargetTableData.find(oData => {
                        return this._aPropertyList.some(sProperty => oData[sProperty["value"]+"_data"] !== oData["new_"+sProperty["value"]+"_data"]);
                    })
                    this.getOwnerComponent().getModel("uiModel").setProperty("/refresh", !!isChanged);
                    MessageToast.show("업로드되었습니다.");
                }
            } else if (sFlag === "Close") {
                this._excelUploadDialog.close();
            }
        },

        /**
         * 마진율 Formatter
         * @param {Number} iSale 
         * @param {Number} iMarginRate 
         * @param {Number} iMargin 
         *
         */
        onMarginRateFormat: function (iSale, iMarginRate, iMargin) {
            if(iMarginRate !== 0){
                return iMarginRate+"%";
            }else if (iSale !== 0) {  // 분모 값이 있고, 0이 아닐 때
                return Math.floor(iMargin / iSale * 10000) / 100+"%";
            } else {
                return 0+"%";
            }
        },
        onMarginRate: function (iSale, iMargin) {
            return Math.floor(iMargin / iSale * 10000) / 100
        },
        onMargin: function (iSale, iMarginRate) {
            return Math.ceil(iMarginRate * iSale / 100);
        },
        onSales: function (iMargin, iMarginRate) {
            return Math.ceil(iMargin / iMarginRate * 100);
        },
        /**
         * 마진율 Formatter
         * @param {Number} iSale 
         * @param {Number} iMargin 
         * @returns {Number | null} 분모 값이 없을 때 null을 반환
         */
        onExpectedRate: function (iLast, iNew) {
            if (iLast !== 0 && iNew !== 0) {  // 분모 값이 있고, 0이 아닐 때
                const oNumberFormat = NumberFormat.getPercentInstance({
                    groupingSeparator: ',',
                    decimals: 2
                });

                return oNumberFormat.format((iNew - iLast) / iLast);
            } else {
                return null;
            }
        },
    });
});