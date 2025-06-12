sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/core/format/NumberFormat",
    "sap/m/Token",
    "../util/Module",
    "sap/ui/core/library",
    "sap/ui/core/HTML",
    "sap/ui/model/Sorter",
     "sap/ui/core/EventBus"
], (Controller, JSONModel, MessageBox, Fragment, NumberFormat, Token, Module, coreLib, HTML, Sorter, EventBus) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Input} Input
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     */
    return Controller.extend("bix.pl.performance.controller.PLTable", {
        _oEventBus: EventBus.getInstance(),

        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RoutePL");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);

            const myRoute2 = this.getOwnerComponent().getRouter().getRoute("RoutePLChart");
            myRoute2.attachPatternMatched(this.onMyRoutePatternMatched, this);

            const myRoute3 = this.getOwnerComponent().getRouter().getRoute("RouteSGA");
            myRoute3.attachPatternMatched(this.onMyRoutePatternMatched, this);
            
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: function () {
            // 검색창 초기화
            this.getView().getControlsByFieldGroupId("Search").forEach(function (object) {
                if (object.getFieldGroupIds().length > 0) {
                    object.setValue?.(null);
                    object.removeAllTokens?.();
                }
            }.bind(this));

            //테이블 초기화
            // let oTable = this.byId("plUiTable");
            // oTable.unbindRows();
            // oTable.setModel(null);

            this._setData();

            this.getOwnerComponent().getModel("controllerModel").setProperty("/pl", this);
        },

        /**
         * 실적 데이터 기초 데이터 세팅
         */
        _setData: function () {
            // 테이블 모델 설정
            this._aPlColumn = [
                {
                    type: "매출",
                }, {
                    type: "마진",
                }, {
                    type: "마진율",
                }, {
                    type: "SG&A",
                }, {
                    type: "공헌이익",
                }, {
                    type: "전사SG&A",
                }, {
                    type: "영업이익",
                }, {
                    type: "영업이익률",
                }
            ];

            // 테이블 초기 바인딩이 아닐 때 Return
            let oTable = this.byId("plUiTable");
            if (oTable.getBinding("rows")?.getPath() !== "/") {
                return;
            }

            // 테이블 초기 바인딩
            oTable.setModel(new JSONModel(this._aPlColumn));
            oTable.bindRows({
                path: '/'
            })

            // 연간 목표 컬럼의 연도 설정
            let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();
            let dYearMonth = oSearchData.yearMonth;
            let iYear = dYearMonth.getFullYear();
            let oTemp = { year: String(iYear).substring(2) };
            this.getView().setModel(new JSONModel(oTemp), "tableYearModel");
        },

        /**
         * Pl 대시보드 검색 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag 
         */
        _bindTable: async function (sChannel, sEvent, oData) {
            this.getView().setBusy(true);

            // 검색창 검색 조건
            let oSearchData = this.getOwnerComponent().getModel("searchModel").getData();
            let sOrgId = `${oSearchData.orgId}`;
            let dYearMonth = oSearchData.yearMonth;
            let iYear = dYearMonth.getFullYear();
            let iMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");

            // 테이블 바인딩
            // let sPath = `/mis_get_pl_sales(year='${iYear}',month='${iMonth}',id='${oSearchData.orgId}')/Set`;
            if(this.getOwnerComponent().getModel("uiModel").getProperty("/orgSearch")) sOrgId = 'test';
            let sPath = `/get_actual_pl(year='${iYear}',month='${iMonth}',org_id='${sOrgId}')`;
            let oTable = this.byId("plUiTable");
            let oModel = this.getOwnerComponent().getModel();

            // 왠진 모르겠지만 처음에 오류가 남
            try {
                oTable.setModel(oModel);
            } catch {
                oTable.setModel(oModel);
            }
            oTable.bindRows({
                path: `pl2>${sPath}`,
                sorter: new Sorter({ path: "display_order" }),
                events: {
                    dataRequested: function () {
                        oTable.setBusy(true);
                    }.bind(this),
                    dataReceived: function () {
                        // 컬럼 열 너비 자동 조정
                        oTable.attachEvent("rowsUpdated", function () {
                            oTable.getColumns().forEach(oColumn => oColumn.autoResize());
                        }.bind(this));

                        oTable.setBusy(false);
                    }.bind(this),
                }
            })

            // 날짜 입력 값 받아 수정
            let oTemp = { year: String(iYear).substring(2) };
            this.getView().setModel(new JSONModel(oTemp), "tableYearModel");

            this.getView().setBusy(false);
        },

        /**
         * PL 테이블 행 클릭 이벤트
         * @param {Event} oEvent 
         */
        onRowSelectionChange: function (oEvent) {
            let oSource = oEvent.getSource();

            // sgaDetail일 때 Return
            // let sTarget = sap.ui.core.UIComponent.getRouterFor(this).getHashChanger().getHash();
            // if (sTarget === "sgaDetail") return;

            // type이 SG&A일 때
            let oBindingObject = oEvent.getParameters()["rowContext"]?.getObject();
            if (oBindingObject?.type === "SG&A") {
                let sBindingPath = oSource.getBinding("rows").getPath();

                // Path에 포함된 Parameter 객체로 반환
                const regex = /([a-zA-Z]+)='([^']+)'/g;
                let oParams = {};
                let match;
                while ((match = regex.exec(sBindingPath)) !== null) {
                    oParams[match[1]] = match[2];
                }

                // 검색 전
                if (Object.keys(oParams).length === 0) {
                    Module._messageBox('warning', 'PL 테이블을 먼저 검색 해주세요');
                    return;
                }

                this.getOwnerComponent().getRouter().navTo("RouteSGA");
            }else if (oBindingObject?.type === "매출"){
                this.getOwnerComponent().getRouter().navTo("RouteSale");
            }
        },

        /**
         * PL Table 반환
         */
        _getTable: function () {
            return this.byId("plUiTable");
        },

        /**
         * 필드 Formatter
         * @param {String} sType 
         * @param {*} iValue1 기본값
         * @param {*} iValue2 제할 값
         */
        onFormatPerformance: function (sType, iValue1, iValue2, sTooltip) {
            // 값이 없을 때 return
            if (!iValue1) return;

            // iValue2가 있을 때 iValue2 - iValue1
            let iNewValue = (iValue2 && !isNaN(iValue2)) ? (iValue1 - iValue2) : iValue1;

            if (sType === "마진률" || sType === "영업이익률" || sTooltip === "percent") {
                // var oNumberFormat = NumberFormat.getPercentInstance({
                //     groupingEnabled: true,
                //     groupingSeparator: ',',
                //     groupingSize: 3,
                //     decimals: 2,
                // });

                var oNumberFormat = NumberFormat.getIntegerInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });
                return oNumberFormat.format(iNewValue) + "%";
            } else if(sTooltip === "tooltip" ){
                var oNumberFormat = NumberFormat.getIntegerInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iNewValue);
            } else {
                //iNewValue = iNewValue >= 0 ? Math.floor(iNewValue / 100000000) : Math.ceil(iNewValue / 100000000);

                var oNumberFormat = NumberFormat.getIntegerInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iNewValue)// + "억";
            };
        },



        onTempTest:async function(){
            let oSearchData = this.getView().getModel("searchModel").getData();
            let dYearMonth = oSearchData.yearMonth;
            let iYear = dYearMonth.getFullYear().toString();

            let sPath = `/odata/v4/pl/get_spreadsheet_data(year='${iYear}',org_id='${oSearchData.orgId}')`;
            let oResult = await Module._getData(sPath);
        },
    });
});