sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.actualOiNonMMTable.Main", {
        _oEventBus: EventBus.getInstance(),

        onInit: function () {           
            this._setUiModel();
            this._setData();
            this._oEventBus.subscribe("pl", "search", this._setData, this);
        },

        _setUiModel:function(){
            this.getView().setModel(new JSONModel({
                tableKind : "account"
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
                key:"account",
                name:"Account"
            },{
                key:"lob",
                name:"LOB"
            }
        ];
            this.getView().setModel(new JSONModel(aTemp), "SelectModel");
        },

        
        _setData: async function (sChannelId, sEventId, oData) {
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

            let sAccountPath = `/get_actual_non_mm_account_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            let sLobPath = `/get_actual_non_mm_lob_oi(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`


            await Promise.all([
                oModel.bindContext(sAccountPath).requestObject(),
                oModel.bindContext(sLobPath).requestObject(),
            ]).then(function (aResults) {
                console.log(aResults)

                //정렬
                aResults[0].value = aResults[0].value.sort((a,b)=> a.display_order - b.display_order); // display_order 로 정렬
                aResults[1].value = aResults[1].value.sort((a,b)=> a.display_order - b.display_order); // display_order 로 정렬                

                this.getView().setModel(new JSONModel(aResults[0].value), "oAccountTableModel")
                this.getView().setModel(new JSONModel(aResults[1].value), "oLobTableModel")

            }.bind(this)
            )
        },  

        _setTableMerge:function(){
            let oTable1 = this.byId("actualOiNonMMTable1")
            let oTable2 = this.byId("actualOiNonMMTable2")
            Module.setTableMerge(oTable1, "oAccountTableModel", 1);
            Module.setTableMerge(oTable2, "oLobTableModel", 1);

           
        },

        onAfterRendering: function () {
            let aTableList=["actualOiNonMMTable1", "actualOiNonMMTable2"]
            aTableList.forEach(
                function(sTableId){
                    let oTable = this.byId(sTableId);
                    this._tableHeaderSetting(oTable);            
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

        onFormatPerformance: function (iValue, iValue2, sType, sType2) {
            // 값이 없을 때 0으로 돌려보냄
            

            // 계산 필요할시 작동
            if(sType2 === "GAP"){
                iValue = iValue - iValue2
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
            } else if(sType === "매출" || sType === "마진" ) {
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