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
            _iCardReady: 0,

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
                // const oPage = this.byId("aiMonthlyReport")
                // if (oPage) { oPage.scrollTo(0); }

                await this._setModel();

                let oToday = new Date();
                let sYear = String(oToday.getFullYear());
                let sMonth = String(oToday.getMonth()).padStart(2, "0");
                const oData = this.getView().getModel("topOrgModel").getData();
                this._setSessionItem(oData, sYear, sMonth);

                /**
                 *  첫 페이지에 있는 카드들의 subscribe하는 시점보다 메인 controller 
                 *  publish가 빨라서 잠시 카드 로드를 위해 delay후 publish
                 *  추후 수정 예정
                 */
                // setTimeout(() => {
                //     oSelect.fireChange({
                //         selectedItem: oSelect.getSelectedItem()
                //     })
                // }, 2000);

                this._oEventBus.subscribe("aiReport", "newMonthData", this._setChartHeaderModel, this)
                this._oEventBus.subscribe("aiReport", "deselMonthData", this._setChartHeaderModel, this)
                this._oEventBus.subscribe("aiReport", "negoMonthData", this._setChartHeaderModel, this)
                this._oEventBus.subscribe("aiReport", "comMonthData", this._setChartHeaderModel, this)

                if (!this._isSubscribed) {
                    this._oEventBus.subscribe("CardChannel", "CardFullLoad", this._onCardReady, this);
                    this._isSubscribed = true;
                }
            },

            _onCardReady: function (sChannelId, sEventId, oData) {
                this._iCardReady++;
                if (this._iCardReady === this.iCardCount) {
                    this.getView().getModel("ui").setProperty("/bPdfFlag", true)
                    this.getView().getModel("ui").setProperty("/busyFlag", false)
                } else if (this._iCardReady === 1) {
                    /**
                     *  안전하게 카드가 로딩된 후 (subscribe) publish 날릴 수 있게 1개(카드 갯수)로 설정 
                     */
                    const oSelect = this.byId("selectType");
                    oSelect.fireChange({
                        selectedItem: oSelect.getSelectedItem()
                    })
                }
            },

            onAfterRendering: function () {
                this._countViewContainCard();
            },

            /**
             *  select 를 통해서 view를 불러올 때마다 카드 개수 확인하여 카운트
             */
            _countViewContainCard: function () {
                let iCardCount = 0;

                const viewId = this.byId("selectType").getSelectedKey() || "all";
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
                
                const aThirdResult = await this._callApiGroup(ThirdData);
                this._eventBusToCard(aThirdResult);
                
                this._countViewContainCard();
            },
            /**
             * 그룹으로 넘어온 api Path 값 promise all 로 한번에 return
             * @param {*} aApi 
             * @returns 
             */
            _callApiGroup: async function (aApi) {
                const aPromises = aApi.map((obj) => {
                    const skey = Object.keys(obj)[0];
                    const sPath = obj[skey]
                    return this._callApi(sPath).then((oResult => {
                        return {
                            eventId: skey,
                            data: oResult
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
                    console.count("callAPi")
                    const oData = await oModel.bindContext(sPath).requestObject();
                    return oData.value
                } catch (oError) {
                    console.error("데이터 로드 실패", sPath, oError)
                    return
                }
            },
            /**
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
                if (oData.org_tp === 'account' || (oData.org_tp === '' && oData.org_id === oTopOrgData.org_id)) {
                    return { first: aFirstPagePaths, second: aRestPagePaths, third: aTablePagePath }
                } else {
                    return { first: aFirstPagePaths, second: aRestPagePaths }
                }
            },

            /**
             * @param {Array} aData  각 카드로 보낼 데이터를 모은 배열
             */
            _eventBusToCard: function (aData) {
                aData.forEach((oData) => {
                    this._oEventBus.publish("aireport", oData.eventId, oData);
                })
            },

            /**
             * 첫번째 셀렉트 이벤트 (전사, Cloud, Account, Delivery)
             * @param {*} oEvent 
             */
            onSelectTypeChange: function (oEvent) {
                // 조직 데이터 세팅
                const oTopOrgData = this.getView().getModel("topOrgModel").getData();
                const oCloudOrgData = this.getView().getModel("cloudOrgModel").getData();

                const oData = { org_id: oTopOrgData.org_id, org_tp: '', org_name: oTopOrgData.org_name };
                const oDeliveryData = { org_id: oTopOrgData.org_id, org_tp: 'delivery', org_name: oTopOrgData.org_name };
                const oAccountData = { org_id: oTopOrgData.org_id, org_tp: 'account', org_name: oTopOrgData.org_name };
                const oCloudData = { org_id: oCloudOrgData.org_id, org_tp: '', org_name: oCloudOrgData.org_name };

                // 날짜 데이터 세팅
                const oDateData = this.getView().getModel("ui").getData();
                const sYear = String(oDateData.date.getFullYear());
                const sMonth = String(oDateData.date.getMonth() + 1).padStart(2, "0");

                let sPageId = oEvent.getParameter("selectedItem")?.getKey() || "all";
                let oPage = this.byId(sPageId);

                if (oPage) {
                    let bFlag = (sPageId === 'account' || sPageId === 'delivery') ? true : false;
                    this.getView().getModel("ui").setProperty("/bFlag", bFlag);

                    switch (sPageId) {
                        case "all":
                            {
                                const { first, second, third } = this._changeApiPath(oData, sYear, sMonth);
                                this._requestData(first, second, third)
                                this._setSessionItem(oData, sYear, sMonth);
                                break;
                            }
                        case "cloud":
                            {
                                const { first, second, third } = this._changeApiPath(oCloudData, sYear, sMonth);
                                this._requestData(first, second, third)
                                this._setSessionItem(oCloudData, sYear, sMonth);
                                break;
                            }
                        case "account":
                            {
                                const { first, second, third } = this._changeApiPath(oAccountData, sYear, sMonth);
                                this._requestData(first, second, third)
                                this._setSessionItem(oAccountData, sYear, sMonth);
                                this._setSelectModel(sPageId);
                                break;
                            }
                        case "delivery":
                            {
                                const { first, second, third } = this._changeApiPath(oDeliveryData, sYear, sMonth);
                                this._requestData(first, second, third)
                                this._setSessionItem(oDeliveryData, sYear, sMonth);
                                this._setSelectModel(sPageId);
                                break;
                            }
                    }
                    // const sSelectedKey = this.byId("selectType")?.getSelectedKey() || "all"
                    const sSelectedView = this.byId(sPageId);
                    const oCarousel = sSelectedView.byId("carousel");
                    const sFirstPageId = oCarousel.getPages()[0].getId()
                    const navCon = this.byId("navCon");
                    // select 선택 시 첫페이지로 이동
                    oCarousel.setActivePage(sFirstPageId);
                    navCon.to(oPage); // container page 이동
                    // this._oEventBus.publish("aireport", "uiSelectModel", {sSelectedId : sPageId})
                }
            },

            /**
              * Account Or Delivery 선택 시 부문 조직 선택 Select
              * @param {*} oEvent 
              */
            onSelectChange: function (oEvent) {
                const oData = this.getView().getModel("selectModel").getData();
                const sSelectedKey = oEvent.getParameter("selectedItem").getProperty("key");
                const oSelectData = oData.filter(o => o.org_id === sSelectedKey);
                const oSelectedDate = this.getView().getModel("ui").getData();

                const sYear = String(oSelectedDate.date.getFullYear());
                const sMonth = String(oSelectedDate.date.getMonth() + 1).padStart(2, "0");

                // API 요청
                const { first, second, third } = this._changeApiPath(oSelectData[0], sYear, sMonth);
                this._requestData(first, second, third)

                //세션 스토리지 업데이트
                this._setSessionItem(oSelectData[0], sYear, sMonth);

                this.getView().getModel("selectModel").setProperty("/selectedKey", oSelectData[0].org_id);
                this._oEventBus.subscribe("CardChannel", "CardFullLoad", this._onCardReady, this)
                this._oEventBus.publish("aireport", "uiModel", oSelectData[0])
            },

            /**
             * 하드코딩 되어있음 변경해야함
             * 각 카드에 사용할 세션값 저장
             * @param {*} oData  조직 데이터
             * @param {*} year 
             * @param {*} month 
             */
            _setSessionItem: function (oData, year, month) {
                sessionStorage.setItem("aiReport", JSON.stringify({
                    orgId: '5',
                    type: '',
                    title: oData.org_name,
                    year: '2025',
                    month: '06',
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

                await this._setTopOrgModel();
                await this._setCloudOrgModel();

                // 셀렉트 초기 세팅
                oSelect.setSelectedKey("/value", "all")
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
             *  Cloud 부문 조직 값 모델 설정
             */
            _setCloudOrgModel: async function () {
                // 전사조직 모델 세팅
                const oModel = this.getOwnerComponent().getModel();
                const oBinding = oModel.bindList("/org_full_level", undefined, undefined, new Filter("org_ccorg_cd", FilterOperator.EQ, "195200"))
                await oBinding.requestContexts().then((aContext) => {
                    const aData = aContext.map(ctx => ctx.getObject());
                    this.getView().setModel(new JSONModel(aData[0]), "cloudOrgModel");
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
                    let orgData;

                    // 검색 조건 변경 EventBus Publish
                    let oSelectedDate = this.getView().getModel("ui").getData();
                    let sYear = String(oSelectedDate.date.getFullYear());
                    let sMonth = String(oSelectedDate.date.getMonth() + 1).padStart(2, '0');
                    let orgTopData = this.getView().getModel("topOrgModel").getData();

                    const sCurrPage = this.byId("selectType").getSelectedKey();
                    switch (sCurrPage) {
                        case 'all': orgData = { org_id: orgTopData.org_id, org_tp: '' }
                            break;
                        case 'cloud': orgData = { org_id: '6193', org_tp: '' }
                            break;
                        case 'account': orgData = { org_id: orgTopData.org_id, org_tp: 'account' }
                            break;
                        case 'delivery': orgData = { org_id: orgTopData.org_id, org_tp: 'delivery' }
                            break;
                    }

                    const { first, second, third } = this._changeApiPath(orgData, sYear, sMonth);
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
                    this.getView().getModel("ui").setProperty("/month", oSelectedDate.date.getMonth() + 1)
                };
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
                // const oWidgetCard = oCardGroup.filter((oCard) => oCard.isA("sap.ui.integration.widgets.Card"))

                const viewId = this.byId("selectType").getSelectedKey() || "ax";
                this.byId(viewId).byId("carousel").setBusy(true);

                // await oWidgetCard.forEach((oCard) => {
                //     oCard.refresh()
                // })

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
                    // const sTitle = oSessionData.title;
                    // const iYear = oSessionData.year;
                    // const sMonth = oSessionData.month;

                    /**
                     * 하드코딩 되어있음  ↓↓↓↓
                     */
                    // const pdfFileName = iYear + "년" + "\n" + sMonth + "월" + "\n" + sTitle + "\n" + "AI 리포트.pdf"
                    const pdfFileName = "2025년" + "\n" + "6월" + "\n" + "SK주식회사 AX" + "\n" + "AI 리포트.pdf"
                    pdf.save(pdfFileName);
                    /**
                     * 하드코딩 되어있음  ↑↑↑↑
                     */

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
            onCancel: function () {
                this.getOwnerComponent().getRouter().navTo("RouteMain")
            },



        });
    });
