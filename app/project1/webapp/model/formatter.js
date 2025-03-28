sap.ui.define([
    "sap/ui/core/format/NumberFormat"
], function (NumberFormat) {
    "use strict";
    
    return {
        formatCurrencyNoDecimal: function (value) {
            if (!value && value !== 0) return "";

            // NumberFormat 인스턴스 생성
            const oFloatFormat = NumberFormat.getFloatInstance({
                groupingEnabled: true,
                groupingSeparator: ",",
                decimalSeparator: ".",
                maxFractionDigits: 0, 
                minFractionDigits: 0
            });

            return oFloatFormat.format(value);
        }
    };
});