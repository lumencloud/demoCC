sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus ) {
    "use strict";

    return Controller.extend("bix.card.planAccountTable.Main", {
        _oEventBus: EventBus.getInstance(),
        //화면에 꽉 찬 테이블의 row 갯수
        _iColumnCount : null,

        onInit: function () {            
            this._setUiModel();
            this._setData();
            this._oEventBus.subscribe("pl", "search", this._setData, this);

        },

        _setUiModel:function(){
            this.getView().setModel(new JSONModel({
                tableKind : "stage"
            }), "uIModel");
            this._setSelect();

        },

        onUiChange:function(oEvent){   
            let oUiModel = this.getView().getModel("uIModel");
            oUiModel.setProperty("/tableKind", oEvent.getSource().getSelectedKey())
            this._setTableMerge();

        },

        _setSelect:function(){
            this.getView().setModel(new JSONModel({}), "SelectModel");

            let aTemp = [{
                key:"deal",
                name:"Deal Stage"
            },{
                key:"month",
                name:"월별"
            },{
                key:"rodr",
                name:"수주금액"
            }
        ];
            this.getView().setModel(new JSONModel(aTemp), "SelectModel");
        },

        _setData: async function(sChannelId, sEventId, oData){
            oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;
            
            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
              });

            let sDealPath =`/get_forecast_pl_pipeline_account(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='deal')`
            let sMonthPath = `/get_forecast_pl_pipeline_account(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='month')`
            let sRodrPath = `/get_forecast_pl_pipeline_account(year='${iYear}',month='${sMonth}',org_id='${sOrgId}',type='rodr')`

           await Promise.all([
                oModel.bindContext(sDealPath).requestObject(),
                oModel.bindContext(sMonthPath).requestObject(),
                oModel.bindContext(sRodrPath).requestObject(),
            ]).then(function(aResults){
                console.log(aResults)
                this.getView().setModel(new JSONModel(aResults[0].value), "oDealTableModel")
                this.getView().setModel(new JSONModel(aResults[1].value), "oMonthTableModel")
                this.getView().setModel(new JSONModel(aResults[2].value), "oRodrTableModel")

                this._monthVisibleSetting(aResults[1].value);

                // 테이블 로우 셋팅
                this._setVisibleRowCount(aResults);

            }.bind(this)
        )
    },

    _setVisibleRowCount: function (aResults){
        //테이블 리스트
        let aTableLists=["planAccountTable1", "planAccountTable2", "planAccountTable3"]
        
        for(let i =0; i<aTableLists.length; i++){
            // 테이블 아이디로 테이블 객체
            let oTable = this.byId(aTableLists[i])    
            // 처음 화면 렌더링시 table의 visibleCountMode auto 와 <FlexItemData growFactor="1"/>상태에서
            // 화면에 꽉 찬 테이블의 row 갯수를 전역변수에 저장하기 위함
            
            if(this._iColumnCount === null){
                this._iColumnCount = oTable.getVisibleRowCount();
            }
            // 전역변수의 row 갯수 기준을 넘어가면 rowcountmode를 자동으로 하여 넘치는것을 방지
            // 전역변수의 row 갯수 기준 이하면 rowcountmode를 수동으로 하고, 각 데이터의 길이로 지정
            if(aResults[i].value.length > this._iColumnCount){
                
                oTable.setVisibleRowCountMode("Auto")
            } else {
                oTable.setVisibleRowCountMode("Fixed")
                oTable.setVisibleRowCount(aResults[i].value.length)
            }
        }
    },

    _monthVisibleSetting : function(aResults) {
        let aColumnsVisible = {};
        for(let i=1; i<13; i++){
            let sFindColumn = "m_"+String(i).padStart(2, "0")+"_data"
            let bResult = aResults[0].hasOwnProperty(sFindColumn)
            aColumnsVisible[sFindColumn] = bResult 
        }
        this.getView().setModel(new JSONModel(aColumnsVisible), "oColumnsVisibleModel")
        //console.log(this.getView().getModel("oColumnsVisibleModel"))
        //console.log(this.getView().getModel("oMonthTableModel"))
    },

        _setTableMerge:function(){
            let oTable1 = this.byId("planAccountTable1")
            let oTable2 = this.byId("planAccountTable2")
            let oTable3 = this.byId("planAccountTable3")
            Module.setTableMerge(oTable1, "oDealTableModel", 1);
            Module.setTableMerge(oTable2, "oMonthTableModel", 1);
            Module.setTableMerge(oTable3, "oRodrTableModel", 1);
        },

        onAfterRendering: function () {
            let aTableList=["planAccountTable1", "planAccountTable2", "planAccountTable3"]
            aTableList.forEach(
                function(sTableId){
                    let oTable = this.byId(sTableId);
                    this._tableHeaderSetting(oTable, []);            
                }.bind(this)
            )
            this._setTableMerge();
            
			
        },

        /**
         * 
         * @param {sap.ui.Table } oTable 
         * @param {Array} aEmphasisSetting 
         * offset : 시작점, step : 적용간격
         */
        _tableHeaderSetting : function (oTable, aEmphasisSetting) {
            let aColumns = oTable.getColumns();
            let aHeaderSpan = aColumns.map((oCol) => parseInt(oCol.getProperty("headerSpan")));

            let aHeaderRow = [];
            for (const oColumn of aColumns) {
                let aMultiLabels;
                if(oColumn.getAggregation("multiLabels")){
                    aMultiLabels= oColumn.getAggregation("multiLabels");
                } else {
                    aMultiLabels= oColumn.getAggregation("label");
                }
                 
                for (let i =0; i < aMultiLabels.length;i++) {
                    if (aHeaderRow[i] && !aHeaderRow[i].some(oLabel => oLabel.getId() === aMultiLabels[i].getId())) {
                        aHeaderRow[i].push(aMultiLabels[i]);
                    } else {
                        aHeaderRow.push([aMultiLabels[i]]);
                    }
                }
            }
            
            for (let i=0; i<aHeaderRow.length;i++) {
                if (i === aHeaderRow.length-1) {
                    for (let j=0; j< aHeaderSpan.length;j++) {
                        j += aHeaderSpan[j] -1;
                        aHeaderRow[i][j].addStyleClass("custom-table-white-headerline")
                    }
                    for (const oEmphais of aEmphasisSetting) {
                        let j=oEmphais.offset;
                        while (j < aHeaderRow[i].length) {
                            aHeaderRow[i][j].addStyleClass("custom-table-emphasis-col-color")
                            if (aHeaderRow[i][j-1].getDomRef()?.classList.contains("custom-table-emphasis-col-color") ?? false) {
                                aHeaderRow[i][j-1].addStyleClass("custom-table-emphasis-col-line")
                            }
                            j += oEmphais.step;
                        }
                    }
                } else {
                    for (let j=0; j< aHeaderSpan.length;j++) {
                        aHeaderRow[i][j].addStyleClass("custom-table-white-headerline")
                        j += aHeaderSpan[j] -1;
                    }
                }
            }
        },

         /**
         * 필드 Formatter
         * @param {String} sType 
         * @param {*} iValue 기본값
         */
         onFormatPerformance: function (iValue, sType) {
            // 값이 없을 때 0으로 돌려보냄
            if (!iValue){return;}

            if (sType === "percent") {         
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });
                return oNumberFormat.format(iValue) + "%";
            } else if(sType === "tooltip" ){
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iValue);
            } else if(sType === "수주"||sType === "매출"){
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2
                });
                return oNumberFormat.format(iValue/100000000);
            } else if(sType === "건수"){
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 0
                });
                return oNumberFormat.format(iValue);
            }

        },



        

        

        
    });
});