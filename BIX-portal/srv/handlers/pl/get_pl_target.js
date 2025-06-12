const get_org_descendant = require('../function/get_org_descendant');

module.exports = (srv) => {
    srv.on('get_pl_target', async (req) => {
        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // 금년, 작년
        const dNow = new Date();
        const sYear = String(dNow.getFullYear());
        const sLastYear = String(dNow.getFullYear() - 1);

        // 타겟 데이터
        const pl_target = db.entities('pl').target;

        // 실적(매출, 마진) 데이터
        const pl_wideview_unpivot = db.entities('pl.view').wideview_unpivot;

        // 전체 조직
        const org_full_level = db.entities('common.view').org_full_level;

        // DB 쿼리 실행 (병렬)
        const [aTargetData, aAmountData, aOrgFullLevel, aOrgDescendant] = await Promise.all([
            SELECT.from(pl_target).columns("year", "ccorg_cd", "sale", "margin", "br").where({ year: { in: [sYear, sLastYear] } }), // 목표액 데이터
            SELECT.from(pl_wideview_unpivot).columns(["sale_ccorg_cd as ccorg_cd", "sum(sale_amount_sum) as sale", "sum(margin_amount_sum) as margin"])
                .where({ year: sLastYear, month: "13", month_amt: "12" }).groupBy("sale_ccorg_cd"), // 작년 PL 실적 (매출, 마진)
            SELECT.from(org_full_level), // 목표액 데이터
            get_org_descendant(null, null, false), // 팀보다 상위 조직인 조직 데이터 반환(조직 구조를 팀보다 상위 조직으로)
        ]);

        // TargetData에 org_full_level 속성들 붙임
        aTargetData.forEach(function (oTargetData) {
            let oOrgFullLevel = aOrgFullLevel.find(org => org.org_ccorg_cd === oTargetData.ccorg_cd);
            if (!oOrgFullLevel) return;

            // org_full_level의 속성들을 oTargetData에 붙임
            const array = Object.keys(oOrgFullLevel).map(key => ({ key, value: oOrgFullLevel[key] }));
            array.forEach(object => oTargetData[object.key] = object.value);
        });

        // amountData에 org_full_level 속성들 붙임
        aAmountData.forEach(function (oAmountData) {
            let oOrgFullLevel = aOrgFullLevel.find(org => org.org_ccorg_cd === oAmountData.ccorg_cd);
            if (!oOrgFullLevel) return;

            // org_full_level의 속성들을 oAmountData에 붙임
            const array = Object.keys(oOrgFullLevel).map(key => ({ key, value: oOrgFullLevel[key] }));
            array.forEach(object => oAmountData[object.key] = object.value);
        });

        let aFinalData = [];
        aOrgDescendant.forEach(function (oOrg) {
            // 해당 조직에 포함된 모든 조직의 목표액 반환
            const aTarget = aTargetData.filter(oTarget => {
                return oOrg.ccorg_cd === oTarget.lv1_ccorg_cd || oOrg.ccorg_cd === oTarget.lv2_ccorg_cd || oOrg.ccorg_cd === oTarget.lv3_ccorg_cd
                    || oOrg.ccorg_cd === oTarget.div_ccorg_cd || oOrg.ccorg_cd === oTarget.hdqt_ccorg_cd || oOrg.ccorg_cd === oTarget.team_ccorg_cd
            });

            // 금년, 작년 목표액
            const aCurrentTarget = aTarget.filter(oTarget => oTarget.year === sYear);
            const aLastTarget = aTarget.filter(oTarget => oTarget.year === sLastYear);

            // 해당 조직에 포함된 모든 조직의 실적 반환
            const aAmount = aAmountData.filter(oAmount => {
                return oOrg.ccorg_cd === oAmount.lv1_ccorg_cd || oOrg.ccorg_cd === oAmount.lv2_ccorg_cd || oOrg.ccorg_cd === oAmount.lv3_ccorg_cd
                    || oOrg.ccorg_cd === oAmount.div_ccorg_cd || oOrg.ccorg_cd === oAmount.hdqt_ccorg_cd || oOrg.ccorg_cd === oAmount.team_ccorg_cd
            });          

            aFinalData.push({
                id: oOrg.id,
                ccorg_cd: oOrg.ccorg_cd,
                name: oOrg.name,
                type: oOrg.type,
                parent: oOrg.parent,
                hierarchy_level: oOrg.hierarchy_level,
                drill_state: oOrg.drill_state,
                lastYearTargetSale: parseInt(aLastTarget.reduce((iSum, oData) => iSum += parseInt(oData.sale), 0)) || 0,
                lastYearTargetMargin: parseInt(aLastTarget.reduce((iSum, oData) => iSum += parseInt(oData.margin), 0)) || 0,
                lastYearTargetBr: parseInt(aLastTarget.reduce((iSum, oData) => iSum += parseInt(oData.br), 0)) || 0,
                lastYearPerformanceSale: parseInt(aAmount.reduce((iSum, oData) => iSum += parseInt(oData.sale), 0)) || 0,
                lastYearPerformanceMargin: parseInt(aAmount.reduce((iSum, oData) => iSum += parseInt(oData.margin), 0)) || 0,
                thisYearTargetSale: parseInt(aCurrentTarget.reduce((iSum, oData) => iSum += parseInt(oData.sale), 0)) || 0,
                thisYearTargetMargin: parseInt(aCurrentTarget.reduce((iSum, oData) => iSum += parseInt(oData.margin), 0)) || 0,
                thisYearTargetBr: parseInt(aCurrentTarget.reduce((iSum, oData) => iSum += parseInt(oData.br), 0)) || 0,
                newTargetSale: parseInt(aCurrentTarget.reduce((iSum, oData) => iSum += parseInt(oData.sale), 0)) || 0,
                newTargetMargin: parseInt(aCurrentTarget.reduce((iSum, oData) => iSum += parseInt(oData.margin), 0)) || 0,
                newTargetBr: parseInt(aCurrentTarget.reduce((iSum, oData) => iSum += parseInt(oData.br), 0)) || 0,
            });
        });

        // 배열 데이터를 Tree 구조로 만드는 함수
        function buildTree(oFinalData) {
            let aTree = [];
            let oLookup = [];

            oFinalData.forEach(item => {
                oLookup[item.id] = { ...item, children: [] };
            })

            oFinalData.forEach(item => {
                if (item.parent !== null && oLookup[item.parent]) {
                    oLookup[item.parent].children.push(oLookup[item.id]);
                } else {
                    aTree.push(oLookup[item.id]);
                }
            })

            function sortTree(oFinalData) {
                oFinalData.sort((a, b) => a.id - b.id);
                oFinalData.forEach(oData => {
                    if (oData.children.length > 0) {
                        sortTree(oData.children);
                    }
                })
            }

            sortTree(aTree);
            return aTree;
        }

        aFinalData = buildTree(aFinalData);

        return aFinalData;
    });
}