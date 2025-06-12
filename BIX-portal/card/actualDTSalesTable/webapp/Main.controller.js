sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",

], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.actualDTSalesTable.Main", {
        _oEventBus: EventBus.getInstance(),

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

            let aTableList=["actualDTSalesTable1", "actualDTSalesTable2", "actualDTSalesTable3"]
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
                key:"task",
                name:"과제별"
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

            let sOrgPath =`/get_actual_dt_org_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            let sAccountPath = `/get_actual_dt_account_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            let sTaskPath = `/get_actual_dt_task_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`

           await Promise.all([
                oModel.bindContext(sOrgPath).requestObject(),
                oModel.bindContext(sAccountPath).requestObject(),
                oModel.bindContext(sTaskPath).requestObject(),
            ]).then(function(aResults){
                console.log(aResults)
                aResults[1].value = aResults[1].value.sort((a,b)=> a.display_order - b.display_order); // display_order 로 정렬
                aResults[2].value = aResults[2].value.sort((a,b)=> a.display_order - b.display_order); // display_order 로 정렬


                this.getView().setModel(new JSONModel(aResults[0].value), "oOrgTableModel")
                this.getView().setModel(new JSONModel(aResults[1].value), "oAccountTableModel")
                this.getView().setModel(new JSONModel(aResults[2].value), "oTaskTableModel")

            }.bind(this)
        )
    },

        onAfterRendering: function () {
            let aTableList=["actualDTSalesTable1", "actualDTSalesTable2", "actualDTSalesTable3"]
            aTableList.forEach(
                function(sTableId){
                    let oTable = this.byId(sTableId);
                    this._tableHeaderSetting(oTable);            
                }.bind(this)
            )
            
			
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
                let aMultiLabels = oColumn.getAggregation("multiLabels");
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
        /**
         * 
         * @param {*} iValue 기본값
         * @param {*} iValue2 계산 필요시 추가 값
         * @param {*} sType 데이터 종류
         * @param {*} sType2 계산 관련 
         * @returns 
         */
        onFormatPerformance: function (iValue, iValue2, sType, sType2) {
            // 값이 없을 때 0으로 돌려보냄
            

            // 계산 필요할시 작동
            if(sType2 === "GAP"){
                iValue = iValue - iValue2
            }

            // 억단위로 들어오는 데이터 사용 
            if(sType2 === "Billion"){
                if(sType !== "tooltip"){
                    iValue = iValue*100000000
                }               
            }

            // 단위 조정
            if (sType === "마진율"|| sType === "percent") {         
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
            } else if(sType === "매출" || sType === "마진" || sType ==="billion") {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 0
                });
                return oNumberFormat.format(iValue/100000000);            
            }else{
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 0
                });
                return oNumberFormat.format(iValue);
            };
        },

      

    });
});