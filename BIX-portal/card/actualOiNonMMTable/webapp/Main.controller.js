sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
    "bix/common/library/control/Modules",
    "sap/ui/core/routing/HashChanger",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus, Modules, HashChanger) {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Select} Select
     */
    return Controller.extend("bix.card.actualOiNonMMTable.Main", {
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

        _setModel: async function(){
            // 데이터 불러오기 전에 모든 테이블이 보여서 먼저 선언
            this.getView().setModel(new JSONModel({}), "uiModel");

            // 현재 해시를 기준으로 DB에서 Select에 들어갈 카드 정보를 불러옴
            let aHash = Modules.getHashArray();
            let sSelectPath = `/pl_content_view(page_path='${aHash[0]}',position='detail',grid_layout_info=null,detail_path='${aHash[2]}',detail_info='${aHash[3]}')/Set`;
            const oListBinding = this.getOwnerComponent().getModel("cm").bindList(sSelectPath, null, null, null, {
                $filter: `length(sub_key) gt 0`
            });
            let aSelectContexts = await oListBinding.requestContexts();
            let aSelectData = aSelectContexts.map(oContext => oContext.getObject());

            // 카드 정보를 selectModel로 설정 (sub_key, sub_text)
            this.getView().setModel(new JSONModel(aSelectData), "selectModel");
        
            // 기본적으로 첫 번째 항목의 테이블을 보여줌
            this.getView().setModel(new JSONModel({ tableKind: aSelectData[0].sub_key }), "uiModel");
        },

        onUiChange: async function(oEvent){   
            // 선택한 key로 화면에 보여줄 테이블을 결정
            let sKey = /** @type {Select} */ (oEvent.getSource()).getSelectedKey();
            let oUiModel = this.getView().getModel("uiModel");
            oUiModel.setProperty("/tableKind", sKey);

            // 테이블 병합
            await this._setTableMerge();

            // 해시 마지막 배열을 sKey로 변경
            let sCurrHash = HashChanger.getInstance().getHash();
            let aHash = sCurrHash.split("/");
            
            // 배열 두 번 제거 (조직 ID, Select Key)
            let sOrgId = aHash.pop();
            aHash.pop();

            // 배열 두 번 추가 (조직 ID, Select Key)
            aHash.push(sKey);
            aHash.push(sOrgId);

            // 해시 조합
            let sNewHash = aHash.join("/");
            HashChanger.getInstance().setHash(sNewHash);

            // PL에 detailSelect 해시 변경 EventBus 전송
            this._oEventBus.publish("pl", "setHashModel");
        },

        _setBusy: function (bFlag){
            let aTableLists = ["actualOiNonMMBox1", "actualOiNonMMBox2"]
            aTableLists.forEach((sTableId)=>this.byId(sTableId).setBusy(bFlag))
        },

        
        _bindTable: async function (sChannelId, sEventId, oData) {
            // DOM이 없는 경우 Return
            let oDom = this.getView().getDomRef();
            if (!oDom) return;

            // detailSelect 해시에 따른 Select 선택
            let oSelect = this.byId("detailSelect");
            let aHash = Modules.getHashArray();
            let sDetailKey = aHash?.[4];
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

            let sAccountPath = `/get_actual_non_mm_account_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            let sLobPath = `/get_actual_non_mm_lob_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`


            await Promise.all([
                oModel.bindContext(sAccountPath).requestObject(),
                oModel.bindContext(sLobPath).requestObject(),
            ]).then(function (aResults) {
                Module.displayStatusForEmpty(this.byId("actualOiNonMMTable1"),aResults[0].value, this.byId("actualOiNonMMBox1"));
                Module.displayStatusForEmpty(this.byId("actualOiNonMMTable2"),aResults[1].value, this.byId("actualOiNonMMBox2"));
                

                //정렬
                aResults[0].value = aResults[0].value.sort((a,b)=> a.display_order - b.display_order); // display_order 로 정렬
                aResults[1].value = aResults[1].value.sort((a,b)=> a.display_order - b.display_order); // display_order 로 정렬                
                
                this.getView().setModel(new JSONModel(aResults[0].value), "oAccountTableModel")
                this.getView().setModel(new JSONModel(aResults[1].value), "oLobTableModel")

                // 테이블 로우 셋팅
                this._setVisibleRowCount(aResults);
                this._setBusy(false)
            }.bind(this))
            .catch((oErr) => {
                Modules.displayStatus(this.byId("actualOiNonMMTable1"),oErr.error.code, this.byId("actualOiNonMMBox1"));
                Modules.displayStatus(this.byId("actualOiNonMMTable2"),oErr.error.code, this.byId("actualOiNonMMBox2"));
            });

        },  

        _setVisibleRowCount: function (aResults){
            //테이블 리스트
            let aTableLists=["actualOiNonMMTable1", "actualOiNonMMTable2"]
            
            for (let i = 0; i < aTableLists.length; i++) {
                // 테이블 아이디로 테이블 객체
                let oTable = this.byId(aTableLists[i])
                // 처음 화면 렌더링시 table의 visibleCountMode auto 와 <FlexItemData growFactor="1"/>상태에서
                // 화면에 꽉 찬 테이블의 row 갯수를 전역변수에 저장하기 위함

                if (oTable) {
                    oTable.attachCellClick(this.onCellClick, this);
                    oTable.attachCellContextmenu(this.onCellContextmenu, this);
                }

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

        _setTableMerge:function(){
            let oTable1 = this.byId("actualOiNonMMTable1")
            let oTable2 = this.byId("actualOiNonMMTable2")
            Module.setTableMergeWithAltColor(oTable1, "oAccountTableModel");
            Module.setTableMergeWithAltColor(oTable2, "oLobTableModel");

           
        },

        onAfterRendering: function () {
            
            this._setTableMerge();

			
        },
        
        onFormatPerformance: function (iValue1, iValue2, sType, sTooltip) {
            return Modules.valueFormat(sType, iValue1, iValue2, sTooltip)
        },
        onFormatInfoLabel: function (iValue1, iValue2, sType) {
            return Modules.infoLabelFormat(iValue1, iValue2, sType);
        },

         /**
         * 테이블의 첫 번째 행 변경 이벤트
         * @param {Event} oEvent 
         */
         onFirstVisibleRowChanged: function (oEvent) {
           
            // 첫 번째 행이 변경된 테이블만 필드 병합
            this._setTableMerge();
        },

        

        
    });
});