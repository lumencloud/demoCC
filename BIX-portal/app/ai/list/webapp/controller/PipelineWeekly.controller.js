sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "bix/common/library/control/Modules",
    "sap/ui/core/EventBus",
    "sap/ui/core/routing/HashChanger",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
],
    function (
        Controller,
        JSONModel,
        Modules,
        EventBus,
        HashChanger,
        Filter,
        FilterOperator,
    ) {
        "use strict";

        /**
         * @param {typeof sap.ui.core.mvc.Controller} Controller
         * @typedef {sap.ui.base.Event} Event
         */
        return Controller.extend("bix.ai.list.controller.PipelineWeekly", {
            _oEventBus: EventBus.getInstance(),
            _iCardReady: 0,

            onInit: function () {
                const myRoute = this.getOwnerComponent().getRouter().getRoute("PipelineWeekly");
                myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
            },
            onMyRoutePatternMatched: async function (oEvent) {
                // 해시 설정
                let oArguments = oEvent.getParameters()["arguments"];
                // 첫 페이지 고정
                const oCarousel = this.byId("carousel");
                if (oCarousel) { oCarousel.setActivePage(oCarousel.getPages()[0]); oCarousel.scrollTo(0); }
                // 스크롤 상단 고정
                // let oPage = this.byId("carouselPage")
                // if (oPage) { oPage.scrollTo(0); }

                this._oEventBus.subscribe("aiReport", "newData", this._setModel, this);
                this._oEventBus.subscribe("aiReport", "newBauData", this._setModel, this);
                this._oEventBus.subscribe("aiReport", "deselData", this._setModel, this);
                this._oEventBus.subscribe("aiReport", "deselBauData", this._setModel, this);
                this._oEventBus.subscribe("aiReport", "negoData", this._setModel, this);
                this._oEventBus.subscribe("aiReport", "negoBauData", this._setModel, this);
                this._oEventBus.subscribe("aiReport", "comData", this._setModel, this);
                this._oEventBus.subscribe("aiReport", "comBauData", this._setModel, this);

                if (!this._isSubscribed) {
                    this._oEventBus.subscribe("CardWeekChannel", "CardWeekFullLoad", this._onCardReady, this);
                    this._isSubscribed = true;
                }

                this.setSelectModel();
                this._setSessionItem();
                await this._setTopOrgModel();
                // URL 해시 설정
                this._setHash(oArguments);
            },

            onAfterRendering: function () {
                this._countViewContainCard();
            },

            _onCardReady: function (sChannelId, sEventId, oData) {
                this._iCardReady++;
                if (this._iCardReady === this.iCardCount) {
                    this.getView().getModel("uiModel").setProperty("/bPdfFlag", true)
                    this.getView().getModel("uiModel").setProperty("/busyFlag", false)
                }
            },
            _countViewContainCard: function () {
                let iCardCount = 0;
                const aCard = this.getView().findAggregatedObjects(true, function (oControl) {
                    return oControl.isA("sap.ui.integration.widgets.Card");
                });
                aCard.forEach(oCard => {
                    iCardCount++;
                })
                this.iCardCount = iCardCount;
            },

            /**
             * 연, 월, 주차 해시 설정
             */
            _setHash: function (oArguments) {

                // 컴포넌트 경로가 다른 경우 Return
                let sCurrHash = HashChanger.getInstance().getHash();

                // if (!sCurrHash.includes("PipelineWeekly")) return;
                let oDateData = this.getView().getModel("dateModel").getData();

                // dateModel에 해시 정보에 대한 항목이 없으면 첫 번째 항목으로 고정
                let oSelectedDate = oDateData.find(oWeek => {
                    return oWeek.year == oArguments.year && oWeek.month == oArguments.month && oWeek.weekNo == oArguments.weekNo
                });

                if (!oSelectedDate) {
                    oSelectedDate = oDateData[0];
                    // 선택된 항목이 없으면 강제로 첫 번째 항목으로 해시 설정
                    let sHash = sCurrHash.split("&")[0];
                    let sNewHash = sHash + `/${oSelectedDate.year}/${oSelectedDate.month}/${oSelectedDate.weekNo}`;
                    // HashChanger.getInstance().setHash(sNewHash);
                    window.location.href = "/main/aiReportWeek.html#" + sNewHash
                }

                // 선택된 항목으로 uiModel 생성
                let sFlag = (new Date(oSelectedDate.end_date).getMonth() <= 5) ? "상반기" : "하반기";
                this.getView().setModel(new JSONModel(
                    {
                        selectedKey: oSelectedDate["id"],
                        halfYear: sFlag,
                        bPdfFlag: false,
                        busyFlag: true
                    }), "uiModel");

                // 선택된 dateModel 항목으로 Select Change 이벤트 실행
                let oSelect = this.byId("selectWeek");
                let oSelectedItem = oSelect.getItems().find(oItem => {
                    let oBindingObject = oItem.getBindingContext("dateModel").getObject();
                    return oBindingObject.year == oSelectedDate.year
                        && oBindingObject.month == oSelectedDate.month
                        && oBindingObject.weekNo == oSelectedDate.weekNo;
                })
                oSelect.fireChange({ selectedItem: oSelectedItem })
            },

            /**하드 코딩 되어있음
             * 각 카드에 사용할 세션값 저장
             * @param {*} oData  조직 데이터
             * @param {*} startDate 
             * @param {*} endDate 
             */
            // _setSessionItem: function (oData, year, month) {
            //     sessionStorage.setItem("aiWeekReport", JSON.stringify({
            //         org_id: '5',
            //         start_date: '2025-06-23',
            //         end_date: '2025-06-29',
            //     }));
            //     this._oEventBus.publish("aireport", "dateData");
            // },
            _setSessionItem: function (oData, year, month) {
                const oDataModel = this.getView().getModel("topOrgModel").getData();
                sessionStorage.setItem("aiWeekReport", JSON.stringify({
                    org_id: oDataModel.org_id,
                    start_date: String(year),
                    end_date: String(month),
                }));
                this._oEventBus.publish("aireport", "dateData");
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



            // 월요일을 기준으로 다음달 주차수 계산
            // ex) 31일이 월요일이면 그 달 마지막 주차
            setSelectModel: function () {
                let { monday, sunday } = this._setDate();
                let oMonday = new Date(monday);
                let oSunday = new Date(sunday);
                let monthsBack = 3; // 과거 몇개월 전까지 데이터를 가져올 지 설정
                let weekList = [];
                let sFlag = (oSunday.getMonth() + 1) <= 6 ? "상반기" : "하반기"

                // 3개월 전의 1일 구하기
                let limit = new Date(monday);
                limit.setMonth(limit.getMonth() - monthsBack);
                limit.setDate(1);

                while (oMonday >= limit) {
                    let start_date = oMonday.toISOString().slice(0, 10);
                    let end_date = new Date(oMonday);
                    end_date.setDate(end_date.getDate() + 6)

                    weekList.push({
                        start_date: start_date,
                        end_date: end_date.toISOString().slice(0, 10),
                        year: oMonday.getFullYear(),
                        month: oMonday.getMonth() + 1,
                    })
                    oMonday.setDate(oMonday.getDate() - 7);
                }
                weekList.reverse();
                let weekNo = 1;
                let prevYear = null, prevMonth = null;
                for (let w of weekList) {
                    if (w.year !== prevYear || w.month !== prevMonth) weekNo = 1;
                    w.weekNo = weekNo++;
                    prevYear = w.year;
                    prevMonth = w.month;
                }

                weekList.reverse();
                weekList.forEach((w, index) => {
                    w.id = index + 1;
                    w.weekName = `${w.month}월 ${w.weekNo}주차`;
                });

                this.getView().setModel(new JSONModel(weekList), "dateModel");
                // this.getView().getModel("dateModel").setProperty("/selectedKey", weekList[0].end_date)
                // this.getView().getModel("dateModel").setProperty("/halfYear", sFlag);
            },

            _setDate: function () {
                let today = new Date();
                let day = today.getDay();

                let monday = new Date(today);
                monday.setDate(today.getDate() - ((day + 6) % 7));

                let sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);

                return {
                    monday: this._formatDate(monday),
                    sunday: this._formatDate(sunday)
                }
            },
            _setModel: function (sChannelId, sEventId, oData) {
                switch (sEventId) {
                    case "newData": this.getView().setModel(new JSONModel(oData), "newData")
                        break;
                    case "newBauData": this.getView().setModel(new JSONModel(oData), "newBauData")
                        break;
                    case "deselData": this.getView().setModel(new JSONModel(oData), "deselData")
                        break;
                    case "deselBauData": this.getView().setModel(new JSONModel(oData), "deselBauData")
                        break;
                    case "negoData": this.getView().setModel(new JSONModel(oData), "negoData")
                        break;
                    case "negoBauData": this.getView().setModel(new JSONModel(oData), "negoBauData")
                        break;
                    case "comData": this.getView().setModel(new JSONModel(oData), "comData")
                        break;
                    case "comBauData": this.getView().setModel(new JSONModel(oData), "comBauData")
                        break;
                }
            },
            onPDF: async function () {
                this.byId("carousel").setBusy(true);
                try {
                    const oCarousel = this.byId("carousel")
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

                        await new Promise(res => setTimeout(res, 200));

                        const currPageDom = sap.ui.getCore().byId(pageId[i]).getDomRef();
                        const canvas = await html2canvas(currPageDom, { scale: 1.5 })
                        const imgData = canvas.toDataURL("image/png");
                        const imgProps = pdf.getImageProperties(imgData);
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                        if (i > 0) pdf.addPage();
                        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                    }


                    const sWeekName = this.getView().getModel("uiModel").getProperty("/weekName")
                    const sFileName = sWeekName + "\n" + "주간리포트.pdf";
                    // const sFileName = "6월 4주차" + "\n" + "주간리포트.pdf";
                    /**
                     * 하드코딩 되어있음  ↑↑↑↑
                     */
                    pdf.save(sFileName);
                    oCarousel.setActivePage(pageId[activeIdx])
                } catch (e) {
                    console.error("PDF 생성 오류", e)
                }
                this.byId("carousel").setBusy(false);
            },

            /**
             * 주차 Select 선택 이벤트
             * @param {Event} oEvent 
             */
            onChange: function (oEvent) {
                const aDateData = this.getView().getModel("dateModel").getProperty("/")
                const sSelectedKey = oEvent?.getParameter("selectedItem").getKey();
                const oSelectedItem = aDateData.find(oData => oData.id == sSelectedKey);

                // UI 상반기/하반기 및 주차 설정
                let bFlag = oSelectedItem.month <= 6 ? "상반기" : "하반기"
                this.getView().getModel("uiModel").setProperty("/halfYear", bFlag);
                this.getView().getModel("uiModel").setProperty("/weekName", oSelectedItem.weekName);

                const oData = this.getView().getModel("topOrgModel").getData();
                this._setSessionItem(oData, oSelectedItem.start_date, oSelectedItem.end_date);

                this._oEventBus.publish("aiReport", "dateData", { start_date: oSelectedItem.start_date, end_date: oSelectedItem.end_date, org_id: '5' })
                this._oEventBus.publish("aiReport", "dateDataTable", { start_date: oSelectedItem.start_date, end_date: oSelectedItem.end_date, org_id: '5' })
                // this._oEventBus.publish("aiReport", "dateData", { start_date: '2025-06-23', end_date: '2025-06-29', org_id: '5' })
                // this._oEventBus.publish("aiReport", "dateDataTable", { start_date: '2024-06-23', end_date: '2025-06-29', org_id: '5' })
                /**
                 * 하드코딩 되어있음  ↑↑↑↑
                 */
            },

            onCancel: function () {
                this.getOwnerComponent().getRouter().navTo("RouteMain")
                const oCarousel = this.byId("carousel");
                if (oCarousel) {
                    oCarousel.setActivePage(oCarousel.getPages()[0]);
                }
            },

            _formatDate: function (date) {
                let year = date.getFullYear();
                let month = String(date.getMonth() + 1).padStart(2, '0');
                let day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`
            },

            onPageChanged: function (oEvent) {
                // 페이지 실행 중 데이터 재로드 방지
                let oSelect = this.byId("selectWeek");
                const oData = this.getView().getModel("topOrgModel").getData()
                let oBindingObject = oSelect.getSelectedItem().getBindingContext("dateModel").getObject();
                this._oEventBus.publish("aiReport", "dateDataTable", { start_date: oBindingObject.start_date, end_date: oBindingObject.end_date, org_id: oData.org_id })
                // this._oEventBus.publish("aiReport", "dateDataTable", { start_date: '2024-06-23', end_date: '2025-06-29', org_id: '5' })
                /**
                * 하드코딩 되어있음  ↑↑↑↑
                */
            },
        });
    });
