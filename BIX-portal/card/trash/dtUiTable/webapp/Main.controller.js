sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Sorter",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
	"sap/ui/model/json/JSONModel",
], function (Controller, Sorter, NumberFormat, EventBus,JSONModel) {
    "use strict";

    return Controller.extend("bix.card.dtUiTable.Main", {
        _sTableId : "dtUiTable",
        _oEventBus: EventBus.getInstance(),
        
        onInit: function () {
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);
            this._oEventBus.subscribe("pl", "pltable", this._clearSelection, this);
            this._bindTable();
        },
        onAfterRendering: function () {
            let oTable = this.byId(this._sTableId);
            this._tableHeaderSetting(oTable, [
                {offset : 3, step : 3},
                {offset : 4, step : 3} 
            ]);            
			// 카드
            const oCard = this.getOwnerComponent().oCard;
            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oCardDom = document.getElementById(sCardId);
            let oParentElement = oCardDom.parentElement;
            // 대안 1. 초기 테이블 사이즈만 고정. 이 후 창크기 조절시 테이블 크기 미변화
            // oCardDom.querySelector(".sapUiView .sapUiXMLView .sapUiViewDisplayBlock")['style'].height = `${oParentElement.clientHeight}px`

            // 대안 2. session을 통해 윈도우 크기 및 카드 크기 저장 후 변화값을 측정하여 카드 크기 변경. 사용 가능하지만 session을 많이 사용해야함.
            let iInnerHeight;
            if(!sessionStorage.getItem('plDtRodrTableWindow')){
                sessionStorage.setItem('plDtRodrTableWindow', window.innerHeight.toString());
                sessionStorage.setItem('plDtRodrTableDom', oParentElement.clientHeight.toString());
                iInnerHeight = oParentElement.clientHeight;
            }else{
                let iDelta = Number(sessionStorage.getItem('plDtRodrTableWindow')) - window.innerHeight;
                if(iDelta > 0){
                    iInnerHeight = Number(sessionStorage.getItem('plDtRodrTableDom')) - iDelta;
                }else if(iDelta < 0){
                    iInnerHeight = Number(sessionStorage.getItem('plDtRodrTableDom')) + iDelta;
                }else{
                    iInnerHeight = Number(sessionStorage.getItem('plDtRodrTableDom'));
                };
            };

            oCardDom.querySelector(".sapUiView .sapUiXMLView .sapUiViewDisplayBlock")['style'].height = `${iInnerHeight}px`
        },
        _bindTable: async function (sChannelId, sEventId, oData) {
            oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sOrgId = oData.orgId;

            // 테이블 바인딩
            let sPath = `/get_plan_dt_sale(year='${iYear}',org_id='${sOrgId}')`
            let oTable = this.byId("dtUiTable");

            oTable.bindRows({
                path: sPath,
                sorter: new Sorter({ path: "display_order" }),
                events: {
                    dataRequested: function () {
                        oTable.setBusy(true);
                    }.bind(this),
                    dataReceived: function (oEvent) {
                        oTable.setBusy(false);
                    }.bind(this),
                }
            })
			this.getView().setModel(new JSONModel({cardInfo:"dtUiTable"}),"selectModel");

            this.getView().setBusy(false);
        },
		onChange:function(){
			let sCardInfo = this.getView().getModel("selectModel").getProperty("/cardInfo")
			this.getOwnerComponent().oCard.setManifest(`../bix/card/${sCardInfo}/manifest.json`)
		},
        /**
         * 
         * @param {sap.ui.Table } oTable 
         * @param {Array} aEmphasisSetting 
         * offset : 시작점, step : 적용간격
         */
        _tableHeaderSetting : function (oTable, aEmphasisSetting) {
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
         * @param {*} iValue 기본값
         */
        onFormatPerformance: function (iValue, sType) {
            // 값이 없을 때 0으로 돌려보냄
            if (!iValue) iValue=0;

            if (sType === "percent") {         
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });
                return oNumberFormat.format(iValue) + "%";
            } else if(sType === "tooltip" ){
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iValue);
            } else {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 0
                });
                return oNumberFormat.format(iValue/100000000);
            };
        },
        onRowSelectionChange: function (oEvent) {
            let oTable = oEvent.getSource();
            if (oTable.getSelectedIndices().length > 0) {
                this._oEventBus.publish("pl", "pltable");
            }
        },
        _clearSelection: function () {
            let oTable = this.byId("dtUiTable");
            if (oTable.getSelectedIndices().length > 0) {
                oTable.clearSelection();
            }
        },
        
        /**
         * PL dt plan sale 엑셀 다운로드
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
            const oPlBindingContext = oPlModel.bindContext(`/get_plan_dt_sale_excel(year='${iYear}',org_id='${sOrgId}')`);

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

                fnSetWorksheet("DT SALE", aResult[0].value);
            }.bind(this));

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `PL DT SALE Raw Data_${iYear}-${iMonth}.xlsx`;
            link.click();

            setTimeout(() => { URL.revokeObjectURL(url) }, 100);
        },
    });
});