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
    return Controller.extend("bix.card.planPipelineOrgDetailTableAiReport.Main", {
        _aTableLists: ["pipeDetailTable1", "pipeDetailTable2", "pipeDetailTable3"],
        _aBoxLists: ["pipeDetailBox1"],

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
            // 초기 JSON 모델 설정
            // await this._setModel();
            //this._bindTable();
            
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);
            
            this._aiPopupManager = new AIPopupManager();
            
            
            this.byId("pipeDetailTable1").attachCellClick(this.onCellClick, this);
            this.byId("pipeDetailTable1").attachCellContextmenu(this.onCellContextmenu, this);
            this.byId("pipeDetailTable2").attachCellClick(this.onCellClick, this);
            this.byId("pipeDetailTable2").attachCellContextmenu(this.onCellContextmenu, this);
            this.byId("pipeDetailTable3").attachCellClick(this.onCellClick, this);
            this.byId("pipeDetailTable3").attachCellContextmenu(this.onCellContextmenu, this);
            
            this._asyncInit();

        },
        _asyncInit: async function () {
            // 테이블 바인딩
            this._bindTable();
        },


        /**
         * JSON 모델 설정
         */
        // _setModel: async function () {
        //     // 데이터 불러오기 전에 모든 테이블이 보여서 먼저 선언
        //     this.getView().setModel(new JSONModel({}), "uiModel");

        //     // 현재 해시를 기준으로 DB에서 Select에 들어갈 카드 정보를 불러옴
        //     let aHash = Modules.getHashArray();
        //     let sSelectPath = `/pl_content_view(page_path='${aHash[0]}',position='detail',grid_layout_info=null,detail_path='${aHash[2]}',detail_info='${aHash[3]}')/Set`;
        //     const oListBinding = this.getOwnerComponent().getModel("cm").bindList(sSelectPath, null, null, null, {
        //         $filter: `length(sub_key) gt 0`
        //     });
        //     let aSelectContexts = await oListBinding.requestContexts();
        //     let aSelectData = aSelectContexts.map(oContext => oContext.getObject());

        //     // 카드 정보를 selectModel로 설정 (sub_key, sub_text)
        //     this.getView().setModel(new JSONModel(aSelectData), "selectModel");
        // },

        /**
         * Select 변경 이벤트
         * @param {Event} oEvent 
         */
        onUiChange: async function (oEvent) {
            // 선택한 key로 화면에 보여줄 테이블을 결정
            let sKey = /** @type {Select} */ (oEvent.getSource()).getSelectedKey();
            let oUiModel = this.getView().getModel("uiModel");
            oUiModel.setProperty("/org_id", sKey);

            let oData = this.getView().getModel("tableModel").getData();

            let aMonth = oData[1].month.filter(pl => pl.org_id === sKey)
            let aDeal = oData[2].deal.filter(pl => pl.org_id === sKey)
            let aRodr = oData[3].rodr.filter(pl => pl.org_id === sKey)

            this.getView().setModel(new JSONModel(aMonth), "oMonthTableModel")
            this.getView().setModel(new JSONModel(aDeal), "oDealTableModel")
            this.getView().setModel(new JSONModel(aRodr), "oRodrTableModel")

            // 테이블 병합
            await this._setTableMerge();

            // 해시 마지막 배열을 sKey로 변경
            // let sCurrHash = HashChanger.getInstance().getHash();
            // let aHash = sCurrHash.split("/");
            // 
            // 배열 두 번 제거 (조직 ID, Select Key)
            // let sOrgId = aHash.pop();
            // aHash.pop();

            // // 배열 두 번 추가 (조직 ID, Select Key)
            // aHash.push(sKey);
            // aHash.push(sOrgId);

            // 해시 조합
            // aHash.push(sKey)
            // let sNewHash = aHash.join("/");
            // HashChanger.getInstance().setHash(sNewHash);

            // // PL에 detailSelect 해시 변경 EventBus 전송
            // this._oEventBus.publish("pl", "setHashModel", {system: true});
        },

        _setBusy: function (bFlag) {
            this._aBoxLists.forEach((sBoxId) => this.byId(sBoxId).setBusy(bFlag))
        },

        _bindTable: async function (sChannelId, sEventId, oData) {
            // DOM이 없는 경우 Return
            // let oDom = this.getView().getDomRef();
            // if (!oDom) return;

            // detailSelect 해시에 따른 Select 선택
            // let oSelect = this.byId("detailSelect");
            // let aHash = Modules.getHashArray();
            // let sDetailKey = aHash?.[4];
            // if (sDetailKey) {   // 해시가 있는 경우 Select 설정
            //     oSelect.setSelectedKey(sDetailKey);
            // } else {    // 없는 경우 첫 번째 Select 항목 선택
            //     let oFirstDetailKey = this.getView().getModel("selectModel").getProperty("/0/sub_key");
            //     oSelect.setSelectedKey(oFirstDetailKey);
            // }

            let oAiData = JSON.parse(sessionStorage.getItem("aiModel"))
            //기존에 선택된 테이블만 visible true
            this.byId(oAiData.aiTableId).setVisible(true);

            // 새로운 검색 조건이 같은 경우 return
            oData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            let aKeys = Object.keys(oData);
            let isDiff = aKeys.find(sKey => oData[sKey] !== this._oSearchData[sKey]);
            if (!isDiff) return;

            // 새로운 검색 조건 저장
            this._oSearchData = oData;

            // 검색 파라미터
            await this._setBusy(true);

            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");



            let sOrgId = oAiData.orgId;
            if(!oAiData.orgId){
                return
            }

            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            let sDealPath = `/get_forecast_pl_pipeline_org_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',ai_flag=true)`


            await Promise.all([
                oModel.bindContext(sDealPath).requestObject(),
            ]).then(function (aResults) {

                let oData = aResults[0].value[0]
                let aOrg = oData.org
                
                // let aMonth = oData.month
                // let aDeal = oData.deal
                // let aRodr = oData.rodr
                let aMonth = oData.month.filter(pl => pl.type === oAiData.type)
                let aDeal = oData.deal.filter(pl => pl.type === oAiData.type)
                let aRodr = oData.rodr.filter(pl => pl.type === oAiData.type)
                // totalData 추가해서 모델 바인딩
                this.getView().setModel(new JSONModel({ org_id: aOrg[0].org_id }), "uiModel");
                this.getView().setModel(new JSONModel(aResults[0].value), "tableModel");
                this.getView().setModel(new JSONModel(aOrg), 'selectModel');
                this.getView().setModel(new JSONModel(aMonth), "oMonthTableModel");
                this.getView().setModel(new JSONModel(aDeal), "oDealTableModel");
                this.getView().setModel(new JSONModel(aRodr), "oRodrTableModel");

                Module.displayStatusForEmpty(this.byId("pipeDetailTable1"), aMonth, this.byId("pipeDetailBox1"));
                Module.displayStatusForEmpty(this.byId("pipeDetailTable2"), aDeal, this.byId("pipeDetailBox1"));
                Module.displayStatusForEmpty(this.byId("pipeDetailTable3"), aRodr, this.byId("pipeDetailBox1"));

                this._dataLength = [aDeal.length, aMonth.length, aRodr.length];


                this._monthVisibleSetting(oData.month);

                //this._setTableMerge();
                this._setVisibleRowCount(aResults)

            }.bind(this)
            ).catch(function (oError) {
                console.log("데이터 로드 실패 ", oError);
                MessageToast.show("데이터 호출에 실패하였습니다.")
            }).finally(() => {
                this._setBusy(false);
            })
        },

        // _addTotalData: function (aResults) {
        //     aResults.forEach(
        //         function (oResult) {
        //             let not_secured_total =
        //                 oResult.lead_data +
        //                 oResult.identified_data +
        //                 oResult.validated_data +
        //                 oResult.qualified_data +
        //                 oResult.negotiated_data;

        //             oResult["not_secured_total"] = not_secured_total;
        //         }
        //     )

        //     this.getView().setModel(new JSONModel(aResults), "oDealTableModel")
        // },

        _setVisibleRowCount: function (aResults) {
            //테이블 리스트
            let aTableLists = this._aTableLists



            for (let i = 0; i < aTableLists.length; i++) {
                // 테이블 아이디로 테이블 객체
                let oTable = this.byId(aTableLists[i])

                // 처음 화면 렌더링시 table의 visibleCountMode auto 와 <FlexItemData growFactor="1"/>상태에서
                // 화면에 꽉 찬 테이블의 row 갯수를 전역변수에 저장하기 위함

                if (this._iColumnCount === null) {
                    this._iColumnCount = oTable.getVisibleRowCount();
                }
                // 전역변수의 row 갯수 기준을 넘어가면 rowcountmode를 자동으로 하여 넘치는것을 방지
                // 전역변수의 row 갯수 기준 이하면 rowcountmode를 수동으로 하고, 각 데이터의 길이로 지정
                if (aResults[0].value.length > this._iColumnCount) {

                    oTable.setVisibleRowCountMode("Auto")
                } else {
                    oTable.setVisibleRowCountMode("Fixed")
                    oTable.setVisibleRowCount(this._dataLength[i])
                }
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
            ////console.log(this.getView().getModel("oColumnsVisibleModel"))
            ////console.log(this.getView().getModel("oMonthTableModel"))
        },

        _setTableMerge: function () {

            Module.setTableMergeWithAltColor(this.byId("pipeDetailTable1"), "oDealTableModel");
            Module.setTableMergeWithAltColor(this.byId("pipeDetailTable2"), "oMonthTableModel");
            Module.setTableMergeWithAltColor(this.byId("pipeDetailTable3"), "oRodrTableModel");

            // let oTable1 = this.byId("pipeDetailTable1")
            // let oTable2 = this.byId("pipeDetailTable2")
            // let oTable3 = this.byId("pipeDetailTable3")

            // if (oTable1 && !oTable1?.mEventRegistry?.cellContextmenu) {
            //     oTable1.attachCellClick(this.onCellClick, this);
            //     oTable1.attachCellContextmenu(this.onCellContextmenu, this);
            // }
            // if (oTable2 && !oTable2?.mEventRegistry?.cellContextmenu) {
            //     oTable2.attachCellClick(this.onCellClick, this);
            //     oTable2.attachCellContextmenu(this.onCellContextmenu, this);
            // }
            // if (oTable3 && !oTable3?.mEventRegistry?.cellContextmenu) {
            //     oTable3.attachCellClick(this.onCellClick, this);
            //     oTable3.attachCellContextmenu(this.onCellContextmenu, this);
            // }

            // Module.setTableMergeWithAltColor(oTable1, "oDealTableModel");
            // Module.setTableMergeWithAltColor(oTable2, "oMonthTableModel");
            // Module.setTableMergeWithAltColor(oTable3, "oRodrTableModel");
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

            // org_id, org_name 저장 (fallback으로 세션 데이터 사용)
            var oSessionData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            this._selectedOrgId = oRowData && oRowData.org_id ? oRowData.org_id : oSessionData.org_id;
            this._selectedOrgName = oRowData && oRowData.org_name ? oRowData.org_name : oSessionData.org_name;


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

            //const table_id = oEvent.getSource().getId();

            let oAiData = JSON.parse(sessionStorage.getItem("aiModel"))

            //aireport에서 불러들일 값을 sessionStorage에 저장
            sessionStorage.setItem("aiModel",
                JSON.stringify({
                    orgId: this._selectedOrgId,
                    orgNm: this._selectedOrgName,
                    type: oAiData.type,
                    subTitle: oAiData.subTitle,
                    aiTableId: oAiData.aiTableId,
                    aiTableName: oAiData.aiTableName
                })
            )

            // 팝업 표시 및 분석 ID 획득
            const sAnalysisId = this._aiPopupManager.showLoadingPopup(
                oAnalysisData.tokenData,
                "planPipelineOrgDetailTableAiReport",
                this
            );

            // AI 분석 시작
            //this._startAnalysis(oEvent, oAnalysisData.params, sAnalysisId);
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
                orgName: this._selectedOrgName,
                menuName: "부문 Pipeline 상세",
                type: oAiData.type,
                subTitle: oAiData.aiTableName
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
                gridName: "부문 Pipeline 상세",
                viewName: "table",
                viewTitle: "부문 Pipeline 상세 테이블",
                storageType: "session",
                storageKey: "initSearchModel",
                selectedCell: this._lastClickedCellInfo,
                params: oParams,
                functionName: "get_forecast_pl_pipeline_org_detail"
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