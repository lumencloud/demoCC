sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
], function (Controller, JSONModel, Module ) {
    "use strict";

    return Controller.extend("bix.card.actualAccountTable.Main", {
        onInit: function () {            
            this._setUiModel();
            this._setData();
            this._setTableMerge();
        },

        _setUiModel:function(){
            this.getView().setModel(new JSONModel({
                tableKind : "stage"
            }), "uiModel");
            this._setSelect();

        },

        onUiChange:function(oEvent){   
            this._setTableMerge();         
            let oUiModel = this.getView().getModel("uiModel");
            oUiModel.setProperty("/tableKind", oEvent.getSource().getSelectedKey())
            
        },

        _setSelect:function(){
            this.getView().setModel(new JSONModel({}), "selectModel");

            let aTemp = [{
                key:"stage",
                name:"Deal Stage"
            },{
                key:"month",
                name:"월별"
            },{
                key:"money",
                name:"수주금액"
            }
        ];
            this.getView().setModel(new JSONModel(aTemp), "selectModel");
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
            this.getView().setModel(new JSONModel(aTemp), "tableModel");
        },

        _setTableMerge:function(){
            let oTable1 = this.byId("pipeDetailTable1")
            let oTable2 = this.byId("pipeDetailTable2")
            let oTable3 = this.byId("pipeDetailTable3")
            Module.setTableMerge(oTable1, "tableModel", 1);
            Module.setTableMerge(oTable2, "tableModel", 1);
            Module.setTableMerge(oTable3, "tableModel", 1);
        }


        

        

        
    });
});