sap.ui.define([
    "sap/m/library",
    "sap/ui/core/library",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "bix/common/library/control/Modules",
    "sap/ui/core/EventBus",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (
        mLibrary,
        coreLibrary,
        Controller,
        JSONModel,
        Modules,
        EventBus,
        Filter,
        FilterOperator
    ) {
        "use strict";

        return Controller.extend("bix.ai.list.controller.MainMonthly", {
            _oEventBus: EventBus.getInstance(),
            onInit: function () {
                this._iCardReady = 0;
                const myRoute = this.getOwnerComponent().getRouter().getRoute("MainMonthly");
                myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
            },

            onMyRoutePatternMatched: async function (oEvent) {
                const oCarousel = this.byId("carousel");
                if (oCarousel) {
                    oCarousel.setActivePage(oCarousel.getPages()[0]);
                }
                let oToday = new Date();
                let sYear = oToday.getFullYear();
                let sMonth = String(oToday.getMonth()).padStart(2, "0");
                // this._setLoadView();
                await this._setModel();

                const oData = this.getView().getModel("topOrgModel").getData();
                this._setSessionItem(oData, sYear, sMonth);

                this._oEventBus.subscribe("aiReport", "newMonthData", this._setChartHeaderModel, this)
                this._oEventBus.subscribe("aiReport", "deselMonthData", this._setChartHeaderModel, this)
                this._oEventBus.subscribe("aiReport", "negoMonthData", this._setChartHeaderModel, this)
                this._oEventBus.subscribe("aiReport", "comMonthData", this._setChartHeaderModel, this)
                this._oEventBus.subscribe("CardChannel", "CardFullLoad", this._onCardReady, this)
            },

            _onCardReady: function () {
                this._iCardReady++;
                if (this._iCardReady === this.iCardCount) {
                    this.byId("pdfDownload").setEnabled(true);
                }
            },
            _loadedCardAllCheck: function () {
                let iCardCount = 0;
                const viewId = this.byId("selectType").getSelectedKey() || "ax";
                const aCard = this.byId(viewId).findAggregatedObjects(true, function (oControl) {
                    return oControl.isA("sap.ui.integration.widgets.Card");
                });
                aCard.forEach(oCard => {
                    iCardCount++;
                })
                this.iCardCount = iCardCount;
            },
            /**
             *  View NavContainer 카드 분할 로딩을 위한 동적 view 생성
             */
            _setLoadView: function (sId, sViewName) {
                const navId = this.byId("navCon");
                this.getOwnerComponent().getRouter().navTo("AllMonthly");
                // if (!this._loadView) {
                //     this._loadView = sap.ui.core.mvc.XMLView.create({
                //         id: "ax",
                //         viewName: "bix.ai.list.view.AllMonthly",
                //         controller: new sap.ui.core.mvc.Controller("bix.ai.list.controller.AllMonthly")
                //     }).then(oView => {
                //         navId.addPage(oView);
                //         navId.to(oView.getId())
                //     })
                // } else {
                // sPageId =
                //     sPageName = 
                // }
            },

            onAfterRendering: function (oEvent) {
                this._loadedCardAllCheck();

            },
            /**
             * 각 카드에 사용할 세션값 저장
             * @param {*} oData  조직 데이터
             * @param {*} year 
             * @param {*} month 
             */
            _setSessionItem: function (oData, year, month) {
                sessionStorage.setItem("aiReport", JSON.stringify({
                    orgId: oData.org_id,
                    type: oData.org_tp,
                    title: oData.org_name,
                    year: year,
                    month: month,
                }));
                this._oEventBus.publish("aireport", "infoSet");
            },

            /**
             *  초기 Model 설정
             */
            _setModel: async function () {
                let oToday = new Date();
                let oLastMonth = new Date(oToday.getFullYear(), oToday.getMonth() - 1, 1)
                this.byId("datePicker").setMaxDate(oLastMonth);

                // 날짜, AI리포트 타입 선택 모델
                this.getView().setModel(new JSONModel({ date: oLastMonth, month: oToday.getMonth(),/** select 제어 플래그 */ bFlag: false }), "ui");

                await this._setTopOrgModel();

                // 셀렉트 초기 세팅
                this.byId("selectType").setSelectedKey("/value", "ax")
            },

            /**
             * 전사, Cloud 부문, Account, Delivery Select
             * @param {*} oEvent 
             */
            onSelectTypeChange: function (oEvent) {
                const oTopOrgData = this.getView().getModel("topOrgModel").getData();

                const oData = { org_id: oTopOrgData.org_id, org_tp: oTopOrgData.org_tp, org_name: oTopOrgData.org_name };
                const oAccountData = { org_id: oTopOrgData.org_id, org_tp: 'account', org_name: oTopOrgData.org_name };
                const oCloudData = { org_id: '6193', org_tp: '', org_name: 'Cloud 부문' };

                const oDateData = this.getView().getModel("ui").getData();
                const iYear = oDateData.date.getFullYear();
                const sMonth = String(oDateData.date.getMonth() + 1).padStart(2, "0");

                let navCon = this.byId("navCon");
                let sPageId = oEvent.getParameter("selectedItem").getKey();
                let oPage = this.byId(sPageId);

                if (oPage) {
                    let bFlag = sPageId === 'account' || sPageId === 'delivery' ? true : false;
                    this.getView().getModel("ui").setProperty("/bFlag", bFlag);

                    switch (sPageId) {
                        case "ax": this._setSessionItem(oData, iYear, sMonth);
                            break;
                        case "cloud": this._setSessionItem(oCloudData, iYear, sMonth);
                            break;
                        case "account": this._setSelectModel(sPageId);
                            this._setSessionItem(oAccountData, iYear, sMonth);
                            break;
                        case "delivery": this._setSelectModel(sPageId);
                            this._setSessionItem(oData, iYear, sMonth);
                            break;
                    }
                    // this._oEventBus.subscribe("CardChannel", "CardFullLoad", this._onCardReady, this)
                    // this._iCardReady = 0;

                    // this._loadedCardAllCheck();
                    // this.byId("pdfDownload").setEnabled(false);
                    const sSelectedKey = this.byId("selectType").getSelectedKey()
                    const sSelectedView = this.byId(sSelectedKey);
                    const oCarousel = sSelectedView.byId("carousel");
                    const sFirstPageId = oCarousel.getPages()[0].getId()
                    // select 선택 시 첫페이지로 이동
                    oCarousel.setActivePage(sFirstPageId);
                    navCon.to(oPage); // container page 이동
                }
            },

            /**
             * 최상위 조직 값 모델 설정
             */
            _setTopOrgModel: async function () {
                const andFilter = new Filter([
                    new Filter("org_id", FilterOperator.NE, null),
                    new Filter("org_parent", FilterOperator.EQ, null),
                ], true)

                // 전사조직 모델 세팅
                const oModel = this.getOwnerComponent().getModel();
                const oBinding = oModel.bindList("/org_full_level", undefined, undefined, andFilter)
                await oBinding.requestContexts().then((aContext) => {
                    const aData = aContext.map(ctx => ctx.getObject());
                    this.getView().setModel(new JSONModel(aData[0]), "topOrgModel");

                })
            },
            /**
             * Account , Delivery 부문 선택 select model 설정
             * @param {*} type  'account', 'delivery'
             * @returns 
             */
            _setSelectModel: async function (type) {
                // account 별 부문 필터링
                function getAccountFilter() {
                    const andFilter = new Filter([
                        new Filter("org_tp", FilterOperator.EQ, "account"),
                        new Filter("org_level", FilterOperator.EQ, "div"),
                    ], true) // true : And 조건

                    const ccorgFilter = new Filter("org_ccorg_cd", FilterOperator.EQ, "237100");
                    const lv1Filter = new Filter("org_level", FilterOperator.EQ, "lv1");
                    const notCCOFilter = new Filter("org_name", FilterOperator.NE, "CCO");

                    const orFilter = new Filter([
                        andFilter,
                        ccorgFilter,
                        lv1Filter
                    ], false)// false : OR 조건

                    return new Filter([
                        orFilter,
                        notCCOFilter
                    ], true)
                }
                // delivery 별 부문 필터링
                function getDeliveryFilter() {
                    const andFilter = new Filter([
                        new Filter("org_tp", FilterOperator.EQ, "delivery"),
                        new Filter("org_level", FilterOperator.EQ, "div")
                    ], true) // true : And 조건
                    const lv1Filter = new Filter("org_level", FilterOperator.EQ, "lv1");

                    return new Filter([
                        andFilter,
                        lv1Filter
                    ], false) // false : OR 조건
                }

                let finalFilter; // 최종 필터 변수
                if (type === 'account') {
                    finalFilter = getAccountFilter();
                } else if (type === 'delivery') {
                    finalFilter = getDeliveryFilter();
                } else {
                    return;
                }
                const oModel = this.getOwnerComponent().getModel();
                const oBinding = oModel.bindList("/org_full_level", undefined, undefined, finalFilter)
                await oBinding.requestContexts().then((aContext) => {
                    const oData = aContext.map(ctx => ctx.getObject());
                    this.getView().setModel(new JSONModel(oData), "selectModel");
                })
            },

            /**
             * Account Or Delivery 선택 시 부문 조직 선택 Select
             * @param {*} oEvent 
             */
            onSelectChange: function (oEvent) {
                const oData = this.getView().getModel("selectModel").getData();
                const sSelectedKey = oEvent.getParameter("selectedItem").getProperty("key");
                const oSelectData = oData.filter(o => o.org_id === sSelectedKey)
                const oSelectedDate = this.getView().getModel("ui").getData();

                const iYear = oSelectedDate.date.getFullYear()
                const sMonth = String(oSelectedDate.date.getMonth() + 1).padStart(2, "0")

                //세션 스토리지 업데이트
                this._setSessionItem(oSelectData[0], iYear, sMonth)

                this.getView().getModel("selectModel").setProperty("/selectedKey", oSelectData[0].org_id);
                this._oEventBus.subscribe("CardChannel", "CardFullLoad", this._onCardReady, this)
            },

            /**
             * DatePicker , Change 이벤트
             * @param {*} oEvent 
             * @returns 
             */
            onDateChange: function (oEvent) {
                let oSource = oEvent.getSource();

                let isValidValue1 = /** @type {sap.m.Input} */ (oSource).isValidValue();
                let isValidValue2 = oSource.getDateValue();
                if (!isValidValue1 || !isValidValue2) {
                    oEvent.getSource().setValueState("Error");
                    return;
                } else {
                    oEvent.getSource().setValueState("None");

                    // 검색 조건 변경 EventBus Publish
                    let oSelectedDate = this.getView().getModel("ui").getData();

                    //세션 스토리지 데이터 가져오기
                    let oSessionData = JSON.parse(sessionStorage.getItem("aiReport"))

                    //세션 스토리지 업데이트
                    sessionStorage.setItem("aiReport", JSON.stringify({
                        orgId: oSessionData.orgId,
                        type: oSessionData.type,
                        title: oSessionData.title,
                        year: oSelectedDate.date.getFullYear(),
                        month: String(oSelectedDate.date.getMonth() + 1).padStart(2, "0"),
                    }));
                    this.getView().getModel("ui").setProperty("/month", oSelectedDate.date.getMonth() + 1)
                    this._oEventBus.publish("aireport", "infoSet");
                };
            },

            /**
             *  PDF 다운로드
             */
            onPDF: async function () {
                const sSelectedKey = this.byId("selectType").getSelectedKey()
                const sSelectedView = this.byId(sSelectedKey);
                const oCarousel = sSelectedView.byId("carousel");

                const oCardGroup = sSelectedView.getControlsByFieldGroupId("cardGroup");
                // widget.Card 인 요소만 필터링
                const oWidgetCard = oCardGroup.filter((oCard) =>
                    oCard.isA("sap.ui.integration.widgets.Card")
                )
                if (oWidgetCard.length > 0) {
                    oWidgetCard.forEach((oCard) => {
                        oCard.setDataMode("Active")
                    })
                } 

                oCarousel.setBusy(true);
                try {
                    const pageId = oCarousel.getPages().map(page => page.getId());

                    let currentPageId = oCarousel.getActivePage();
                    let activeIdx = pageId.indexOf(currentPageId);
                    if (activeIdx === -1) activeIdx = 0;
                    const pdf = new window.jspdf.jsPDF({
                        orientation: "portrait",
                        unit: "mm",
                        format: "a4"
                    })
                    for (let i = 0; i < pageId.length; i++) {
                        oCarousel.setActivePage(pageId[i]);

                        await new Promise(res => setTimeout(res, 100));

                        const currPageDom = sap.ui.getCore().byId(pageId[i]).getDomRef();
                        const canvas = await html2canvas(currPageDom, { scale: 2 })
                        const imgData = canvas.toDataURL("image/png");
                        const imgProps = pdf.getImageProperties(imgData);
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                        if (i > 0) pdf.addPage();
                        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                    }

                    const oSessionData = JSON.parse(sessionStorage.getItem("aiReport"))
                    const sTitle = oSessionData.title;
                    const iYear = oSessionData.year;
                    const sMonth = oSessionData.month;

                    const pdfFileName = iYear + "년" + "\n" + sMonth + "월" + "\n" + sTitle + "\n" + "AI 리포트.pdf"
                    pdf.save(pdfFileName);
                    oCarousel.setActivePage(pageId[activeIdx])
                } catch (e) {
                    console.error("PDF 생성 오류", e)
                }
                oCarousel.setBusy(false);
            },


            _setChartHeaderModel: async function (sChannelId, sEventId, oData) {
                switch (sEventId) {
                    case "newMonthData": this.getView().setModel(new JSONModel(oData), "newData")
                        break;
                    case "deselMonthData": this.getView().setModel(new JSONModel(oData), "deselData")
                        break;
                    case "negoMonthData": this.getView().setModel(new JSONModel(oData), "negoData")
                        break;
                    case "comMonthData": this.getView().setModel(new JSONModel(oData), "comData")
                        break;
                }
            },

            onCancel: function () {
                this.getOwnerComponent().getRouter().navTo("RouteMain")
            },
            onPageChanged: function (oEvent) {
                // 초기 페이지 라우팅시 다른페이지 테이블은 병합이 되지않아 // 테이블 페이지 이동 시 재호출
                const checkPageId = oEvent.getParameter("newActivePageId").split("--").pop()
                if (checkPageId === 'vbox4') {
                    this._oEventBus.publish("aireport", "infoSet")
                }
            }
        });
    });
