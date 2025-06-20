sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",

], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.planDTSalesTable.Main", {
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
                tableKind : "org"
            }), "uIModel");
            this._setSelect();
        },

        onUiChange:function(oEvent){   
            let oUiModel = this.getView().getModel("uIModel");
            oUiModel.setProperty("/tableKind", oEvent.getSource().getSelectedKey())

            let aTableList=["planDTSalesTable1", "planDTSalesTable2", "planDTSalesTable3", "planDTSalesTable4", "planDTSalesTable5"]
            setTimeout(() => {
                aTableList.forEach(sTableId => this.byId(sTableId).rerender())
            }, 0);
            
        },

        _setSelect:function(){
            this.getView().setModel(new JSONModel({}), "SelectModel");

            let aTemp = [{
                key:"org",
                name:"조직별"
            },{
                key:"account",
                name:"Account"
            },{
                key:"assignment",
                name:"과제별"
            },{
                key:"memberCo",
                name:"멤버사 연도별 합계"
            },{
                key:"memberCo_assignment",
                name:"과제 연도별 합계"
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

            
            this.getView().setModel(new JSONModel(
                {"lastYear" : iYear-1,
                "Year" : iYear,
                "nextYear" : iYear+1,
                "theYearAfterNext" : iYear+2}
            ), "aYearList")

            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/pl_api/",
                synchronizationMode: "None",
                operationMode: "Server"
              });

            let sOrgPath =`/get_forecast_dt_org_oi(year='${iYear}',org_id='${sOrgId}')`
            let sAssingmentPath = `/get_forecast_dt_task_oi(year='${iYear}',org_id='${sOrgId}')`
            let sMemberCo_assignmentPath = `/get_forecast_dt_task_year_oi(year='${iYear}',org_id='${sOrgId}')`
            let sAccountPath = `/get_forecast_dt_account_oi(year='${iYear}',org_id='${sOrgId}')`

           await Promise.all([
                oModel.bindContext(sOrgPath).requestObject(),
                oModel.bindContext(sAssingmentPath).requestObject(),
                oModel.bindContext(sMemberCo_assignmentPath).requestObject(),
                oModel.bindContext(sAccountPath).requestObject()
            ]).then(function(aResults){
                console.log(aResults)

                // 테이블 로우 셋팅
                this._setVisibleRowCount(aResults);

                //데이터 순서 정리 => db에서 처리 될 경우 필요없음
                let aTarget1 = ["기타 사별과제", "기타 사별과제(Hy-ERP)","기타 사별과제(T-NOVA)"]
                let aTarget2 = ["기타 사별과제", "기타 사별과제(Hy-ERP)","기타 사별과제(T-NOVA)","합계"]
                // aResults[1].value = this._orderingArray(aResults[1].value, aTarget1)
                // aResults[2].value = this._orderingArray(aResults[2].value, aTarget2)
                aResults[3].value = aResults[3].value.sort((a,b)=> a.display_order - b.display_order); // display_order 로 정렬

                //모델바인딩
                this.getView().setModel(new JSONModel(aResults[0].value), "oOrgTableModel")
                this.getView().setModel(new JSONModel(aResults[1].value), "oAssignmentTableModel")                
                this.getView().setModel(new JSONModel(aResults[2].value), "oAssignmentYearTableModel")
                this.getView().setModel(new JSONModel(aResults[3].value), "oAccountTableModel")

                  
            }.bind(this)
        )

            
        },

        _setVisibleRowCount: function (aResults){
            //테이블 리스트
            let aTableLists=["planDTSalesTable1",  "planDTSalesTable3", "planDTSalesTable4", "planDTSalesTable2"]
            
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

        

        _orderingArray : function(aResult, aTarget){ //로우 데이터 순서 정리 => 디비에서 정리가 될경우 필요 없어짐
            aTarget.forEach(
                function(sKeyWord){
                    aResult.push(
                        aResult.find(oItem => oItem.name === sKeyWord)
                    )
                }
            )            

            let aFilterResult = [];

            for(let i = aResult.length-1; i >= 0; i--){
                if(!aFilterResult.find(oItem => oItem.name === aResult[i].name)){
                    aFilterResult.unshift(aResult[i])
                }                
            }
            
            return aFilterResult;
        },

        /**
         * 필드 Formatter
         * @param {String} sType 
         * @param {*} iValue 기본값
         */
        onFormatPerformance: function (iValue, sType) {
            // 값이 없을 때 0으로 돌려보냄
            if (!iValue){return;}
            

            if(sType === "tooltip" ){
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iValue);
            } else {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2
                });
                return oNumberFormat.format(iValue/100000000);
            };
        },

        onAfterRendering: function () {
            let aTableList=["planDTSalesTable1", "planDTSalesTable2", "planDTSalesTable3", "planDTSalesTable4", "planDTSalesTable5"]
            aTableList.forEach(
                function(sTableId){
                    let oTable = this.byId(sTableId);
                    this._tableHeaderSetting(oTable);                                
                }.bind(this)
            )

            // 밑단 고정
            this.byId("planDTSalesTable5").setFixedBottomRowCount(4)
            this.byId("planDTSalesTable3").setFixedBottomRowCount(3)
            
			
        },

        /**
         * 
         * @param {sap.ui.Table } oTable 
         * @param {Array} aEmphasisSetting 
         * offset : 시작점, step : 적용간격
         */
        _tableHeaderSetting : function (oTable, aEmphasisSetting=[]) {
            let aColumns = oTable.getColumns();
            let aHeaderSpan = aColumns.map((oCol) => parseInt(oCol.getProperty("headerSpan")));

            let aHeaderRow = [];
            for (const oColumn of aColumns) {
                let aMultiLabels;
                if(oColumn.getAggregation("multiLabels")){
                    aMultiLabels = oColumn.getAggregation("multiLabels");
                } else {
                    aMultiLabels = oColumn.getAggregation("label");
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

        
      

    });
});