const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_forecast_oi', async (req) => {
        /**
         * 핸들러 초기에 권한체크
         */
        // await check_user_auth(req);


        /**
         * API 리턴값 담을 배열 선언
         */
        const oResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // =========================== 조회 대상 DB 테이블 ===========================
        // entities('<cds namespace 명>').<cds entity 명>
        // srv .cds 에 using from 구문에 엔티티가 속한 db .cds 파일이 최소 한 번이라도 걸려있어야 db.entities 로 엔티티 인식가능
        // (서비스에 등록할 필요는 없음)
        /**
         * pl.wideview_view [실적]
         * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl').wideview_org_view;
        const dt_view = db.entities('pl').wideview_view;
        const non_mm_view = db.entities('pl').wideview_non_mm_view;
        /**
         * sga.wideview_view [sg&a 집계]
         * [부문/본부/팀 + 년,month_amt,금액] 프로젝트 판관비 집계 뷰
         */
        const sga_view = db.entities('sga').wideview_view;
        /**
         * BR [실적]
         */
        const rsp_view = db.entities('rsp').wideview_view;
        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;
        /**
         * target [목표]
         * [부문/본부/팀 + 년,금액] 조직 별 연단위 목표금액
         */
        const target = db.entities('common').org_target_sum_view;
        // =================================================================================

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();
        const i_month = Number(month);

        // QUERY 공통 파라미터 선언

        /**
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const pl_col_list = [
            'year',
            'sum(ifnull(margin_year_amt,0)) as secured_value',
            'sum(ifnull(sfdc_margin_year_amt,0)) as not_secured_value',
            '(sum(ifnull(margin_year_amt,0))+sum(ifnull(sfdc_margin_year_amt,0))) as forecast_value'];
        const pl_where_conditions = { 'year': { in: [year, last_year] } };
        const pl_groupBy_cols = ['year'];

        const non_mm_col_list = [
            'year',
            `sum(case when src_type = 'D' then 0 else ifnull(sale_year_amt,0) end) as secured_sale`,
            `sum(case when src_type = 'D' then ifnull(sale_year_amt,0) else 0 end) as not_secured_sale`
        ];
        const non_mm_where_conditions = { 'year': { in: [year, last_year] }, 'is_delivery': true, 'src_type': { '!=': 'WO' } };
        const non_mm_groupBy_cols = ['year'];

        /**
         * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const dt_pl_col_list = [
            'year',
            `sum(case when src_type = 'D' then 0 else ifnull(sale_year_amt,0) end) as secured_sale`,
            `sum(case when src_type = 'D' then ifnull(sale_year_amt,0) else 0 end) as not_secured_sale`
        ];
        const dt_pl_where_conditions = { 'year': { in: [year, last_year] }, 'dgtr_task_cd': { '!=': null, and: { 'dgtr_task_cd': { '!=': '' } } }, 'src_type': { '!=': 'WA' } };
        const dt_pl_groupBy_cols = ['year'];

        /**
         * SG&A 조회용 컬럼
         * shared_exp_yn false = 사업 / true = 전사
         */
        // let a_secured = []
        // let a_not_secured = []

        // for (let i = 1; i <= 12; i++) {
        //     if (i <= i_month) {
        //         a_secured.push(`sum(ifnull(exp_m${i}_amt,0)) + sum(ifnull(labor_m${i}_amt,0)) + sum(ifnull(iv_m${i}_amt,0))`);
        //     } else {
        //         a_not_secured.push(`sum(ifnull(exp_m${i}_amt,0)) + sum(ifnull(iv_m${i}_amt,0))`);
        //     }
        // }
        // let s_secured = "("+a_secured.join(' + ')+') as secured_value';
        // let s_not_secured = "("+a_not_secured.join(' + ')+') as not_secured_value';
        // let s_forecast_value = "("+a_secured.join(' + ')+ " + " +a_not_secured.join(' + ')+') as forecast_value';

        // const sga_col_list = ['year', s_secured, s_not_secured, s_forecast_value];
        const sga_col_list = ['year', 'sum(labor_year_amt+exp_year_amt+iv_year_amt) as secured_value', 'sum(labor_year_amt+exp_year_amt+iv_year_amt) as forecast_value'];
        const sga_where_conditions = { 'year': { in: [year, last_year] }, 'is_delivery': true, 'is_total_cc': { in: [false, null] } };
        const sga_groupBy_cols = ['year'];

        /**
         * +++++ TBD +++++
         * 권한 체크하여 사용자가 조회 가능한 조직인지 판별 후 코드 진행
         */

        /**
         * org_id 파라미터값으로 조직정보 조회
         * 
         */
        const org_col = `case
            when lv1_id = '${org_id}' THEN 'lv1_ccorg_cd'
            when lv2_id = '${org_id}' THEN 'lv2_ccorg_cd'
            when lv3_id = '${org_id}' THEN 'lv3_ccorg_cd'
            when div_id = '${org_id}' THEN 'div_ccorg_cd'
            when hdqt_id = '${org_id}' THEN 'hdqt_ccorg_cd'
            when team_id = '${org_id}' THEN 'team_ccorg_cd'
            end as org_level`;
        const orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd'])
            .where({ 'org_id': org_id });

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation

        let pl_column = pl_col_list;
        let pl_where = orgInfo.org_level === 'lv1_ccorg_cd' ? pl_where_conditions : { ...pl_where_conditions, [orgInfo.org_level]: orgInfo.org_ccorg_cd };
        let pl_groupBy = pl_groupBy_cols;

        let non_mm_column = non_mm_col_list;
        let non_mm_where = orgInfo.org_level === 'lv1_ccorg_cd' ? non_mm_where_conditions : { ...non_mm_where_conditions, [orgInfo.org_level]: orgInfo.org_ccorg_cd };
        let non_mm_groupBy = non_mm_groupBy_cols;

        let dt_pl_column = dt_pl_col_list;
        let dt_pl_where = orgInfo.org_level === 'lv1_ccorg_cd' ? dt_pl_where_conditions : { ...dt_pl_where_conditions, [orgInfo.org_level]: orgInfo.org_ccorg_cd };
        let dt_pl_groupBy = dt_pl_groupBy_cols;

        let sga_column = sga_col_list;
        let sga_where = orgInfo.org_level === 'lv1_ccorg_cd' ? sga_where_conditions : { ...sga_where_conditions, [orgInfo.org_level]: orgInfo.org_ccorg_cd };
        let sga_groupBy = sga_groupBy_cols;

        // rsp wideview (m, opp, total)
        const rsp_column = ['year',
            'case when sum(ifnull(total_amt_sum, 0)) <> 0 then (sum(ifnull(bill_amt_sum, 0)) + sum(ifnull(indirect_cost_amt_sum, 0)) + sum(ifnull(opp_amt_sum, 0))) / sum(ifnull(total_amt_sum, 0)) else 0 end as plan_value',
            'case when sum(ifnull(total_amt_sum, 0)) <> 0 then (sum(ifnull(bill_amt_sum, 0)) + sum(ifnull(indirect_cost_amt_sum, 0))) / sum(ifnull(total_amt_sum, 0)) else 0 end as secured_value',
            'case when sum(ifnull(total_amt_sum, 0)) <> 0 then (sum(ifnull(opp_amt_sum, 0)) / sum(ifnull(total_amt_sum, 0))) else 0 end as not_secured_value',
            'sum(ifnull(b_mm_amt_sum, 0)) as b_mm_amt_sum',
            'sum(ifnull(bun_mm_amt_sum, 0)) as mm_total_sum',
            'sum(ifnull(total_amt_sum, 0)) as total_amt_sum',
            'sum(ifnull(opp_amt_sum, 0)) as opp_amt_sum',
            'sum(ifnull(avg_amt_sum, 0)) as avg_amt_sum',
        ];
        const rsp_where = { 'year': { in: [year, last_year] }, [orgInfo.org_level]: orgInfo.org_ccorg_cd, is_delivery: true };
        const rsp_groupBy = ['year'];

        /** 
         * 타겟 뷰 조회용 컬럼
         */
        const target_col_list = [
            'target_year',
            'sum(ifnull(dt_target_sale_amt,0)) as dt_target_sale_amt',
            'sum(ifnull(offshore_target_amt,0)) as offshore_target_amt',
            'sum(ifnull(non_mm_target_sale_amt,0)) as non_mm_target_sale_amt',
            'sum(ifnull(target_rohc,0)) as target_rohc'
        ];
        const target_where_conditions = { 'target_year': year };
        let target_where = orgInfo.org_level === 'lv1_ccorg_cd' ? { ...target_where_conditions, total: true } : orgInfo.org_level === 'hdqt_ccorg_cd' ? { ...target_where_conditions, total: false, [orgInfo.org_level]: orgInfo.org_ccorg_cd } : { ...target_where_conditions, total: false, div_ccorg_cd: { '!=': null }, hdqt_ccorg_cd: null, [orgInfo.org_level]: orgInfo.org_ccorg_cd };

        let target_column = (orgInfo.org_level === 'div_ccorg_cd' || orgInfo.org_level === 'hdqt_ccorg_cd') ? [...target_col_list, 'max(ifnull(target_br_mm_amt,0)) as target_br_mm_amt'] : target_col_list
        const target_groupBy = ['target_year']

        // DB 쿼리 실행 (병렬)
        const [pl_data, non_mm, sga_data, rsp_data, dt_pl_data, target_data] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(non_mm_view).columns(non_mm_column).where(non_mm_where).groupBy(...non_mm_groupBy),
            SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
            SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
            SELECT.from(dt_view).columns(dt_pl_column).where(dt_pl_where).groupBy(...dt_pl_groupBy),
            SELECT.from(target).columns(target_column).where(target_where).groupBy(...target_groupBy),
        ]);

        let a_curr_target = target_data.find(a => a.target_year === year);

        let sga_curr_row = sga_data.find(o => o.year === year),
            rsp_curr_row = rsp_data.find(o => o.year === year),
            pl_curr_row = pl_data.find(o => o.year === year),
            non_mm_curr_row = non_mm.find(o => o.year === year),
            dt_curr_row = dt_pl_data.find(o => o.year === year),
            sga_last_row = sga_data.find(o => o.year === last_year),
            rsp_last_row = rsp_data.find(o => o.year === last_year),
            pl_last_row = pl_data.find(o => o.year === last_year),
            non_mm_last_row = non_mm.find(o => o.year === last_year),
            dt_last_row = dt_pl_data.find(o => o.year === last_year)


        const i_sga_last_forecast = sga_last_row?.forecast_value ?? 0,
            i_rsp_last_forecast = ((rsp_last_row?.bill_amt_sum ?? 0) + (rsp_last_row?.indirect_cost_amt_sum ?? 0) + (rsp_last_row?.opp_amt_sum ?? 0)) / (rsp_last_row?.total_amt_sum ?? 0),
            i_pl_last_forecast = pl_last_row?.forecast_value ?? 0,
            i_non_mm_last_forecast = (non_mm_last_row?.secured_sale ?? 0) + (non_mm_last_row?.not_secured_sale ?? 0),
            i_dt_last_forecast = (dt_last_row?.secured_sale ?? 0) + (dt_last_row?.not_secured_sale ?? 0),
            i_last_total_labor = rsp_last_row?.total_amt_sum ?? 0

        // TBD
        // DT매출 = 조직별 월별 매출 중 DT Tagging 대상만 집계 (DT Tagging -> PL_WIDEVIEW 테이블에서 prj_tp_nm이 DT로 시작하는 데이터)
        const dt_sale_data =
        {
            "display_order": 1,
            "type": "DT 매출",
            "forecast_value": (dt_curr_row?.['secured_sale'] ?? 0) + (dt_curr_row?.['not_secured_sale'] ?? 0),
            "secured_value": dt_curr_row?.['secured_sale'] ?? 0,
            "not_secured_value": dt_curr_row?.['not_secured_sale'] ?? 0,
            "plan_ratio": ((dt_curr_row?.['secured_sale'] ?? 0) + (dt_curr_row?.['not_secured_sale'] ?? 0)) - ((a_curr_target?.['dt_target_sale_amt'] ?? 0) * 100000000),
            "yoy": ((dt_curr_row?.['secured_sale'] ?? 0) + (dt_curr_row?.['not_secured_sale'] ?? 0)) - i_dt_last_forecast
        };
        oResult.push(dt_sale_data);

        // TBD
        // Offshoring = 조직별 월별 AGS외주비(OI_WIDEVIEW) * 환산효과
        const o_offshoring =
        {
            "display_order": 2,
            "type": "Offshoring",
            "forecast_value": 0,
            "secured_value": 0,
            "not_secured_value": 0,
            "plan_ratio": 0,
            "yoy": 0
        };
        oResult.push(o_offshoring);

        // TBD
        // Non-MM = 조직별 월별 매출 중 Non-MM Tagging 대상만 집계 (Non-MM Tagging 대상 기준?)
        const non_mm_data =
        {
            "display_order": 3,
            "type": "Non-MM",
            "forecast_value": (non_mm_curr_row?.['secured_sale'] ?? 0) + (non_mm_curr_row?.['not_secured_sale'] ?? 0),
            "secured_value": non_mm_curr_row?.['secured_sale'] ?? 0,
            "not_secured_value": non_mm_curr_row?.['not_secured_sale'] ?? 0,
            "plan_ratio": ((non_mm_curr_row?.['secured_sale'] ?? 0) + (non_mm_curr_row?.['not_secured_sale'] ?? 0)) - ((a_curr_target?.['non_mm_target_sale_amt'] ?? 0) * 100000000),
            "yoy": ((non_mm_curr_row?.['secured_sale'] ?? 0) + (non_mm_curr_row?.['not_secured_sale'] ?? 0)) - i_non_mm_last_forecast
        };
        oResult.push(non_mm_data);

        // BR = 조직별 월별 빌링인건비 / 총인건비
        const br_data =
        {
            "display_order": 4,
            "type": "BR",
            "secured_value": rsp_curr_row?.["mm_total_sum"] ? (rsp_curr_row?.["b_mm_amt_sum"] / rsp_curr_row?.["mm_total_sum"]) : 0,
            "not_secured_value": rsp_curr_row?.["mm_total_sum"] ? ((rsp_curr_row?.["opp_amt_sum"] / rsp_curr_row?.["avg_amt_sum"]) / rsp_curr_row?.["mm_total_sum"]) : 0,
        };
        br_data["forecast_value"] = br_data["secured_value"] + br_data["not_secured_value"];
        br_data["plan_ratio"] = br_data["forecast_value"] - ((a_curr_target?.['target_br_mm_amt'] || 0) / 100);

        let last_secured_value = rsp_last_row?.["mm_total_sum"] ? (rsp_last_row?.["b_mm_amt_sum"] / rsp_last_row?.["mm_total_sum"]) : 0;
        let last_not_secured_value = rsp_last_row?.["mm_total_sum"] ? ((rsp_last_row?.["opp_amt_sum"] / rsp_last_row?.["avg_amt_sum"]) / rsp_last_row?.["mm_total_sum"]) : 0;
        let last_plan_value = last_secured_value + last_not_secured_value;
        br_data["yoy"] = br_data["forecast_value"] - last_plan_value;
        oResult.push(br_data);

        // RoHC = 조직별 월별 공헌이익 / 총인건비
        const rohc_data =
        {
            "display_order": 5,
            "type": "RoHC",
            "forecast_value": (rsp_curr_row?.total_amt_sum ?? 0) === 0 ? 0 : ((sga_curr_row?.forecast_value ?? 0) - (pl_curr_row?.forecast_value ?? 0)) / rsp_curr_row.total_amt_sum,
            "secured_value": (rsp_curr_row?.total_amt_sum ?? 0) === 0 ? 0 : ((sga_curr_row?.secured_value ?? 0) - (pl_curr_row?.secured_value ?? 0)) / rsp_curr_row.total_amt_sum,
            "not_secured_value": 0, // (rsp_curr_row?.total_amt_sum ?? 0) === 0 ? 0 : ((sga_curr_row?.not_secured_value ?? 0) - (pl_curr_row?.not_secured_value ?? 0)) / rsp_curr_row.total_amt_sum,
            "plan_ratio": ((rsp_curr_row?.total_amt_sum ?? 0) === 0 ? 0 : ((sga_curr_row?.forecast_value ?? 0) - (pl_curr_row?.forecast_value ?? 0)) / rsp_curr_row.total_amt_sum) - (a_curr_target?.['target_rohc'] ?? 0),
            "yoy": ((rsp_curr_row?.total_amt_sum ?? 0) === 0 ? 0 : ((sga_curr_row?.forecast_value ?? 0) - (pl_curr_row?.forecast_value ?? 0)) / rsp_curr_row.total_amt_sum) - (i_last_total_labor === 0 ? 0 : (i_sga_last_forecast - i_pl_last_forecast) / i_last_total_labor)
        };
        oResult.push(rohc_data);

        return oResult;

    });
}