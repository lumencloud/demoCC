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
        /**
         * @type {String} UI에 띄운 테이블의 로컬 ID
         */
        _sTableId: undefined,

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

        onInit: function () {
            this._asyncInit();
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);

            this._aiPopupManager = new AIPopupManager();
        },
        _asyncInit: async function () {

            // 초기 JSON 모델 설정
            await this._setModel();
            // 테이블 바인딩
            this._bindTable();
        },


        /**
         * JSON 모델 설정
         */
        _setModel: async function () {
            // uiModel 설정 (기본적으로 첫 번째 항목의 테이블을 보여줌)
            let oAiData = JSON.parse(sessionStorage.getItem("aiModel"));
            this.getView().setModel(new JSONModel(oAiData), "uiModel");

            let oSearchData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            this.getView().setModel(new JSONModel(oSearchData), "searchModel");

            // 화면에 보일 테이블을 전역 변수에 저장
            this.getView().getControlsByFieldGroupId("content").forEach(object => {
                if (object.isA("sap.ui.table.Table") && object.getFieldGroupIds().length > 0) {
                    let sub_key = object.getFieldGroupIds().find(sId => sId === oAiData.subKey);

                    // sub_key가 일치하는 테이블의 로컬 ID를 저장
                    if (!!sub_key) {
                        this._sTableId = this.getView().getLocalId(object.getId());
                    }
                }
            })
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
            this._oEventBus.publish("pl", "setHashModel", { system: true });
        },

        _setBusy: function (bFlag) {
            const oTable = this.byId(this._sTableId);
            const oBox = oTable.getParent();
            oBox.setBusy(bFlag);
        },

        _bindTable: async function (sChannelId, sEventId, oData) {
            // DOM이 없는 경우 Return
            let oDom = this.getView().getDomRef();
            if (!oDom) return;
            

            // 검색 조건
            let oAiData = this.getView().getModel("uiModel").getData();
            let oSearchData = this.getView().getModel("searchModel").getData();

            // 검색 파라미터
            this._setBusy(true);

            let dYearMonth = new Date(oSearchData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");


            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });
            let sKey = oAiData.subKey;

            let sBindingPath;

            if (sKey === "deal_stage") {
                sBindingPath = `/get_forecast_pl_pipeline_detail(year='${iYear}',month='${sMonth}',org_id='${oAiData.orgId}',type='deal')`
            } else if (sKey === "month") {
                sBindingPath = `/get_forecast_pl_pipeline_detail(year='${iYear}',month='${sMonth}',org_id='${oAiData.orgId}',type='month')`
            } else if (sKey === "rodr") {
                sBindingPath = `/get_forecast_pl_pipeline_detail(year='${iYear}',month='${sMonth}',org_id='${oAiData.orgId}',type='rodr')`
            }



            await Promise.all([
                oModel.bindContext(sBindingPath).requestObject(),
            ])
                .then((aResults) => {

                    let oTable = this.byId(this._sTableId);
                    let oBox = oTable.getParent();

                    aResults[0].value = aResults[0].value.filter(item => item.type === oAiData.type)
                    // Empty 상태 설정
                    Module.displayStatusForEmpty(oTable, aResults[0].value, oBox);

                    // _sBindingPath 설정
                    oTable._sBindingPath = sBindingPath;


                    if (oAiData.subKey === "month") {
                        this._monthVisibleSetting(aResults[0].value);
                    }

                    // 테이블에 모델 바인딩
                    oTable.setModel(new JSONModel(aResults[0].value));

                    // 테이블 로우 셋팅
                    this._setVisibleRowCount(aResults);

                })
                .catch((oErr) => {
                    // 추후 호출 분리 필요
                    let oTable = this.byId(this._sTableId);
                    let oBox = oTable.getParent();
                    //Module.displayStatus(oTable, oErr.error.code, oBox);
                });

            await this._setTableMerge();

            this._setBusy(false);


        },

        _setVisibleRowCount: function (aResults) {
            let oTable = this.byId(this._sTableId)
            // 처음 화면 렌더링시 table의 visibleCountMode auto 와 <FlexItemData growFactor="1"/>상태에서
            // 화면에 꽉 찬 테이블의 row 갯수를 전역변수에 저장하기 위함

            if (oTable && !oTable?.mEventRegistry?.cellContextmenu) {
                oTable.attachCellClick(this.onCellClick, this);
                oTable.attachCellContextmenu(this.onCellContextmenu, this);
            }

            if (this._iColumnCount === null) {
                this._iColumnCount = oTable.getVisibleRowCount();
            }
            // 전역변수의 row 갯수 기준을 넘어가면 rowcountmode를 자동으로 하여 넘치는것을 방지
            // 전역변수의 row 갯수 기준 이하면 rowcountmode를 수동으로 하고, 각 데이터의 길이로 지정
            if (aResults[0].value.length > this._iColumnCount) {

                oTable.setVisibleRowCountMode("Auto")
            } else {
                oTable.setVisibleRowCountMode("Fixed")
                oTable.setVisibleRowCount(aResults[0].value.length)
            }
        },

        _monthVisibleSetting: function (aResults) {
            if (aResults.length <= 0) return;
            let aColumnsVisible = {};
            for (let i = 1; i < 13; i++) {
                let sFindColumn = "m_" + String(i).padStart(2, "0") + "_data"
                let bResult = aResults[0].hasOwnProperty(sFindColumn)
                aColumnsVisible[sFindColumn] = bResult
            }
            this.getView().setModel(new JSONModel(aColumnsVisible), "oColumnsVisibleModel")

        },

        _setTableMerge: function () {
            const oTable = this.byId(this._sTableId);
            Module.setTableMergeWithAltColor(oTable);
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
                    orgId: this._selectedOrgId,
                    orgNm: this._selectedOrgName,
                    type: oAiData.type,
                    subTitle: oAiData.subTitle,
                    subKey: oAiData.subKey
                })
            )


            // 팝업 표시 및 분석 ID 획득
            const sAnalysisId = this._aiPopupManager.showLoadingPopup(
                oAnalysisData.tokenData,
                "planPipelineDetailTableAiReport",
                this
            );

            // AI 분석 시작
            this._startAnalysis(oEvent, oAnalysisData.params, sAnalysisId);
        },

        _prepareAnalysisData: function () {
            var oSessionData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            var dYearMonth = new Date(oSessionData.yearMonth);

            let oAiData = JSON.parse(sessionStorage.getItem("aiModel"))

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
                subTitle: oAiData.subTitle
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