sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Sorter",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
    "bix/common/library/control/Modules",
    "../../main/util/Module",
], function (Controller, Sorter, NumberFormat, EventBus, Modules,Module) {
    "use strict";

    return Controller.extend("bix.card.forecastOiUiTable.Main", {
        _oEventBus: EventBus.getInstance(),
        
        onInit: function () {            
            this._bindTable();
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);
            this._oEventBus.subscribe("pl", "selectMasterTable", this.onRowSelectionChange, this);
        },

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
            let sNewPath = `/get_forecast_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`;

            // 기존 테이블 바인딩 경로와 새로운 바인딩 경로가 같을 때는 Return
            if (sLastPath === sNewPath) return;
            
            // 테이블 바인딩
            oTable.bindRows({
                path: sNewPath,
                sorter: new Sorter({ path: "display_order" }),
                events: {
                    dataRequested: function () {
                        oTable.setBusy(true);
                    }.bind(this),
                    dataReceived: function (oEvent) {
                        const aHash = window.location.hash.split('#/')[2];
                        const oUrlParams = aHash.split('/')

                        this.onRowSelectionChange('pl','selectMasterTable',{detail: oUrlParams[2], page: oUrlParams[0]})   
                        oTable.setBusy(false);
                    }.bind(this),
                }
            })
            await Module.setTableMergeWithAltColor(oTable);
            // //console.log(oTable.getBinding("rows"));

            // 날짜 입력 값 받아 수정
            // let oTemp = { year: String(iYear).substring(2) };
            // this.getView().setModel(new JSONModel(oTemp), "tableYearModel");

            this.getOwnerComponent().oCard.getParent().setBusy(false);

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
            // this.getView().setModel(new JSONModel(oResult.value), "forecastOiUiTableModel");
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
                            if (aHeaderRow[i][j-1].getDomRef()?.classList.contains("custom-table-emphasis-col-color") ?? false) {
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
         * @param {String} sTooltip 
         * @param {*} iValue 기본값
         */
        onFormatPerformance: function (iValue, sType, sTooltip) {
            return Modules.valueFormat(sType, iValue, '', sTooltip)
        },
        onRowSelectionChange: function (oEvent, sEventId, oEventData) {
            if(!sEventId){
                let oContext = oEvent.getParameters()["rowContext"];
    
                let oBindingObject = oContext?.getObject();
                if (oBindingObject?.type === "DT 매출") {
                    this._oEventBus.publish("pl", "detail", { detail: "dtSaleMargin" });
                } else if (oBindingObject?.type === "Offshoring") {
                    //this._oEventBus.publish("pl", "detail", { detail: "offshoring" });
                }else if (oBindingObject?.type === "Non-MM") {
                    this._oEventBus.publish("pl", "detail", { detail: "nonMm" });
                }else if (oBindingObject?.type === "BR") {
                    this._oEventBus.publish("pl", "detail", { detail: "br" });
                }
    
                let oTable = this.byId("table");
                if(oTable.getSelectedIndex() !== -1){
                    const aHash = window.location.hash.split('#/')[2];
                    const oUrlParams = aHash.split('/')
                    this._oEventBus.publish("pl", "selectMasterTable",  { detail: oUrlParams[2], page: oUrlParams[0], table:'oi' });
                }
            }else{
                if(oEventData['page'] === "plan"){
                    let oTable = this.byId("table");
                    if (!oTable) return;

                    // detail에 따른 테이블(pl, oi) 분기처리
                    let sTableType = (oEventData['detail'] === 'saleMargin' || oEventData['detail'] === 'sga') ? "pl" : "oi";
                    if (sTableType === "pl") {
                        oTable.setSelectedIndex(-1);
                        return;
                    }

                    // 타입에 맞는 행 선택
                    let sType = oEventData['detail'] === 'dtSaleMargin' ? "DT 매출" : oEventData['detail'] === 'offshoring' ? "Offshoring": oEventData['detail'] === 'nonMm' ? "Non-MM": oEventData['detail'] === 'br' ? "BR" : null
                    let aBindingData = oTable.getBinding("rows").getContexts().map(oData => oData.getObject());
                    let index = aBindingData.findIndex(oData => oData["type"] === sType) ?? -1;
                    oTable.setSelectedIndex(index);
                }
            }
        },
    });
});