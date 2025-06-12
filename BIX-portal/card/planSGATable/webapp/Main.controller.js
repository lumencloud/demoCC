sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus ) {
    "use strict";

    return Controller.extend("bix.card.planSGATable.Main", {
        _oEventBus : EventBus.getInstance(),

        onInit: function () {            
            this._setData();
            this._oEventBus.subscribe("pl", "search", this._setData, this);

        },


        _setData: async function(sChannelId, sEventId, oData){
            oData = JSON.parse(sessionStorage.getItem("initSearchModel"));
            console.log('1')

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;
            
            const oModel = new ODataModel({
                serviceUrl: "../odata/v4/sga-api/",
                synchronizationMode: "None",
                operationMode: "Server"
              });

            let sPath =`/get_forecast_sga_detail(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`

           await Promise.all([
                oModel.bindContext(sPath).requestObject()
            ]).then(function(aResults){
                console.log(aResults)
                this.getView().setModel(new JSONModel(aResults[0].value), "tableModel")
            }.bind(this))
        },

        _setTableMerge:function(){
            let oTable1 = this.byId("planSGATable1")
            Module.setTableMerge(oTable1, "tableModel", 1);
        },

        onAfterRendering: function () {
            let aTableList=["planSGATable1"]
            aTableList.forEach(
                function(sTableId){
                    let oTable = this.byId(sTableId);
                    this._tableHeaderSetting(oTable, []);            
                }.bind(this)
            )
            this._setTableMerge();
            
			// 카드
            const oCard = this.getOwnerComponent().oCard;
            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oCardDom = document.getElementById(sCardId);
            let oParentElement = oCardDom.parentElement;
            // 대안 1. 초기 테이블 사이즈만 고정. 이 후 창크기 조절시 테이블 크기 미변화
            // oCardDom.querySelector(".sapUiView .sapUiXMLView .sapUiViewDisplayBlock")['style'].height = `${oParentElement.clientHeight}px`

            // 대안 2. session을 통해 윈도우 크기 및 카드 크기 저장 후 변화값을 측정하여 카드 크기 변경. 사용 가능하지만 session을 많이 사용해야함.
            let iInnerHeight;
            if(!sessionStorage.getItem('detailWindow')){
                sessionStorage.setItem('detailWindow', window.innerHeight.toString());
                sessionStorage.setItem('detailDom', oParentElement.clientHeight.toString());
                iInnerHeight = oParentElement.clientHeight;
            }else{
                let iDelta = Number(sessionStorage.getItem('detailWindow')) - window.innerHeight;
                if(iDelta > 0){
                    iInnerHeight = Number(sessionStorage.getItem('detailDom')) - iDelta;
                }else if(iDelta < 0){
                    iInnerHeight = Number(sessionStorage.getItem('detailDom')) + iDelta;
                }else{
                    iInnerHeight = Number(sessionStorage.getItem('detailDom'));
                };
            };

            iInnerHeight = iInnerHeight * 0.98

            oCardDom.querySelector(".sapUiView .sapUiXMLView .sapUiViewDisplayBlock")['style'].height = `${iInnerHeight}px`
        },

        /**
         * 
         * @param {sap.ui.Table } oTable 
         * @param {Array} aEmphasisSetting 
         * offset : 시작점, step : 적용간격
         */
        _tableHeaderSetting : function (oTable, aEmphasisSetting) {
            let aColumns = oTable.getColumns();
            let aHeaderSpan = aColumns.map((oCol) => parseInt(oCol.getProperty("headerSpan")));

            let aHeaderRow = [];
            for (const oColumn of aColumns) {
                let aMultiLabels = oColumn.getAggregation("multiLabels");
                for (let i =0; i < aMultiLabels.length;i++) {
                    if (aHeaderRow[i] && !aHeaderRow[i].some(oLabel => oLabel.getId() === aMultiLabels[i].getId())) {
                        aHeaderRow[i].push(aMultiLabels[i]);
                    } else {
                        aHeaderRow.push([aMultiLabels[i]]);
                    }
                }
            }
            
            for (let i=0; i<aHeaderRow.length;i++) {
                if (i === aHeaderRow.length-1) {
                    for (let j=0; j< aHeaderSpan.length;j++) {
                        j += aHeaderSpan[j] -1;
                        aHeaderRow[i][j].addStyleClass("custom-table-white-headerline")
                    }
                    for (const oEmphais of aEmphasisSetting) {
                        let j=oEmphais.offset;
                        while (j < aHeaderRow[i].length) {
                            aHeaderRow[i][j].addStyleClass("custom-table-emphasis-col-color")
                            if (aHeaderRow[i][j-1].getDomRef()?.classList.contains("custom-table-emphasis-col-color") ?? false) {
                                aHeaderRow[i][j-1].addStyleClass("custom-table-emphasis-col-line")
                            }
                            j += oEmphais.step;
                        }
                    }
                } else {
                    for (let j=0; j< aHeaderSpan.length;j++) {
                        aHeaderRow[i][j].addStyleClass("custom-table-white-headerline")
                        j += aHeaderSpan[j] -1;
                    }
                }
            }
        },
        
        /**
         * 필드 Formatter
         * @param {String} sType 
         * @param {*} iValue 기본값
         */
        onFormatPerformance: function (iValue, sType) {
             if(sType === "tooltip" ){
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iValue);
            }else{
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 0
                });
                return oNumberFormat.format(iValue/100000000);
            }
        },

    });
});