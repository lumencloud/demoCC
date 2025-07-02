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

        return Controller.extend("bix.ai.list.controller.Detail", {
            _oEventBus: EventBus.getInstance(),
            onInit: function () {
                const myRoute = this.getOwnerComponent().getRouter().getRoute("Detail");
                myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);

            },
            onMyRoutePatternMatched: async function (oEvent) {
                const oSelect = this.byId("selectId5")
                oSelect.setSelectedKey("1")
                oSelect.fireChange({ selectedItem: oSelect.getSelectedItem() });
            },
            onPDF: async function () {
                this.byId("carousel").setBusy(true);
                try {
                    const oCarousel = this.byId("carousel")
                    const pageId = oCarousel.getPages().map(page => page.getId());
                    let currentPageIdx = oCarousel.indexOfPage();
                    if (currentPageIdx === -1) currentPageIdx = 0;
                    const pdf = new window.jspdf.jsPDF({
                        orientation: "portrait",
                        unit: "mm",
                        format: "a4"
                    })
                    for (let i = 0; i < 2; i++) {
                        let pageIdx = currentPageIdx;
                        if (i === 1) pageIdx = 1 - currentPageIdx;
                        oCarousel.setActivePage(pageId[pageIdx]);

                        await new Promise(res => setTimeout(res, 200));

                        const currPageDom = sap.ui.getCore().byId(pageId[pageIdx]).getDomRef();
                        const canvas = await html2canvas(currPageDom, { scale: 2 })
                        const imgData = canvas.toDataURL("image/png");
                        const imgProps = pdf.getImageProperties(imgData);
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                        if (i > 0) pdf.addPage();
                        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                    }
                    pdf.save("capture.pdf");
                } catch (e) {
                    console.error("PDF 생성 오류", e)
                }
                this.byId("carousel").setBusy(false);
            },
            onChange: function (oEvent) {
                const sSelectedKey = oEvent.getParameter("selectedItem").getProperty("key");
                const aPages = this.byId("carousel").getPages();
                const aData = this.getView().getModel("dateModel").getProperty("/")
                let selectName = aData.find(v => v.key === sSelectedKey)
                this.getView().getModel("dateModel").setProperty("/name", selectName.name);
                this.byId("carousel").setActivePage(aPages[0]);
                const oSelectData = this.getOwnerComponent().getModel("dateModel").getData();
                const oFindData = oSelectData.find((oData) => oData.key === sSelectedKey);

                setTimeout(() => {
                    this._oEventBus.publish("aiReport", "dateData", { start_date: oFindData.start_date, end_date: oFindData.end_date })
                }, 2000)

            },
            onCancel: function () {
                this.getOwnerComponent().getRouter().navTo("RouteMain")
            },
        });
    });
