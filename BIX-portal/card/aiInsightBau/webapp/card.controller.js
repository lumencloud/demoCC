sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "sap/ui/model/json/JSONModel",

  ],
  function (BaseController, EventBus, JSONModel) {
    "use strict";
    return BaseController.extend("bix.card.aiInsightBau.card", {
      _oEventBus: EventBus.getInstance(),
      _bFlag: true,
      
      onInit: function () {
       this.getOwnerComponent().oCard.setBusy(true)
        this.getView().setModel(new JSONModel([{
          "title": "DT 혁신 가속화: SKT/SKHy 중심 실적 성장, 반도체/제조 자동화 대형 프로젝트 입찰 임박",
          "summary": [
            "금주 DT 파이프라인 총합 약 210억 원 규모, 우선협상 진입 프로젝트 26건(+15%), 계약완료 35건(약 56억 원)으로 전주 대비 계약금액 +68% 성장",
            " Deselected 5건 중 SKHy 및 SK매직 대형 프로젝트 각각 11억, 10억 규모 입찰 포기·기타 사유 발생",
            " AI 기반 ESG 통합관리 등 디지털 혁신 과제 중심으로 SKHy 대내기타제조 과제가 꾸준한 사업 기회 증가 ",
            " 상반기 중점 추진 사업은 SK실트론 반도체 물류자동화(총 127억 원 이상), SK바이오팜 클라우드 기반 True-up 등 클라우드·디지털 혁신 위주로 집중 예정"
          ],
          "insight": " SKHy DT 혁신 과제 성과에 집중하고, 상반기 반도체·클라우드 신사업 입찰 준비에 전사 역량 집중 권고."
        }
          ,
        {
          "title": "대형 Deselected 발생 및 우선협상 증가, SK하이닉스/실트론 중심 대형 입찰 예정",
          "summary": [
            "금주 총 4건, 2,230.5억원 규모 Deselected 발생 (SKHy DT R&D 1,100억, SK매직 자동화 1,000억 등), 전주 대비 Deselected 규모 +89.2% 증가",
            "우선협상 프로젝트는 23건/229.2억원으로 전주 대비 건수 +156%, 금액 +134% 급증했으며, SKHy/SKT 중심 DT과제(Next Gen.제조플랫폼, Digital Twin 등) 신규 진입",
            "멤버사별 계약완료는 SKT가 44.4억원으로 전체의 34.3%를 차지했으며, 과제별로는 IT통합구매(22.6억) 중심으로 실적 발생",
            "상반기 중점사업으로 SK실트론 창고자동화 3건(123.5억), SKHy 설비제어시스템(64.9억) 등 제조 DT 중심 대형 입찰 예정"
          ],
          "insight": " 고액 Deselected 프로젝트 다수로 BAU 파이프라인 리스크 확대. 소규모 우선협상 진입과 계약완료 추이 감소 지속 시 매출 기반 약화 우려. 차주 대형 금융 입찰 집중 대응 필요."
        }]
        )
          , "LLMModel")
        // this.byId("cardContent").setBusy(false);
        this.collectData = {};
        this._oEventBus.subscribe("aiReport", "aiInsight", this._setModel, this)
        this._oEventBus.subscribe("aiReport", "aiDTInsight", this._setModel, this)
      },

      _setModel: function (sChannelId, sEventId, oData) {
        this.getView().setModel(new JSONModel(), "LLMModel");
       

        this.collectData[oData.key] = oData.insight;

        this.getView().setModel(new JSONModel(this.collectData), "LLMModel")
        if(this._bFlag){
          this.dataLoad();
        }
        this.getOwnerComponent().oCard.setBusy(false)
      },
      dataLoad: function () {
        this._oEventBus.publish("CardWeekChannel", "CardWeekFullLoad", {
          cardId: this.getView().getId()
        })
        this._bFlag = false;
      },

    })
  }
)
