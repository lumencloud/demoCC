sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (MessageBox, MessageToast) {
    "use strict";

    return {
        _getData: function (sUrl) {
            let settings = {
                type: "get",
                async: true,
                url: sUrl,
            };
            return new Promise((resolve) => {
                $.ajax(settings)
                    .done((oResult) => {
                        resolve(oResult);
                    })
                    .fail(function (xhr) {
                        console.log(xhr);
                    })
            });
        },

        /**
         * 메시지 박스 생성 함수
         * @param {String} status 
         * @param {String} message 
         * @param {String} title 
         */
        _messageBox: function (status, message, title) {
            MessageBox[status](message, {
                title: title,
            })
        },

        _messageBoxConfirm: function (status, message, title) {
            return new Promise((resolve) => {
                MessageBox[status](message, {
                    title: title,
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (oAction) {
                        if (oAction === "OK") {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    }
                })
            });
        },

        /* TableMerge 수정 250701 */
        setTableMergeWithAltColor: function (oTable, oModel) {
            oTable.attachEventOnce("rowsUpdated", () => {
                setTimeout(() => {
                    this.performCellMergeWithAltColor(oTable, oModel);
                }, 0);
            });
        },

        /* TableMerge 수정 250701 */
        performCellMergeWithAltColor: function (oTable, oModel) {
            const aVisibleRows = oTable.getRows(); // 현재 화면에 보이는 행들을 가져온다.

            const oMergeColumns = [];

            // customData에서 mergeKey로 지정한 목록을 찾는다.
            // 2~3단 merge도 있을 수 있기 때문에, forEach로 전체를 뒤져야 한다.
            // 현재 보여지는 테이블 컬럼 기준으로 설정
            oTable.getColumns().filter(oCol => oCol.getVisible()).forEach((oColumn, i) => {
                const oCustomData = oColumn.getCustomData().find(data => data.getKey() === "mergeKey");
                if (oCustomData) {
                    oMergeColumns.push({
                        mergeKey: oCustomData.getValue(),
                        columnIndex: i,
                        previousValue: null,
                        previousCell: null
                    });
                }
            });

            if (oMergeColumns.length < 1) {
                return; // merge할 column이 없으면 끝.
            }

            let bAltRow = true; // 색상 변경을 위한 Switch

            aVisibleRows.forEach((oRow, i) => {
                var oContext
                if (oModel) {
                    oContext = oRow.getBindingContext(oModel);
                } else {
                    oContext = oRow.getBindingContext();
                }

                if (!oContext) {
                    return; // Context가 빈(데이터가 없는) 행은 건너뛴다.
                }

                // 전체 Context 중에 몇 번째 index인지
                let iContextIndex = oTable.getBinding("rows").getContexts().indexOf(oContext);
                // let 

                oMergeColumns.forEach((mergeCol, j) => {
                    const sCurrentValue = oContext.getProperty(mergeCol.mergeKey);
                    const oCurrentCell = oRow.getCells()[mergeCol.columnIndex];

                    /**
                     * mergedCell : 문자 제거 - display : none
                     * mergedContainer : 라인 제거 - border-bottom : none
                     */
                    // 행이 무조건 재사용되므로 이전 스타일은 항상 초기화한다.
                    oCurrentCell.removeStyleClass("mergedCell");
                    if (mergeCol.previousCell) { // 0번 row는 null이므로...
                        mergeCol.previousCell.removeStyleClass("mergedContainer");
                    }

                    if (i > 0 && sCurrentValue === mergeCol.previousValue) {
                        // 이전 행과 값이 같으면 mergedCell 적용
                        oCurrentCell.addStyleClass("mergedCell");
                        // border-bottom(top이 아니다!)을 없애야 하므로...미리 저장해둔 "직전" Cell을 찾아서 스타일 클래스"만" 적용
                        // <td>를 찾아서 적용해야 한다. Cell은 <span>에 적용되므로 css에서 has()를 통해 찾을 예정이라, 클래스는 실제론 없고 flag로만 사용한다.
                        mergeCol.previousCell.addStyleClass("mergedContainer");
                    } else {
                        // 값이 다르거나 첫 번째 행이면 merge 하지 않는다.
                        mergeCol.previousValue = sCurrentValue;
                        // 값이 다른 첫 번째 행이면 색상을 바꿔야 하는데, 색상은 0번 컬럼의 merge을 기준으로 toggle 한다.
                        if (j === 0) {
                            bAltRow = !bAltRow;
                        }
                    }

                    // 항상 직전 Cell을 저장해둔다...직전 Cell에 style을 적용해야 하므로.
                    mergeCol.previousCell = oCurrentCell;
                });

                // Row(<td>)도 항상 재사용되므로, 초기화를 일단 시키고 toggle에 따라 색상 Style을 적용한다.
                oRow.removeStyleClass("altColor");

                if (bAltRow) {
                    oRow.addStyleClass("altColor");
                }
            });
        },

        setTableMerge: function (oTable, sModelId, maxColIndex) {

            oTable.attachEventOnce("rowsUpdated", () => {
                //컬럼 사이즈 변경시 병합초기화 되지않게 방지
                oTable.attachEvent("columnResize", () => {
                    setTimeout(() => {
                        oTable.rerender();
                        this.merge(oTable, sModelId, maxColIndex);
                        this.mergeHeader(oTable);
                        this.setTableCellClass(oTable);
                        let aRowMergeInfo = this._tableRowGrouping(oTable);

                        this.setMergeTableHover(oTable, aRowMergeInfo);
                        this.setMergeTableRowClick(oTable, aRowMergeInfo);
                        this.setMergeTableAlternateColor(oTable, aRowMergeInfo);

                    }, 0);
                });
                //스크롤 이동시 병합
                oTable.attachFirstVisibleRowChanged(() => {
                    oTable.rerender();
                    this.merge(oTable, sModelId, maxColIndex);
                    this.mergeHeader(oTable);
                    this.setTableCellClass(oTable);
                    let aRowMergeInfo = this._tableRowGrouping(oTable);

                    this.setMergeTableHover(oTable, aRowMergeInfo);
                    this.setMergeTableRowClick(oTable, aRowMergeInfo);
                    this.setMergeTableAlternateColor(oTable, aRowMergeInfo);

                });

                //처음 한번 병합
                oTable.rerender();
                this.merge(oTable, sModelId, maxColIndex);
                this.mergeHeader(oTable);
                this.setTableCellClass(oTable);
                let aRowMergeInfo = this._tableRowGrouping(oTable);

                this.setMergeTableHover(oTable, aRowMergeInfo);
                this.setMergeTableRowClick(oTable, aRowMergeInfo);
                this.setMergeTableAlternateColor(oTable, aRowMergeInfo);

            });


        },
        // 데이터행 양수/음수 구분색 부여
        setTableCellClass: function (oTable) {
            let aCells = oTable.getDomRef().querySelectorAll(".sapUiTableCCnt .sapUiTableCtrlScr .sapMText.status-color")
            for (const oCell of aCells) {
                let oText = oCell.textContent;
                if (typeof oText === "string" && oText !== "" && isFinite(Number(oText.replace(/,/g, '')))) {
                    if (Number(oText.replace(/,/g, '')) > 0) {
                        oCell.classList.add("positive")
                    } else if (Number(oText.replace(/,/g, '')) < 0) {
                        oCell.classList.add("negative")
                    }
                }
            }
        },
        // 데이터행 양수/음수 구분색 부여
        setTableCellEmpty: function (oTable) {
            let aCells = oTable.getDomRef().querySelectorAll(".sapUiTableCCnt .sapUiTableCtrlScr .sapMText.status")
            for (const oCell of aCells) {
                let oText = oCell.textContent;
                if (typeof oText === "string" && oText !== "" && isFinite(Number(oText.replace(/,/g, '')))) {
                    if (Number(oText.replace(/,/g, '')) > 0) {
                        oCell.classList.add("positive")
                    } else if (Number(oText.replace(/,/g, '')) < 0) {
                        oCell.classList.add("negative")
                    }
                }
            }
        },
        _mergeRowGrouping: function (aArr, iSize) {
            const aResult = {};
            let iPrevGroupNum;
            for (let i = 0; i < aArr.length; i++) {
                if (i === 0) {
                    let aChildArr = [];
                    aChildArr.push(aArr[i])
                    iPrevGroupNum = Math.floor(aArr[i] / iSize);
                    aResult[iPrevGroupNum] = aChildArr;
                } else {
                    if (iPrevGroupNum === Math.floor(aArr[i] / iSize)) {
                        aResult[iPrevGroupNum].push(aArr[i]);
                    } else {
                        let aChildArr = [];
                        aChildArr.push(aArr[i])
                        iPrevGroupNum = Math.floor(aArr[i] / iSize);
                        aResult[iPrevGroupNum] = aChildArr;
                    }
                }
            }
            return aResult;
        },
        _tableRowGrouping: function (oTable) {
            let aRows = oTable.getRows();
            let aFixedDataRow = Array.from(oTable.getDomRef().querySelectorAll(".sapUiTableCCnt .sapUiTableCtrlScrFixed .sapUiTableRow"));
            if (aFixedDataRow.length > 0) {
                let iDepthMax;
                let aGroup = [];
                for (let i = 0; i < aRows.length; i++) {
                    let aFixedCell = aFixedDataRow[i].querySelectorAll(".sapUiTableCell");
                    let oMergeInfo = {};
                    if (i === 0) {
                        iDepthMax = aFixedCell.length;
                    }
                    if (aFixedCell.length === iDepthMax) {
                        for (let j = 0; j < aFixedCell.length; j++) {
                            oMergeInfo["merge_" + j] = aFixedCell[j]
                        }
                        oMergeInfo["alternate"] = i === 0 ? false : !aGroup[i - 1]["alternate"];
                        aGroup.push(oMergeInfo);
                    } else {
                        let iMergeGap = iDepthMax - aFixedCell.length;
                        for (let j = 0; j < iDepthMax; j++) {
                            if (j < iMergeGap) {
                                oMergeInfo["merge_" + j] = aGroup[i - 1]["merge_" + j]
                            } else {
                                oMergeInfo["merge_" + j] = aFixedCell[j - iMergeGap]
                            }
                        }
                        oMergeInfo["alternate"] = aGroup[i - 1]["alternate"]
                        aGroup.push(oMergeInfo);
                    }
                }
                return aGroup;
            }
        },
        // 셀병합 테이블 테이블 호버 이벤트
        setMergeTableHover: function (oTable, aRowMergeInfo) {
            let oTableContent = oTable.getDomRef().querySelector(".sapUiTableCCnt");
            let aDataRow = Array.from(oTable.getDomRef().querySelectorAll(".sapUiTableCCnt .sapUiTableCtrlScr .sapUiTableRow"));
            let aFixedDataRow = Array.from(oTable.getDomRef().querySelectorAll(".sapUiTableCCnt .sapUiTableCtrlScrFixed .sapUiTableRow"));
            let aFixedDataCell = Array.from(oTable.getDomRef().querySelectorAll(".sapUiTableCCnt .sapUiTableCtrlScrFixed .sapUiTableRow .sapUiTableCell"));



            oTableContent.addEventListener("mouseleave", () => {
                aFixedDataCell.forEach(oCell => oCell.classList.remove("row-hover-highlight"));
            });
            if (aRowMergeInfo) {
                for (let i = 0; i < aRowMergeInfo.length; i++) {
                    aFixedDataRow[i].addEventListener("mouseenter", () => {
                        aFixedDataCell.forEach(oCell => oCell.classList.remove("row-hover-highlight"));
                        for (let j = 0; j < Object.keys(aRowMergeInfo[i]).length - 1; j++) {
                            aRowMergeInfo[i]["merge_" + j].classList.add("row-hover-highlight");
                        }
                    });
                    aDataRow[i].addEventListener("mouseenter", () => {
                        aFixedDataCell.forEach(oCell => oCell.classList.remove("row-hover-highlight"));
                        for (let j = 0; j < Object.keys(aRowMergeInfo[i]).length - 1; j++) {
                            aRowMergeInfo[i]["merge_" + j].classList.add("row-hover-highlight");
                        }
                    });
                }
            }
        },
        // 셀병합 테이블 셀렉션 세팅
        setMergeTableRowClick: function (oTable, aRowMergeInfo) {
            let aFixedDataRow = Array.from(oTable.getDomRef().querySelectorAll(".sapUiTableCCnt .sapUiTableCtrlScrFixed .sapUiTableRow"));
            let aFixedDataCell = Array.from(oTable.getDomRef().querySelectorAll(".sapUiTableCCnt .sapUiTableCtrlScrFixed .sapUiTableRow .sapUiTableCell"));
            aFixedDataCell.forEach((oFixedRow) => oFixedRow.classList.remove("row-active-highlight"))
            if (aRowMergeInfo) {
                for (let i = 0; i < aRowMergeInfo.length; i++) {
                    if (aFixedDataRow[i].classList.contains("sapUiTableRowSel")) {
                        for (let j = 0; j < Object.keys(aRowMergeInfo[i]).length - 1; j++) {
                            if (j === 0) aRowMergeInfo[i]["merge_" + j].classList.add("first-row");
                            aRowMergeInfo[i]["merge_" + j].classList.add("row-active-highlight");
                        }
                    }
                }
            }
        },

        // alternate color 적용
        setMergeTableAlternateColor: function (oTable, aRowMergeInfo) {
            let aDataRow = Array.from(oTable.getDomRef().querySelectorAll(".sapUiTableCCnt .sapUiTableCtrlScr .sapUiTableRow"));
            let aFixedDataRow = Array.from(oTable.getDomRef().querySelectorAll(".sapUiTableCCnt .sapUiTableCtrlScrFixed .sapUiTableRow"));

            aFixedDataRow.forEach((oFixedRow) => oFixedRow.classList.remove("row-alternate-color"))
            aDataRow.forEach((oDataRow) => oDataRow.classList.remove("row-alternate-color"))
            if(aRowMergeInfo){
                for (let i = 0; i < aRowMergeInfo.length; i++) {
                    if (aRowMergeInfo[i]["alternate"]) {
                        aFixedDataRow[i].classList.add("row-alternate-color");
                        aDataRow[i].classList.add("row-alternate-color")
                    }
                }
            }
        },
        //가로 병합후 세로 병합 진행
        merge: function (oTable, sModelId, Index) {
            var aRows = oTable.getRows()

            //가로병합
            for (let rowIndex = 0; rowIndex < aRows.length; rowIndex++) {
                var iSkipcount = 0;
                let oRow = aRows[rowIndex];
                let oBindingContext = oRow.getBindingContext(sModelId);
                if (!oBindingContext) continue;
                for (let maxIndex = 0; maxIndex < Index; maxIndex++) {
                    //iSkipcount 겹치는게 있는 경우 병합을 위해 cell 안의 값 제거
                    if (iSkipcount > 0) {
                        const oCell = document.getElementById(`${oRow.getId()}-col${maxIndex}`);
                        oCell.remove();
                        iSkipcount--;
                    } else {
                        const oCurrentCell = document.getElementById(`${oRow.getId()}-col${maxIndex}`);
                        if (!oCurrentCell || oCurrentCell.rowSpan > 1) continue;
                        const sCurrentText = oCurrentCell.innerText.trim();
                        var iColSpan = 1;

                        for (let j = maxIndex + 1; j < Index; j++) {
                            const oCompareCell = document.getElementById(`${oRow.getId()}-col${j}`);
                            if (!oCompareCell) break;
                            const sCompareText = oCompareCell.innerText.trim();
                            //비교되는 행의 값이 없는 경우도 병합
                            if (sCurrentText !== sCompareText && sCompareText !== "" && sCurrentText !== "") {
                                break;
                            }
                            iColSpan++
                        }
                        const oCell = document.getElementById(`${oRow.getId()}-col${maxIndex}`);
                        oCell.setAttribute("colspan", String(iColSpan));
                        iSkipcount = iColSpan - 1;
                    }
                }
            }
            //세로병합
            for (let maxIndex = 0; maxIndex < Index; maxIndex++) {
                var iSkipcount = 0;
                for (let i = 0; i < aRows.length; i++) {
                    let oRow = aRows[i];
                    let oBindingContext = oRow.getBindingContext(sModelId);
                    if (!oBindingContext) continue;
                    if (iSkipcount > 0) {
                        const oCell = document.getElementById(`${oRow.getId()}-col${maxIndex}`);
                        oCell?.remove();
                        iSkipcount--;
                    } else {
                        const oCurrentCell = document.getElementById(`${oRow.getId()}-col${maxIndex}`);
                        if (!oCurrentCell) continue;
                        const sCurrentText = oCurrentCell.innerText.trim();
                        const iCurrentColSpan = oCurrentCell.colSpan;

                        var iRowSpan = 1;
                        for (let j = i + 1; j < aRows.length; j++) {
                            let oCompareRow = aRows[j];
                            let oCompareContext = oCompareRow.getBindingContext(sModelId);
                            if (!oCompareContext) break;

                            const oCompareCell = document.getElementById(`${oCompareRow.getId()}-col${maxIndex}`);
                            if (!oCompareCell) break;
                            const sCompareText = oCompareCell.innerText.trim();
                            const iCompareColSpan = oCompareCell.colSpan;

                            if (sCurrentText !== sCompareText || iCompareColSpan !== iCurrentColSpan) {
                                break;
                            }
                            iRowSpan++

                        }
                        const oCell = document.getElementById(`${oRow.getId()}-col${maxIndex}`);
                        oCell.setAttribute("rowspan", String(iRowSpan));
                        iSkipcount = iRowSpan - 1;
                    }
                }
            }
        },
        mergeHeader: function (oTable) {
            if (!oTable.getDomRef()) return;
            let iRowCnt = oTable.getDomRef().querySelectorAll(".sapUiTableColHdrCnt .sapUiTableCtrlScr .sapUiTableCtrl .sapUiTableRow").length;
            let aLabel = oTable.getColumns().filter(oCol => Array.isArray(oCol.getAggregation("multiLabels")) && oCol.getAggregation("multiLabels").length === 0)
            aLabel.forEach(oLabel => {
                oLabel.getDomRef().setAttribute("rowspan", iRowCnt);
                oLabel.getDomRef().classList.add("one-label");
            });
            let aEmptyLabel = oTable.getDomRef().querySelectorAll(".sapUiTableColHdrCnt .sapUiTableCtrl .sapUiTableCell:not(:has(.sapMLabel))");
            for (const oEmptyLabel of aEmptyLabel) {
                oEmptyLabel.remove();
            }
        },

        //Header 추출 및 colspan 체크 가로병합만 체크
        extractTableHeader: function (oTable) {
            const aColumns = oTable.getColumns();
            const headerRow = [];

            aColumns.forEach((oCol, colIndex) => {

                //header 에서 span 추출
                const span = oCol.getHeaderSpan();
                //기본값인 경우에는 undefined 인 경우 1 
                const nColspan = typeof span === "number" ? span : 1;

                //멀티헤더 값을 가져옴 , 단일헤더는 안됨
                const oMultiLabels = oCol.getMultiLabels?.() || [];

                //단일헤더인지 확인 후 단일헤더인경우 getLabel로 추출
                const aLabels = oMultiLabels.length > 0 ? oMultiLabels : [oCol.getLabel?.()].filter(Boolean);

                aLabels.forEach((oLabel, rowIndex) => {
                    const text = oLabel.getText?.() || "";
                    //다음 행 없는 경우 행 추가
                    if (!headerRow[rowIndex]) {
                        headerRow[rowIndex] = [];
                    }

                    const row = headerRow[rowIndex];
                    const last = row[row.length - 1];

                    //이전 내용과 같은경우 병합카운트 추가
                    if (last && last.content === text) {
                        last.colSpan += nColspan;
                    } else { //다를시 headerRow에 push
                        headerRow[rowIndex].push({
                            colSpan: nColspan,
                            content: text,
                            styles: {
                                lineColor: [0, 0, 0],
                                lineWidth: 0.2
                            }
                        });
                    }
                });
            })
            return headerRow;
        },

        //테이블 pdf로 추출 다운로드
        pdfTableDownload: async function (oTable, pdfName, dom) {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF("portrait", "mm", "a4");


            //글씨체 등록
            pdf.addFileToVFS(
                window.NanumGothicLightFontData.name,
                window.NanumGothicLightFontData.data,
            );
            pdf.addFont(window.NanumGothicLightFontData.name, "NanumGothicLight", "normal");
            pdf.setFont("NanumGothicLight");

            //pdf내에서 object 위치 Y값 설정
            let currentY = 25;

            //header span값을 포함한 값 추출
            const head = this.extractTableHeader(oTable);

            //body 값 추출
            const oBinding = oTable.getBinding("rows");
            const aColumns = oTable.getColumns();
            const aContexts = oBinding.getContexts(0, oBinding.getLength());
            const aData = aContexts.map(ctx => {
                const rowData = ctx.getObject();
                return aColumns.map(col => {
                    const oTemplate = col.getTemplate();
                    const sPath = oTemplate?.getBindingPath("text") || oTemplate?.getBindingPath("value");
                    return sPath ? rowData[sPath] ?? "" : "";
                })
            });


            //autoTable jspdf를 이용하여 table 생성
            pdf.autoTable({
                head: head,
                body: aData,
                startY: currentY,
                styles: {
                    font: "NanumGothicLight",
                    fontSize: 10
                }
            });

            //하단에 추가할 dom이 있는 경우 
            if (dom) {
                //위의 테이블의 길이에 +10
                const nextY = pdf.lastAutoTable.finalY + 10;
                const canvas = await html2canvas(dom);
                const imgData = canvas.toDataURL("image/png");
                const imgWidth = pdf.internal.pageSize.getWidth();
                const imgHeight = canvas.height * imgWidth / canvas.width;

                pdf.addImage(imgData, "PNG", 0, nextY, imgWidth, imgHeight);

            }


            //pdf 입력받은 이름으로 저장
            pdf.save(pdfName + ".pdf");

        },

        /**
         * 카드 팝업(다이얼로그) 호출 여부 체크
         * true - dialog
         * @param {*} oThis 
         * @returns 
         */
        checkIsDialog: (oThis) => {
            let oParent = oThis.getOwnerComponent().oContainer;

            while (oParent) {
                if (oParent.isA("sap.m.Dialog")) {
                    return true;
                }
                if (oParent.isA("sap.ui.core.mvc.View")) {
                    return false;
                }
                oParent = oParent.getParent();
            }
        },

        // 테이블인 경우 해당 테이블의 객체 ex) this.byId(tableID)
        // 카드인 경우 해당 카드의 객체
        displayStatus(oApplyContent, sStatus, oThis) {
            // let sCallStatus = oResult["status"]; // rejected or fulfilled
            if (oApplyContent.isA("sap.ui.table.Table")) {
                if (sStatus.startsWith("2")) {
                    if (sStatus === "204") {
                        oApplyContent.setNoData("데이터가 없습니다")
                        oThis.setBusy(false);
                    } else {
                        oApplyContent.setNoData(` `)
                    }
                } else {
                    oApplyContent.setNoData(`${sStatus} ERROR\n 관리자에게 문의해 주세요`)
                    oThis.setBusy(false);
                    return false
                }
                return true;
            } else if (oApplyContent.isA("sap.ui.integration.widgets.Card")) {
                if (oThis.isA("sap.m.Panel") || oThis.isA("sap.ui.layout.form.SimpleForm")) {
                    let aContent = oThis.getContent();
                    aContent.forEach((oContent) => {
                        if (oContent.hasStyleClass("custom-card-status")) {
                            oThis.removeContent(oContent);
                        }
                    })
                } else {
                    let aItems = oThis.getItems();
                    aItems.forEach((oItem) => {
                        if (oItem.hasStyleClass("custom-card-status")) {
                            oThis.removeItem(oItem);
                        }
                    })
                }
                if (sStatus.startsWith("2")) {
                    if (sStatus === "204") {
                        if (oThis.isA("sap.m.Panel") || oThis.isA("sap.ui.layout.form.SimpleForm")) {
                            oThis.addContent(new sap.m.Text({
                                text: "데이터가 없습니다",
                                textAlign: "Center",
                            }).addStyleClass("custom-card-status"))
                        } else {
                            oThis.addItem(new sap.m.Text({
                                text: "데이터가 없습니다",
                                textAlign: "Center",
                            }).addStyleClass("custom-card-status"))
                        }
                    }
                    oThis.setBusy(false);
                } else {
                    if (oThis.isA("sap.m.Panel") || oThis.isA("sap.ui.layout.form.SimpleForm")) {
                        oThis.addContent(new sap.m.Text({
                            text: `${sStatus} ERROR\n 관리자에게 문의해 주세요`,
                            textAlign: "Center",
                        }).addStyleClass("custom-card-status"))
                    } else {
                        oThis.addItem(new sap.m.Text({
                            text: `${sStatus} ERROR\n 관리자에게 문의해 주세요`,
                            textAlign: "Center",
                        }).addStyleClass("custom-card-status"))
                    }
                    oThis.setBusy(false);
                    return false;
                }
                return true;
            }
        },

        displayStatusForEmpty(oApplyContent, oData, oThis) {
            // let sCallStatus = oResult["status"]; // rejected or fulfilled
            if (oApplyContent.isA("sap.ui.table.Table")) {
                if (oData.length <= 0) {
                    oApplyContent.setNoData("데이터가 없습니다")
                } else {
                    oApplyContent.setNoData(` `)
                }
            } else if (oApplyContent.isA("sap.ui.integration.widgets.Card")) {
                if (oThis.isA("sap.m.Panel") || oThis.isA("sap.ui.layout.form.SimpleForm")) {
                    let aContent = oThis.getContent();
                    aContent.forEach((oContent) => {
                        if (oContent.hasStyleClass("custom-card-status")) {
                            oThis.removeContent(oContent);
                        }
                    })
                } else {
                    let aItems = oThis.getItems();
                    aItems.forEach((oItem) => {
                        if (oItem.hasStyleClass("custom-card-status")) {
                            oThis.removeItem(oItem);
                        }
                    })
                }
                if (oData.length <= 0) {
                    if (oThis.isA("sap.m.Panel") || oThis.isA("sap.ui.layout.form.SimpleForm")) {
                        oThis.addContent(new sap.m.Text({
                            text: "데이터가 없습니다",
                            textAlign: "Center",
                        }).addStyleClass("custom-card-status"))
                    } else {
                        oThis.addItem(new sap.m.Text({
                            text: "데이터가 없습니다",
                            textAlign: "Center",
                        }).addStyleClass("custom-card-status"))
                    }
                }
            }
        },

        //row data excel download
        rowExcelDownload: async function (aData, sFilename) {
            const workbook = new ExcelJS.Workbook();
            const aColName = [
                { key: 'year', header: '회계연도', sort: 0, width: 12, align: 'right' },
                { key: 'month', header: '마감월', sort: 1, width: 11, align: 'right' },
                { key: 'biz_opp_no', header: '영업기회', sort: 2, width: 18, align: 'right' },
                // { key: 'biz_opp_nm', header: '사업기회명', sort: 3,width : 50 },
                { key: 'prj_no', header: '수행계획코드', sort: 4, width: 22, align: 'left' },
                { key: 'prj_nm', header: '프로젝트명', sort: 5, width: 60, align: 'left' },
                { key: 'cstco_name', header: '고객사', sort: 6, width: 46, align: 'left' },
                { key: 'cstco_cd', header: '고객코드', sort: 7, width: 14, align: 'right' },
                { key: 'prj_prfm_str_dt', header: '수행 시작일', sort: 8, width: 18, align: 'right' },
                { key: 'prj_prfm_end_dt', header: '수행 종료일', sort: 9, width: 18, align: 'right' },
                { key: 'ovse_biz_yn', header: '해외사업여부', sort: 10, width: 13, align: 'center' },
                { key: 'relsco_yn', header: '관계사여부', sort: 11, width: 11, align: 'center' },
                { key: 'prj_tp_cd', header: '프로젝트 타입 코드', sort: 12, width: 20, align: 'center' },
                { key: 'prj_tp_nm', header: '프로젝트 타입명', sort: 13, width: 22, align: 'left' },
                { key: 'itsm_div_yn', header: 'ISTM여부', sort: 14, width: 14, align: 'center' },
                { key: 'crov_div_yn', header: '이월여부', sort: 15, width: 14, align: 'center' },
                { key: 'cnvg_biz_yn', header: '융복합사업여부', sort: 16, width: 15, align: 'center' },
                { key: 'dt_tp', header: 'DT Type', sort: 17, width: 16, align: 'left' },
                { key: 'tech_nm', header: 'DP명', sort: 18, width: 35, align: 'left' },
                { key: 'brand_nm', header: '브랜드명', sort: 19, width: 31, align: 'left' },
                { key: 'quote_issue_no', header: '견적발행번호', sort: 20, width: 18, align: 'right' },
                { key: 'quote_target_no', header: '견적대상번호', sort: 21, width: 18, align: 'left' },
                { key: 'bd_n1_cd', header: '매출BD1', sort: 22, width: 16, align: 'left' },
                { key: 'bd_n2_cd', header: '매출BD2', sort: 23, width: 16, align: 'left' },
                { key: 'bd_n3_cd', header: '매출BD3', sort: 24, width: 16, align: 'left' },
                { key: 'bd_n4_cd', header: '매출BD4', sort: 25, width: 16, align: 'left' },
                { key: 'bd_n5_cd', header: '매출BD5', sort: 26, width: 16, align: 'left' },
                { key: 'bd_n6_cd', header: '매출BD6', sort: 27, width: 16, align: 'left' },
                { key: 'biz_opp_no_sfdc', header: 'SFDC 계약번호', sort: 28, width: 22, align: 'right' },
                { key: 'deal_stage_cd', header: 'Deal Stage', sort: 29, width: 17, align: 'left' },
                { key: 'deal_stage_chg_dt', header: 'Deal Stage 변경일', sort: 30, width: 20, align: 'right' },
                { key: 'dgtr_task_cd', header: 'DT과제코드', sort: 31, width: 15, align: 'left' },
                { key: 'dgtr_task_nm', header: 'DT과제명', sort: 32, width: 24, align: 'left' },
                { key: 'biz_tp_account_cd', header: 'Account구분코드', sort: 33, width: 21, align: 'left' },
                { key: 'biz_tp_account_nm', header: 'Account명', sort: 34, width: 28, align: 'left' },
                { key: 'expected_contract_date', header: '예상계약일', sort: 35, width: 28, align: 'right' },
                { key: 'gl_account', header: '계정코드', sort: 36, width: 28, align: 'left' },
                { key: 'gl_name', header: '계정명', sort: 37, width: 28, align: 'left' },
                { key: 'commitment_item', header: '중계정', sort: 38, width: 28, align: 'left' },
                { key: 'comm_name', header: '중계정 정보', sort: 39, width: 28, align: 'left' },
                { key: 'asset_yn', header: '자산화여부', sort: 40, width: 28, align: 'center' },
                // { key: 'cls_rsn_tp_cd', header: '사업기회종료구분코드', sort: 52,width : 21 },
                // { key: 'cls_rsn_tp_nm', header: '사업기회종료구분명', sort: 53,width : 19 },
                // { key: 'shared_exp_yn', header: '전사SG&A여부', sort: 56,width : 15 },
                // { key: 'is_delivery', header: 'Delivery구분자', sort: 57,width : 15 },
                // { key: 'is_total_cc', header: '전사집계여부', sort: 58,width : 15 },
                { key: 'margin_rate', header: '마진율', sort: 140, width: 14, align: 'right', number: true },
                { key: 'rodr_year_amt', header: '연간 수주금액', sort: 141, width: 18, align: 'right', number: true },
                { key: 'sale_year_amt', header: '연간 매출금액', sort: 142, width: 18, align: 'right', number: true },
                { key: 'margin_year_amt', header: '연간 마진금액', sort: 143, width: 18, align: 'right', number: true },
                { key: 'prj_prfm_year_amt', header: '연간 수행금액', sort: 144, width: 18, align: 'right', number: true },
                { key: 'sfdc_sale_year_amt', header: 'SFDC 연간 매출금액', sort: 145, width: 22, align: 'right', number: true },
                { key: 'sfdc_margin_year_amt', header: 'SFDC 연간 마진금액', sort: 146, width: 22, align: 'right', number: true },
                { key: 'rodr_m1_amt', header: '수주 1월', sort: 150, width: 16, align: 'right', number: true },
                { key: 'rodr_m2_amt', header: '수주 2월', sort: 151, width: 16, align: 'right', number: true },
                { key: 'rodr_m3_amt', header: '수주 3월', sort: 152, width: 16, align: 'right', number: true },
                { key: 'rodr_m4_amt', header: '수주 4월', sort: 153, width: 16, align: 'right', number: true },
                { key: 'rodr_m5_amt', header: '수주 5월', sort: 154, width: 16, align: 'right', number: true },
                { key: 'rodr_m6_amt', header: '수주 6월', sort: 155, width: 16, align: 'right', number: true },
                { key: 'rodr_m7_amt', header: '수주 7월', sort: 156, width: 16, align: 'right', number: true },
                { key: 'rodr_m8_amt', header: '수주 8월', sort: 157, width: 16, align: 'right', number: true },
                { key: 'rodr_m9_amt', header: '수주 9월', sort: 158, width: 16, align: 'right', number: true },
                { key: 'rodr_m10_amt', header: '수주 10월', sort: 159, width: 16, align: 'right', number: true },
                { key: 'rodr_m11_amt', header: '수주 11월', sort: 160, width: 16, align: 'right', number: true },
                { key: 'rodr_m12_amt', header: '수주 12월', sort: 161, width: 16, align: 'right', number: true },
                { key: 'sale_m1_amt', header: '매출 1월', sort: 162, width: 16, align: 'right', number: true },
                { key: 'sale_m2_amt', header: '매출 2월', sort: 163, width: 16, align: 'right', number: true },
                { key: 'sale_m3_amt', header: '매출 3월', sort: 164, width: 16, align: 'right', number: true },
                { key: 'sale_m4_amt', header: '매출 4월', sort: 165, width: 16, align: 'right', number: true },
                { key: 'sale_m5_amt', header: '매출 5월', sort: 166, width: 16, align: 'right', number: true },
                { key: 'sale_m6_amt', header: '매출 6월', sort: 167, width: 16, align: 'right', number: true },
                { key: 'sale_m7_amt', header: '매출 7월', sort: 168, width: 16, align: 'right', number: true },
                { key: 'sale_m8_amt', header: '매출 8월', sort: 169, width: 16, align: 'right', number: true },
                { key: 'sale_m9_amt', header: '매출 9월', sort: 170, width: 16, align: 'right', number: true },
                { key: 'sale_m10_amt', header: '매출 10월', sort: 171, width: 16, align: 'right', number: true },
                { key: 'sale_m11_amt', header: '매출 11월', sort: 172, width: 16, align: 'right', number: true },
                { key: 'sale_m12_amt', header: '매출 12월', sort: 173, width: 16, align: 'right', number: true },
                { key: 'prj_prfm_m1_amt', header: '수행금액 1월', sort: 174, width: 22, align: 'right', number: true },
                { key: 'prj_prfm_m2_amt', header: '수행금액 2월', sort: 175, width: 22, align: 'right', number: true },
                { key: 'prj_prfm_m3_amt', header: '수행금액 3월', sort: 176, width: 22, align: 'right', number: true },
                { key: 'prj_prfm_m4_amt', header: '수행금액 4월', sort: 177, width: 22, align: 'right', number: true },
                { key: 'prj_prfm_m5_amt', header: '수행금액 5월', sort: 178, width: 22, align: 'right', number: true },
                { key: 'prj_prfm_m6_amt', header: '수행금액 6월', sort: 179, width: 22, align: 'right', number: true },
                { key: 'prj_prfm_m7_amt', header: '수행금액 7월', sort: 180, width: 22, align: 'right', number: true },
                { key: 'prj_prfm_m8_amt', header: '수행금액 8월', sort: 181, width: 22, align: 'right', number: true },
                { key: 'prj_prfm_m9_amt', header: '수행금액 9월', sort: 182, width: 22, align: 'right', number: true },
                { key: 'prj_prfm_m10_amt', header: '수행금액 10월', sort: 183, width: 22, align: 'right', number: true },
                { key: 'prj_prfm_m11_amt', header: '수행금액 11월', sort: 184, width: 22, align: 'right', number: true },
                { key: 'prj_prfm_m12_amt', header: '수행금액 12월', sort: 185, width: 22, align: 'right', number: true },
                { key: 'margin_m1_amt', header: '마진금액 1월', sort: 186, width: 16, align: 'right', number: true },
                { key: 'margin_m2_amt', header: '마진금액 2월', sort: 187, width: 16, align: 'right', number: true },
                { key: 'margin_m3_amt', header: '마진금액 3월', sort: 188, width: 16, align: 'right', number: true },
                { key: 'margin_m4_amt', header: '마진금액 4월', sort: 189, width: 16, align: 'right', number: true },
                { key: 'margin_m5_amt', header: '마진금액 5월', sort: 190, width: 16, align: 'right', number: true },
                { key: 'margin_m6_amt', header: '마진금액 6월', sort: 191, width: 16, align: 'right', number: true },
                { key: 'margin_m7_amt', header: '마진금액 7월', sort: 192, width: 16, align: 'right', number: true },
                { key: 'margin_m8_amt', header: '마진금액 8월', sort: 193, width: 16, align: 'right', number: true },
                { key: 'margin_m9_amt', header: '마진금액 9월', sort: 194, width: 16, align: 'right', number: true },
                { key: 'margin_m10_amt', header: '마진금액 10월', sort: 195, width: 16, align: 'right', number: true },
                { key: 'margin_m11_amt', header: '마진금액 11월', sort: 196, width: 16, align: 'right', number: true },
                { key: 'margin_m12_amt', header: '마진금액 12월', sort: 197, width: 16, align: 'right', number: true },
                { key: 'labor_m1_amt', header: '인건비 1월', sort: 198, width: 16, align: 'right', number: true },
                { key: 'labor_m2_amt', header: '인건비 2월', sort: 199, width: 16, align: 'right', number: true },
                { key: 'labor_m3_amt', header: '인건비 3월', sort: 200, width: 16, align: 'right', number: true },
                { key: 'labor_m4_amt', header: '인건비 4월', sort: 201, width: 16, align: 'right', number: true },
                { key: 'labor_m5_amt', header: '인건비 5월', sort: 202, width: 16, align: 'right', number: true },
                { key: 'labor_m6_amt', header: '인건비 6월', sort: 203, width: 16, align: 'right', number: true },
                { key: 'labor_m7_amt', header: '인건비 7월', sort: 204, width: 16, align: 'right', number: true },
                { key: 'labor_m8_amt', header: '인건비 8월', sort: 205, width: 16, align: 'right', number: true },
                { key: 'labor_m9_amt', header: '인건비 9월', sort: 206, width: 16, align: 'right', number: true },
                { key: 'labor_m10_amt', header: '인건비 10월', sort: 207, width: 16, align: 'right', number: true },
                { key: 'labor_m11_amt', header: '인건비 11월', sort: 208, width: 16, align: 'right', number: true },
                { key: 'labor_m12_amt', header: '인건비 12월', sort: 209, width: 16, align: 'right', number: true },
                { key: 'iv_m1_amt', header: '투자비 1월', sort: 210, width: 16, align: 'right', number: true },
                { key: 'iv_m2_amt', header: '투자비 2월', sort: 211, width: 16, align: 'right', number: true },
                { key: 'iv_m3_amt', header: '투자비 3월', sort: 212, width: 16, align: 'right', number: true },
                { key: 'iv_m4_amt', header: '투자비 4월', sort: 213, width: 16, align: 'right', number: true },
                { key: 'iv_m5_amt', header: '투자비 5월', sort: 214, width: 16, align: 'right', number: true },
                { key: 'iv_m6_amt', header: '투자비 6월', sort: 215, width: 16, align: 'right', number: true },
                { key: 'iv_m7_amt', header: '투자비 7월', sort: 216, width: 16, align: 'right', number: true },
                { key: 'iv_m8_amt', header: '투자비 8월', sort: 217, width: 16, align: 'right', number: true },
                { key: 'iv_m9_amt', header: '투자비 9월', sort: 218, width: 16, align: 'right', number: true },
                { key: 'iv_m10_amt', header: '투자비 10월', sort: 219, width: 16, align: 'right', number: true },
                { key: 'iv_m11_amt', header: '투자비 11월', sort: 220, width: 16, align: 'right', number: true },
                { key: 'iv_m12_amt', header: '투자비 12월', sort: 221, width: 16, align: 'right', number: true },
                { key: 'exp_m1_amt', header: '경비 1월', sort: 222, width: 16, align: 'right', number: true },
                { key: 'exp_m2_amt', header: '경비 2월', sort: 223, width: 16, align: 'right', number: true },
                { key: 'exp_m3_amt', header: '경비 3월', sort: 224, width: 16, align: 'right', number: true },
                { key: 'exp_m4_amt', header: '경비 4월', sort: 225, width: 16, align: 'right', number: true },
                { key: 'exp_m5_amt', header: '경비 5월', sort: 226, width: 16, align: 'right', number: true },
                { key: 'exp_m6_amt', header: '경비 6월', sort: 227, width: 16, align: 'right', number: true },
                { key: 'exp_m7_amt', header: '경비 7월', sort: 228, width: 16, align: 'right', number: true },
                { key: 'exp_m8_amt', header: '경비 8월', sort: 229, width: 16, align: 'right', number: true },
                { key: 'exp_m9_amt', header: '경비 9월', sort: 230, width: 16, align: 'right', number: true },
                { key: 'exp_m10_amt', header: '경비 10월', sort: 231, width: 16, align: 'right', number: true },
                { key: 'exp_m11_amt', header: '경비 11월', sort: 232, width: 16, align: 'right', number: true },
                { key: 'exp_m12_amt', header: '경비 12월', sort: 233, width: 16, align: 'right', number: true },
                { key: 'm1_amt', header: '1월', sort: 234, width: 16, align: 'right', number: true },
                { key: 'm2_amt', header: '2월', sort: 235, width: 16, align: 'right', number: true },
                { key: 'm3_amt', header: '3월', sort: 236, width: 16, align: 'right', number: true },
                { key: 'm4_amt', header: '4월', sort: 237, width: 16, align: 'right', number: true },
                { key: 'm5_amt', header: '5월', sort: 238, width: 16, align: 'right', number: true },
                { key: 'm6_amt', header: '6월', sort: 239, width: 16, align: 'right', number: true },
                { key: 'm7_amt', header: '7월', sort: 240, width: 16, align: 'right', number: true },
                { key: 'm8_amt', header: '8월', sort: 241, width: 16, align: 'right', number: true },
                { key: 'm9_amt', header: '9월', sort: 242, width: 16, align: 'right', number: true },
                { key: 'm10_amt', header: '10월', sort: 243, width: 16, align: 'right', number: true },
                { key: 'm11_amt', header: '11월', sort: 244, width: 16, align: 'right', number: true },
                { key: 'm12_amt', header: '12월', sort: 245, width: 16, align: 'right', number: true },
                { key: 'div_name', header: '매출부문', sort: 400, width: 25, align: 'left' },
                { key: 'div_ccorg_cd', header: '매출부문 코드', sort: 401, width: 18, align: 'right' },
                { key: 'hdqt_name', header: '매출본부', sort: 402, width: 25, align: 'left' },
                { key: 'hdqt_ccorg_cd', header: '매출본부 코드', sort: 403, width: 18, align: 'right' },
                { key: 'team_name', header: '매출팀', sort: 404, width: 27, align: 'left' },
                { key: 'team_ccorg_cd', header: '매출팀 코드', sort: 405, width: 18, align: 'right' },
                { key: 'rodr_div_name', header: '수주부문', sort: 406, width: 25, align: 'left' },
                { key: 'rodr_div_ccorg_cd', header: '수주부문 코드', sort: 407, width: 18, align: 'right' },
                { key: 'rodr_hdqt_name', header: '수주본부', sort: 408, width: 25, align: 'left' },
                { key: 'rodr_hdqt_ccorg_cd', header: '수주본부 코드', sort: 409, width: 18, align: 'right' },
                { key: 'rodr_team_name', header: '수주팀', sort: 410, width: 27, align: 'left' },
                { key: 'rodr_team_ccorg_cd', header: '수주팀 코드', sort: 411, width: 18, align: 'right' },
                { key: 'seq', header: 'SEQ', sort: 412, width: 8, align: 'center' },
                { key: 'src_type', header: '데이터 구분', sort: 413, width: 15, align: 'center' }
            ];

            let sSheetname = Object.keys(aData);
            sSheetname.forEach(data => {
                const worksheet = workbook.addWorksheet(data);

                let aColumns = [];
                let aCenter = [];
                let aLeft = [];
                let aNubmerKey = [];
                let aKeys = Object.keys(aData[data][0]);
                aKeys.forEach(data2 => {
                    let oColData = aColName.find(data3 => data2 === data3.key);

                    if (oColData.align === 'center') {
                        aCenter.push(oColData.key)
                    } else if (oColData.align === 'left') {
                        aLeft.push(oColData.key)
                    }

                    if (oColData.number) {
                        aNubmerKey.push(oColData.key)
                    }

                    let oTemp = {}
                    oTemp[`${data2}`] = oColData.key
                    aColumns.push(oColData);
                })
                aColumns.sort((a, b) => a.sort - b.sort);
                let aFinalCol = aColumns.map(({ header, key, width }) => ({ header, key, width }))
                worksheet.columns = aFinalCol;
                worksheet.addRow(aFinalCol.map(col => col.key))
                worksheet.autoFilter = {
                    from: { row: 1, column: 1 },
                    to: { row: 1, column: aFinalCol.length }
                }
                let headerRow = worksheet.getRow(1);
                let multiHeaderRow = worksheet.getRow(2);
                const margin_rate_index = aFinalCol.findIndex(cell => cell.key === 'margin_rate') + 1
                const aCenterIndex = aFinalCol.reduce((acc, col, index) => {
                    if (aCenter.includes(col.key)) {
                        acc.push(index + 1)
                    }
                    return acc
                }, [])
                const aLeftIndex = aFinalCol.reduce((acc, col, index) => {
                    if (aLeft.includes(col.key)) {
                        acc.push(index + 1)
                    }
                    return acc
                }, [])


                headerRow.height = 33
                multiHeaderRow.height = 20
                headerRow.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF2CC' }
                    };
                    cell.alignment = {
                        horizontal: 'center',
                        wrapText: true,
                        vertical: 'middle'
                    };
                    cell.font = {
                        bold: true
                    };
                });
                multiHeaderRow.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF2CC' }
                    };
                    cell.alignment = {
                        horizontal: 'center',
                        wrapText: true,
                        vertical: 'middle'
                    };
                    cell.border = {
                        bottom: { style: 'double' }
                    }
                });

                // 데이터 설정
                for (let i = 0; i < aData[data].length; i++) {
                    aNubmerKey.forEach(key => {
                        aData[data][i][key] = Number(aData[data][i][key])
                    })
                    worksheet.addRow(aData[data][i]);
                }
                worksheet.eachRow((row, index) => {
                    if (index > 2) {
                        row.eachCell((cell, cellIndex) => {
                            if (cellIndex === margin_rate_index) {
                                cell.numFmt = '#,##0.00'
                            } else {
                                cell.numFmt = '#,##0'
                            }

                            let sHorizontal = 'right'
                            if (aCenterIndex.includes(cellIndex)) {
                                sHorizontal = 'center'
                            } else if (aLeftIndex.includes(cellIndex)) {
                                sHorizontal = 'left'
                            }
                            cell.alignment = { horizontal: sHorizontal }
                        })
                    }
                })

            })

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = sFilename;
            link.click();

            setTimeout(() => { URL.revokeObjectURL(url) }, 100);
        },

        // AI 팝업 띄우기 확인
        // oData 는 객체형태로 각 행의 데이터
        // bAllCheck : true, aCheckCol => 전체검사에서 빼야할 key
        // bAllCheck : false, aCheckCol => 확인해야할 key 
        checkAiPopupDisplay: function (oData, aCheckCol = [], bAllCheck) {
            let bResult = true;
            if (!bAllCheck && aCheckCol.every(oCheckCol => oData[oCheckCol] === 0 || oData[oCheckCol] === null || oData[oCheckCol] === undefined)) {
                bResult = !bResult
            } else if (bAllCheck) {
                let aCheckKeys = Object.keys(oData).filter((sKey) => !aCheckCol.includes(sKey));
                if (aCheckKeys.every((oCheckCol) => oData[oCheckCol] === 0 || oData[oCheckCol] === null || oData[oCheckCol] === undefined)) {
                    bResult = !bResult
                }
            }

            // if (!bResult) {
            //     MessageToast.show("세부 데이터가 없습니다")
            // }
            return bResult;
        },
    };
});