sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/EventBus",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/routing/HashChanger",
],
    function (
        Controller,
        JSONModel,
        EventBus,
        Filter,
        FilterOperator,
        ODataModel,
        HashChanger
    ) {
        "use strict";
        /**
         * @param {typeof sap.ui.core.mvc.Controller} Controller
         * @typedef {sap.ui.base.Event} Event
         */
        return Controller.extend("bix.ai.list.controller.MainMonthly", {
            /**
             *  eventBus 전역 객체 
             */
            _oEventBus: EventBus.getInstance(),
            /**
             *  pdf 다운로드 버튼 제어를 위한 카드 로딩 카운트 변수
             */
            _iCardReady: 0,
            /**
             *  select 선택시 pdf (busy,enable) ui 제어 flag 변수
             */
            _bPdfLoaded: true,
            /**
             *  eventBus subscribed 된 이후 publish 위한 카드 subscribe 카운트 변수
             */
            _iCardSubs: 0,
            _bUpdateFlag: false,
            _bInstanceFlag: true,

            onInit: function () {
                const myRoute = this.getOwnerComponent().getRouter().getRoute("MainMonthly");
                myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);

            },

            onMyRoutePatternMatched: async function (oEvent) {
                // 첫번째 페이지 고정
                const oCarousel = this.byId("carousel");
                if (oCarousel) {
                    oCarousel.setActivePage(oCarousel.getPages()[0]);
                }
                await this._setModel();

                let oToday = new Date();
                let sYear = String(oToday.getFullYear());
                let sMonth = String(oToday.getMonth()).padStart(2, "0");
                const oData = this.getView().getModel("topOrgModel").getData();
                this._setSessionItem(oData, sYear, sMonth);

                this._oEventBus.subscribe("aiReport", "newMonthData", this._setChartHeaderModel, this)
                this._oEventBus.subscribe("aiReport", "deselMonthData", this._setChartHeaderModel, this)
                this._oEventBus.subscribe("aiReport", "negoMonthData", this._setChartHeaderModel, this)
                this._oEventBus.subscribe("aiReport", "comMonthData", this._setChartHeaderModel, this)

                this._oEventBus.subscribe("aireport", "isCardSubscribed", this._onCardSubscribed, this)
            },

            onBeforeRendering: function () {
                this._countViewContainCard();
            },

            onAfterRendering: function () {
                if (!this._isSubscribed) {
                    this._oEventBus.subscribe("CardChannel", "CardFullLoad", this._onCardReady, this);
                    this._isSubscribed = true;
                }
            },

            _onCardSubscribed: function () {
                this._iCardSubs++;
                if (this._iCardSubs >= 10 && !this._isCardLoaded) {
                    /**
                     *  안전하게 카드가 로딩된 후 (subscribed 후) publish 날릴 수 있게 2개(카드 갯수)로 설정 
                     */
                    const oSelect = this.byId("selectType");
                    oSelect.fireChange({
                        selectedItem: oSelect.getSelectedItem()
                    })
                    this._isCardLoaded = true;
                }
            },

            _onCardReady: async function () {
                this._iCardReady++;
                if (this._iCardReady === this.iCardCount) {
                    this.getView().getModel("ui").setProperty("/bPdfFlag", true)
                    this.getView().getModel("ui").setProperty("/busyFlag", false)
                    this._oEventBus.unsubscribe("CardChannel", "CardFullLoad", this._onCardReady, this);
                    this._iCardReady = 0;
                    this._bPdfLoaded = false;
                }
            },

            /**
             *  select 를 통해서 view를 불러올 때마다 카드 개수 확인하여 카운트
             */
            _countViewContainCard: function (sPageId) {
                let iCardCount = 0;
                const viewId = sPageId || "all";
                const oCurrView = this.byId(viewId).byId("carousel");
                const aCard = oCurrView.findAggregatedObjects(true, function (oControl) {
                    return oControl.isA("sap.ui.integration.widgets.Card");
                });
                aCard.forEach(oCard => {
                    iCardCount++;
                })
                this.iCardCount = iCardCount;
            },

            /**
             * 그룹별 나눠서 api 데이터 순차 요청
             * @param {*} firstData 
             * @param {*} secondData 
             * @param {*} ThirdData 
             */
            _requestData: async function (firstData, secondData, ThirdData) {
                const aFirstResult = await this._callApiGroup(firstData);
                this._eventBusToCard(aFirstResult);

                const aSecondResult = await this._callApiGroup(secondData);
                this._eventBusToCard(aSecondResult);

                if (ThirdData) {   //각 페이지별 api 요청 분기 처리
                    const aThirdResult = await this._callApiGroup(ThirdData);
                    this._eventBusToCard(aThirdResult);
                }
            },

            /**
             * 그룹으로 넘어온 api Path 값 promise all 로 한번에 return
             * @param {*} aApi 
             * @returns 
             */
            _callApiGroup: async function (aApi) {
                const oSelect = this.byId("selectType").getSelectedKey();
                const org_tp = this._extractViewId(oSelect);

                const aPromises = aApi.map((obj) => {
                    const skey = Object.keys(obj)[0];
                    const sPath = obj[skey]
                    return this._callApi(sPath).then((oResult => {
                        return {
                            eventId: skey,
                            data: oResult,
                            org_tp: org_tp,
                            bUpdateFlag: this._bUpdateFlag,
                            bInstanceFlag: this._bInstanceFlag,
                        }
                    }))
                })
                return Promise.all(aPromises);
            },

            /**
             * 각 그룹 path 값 데이터 요청
             * @param {*} sPath 
             * @returns 
             */
            _callApi: async function (sPath) {
                const oModel = new ODataModel({
                    serviceUrl: "../odata/v4/pl_api/",
                    synchronizationMode: "None",
                    operationMode: "Server"
                });
                try {
                    const oData = await oModel.bindContext(sPath).requestObject();
                    return oData.value
                } catch (oError) {
                    console.error("데이터 로드 실패", sPath, oError)
                    return
                }
            },

            /** 선택된 조직 별 api 요청 path값 가공 함수
             * @param {Object} oData 
             * @param {String} year 
             * @param {String} month 
             * @returns 
             */
            _changeApiPath: function (oData, year, month) {
                const oTopOrgData = this.getView().getModel("topOrgModel").getData();

                function mappingPath(path, extra = '') {
                    if (path === '/get_ai_forecast_pl') {
                        return path + `(year='${year}',org_id='${oData.org_id}',org_tp='${oData.org_tp}')`;
                    }
                    let param = `year='${year}',month='${month}',org_id='${oData.org_id}',org_tp='${oData.org_tp}'`
                    if (extra) param += `,${extra}`
                    return `${path}(${param})`
                }
                // 첫번째 페이지 api path
                const aFirstPagePaths = [
                    { deliContent1_2: mappingPath("/get_actual_m_pl_oi") },
                    { deliContent1_3: mappingPath("/get_actual_m_rate_gap_pl_oi") }
                ]
                // 나머지 페이지 api path
                const aRestPagePaths = [
                    { allContent2_1: mappingPath("/get_actual_m_account_sale_pl") },
                    { allContent2_2: mappingPath("/get_actual_m_sale_org_pl") },
                    { allContent3_4: mappingPath("/get_ai_forecast_deal_pipeline") },
                    { allContent3_5: mappingPath("/get_ai_forecast_rodr_pipeline") },
                    { deliContent2_1: mappingPath("/get_actual_m_sale_org_pl") },
                    { deliContent2_2: mappingPath("/get_actual_m_br_org_detail") },
                    { deliContent2_3: mappingPath("/get_actual_m_rohc_org_oi") },
                    { deliContent2_4: mappingPath("/get_actual_m_sga") },
                    { deliContent3_1: mappingPath("/get_ai_forecast_pl") },
                    { deliContent3_3: mappingPath("/get_ai_forecast_m_pl") },
                    { accountContent2_2: mappingPath("/get_actual_m_sale_rodr_org_pl") },
                ]
                // 네 번째 페이지 표 형태 카드 api path
                const aTablePagePath = [
                    { nego: mappingPath("/get_ai_forecast_deal_type_pl", "deal_stage_cd='nego'") },
                    { lost: mappingPath("/get_ai_forecast_deal_type_pl", "deal_stage_cd='lost'") },
                    { new: mappingPath("/get_ai_forecast_deal_type_pl", "deal_stage_cd='new'") },
                    { qualified: mappingPath("/get_ai_forecast_deal_type_pl", "deal_stage_cd='qualified'") },
                    { contract: mappingPath("/get_ai_forecast_deal_type_pl", "deal_stage_cd='contract'") }
                ]
                // Account, 전사 페이지에서만 사용하는 표 형태 카드 분기처리
                if (oData.org_tp === 'account' || (oData.org_tp === 'delivery' && oData.org_id === oTopOrgData.org_id)) {
                    return { first: aFirstPagePaths, second: aRestPagePaths, third: aTablePagePath }
                } else {
                    return { first: aFirstPagePaths, second: aRestPagePaths }
                }
            },

            /**
             * @param {*} oEvent 
             */
            onSelectOrg: function (oEvent) {

                const oData = this.getView().getModel("selectModel").getData();
                const sSelectedKey = oEvent.getParameter("selectedItem").getProperty("key");
                const sPageId = this._extractViewId(sSelectedKey);
                this._allSelectUiChange(sPageId);
                this._oEventBus.publish("aireport", "setBusy");

                const oSelectData = oData.filter(o => o.org_id === sSelectedKey);
                const oSelectedDate = this.getView().getModel("ui").getData();

                const sYear = String(oSelectedDate.date.getFullYear());
                const sMonth = String(oSelectedDate.date.getMonth() + 1).padStart(2, "0");

                const sSelectedView = this.byId(sPageId);
                const oCarousel = sSelectedView.byId("carousel");
                const sFirstPageId = oCarousel.getPages()[0].getId()
                const navCon = this.byId("navCon");
                // select 선택 시 첫페이지로 이동
                oCarousel.setActivePage(sFirstPageId);
                let oPage = this.byId(sPageId);

                const bSame = oPage.getId() === navCon.getCurrentPage().getId();
                const bNotSame = oPage.getId() != navCon.getCurrentPage().getId();
                const bInstanceExist = !!this._bInstanceFlag;

                // if (bSame && !this._bUpdateFlag) {
                //     this._bUpdateFlag = true;
                //     this._bInstanceFlag = false;
                // } else if (bNotSame) {
                //     this._bUpdateFlag = false;
                //     this._bInstanceFlag = true;
                // } else if (bNotSame && this._bInstanceFlag) {
                //     this._bUpdateFlag = true;
                // } else if (bSame && this._bUpdateFlag) {
                //     this._bUpdateFlag = true;
                // }
                if (bSame) {
                    this._bUpdateFlag = true;
                } else if (!bInstanceExist) {
                    this._bInstanceFlag = true;
                    this._bUpdateFlag = false;
                } else {
                    this._bUpdateFlag = true;
                }


                navCon.to(oPage)

                if (oPage) {
                    switch (sPageId) {
                        case "all":
                            {
                                const { first, second, third } = this._changeApiPath(oSelectData[0], sYear, sMonth);
                                this._requestData(first, second, third)
                                this._setSessionItem(oSelectData[0], sYear, sMonth);
                                break;
                            }
                        case "account":
                            {
                                const { first, second, third } = this._changeApiPath(oSelectData[0], sYear, sMonth);
                                this._requestData(first, second, third)
                                this._setSessionItem(oSelectData[0], sYear, sMonth);
                                this._oEventBus.publish("aireport", "uiModel", oSelectData[0])
                                break;
                            }
                        case "delivery":
                            {
                                const { first, second } = this._changeApiPath(oSelectData[0], sYear, sMonth);
                                this._requestData(first, second)
                                this._setSessionItem(oSelectData[0], sYear, sMonth);
                                this._oEventBus.publish("aireport", "uiModel", oSelectData[0])
                                break;
                            }
                    }
                }
            },

            /**
              * DatePicker , Change 이벤트
              * @param {*} oEvent 
              * @returns 
              */
            onDateChange: function (oEvent) {
                let oSource = oEvent.getSource();

                this._allSelectUiChange();

                this._oEventBus.publish("aireport", "setBusy");

                let isValidValue1 = /** @type {sap.m.Input} */ (oSource).isValidValue();
                let isValidValue2 = oSource.getDateValue();
                if (!isValidValue1 || !isValidValue2) {
                    oEvent.getSource().setValueState("Error");
                    return;
                } else {
                    oEvent.getSource().setValueState("None");
                    let orgData;

                    // 검색 조건 변경 EventBus Publish
                    let oSelectedDate = this.getView().getModel("ui").getData();
                    let sYear = String(oSelectedDate.date.getFullYear());
                    let sMonth = String(oSelectedDate.date.getMonth() + 1).padStart(2, '0');
                    const orgTopData = this.getView().getModel("topOrgModel").getData();
                    const oCloudOrgData = this.getView().getModel("cloudOrgModel").getData();

                    const sSelectedId = this.byId("selectType").getSelectedKey();
                    const oData = this.getView().getModel("selectModel").getData()
                    const oSelectedData = oData.filter((d) => d.org_id === sSelectedId)

                    const { first, second, third } = this._changeApiPath(oSelectedData[0], sYear, sMonth);
                    this._requestData(first, second, third);

                    // 세션 스토리지 데이터 가져오기
                    let oSessionData = JSON.parse(sessionStorage.getItem("aiReport"))

                    // 세션 스토리지 업데이트
                    sessionStorage.setItem("aiReport", JSON.stringify({
                        orgId: oSessionData.orgId,
                        type: oSessionData.type,
                        title: oSessionData.title,
                        year: oSelectedDate.date.getFullYear(),
                        month: String(oSelectedDate.date.getMonth() + 1).padStart(2, "0"),
                    }));
                    this._oEventBus.publish("aireport", "infoSet");

                    this.getView().getModel("ui").setProperty("/month", oSelectedDate.date.getMonth() + 1)
                };
            },

            /**
             *  각 select, datePicker ui 제어 모듈함수
             */
            _allSelectUiChange: function (sPageId) {
                // 조직 재 선택했을 시 pdf 버튼 ui 제어
                if (!this._bPdfLoaded) {
                    this.getView().getModel("ui").setProperty("/bPdfFlag", false)
                    this.getView().getModel("ui").setProperty("/busyFlag", true)
                }
                // 조직 재 선택했을 시 해당 view 카드 카운트
                if (this._isCardLoaded) {
                    this._countViewContainCard(sPageId);
                    this._oEventBus.subscribe("CardChannel", "CardFullLoad", this._onCardReady, this);
                }
            },

            /**
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
                    month: month
                }));
                this._oEventBus.publish("aireport", "infoSet");
            },

            /**
             *  초기 Model 설정
             */
            _setModel: async function () {
                const oToday = new Date();
                const oLastMonth = new Date(oToday.getFullYear(), oToday.getMonth() - 1, 1)
                const oSelect = this.byId('selectType')
                this.byId("datePicker").setMaxDate(oLastMonth);

                // 날짜, AI리포트 타입 선택 모델
                this.getView().setModel(new JSONModel({
                    date: oLastMonth,
                    month: oToday.getMonth(),
                    bFlag: false,     // 셀렉트 선택 (조직부문)
                    busyFlag: true,  // pdf 버튼 busy flag
                    bPdfFlag: false //, pdf버튼 enable
                }), "ui");

                this._setSelectModel();
                await this._setTopOrgModel();
                await this._setCloudOrgModel();

                // 셀렉트 초기 세팅
                oSelect.setSelectedKey("/value", "all")
            },

            /**
             *  Select 조직 list model 설정
             */
            _setSelectModel: async function () {
                const filter = new Filter([
                    new Filter("org_parent", FilterOperator.EQ, null),
                    new Filter([
                        new Filter([
                            new Filter("org_tp", FilterOperator.EQ, "delivery"),
                            new Filter("org_tp", FilterOperator.EQ, "account")
                        ], false),
                        new Filter("org_level", FilterOperator.EQ, "div")
                    ], true)
                ], false)

                const oModel = this.getOwnerComponent().getModel();
                const oBinding = oModel.bindList("/org_full_level", undefined, undefined, filter)
                await oBinding.requestContexts().then((aContext) => {
                    const aData = aContext.map(ctx => ctx.getObject());
                    this.getView().setModel(new JSONModel(aData), "selectModel");
                })
            },

            /**
             * 최상위 조직 값 모델 설정
             */
            _setTopOrgModel: async function () {
                const andFilter = new Filter([
                    new Filter("org_id", FilterOperator.NE, null),
                    new Filter([
                        new Filter("org_parent", FilterOperator.EQ, null),
                        new Filter("org_parent", FilterOperator.EQ, ''),
                    ], false)
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
             *  Cloud 부문 조직 값 모델 설정
             */
            _setCloudOrgModel: async function () {
                const oModel = this.getOwnerComponent().getModel();
                const oBinding = oModel.bindList("/org_full_level", undefined, undefined, new Filter("org_ccorg_cd", FilterOperator.EQ, "195200"))
                await oBinding.requestContexts().then((aContext) => {
                    const aData = aContext.map(ctx => ctx.getObject());
                    this.getView().setModel(new JSONModel(aData[0]), "cloudOrgModel");
                })
            },
            /**
             *  Delivery 부문 조직 값 모델 설정
             */
            _setDeliveryOrgModel: async function () {
                const oModel = this.getOwnerComponent().getModel();
                const aFilter = new Filter([
                    new Filter("org_tp", FilterOperator.EQ, "delivery"),
                    new Filter("org_level", FilterOperator.EQ, "div"),
                    new Filter("org_level", FilterOperator.NE, "195200"),
                ], true)
                const oBinding = oModel.bindList("/org_full_level", undefined, undefined, aFilter)
                await oBinding.requestContexts().then((aContext) => {
                    const aData = aContext.map(ctx => ctx.getObject());
                    this.getView().setModel(new JSONModel(aData[0]), "deliveryOrgModel");
                })
            },
            /**
             *  Account 부문 조직 값 모델 설정
             */
            _setAccountOrgModel: async function () {
                const oModel = this.getOwnerComponent().getModel();
                const aFilter = new Filter([
                    new Filter("org_tp", FilterOperator.EQ, "account"),
                    new Filter("org_level", FilterOperator.EQ, "div"),
                ], true)
                const oBinding = oModel.bindList("/org_full_level", undefined, undefined, aFilter)
                await oBinding.requestContexts().then((aContext) => {
                    const aData = aContext.map(ctx => ctx.getObject());
                    this.getView().setModel(new JSONModel(aData[0]), "accountOrgModel");
                })
            },

            _extractViewId: function (sKey) {
                const oSelectModel = this.getView().getModel("selectModel").getData();
                const oTopOrgId = this.getView().getModel("topOrgModel").getData()['org_id'];

                let viewId;
                const aSelectedData = oSelectModel.filter((data) => data.org_id === sKey);
                const bFlag = aSelectedData.some((data) => data.org_id === oTopOrgId);
                if (bFlag) {
                    viewId = "all"
                } else {
                    if (aSelectedData[0].org_tp === 'account') {
                        viewId = 'account'
                    } else if (aSelectedData[0].org_tp === 'delivery') {
                        viewId = 'delivery'
                    }
                }
                return viewId;
            },

            /**
             *  PDF 다운로드
             */
            onPDF: async function () {
                const sSelectedKey = this.byId("selectType").getSelectedKey()
                const sSelectedView = this.byId(sSelectedKey);
                const oCarousel = sSelectedView.byId("carousel");
                const pageId = oCarousel.getPages().map(page => page.getId());
                const currentPageId = oCarousel.getActivePage();
                const oCardGroup = sSelectedView.getControlsByFieldGroupId("cardGroup");

                const viewId = this.byId("selectType").getSelectedKey() || "all";
                this.byId(viewId).byId("carousel").setBusy(true);

                try {
                    const pdf = new window.jspdf.jsPDF({
                        orientation: "portrait",
                        unit: "mm",
                        format: "a4"
                    })

                    for (let i = 0; i < pageId.length; i++) {
                        oCarousel.setActivePage(pageId[i]);

                        await new Promise(res => setTimeout(res, 100));

                        const currPageDom = sap.ui.getCore().byId(pageId[i]).getDomRef();
                        const canvas = await html2canvas(currPageDom, { scale: 1 })
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
                    // const pdfFileName = "2025년" + "\n" + "6월" + "\n" + "SK주식회사 AX" + "\n" + "AI 리포트.pdf"
                    pdf.save(pdfFileName);

                    let activeIdx = pageId.indexOf(currentPageId);
                    if (activeIdx === -1) activeIdx = 0;
                    oCarousel.setActivePage(pageId[activeIdx])
                } catch (e) {
                    console.error("PDF 생성 오류", e)
                }
                this.byId(viewId).byId("carousel").setBusy(false);
            },

            /**
             * 표 형식 카드 (4페이지) 카드의 헤더 데이터를 구성하기 위한 model
             */
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

            /**
             * @param {Array} aData  각 카드로 보낼 데이터를 모은 배열
             */
            _eventBusToCard: function (aData) {
                aData.forEach((oResult) => {
                    this._oEventBus.publish("aireport", oResult.eventId, oResult);
                })
            },
            onCancel: function () {
                this.getOwnerComponent().getRouter().navTo("RouteMain")
            },

        });
    });
