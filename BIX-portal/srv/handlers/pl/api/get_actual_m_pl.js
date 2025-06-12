module.exports = (srv) => {
    srv.on('get_actual_m_pl', async (req) => {

        // function 호출 리턴 객체
        const aRes = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        /**
         * pl.wideview_unpivot_view [실적]
         * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl').wideview_unpivot_view;
        /**
         * sga.wideview_unpivot_view [sg&a 집계]
         * [부문/본부/팀 + 연,금액] 프로젝트 판관비 집계 뷰
         */
        const sga_view = db.entities('sga').wideview_unpivot_view;
        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;

        // function 입력 파라미터
        const { year, org_id } = req.data;

        /**
         * org_id 파라미터값으로 조직정보 조회
         */
        const org_col = `case
            when lv1_id = '${org_id}' THEN 'lv1_id'
            when lv2_id = '${org_id}' THEN 'lv2_id'
            when lv3_id = '${org_id}' THEN 'lv3_id'
            when div_id = '${org_id}' THEN 'div_id'
            when hdqt_id = '${org_id}' THEN 'hdqt_id'
            when team_id = '${org_id}' THEN 'team_id'
            end as org_level`;
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd'])
            .where({ 'org_id': org_id });

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        //조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;

        const pl_col_list = ['month_amt', 'sum(ifnull(sale_amount,0)) as sale_amount', 'sum(ifnull(margin_amount,0)) as margin_amount', 'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(margin_amount_sum,0)) as margin_amount_sum'];
        const pl_where_conditions = { 'year': year, 'src_type': { 'not in':['WA','D']} };
        const pl_groupBy_cols = ['month_amt'];

        const sga_col_list = ['month_amt', '(sum(ifnull(labor_amount,0)) + sum(ifnull(iv_amount,0)) + sum(ifnull(exp_amount,0))) as sga_amount', '(sum(ifnull(labor_amount_sum,0)) + sum(ifnull(iv_amount_sum,0)) + sum(ifnull(exp_amount_sum,0))) as sga_amount_sum'];
        const sga_where_conditions = { 'year': year, 'shared_exp_yn': false };
        const sga_groupBy_cols = ['month_amt'];

        let pl_column = pl_col_list;
        let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
        let pl_groupBy = pl_groupBy_cols;

        let sga_column = sga_col_list;
        let sga_where = org_col_nm === 'lv1_id' ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id };
        let sga_groupBy = sga_groupBy_cols;

        const [pl_data, sga_data] = await Promise.all([
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy)
        ]);

        const o_sale = {
            display_order: 1,
            type: '매출'
        }
        const o_margin = {
            display_order: 2,
            type: '마진'
        }
        const o_margin_rate = {
            display_order: 3,
            type: '마진률'
        }
        const o_sga = {
            display_order: 4,
            type: 'SG&A'
        }

        let a_month_data={}

        pl_data.forEach(a=>{
            const m_sga_data = sga_data.find(b => b.month_amt === a.month_amt);
            a_month_data[`a_${a.month_amt}_pl`]=a;
            a_month_data[`a_${a.month_amt}_sga`]=m_sga_data;
        })

        
        for(let i=1; i<13; i++){
            const s_month = i.toString().padStart(2,'0');
            o_sale[`m_${s_month}_data`] = a_month_data[`a_${s_month}_pl`]?.['sale_amount'] ?? 0;
            o_margin[`m_${s_month}_data`] = a_month_data[`a_${s_month}_pl`]?.['margin_amount'] ?? 0;
            o_margin_rate[`m_${s_month}_data`] = (a_month_data[`a_${s_month}_pl`]?.['sale_amount'] ?? 0) === 0 ? 0 : (a_month_data[`a_${s_month}_pl`]?.['margin_amount'] ?? 0) / a_month_data[`a_${s_month}_pl`]['sale_amount'] * 100;
            o_sga[`m_${s_month}_data`] = a_month_data[`a_${s_month}_sga`]?.['sga_amount'] ?? 0;
            if(i === 12){
                o_sale[`total_data`] = a_month_data[`a_${s_month}_pl`]?.['sale_amount_sum'] ?? 0;
                o_margin[`total_data`] = a_month_data[`a_${s_month}_pl`]?.['margin_amount_sum'] ?? 0;
                o_margin_rate[`total_data`] = (a_month_data[`a_${s_month}_pl`]?.['sale_amount_sum'] ?? 0) === 0 ? 0 : (a_month_data[`a_${s_month}_pl`]?.['margin_amount_sum'] ?? 0) / a_month_data[`a_${s_month}_pl`]['sale_amount_sum'] * 100;
                o_sga[`total_data`] = a_month_data[`a_${s_month}_sga`]?.['sga_amount_sum'] ?? 0;                
            }
        }

        aRes.push(o_sale, o_margin, o_margin_rate, o_sga)

        return aRes;
    })
}