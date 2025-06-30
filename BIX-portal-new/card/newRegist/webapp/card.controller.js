sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/json/JSONModel",

  ],
  function (BaseController, EventBus,ODataModel, JSONModel) {
    "use strict";
    return BaseController.extend("bix.card.newRegist.card", {
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

        let sPath = `/ai_agent_view2(start_date='${monday}',end_date=${sunday})/Set`

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

        // 수주금액순 정렬
        aResult.sort((a,b)=>b.total_target_amt - a.total_target_amt)        

        // 그룹별로 분류
        let grouped = [];

        aResult.forEach((oResult) => {
          if(!grouped[oResult.biz_tp_account_nm]){
            grouped[oResult.biz_tp_account_nm] = [];
          }
          grouped[oResult.biz_tp_account_nm].push(oResult);
        })

        // 그룹 건수에 따라 상위 2개 
        let aGroupedArray = Object.values(grouped)
        aGroupedArray.sort((a,b)=>b.length - a.length)
        

        // 모델용 객체 생성
        let oModel = {
          iCount: iCount||null,
          iAmount: iAmount.toFixed(2)||null,
          first : aResult[0]||null,
          second : aResult[1]||null,
          third : aResult[2]||null,
          forth : aResult[3]||null       
        }

        if(aGroupedArray[0]){
          oModel["account1thName"] = aGroupedArray[0][0].biz_tp_account_nm
          oModel["account1thCount"] = aGroupedArray[0].length
        }

        if(aGroupedArray[1]){
          oModel["account2ndName"] = aGroupedArray[1][0].biz_tp_account_nm
          oModel["account2ndCount"] = aGroupedArray[1].length
        }
  

        
        this.getOwnerComponent().setModel(new JSONModel(oModel), "Model");

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
      }

     
    })
  }
)
