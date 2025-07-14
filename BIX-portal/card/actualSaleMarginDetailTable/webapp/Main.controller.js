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
     * @typedef {sap.ui.table.Table} Table
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

        /**
         * @type {Array} View의 모든 테이블 배열
         */
        _aTableLists: [],

        onInit: async function () {
            // 데이터 불러오기 전에 모든 테이블이 보여서 먼저 선언
            this.getView().setModel(new JSONModel({}), "uiModel");

            // 초기 JSON 모델 설정
            await this._setModel();

            // 테이블 바인딩
            this._bindTable();
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);

            this._aiPopupManager = new AIPopupManager();
        },

        onBeforeRendering() {
            this.bDialog = Module.checkIsDialog(this);
        },

        /**
         * JSON 모델 설정
         */
        _setModel: async function () {
            // 검색 조건
            let oSearchData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 현재 해시를 기준으로 DB에서 Select에 들어갈 카드 정보를 불러옴
            let aHash = Modules.getHashArray();
            let sSelectPath = `/pl_content_view(page_path='${aHash[0]}',position='detail',grid_layout_info=null,detail_path='${aHash[2]}',detail_info='${aHash[3]}')/Set`;

            // 로직에 따라서 조직 필터링
            let aOrgFilter = [`(length(sub_key) gt 0 and sub_key ne 'org_delivery' and sub_key ne 'org_account' and sub_key ne 'org')`];
            if (oSearchData.org_level === "lv1" || oSearchData.org_level === "lv2") {   // lv1 또는 lv2
                aOrgFilter.push(`(sub_key eq 'org_delivery' or sub_key eq 'org_account')`);
            } else if ((oSearchData.org_level === "lv3" && oSearchData.org_tp === "hybrid") || oSearchData.org_tp === "account") {  // CCO 및 account조직
                aOrgFilter.push(`(sub_key eq 'org_account')`);
            } else {    // 그 외
                aOrgFilter.push(`(sub_key eq 'org')`);
            };

            // 조직 필터링 배열을 문자열로 변경
            let sOrgFilter = aOrgFilter.join(" or ");

            // 데이터 호출
            const oListBinding = this.getOwnerComponent().getModel("cm").bindList(sSelectPath, null, null, null, {
                $filter: sOrgFilter
            });
            let aSelectContexts = await oListBinding.requestContexts();
            let aSelectData = aSelectContexts.map(oContext => oContext.getObject());

            // 카드 정보를 selectModel로 설정 (sub_key, sub_text)
            this.getView().setModel(new JSONModel(aSelectData), "selectModel");

            // 기본적으로 첫 번째 항목의 테이블을 보여줌
            this.getView().setModel(new JSONModel({ tableKind: aSelectData[0].sub_key }), "uiModel");

            // this._aTableLists에 fieldGroupId가 content인 요소 및 SelectModel에 포함된 테이블의 localId를 담음
            this._aTableLists = [];
            this.getView().getControlsByFieldGroupId("content").forEach(object => {
                if (object.isA("sap.ui.table.Table") && object.getFieldGroupIds().length > 0) {
                    let sub_key = object.getFieldGroupIds().find(sId => !!aSelectData.find(oData => oData.sub_key === sId));

                    if (!!sub_key) {
                        let sLocalId = this.getView().getLocalId(object.getId());

                        this._aTableLists.push(sLocalId);
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
            let oSelect = /** @type {Select} */ (oEvent.getSource());
            let sKey = (oSelect).getSelectedKey();
            let oUiModel = this.getView().getModel("uiModel");
            oUiModel.setProperty("/tableKind", sKey);

            // 선택한 항목의 테이블만 병합
            let oItem = oEvent.getParameters()["item"];
            let iTableIndex = oSelect.indexOfItem(oItem);
            await this._setTableMerge([this._aTableLists[iTableIndex]]);

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
        },

        _bindTable: async function (sChannelId, sEventId, oData) {
            // DOM이 없는 경우 Return
            let oDom = this.getView().getDomRef();
            if (!oDom) return;

            // 새로운 검색 조건이 같은 경우 return
            oData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            let aKeys = Object.keys(oData);
            let isDiff = aKeys.find(sKey => oData[sKey] !== this._oSearchData[sKey]);
            if (!isDiff) return;

            // Select모델 다시 설정
            await this._setModel();

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

            // 새로운 검색 조건 저장
            this._oSearchData = oData;

            // 검색 파라미터
            this._setBusy(true);

            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");

            const oPlModel = this.getOwnerComponent().getModel("pl");

            let aBindingPath = [];

            let oSelectData = this.getView().getModel("selectModel").getData();
            if (oSelectData.find(oData => oData.sub_key === "org")) {   // 조직
                aBindingPath.push(`/get_actual_sale_org_pl(year='${iYear}',month='${sMonth}',org_id='${oData.orgId}')`);
            }

            if (oSelectData.find(oData => oData.sub_key === "org_delivery")) {  // Delivery 조직
                aBindingPath.push(`/get_actual_sale_org_pl(year='${iYear}',month='${sMonth}',org_id='${oData.orgId}',org_tp='delivery')`);
            }

            if (oSelectData.find(oData => oData.sub_key === "org_account")) {   // Account 조직
                aBindingPath.push(`/get_actual_sale_org_pl(year='${iYear}',month='${sMonth}',org_id='${oData.orgId}',org_tp='account')`);
            }

            aBindingPath.push(
                `/get_actual_sale_account_pl(year='${iYear}',month='${sMonth}',org_id='${oData.orgId}')`,   // Account
                `/get_actual_sale_relsco_pl(year='${iYear}',month='${sMonth}',org_id='${oData.orgId}')`,    // 대내/대외
            );


            // let sOverPath = `/get_actual_sale_crov_pl(year='${iYear}',month='${sMonth}',org_id='${oData.orgId}')`


            /* 한번 들고 온 Odata Model Session Storage Caching, 추후 적용할 것
            const sCachedOrg = sessionStorage.getItem("actual_sale_org_pl");
            const sCachedAccount = sessionStorage.getItem("actual_sale_account_pl");
            const sCachedTernal = sessionStorage.getItem("actual_sale_relsco_pl");
            const sCachedOver = sessionStorage.getItem("actual_sale_crov_pl");
            const sCachedOwn = sessionStorage.getItem("actual_sale_sub_company_pl");
            
            if (sCachedOrg && sCachedAccount && sCachedTernal && sCachedOver && sCachedOwn) {
                const oResults = [];

                oResults.push(JSON.parse(sCachedOrg));
                oResults.push(JSON.parse(sCachedAccount));
                oResults.push(JSON.parse(sCachedTernal));
                oResults.push(JSON.parse(sCachedOver));
                oResults.push(JSON.parse(sCachedOwn));

                this.getView().setModel(new JSONModel(oResults[0].value), "oOrgTableModel")
                this.getView().setModel(new JSONModel(oResults[1].value), "oAccountTableModel")
                this.getView().setModel(new JSONModel(oResults[2].value), "oTernalTableModel")
                this.getView().setModel(new JSONModel(oResults[3].value), "oOverTableModel")
                this.getView().setModel(new JSONModel(oResults[4].value), "oOwnTableModel")

                this._setVisibleRowCount(oResults);
            } else {
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

                    sessionStorage.setItem('actual_sale_org_pl', JSON.stringify(aResults[0]));
                    sessionStorage.setItem('actual_sale_account_pl', JSON.stringify(aResults[1]));
                    sessionStorage.setItem('actual_sale_relsco_pl', JSON.stringify(aResults[2]));
                    sessionStorage.setItem('actual_sale_crov_pl', JSON.stringify(aResults[3]));
                    sessionStorage.setItem('actual_sale_sub_company_pl', JSON.stringify(aResults[4]));
                }.bind(this));
            } */

            await Promise.all(
                aBindingPath.map(sPath => oPlModel.bindContext(sPath).requestObject()))
                .then((aResults) => {
                    // Empty 상태 설정 및 BindingPath를 테이블 변수 _sBindingPath로 설정
                    // 모델바인딩 (테이블 당 하나의 모델만 사용하므로 따로 view에 모델을 선언하지 않고 각 테이블에 JSONModel을 바인딩)
                    this._aTableLists.forEach((sTableId, index) => {
                        let oTable = this.byId(sTableId);
                        let oBox = oTable.getParent();

                        // Empty 상태 설정
                        Module.displayStatusForEmpty(oTable, aResults[index].value, oBox);

                        // _sBindingPath 설정
                        oTable._sBindingPath = aBindingPath[index];

                        // 테이블에 모델 바인딩
                        oTable.setModel(new JSONModel(aResults[index].value));
                    })

                    // 테이블 로우 셋팅
                    this._setVisibleRowCount(aResults);
                })
                .catch((oErr) => {
                    // 추후 호출 분리 필요
                    this._aTableLists.forEach((sTableId, index) => {
                        let oTable = this.byId(sTableId);
                        let oBox = oTable.getParent();
                        Module.displayStatus(oTable, oErr.error.code, oBox);
                    })
                });

            await this._setTableMerge(this._aTableLists);

            this._setBusy(false);
        },

        _setBusy: async function (bType) {
            // 모든 박스 setBusy 설정
            this._aTableLists.forEach(sTableId => {
                let oBox = this.byId(sTableId).getParent();
                oBox.setBusy(bType);
            })
        },

        _setVisibleRowCount: function (aResults) {
            for (let i = 0; i < this._aTableLists.length; i++) {
                // 테이블 아이디로 테이블 객체
                let oTable = this.byId(this._aTableLists[i])
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

        /**
         * 테이블의 첫 번째 행 변경 이벤트
         * @param {Event} oEvent 
         */
        onFirstVisibleRowChanged: function (oEvent) {
            // view에서 사용자가 선언한 테이블의 ID 반환
            let oTable = /** @type {Table} */ (oEvent.getSource());
            let sLocalId = this.getView().getLocalId(oTable.getId());

            // 첫 번째 행이 변경된 테이블만 필드 병합
            this._setTableMerge([sLocalId]);
        },

        /**
         * 테이블 병합
         * @param {Array} aTableList 병합할 테이블 이름 배열
         */
        _setTableMerge: async function (aTableList) {
            /* TableMerge 수정 250701 */
            for (let i = 0; i < aTableList.length; i++) {
                const oTable = this.byId(aTableList[i]);

                Module.setTableMergeWithAltColor(oTable);
            }
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

            this._excludeClick = false;

            // org_id, org_name 저장 (fallback으로 세션 데이터 사용)
            var oSessionData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            this._selectedOrgId = oRowData && oRowData.org_id ? oRowData.org_id : oSessionData.orgId;
            this._selectedOrgName = oRowData && oRowData.org_name ? oRowData.org_name : oSessionData.orgNm;
            this._selectedType = oRowData.type;

            // Account일 때
            this._selectedAccountCd = oRowData.account_id;
            this._selectedAccountNm = oRowData.account_nm;

            // 합계 클릭 금지 
            if (oRowData.org_name === "합계" || oRowData.account_nm === "합계") {
                this._excludeClick = true;
            }

            // 첫번째 열 클릭 금지
            if (result.cellInfo && result.cellInfo.columnIndex === 0) {
                this._excludeClick = true;
            }

            // org와 account만 우클릭 메뉴 AI Report 활성화
            let sKey = this.byId("detailSelect").getSelectedKey();
            if (!sKey.includes("org") && sKey !== "account") {
                if (result.cellInfo && result.cellInfo.columnIndex === 1) {
                    this._excludeClick = true;
                }
            }

        },

        /**
         * 테이블 행 선택 이벤트
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

            if (this._excludeClick) {
                return
            }

            // 분석 데이터 준비
            const oAnalysisData = this._prepareAnalysisData();

            // 현재 sub_Key 값으로 account 인지 확인
            let oSelect = this.byId("detailSelect");
            const sSelectedKey = oSelect.getSelectedKey()
            const aItems = oSelect.getItems();
            const oSelectedItem = aItems.find(item => item.getKey() === sSelectedKey);

            this._selectedSubTitle = oSelectedItem.getText();

            //aireport에서 불러들일 값을 sessionStorage에 저장
            sessionStorage.setItem("aiModel",
                JSON.stringify({
                    aiOrgId: this._selectedOrgId,
                    aiOrgName: this._selectedOrgName,
                    aiType: this._selectedType,
                    aiSubTitle: this._selectedSubTitle,
                    aiSubKey: oSelectedItem.getKey(),
                    aiAccountCd: this._selectedAccountCd,
                    aiAccountNm: this._selectedAccountNm,
                })
            )

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

            this._selectedSubTitle = oSelectedItem.getText();

            var params = {};
            var tokenData = {};

            if (oSelectedItem.getText() === "Account") {

                params = {
                    year: String(dYearMonth.getFullYear()),
                    month: String(dYearMonth.getMonth() + 1).padStart(2, "0"),
                    org_id: oSessionData.orgId,
                    account_cd: this._selectedOrgId
                };

                tokenData = {
                    yearMonth: dYearMonth,
                    orgName: this._selectedOrgName,
                    menuName: "매출/마진 상세",
                    type: this._selectedType,
                    subTitle: oSelectedItem.getText()
                };
            }
            else {
                params = {
                    year: String(dYearMonth.getFullYear()),
                    month: String(dYearMonth.getMonth() + 1).padStart(2, "0"),
                    org_id: this._selectedOrgId || oSessionData.orgId
                };

                tokenData = {
                    yearMonth: dYearMonth,
                    orgName: this._selectedOrgName || oSessionData.orgNm,
                    menuName: "매출/마진 상세",
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
            // 테이블에 바인딩된 _sBindingPath를 기반으로 함수명 반환
            const oTable = oEvent.getSource();
            let sBindingPath = oTable._sBindingPath;
            let func_nm = sBindingPath.split("/")[1].split("(")[0];

            // 1단계: 인터랙션 처리
            InteractionUtils.handleTableInteraction(this, oEvent, oTable.getId(), {
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
        onFormatInfoLabel: function (iValue1, iValue2, sType) {
            return Modules.infoLabelFormat(iValue1, iValue2, sType);
        },
    });
});