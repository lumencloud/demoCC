// Copyright (c) 2009-2023 SAP SE, All Rights Reserved
sap.ui.define(["./ContentFinderDialog.controller"], function(e) {
    "use strict";
    return e.extend("bix.common.library.home.library.ushell.components.contentFinder.controller.WidgetGallery", {
        onInit: function() {
            this.oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            this.oModel = this.getOwnerComponent().getModel()
        },
        onSelectWidgetType: function(e) {
            var t = e.getSource().getBindingContext().getObject();
            if (t.target) {
                this.getOwnerComponent().navigate(t.target)
            } else {
                this.getOwnerComponent().fireEvent("widgetSelected", {
                    widgetId: t.id
                });
                this.getOwnerComponent().getRootControl().byId("contentFinderDialog").close()
            }
        }
    })
});
//# sourceMappingURL=WidgetGallery.controller.js.map
