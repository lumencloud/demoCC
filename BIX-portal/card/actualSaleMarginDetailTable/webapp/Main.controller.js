sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "../../main/util/Module",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/EventBus",

], function (Controller, JSONModel, Module, ODataModel, NumberFormat, EventBus) {
    "use strict";

    return Controller.extend("bix.card.actualSaleMarginDetailTable.Main", {
        _oEventBus: EventBus.getInstance(),

        onInit: function () {
            this._setUiModel();
            this._setTable();
            this._oEventBus.subscribe("pl", "search", this._setTable, this);

        },

        _setUiModel: function () {

            this.getView().setModel(new JSONModel({
                tableKind: "org"
            }), "uIModel");
            this._setSelect();

        },

        onUiChange: async function (oEvent) {
            this._setBusy(true)
            let oUiModel = this.getView().getModel("uIModel");
            oUiModel.setProperty("/tableKind", oEvent.getSource().getSelectedKey())
            await this._setTableMerge();
            this._setBusy(false)
        },

        _setSelect: function () {
            this.getView().setModel(new JSONModel({}), "SelectModel");

            let aTemp = [{
                key: "org",
                name: "조직별"
            }, {
                key: "account",
                name: "Account"
            }, {
                key: "in/external",
                name: "대내/대외"
            }, {
                key: "new/carry_over",
                name: "신규/이월"
            }, {
                key: "own",
                name: "자회사"
            }
            ];
            this.getView().setModel(new JSONModel(aTemp), "SelectModel");
        },

        _setTable : async function(){
            this._setBusy(true)
            await this._setData()
            await this._setTableMerge()
            this._setBusy(false)
        },

        _setBusy : async function(bType){
            let aBoxList = ["actualSaleMarginDetailBox1", "actualSaleMarginDetailBox2", "actualSaleMarginDetailBox3", "actualSaleMarginDetailBox4", "actualSaleMarginDetailBox5"]
            aBoxList.forEach(sBoxId => this.byId(sBoxId).setBusy(bType))            
        },


        _setData: async function (sChannelId, sEventId, oData) {
            oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let iLastYear = dYearMonth.getFullYear() -1;
            let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;

            const oPlModel = this.getOwnerComponent().getModel("pl");
            const oCmModel = this.getOwnerComponent().getModel("cm");

            // const sOrgPath = '/org_full_level';
            // const oBinding = oCmModel.bindList(sOrgPath, undefined, undefined, undefined, {
            //     $apply:`filter(org_id eq ${sOrgId})`
            // });

            // let sOrgLevel;

            // await oBinding.requestContexts().then(ctx =>{
            //     let oOrg = ctx[0].getObject();

            //     if(oOrg.lv1_id === sOrgId){
            //         sOrgLevel ='lv1_id'
            //     }else if(oOrg.lv2_id === sOrgId){
            //         sOrgLevel ='lv2_id'
            //     }else if(oOrg.lv3_id === sOrgId){
            //         sOrgLevel ='lv3_id'
            //     }else if(oOrg.div_id === sOrgId){
            //         sOrgLevel ='div_id'
            //     }else if(oOrg.hdqt_id === sOrgId){
            //         sOrgLevel ='hdqt_id'
            //     }else if(oOrg.team_id === sOrgId){
            //         sOrgLevel ='team_id'
            //     }
            // });

            // const sTargetPath = '/annual_target_temp_view';
            // const sPlPath = '/wideview_view'

            // let sTargetFilter=`is_total eq true and year in ('${iYear}','${iLastYear}')`
            // let aTargetGroupBy=[`year`,'sale_target','margin_rate_target']
            // let sTargetAggregate=`sale_target with sum`

            // let sPlFilter=`year in ('${iYear}','${iLastYear}') and month_amt eq ${sMonth} and src_type not in ('WA','D')`
            // let aPlGroupBy=['year']
            // let sPlAggregate;
            // let aPlAggregate=[]
            // let sPlOrderby=``;

            // for(let i=1; i<= Number(sMonth); i++){
            //     aPlAggregate.push(`sale_m${i}_amt with sum`)
            //     aPlAggregate.push(`margin_m${i}_amt with sum`)
            // }
            // sPlAggregate=aPlAggregate.join(', ');
            
            // if(sOrgLevel !== 'lv1_id'){
            //     sTargetFilter += `and ${sOrgLevel} eq ${sOrgId} and ${sOrgLevel} ne null`
            // }

            // if(sOrgLevel === 'div_id'){
            //     aTargetGroupBy.push('hdqt_id')
            //     aTargetGroupBy.push('hdqt_name')
            //     aPlGroupBy.push('hdqt_id')
            //     aPlGroupBy.push('hdqt_name')
            // }else if(sOrgLevel === 'hdqt_id' || sOrgLevel === 'team_id'){
            //     aTargetGroupBy.push('team_id')
            //     aTargetGroupBy.push('team_name')
            //     aPlGroupBy.push('team_id')
            //     aPlGroupBy.push('team_name')
            // }else{
            //     aTargetGroupBy.push('div_id')
            //     aTargetGroupBy.push('div_name')
            //     aPlGroupBy.push('div_id')
            //     aPlGroupBy.push('div_name')
            // }

            // const oTargetBinding = oCmModel.bindList(sTargetPath, undefined, undefined, undefined, {
            //     $$updateGroupId: "Multilingual",
            //     $apply:`filter(${sTargetFilter})/groupby((${aTargetGroupBy}))`
            // });
            // let aResults = await oTargetBinding.requestContexts(0, Infinity);

            let sOrgPath = `/get_actual_sale_org_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            let sAccountPath = `/get_actual_sale_account_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            let sTernalPath = `/get_actual_sale_relsco_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            let sOverPath = `/get_actual_sale_crov_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`
            let sOwnPath = `/get_actual_sale_sub_company_pl(year='${iYear}',month='${sMonth}',org_id='${sOrgId}')`

            await Promise.all([
                oPlModel.bindContext(sOrgPath).requestObject(),
                oPlModel.bindContext(sAccountPath).requestObject(),
                oPlModel.bindContext(sTernalPath).requestObject(),
                oPlModel.bindContext(sOverPath).requestObject(),
                oPlModel.bindContext(sOwnPath).requestObject(),
            ]).then(function (aResults) {
                console.log(aResults)
                //열 정리
                aResults[1].value = aResults[1].value.sort((a, b) => a.display_order - b.display_order); // display_order 로 정렬

                //모델바인딩
                this.getView().setModel(new JSONModel(aResults[0].value), "oOrgTableModel")
                this.getView().setModel(new JSONModel(aResults[1].value), "oAccountTableModel")
                this.getView().setModel(new JSONModel(aResults[2].value), "oTernalTableModel")
                this.getView().setModel(new JSONModel(aResults[3].value), "oOverTableModel")
                this.getView().setModel(new JSONModel(aResults[4].value), "oOwnTableModel")

            }.bind(this)
            )


        },

        _setTableMerge: async function () {
            let aTableList = ["actualSaleMarginDetailTable1", "actualSaleMarginDetailTable2", "actualSaleMarginDetailTable3", "actualSaleMarginDetailTable4", "actualSaleMarginDetailTable5"]
            let aMergeSize = [1,1,2,2,1]
            let aModelList = ["oOrgTableModel", "oAccountTableModel", "oTernalTableModel", "oOverTableModel", "oOwnTableModel"] 

            for(let i = 0; i<aTableList.length; i++){
                Module.setTableMerge(this.byId(aTableList[i]), aModelList[i], aMergeSize[i])                
            }

        },

        onAfterRendering: function () {
            let aTableList = ["actualSaleMarginDetailTable1", "actualSaleMarginDetailTable2", "actualSaleMarginDetailTable3", "actualSaleMarginDetailTable4", "actualSaleMarginDetailTable5"]
            aTableList.forEach(
                function (sTableId) {
                    let oTable = this.byId(sTableId);                    
                    this._tableHeaderSetting(oTable);
                }.bind(this)
            )
        },

        /**
         * 
         * @param {sap.ui.Table } oTable 
         * @param {Array} aEmphasisSetting 
         * offset : 시작점, step : 적용간격
         */
        _tableHeaderSetting: function (oTable, aEmphasisSetting = []) {
            let aColumns = oTable.getColumns();
            let aHeaderSpan = aColumns.map((oCol) => parseInt(oCol.getProperty("headerSpan")));

            let aHeaderRow = [];
            for (const oColumn of aColumns) {
                let aMultiLabels = oColumn.getAggregation("multiLabels");
                for (let i = 0; i < aMultiLabels.length; i++) {
                    if (aHeaderRow[i] && !aHeaderRow[i].some(oLabel => oLabel.getId() === aMultiLabels[i].getId())) {
                        aHeaderRow[i].push(aMultiLabels[i]);
                    } else {
                        aHeaderRow.push([aMultiLabels[i]]);
                    }
                }
            }

            for (let i = 0; i < aHeaderRow.length; i++) {
                if (i === aHeaderRow.length - 1) {
                    for (let j = 0; j < aHeaderSpan.length; j++) {
                        j += aHeaderSpan[j] - 1;
                        aHeaderRow[i][j].addStyleClass("custom-table-white-headerline")
                    }
                    for (const oEmphais of aEmphasisSetting) {
                        let j = oEmphais.offset;
                        while (j < aHeaderRow[i].length) {
                            aHeaderRow[i][j].addStyleClass("custom-table-emphasis-col-color")
                            if (aHeaderRow[i][j - 1].getDomRef()?.classList.contains("custom-table-emphasis-col-color") ?? false) {
                                aHeaderRow[i][j - 1].addStyleClass("custom-table-emphasis-col-line")
                            }
                            j += oEmphais.step;
                        }
                    }
                } else {
                    for (let j = 0; j < aHeaderSpan.length; j++) {
                        aHeaderRow[i][j].addStyleClass("custom-table-white-headerline")
                        j += aHeaderSpan[j] - 1;
                    }
                }
            }
        },

        onFormatPerformance: function (iValue, iValue2, sType, sType2) {
            // 값이 없을 때 0으로 돌려보냄
            // 

            // 계산 필요할시 작동
            if (sType2 === "GAP") {
                iValue = iValue - iValue2
            }

            // 억단위로 들어오는 데이터 사용 
            if (sType2 === "Billion") {
                if (sType !== "tooltip") {
                    iValue = iValue * 100000000
                }
            }


            // 단위 조정
            if (sType === "마진율" || sType === "percent") {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });
                return oNumberFormat.format(iValue) + "%";
            } else if (sType === "tooltip") {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iValue);
            } else if (sType === "매출" || sType === "마진") {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 0
                });
                return oNumberFormat.format(iValue / 100000000);
            } else {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 0
                });
                return oNumberFormat.format(iValue);
            };
        },

    });
});