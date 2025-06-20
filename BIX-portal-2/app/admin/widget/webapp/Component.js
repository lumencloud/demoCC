sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "bix/admin/widget/model/models",
    'sap/ui/model/json/JSONModel'
    ],
    function (UIComponent, Device, models, JSONModel) {
        "use strict";

        return UIComponent.extend("bix.admin.widget.Component", {
            metadata: {
                manifest: "json"
            },
            init: function () {
                UIComponent.prototype.init.apply(this, arguments);

                this.getRouter().initialize();

                this.setModel(models.createDeviceModel(), "device");
            }
        });
    }
);