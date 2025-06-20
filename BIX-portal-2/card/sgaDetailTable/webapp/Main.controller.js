sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/NumberFormat",
    "../../main/util/Module",
    "sap/ui/core/EventBus",
    "bix/common/ai/util/InteractionUtils",
    "bix/common/ai/service/AgentService",
    "bix/common/library/customDialog/AIPopupManager",
    "sap/m/MessageBox"
], function (Controller, ODataModel, JSONModel, NumberFormat, Module, EventBus, InteractionUtils, AgentService, AIPopupManager, MessageBox) {
//], function (Controller, ODataModel, JSONModel, NumberFormat, Module, EventBus, AiReport, InteractionUtils, AgentService, MessageBox) {
    "use strict";

    return Controller.extend("bix.card.sgaDetailTable.Main", {
        _sTableId: "table",
        _oEventBus: EventBus.getInstance(),
        _iColumnCount: null,

        onInit: function () {
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);
            this.getView().setModel(new JSONModel({ visible: false }), "visibleModel");

            // AI 팝업 매니저 초기화
            this._aiPopupManager = new AIPopupManager();

            // 테이블 이벤트 등록
            var oTable = this.byId(this._sTableId);
            if (oTable) {
                oTable.attachCellClick(this.onCellClick, this);
                oTable.attachCellContextmenu(this.onCellContextmenu, this);
            }

            this._bindTable();
        },

        /**
         * 셀 클릭 이벤트 핸들러
         */
        onCellClick: function (oEvent) {
            var result = InteractionUtils.processTableCellClick(this, oEvent, this._sTableId);
            this._lastClickedCellInfo = result.cellInfo;

            // 선택된 행의 org_id 추출
            var oTable = this.byId(this._sTableId);
            var iRowIndex = oEvent.getParameter("rowIndex");
            var oRowContext = oTable.getContextByIndex(iRowIndex);
            var oRowData = oRowContext ? oRowContext.getObject() : null;

            // org_id, org_nm 저장 (fallback으로 세션 데이터 사용)
            var oSessionData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            this._selectedOrgId = oRowData && oRowData.div_id ? oRowData.div_id : oSessionData.div_id;
            this._selectedOrgName = oRowData && oRowData.div_nm ? oRowData.div_nm : oSessionData.div_nm;
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
            
            // 팝업 표시 및 분석 ID 획득
            const sAnalysisId = this._aiPopupManager.showLoadingPopup(
                oAnalysisData.tokenData,
                "sgaDetailTable",
                this
            );

            // AI 분석 시작
            this._startAnalysis(oEvent, oAnalysisData.params, sAnalysisId);
        },

        /**
         * 분석 데이터 준비
         * @private
         */
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
                menuName: "SG&A 상세"
            };

            return { params, tokenData };
        },

        /**
         * AI 분석 시작
         * @private
         */
        _startAnalysis: function(oEvent, oParams, sAnalysisId) {
            // 1단계: 인터랙션 처리
            InteractionUtils.handleTableInteraction(this, oEvent, this._sTableId, {
                gridName: "SG&A 상세",
                viewName: "table",
                viewTitle: "SG&A 상세 테이블",
                storageType: "session",
                storageKey: "initSearchModel",
                selectedCell: this._lastClickedCellInfo,
                params: oParams,
                functionName: "get_actual_sga"
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
                    this._aiPopupManager.updateContent(sAnalysisId, {
                        aiAgentName: this._getAgentDisplayName(agentResult.agent_id),
                        aiContent: agentResult.executive_summary || "분석이 완료되었습니다.",
                        isLoading: false
                    });
                } else {
                    this._aiPopupManager.updateContent(sAnalysisId, {
                        aiAgentName: "AI 에이전트",
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
         * 에이전트 표시 이름 반환
         * @private
         */
        _getAgentDisplayName: function(agentId) {
            var agentMapping = {
                "general_qa_agent": "일반 질의 에이전트",
                "quick_answer_agent": "즉답형 에이전트",
                "navigator_agent": "네비게이터 에이전트",
                "report_agent": "리포트 에이전트",
                "visualization_agent": "시각화 에이전트"
            };
            return agentMapping[agentId] || agentId;
        },

        /**
         * 테이블 바인딩
         * @param {String} sChannelId 
         * @param {String} sEventId 
         * @param {Object} oData 
         */
        _bindTable: async function (sChannelId, sEventId, oData) {
            this.getView().setBusy(true);

            // 기존 handler 사용 로직
            // oData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            // // 파라미터
            // let dYearMonth = new Date(oData.yearMonth);
            // let iYear = dYearMonth.getFullYear();
            // let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            // let sOrgId = oData.orgId;
            // const oSgaModel = this.getOwnerComponent().getModel("sga");
            // const sBindingPath = `/get_actual_sga(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`;
            // const oBinding = oSgaModel.bindContext(sBindingPath);
            // let aResults = await oBinding.requestObject();
            // aResults = aResults.value;
            // this.getView().setModel(new JSONModel(aResults), "sgaDetailTreeTableModel");

            // odata 직접 호출 로직 구성.
            await this._callDataSgaTable();

            // 셀 병합
            let oTable = this.byId("table");
            Module.setTableMerge(oTable, "sgaDetailTreeTableModel", 1);
            
            this.getView().setBusy(false);
        },
        /**
         * odata 호출 및 데이터 구성
         */
        _callDataSgaTable: async function(){
            let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let iLastYear = dYearMonth.getFullYear() -1;
            let iMonth = dYearMonth.getMonth() + 1;
            let sOrgId = oData.orgId;

            //조직 정보 검색
            const oCmModel = this.getOwnerComponent().getModel("cm");
            const sOrgBindingPath = `/org_full_level`;
            const oOrgBinding = oCmModel.bindList(sOrgBindingPath, undefined, undefined, undefined, {
                $$updateGroupId: "Multilingual",
                $filter:`lv1_id in (${sOrgId}) or lv2_id in (${sOrgId}) or lv3_id in (${sOrgId}) or div_id in (${sOrgId}) or hdqt_id in (${sOrgId}) or team_id in (${sOrgId})&$top=1`
            });
            let oOrg = await oOrgBinding.requestContexts(0, Infinity);
            oOrg = oOrg[0].getObject();

            //검색용 변수 설정
            let sOrgCate = 'div_id';
            let sOrgCateNm = 'div_name';
            let sOrgCateCcorg = 'div_ccorg_cd';
            let sOrgLv;
            let sSgaUrlGroupBy = ['year', 'div_id', 'div_name'];
            let sSgaUrlFilter, sAggregate;

            //검색 컬럼 설정
            for(let i = 1 ; i <= iMonth ; i++){
                if(!sAggregate){
                    sAggregate = `iv_m${i}_amt with sum,exp_m${i}_amt with sum,labor_m${i}_amt with sum`
                }else{
                    sAggregate += `,iv_m${i}_amt with sum,exp_m${i}_amt with sum,labor_m${i}_amt with sum`
                };
            };

            //검색 변수 설정
            if(oOrg.lv1_id === sOrgId){
                sSgaUrlFilter = `lv1_id in ('${sOrgId}') and `;
                sOrgLv = 'lv1_id';
            }else if(oOrg.lv2_id === sOrgId){
                sSgaUrlFilter = `lv2_id in ('${sOrgId}') and `;
                sOrgLv = 'lv2_id';
            }else if(oOrg.lv3_id === sOrgId){
                sSgaUrlFilter = `lv3_id in ('${sOrgId}') and `;
                sOrgLv = 'lv3_id';
            }else if(oOrg.div_id === sOrgId){
                sOrgCate = 'hdqt_id';
                sOrgCateNm = 'hdqt_name';
                sOrgCateCcorg = 'hdqt_ccorg_cd';
                sSgaUrlFilter = `div_id in ('${sOrgId}') and `;
                sSgaUrlGroupBy = ['year', 'hdqt_id', 'hdqt_name'];
                sOrgLv = 'div_id';
            }else if(oOrg.hdqt_id === sOrgId){
                sOrgCate = 'team_id';
                sOrgCateNm = 'team_name';
                sOrgCateCcorg = 'team_ccorg_cd';
                sSgaUrlFilter = `hdqt_id in ('${sOrgId}') and `;
                sSgaUrlGroupBy = ['year', 'team_id', 'team_name'];
                sOrgLv = 'hdqt_id';
            }else{
                return;
            };
            let sOrgCcorg = sOrgLv.split('_',1) + '_ccorg_cd';
            let sOrgCcorgVal = oOrg[sOrgCcorg];

            const oOrgBinding2 = oCmModel.bindList(sOrgBindingPath, undefined, undefined, undefined, {
                $$updateGroupId: "Multilingual",
                $filter:`${sOrgLv} eq ${sOrgId}`,
                $orderby:'org_order'
            });
            let oOrg2 = await oOrgBinding2.requestContexts(0, Infinity);

            //조직 리스트
            let org_list = [];
            oOrg2.forEach(data=>{
                if(!org_list.find(data2=>data2.id === data.getObject()[sOrgCate]) && data.getObject()[sOrgCate]){
                    let oTemp = {
                        id : data.getObject()[sOrgCate],
                        name : data.getObject()[sOrgCateNm],
                        ccorg : data.getObject()[sOrgCateCcorg],
                        org_order : data.getObject()['org_order']
                    };
                    org_list.push(oTemp);
                };
            });

            const sTargetBindingPath = `/org_target_sum_view`;
            let oCurrTargetEnt={}, oLastTargetEnt={};
            if(sOrgLv === 'lv1_id'){
                const oTargetBinding = oCmModel.bindList(sTargetBindingPath, undefined, undefined, undefined, {
                    $$updateGroupId: "Multilingual",
                    $filter:`total eq true and target_year in ('${iYear}','${iLastYear}')`
                });
                let oTargetEnt = await oTargetBinding.requestContexts(0, Infinity);
                oTargetEnt.forEach(data=>{
                    data = data.getObject();
                    if(data.target_year === iYear.toString()){
                        oCurrTargetEnt = data;
                    }else if(data.target_year === iLastYear.toString()){
                        oLastTargetEnt = data;
                    };
                });
            };

            let sApplyStr;
            if(sOrgLv === 'lv1_id' || sOrgLv === 'lv2_id' || sOrgLv === 'lv3_id'){
                sApplyStr = `filter(total eq false and target_year in ('${iYear}','${iLastYear}') and ${sOrgCcorg} eq '${sOrgCcorgVal}' and div_ccorg_cd ne null and hdqt_ccorg_cd eq null)/groupby((org_id,target_year,org_name,labor_target_amt,invest_target_amt,expense_target_amt))`;
            }else{
                sApplyStr = `filter(total eq false and target_year in ('${iYear}','${iLastYear}') and ${sOrgCcorg} eq '${sOrgCcorgVal}')/groupby((org_id,target_year,org_name,labor_target_amt,invest_target_amt,expense_target_amt))`;
            }
            const oTargetBinding = oCmModel.bindList(sTargetBindingPath, undefined, undefined, undefined, {
                $$updateGroupId: "Multilingual",
                $apply:sApplyStr
            });
            let oTarget = await oTargetBinding.requestContexts(0, Infinity);

            let aTargetData = [];
            oTarget.forEach(data=>{
                aTargetData.push(data.getObject());
            })

            // aTargetData 결과 값 flat 하게 데이터 구성
            let flat_target = aTargetData.reduce((acc, item) =>{
                let main = item['org_id'];
                let sub = item['target_year'];
                let rest = {...item};
                delete rest['org_id'];
                delete rest['target_year'];
                Object.entries(rest).forEach(([key, value])=>{
                    acc[`_${main}_${sub}_${key}`] = value;
                });
                return acc;
            }, {});

            //sga 데이터 호출
            const oSgaModel = this.getOwnerComponent().getModel("sga");
            const sBindingPath = `/sga_wideview`;
            const oBinding = oSgaModel.bindList(sBindingPath, undefined, undefined, undefined, {
                $$updateGroupId: "Multilingual",
                $apply:`filter(${sSgaUrlFilter}shared_exp_yn eq false and year in ('${iYear}','${iLastYear}'))/groupby((${sSgaUrlGroupBy}),aggregate(${sAggregate})/orderby(${sOrgCate}))`
            });
            let oSag = await oBinding.requestContexts(0, Infinity);

            //sga 데이터 가공
            let aCurrYSga = [];
            let aLastYSga = [];
            oSag.forEach(data => {
                data = data.getObject();
                if (data.year === iYear.toString()) {
                    data.labor_sum = 0;
                    data.iv_sum = 0;
                    data.exp_sum = 0;

                    for(let i = 1 ; i <= iMonth ; i++){
                        data.labor_sum += data[`labor_m${i}_amt`] ?? 0;
                        data.iv_sum += data[`iv_m${i}_amt`] ?? 0;
                        data.exp_sum += data[`exp_m${i}_amt`] ?? 0;
                    };

                    aCurrYSga.push(data);
                } else if (data.year === iLastYear.toString()){
                    data.labor_sum = 0;
                    data.iv_sum = 0;
                    data.exp_sum = 0;

                    for(let i = 1 ; i <= iMonth ; i++){
                        data.labor_sum += data[`labor_m${i}_amt`] ?? 0;
                        data.iv_sum += data[`iv_m${i}_amt`] ?? 0;
                        data.exp_sum += data[`exp_m${i}_amt`] ?? 0;
                    };

                    aLastYSga.push(data);
                };
            });

            let oSumLabor = {
                div_nm: '합계',
                div_id: sOrgId,
                type: 'LABOR',
                actual_curr_y_target: sOrgLv === 'lv1_id' ? Number((oCurrTargetEnt?.labor_target_amt ?? 0)) : sOrgLv === 'div_id' || sOrgLv === 'hdqt_id' ? Number((flat_target?.[`_${sOrgId}_${iYear}_labor_target_amt`] ?? 0)) : 0,
                actual_curr_ym_value: 0,
                actual_last_ym_value: 0,
                actual_ym_gap: 0,
                actual_curr_ym_rate: 0,
                actual_last_ym_rate: 0,
                actual_ym_rate_gap: 0
            };
            let oSumInvest = {
                div_nm: '합계',
                div_id: sOrgId,
                type: 'INVEST',
                actual_curr_y_target: sOrgLv === 'lv1_id' ? Number((oCurrTargetEnt?.invest_target_amt ?? 0)) : sOrgLv === 'div_id' || sOrgLv === 'hdqt_id' ? Number((flat_target?.[`_${sOrgId}_${iYear}_invest_target_amt`] ?? 0)) : 0,
                actual_curr_ym_value: 0,
                actual_last_ym_value: 0,
                actual_ym_gap: 0,
                actual_curr_ym_rate: 0,
                actual_last_ym_rate: 0,
                actual_ym_rate_gap: 0
            };
            let oSumExpence = {
                div_nm: '합계',
                div_id: sOrgId,
                type: 'EXPENSE',
                actual_curr_y_target: sOrgLv === 'lv1_id' ? Number((oCurrTargetEnt?.expense_target_amt ?? 0)) : sOrgLv === 'div_id' || sOrgLv === 'hdqt_id' ? Number((flat_target?.[`_${sOrgId}_${iYear}_expense_target_amt`] ?? 0)) : 0,
                actual_curr_ym_value: 0,
                actual_last_ym_value: 0,
                actual_ym_gap: 0,
                actual_curr_ym_rate: 0,
                actual_last_ym_rate: 0,
                actual_ym_rate_gap: 0
            };

            let aOrgResult = [];
            org_list.forEach(data=>{
                const oCurrYSga = aCurrYSga.find(b => b[sOrgCate] === data.id);
                const oLastYSga = aLastYSga.find(b => b[sOrgCate] === data.id);

                let o_labor = {
                    div_nm: data.name,
                    div_id: data.id,
                    type: 'LABOR',
                    actual_curr_y_target: Number((flat_target?.[`_${data.id}_${iYear}_labor_target_amt`] ?? 0)),
                    actual_curr_ym_value: oCurrYSga?.['labor_sum'] ?? 0,
                    actual_last_ym_value: oLastYSga?.['labor_sum'] ?? 0,
                    actual_ym_gap: (oCurrYSga?.['labor_sum'] ?? 0) - (oLastYSga?.['labor_sum'] ?? 0),
                    actual_curr_ym_rate: Number((flat_target?.[`_${data.id}_${iYear}_labor_target_amt`] ?? 0)) === 0 ? 0 : (oCurrYSga?.['labor_sum'] ?? 0) / (Number((flat_target?.[`_${data.id}_${iYear}_labor_target_amt`] ?? 0))*100000000) * 100,
                    actual_last_ym_rate: Number((flat_target?.[`_${data.id}_${iLastYear}_labor_target_amt`] ?? 0)) === 0 ? 0 : (oLastYSga?.['labor_sum'] ?? 0) / (Number((flat_target?.[`_${data.id}_${iLastYear}_labor_target_amt`] ?? 0))*100000000) * 100,
                    actual_ym_rate_gap: (Number((flat_target?.[`_${data.id}_${iYear}_labor_target_amt`] ?? 0)) === 0 ? 0 : (oCurrYSga?.['labor_sum'] ?? 0) / (Number((flat_target?.[`_${data.id}_${iYear}_labor_target_amt`] ?? 0))*100000000) * 100) - (Number((flat_target?.[`_${data.id}_${iLastYear}_labor_target_amt`] ?? 0)) === 0 ? 0 : (oLastYSga?.['labor_sum'] ?? 0) / (Number((flat_target?.[`_${data.id}_${iLastYear}_labor_target_amt`] ?? 0))*100000000) * 100)
                };
                let o_invest = {
                    div_nm: data.name,
                    div_id: data.id,
                    type: 'INVEST',
                    actual_curr_y_target: Number((flat_target?.[`_${data.id}_${iYear}_invest_target_amt`] ?? 0)),
                    actual_curr_ym_value: oCurrYSga?.['iv_sum'] ?? 0,
                    actual_last_ym_value: oLastYSga?.['iv_sum'] ?? 0,
                    actual_ym_gap: (oCurrYSga?.['iv_sum'] ?? 0) - (oLastYSga?.['iv_sum'] ?? 0),
                    actual_curr_ym_rate: Number((flat_target?.[`_${data.id}_${iYear}_invest_target_amt`] ?? 0)) === 0 ? 0 : (oCurrYSga?.['iv_sum'] ?? 0) / (Number((flat_target?.[`_${data.id}_${iYear}_invest_target_amt`] ?? 0))*100000000) * 100,
                    actual_last_ym_rate: Number((flat_target?.[`_${data.id}_${iLastYear}_invest_target_amt`] ?? 0)) === 0 ? 0 : (oLastYSga?.['iv_sum'] ?? 0) / (Number((flat_target?.[`_${data.id}_${iLastYear}_invest_target_amt`] ?? 0))*100000000) * 100,
                    actual_ym_rate_gap: (Number((flat_target?.[`_${data.id}_${iYear}_invest_target_amt`] ?? 0)) === 0 ? 0 : (oCurrYSga?.['iv_sum'] ?? 0) / (Number((flat_target?.[`_${data.id}_${iYear}_invest_target_amt`] ?? 0))*100000000) * 100) - (Number((flat_target?.[`_${data.id}_${iLastYear}_invest_target_amt`] ?? 0)) === 0 ? 0 : (oLastYSga?.['iv_sum'] ?? 0) / (Number((flat_target?.[`_${data.id}_${iLastYear}_invest_target_amt`] ?? 0))*100000000) * 100)
                };
                let o_expence = {
                    div_nm: data.name,
                    div_id: data.id,
                    type: 'EXPENSE',
                    actual_curr_y_target: Number((flat_target?.[`_${data.id}_${iYear}_expense_target_amt`] ?? 0)),
                    actual_curr_ym_value: oCurrYSga?.['exp_sum'] ?? 0,
                    actual_last_ym_value: oLastYSga?.['exp_sum'] ?? 0,
                    actual_ym_gap: (oCurrYSga?.['exp_sum'] ?? 0) - (oLastYSga?.['exp_sum'] ?? 0),
                    actual_curr_ym_rate: Number((flat_target?.[`_${data.id}_${iYear}_expense_target_amt`] ?? 0)) === 0 ? 0 : (oCurrYSga?.['exp_sum'] ?? 0) / (Number((flat_target?.[`_${data.id}_${iYear}_expense_target_amt`] ?? 0))*100000000) * 100,
                    actual_last_ym_rate: Number((flat_target?.[`_${data.id}_${iLastYear}_expense_target_amt`] ?? 0)) === 0 ? 0 : (oLastYSga?.['exp_sum'] ?? 0) / (Number((flat_target?.[`_${data.id}_${iLastYear}_expense_target_amt`] ?? 0))*100000000) * 100,
                    actual_ym_rate_gap: (Number((flat_target?.[`_${data.id}_${iYear}_expense_target_amt`] ?? 0)) === 0 ? 0 : (oCurrYSga?.['exp_sum'] ?? 0) / (Number((flat_target?.[`_${data.id}_${iYear}_expense_target_amt`] ?? 0))*100000000) * 100) - (Number((flat_target?.[`_${data.id}_${iLastYear}_expense_target_amt`] ?? 0)) === 0 ? 0 : (oLastYSga?.['exp_sum'] ?? 0) / (Number((flat_target?.[`_${data.id}_${iLastYear}_expense_target_amt`] ?? 0))*100000000) * 100)
                };

                aOrgResult.push(o_labor, o_invest, o_expence)

                oSumLabor.actual_curr_ym_value += o_labor.actual_curr_ym_value ?? 0;
                oSumLabor.actual_last_ym_value += o_labor.actual_last_ym_value ?? 0;
                oSumLabor.actual_ym_gap += o_labor.actual_ym_gap ?? 0;

                oSumInvest.actual_curr_ym_value += o_invest.actual_curr_ym_value ?? 0;
                oSumInvest.actual_last_ym_value += o_invest.actual_last_ym_value ?? 0;
                oSumInvest.actual_ym_gap += o_invest.actual_ym_gap ?? 0;

                oSumExpence.actual_curr_ym_value += o_expence.actual_curr_ym_value ?? 0;
                oSumExpence.actual_last_ym_value += o_expence.actual_last_ym_value ?? 0;
                oSumExpence.actual_ym_gap += o_expence.actual_ym_gap ?? 0;
                
            });

            let iLastYearTotalTargetLabor=0, iLastYearTotalTargetInvest=0, iLastYearTotalTargetExpense=0;
            if(sOrgLv === 'lv2_id' || sOrgLv === 'lv3_id'){
                aTargetData.forEach(data => {
                    if(data.target_year === iYear.toString()){
                        oSumLabor.actual_curr_y_target += Number(data?.labor_target_amt ?? 0);
                        oSumInvest.actual_curr_y_target += Number(data?.invest_target_amt ?? 0);
                        oSumExpence.actual_curr_y_target += Number(data?.expense_target_amt ?? 0);
                    }else if(data.target_year === iLastYear.toString()){
                        iLastYearTotalTargetLabor += Number(data?.labor_target_amt ?? 0);
                        iLastYearTotalTargetInvest += Number(data?.invest_target_amt ?? 0);
                        iLastYearTotalTargetExpense += Number(data?.expense_target_amt ?? 0);
                    };
                });
            }else if(sOrgLv === 'lv1_id'){
                iLastYearTotalTargetLabor = Number(oLastTargetEnt?.labor_target_amt ?? 0);
                iLastYearTotalTargetInvest = Number(oLastTargetEnt?.invest_target_amt ?? 0);
                iLastYearTotalTargetExpense = Number(oLastTargetEnt?.expense_target_amt ?? 0);
            }else if(sOrgLv === 'div_id' || sOrgLv === 'hdqt_id'){
                iLastYearTotalTargetLabor = Number((flat_target?.[`_${sOrgId}_${iYear}_labor_target_amt`] ?? 0));
                iLastYearTotalTargetInvest = Number((flat_target?.[`_${sOrgId}_${iYear}_invest_target_amt`] ?? 0));
                iLastYearTotalTargetExpense = Number((flat_target?.[`_${sOrgId}_${iYear}_expense_target_amt`] ?? 0));
            };

            oSumLabor.actual_curr_ym_rate = oSumLabor.actual_curr_y_target === 0 ? 0 : oSumLabor.actual_curr_ym_value / (oSumLabor.actual_curr_y_target*100000000) * 100;
            oSumInvest.actual_curr_ym_rate = oSumInvest.actual_curr_y_target === 0 ? 0 : oSumInvest.actual_curr_ym_value / (oSumInvest.actual_curr_y_target*100000000) * 100;
            oSumExpence.actual_curr_ym_rate = oSumExpence.actual_curr_y_target === 0 ? 0 : oSumExpence.actual_curr_ym_value / (oSumExpence.actual_curr_y_target*100000000) * 100;

            oSumLabor.actual_last_ym_rate = iLastYearTotalTargetLabor === 0 ? 0 : oSumLabor.actual_last_ym_value / (iLastYearTotalTargetLabor*100000000) * 100;
            oSumInvest.actual_last_ym_rate = iLastYearTotalTargetInvest === 0 ? 0 : oSumInvest.actual_last_ym_value / (iLastYearTotalTargetInvest*100000000) * 100;
            oSumExpence.actual_last_ym_rate = iLastYearTotalTargetExpense === 0 ? 0 : oSumExpence.actual_last_ym_value / (iLastYearTotalTargetExpense*100000000) * 100;

            oSumLabor.actual_ym_rate_gap = oSumLabor.actual_curr_ym_rate - oSumLabor.actual_last_ym_rate;
            oSumInvest.actual_ym_rate_gap = oSumInvest.actual_curr_ym_rate - oSumInvest.actual_last_ym_rate;
            oSumExpence.actual_ym_rate_gap = oSumExpence.actual_curr_ym_rate - oSumExpence.actual_last_ym_rate;
            
            let aRes = [];
            aRes.push(oSumLabor, oSumInvest, oSumExpence, ...aOrgResult);
            
            this.getView().setModel(new JSONModel(aRes), "sgaDetailTreeTableModel");
            // 테이블 로우 셋팅
            this._setVisibleRowCount([aRes]);
        },

        _setVisibleRowCount: function (aResults){
            //테이블 리스트
            let aTableLists=["table"]
            
            for(let i =0; i<aTableLists.length; i++){
                // 테이블 아이디로 테이블 객체
                let oTable = this.byId(aTableLists[i])    
                // 처음 화면 렌더링시 table의 visibleCountMode auto 와 <FlexItemData growFactor="1"/>상태에서
                // 화면에 꽉 찬 테이블의 row 갯수를 전역변수에 저장하기 위함
                if(this._iColumnCount===null){
                    this._iColumnCount = oTable.getVisibleRowCount();
                }
                // 전역변수의 row 갯수 기준을 넘어가면 rowcountmode를 자동으로 하여 넘치는것을 방지
                // 전역변수의 row 갯수 기준 이하면 rowcountmode를 수동으로 하고, 각 데이터의 길이로 지정
                if(aResults[i].length > this._iColumnCount){
                    oTable.setVisibleRowCountMode("Auto")
                } else {
                    oTable.setVisibleRowCountMode("Fixed")
                    oTable.setVisibleRowCount(aResults[i].length)
                }
            }
        },

        /**
         * 첫 번째 행 변경 이벤트
         * @param {sap.ui.base.Event} oEvent 
         */
        onFirstVisibleRowChanged: function (oEvent) {
            let oTable = oEvent.getSource();
            Module.setTableMerge(oTable, "sgaDetailTreeTableModel", 1);
        },

        /**
         * 필드 Formatter
         * @param {*} iValue1 기본값
         * @param {*} iValue2 제할 값
         */
        onFormat: function (iValue1, iValue2, sType) {
            if (!iValue1) return;

            // iValue2가 있을 때 iValue2 - iValue1
            let iNewValue = (iValue2 && !isNaN(iValue2)) ? (iValue1 - iValue2) : iValue1;

            if (sType === "int") {
                // iNewValue = iNewValue >= 0 ? Math.floor(iNewValue / 100000000) : Math.ceil(iNewValue / 100000000);

                let oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2
                });

                return oNumberFormat.format(iNewValue / 100000000)// + "억";
            } else if (sType === "percent") {
                let oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2
                });

                return oNumberFormat.format(iNewValue) + "%";
            } else if (sType === "tooltip") {
                let oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });

                return oNumberFormat.format(iNewValue);
            };
        },

        /**
         * 필드 Formatter
         * @param {*} sValue 기본값
         */
        onFormatTypeText: function (sValue) {
            if (!sValue) return;

            let sNewValue;
            switch (sValue) {
                case "EXPENSE":
                    sNewValue = "경비"
                    break;
                case "INVEST":
                    sNewValue = "투자비"
                    break;
                case "LABOR":
                    sNewValue = "인건비"
                    break;
            }

            return sNewValue;
        },

        /**
         * SGA Detail 엑셀 다운로드
         */
        onExcelDownload: async function () {
            let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let iMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;

            // 데이터 반환
            const oSgaModel = this.getOwnerComponent().getModel("sga");
            const oSgaBindingContext = oSgaModel.bindContext(`/get_actual_sga_excel(year='${iYear}',month='${iMonth}',org_id='${sOrgId}')`);

            // Excel Workbook 생성
            const workbook = new ExcelJS.Workbook();

            await Promise.all([
                oSgaBindingContext.requestObject(),
            ]).then(function (aResult) {
                let fnSetWorksheet = function (sSheetName, aData) {
                    // Sheet 추가
                    const worksheet = workbook.addWorksheet(sSheetName);

                    // 컬럼 설정
                    let aColumns = [];
                    for (let sKey in aData[0]) {
                        let oColumn = {
                            key: sKey,
                            header: sKey,
                        };

                        aColumns.push(oColumn);
                    }

                    worksheet.columns = aColumns;

                    // 데이터 설정
                    for (let i = 0; i < aData.length; i++) {
                        worksheet.addRow(aData[i]);
                    }
                };

                fnSetWorksheet("SGA", aResult[0].value);
            }.bind(this));

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `SGA Detail Raw Data_${iYear}-${iMonth}.xlsx`;
            link.click();

            setTimeout(() => { URL.revokeObjectURL(url) }, 100);
        },
        onRowSelectionChange: function (oEvent) {
            let oData = oEvent.getParameters()["rowContext"].getObject();
            if (oData['type'] !== "LABOR") {
                this.getView().setModel(new JSONModel({ visible: true }), "visibleModel");
                let sType = oData['type'] === "INVEST" ? "inv" : "exp";
                this._SettingDetailTable(oData['div_id'], sType)
            } else {
                this.getView().setModel(new JSONModel({ visible: false }), "visibleModel");
            }
            let oTable = oEvent.getSource();
            Module.setTableMerge(oTable, "sgaDetailTreeTableModel", 1);
        },
        /**
         * Pl 대시보드 검색 이벤트
         * @param {String} sOrgId 
         */
        _SettingDetailTable: async function (sOrgId, sType) {
            this.getView().setBusy(true);

            // 기존 handler 호출 로직
            // let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            // // 파라미터
            // let dYearMonth = new Date(oData.yearMonth);
            // let iYear = dYearMonth.getFullYear();
            // let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            // if (!sOrgId) {
            //     sOrgId = oData.orgId;
            // }
            // // let sOrgId = oData.orgId;
            // // 테이블 바인딩
            // // type - exp:경비, inv-투자비
            // let sPath = `sga>/get_actual_sga_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='${sType}')`
            // let oTable = this.byId("actualSgaDetailTable");
            // oTable.bindRows({
            //     path: sPath,
            //     events: {
            //         dataRequested: function () {
            //             oTable.setBusy(true);
            //         }.bind(this),
            //         dataReceived: function () {
            //             oTable.setBusy(false);
            //         }.bind(this),
            //     }
            // })

            // odata 직접 호출 로직 구성.
            await this._callDataSgaDetailTable(sType, sOrgId);

            // console.log(oTable.getBinding("rows"));

            // 날짜 입력 값 받아 수정
            // let oTemp = { year: String(sYear).substring(2) };
            // this.getView().setModel(new JSONModel(oTemp), "tableYearModel");

            this.getView().setBusy(false);
        },

        /**
         * odata 호출 및 데이터 구성
         * @param {String} sType 
         * @param {String} sOrgId 
         */
        _callDataSgaDetailTable: async function(sType, sOrgId){
            // type - exp:경비, inv-투자비
            let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            if (!sOrgId) {
                sOrgId = oData.orgId;
            };

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let iLastYear = dYearMonth.getFullYear() -1;
            let iMonth = dYearMonth.getMonth() + 1;

            // 조직 정보 검색
            const oCmModel = this.getOwnerComponent().getModel("cm");
            const sOrgBindingPath = `/org_full_level`;
            const oOrgBinding = oCmModel.bindList(sOrgBindingPath, undefined, undefined, undefined, {
                $$updateGroupId: "Multilingual",
                $filter:`lv1_id in (${sOrgId}) or lv2_id in (${sOrgId}) or lv3_id in (${sOrgId}) or div_id in (${sOrgId}) or hdqt_id in (${sOrgId}) or team_id in (${sOrgId})&$top=1`
            });
            let oOrg = await oOrgBinding.requestContexts(0, Infinity);
            oOrg = oOrg[0].getObject();

            //인건비, 경비, 투자비 검색을 위한 변수 설정
            let sUrlFilter;
            if(oOrg.lv1_id === sOrgId){
                sUrlFilter = `lv1_id in ('${sOrgId}') and `;
            }else if(oOrg.lv2_id === sOrgId){
                sUrlFilter = `lv2_id in ('${sOrgId}') and `;
            }else if(oOrg.lv3_id === sOrgId){
                sUrlFilter = `lv3_id in ('${sOrgId}') and `;
            }else if(oOrg.div_id === sOrgId){
                sUrlFilter = `div_id in ('${sOrgId}') and `;
            }else if(oOrg.hdqt_id === sOrgId){
                sUrlFilter = `hdqt_id in ('${sOrgId}') and `;
            }else{
                return;
            };

            let aFirRes = [];
            let aList = [];
            let sCoulumNm; 
            const oSgaModel = this.getOwnerComponent().getModel("sga");
            
            //경비
            if(sType === 'exp'){
                //검색 컬럼 설정
                let sAggregate;
                for(let i = 1 ; i < 13 ; i++){
                    if(!sAggregate){
                        sAggregate = `exp_m${i}_amt with sum`
                    }else{
                        sAggregate += `,exp_m${i}_amt with sum`
                    };
                };

                // 경비 데이터 호출
                const sBindingPath = `/sga_expense`;
                const oBinding = oSgaModel.bindList(sBindingPath, undefined, undefined, undefined, {
                    $$updateGroupId: "Multilingual",
                    $apply:`filter(${sUrlFilter}shared_exp_yn eq false and year in ('${iYear}','${iLastYear}'))/groupby((year,description,commitment_item),aggregate(${sAggregate})/orderby(commitment_item,year))`
                });
                let oSag = await oBinding.requestContexts(0, Infinity);
                oSag.forEach(data=>{
                    aFirRes.push(data.getObject());
                });

                // 기초 데이터 가공 및 컬럼 이름 설정
                aFirRes.filter(data =>{
                    const exist = aList.some(list => list.id === data['commitment_item']);
                    if(!exist && data.description){
                        aList.push({id:data['commitment_item'], name:data['description']});
                    };
                });
                sCoulumNm = 'exp'; 
            //투자비
            }else if(sType === 'inv'){
                //검색 컬럼 설정
                let sAggregate;
                for(let i = 1 ; i < 13 ; i++){
                    if(!sAggregate){
                        sAggregate = `iv_cost_m${i}_amt with sum`
                    }else{
                        sAggregate += `,iv_cost_m${i}_amt with sum`
                    };
                };

                // 투자비 데이터 호출
                const sBindingPath = `/sga_investment`;
                const oBinding = oSgaModel.bindList(sBindingPath, undefined, undefined, undefined, {
                    $$updateGroupId: "Multilingual",
                    $apply:`filter(${sUrlFilter}year in ('${iYear}','${iLastYear}'))/groupby((year,description,commitment_item),aggregate(${sAggregate})/orderby(commitment_item,year))`
                });
                let oSag = await oBinding.requestContexts(0, Infinity);
                oSag.forEach(data=>{
                    aFirRes.push(data.getObject());
                });
                
                // 기초 데이터 가공 및 컬럼 이름 설정
                aFirRes.filter(data =>{
                    const exist = aList.some(list => list.id === data['commitment_item']);
                    if(!exist && data.description){
                        aList.push({id:data['commitment_item'], name:data['description']});
                    };
                });
                sCoulumNm = 'iv_cost'; 
            };

            //데이터 최종 가공
            let oCurrYResult={};
            let oLastYResult={};
            aFirRes.forEach(data => {
                if (data.year === iYear.toString()) {
                    if(!oCurrYResult[data.commitment_item]){
                        oCurrYResult[data.commitment_item] = [];
                    };
                    data.cost_curr_ym = 0;
                    data.cost_total_curr_y = 0;

                    for(let i = 1 ; i <= 12 ; i++){
                        data.cost_total_curr_y += data[sCoulumNm + `_m${i}_amt`] ?? 0;
                        if(i <= iMonth){
                            data.cost_curr_ym += data[sCoulumNm + `_m${i}_amt`] ?? 0;
                        };
                    };

                    oCurrYResult[data.commitment_item].push(data);
                } else if (data.year === iLastYear.toString()){
                    if(!oLastYResult[data.commitment_item]){
                        oLastYResult[data.commitment_item] = [];
                    };
                    data.cost_last_ym = 0;

                    for(let i = 1 ; i <= iMonth ; i++){
                        data.cost_last_ym += data[sCoulumNm + `_m${i}_amt`] ?? 0;
                    };

                    oLastYResult[data.commitment_item].push(data);
                };
            });

            let aFinalData=[];
            aList.forEach(data=>{
                let cost_name = data.name;
                let cost_curr_ym = oCurrYResult?.[data.id]?.[0]?.cost_curr_ym ?? 0;
                let cost_last_ym = oLastYResult?.[data.id]?.[0]?.cost_last_ym ?? 0;
                let cost_total_curr_y = oCurrYResult?.[data.id]?.[0]?.cost_total_curr_y ?? 0;
                let cost_gap = (oCurrYResult?.[data.id]?.[0]?.cost_curr_ym ?? 0) - (oLastYResult?.[data.id]?.[0]?.cost_last_ym ?? 0);

                let oTemp = {
                    name : cost_name,
                    cost_curr_ym : cost_curr_ym,
                    cost_last_ym : cost_last_ym,
                    cost_total_curr_y : cost_total_curr_y,
                    cost_gap : cost_gap
                };
                aFinalData.push(oTemp);
            });
            this.getView().setModel(new JSONModel(aFinalData), "sgaDetailTableModel");
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
                let aMultiLabels = oColumn.getAggregation("multiLabels");
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
                            if (aHeaderRow[i][j - 1].getDomRef().classList.contains("custom-table-emphasis-col-color")) {
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
         * 필드 Formatter
         * @param {*} iValue1 기본값
         */
        onFormatPerformance: function (iValue1, sTooltip) {
            // 값이 없을 때 return
            if (!iValue1) return;

            if (sTooltip === "tooltip") {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iValue1);
            } else {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });
                return oNumberFormat.format(iValue1 / 100000000)// + "억";
            };
        },
    });
});