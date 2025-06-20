const get_org_descendant = require('../function/get_org_descendant');

module.exports = (srv) => {
    srv.on('get_home_chart_sgna_pie', async (req) => {
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
         * sgna 매출 및 원가 데이터
         */
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
        const aFilteredOrgCcorg = get_org_descendant(aCommonOrg, org_id).map(oData => oData.ccorg_cd);

        // 마진 컬럼
        const sga_column = [
            "year", "month", 
            "ifnull(sum(labor_amount), 0) as labor",  // 인건비
            "ifnull(sum(iv_amount), 0) as invest",   // 투자비
            "ifnull(sum(exp_amount), 0) as expense",  // 경비
            "ifnull(sum(labor_amount), 0) + ifnull(sum(iv_amount), 0) + ifnull(sum(exp_amount), 0) as total"
        ];
        const sga_filter = { ccorg_cd: { in: aFilteredOrgCcorg }, year: year, month: month };

        // 병렬 실행
        const [aSgaData] = await Promise.all([
            SELECT.from(sga_amount_view).columns(sga_column).where(sga_filter).groupBy("year", "month"),
        ]);

        // 각 비용 추가
        let oSgaData = aSgaData[0];
        aResult.push({type: "인건비", amount: oSgaData?.labor || 0 });
        aResult.push({type: "투자비", amount: oSgaData?.invest || 0 });
        aResult.push({type: "경비", amount: oSgaData?.expense || 0 });

        // 백분율 추가
        aResult.forEach(oResult => {
            oResult.rate = (oSgaData?.total) ? (oResult.amount / oSgaData?.total * 100).toFixed(2) : 0;
        })

        return aResult;
    });
}