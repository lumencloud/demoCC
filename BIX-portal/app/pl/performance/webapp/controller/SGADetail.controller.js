sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../../main/util/Module",
    "sap/ui/core/format/NumberFormat",
    "sap/m/MessageToast",
], (Controller, JSONModel, Module, NumberFormat, MessageToast) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     */
    return Controller.extend("bix.pl.performance.controller.SGADetail", {
        _table: undefined,

        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteSGA");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: function (oEvent) {
            // _table에 테이블 객체 저장
            this._table = this.byId("sagDetailTreeTable");
            this.getOwnerComponent().getModel("controllerModel").setProperty("/sgaDetail", this);

            this.getView().setModel(new JSONModel({}), "sgaDetailTreeTableModel2");
            this.getView().setModel(new JSONModel({}), "chartModel");

            this._bindThird();
        },

        //테이블 검색
        _bindThird: async function () {
            let oPlController = this.getOwnerComponent().getModel("controllerModel").getProperty("/pl");
            if (!oPlController) return;
            let oPlTable = oPlController._getTable();
            let sBindingPath = oPlTable.getBinding("rows")?.getPath();

            // PL 테이블이 검색되지 않은 상태라면 Return
            if (!sBindingPath) return;

            // PL 테이블이 검색되었는지 확인
            const regex = /([a-zA-Z]+)='([^']+)'/g;
            let oParams = {};
            let match;
            while ((match = regex.exec(sBindingPath)) !== null) {
                oParams[match[1]] = match[2];
            }

            // 컬럼 년도 셋팅용 모델
            let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();
            let dYearMonth = oSearchData.yearMonth;
            let iYear = dYearMonth.getFullYear();
            let oTemp = { year: String(iYear).substring(2) };
            this.getView().setModel(new JSONModel(oTemp), "tableYearModel");

            // 검색 전
            if (Object.keys(oParams).length === 0) {
                return;
            };

            this.getView().setBusy(true);

            let sYear = oParams.year;
            let sMonth = oParams.month;
            let sOrgId = oParams.id;

            // let sUrl = `/odata/v4/common/mis_get_pl_sgna(year='${sYear}',month='${sMonth}',id='${sOrgId}')/Set`
            //     + `?$orderby=level2 asc`
            // let sUrl = `/odata/v4/sgna/get_sga_result_detail(year='${sYear}',month='${sMonth}',org_id='${sOrgId}')`
            let sUrl = `/odata/v4/sga-api/get_sga_performance(year='${sYear}',month='${sMonth}',org_id='${sOrgId}')`
            let aResults = await Module._getData(sUrl);
            aResults = aResults.value;
            this.getView().setModel(new JSONModel(aResults), "sgaDetailTreeTableModel2");

            // 셀 병합
            let oTable = this.byId("sagDetailTreeTable");
            // oTable.getColumns().forEach(oColumn => oColumn.autoResize());
            oTable.fireFirstVisibleRowChanged({ firstVisibleRow: 0 });

            this.getView().setBusy(false);
        },


        /**
         * 테이블 행 선택 이벤트
         * @param {Event} oEvent 
         */
        onCellClick: function (oEvent) {
            let oParameters = oEvent.getParameters();
            let oTable = oEvent.getSource();
            let oCellDom = oParameters.cellDomRef;

            let iRowSpan = oCellDom.getAttribute("rowspan");
            if (!iRowSpan) {    // 병합된 셀이 아닐 때
                let iRowIndex = oParameters.rowIndex;
                let aBindingContexts = oTable.getBinding("rows").getContexts();
                let oSelectedContext = aBindingContexts[iRowIndex];
                let oSelectedObject = oSelectedContext.getObject();

                //차트 페이지를 상세 페이지로 변환 및 검색
                let oLayoutModel = this.getOwnerComponent().getModel("layoutControl");
                if(!oSelectedObject.level2){
                    oLayoutModel.setProperty("/3depth_page_sub", oSelectedObject.level1+"-"+oSelectedObject.type+"-Detail");
                }else{
                    oLayoutModel.setProperty("/3depth_page_sub", oSelectedObject.level2+"-"+oSelectedObject.type+"-Detail");
                }

                let is3depth = this.getOwnerComponent().getModel("layoutControl").getProperty("/3depth_usage");
                if (is3depth) {
                    let oTemp = this.getOwnerComponent().getModel("controllerModel").getProperty("/" + "sgaDetailDetail");
                    oTemp._bindThird();
                };
            }
        },

        /**
         * 테이블 스크롤 이벤트
         * @param {Event} oEvent 
         */
        onFirstVisibleRowChanged: function (oEvent) {
            let oTable = /** @type {sap.ui.table.Table} */ (oEvent.getSource());

            oTable.rerender();
            let aRows = oTable.getRows();
            let iSkipCount1 = 0, iSkipCount2 = 0, iSkipCount3 = 0;
            for (let i = 0; i < aRows.length; i++) {
                let oRow = aRows[i];

                let oBindingContext = oRow.getBindingContext("sgaDetailTreeTableModel2");
                if (!oBindingContext) return;

                let oBindingObject = oBindingContext.getObject();

                // 셀 가로 병합
                let iCount = 0;
                if (oBindingObject["level2"] === null) {
                    iCount = 0;
                } else if (oBindingObject["level3"] === null) {
                    iCount = 1;
                } else {
                    iCount = 2;
                }

                for (let i = iCount; i < 2; i++) {
                    let oCell = document.getElementById(`${oRow.getId()}-col${i}`);

                    if (iCount === i) {
                        oCell?.setAttribute?.("colspan", String(2 - iCount));
                    } else {
                        oCell?.remove?.();
                    }
                }

                // 셀 세로 병합
                // Level1
                if (iSkipCount1 > 0) {
                    let oCell = document.getElementById(`${oRow.getId()}-col0`);
                    oCell?.remove?.();

                    iSkipCount1--;
                } else {
                    // 최상위 레벨일 때 설정
                    if (iCount === 0) {
                        var iRowSpan = aRows.filter(oRow => {
                            let oRowBindingContext = oRow.getBindingContext("sgaDetailTreeTableModel2");
                            if (!oRowBindingContext) return;

                            let oRowBindingObject = oRowBindingContext.getObject();
                            return oRowBindingObject["level1"] === oBindingObject["level1"]
                                && oRowBindingObject["level2"] === null
                            // && oRowBindingObject["level3"] === null;
                        }).length;
                    } else {
                        var iRowSpan = aRows.filter(oRow => {
                            let oRowBindingContext = oRow.getBindingContext("sgaDetailTreeTableModel2");
                            if (!oRowBindingContext) return;

                            let oRowBindingObject = oRowBindingContext.getObject();
                            return oRowBindingObject["level1"] === oBindingObject["level1"]
                                && oRowBindingObject["level2"] !== null;
                        }).length;
                    }

                    let oCell = document.getElementById(`${oRow.getId()}-col0`);
                    oCell?.setAttribute?.("rowspan", String(iRowSpan));

                    iSkipCount1 = iRowSpan - 1;
                }

                // Level2
                if (iCount === 0) continue;  // 최상위 레벨일 때 Continue
                if (iSkipCount2 > 0) {
                    let oCell = document.getElementById(`${oRow.getId()}-col1`);
                    oCell?.remove?.();

                    iSkipCount2--;
                } else {
                    if (iCount === 1) {
                        var iRowSpan = aRows.filter(oRow => {
                            let oRowBindingContext = oRow.getBindingContext("sgaDetailTreeTableModel2");
                            if (!oRowBindingContext) return;

                            let oRowBindingObject = oRowBindingContext.getObject();
                            return oRowBindingObject["level1"] === oBindingObject["level1"]
                                && oRowBindingObject["level2"] === oBindingObject["level2"]
                            // && oRowBindingObject["level3"] === oBindingObject["level3"];
                        }).length;
                    } else if (iCount === 2) {
                        var iRowSpan = aRows.filter(oRow => {
                            let oRowBindingContext = oRow.getBindingContext("sgaDetailTreeTableModel2");
                            if (!oRowBindingContext) return;

                            let oRowBindingObject = oRowBindingContext.getObject();
                            return oRowBindingObject["level1"] === oBindingObject["level1"]
                                && oRowBindingObject["level2"] === oBindingObject["level2"]
                            // && oRowBindingObject["level3"] !== null;
                        }).length;
                    }

                    let oCell = document.getElementById(`${oRow.getId()}-col1`);
                    oCell?.setAttribute?.("rowspan", String(iRowSpan));

                    iSkipCount2 = iRowSpan - 1;
                }

                continue;

                // Level3
                if (iCount === 1) continue;  // 2 레벨일 때 Continue
                if (iSkipCount3 > 0) {
                    let oCell = document.getElementById(`${oRow.getId()}-col2`);
                    oCell?.remove?.();

                    iSkipCount3--;
                } else {
                    var iRowSpan = aRows.filter(oRow => {
                        let oRowBindingContext = oRow.getBindingContext("sgaDetailTreeTableModel2");
                        if (!oRowBindingContext) return;

                        let oRowBindingObject = oRowBindingContext.getObject();
                        return oRowBindingObject["level1"] === oBindingObject["level1"]
                            && oRowBindingObject["level2"] === oBindingObject["level2"]
                            && oRowBindingObject["level3"] === oBindingObject["level3"];
                    }).length;

                    let oCell = document.getElementById(`${oRow.getId()}-col2`);
                    oCell?.setAttribute?.("rowspan", String(iRowSpan));

                    iSkipCount3 = iRowSpan - 1;
                }
            }

            // ColumnResize 시 병합 CSS 적용
            oTable.attachEventOnce("columnResize", function () {
                // 원활한 적용을 위해 시간차 설정
                setTimeout(function () {
                    oTable.fireFirstVisibleRowChanged({ firstVisibleRow: 0 });
                }, 0.01);
            })

            this.getView().setBusy(false);
        },

        /**
         * 필드 Formatter
         * @param {*} iValue1 기본값
         * @param {*} iValue2 제할 값
         */
        onFormat: function (iValue1, iValue2, sType) {
            if (!iValue1) { iValue1 = 0 };

            // iValue2가 있을 때 iValue2 - iValue1
            let iNewValue = (iValue2 && !isNaN(iValue2)) ? (iValue1 - iValue2) : iValue1;

            if(sType === "int"){
                // iNewValue = iNewValue >= 0 ? Math.floor(iNewValue / 100000000) : Math.ceil(iNewValue / 100000000);
                // if( iNewValue / 100000000 >=1 ){
                //     iNewValue = Math.floor(iNewValue / 100000000);
                // }else{
                //     iNewValue = parseFloat((iNewValue / 100000000).toFixed(2)).toString();
                // }

                let oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
    
                if(iValue1 === 0){
                    return '-';
                } else {
                    return oNumberFormat.format(iNewValue)// + "억";
                }
            }else if(sType === "percent"){
                let oNumberFormat = NumberFormat.getIntegerInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2
                });
    
                return oNumberFormat.format(iNewValue) + "%";
            }else if(sType === "tooltip"){
                let oNumberFormat = NumberFormat.getIntegerInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
    
                return oNumberFormat.format(iNewValue);
            };
        },

        _returnTable: function () {
            return 
        },

        /**
         * 필드 Formatter
         * @param {*} sValue 기본값
         */
        onFormatTypeText: function (sValue) {
            if (!sValue) return;

            let sNewValue;
            switch (sValue) {
                case "EXPENSE":
                    sNewValue = "경비"
                    break;
                case "INVEST":
                    sNewValue = "투자비"
                    break;
                case "LABOR":
                    sNewValue = "인건비"
                    break;
            }

            return sNewValue;
        },
    });
});