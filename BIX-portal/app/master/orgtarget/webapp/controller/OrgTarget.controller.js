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
    "bix/common/library/control/Modules",
], (Controller, JSONModel, Fragment, NumberFormat, MessageToast, coreLib, Filter, FilterOperator, MessageBox,EventBus,Input,Label,HBox,VBox,CheckBox,Text,Column,Modules) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Input} Input
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     */
    return Controller.extend("bix.master.orgtarget.controller.OrgTarget", {
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

            // eventBus.publish 할 경우 targetrefresh, targetsave에 따라 실행 될 function 연결
            // targetrefresh : 해당 테이블 초기화
            // targetsave : 수정된 데이터 저장
            this._oEventBus.subscribe("target", "targetrefresh", this._setTreeData, this);
            this._oEventBus.subscribe("target", "targetsave", this.onSave, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: function (oEvent) {
            // 타겟 item 리스트 설정
            this._aPropertyList = this.getOwnerComponent().getModel("propertyModel").getData()
            let oAddTargetTable = this.byId("addTargetTable");

            // hash 값 , 새로고침 시 메뉴, 사이드메뉴 select 모듈함수
            Modules.setIconTab(oEvent); 

            this._setTable(oAddTargetTable);
            //테이블 데이터 세팅
            this._setTreeData();
        },

        onAfterRendering:function(){
            let oAddTargetTable = this.byId("addTargetTable");

                // 목표액 추가 테이블 스크롤 초기 설정 (수직, 수평)
                let oVerticalScroll = oAddTargetTable._getScrollExtension().getVerticalScrollbar();
                oVerticalScroll?.scrollTo(0, 0);
    
                let oHorizontalScroll = oAddTargetTable._getScrollExtension().getHorizontalScrollbar();
                oHorizontalScroll?.scrollTo(0, 0);
        },

        _setTable: function(oTable){
            if(oTable.getColumns().length>1) return
            
            this._aPropertyList.forEach(oProperty =>{
                if(oProperty.value !== 'D01'){
                    let oColumn = new Column({
                        hAlign:'Center',
                        width:['A02','A05','A06','A07'].includes(oProperty.value) ? '9rem':'{= ${uiModel>/edit}?"13rem":"9rem"}',
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
                        editable:'{uiModel>/edit}'
                    })
                    let oInput = new Input({
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
                                minFractionDigits:0,
                                maxFractionDigits: 2
                            }
                        },
                        visible:'{uiModel>/edit}',
                        description:{
                            path:`addTargetModel>total_t_${oProperty['value']}_data`,
                            formatter: function (iValue1) {
                                var oNumberFormat = NumberFormat.getFloatInstance({
                                    groupingEnabled: true,
                                    groupingSeparator: ',',
                                    groupingSize: 3,
                                    minFractionDigits:0,
                                    maxFractionDigits:2
                                });
                                let sNumber = oNumberFormat.format(iValue1)
                                return sNumber;                        
                            }
                        },
                        fieldWidth:"60%",
                        liveChange: ($event) => { this.onInputLiveChange($event,'Number')},
                    })
                    let oText = new Text({
                        text:{
                            parts: [
                                {path: `addTargetModel>total_t_${oProperty['value']}_data`},
                                {path: `addTargetModel>new_${oProperty['value']}_data`},
                                {path: `addTargetModel>hdqt_id`}
                            ],
                            formatter: function (iValue1, iValue2, sId) {
                                var oNumberFormat = NumberFormat.getFloatInstance({
                                    groupingEnabled: true,
                                    groupingSeparator: ',',
                                    groupingSize: 3,
                                    minFractionDigits:0,
                                    maxFractionDigits:2
                                });
                                let sNumber = !sId ? oNumberFormat.format(iValue1) + " ("+oNumberFormat.format(iValue2)+")" : oNumberFormat.format(iValue1)
                                return sNumber;                        
                            }
                        },
                        tooltip:{
                            parts: [
                                {path: `addTargetModel>total_f_${oProperty['value']}_data`},
                                {path: `addTargetModel>hdqt_id`}
                            ],
                            formatter: function (iValue1, sId) {
                                var oNumberFormat = NumberFormat.getFloatInstance({
                                    groupingEnabled: true,
                                    groupingSeparator: ',',
                                    groupingSize: 3,
                                    minFractionDigits:0,
                                    maxFractionDigits:2
                                });
                                let sNumber = oNumberFormat.format(iValue1)
                                return !sId ? sNumber : '';
                            }
                        },
                        emptyIndicatorMode:'On',
                        wrapping:false,
                        width:'100%',
                        textAlign:'End',
                        visible:'{= !${uiModel>/edit}}'
                    
                    })
                    if (oProperty.value === 'A02') {
                        oText = new Text({
                            text:{
                                parts: [
                                    {path: 'addTargetModel>total_t_A01_data'},
                                    {path: 'addTargetModel>total_t_A03_data'},
                                    {path: 'addTargetModel>hdqt_id'},
                                ],
                                formatter: function (iSale1, iMargin1) {
                                    let oNumberFormat = NumberFormat.getPercentInstance({
                                        groupingEnabled: true,
                                        groupingSeparator: ',',
                                        groupingSize: 3,
                                        decimals:2
                                    });
                                    let iFormatNumber1 = !iSale1 || !iMargin1 ? '0%' : oNumberFormat.format(Math.floor(iMargin1 / iSale1 * 10000) / 10000);
                                    
                                    return iFormatNumber1
                                    
                                }
                            },
                            emptyIndicatorMode:'On',
                            wrapping:false,
                            width:'100%',
                            textAlign:'End'
                        })
                    }
                    if(['A05','A06','A07'].includes(oProperty.value)){
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
                            visible:'{uiModel>/edit}',
                            liveChange: ($event) => { this.onInputLiveChange($event,'Number')},
                        })
                        oText = new Text({
                            text:{
                                parts: [
                                    {path: `addTargetModel>new_${oProperty['value']}_data`}
                                ],
                                formatter: function (iValue1) {
                                    var oNumberFormat = NumberFormat.getFloatInstance({
                                        groupingEnabled: true,
                                        groupingSeparator: ',',
                                        groupingSize: 3,
                                        minFractionDigits:0,
                                        maxFractionDigits:2
                                    });
                                    let sNumber = oNumberFormat.format(iValue1)
                                    return sNumber;                        
                                }
                            },
                            emptyIndicatorMode:'On',
                            wrapping:false,
                            width:'100%',
                            textAlign:'End',
                            visible:'{= !${uiModel>/edit}}'
                        
                        })
                        
                    }
                    if(oProperty['value'] !== 'A02'){
                        oVBox.insertItem(oInput)
                    }
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
                        text:'조직'
                    }),
                    autoResizable:true
                }) 
                let oInput = new Input({
                    width:'100%',
                    textAlign:'Begin',
                    fieldGroupIds:'Input',
                    placeholder:'팀 입력',
                    value:'{excelUploadModel>조직}',
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
                    let oVBox = new VBox({
                        width:'100%'
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
                            type:'sap.ui.model.type.Float',
                            formatOptions:{
                                groupSeparator: ',',
                                groupingEnabled: true,
                                maxIntegerDigits: 99,
                                minFractionDigits:0,
                                maxFractionDigits: 2
                            }
                        },
                        liveChange: ($event) => { this.onExcelUploadLiveChange($event,'Number')},
                    })
                    let oText;
                    if(['A05','A07'].includes(oProperty.value)){
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
                    if(['A02'].includes(oProperty.value)){
                        oText = new Text({
                            text:{
                                parts: [
                                    {path: 'excelUploadModel>A01'},
                                    {path: 'excelUploadModel>A03'}
                                ],
                                formatter: function (iSale1, iMargin1) {
                                    let oNumberFormat = NumberFormat.getPercentInstance({
                                        groupingEnabled: true,
                                        groupingSeparator: ',',
                                        groupingSize: 3,
                                        decimals:2
                                    });
                                    let iFormatNumber1 = !iSale1 || !iMargin1 ? '0%' : oNumberFormat.format(Math.floor(iMargin1 / iSale1 * 10000) / 10000);
                                    
                                    return iFormatNumber1
                                    
                                }
                            },
                            emptyIndicatorMode:'On',
                            wrapping:false,
                            width:'100%',
                            textAlign:'End'
                        })
                    }
                    if(['A06'].includes(oProperty.value)){
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
                                    minFractionDigits:0,
                                    maxFractionDigits: 2
                                }
                            },
                            fieldWidth:"80%",
                            liveChange: ($event) => { this.onExcelUploadLiveChange($event,'Number')},
                        })
                    }

                    oCheckBox.addStyleClass("custom-checkBox")
                    if(oProperty.value === 'A02'){
                        oVBox.insertItem(oText)
                        oHBox.insertItem(oVBox)
                    }else{
                        oHBox.insertItem(oInput)
                    }
                    oHBox.insertItem(oCheckBox)
                    oColumn.setTemplate(oHBox)
                    oTable.addColumn(oColumn)
                }
            })
        },

        /**
         * 저장 버튼 클릭 이벤트
         * @param {Event} oEvent 
         * @param {String} sEventId 이벤트 식별자
         * @param {Object} oData 선택되어있는 toggle button text값
         * @returns 
         */
        onSave: async function (oEvent, sEventId, oData) {
            // eventBus를 통한 event 발생 시 해당 table이 visible = true일 경우에만 실행
            if(oData.type === "조직별"){
                const iYear = this.getOwnerComponent().getModel("uiModel").getProperty("/year");
                
                // 테이블에 binding되어있는 데이터
                let aBindingModel = this.getView().getModel("addTargetModel").getData();

                // tree구조로 되어있는 데이터를 일차배열과 같은 형태로 변경
                // 변경된 데이터에서 부문(1796), 본부(6907) 단위의 조직의 데이터 중 변경된 데이터가 있는지 확인
                let aFlatDataList = this._getFlatDataList(aBindingModel);
                let aChangedData = aFlatDataList.filter(function (oData) {
                    return this._aPropertyList.some(oProperty => oData[oProperty["value"]+"_data"] !== oData["new_"+oProperty["value"]+"_data"] || oData[oProperty["value"]+"_total_yn"] !== oData["new_"+oProperty["value"]+"_total_yn"]);
                }.bind(this));
    
                // 변경된 데이터가 없을 경우
                if (aChangedData.length === 0) {
                    MessageToast.show('변경된 데이터가 없습니다.');
                    return;
                }
                
                // 변경된 데이터와 기존 annual_target entity의 데이터를 비교하기 위해 데이터 호출
                let oModel = this.getOwnerComponent().getModel();
                let oBinding = oModel.bindList("/AnnualTarget", undefined, undefined, [
                    new Filter({
                        path: "year", operator: FilterOperator.EQ, value1: iYear,
                    }),
                    new Filter({
                        path: "target_type", operator: FilterOperator.EQ, value1: "ccorg_cd",
                    })
                ], { $$updateGroupId: "AddTarget" });
                let aExistedContexts = await oBinding.requestContexts(0, Infinity);
                
                // 변경된 Context 생성 및 수정 요청 생성
                aChangedData.forEach((oData) => {
                    this._aPropertyList.forEach((oProperty) => {
                        // 타겟 item의 value값을 이용하여 매출, 마진율...의 목표값, 전사집계 포함 유무 변경된 경우유무 수정유무를 확인
                        let bChangeData = oData[oProperty["value"]+"_data"] !== oData["new_"+oProperty["value"]+"_data"];
                        let bChangeTotalYn = oData[oProperty["value"]+"_total_yn"] !== oData["new_"+oProperty["value"]+"_total_yn"];
                        // A02은 마진율 목표값은 DB에 저장하지 않음
                        if ((oProperty["value"] !=="A02" && bChangeData) || bChangeTotalYn) {
                            // 변경된 데이터의 path값
                            let sBindingPath = `/AnnualTarget(year='${iYear}',target_type='ccorg_cd',target_type_cd='${oData.ccorg_cd}',target_cd='${oProperty["value"]}')`
                            // 변경된 데이터의 path값이 기존 annual_target 데이터에 있는지 확인
                            let isExist = aExistedContexts.find(oContext => oContext.getPath() === sBindingPath);

                            if (isExist) { // 존재할 경우 수정
                                let oContext = oModel.bindContext(sBindingPath, undefined, {
                                    $$updateGroupId: "AddTarget"
                                })
                                // 목표값이 변경된 경우
                                if(bChangeData){
                                    // 변경된 데이터가 마진율이고, 매출, 마진액 데이터가 있을 경우 마진율을 계산해서 세팅
                                    oContext.getBoundContext().setProperty("target_val", Number(oData["new_"+oProperty["value"]+"_data"]));
                                }
                                // 전사집계 포함 유무 변경된 경우
                                if(bChangeTotalYn){
                                    oContext.getBoundContext().setProperty("is_total_calc", oData["new_"+oProperty["value"]+"_total_yn"]);
                                }
                            } else { // 존재하지 않는 경우 생성
                                let oBinding = oModel.bindList("/AnnualTarget", undefined, undefined, undefined, {
                                    $$updateGroupId: "AddTarget"
                                });
                                let oCreateObject = {
                                    year: iYear.toString(),
                                    target_type:"ccorg_cd",
                                    target_type_cd: oData.ccorg_cd,
                                    target_cd : oProperty["value"],
                                    target_val: Number(oData["new_"+oProperty["value"]+"_data"]),
                                    is_total_calc : oData["new_"+oProperty["value"]+"_total_yn"]
                                }
                                oBinding.create(oCreateObject);
                            }
                        }
                    })
                })
                
                // 수정 or 생성된 데이터를 submitBatch를 통해 전송
                oModel.submitBatch("AddTarget").then(async function () {
                    // submitBatch 실행 후 보류중인 변경사항이 있는지 확인
                    let aChanges = oModel.hasPendingChanges("AddTarget");

                    //보류중인 변경사항 없는 경우 messageToast로 알림
                    if (!aChanges) {
                        MessageToast.show("저장이 완료되었습니다.");
    
                        // 모델 및 데이터 초기화
                        oModel.refresh();
                        this._setTreeData();
                    } else { //보류중인 변경사항 있는 경우 messageToast로 알림
                        MessageToast.show("저장에 실패하였습니다.");
                    }
                }.bind(this));
                
                // 저장 후 조회모드로 변경
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
        _setTreeData: async function (oEvent, sEventId, oData) {
            if(!sEventId || oData.type === "조직별"){
                this.getView().setBusy(true);

                // 데이터 호출
                let sPlUrl = "/get_type_target(type='org')";
                
                let oModel = this.getOwnerComponent().getModel();
                
                const oBinding = oModel.bindContext(sPlUrl);
                let oRequest= await oBinding.requestObject();
                let oSetResult = this._dataSetting(oRequest.value, true);
                let oJSONModel = new JSONModel(oSetResult.data);
                // 바인딩에 사용되는 최대 항목 수를 설정
                oJSONModel.setSizeLimit(oSetResult.data_cnt);
                this.getView().setModel(oJSONModel, "addTargetModel");
                this.getOwnerComponent().getModel("uiModel").setProperty("/refresh", false);
                
                this.getView().setBusy(false);
            }
        },

        /**
         * 호출한 데이터의 자식의 자식이 있을 때 부문 레벨에 대
         * @param {Array} aTreeData 호출한 tree데이터
         * @returns 
         */
        _dataSetting: function (aTreeData, bCheck) {
            let oResult = {
                data : aTreeData,
                data_cnt : 0
            };

            aTreeData.forEach(oData => {
                this._aPropertyList.forEach(sProperty => {
                    if (!["A02","A05","A06","A07"].includes(sProperty["value"])) {
                        this.fnUpdateSums(oData, sProperty["value"]);
                        this.fnCalcSums(oData, sProperty["value"]);
                    }
                })
            });
            return bCheck ? oResult : aTreeData;
        },

        /**
         * 
         * @param {Object} oData 
         * @param {String} sProperty 
         * @returns 
         */
        // 자식이 있을 때 각 속성에 대한 자식의 합을 구함(본부 제외)
        fnUpdateSums : function (oData, sProperty) {
            oData.highlight = 'None';
            if(oData[`new_${sProperty}_total_yn`]){
                oData[`total_t_${sProperty}_data`] = Math.floor(oData[`new_${sProperty}_data`]*100)/100;
                if(oData.children?.length){
                    oData.children.forEach(child => {
                        this.fnUpdateSums(child, sProperty);
                    })
                }
                return Math.floor(oData[`new_${sProperty}_data`]*100)/100;
            }else if(!oData[`new_${sProperty}_total_yn`] && !!oData.children?.length){
                oData[`total_t_${sProperty}_data`] = oData.children.reduce((sum, child) => {
                    return (Math.floor(sum*100) + Math.floor(this.fnUpdateSums(child, sProperty)*100))/100;
                }, 0);
                return oData[`total_t_${sProperty}_data`];
            }else{
                return 0
            }
        },

        /**
         * 
         * @param {Object} oData 
         * @param {String} sProperty 
         * @returns 
         */
        fnCalcSums : function (oData, sProperty){
            if(oData[`new_${sProperty}_total_yn`]){
                oData[`total_t_${sProperty}_data`] = oData[`new_${sProperty}_data`]
            }else if(!!oData.children?.length && !!oData.div_id && !oData.hdqt_id){
                if(!oData[`new_${sProperty}_data`]){
                    let i_t_sum = 0,
                        i_f_sum = 0;
                    oData.children.forEach(child => {
                        if(!!child[`new_${sProperty}_total_yn`]){
                            i_t_sum += child[`new_${sProperty}_data`]
                        }
                        i_f_sum += child[`new_${sProperty}_data`]
                    })
                    oData[`total_t_${sProperty}_data`] = i_t_sum === 0 ? i_f_sum : i_t_sum
                }else{
                    oData[`total_t_${sProperty}_data`] = oData[`new_${sProperty}_data`]
                }
            }else if(!!oData.hdqt_id){
                oData[`total_t_${sProperty}_data`] = oData[`new_${sProperty}_data`]
            }

            if(!oData.hdqt_id){
                if (!!oData.children?.length) {
                    oData[`total_f_${sProperty}_data`] = oData.children.reduce((sum, child) => {
                        return sum + this.fnCalcSums(child, sProperty);
                    }, 0);
                }
            }

            return Math.floor(oData[`total_f_${sProperty}_data`]*100)/100;
        },

        /**
         * 엑셀 템플릿 다운로드
         */
        onExcelTemplateDownload: function () {
            let workbook = new ExcelJS.Workbook();
            let worksheet = workbook.addWorksheet("Sheet1");

            // 열 구성
            let aColumns = ["조직"]
            let aColumnSetting = [{key : "조직",width : 25}];
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

            // 조직 데이터 행 추가
            let aBindingModel = this.getView().getModel("addTargetModel").getData();
            let aFlatData = this._getFlatDataList(aBindingModel);
            aFlatData.forEach(function (oContext) {
                let oExcelRow = [oContext.name, ...Array(15).fill(null)];
                worksheet.addRow(oExcelRow);
            }.bind(this));

            workbook.xlsx.writeBuffer().then((buffer) => {
                let blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                let link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `조직별 목표실적 템플릿.xlsx`;
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
                                    id: "excelUploadDialog",
                                    name: `${sComponentName}.view.fragment.ExcelUpload`,
                                    controller: this,
                                }).then(function (oDialog) {
                                    this._excelUploadDialog = oDialog;
                                }.bind(this));
                            }
                            let sExcelTableId = Fragment.createId("excelUploadDialog", "Table");
                            let oExcelTable = this.byId(sExcelTableId);
                            this._setExcelTable(oExcelTable);

                            aExcelData = aExcelData.filter(oExcelData => {
                                let aDataVal = Object.entries(oExcelData).filter(([key]) => key !== "조직");
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


            // Input의 value 속성에 바인딩된 모델
            let oValueModel = /** @type {JSONModel} */ (oSource.getBinding("value").getModel());
            let oValueContext = oSource.getBinding("value").getContext();
            let sFieldName = oSource.getBinding("value").getPath();
            let sValuePath = `${oValueContext.getPath()}/${sFieldName}`;

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
                        oSource.setValueStateText("입력한 팀이 존재하지 않습니다.");
                    }
                } else {
                    oSource.setValueState(coreLib.ValueState.Error);
                    oSource.setValueStateText("팀를 입력해주세요.");
                }
            } else if (sFlag === "Number") { // 숫자
                if(Number(sValue) === 0 && !sValue.includes(".")) {                   // 0일때 0넣기
                    oValueModel.setProperty(sValuePath, 0);
                    oSource.setValue(0);
                    oSource.setValueState(coreLib.ValueState.None);
                }
                else {   // 값이 있을 때 유효성 검사
                    let sNewValue = this._validateField(sValue, sFlag);
                    if (sNewValue !== null) { // 값이 유효할 때
                        if(sNewValue.includes('.')){
                            let aPart = sNewValue.split('.');
                            if(aPart[1].length>2){
                                sNewValue = aPart[0] + '.' + aPart[1].substr(0,2);
                            }
                            if(aPart[1] !== '' && aPart[1] !== '0'){
                                oSource.setValue(Number(sNewValue))
                                oValueModel.setProperty(sValuePath, Number(sNewValue));
                            }
                        }else{
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

                // 합산로직 수행
                let aTreeData = oValueModel.getData();
                this._dataSetting(aTreeData);
                oValueModel.refresh();
                // 하나라도 변경된 필드가 있을 시 초기화 버튼 enabled true로 변경
                let isChanged = this._getFlatDataList(aTreeData).find(oData => {
                    return this._aPropertyList.some(sProperty => {
                        if(sProperty["value"] !== "D01"){
                            return oData[sProperty["value"]+"_data"] !== oData["new_"+sProperty["value"]+"_data"] || oData[sProperty["value"]+"_total_yn"] !== oData["new_"+sProperty["value"]+"_total_yn"]
                        }
                    });
                })
                this.getOwnerComponent().getModel("uiModel").setProperty("/refresh", !!isChanged);
                this._highlightSetting()
            }
        },

        _highlightSetting:function(){
            let oModel = this.getView().getModel('addTargetModel')

            let oData = oModel.getData()
            oData.forEach(data => {
                this._setHighlight(data);
            })
            oModel.refresh()
        },

        _setHighlight: function(oData){
            let bCheck = false;
            this._aPropertyList.forEach(oProperty => {
                if(oProperty.value !== 'D01'){
                    let bChangeData = false;
                    if(oProperty.value !== 'A02'){
                        bChangeData = oData[`new_${oProperty.value}_data`] !== oData[`${oProperty.value}_data`]
                    }
                    let bChangeTotalYn = oData[`new_${oProperty.value}_total_yn`] !== oData[`${oProperty.value}_total_yn`]
                    if(bChangeData || bChangeTotalYn){
                        bCheck = true
                        oData.highlight = 'Information'
                    }
                }
            })
            if(!bCheck){
                oData.highlight = 'None'
            }
            if(!!oData.children.length){
                oData.children.forEach(child => {
                    this._setHighlight(child)
                })
            }
        },

        onSelect: function (oEvent) {
            let oSource = /** @type {Input} */ (oEvent.getSource());
            let oValueModel = oSource.getBinding("selected").getModel();
            let aTreeData = oValueModel.getData();
            this._dataSetting(aTreeData);
            // 하나라도 변경된 필드가 있을 시 초기화 버튼 enabled true로 변경
            let isChanged = this._getFlatDataList(aTreeData).find(oData => {
                return this._aPropertyList.some(sProperty => {
                    if(sProperty["value"] !== "D01"){
                        return oData[sProperty["value"]+"_data"] !== oData["new_"+sProperty["value"]+"_data"] || oData[sProperty["value"]+"_total_yn"] !== oData["new_"+sProperty["value"]+"_total_yn"]
                    }
                });
            })
            this.getOwnerComponent().getModel("uiModel").setProperty("/refresh", !!isChanged);
            this._highlightSetting()
        },
        onSelectForamt: function (iFlag) {
            return Boolean(iFlag);
        },
        /**
         * ExcelUploadDialog 필드 LiveChange 이벤트
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
                        oSource.setValue(oData.name);
                        oSource.setValueState(coreLib.ValueState.None);

                        let oBindingContext = oSource.getBindingContext("excelUploadModel");
                        let oExcelUploadModel = oBindingContext.getModel();
                        oExcelUploadModel.setProperty(`${oBindingContext.getPath()}/id`, oData.id);

                        // 중복된 팀이 존재할 때
                        let sExcelTableId = Fragment.createId("excelUploadDialog", "Table");
                        let oExcelTable = this.byId(sExcelTableId);
                        let aBindingContexts = oExcelTable.getBinding("rows").getContexts();
                        let aOrg = aBindingContexts.map(oContext => oContext.getObject()["조직"]);
                        let isInvalid = !!aOrg.find((sOrg, index) => aOrg.indexOf(sOrg) !== index);

                        if (isInvalid) {
                            oSource.setValueState(coreLib.ValueState.Error);
                            oSource.setValueStateText("중복되는 팀이 있습니다.");
                        }
                    } else {
                        oSource.setValueState(coreLib.ValueState.Error);
                        oSource.setValueStateText("입력한 팀이 존재하지 않습니다.");
                    }
                } else {
                    oSource.setValueState(coreLib.ValueState.Error);
                    oSource.setValueStateText("팀를 입력해주세요.");
                }
            } else if (sFlag === "Number") { // 숫자
                if (sValue) {   // 값이 있을 때 유효성 검사
                    let sNewValue = this._validateField(sValue, sFlag);
                    if (!!sNewValue) { // 값이 유효할 때
                        if(sNewValue.includes('.')){
                            let aPart = sNewValue.split('.');
                            if(aPart[1].length>2){
                                sNewValue = aPart[0] + '.' + aPart[1].substr(0,2);
                            }
                            if(aPart[1] !== '' && aPart[1] !== '0'){
                                oSource.setValue(Number(sNewValue))
                            }
                        }else{
                            oSource.setValue(Number(sNewValue))
                        }
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
                let aList = this._getFlatDataList(aTargetData);
                
                return aList.find(function (oDepartmentData) {
                    return oDepartmentData.name.replaceAll(" ", "").toLowerCase()
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
        _getFlatDataList : function (oData,sPath = "/",aList = []){

            oData.forEach((item,idx) =>{
                let sCurrentPath = sPath + idx;
                item["context_path"] = sCurrentPath;
                aList.push(item)
                if(item.children.length>0){
                    sCurrentPath += "/children/";
                    this._getFlatDataList(item.children,sCurrentPath,aList)
                }
            })
            return aList;
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
                let sExcelTableId = Fragment.createId("excelUploadDialog", "Table");
                let oExcelTable = this.byId(sExcelTableId);
                let aBindingContexts = oExcelTable.getBinding("rows").getContexts();
                let bInvalid = aBindingContexts.find(function (oContext) {
                    let oBindingObject = oContext.getObject();

                    // 중복된 팀이 존재할 때
                    let sExcelTableId = Fragment.createId("excelUploadDialog", "Table");
                    let oExcelTable = this.byId(sExcelTableId);
                    let aBindingContexts = oExcelTable.getBinding("rows").getContexts();
                    let aOrg = aBindingContexts.map(oContext => oContext.getObject()["조직"]);
                    let isInvalid = !!aOrg.find((sOrg, index) => aOrg.indexOf(sOrg) !== index);

                    // 하나라도 유효하지 않으면 true 반환
                    return !this._validateField(oBindingObject["조직"], "Department")
                        || this._aPropertyList.some((oProperty) => {
                            if (oProperty["value"] in oBindingObject
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
                    let aAddTargetTableData = this.getView().getModel("addTargetModel").getData();

                    aBindingContexts.forEach(function (oContext) {
                        let oBindingObject = oContext.getObject();

                        // 둘 다 0일 때 해당 항목 무시
                        if (this._aPropertyList.every(oProperty => {(oBindingObject[oProperty["value"]] === null || oBindingObject[oProperty["value"]] === undefined || oBindingObject[oProperty["value"]] === "") && !oBindingObject[`${oProperty["value"]}_total_yn`]})) return;
                        aAddTargetTableData.forEach(function (oData) {
                            if (oData["name"] === oBindingObject["조직"]) {
                                this._aPropertyList.forEach((oProperty) => {
                                    if (oProperty["value"] in oBindingObject
                                        && oBindingObject[oProperty["value"]] !== undefined
                                        && oBindingObject[oProperty["value"]] !== null) {
                                        oData["new_"+oProperty["value"]+"_data"] = Number(oBindingObject[oProperty["value"]]);
                                    }
                                    oData["new_"+oProperty["value"]+"_total_yn"] = oBindingObject[`${oProperty["value"]}_total_yn`];
                                })
                            }
                        }.bind(this));
                    }.bind(this));

                    this._excelUploadDialog.close();

                    // 합계 다시 구하기
                    this._dataSetting(aAddTargetTableData);
                    this.getView().getModel("addTargetModel").refresh()
                    let isChanged = this._getFlatDataList(aAddTargetTableData).find(oData => {
                        return this._aPropertyList.some(sProperty => oData[sProperty["value"]+"_data"] !== oData["new_"+sProperty["value"]+"_data"]);
                    })
                    this._highlightSetting()
                    this.getOwnerComponent().getModel("uiModel").setProperty("/refresh", !!isChanged);
                    MessageToast.show("업로드되었습니다.");
                }
            } else if (sFlag === "Close") {
                this._excelUploadDialog.close();
            }
        },
    });
});