
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/model/Sorter",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/Fragment",
    "sap/ui/core/EventBus",
    "bix/common/ai/util/InteractionUtils",
    "bix/common/library/control/Modules",
    "../../main/util/Module",
], function (Controller, JSONModel, NumberFormat, Sorter, ODataModel, Fragment, EventBus, InteractionUtils, Modules,Module) {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     */
    return Controller.extend("bix.card.plUiTable.Main", {
        _oEventBus: EventBus.getInstance(),


        onInit: function () {
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);
            this._oEventBus.subscribe("pl", "pltable", this._clearSelection, this);
            this._oEventBus.subscribe("pl", "selectMasterTable", this.onRowSelectionChange, this);

            // 테이블에 셀 클릭 이벤트 등록
            var oTable = this.byId("table");
            if (oTable) {
                oTable.attachCellClick(this.onCellClick, this);
            }

            this._bindTable();

            this.getView().setModel(new JSONModel({ PL_Column: "valueGap" }), "tableColumnSet");
        },

        onAfterRendering: function () {
            let oTable = this.byId("table");
            
            Module.setTableMergeWithAltColor(oTable)
        },
        /**
         * Pl 대시보드 검색 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag 
         */
        _bindTable: async function (sChannelId, sEventId, oData) {
            oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;

            // 새로운 테이블 경로
            let oTable = this.byId("table");
            let sLastPath = oTable.getBinding("rows")?.getPath();
            let sNewPath = `/get_actual_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`

            // 기존 테이블 바인딩 경로와 새로운 바인딩 경로가 같을 때는 Return
            if (sLastPath === sNewPath) return;

            // 테이블 바인딩
            await oTable.bindRows({
                path: sNewPath,
                sorter: new Sorter({ path: "display_order" }),
                events: {
                    dataRequested: function () {
                        oTable.setBusy(true);
                    }.bind(this),
                    dataReceived: function (oEvent) {
                        const aHash = window.location.hash.split('#/')[2];
                        const oUrlParams = aHash.split('/')

                        this.onRowSelectionChange('pl', 'selectMasterTable', { detail: oUrlParams[2], page: oUrlParams[0] })
                        oTable.setBusy(false);
                    }.bind(this),
                }
            })

            await Module.setTableMergeWithAltColor(oTable)
            // //console.log(oTable.getBinding("rows"));

            // 날짜 입력 값 받아 수정
            // let oTemp = { year: String(sYear).substring(2) };
            // this.getView().setModel(new JSONModel(oTemp), "tableYearModel");

            this.getOwnerComponent().oCard.getParent().setBusy(false);

        },
        /**
         * 
         * @param {sap.ui.table.Table} oTable 
         * @param {Array} aEmphasisSetting 
         * offset : 시작점, step : 적용간격
         */
        _tableHeaderSetting: function (oTable, aEmphasisSetting = []) {
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
         * 필드 Formatter
         * @param {String} sType 
         * @param {*} iValue1 기본값
         * @param {*} iValue2 제할 값
         */
        onFormatPerformance: function (sType, iValue1, iValue2, sTooltip) {
            return Modules.valueFormat(sType, iValue1, iValue2, sTooltip)
        },
        onFormatInfoLabel: function (iValue1, iValue2, sType) {
            return Modules.infoLabelFormat(iValue1, iValue2, sType);
        },
        /**
         * 셀 클릭 이벤트 핸들러
         * @param {Event} oEvent
         */
        onCellClick: function (oEvent) {
            var result = InteractionUtils.processTableCellClick(this, oEvent, "table");
            this._lastClickedCellInfo = result.cellInfo;
        },

        /**
         * PL 테이블 행 클릭 이벤트
         * @param {Event} oEvent 
         */
        onRowSelectionChange: function (oEvent, sEventId, oEventData) {
            if (!sEventId) {
                let oContext = oEvent.getParameters()["rowContext"];

                // type이 SG&A일 때
                let oBindingObject = oContext?.getObject();
                if (oBindingObject?.type === "매출" || oBindingObject?.type === "마진") {
                    this._oEventBus.publish("pl", "detail", { detail: "saleMargin" });
                } else if (oBindingObject?.type === "사업 SG&A") {
                    this._oEventBus.publish("pl", "detail", { detail: "sga" });
                }

                // InteractionUtils 사용하여 행 선택 처리
                InteractionUtils.handleTableRowSelection(
                    this,
                    oEvent,
                    "table",
                    {
                        gridName: "PL 실적 테이블",
                        storageType: "session",
                        storageKey: "initSearchModel",
                        sekectedCell: this._lastClickedCellInfo
                    }
                );
                let oTable = this.byId("table");
                if(oTable.getSelectedIndex() !== -1){
                    const aHash = window.location.hash.split('#/')[2];
                    const oUrlParams = aHash.split('/')
                    this._oEventBus.publish("pl", "selectMasterTable",  { detail: oUrlParams[2], page: oUrlParams[0], table:'pl' });
                }
            } else {
                if (oEventData['page'] === "actual") {
                    let oTable = this.byId("table");
                    if (!oTable) return;

                    // detail에 따른 테이블(pl, oi) 분기처리
                    let sTableType = (oEventData['detail'] === 'saleMargin' || oEventData['detail'] === 'sga') ? "pl" : "oi";
                    if (sTableType === "oi") {
                        oTable.setSelectedIndex(-1);
                        return;
                    }

                    // 타입에 맞는 행 선택
                    let sType = oEventData['detail'] === 'saleMargin' ? "매출" : oEventData['detail'] === 'sga' ? "사업 SG&A" : null
                    let aBindingData = oTable.getBinding("rows").getContexts().map(oData => oData.getObject());
                    let index = aBindingData.findIndex(oData => oData["type"] === sType) ?? -1;
                    oTable.setSelectedIndex(index);
                }
            }
        },

        onDetail: async function () {
            return;
            let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;

            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl-api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            const oBindingContext = oModel.bindContext(`/get_pl_performance_full(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`);
            const oResult = await oBindingContext.requestObject();

            let lastOrgKorNm = "";
            if (oResult) {

                oResult.value.forEach(item => {
                    if (item.org_kor_nm === lastOrgKorNm) {
                        item._displayOrgKorNm = "";
                    } else {
                        item._displayOrgKorNm = item.org_kor_nm;
                        lastOrgKorNm = item.org_kor_nm;
                    }

                    const fmt = (n) => Number(n || 0).toLocaleString();
                    const pct = (n) => Number(n || 0).toFixed(1)

                    item.performanceYearMonthGap = (item.performanceCurrentYearMonth || 0) - (item.performanceLastYearMonth || 0);
                    item.performanceAttainmentRategap = (item.performanceAttainmentRateCurrentYear || 0) - (item.performanceAttainmentRateLastYear || 0);
                    if (item.type === "마진율") {
                        item.goal = pct(item.goal) + "%";
                        item.performanceLastYearMonth = pct(item.performanceLastYearMonth) + "%";
                        item.performanceCurrentYearMonth = pct(item.performanceCurrentYearMonth) + "%";
                        item.performanceYearMonthGap = pct(item.performanceYearMonthGap) + "%";
                    } else {
                        item.goal = fmt(item.goal);
                        item.performanceLastYearMonth = fmt(item.performanceLastYearMonth);
                        item.performanceCurrentYearMonth = fmt(item.performanceCurrentYearMonth);
                        item.performanceYearMonthGap = fmt(item.performanceYearMonthGap);
                    }
                    item.performanceAttainmentRategap = pct(item.performanceAttainmentRategap) + "%"
                    item.performanceAttainmentRateCurrentYear = pct(item.performanceAttainmentRateCurrentYear) + "%"
                    item.performanceAttainmentRateLastYear = pct(item.performanceAttainmentRateLastYear) + "%"

                })

                if (!this._fragment) {
                    let sComponentName = this.getOwnerComponent().getMetadata().getComponentName();
                    await this.loadFragment({
                        id: "plDetailTableDialog",
                        name: `${sComponentName}.fragment.plDetailTableDialog`,
                        controller: this,
                    }).then(function (oDialog) {
                        this._fragment = oDialog;
                        oDialog.attachBeforeOpen(async function (oEvent) {
                            const oTable = this.byId(Fragment.createId("plDetailTableDialog", "plDetailTable"));
                            oTable.attachEventOnce("rowsUpdated", function () {
                                oTable.attachFirstVisibleRowChanged(this.onFirstVisibleRowChanged.bind(this));
                                this.onFirstVisibleRowChanged({ getSource: () => oTable });
                                this._tableHeaderSetting(oTable, [
                                    { offset: 4, step: 3 },
                                    { offset: 5, step: 3 }
                                ]);
                            }.bind(this));
                        }.bind(this));
                    }.bind(this));
                    const oNewModel = new JSONModel(oResult.value);
                    this.getView().setModel(oNewModel, "plDetailTableModel");

                }
                this._fragment.open();
            }
        },

        onFirstVisibleRowChanged: function (oEvent) {
            const oTable = oEvent.getSource();
            oTable.rerender();
            var aRows = oTable.getRows();
            var iSkipcount = 0;


            for (let i = 0; i < aRows.length; i++) {
                let oRow = aRows[i];
                let oBindingContext = oRow.getBindingContext("plDetailTableModel");
                if (!oBindingContext) continue;
                const oBindingObject = oBindingContext.getObject();

                if (iSkipcount > 0) {
                    const oCell = document.getElementById(`${oRow.getId()}-col0`);
                    oCell?.remove();
                    iSkipcount--;
                } else {
                    const iRowSpan = aRows.filter(oCompareRow => {
                        const oCompareContext = oCompareRow.getBindingContext("plDetailTableModel");
                        if (!oCompareContext) return false;

                        const oCompareObject = oCompareContext.getObject();
                        return oCompareObject.org_kor_nm === oBindingObject.org_kor_nm;
                    }).length
                    const oCell = document.getElementById(`${oRow.getId()}-col0`);
                    oCell?.setAttribute("rowspan", String(iRowSpan));
                    iSkipcount = iRowSpan - 1;

                }


            }


        },

        onCloseDialog: function () {
            if (this._fragment) {
                this._fragment.close();
            }
        },
        
        _clearSelection: function () {
            let oTable = this.byId("table");
            if (oTable.getSelectedIndices().length > 0) {
                oTable.clearSelection();
            }
        }
    });
});