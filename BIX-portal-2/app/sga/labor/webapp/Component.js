sap.ui.define([
    "sap/ui/core/UIComponent",
    "bix/sga/labor/model/models",
    "sap/ui/model/json/JSONModel",
], (UIComponent, models,JSONModel) => {
    "use strict";

    return UIComponent.extend("bix.sga.labor.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init :async function(){
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

             //version 에서 tag가 C 를 가져와서 year month  가져오기
             const oContext = this.getModel("cm").bindContext("/Version", null, {
                $filter: "tag eq 'C'"
            });
            const oData= await oContext.requestObject();
            //Date형식으로 전환
            const dDate = new Date(
                oData.value[0].year,oData.value[0].month-1
            )
            
            //dDate설정
            this.setModel(new JSONModel({
                yearMonth: dDate
            }), "initYearMonth");


            // enable routing
            this.getRouter().initialize();
        }
    });
});