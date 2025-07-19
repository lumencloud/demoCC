sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/EventBus",
    "bix/common/library/control/Modules",
    "sap/ui/core/routing/HashChanger",
], function (Controller, JSONModel, Module, ODataModel, EventBus, Modules, HashChanger) {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Select} Select
     */
    return Controller.extend("bix.card.planOiNonMMTable.Main", {


        /**
         * @type {Array} View의 모든 테이블 배열
         */
        _aTableLists: [],

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

        onInit: function () {
            this._asyncInit();

            this._oEventBus.subscribe("pl", "search", this._bindTable, this);
            this._oEventBus.subscribe("pl", "detailSelect", this._changeDetailSelect, this);
        },

        _asyncInit: async function () {
            // 초기 JSON 모델 설정
            await this._setModel();

            this._bindTable();
        },
        /**
         * JSON 모델 설정
         */
        _setModel: async function () {
            // 데이터 불러오기 전에 모든 테이블이 보여서 먼저 선언
            this.getView().setModel(new JSONModel({}), "uiModel");

            // 현재 해시를 기준으로 DB에서 Select에 들어갈 카드 정보를 불러옴
            let oHashData = this.getOwnerComponent().oCard.getModel("hashModel").getData();

            let sSelectPath = `/pl_content_view(page_path='${oHashData.page}',position='detail',grid_layout_info=null,detail_path='${oHashData.detail}',detail_info='${oHashData.detailType}')/Set`;
            const oListBinding = this.getOwnerComponent().getModel("cm").bindList(sSelectPath, null, null, null, {
                $filter: `length(sub_key) gt 0`
            });
            let aSelectContexts = await oListBinding.requestContexts();
            let aSelectData = aSelectContexts.map(oContext => oContext.getObject());

            // 카드 정보를 selectModel로 설정 (sub_key, sub_text)
            this.getView().setModel(new JSONModel(aSelectData), "selectModel");

            // 기본적으로 첫 번째 항목의 테이블을 보여줌
            this.getView().setModel(new JSONModel({ tableKind: aSelectData[0].sub_key }), "uiModel");

            // this._aTableLists에 fieldGroupId가 content인 요소 및 SelectModel에 포함된 테이블의 localId를 담음
            this._aTableLists = [];
            this.getView().getControlsByFieldGroupId("content").forEach(object => {
                if (object.isA("sap.ui.table.Table") && object.getFieldGroupIds().length > 0) {
                    let sub_key = object.getFieldGroupIds().find(sId => !!aSelectData.find(oData => oData.sub_key === sId));

                    if (!!sub_key) {
                        let sLocalId = this.getView().getLocalId(object.getId());

                        this._aTableLists.push(sLocalId);
                    }
                }
            })
        },

        /**
         * Select 변경 이벤트
         * @param {Event} oEvent 
         */
        onUiChange: async function (oEvent) {
            // 선택한 key로 화면에 보여줄 테이블을 결정
            let oSelect = /** @type {Select} */ (oEvent.getSource());
            let sKey = (oSelect).getSelectedKey();
            let oUiModel = this.getView().getModel("uiModel");
            oUiModel.setProperty("/tableKind", sKey);

            // detailCard Component 반환
            let oCard = this.getOwnerComponent().oCard;
            let oCardComponent = oCard._oComponent;

            // PL 실적 hashModel에 detailSelect 업데이트
            let oHashModel = oCardComponent.getModel("hashModel");
            oHashModel.setProperty("/detailSelect", sKey);

            // PL 실적 Manifest Routing
            let oHashData = oHashModel.getData();
            let sRoute = (oHashData["page"] === "actual" ? "RouteActual" : "RoutePlan");
            oCardComponent.getRouter().navTo(sRoute, {
                pageView: oHashData["pageView"],
                detail: oHashData["detail"],
                detailType: oHashData["detailType"],
                orgId: oHashData["orgId"],
                detailSelect: oHashData["detailSelect"],
            });

            // 선택한 항목의 테이블만 병합
            let oItem = oEvent.getParameters()["item"];
            let iTableIndex = oSelect.indexOfItem(oItem);
            await this._setTableMerge([this._aTableLists[iTableIndex]]);
        },

        /**
         * 뒤로가기, 앞으로가기에 의해 변경된 URL에 따라 detailSelect 다시 설정
         * @param {String} sChannelId 
         * @param {String} sEventId 
         * @param {Object} oEventData 
         */
        _changeDetailSelect: function (sChannelId, sEventId, oEventData) {
            // DOM이 있을 때만 detailSelect를 변경
            let oDom = this.getView().getDomRef();
            if (oDom) {
                let sKey = oEventData["detailSelect"];
                this.byId("detailSelect").setSelectedKey(sKey);
            }
        },        

        _bindTable: async function (sChannelId, sEventId, oData) {
            // DOM이 없는 경우 Return
            let oDom = this.getView().getDomRef();
            if (!oDom) return;

            // detailSelect 해시에 따른 Select 선택
            let oSelect = this.byId("detailSelect");
            let oHashData = this.getOwnerComponent().oCard.getModel("hashModel").getData();
            let sDetailKey = oHashData["detailSelect"];
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

            // 검색 파라미터
            this._setBusy(true);

            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;

            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
            });


            let aBindingPath = [];
            aBindingPath.push(`/get_forecast_non_mm_account_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`)
            aBindingPath.push(`/get_forecast_non_mm_lob_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`)


            await Promise.all(
                aBindingPath.map(sPath => oModel.bindContext(sPath).requestObject()))
                .then((aResults) => {

                    // Empty 상태 설정 및 BindingPath를 테이블 변수 _sBindingPath로 설정
                    // 모델바인딩 (테이블 당 하나의 모델만 사용하므로 따로 view에 모델을 선언하지 않고 각 테이블에 JSONModel을 바인딩)
                    this._aTableLists.forEach((sTableId, index) => {
                        let oTable = this.byId(sTableId);
                        let oBox = oTable.getParent();

                        aResults[index].value = aResults[index].value.sort((a, b) => a.display_order - b.display_order); // display_order 로 정렬

                        // Empty 상태 설정
                        Module.displayStatusForEmpty(oTable, aResults[index].value, oBox);

                        // _sBindingPath 설정
                        oTable._sBindingPath = aBindingPath[index];

                        // 테이블에 모델 바인딩
                        oTable.setModel(new JSONModel(aResults[index].value));
                    })

                    // 테이블 로우 셋팅
                    this._setVisibleRowCount(aResults);
                })
                .catch((oErr) => {
                    // 추후 호출 분리 필요
                    this._aTableLists.forEach((sTableId, index) => {
                        let oTable = this.byId(sTableId);
                        let oBox = oTable.getParent();
                        Module.displayStatus(oTable, oErr.error.code, oBox);
                    })
                });

            await this._setTableMerge(this._aTableLists);

            this._setBusy(false);
        },

        _setBusy: function (bType) {
            // 모든 박스 setBusy 설정
            this._aTableLists.forEach(sTableId => {
                let oBox = this.byId(sTableId).getParent();
                oBox.setBusy(bType);
            })
        },

        _setVisibleRowCount: function (aResults) {
            //테이블 리스트
            let aTableLists = this._aTableLists

            for (let i = 0; i < aTableLists.length; i++) {
                // 테이블 아이디로 테이블 객체
                let oTable = this.byId(aTableLists[i])
                // 처음 화면 렌더링시 table의 visibleCountMode auto 와 <FlexItemData growFactor="1"/>상태에서
                // 화면에 꽉 찬 테이블의 row 갯수를 전역변수에 저장하기 위함

                if (this._iColumnCount === null) {
                    this._iColumnCount = oTable.getVisibleRowCount();
                }

                // 테이블 이벤트 등록
                if (oTable && !oTable?.mEventRegistry?.cellContextmenu) {
                    //oTable.attachCellClick(this.onCellClick, this);
                    oTable.attachCellContextmenu(this.onCellContextmenu, this);
                }
                
                // 전역변수의 row 갯수 기준을 넘어가면 rowcountmode를 자동으로 하여 넘치는것을 방지
                // 전역변수의 row 갯수 기준 이하면 rowcountmode를 수동으로 하고, 각 데이터의 길이로 지정
                if (aResults[i].value.length > this._iColumnCount) {

                    oTable.setVisibleRowCountMode("Auto")
                } else {
                    oTable.setVisibleRowCountMode("Fixed")
                    oTable.setVisibleRowCount(aResults[i].value.length)
                }
            }
        },
        /**
        * 셀 우클릭 이벤트 핸들러 
        */
        onCellContextmenu: function (oEvent) {
            oEvent.preventDefault();
            return
        },
        /**
         * 테이블 병합
         * @param {Array} aTableList 병합할 테이블 이름 배열
         */
        _setTableMerge: async function (aTableList) {
            /* TableMerge 수정 250701 */
            for (let i = 0; i < aTableList.length; i++) {
                const oTable = this.byId(aTableList[i]);

                Module.setTableMergeWithAltColor(oTable);
            }
        },
        /**
         * 필드 Formatter
         * @param {String} sType 
         * @param {*} iValue 기본값
         */
        onFormatPerformance: function (iValue, sTooltip, sType) {
            return Modules.valueFormat(sType, iValue, '', sTooltip)
        },

    });
});