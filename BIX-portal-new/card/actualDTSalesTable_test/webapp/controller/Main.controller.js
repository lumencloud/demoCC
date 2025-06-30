sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/EventBus",
    "bix/common/library/control/Modules",
    "sap/ui/core/routing/HashChanger",
], function (Controller, JSONModel, EventBus, Modules, HashChanger) {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Select} Select
     */
    return Controller.extend("bix.card.actualDTSalesTable_test.controller.Main", {
        /**
         * @type {sap.ui.core.EventBus} 글로벌 이벤트버스
         */
        _oEventBus: EventBus.getInstance(),

        /**
         * @type {Number} 화면에 꽉 찬 테이블의 row 갯수
         */
        _iColumnCount: null,

        /**
         * @type {Object} 검색 조건 저장
         */
        _oSearchData: {},

        onInit: async function () {
            await this._setModel();
            this._bindTable();
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);
        },

        _setModel: async function () {
            this.getView().setModel(new JSONModel({
                tableKind: "org",
            }), "uiModel");

            // 현재 해시를 기준으로 DB에서 Select에 들어갈 카드 정보를 불러옴
            let aHash = Modules.getHashArray();
            let sSelectPath = `/pl_content_view(pl_info='${aHash[0]}',position='detail',grid_layout_info=null,content_menu_code='${aHash[2]}',detail_info='${aHash[3]}')/Set`;
            const oSelectContext = this.getOwnerComponent().getModel("cm").bindContext(sSelectPath);
            let aSelectData = await oSelectContext.requestObject();

            // 카드 정보를 selectModel로 설정 (sub_key, sub_text)
            this.getView().setModel(new JSONModel(aSelectData.value), "selectModel");
        },

        /**
         * Select 변경 이벤트
         * @param {Event} oEvent 
         */
        onUiChange: function (oEvent) {
            // 선택한 key로 화면에 보여줄 테이블을 결정
            let sKey = /** @type {Select} */ (oEvent.getSource()).getSelectedKey();
            let oUiModel = this.getView().getModel("uiModel");
            oUiModel.setProperty("/tableKind", sKey);

            oUiModel.refresh();
            // 해시 마지막 배열을 sKey로 변경
            let sCurrHash = HashChanger.getInstance().getHash();
            let aHash = sCurrHash.split("/");
            aHash.pop();
            aHash.push(sKey)
            let sNewHash = aHash.join("/");
            HashChanger.getInstance().setHash(sNewHash);

            // PL에 detailSelect 해시 변경 EventBus 전송
            this._oEventBus.publish("pl", "setHashModel");
        },

        _bindTable: async function (sChannelId, sEventId, oData) {
            // DOM이 없는 경우 Return
            let oDom = this.getView().getDomRef();
            if (!oDom) return;
            // detailSelect 해시에 따른 Select 선택
            let oSelect = this.byId("detailSelect");
            let aHash = Modules.getHashArray();
            let sDetailKey = aHash?.[5];
            if (sDetailKey) {   // 해시가 있는 경우 Select 설정
                oSelect.setSelectedKey(sDetailKey);
            } else {    // 없는 경우 첫 번째 Select 항목 선택
                let oFirstDetailKey = this.getView().getModel("selectModel").getProperty("/0/sub_key");
                oSelect.setSelectedKey(oFirstDetailKey);
            }

            // 새로운 검색 조건이 같은 경우 return
            oData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            let aKeys = Object.keys(oData);
            let isDiff = aKeys.find(sKey => oData[sKey] !== this._oSearchData[sKey]);
            if (!isDiff) return;

            // 새로운 검색 조건 저장
            this._oSearchData = oData;

        },
    });
});