sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/core/EventBus",
    "bix/common/library/control/Modules",
    "sap/ui/core/routing/HashChanger",
], function (Controller, JSONModel, Module, EventBus, Modules, HashChanger) {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Select} Select
     * @typedef {sap.ui.table.Table} Table
     */
    return Controller.extend("bix.card.actualCompanyTable.Main", {
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

        /**
         * @type {Array} View의 모든 테이블 배열
         */
        _aTableLists : ["actualCompanyTable1"],

        /**
         * @type {Array} View의 모든 테이블 배열
         */
        _aBoxList: [
            "actualCompanyBox5"
        ],

        onInit: async function () {
            // 초기 JSON 모델 설정
            await this._setModel();

            this._aTableLists = [];
            // this._aTableLists에 fieldGroupId가 content인 요소의 localId를 담음
            this.getView().getControlsByFieldGroupId("content").forEach(object => {
                if (object.isA("sap.ui.table.Table") && object.getFieldGroupIds().length > 0) {
                    let sLocalId = this.getView().getLocalId(object.getId());
                    this._aTableLists.push(sLocalId);
                }
            })

            // 테이블 바인딩
            this._bindTable();
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);
        },

        onBeforeRendering() {
            this.bDialog = Module.checkIsDialog(this);
        },

        /**
         * JSON 모델 설정
         */
        _setModel: async function () {
            this.getView().setModel(new JSONModel({
                tableKind: "sub_company"
            }), "uiModel");
        },

        /**
         * Select 변경 이벤트
         * @param {Event} oEvent 
         */
        onUiChange: async function (oEvent) {
            let oUiModel = this.getView().getModel("uiModel");
            oUiModel.setProperty("/tableKind", oEvent.getSource().getSelectedKey())

            setTimeout(() => {
                this._aTableLists.forEach(sTableId => this.byId(sTableId).rerender())
            }, 0);
        },

        _bindTable: async function (sChannelId, sEventId, oData) {
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
            
            const oPlModel = this.getOwnerComponent().getModel("pl");
            let sOwnPath = `/get_actual_sale_sub_company_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`

            await Promise.all([
                oPlModel.bindContext(sOwnPath).requestObject(),
            ]).then(function (aResults) {
                Module.displayStatusForEmpty(this.byId("actualCompanyTable1"),aResults[0].value, this.byId("actualCompanyBox5"));
                //열 정리
                aResults[0].value = aResults[0].value.sort((a, b) => a.display_order - b.display_order); // display_order 로 정렬
                

                // 모델바인딩 (테이블 당 하나의 모델만 사용하므로 따로 view에 모델을 선언하지 않고 각 테이블에 JSONModel을 바인딩)
                this._aTableLists.forEach((sTableName, index) => {
                    let oTable = this.byId(sTableName);
                    
                    oTable.setModel(new JSONModel(aResults[index].value));
                })
                
                // 테이블 로우 셋팅
                this._setVisibleRowCount(aResults);
                
            }.bind(this))
            .catch((oErr) => {
                Modules.displayStatus(this.byId("actualCompanyTable1"),oErr.error.code, this.byId("actualCompanyBox5"));
            });

            await this._setTableMerge(this._aTableLists);
            this._setBusy(false);
        },

        _setBusy: async function (bType) {
            this._aBoxList.forEach(sBoxId => this.byId(sBoxId).setBusy(bType))
        },

        _setVisibleRowCount: function (aResults) {
            for (let i = 0; i < this._aTableLists.length; i++) {
                // 테이블 아이디로 테이블 객체
                let oTable = this.byId(this._aTableLists[i])
                // 처음 화면 렌더링시 table의 visibleCountMode auto 와 <FlexItemData growFactor="1"/>상태에서
                // 화면에 꽉 찬 테이블의 row 갯수를 전역변수에 저장하기 위함

                // if (oTable) {
                //     oTable.attachCellClick(this.onCellClick, this);
                //     oTable.attachCellContextmenu(this.onCellContextmenu, this);
                // }

                if (this._iColumnCount === null) {
                    this._iColumnCount = oTable.getVisibleRowCount();
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
         * 테이블의 첫 번째 행 변경 이벤트
         * @param {Event} oEvent 
         */
        onFirstVisibleRowChanged: function (oEvent) {
            // view에서 사용자가 선언한 테이블의 ID 반환
            let oTable = /** @type {Table} */ (oEvent.getSource());
            let sLocalId = this.getView().getLocalId(oTable.getId());

            // 첫 번째 행이 변경된 테이블만 필드 병합
            this._setTableMerge([sLocalId]);
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

        onAfterRendering: function () {
            this._aTableLists.forEach(
                function (sTableId) {
                    let oTable = this.byId(sTableId);
                }.bind(this)
            )
        },

        onRowSelectionChange: function (oEvent) {
            let aRowMergeInfo = Module._tableRowGrouping(oEvent.getSource());
            Module.setMergeTableRowClick(oEvent.getSource(), aRowMergeInfo);
        },

        onFormatPerformance: function (iValue1, iValue2, sType, sTooltip) {
            return Modules.valueFormat(sType, iValue1, iValue2, sTooltip)
        },
        onFormatInfoLabel: function (iValue1, iValue2, sType) {
            return Modules.infoLabelFormat(iValue1, iValue2, sType);
        },
    });
});