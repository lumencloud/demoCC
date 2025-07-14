const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_actual_m_rate_gap_pl_oi', async (req) => {
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
            const pl_view = db.entities('pl').wideview_org_view;
            //org_tp:account, hybrid일 경우 사용
            const account_pl_view = db.entities('pl').wideview_account_org_view;
        
            /**
             * common_org_full_level_view [조직정보]
             */
            const org_full_level = db.entities('common').org_full_level_view;

            const rsp_view = db.entities('rsp').wideview_view;
            const sga_view = db.entities('sga').wideview_view;
            const dt_view = db.entities('pl').wideview_dt_view;
            const non_mm_view = db.entities('pl').wideview_non_mm_view;
            //org_tp:account, hybrid일 경우 사용
            const account_dt_view = db.entities('pl').wideview_account_dt_view;
            const account_non_mm_view = db.entities('pl').wideview_account_non_mm_view;
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id , org_tp } = req.data;
            const last_year = (Number(year) - 1).toString();

            // QUERY 공통 파라미터 선언
            /**
             * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */

            let a_sale_column = [];
            let a_sale_total_column = [];
            let a_margin_column = [];
            let a_margin_total_column = [];
            let a_rsp_bun_mm_ym = [];
            let a_rsp_bun_mm_y_total = [];
            let a_rsp_b_mm_ym = [];
            let a_rsp_b_mm_y_total = [];
            let a_sum_bill = [];
            let a_sum_indirect = [];
            let a_sum_total = [];
            let a_sga_column = [];
            for (let i = 1; i <= 12; i++) {
                if (i <= Number(month)) {
                    a_sale_column.push(`ifnull(sum(sale_m${i}_amt), 0)`)
                    a_margin_column.push(`ifnull(sum(margin_m${i}_amt), 0)`)
                    a_rsp_bun_mm_ym.push(`ifnull(sum(bun_mm_m${i}_amt), 0)`)
                    a_rsp_b_mm_ym.push(`ifnull(sum(b_mm_m${i}_amt), 0)`)
                    a_sum_bill.push(`ifnull(sum(bill_m${i}_amt), 0)`)
                    a_sum_indirect.push(`ifnull(sum(indirect_cost_m${i}), 0)`)
                    a_sum_total.push(`ifnull(sum(total_m${i}_amt), 0)`)
                    a_sga_column.push(`ifnull(sum(labor_m${i}_amt), 0)+ifnull(sum(exp_m${i}_amt), 0)+ifnull(sum(iv_m${i}_amt), 0)`)
                };
                a_sale_total_column.push(`ifnull(sum(sale_m${i}_amt), 0)`)
                a_margin_total_column.push(`ifnull(sum(margin_m${i}_amt), 0)`)
                a_rsp_bun_mm_y_total.push(`ifnull(sum(bun_mm_m${i}_amt), 0)`)
                a_rsp_b_mm_y_total.push(`ifnull(sum(b_mm_m${i}_amt), 0)`)
            };
            let s_sale_column = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
            let s_sale_total_column = "(" + a_sale_total_column.join(' + ') + ') as sale_total_amount_sum';
            let s_margin_column = "(" + a_margin_column.join(' + ') + ') as margin_amount_sum';
            let s_margin_total_column = "(" + a_margin_total_column.join(' + ') + ') as margin_total_amount_sum';
            let s_rsp_bun_mm_amt_ym = a_rsp_bun_mm_ym.join(' + ');
            let s_rsp_bun_mm_amt_y_total = a_rsp_bun_mm_y_total.join(' + ');
            let s_rsp_b_mm_amt_ym = a_rsp_b_mm_ym.join(' + ');
            let s_rsp_b_mm_amt_y_total = a_rsp_b_mm_y_total.join(' + ');
            let s_sum_bill = a_sum_bill.join(' + ')
            let s_sum_indirect = a_sum_indirect.join(' + ')
            let s_sum_total = a_sum_total.join(' + ')
            let s_sga_column = "(" + a_sga_column.join(' + ') + ') as sga_amount_sum';


            const pl_col_list = ['year', s_sale_column, s_margin_column, s_sale_total_column, s_margin_total_column];
            const pl_where_conditions = { 'year': { in: [year, last_year] } };
            const pl_groupBy_cols = ['year'];

            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            const dt_pl_col_list = ['year', s_sale_column, s_sale_total_column];
            const dt_pl_where_conditions = { 'year': { in: [year, last_year] } };
            const dt_pl_groupBy_cols = ['year'];

            const sga_col_list = ['year', 'is_total_cc', 
                'ifnull(sum(labor_year_amt), 0) + ifnull(sum(exp_year_amt), 0) + ifnull(sum(iv_year_amt), 0) as sga_amount_y_sum', s_sga_column];
            const sga_where_conditions = { 'year': { in: [year, last_year] } };
            const sga_groupBy_cols = ['year', 'is_total_cc']

            const non_mm_col_list = ['year', s_sale_column, s_sale_total_column];
            const non_mm_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { 'not in': ['WA', 'D'] } };
            const non_mm_groupBy_cols = ['year'];

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
            let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd','org_tp'])
                .where`org_id = ${org_id} and (lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id})`;

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            // 조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level;

            let pl_column = pl_col_list;
            let pl_where = org_col_nm === 'lv1_ccorg_cd' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: orgInfo.org_ccorg_cd };
            // pl_where = org_tp ? { ...pl_where, 'org_tp' : org_tp } : pl_where;
            let pl_groupBy = pl_groupBy_cols;

            let dt_pl_column = dt_pl_col_list;
            let dt_pl_where = org_col_nm === 'lv1_ccorg_cd' ? dt_pl_where_conditions : { ...dt_pl_where_conditions, [org_col_nm]: orgInfo.org_ccorg_cd };
            // dt_pl_where = org_tp ? { ...dt_pl_where, 'org_tp' : org_tp } : dt_pl_where;
            let dt_pl_groupBy = dt_pl_groupBy_cols;

            const rsp_column = ['year',
                // `case when ifnull(${s_rsp_bun_mm_amt_ym}, 0) <> 0 then ifnull(${s_rsp_b_mm_amt_ym}, 0) / ifnull(${s_rsp_bun_mm_amt_ym}, 0) else 0 end as mm_m_value`,
                // `case when ifnull(${s_rsp_bun_mm_amt_y_total}, 0) <> 0 then ifnull(${s_rsp_b_mm_amt_y_total}, 0) / ifnull(${s_rsp_bun_mm_amt_y_total}, 0) else 0 end as mm_y_total_value`,
                `case when ${s_sum_total} <> 0 then (${s_sum_bill} + ${s_sum_indirect})/(${s_sum_total}) else 0 end as cost_month_sum_value`,
                'case when ifnull(sum(total_year_amt), 0) <> 0 then (ifnull(sum(bill_year_amt), 0) + ifnull(sum(indirect_cost_year), 0)) / ifnull(sum(total_year_amt), 0) else 0 end as cost_total_value',
                `${s_sum_total} as rsp_ym_total_amt`,
                'ifnull(sum(total_year_amt), 0) as total_year_amt'
            ];
            
            const rsp_where_conditions = { 'year': { in: [year, last_year] }, [org_col_nm]: orgInfo.org_ccorg_cd, is_delivery: true };
            let rsp_where = org_tp ? { ...rsp_where_conditions, 'org_tp' : org_tp } : rsp_where_conditions;
            const rsp_groupBy = ['year'];

            let sga_column = sga_col_list;
            let sga_where = org_col_nm === 'lv1_id' ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: orgInfo.org_ccorg_cd };
            sga_where = org_tp ? { ...sga_where, 'org_tp' : org_tp } : sga_where;
            let sga_groupBy = sga_groupBy_cols;

            let non_mm_column = non_mm_col_list;
            let non_mm_where = org_col_nm === 'lv1_id' ? non_mm_where_conditions : { ...non_mm_where_conditions, [org_col_nm]: orgInfo.org_ccorg_cd };
            // non_mm_where = org_tp ? { ...non_mm_where, 'org_tp' : org_tp } : non_mm_where;
            let non_mm_groupBy = non_mm_groupBy_cols;

            let pl_view_select, dt_view_select, nonmm_view_select;
            if((org_col_nm !== 'lv1_id' || org_col_nm !== 'lv2_id') && orgInfo.org_tp === 'hybrid' || orgInfo.org_tp === 'account' || org_tp === 'account'){
                pl_view_select = account_pl_view;
                dt_view_select = account_dt_view;
                nonmm_view_select = account_non_mm_view;
            }else if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id'|| orgInfo.org_tp === 'delivery'){
                pl_view_select = pl_view;
                dt_view_select = dt_view;
                nonmm_view_select = non_mm_view;
            };

            // DB 쿼리 실행 (병렬)
            const [query, query_target, dt_pl_data, rsp_data, sga_query, non_mm] = await Promise.all([
                // PL 실적, 목표 조회
                SELECT.from(pl_view_select).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                get_org_target(year, ['A01', 'A03', 'A02', 'B02', 'A07', 'A06', 'A04', 'B04']),
                SELECT.from(dt_view_select).columns(dt_pl_column).where(dt_pl_where).groupBy(...dt_pl_groupBy),
                SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
                SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
                SELECT.from(nonmm_view_select).columns(non_mm_column).where(non_mm_where).groupBy(...non_mm_groupBy)
            ]);
            // if(!query.length && !sga_query.length && !dt_pl_data.length && !rsp_data.length && !non_mm.length){
            //     //return req.res.status(204).send();
            //     return []
            // }

            let a_sga_filtered_curr_y_row = sga_query.filter(o => o.year === year && o.is_total_cc === false),
                a_sga_filtered_last_y_row = sga_query.filter(o => o.year === last_year && o.is_total_cc === false)

            let pl_curr_y_row = query.find(o => o.year === year),
                pl_last_y_row = query.find(o => o.year === last_year),
                dt_pl_curr_y_row = dt_pl_data.find(o => o.year === year),
                dt_pl_last_y_row = dt_pl_data.find(o => o.year === last_year),
                curr_target = query_target.find(o => o.org_id === org_id),
                rsp_curr_y_row = rsp_data.find(o => o.year === year),
                rsp_last_y_row = rsp_data.find(o => o.year === last_year),
                sga_curr_y_row = { sga_amount_sum: a_sga_filtered_curr_y_row.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0)},
                sga_last_y_row = { sga_amount_sum: a_sga_filtered_last_y_row.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0), sga_amount_y_sum : a_sga_filtered_last_y_row.reduce((iSum, oData) => iSum += oData.sga_amount_y_sum, 0)},
                curr_rohc = (rsp_curr_y_row?.['rsp_ym_total_amt'] ?? 0) !== 0 ? ((pl_curr_y_row?.["margin_amount_sum"] ?? 0) - (sga_curr_y_row?.["sga_amount_sum"] ?? 0)) / rsp_curr_y_row['rsp_ym_total_amt'] : 0,
                last_rohc = (rsp_last_y_row?.['rsp_ym_total_amt'] ?? 0) !== 0 ? ((pl_last_y_row?.["margin_amount_sum"] ?? 0) - (sga_last_y_row?.["sga_amount_sum"] ?? 0)) / rsp_last_y_row['rsp_ym_total_amt'] : 0,
                curr_non_mm = non_mm.find(a => a.year === year),
                last_non_mm = non_mm.find(a => a.year === last_year),
                last_target = {
                    "target_year": last_year,
                    "target_dt_sale": dt_pl_last_y_row?.sale_total_amount_sum ?? 0,
                    "target_margin": pl_last_y_row?.margin_total_amount_sum ?? 0,
                    "target_margin_rate": (pl_last_y_row?.sale_total_amount_sum ?? 0) === 0 ? 0 : ((pl_last_y_row?.margin_total_amount_sum ?? 0) / pl_last_y_row.sale_total_amount_sum)*100,
                    "target_sale": pl_last_y_row?.sale_total_amount_sum ?? 0,
                    "target_br_cost": rsp_last_y_row?.cost_total_value ?? 0,
                    "target_rohc":(rsp_last_y_row?.total_year_amt ?? 0) !== 0 ? ((pl_last_y_row?.margin_total_amount_sum ?? 0) - (sga_last_y_row?.sga_amount_y_sum ?? 0)) / (rsp_last_y_row?.total_year_amt ?? 0) : 0,
                    "target_cont_profit": (pl_last_y_row?.margin_total_amount_sum ?? 0) - (sga_last_y_row?.sga_amount_y_sum ?? 0),
                    "target_non_mm": last_non_mm?.sale_total_amount_sum ?? 0
                };
                
            let curr_margin_rate = (pl_curr_y_row?.["sale_amount_sum"] ?? 0) === 0 ? 0: ((pl_curr_y_row?.["margin_amount_sum"] ?? 0) / (pl_curr_y_row?.["sale_amount_sum"] ?? 0))*100;
            let last_margin_rate = (pl_last_y_row?.["sale_amount_sum"] ?? 0) === 0 ? 0: ((pl_last_y_row?.["margin_amount_sum"] ?? 0) / (pl_last_y_row?.["sale_amount_sum"] ?? 0))*100;
            let curr_contribution = (pl_curr_y_row?.["margin_amount_sum"] ?? 0) - (sga_curr_y_row?.["sga_amount_sum"] ?? 0);
            let last_contribution = (pl_last_y_row?.["margin_amount_sum"] ?? 0) - (sga_last_y_row?.["sga_amount_sum"] ?? 0);

            let sale_curr_rate = (curr_target?.target_sale ?? 0) === 0 ? 0 : ((pl_curr_y_row?.sale_amount_sum ?? 0) / (curr_target?.target_sale ?? 0)*100000000) * 100;
            let sale_last_rate = (last_target?.target_sale ?? 0) === 0 ? 0 : ((pl_last_y_row?.sale_amount_sum ?? 0) / (last_target?.target_sale ?? 0)) * 100;
            let margin_curr_rate = (curr_target?.target_margin ?? 0) === 0 ? 0 : ((pl_curr_y_row?.margin_amount_sum ?? 0) / (curr_target?.target_margin ?? 0)*100000000) * 100;
            let margin_last_rate = (last_target?.target_margin ?? 0) === 0 ? 0 : ((pl_last_y_row?.margin_amount_sum ?? 0) / (last_target?.target_margin ?? 0)) * 100;
            let margin_rate_curr_rate = (curr_target?.target_margin_rate ?? 0) === 0 ? 0 : (curr_margin_rate / (curr_target?.target_margin_rate ?? 0)) * 100;
            let margin_rate_last_rate = (last_target?.target_margin_rate ?? 0) === 0 ? 0 : (last_margin_rate / (last_target?.target_margin_rate ?? 0)) * 100;
            let dt_curr_rate = (curr_target?.target_dt_sale ?? 0) === 0 ? 0 : ((dt_pl_curr_y_row?.sale_amount_sum ?? 0) / ((curr_target?.target_dt_sale ?? 0)*100000000)) * 100;
            let dt_last_rate = (last_target?.target_dt_sale ?? 0) === 0 ? 0 : ((dt_pl_last_y_row?.sale_amount_sum ?? 0) / (last_target?.target_dt_sale ?? 0)) * 100;
            let br_cost_curr_rate = (curr_target?.target_br_cost ?? 0) === 0 ? 0 : ((rsp_curr_y_row?.cost_month_sum_value ?? 0) / (curr_target?.target_br_cost ?? 0)/100) * 100;
            let br_cost_last_rate = (last_target?.target_br_cost ?? 0) === 0 ? 0 : ((rsp_last_y_row?.cost_month_sum_value ?? 0) / (last_target?.target_br_cost ?? 0)) * 100;
            let rohc_curr_rate = (curr_target?.target_rohc ?? 0) === 0 ? 0 : (curr_rohc / (curr_target?.target_rohc ?? 0)) * 100;
            let rohc_last_rate = (last_target?.target_rohc ?? 0) === 0 ? 0 : (last_rohc/ (last_target?.target_rohc ?? 0)) * 100;
            let contribution_curr_rate = (curr_target?.target_cont_profit ?? 0) === 0 ? 0 : curr_contribution / ((curr_target?.target_cont_profit ?? 0)*100000000) * 100;
            let contribution_last_rate = (last_target?.target_cont_profit ?? 0) === 0 ? 0 : last_contribution / (last_target?.target_cont_profit ?? 0) * 100;
            let nonmm_curr_rate = (curr_target?.target_non_mm ?? 0) === 0 ? 0 : (curr_non_mm?.sale_amount_sum ?? 0) / ((curr_target?.target_non_mm ?? 0)*100000000) * 100;
            let nonmm_last_rate = (last_target?.target_non_mm ?? 0) === 0 ? 0 : (last_non_mm?.sale_amount_sum ?? 0) / (last_target?.target_non_mm ?? 0) * 100;
            const temp_data =
                {
                    sale_gap : sale_curr_rate - sale_last_rate,//전사, account, cloud
                    margin_gap : margin_curr_rate - margin_last_rate,//전사
                    margin_rate_gap : margin_rate_curr_rate - margin_rate_last_rate,//전사, delivery, cloud
                    margin_rate_gap : margin_rate_curr_rate - margin_rate_last_rate,//전사, delivery, cloud
                    dt_gap : dt_curr_rate - dt_last_rate,//전사, delivery, account, cloud
                    br_cost_gap : br_cost_curr_rate - br_cost_last_rate,//delivery, cloud
                    rohc_gap : rohc_curr_rate - rohc_last_rate,//delivery, account, cloud
                    contribution_gap : contribution_curr_rate - contribution_last_rate,//account, cloud
                    nonmm_gap : nonmm_curr_rate - nonmm_last_rate //cloud
                };

            oResult.push(temp_data);
            return oResult
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
};