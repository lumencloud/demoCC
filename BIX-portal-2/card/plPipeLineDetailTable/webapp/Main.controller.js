
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/core/format/NumberFormat",
    "bix/common/ai/util/InteractionUtils",
    "bix/common/ai/service/AgentService",
    "sap/m/MessageBox"
], function (Controller, EventBus, JSONModel, Module, NumberFormat, InteractionUtils, AgentService, MessageBox) {
    "use strict";

    return Controller.extend("bix.card.plPipeLineDetailTable.Main", {
        _sTableId: "plPipeLineDetailTable",
        _oEventBus: EventBus.getInstance(),
        _sMyKeyword: "월",

        onInit: function () {
            // 테이블에 셀 클릭 이벤트 등록
            var oTable = this.byId(this._sTableId);

            if (oTable) {
                oTable.attachCellClick(this.onCellClick, this);

                oTable.attachCellContextmenu(this.onCellContextmenu, this);
            }

            // 기본 테이블 셋팅   
            this._bindTable();
            // select 칸 셋팅
            this._selectDataSetting();
        },

        onChange: async function (oEvent) {            
            this._sMyKeyword = oEvent.getSource().getSelectedKey();
            this._bindTable();            
        },

        /**
         * 셀 클릭 이벤트 핸들러
         * @param {Event} oEvent
         */
        onCellClick: function(oEvent) {
            var result = InteractionUtils.processTableCellClick(this, oEvent, this._sTableId);     
            this._lastClickedCellInfo = result.cellInfo;
        },

        /**
         * 셀 우클릭 이벤트 핸들러 - AI 분석 실행
         * @param {Event} oEvent 
         */
        onCellContextmenu: function(oEvent) {
            oEvent.preventDefault();
            
            InteractionUtils.handleTableInteraction(this, oEvent, this._sTableId, {
                gridName: "Pipeline 상세",
                viewName: "plPipeLineDetailTable", 
                viewTitle: "Pipeline 상세 테이블",
                storageType: "session",
                storageKey: "initSearchModel",                
                selectedCell: this._lastClickedCellInfo
            }).then(function(result) {
                if (result && result.success) {
                    console.log("우클릭 처리 성공:", result);
                    
                    // AI 분석 실행
                    AgentService.processInteraction(result.interactionData, {
                        onProgress: function (progress) {
                            console.log("AI 분석 진행률:", progress + "%");
                        }
                    })
                    .then(function (analysisResult) {
                        console.log("AI 분석 결과:", analysisResult);
                        this._processResult(analysisResult);
                    }.bind(this))
                    .catch(function (error) {
                        console.error("AI 분석 오류:", error);
                        MessageBox.error("AI 분석 중 오류가 발생했습니다: " +
                            (error.message || "알 수 없는 오류"));
                    });
                    
                }
                else {
                    console.error("우클릭 처리 실패:", result.error);
                    MessageBox.error("우클릭 처리 중 오류가 발생했습니다.");
                }
            }.bind(this));
        },

        // 결과 처리 로직 (기존과 동일)
        _processResult: function (result) {
            try {
                console.log("최종 결과:", result);
                if (typeof result === 'string') {
                    try {
                        result = JSON.parse(result);
                        console.log("파싱된 JSON:", result);
                    } catch (parseError) {
                        console.warn("JSON 파싱 실패, 원본 문자열 사용:", parseError);
                    }
                }

                var masterAgent = result.master_result;
                var selectedAgent = masterAgent.selected_agent;
                var selectedAgentReasoning = masterAgent.reasoning;

                // 에이전트 실행 결과가 있는 경우 처리
                if (result.agent_result) {
                    // 분석 결과를 팝업으로 표시
                    this._showAnalysisPopup(result.agent_result);
                    MessageBox.show(selectedAgent + ":" + selectedAgentReasoning);
                }
                else {
                    MessageBox.show("Selected Agent: " + selectedAgent);
                }
            } catch (e) {
                console.error("결과 처리 오류:", e);
                MessageBox.show("결과 처리 중 오류 발생");
            }
        },

        // 분석 결과 팝업 표시 메서드 (기존과 동일)
        _showAnalysisPopup: function (agentResult) {
            // 이미 팝업이 있으면 닫기
            if (this._oAnalysisPopup) {
                this._oAnalysisPopup.close();
                this._oAnalysisPopup.destroy();
                this._oAnalysisPopup = null;
            }

            // 분석 결과 확인
            var analysisContent = agentResult.analysis || agentResult.executive_summary || "";

            // 새 팝업 생성
            this._oAnalysisPopup = new sap.m.Dialog({
                title: "SG&A 분석 결과",
                contentWidth: "60%",
                contentHeight: "60%",
                resizable: true,
                draggable: true,
                content: new sap.m.TextArea({
                    value: analysisContent,
                    editable: false,
                    growing: true,
                    width: "100%",
                    height: "100%"
                }),
                beginButton: new sap.m.Button({
                    text: "Close",
                    press: function () {
                        this._oAnalysisPopup.close();
                    }.bind(this)
                }),
                endButton: new sap.m.Button({
                    text: "View Full Analysis",
                    visible: !!(agentResult.full_analysis || agentResult.detailed_analysis),
                    press: function () {
                        var fullContent = agentResult.full_analysis || agentResult.detailed_analysis;
                        this._showFullAnalysis(fullContent);
                    }.bind(this)
                })
            });

            // 팝업에 CSS 클래스 추가
            this._oAnalysisPopup.addStyleClass("sapUiContentPadding");

            // 팝업 열기
            this._oAnalysisPopup.open();
        },

        _selectDataSetting: function () {
            let oTemp1 = [{
                key: "월",
                value: "월 기준"
            }]
            this.getView().setModel(new JSONModel(oTemp1), "conditionSelect");
        },
        
        _bindTable: async function () {
            this.getView().setBusy(true);

            let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;

            let oModel = this.getView().getModel();

            // 테이블 바인딩
            let sPath = `/get_forecast_m_pl(year='${iYear}',org_id='${sOrgId}')`
            let oBinding = oModel.bindContext(sPath);
            let aResults = await oBinding.requestObject();
            this.getView().setModel(new JSONModel(aResults.value), "plPipeLineDetailTable");

            let oTable = this.byId(this._sTableId);

            //셀 병합            
            Module.setTableMerge(oTable, "plPipeLineDetailTable", 1);                        

            
            //컬럼 보이는 범위 설정(현재월 기준으로 1월 부터 현재월까지)
            let range;
            if(this._sMyKeyword == "월"){
                range = 12
            } 

            // visible 설정
            for(let i=0; i<12; i++){
                if(i<range){
                    oTable.getColumns()[i+3].setVisible(true)
                } else {
                    oTable.getColumns()[i+3].setVisible(false)
                }
                
            }

            this.getView().setBusy(false);
        },

        onFormatPerformance: function (sType, iValue1, iValue2, sTooltip) {
            // 값이 없을 때 return
            if (!iValue1) return;

            // iValue2가 있을 때 iValue2 - iValue1
            let iNewValue = (iValue2 && !isNaN(iValue2)) ? (iValue1 - iValue2) : iValue1;

            if (sTooltip === "percent") {
               
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });

                return oNumberFormat.format(iNewValue) + "%";
            } else if (sType === "수주 건수" || sType === "매출 건수") {
               
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 0,
                });

                return oNumberFormat.format(iNewValue) + "건";
            } 
            else if (sTooltip === "tooltip") {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iNewValue);
            } else {
                // iNewValue = iNewValue >= 0 ? Math.floor(iNewValue / 100000000) : Math.ceil(iNewValue / 100000000);

                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 0
                });
                
                return oNumberFormat.format(iNewValue/100000000)// + "억";
            };
        },

        /**
         * PL Pipeline Detail 엑셀 다운로드
         */
        onExcelDownload: async function () {
			let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let iMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;

            // 데이터 반환
            const oPlModel = this.getOwnerComponent().getModel();
            const oPlBindingContext = oPlModel.bindContext(`/get_forecast_m_pl_excel(year='${iYear}',org_id='${sOrgId}')`);

            // Excel Workbook 생성
            const workbook = new ExcelJS.Workbook();

            await Promise.all([
                oPlBindingContext.requestObject(),
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

                fnSetWorksheet("Pipeline", aResult[0].value);
            }.bind(this));

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `PL Pipeline Detail Raw Data_${iYear}-${iMonth}.xlsx`;
            link.click();

            setTimeout(() => { URL.revokeObjectURL(url) }, 100);
        },
    });
});