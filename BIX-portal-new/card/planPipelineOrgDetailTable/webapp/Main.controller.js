sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/EventBus",
    "bix/common/library/control/Modules",
    "sap/ui/core/routing/HashChanger"
], function (Controller, JSONModel, Module, ODataModel, EventBus, Modules, HashChanger) {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Select} Select
     */
    return Controller.extend("bix.card.planPipelineOrgDetailTable.Main", {
        _aTableLists: ["pipeDetailTable1", "pipeDetailTable2", "pipeDetailTable3"],
        _aBoxLists: ["pipeDetailBox1", "pipeDetailBox2", "pipeDetailBox3"],

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
            // 초기 JSON 모델 설정
            // await this._setModel();
            this._bindTable();
            this._oEventBus.subscribe("pl", "search", this._bindTable, this);
        },

        /**
         * JSON 모델 설정
         */
        // _setModel: async function () {
        //     // 데이터 불러오기 전에 모든 테이블이 보여서 먼저 선언
        //     this.getView().setModel(new JSONModel({}), "uiModel");

        //     // 현재 해시를 기준으로 DB에서 Select에 들어갈 카드 정보를 불러옴
        //     let aHash = Modules.getHashArray();
        //     let sSelectPath = `/pl_content_view(page_path='${aHash[0]}',position='detail',grid_layout_info=null,detail_path='${aHash[2]}',detail_info='${aHash[3]}')/Set`;
        //     const oListBinding = this.getOwnerComponent().getModel("cm").bindList(sSelectPath, null, null, null, {
        //         $filter: `length(sub_key) gt 0`
        //     });
        //     let aSelectContexts = await oListBinding.requestContexts();
        //     let aSelectData = aSelectContexts.map(oContext => oContext.getObject());

        //     // 카드 정보를 selectModel로 설정 (sub_key, sub_text)
        //     this.getView().setModel(new JSONModel(aSelectData), "selectModel");
        // },

        /**
         * Select 변경 이벤트
         * @param {Event} oEvent 
         */
        onUiChange: async function (oEvent) {
            // 선택한 key로 화면에 보여줄 테이블을 결정
            let sKey = /** @type {Select} */ (oEvent.getSource()).getSelectedKey();
            let oUiModel = this.getView().getModel("uiModel");
            oUiModel.setProperty("/org_id", sKey);
            
            let oData = this.getView().getModel("tableModel").getData();
            
            let aMonth = oData[1].month.filter(pl =>  pl.org_id === sKey)
            let aDeal = oData[2].deal.filter(pl =>  pl.org_id === sKey)
            let aRodr = oData[3].rodr.filter(pl =>  pl.org_id === sKey)
            
            this.getView().setModel(new JSONModel(aMonth), "oMonthTableModel")
            this.getView().setModel(new JSONModel(aDeal), "oDealTableModel")
            this.getView().setModel(new JSONModel(aRodr), "oRodrTableModel")

            // 테이블 병합
            await this._setTableMerge();

            // 해시 마지막 배열을 sKey로 변경
            // let sCurrHash = HashChanger.getInstance().getHash();
            // let aHash = sCurrHash.split("/");
            // aHash.pop();
            // aHash.push(sKey)
            // let sNewHash = aHash.join("/");
            // HashChanger.getInstance().setHash(sNewHash);

            // // PL에 detailSelect 해시 변경 EventBus 전송
            // this._oEventBus.publish("pl", "setHashModel");
        },

        _setBusy: function (bFlag) {
            this._aBoxLists.forEach((sBoxId) => this.byId(sBoxId).setBusy(bFlag))
        },

        _bindTable: async function (sChannelId, sEventId, oData) {
            // DOM이 없는 경우 Return
            // let oDom = this.getView().getDomRef();
            // if (!oDom) return;

            // detailSelect 해시에 따른 Select 선택
            // let oSelect = this.byId("detailSelect");
            // let aHash = Modules.getHashArray();
            // let sDetailKey = aHash?.[5];
            // if (sDetailKey) {   // 해시가 있는 경우 Select 설정
            //     oSelect.setSelectedKey(sDetailKey);
            // } else {    // 없는 경우 첫 번째 Select 항목 선택
            //     let oFirstDetailKey = this.getView().getModel("selectModel").getProperty("/0/sub_key");
            //     oSelect.setSelectedKey(oFirstDetailKey);
            // }

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

            let sDealPath = `/get_forecast_pl_pipeline_org_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`

            await Promise.all([
                oModel.bindContext(sDealPath).requestObject(),
            ]).then(function (aResults) {
                let oData = aResults[0].value
                let aOrg = oData[0].org
                let aMonth = oData[1].month.filter(pl =>  pl.org_id === aOrg[0].org_id)
                let aDeal = oData[2].deal.filter(pl =>  pl.org_id === aOrg[0].org_id)
                let aRodr = oData[3].rodr.filter(pl =>  pl.org_id === aOrg[0].org_id)
                // totalData 추가해서 모델 바인딩
                this.getView().setModel(new JSONModel({org_id:aOrg[0].org_id}), "uiModel");
                this.getView().setModel(new JSONModel(aResults[0].value),"tableModel");
                this.getView().setModel(new JSONModel(aOrg),'selectModel')
                this.getView().setModel(new JSONModel(aMonth), "oMonthTableModel")
                this.getView().setModel(new JSONModel(aDeal), "oDealTableModel")
                this.getView().setModel(new JSONModel(aRodr), "oRodrTableModel")

                this._monthVisibleSetting(oData[1].month);
                this._setTableMerge();

                // 테이블 로우 셋팅
                // this._setVisibleRowCount(aResults);

                this._setBusy(false)
            }.bind(this)
            )
        },

        // _addTotalData: function (aResults) {
        //     aResults.forEach(
        //         function (oResult) {
        //             let not_secured_total =
        //                 oResult.lead_data +
        //                 oResult.identified_data +
        //                 oResult.validated_data +
        //                 oResult.qualified_data +
        //                 oResult.negotiated_data;

        //             oResult["not_secured_total"] = not_secured_total;
        //         }
        //     )

        //     this.getView().setModel(new JSONModel(aResults), "oDealTableModel")
        // },

        // _setVisibleRowCount: function (aResults) {
        //     //테이블 리스트
        //     let aTableLists = this._aTableLists

        //     for (let i = 0; i < aTableLists.length; i++) {
        //         // 테이블 아이디로 테이블 객체
        //         let oTable = this.byId(aTableLists[i])
        //         // 처음 화면 렌더링시 table의 visibleCountMode auto 와 <FlexItemData growFactor="1"/>상태에서
        //         // 화면에 꽉 찬 테이블의 row 갯수를 전역변수에 저장하기 위함

        //         if (this._iColumnCount === null) {
        //             this._iColumnCount = oTable.getVisibleRowCount();
        //         }
        //         // 전역변수의 row 갯수 기준을 넘어가면 rowcountmode를 자동으로 하여 넘치는것을 방지
        //         // 전역변수의 row 갯수 기준 이하면 rowcountmode를 수동으로 하고, 각 데이터의 길이로 지정
        //         if (aResults[i].value.length > this._iColumnCount) {

        //             oTable.setVisibleRowCountMode("Auto")
        //         } else {
        //             oTable.setVisibleRowCountMode("Fixed")
        //             oTable.setVisibleRowCount(aResults[i].value.length)
        //         }
        //     }
        // },

        _monthVisibleSetting: function (aResults) {
            let aColumnsVisible = {};
            for (let i = 1; i < 13; i++) {
                let sFindColumn = "m_" + String(i).padStart(2, "0") + "_data"
                let bResult = aResults[0].hasOwnProperty(sFindColumn)
                aColumnsVisible[sFindColumn] = bResult
            }
            this.getView().setModel(new JSONModel(aColumnsVisible), "oColumnsVisibleModel")
            //console.log(this.getView().getModel("oColumnsVisibleModel"))
            //console.log(this.getView().getModel("oMonthTableModel"))
        },

        _setTableMerge: function () {

            let oTable1 = this.byId("pipeDetailTable1")
            let oTable2 = this.byId("pipeDetailTable2")
            let oTable3 = this.byId("pipeDetailTable3")
            Module.setTableMerge(oTable1, "oDealTableModel", 1);
            Module.setTableMerge(oTable2, "oMonthTableModel", 1);
            Module.setTableMerge(oTable3, "oRodrTableModel", 1);
        },

        onAfterRendering: function () {
            this._setTableMerge();
        },


        /**
         * 필드 Formatter
         * @param {String} iValue1 
         * @param {*} sType
         * @param {*} sTooltip
         */
        onFormatPerformance: function (iValue1, sType, sTooltip) {
            return Modules.valueFormat(sType, iValue1, '', sTooltip)
        },








    });
});