sap.ui.define([
    "sap/m/library",
    "sap/ui/core/library",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "bix/common/library/control/Modules",
    "sap/ui/core/EventBus"
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
        EventBus
    ) {
        "use strict";

        return Controller.extend("bix.ai.list.controller.CloudMonthly", {
            _oEventBus: EventBus.getInstance(),
            onInit: function () {
                const myRoute = this.getOwnerComponent().getRouter().getRoute("CloudMonthly");
                myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);

            },
            onMyRoutePatternMatched: async function (oEvent) {
                const oCarousel = this.byId("carousel");
                if (oCarousel) {
                    oCarousel.setActivePage(oCarousel.getPages()[0]);
                }
                let oToday = new Date();
                let oLastMonth = new Date(oToday.getFullYear(), oToday.getMonth() - 1, 1)
                let sYear = oToday.getFullYear();
                let sMonth = String(oToday.getMonth()).padStart(2, "0");
                this.byId("datePicker").setMaxDate(oLastMonth)
                this.getView().setModel(new JSONModel({ date: oLastMonth, month: oToday.getMonth() }), "ui");
                sessionStorage.setItem("aiReport", JSON.stringify({
                    orgId: '6193',
                    type: '',
                    title:'Cloud 부문',
                    year: sYear,
                    month: sMonth,
                }));
                this._oEventBus.publish("aireport", "infoSet");
            },
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
                    title:oSessionData.title,
                    year: oSelectedDate.date.getFullYear(),
                    month: String(oSelectedDate.date.getMonth() + 1).padStart(2, "0"),
                }));
                this.getView().getModel("ui").setProperty("/month", oSelectedDate.date.getMonth() + 1)
                this._oEventBus.publish("aireport", "infoSet");
                };
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
                        const canvas = await html2canvas(currPageDom, { scale: 2 })
                        const imgData = canvas.toDataURL("image/png");
                        const imgProps = pdf.getImageProperties(imgData);
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                        if (i > 0) pdf.addPage();
                        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                    }
                    pdf.save("capture.pdf");
                    oCarousel.setActivePage(pageId[activeIdx])
                } catch (e) {
                    console.error("PDF 생성 오류", e)
                }
                this.byId("carousel").setBusy(false);
            },

            onChange: function (oEvent) {
                const sSelectedKey = oEvent.getParameter("selectedItem").getProperty("key");
                const aPages = this.byId("carousel").getPages();
                const sSelectedPage = aPages.find(sId => sId.getId().split("--").pop() === "vbox" + sSelectedKey)
                const sSelectedId = sSelectedPage.getId().split("--").pop();
                if (sSelectedPage) {
                    this.byId("carousel").setActivePage(sSelectedPage);
                }
            },
            onCancel: function () {
                this.getOwnerComponent().getRouter().navTo("RouteMain")

            },

        });
    });
