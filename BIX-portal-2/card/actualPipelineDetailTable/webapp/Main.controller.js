sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
], function (Controller, JSONModel, Module ) {
    "use strict";

    return Controller.extend("bix.card.actualPipelineDetailTable.Main", {
        onInit: function () {            
            this._setUiModel();
            this._setData();
            this._setTableMerge();
        },

        _setUiModel:function(){
            this.getView().setModel(new JSONModel({
                tableKind : "stage"
            }), "uIModel");
            this._setSelect();

        },

        onUiChange:function(oEvent){   
            this._setTableMerge();         
            let oUiModel = this.getView().getModel("uIModel");
            oUiModel.setProperty("/tableKind", oEvent.getSource().getSelectedKey())
            
        },

        _setSelect:function(){
            this.getView().setModel(new JSONModel({}), "SelectModel");

            let aTemp = [{
                key:"stage",
                name:"Deal Stage 기준"
            },{
                key:"month",
                name:"월 기준"
            },{
                key:"money",
                name:"수주금액 기준"
            }
        ];
            this.getView().setModel(new JSONModel(aTemp), "SelectModel");
        },

        _setData:function(){
            let aTemp = [{
                type1:"A부문",
                type2:"수주",
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
                type2:"매출",
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
                type2:"건수",
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
            this.getView().setModel(new JSONModel(aTemp), "plUiTableModel");
        },

        _setTableMerge:function(){
            let oTable1 = this.byId("actualPipelineDetailTable1")
            let oTable2 = this.byId("actualPipelineDetailTable2")
            let oTable3 = this.byId("actualPipelineDetailTable3")
            Module.setTableMerge(oTable1, "plUiTableModel", 1);
            Module.setTableMerge(oTable2, "plUiTableModel", 1);
            Module.setTableMerge(oTable3, "plUiTableModel", 1);
        }


        

        

        
    });
});