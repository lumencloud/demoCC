sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/json/JSONModel",

  ],
  function (BaseController, EventBus,ODataModel, JSONModel) {
    "use strict";
    return BaseController.extend("bix.card.deselected.card", {
      _oEventBus: EventBus.getInstance(),

      onInit: function () {     
        this._dataSetting();       
      },

      _dataSetting : async function (){
        let {monday, sunday} = this._setDate();

      // 데이터 호출 병렬 실행
        const oModel = new ODataModel({
          serviceUrl: "../odata/v4/ai-api/",
          synchronizationMode: "None",
          operationMode: "Server"
        });

        let sPath = `/ai_agent_view3(start_date='${monday}',end_date=${sunday})/Set`

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
        aResult.forEach((oResult)=>iAmount += Number(oResult.total_target_amt)/100000000)

        // 수주금액순 정렬
        if(aResult.lenght>1){
        aResult.sort((a,b)=>b.total_target_amt - a.total_target_amt)  
        // 억 정리
        aResult.forEach((oResult)=>oResult.total_target_amt = (oResult.total_target_amt/100000000).toFixed(2))      
        }
        

        // 그룹별로 분류
        let grouped = [];

        
        let etcAmount = 0;
        aResult.forEach((oResult) => {
          if(!grouped[oResult.deselected_reason]){
            grouped[oResult.deselected_reason] = [];
          }
          grouped[oResult.deselected_reason].push(oResult);
        })

        // 기타 상위 1개
        let aGroupedArray = grouped["기타"]
        if(aGroupedArray){
        aGroupedArray.sort((a,b)=>b.length - a.length)
        

        // 기타 합계        
        aGroupedArray.forEach(oResult=>etcAmount +=  Number(oResult.total_target_amt))
        }

        // 모델용 객체 생성
        let oModel = {
          iCount: iCount,
          iAmount: iAmount.toFixed(2),
          first : aResult[0],
          second : aResult[1],
          third : aResult[2],
          forth : aResult[3]        
        }

        if(aGroupedArray){
          oModel["etc"] = aGroupedArray[0]
          oModel["etcCount"] = aGroupedArray.length
          oModel["etcAmount"] = etcAmount
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
