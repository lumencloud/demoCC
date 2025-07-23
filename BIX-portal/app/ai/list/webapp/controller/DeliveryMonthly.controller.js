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
        /**
         * @param {typeof sap.ui.core.mvc.Controller} Controller
         * @typedef {sap.ui.base.Event} Event
         */
        return Controller.extend("bix.ai.list.controller.DeliveryMonthly", {
            _oEventBus: EventBus.getInstance(),
            onInit: function () {
                const myRoute = this.getOwnerComponent().getRouter().getRoute("DeliveryMonthly");
                myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);

                this.getView().setModel(new JSONModel({ bFlag: false }), "ui");
                this._oEventBus.subscribe("aireport", "uiModel", this._setUiChange, this);
                this._oEventBus.subscribe("aireport", "uiSelectModel", this._setUiChange, this);
            },

            onMyRoutePatternMatched: async function () {
                await this._setTopOrgModel();
                this._setUiChange();
            },

            _setUiChange: function (sChanner, sEventId, oData) {
                const oTopOrgData = this.getView().getModel("topOrgModel").getData();
                if (oData.org_id !== oTopOrgData.org_id) {
                    this.getView().getModel("ui").setProperty("/bFlag", true)
                } else {
                    this.getView().getModel("ui").setProperty("/bFlag", false)
                }
             
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

            // onMyRoutePatternMatched: async function (oEvent) {
            //     const oCarousel = this.byId("carousel");
            //     if (oCarousel) {
            //         oCarousel.setActivePage(oCarousel.getPages()[0]);
            //     }
            //     let oToday = new Date();
            //     let oLastMonth = new Date(oToday.getFullYear(), oToday.getMonth() - 1, 1)
            //     let sYear = oToday.getFullYear();
            //     let sMonth = String(oToday.getMonth()).padStart(2, "0");
            //     this.byId("datePicker").setMaxDate(oLastMonth)
            //     this.getView().setModel(new JSONModel({ date: oLastMonth, month: oToday.getMonth() }), "ui");
            //     await this._setSelectModel();
            //     //초기 라우팅 시 전사 선택
            //     const topOrg = this.getView().getModel("selectModel").getData()[0]

            //     sessionStorage.setItem("aiReport", JSON.stringify({
            //         orgId: topOrg.org_id,
            //         type: topOrg.org_tp,
            //         title:  topOrg.org_name,
            //         year: sYear,
            //         month: sMonth,
            //     }));
            //     this._oEventBus.publish("aireport", "infoSet");
            // },
            // onDateChange: function (oEvent) {
            //     let oSource = oEvent.getSource();

            //     let isValidValue1 = /** @type {sap.m.Input} */ (oSource).isValidValue();
            //     let isValidValue2 = oSource.getDateValue();
            //     if (!isValidValue1 || !isValidValue2) {
            //         oEvent.getSource().setValueState("Error");
            //         return;
            //     } else {
            //         oEvent.getSource().setValueState("None");

            //         // 검색 조건 변경 EventBus Publish
            //         let oSelectedDate = this.getView().getModel("ui").getData();

            //         //세션 스토리지 데이터 가져오기
            //         let oSessionData = JSON.parse(sessionStorage.getItem("aiReport"))

            //         //세션 스토리지 업데이트
            //         sessionStorage.setItem("aiReport", JSON.stringify({
            //             orgId: oSessionData.orgId,
            //             type: oSessionData.type,
            //             title: oSessionData.title,
            //             year: oSelectedDate.date.getFullYear(),
            //             month: String(oSelectedDate.date.getMonth() + 1).padStart(2, "0"),
            //         }));
            //         this.getView().getModel("ui").setProperty("/month", oSelectedDate.date.getMonth() + 1)
            //         this._oEventBus.publish("aireport", "infoSet");
            //     };
            // },
            // onPDF: async function () {
            //     this.byId("carousel").setBusy(true);
            //     try {
            //         const oCarousel = this.byId("carousel")
            //         const pageId = oCarousel.getPages().map(page => page.getId());

            //         let currentPageId = oCarousel.getActivePage();
            //         let activeIdx = pageId.indexOf(currentPageId);
            //         if (activeIdx === -1) activeIdx = 0;
            //         const pdf = new window.jspdf.jsPDF({
            //             orientation: "portrait",
            //             unit: "mm",
            //             format: "a4"
            //         })
            //         for (let i = 0; i < pageId.length; i++) {
            //             oCarousel.setActivePage(pageId[i]);

            //             await new Promise(res => setTimeout(res, 200));

            //             const currPageDom = sap.ui.getCore().byId(pageId[i]).getDomRef();
            //             const canvas = await html2canvas(currPageDom, { scale: 2 })
            //             const imgData = canvas.toDataURL("image/png");
            //             const imgProps = pdf.getImageProperties(imgData);
            //             const pdfWidth = pdf.internal.pageSize.getWidth();
            //             const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            //             if (i > 0) pdf.addPage();
            //             pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            //         }
            //         pdf.save("capture.pdf");
            //         oCarousel.setActivePage(pageId[activeIdx])
            //     } catch (e) {
            //         console.error("PDF 생성 오류", e)
            //     }
            //     this.byId("carousel").setBusy(false);
            // },

            // _setSelectModel: async function () {
            //     const andFilter = new Filter([
            //         new Filter("org_tp", FilterOperator.EQ, "delivery"),
            //         new Filter("org_level", FilterOperator.EQ, "div")
            //     ], true) // true : And 조건

            //     const lv1Filter = new Filter("org_level", FilterOperator.EQ, "lv1");

            //     const finalFilter = new Filter([
            //         andFilter,
            //         lv1Filter
            //     ], false) // false : OR 조건

            //     const oModel = this.getOwnerComponent().getModel();
            //     const oBinding = oModel.bindList("/org_full_level", undefined, undefined, finalFilter)
            //     await oBinding.requestContexts().then((aContext) => {
            //         const aData = aContext.map(ctx => ctx.getObject());
            //         this.getView().setModel(new JSONModel(aData), "selectModel");
            //     })
            // },
            // onChange: function (oEvent) {
            //     const oData = this.getView().getModel("selectModel").getData();
            //     const sSelectedKey = oEvent.getParameter("selectedItem").getProperty("key");
            //     const oSelectData = oData.filter(o => o.org_id === sSelectedKey)

            //     //세션 스토리지 데이터 가져오기
            //     let oSessionData = JSON.parse(sessionStorage.getItem("aiReport"))

            //     // 검색 조건 변경 EventBus Publish
            //     let oSelectedDate = this.getView().getModel("ui").getData();
            //     //세션 스토리지 업데이트
            //     sessionStorage.setItem("aiReport", JSON.stringify({
            //         orgId: oSelectData[0].org_id,
            //         type: oSelectData[0].org_tp,
            //         title: oSelectData[0].org_name,
            //         year: oSelectedDate.date.getFullYear(),
            //         month: String(oSelectedDate.date.getMonth() + 1).padStart(2, "0"),
            //     }));
            //     this.getView().getModel("selectModel").setProperty("/selectedKey", oSelectData[0].org_id);
            //     this._oEventBus.publish("aireport", "infoSet");
            // },
            // onCancel: function () {
            //     this.getOwnerComponent().getRouter().navTo("RouteMain")

            // },

        });
    });
