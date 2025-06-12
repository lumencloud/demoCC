sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/odata/v4/ODataModel",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
    "bix/test/ai/util/InteractionUtils"


], function (Controller, ODataModel, JSONModel, NumberFormat, EventBus, InteractionUtils) {
	"use strict";

	return Controller.extend("bix.card.orgRateTable.Main", {
		_sTableId: "table",
		_oEventBus: EventBus.getInstance(),

		onInit: function () {
			this._oEventBus.subscribe("pl", "search", this._bindTable, this);

			// 테이블에 셀 클릭 이벤트 등록
            var oTable = this.byId(this._sTableId);
            if (oTable) {
                oTable.attachCellClick(this.onCellClick, this);
            } 
			
			this._bindTable();
		},
		_tableHeaderSetting : function (oTable, aEmphasisSetting=[]) {
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
         * 테이블 행 클릭 이벤트
         * @param {Event} oEvent 
         */
        onRowSelectionChange: function (oEvent) {

            // InteractionUtils 사용하여 행 선택 처리
            InteractionUtils.handleTableRowSelection(
                this,
                oEvent,
                this._sTableId,
                {
                    gridName: "PL 본부별 진척 현황 테이블",
                    storageType: "session",
                    storageKey: "initSearchModel",
                    sekectedCell: this._lastClickedCellInfo
                }
            );
        },

		/**
         * 셀 클릭 이벤트 핸들러
         * @param {Event} oEvent
         */
        onCellClick: function(oEvent) {
            var result = InteractionUtils.processTableCellClick(this, oEvent, this._sTableId);     
            this._lastClickedCellInfo = result.cellInfo;
        },

		_bindTable: async function (oData) {
			let oTable = this.byId("table");
			if (!oTable) {
				return;
			};

			oTable.setBusy(true);

            oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;

			oTable.setVisible(false);
			oTable.destroyColumns();
			let oColumn0 = new sap.ui.table.Column({
				template: new sap.m.Text({ text: "{orgTableModel>type}", emptyIndicatorMode: "On"}),
				hAlign: "Center",
				width: "7rem"
			});
			oColumn0.addMultiLabel(new sap.m.Label({ text: '구분' }));
			oColumn0.addMultiLabel(new sap.m.Label({ text: "" }));
			oColumn0.addMultiLabel(new sap.m.Label({ text: "" }));
			oTable.addColumn(oColumn0);

			const oPlModel = this.getOwnerComponent().getModel("pl_api");
            const oBinding = oPlModel.bindContext(`/get_actual_pl_org_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`);
			let aResults = await oBinding.requestObject();

			let aTableData = [];
			let sId, oTemp1 = { type: "매출" }, oTemp2 = { type: "마진" }, oTemp3 = { type: "마진률" }, oTemp4 = { type: "SG&A" }, oTemp5 = { type: "공헌이익" }, oTemp6 = { type: " " },
				oTemp7 = { type: "DT매출" }, oTemp8 = { type: "Offshoring" }, oTemp9 = { type: "Non-MM" }, oTemp10 = { type: "BR" }, oTemp11 = { type: "RoHC" };
			let iCount = 0;
			
			aResults.value.forEach(data => {
				if (!sId) {
					sId = data.id;
				} else if (sId !== data.id) {
					sId = data.id;
				};
				let sGoal = sId + '_target_curr_y_value';
				let sMonthValue = sId + '_curr_ym_value';
				let sLyMonthValue = sId + '_last_ym_value';
				let sGap = sId + '_gap';

				if (iCount === 0) {
					let oColumn1 = new sap.ui.table.Column({
						template: new sap.m.Text({
							text: {
								parts: [
									{ path: `orgTableModel>type`, targetType: 'any' },
									{ path: `orgTableModel>${sGoal}`, targetType: 'any' }
								], formatter: this.onFormatPerformance.bind(this)
							},
							tooltip: {
								parts: [
									{ path: `orgTableModel>type`, targetType: 'any' },
									{ path: `orgTableModel>${sGoal}`, targetType: 'any' },
									{ value: 'tooltip' }
								], formatter: this.onFormatPerformance.bind(this)
							},
							textAlign: "End", wrapping: false, width: '100%', emptyIndicatorMode: "On"
						}),
						headerSpan: [4, 4],
						hAlign: "Center",
						width: "6rem"
					});
					oColumn1.addMultiLabel(new sap.m.Label({
						text: data[sId + '_name'],
						customData: [ 
							new sap.ui.core.CustomData({ key: "org_id", value: sId, writeToDom: false }),
						] }));
					oColumn1.addMultiLabel(new sap.m.Label({ text: "진척도" }));
					oColumn1.addMultiLabel(new sap.m.Label({ text: "목표" }));
					oTable.addColumn(oColumn1);

					let oColumn2 = new sap.ui.table.Column({
						template: new sap.m.Text({
							text: {
								parts: [
									{ path: `orgTableModel>type`, targetType: 'any' },
									{ path: `orgTableModel>${sMonthValue}`, targetType: 'any' }
								], formatter: this.onFormatPerformance.bind(this)
							},
							tooltip: {
								parts: [
									{ path: `orgTableModel>type`, targetType: 'any' },
									{ path: `orgTableModel>${sMonthValue}`, targetType: 'any' },
									{ value: 'tooltip' }
								], formatter: this.onFormatPerformance.bind(this)
							},
							textAlign: "End", wrapping: false, width: '100%', emptyIndicatorMode: "On"
						}),
						headerSpan: [3.3],
						hAlign: "Center",
						width: "6rem"
					});
					oColumn2.addMultiLabel(new sap.m.Label({
						text: data[sId + '_name'],
						customData: [ 
							new sap.ui.core.CustomData({ key: "org_id", value: sId, writeToDom: false }),
						] }));
					oColumn2.addMultiLabel(new sap.m.Label({ text: "진척도" }));
					oColumn2.addMultiLabel(new sap.m.Label({ text: "당월" }));
					oTable.addColumn(oColumn2);

					let oColumn3 = new sap.ui.table.Column({
						template: new sap.m.Text({
							text: {
								parts: [
									{ path: `orgTableModel>type`, targetType: 'any' },
									{ path: `orgTableModel>${sLyMonthValue}`, targetType: 'any' }
								], formatter: this.onFormatPerformance.bind(this)
							},
							tooltip: {
								parts: [
									{ path: `orgTableModel>type`, targetType: 'any' },
									{ path: `orgTableModel>${sLyMonthValue}`, targetType: 'any' },
									{ value: 'tooltip' }
								], formatter: this.onFormatPerformance.bind(this)
							},
							textAlign: "End", wrapping: false, width: '100%', emptyIndicatorMode: "On"
						}),
						headerSpan: [2, 2],
						hAlign: "Center",
						width: "6rem"
					});
					oColumn3.addMultiLabel(new sap.m.Label({
						text: data[sId + '_name'],
						customData: [ 
							new sap.ui.core.CustomData({ key: "org_id", value: sId, writeToDom: false }),
						] }));
					oColumn3.addMultiLabel(new sap.m.Label({ text: "진척도" }));
					oColumn3.addMultiLabel(new sap.m.Label({ text: "전년동기" }));
					oTable.addColumn(oColumn3);

					let oColumn4 = new sap.ui.table.Column({
						template: new sap.m.Text({
							text: {
								parts: [
									{ path: `orgTableModel>type`, targetType: 'any' },
									{ path: `orgTableModel>${sGap}`, targetType: 'any' }
								], formatter: this.onFormatPerformance.bind(this)
							},
							tooltip: {
								parts: [
									{ path: `orgTableModel>type`, targetType: 'any' },
									{ path: `orgTableModel>${sGap}`, targetType: 'any' },
									{ value: 'tooltip' }
								], formatter: this.onFormatPerformance.bind(this)
							},
							textAlign: "End", wrapping: false, width: '100%', emptyIndicatorMode: "On"
						}),
						hAlign: "Center",
						width: "6rem"
					});
					oColumn4.addMultiLabel(new sap.m.Label({
						text: data[sId + '_name'],
						customData: [ 
							new sap.ui.core.CustomData({ key: "org_id", value: sId, writeToDom: false }),
						] }));
					oColumn4.addMultiLabel(new sap.m.Label({ text: "진척도" }));
					oColumn4.addMultiLabel(new sap.m.Label({ text: "GAP" }));
					oTable.addColumn(oColumn4);
				};

				if (iCount === 6) {
					iCount = 0;

					oTemp6[`${sGoal}`] = " ";
					oTemp6[`${sMonthValue}`] = " ";
					oTemp6[`${sLyMonthValue}`] = " ";
					oTemp6[`${sGap}`] = " ";
				} else {
					iCount++;
				};

				if (data.rowType === "performance") {
					oTemp1[`${sGoal}`] = data[sId + '_target_curr_y_value'];
					oTemp1[`${sMonthValue}`] = data[sId + '_curr_ym_value'];
					oTemp1[`${sLyMonthValue}`] = data[sId + '_last_ym_value'];
					oTemp1[`${sGap}`] = data[sId + '_gap'];
				} else if (data.rowType === "margin") {
					oTemp2[`${sGoal}`] = data[sId + '_target_curr_y_value'];
					oTemp2[`${sMonthValue}`] = data[sId + '_curr_ym_value'];
					oTemp2[`${sLyMonthValue}`] = data[sId + '_last_ym_value'];
					oTemp2[`${sGap}`] = data[sId + '_gap'];
				} else if (data.rowType === "marginRate") {
					oTemp3[`${sGoal}`] = data[sId + '_target_curr_y_value'];
					oTemp3[`${sMonthValue}`] = data[sId + '_curr_ym_value'];
					oTemp3[`${sLyMonthValue}`] = data[sId + '_last_ym_value'];
					oTemp3[`${sGap}`] = data[sId + '_gap'];
				} else if (data.rowType === "sgaBiz") {
					oTemp4[`${sGoal}`] = data[sId + '_target_curr_y_value'];
					oTemp4[`${sMonthValue}`] = data[sId + '_curr_ym_value'];
					oTemp4[`${sLyMonthValue}`] = data[sId + '_last_ym_value'];
					oTemp4[`${sGap}`] = data[sId + '_gap'];
				} else if (data.rowType === "contributionValue") {
					oTemp5[`${sGoal}`] = data[sId + '_target_curr_y_value'];
					oTemp5[`${sMonthValue}`] = data[sId + '_curr_ym_value'];
					oTemp5[`${sLyMonthValue}`] = data[sId + '_last_ym_value'];
					oTemp5[`${sGap}`] = data[sId + '_gap'];
				} else if (data.rowType === "br") {
					oTemp10[`${sGoal}`] = data[sId + '_target_curr_y_value'];
					oTemp10[`${sMonthValue}`] = data[sId + '_curr_ym_value'];
					oTemp10[`${sLyMonthValue}`] = data[sId + '_last_ym_value'];
					oTemp10[`${sGap}`] = data[sId + '_gap'];
				} else if (data.rowType === "rohc") {
					oTemp11[`${sGoal}`] = data[sId + '_target_curr_y_value'];
					oTemp11[`${sMonthValue}`] = data[sId + '_curr_ym_value'];
					oTemp11[`${sLyMonthValue}`] = data[sId + '_last_ym_value'];
					oTemp11[`${sGap}`] = data[sId + '_gap'];
				};
			})

			aTableData.push(oTemp1);
			aTableData.push(oTemp2);
			aTableData.push(oTemp3);
			aTableData.push(oTemp4);
			aTableData.push(oTemp5);
			aTableData.push(oTemp6);
			aTableData.push(oTemp7);
			aTableData.push(oTemp8);
			aTableData.push(oTemp9);
			aTableData.push(oTemp10);
			aTableData.push(oTemp11);
			this.getView().setModel(new JSONModel(aTableData), "orgTableModel");

			oTable.setVisible(true);
			this._tableHeaderSetting(oTable);
			oTable.setBusy(false);
		},

		onFormatPerformance: function (sType, iValue, sTooltip) {
			if (iValue === 0) return;

			if (sType === "마진률" || sType === "BR") {
				let oNumberFormat = NumberFormat.getFloatInstance({
					groupingEnabled: true,
					groupingSeparator: ',',
					groupingSize: 3,
					decimals: 2,
				});
				return oNumberFormat.format(iValue) + "%";
			} else if (sTooltip === "tooltip" ) {
				let oNumberFormat = NumberFormat.getFloatInstance({
					groupingEnabled: true,
					groupingSeparator: ',',
					groupingSize: 3,
				});
				return oNumberFormat.format(iValue);
			} else if (sType === " ") {
				return " ";
			} else if (sType === "RoHC") {
				let oNumberFormat = NumberFormat.getFloatInstance({
					groupingEnabled: true,
					groupingSeparator: ',',
					groupingSize: 3,
					decimals: 2,
				});
				return oNumberFormat.format(iValue);
			}else {
				let iNewValue = iValue >= 0 ? Math.floor(iValue / 100000000) : Math.ceil(iValue / 100000000);

				let oNumberFormat = NumberFormat.getFloatInstance({
					groupingEnabled: true,
					groupingSeparator: ',',
					groupingSize: 3,
				});
				return oNumberFormat.format(iNewValue);
			};
		},

		/**
         * PL Detail 엑셀 다운로드
         */
        onExcelDownload: async function () {
			let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let iMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;

            // 데이터 반환
            const oPlModel = this.getOwnerComponent().getModel("pl_api");
            const oPlBindingContext = oPlModel.bindContext(`/get_actual_pl_org_detail_excel(year='${iYear}',month='${iMonth}',org_id='${sOrgId}')`);
            const oPlTargetBindingContext = oPlModel.bindContext(`/get_actual_pl_org_detail_target_excel(year='${iYear}',month='${iMonth}',org_id='${sOrgId}')`);

            const oSgaModel = this.getOwnerComponent().getModel("sga");
            const oSgaBindingContext = oSgaModel.bindContext(`/get_actual_sga_org_detail_excel(year='${iYear}',month='${iMonth}',org_id='${sOrgId}')`);

            const oRspModel = this.getOwnerComponent().getModel("rsp");
            const oRspBindingContext = oRspModel.bindContext(`/get_actual_rsp_org_detail_excel(year='${iYear}',month='${iMonth}',org_id='${sOrgId}')`);

            // Excel Workbook 생성
            const workbook = new ExcelJS.Workbook();

            await Promise.all([
                oPlBindingContext.requestObject(),
                oPlTargetBindingContext.requestObject(),
                oSgaBindingContext.requestObject(),
                oRspBindingContext.requestObject(),
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

                fnSetWorksheet("PL", aResult[0].value);
                fnSetWorksheet("PLTarget", aResult[1].value);
                fnSetWorksheet("SGA", aResult[2].value);
                fnSetWorksheet("RSP", aResult[3].value);
            }.bind(this));

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `PL Detail Raw Data_${iYear}-${iMonth}.xlsx`;
            link.click();

            setTimeout(() => { URL.revokeObjectURL(url) }, 100);
        },

	});
});