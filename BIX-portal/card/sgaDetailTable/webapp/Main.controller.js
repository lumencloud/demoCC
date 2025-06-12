sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/NumberFormat",
    "../../main/util/Module",
    "sap/ui/core/EventBus",
    "bix/common/library/customDialog/AiReport",
    "bix/test/ai/util/InteractionUtils",
    "bix/test/ai/service/AgentService",
    "sap/m/MessageBox"
], function (Controller, ODataModel, JSONModel, NumberFormat, Module, EventBus, AiReport, InteractionUtils, AgentService, MessageBox) {
    "use strict";

    return Controller.extend("bix.card.sgaDetailTable.Main", {
        _sTableId: "table",
        _oEventBus: EventBus.getInstance(),

        onInit: function () {
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);
            this.getView().setModel(new JSONModel({ visible: false }), "visibleModel");

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

            var oSessionData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            var dYearMonth = new Date(oSessionData.yearMonth);

            var params = {
                year: String(dYearMonth.getFullYear()),
                month: String(dYearMonth.getMonth() + 1).padStart(2, "0"),
                org_id: this._selectedOrgId || oSessionData.orgId
            };

            InteractionUtils.handleTableInteraction(this, oEvent, this._sTableId, {
                gridName: "SG&A 상세",
                viewName: "table",
                viewTitle: "SG&A 상세 테이블",
                storageType: "session",
                storageKey: "initSearchModel",
                selectedCell: this._lastClickedCellInfo,
                params: params,
                functionName: "get_actual_sga"
            }).then(function (result) {
                if (result && result.success) {
                    this._executeAIAnalysis(result.interactionData);
                } else {
                    console.error("우클릭 처리 실패:", result.error);
                    MessageBox.error("우클릭 처리 중 오류가 발생했습니다.");
                }
            }.bind(this));
        },

        /**
         * AI 분석 실행
         * @private
         */
        _executeAIAnalysis: function (interactionData) {
            AgentService.processInteraction(interactionData, {
                onProgress: function (progress) {
                    console.log("AI 분석 진행률:", progress + "%");
                }
            })
                .then(function (result) {
                    console.log("AI 분석 결과:", result);
                    this._processAnalysisResult(result);
                }.bind(this))
                .catch(function (error) {
                    console.error("AI 분석 오류:", error);
                    MessageBox.error("AI 분석 중 오류가 발생했습니다: " + (error.message || "알 수 없는 오류"));
                });
        },

        /**
         * 분석 결과 처리
         * @private
         */
        _processAnalysisResult: function (result) {
            try {
                // 문자열인 경우 JSON 파싱
                if (typeof result === 'string') {
                    result = JSON.parse(result);
                }

                this._lastAnalysisResult = result;

                // 에이전트 실행 결과가 있으면 팝업 표시
                if (result.agent_result) {
                    this._showAnalysisPopup(result.agent_result);
                } else {
                    // 에이전트 결과가 없는 경우 간단한 메시지
                    var selectedAgent = result.master_result?.selected_agent || "AI 에이전트";
                    MessageBox.show("Selected Agent: " + this._getAgentDisplayName(selectedAgent));
                }
            } catch (error) {
                console.error("결과 처리 오류:", error);
                MessageBox.error("결과 처리 중 오류가 발생했습니다.");
            }
        },

        /**
         * 분석 결과 팝업 표시
         * @private
         */
        _showAnalysisPopup: function(oAiResult) {
            try {
                // 데이터 추출
                let sAgentId = oAiResult.agent_id;
                let sAiContent = oAiResult.executive_summary;
                let sAiAgentName = this._getAgentDisplayName(sAgentId);
                
                // 토큰 데이터 준비
                let oTokenData = {};
                let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));
                
                if (oData) {
                    // 원본 Date 객체
                    oTokenData.yearMonth = new Date(oData.yearMonth);
                    
                    // 조직명
                    oTokenData.orgName =  this._selectedOrgName || oData.orgNm;
                    
                    // 메뉴명
                    oTokenData.menuName = "SG&A 상세";
                }
                
                // 기존 다이얼로그 정리
                if (this._oAiReportDialog) {
                    this._oAiReportDialog.destroy();
                    this._oAiReportDialog = null;
                }
        
                // AiReport 팝업 생성 및 열기
                this._oAiReportDialog = new AiReport({
                    cardName: "sgaDetailTable",
                    fragmentController: this,
                    aiAgentName: sAiAgentName,
                    aiContent: sAiContent || "분석 결과가 없습니다.",
                    tokenData: oTokenData
                });
                
                this._oAiReportDialog.open();
        
            } catch (error) {
                console.error("AI 팝업 생성 오류:", error);
            }
        },

        /**
         * 에이전트 정보 매핑 함수들
         */
        _getAgentDisplayName: function (agentId) {
            var agentMapping = {
                "general_qa_agent": "일반 질의 에이전트",
                "quick_answer_agent": "즉답형 에이전트",
                "navigator_agent": "네비게이터 에이전트",
                "report_agent": "리포트 에이전트",
                "visualization_agent": "시각화 에이전트"
            };
            return agentMapping[agentId] || agentId;
        },

        _getAgentIcon: function (agentId) {
            var iconMapping = {
                "general_qa_agent": "sap-icon://discussion-2",
                "quick_answer_agent": "sap-icon://responsive",
                "navigator_agent": "sap-icon://map-3",
                "report_agent": "sap-icon://generate-shortcut",
                "visualization_agent": "sap-icon://multi-select"
            };
            return iconMapping[agentId] || "sap-icon://robot";
        },

        _getAgentColor: function (agentId) {
            var colorMapping = {
                "general_qa_agent": "#6c5ce7",
                "quick_answer_agent": "#fdcb6e",
                "navigator_agent": "#00b894",
                "report_agent": "#e17055",
                "visualization_agent": "#0984e3"
            };
            return colorMapping[agentId] || "#00b894";
        },

        /**
         * 분석 내용 포맷팅
         * @private
         */
        _formatAnalysisContent: function (content) {
            if (!content) return "분석 결과가 없습니다.";

            return content
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/### (.*?) ###/g, '<h3 style="color: #333; margin: 1rem 0 0.5rem 0;">$1</h3>')
                .replace(/^- (.+)$/gm, '<li style="margin: 0.25rem 0;">$1</li>')
                .replace(/(<li.*<\/li>)/s, '<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">$1</ul>');
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
            }else if(oOrg.lv2_id === sOrgId){
                sSgaUrlFilter = `lv2_id in ('${sOrgId}') and `;
            }else if(oOrg.lv3_id === sOrgId){
                sSgaUrlFilter = `lv3_id in ('${sOrgId}') and `;
            }else if(oOrg.div_id === sOrgId){
                sOrgCate = 'hdqt_id';
                sOrgCateNm = 'hdqt_name';
                sSgaUrlFilter = `div_id in ('${sOrgId}') and `;
                sSgaUrlGroupBy = ['year', 'hdqt_id', 'hdqt_name'];
            }else if(oOrg.hdqt_id === sOrgId){
                sOrgCate = 'team_id';
                sOrgCateNm = 'team_name';
                sSgaUrlFilter = `hdqt_id in ('${sOrgId}') and `;
                sSgaUrlGroupBy = ['year', 'team_id', 'team_name'];
            }else{
                return;
            };

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
                actual_curr_ym_value: 0,
                actual_last_ym_value: 0,
                actual_ym_gap: 0,
                actual_curr_ym_rate: 0,
                actual_last_ym_rate: 0,
                actual_ym_rate_gap: 0
            };

            let aOrgResult = [];
            aCurrYSga.forEach(a => {
                const oLastYSga = aLastYSga.find(b => b[sOrgCate] === a[sOrgCate]);

                let o_labor = {
                    div_nm: a[sOrgCateNm],
                    div_id: a[sOrgCate],
                    type: 'LABOR',
                    actual_curr_ym_value: a?.['labor_sum'] ?? 0,
                    actual_last_ym_value: oLastYSga?.['labor_sum'] ?? 0,
                    actual_ym_gap: (a?.['labor_sum'] ?? 0) - (oLastYSga?.['labor_sum'] ?? 0),
                    actual_curr_ym_rate: 0,
                    actual_last_ym_rate: 0,
                    actual_ym_rate_gap: 0
                };
                let o_invest = {
                    div_nm: a[sOrgCateNm],
                    div_id: a[sOrgCate],
                    type: 'INVEST',
                    actual_curr_ym_value: a?.['iv_sum'] ?? 0,
                    actual_last_ym_value: oLastYSga?.['iv_sum'] ?? 0,
                    actual_ym_gap: (a?.['iv_sum'] ?? 0) - (oLastYSga?.['iv_sum'] ?? 0),
                    actual_curr_ym_rate: 0,
                    actual_last_ym_rate: 0,
                    actual_ym_rate_gap: 0
                };
                let o_expence = {
                    div_nm: a[sOrgCateNm],
                    div_id: a[sOrgCate],
                    type: 'EXPENSE',
                    actual_curr_ym_value: a?.['exp_sum'] ?? 0,
                    actual_last_ym_value: oLastYSga?.['exp_sum'] ?? 0,
                    actual_ym_gap: (a?.['exp_sum'] ?? 0) - (oLastYSga?.['exp_sum'] ?? 0),
                    actual_curr_ym_rate: 0,
                    actual_last_ym_rate: 0,
                    actual_ym_rate_gap: 0
                };

                if (a[sOrgCate]) {
                    aOrgResult.push(o_labor, o_invest, o_expence)
                };

                oSumLabor.actual_curr_ym_value += o_labor.actual_curr_ym_value ?? 0;
                oSumLabor.actual_last_ym_value += o_labor.actual_last_ym_value ?? 0;
                oSumLabor.actual_ym_gap += o_labor.actual_ym_gap ?? 0;

                oSumInvest.actual_curr_ym_value += o_invest.actual_curr_ym_value ?? 0;
                oSumInvest.actual_last_ym_value += o_invest.actual_last_ym_value ?? 0;
                oSumInvest.actual_ym_gap += o_invest.actual_ym_gap ?? 0;

                oSumExpence.actual_curr_ym_value += o_expence.actual_curr_ym_value ?? 0;
                oSumExpence.actual_last_ym_value += o_expence.actual_last_ym_value ?? 0;
                oSumExpence.actual_ym_gap += o_expence.actual_ym_gap ?? 0;
            })
            let aRes = [];
            aRes.push(oSumLabor, oSumInvest, oSumExpence, ...aOrgResult);

            this.getView().setModel(new JSONModel(aRes), "sgaDetailTreeTableModel");
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