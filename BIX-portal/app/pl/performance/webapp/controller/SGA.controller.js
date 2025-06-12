sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/Sorter",
], function (JSONModel, Controller, MessageToast, Sorter) {
    "use strict";

    return Controller.extend("bix.pl.performance.controller.SGA", {
        onInit() {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteSGA");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        onMyRoutePatternMatched: async function () {
            //sga 페이지 내부에 2개의 페이지가 있으므로 3depth_page에 배열로 담음.
            // let aTemp = ["sgaDetail", "sgaChart"]
            // let oLayoutModel = this.getOwnerComponent().getModel("layoutControl");
            // oLayoutModel.setProperty("/3depth_size", "65%");
            // oLayoutModel.setProperty("/3depth_usage", true);
            // oLayoutModel.setProperty("/page", "sga");
            // oLayoutModel.setProperty("/3depth_page", aTemp);
            // oLayoutModel.setProperty("/3depth_page_sub", "chart");

            //차트제거
            let oLayoutModel = this.getOwnerComponent().getModel("layoutControl");
            oLayoutModel.setProperty("/3depth_size", "65%");
            oLayoutModel.setProperty("/3depth_usage", true);
            oLayoutModel.setProperty("/page", "sga");
            oLayoutModel.setProperty("/3depth_page", "sgaDetail");
            oLayoutModel.setProperty("/3depth_page_sub", "");
        },

        /**
         * 엑셀 다운로드
         */
        onExcelDownload: async function (sChk) {
            if (sChk === "sga") {
                // 테이블에 바인딩된 데이터가 있는지 확인
                let oController = this.getOwnerComponent().getModel("controllerModel").getProperty("/sgaDetail");
                let oTable = oController._table;
                let aBindingContext = oTable.getBinding("rows").getContexts();
                if (aBindingContext.length === 0) {
                    MessageToast.show("데이터가 없습니다.");
                    return;
                }

                // 검색 조건 반환
                let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();
                let iYear = oSearchData.yearMonth.getFullYear();
                let sOrgId = oSearchData.orgId;

                // 데이터 호출
                let oModel = this.getOwnerComponent().getModel("pl2");
                let sPath = `/get_sga_result_detail_excel(year='${iYear}',org_id='${sOrgId}')`;
                // let sPath = `/get_sga_result_detail_excel(year='${iYear}',org_id='5')`;

                const oBinding = oModel.bindContext(sPath);
                oBinding.requestObject().then((oResult) => {
                    let aExcelData = oResult.value;

                    // 엑셀 다운로드
                    let aColumnInfo = [
                        { key: "div_nm", text: "부문", width: 30, alignment: { horizontal: 'center', vertical: 'middle' } },
                        { key: "hdqt_nm", text: "본부", width: 30, alignment: { horizontal: 'center', vertical: 'middle' } },
                        { key: "team_nm", text: "팀", width: 30, alignment: { horizontal: 'center', vertical: 'middle' } },
                        { key: "type", text: "유형", width: 10, alignment: { horizontal: 'center', vertical: 'middle' } },
                        { key: "month1", text: "1월", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "month2", text: "2월", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "month3", text: "3월", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "month4", text: "4월", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "month5", text: "5월", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "month6", text: "6월", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "month7", text: "7월", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "month8", text: "8월", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "month9", text: "9월", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "month10", text: "10월", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "month11", text: "11월", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "month12", text: "12월", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "quarter1", text: "1Q", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "quarter2", text: "2Q", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "quarter3", text: "3Q", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "quarter4", text: "4Q", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "totalCurrentYear", text: "Total", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "totalLastYear", text: "전년동기", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                        { key: "difference", text: "차이", width: 15, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: "#,##0" },
                    ]

                    // aColumns.forEach((oColumn, index) => {
                    //     let iSpan = oColumn.getHeaderSpan();
                    //     let aMultiLabels = oColumn.getMultiLabels();
                    //     let sMultiLabel = aMultiLabels[0] ? aMultiLabels[0].getText() : "";
                    //     let sLabel = aMultiLabels[1] ? aMultiLabels[1].getText() : "";
                    //     let bMerge = true;
                    //     let sName = oColumn.getName();

                    //     if (iSpan > 1 && sMultiLabel !== aColumnInfo[index - 1].sMultiLabel) {
                    //         bMerge = false;
                    //     } else if (iSpan > 1 && sMultiLabel !== aColumnInfo[index - 1].sMultiLabel) {
                    //         sMultiLabel = "";
                    //     };
                    //     aColumnInfo.push({ index, sMultiLabel, sLabel, iSpan, bMerge, sName });
                    // });

                    let workbook = new ExcelJS.Workbook();
                    let worksheet = workbook.addWorksheet("SG&A 상세 실적");
                    let columnIndex = 1;

                    // aColumnInfo.forEach(col => {
                    //     let startCol = columnIndex;
                    //     let endColFirstRow = columnIndex + col.iSpan - 1;

                    //     if (col.bMerge === false) {
                    //         worksheet.mergeCells(1, startCol, 1, endColFirstRow);
                    //     }
                    //     worksheet.getCell(1, startCol).value = col.sMultiLabel;
                    //     worksheet.getCell(2, startCol).value = col.sLabel;
                    //     columnIndex++;
                    // });

                    let headerRow = worksheet.getRow(0);
                    headerRow.eachCell((cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'E6EAF0' }
                        };
                    });

                    let oHeaderText = aColumnInfo.map(oColumnInfo => oColumnInfo.text);
                    worksheet.addRow(oHeaderText);

                    headerRow = worksheet.getRow(1);
                    headerRow.eachCell((cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'E6EAF0' }
                        };
                    });

                    // Row 추가
                    if (aExcelData.length > 0) {
                        aExcelData.forEach(function (oExcelData) {
                            let oRowValue = [];
                            for (let index in aColumnInfo) {
                                // 컬럼 정보
                                let oColumnInfo = aColumnInfo[index];

                                let sKey = oColumnInfo.key;
                                if (sKey === "difference") { // 차이 필드 추가
                                    oRowValue.push(oExcelData["totalCurrentYear"] - oExcelData["totalLastYear"]);
                                } else {
                                    oRowValue.push(oExcelData[sKey]);
                                }
                            }

                            worksheet.addRow(oRowValue);
                        })
                    } else {
                        worksheet.addRow(['No Data']).font = { italic: true };
                    };

                    // 셀 병합
                    let iHdqtCount = 0, iTeamCount = 0;
                    for (let i = 0; i <= aExcelData.length - 3; i += 3) {
                        let oExcelData = aExcelData[i];
                        let iStartIndex = i + 2

                        if (!oExcelData.team_nm && !oExcelData.hdqt_nm) {  // 부문
                            let iEndIndex = iStartIndex + 2;
                            worksheet.mergeCells(iStartIndex, 1, iEndIndex, 3);
                        } else if (oExcelData.team_nm && !oExcelData.hdqt_nm) { // 본부 없는 팀
                            let iEndIndex = iStartIndex + aExcelData.filter(oData => {
                                return oData.div_nm === oExcelData.div_nm && oData.team_nm && !oData.hdqt_nm
                            }).length - 1;
                            worksheet.mergeCells(iStartIndex, 1, iEndIndex, 2);

                            // 같은 팀 병합
                            worksheet.mergeCells(iStartIndex, 3, iStartIndex + 2, 3);
                        } else if (oExcelData.hdqt_nm && !oExcelData.team_nm) { // 본부
                            // 부문, 본부 병합
                            worksheet.mergeCells(iStartIndex, 2, iStartIndex + 2, 3);

                            // 같은 부문들 병합 (본부가 같은 데이터)
                            if (iHdqtCount === 0) {
                                iHdqtCount = aExcelData.filter(oData => {
                                    return oData.div_nm === oExcelData.div_nm && !!oData.hdqt_nm
                                }).length;
                                let iEndIndex = iStartIndex + iHdqtCount - 1;
                                worksheet.mergeCells(iStartIndex, 1, iEndIndex, 1);
                            }
                        } else {    // 팀
                            // 본부 세로 병합
                            if (iTeamCount === 0) {
                                iTeamCount = aExcelData.filter(oData => {
                                    return oData.div_nm === oExcelData.div_nm && oData.hdqt_nm === oExcelData.hdqt_nm && oData.team_nm
                                }).length;
                                let iEndIndex = iStartIndex + iTeamCount - 1;

                                worksheet.mergeCells(iStartIndex, 2, iEndIndex, 2);
                            }

                            worksheet.mergeCells(iStartIndex, 3, iStartIndex + 2, 3);
                        }

                        // 카운트가 남아있을 때 3 차감
                        if (iHdqtCount) iHdqtCount -= 3;
                        if (iTeamCount) iTeamCount -= 3;
                    }

                    // 컬럼별 속성 설정
                    aColumnInfo.forEach((oColumnInfo, index) => {
                        let oColumn = worksheet.columns[index];
                        oColumn.alignment = oColumnInfo.alignment;
                        oColumn.width = oColumnInfo.width;
                        oColumn.numFmt = oColumnInfo.numFmt || null;
                    });

                    workbook.xlsx.writeBuffer().then(async function (buffer) {
                        let blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                        let link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = `SG&A 상세 실적_${iYear}.xlsx`;
                        link.click();
                    }.bind(this));

                    MessageToast.show("다운로드가 완료되었습니다.");
                }).catch((err) => {
                    console.log(err)
                })
            } else if (sChk === "sgaDetail") {
                MessageToast.show("개발 진행 중입니다.");
            };
        },
    });
});
