sap.ui.define([
    "sap/m/MessageBox"
], function (MessageBox) {
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
        setTableMergeWithAltColor: function (oTable,oModel) {
            oTable.attachEventOnce("rowsUpdated", () => {
                setTimeout(() => {
                    this.performCellMergeWithAltColor(oTable,oModel);
                }, 0);
            });
        },

        /* TableMerge 수정 250701 */
        performCellMergeWithAltColor: function (oTable,oModel) {
            const aVisibleRows = oTable.getRows(); // 현재 화면에 보이는 행들을 가져온다.

            const oMergeColumns = [];

            // customData에서 mergeKey로 지정한 목록을 찾는다.
            // 2~3단 merge도 있을 수 있기 때문에, forEach로 전체를 뒤져야 한다.
            oTable.getColumns().forEach((oColumn, i) => {
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
                if(oModel){
                    oContext = oRow.getBindingContext(oModel);
                }else{
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
                } );

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
        },
        // 셀병합 테이블 셀렉션 세팅
        setMergeTableRowClick: function (oTable, aRowMergeInfo) {
            let aFixedDataRow = Array.from(oTable.getDomRef().querySelectorAll(".sapUiTableCCnt .sapUiTableCtrlScrFixed .sapUiTableRow"));
            let aFixedDataCell = Array.from(oTable.getDomRef().querySelectorAll(".sapUiTableCCnt .sapUiTableCtrlScrFixed .sapUiTableRow .sapUiTableCell"));

            aFixedDataCell.forEach((oFixedRow) => oFixedRow.classList.remove("row-active-highlight"))
            for (let i = 0; i < aRowMergeInfo.length; i++) {
                if (aFixedDataRow[i].classList.contains("sapUiTableRowSel")) {
                    for (let j = 0; j < Object.keys(aRowMergeInfo[i]).length - 1; j++) {
                        if (j === 0) aRowMergeInfo[i]["merge_" + j].classList.add("first-row");
                        aRowMergeInfo[i]["merge_" + j].classList.add("row-active-highlight");
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

            for (let i = 0; i < aRowMergeInfo.length; i++) {
                if (aRowMergeInfo[i]["alternate"]) {
                    aFixedDataRow[i].classList.add("row-alternate-color");
                    aDataRow[i].classList.add("row-alternate-color")
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
            let iRowCnt = oTable.getDomRef().querySelectorAll(".sapUiTableColHdrCnt .sapUiTableCtrlScr .sapUiTableCtrl .sapUiTableRow").length;
            let aLabel = oTable.getColumns().filter(oCol => oCol.getAggregation("multiLabels").length === 0)
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
        displayStatus(oApplyContent,sStatus, oThis) {
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

        displayStatusForEmpty(oApplyContent,oData,oThis) {
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

    };
});