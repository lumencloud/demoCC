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
    "sap/m/MessageToast",
    "../../main/util/Module",
], function (Controller, JSONModel, ODataModel, EventBus, Column, Label, Text, Modules, InteractionUtils, AgentService, AIPopupManager, HashChanger, MessageToast, Module) {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Select} Select
     */
    return Controller.extend("bix.card.planDTSalesTableAiReport.Main", {
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

            // 테이블 바인딩
            this._bindTable();
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);

            this._aiPopupManager = new AIPopupManager();
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
                    let sub_key = object.getFieldGroupIds().find(sId => sId === oAiData.aiSubKey);

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
            this._oEventBus.publish("pl", "setHashModel");
        },

        _setBusy: async function (bType) {
            const oTable = this.byId(this._sTableId);
            const oBox = oTable.getParent();
            oBox.setBusy(bType);
        },

        _bindTable: async function (sChannelId, sEventId, oData) {
            // 검색 조건
            let oAiData = this.getView().getModel("uiModel").getData();
            let oSearchData = this.getView().getModel("searchModel").getData();

            // 검색 파라미터
            this._setBusy(true);

            let dYearMonth = new Date(oSearchData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");

            const oPlModel = this.getOwnerComponent().getModel("pl");

            // sub_key에 따른 api 변경
            let sKey = oAiData.aiSubKey;
            let sBindingPath;
            if (sKey === "org") {
                sBindingPath = `/get_forecast_dt_org_oi(year='${iYear}',month='${sMonth}',org_id='${oAiData.aiOrgId}')`;
            } else if (sKey === "org_delivery") {
                sBindingPath = `/get_forecast_dt_org_oi(year='${iYear}',month='${sMonth}',org_id='${oAiData.aiOrgId}',org_tp='delivery')`;
            } else if (sKey === "org_account") {
                sBindingPath = `/get_forecast_dt_org_oi(year='${iYear}',month='${sMonth}',org_id='${oAiData.aiOrgId}',org_tp='account')`;
            } else if (sKey === "account") {
                sBindingPath = `/get_plan_cstco_by_biz_account_dt(year='${iYear}',month='${sMonth}',org_id='${oAiData.aiOrgId}',account_cd='${oAiData.aiAccountCd}')`
            } else if (sKey === "task") {
                sBindingPath = `/get_forecast_dt_task_oi(year='${iYear}',month='${sMonth}',org_id='${oAiData.aiOrgId}')`
            } else if (sKey === "member_year") {
                sBindingPath = `/get_forecast_dt_customer_oi(year='${iYear}',org_id='${oAiData.aiOrgId}')`
            } else if (sKey === "task_year") {
                sBindingPath = `/get_forecast_dt_task_year_oi(year='${iYear}',month='${sMonth}',org_id='${oAiData.aiOrgId}')`
            }

            await Promise.all([
                oPlModel.bindContext(sBindingPath).requestObject(),
            ]).then(function (aResults) {
                // 테이블의 이름 없는 빈 모델에 데이터 저장
                let oTable = this.byId(this._sTableId);
                oTable.setModel(new JSONModel(aResults[0].value));

                // this 변수에 테이블에 바인딩된 path 저장
                oTable._sBindingPath = sBindingPath;

                // 테이블 로우 셋팅
                this._setVisibleRowCount(aResults);
            }.bind(this)
            ).catch(function (oError) {
                console.log("데이터 로드 실패 ", oError);
                MessageToast.show("데이터 호출에 실패하였습니다.")
            }).finally(() => {
                this._setBusy(false);
            })

            await this._setTableMerge();
        },

        _setVisibleRowCount: function (aResults) {
            // 최대 5개 행으로 고정할 테이블 리스트
            let aTableLists = ["org", "org_delivery", "org_account", "account", "task"];

            // 테이블 아이디로 테이블 객체
            const oTable = this.byId(this._sTableId);

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
            if (aResults[0].value.length > this._iColumnCount) {
                oTable.setVisibleRowCountMode("Auto")
            } else {
                oTable.setVisibleRowCountMode("Fixed")
                
                if (aTableLists.includes(this._sTableId)) {
                    oTable.setVisibleRowCount(5);
                } else {
                    oTable.setVisibleRowCount(aResults[0].value.length);
                }
            }
        },

        /**
         * 테이블 병합
         */
        _setTableMerge: async function () {
            const oTable = this.byId(this._sTableId);
            Module.setTableMergeWithAltColor(oTable);
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
            let aTableList = ["planDTSalesTable1", "planDTSalesTable2"]
            let aModelList = ["oOrgTableModel", "oAssignmentTableModel"]
            for (let i = 0; i < aTableList.length; i++) {
                Module.setTableMergeWithAltColor(this.byId(aTableList[i]), aModelList[i])
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
            this._selectedOrgId = oRowData && oRowData.org_id ? oRowData.org_id : oSessionData.orgId;
            this._selectedOrgName = oRowData && oRowData.org_name ? oRowData.org_name : oSessionData.orgNm;

            this._selectedType = oRowData.type;
            
            //합계 클릭 금지 
            if (oRowData.org_name === "합계" || oRowData.org_id === "total") {
                this._excludeClick = true;
            }
        },

        /**
         * 테이블 행 선택
         * @param {Event} oEvent 
         */
        onRowSelectionChange: function (oEvent) {
            let aRowMergeInfo = Module._tableRowGrouping(oEvent.getSource());
            Module.setMergeTableRowClick(oEvent.getSource(), aRowMergeInfo);
        },

        /**
         * 셀 우클릭 이벤트 핸들러 - AI 분석 실행
         */
        onCellContextmenu: function (oEvent) {
            oEvent.preventDefault();

            // 클릭 이벤트 로직으로 org_id 추출
            this.onCellClick(oEvent);

            // 우클릭 예외사항 체크
            if (this._excludeClick) {
                return
            }

            // 분석 데이터 준비
            const oAnalysisData = this._prepareAnalysisData();

            let oUiData = this.getView().getModel("uiModel").getData();
            this._selectedSubTitle = oUiData.aiSubTitle;

            sessionStorage.setItem("aiModel",
                JSON.stringify({
                    aiOrgId: this._selectedOrgId,
                    aiOrgName: this._selectedOrgName,
                    aiType: this._selectedType,
                    aiSubTitle: this._selectedSubTitle,
                    aiSubKey : oUiData.aiSubKey
                })
            )

            // 팝업 표시 및 분석 ID 획득
            const sAnalysisId = this._aiPopupManager.showLoadingPopup(
                oAnalysisData.tokenData,
                "planDTSalesTableAiReport",
                this
            );

            // AI 분석 시작
            this._startAnalysis(oEvent, oAnalysisData.params, sAnalysisId);
        },

        _prepareAnalysisData: function () {
            let oSearchData = this.getView().getModel("searchModel").getData();
            let oUiData = this.getView().getModel("uiModel").getData();

            var dYearMonth = new Date(oSearchData.yearMonth);

            const params = {
                year: String(dYearMonth.getFullYear()),
                month: String(dYearMonth.getMonth() + 1).padStart(2, "0"),
                org_id: this._selectedOrgId || oSearchData.orgId
            };

            var tokenData = {
                yearMonth: dYearMonth,
                orgName: this._selectedOrgName || oSearchData.orgNm,
                menuName: "매출/마진 상세",
                type: this._selectedType,
                subTitle: oUiData.aiSubTitle
            };

            return { params, tokenData };
        },

        /**
         * AI 분석 시작
         * @private
         */
        _startAnalysis: function (oEvent, oParams, sAnalysisId) {
            // 테이블에 바인딩된 _sBindingPath를 기반으로 함수명 반환
            const oTable = oEvent.getSource();
            let sBindingPath = oTable._sBindingPath;
            let func_nm = sBindingPath.split("/")[1].split("(")[0];

            // 1단계: 인터랙션 처리
            InteractionUtils.handleTableInteraction(this, oEvent, oTable.getId(), {
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

        /**
         * 에러 처리
         * @private
         */
        _handleError: function (sAnalysisId, sErrorMessage) {
            this._aiPopupManager.updateContent(sAnalysisId, {
                aiAgentName: "처리 중 문제가 발생했습니다",
                aiContent: sErrorMessage,
                isLoading: false
            });
        },
    });
});