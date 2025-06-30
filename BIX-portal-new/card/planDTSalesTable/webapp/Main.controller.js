sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/EventBus",
    "sap/ui/table/Column",
    "sap/m/Label",
    "sap/m/Text",
    "bix/common/library/control/Modules",
    "bix/common/ai/util/InteractionUtils",
    "bix/common/ai/service/AgentService",
    "bix/common/library/customDialog/AIPopupManager",
    "sap/ui/core/routing/HashChanger",
], function (Controller, JSONModel, ODataModel, EventBus, Column, Label, Text, Modules, InteractionUtils, AgentService, AIPopupManager, HashChanger) {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Select} Select
     */
    return Controller.extend("bix.card.planDTSalesTable.Main", {
        /**
         * @type {sap.ui.core.EventBus} 글로벌 이벤트버스
         */
        _oEventBus: EventBus.getInstance(),

        /**
         * @type {Number} 화면에 꽉 찬 테이블의 row 갯수
         */
        _iColumnCount: null,

        /**
         * @type {Object} 검색 조건 저장
         */
        _oSearchData: {},

        onInit: async function () {
            // 초기 JSON 모델 설정
            await this._setModel();

            this._bindTable();
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);

            this._aiPopupManager = new AIPopupManager();
        },

        /**
         * JSON 모델 설정
         */
        _setModel: async function () {
            // 데이터 불러오기 전에 모든 테이블이 보여서 먼저 선언
            this.getView().setModel(new JSONModel({}), "uiModel");

            // 현재 해시를 기준으로 DB에서 Select에 들어갈 카드 정보를 불러옴
            let aHash = Modules.getHashArray();
            let sSelectPath = `/pl_content_view(page_path='${aHash[0]}',position='detail',grid_layout_info=null,detail_path='${aHash[2]}',detail_info='${aHash[3]}')/Set`;
            const oListBinding = this.getOwnerComponent().getModel("cm").bindList(sSelectPath, null, null, null, {
                $filter: `length(sub_key) gt 0`
            });
            let aSelectContexts = await oListBinding.requestContexts();
            let aSelectData = aSelectContexts.map(oContext => oContext.getObject());

            // 카드 정보를 selectModel로 설정 (sub_key, sub_text)
            this.getView().setModel(new JSONModel(aSelectData), "selectModel");
        
            // 기본적으로 첫 번째 항목의 테이블을 보여줌
            this.getView().setModel(new JSONModel({ tableKind: aSelectData[0].sub_key }), "uiModel");
        },

        /**
         * Select 변경 이벤트
         * @param {Event} oEvent 
         */
        onUiChange: function (oEvent) {
            // 선택한 key로 화면에 보여줄 테이블을 결정
            let sKey = /** @type {Select} */ (oEvent.getSource()).getSelectedKey();
            let oUiModel = this.getView().getModel("uiModel");
            oUiModel.setProperty("/tableKind", sKey);

            // 해시 마지막 배열을 sKey로 변경
            let sCurrHash = HashChanger.getInstance().getHash();
            let aHash = sCurrHash.split("/");
            aHash.pop();
            aHash.push(sKey)
            let sNewHash = aHash.join("/");
            HashChanger.getInstance().setHash(sNewHash);

            // PL에 detailSelect 해시 변경 EventBus 전송
            this._oEventBus.publish("pl", "setHashModel");
        },

        _setBusy: function (bFlag) {
            let aBoxLists = ["planDTSalesBox1", "planDTSalesBox2", "planDTSalesBox3", "planDTSalesBox4", "planDTSalesBox5"];
            aBoxLists.forEach((sBoxId) => this.byId(sBoxId).setBusy(bFlag))
        },

        _bindTable: async function (sChannelId, sEventId, oData) {
            // DOM이 없는 경우 Return
            let oDom = this.getView().getDomRef();
            if (!oDom) return;

            // detailSelect 해시에 따른 Select 선택
            let oSelect = this.byId("detailSelect");
            let aHash = Modules.getHashArray();
            let sDetailKey = aHash?.[5];
            if (sDetailKey) {   // 해시가 있는 경우 Select 설정
                oSelect.setSelectedKey(sDetailKey);
            } else {    // 없는 경우 첫 번째 Select 항목 선택
                let oFirstDetailKey = this.getView().getModel("selectModel").getProperty("/0/sub_key");
                oSelect.setSelectedKey(oFirstDetailKey);
            }
            
            // 새로운 검색 조건이 같은 경우 return
            oData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            let aKeys = Object.keys(oData);
            let isDiff = aKeys.find(sKey => oData[sKey] !== this._oSearchData[sKey]);
            if (!isDiff) return;

            // 새로운 검색 조건 저장
            this._oSearchData = oData;

            // 검색 파라미터
            this._setBusy(true);

            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;

            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            let sOrgPath = `/get_forecast_dt_org_oi(year='${iYear}',org_id='${sOrgId}')`
            let sAssingmentPath = `/get_forecast_dt_task_oi(year='${iYear}',org_id='${sOrgId}')`
            let sMemberCo_assignmentPath = `/get_forecast_dt_task_year_oi(year='${iYear}',org_id='${sOrgId}')`
            let sAccountPath = `/get_forecast_dt_account_oi(year='${iYear}',org_id='${sOrgId}')`
            let sMeberCoPath = `/get_forecast_dt_customer_oi(year='${iYear}',org_id='${sOrgId}')`

            await Promise.all([
                oModel.bindContext(sOrgPath).requestObject(),
                oModel.bindContext(sAssingmentPath).requestObject(),
                oModel.bindContext(sMemberCo_assignmentPath).requestObject(),
                oModel.bindContext(sAccountPath).requestObject(),
                oModel.bindContext(sMeberCoPath).requestObject()
            ]).then(function (aResults) {

                // 테이블 로우 셋팅
                this._setVisibleRowCount(aResults);

                //데이터 순서 정리 => db에서 처리 될 경우 필요없음
                let aTarget1 = ["기타 사별과제", "기타 사별과제(Hy-ERP)", "기타 사별과제(T-NOVA)"]
                let aTarget2 = ["기타 사별과제", "기타 사별과제(Hy-ERP)", "기타 사별과제(T-NOVA)", "합계"]
                // aResults[1].value = this._orderingArray(aResults[1].value, aTarget1)
                // aResults[2].value = this._orderingArray(aResults[2].value, aTarget2)
                aResults[3].value = aResults[3].value.sort((a, b) => a.display_order - b.display_order); // display_order 로 정렬
                sMeberCoPath
                //모델바인딩
                this.getView().setModel(new JSONModel(aResults[0].value), "oOrgTableModel")
                this.getView().setModel(new JSONModel(aResults[1].value), "oAssignmentTableModel")
                this.getView().setModel(new JSONModel(aResults[2].value), "oAssignmentYearTableModel")
                this.getView().setModel(new JSONModel(aResults[3].value), "oAccountTableModel")
                this.getView().setModel(new JSONModel(aResults[4].value), "oCustomerYearTableModel")
                this._setTable();

                this._setBusy(false)

            }.bind(this)
            )
        },

        _setTable: function () {

            // const createColumnsForTable = (oTable, aData, sModelName, sLabel) => {
            //     const aBaseColumns = ["name", "total_sale"];
            //     const sDynamicYear = Object.keys(aData[0]).filter(key => /^\d{4}$/.test(key))
            //     const aAllColumns = [...aBaseColumns];
            //     aAllColumns.splice(1, 0, ...sDynamicYear);

            //     oTable.removeAllColumns();

            //     aAllColumns.forEach(key => {
            //         let sKey = key
            //         let oColumn = new Column({
            //             hAlign: 'Center',
            //             width: key === 'name' ? '18rem' : '7rem',
            //             label: new Label({
            //                 text: key === 'total_sale' ? '합계' : key === 'name' ? sLabel.name : key,
            //                 wrapping: false
            //             }),
            //             template: new Text({
            //                 emptyIndicatorMode: "On",
            //                 text: {
            //                     parts: [
            //                         { path: `${sModelName}>` + sKey, targetType: 'any' },
            //                         { value: '' }
            //                     ],
            //                     formatter: key === 'name' ? undefined : this.onFormatPerformance
            //                 },
            //                 tooltip: {
            //                     parts: [
            //                         { path: `${sModelName}>` + sKey, targetType: 'any' },
            //                         { value: 'tooltip' }
            //                     ],
            //                     formatter: this.onFormatPerformance
            //                 },
            //                 wrapping: false,
            //                 width: '100%',
            //                 textAlign: key === 'name' ? 'Center' : 'End'
            //             }),
            //         })
            //         oTable.addColumn(oColumn);
            //     })
            //     oTable.bindRows(`{${sModelName}}`)
            // }

            const oCustomerTable = this.byId("planDTSalesTable4");
            const oCustomerData = this.getView().getModel("oCustomerYearTableModel").getData();
            const oTaskTable = this.byId("planDTSalesTable5");
            const oTaskData = this.getView().getModel("oAssignmentYearTableModel").getData();
            const oCustommerColumns = ["name", "total_sale"];
            const oTaskColumns = ["name", "total_sale"];

            const sCustomerYear = Object.keys(oCustomerData[0]).filter(key => /^\d{4}$/.test(key))
            const sTaskYear = Object.keys(oTaskData[0]).filter(key => /^\d{4}$/.test(key))

            oCustommerColumns.splice(1, 0, ...sCustomerYear);
            oTaskColumns.splice(1, 0, ...sTaskYear);

            oCustomerTable.removeAllColumns();
            oTaskTable.removeAllColumns();

            oCustommerColumns.forEach(key => {
                let sKey = key
                let oColumn = new Column({
                    hAlign: 'Center',
                    width: key === 'name' ? '20rem' : '7rem',
                    label: new Label({
                        text: key === 'total_sale' ? '합계' : key === 'name' ? '조직' : key,
                        wrapping: false
                    }),
                    template: new Text({
                        emptyIndicatorMode: "On",
                        text: {
                            parts: [
                                { path: "oCustomerYearTableModel>" + sKey, targetType: 'any' },
                                { value: '' }
                            ],
                            formatter: key === 'name' ? undefined : this.onFormatPerformance
                        },
                        tooltip: {
                            parts: [
                                { path: "oCustomerYearTableModel>" + sKey, targetType: 'any' },
                                { value: 'tooltip' }
                            ],
                            formatter: this.onFormatPerformance
                        },
                        wrapping: false,
                        width: '100%',
                        textAlign: key === 'name' ? 'Center' : 'End'
                    }),
                })
                oCustomerTable.addColumn(oColumn)
            })
            oTaskColumns.forEach(key => {
                let sKey = key
                let oColumn = new Column({
                    hAlign: 'Center',
                    width: key === 'name' ? '12rem' : '7rem',
                    label: new Label({
                        text: key === 'total_sale' ? '합계' : key === 'name' ? '과제' : key,
                        wrapping: false
                    }),
                    template: new Text({
                        emptyIndicatorMode: "On",
                        text: {
                            parts: [
                                { path: "oAssignmentYearTableModel>" + sKey, targetType: 'any' },
                                { value: '' }
                            ],
                            formatter: key === 'name' ? undefined : this.onFormatPerformance
                        },
                        tooltip: {
                            parts: [
                                { path: "oAssignmentYearTableModel>" + sKey, targetType: 'any' },
                                { value: 'tooltip' }
                            ],
                            formatter: this.onFormatPerformance
                        },
                        wrapping: false,
                        width: '100%',
                        textAlign: key === 'name' ? 'Center' : 'End'
                    })
                })
                oTaskTable.addColumn(oColumn)
            })
            oCustomerTable.bindRows("oCustomerYearTableModel>/");
            oTaskTable.bindRows("oAssignmentYearTableModel>/");
        },

        _setVisibleRowCount: function (aResults) {
            //테이블 리스트
            let aTableLists = ["planDTSalesTable1", "planDTSalesTable3", "planDTSalesTable5", "planDTSalesTable2"]

            for (let i = 0; i < aTableLists.length; i++) {
                // 테이블 아이디로 테이블 객체
                let oTable = this.byId(aTableLists[i])
                // 처음 화면 렌더링시 table의 visibleCountMode auto 와 <FlexItemData growFactor="1"/>상태에서
                // 화면에 꽉 찬 테이블의 row 갯수를 전역변수에 저장하기 위함

                if (oTable) {
                    oTable.attachCellClick(this.onCellClick, this);
                    oTable.attachCellContextmenu(this.onCellContextmenu, this);
                }

                if (this._iColumnCount === null) {
                    this._iColumnCount = oTable.getVisibleRowCount();
                }
                // 전역변수의 row 갯수 기준을 넘어가면 rowcountmode를 자동으로 하여 넘치는것을 방지
                // 전역변수의 row 갯수 기준 이하면 rowcountmode를 수동으로 하고, 각 데이터의 길이로 지정
                if (aResults[i].value.length > this._iColumnCount) {

                    oTable.setVisibleRowCountMode("Auto")
                } else {
                    oTable.setVisibleRowCountMode("Fixed")
                    oTable.setVisibleRowCount(aResults[i].value.length)
                }
            }
        },



        _orderingArray: function (aResult, aTarget) { //로우 데이터 순서 정리 => 디비에서 정리가 될경우 필요 없어짐
            aTarget.forEach(
                function (sKeyWord) {
                    aResult.push(
                        aResult.find(oItem => oItem.name === sKeyWord)
                    )
                }
            )

            let aFilterResult = [];

            for (let i = aResult.length - 1; i >= 0; i--) {
                if (!aFilterResult.find(oItem => oItem.name === aResult[i].name)) {
                    aFilterResult.unshift(aResult[i])
                }
            }

            return aFilterResult;
        },

        /**
         * 필드 Formatter
         * @param {String} sTooltip 
         * @param {*} iValue 기본값
         */
        onFormatPerformance: function (iValue, sTooltip) {
            return Modules.valueFormat('', iValue, '', sTooltip)
        },

        onAfterRendering: function () {
            let aTableList = ["planDTSalesTable1", "planDTSalesTable2", "planDTSalesTable3", "planDTSalesTable4", "planDTSalesTable5"]
            aTableList.forEach(
                function (sTableId) {
                    let oTable = this.byId(sTableId);
                    this._tableHeaderSetting(oTable);
                }.bind(this)
            )

            // 밑단 고정
            // this.byId("planDTSalesTable5").setFixedBottomRowCount(4)
            // this.byId("planDTSalesTable3").setFixedBottomRowCount(3)


        },

        /**
         * 셀 클릭 이벤트 핸들러
         */
        onCellClick: function (oEvent) {
            const table_id = oEvent.getSource().getId();
            var result = InteractionUtils.processTableCellClick(this, oEvent, table_id);
            this._lastClickedCellInfo = result.cellInfo;

            // 선택된 행의 org_id 추출
            var oTable = this.byId(table_id);
            var iRowIndex = oEvent.getParameter("rowIndex");
            var oRowContext = oTable.getContextByIndex(iRowIndex);
            var oRowData = oRowContext ? oRowContext.getObject() : null;

            // org_id, org_nm 저장 (fallback으로 세션 데이터 사용)
            var oSessionData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            this._selectedOrgId = oRowData && oRowData.org_id ? oRowData.org_id : oSessionData.org_id;
            this._selectedOrgName = oRowData && oRowData.org_nm ? oRowData.org_nm : oSessionData.org_nm;
        },

        /**
         * 셀 우클릭 이벤트 핸들러 - AI 분석 실행
         */
        onCellContextmenu: function (oEvent) {
            oEvent.preventDefault();

            // 클릭 이벤트 로직으로 org_id 추출
            this.onCellClick(oEvent);

            // 분석 데이터 준비
            const oAnalysisData = this._prepareAnalysisData();

            const table_id = oEvent.getSource().getId();
            
            // 팝업 표시 및 분석 ID 획득
            const sAnalysisId = this._aiPopupManager.showLoadingPopup(
                oAnalysisData.tokenData,
                "actualDTSalesTable",
                this
            );

            // AI 분석 시작
            this._startAnalysis(oEvent, oAnalysisData.params, sAnalysisId);
        },

        _prepareAnalysisData: function() {
            var oSessionData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            var dYearMonth = new Date(oSessionData.yearMonth);

            const params = {
                year: String(dYearMonth.getFullYear()),
                month: String(dYearMonth.getMonth() + 1).padStart(2, "0"),
                org_id: this._selectedOrgId || oSessionData.orgId
            };

            const tokenData = {
                yearMonth: dYearMonth,
                orgName: this._selectedOrgName || oSessionData.orgNm,
                menuName: "DT 매출 상세"
            };

            return { params, tokenData };
        },

        /**
         * AI 분석 시작
         * @private
         */
        _startAnalysis: function(oEvent, oParams, sAnalysisId) {

            const table_id = oEvent.getSource().getId();
            let func_nm;
            if (table_id === "planDTSalesTable1"){
                func_nm = "get_forecast_dt_org_oi"
            }
            else if (table_id === "planDTSalesTable2"){
                func_nm = "get_forecast_dt_account_oi"
            }

            // 1단계: 인터랙션 처리
            InteractionUtils.handleTableInteraction(this, oEvent, table_id, {
                gridName: "DT 매출 상세",
                viewName: "table",
                viewTitle: "DT 매출 상세 테이블",
                storageType: "session",
                storageKey: "initSearchModel",
                selectedCell: this._lastClickedCellInfo,
                params: oParams,
                functionName: func_nm
            })
            .then((result) => {
                if (!this._aiPopupManager.isValidAnalysis(sAnalysisId)) {
                    return; // 취소된 분석
                }

                if (result && result.success) {
                    this._executeAIAnalysis(result.interactionData, sAnalysisId);
                }
                else {
                    this._handleError(sAnalysisId, "데이터 처리 중 오류가 발생했습니다.");
                }
            })
            .catch((error) => {
                if (this._aiPopupManager.isValidAnalysis(sAnalysisId)) {
                    console.error("인터랙션 처리 오류:", error);
                    this._handleError(sAnalysisId, "데이터 처리 중 오류가 발생했습니다.");
                }
            });
        },

        /**
         * AI 분석 실행
         * @private
         */
        _executeAIAnalysis: function(interactionData, sAnalysisId) {
            AgentService.processInteraction(interactionData, {
                showBusyDialog: false,
                showProgressPercentage: false,
                onProgress: (progress) => {
                    console.log("AI 분석 진행률:", progress + "%");
                    this._aiPopupManager.updateProgress(sAnalysisId, progress);
                }
            })
            .then((result) => {
                if (this._aiPopupManager.isValidAnalysis(sAnalysisId)) {
                    this._handleSuccess(sAnalysisId, result);
                }
            })
            .catch((error) => {
                if (this._aiPopupManager.isValidAnalysis(sAnalysisId)) {
                    console.error("AI 분석 오류:", error);
                    this._handleError(sAnalysisId, "AI 분석 중 오류가 발생했습니다: " + (error.message || "알 수 없는 오류"));
                }
            });
        },

        /**
         * 성공 결과 처리
         * @private
         */
        _handleSuccess: function(sAnalysisId, result) {
            try {
                const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
                    
                if (parsedResult.agent_result) {
                    const agentResult = parsedResult.agent_result;
                    const masterResult = parsedResult.master_result;
                    
                    // AgentInfo 객체 생성
                    const agentInfo = {
                        name: masterResult.agent_name,
                        description: masterResult.agent_description,
                        iconPath: masterResult.agent_icon_path
                    };

                    this._aiPopupManager.updateContent(sAnalysisId, {
                        agentInfo: agentInfo,
                        aiContent: agentResult.executive_summary || "분석이 완료되었습니다.",
                        isLoading: false
                    });
                } else {
                    // 기본값 처리
                    const defaultAgentInfo = {
                        name: "AI 에이전트",
                        description: "AI 에이전트 설명입니다.",
                        iconPath: "default-agent-icon"
                    };
                     
                    this._aiPopupManager.updateContent(sAnalysisId, {
                        agentInfo: defaultAgentInfo,
                        aiContent: "요청하신 분석을 완료했습니다.",
                        isLoading: false
                    });
                }
            } catch (error) {
                console.error("결과 처리 오류:", error);
                this._handleError(sAnalysisId, "결과 처리 중 오류가 발생했습니다.");
            }
        },

        /**
         * 에러 처리
         * @private
         */
        _handleError: function(sAnalysisId, sErrorMessage) {
            this._aiPopupManager.updateContent(sAnalysisId, {
                aiAgentName: "처리 중 문제가 발생했습니다",
                aiContent: sErrorMessage,
                isLoading: false
            });
        },
        
        /**
         * 
         * @param {sap.ui.Table } oTable 
         * @param {Array} aEmphasisSetting 
         * offset : 시작점, step : 적용간격
         */
        _tableHeaderSetting: function (oTable, aEmphasisSetting = []) {
            let aColumns = oTable.getColumns();
            let aHeaderSpan = aColumns.map((oCol) => parseInt(oCol.getProperty("headerSpan")));

            let aHeaderRow = [];
            for (const oColumn of aColumns) {
                let aMultiLabels;
                if (oColumn.getAggregation("multiLabels")) {
                    aMultiLabels = oColumn.getAggregation("multiLabels");
                } else {
                    aMultiLabels = oColumn.getAggregation("label");
                }


                for (let i = 0; i < aMultiLabels.length; i++) {
                    if (aHeaderRow[i] && !aHeaderRow[i].some(oLabel => oLabel.getId() === aMultiLabels[i].getId())) {
                        aHeaderRow[i].push(aMultiLabels[i]);
                    } else {
                        aHeaderRow.push([aMultiLabels[i]]);
                    }
                }
            }

            for (let i = 0; i < aHeaderRow.length; i++) {
                if (i === aHeaderRow.length - 1) {
                    for (let j = 0; j < aHeaderSpan.length; j++) {
                        j += aHeaderSpan[j] - 1;
                        aHeaderRow[i][j].addStyleClass("custom-table-white-headerline")
                    }
                    for (const oEmphais of aEmphasisSetting) {
                        let j = oEmphais.offset;
                        while (j < aHeaderRow[i].length) {
                            aHeaderRow[i][j].addStyleClass("custom-table-emphasis-col-color")
                            if (aHeaderRow[i][j - 1].getDomRef()?.classList.contains("custom-table-emphasis-col-color") ?? false) {
                                aHeaderRow[i][j - 1].addStyleClass("custom-table-emphasis-col-line")
                            }
                            j += oEmphais.step;
                        }
                    }
                } else {
                    for (let j = 0; j < aHeaderSpan.length; j++) {
                        aHeaderRow[i][j].addStyleClass("custom-table-white-headerline")
                        j += aHeaderSpan[j] - 1;
                    }
                }
            }
        },




    });
});