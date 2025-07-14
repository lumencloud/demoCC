const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_m_oi', async (req) => {
        /**
         * 핸들러 초기에 권한체크
         */
        await check_user_auth(req);

        // function 호출 리턴 객체
        const aRes = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        /**
         * pl.wideview_unpivot_view [실적]
         * [부문/본부/팀 + month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl').wideview_unpivot_view;
        /**
         * sga.wideview_unpivot_view [sg&a 집계]
         * [부문/본부/팀 + month_amt,금액] 프로젝트 판관비 집계 뷰
         */
        const sga_view = db.entities('sga').wideview_unpivot_view;
        /**
         * rsp.wideview_unpivot_view [비용 집계]
         * [부문/본부/팀 + month_amt,금액] 프로젝트 비용 집계 뷰
         */
        const rsp_view = db.entities('rsp').wideview_unpivot_view;
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
        const pl_where_conditions = { 'year': year, 'is_delivery': true, 'src_type': { 'not in':['WA','D']}};
        const pl_groupBy_cols = ['month_amt'];

        const sga_col_list = ['month_amt', '(sum(ifnull(labor_amount,0)) + sum(ifnull(iv_amount,0)) + sum(ifnull(exp_amount,0))) as sga_amount', '(sum(ifnull(labor_amount_sum,0)) + sum(ifnull(iv_amount_sum,0)) + sum(ifnull(exp_amount_sum,0))) as sga_amount_sum'];
        const sga_where_conditions = { 'year': year, 'is_delivery': true, 'shared_exp_yn': false };
        const sga_groupBy_cols = ['month_amt'];

        const rsp_col_list = ['month_amt', 'sum(ifnull(total_amt,0)) as total_amount', 'sum(ifnull(bill_amt,0)) as bill_amount', 'sum(ifnull(total_year_amt,0)) as total_amount_sum', 'sum(ifnull(bill_year_amt,0)) as bill_amount_sum'];
        const rsp_where_conditions = { 'year': year, 'is_delivery': true };
        const rsp_groupBy_cols = ['month_amt'];

        let pl_column = pl_col_list;
        let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
        let pl_groupBy = pl_groupBy_cols;

        let sga_column = sga_col_list;
        let sga_where = org_col_nm === 'lv1_id' ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id };
        let sga_groupBy = sga_groupBy_cols;

        let rsp_column = rsp_col_list;
        let rsp_where = org_col_nm === 'lv1_id' ? rsp_where_conditions : { ...rsp_where_conditions, [org_col_nm]: org_id };
        let rsp_groupBy = rsp_groupBy_cols;

        const [pl_data, sga_data, rsp_data] = await Promise.all([
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
            SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy)
        ]);

        //pl, sga, rsp 각 월별 데이터로 분류
        // TBD
        // DT매출 = 조직별 월별 매출 중 DT Tagging 대상만 집계 (DT Tagging -> PL_WIDEVIEW 테이블에서 prj_tp_nm이 DT로 시작하는 데이터)
        const dt_sale_data = {
            display_order: 1,
            type: 'DT매출'
        }
        // TBD
        // Offshoring = 조직별 월별 AGS외주비(OI_WIDEVIEW) * 환산효과
        const offshoring_data = {
            display_order: 2,
            type: 'Offshoring'
        }
        // TBD
        // Non-MM = 조직별 월별 매출 중 Non-MM Tagging 대상만 집계 (Non-MM Tagging 대상 기준?)
        const non_mm_data = {
            display_order: 3,
            type: 'Non-MM'
        }
        // BR = 조직별 월별 빌링인건비 / 총인건비
        const br_data = {
            display_order: 4,
            type: 'BR'
        }
        // RoHC = 조직별 월별 공헌이익 / 총인건비
        const rohc_data = {
            display_order: 5,
            type: 'RoHC'
        }
        
        let a_month_data={}

        pl_data.forEach(a=>{
            const m_sga_data = sga_data.find(b => b.month_amt === a.month_amt);
            const m_rsp_data = rsp_data.find(b => b.month_amt === a.month_amt);
            a_month_data[`a_${a.month_amt}_pl`]=a;
            a_month_data[`a_${a.month_amt}_sga`]=m_sga_data;
            a_month_data[`a_${a.month_amt}_rsp`]=m_rsp_data;
        })

        
        for(let i=1; i<13; i++){
            const s_month = i.toString().padStart(2,'0');
            br_data[`m_${s_month}_data`] = (a_month_data[`a_${s_month}_rsp`]?.['total_amount'] ?? 0) === 0 ? 0 : (a_month_data[`a_${s_month}_rsp`]?.['bill_amount'] ?? 0) / a_month_data[`a_${s_month}_rsp`]['total_amount'] * 100
            rohc_data[`m_${s_month}_data`] = (a_month_data[`a_${s_month}_rsp`]?.['total_amount'] ?? 0) === 0 ? 0 : ((a_month_data[`a_${s_month}_pl`]?.['margin_amount'] ?? 0) - (a_month_data[`a_${s_month}_sga`]?.['sga_amount'] ?? 0)) / a_month_data[`a_${s_month}_rsp`]['total_amount'] * 100
            if(i === 12){
                br_data[`total_data`] = (a_month_data[`a_${s_month}_rsp`]?.['total_amount_sum'] ?? 0) === 0 ? 0 : (a_month_data[`a_${s_month}_rsp`]?.['bill_amount_sum'] ?? 0) / a_month_data[`a_${s_month}_rsp`]['total_amount_sum'] * 100
                rohc_data[`total_data`] = (a_month_data[`a_${s_month}_rsp`]?.['total_amount_sum'] ?? 0) === 0 ? 0 : ((a_month_data[`a_${s_month}_pl`]?.['margin_amount_sum'] ?? 0) - (a_month_data[`a_${s_month}_sga`]?.['sga_amount_sum'] ?? 0)) / a_month_data[`a_${s_month}_rsp`]['total_amount_sum'] * 100
                
            }
        }

        aRes.push(dt_sale_data, offshoring_data, non_mm_data, br_data, rohc_data)

        return aRes

    })
}