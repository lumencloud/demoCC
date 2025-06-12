const get_org_descendant = require('../function/get_org_descendant');

module.exports = (srv) => {
    srv.on('get_pl_performance_tile_quarter', async (req) => {
        /**
         * API 리턴값 담을 배열 선언
         */
        const aResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // function 입력 파라미터
        const { year, month, org_id } = req.data;

        /**
         * amount_view
         * 매출 및 원가 데이터
         */
        const amount_view = db.entities('pl.view').amount_view;

        /**
         * common.org [조직정보]
         * 조직구조 테이블
         */
        const common_org = db.entities('common').org;

        // DB 쿼리 실행 (병렬)
        const [aCommonOrg] = await Promise.all([
            SELECT.from(common_org),
        ]);
        const aFilteredOrgCcorg = get_org_descendant(aCommonOrg, org_id).map(oData => oData.ccorg_cd);

        // amount 열
        const amount_column = ["year", "month", "sum(sale_amount) as sale", "sum(prj_prfm_amount) as cos"];
        
        // 병렬 실행
        // const [aAmountData] = await Promise.all([
        //     SELECT.from(amount_view).columns(amount_column).where({ ccorg_cd: { in: aFilteredOrgCcorg }}).groupBy("year", "month"),
        // ]);

        // for (let i = 3; i > 0 ; i--) {
        //     let iYear = new Date(year, month - i).getFullYear();
        //     let iMonth = new Date(year, month - i).getMonth() + 1;

        //     // 기초원가(비용)
        //     let iSale = aAmountData.find(oData => oData.year == iYear && oData.month == iMonth)?.sale || 0;
        //     let iCos = aAmountData.find(oData => oData.year == iYear && oData.month == iMonth)?.cos || 0;
        //     let iMargin = iSale - iCos;

        //     aResult.push({
        //         year: iYear,
        //         month: iMonth,
        //         sale: iSale,
        //         margin: iMargin,
        //     })
        // }

        return aResult;
    });
}