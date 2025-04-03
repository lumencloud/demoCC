sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(
	Controller
) {
	"use strict";

	return Controller.extend("project1.controller.DemoView", {
		onButtonCreate: function(oEvent``) {
            let oModel = this.getView().getModel(); //Odata V4 모델

            let oBinding = oModel.bindList("/Organization", undefined, undefined, undefined,
                {$$updateGroupId : "create"}
            )
            let oContext = oBinding.create({
                 // name, parent_id 등은 뷰에서 유저가 입력
                 id : crypto.randomUUID()
            })
            this.byId("formId").setBindingContext(oContext);
		}
	});
});