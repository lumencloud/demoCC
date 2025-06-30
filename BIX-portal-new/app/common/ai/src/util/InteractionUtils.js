sap.ui.define([], function() {
    "use strict";
    
    /**
     * 인터랙션 유틸리티 - UI 인터랙션 데이터를 수집하고 기록하는 유틸리티
     * 
     * 주요 기능:
     * 1. 이벤트로부터 인터랙션 데이터 생성
     * 2. 컨텍스트 정보 수집
     * 3. 인터랙션 기록
     */
    return {
        // ===== 1. 핵심 API =====

        /**
         * 세션 스토리지에서 인터랙션 관련 데이터를 가져오기
         * 
         * @param {string} [storageKey="initSearchModel"] - 세션 스토리지 키
         * @returns {Object} 파싱된 세션 스토리지 데이터 객체 (데이터가 없거나 오류 시 빈 객체 반환)
         */
        getSessionData: function(storageKey) {
            try {
                return JSON.parse(sessionStorage.getItem(storageKey || "initSearchModel")) || {};
            } catch (e) {
                console.error("세션 스토리지 접근 오류:", e);
                return {};
            }
        },
        
        /**
         * 인터랙션 모델을 가져오거나 없는 경우 새로 생성
         * 인터랙션 이력과 마지막 인터랙션 정보를 관리하는 전역 모델
         * 
         * @returns {sap.ui.model.json.JSONModel} 인터랙션 데이터를 저장하는 JSON 모델
         */
        getInteractionModel: function() {
            var oInteractionModel = sap.ui.getCore().getModel("interactionModel");
            if (!oInteractionModel) {
                oInteractionModel = new sap.ui.model.json.JSONModel({
                    interactionHistory: [],
                    lastInteraction: null
                });
                sap.ui.getCore().setModel(oInteractionModel, "interactionModel");
            }
            return oInteractionModel;
        },

        /**
         * 이벤트 객체로부터 인터랙션 데이터 생성
         * 사용자 이벤트와 컨텍스트 정보를 구조화된 객체로 변환
         *
         * @param {sap.ui.base.Event} oEvent - UI 이벤트 객체
         * @param {sap.ui.model.json.JSONModel} [oModel] - 인터랙션 모델 (히스토리 관리용)
         * @param {Object} [additionalContext] - context에 추가할 분석 관련 정보
         * @param {Object} [additionalContext.analysisInfo] - 분석 컨텍스트 (조직, 기간 등)
         * @param {Object} [interactionExtras] - interaction에 직접 추가할 메타데이터
         * @param {string} [interactionExtras.description] - 사용자 액션에 대한 설명
         * @param {string} [interactionExtras.interactionType] - 인터랙션 세부 타입 ("right_click", "selection" 등) 
         * @returns {Object} 구조화된 인터랙션 데이터
         * @returns {Object} returns.interaction - 인터랙션 메타데이터
         * @returns {string} returns.interaction.type - 인터랙션 타입 ("grid_right_click", "button_click" 등)
         * @returns {string} returns.interaction.source - 이벤트 소스 컨트롤 ID
         * @returns {string} returns.interaction.sourceType - 소스 컨트롤 타입
         * @returns {string} returns.interaction.eventType - 이벤트 타입
         * @returns {string} returns.interaction.timestamp - 이벤트 발생 시각 (ISO 8601)
         * @returns {string} [returns.interaction.description] - 액션 설명
         * @returns {string} [returns.interaction.interactionType] - 세부 인터랙션 타입
         * @returns {Object} returns.context - 컨텍스트 정보
         * @returns {string} returns.context.currentView - 현재 뷰 이름
         * @returns {Object} [returns.context.analysisInfo] - 분석 관련 컨텍스트
         * @returns {Object} [returns.context.grid] - 그리드 관련 데이터
         * @returns {Object} [returns.context.previousInteraction] - 이전 인터랙션 정보
         */
        createInteractionDataFromEvent: function(oEvent, oModel, additionalContext, interactionExtras) {
            var oSource = oEvent.getSource();
            var eventType = oEvent.getId();
            var sourceType = oSource.getMetadata().getName();
            var interactionType = this._determineInteractionType(oSource, eventType);
            
            // 기본 인터랙션 데이터 구성
            var interactionData = {
                interaction: {
                    type: interactionType,
                    source: oSource.getId(),
                    sourceType: sourceType,
                    eventType: eventType,
                    timestamp: new Date().toISOString()
                },
                context: this._collectContextInfo(oEvent, interactionType, oModel)
            };

            // interaction에 추가 정보 병합
            if (interactionExtras) {
                Object.assign(interactionData.interaction, interactionExtras);
            }

            // 세션 스토리지에서 데이터 가져오기
            try {
                const storageData = sessionStorage.getItem("initSearchModel");
                if (storageData) {
                    const sessionData = JSON.parse(storageData);
                    
                    // grid 타입 데이터 추가
                    if (sessionData.grid) {
                        interactionData.context.grid = sessionData.grid;
                    }
                    
                    // chart 타입 데이터 추가
                    /*
                    if (sessionData.chart) {
                        interactionData.context.chart = sessionData.chart;
                    }
                    */
                    
                    // 추가 컨텍스트 정보가 있는 경우 (analysisInfo 등)
                    if (sessionData.analysisInfo) {
                        interactionData.context.analysisInfo = sessionData.analysisInfo;
                    }
                }
            } catch (e) {
                console.error("세션 데이터 파싱 오류:", e);
            }

            // 추가 컨텍스트가 있는 경우 (context에만 추가)
            if (additionalContext) {
                for (var key in additionalContext) {
                    interactionData.context[key] = additionalContext[key];
                }
            }
            
            return interactionData;
        },

        /**
         * 인터랙션 분석을 위한 컨텍스트 객체를 생성
         * 분석에 필요한 조직, 기간, 화면 정보 등을 구조화된 형태로 제공
         * 
         * @param {Object} options - 컨텍스트 생성 옵션
         * @param {string|Date} [options.yearMonth] - 분석 대상 연월 (문자열 또는 Date 객체)
         * @param {string} [options.orgId] - 조직 ID
         * @param {string} [options.orgNm] - 조직명
         * @param {string} [options.viewName] - 현재 뷰 이름
         * @param {string} [options.viewTitle] - 현재 화면 제목
         * @returns {Object} 분석용 컨텍스트 객체
         */
        createAnalysisContext: function(options) {
            options = options || {};
            const yearMonth = options.yearMonth;
            
            return {
                analysisInfo: {
                    yearMonth: yearMonth instanceof Date ? 
                        yearMonth.getFullYear() + "-" + String(yearMonth.getMonth() + 1).padStart(2, '0') : 
                        yearMonth,
                    organization: {
                        id: options.orgId,
                        name: options.orgNm
                    },
                    screenInfo: {
                        viewName: options.viewName || "",
                        viewTitle: options.viewTitle || ""
                    }
                }
            };
        },

        /**
         * 인터랙션 데이터 준비를 위한 통합 메서드
         * 세션 데이터 가져오기, 인터랙션 모델 접근, 컨텍스트 생성 및 인터랙션 데이터 생성을 한 번에 처리
         * 
         * @param {sap.ui.base.Event} oEvent - 인터랙션을 발생시킨 이벤트 객체
         * @param {Object} [options] - 데이터 준비 옵션
         * @param {string} [options.storageKey] - 세션 스토리지 키
         * @param {sap.ui.model.Model} [options.interactionModel] - 사용할 인터랙션 모델
         * @param {boolean} [options.includeAnalysisContext=true] - 분석 컨텍스트 포함 여부
         * @param {boolean} [options.recordInteraction=true] - 인터랙션 기록 여부
         * @param {string} [options.viewName] - 현재 뷰 이름
         * @param {string} [options.viewTitle] - 현재 화면 제목
         * @param {Object} [options.additionalContext] - 추가 컨텍스트 데이터
         * @returns {Object} 인터랙션 데이터와 세션 데이터를 포함하는 객체
         */
        prepareInteractionData: function(oEvent, options) {
            options = options || {};
            
            // 세션 데이터 가져오기
            const sessionData = this.getSessionData(options.storageKey);
            
            // 인터랙션 모델 가져오기
            const oInteractionModel = options.interactionModel || this.getInteractionModel();
            
            // 추가 컨텍스트 생성
            const additionalContext = this.createAnalysisContext({
                yearMonth: sessionData.yearMonth,
                orgId: sessionData.orgId,
                orgNm: sessionData.orgNm,
                viewName: options.viewName,
                viewTitle: options.viewTitle,
                description: options.description
            });
            
            // 인터랙션 데이터 생성
            const interactionData = this.createInteractionDataFromEvent(
                oEvent,
                oInteractionModel,
                additionalContext
            );
            
            // 인터랙션 기록
            if (options.recordInteraction !== false) {
                this.recordInteraction(interactionData, oInteractionModel);
            }
            
            return {
                interactionData: interactionData,
                sessionData: sessionData
            };
        },
        
        /**
         * 인터랙션 데이터를 모델에 기록
         * 인터랙션 이력을 관리하고 최근 인터랙션을 추적
         * 
         * @param {Object} interactionData - 기록할 인터랙션 데이터 객체
         * @param {sap.ui.model.Model} oModel - 인터랙션을 저장할 모델
         * @returns {void}
         */
        recordInteraction: function(interactionData, oModel) {
            if (!oModel) return;
            
            var history = oModel.getProperty("/interactionHistory") || [];
            history.push(interactionData);
            
            // 최대 10개까지만 유지
            if (history.length > 10) {
                history = history.slice(-10);
            }
            
            oModel.setProperty("/interactionHistory", history);
            oModel.setProperty("/lastInteraction", interactionData);
        },
        
        // ===== 2. 테이블/그리드 관련 =====
        
        /**
         * 테이블/그리드 행 선택 처리 및 상호작용 정보를 기록
         * 선택된 행 데이터를 수집하고 세션에 저장하며 인터랙션 기록을 생성
         * 
         * @param {sap.ui.core.mvc.Controller} oController - 현재 컨트롤러 인스턴스
         * @param {sap.ui.base.Event} oEvent - 행 선택 이벤트 객체
         * @param {string} tableId - 테이블/그리드의 ID
         * @param {Object} [options] - 처리 옵션
         * @param {string} [options.gridName] - 그리드 이름 (표시용)
         * @param {string} [options.itemProperty] - 선택된 항목의 주요 속성 이름
         * @param {string} [options.storageType='session'] - 저장 유형 ('session' 또는 'model')
         * @param {string} [options.storageKey='initSearchModel'] - 세션 스토리지 키
         * @param {Object} [options.selectedCell] - 선택된 셀 정보
         * @returns {Promise<boolean>} 처리 성공 여부
         */
        handleTableRowSelection: async function(oController, oEvent, tableId, options) {
            try {
                if (!oController || !oEvent || !tableId) {
                    console.error("필수 파라미터가 누락되었습니다");
                    return false;
                }
                
                options = options || {};
                const oTable = oController.byId(tableId);
                
                if (!oTable) {
                    console.error("테이블을 찾을 수 없음:", tableId);
                    return false;
                }
                
                const oContext = oEvent.getParameters()["rowContext"];
                const aSelectedIndices = oTable.getSelectedIndices();

                // 행 선택 시 처리
                if (aSelectedIndices.length > 0 && oContext) {
                    const oSelectedData = oContext.getObject();
                    
                    // 선택 정보 구성
                    const selectionData = {
                        id: tableId,
                        type: "grid",
                        selectedRow: JSON.stringify(oSelectedData),
                        selectedItem: this._getItemPropertyValue(oSelectedData, options),
                        selectedCell: options.selectedCell || null,
                        params: options.params || null,
                        functionName: options.functionName || null
                    };

                    // 그리드 전체 데이터 수집
                    await this._collectAndAddGridData(oTable, selectionData);
                    
                    // 컬럼 정보 수집
                    const aColumns = this._collectColumnsInfo(oTable);
                    if (aColumns && aColumns.length) {
                        selectionData.columns = aColumns;
                    }

                    // 선택 정보 저장 (세션 스토리지 또는 모델)
                    this._saveSelectionData(selectionData, options);
                    
                    // 인터랙션 기록
                    try {
                        // 세션 스토리지에서 값을 직접 사용하는 방식으로 변경
                        const interactionData = this.createInteractionDataFromEvent(oEvent);
                        
                        // interactionModel이 있는 경우에만 기록
                        const oInteractionModel = sap.ui.getCore().getModel("interactionModel");
                        if (oInteractionModel) {
                            this.recordInteraction(interactionData, oInteractionModel);
                        }
                    } catch (error) {
                        console.error("인터랙션 기록 오류:", error);
                    }
                    return true;
                }
                // 행 선택 해제 시 처리
                else if (aSelectedIndices.length === 0) {
                    this._clearSelectionData(options);
                    return true;
                }
                
                return false;
            } catch (error) {
                console.error("테이블 행 선택 처리 중 오류:", error);
                return false;
            }
        },
        
        /**
         * 테이블에서 셀 클릭 정보를 처리
         * 클릭된 셀의 행/열 인덱스와 선택 상태를 반환
         * 
         * @param {sap.ui.core.mvc.Controller} oController - 현재 컨트롤러 인스턴스
         * @param {sap.ui.base.Event} oEvent - 셀 클릭 이벤트 객체
         * @param {string} tableId - 테이블/그리드의 ID
         * @returns {Object|null} 셀 정보 객체 (정보 추출 실패 시 null)
         * @returns {Object} result.cellInfo - 셀 위치 정보 (rowIndex, columnIndex)
         * @returns {boolean} result.isRowSelected - 행 선택 여부
         */
        processTableCellClick: function(oController, oEvent, tableId) {
            try {
                // 기본 셀 정보 추출
                var rowIndex = -1;
                var columnIndex = -1;
                
                // 이벤트 파라미터에서 값 추출
                if (oEvent.getParameter("rowIndex") !== undefined) {
                    rowIndex = oEvent.getParameter("rowIndex");
                }
                if (oEvent.getParameter("columnIndex") !== undefined) {
                    columnIndex = oEvent.getParameter("columnIndex");
                }
                
                // 유효한 인덱스인지 확인
                if (rowIndex < 0 || columnIndex < 0) {
                    return null;
                }
                
                // 간단한 셀 정보 구성
                var cellInfo = {
                    rowIndex: rowIndex,
                    columnIndex: columnIndex
                };
                
                // 테이블에서 해당 행이 이미 선택되어 있는지 확인
                var oTable = oController.byId(tableId);
                if (!oTable) return null;
                
                var aSelectedIndices = oTable.getSelectedIndices();
                var isRowSelected = aSelectedIndices.indexOf(rowIndex) !== -1;
                
                return {
                    cellInfo: cellInfo,
                    isRowSelected: isRowSelected
                };
            } catch (error) {
                console.error("셀 클릭 처리 오류:", error);
                return null;
            }
        },

        /**
         * 테이블 인터랙션 처리 및 AI 분석용 데이터 준비
         * 
         * 테이블에서 발생하는 모든 인터랙션(행 선택, 우클릭 등)을 통합 처리
         * AI 분석에 필요한 완전한 인터랙션 데이터를 생성
         * 
         * @param {sap.ui.core.mvc.Controller} oController - 호출하는 컨트롤러 인스턴스
         * @param {sap.ui.base.Event} oEvent - 테이블 인터랙션 이벤트 객체
         * @param {string} tableId - 테이블의 ID
         * @param {Object} options - 처리 옵션
         * @param {string} [options.gridName] - 그리드 표시명 (예: "SG&A 현황 테이블")
         * @param {string} [options.viewName] - 뷰 이름 (예: "sgaDetailTable")
         * @param {string} [options.viewTitle] - 뷰 제목 (예: "SG&A 현황 테이블")
         * @param {string} [options.storageType="session"] - 저장소 타입 ("session" | "model")
         * @param {string} [options.storageKey="initSearchModel"] - 세션 스토리지 키
         * @param {string} [options.description] - 사용자 정의 액션 설명
         * @param {Object} [options.sekectedCell] - 선택된 셀 정보 (rowIndex, columnIndex)
         * @param {boolean} [options.recordInteraction=true] - 인터랙션 기록 여부
         * @returns {Promise<Object>} 처리 결과 객체
         * @returns {boolean} returns.success - 처리 성공 여부
         * @returns {Object} [returns.interactionData] - AI 분석용 완전한 인터랙션 데이터
         * @returns {boolean} [returns.cleared] - 선택 해제 처리 완료 (success=true인 경우)
         * @returns {string} [returns.error] - 오류 메시지 (success=false인 경우)
         */
        handleTableInteraction: async function(oController, oEvent, tableId, options) {
            try {
                if (!oController || !oEvent || !tableId) {
                    console.error("필수 파라미터가 누락되었습니다");
                    return { success: false };
                }
                
                options = options || {};
                const oTable = oController.byId(tableId);
                
                if (!oTable) {
                    console.error("테이블을 찾을 수 없음:", tableId);
                    return { success: false };
                }
                
                // 이벤트 타입 확인
                const eventType = oEvent.getId ? oEvent.getId() : "unknown";
                let oContext, iRowIndex;
                
                // 이벤트 타입에 따른 처리
                if (eventType === "cellContextmenu") {
                    // 우클릭 이벤트 처리
                    iRowIndex = oEvent.getParameter("rowIndex");
                    if (iRowIndex !== undefined && iRowIndex >= 0) {
                        oTable.setSelectedIndex(iRowIndex); // 시각적 피드백을 위한 행 선택
                        oContext = oTable.getContextByIndex(iRowIndex);
                    }
                }
                else {
                    // 일반 행 선택 이벤트 처리
                    oContext = oEvent.getParameters()["rowContext"];
                    
                    // rowContext가 없으면 rowIndex로 시도
                    if (!oContext) {
                        iRowIndex = oEvent.getParameter("rowIndex");
                        if (iRowIndex !== undefined && iRowIndex >= 0) {
                            oContext = oTable.getContextByIndex(iRowIndex);
                        }
                    }
                }
                
                const aSelectedIndices = oTable.getSelectedIndices();
                
                // 선택된 행이 있고 컨텍스트가 있는 경우 처리
                if (aSelectedIndices.length > 0 && oContext) {
                    const oSelectedData = oContext.getObject();
                    
                    // 기본 선택 데이터 구성
                    const selectionData = {
                        id: tableId,
                        type: "grid",
                        selectedRow: JSON.stringify(oSelectedData),
                        selectedItem: this._getItemPropertyValue(oSelectedData, options),
                        selectedCell: options.selectedCell || null,
                        params: options.params || null,
                        functionName: options.functionName || null
                        // interactionType: eventType === "cellContextmenu" ? "right_click" : "selection"
                    };
                    
                    // 그리드 전체 데이터 수집
                    await this._collectAndAddGridData(oTable, selectionData);
                    
                    // 컬럼 정보 수집
                    const aColumns = this._collectColumnsInfo(oTable);
                    if (aColumns && aColumns.length) {
                        selectionData.columns = aColumns;
                    }
                    
                    // 선택 정보 저장
                    this._saveSelectionData(selectionData, options);
                    
                    // 세션 데이터 가져오기
                    const sessionData = this.getSessionData(options.storageKey);
                    
                    // 인터랙션 모델 가져오기
                    const oInteractionModel = this.getInteractionModel();
                    
                    // 분석 컨텍스트 생성
                    const additionalContext = this.createAnalysisContext({
                        yearMonth: sessionData.yearMonth,
                        orgId: sessionData.orgId,
                        orgNm: sessionData.orgNm,
                        viewName: options.viewName,
                        viewTitle: options.viewTitle
                        // description: options.description || this._generateDefaultDescription(eventType, options.gridName, iRowIndex)
                    });

                    // interaction에 추가할 정보 구성
                    const interactionExtras = {
                        description: options.description || this._generateDefaultDescription(eventType, options.gridName, iRowIndex),
                        interactionType: eventType === "cellContextmenu" ? "right_click" : "selection"
                    };
                    
                    // 통합된 인터랙션 데이터 생성
                    const interactionData = this.createInteractionDataFromEvent(
                        oEvent,
                        oInteractionModel,
                        additionalContext,
                        interactionExtras
                    );
                    
                    // 인터랙션 기록
                    if (options.recordInteraction !== false) {
                        this.recordInteraction(interactionData, oInteractionModel);
                    }
                    
                    // 간소화된 결과 반환 (interactionData만)
                    return {
                        success: true,
                        interactionData: interactionData
                    };
                }
                // 행 선택 해제 시 처리
                else if (aSelectedIndices.length === 0) {
                    this._clearSelectionData(options);
                    return { success: true, cleared: true };
                }
                
                return { success: false };
            } catch (error) {
                console.error("테이블 인터랙션 처리 중 오류:", error);
                return {
                    success: false,
                    error: error.message
                };
            }
        },

        /**
         * 기본 설명 생성
         * @private
         */
        _generateDefaultDescription: function(eventType, gridName, rowIndex) {
            const tableText = gridName || "테이블";
            
            switch (eventType) {
                case "cellContextmenu":
                    return `${tableText}의 ${rowIndex + 1}번째 행을 우클릭하여 AI 분석 보고서를 요청했습니다.`;
                case "rowSelectionChange":
                    return `${tableText}에서 ${rowIndex + 1}번째 행을 선택하여 AI 분석 보고서를 요청했습니다.`;
                case "cellClick":
                    return `${tableText}의 셀을 클릭하여 AI 분석 보고서를 요청했습니다.`;
                default:
                    return `${tableText}에서 AI 분석 보고서를 요청했습니다.`;
            }
        },

        // ===== 3. 내부 구현 메서드 =====
        
        /**
         * 그리드 데이터 수집 및 선택 데이터에 추가
         * @private
         */
        _collectAndAddGridData: async function(oTable, selectionData) {
            try {
                const oBinding = this._getTableBinding(oTable);
                if (!oBinding) {
                    console.warn("테이블 바인딩을 찾을 수 없음");
                    return;
                }
                
                // OData V4 바인딩인지 확인
                const bIsODataV4 = oBinding.getMetadata().getName().indexOf("sap.ui.model.odata.v4") > -1;
                
                // 바인딩 유형에 따라 데이터 수집
                let aGridData = [];
                if (bIsODataV4) {
                    aGridData = await this._collectODataV4GridData(oBinding);
                }
                else {
                    aGridData = this._collectStandardGridData(oBinding);
                }
                
                // 수집된 데이터가 있으면 선택 데이터에 추가
                if (aGridData && aGridData.length > 0) {
                    selectionData.data = aGridData;
                }
            } catch (error) {
                console.error("그리드 데이터 수집 중 오류:", error);
            }
        },
        
        /**
         * OData V4 바인딩에서 그리드 데이터 수집
         * @private
         */
        _collectODataV4GridData: async function(oBinding) {
            try {
                const iLength = oBinding.getLength();
                
                if (iLength <= 0) {
                    return [];
                }
                
                // 모든 컨텍스트 요청
                const aContexts = await oBinding.requestContexts(0, iLength);
                
                // 각 컨텍스트에서 객체 추출
                const aData = [];
                for (let i = 0; i < aContexts.length; i++) {
                    if (aContexts[i]) {
                        try {
                            const oObject = await aContexts[i].requestObject();
                            if (oObject) {
                                aData.push(oObject);
                            }
                        } catch (e) {}
                    }
                }
                
                return aData;
            } catch (error) {
                console.error("OData V4 데이터 수집 중 오류:", error);
                
                // 백업 전략
                try {
                    const oModel = oBinding.getModel();
                    const sPath = oBinding.getPath();
                    
                    if (oModel && sPath) {
                        const oListData = await oModel.requestObject(sPath);
                        if (Array.isArray(oListData)) {
                            return oListData;
                        }
                        if (oListData && Array.isArray(oListData.value)) {
                            return oListData.value;
                        }
                    }
                } catch (e) {}
                
                return [];
            }
        },
        
        /**
         * 표준 바인딩에서 그리드 데이터 수집
         * @private
         */
        _collectStandardGridData: function(oBinding) {
            try {
                const iLength = oBinding.getLength();
                const aContexts = oBinding.getContexts(0, iLength);
                
                return aContexts.map(function(oContext) {
                    return oContext.getObject();
                }).filter(function(item) {
                    return item !== null && item !== undefined;
                });
            } catch (error) {
                console.error("표준 바인딩 데이터 수집 중 오류:", error);
                
                // 백업 전략
                try {
                    const oModel = oBinding.getModel();
                    const sPath = oBinding.getPath();
                    
                    if (oModel && sPath) {
                        const aData = oModel.getProperty(sPath);
                        if (Array.isArray(aData)) {
                            return aData;
                        }
                    }
                } catch (e) {}
                
                return [];
            }
        },
        
        /**
         * 테이블 바인딩 객체 가져오기
         * @private
         */
        _getTableBinding: function(oTable) {
            if (typeof oTable.getBinding !== "function") {
                return null;
            }
            
            return oTable.getBinding("rows") || oTable.getBinding("items") || null;
        },
        
        /**
         * 선택 데이터 저장
         * @private
         */
        _saveSelectionData: function(data, options) {
            options = options || {};
            
            // 세션 스토리지 사용 (기본)
            if (!options.storageType || options.storageType === 'session') {
                try {
                    let sessionData = JSON.parse(sessionStorage.getItem(options.storageKey || "initSearchModel")) || {};
                    
                    // 데이터 타입에 따라 상위 항목 지정
                    if (data.type) {
                        // 해당 타입을 키로 하여 데이터 저장 (예: grid, chart, form 등)
                        sessionData[data.type] = data;
                    }
                    else {
                        // 타입이 없는 경우 기존 방식으로 처리
                        Object.assign(sessionData, data);
                    }
                    
                    sessionStorage.setItem(options.storageKey || "initSearchModel", JSON.stringify(sessionData));

                    return true;
                } catch (e) {
                    console.error("세션 스토리지 접근 오류:", e);
                    return false;
                }
            }
            // 모델 사용
            else if (options.storageType === 'model' && options.model) {
                try {
                    // 데이터 타입에 따라 상위 항목 지정
                    if (data.type) {
                        // 해당 타입을 키로 하여 데이터 저장
                        options.model.setProperty("/" + data.type, data);
                    }
                    else {
                        // 타입이 없는 경우 기존 방식으로 처리
                        Object.keys(data).forEach(key => {
                            options.model.setProperty("/" + key, data[key]);
                        });
                    }
                    return true;
                } catch (e) {
                    console.error("모델 접근 오류:", e);
                    return false;
                }
            }
            
            return false;
        },
        
        /**
         * 선택 데이터 삭제
         * @private
         */
        _clearSelectionData: function(options) {
            options = options || {};
            // 기존 키와 표준 키를 모두 포함
            var keysToDelete = [
                // 기존 키
                "selectedGrid", "clicked_values",
                // 표준 키
                "gridId", "gridName", "selectedItem", "selectedRow", "selectedCell", "gridData", "gridColumns", "params", "functionName"
            ];
            
            // 세션 스토리지 사용 (기본)
            if (!options.storageType || options.storageType === 'session') {
                try {
                    let sessionData = JSON.parse(sessionStorage.getItem(options.storageKey || "initSearchModel")) || {};
                    keysToDelete.forEach(key => delete sessionData[key]);
                    sessionStorage.setItem(options.storageKey || "initSearchModel", JSON.stringify(sessionData));
                    return true;
                } catch (e) {
                    console.error("세션 스토리지 접근 오류:", e);
                    return false;
                }
            }
            // 모델 사용
            else if (options.storageType === 'model' && options.model) {
                try {
                    keysToDelete.forEach(key => {
                        options.model.setProperty("/" + key, "");
                    });
                    return true;
                } catch (e) {
                    console.error("모델 접근 오류:", e);
                    return false;
                }
            }
            
            return false;
        },
        
        /**
         * 이벤트 소스와 타입에 따라 인터랙션 타입 결정
         * @private
         */
        _determineInteractionType: function(oSource, eventType) {
            var sourceType = oSource.getMetadata().getName();
            
            // 소스 타입 패턴 매칭 테이블
            var typePatterns = [
                { source: "sap.m.Button", event: "press", type: "button_click" },
                { sourcePattern: /Table|Grid/, eventPattern: /selection|rowSelectionChange/, type: "grid_selection" },
                { sourcePattern: /Table|Grid/, eventPattern: /cellContextmenu|contextmenu/, type: "grid_right_click" },
                { sourcePattern: /Table|Grid/, eventPattern: /cellClick/, type: "grid_cell_click" },
                { source: "sap.m.SearchField", event: "search", type: "search" },
                { sourcePattern: /Chart|VizFrame/, eventPattern: /select|click/, type: "chart_interaction" },
                { sourcePattern: /Chart|VizFrame/, eventPattern: /contextmenu/, type: "chart_right_click" },
                { sourcePattern: /sap.m.Input|sap.m.TextArea/, eventPattern: /change|liveChange/, type: "text_input" },
                { sourcePattern: /List/, eventPattern: /select/, type: "list_selection" },
                { sourcePattern: /List/, eventPattern: /contextmenu/, type: "list_right_click" },
                { sourcePattern: /Dialog|Popover/, event: null, type: "dialog_interaction" },
                { sourcePattern: /Tile/, event: null, type: "tile_interaction" },
                { sourcePattern: /Tile/, eventPattern: /contextmenu/, type: "tile_right_click" }
            ];
            
            // 매칭되는 패턴 찾기
            for (var i = 0; i < typePatterns.length; i++) {
                var pattern = typePatterns[i];
                var sourceMatch = pattern.source ? (sourceType === pattern.source) : 
                                 (pattern.sourcePattern ? pattern.sourcePattern.test(sourceType) : false);
                
                var eventMatch = pattern.event ? (eventType === pattern.event) : 
                               (pattern.eventPattern ? pattern.eventPattern.test(eventType) : true);
                
                if (sourceMatch && eventMatch) {
                    return pattern.type;
                }
            }
            
            return "ui_interaction";
        },
        
        /**
         * 컨텍스트 정보 수집
         * @private
         */
        _collectContextInfo: function(oEvent, interactionType, oModel) {
            var oSource = oEvent.getSource();
            var oView = this._findView(oSource);
            
            // 기본 컨텍스트 정보
            var context = {
                currentView: oView ? oView.getViewName().split(".").pop() : "Unknown",
                viewId: oView ? oView.getId() : "Unknown"
            };
            
            // 소스 컨트롤 정보 수집
            this._collectSourceInfo(oSource, context);
            
            // 인터랙션 타입별 특화 정보 수집
            var collectorFunction = this._getCollectorByType(interactionType);
            if (collectorFunction) {
                collectorFunction.call(this, oEvent, oSource, context, oModel);
            }
            
            // 이전 인터랙션 정보
            if (oModel && oModel.getProperty("/lastInteraction")) {
                var lastInteraction = oModel.getProperty("/lastInteraction");
                context.previousInteraction = {
                    type: lastInteraction.interaction.type,
                    timestamp: lastInteraction.interaction.timestamp
                };
            }
            
            return context;
        },
        
        /**
         * 인터랙션 타입에 따른 수집 함수 가져오기
         * @private
         */
        _getCollectorByType: function(interactionType) {
            var collectors = {
                "button_click": this._collectButtonInfo,
                "grid_selection": this._collectGridInfo,
                "search": this._collectSearchInfo,
                "chart_interaction": this._collectChartInfo,
                "text_input": this._collectTextInputInfo
            };
            
            return collectors[interactionType];
        },
        
        /**
         * 소스 컨트롤에서 뷰 찾기
         * @private
         */
        _findView: function(oControl) {
            if (!oControl) return null;
            
            if (oControl.getMetadata().getName().includes("View")) {
                return oControl;
            }
            
            if (oControl.getParent) {
                return this._findView(oControl.getParent());
            }
            
            return null;
        },
        
        /**
         * 소스 컨트롤의 기본 정보 수집
         * @private
         */
        _collectSourceInfo: function(oSource, context) {
            if (!oSource) return;
            
            // 공통 속성 수집
            this._safelyGetProperty(oSource, "getText", context, "sourceText");
            this._safelyGetProperty(oSource, "getIcon", context, "sourceIcon");
            this._safelyGetProperty(oSource, "getTooltip", context, "sourceTooltip");
            this._safelyGetProperty(oSource, "getEnabled", context, "sourceEnabled");
            this._safelyGetProperty(oSource, "getVisible", context, "sourceVisible");
        },
        
        /**
         * 안전하게 컨트롤 속성 가져오기
         * @private
         */
        _safelyGetProperty: function(control, methodName, targetObj, propertyName) {
            if (typeof control[methodName] === "function") {
                var value = control[methodName]();
                if (value !== undefined && value !== null) {
                    targetObj[propertyName] = value;
                }
            }
        },
        
        /**
         * 항목 속성 값 가져오기
         * @private
         */
        _getItemPropertyValue: function(oData, options) {
            if (!oData) return "";
            options = options || {};
            
            // 지정된 itemProperty 사용
            if (options.itemProperty && oData[options.itemProperty] !== undefined) {
                return oData[options.itemProperty];
            }
            
            // 기본 속성 시도
            const defaultProps = ["name", "category", "title", "description", "label", "type"];
            for (let prop of defaultProps) {
                if (oData[prop] !== undefined) {
                    return oData[prop];
                }
            }
            
            // 첫 번째 문자열 속성 반환
            for (let key in oData) {
                if (typeof oData[key] === "string") {
                    return oData[key];
                }
            }
            
            return "";
        },
        
        /**
         * 버튼 관련 특화 정보 수집
         * @private
         */
        _collectButtonInfo: function(oEvent, oSource, context) {
            this._safelyGetProperty(oSource, "getType", context, "buttonType");
            this._safelyGetProperty(oSource, "getIcon", context, "buttonIcon");
            this._safelyGetProperty(oSource, "getText", context, "buttonText");
        },
        
        /**
         * 그리드/테이블 관련 특화 정보 수집
         * @private
         */
        _collectGridInfo: function(oEvent, oSource, context, oModel) {
            // 선택된 행 인덱스
            var selectedIndex = -1;
            
            if (oEvent.getParameter("rowIndex") !== undefined) {
                selectedIndex = oEvent.getParameter("rowIndex");
            }
            else if (typeof oSource.getSelectedIndex === "function") {
                selectedIndex = oSource.getSelectedIndex();
            }
            
            context.selectedRowIndex = selectedIndex;
            
            // 모델에서 선택 데이터 추출
            if (oModel) {
                var gridId = oModel.getProperty("/gridId") || oModel.getProperty("/selectedGrid");
                var selectedRow = oModel.getProperty("/selectedRow") || oModel.getProperty("/clicked_values");
                
                if (gridId && selectedRow) {
                    try {
                        context.selectedData = {
                            gridId: gridId,
                            item: typeof selectedRow === 'string' ? JSON.parse(selectedRow) : selectedRow
                        };
                    } catch (e) {}
                }
            }
        },
        
        /**
         * 검색 관련 특화 정보 수집
         * @private
         */
        _collectSearchInfo: function(oEvent, oSource, context) {
            context.searchTerm = oEvent.getParameter("query") || 
                              oEvent.getParameter("newValue") || "";
            
            if (oSource.getValue) {
                context.searchFieldValue = oSource.getValue();
            }
        },
        
        /**
         * 차트 관련 특화 정보 수집
         * @private
         */
        _collectChartInfo: function(oEvent, context) {
            var dataContext = oEvent.getParameter("data") || 
                            oEvent.getParameter("dataContext");
            
            if (dataContext) {
                context.chartData = dataContext;
            }
            
            if (oEvent.getParameter("chartType")) {
                context.chartType = oEvent.getParameter("chartType");
            }
        },
        
        /**
         * 텍스트 입력 관련 특화 정보 수집
         * @private
         */
        _collectTextInputInfo: function(oEvent, oSource, context) {
            context.inputValue = oEvent.getParameter("value") || 
                              oEvent.getParameter("newValue") || "";
            
            this._safelyGetProperty(oSource, "getPlaceholder", context, "inputPlaceholder");
            
            if (oEvent.getParameter("liveValue")) {
                context.liveValue = oEvent.getParameter("liveValue");
            }
        },
        
        /**
         * 컬럼 정보 수집
         * @private
         */
        _collectColumnsInfo: function(oGrid) {
            if (typeof oGrid.getColumns !== "function") {
                return [];
            }
            
            return oGrid.getColumns().map(function(column, index) {
                var columnInfo = {
                    id: column.getId(),
                    index: index
                };
                
                // 1. 멀티레이블 처리
                if (typeof column.getMultiLabels === "function" && column.getMultiLabels().length > 0) {
                    var aLabels = column.getMultiLabels();
                    columnInfo.multiLabels = aLabels.map(function(label, labelIndex) {
                        var labelInfo = {
                            text: "",
                            index: labelIndex
                        };
                        
                        if (typeof label.getText === "function") {
                            labelInfo.text = label.getText();
                        }
                        
                        // customData 수집 (각 레이블별로)
                        if (typeof label.getCustomData === "function") {
                            var aCustomData = label.getCustomData();
                            if (aCustomData && aCustomData.length > 0) {
                                labelInfo.customData = {};
                                aCustomData.forEach(function(customData) {
                                    if (typeof customData.getKey === "function" && 
                                        typeof customData.getValue === "function") {
                                        labelInfo.customData[customData.getKey()] = customData.getValue();
                                    }
                                });
                            }
                        }
                        
                        return labelInfo;
                    }).filter(function(labelInfo) {
                        return labelInfo.text !== "";
                    });
                    
                    // 텍스트만 추출한 배열도 유지 (하위 호환성)
                    var labelTexts = columnInfo.multiLabels.map(function(labelInfo) {
                        return labelInfo.text;
                    });
                    
                    // 마지막 레이블을 컬럼 이름으로 사용
                    if (labelTexts.length > 0) {
                        columnInfo.name = labelTexts[labelTexts.length - 1];
                    }
                    
                    // 모든 레이블 조합을 full name으로 제공
                    if (labelTexts.length > 0) {
                        columnInfo.fullName = labelTexts.join("/");
                    }
                    
                    // 첫 번째 레이블의 customData가 있으면 컬럼 레벨로 승격
                    // (org_id 등 중요한 정보는 보통 첫 번째 레이블에 있음)
                    if (columnInfo.multiLabels.length > 0 && columnInfo.multiLabels[0].customData) {
                        columnInfo.customData = columnInfo.multiLabels[0].customData;
                        
                        // org_id가 있으면 별도로 추출 (편의성을 위해)
                        if (columnInfo.customData.org_id) {
                            columnInfo.orgId = columnInfo.customData.org_id;
                        }
                    }
                }
                
                // 2. 일반 레이블/헤더 처리 (멀티레이블이 없는 경우)
                if (!columnInfo.name) {
                    // 일반 컬럼 레이블 처리
                    if (typeof column.getLabel === "function" && column.getLabel()) {
                        if (typeof column.getLabel().getText === "function") {
                            columnInfo.name = column.getLabel().getText();
                        }
                    }
                    
                    // 헤더 텍스트 처리
                    if (!columnInfo.name && typeof column.getHeader === "function" && column.getHeader()) {
                        columnInfo.name = column.getHeader();
                    }
                }
                
                // 3. 템플릿 처리 (복잡한 바인딩 정보 수집)
                if (typeof column.getTemplate === "function" && column.getTemplate()) {
                    var template = column.getTemplate();
                    columnInfo.template = {
                        type: template.getMetadata().getName()
                    };
                    
                    // 단순 바인딩 경로 가져오기
                    if (typeof template.getBindingPath === "function") {
                        columnInfo.path = template.getBindingPath("text") || 
                                        template.getBindingPath("value");
                    }
                    
                    // 복합 바인딩 정보 가져오기 (parts 바인딩)
                    if (typeof template.getBindingInfo === "function") {
                        var textBinding = template.getBindingInfo("text");
                        if (textBinding && textBinding.parts && textBinding.parts.length > 0) {
                            columnInfo.bindingParts = textBinding.parts.map(function(part) {
                                return {
                                    path: part.path,
                                    model: part.model,
                                    type: part.type
                                };
                            });
                            
                            // formatter 함수가 있는지 확인
                            if (textBinding.formatter) {
                                columnInfo.hasFormatter = true;
                            }
                        }
                    }
                }
                
                // 4. 첫 번째 데이터 행에서 실제 값 가져오기 시도
                try {
                    if (oGrid.getRows && oGrid.getRows().length > 0) {
                        var firstRow = oGrid.getRows()[0];
                        var cellContent = firstRow.getCells()[index];
                        
                        if (cellContent) {
                            if (typeof cellContent.getText === "function") {
                                columnInfo.sampleValue = cellContent.getText();
                            } else if (typeof cellContent.getValue === "function") {
                                columnInfo.sampleValue = cellContent.getValue();
                            }
                        }
                    }
                } catch (e) {
                    // 오류 무시
                }
                
                // 이름이 아직 없으면 인덱스 기반으로 기본 이름 생성
                if (!columnInfo.name) {
                    columnInfo.name = "Column " + (index + 1);
                }
                
                return columnInfo;
            });
        }
    };
});