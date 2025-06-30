sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/core/EventBus",
    "bix/common/ai/util/InteractionUtils",
    "bix/common/ai/service/AgentService",
    "bix/common/library/customDialog/AIPopupManager",
    "bix/common/library/control/Modules",
    "sap/ui/core/routing/HashChanger",
], function (Controller, JSONModel, Module, EventBus, InteractionUtils, AgentService, AIPopupManager, Modules, HashChanger) {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Select} Select
     */
    return Controller.extend("bix.card.actualSaleMarginDetailTable.Main", {
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

        onBeforeRendering () {
            this.bDialog = Module.checkIsDialog(this);
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
            aHash.pop();
            aHash.push(sKey)
            let sNewHash = aHash.join("/");
            HashChanger.getInstance().setHash(sNewHash);

            // PL에 detailSelect 해시 변경 EventBus 전송
            if(!this.bDialog) this._oEventBus.publish("pl", "setHashModel");
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

            const oPlModel = this.getOwnerComponent().getModel("pl");
            let sOrgPath = `/get_actual_sale_org_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            let sAccountPath = `/get_actual_sale_account_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            let sTernalPath = `/get_actual_sale_relsco_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            let sOverPath = `/get_actual_sale_crov_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            let sOwnPath = `/get_actual_sale_sub_company_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`

            await Promise.all([
                oPlModel.bindContext(sOrgPath).requestObject(),
                oPlModel.bindContext(sAccountPath).requestObject(),
                oPlModel.bindContext(sTernalPath).requestObject(),
                oPlModel.bindContext(sOverPath).requestObject(),
                oPlModel.bindContext(sOwnPath).requestObject(),
            ]).then(function (aResults) {
                //열 정리
                aResults[1].value = aResults[1].value.sort((a, b) => a.display_order - b.display_order); // display_order 로 정렬

                //모델바인딩
                this.getView().setModel(new JSONModel(aResults[0].value), "oOrgTableModel")
                this.getView().setModel(new JSONModel(aResults[1].value), "oAccountTableModel")
                this.getView().setModel(new JSONModel(aResults[2].value), "oTernalTableModel")
                this.getView().setModel(new JSONModel(aResults[3].value), "oOverTableModel")
                this.getView().setModel(new JSONModel(aResults[4].value), "oOwnTableModel")

                // 테이블 로우 셋팅
                this._setVisibleRowCount(aResults);
            }.bind(this))

            await this._setTableMerge();

            this._setBusy(false);
        },

        _setBusy: async function (bType) {
            let aBoxList = ["actualSaleMarginDetailBox1", "actualSaleMarginDetailBox2", "actualSaleMarginDetailBox3", "actualSaleMarginDetailBox4", "actualSaleMarginDetailBox5"]
            aBoxList.forEach(sBoxId => this.byId(sBoxId).setBusy(bType))
        },

        _setVisibleRowCount: function (aResults) {
            //테이블 리스트
            let aTableLists = ["actualSaleMarginDetailTable1", "actualSaleMarginDetailTable2", "actualSaleMarginDetailTable3", "actualSaleMarginDetailTable4", "actualSaleMarginDetailTable5"]

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

        _setTableMerge: async function () {
            let aTableList = ["actualSaleMarginDetailTable1", "actualSaleMarginDetailTable2", "actualSaleMarginDetailTable3", "actualSaleMarginDetailTable4", "actualSaleMarginDetailTable5"]
            let aMergeSize = [1, 1, 3, 3, 1]
            let aModelList = ["oOrgTableModel", "oAccountTableModel", "oTernalTableModel", "oOverTableModel", "oOwnTableModel"]

            for (let i = 0; i < aTableList.length; i++) {
                Module.setTableMerge(this.byId(aTableList[i]), aModelList[i], aMergeSize[i])
            }
        },

        onAfterRendering: function () {
            let aTableList = ["actualSaleMarginDetailTable1", "actualSaleMarginDetailTable2", "actualSaleMarginDetailTable3", "actualSaleMarginDetailTable4", "actualSaleMarginDetailTable5"]
            aTableList.forEach(
                function (sTableId) {
                    let oTable = this.byId(sTableId);
                }.bind(this)
            )
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
            
            this._excludeClick=false;

            // org_id, org_nm 저장 (fallback으로 세션 데이터 사용)
            var oSessionData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            this._selectedOrgId = oRowData && oRowData.org_id ? oRowData.org_id : oSessionData.org_id;
            this._selectedOrgName = oRowData && oRowData.org_nm ? oRowData.org_nm : oSessionData.org_nm;
            this._selectedType = oRowData.type;

            if(!this._selectedOrgId){
                this._selectedOrgId= oRowData.account_id;
                this._selectedOrgName=oRowData.account_nm;
            }

            //합계 클릭 금지 
            if(oRowData.org_nm==="합계" || oRowData.account_nm ==="합계"){
                this._excludeClick=true;
            }
            //첫번째 열 클릭 금지
            if(result.cellInfo &&result.cellInfo.columnIndex ===0){                
                this._excludeClick=true;
            }
            //org
            if(this.byId("detailSelect").getSelectedKey()!=="org" && this.byId("detailSelect").getSelectedKey()!=="account" ){
                if(result.cellInfo &&result.cellInfo.columnIndex ===1){                
                    this._excludeClick=true;
                }
            }

        },
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

            if(this._excludeClick){
                return
            }
            // 분석 데이터 준비
            const oAnalysisData = this._prepareAnalysisData();

            //aireport에서 불러들일 값을 sessionStorage에 저장
            sessionStorage.setItem("aiModel",
                JSON.stringify({
                    aiOrgId: this._selectedOrgId,
                    aiType: this._selectedType,
                })
            )

            // 현재 sub_Key 값으로 account 인지 확인
            let oSelect = this.byId("detailSelect");

           



            if (oSelect.getSelectedKey() === "account") {
                // 팝업 표시 및 분석 ID 획득
                const sAnalysisId = this._aiPopupManager.showLoadingPopup(
                    oAnalysisData.tokenData,
                    "accountDetailTableAiReport",
                    this
                );

                // AI 분석 시작
                this._startAnalysis(oEvent, oAnalysisData.params, sAnalysisId);

            } else {
                // 팝업 표시 및 분석 ID 획득
                const sAnalysisId = this._aiPopupManager.showLoadingPopup(
                    oAnalysisData.tokenData,
                    "actualSaleMarginDetailTableAiReport",
                    this
                );

                // AI 분석 시작
                this._startAnalysis(oEvent, oAnalysisData.params, sAnalysisId);

            }
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


            var tokenData = {
                yearMonth: dYearMonth,
                orgName: this._selectedOrgName || oSessionData.orgNm,
                menuName: "매출/마진 상세",
                type: this._selectedType,
                subTitle: oSelectedItem.getText()
            };

            if(oSelectedItem.getText()==="Account"){
                tokenData = {
                    yearMonth: dYearMonth,
                    orgName: oSessionData.orgNm,
                    menuName: "매출/마진 상세",
                    account_nm:this._selectedOrgName,
                    type: this._selectedType,
                    subTitle: oSelectedItem.getText()
                };
            }

            return { params, tokenData };
        },

        /**
         * AI 분석 시작
         * @private
         */
        _startAnalysis: function (oEvent, oParams, sAnalysisId) {

            const table_id = oEvent.getSource().getId();
            let func_nm;
            if (table_id === "actualSaleMarginDetailTable1") {
                func_nm = "get_actual_sale_org_pl"
            }
            else if (table_id === "actualSaleMarginDetailTable2") {
                func_nm = "get_actual_sale_account_pl"
            }
            else if (table_id === "actualSaleMarginDetailTable3") {
                func_nm = "get_actual_sale_relsco_pl"
            }
            else if (table_id === "actualSaleMarginDetailTable4") {
                func_nm = "get_actual_sale_crov_pl"
            }

            // 1단계: 인터랙션 처리
            InteractionUtils.handleTableInteraction(this, oEvent, table_id, {
                gridName: "매출/마진 상세",
                viewName: "table",
                viewTitle: "매출/마진 상세 테이블",
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

        onFormatPerformance: function (iValue1, iValue2, sType, sTooltip) {
            return Modules.valueFormat(sType, iValue1, iValue2, sTooltip)
        },

    });
});