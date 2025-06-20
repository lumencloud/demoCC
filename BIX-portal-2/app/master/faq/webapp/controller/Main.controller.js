sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "bix/common/library/control/Modules",
    "sap/ui/model/Sorter",
    "sap/m/MessageToast",
], (Controller, JSONModel, Filter, FilterOperator,Modules,Sorter,MessageToast) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Input} Input
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     */
    return Controller.extend("bix.master.faq.controller.Main", {
        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("Main");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: async function () {

            // 검색창 초기화
            this.getView().setModel(new JSONModel(), "searchModel");

            // UI Table 스크롤 초기화 테이블 바인딩
            this._bindTable();

        },

        /**
         * 테이블 스크롤 초기화
         */
        _bindTable: function () {
            let ofaqTable = this.byId("faqTable");
            ofaqTable.setFirstVisibleRow(0);

            //테이블 초기화 바인딩
            this.onSearch(null, "start")
        },

        /**
         * 검색창 검색 이벤트
         * @param {Event} oEvent 
         */
        onSearch: function (oEvent, sFlag) {
            let oSearchData = this.getView().getModel("searchModel").getData();
            let ofaqTable = this.byId("faqTable");
            let aFilters = [];

            //검색 선택시 
            if (sFlag === "search") { //필터 추가 
                if (oSearchData.title) {
                    aFilters.push(
                        new Filter({
                            path: "title",
                            operator: FilterOperator.Contains,
                            value1: oSearchData.title,
                            caseSensitive: false,
                        })
                    )
                }
                // category
                //53875de0-2830-4976-a1ef-10e07a36919c 는 전체 선택의  category ID
                if (oSearchData.category && oSearchData.category !== "53875de0-2830-4976-a1ef-10e07a36919c") {
                    aFilters.push(
                        new Filter("category_ID", FilterOperator.EQ, oSearchData.category)
                    );
                }
            }else {//초기화 혹은 시작시

                 //53875de0-2830-4976-a1ef-10e07a36919c 는 전체 선택의  category ID
                this.byId("category").setSelectedKey("53875de0-2830-4976-a1ef-10e07a36919c");
                this.getView().setModel(new JSONModel(), "searchModel");
            }

            //삭제 유무 기본적으로 체크
            aFilters.push(
                new Filter("delete_yn", FilterOperator.NE, true),
                new Filter("use_yn", FilterOperator.NE, false)
            )


            // 테이블 바인딩
            ofaqTable.bindRows({
                path: "/faqHeaderView",
                filters: aFilters,
                //createdAt 기준으로 sort
                sorter: new Sorter("createdAt",true),
                parameters: {
                    $count: true
                },
                events: {
                    dataRequested: function () {
                        ofaqTable.setBusy(true);
                    }.bind(this),
                    dataReceived: function (oEvent) {
                        // Account Table Title 설정 count 
                        let oHeaderContext = oEvent.getSource().getHeaderContext();
                        this.byId("faqTitle").setBindingContext(oHeaderContext);

                        if (sFlag === "search") { //검색 성공 메세지
                            MessageToast.show("검색이 완료되었습니다.")
                        } else if (sFlag === "refresh") { //초기화 버튼시 메세지
                            MessageToast.show("검색조건이 초기화되었습니다.")
                        }
                        ofaqTable.setBusy(false);
                    }.bind(this),
                },
            })
            
            //스크롤 상단으로 초기화
            let oScroll = ofaqTable._getScrollExtension().getVerticalScrollbar();
            oScroll?.scrollTo(0, 0);
        },

        /**
         * 페이지 이동
         * @param {Event} oEvent 
         * @param {String} sFlag create: 생성, detail: 상세
         */
        onNavigate: function (oEvent, sFlag) {
            if (sFlag === "create") {   // 생성
                this.getOwnerComponent().getRouter().navTo("Create");
            } else if (sFlag === "detail") {    // 상세
                let oContext = oEvent.getParameters()["rowContext"];
                let sId = oContext.getObject("ID");
                this.getOwnerComponent().getRouter().navTo("Detail", { id: sId });
            }
        },


    });
});