const get_org_descendant = require('../function/get_org_descendant');

module.exports = (srv) => {
    srv.on('get_home_chart_volatility_cost', async (req) => {
        /**
         * API 리턴값 담을 배열 선언
         */
        const aResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // function 입력 파라미터
        const { year, org_id } = req.data;

        /**
         * amount_view
         * 매출 및 원가 데이터
         */
        const amount_view = db.entities('pl.view').amount_view;

        /**
         * amount_view
         * sgna 매출 및 원가 데이터
         */
        // const sga_result_view = db.entities('sgna').sga_result_view;
        const sga_amount_view = db.entities('sga.view').sga_amount_view;

        /**
         * common.org [조직정보]
         * 조직구조 테이블
         */
        const common_org = db.entities('common').org;

        // DB 쿼리 실행 (병렬)
        const [aCommonOrg] = await Promise.all([
            SELECT.from(common_org),
        ]);
        let aFilteredOrgCcorg = get_org_descendant(aCommonOrg, org_id).map(oData => oData.ccorg_cd);

        // 마진 컬럼, 공헌이익 컬럼
        const margin_column = ["year", "month", "sum(sale_amount) as sale", "sum(prj_prfm_amount) as cos"];
        const sga_column = ["year", "month", "(ifnull(sum(labor_amount),0) + ifnull(sum(iv_amount),0) + ifnull(sum(exp_amount),0)) as amount"];

        // 병렬 실행
        const [aAmountData, aSgaData] = await Promise.all([
            SELECT.from(amount_view).columns(margin_column).where({ ccorg_cd: { in: aFilteredOrgCcorg }}).groupBy("year", "month"),
            SELECT.from(sga_amount_view).columns(sga_column).where({ ccorg_cd: { in: aFilteredOrgCcorg } }).groupBy("year", "month"),
        ]);

        // 월별 데이터 추가
        for (let i = 1; i <= 12; i++) {
            let iYear = parseInt(year);
            let iMonth = i;

            // 매출, 마진
            let iSale = aAmountData.find(oData => oData.year == iYear && oData.month == iMonth)?.sale || 0;
            let iCos = aAmountData.find(oData => oData.year == iYear && oData.month == iMonth)?.cos || 0;

            // sgna
            let iSgna = aSgaData.find(oData => oData.year == iYear)?.amount || 0;

            aResult.push({
                year: iYear,
                month: iMonth,
                sale: iSale,
                cos: iCos,
                sgna: iSgna,
            })
        }

        return aResult;
    });
}