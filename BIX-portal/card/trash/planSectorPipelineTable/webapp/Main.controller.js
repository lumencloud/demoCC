sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.planSectorPipelineTable.Main", {
        _oEventBus: EventBus.getInstance(),
        _aTableLists: ["pipeDetailTable1", "pipeDetailTable2", "pipeDetailTable3"],


        onInit: function () {
            this._setUiModel();
            this._setData();
            this._oEventBus.subscribe("pl", "search", this._setData, this);
        },

        _setUiModel: function () {
            this.getView().setModel(new JSONModel({
                tableKind: "deal"
            }), "uiModel");
            this._setSelect();

        },

        onUiChange: function (oEvent) {
            let oUiModel = this.getView().getModel("uiModel");
            oUiModel.setProperty("/tableKind", oEvent.getSource().getSelectedKey())
            this._setTableMerge();

        },

        _setSelect: function () {
            this.getView().setModel(new JSONModel({}), "selectModel");

            let aTemp = [
                {
                    key: "deal",
                    name: "Deal Stage별"
                }, {
                    key: "month",
                    name: "월별"
                }, {
                    key: "rodr",
                    name: "수주금액 기준"
                }
            ];
            this.getView().setModel(new JSONModel(aTemp), "selectModel");
        },

        _setBusy: function (bFlag) {
            this._aTableLists.forEach((sTableId) => this.byId(sTableId).setBusy(bFlag))
        },

        _setData: async function (sChannelId, sEventId, oData) {
            this._setBusy(true)
            oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() - 1).padStart(2, "0");
            let sOrgId = oData.orgId;

            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });

            let sDealPath = `/get_forecast_pl_pipeline_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='deal')`
            let sMonthPath = `/get_forecast_pl_pipeline_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='month')`
            let sRodrPath = `/get_forecast_pl_pipeline_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='rodr')`

            await Promise.all([
                oModel.bindContext(sDealPath).requestObject(),
                oModel.bindContext(sMonthPath).requestObject(),
                oModel.bindContext(sRodrPath).requestObject(),
            ]).then(function (aResults) {

                this.getView().setModel(new JSONModel(aResults[0].value), "oDealTableModel")
                this.getView().setModel(new JSONModel(aResults[1].value), "oMonthTableModel")
                this.getView().setModel(new JSONModel(aResults[2].value), "oRodrTableModel")

                this._monthVisibleSetting(aResults[1].value);
                this._setBusy(false)
            }.bind(this)
            )
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
            //console.log(this.getView().getModel("oColumnsVisibleModel"))
            ////console.log(this.getView().getModel("oMonthTableModel"))
        },

        onFirstVisibleRowChanged: function () {
            this._setTableMerge();
        },

        _setTableMerge: function () {
            let oTable1 = this.byId("pipeDetailTable1")
            let oTable2 = this.byId("pipeDetailTable2")
            let oTable3 = this.byId("pipeDetailTable3")
            Module.setTableMerge(oTable1, "oDealTableModel", 1);
            Module.setTableMerge(oTable2, "oMonthTableModel", 1);
            Module.setTableMerge(oTable3, "oRodrTableModel", 1);
        },

        onAfterRendering: function () {
            this._aTableLists.forEach(
                function (sTableId) {
                    let oTable = this.byId(sTableId);
                    this._tableHeaderSetting(oTable, []);
                }.bind(this)
            )
            this._setTableMerge();


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
         * 필드 Formatter
         * @param {String} sType 
         * @param {*} iValue 기본값
         */
        onFormatPerformance: function (iValue, sType) {
            // 값이 없을 때 0으로 돌려보냄
            if (!iValue) { iValue = 0 }


            if (sType === "percent") {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });
                return oNumberFormat.format(iValue) + "%";
            } else if (sType === "tooltip") {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iValue);
            } else if (sType === "수주" || sType === "매출") {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 0
                });
                return oNumberFormat.format(iValue / 100000000);
            } else if (sType === "건수") {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 0
                });
                return oNumberFormat.format(iValue);
            }

        },

    });
});