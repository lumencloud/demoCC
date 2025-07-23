sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "bix/common/library/control/Modules",
    "sap/ui/core/Fragment",
], (Controller, JSONModel, Filter, FilterOperator, Modules, Fragment) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.ui.table.Table} Table
     * @typedef {sap.m.Button} Button
     * @typedef {sap.ui.model.odata.v4.Context} V4Context
     * @typedef {sap.m.DatePicker} DatePicker
     * @typedef {sap.m.ToggleButton} ToggleButton
     * @typedef {sap.m.HBox} HBox
     */
    return Controller.extend("bix.master.batch.controller.Main", {
        /**
         * 초기 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteMain");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * 배치 관리 페이지로 라우팅했을 때
         */
        onMyRoutePatternMatched: async function () {
            // 초기 모델 설정
            await this._setModel();

            // DatePicker 설정 - 최소일자(2025년), 최대일자(현재 연도), 기본값(현재 연도)
            let oDatePicker = this.byId("datePicker");
            oDatePicker.setMinDate(new Date(2025, 0, 1));
            oDatePicker.setMaxDate(new Date());
            oDatePicker.setDateValue(new Date());

            // 첫번째 메뉴 클릭
            await this.byId("headerContainer").getContent()[0].firePress();
        },

        /**
         * 초기 모델 설정
         */
        _setModel: async function () {
            // 초기 searchModel 설정
            this.getView().setModel(new JSONModel({
                ver: null,  // 버전
                success_yn: "all",  // 성공 여부 (테이블 우측 상단)
                category: "month",  // 상단 메뉴 (month, week)
                selectedIndices: false  // 테이블에 선택된 행이 있는지 여부
            }), "searchModel");

            // 상단 카테고리 모델 설정
            this.getView().setModel(new JSONModel([
                { key: "month", text: "월 배치" },
                { key: "week", text: "주간 Pipeline" }
            ]), "categoryModel");

            // Select Model
            this.getView().setModel(new JSONModel([
                { key: "all", name: "전체" },
                { key: true, name: "성공" },
                { key: false, name: "실패" }
            ]), "statusModel");

            // 버전 모델
            this.getView().setModel(new JSONModel([]), "verModel");
        },

        /**
         * 카테고리에 따른 테이블 바인딩
         */
        _bindTable: function () {
            let oSearchModel = this.getView().getModel("searchModel");
            let sCategory = oSearchModel.getProperty("/category");

            const aFilters = [];
            const oTable = this.byId("batchTable");
            if (sCategory === "month") {
                // 검색창 ver 선택 시 검색 조건 추가
                let sVer = oSearchModel.getProperty("/ver");
                if (sVer) {
                    aFilters.push(
                        new Filter("ver", FilterOperator.EQ, sVer),
                    )
                } else {
                    Modules.messageBox('warning', '버전을 입력해주세요.');
                    return;
                }

                // 성공 여부 (전체가 아닐 때 적용)
                let isSuccess = oSearchModel.getProperty("/success_yn");
                if (isSuccess !== "all") {
                    aFilters.push(new Filter("success_yn", FilterOperator.EQ, isSuccess));
                }

                // 테이블 바인딩
                oTable.bindRows({
                    path: "/interface_log_view",
                    filters: aFilters,
                    parameters: {
                        $count: true,
                        $select: "log"
                    },
                    events: {
                        dataRequested: function () {
                            oTable.setBusy(true);
                        }.bind(this),
                        dataReceived: function (oEvent) {
                            oTable.setBusy(false);
                        }.bind(this),
                    },
                });
            } else if (sCategory === "week") {
                // 검색창 ver 선택 시 검색 조건 추가
                let sVer = oSearchModel.getProperty("/ver");
                if (sVer) {
                    aFilters.push(
                        new Filter("ver", FilterOperator.EQ, sVer),
                    )
                } else {
                    aFilters.push(
                        new Filter("ver", FilterOperator.NotContains, "TEST"),
                        new Filter("ver", FilterOperator.NE, null),
                    )
                }

                // 성공 여부 (전체가 아닐 때 적용)
                let isSuccess = oSearchModel.getProperty("/success_yn");
                if (isSuccess !== "all") {
                    aFilters.push(new Filter("success_yn", FilterOperator.EQ, isSuccess));
                }

                // 테이블 바인딩
                oTable.bindRows({
                    path: "/interface_log_view",
                    filters: aFilters,
                    parameters: {
                        $count: true,
                    },
                    events: {
                        dataRequested: function () {
                            console.log()
                            oTable.setBusy(true);
                        }.bind(this),
                        dataReceived: function (oEvent) {
                            oTable.setBusy(false);
                        }.bind(this),
                    },
                });
            }
        },

        /**
         * 조회 버튼 클릭 이벤트
         */
        onSearch: function () {
            this._bindTable();
        },

        /**
         * 성공 여부 Select 변경 이벤트
         */
        onSelectionChange: function (oEvent) {
            this._bindTable();
        },

        /**
         * 기간 변경 이벤트
         * @param {Event} oEvent 
         */
        onDateChange: function (oEvent) {
            // 선택한 연도
            let dValue = /** @type {DatePicker} */ (oEvent.getSource()).getDateValue();
            let sYear = dValue.getFullYear();

            // version에 선택한 연도의 버전만 조회되도록 변경
            this.byId("version").getBinding("items").filter(
                new Filter("ver", FilterOperator.Contains, sYear),
            )

            // version 값 비우기
            this.byId("version").setValue(null);
        },

        /**
         * 상단 카테고리 토글버튼 클릭 이벤트
         * @param {Event} oEvent 
         */
        onTogglePress: async function (oEvent, sFlag) {
            const oPressButton = /** @type {ToggleButton} */ (oEvent.getSource());

            // 선택된 연도(초기는 현재 연도)에 대한 버전만 보이도록 필터링
            let sYear = this.byId("datePicker").getDateValue()?.getFullYear() || new Date().getFullYear();
            this.byId("version").getBinding("items").filter(
                new Filter("ver", FilterOperator.Contains, sYear),
            )

            // 버전 목록 변경
            let oVerContext;
            if (sFlag === "month") {
                let oModel = this.getOwnerComponent().getModel();
                oVerContext = oModel.bindContext("/interface_log_view", null, {
                    $filter: `not contains(ver, 'TEST') and contains(ver, '${sYear}')`,
                    $apply: "groupby((ver))",
                    $orderby: 'ver desc',
                });
            } else if (sFlag === "week") {
                let oModel = this.getOwnerComponent().getModel();
                oVerContext = oModel.bindContext("/version_sfdc", null, {
                    $filter: `not contains(ver_sfdc, 'TEST') and contains(ver_sfdc, '${sYear}')`,
                    $apply: "groupby((ver_sfdc), aggregate(ver_sfdc with min as ver))",
                    $orderby: 'ver desc',
                });
            }

            // verModel 업데이트
            let oVerData = await oVerContext.requestObject();
            this.getView().getModel("verModel").setData(oVerData.value);

            // 테이블 행 선택 해제
            let oTable = this.byId("batchTable");
            oTable.clearSelection();

            // searchModel 설정
            this.getView().getModel("searchModel").setProperty("/ver", oVerData.value?.[0].ver);    // 첫 번째 항목 고정
            this.getView().getModel("searchModel").setProperty("/category", sFlag);
            this.getView().getModel("searchModel").setProperty("/selectedIndices", false);
            this.getView().getModel("searchModel").setProperty("/success_yn", "all");

            // 테이블 바인딩 실행
            this._bindTable();
        },

        /**
         * 확인 버튼 클릭 이벤트
         * @param {Event} oEvent 
         */
        onConfirm: function (oEvent) {
            // interface_chek에 confirm_yn을 true로 post
            let oButton = /** @type {Button} */ (oEvent.getSource());
            let oBindingContext = /** @type {V4Context} */ (oButton.getBindingContext());
            let oBindingObject = oBindingContext.getObject();

            // 데이터 생성
            let oModel = this.getOwnerComponent().getModel();
            let oBinding = oModel.bindList("/interface_check", null, null, null, {
                $$updateGroupId: "confirm"
            });

            // Post할 컨텍스트
            oBinding.create({
                ver: oBindingObject["ver"],
                uuid: oBindingObject["uuid"],
                if_step: oBindingObject["if_step"],
                source: oBindingObject["source"],
                table_name: oBindingObject["table_name"],
                confirm_yn: true,
            })

            oModel.submitBatch("confirm").then((oEvent) => {
                oModel.refresh();
            }
            )
        },

        /**
         * 테이블 행 선택 이벤트
         * @param {Event} oEvent 
         */
        onRowSelectionChange:  function (oEvent) {
            let oTable = /** @type {Table} */ (oEvent.getSource());
            let aSelectedIndices = oTable.getSelectedIndices();


            // 테이블 행 선택이 1개 이상일 때 테이블 툴바 버튼 활성화
            let oSelectModel = this.getView().getModel("searchModel");
            oSelectModel.setProperty("/selectedIndices", (aSelectedIndices.length > 0));
        },
        checkLog: async function (oEvent) {
            //마지막 선택된 인덱스 
            const oButton = oEvent.getSource()
            const oContext = oButton.getBindingContext();
            const oData = oContext.getObject();


            //실패한 경우에만 플라그먼트 오픈
            if (!oData.success_yn) {
                if (!this._pLogDialog) {
                    this._pLogDialog = await Fragment.load({
                        id: this.getView().getId(),
                        name: "bix.master.batch.view.fragment.log",
                        controller: this
                    })
                    this.getView().addDependent(this._pLogDialog);

                }

                this._pLogDialog.setModel(new JSONModel(oData), "log");
                this._pLogDialog.open();
            }


        },


        isLogVisible : function(log){
            return log!=null;
        },

        onLogDialogClose: function () {
            this._pLogDialog.close();
        },

        /**
         * 신규 배치 실행 버튼 클릭 이벤트
         */
        onExecuteNewBatch: async function () {
            let oSearchModel = this.getView().getModel("searchModel");
            let sCategory = oSearchModel.getProperty("/category");

            let oIfModel = this.getOwnerComponent().getModel("if");
            // let oModel = this.getOwnerComponent().getModel();

            let sFunctionName;
            if (sCategory === "month") {
                sFunctionName = "execute_batch";
            } else if (sCategory === "week") {
                sFunctionName = "execute_pipeline_batch";
            }

            await new Promise((resolve, reject) => {
                oIfModel.callFunction(`/${sFunctionName}`, {
                    method: "GET",
                    // urlParameters: {
                    //     ver: true,
                    // },
                    success: function (oResult) {
                        console.log(oResult);
                        resolve();
                    },
                    error: function (oError) {
                        console.error(oError);
                        reject();
                    }
                })
            })
        },

        /**
         * 신규 배치 실행 버튼 클릭 이벤트
         */
        onExecuteReBatch: async function (oEvent) {
            let oTable = this.byId("batchTable");
            let aSelectedIndices = oTable.getSelectedIndices();
            let oIfModel = this.getOwnerComponent().getModel("v4if");
            let oV2Model = this.getOwnerComponent().getModel("v2");

            // 요청 모아서 보내기
            let aBatchList = [];
            aSelectedIndices.forEach(async (index) => {
                let oContext = oTable.getContextByIndex(index);
                let oBindingObject = oContext.getObject();

                // 같은 데이터가 이미 존재하는지 확인
                let isCheck = aBatchList.find(oData => {
                    return oData.if_step === oBindingObject.if_step
                        && oData.source === oBindingObject.source
                        && oData.table_name === oBindingObject.table_name;
                });

                // 같은 데이터가 없을 때만 push
                if (!isCheck) {
                    aBatchList.push({
                        if_step: oBindingObject.if_step,
                        source: oBindingObject.source,
                        table_name: oBindingObject.table_name,
                    })
                }
            });


            return

            // ajax 로 batch_list 를 post 전송
            $.ajax({
                url: "/odata/v4/interface/execute_batch_renew",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({
                    batch_list: aBatchList
                }),
                success: function (data) {
                    console.log("success", data)
                },
                error: function (xhr, status, error) {
                    console.log("에러 ", status, xhr)
                }
            })


            // const oBinding =  oIfModel.bindContext(`/execute_batch_renew(...)`);
            // oBinding.setParameter("batch_list",aBatchList);
            // await oBinding.execute();






            // new Promise((resolve, reject) => {
            //     let oContext = oIfModel.bindContext(`/execute_batch_renew`, null, {
            //         parameters: {
            //             batch_list: aBatchList
            //         }
            //     });
            //     // oContext.invoke();
            //     oContext.execute();
            // })
        },
    });
});