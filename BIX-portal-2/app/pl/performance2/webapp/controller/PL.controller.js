sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/EventBus",
    "sap/ui/core/routing/HashChanger",
    "bix/common/library/customDialog/OrgSingleSelect",
    'sap/m/Panel',
    "sap/ui/integration/widgets/Card",
], function (Controller, MessageToast, EventBus, HashChanger, OrgSingleSelect, Panel, Card) {
    "use strict";

    return Controller.extend("bix.pl.performance2.controller.PL", {
        _oEventBus: EventBus.getInstance(),

        onInit: function () {
            const oRouteActual = this.getOwnerComponent().getRouter().getRoute("RouteActual");
            oRouteActual.attachPatternMatched(this.onMyRoutePatternMatched, this);

            const oRoutePlan = this.getOwnerComponent().getRouter().getRoute("RoutePlan");
            oRoutePlan.attachPatternMatched(this.onMyRoutePatternMatched, this);

        },

        onMyRoutePatternMatched: async function (oEvent) {
            this._oEventBus.publish("pl", "setHashModel");
            let oSegmentedButton = this.byId("plTypeButton");
            let oSelectedButton = oSegmentedButton.getItems().find(oButton => oButton.getId() === oSegmentedButton.getSelectedItem());
            oSegmentedButton.fireSelectionChange({
                item: oSelectedButton
            });
            this._setCard();
        },

        /**
         * 차트 <-> 테이블 뷰 전환
         * @param {sap.ui.base.Event} oEvent 
         * @param {String} sFlag 구분자
         */
        onSwitchPL: function (oEvent, sFlag) {
            if (sFlag) {
                this.getOwnerComponent().getModel("hashModel").setProperty("/pageView", sFlag);
                this._oEventBus.publish("pl", "hashChange");
            }
            // const oHashChanger = HashChanger.getInstance();
            // const sCurrentHash = oHashChanger.getHash();
            // const aCurrentHashInfo = sCurrentHash.split('&/#/');
            // let newHash = '';

            // if(aCurrentHashInfo.length > 1){
            //     newHash =  aCurrentHashInfo[0] + '&/#/' + aCurrentHashInfo[1]
            // }else {
            //     newHash = aCurrentHashInfo[0] + '&/#/' + '?page=plan';
            // }
            // newHash = aCurrentHashInfo[0] + '&/#/' + '?page=plan';

            // // debugger;
            // oHashChanger.replaceHash(newHash);

            // this.getOwnerComponent().getRouter().navTo("RouteMain", {
            //     "?page": {
            //         page: "plan"
            //     }
            // }, {}, true);
        },

        /**
         * Actual <-> Plan PL SegmentedButton 버튼 변경 이벤트
         */
        onSelectionChange: function (oEvent) {
            let oParameters = oEvent.getParameters();
            let oItem = oParameters["item"];
            let sKey = oItem.getKey();

            // 변경된 plType을 모델에 저장
            let oHashModel = this.getOwnerComponent().getModel("hashModel");
            oHashModel.setProperty("/page", sKey);

            this._oEventBus.publish("pl", "page");
        },

        /**
         * PL 엑셀 다운로드
         */
        onExcelDownload: async function () {
            // 검색 조건 반환
            let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();
            let sOrgId = `${oSearchData.orgId}`;
            let dYearMonth = oSearchData.yearMonth;
            let iYear = dYearMonth.getFullYear();
            let iMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");

            // 데이터 반환
            const oPlModel = this.getOwnerComponent().getModel("pl_api");
            const oPlBindingContext = oPlModel.bindContext(`/get_actual_pl_excel(year='${iYear}',month='${iMonth}',org_id='${sOrgId}')`);

            const oSgaModel = this.getOwnerComponent().getModel("sga");
            const oSgaBindingContext = oSgaModel.bindContext(`/get_actual_sga_excel(year='${iYear}',month='${iMonth}',org_id='${sOrgId}')`);

            const oRspModel = this.getOwnerComponent().getModel("rsp");
            const oRspBindingContext = oRspModel.bindContext(`/get_actual_rsp_excel(year='${iYear}',month='${iMonth}',org_id='${sOrgId}')`);

            // Excel Workbook 생성
            const workbook = new ExcelJS.Workbook();

            await Promise.all([
                oPlBindingContext.requestObject(),
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
                fnSetWorksheet("SGA", aResult[1].value);
                fnSetWorksheet("RSP", aResult[2].value);
            }.bind(this));

            // let currentRow = 1;

            // function insertHeader(ws, row, titleName) {
            //     const title = row;
            //     const headerRow = row + 1;
            //     const headerRow2 = row + 2;
            //     const titleCell = worksheet.getCell(title, 1);
            //     titleCell.value = titleName;
            //     titleCell.fill = {
            //         type: "pattern",
            //         pattern: "solid",
            //         fgColor: { argb: "FFFFFF00" }
            //     }
            //     titleCell.alignment = { horizontal: "center", vertical: "middle" };
            //     worksheet.getCell(title, 1).border = {
            //         top: { style: 'thin' },
            //         bottom: { style: 'thin' },
            //         left: { style: 'thin' },
            //         right: { style: 'thin' }
            //     }

            //     const subHeader = ["구분", "목표", "", "전년비", "전년누계", "", "전년비", "전년진척률"];
            //     for (let i = 1; i <= 8; i++) {
            //         worksheet.getCell(headerRow2, i).value = subHeader[i - 1];
            //     }
            //     for (let i = 9; i <= 20; i++) {
            //         worksheet.getCell(headerRow2, i).value = `${i - 8}월`;
            //     }
            //     worksheet.getCell(headerRow2, 21).value = "1Q";
            //     worksheet.getCell(headerRow2, 22).value = "2Q";
            //     worksheet.getCell(headerRow2, 23).value = "3Q";
            //     worksheet.getCell(headerRow2, 24).value = "4Q";
            //     worksheet.getCell(headerRow, 25).value = "연간 실적";

            //     for (let col = 1; col <= 25; col++) {
            //         const c1 = worksheet.getCell(headerRow, col);
            //         const c2 = worksheet.getCell(headerRow2, col);
            //         [c1, c2].forEach(cell => {
            //             cell.fill = {
            //                 type: "pattern",
            //                 pattern: "solid",
            //                 fgColor: { argb: "E6EAF0" }
            //             }
            //             cell.alignment = { horizontal: "center", vertical: "middle" };
            //         })
            //     }
            //     for (let col = 9; col <= 24; col++) {
            //         const c2 = worksheet.getCell(headerRow2, col);
            //         c2.fill = {
            //             type: "pattern",
            //             pattern: "solid",
            //             fgColor: { argb: "FFFFE7D8" }
            //         }
            //     }


            //     for (let col = 1; col <= 25; col++) {
            //         worksheet.getCell(headerRow, col).border = {
            //             top: { style: 'thin' },
            //             bottom: { style: 'thin' },
            //             left: { style: 'thin' },
            //             right: { style: 'thin' }
            //         }
            //         worksheet.getCell(headerRow2, col).border = {
            //             top: { style: 'thin' },
            //             bottom: { style: 'thin' },
            //             left: { style: 'thin' },
            //             right: { style: 'thin' }
            //         }
            //     }
            //     return row + 3;
            // }

            // currentRow = insertHeader(worksheet, currentRow, "PL");
            // aExportData.forEach(row => {
            //     worksheet.getCell(currentRow, 1).value = row["type"];
            //     worksheet.getCell(currentRow, 1).alignment = { horizontal: "center" };

            //     if (row["type"] === "마진률" || row["type"] === "영업이익률") {
            //         worksheet.getCell(currentRow, 2).value = row["goal"] / 100;
            //         worksheet.getCell(currentRow, 3).value = row["performanceCurrentYearMonth"] / 100;
            //         worksheet.getCell(currentRow, 4).value = (row["performanceCurrentYearMonth"] - row["performanceLastYearMonth"]) / 100;
            //         worksheet.getCell(currentRow, 5).value = row["performanceLastYearMonth"] / 100;
            //         for (let i = 2; i <= 5; i++) {
            //             worksheet.getCell(currentRow, i).numFmt = "0.0%";
            //         }
            //         worksheet.getCell(currentRow, 25).value = row["yearValue"] / 100;
            //         worksheet.getCell(currentRow, 25).numFmt = "0.0%";
            //     } else {
            //         worksheet.getCell(currentRow, 2).value = row["goal"];
            //         worksheet.getCell(currentRow, 3).value = row["performanceCurrentYearMonth"];
            //         worksheet.getCell(currentRow, 4).value = row["performanceCurrentYearMonth"] - row["performanceLastYearMonth"];
            //         worksheet.getCell(currentRow, 5).value = row["performanceLastYearMonth"];
            //         for (let i = 2; i <= 5; i++) {
            //             worksheet.getCell(currentRow, i).numFmt = "#,##0";
            //         }
            //         worksheet.getCell(currentRow, 25).value = row["yearValue"];
            //         worksheet.getCell(currentRow, 25).numFmt = "#,##0";

            //     }


            //     worksheet.getCell(currentRow, 6).value = row["performanceAttainmentRateCurrentYear"] / 100;
            //     worksheet.getCell(currentRow, 6).numFmt = "0.0%";

            //     worksheet.getCell(currentRow, 7).value = (row["performanceAttainmentRateCurrentYear"] - row["performanceAttainmentRateLastYear"]) / 100;
            //     worksheet.getCell(currentRow, 7).numFmt = "0.0%";

            //     worksheet.getCell(currentRow, 8).value = row["performanceAttainmentRateLastYear"] / 100;
            //     worksheet.getCell(currentRow, 8).numFmt = "0.0%";


            //     worksheet.getCell(currentRow, 8).numFmt = "0.0%";
            //     for (let i = 9; i <= 20; i++) {
            //         if (row["type"] === "마진률" || row["type"] === "영업이익률") {
            //             worksheet.getCell(currentRow, i).value = row["month" + String(i - 8).padStart(2, "0")] / 100;
            //             worksheet.getCell(currentRow, i).numFmt = "0.0%";
            //         } else {
            //             worksheet.getCell(currentRow, i).value = row["month" + String(i - 8).padStart(2, "0")];
            //             worksheet.getCell(currentRow, i).numFmt = "#,##0";
            //         }
            //     }
            //     for (let i = 21; i <= 24; i++) {
            //         if (row["type"] === "마진률" || row["type"] === "영업이익률") {
            //             worksheet.getCell(currentRow, i).value = row["quarter" + String(i - 20)] / 100;
            //             worksheet.getCell(currentRow, i).numFmt = "0.0%";
            //         } else {
            //             worksheet.getCell(currentRow, i).value = row["quarter" + String(i - 20)];
            //             worksheet.getCell(currentRow, i).numFmt = "#,##0";
            //         }
            //     }

            //     for (let i = 2; i <= 25; i++) {
            //         worksheet.getCell(currentRow, i).alignment = { horizontal: "right" };
            //     }


            //     // 너비 설정
            //     worksheet.getColumn(1).width = 15;
            //     for (let i = 2; i <= 25; i++) {
            //         worksheet.getColumn(i).width = 20;
            //     }
            //     for (let i = 6; i <= 8; i++) {
            //         worksheet.getColumn(i).width = 10;
            //     }
            //     //테두리 설정
            //     for (let col = 1; col <= 25; col++) {
            //         worksheet.getCell(currentRow, col).border = {
            //             top: { style: 'thin' },
            //             bottom: { style: 'thin' },
            //             left: { style: 'thin' },
            //             right: { style: 'thin' }
            //         }
            //     }

            //     currentRow++;
            // });
            // currentRow++;
            // currentRow = insertHeader(worksheet, currentRow, "OI");
            // aExportData.forEach(row => {
            //     worksheet.addRow(row)
            //     currentRow++;
            // });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `PL Raw Data_${iYear}-${iMonth}.xlsx`;
            link.click();

            setTimeout(() => { URL.revokeObjectURL(url) }, 100);
        },

        /**
         * 검색 조건 변경 이벤트
         * @param {Event} oEvent 
         */
        onChangeSearch: function (oEvent) {
            let oSource = oEvent.getSource();

            let isValidValue1 = /** @type {sap.m.Input} */ (oSource).isValidValue();
            let isValidValue2 = oSource.getDateValue();
            if (!isValidValue1 || !isValidValue2) {
                oEvent.getSource().setValueState("Error");
                return;
            } else {
                oEvent.getSource().setValueState("None");

                // 검색 조건 변경 EventBus Publish
                let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();
                let oEventData = {
                    year: oSearchData.yearMonth.getFullYear(),
                    month: String(oSearchData.yearMonth.getMonth() + 1).padStart(2, "0"),
                    orgId: oSearchData.orgId,
                }

                // 초기 차트 데이터용 세션 업데이트
                sessionStorage.setItem("initSearchModel",
                    JSON.stringify({
                        yearMonth: new Date(oSearchData.yearMonth),
                        orgId: oSearchData.orgId
                    })
                )
                this._oEventBus.publish("pl", "search", oEventData);
            };
        },

        /**
         * 조직 선택 Suggestion 선택 시
         * @param {Event} oEvent 
         */
        onOrgSingleChange: function (oEvent) {
            let oSource = oEvent.getSource();
            let sValue = oEvent.getParameters()["value"];
            let aItems = oSource.getSuggestionItems();
            let isValid = aItems.find(oItem => oItem.getText() === sValue);

            // 조직 데이터 중 입력한 조직 유효성 검사
            if (!isValid) {
                oSource.setValueState("Error");
            } else {
                oSource.setValueState("None");

                // 검색 EventBus Publish
                let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();
                let oEventData = {
                    year: oSearchData.yearMonth.getFullYear(),
                    month: String(oSearchData.yearMonth.getMonth() + 1).padStart(2, "0"),
                    orgId: oSearchData.orgId,
                    orgType: oSearchData.orgType,
                }

                // 초기 차트 데이터용 세션 업데이트
                sessionStorage.setItem("initSearchModel",
                    JSON.stringify({
                        yearMonth: new Date(oSearchData.yearMonth),
                        orgId: oSearchData.orgId,
                        orgType: oSearchData.orgType

                    })
                )
                this._oEventBus.publish("pl", "search", oEventData);
            }
        },

        /**
         * 매출조직명 Dialog Open
         * @param {Event} oEvent 
         */
        onOrgSingleSelectDialogOpen: async function (oEvent) {
            let oSource = oEvent.getSource();

            this._oOrgSingleSelectDialog = new OrgSingleSelect({
                fragmentController: this,
                bindingSource: oSource,
                afterSave: function () {
                    let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();
                    let oEventData = {
                        year: oSearchData.yearMonth.getFullYear(),
                        month: String(oSearchData.yearMonth.getMonth() + 1).padStart(2, "0"),
                        orgId: oSearchData.orgId,
                    }

                    // 초기 차트 데이터용 세션 업데이트
                    sessionStorage.setItem("initSearchModel",
                        JSON.stringify({
                            yearMonth: new Date(oSearchData.yearMonth),
                            orgId: oSearchData.orgId
                        })
                    )

                    // EventBus Publish
                    this._oEventBus.publish("pl", "search");
                }.bind(this),
            });

            this._oOrgSingleSelectDialog.open();
        },

        /**
         * 카드 설정
         */
        _setCard: async function () {
            let oData = this.getOwnerComponent().getModel("hashModel").getData();
            let sUrl = `/pl_content_view(content_menu_code='${oData.page}',pl_info='${oData.page}',position='master',grid_layout_info='${oData.pageView}',detail_info='${oData.detailType}',sort_order=null)/Set`;

            let oModel = this.getOwnerComponent().getModel('cm');

            const oBinding = oModel.bindContext(sUrl);
            let oRequest = await oBinding.requestObject();
            let aCardData = oRequest.value;

            // view가 없는 경우
            let oBox = this.byId("detailBox");
            if (aCardData.length < 1) {
                oBox.destroyItems();
                MessageToast.show("아직 구성되지 않은 \n메뉴입니다.");
                return;
            }

            let bCheck = false;

            oBox.getItems().forEach(oItem => {
                aCardData.forEach(oData => {
                    if (oItem.getContent()[0].getManifest() === `../bix/card/${oData.card_info}/manifest.json`) {
                        bCheck = true
                    }
                })

            })

            if (!bCheck) {
                oBox.destroyItems();

                aCardData.forEach((oData, index) => {
                    let oPanel = new Panel({
                        expandable: false,
                        expanded: true,
                        width: "100%",
                        content: new Card({
                            manifest: `../bix/card/${oData.card_info}/manifest.json`,
                            width: "100%",
                            height: "100%"
                        })
                    })

                    oPanel.addStyleClass("custom-panel-border custom-panel-no-content-padding");
                    // if (index !== aCardData.length - 1) {   // 마지막 카드가 아닐 때만 MarginBottom 적용
                        oPanel.addStyleClass("sapUiSmallMarginTop");
                    // }
                    oBox.addItem(oPanel);
                })
            }
        },
    });
});
