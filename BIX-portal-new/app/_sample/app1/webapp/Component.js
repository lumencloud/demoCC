sap.ui.define([
    "sap/ui/core/UIComponent",
    "bix/sample/app1/model/models",
	"sap/f/library",
	"sap/f/FlexibleColumnLayoutSemanticHelper",
	"sap/ui/model/json/JSONModel",
], (UIComponent, models, library, FlexibleColumnLayoutSemanticHelper, JSONModel) => {
    "use strict";

	var LayoutType = library.LayoutType;

    return UIComponent.extend("bix.sample.app1.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();

            let oModel = new JSONModel({
                "3depth_usage" : false,
                "3depth_size" : "0%"
            });
			this.setModel(oModel, "layoutControl");
        }
    });
});