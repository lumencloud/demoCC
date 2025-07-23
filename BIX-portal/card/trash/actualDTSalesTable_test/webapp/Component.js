sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/model/json/JSONModel",
	"bix/common/library/control/Modules",
], function (UIComponent, JSONModel, Modules) {
	"use strict";

	return UIComponent.extend("bix.card.actualDTSalesTable_test.Component", {
		metadata: {
			manifest: "json"
		},

		// init: function () {
			// this.setModel(new JSONModel({
			// 	tableKind: "org"
			// }), "uiModel");
			// this.getSelectedModel();
		// },

		// getSelectedModel: async function () {
		// 	// 현재 해시를 기준으로 DB에서 Select에 들어갈 카드 정보를 불러옴
		// 	let aHash = Modules.getHashArray();
		// 	let sSelectPath = `/pl_content_view(pl_info='${aHash[0]}',position='detail',grid_layout_info=null,content_menu_code='${aHash[2]}',detail_info='${aHash[3]}')/Set`;
		// 	const oSelectContext = this.getModel("cm").bindContext(sSelectPath);
		// 	let aSelectData = await oSelectContext.requestObject();

		// 	// 카드 정보를 selectModel로 설정 (sub_key, sub_text)
		// 	this.setModel(new JSONModel(aSelectData.value), "selectModel");
		// },

		onCardReady(oCard) {
			this.oCard = oCard;
		}
	});
});
