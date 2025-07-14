sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("bix.card.sgaDetailDetailTable.Main", {
        onInit: function () {
            this._bindTable("EXPENSE");
        },

        _bindTable: function (sChk) {
            this.getView().setBusy(true);

            let aTemp;
            switch (sChk) {
                case "EXPENSE":
                    aTemp = [
                        { type: "일반비통제성" },
                        { type: "일반통제성" },
                        { type: "위임성" },
                        { type: "인건비" },
                        { type: "사내간접원가" },
                        { type: "기타복리후생비" },
                        { type: "조직운영비" },
                        { type: "조직관리비" },
                        { type: "WLB" },
                        { type: "소모품비" },
                        { type: "상각비" },
                        { type: "교육훈련비" },
                        { type: "세미나개최비" },
                        { type: "고객교육비" },
                        { type: "접대비" }
                    ];
                    break;
                case "INVEST":
                    aTemp = [
                        { type: "일반비통제성" },
                        { type: "일반통제성" },
                        { type: "위임성" },
                        { type: "인건비" },
                        { type: "사내간접원가" },
                        { type: "기타복리후생비" },
                        { type: "조직운영비" },
                        { type: "조직관리비" },
                        { type: "WLB" },
                        { type: "소모품비" },
                        { type: "상각비" },
                        { type: "교육훈련비" },
                        { type: "세미나개최비" },
                        { type: "고객교육비" },
                        { type: "접대비" }
                    ];
                    break;
                case "LABOR":
                    aTemp = [
                        { type: "일반비통제성" },
                        { type: "일반통제성" },
                        { type: "위임성" },
                        { type: "인건비" },
                        { type: "사내간접원가" },
                        { type: "기타복리후생비" },
                        { type: "조직운영비" },
                        { type: "조직관리비" },
                        { type: "WLB" },
                        { type: "소모품비" },
                        { type: "상각비" },
                        { type: "교육훈련비" },
                        { type: "세미나개최비" },
                        { type: "고객교육비" },
                        { type: "접대비" }
                    ];
                    break;
            };
            this.getView().setModel(new JSONModel(aTemp), "sgaDetailDetailTableModel");

            MessageToast.show("검색이 완료되었습니다.");
            this.getView().setBusy(false);
        },

        

        

        
    });
});