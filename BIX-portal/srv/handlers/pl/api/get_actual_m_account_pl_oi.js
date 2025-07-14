const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_m_account_pl_oi', async (req) => {
        try{
            /**
             * 핸들러 초기에 권한체크
             */
            await check_user_auth(req);

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
             * pl_wideview_org_view [실적]
             */
            const pl_view = db.entities('pl').wideview_view;
            //org_tp:account, hybrid일 경우 사용
            const account_pl_view = db.entities('pl').wideview_account_view;
            /**
             * wideview_view [sg&a 집계]
             */
            const sga_view = db.entities('sga').wideview_view;//biz_tp_account_cd 없음
            /**
             * common_org_full_level_view [조직정보]
             */
            const org_full_level = db.entities('common').org_full_level_view;

            const dt_view = db.entities('pl').wideview_dt_view;
            const non_mm_view = db.entities('pl').wideview_non_mm_view;
            //org_tp:account, hybrid일 경우 사용
            const account_dt_view = db.entities('pl').wideview_account_dt_view;
            const account_non_mm_view = db.entities('pl').wideview_account_non_mm_view;

            const rsp_view = db.entities('rsp').wideview_view;//biz_tp_account_cd 없음
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id } = req.data;
            const last_year = (Number(year) - 1).toString();

            // QUERY 공통 파라미터 선언
            /**
             * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */

            let a_sale_column = [];
            let a_margin_column = [];
            let a_sga_column = [];
            let a_rsp_total_amt_ym = [];
            let a_rsp_bun_mm_ym = [];
            let a_rsp_b_mm_ym = [];
            for (let i = 1; i <= Number(month); i++) {
                a_sale_column.push(`ifnull(sum(sale_m${i}_amt), 0)`)
                a_margin_column.push(`ifnull(sum(margin_m${i}_amt), 0)`)
                a_sga_column.push(`ifnull(sum(labor_m${i}_amt), 0) + ifnull(sum(exp_m${i}_amt), 0) + ifnull(sum(iv_m${i}_amt), 0)`)
                a_rsp_total_amt_ym.push(`ifnull(sum(total_m${i}_amt), 0)`)
                a_rsp_bun_mm_ym.push(`ifnull(sum(bun_mm_m${i}_amt), 0)`)
                a_rsp_b_mm_ym.push(`ifnull(sum(b_mm_m${i}_amt), 0)`)
            };

            let s_sale_column = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
            let s_margin_column = "(" + a_margin_column.join(' + ') + ') as margin_amount_sum';
            let s_sga_column = "(" + a_sga_column.join(' + ') + ') as sga_amount_sum';
            let s_rsp_total_amt_ym = "(" + a_rsp_total_amt_ym.join(' + ') + ') as total_year_amt';
            let s_rsp_bun_mm_amt_ym = a_rsp_bun_mm_ym.join(' + ');
            let s_rsp_b_mm_amt_ym = a_rsp_b_mm_ym.join(' + ');

            const pl_col_list = ['year', s_sale_column, s_margin_column];
            const pl_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { 'not in': ['WO', 'D'] }, 'biz_tp_account_cd': { '!=': null, and: { 'biz_tp_account_cd': { '!=': '' } } } };

            const pl_groupBy_cols = ['year'];
            /**
             * SG&A 조회용 컬럼
             * is_total_cc false = 사업 / true = 전사
             */
            const sga_col_list = ['year', 'is_total_cc', s_sga_column];
            const sga_where_conditions = { 'year': { in: [year, last_year] } };
            const sga_groupBy_cols = ['year', 'is_total_cc']

            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            const dt_pl_col_list = ['year', s_sale_column];
            const dt_pl_where_conditions = { 'year': { in: [year, last_year] }, 'biz_tp_account_cd': { '!=': null, and: { 'biz_tp_account_cd': { '!=': '' } } } };
            const dt_pl_groupBy_cols = ['year'];

            const non_mm_col_list = ['year', s_sale_column];
            const non_mm_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { 'not in': ['WA', 'D'] }, 'biz_tp_account_cd': { '!=': null, and: { 'biz_tp_account_cd': { '!=': '' } } } };
            const non_mm_groupBy_cols = ['year'];

            /**
             * org_id 파라미터값으로 조직정보 조회
             * 
             */
            const org_col = `case
                when lv1_id = '${org_id}' THEN 'lv1_id'
                when lv2_id = '${org_id}' THEN 'lv2_id'
                when lv3_id = '${org_id}' THEN 'lv3_id'
                when div_id = '${org_id}' THEN 'div_id'
                when hdqt_id = '${org_id}' THEN 'hdqt_id'
                when team_id = '${org_id}' THEN 'team_id'
                end as org_level`;
            let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', 'org_tp'])
                .where`org_id = ${org_id} and (lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id})`;

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            // 조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level;

            let pl_column = pl_col_list;
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            let pl_groupBy = pl_groupBy_cols;

            let sga_column = sga_col_list;
            let sga_where = org_col_nm === 'lv1_id' ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id };
            let sga_groupBy = sga_groupBy_cols;

            let dt_pl_column = dt_pl_col_list;
            let dt_pl_where = org_col_nm === 'lv1_id' ? dt_pl_where_conditions : { ...dt_pl_where_conditions, [org_col_nm]: org_id };
            let dt_pl_groupBy = dt_pl_groupBy_cols;

            let non_mm_column = non_mm_col_list;
            let non_mm_where = org_col_nm === 'lv1_id' ? non_mm_where_conditions : { ...non_mm_where_conditions, [org_col_nm]: org_id };
            let non_mm_groupBy = non_mm_groupBy_cols;

            const rsp_column = ['year',
                `case when ifnull(${s_rsp_bun_mm_amt_ym}, 0) <> 0 then ifnull(${s_rsp_b_mm_amt_ym}, 0) / ifnull(${s_rsp_bun_mm_amt_ym}, 0) else 0 end as mm_value`,
                s_rsp_total_amt_ym,
            ];
            const rsp_where = { 'year': { in: [year, last_year] }, [org_col_nm]: org_id, is_delivery: true };
            const rsp_groupBy = ['year'];

            let pl_view_select, dt_view_select, nonmm_view_select;
            if((org_col_nm !== 'lv1_id' || org_col_nm !== 'lv2_id') && orgInfo.org_tp === 'hybrid' || orgInfo.org_tp === 'account'){
                pl_view_select = account_pl_view;
                dt_view_select = account_dt_view;
                nonmm_view_select = account_non_mm_view;
            }else if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id'|| orgInfo.org_tp === 'delivery'){
                pl_view_select = pl_view;
                dt_view_select = dt_view;
                nonmm_view_select = non_mm_view;
            };

            // DB 쿼리 실행 (병렬)
            const [query, sga_query, dt_pl_data, non_mm, rsp_data] = await Promise.all([
                // PL 실적, 목표 조회
                SELECT.from(pl_view_select).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
                SELECT.from(dt_view_select).columns(dt_pl_column).where(dt_pl_where).groupBy(...dt_pl_groupBy),
                SELECT.from(nonmm_view_select).columns(non_mm_column).where(non_mm_where).groupBy(...non_mm_groupBy),
                SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy)
            ]);
            if (!query.length && !dt_pl_data.length && !sga_query.length && !non_mm.length && !rsp_data.length) {
                //return req.res.status(204).send();
                return []
            }

            let a_sga_filtered_curr_y_row = sga_query.filter(o => o.year === year && o.is_total_cc === false),
                a_sga_filtered_last_y_row = sga_query.filter(o => o.year === last_year && o.is_total_cc === false),
                a_sga_exp_filtered_curr_y_row = sga_query.filter(o => o.year === year && o.is_total_cc === true),
                a_sga_exp_filtered_last_y_row = sga_query.filter(o => o.year === last_year && o.is_total_cc === true)

            let pl_curr_y_row = query.find(o => o.year === year),
                pl_last_y_row = query.find(o => o.year === last_year),
                sga_curr_y_row = { sga_amount_sum: a_sga_filtered_curr_y_row.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0) },
                sga_last_y_row = { sga_amount_sum: a_sga_filtered_last_y_row.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0) },
                sga_exp_curr_y_row = { sga_amount_sum: a_sga_exp_filtered_curr_y_row.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0) },
                sga_exp_last_y_row = { sga_amount_sum: a_sga_exp_filtered_last_y_row.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0) },
                dt_pl_curr_y_row = dt_pl_data.find(o => o.year === year),
                dt_pl_last_y_row = dt_pl_data.find(o => o.year === last_year),
                curr_non_mm = non_mm.find(a => a.year === year),
                last_non_mm = non_mm.find(a => a.year === last_year),
                rsp_curr_y_row = rsp_data.find(o => o.year === year),
                rsp_last_y_row = rsp_data.find(o => o.year === last_year)

            let curr_margin_rate = (pl_curr_y_row?.["sale_amount_sum"] ?? 0) === 0 ? 0 : (pl_curr_y_row?.["margin_amount_sum"] ?? 0) / (pl_curr_y_row?.["sale_amount_sum"] ?? 0);
            let last_margin_rate = (pl_last_y_row?.["sale_amount_sum"] ?? 0) === 0 ? 0 : (pl_last_y_row?.["margin_amount_sum"] ?? 0) / (pl_last_y_row?.["sale_amount_sum"] ?? 0);
            let curr_rohc = (rsp_curr_y_row?.['total_year_amt'] ?? 0) !== 0 ? ((pl_curr_y_row?.["margin_amount_sum"] ?? 0) - (sga_curr_y_row?.["sga_amount_sum"] ?? 0)) / rsp_curr_y_row['total_year_amt'] : 0;
            let last_rohc = (rsp_last_y_row?.['total_year_amt'] ?? 0) !== 0 ? ((pl_last_y_row?.["margin_amount_sum"] ?? 0) - (sga_last_y_row?.["sga_amount_sum"] ?? 0)) / rsp_last_y_row['total_year_amt'] : 0;
            let curr_contribytion = (pl_curr_y_row?.["margin_amount_sum"] ?? 0) - (sga_curr_y_row?.["sga_amount_sum"] ?? 0);
            let last_contribytion = (pl_last_y_row?.["margin_amount_sum"] ?? 0) - (sga_last_y_row?.["sga_amount_sum"] ?? 0);
            //전사 부문에서만 profit, profit-yoy 사용
            const temp_data =
            {
                "sale": pl_curr_y_row?.["sale_amount_sum"] ?? 0,
                "sale_yoy": (pl_last_y_row?.["sale_amount_sum"] ?? 0) === 0 ? 0 : (((pl_curr_y_row?.["sale_amount_sum"] ?? 0) - (pl_last_y_row?.["sale_amount_sum"] ?? 0)) / (pl_last_y_row?.["sale_amount_sum"] ?? 0)) * 100,
                "margin": pl_curr_y_row?.["margin_amount_sum"] ?? 0,
                "margin_yoy": (pl_last_y_row?.["margin_amount_sum"] ?? 0) === 0 ? 0 : (((pl_curr_y_row?.["margin_amount_sum"] ?? 0) - (pl_last_y_row?.["margin_amount_sum"] ?? 0)) / (pl_last_y_row?.["margin_amount_sum"] ?? 0)) * 100,
                "margin_rate": curr_margin_rate * 100,
                "margin_rate_yoy": (last_margin_rate) === 0 ? 0 : ((curr_margin_rate - last_margin_rate) / last_margin_rate) * 100,
                "sga": sga_curr_y_row?.["sga_amount_sum"] ?? 0,
                "sga_yoy": (sga_last_y_row?.["sga_amount_sum"] ?? 0) === 0 ? 0 : (((sga_curr_y_row?.["sga_amount_sum"] ?? 0) - (sga_last_y_row?.["sale_amount_sum"] ?? 0)) / (sga_last_y_row?.["sga_amount_sum"] ?? 0)) * 100,
                "contribytion": curr_contribytion,
                "contribytion_yoy": last_contribytion === 0 ? 0 : ((last_contribytion - last_contribytion) / last_contribytion) * 100,
                "dt": dt_pl_curr_y_row?.['sale_amount_sum'] ?? 0,
                "dt_yoy": (dt_pl_last_y_row?.["sale_amount_sum"] ?? 0) === 0 ? 0 : (((dt_pl_curr_y_row?.["sale_amount_sum"] ?? 0) - (dt_pl_last_y_row?.["sale_amount_sum"] ?? 0)) / (dt_pl_last_y_row?.["sale_amount_sum"] ?? 0)) * 100,
                "offshoring": 0,
                "offshoring_yoy": 0,
                "nonMM": curr_non_mm?.sale_amount_sum ?? 0,
                "nonMM_yoy": (last_non_mm?.sale_amount_sum ?? 0) === 0 ? 0 : (((curr_non_mm?.sale_amount_sum ?? 0) - (last_non_mm?.sale_amount_sum ?? 0)) / (last_non_mm?.sale_amount_sum ?? 0)) * 100,
                "br": (rsp_curr_y_row?.mm_value ?? 0) * 100,
                "br_yoy": (rsp_last_y_row?.mm_value ?? 0) === 0 ? 0 : (((rsp_curr_y_row?.mm_value ?? 0) - (rsp_last_y_row?.mm_value ?? 0)) / (rsp_last_y_row?.mm_value ?? 0)) * 100,
                "rohc": curr_rohc,
                "rohc_yoy": curr_rohc === 0 ? 0 : ((curr_rohc - last_rohc) / curr_rohc) * 100,
                // "profit": curr_contribytion - (sga_exp_curr_y_row?.sga_amount_sum ?? 0), 
                // "profit-yoy": (last_contribytion - (sga_exp_last_y_row?.sga_amount_sum ?? 0)) === 0 ? 0 : (((curr_contribytion - (sga_exp_curr_y_row?.sga_amount_sum ?? 0)) - ((last_contribytion - (sga_exp_last_y_row?.sga_amount_sum ?? 0)))) / (last_contribytion - (sga_exp_last_y_row?.sga_amount_sum ?? 0)))*100
            };
            oResult.push(temp_data);

            return oResult
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
};