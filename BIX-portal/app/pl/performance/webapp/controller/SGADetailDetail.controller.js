sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",

], (Controller, JSONModel, MessageToast) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     */
    return Controller.extend("bix.pl.performance.controller.SGADetailDetail", {
        
        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteSGA");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: function (oEvent) {
            this.getOwnerComponent().getModel("controllerModel").setProperty("/sgaDetailDetail", this);
            this.getView().setModel(new JSONModel([]), "sgaDetailDetailTableModel");
        },

        _bindThird: function(){
            let oLayoutModel = this.getOwnerComponent().getModel("layoutControl");
            // console.log(oLayoutModel.getData());
            let aSubType = oLayoutModel.getData()["3depth_page_sub"].split("-");
            let sSeletedType = aSubType[aSubType.length-2];
            // console.log(sSeletedType)

            // 페이지 타이틀 셋팅
            let sTitle;
            for(let i = 0 ; i < aSubType.length - 1 ; i++){
                let sValue = aSubType[i];
                if(aSubType[i] === "EXPENSE" || aSubType[i] === "INVEST"|| aSubType[i] === "LABOR"){
                    switch (sValue) {
                        case "EXPENSE":
                            sValue = "경비"
                            break;
                        case "INVEST":
                            sValue = "투자비"
                            break;
                        case "LABOR":
                            sValue = "인건비"
                            break;
                    };
                }
                if(!sTitle){
                    sTitle = sValue;
                }else{
                    sTitle = sTitle + " - " + sValue;
                };
            };
            oLayoutModel.setProperty("/3depth_page_sub_title", sTitle+" 상세");

            // 테이블 셋팅
            this._setTable(sSeletedType);
        },

        _setTable:function(sChk){
            this.getView().setBusy(true);

            let aTemp;
            switch (sChk) {
                case "EXPENSE":
                    aTemp = [
                        {type: "일반비통제성"},
                        {type: "일반통제성"},
                        {type: "위임성"},
                        {type: "인건비"},
                        {type: "사내간접원가"},
                        {type: "기타복리후생비"},
                        {type: "조직운영비"},
                        {type: "조직관리비"},
                        {type: "WLB"},
                        {type: "소모품비"},
                        {type: "상각비"},
                        {type: "교육훈련비"},
                        {type: "세미나개최비"},
                        {type: "고객교육비"},
                        {type: "접대비"}
                    ];
                    break;
                case "INVEST":
                    aTemp = [
                        {type: "일반비통제성"},
                        {type: "일반통제성"},
                        {type: "위임성"},
                        {type: "인건비"},
                        {type: "사내간접원가"},
                        {type: "기타복리후생비"},
                        {type: "조직운영비"},
                        {type: "조직관리비"},
                        {type: "WLB"},
                        {type: "소모품비"},
                        {type: "상각비"},
                        {type: "교육훈련비"},
                        {type: "세미나개최비"},
                        {type: "고객교육비"},
                        {type: "접대비"}
                    ];
                    break;
                case "LABOR":
                    aTemp = [
                        {type: "일반비통제성"},
                        {type: "일반통제성"},
                        {type: "위임성"},
                        {type: "인건비"},
                        {type: "사내간접원가"},
                        {type: "기타복리후생비"},
                        {type: "조직운영비"},
                        {type: "조직관리비"},
                        {type: "WLB"},
                        {type: "소모품비"},
                        {type: "상각비"},
                        {type: "교육훈련비"},
                        {type: "세미나개최비"},
                        {type: "고객교육비"},
                        {type: "접대비"}
                    ];
                    break;
            };
            this.getView().setModel(new JSONModel(aTemp), "sgaDetailDetailTableModel");

            MessageToast.show("검색이 완료되었습니다.");
            this.getView().setBusy(false);
        },
    });
});