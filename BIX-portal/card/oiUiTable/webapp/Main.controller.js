sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Sorter",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller,JSONModel, Sorter, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.oiUiTable.Main", {
        _sTableId : "oIUiTable",
        _oEventBus: EventBus.getInstance(),
        
        onInit: function () {
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);
            this._oEventBus.subscribe("pl", "selectDetail", this.onRowSelectionChange, this);
            // this._oEventBus.subscribe("pl", "oitable", this._clearSelection, this);
            this._bindTable();
        
            this.getView().setModel(new JSONModel({ PL_Column: "valueGap" }), "tableColumnSet");
        },
        onAfterRendering: function () {
            let oTable = this.byId(this._sTableId);
            this._tableHeaderSetting(oTable);            
        },
        _bindTable: async function (sChannelId, sEventId, oData) {
            oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;

            // 테이블 바인딩
            let sPath = `/get_actual_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            let oTable = this.byId("oIUiTable");

            oTable.bindRows({
                path: sPath,
                sorter: new Sorter({ path: "display_order" }),
                events: {
                    dataRequested: function () {
                        oTable.setBusy(true);
                    }.bind(this),
                    dataReceived: function (oEvent) {
                        const aHash = window.location.hash.split('#/')[2];
                        const oUrlParams = aHash.split('/')

                        this.onRowSelectionChange('pl','selectDetail',{detail: oUrlParams[2], page: oUrlParams[0]})   
                        oTable.setBusy(false);
                    }.bind(this),
                }
            })
            // console.log(oTable.getBinding("rows"));

            // 날짜 입력 값 받아 수정
            // let oTemp = { year: String(iYear).substring(2) };
            // this.getView().setModel(new JSONModel(oTemp), "tableYearModel");

            this.getView().setBusy(false);
            // let oTemp = { year: "25", agoYear: "24" };
            // this.getView().setModel(new JSONModel(oTemp), "tableYearModel");

            // this._aOiColumn = [
            // 	{
            // 		type: "DT 매출/마진",
            // 	}, {
            // 		type: "Offshoring",
            // 	}, {
            // 		type: "Non-MM",
            // 	}, {
            // 		type: "BR",
            // 	}, {
            // 		type: "RoHC",
            // 	}
            // ];
            // this.getView().setModel(new JSONModel(oResult.value), "oiUiTableModel");
        },
        /**
         * 
         * @param {sap.ui.Table } oTable 
         * @param {Array} aEmphasisSetting 
         * offset : 시작점, step : 적용간격
         */
        _tableHeaderSetting : function (oTable, aEmphasisSetting = []) {
            let aColumns = oTable.getColumns();
            let aHeaderSpan = aColumns.map((oCol) => parseInt(oCol.getProperty("headerSpan")));

            let aHeaderRow = [];
            for (const oColumn of aColumns) {
                let aMultiLabels = oColumn.getAggregation("multiLabels");
                for (let i =0; i < aMultiLabels.length;i++) {
                    if (aHeaderRow[i] && !aHeaderRow[i].some(oLabel => oLabel.getId() === aMultiLabels[i].getId())) {
                        aHeaderRow[i].push(aMultiLabels[i]);
                    } else {
                        aHeaderRow.push([aMultiLabels[i]]);
                    }
                }
            }
            
            for (let i=0; i<aHeaderRow.length;i++) {
                if (i === aHeaderRow.length-1) {
                    for (let j=0; j< aHeaderSpan.length;j++) {
                        j += aHeaderSpan[j] -1;
                        aHeaderRow[i][j].addStyleClass("custom-table-white-headerline")
                    }
                    for (const oEmphais of aEmphasisSetting) {
                        let j=oEmphais.offset;
                        while (j < aHeaderRow[i].length) {
                            aHeaderRow[i][j].addStyleClass("custom-table-emphasis-col-color")
                            if (aHeaderRow[i][j-1].getDomRef()?.classList.contains("custom-table-emphasis-col-color")?? false) {
                                aHeaderRow[i][j-1].addStyleClass("custom-table-emphasis-col-line")
                            }
                            j += oEmphais.step;
                        }
                    }
                } else {
                    for (let j=0; j< aHeaderSpan.length;j++) {
                        aHeaderRow[i][j].addStyleClass("custom-table-white-headerline")
                        j += aHeaderSpan[j] -1;
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
            // 값이 없을 때 return
            if (!iValue1) return;

            // iValue2가 있을 때 iValue2 - iValue1
            let iNewValue = (iValue2 && !isNaN(iValue2)) ? (iValue1 - iValue2) : iValue1;
            if (sType === "BR" || sTooltip === "percent") {
                // var oNumberFormat = NumberFormat.getPercentInstance({
                //     groupingEnabled: true,
                //     groupingSeparator: ',',
                //     groupingSize: 3,
                //     decimals: 2,
                // });
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });

                
                return oNumberFormat.format(iNewValue) + "%";
            } else if (sType === "RoHC") {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });
                return oNumberFormat.format(iNewValue);
            } else if (sTooltip === "tooltip" || sTooltip === "target") {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });

                return oNumberFormat.format(iNewValue);
            } else if (sTooltip === "targetTooltip") {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iNewValue*100000000);
            } else {
                iNewValue = iNewValue >= 0 ? Math.floor(iNewValue / 100000000) : Math.ceil(iNewValue / 100000000);

                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 0
                });
                return oNumberFormat.format(iNewValue)// + "억";

            };
        },
        onRowSelectionChange: function (oEvent, sEventId, oData) {
            if(!sEventId){
                
                let oContext = oEvent.getParameters()["rowContext"];
    
                let oBindingObject = oContext?.getObject();
                if (oBindingObject?.type === "DT 매출") {
                    this._oEventBus.publish("pl", "detail", { detail: "dtSaleMargin" });
                } else if (oBindingObject?.type === "Non-MM") {
                    this._oEventBus.publish("pl", "detail", { detail: "nonMm" });
                }else if (oBindingObject?.type === "BR") {
                    this._oEventBus.publish("pl", "detail", { detail: "br" });
                }else if (oBindingObject?.type === "RoHC") {
                    this._oEventBus.publish("pl", "detail", { detail: "rohc" });
                }
                // let oTable = oEvent.getSource();
                // if (oTable.getSelectedIndices().length > 0) {
                //     this._oEventBus.publish("pl", "pltable");
                // }                
            }else{
                if(oData['page'] === "actual"){
                    let sType = oData['detail'] === 'dtSaleMargin' ? "DT 매출" : oData['detail'] === 'nonMm' ? "Non-MM": oData['detail'] === 'br' ? "BR": oData['detail'] === 'rohc' ? "RoHC" : null
                    let oTable = this.byId("oIUiTable");
                    if(!oTable) return;
                    let aRows = oTable.getBinding("rows").getContexts();
                    let iIndex = -1
                    aRows.forEach(a=>{
                        if (a.getObject()['type'] === sType){
                            iIndex = a.getIndex()
                        }
                    })
                    oTable.setSelectedIndex(iIndex)
                }
            }
        },
        _clearSelection: function () {
            let oTable = this.byId("oIUiTable");
            if (oTable.getSelectedIndices().length > 0) {
                oTable.clearSelection();
            }
        }
    });
});