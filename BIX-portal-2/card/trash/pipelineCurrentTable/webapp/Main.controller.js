sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
], function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("bix.card.pipelineCurrentTable.Main", {
        onInit: function () {

        },

        onBeforeRendering: function () {
            this._bindTable();
        },

        _bindTable: async function () {
            this._dummyModel();

            let oTable = this.byId("pipelineCurrentTable");
            oTable.fireFirstVisibleRowChanged({ firstVisibleRow: 0 });

            oTable.setVisible(false)

            let oFixedRowMode = new sap.ui.table.rowmodes.Auto()
            oTable.setRowMode(oFixedRowMode)

            oTable.attachEventOnce("rowsUpdated", () => {
                oTable.fireFirstVisibleRowChanged({ firstVisibleRow: 0 });
            })
            // 셀 병합 UX 개선을 위한 시간차 설정 
            setTimeout(() => { oTable.setVisible(true) }, 0.01)
        },

        // 테이블 구현 테스트를 위한 임시데이터
        _dummyModel: function () {
            const aDummyData = [
                {
                    name: "A",
                    type: "수주목표",
                    lead: "150억"
                },
                {
                    name: "A",
                    type: "건수",
                    lead: "150억"
                },
                {
                    name: "B",
                    type: "수주목표",
                    lead: "10억"
                },
                {
                    name: "B",
                    type: "건수",
                    lead: "130억"
                },
                {
                    name: "C",
                    type: "수주목표",
                    lead: "1250억"
                },
                {
                    name: "C",
                    type: "건수",
                    lead: "1500억"
                },
                {
                    name: "D",
                    type: "수주목표",
                    lead: "1250억"
                },
                {
                    name: "D",
                    type: "건수",
                    lead: "1500억"
                },
                {
                    name: "E",
                    type: "수주목표",
                    lead: "1250억"
                },
                {
                    name: "E",
                    type: "건수",
                    lead: "1500억"
                },
                {
                    name: "F",
                    type: "수주목표",
                    lead: "1250억"
                },
                {
                    name: "F",
                    type: "건수",
                    lead: "1500억"
                },
            ]

            this.getView().setModel(new JSONModel(aDummyData), "pipeLineTreeModel")
        },

        onFirstVisibleRowChanged: function (oEvent) {
            let oTable = /** @type {sap.ui.table.Table} */ (oEvent.getSource());
            let aRows = oTable.getRows();
            let aContexts = oTable.getBinding().getContexts();
            let iSkipCount = 0;

            for (let i = 0; i < aRows.length; i++) {
                let oRow = aRows[i];
                let oBindingContext = oRow.getBindingContext("pipeLineTreeModel");
                if (!oBindingContext) continue;
                const oBinding = oBindingContext.getObject();

                if (iSkipCount > 0) {
                    const oCell = document.getElementById(`${oRow.getId()}-col0`);
                    oCell?.remove();
                    iSkipCount--;
                } else {

                    const iRowSpan = aContexts.filter(ctx => {
                        const oObj = ctx.getObject();
                        return oObj.name === oBinding.name;
                    }).length;

                    const oCell = document.getElementById(`${oRow.getId()}-col0`);
                    oCell?.setAttribute("rowspan", String(iRowSpan));
                    iSkipCount = iRowSpan - 1;
                }
                continue;
            }
            // ColumnResize 시 병합 CSS 적용
            oTable.attachEventOnce("columnResize", function () {
                // 원활한 적용을 위해 시간차 설정
                setTimeout(function () {
                    let oFixedRowMode = new sap.ui.table.rowmodes.Auto()
                    oTable.setRowMode(oFixedRowMode)
                    oTable.attachEventOnce("rowsUpdated", () => {
                        oTable.fireFirstVisibleRowChanged({ firstVisibleRow: 0 });
                    })
                }, 0.01);
            })
        },

        

        

        
    });
});