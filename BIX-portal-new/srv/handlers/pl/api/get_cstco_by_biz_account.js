module.exports = (srv) => {
    srv.on('get_cstco_by_biz_account', async (req) => {

        /**
         * API 리턴값 담을 배열 선언
         */
        let o_result = {};

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // =========================== 조회 대상 DB 테이블 ===========================
        // entities('<cds namespace 명>').<cds entity 명>
        // srv .cds 에 using from 구문에 엔티티가 속한 db .cds 파일이 최소 한 번이라도 걸려있어야 db.entities 로 엔티티 인식가능
        // (서비스에 등록할 필요는 없음)
        /**
         * BR [실적]
         */
        const pl_wideview_view = db.entities('pl').wideview_view;

        /**
         * common.annual_target_temp_view [연 목표 정보]
         * 목표 테이블
         */
        const customer_view = db.entities("common").customer;

        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;

        // function 입력 파라미터
        const { year, month, org_id, account_cd } = req.data;
        const last_year = (Number(year) - 1).toString();

        /**
         * org_id 파라미터값으로 조직정보 조회 및 버전 확인
         */
        const org_col = `case
            when lv1_id = '${org_id}' THEN 'lv1_ccorg_cd'
            when lv2_id = '${org_id}' THEN 'lv2_ccorg_cd'
            when lv3_id = '${org_id}' THEN 'lv3_ccorg_cd'
            when div_id = '${org_id}' THEN 'div_ccorg_cd'
            when hdqt_id = '${org_id}' THEN 'hdqt_ccorg_cd'
            when team_id = '${org_id}' THEN 'team_ccorg_cd'
            end as org_level`;
        const [orgInfo] = await Promise.all([
            SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', 'org_name']).where({ 'org_id': org_id }),
        ]);

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        // 당월 누계 계산식
        let a_sum_sale = [], a_sum_margin = [];
        for (let i = 1; i <= Number(month); i++) {
            a_sum_sale.push(`sale_m${i}_amt`);
            a_sum_margin.push(`margin_m${i}_amt`);
        }
        let s_sum_sale = a_sum_sale.join("+");
        let s_sum_margin = a_sum_margin.join("+");

        // pl_wideview_view 설정
        const pl_column = ['year', 'cstco_cd',
            `sum(${s_sum_sale}) as sale`,
            `sum(${s_sum_margin}) as margin`,
            `case when sum(${s_sum_sale}) = 0 then 0 else sum(${s_sum_margin}) / sum(${s_sum_sale}) end as margin_rate`
        ];
        const pl_where = { 'year': { in: [year, last_year] }, cstco_cd: { '!=': null }, [orgInfo.org_level]: orgInfo.org_ccorg_cd, 
            biz_tp_account_cd: account_cd };
        const pl_groupBy = ['year', 'cstco_cd'];

        // customer 설정
        const customer_column = ["code", "name"];

        // DB 쿼리 실행 (병렬)
        let [pl_data, customer_data] = await Promise.all([
            SELECT.from(pl_wideview_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(customer_view).columns(customer_column),
        ]);

        // PL 데이터에 고객사 이름 붙이기
        pl_data.forEach(o_pl_data => {
            return o_pl_data["cstco_name"] = customer_data.find(o_customer_data => o_customer_data.code === o_pl_data.cstco_cd)?.name;
        })

        // 고객사명 없는 데이터 제거
        pl_data = pl_data.filter(o_pl_data => !!o_pl_data.cstco_name);

        // 금년, 작년으로 필터링
        const pl_curr_data = pl_data.filter(oData => oData.year === year);
        const pl_last_data = pl_data.filter(oData => oData.year === last_year);

        // 상위 5개의 항목만 
        let a_sale_data = pl_curr_data.sort((oItem1, oItem2) => oItem2.sale - oItem1.sale).slice(0, 5);
        let a_margin_data = pl_curr_data.sort((oItem1, oItem2) => oItem2.margin - oItem1.margin).slice(0, 5);
        let a_margin_rate_data = pl_curr_data.sort((oItem1, oItem2) => oItem2.margin_rate - oItem1.margin_rate).slice(0, 5);

        // 전년 동기 붙이기
        o_result["sale"] = a_sale_data.map(o_curr_data => {
            let o_last_data = pl_last_data.find(o_last_data => o_last_data.cstco_cd === o_curr_data.o_curr_data);
            return {
                curr_value: o_curr_data?.sale || 0,
                last_value: o_last_data?.sale || 0,
                name: o_curr_data.cstco_name,
            }
        })

        o_result["margin"] = a_margin_data.map(o_curr_data => {
            let o_last_data = pl_last_data.find(o_last_data => o_last_data.cstco_cd === o_curr_data.o_curr_data);
            return {
                curr_value: o_curr_data?.margin || 0,
                last_value: o_last_data?.margin || 0,
                name: o_curr_data.cstco_name,
            }
        })

        o_result["margin_rate"] = a_margin_rate_data.map(o_curr_data => {
            let o_last_data = pl_last_data.find(o_last_data => o_last_data.cstco_cd === o_curr_data.o_curr_data);
            return {
                curr_value: o_curr_data?.margin_rate || 0,
                last_value: o_last_data?.margin_rate || 0,
                name: o_curr_data.cstco_name,
            }
        })

        return o_result;
    });
}