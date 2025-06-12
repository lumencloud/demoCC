sap.ui.define([

], function () {
    "use strict";

    return {
        /**
         * Edm Type을 sap.ui.model.type 타입으로 변경
         * @param {String} sEdmType 
         * @returns 
         */
        convertTypeEdmToSap: function (sEdmType) {
            let sType;
            if (sEdmType === "Edm.Float") {
                sType = "sap.ui.model.odata.type.Single"
            } else {
                sType = `sap.ui.model.odata.type.${sEdmType.split(".")[1]}`
            }

            return sType;
        },

        //숫자 소수점 2번째 자리 반올림. 소수점 1번째 자리 까지 표시. 
        convertNumber1: function(iNum){
            const roundedNumber = Math.round(iNum * 10) / 10;
            return roundedNumber.toLocaleString('ko-KR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            });
        },

        // 숫자 소수점 3번째 자리 반올림. 소수점 2번째 자리 까지 표시. 마지막에 % 붙이기
        convertPercent1: function(iNum) {
            const roundedNumber = Math.round(iNum * 100) / 100;
            return roundedNumber.toLocaleString('ko-KR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) + '%';
        },
    };
});