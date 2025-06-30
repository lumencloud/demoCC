const get_org_descendant = require('../function/get_org_descendant');

module.exports = (srv) => {
    srv.on('get_pl_month_sale', async (req) => {
        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');
        const { id } = req.data;
        // const today = new Date()
        // const year = today.getFullYear();
        // const month = String(today.getMonth()+1).padStart(2,"0");

        const year = '2024';
        const month = '09';

        // 타겟 데이터
        const common_org = db.entities('common').org;
        const pl_amount_view = db.entities('pl.view').monthly_amount_view;
        // DB 쿼리 실행 (병렬)
        const [aCommonOrg, aAmountData] = await Promise.all([
            SELECT.from(common_org).columns("id", "parent", "ccorg_cd", "name", "type", "str_dt", "end_dt", "use_yn"),    // 기본 조직 데이터 
            SELECT.from(pl_amount_view).columns("year", "month", "sale_ccorg_cd", "sale_amount", "prj_prfm_amount"), // PL 금액 View
        ])

        const [aOrgDescendant] = await Promise.all([
            get_org_descendant(aCommonOrg, id),   // Hierarchy 조직 데이터 전체
        ])

        // hdbfunction 사용 샘플
        const tx = cds.transaction(req);
        // const result = await tx.run(`SELECT "F_MIS_GET_TARGET_SALE"('2824','2024') AS RESULT FROM DUMMY`);
        // console.log(result);

        let aFinalData = [];
        aOrgDescendant.forEach(function (oOrgDescendant) {
            if(oOrgDescendant.type === "1796"){
                // 조직의 하위 조직 목록
                let aChildOrg = get_org_descendant(aCommonOrg, oOrgDescendant.id).map(oData => oData.ccorg_cd);
                // 작년 매출, 원가, 마진 실적
                let iSale = aAmountData.filter(oAmount => {
                    return oAmount.year === year && oAmount.month === month && aChildOrg.includes(oAmount.sale_ccorg_cd)
                }).reduce((iSum, oData) => iSum += parseInt(oData.sale_amount), 0);
                let iPerformanceCos = aAmountData.filter(oAmount => {
                    return oAmount.year === year && oAmount.month === month && aChildOrg.includes(oAmount.sale_ccorg_cd)
                }).reduce((iSum, oData) => iSum += parseInt(oData.prj_prfm_amount), 0);
                let iMargin = iSale - iPerformanceCos;
                aFinalData.push({
                    name: oOrgDescendant.name,
                    sale: iSale,
                    margin: iMargin,
                })
            }
        })

        return aFinalData;
    });
}