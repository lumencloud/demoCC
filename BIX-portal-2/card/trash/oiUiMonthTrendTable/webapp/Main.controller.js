
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Sorter",
    "sap/ui/core/EventBus",
    "sap/ui/core/format/NumberFormat",

], function (Controller, Sorter, EventBus, NumberFormat) {
    "use strict";

    return Controller.extend("bix.card.oiUiMonthTrendTable.Main", {
        _sTableId: "oiUiMonthTrendTable",
        _oEventBus: EventBus.getInstance(),


        onInit: function () {            
            this._bindTable();
        },
        
        _bindTable: async function () {
            this.getView().setBusy(true);

            let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();            
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;           

            
            // 테이블 바인딩
            let sPath = `/get_actual_m_oi(year='${iYear}',org_id='${sOrgId}')`
            let oTable = this.byId(this._sTableId);

            oTable.bindRows({
                path: sPath,
                sorter: new Sorter({ path: "display_order" }),
                events: {
                    dataRequested: function () {
                        oTable.setBusy(true);
                    }.bind(this),
                    dataReceived: function () {
                        oTable.setBusy(false);
                    }.bind(this),
                }
            })

            this.getView().setBusy(false);
        },

        onFormatPerformance: function (sType, iValue1, iValue2, sTooltip) {
            // 값이 없을 때 return
            if (!iValue1) return;

            // iValue2가 있을 때 iValue2 - iValue1
            let iNewValue = (iValue2 && !isNaN(iValue2)) ? (iValue1 - iValue2) : iValue1;

            if (sType === "RoHC" || sType === "BR" ||sTooltip === "percent") {
               
                var oNumberFormat = NumberFormat.getIntegerInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });

                return oNumberFormat.format(iNewValue) + "%";
            } else if (sType === "수주 건수" || sType === "매출 건수") {
               
                var oNumberFormat = NumberFormat.getIntegerInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 0,
                });

                return oNumberFormat.format(iNewValue) + "건";
            } 
            else if (sTooltip === "tooltip") {
                var oNumberFormat = NumberFormat.getIntegerInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iNewValue);
            } else {
                iNewValue = iNewValue >= 0 ? Math.floor(iNewValue / 100000000) : Math.ceil(iNewValue / 100000000);

                var oNumberFormat = NumberFormat.getIntegerInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                
                return oNumberFormat.format(iNewValue)// + "억";
            };

        },


        



    });
});