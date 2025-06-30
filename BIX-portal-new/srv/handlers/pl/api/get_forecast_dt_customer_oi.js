const e = require("express");

module.exports = (srv) => {
    srv.on("get_forecast_dt_customer_oi", async (req) => {
        /**
         * API 리턴값 담을 배열 선언
         */
        const oResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to("db");

        // =========================== 조회 대상 DB 테이블 ===========================
        // entities('<cds namespace 명>').<cds entity 명>
        // srv .cds 에 using from 구문에 엔티티가 속한 db .cds 파일이 최소 한 번이라도 걸려있어야 db.entities 로 엔티티 인식가능
        // (서비스에 등록할 필요는 없음)

        const pl_view = db.entities("pl").wideview_dt_view;
        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;

        const customer_view = db.entities("common").customer;

        const { year, org_id } = req.data;
        const last_year = Number(year) - 1;

        /**
         * org_id 파라미터값으로 조직정보 조회
         */
        const org_col = `case
            when lv1_id = '${org_id}' THEN 'lv1_ccorg_cd'
            when lv2_id = '${org_id}' THEN 'lv2_ccorg_cd'
            when lv3_id = '${org_id}' THEN 'lv3_ccorg_cd'
            when div_id = '${org_id}' THEN 'div_ccorg_cd'
            when hdqt_id = '${org_id}' THEN 'hdqt_ccorg_cd'
            when team_id = '${org_id}' THEN 'team_ccorg_cd'
            end as org_level`;

        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, "org_ccorg_cd"]).where({ org_id: org_id });
        if (!orgInfo) return "조직 조회 실패"; // 화면 조회 시 유효하지 않은ㄹ 조직코드 입력시 예외처리 추가 필요 throw error

        let org_level = orgInfo.org_level;
        let org_ccorg_cd = orgInfo.org_ccorg_cd;

        const dt_pl_col_list = [
            'year', 'cstco_cd', 'sum(ifnull(sale_year_amt,0)) as sale_year_sum', 'sort_order'];
        const dt_pl_where_conditions = { 'src_type': { '!=': 'WA' } };
        const dt_pl_groupBy = ['year', 'sort_order', 'cstco_cd'];
        let dt_pl_where = org_level === 'lv1_ccorg_cd' ? dt_pl_where_conditions : { ...dt_pl_where_conditions, [org_level]: org_ccorg_cd };
        const [dt_pl_data, dt_customer_data] = await Promise.all([
            SELECT.from(pl_view).columns(dt_pl_col_list).where(dt_pl_where).groupBy(...dt_pl_groupBy),
            SELECT.from(customer_view).columns(['code', 'name'])
        ]);

        let o_result_data = {}
        let o_total = {
            "sort_order": 0,
            "id": 'total',
            "name": "합계",
            "year" : ''
        }
        dt_pl_data.forEach(a => {
            const o_customer = dt_customer_data.find(customer => customer.code === a.cstco_cd);
            const year = a.year;

            if (o_customer) {
                if (!o_result_data[`${o_customer.code}`]) {
                    o_result_data[`${o_customer.code}`] = { id: o_customer.code, name: o_customer.name };
                }
                o_result_data[`${o_customer.code}`][year] = (o_result_data[`${o_customer.code}`][year] || 0) + a.sale_year_sum
                o_result_data[`${o_customer.code}`]['total_sale'] = (o_result_data[`${o_customer.code}`]['total_sale'] || 0) + a.sale_year_sum
                o_result_data[`${o_customer.code}`]['sort_order'] = a.sort_order;
            }
            o_total['total_sale'] = (o_total['total_sale'] || 0) + a.sale_year_sum
            o_total[year] = (o_total[year] || 0) + a.sale_year_sum;
        })
        const a_result = Object.values(o_result_data)

        oResult.push(o_total,...a_result)

        let a_sort_field = [
            { field: "sort_order", order: "asc" }
        ];
        oResult.sort((oItem1, oItem2) => {
            for (const { field, order } of a_sort_field) {
                // 필드가 null일 때
                if (oItem1[field] === null && oItem2[field] !== null) return -1;
                if (oItem1[field] !== null && oItem2[field] === null) return 1;
                if (oItem1[field] === null && oItem2[field] === null) continue;

                if (typeof oItem1[field] === "number") {
                    var result = oItem1[field] - oItem2[field];
                } else {
                    var result = oItem1[field].localeCompare(oItem2[field]);
                }
                if (result !== 0) {
                    return (order === "asc") ? result : -result;
                }
            }
            return 0;
        })

        return oResult;
    });
};
