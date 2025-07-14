sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "bix/common/library/customDialog/OrgSingleSelect",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/Fragment",
    "../../../main/util/Module",
    "sap/ui/table/Column",
    "sap/m/Label",
    "sap/m/Text",
], (Controller, JSONModel, MessageBox, MessageToast, OrgSingleSelect, NumberFormat, Fragment, Module, Column, Label, Text) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     */
    return Controller.extend("bix.sga.labor.controller.BillingRate", {
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
                    object.setValue?.(null);        //searchField data 비우기
                    object.setValueState("None");   //searchField 에러스타일 reset

                }
            }.bind(this));



            //component에서 yearMonth 값을 가져옴
            const oInitYearMonth = this.getOwnerComponent().getModel("initYearMonth").getData();


            // 초기 모델 설정
            
            let dNow = new Date();
            this.getView().setModel(new JSONModel({
                yearMonth: oInitYearMonth.yearMonth, // 검색 칸의 월일 지정(현재 연도, 현재 월의 전 달)
                category: "인력추정",                                             // 툴바의 토글 버튼에 따른 table visible 처리 
                isSearchAble: true,                                              // 검색 칸의 매출조직명이 해당하는 데이터가 없을 때 검색을 막게 하기 위한 속성
            }), "searchModel");

            // 년월의 최소, 최댓값 설정
            this.byId("searchMonthYear").setMinDate(new Date(2024, 0, 1));
            this.byId("searchMonthYear").setMaxDate(new Date(dNow.getFullYear(), dNow.getMonth() - 1, 1));

            //테이블 리스트
            let aTableList = ["table", "table2"];
            aTableList.forEach(
                function (sTableId) {
                    let oTable = this.byId(sTableId);
                    // 테이블 스크롤 초기 설정 (수직, 수평)
                    let oVerticalScroll = oTable._getScrollExtension().getVerticalScrollbar();
                    oVerticalScroll?.scrollTo(0, 0);

                    let oHorizontalScroll = oTable._getScrollExtension().getHorizontalScrollbar();
                    oHorizontalScroll?.scrollTo(0, 0);

                    // 테이블에 데이터가 없을 경우 띄우는 텍스트
                    oTable.setNoData("검색 조건 입력 후 검색해주세요.");
                }.bind(this)
            )
            // 추정치의 테이블 컬럼 설정
            this._setTableColumn();
        },

        /**
         * 검색 및 초기화 버튼 클릭 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag 
         */
        onSearch: async function (oEvent, sFlag) {
            if (sFlag === "Search") {
                // 유효성 검사
                let isValid = this.getView().getControlsByFieldGroupId("Required").filter(
                    function (object) {
                        // 검색에 해당하는 칸이 있을 경우
                        if (object.getFieldGroupIds().includes("Search")) {
                            // 검색에 해당하는 칸에 데이터가 없을 경우
                            if (!object.getDateValue?.() && !object.getValue?.().length) {
                                // 검색 칸에 에러 셋팅
                                object.setValueState("Error");
                                // 메시지 박스 호출용 isValid 값 돌려주기
                                return true;
                                // 검색에 해당하는 칸에 데이터가 둘 다 있을 경우                                         
                            } else {
                                // 검색에서 매출 조직명에 적절한 데이터일 경우
                                if (this.getView().getModel("searchModel").getData().isSearchAble) {
                                    // 매출 조직명 칸 에러 해제
                                    object.setValueState("None");
                                    // 매출 조직명에 부적절한 데이터일 경우
                                } else {
                                    // 메시지 박스 호출용 isValid 값 돌려주기                                                                
                                    return true;
                                }
                            }
                        }
                    }.bind(this));

                // 검색칸에 데이터가 부족하던가 부적절할 경우 메시지 박스 호출
                if (isValid.length > 0) {
                    MessageBox['warning']("필수 필드값을 확인해주세요.", {
                        title: "경고",
                    })
                    return;
                };

                // set Busy 설정
                let oTable = this.byId("table")
                let oTable2 = this.byId("table2")
                oTable.setBusy(true)
                oTable2.setBusy(true)

                // 검색 조건
                let oSearchData = this.getView().getModel("searchModel").getData();
                // ex) 2025
                let iYear = oSearchData.yearMonth.getFullYear();
                // ex) 05
                let iMonth = String(oSearchData.yearMonth.getMonth() + 1).padStart(2, "0");

                // manifest의 pl Model : ../../odata/v4/pl_api/
                let oModel = this.getOwnerComponent().getModel("pl")
                // 인력추정 path
                let sPath = `/get_forecast_br(org_id='${oSearchData.orgId}',year='${iYear}',month='${iMonth}')`
                // 추정치 path
                let sDetailPath = `/get_forecast_br_detail(org_id='${oSearchData.orgId}',year='${iYear}',month='${iMonth}')`

                await Promise.all([
                    oModel.bindContext(sPath).requestObject(),
                    oModel.bindContext(sDetailPath).requestObject()
                ]).then(
                    function (aResults) {
                        //테이블의 열과 행을 병합하는 Module.setTableMerge를 사용하기 위해서 직접 바인딩이 아닌 모델 바인딩 채택
                        this.getView().setModel(new JSONModel(aResults[0].value), "brTableModel")
                        this.getView().setModel(new JSONModel(aResults[1].value), "detailTableModel")

                        //table 컬럼 중에 검색 조건에 따라 visible 처리용 모델
                        let tableVisibleModel = {
                            hdqt: true,     // 부문 칸
                            div: true,      // 본부 칸
                            team: true,     // 조직 칸
                        }

                        //get_forcast_br의 데이터 첫번째에 들어오는 값에 따라 분기 설정
                        //검색 id와 데이터의 어떤 id가 같은지에 따라 visible 처리 분기
                        if (aResults[0].value[1]) {
                            // 검색 조건 중에 팀 검색을 진행할 경우 value 는 1개이므로 팀 대상아닌 다른 검색 대상 지정 할 경우
                            // 소계 데이터가 가장 먼저 들어가므로, value[1]로 데이터 정리
                            if (oSearchData.orgId === aResults[0].value[1].hdqt_id) {
                                tableVisibleModel.div = false
                                tableVisibleModel.hdqt = true
                                tableVisibleModel.team = true
                            } else if (oSearchData.orgId === aResults[0].value[1].div_id) {
                                tableVisibleModel.div = true
                                tableVisibleModel.hdqt = true
                                tableVisibleModel.team = true
                            }
                            // 팀대상 검색은 소계 데이터가 없으므로 첫번째 데이터 사용
                        } else if (aResults[0].value[0]) {
                            if (oSearchData.orgId === aResults[0].value[0].team_id) {
                                tableVisibleModel.div = false
                                tableVisibleModel.hdqt = false
                                tableVisibleModel.team = true
                            }
                        }

                        // 테이블 ui용 모델 바인딩 : 열의 visible 처리 관련
                        this.getView().setModel(new JSONModel(
                            tableVisibleModel
                        ), "tableVisibleModel")

                        // 열에 visible 속성의 true 갯수에 따라서 병합 열 갯수 변동
                        // visible로 2개의 열이 안보이게 될경우 setTableMerge의 컬럼 병합 갯수 지정에 변동을 대처하기 위해 사용
                        let iMergeCount = Object.values(tableVisibleModel).filter(data => data).length

                        Module.setTableMerge(oTable, "brTableModel", iMergeCount);
                        Module.setTableMerge(oTable2, "detailTableModel", iMergeCount);

                        // 검색을 진행할 경우 연월에 따라 추정치 테이블 컬럼 변경
                        this._setTableColumn();

                        // table setBusy 해제
                        oTable.setBusy(false)
                        oTable2.setBusy(false)

                    }.bind(this)
                )
                MessageToast.show("검색이 완료되었습니다.");

            } else if (sFlag === "Refresh") {
                // 초기화 버튼 실행
                MessageToast.show("검색조건이 초기화되었습니다.");

                this.getView().getControlsByFieldGroupId("Search").forEach(
                    function (object) {
                        if (object.getFieldGroupIds().length > 0) {
                            object.setDateValue?.(null);    //년월 초기화
                            object.setValue?.(null);        //매출조직명 초기화
                            object.setValueState("None");   //searchField 에러스타일 reset
                        };
                    }.bind(this)
                );
            };
        },

        /**
         * 매출조직명 Dialog Open
         * @param {Event} oEvent 
         * @param {String} sFlag
         */
        onOrgSingleSelectDialogOpen: async function (oEvent, sFlag) {
            //해당 칸에 바인딩되어있는 데이터를 fragment에 전달하기 위한 source
            let oSource = oEvent.getSource();
            // fragment setting
            this._oOrgSingleSelectDialog = new OrgSingleSelect({
                fragmentController: this,
                bindingSource: oSource,
            });

            // fragment open
            this._oOrgSingleSelectDialog.open();
        },

        /**
         * 검색 조건 변경 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag //
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
            } else if (sFlag === "org") {

                let oSource = oEvent.getSource();
                let sValue = oEvent.getParameters()["value"];
                let aItems = oSource.getSuggestionItems();
                let isValid = aItems.find(oItem => oItem.getText() === sValue);
                let oSearchData = this.getView().getModel("searchModel").getData();

                // 조직 데이터 중 입력한 조직 유효성 검사
                if (!isValid) {
                    oSource.setValueState("Error");
                    oSearchData.isSearchAble = false
                } else {
                    oSource.setValueState("None");

                    oSearchData.orgId = isValid.getProperty("key")
                    oSearchData.isSearchAble = true

                }

            }
        },

        /**
         * BillingRateDetailFragment 닫기 버튼
         */
        onBillingRateDetailDialogButton: function () {
            this._oBillingRateDetailDialog.close();
            let oTable = this.byId("table")
            let oTable2 = this.byId("table2")
            oTable.setBusy(false)
            oTable2.setBusy(false)
        },


        /**
         * 위의 카테고리 토글버튼에 따른 검색
         * @param {Event} oEvent 
         */
        onTogglePress: function (oEvent) {
            const oPressButton = oEvent.getSource();        // 버튼 객체
            const oToolbar = oPressButton.getParent();      // 버튼의 부모인 툴바 객체
            const sPressedKey = oPressButton.getText();     // 버튼의 text

            //선택된버튼을 제외하고는 pressed false로 변경
            oToolbar.getContent().forEach(function (oControl) {
                if (oControl) {
                    const sKey = oControl.getText();
                    oControl.setPressed(sKey === sPressedKey)
                }
            })
            // table의 visible 처리를 위한 데이터 업데이트
            let oSearchModel = this.getView().getModel("searchModel");
            oSearchModel.setProperty("/category", sPressedKey);

            // visible 해제 될때(리렌더링시) 테이블의 cell 병합이 풀리므로,
            // 버튼 누를시 검색 키를 실행시켜 병합 지키기
            if (!!oSearchModel.getData().orgId) {
                this.byId("btnSearch").firePress()
            }
        },

        /**
         * 
         * @param {any} iValue 
         * @param {any} iValue2 
         * @param {String} sType 
         * @param {String} sType2 
         * @returns 
         */
        onFormatPerformance: function (iValue, iValue2, sType, sType2) {
            // 값이 없을 경우 indicator
            if(!iValue){return;}

            // 계산 필요할시 작동
            if (sType2 === "GAP") {
                iValue = iValue - iValue2
            }

            // 억단위로 들어오는 데이터 사용
            //  => 이 다음에 매출, 마진, billion에서 일반에서 억단위로 변환하므로
            //      억단위에서 일반으로 변환
            if (sType2 === "Billion") {
                if (sType !== "tooltip") {
                    iValue = iValue * 100000000
                }
            }

            if (sType === "마진율" || sType === "percent") {
                // 단위 조정(% 사용 소숫점 2번째까지 사용)

                var oNumberFormat = NumberFormat.getPercentInstance({
                    groupingSeparator: ',',
                    decimals: 2
                });
                return oNumberFormat.format(iValue);
            } else if (sType === "percent_goal") {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });
                return oNumberFormat.format(iValue) + "%";
            } else if (sType === "tooltip") {
                //들어온 데이터 그대로

                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iValue);
            } else if (sType === "매출" || sType === "마진" || sType === "billion") {
                // 일반 => 억단위

                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2
                });
                return oNumberFormat.format(iValue / 100000000);
            } else {
                // 데이터에 단위 구분점
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2
                });
                return oNumberFormat.format(iValue);
            };
        },

        /**
         * 인력추정 상세 데이터 팝업 관련
         * @param {Event} oEvent 
         */
        onBillingRateDetailDialogOpen: async function (oEvent) {
            let oTable = this.byId("table")
            let oTable2 = this.byId("table2")
            oTable.setBusy(true)
            oTable2.setBusy(true)

            // 선택된 열의 데이터 객체 추출
            let oBindingObject = oEvent.getParameters().rowBindingContext.getObject()

            // this._oOrgSingleSelectDialog가 없을 때 호출
            if (!this._oBillingRateDetailDialog) {
                
                // fragment위치를 위해 컨트롤러의 compent 주소 추출
                let sComponentName = this.getOwnerComponent().getMetadata().getComponentName();

                // fragment 정보 셋팅
                await this.loadFragment({
                    id: "billingRateDetailDialog",
                    name: `${sComponentName}.view.fragment.BillingRateDetail`,
                    controller: this,
                }).then(function (oDialog) {
                    // fragment 전역변수에 저장
                    this._oBillingRateDetailDialog = oDialog;
                    // Title 설정
                    oDialog.attachBeforeOpen(function () {
                        // fragment의 타이틀 요소 아이디로 찾기
                        let oTitle = this.byId(Fragment.createId("billingRateDetailDialog", "title"));

                        // 선택된 열의 team_name을 fragment 타이틀에 셋팅
                        oTitle.setText(oBindingObject.team_name);

                        // dialog size setting
                        oDialog.setContentWidth('70rem')
                        oDialog.setContentHeight('auto')
                    }.bind(this));
                }.bind(this));

            } else {
                let oDialog = this._oBillingRateDetailDialog // Title 설정
                oDialog.attachBeforeOpen(function () {
                    let oTitle = this.byId(Fragment.createId("billingRateDetailDialog", "title"));
                    oTitle.setText(oBindingObject.team_name);
                }.bind(this));
            }
            let oSearchData = this.getView().getModel("searchModel").getData()
            let oModel = this.getOwnerComponent().getModel("pl")
            let sPath = `/get_forecast_opp_br(ccorg_cd='${oBindingObject.ccorg_cd}',year='${oSearchData.yearMonth.getFullYear()}')`
            let aResult = await oModel.bindContext(sPath).requestObject()


            this._oBillingRateDetailDialog.setModel(new JSONModel(aResult.value), "detailModel");
            this._oBillingRateDetailDialog.open();
        },

        /**
         * 테이블 열 구성
         */
        _setTableColumn: function () {
            let oTable = this.byId("table2");

            //컬럼 초기화
            oTable.removeAllColumns();

            // 부문, 본부, 조직 열 추가
            let aOrgs = ["부문", "본부", "조직"];
            let aOrgNames = ['div_name', 'hdqt_name', 'team_name']
            let aOrg = ['div', 'hdqt', 'team']

            for (let i = 1; i <= aOrgs.length; i++) {
                // 컬럼 설정
                let oColumn = new Column({
                    hAlign: "Center",
                    width: "12rem",
                    autoResizable: false,
                    visible: `{tableVisibleModel>/${aOrg[i - 1]}}`
                });

                // 라벨 추가
                let oLabel1 = new Label({
                    text: aOrgs[i - 1],
                    wrapping: false,
                });

                let oLabel2 = new Label({
                    text: null
                });

                //멀티헤더 셋팅
                oColumn.addMultiLabel(oLabel1);
                oColumn.addMultiLabel(oLabel2);

                // 템플릿 추가
                let oText = new Text({
                    text: `{detailTableModel>${aOrgNames[i - 1]}}`,
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
                    width: "5rem",
                    autoResizable: true,
                    headerSpan: (i <= iSelectedMonth) ? iSelectedMonth : (12 - iSelectedMonth)  //기준 월(현재 월)에 따라 열 병합 변경
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
                            { path: `detailTableModel>m_${i}_data`, targetType: 'any' }
                        ],
                        formatter: function (iValue) {
                            if (iValue > 100) {
                                iValue = 100
                            }
                            var oNumberFormat = NumberFormat.getPercentInstance({
                                groupingSeparator: ',',
                                decimals: 2
                            });
                            return oNumberFormat.format(iValue);
                        }
                    },
                    tooltip: {
                        parts: [{ path: `detailTableModel>m_${i}_data`, targetType: 'any' }],
                        formatter: function (iValue) {
                            return String(iValue) + "%";
                        }
                    },
                    wrapping: false,
                    width: "100%",
                    textAlign: "End",
                    emptyIndicatorMode: "Auto",
                })

                oColumn.setTemplate(oText);
                oTable.addColumn(oColumn);

            }
        },



    });
});