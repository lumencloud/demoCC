sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/table/Column",
    "sap/m/Label",
    "sap/m/Text",
    "../util/Formatter",
    "../util/Module",
    "sap/ui/mdc/Field",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/format/NumberFormat",
    "sap/m/Token",
    "sap/m/MessageToast",
], (Controller, JSONModel, MessageBox, Fragment, Column, Label, Text, Formatter, Module, Field, Filter, FilterOperator, DateFormat, NumberFormat, Token, MessageToast) => {
    "use strict";
    /**
     * @typedef {sap.ui.base.Event} Event
     */

    return Controller.extend("bix.pl.performance.controller.Spreadsheet", {

        /**
         * 초기 실행 메소드
         */
        onInit: async function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RoutePL");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);

            const myRoute2 = this.getOwnerComponent().getRouter().getRoute("RoutePLChart");
            myRoute2.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: async function () {
            // 장판지 테이블 열 구성
            this._setExeTable();

            this.getOwnerComponent().getModel("controllerModel").setProperty("/sheet", this);
        },

        /**
         * 장판지 테이블 검색 및 초기화 이벤트
         */
        _bindTable: function () {
            let aFilters = [];
            let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();

            // 테이블에 바인딩 정보가 없을 때 (초기)
            let oTable = this.byId("exeTable");

            // 년도추정월
            let oFilter = new Filter({
                path: "rodr_esmt_y",
                operator: FilterOperator.EQ,
                value1: oSearchData.yearMonth.getFullYear(),
            })
            aFilters.push(oFilter);

            // 테이블 바인딩
            oTable.bindRows({
                path: `/mis_project_sheet_expand_view('${oSearchData.orgId}')/Set`,
                // parameters: {
                //     $count: true
                // },
                filters: aFilters,
                events: {
                    dataReceived: this.onExeTableDataEvent.bind(this),
                    dataRequested: this.onExeTableDataEvent.bind(this)
                }
            })
            oTable.setNoData("데이터가 없습니다.");
            // oTable.getBinding("rows").filter(aFilters);

            // 장판지 테이블 Title 설정
            let sFilter = aFilters.map((oFilter) => {
                return `${oFilter.getPath()} ${oFilter.getOperator().toLowerCase()} '${oFilter.getValue1()}'`;
            }).join(" and ");

            let oTitle = this.byId("exeTableTitle");
            oTitle.bindProperty("text", {
                path: `/mis_project_sheet_expand_view('${oSearchData.orgId}')/Set/$count`,
                parameters: {
                    $filter: sFilter
                },
                formatter: function (iCount) {
                    return `총 ${iCount} 건`;
                },
            });
        },

        /**
         * Example 테이블 조직 검색 체인지 이벤트
         * @param {Event} oEvent 
         */
        onAddDepInputLiveChange: function (oEvent) {
            let oSource = oEvent.getSource();
            if (oSource.getValue()) oSource.setValue(null);
        },

        /**
         * 조직 검색 토큰 삭제 시
         * @param {Event} oEvent 
         */
        onAddDepTokenUpdate: function (oEvent) {
            let oSource = oEvent.getSource();
            let sType = oEvent.getParameter("type");

            // 필드가 필수값일 때
            if (oSource.getFieldGroupIds().includes("Required")) {
                if (oSource.getTokens().length === 0) {
                    oEvent.getSource().setValueState("Error");
                } else {
                    oEvent.getSource().setValueState("None");
                }
            }

            // 토큰 삭제 시 바인딩된 모델의 Property 값 삭제
            if (sType === "removed") {
                let oBindingModel = oSource.getBinding("selectedKey").getModel();
                let sBindingPath = oSource.getBinding("selectedKey").getPath();
                oBindingModel.setProperty(sBindingPath, null);
            }
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

        /**
         * 장판지 테이블 Busy 설정
         * @param {Event} oEvent 
         */
        onExeTableDataEvent: function (oEvent) {
            let sEventId = oEvent.getId();
            let oTable = this.byId("exeTable");

            if (sEventId === "dataRequested") {
                oTable.setBusy(true);
            } else if (sEventId === "dataReceived") {
                // 장판지 테이블 Title 설정
                // let oHeaderContext = oEvent.getSource().getHeaderContext();
                // this.byId("exeTableTitle").setBindingContext(oHeaderContext);

                // 데이터
                // JSON.parse(oEvent.getSource().getContextData(oEvent.getSource().getContexts()[0]));

                oTable.setBusy(false);
            }
        },

        /**
         * 장판지 테이블 Column 설정
         */
        _setExeTable: async function () {
            let oTable = this.byId("exeTable");
            // 이미 테이블에 Column이 설정된 경우 재설정하지 않음
            if (oTable.getColumns().length > 0) return;

            oTable.attachEventOnce("rowsUpdated", function () {
                oTable.getColumns().forEach(oColumn => oColumn.autoResize());
            });

            // 첫 열(번호) 설정
            let oColumn = new Column({
                width: "3rem",
                name: "번호",
                hAlign: "Center",
                template: new Field({
                    value: {
                        path: "",
                        formatter: function () {
                            return this.getParent().getIndex() + 1;
                        }
                    },
                    editMode: "Display"
                })
            })
            oColumn.addMultiLabel(
                new Label({
                    text: "번호",
                    textAlign: "Center",
                    width: "3rem"
                })
            )
            oTable.addColumn(oColumn);

            // 화면에 보여줄 테이블 컬럼 순서 및 멀티 헤더 정의
            const aColumnOrder = [
                // ["row_number"], // 번호
                // ["excp_logic_clf_nm"],    // 예외매출로직유형
                ["sell_sls_cnrc_no"],   // 영업기회 / 계약번호
                ["prj_no"], // 수행계획코드
                ["prj_nm"], // 프로젝트명

                ["cstco_nm"], // 고객사
                ["rodr_sctr_org_nm"],  // 수주부문
                ["rodr_hdqt_org_nm"],  // 수주본부
                ["rodr_org_nm"],   // 수주조직
                ["sale_sctr_org_nm"],  // 매출부문
                ["sale_hdqt_org_nm"],  // 매출본부
                ["sale_org_nm"],   // 매출조직
                ["rodr_cnrc_ym"],   // 수주계약년월 -format
                ["prj_prfm_str_dt"],   // 프로젝트 수행 기간 - 시작일  -format
                ["prj_prfm_end_dt"],    // 프로젝트 수행 기간 - 종료일  -format
                ["new_crov_div_nm"],   // 신규/이월 구분
                ["prj_scr_yn"],   // 확보여부
                ["ovse_biz_yn"],   // 해외 사업여부
                ["relsco_yn"],  // 관계사 여부
                ["cnvg_biz_yn"],    // 융복합사업 여부
                ["prj_tp_nm"],    // 프로젝트 유형
                ["si_os_div_nm"], // SI/OS 구분
                ["dgtr_tp_nm"], // 브랜드 체계 - DT Type
                ["dev_aplt_dgtr_tech_nm"],  // 적용 기술
                ["brand_nm"], // 브랜드 체계 - 브랜드명
                ["dp_nm"],    // 브랜드 체계 - DP명
                ["bd_n1_rid"], // 매출 Biz Domzin - BD1
                ["bd_n2_rid"], // 매출 Biz Domzin - BD2
                ["bd_n3_rid"], // 매출 Biz Domzin - BD3
                ["bd_n4_rid"], // 매출 Biz Domzin - BD4
                ["bd_n5_rid"], // 매출 Biz Domzin - BD5
                ["bd_n6_rid"], // 매출 Biz Domzin - BD6
                ["itsm_div_nm"],  // ITSM 구분
                ["rodr_n1_mm_amt"],    // 수주 월별금액 - 1월
                ["rodr_n2_mm_amt"],    // 수주 월별금액 - 2월
                ["rodr_n3_mm_amt"],    // 수주 월별금액 - 3월
                ["rodr_n4_mm_amt"],    // 수주 월별금액 - 4월
                ["rodr_n5_mm_amt"],    // 수주 월별금액 - 5월
                ["rodr_n6_mm_amt"],    // 수주 월별금액 - 6월
                ["rodr_n7_mm_amt"],    // 수주 월별금액 - 7월
                ["rodr_n8_mm_amt"],    // 수주 월별금액 - 8월
                ["rodr_n9_mm_amt"],    // 수주 월별금액 - 9월
                ["rodr_n10_mm_amt"],    // 수주 월별금액 - 10월
                ["rodr_n11_mm_amt"],    // 수주 월별금액 - 11월
                ["rodr_n12_mm_amt"],    // 수주 월별금액 - 12월
                ["rodr_n1_qtr_amt"],   // 수주 1Q~4Q금액 - 1Q
                ["rodr_n2_qtr_amt"],   // 수주 1Q~4Q금액 - 2Q
                ["rodr_n3_qtr_amt"],   // 수주 1Q~4Q금액 - 3Q
                ["rodr_n4_qtr_amt"],   // 수주 1Q~4Q금액 - 4Q
                ["rodr_year_amt"],  // 연간 수주금액
                ["sale_n1_mm_amt"],    // 매출 월별금액 - 1월
                ["sale_n2_mm_amt"],    // 매출 월별금액 - 2월
                ["sale_n3_mm_amt"],    // 매출 월별금액 - 3월
                ["sale_n4_mm_amt"],    // 매출 월별금액 - 4월
                ["sale_n5_mm_amt"],    // 매출 월별금액 - 5월
                ["sale_n6_mm_amt"],    // 매출 월별금액 - 6월
                ["sale_n7_mm_amt"],    // 매출 월별금액 - 7월
                ["sale_n8_mm_amt"],    // 매출 월별금액 - 8월
                ["sale_n9_mm_amt"],    // 매출 월별금액 - 9월
                ["sale_n10_mm_amt"],    // 매출 월별금액 - 10월
                ["sale_n11_mm_amt"],    // 매출 월별금액 - 11월
                ["sale_n12_mm_amt"],    // 매출 월별금액 - 12월
                ["sale_n1_qtr_amt"],    // 매출 1Q~4Q금액 - 1Q
                ["sale_n2_qtr_amt"],    // 매출 1Q~4Q금액 - 2Q
                ["sale_n3_qtr_amt"],    // 매출 1Q~4Q금액 - 3Q
                ["sale_n4_qtr_amt"],    // 매출 1Q~4Q금액 - 4Q
                ["sale_year_amt"],   // 연간 매출금액,
                ["prj_prfm_n1_mm_amt"],    // 프로젝트 월별수행금액 - 1월
                ["prj_prfm_n2_mm_amt"],    // 프로젝트 월별수행금액 - 2월
                ["prj_prfm_n3_mm_amt"],    // 프로젝트 월별수행금액 - 3월
                ["prj_prfm_n4_mm_amt"],    // 프로젝트 월별수행금액 - 4월
                ["prj_prfm_n5_mm_amt"],    // 프로젝트 월별수행금액 - 5월
                ["prj_prfm_n6_mm_amt"],    // 프로젝트 월별수행금액 - 6월
                ["prj_prfm_n7_mm_amt"],    // 프로젝트 월별수행금액 - 7월
                ["prj_prfm_n8_mm_amt"],    // 프로젝트 월별수행금액 - 8월
                ["prj_prfm_n9_mm_amt"],    // 프로젝트 월별수행금액 - 9월
                ["prj_prfm_n10_mm_amt"],    // 프로젝트 월별수행금액 - 10월
                ["prj_prfm_n11_mm_amt"],    // 프로젝트 월별수행금액 - 11월
                ["prj_prfm_n12_mm_amt"],    // 프로젝트 월별수행금액 - 12월
                ["prj_prfm_n1_qtr_amt"],    // 프로젝트 1Q~4Q수행금액 - 1Q
                ["prj_prfm_n2_qtr_amt"],    // 프로젝트 1Q~4Q수행금액 - 2Q
                ["prj_prfm_n3_qtr_amt"],    // 프로젝트 1Q~4Q수행금액 - 3Q
                ["prj_prfm_n4_qtr_amt"],    // 프로젝트 1Q~4Q수행금액 - 4Q
                ["prj_prfm_year_amt"],  // 연간프로젝트 수행비용
                ["rmdr_sale_n1_mm_amt"], // 잔여매출 월별금액 - 1월
                ["rmdr_sale_n2_mm_amt"], // 잔여매출 월별금액 - 2월
                ["rmdr_sale_n3_mm_amt"], // 잔여매출 월별금액 - 3월
                ["rmdr_sale_n4_mm_amt"], // 잔여매출 월별금액 - 4월
                ["rmdr_sale_n5_mm_amt"], // 잔여매출 월별금액 - 5월
                ["rmdr_sale_n6_mm_amt"], // 잔여매출 월별금액 - 6월
                ["rmdr_sale_n7_mm_amt"], // 잔여매출 월별금액 - 7월
                ["rmdr_sale_n8_mm_amt"], // 잔여매출 월별금액 - 8월
                ["rmdr_sale_n9_mm_amt"], // 잔여매출 월별금액 - 9월
                ["rmdr_sale_n10_mm_amt"], // 잔여매출 월별금액 - 10월
                ["rmdr_sale_n11_mm_amt"], // 잔여매출 월별금액 - 11월
                ["rmdr_sale_n12_mm_amt"], // 잔여매출 월별금액 - 12월
                ["rmdr_sale_n1_qtr_amt"], // 잔여매출 1Q~4Q 금액 - 1Q
                ["rmdr_sale_n2_qtr_amt"], // 잔여매출 1Q~4Q 금액 - 2Q
                ["rmdr_sale_n3_qtr_amt"], // 잔여매출 1Q~4Q 금액 - 3Q
                ["rmdr_sale_n4_qtr_amt"], // 잔여매출 1Q~4Q 금액 - 4Q
                ["rmdr_sale_year_amt"], // 연간 잔여매출금액
                ["dblbk_sctr_org_nm"], // 더블부킹 정보 - DB부문
                ["dblbk_hdqt_org_nm"], // 더블부킹 정보 - DB본부
                ["dblbk_org_nm"], // 더블부킹 정보 - DB조직
                ["dblbk_sale_yn"], // 더블부킹 정보 - DB매출여부
                ["rskel_yn"],   // 리스크 여부
                ["rskel_grd_nm"], // 리스크 등급
                ["prfm_prjm_nm"],   // 수행PM
                ["rmk_cntt"],   // 비고
            ]

            // Metadata 불러오기
            let oMetaModel = this.getOwnerComponent().getModel().getMetaModel();
            await oMetaModel.requestObject("/mis_project_sheet_expand_viewType");
            let oMetadata = oMetaModel.getData();
            let oAnnotation = oMetadata["$Annotations"];
            let aProperty = oMetadata["CommonService.mis_project_sheet_expand_viewType"];
            for (let i in aColumnOrder) {
                let aColumn = aColumnOrder[i];
                let sKey = aColumn[aColumn.length - 1];

                if (aProperty[sKey]?.["$kind"] === "Property") {
                    // Edm Type을 sap.ui.model.type 타입으로 변경
                    let sEdmType = aProperty[sKey]?.["$Type"];
                    let sDataType = Formatter.convertTypeEdmToSap(sEdmType);

                    // Annotation 가져오기
                    let iMaxLength = aProperty[sKey]?.["$MaxLength"];
                    if (iMaxLength > 20) {
                        iMaxLength = 20;
                    } else if (iMaxLength < 5 || !iMaxLength) {
                        iMaxLength = 5;
                    }

                    // 컬럼 생성
                    let oColumn = new Column({
                        autoResizable: true,
                        name: sKey,
                        width: `10rem`,
                        sortProperty: sKey,
                        filterProperty: sKey,
                        hAlign: `{/mis_project_sheet_expand_view/Set/${sKey}##@com.sap.vocabularies.UI.v1.alignment}`,
                    })

                    // MultiLabel(header)이 존재할 때
                    let sHeader = oAnnotation?.[`CommonService.mis_project_sheet_expand_viewType/${sKey}`]?.["@com.sap.vocabularies.UI.v1.header"];
                    if (sHeader) {
                        // 최하위 라벨일 때 Annotation으로 Label 설정
                        oColumn.addMultiLabel(
                            new Label({
                                text: `{/mis_project_sheet_expand_view/Set/${sKey}##@com.sap.vocabularies.UI.v1.header}`,
                                textAlign: "Center",
                                width: `100%`
                            })
                        )

                        // MultiLabel이 같은 Column 수 구하기 (headerSpan 설정을 위함)
                        let aAnnotation = Object.entries(oAnnotation);
                        let iHeaderSpan = aAnnotation.filter(oAnnotation => {
                            return oAnnotation[0].includes("mis_project_sheet_expand_viewType")
                                && oAnnotation[1]?.["@com.sap.vocabularies.UI.v1.header"] === sHeader;
                        }).length;
                        oColumn.setHeaderSpan(iHeaderSpan);
                    }

                    // 기본적인 라벨 추가
                    oColumn.addMultiLabel(
                        new Label({
                            text: `{/mis_project_sheet_expand_view/Set/${sKey}##@com.sap.vocabularies.Common.v1.Label}`,
                            textAlign: "Center",
                            width: `100%`
                        })
                    )

                    // Formatter
                    let fFormatter;
                    if (sDataType === "sap.ui.model.odata.type.Boolean") {
                        fFormatter = function (bValue) {
                            if (bValue) {
                                return (bValue === "예") ? "Y" : "N";
                            }
                        }
                    } else if (sKey === "rodr_cnrc_ym") {   // 수정 예정
                        fFormatter = function (sValue) {
                            return `${sValue?.slice(0, 4)}-${sValue?.slice(4, 6)}`
                        }
                    } else if (sKey === "prj_prfm_str_dt" || sKey === "prj_prfm_end_dt") {
                        fFormatter = function (sValue) {
                            let dValue = new Date(sValue);
                            if (dValue) {
                                return `${dValue.getFullYear()}-${String(dValue.getMonth() + 1).padStart(2, 0)}-${String(dValue.getDate()).padStart(2, 0)}`
                            }
                        }
                    }

                    // GridTable일 때는 Template 추가해야 함
                    let oField = new Field({
                        editMode: "Display",
                        dataType: sDataType,
                    })
                    oField.setContent(new Text({
                        text: {
                            path: `${sKey}`,
                            formatter: fFormatter,
                        },
                        wrapping: false,
                    }))

                    let oTemplate = oField;
                    oColumn.setTemplate(oTemplate);

                    let oTable = this.byId("exeTable");
                    oTable.addColumn(oColumn);
                }
            }
        },

        /**
         * 엑셀 다운로드
         */
        onExeExcelDownload: async function () {
            let oTable = this.byId("exeTable");

            // 데이터가 없을 때
            if (!oTable.getBinding("rows")?.getContexts()) {
                this._messageBox('warning', '검색된 데이터가 없습니다.');
                return;
            }

            let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();
            let sRowPath = oTable.getBinding("rows").getPath();
            let sUrl = `/odata/v4/common${sRowPath}`;
            if (oSearchData.year) {
                sUrl = sUrl + `?$filter=rodr_esmt_y eq '${oSearchData.year - 1}'`;
            };

            // 데이터 반환
            this.getView().setBusy(true);

            let aContexts = await oTable.getBinding("rows").requestContexts(0, Infinity);
            let aResults = aContexts.map((oData, index) => {
                let object = oData.getObject();
                object["번호"] = index + 1;

                return object;
            });

            let aColumns = oTable.getColumns();
            let aColumnInfo = [];
            aColumns.forEach((oColumn, index) => {
                let iSpan = oColumn.getHeaderSpan();
                let aMultiLabels = oColumn.getMultiLabels();
                let sMultiLabel = aMultiLabels[0] ? aMultiLabels[0].getText() : "";
                let sLabel = aMultiLabels[1] ? aMultiLabels[1].getText() : "";
                let bMerge = true;
                let sName = oColumn.getName();

                if (iSpan > 1 && sMultiLabel !== aColumnInfo[index - 1].sMultiLabel) {
                    bMerge = false;
                } else if (iSpan > 1 && sMultiLabel !== aColumnInfo[index - 1].sMultiLabel) {
                    sMultiLabel = "";
                };
                aColumnInfo.push({ index, sMultiLabel, sLabel, iSpan, bMerge, sName });
            });

            let workbook = new ExcelJS.Workbook();
            let worksheet = workbook.addWorksheet("Sheet1");
            let columnIndex = 1;

            aColumnInfo.forEach(col => {
                let startCol = columnIndex;
                let endColFirstRow = columnIndex + col.iSpan - 1;

                if (col.bMerge === false) {
                    worksheet.mergeCells(1, startCol, 1, endColFirstRow);
                }
                worksheet.getCell(1, startCol).value = col.sMultiLabel;
                worksheet.getCell(2, startCol).value = col.sLabel;
                columnIndex++;
            });

            let headerRow = worksheet.getRow(1);
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'E6EAF0' }
                };
            });

            headerRow = worksheet.getRow(2);
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'E6EAF0' }
                };
            });

            if (aResults.length > 0) {
                for (let i = 0; i < aResults.length; i++) {
                    let rowValues = [];
                    aColumnInfo.forEach(oColumn => {
                        rowValues.push(aResults[i][oColumn.sName]);
                    });

                    worksheet.addRow(rowValues);
                };
            } else {
                worksheet.addRow(['No Data']).font = { italic: true };
            };

            workbook.xlsx.writeBuffer().then((buffer) => {
                let dNow = new Date();
                let blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                let link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `장판지_${dNow.getFullYear()}${String(dNow.getMonth() + 1).padStart(2, 0)}${dNow.getDate()}.xlsx`;
                link.click();
            });

            MessageToast.show("장판지 테이블 데이터를 \n엑셀 파일로 \n다운로드 하였습니다.");

            this.getView().setBusy(false);
        },
    });
});