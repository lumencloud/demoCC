sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "../../main/util/Module",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v4/ODataModel",

  ],
  function (BaseController, EventBus, Module, JSONModel, ODataModel) {
    "use strict";
    return BaseController.extend("bix.card.scheduledBiddingProjectsBau.card", {
      _oEventBus: EventBus.getInstance(),

      onInit: function () {     
        this._dataSetting();       
      },

      _dataSetting : async function (){
        let {monday, sunday} = this._setDate();

        const oModel = new ODataModel({
          serviceUrl: "../odata/v4/ai-api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });

        let sPath = `/ai_agent_bau_view6(start_date='${monday}',end_date=${sunday})/Set`

        await oModel.bindContext(sPath).requestObject().then(
          function(aResult){
            
            this._modelSetting(aResult.value);
          }.bind(this)

        )

      },

      _modelSetting: function (aResult){
        // 총 건수
        let iCount = aResult.length;        

        // 총 금액
        let iAmount = 0;
        aResult.forEach((oResult)=>iAmount += Number(oResult.total_target_amt))

               
        this.getView().setModel(new JSONModel(aResult), "model");
        let oTable = this.byId("table")
        Module.setTableMerge(oTable, "model", 3);
        oTable.setVisibleRowCountMode("Fixed")
        oTable.setVisibleRowCount(iCount)
        oTable.setNoData("차주 입찰 예정 건이 없습니다.")

        let subTitle = `(총 ${iAmount.toFixed(2)}억원 / ${iCount}건)`
        this.getOwnerComponent().oCard.getAggregation("_header").setProperty("subtitle", subTitle)

      },

      _setDate : function (){
        let today = new Date();
        let day = today.getDay();

        let monday = new Date(today);
        monday.setDate(today.getDate() - ((day + 6 ) % 7));

        let sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6 );
        
        return{
          monday:this._formatDate(monday), 
          sunday:this._formatDate(sunday)
        }

        
      },

      _formatDate: function(date){
        let year = date.getFullYear();
        let month = String(date.getMonth()+1).padStart(2, '0');
        let day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`
      },

      
     
    })
  }
)
