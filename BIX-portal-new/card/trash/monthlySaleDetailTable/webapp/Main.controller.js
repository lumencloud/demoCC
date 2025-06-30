sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",

], function (Controller, JSONModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.monthlySaleDetailTable.Main", {
        _oEventBus: EventBus.getInstance(),

        onInit: function () {
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);

            this._bindTable();
        },

        _bindTable: async function (sChannelId, sEventId, oData = {}) {
            this._dummyModel();
            let oTable = this.byId("MonthlySaleDetailTable");
            oTable.setVisible(false)

            oTable.attachEventOnce("rowsUpdated", () => {
                oTable.fireFirstVisibleRowChanged({ firstVisibleRow: 0 });
            })
            // 셀 병합 UX 개선을 위한 시간차 설정 
            setTimeout(() => { oTable.setVisible(true) }, 0.01)
        },

        onFirstVisibleRowChanged: function (oEvent) {
            let oTable = /** @type {sap.ui.table.Table} */ (oEvent.getSource());
            let aRows = oTable.getRows();
            let iSkipCount = 0;
            let aContexts = oTable.getBinding().getContexts();

            for (let i = 0; i < aRows.length; i++) {
                let oRow = aRows[i];
                let oBindingContext = oRow.getBindingContext("SaleDetailTreeModel");
                if (!oBindingContext) continue;
                const oBinding = oBindingContext.getObject();

                if (iSkipCount > 0) {
                    const oCell = document.getElementById(`${oRow.getId()}-col0`);
                    oCell?.remove();
                    iSkipCount--;
                } else {
                    const iRowSpan = aContexts.filter(ctx => {
                        const oObj = ctx.getObject();
                        return oObj.div === oBinding.div;
                    }).length;

                    const oCell = document.getElementById(`${oRow.getId()}-col0`);
                    oCell?.setAttribute("rowspan", String(iRowSpan));
                    iSkipCount = iRowSpan - 1;
                }
                continue;
            }
            // ColumnResize 시 병합 CSS 적용
            oTable.attachEventOnce("columnResize", function () {
                // 원활한 적용을 위해 시간차 설정
                setTimeout(function () {
                    oTable.attachEventOnce("rowsUpdated", () => {
                        oTable.fireFirstVisibleRowChanged({ firstVisibleRow: 0 });
                    })
                }, 0.01);
            })
            oTable.attachEventOnce("columnMove", function () {
                // 원활한 적용을 위해 시간차 설정
                setTimeout(function () {
                    oTable.attachEventOnce("rowsUpdated", () => {
                        oTable.fireFirstVisibleRowChanged({ firstVisibleRow: 0 });
                    })
                }, 0.01);
            })

            oTable.setBusy(false);
        },

        formatNumber: function (value) {
            if (value === undefined || value === null || value === "") return "";

            let oNumberFormat = NumberFormat.getIntegerInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
            });

            return oNumberFormat.format(value)
        },
        formatPercent: function (value) {
            if (value === undefined || value === null || value === "") return "";

            let oNumberFormat = NumberFormat.getPercentInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
                decimals: 2
            });

            return oNumberFormat.format(value / 100)
        },

        /**
         * 엑셀 다운로드
         */
        onExcelDownload: function () {
            let oModel = this.getOwnerComponent().getModel("pl2");
            let sPath = `/get_pl_performance_detail_excel(year='2024',month='09',org_id='5')`;

            const oBinding = oModel.bindContext(sPath);

            oBinding.requestObject().then((oResult) => {
                // let aExcelData = oResult.value;
                let aExcelData = this.aDummyData;

                let workbook = new ExcelJS.Workbook();
                let worksheet = workbook.addWorksheet("매출 마진 상세실적");

                worksheet.columns = [
                    { header: "조직구분", key: "div", width: 20 },
                    { header: "구분", key: "type", width: 10 },
                    { header: "연목표", key: "target", width: 20 },
                    { header: "월 진척률", key: "progress", width: 20 },
                    ...Array.from({ length: 12 }, (_, i) => ({
                        header: `${i + 1}월`,
                        key: `month${i + 1}`,
                        width: 20,
                        numFmt: '#,##0'
                    }))
                ]
                let currentDiv = "";
                let divStartRow = null;
                let currentRowIndex = 2;

                let headerRow = worksheet.getRow(1);
                headerRow.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'E6EAF0' }
                    };
                    cell.alignment = {
                        horizontal: 'center',
                        vertical: 'middle'
                    };
                    cell.font = {
                        bold: true
                    };
                });

                worksheet.getColumn(2).alignment = { horizontal: 'center' };

                aExcelData.forEach(row => {
                    const formattedRow = {
                        div: row.div,
                        type: row.type,
                        target: Number(row.target),
                        progress: `${parseFloat(row.progress).toFixed(2)}%`
                    };
                    for (let i = 1; i <= 12; i++) {
                        formattedRow[`month${i}`] = Number(row[`month${i}`]);
                    }
                    let addedRow = worksheet.addRow(formattedRow)

                    addedRow.getCell(3).numFmt = '#,##0';
                    for (let i = 5; i <= 16; i++) {
                        addedRow.getCell(i).numFmt = '#,##0';
                    }

                    for (let i = 4; i <= addedRow.cellCount; i++) {
                        let oCell = addedRow.getCell(i);
                        oCell.alignment = { horizontal: 'right' }
                    }

                    if (row.div !== currentDiv) {
                        if (divStartRow !== null && currentRowIndex - divStartRow > 1) {
                            worksheet.mergeCells(`A${divStartRow}:A${currentRowIndex - 1}`);
                            worksheet.getCell(`A${divStartRow}`).alignment = {
                                horizontal: 'center',
                                vertical: 'middle'
                            }
                        }
                        currentDiv = row.div;
                        divStartRow = currentRowIndex;
                    }
                    currentRowIndex++;
                })
                if (divStartRow !== null && currentRowIndex - divStartRow > 1) {
                    worksheet.mergeCells(`A${divStartRow}:A${currentRowIndex - 1}`)
                    worksheet.getCell(`A${divStartRow}`).alignment = {
                        horizontal: 'center',
                        vertical: 'middle'
                    }
                }

                for (let row = 1; row <= currentRowIndex; row++) {
                    for (let col = 1; col <= 16; col++) {
                        worksheet.getCell(row, col).border = {
                            top: { style: 'thin' },
                            bottom: { style: 'thin' },
                            left: { style: 'thin' },
                            right: { style: 'thin' }
                        }
                    }
                }

                workbook.xlsx.writeBuffer().then(async function (buffer) {
                    let blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                    let link = document.createElement("a");
                    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
                    link.href = URL.createObjectURL(blob);
                    link.download = `매출/마진 실적_${today}.xlsx`;
                    link.click();
                }.bind(this));

                MessageToast.show("다운로드가 완료되었습니다.");
            }).catch((err) => {
                console.log(err);
            })
        },
        // 테이블 구현 테스트를 위한 임시데이터
        _dummyModel: function () {
            let oTable = this.byId("MonthlySaleDetailTable");
            this.aDummyData = [
                {
                    div: "A",
                    type: "수주",
                    target: 585874383,
                    progress: 80.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "A",
                    type: "매출",
                    target: 585874383,
                    progress: 80.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "A",
                    type: "마진",
                    target: 585874383,
                    progress: 80.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "B",
                    type: "수주",
                    target: 585874383,
                    progress: 20.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "B",
                    type: "매출",
                    target: 585874383,
                    progress: 30.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "B",
                    type: "마진",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "C",
                    type: "수주",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "C",
                    type: "매출",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "C",
                    type: "마진",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "D",
                    type: "수주",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "D",
                    type: "매출",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "D",
                    type: "마진",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "1",
                    type: "수주",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "1",
                    type: "매출",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "1",
                    type: "마진",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "2",
                    type: "수주",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "2",
                    type: "매출",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "2",
                    type: "마진",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "3",
                    type: "수주",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "3",
                    type: "매출",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "3",
                    type: "마진",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "5",
                    type: "수주",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "5",
                    type: "매출",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
                {
                    div: "5",
                    type: "마진",
                    target: 585874383,
                    progress: 50.43,
                    month1: 19999203, month2: 19999203, month3: 19999203, month4: 19999203, month5: 19999203, month6: 19999203, month7: 19999203,
                    month8: 19999203, month9: 19999203, month10: 19999203, month11: 19999203, month12: 19999203,
                },
            ]

            this.getView().setModel(new JSONModel(this.aDummyData), "SaleDetailTreeModel")
        },
    });
});