sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/core/EventBus",

], function (Controller, JSONModel, Module, EventBus) {
    "use strict";

    return Controller.extend("bix.card.planBrTable.Main", {
        _oEventBus : EventBus.getInstance(),

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
            
        },

        _setSelect:function(){
            this.getView().setModel(new JSONModel({}), "SelectModel");

            let aTemp = [{
                key:"account",
                name:"Account"
            }
        ];
            this.getView().setModel(new JSONModel(aTemp), "SelectModel");
        },

        
        _setData:function(){
            let aTemp = [{
                type1:"A부문",
                type2:"BR(MM)",
                total:123123,
                lead:123123,
                identified:123123,
                validated:123123,
                qualified:123123,
                negotiated:123123,
                contracted:123123,
                dealLost:123123,
                deselected:123123,
            },{
                type1:"A부문",
                type2:"BR(Cost)",
                total:123123,
                lead:123123,
                identified:123123,
                validated:123123,
                qualified:123123,
                negotiated:123123,
                contracted:123123,
                dealLost:123123,
                deselected:123123,
            }];
            this.getView().setModel(new JSONModel([]), "tableModel");
            this._setTableMerge();         

        },

        _setTableMerge:function(){
            let oTable1 = this.byId("planBrTable1")
            Module.setTableMerge(oTable1, "tableModel", 1);

           
        },

        onAfterRendering: function () {
            let aTableList=["planBrTable1"]
            aTableList.forEach(
                function(sTableId){
                    let oTable = this.byId(sTableId);
                    this._tableHeaderSetting(oTable, []);            
                }.bind(this)
            )
            
			
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

    });
});