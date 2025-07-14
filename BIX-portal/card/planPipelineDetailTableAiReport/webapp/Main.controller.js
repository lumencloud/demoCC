sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/EventBus",
    "bix/common/library/control/Modules",
    "sap/ui/core/routing/HashChanger",
    "bix/common/ai/util/InteractionUtils",
    "bix/common/ai/service/AgentService",
    "bix/common/library/customDialog/AIPopupManager",
    "sap/m/MessageToast",
], function (Controller, JSONModel, Module, ODataModel, EventBus, Modules, HashChanger, InteractionUtils, AgentService, AIPopupManager, MessageToast) {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Select} Select
     */
    return Controller.extend("bix.card.planPipelineDetailTableAiReport.Main", {
        _aTableLists: ["pipeDetailTable1", "pipeDetailTable2", "pipeDetailTable3"],
        _aBoxLists: ["pipeDetailBox1", "pipeDetailBox2", "pipeDetailBox3"],

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
        onUiChange: async function (oEvent) {
            // 선택한 key로 화면에 보여줄 테이블을 결정
            let sKey = /** @type {Select} */ (oEvent.getSource()).getSelectedKey();
            let oUiModel = this.getView().getModel("uiModel");
            oUiModel.setProperty("/tableKind", sKey);

            // 테이블 병합
            await this._setTableMerge();

            // 해시 마지막 배열을 sKey로 변경
            let sCurrHash = HashChanger.getInstance().getHash();
            let aHash = sCurrHash.split("/");

            // 배열 두 번 제거 (조직 ID, Select Key)
            let sOrgId = aHash.pop();
            aHash.pop();

            // 배열 두 번 추가 (조직 ID, Select Key)
            aHash.push(sKey);
            aHash.push(sOrgId);

            // 해시 조합
            let sNewHash = aHash.join("/");
            HashChanger.getInstance().setHash(sNewHash);

            // PL에 detailSelect 해시 변경 EventBus 전송
            this._oEventBus.publish("pl", "setHashModel");
        },

        _setBusy: function (bFlag) {
            this._aBoxLists.forEach((sBoxId) => this.byId(sBoxId).setBusy(bFlag))
        },

        _bindTable: async function (sChannelId, sEventId, oData) {
            // DOM이 없는 경우 Return
            let oDom = this.getView().getDomRef();
            if (!oDom) return;

            // detailSelect 해시에 따른 Select 선택
            let oSelect = this.byId("detailSelect");
            let aHash = Modules.getHashArray();
            let sDetailKey = aHash?.[4];
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


            let oAiData = JSON.parse(sessionStorage.getItem("aiModel"))
            let sOrgId = oAiData.aiOrgId;


            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            let sDealPath = `/get_forecast_pl_pipeline_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='deal')`
            let sMonthPath = `/get_forecast_pl_pipeline_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='month')`
            let sRodrPath = `/get_forecast_pl_pipeline_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='rodr')`

            await Promise.all([
                oModel.bindContext(sDealPath).requestObject(),
                oModel.bindContext(sMonthPath).requestObject(),
                oModel.bindContext(sRodrPath).requestObject(),
            ]).then(function (aResults) {

                for (let i =0; i < this._aTableLists.length; i++) {
                    Module.displayStatusForEmpty(this.byId(this._aTableLists[i]),aResults[i].value, this.byId(this._aBoxLists[i]));
                }
                

                const aFilteredResults = []
                aResults.forEach((result, index) => {
                    const filteredItems = result.value.filter(item => item.type === oAiData.aiType)
                    aFilteredResults.push(filteredItems);
                })

                // totalData 추가해서 모델 바인딩
                this.getView().setModel(new JSONModel(aFilteredResults[0]), "oDealTableModel")
                this.getView().setModel(new JSONModel(aFilteredResults[1]), "oMonthTableModel")
                this.getView().setModel(new JSONModel(aFilteredResults[2]), "oRodrTableModel")

                this._monthVisibleSetting(aFilteredResults[1]);
                this._setTableMerge();

                // 테이블 로우 셋팅
                this._setVisibleRowCount(aFilteredResults);

                this._setBusy(false);
            }.bind(this))


        },

        _setVisibleRowCount: function (aResults) {
            //테이블 리스트
            let aTableLists = this._aTableLists

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
                if (aResults[i].length > this._iColumnCount) {

                    oTable.setVisibleRowCountMode("Auto")
                } else {
                    oTable.setVisibleRowCountMode("Fixed")
                    oTable.setVisibleRowCount(aResults[i].length)
                }
            }
        },

        _monthVisibleSetting: function (aResults) {
            let aColumnsVisible = {};
            if(!aResults ||aResults.length===0){
                return
            }
            for (let i = 1; i < 13; i++) {
                let sFindColumn = "m_" + String(i).padStart(2, "0") + "_data"
                if(aResults[0].hasOwnProperty(sFindColumn)){
                    aColumnsVisible[sFindColumn] = aResults[0].hasOwnProperty(sFindColumn)
                }
            }
            this.getView().setModel(new JSONModel(aColumnsVisible), "oColumnsVisibleModel")
            //console.log(this.getView().getModel("oColumnsVisibleModel"))
            //console.log(this.getView().getModel("oMonthTableModel"))
        },

        _setTableMerge: function () {

            let oTable1 = this.byId("pipeDetailTable1")
            let oTable2 = this.byId("pipeDetailTable2")
            let oTable3 = this.byId("pipeDetailTable3")
            Module.setTableMergeWithAltColor(oTable1, "oDealTableModel");
            Module.setTableMergeWithAltColor(oTable2, "oMonthTableModel");
            Module.setTableMergeWithAltColor(oTable3, "oRodrTableModel");
        },

        onAfterRendering: function () {
            this._setTableMerge();
        },


        /**
         * 필드 Formatter
         * @param {String} iValue1 
         * @param {*} sType
         * @param {*} sTooltip
         */
        onFormatPerformance: function (iValue1, sType, sTooltip) {
            return Modules.valueFormat(sType, iValue1, '', sTooltip)
        },

        /**
         * 
         * @param {sap.ui.Table } oTable 
         * @param {Array} aEmphasisSetting 
         * offset : 시작점, step : 적용간격
         */
        _tableHeaderSetting: function (oTable, aEmphasisSetting) {
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

        /**
         * 셀 클릭 이벤트 핸들러
         */
        onCellClick: function (oEvent) {
            const table_id = oEvent.getSource().getId();
            var result = InteractionUtils.processTableCellClick(this, oEvent, table_id);
            this._lastClickedCellInfo = result.cellInfo;

            this._excludeClick = false;

            // 선택된 행의 org_id 추출
            var oTable = this.byId(table_id);
            var iRowIndex = oEvent.getParameter("rowIndex");
            var oRowContext = oTable.getContextByIndex(iRowIndex);
            var oRowData = oRowContext ? oRowContext.getObject() : null;

            // org_id, org_name 저장 (fallback으로 세션 데이터 사용)
            var oSessionData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            this._selectedOrgId = oRowData && oRowData.div_id ? oRowData.div_id : oSessionData.div_id;
            this._selectedOrgName = oRowData && oRowData.div_name ? oRowData.div_name : oSessionData.div_name;
            this._selectedType = oRowData.type;

            //합계 클릭 금지 
            if (oRowData.div_name === "합계") {
                this._excludeClick = true;
            }
        },

        /**
         * 셀 우클릭 이벤트 핸들러 - AI 분석 실행
         */
        onCellContextmenu: function (oEvent) {
            oEvent.preventDefault();

            // 클릭 이벤트 로직으로 org_id 추출
            this.onCellClick(oEvent);


            //우클릭 예외사항 체크
            if (this._excludeClick) {
                return
            }

            // 분석 데이터 준비
            const oAnalysisData = this._prepareAnalysisData();

            let oAiData = JSON.parse(sessionStorage.getItem("aiModel"))
            const table_id = oEvent.getSource().getId();

            //aireport에서 불러들일 값을 sessionStorage에 저장
            sessionStorage.setItem("aiModel",
                JSON.stringify({
                    aiOrgId: this._selectedOrgId,
                    aiOrgName: this._selectedOrgName,
                    aiType: oAiData.aiType,
                    aiSubTitle: oAiData.aiSubTitle,
                    aiSubKey : oAiData.aiSubKey
                })
            )


            // 팝업 표시 및 분석 ID 획득
            const sAnalysisId = this._aiPopupManager.showLoadingPopup(
                oAnalysisData.tokenData,
                "planPipelineDetailTableAiReport",
                this
            );
            console.log("sAnalysisId !!! ", sAnalysisId);

            // AI 분석 시작
            this._startAnalysis(oEvent, oAnalysisData.params, sAnalysisId);
        },

        _prepareAnalysisData: function () {
            var oSessionData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            var dYearMonth = new Date(oSessionData.yearMonth);

            let oSelect = this.byId("detailSelect");
            const sSelectedKey = oSelect.getSelectedKey()
            const aItems = oSelect.getItems();
            const oSelectedItem = aItems.find(item => item.getKey() === sSelectedKey);

            const params = {
                year: String(dYearMonth.getFullYear()),
                month: String(dYearMonth.getMonth() + 1).padStart(2, "0"),
                org_id: this._selectedOrgId || oSessionData.orgId
            };

            const tokenData = {
                yearMonth: dYearMonth,
                orgName: this._selectedOrgName || oSessionData.orgNm,
                menuName: "전사 Pipeline 상세",
                type: this._selectedType,
                subTitle: oSelectedItem.getText()
            };

            return { params, tokenData };
        },

        /**
         * AI 분석 시작
         * @private
         */
        _startAnalysis: function (oEvent, oParams, sAnalysisId) {

            const table_id = oEvent.getSource().getId();

            // 1단계: 인터랙션 처리
            InteractionUtils.handleTableInteraction(this, oEvent, table_id, {
                gridName: "전사 Pipeline 상세",
                viewName: "table",
                viewTitle: "전사 Pipeline 상세 테이블",
                storageType: "session",
                storageKey: "initSearchModel",
                selectedCell: this._lastClickedCellInfo,
                params: oParams,
                functionName: "get_forecast_pl_pipeline_detail"
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
        _executeAIAnalysis: function (interactionData, sAnalysisId) {
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
        _handleSuccess: function (sAnalysisId, result) {
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
    });
});