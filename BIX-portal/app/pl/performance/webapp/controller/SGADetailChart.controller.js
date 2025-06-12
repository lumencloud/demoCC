sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    'sap/viz/ui5/format/ChartFormatter',
    'sap/viz/ui5/api/env/Format',
    "../../../main/util/Module",
    "sap/ui/core/format/NumberFormat",
], (Controller, JSONModel, ChartFormatter, Format, Module, NumberFormat) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     */
    return Controller.extend("bix.pl.performance.controller.SGADetailChart", {

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
            this.getOwnerComponent().getModel("controllerModel").setProperty("/sgaChart", this);

            // this._setData();
            this.getView().setModel(new JSONModel({}), "sgaDetailTreeTableModel2");
            this.getView().setModel(new JSONModel({}), "chartModel");

            this._bindThird();
        },

        //작업해야 할 함수
        _bindThird: async function (oEvent) {
            let oPlController = this.getOwnerComponent().getModel("controllerModel").getProperty("/pl");
            if (!oPlController) return;
            let oPlTable = oPlController._getTable();
            let sBindingPath = oPlTable.getBinding("rows")?.getPath();

            // PL 테이블이 검색되지 않은 상태라면 Return
            if (!sBindingPath) return;

            // PL 테이블이 검색되었는지 확인
            const regex = /([a-zA-Z]+)='([^']+)'/g;
            let oParams = {};
            let match;
            while ((match = regex.exec(sBindingPath)) !== null) {
                oParams[match[1]] = match[2];
            }

            // 검색 전
            if (Object.keys(oParams).length === 0) {
                return;
            };

            this.getView().setBusy(true);

            let sYear = oParams.year;
            let sMonth = oParams.month;
            let sOrgId = oParams.id;

            // let sUrl = `/odata/v4/sgna/mis_get_pl_sgna(year='${sYear}',month='${sMonth}',id='${sOrgId}')/Set`
            //     + `?$orderby=level2 asc`
            // let sUrl = `/odata/v4/sgna/get_sga_result_detail(year='${sYear}',month='${sMonth}',org_id='${sOrgId}')`
            let sUrl = `/odata/v4/sga-api/get_sga_performance(year='${sYear}',month='${sMonth}',org_id='${sOrgId}')`
            let aResults = await Module._getData(sUrl);
            aResults = aResults.value;

            this.getView().setModel(new JSONModel(aResults), "sgaDetailTreeTableModel2");

            //차트에 넣을 임시 데이터
            let aChartData = [];
            aResults.forEach(oResult => {
                // 최상위 레벨일 때 Return
                if (oResult.level2 === null) return;

                // 부문이 같은 데이터
                let oFilteredData = aChartData.find(oChartData => {
                    return oChartData["부문"] === oResult.level2
                        && oChartData.level1 === oResult.level1;
                });

                if (!oFilteredData) {
                    aChartData.push({
                        level1 : oResult.level1,
                        부문: oResult.level2,
                        인건비: (oResult.type === "LABOR") ? oResult.performanceCurrentYearMonth : 0,
                        투자비: (oResult.type === "INVEST") ? oResult.performanceCurrentYearMonth : 0,
                        경비: (oResult.type === "EXPENSE") ? oResult.performanceCurrentYearMonth : 0,
                    })
                } else {
                    if (oResult.type === "LABOR") {
                        oFilteredData["인건비"] = oResult.performanceCurrentYearMonth;
                    } else if (oResult.type === "INVEST") {
                        oFilteredData["투자비"] = oResult.performanceCurrentYearMonth;
                    } else if (oResult.type === "EXPENSE") {
                        oFilteredData["경비"] = oResult.performanceCurrentYearMonth;
                    }
                }
            })
            this.getView().setModel(new JSONModel(aChartData), "chartModel");

            //차트 예제
            Format.numericFormatter(ChartFormatter.getInstance());
            let oFormatPattern = ChartFormatter.DefaultPattern;
            this.getView().getControlsByFieldGroupId("Chart").forEach(function (object) {
                if (object.getFieldGroupIds().length > 0) {
                    object.setVizProperties({
                        valueAxis: {
                            title: { visible: false },
                            label: { formatString: oFormatPattern.SHORTFLOAT }
                        },
                        categoryAxis: { title: { visible: false } },
                        title: {
                            visible: false,
                            text: 'SG&A 실적'
                        },
                        legendGroup: { layout: { alignment: 'center', position: 'bottom' } },
                    });

                    let oPopOver = object.getDependents()[0];
                    oPopOver.connect(object.getVizUid());
                    oPopOver.setFormatString(oFormatPattern.STANDARDFLOAT);
                };
            }.bind(this));

            this.getView().setBusy(false);
        },

        /**
         * 필드 Formatter
         * @param {*} iValue1 기본값
         * @param {*} iValue2 제할 값
         */
        onFormatInt: function (iValue1, iValue2) {
            if (!iValue1) { iValue1 = 0 };

            // iValue2가 있을 때 iValue2 - iValue1
            let iNewValue = (iValue2) ? (iValue1 - iValue2) : iValue1 || 0;

            let oNumberFormat = NumberFormat.getIntegerInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
            });

            return oNumberFormat.format(iNewValue);
        },

        /**
         * 필드 Formatter
         * @param {*} iValue1 기본값
         * @param {*} iValue2 제할 값
         */
        onFormatPer: function (iValue1, iValue2) {
            if (!iValue1) { iValue1 = 0 };

            // iValue2가 있을 때 iValue2 - iValue1
            let iNewValue = (iValue2) ? (iValue1 - iValue2) : iValue1 || 0;

            let oNumberFormat = NumberFormat.getPercentInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
                decimals: 2,
            });

            return oNumberFormat.format(iNewValue);
        },

        /**
         * 필드 Formatter
         * @param {*} sValue 기본값
         */
        onFormatTypeText: function (sValue) {
            if (!sValue) return;

            let sNewValue;
            switch (sValue) {
                case "EXPENSE":
                    sNewValue = "경비"
                    break;
                case "INVEST":
                    sNewValue = "투자비"
                    break;
                case "LABOR":
                    sNewValue = "인건비"
                    break;
            }

            return sNewValue;
        },

        /**
         * 테이블 셋팅 및 기초 셋팅
         */
        _setData: function () {
            let aTemp = [
                {
                    type: "그룹1",
                    expense: "인건비",
                    goal: 200,
                    performanceCurrentYearMonth: 200,
                    performanceLastYearMonth: 200,
                    performanceYearMonthGap: 200,
                    performanceAttainmentRateCurrentYear: 200,
                    performanceAttainmentRateLastYear: 200,
                    performanceAttainmentRategap: 200,
                    parent_type: ""
                },
                {
                    type: "그룹1",
                    expense: "투자비",
                    goal: 200,
                    performanceCurrentYearMonth: 200,
                    performanceLastYearMonth: 200,
                    performanceYearMonthGap: 200,
                    performanceAttainmentRateCurrentYear: 200,
                    performanceAttainmentRateLastYear: 200,
                    performanceAttainmentRategap: 200,
                    parent_type: ""
                },
                {
                    type: "그룹1",
                    expense: "경비",
                    goal: 200,
                    performanceCurrentYearMonth: 200,
                    performanceLastYearMonth: 200,
                    performanceYearMonthGap: 200,
                    performanceAttainmentRateCurrentYear: 200,
                    performanceAttainmentRateLastYear: 200,
                    performanceAttainmentRategap: 200,
                    parent_type: "",
                },
                {
                    type: "그룹1-1",
                    expense: "인건비",
                    goal: 100,
                    performanceCurrentYearMonth: 100,
                    performanceLastYearMonth: 100,
                    performanceYearMonthGap: 100,
                    performanceAttainmentRateCurrentYear: 100,
                    performanceAttainmentRateLastYear: 100,
                    performanceAttainmentRategap: 100,
                    parent_type: "그룹1"
                },
                {
                    type: "그룹1-1",
                    expense: "투자비",
                    goal: 100,
                    performanceCurrentYearMonth: 100,
                    performanceLastYearMonth: 100,
                    performanceYearMonthGap: 100,
                    performanceAttainmentRateCurrentYear: 100,
                    performanceAttainmentRateLastYear: 100,
                    performanceAttainmentRategap: 100,
                    parent_type: "그룹1"
                },
                {
                    type: "그룹1-1",
                    expense: "경비",
                    goal: 100,
                    performanceCurrentYearMonth: 100,
                    performanceLastYearMonth: 100,
                    performanceYearMonthGap: 100,
                    performanceAttainmentRateCurrentYear: 100,
                    performanceAttainmentRateLastYear: 100,
                    performanceAttainmentRategap: 100,
                    parent_type: "그룹1"
                },
                {
                    type: "그룹1-2",
                    expense: "인건비",
                    goal: 100,
                    performanceCurrentYearMonth: 100,
                    performanceLastYearMonth: 100,
                    performanceYearMonthGap: 100,
                    performanceAttainmentRateCurrentYear: 100,
                    performanceAttainmentRateLastYear: 100,
                    performanceAttainmentRategap: 100,
                    parent_type: "그룹1"
                },
                {
                    type: "그룹1-2",
                    expense: "투자비",
                    goal: 100,
                    performanceCurrentYearMonth: 100,
                    performanceLastYearMonth: 100,
                    performanceYearMonthGap: 100,
                    performanceAttainmentRateCurrentYear: 100,
                    performanceAttainmentRateLastYear: 100,
                    performanceAttainmentRategap: 100,
                    parent_type: "그룹1"
                },
                {
                    type: "그룹1-2",
                    expense: "경비",
                    goal: 100,
                    performanceCurrentYearMonth: 100,
                    performanceLastYearMonth: 100,
                    performanceYearMonthGap: 100,
                    performanceAttainmentRateCurrentYear: 100,
                    performanceAttainmentRateLastYear: 100,
                    performanceAttainmentRategap: 100,
                    parent_type: "그룹1"
                },
                {
                    type: "그룹1-2-1",
                    expense: "인건비",
                    goal: 100,
                    performanceCurrentYearMonth: 100,
                    performanceLastYearMonth: 100,
                    performanceYearMonthGap: 100,
                    performanceAttainmentRateCurrentYear: 100,
                    performanceAttainmentRateLastYear: 100,
                    performanceAttainmentRategap: 100,
                    parent_type: "그룹1-2"
                },
                {
                    type: "그룹1-2-1",
                    expense: "투자비",
                    goal: 100,
                    performanceCurrentYearMonth: 100,
                    performanceLastYearMonth: 100,
                    performanceYearMonthGap: 100,
                    performanceAttainmentRateCurrentYear: 100,
                    performanceAttainmentRateLastYear: 100,
                    performanceAttainmentRategap: 100,
                    parent_type: "그룹1-2"
                },
                {
                    type: "그룹1-2-1",
                    expense: "경비",
                    goal: 100,
                    performanceCurrentYearMonth: 100,
                    performanceLastYearMonth: 100,
                    performanceYearMonthGap: 100,
                    performanceAttainmentRateCurrentYear: 100,
                    performanceAttainmentRateLastYear: 100,
                    performanceAttainmentRategap: 100,
                    parent_type: "그룹1-2"
                },
                {
                    type: "그룹2",
                    expense: "인건비",
                    goal: 100,
                    performanceCurrentYearMonth: 100,
                    performanceLastYearMonth: 100,
                    performanceYearMonthGap: 100,
                    performanceAttainmentRateCurrentYear: 100,
                    performanceAttainmentRateLastYear: 100,
                    performanceAttainmentRategap: 100,
                    parent_type: ""
                },
                {
                    type: "그룹2",
                    expense: "투자비",
                    goal: 100,
                    performanceCurrentYearMonth: 100,
                    performanceLastYearMonth: 100,
                    performanceYearMonthGap: 100,
                    performanceAttainmentRateCurrentYear: 100,
                    performanceAttainmentRateLastYear: 100,
                    performanceAttainmentRategap: 100,
                    parent_type: ""
                },
                {
                    type: "그룹2",
                    expense: "경비",
                    goal: 100,
                    performanceCurrentYearMonth: 100,
                    performanceLastYearMonth: 100,
                    performanceYearMonthGap: 100,
                    performanceAttainmentRateCurrentYear: 100,
                    performanceAttainmentRateLastYear: 100,
                    performanceAttainmentRategap: 100,
                    parent_type: "",
                },
            ];

            //트리 테이블용(사용안함)
            // let temp1 = this._makeData(aTemp)
            // let temp2 = this._buildTree(temp1)
            // console.log(temp3)

            //mtable 용 자료 만드는 함수
            let temp3 = this._buildMtable(aTemp)
            //부모 자식 레벨 깊이 확인 용 함수
            let temp4 = this.getDepth(aTemp)
            // console.log(temp4.maxDepth)

            let oTable = this.byId("table");

            //테이블 컬럼 및 아이템 없애기
            oTable.destroyColumns();
            oTable.destroyItems();

            //레벨 깊이 값을 이용 하여 컬럼 셋팅
            for (let i = 1; i <= temp4.maxDepth; i++) {
                let sLabel;
                let sField = "type" + i;
                if (i === 1) {
                    sLabel = "조직";
                } else {
                    sLabel = "";
                };

                let oNewColumn = new sap.m.Column({
                    header: new sap.m.Text({ text: sLabel }),
                    mergeDuplicates: true
                });
                oTable.addColumn(oNewColumn);
            };
            oTable.addColumn(new sap.m.Column({ header: new sap.m.Text({ text: "비용" }) }));
            oTable.addColumn(new sap.m.Column({ header: new sap.m.Text({ text: "25년 연간 목표" }) }));
            oTable.addColumn(new sap.m.Column({ header: new sap.m.Text({ text: "당월실적" }) }));
            oTable.addColumn(new sap.m.Column({ header: new sap.m.Text({ text: "전년 당월실적" }) }));
            oTable.addColumn(new sap.m.Column({ header: new sap.m.Text({ text: "실적차이" }) }));
            oTable.addColumn(new sap.m.Column({ header: new sap.m.Text({ text: "당월 진척도" }) }));
            oTable.addColumn(new sap.m.Column({ header: new sap.m.Text({ text: "전년 당월진척도" }) }));
            oTable.addColumn(new sap.m.Column({ header: new sap.m.Text({ text: "진척도차이" }) }));

            //레벨 깊이 값을 이용 하여 아이템 셋팅
            temp3.forEach(oItem => {
                let oCells = [];
                for (let i = 1; i <= temp4.maxDepth; i++) {
                    let sField = "type" + i;
                    let oText = new sap.m.Text({ text: oItem[sField] });
                    oCells.push(oText);
                };
                oCells.push(new sap.m.Text({ text: oItem.expense }));
                oCells.push(new sap.m.Text({ text: oItem.goal }));
                oCells.push(new sap.m.Text({ text: oItem.performanceCurrentYearMonth }));
                oCells.push(new sap.m.Text({ text: oItem.performanceLastYearMonth }));
                oCells.push(new sap.m.Text({ text: oItem.performanceYearMonthGap }));
                oCells.push(new sap.m.Text({ text: oItem.performanceAttainmentRateCurrentYear }));
                oCells.push(new sap.m.Text({ text: oItem.performanceAttainmentRateLastYear }));
                oCells.push(new sap.m.Text({ text: oItem.performanceAttainmentRategap }));

                let oColumListItem = new sap.m.ColumnListItem({
                    cells: oCells
                })
                oTable.addItem(oColumListItem)

            })
        },



        //데이터 자식이 있을 경우 상위 합계로 변환(트리용)
        _makeData: function (data) {
            let grouped = {};
            data.forEach(item => {
                if (!grouped[item.parent_type]) { grouped[item.parent_type] = []; }
                grouped[item.parent_type].push(item);
            });

            let parentNodes = {};

            Object.keys(grouped).forEach(parent => {
                let children = grouped[parent]

                if (parent !== "") {
                    let totalGoal = 0, performanceCurrentYearMonth = 0, performanceLastYearMonth = 0, performanceYearMonthGap = 0, performanceAttainmentRateCurrentYear = 0,
                        performanceAttainmentRateLastYear = 0, performanceAttainmentRategap = 0;

                    children.forEach(child => {
                        totalGoal += child.goal;
                        performanceCurrentYearMonth += child.performanceCurrentYearMonth;
                        performanceLastYearMonth += child.performanceLastYearMonth;
                        performanceYearMonthGap += child.performanceYearMonthGap;
                        performanceAttainmentRateCurrentYear += child.performanceAttainmentRateCurrentYear;
                        performanceAttainmentRateLastYear += child.performanceAttainmentRateLastYear;
                        performanceAttainmentRategap += child.performanceAttainmentRategap;
                    })

                    parentNodes[parent] = {
                        type: parent,
                        expense: "합계",
                        goal: totalGoal,
                        performanceCurrentYearMonth: performanceCurrentYearMonth,
                        performanceLastYearMonth: performanceLastYearMonth,
                        performanceYearMonthGap: performanceYearMonthGap,
                        performanceAttainmentRateCurrentYear: performanceAttainmentRateCurrentYear,
                        performanceAttainmentRateLastYear: performanceAttainmentRateLastYear,
                        performanceAttainmentRategap: performanceAttainmentRategap,
                        parent_type: data.find(d => d.type === parent)?.parent_type || ""
                    }
                }
            })
            let result = []

            result.push(...Object.values(parentNodes));

            Object.keys(grouped).forEach(parent => {
                grouped[parent].forEach(item => {
                    if (!parentNodes[item.type]) {
                        result.push(item)
                    }
                })
            })
            return result;
        },

        //트리 형태로 재구성(트리용)
        _buildTree: function (data) {
            data.sort((a, b) => a.type.localeCompare(b.type));

            let nodeMap = {};
            data.forEach(item => {
                let key = item.type + "_" + item.expense;
                nodeMap[key] = { ...item, children: [] };
            });
            let tree = [];

            data.forEach(item => {
                let key = item.type + "_" + item.expense;
                let parentKey = item.parent_type ? item.parent_type + "_" + "합계" : "";

                if (item.parent_type === "") {
                    tree.push(nodeMap[key])
                } else {
                    let parentNode = Object.values(nodeMap).find(n => n.type === item.parent_type && n.expense === "합계")
                    if (parentNode) {
                        parentNode.children.push(nodeMap[key])
                    }
                }
            })
            return tree;
        },

        //부모 자식 관계 깊이 파악용(mtable용)
        getDepth: function (data) {
            let depthMap = {};
            let maxDepth = 1;

            data.forEach(item => {
                let depth = 1;
                let parent = item.parent_type;

                while (parent) {
                    depth++;
                    parent = data.find(d => d.type === parent)?.parent_type || "";

                }
                depthMap[item.type] = depth;
                maxDepth = Math.max(maxDepth, depth);

            })
            return { depthMap, maxDepth }
        },

        //mtable자료 재구성(mtable용)
        _buildMtable: function (data) {
            const { depthMap, maxDepth } = this.getDepth(data);
            return data.map(item => {
                let typeHierarchy = {};
                let depth = depthMap[item.type];
                let current = item.type;

                for (let i = depth; i > 0; i--) {
                    typeHierarchy[`type${i}`] = current;
                    current = data.find(d => d.type === current)?.parent_type || "";
                }
                return { ...item, ...typeHierarchy }
            })
        },
    });
});