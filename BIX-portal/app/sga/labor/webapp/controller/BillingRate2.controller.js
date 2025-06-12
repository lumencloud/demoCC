sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/library",
    "sap/ui/table/Column",
    "sap/m/Label",
    "sap/m/Text",
    "bix/common/library/customDialog/OrgSingleSelect",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/viz/ui5/controls/common/feeds/FeedItem",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/data/MeasureDefinition",
    "sap/viz/ui5/controls/Popover",
    "sap/viz/ui5/controls/VizTooltip"
], (Controller, JSONModel, MessageBox, MessageToast, coreLib, Column, Label, Text, OrgSingleSelect, NumberFormat,
    Filter, FilterOperator, FeedItem, FlattenedDataset, MeasureDefinition, Popover, VizTooltip
) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     */
    return Controller.extend("bix.sga.labor.controller.BillingRate2", {
        _oOrgSingleSelectDialog: undefined,

        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("BillingRate");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
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

            // 초기 모델 설정
            let dNow = new Date();
            this.getView().setModel(new JSONModel({
                org_id: null,
                yearMonth: new Date(dNow.getFullYear() - 1, dNow.getMonth(), 1)
            }), "searchModel");

            // 목표액 추가 테이블 스크롤 초기 설정 (수직, 수평)
            let oTable = this.byId("table");
            let oVerticalScroll = oTable._getScrollExtension().getVerticalScrollbar();
            oVerticalScroll?.scrollTo(0, 0);

            let oHorizontalScroll = oTable._getScrollExtension().getHorizontalScrollbar();
            oHorizontalScroll?.scrollTo(0, 0);

            // 년월의 최소, 최댓값 설정
            this.byId("searchMonthYear").setMinDate(new Date(2024, 0, 1));
            this.byId("searchMonthYear").setMaxDate(new Date(dNow.getFullYear(), 11));

            // 테이블 열 구성
            this._setTableColumn();

            // 차트 Property 구성
            this._setChartProperties();

            // 바인딩 해제
            oTable.setNoData("검색 조건 입력 후 검색해주세요.");
        },

        /**
         * 테이블 열 구성
         */
        _setTableColumn: function () {
            let oTable = this.byId("table");
            oTable.removeAllColumns();

            // 부문, 본부, 조직 열 추가
            let aOrgs = ["부문", "본부", "조직"];
            let aOrgNames = ['div_name','hdqt_name','team_name']
            for (let i = 1; i <= aOrgs.length; i++) {
                let oColumn = new Column({
                    hAlign: "Center",
                    width: "15rem",
                    autoResizable: true,
                })

                // 라벨 추가
                let oLabel1 = new Label({
                    text: aOrgs[i - 1],
                    wrapping: false,
                })
                let oLabel2 = new Label({ text: null });

                oColumn.addMultiLabel(oLabel1);
                oColumn.addMultiLabel(oLabel2);

                // 템플릿 추가
                let oText = new Text({
                    text: `{sga>${aOrgNames[i-1]}}`,
                    wrapping: false,
                    width: "100%",
                    textAlign: "Center"
                })
                oColumn.setTemplate(oText);

                oTable.addColumn(oColumn);
            }

            // 월 열 추가
            let dSelectedDate = this.getView().getModel("searchModel").getProperty("/yearMonth");
            let iSelectedMonth = dSelectedDate.getMonth() + 1;

            for (let i = 1; i <= 12; i++) {
                let oColumn = new Column({
                    hAlign: "Center",
                    width: "8rem",
                    autoResizable: true,
                    headerSpan: (i <= iSelectedMonth) ? iSelectedMonth : (12 - iSelectedMonth)
                })

                // 라벨 추가
                let oLabel1 = new Label({
                    text: (i <= iSelectedMonth) ? "실적 Billing Rate 계산" : "추정치",
                    wrapping: false,
                })
                let oLabel2 = new Label({ text: `${i}월` });

                oColumn.addMultiLabel(oLabel1);
                oColumn.addMultiLabel(oLabel2);

                // 템플릿 추가
                var oText = new Text({
                    text: {
                        parts: [
                            { path: `sga>m_${i}_data`, targetType: 'any' }
                        ],
                        // formatter: function (iBill, iOpp, iTotal) {
                        //     try {
                        //         // 선택한 달 이전엔 실적 / 이후에는 추정치
                        //         if (i <= iSelectedMonth) {
                        //             var iResult = (iBill) / iTotal;
                        //         } else {
                        //             var iResult = (iBill + iOpp) / iTotal;
                        //         }

                        //         var oPercentInstance = NumberFormat.getPercentInstance({
                        //             groupingEnabled: true,
                        //             groupingSeparator: ',',
                        //             groupingSize: 3,
                        //             decimals: 2,
                        //         });

                        //         return (iResult) ? oPercentInstance.format(iResult) : null;
                        //     } catch {
                        //         return null;
                        //     }
                        // }
                    },
                    width: "100%",
                    textAlign: "End",
                    emptyIndicatorMode: "On"
                })

                oColumn.setTemplate(oText);

                oTable.addColumn(oColumn);
            }
        },

        /**
         * 초기 차트 설정
         */
        _setChartProperties: function () {
            // 차트 Property 설정
            let oChart = this.byId("chart1");
            oChart.setVizProperties({
                title: { visible: true, text: 'BR 변화 추이' },
                plotArea: {
                    primaryScale: {
                        autoMinValue: true
                    },
                    window: {
                        start: "firstDataPoint",
                        end: "lastDataPoint"
                    },
                    dataPoint: {
                        invalidity: "ignore"
                    }
                },
                valueAxis: {
                    title: { visible: false },
                    label: {
                        formatString: `#,##0"%"`
                    },
                    axisLine: { size: 4 } // Column 너비
                },
                timeAxis: {
                    levels: ["year", "month"],
                    title: { visible: false },
                },
                legendGroup: {
                    layout: {
                        alignment: 'center',
                        position: 'bottom'
                    }
                }
            });
        },

        /**
         * 차트 구성
         */
        _setChartData: async function () {
            // 검색 조건
            let oSearchData = this.getView().getModel("searchModel").getData();
            let iYear = oSearchData.yearMonth.getFullYear();
            let iMonth = oSearchData.yearMonth.getMonth() + 1;
            let sPath = `/org_labor_br(id='${oSearchData.org_id}',year=${iYear},month=null)/Set`;

            // 데이터 호출
            let oModel = this.getOwnerComponent().getModel("sga");
            let oBinding = oModel.bindList(sPath, undefined, undefined, [
                new Filter({ path: "hdqt_id", operator: FilterOperator.EQ, value1: null }),
                new Filter({ path: "team_id", operator: FilterOperator.EQ, value1: null }),
            ]);

            // 차트 데이터 및 데이터세트 생성
            let aChartData = [];
            let oFlattenedDataset = {
                dimensions: [{ identity: "date", name: "월", dataType: "date", value: "{date}" }],
                measures: [],
                data: { path: '/' }
            };
            let aBindingContexts = await oBinding.requestContexts(0, Infinity);
            aBindingContexts.forEach(function (oContext) {
                let oData = oContext.getObject();

                // 본부, 팀 데이터 생략 (부문 데이터만 사용)
                if (oData.hdqt_id !== null) return;

                for (let i = 1; i <= 12; i++) {
                    // 선택한 월에 따른 BR 계산
                    let iResult;
                    try {
                        if (i <= iMonth) {
                            iResult = oData[`bill_m${i}_amt`] / oData[`total_m${i}_amt`];
                        } else {
                            iResult = (oData[`bill_m${i}_amt`] + oData[`opp_m${i}_amt`]) / oData[`total_m${i}_amt`];
                        }

                        iResult = parseFloat((iResult * 100).toFixed(2));
                    } catch {
                        iResult = null;
                    }

                    // 데이터 설정
                    if (!aChartData[i - 1]) {
                        aChartData[i - 1] = {
                            date: new Date(oData.year, i - 1),
                            [oData.div_id]: iResult
                        };
                    } else {
                        aChartData[i - 1][oData.div_id] = iResult;
                    }

                    // Measures 설정
                    let aMeasures = oFlattenedDataset.measures;
                    if (!aMeasures.find(oMeasure => oMeasure.identity === oData.div_id)) {
                        aMeasures.push({
                            identity: oData.div_id,
                            name: oData.level1,
                            value: `{${oData.div_id}}`
                        })
                    }
                }
            }.bind(this));

            let oChart = this.byId("chart1");
            oChart.setModel(new JSONModel(aChartData));

            // 차트 피드 초기화
            oChart.removeAllFeeds();

            // 데이터세트 설정
            let oDataset = new FlattenedDataset(oFlattenedDataset);
            oChart.setDataset(oDataset);

            // Feed Item 설정
            let oMeasureFeed = new FeedItem({
                uid: "valueAxis",
                type: "Measure",
                values: oFlattenedDataset.measures.map(oDataset => oDataset.identity)
            })
            oChart.addFeed(oMeasureFeed);

            let oDimensionFeed = new FeedItem({
                uid: "timeAxis",
                type: "Dimension",
                values: ["date"]
            })
            oChart.addFeed(oDimensionFeed);

            // Popover 설정
            let oPopOver = new Popover({});
            oPopOver.connect(oChart.getVizUid());
            oPopOver.setFormatString(`#,##"%"`);

            // 툴팁 설정
            // let oTooltip = new VizTooltip({});
            // oTooltip.setFormatString(`#,##"%"`);
            // oTooltip.connect(oChart.getVizUid());

            // 체크박스 생성
            let aCheckBoxData = oFlattenedDataset.measures.map(oDataset => {
                oDataset.selected = true;
                return oDataset;
            })
            this.getView().setModel(new JSONModel(aCheckBoxData), "checkBoxModel");
        },

        /**
         * 체크박스 선택 이벤트
         */
        onCheckBoxSelect: function () {
            let oChart = this.byId("chart1");

            // 피드 삭제 (setValues 메소드가 동작하지 않음)
            let aCheckBoxData = this.getView().getModel("checkBoxModel").getData();
            let oValueFeed = oChart.getFeeds().find(oFeed => oFeed.getUid() === "valueAxis");
            oChart.removeFeed(oValueFeed);

            // 선택한 항목만 피드에 추가
            let aFilteredData = aCheckBoxData.filter(oData => oData.selected === true);
            let oMeasureFeed = new FeedItem({
                uid: "valueAxis",
                type: "Measure",
                values: aFilteredData.map(oData => oData.identity)
            })
            oChart.addFeed(oMeasureFeed);
        },

        /**
         * 테이블 스크롤 이벤트
         * @param {Event} oEvent 
         */
        onFirstVisibleRowChanged: function (oEvent) {
            let oTable = /** @type {sap.ui.table.Table} */ (oEvent.getSource());

            oTable.rerender();
            let aRows = oTable.getRows();
            let iSkipCount1 = 0, iSkipCount2 = 0;
            for (let i = 0; i < aRows.length; i++) {
                let oRow = aRows[i];

                let oBindingContext = oRow.getBindingContext("sga");
                if (!oBindingContext) return;

                let oBindingObject = oBindingContext.getObject();

                // 셀 가로 병합
                let iCount = 0;
                if (oBindingObject["level3"] === oBindingObject["level1"]) {
                    iCount = 0;
                } else if (oBindingObject["level3"] === oBindingObject["level2"]) {
                    iCount = 1;
                } else {
                    iCount = 2;
                }

                for (let i = iCount; i < 3; i++) {
                    let oCell = document.getElementById(`${oRow.getId()}-col${i}`);

                    if (iCount === i) {
                        oCell?.setAttribute?.("colspan", String(3 - iCount));
                    } else {
                        oCell?.remove?.();
                    }
                }

                // 셀 세로 병합
                if (iCount === 0) continue;

                // 부문 (level1)
                if (iSkipCount1 > 0) {
                    let oCell = document.getElementById(`${oRow.getId()}-col0`);
                    oCell?.remove?.();

                    iSkipCount1--;
                } else {
                    let iRowSpan = aRows.filter(oRow => {
                        let oRowBindingContext = oRow.getBindingContext("sga");
                        if (!oRowBindingContext) return;

                        let oRowBindingObject = oRowBindingContext.getObject();
                        return oRowBindingObject["level1"] === oBindingObject["level1"]
                            && oRowBindingObject["level1"] !== oRowBindingObject["level2"]
                    }).length;

                    let oCell = document.getElementById(`${oRow.getId()}-col0`);
                    oCell?.setAttribute?.("rowspan", String(iRowSpan));

                    iSkipCount1 = iRowSpan - 1;
                }

                if (iCount === 1) continue;

                // 본부 (level2)
                if (iSkipCount2 > 0) {
                    let oCell = document.getElementById(`${oRow.getId()}-col1`);
                    oCell?.remove?.();

                    iSkipCount2--;
                } else {
                    let iRowSpan = aRows.filter(oRow => {
                        let oRowBindingContext = oRow.getBindingContext("sga");
                        if (!oRowBindingContext) return;

                        let oRowBindingObject = oRowBindingContext.getObject();
                        return oRowBindingObject["level1"] === oBindingObject["level1"]
                            && oRowBindingObject["level2"] === oBindingObject["level2"]
                            && oRowBindingObject["level2"] !== oRowBindingObject["level3"]
                    }).length;

                    let oCell = document.getElementById(`${oRow.getId()}-col1`);
                    oCell?.setAttribute?.("rowspan", String(iRowSpan));

                    iSkipCount2 = iRowSpan - 1;
                }
            }

            this.getView().setBusy(false);
        },

        /**
         * Example 테이블 조직 검색 체인지 이벤트
         * @param {Event} oEvent 
         */
        onOrgLiveChange: function (oEvent) {
            let oSource = /** @type {sap.m.MultiInput} */ (oEvent.getSource());
            if (oSource.getValue()) oSource.setValue(null);
        },

        /**
         * 조직 검색 토큰 삭제 시
         * @param {Event} oEvent 
         */
        onOrgTokenUpdate: function (oEvent) {
            let oSource = /** @type {sap.m.MultiInput} */ (oEvent.getSource());
            let sType = oEvent.getParameters()["type"];

            // 필드가 필수값일 때
            if (oSource.getFieldGroupIds().includes("Required")) {
                if (oSource.getTokens().length === 0) {
                    oSource.setValueState(coreLib.ValueState.Error);
                } else {
                    oSource.setValueState(coreLib.ValueState.None);
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
         * 검색 및 초기화 버튼 클릭 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag 
         */
        onSearch: async function (oEvent, sFlag) {
            if (sFlag === "Search") {
                // 유효성 검사
                let isValid = this.getView().getControlsByFieldGroupId("Required").filter(function (object) {
                    if (object.getFieldGroupIds().includes("Search")) {
                        if (!object.getDateValue?.() && !object.getTokens?.().length) {
                            object.setValueState("Error");
                            return true;
                        } else {
                            object.setValueState("None");
                        }
                    }
                }.bind(this));

                if (isValid.length > 0) {
                    this._messageBox('warning', '필수 필드값을 확인해주세요.');
                    return;
                };

                // // 테이블 컬럼 설정
                this._setTableColumn();

                // 검색 조건
                let oSearchData = this.getView().getModel("searchModel").getData();
                let iYear = oSearchData.yearMonth.getFullYear();
                let iMonth = oSearchData.yearMonth.getMonth() + 1;
                let sPath = `sga>/org_labor_br(id='${oSearchData.org_id}',year=${iYear},month=${iMonth})/Set`;

                // // 테이블 바인딩
                let oTable = this.byId("table");
                oTable.bindRows({
                    path: sPath,
                    events: {
                        dataRequested: function () {
                            oTable.setBusy(true);
                        }.bind(this),
                        dataReceived: function () {
                            // 초기 테이블 셀 병합 설정
                            oTable.attachEventOnce("rowsUpdated", this.onFirstVisibleRowChanged.bind(this));
                            oTable.setBusy(false);
                        }.bind(this),
                    }
                })

                // 차트 데이터 바인딩
                await this._setChartData();

                oTable.setNoData("데이터가 없습니다.");

                MessageToast.show("테이블을 \n검색하였습니다.");
            } else if (sFlag === "Refresh") {
                MessageToast.show("테이블 검색 조건을 \n초기화 하였습니다.");

                this.getView().getControlsByFieldGroupId("Search").forEach(function (object) {
                    if (object.getFieldGroupIds().length > 0) {
                        object.setDateValue?.(null);
                        object.setValue?.(null);
                        object.setTokens?.([]);
                    };
                }.bind(this));
            };
        },

        /**
         * 매출조직명 Dialog Open
         * @param {Event} oEvent 
         * @param {String} sFlag Department(일반), AddTarget(목표액 추가) 
         */
        onOrgSingleSelectDialogOpen: async function (oEvent, sFlag) {
            let oSource = oEvent.getSource();

            this._oOrgSingleSelectDialog = new OrgSingleSelect({
                fragmentController: this,
                bindingSource: oSource,
            });

            this._oOrgSingleSelectDialog.open();
        },

        /**
         * 검색 조건 변경 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag 
         */
        onChangeSearch: function (oEvent, sFlag) {
            let oSource = oEvent.getSource();

            if (sFlag === "month") {
                let isValidValue1 = oSource.isValidValue();
                let isValidValue2 = oSource.getDateValue();
                if (!isValidValue1 || !isValidValue2) {
                    oEvent.getSource().setValueState("Error");
                    return;
                } else {
                    oEvent.getSource().setValueState("None");
                };
            };
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
    });
});