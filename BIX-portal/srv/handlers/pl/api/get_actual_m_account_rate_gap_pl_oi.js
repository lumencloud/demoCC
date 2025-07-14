const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_actual_m_account_rate_gap_pl_oi', async (req) => {
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
             * common_org_full_level_view [조직정보]
             */
            const org_full_level = db.entities('common').org_full_level_view;

            const dt_view = db.entities('pl').wideview_dt_view;
            //org_tp:account, hybrid일 경우 사용
            const account_dt_view = db.entities('pl').wideview_account_dt_view;
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id } = req.data;
            const last_year = (Number(year) - 1).toString();

            // QUERY 공통 파라미터 선언
            /**
             * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */

            let a_sale_column = [];
            let a_sale_total_column = [];
            let a_margin_column = [];
            let a_margin_total_column = [];
            for (let i = 1; i <= 12; i++) {
                if (i <= Number(month)) {
                    a_sale_column.push(`ifnull(sum(sale_m${i}_amt), 0)`)
                    a_margin_column.push(`ifnull(sum(margin_m${i}_amt), 0)`)
                };
                a_sale_total_column.push(`ifnull(sum(sale_m${i}_amt), 0)`)
                a_margin_total_column.push(`ifnull(sum(margin_m${i}_amt), 0)`)
            };
            let s_sale_column = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
            let s_sale_total_column = "(" + a_sale_total_column.join(' + ') + ') as sale_total_amount_sum';
            let s_margin_column = "(" + a_margin_column.join(' + ') + ') as margin_amount_sum';
            let s_margin_total_column = "(" + a_margin_total_column.join(' + ') + ') as margin_total_amount_sum';

            const pl_col_list = ['year', s_sale_column, s_margin_column, s_sale_total_column, s_margin_total_column];
            const pl_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { 'not in': ['WO', 'D']},'biz_tp_account_cd':{'!=':null, and : {'biz_tp_account_cd': {'!=':''}}} };
            const pl_groupBy_cols = ['year'];

            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            const dt_pl_col_list = ['year', s_sale_column, s_sale_total_column];
            const dt_pl_where_conditions = { 'year': { in: [year, last_year] }, 'biz_tp_account_cd':{'!=':null, and : {'biz_tp_account_cd': {'!=':''}}} };
            const dt_pl_groupBy_cols = ['year'];

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

            let dt_pl_column = dt_pl_col_list;
            let dt_pl_where = org_col_nm === 'lv1_id' ? dt_pl_where_conditions : { ...dt_pl_where_conditions, [org_col_nm]: org_id };
            let dt_pl_groupBy = dt_pl_groupBy_cols;

            let pl_view_select, dt_view_select;
            if((org_col_nm !== 'lv1_id' || org_col_nm !== 'lv2_id') && orgInfo.org_tp === 'hybrid' || orgInfo.org_tp === 'account'){
                pl_view_select = account_pl_view;
                dt_view_select = account_dt_view;
            }else if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id'|| orgInfo.org_tp === 'delivery'){
                pl_view_select = pl_view;
                dt_view_select = dt_view;
            };
            // DB 쿼리 실행 (병렬)
            const [query, query_target, dt_pl_data] = await Promise.all([
                // PL 실적, 목표 조회
                SELECT.from(pl_view_select).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                get_org_target(year, ['A01', 'A03', 'A02', 'B02']),
                SELECT.from(dt_view_select).columns(dt_pl_column).where(dt_pl_where).groupBy(...dt_pl_groupBy),
            ]);
            if(!query.length && !dt_pl_data.length){
                //return req.res.status(204).send();
                return []
            }

            let pl_curr_y_row = query.find(o => o.year === year),
                pl_last_y_row = query.find(o => o.year === last_year),
                dt_pl_curr_y_row = dt_pl_data.find(o => o.year === year),
                dt_pl_last_y_row = dt_pl_data.find(o => o.year === last_year),
                curr_target = query_target.find(oTarget => oTarget.org_id === org_id),
                last_target = {
                    "target_dt_sale": dt_pl_last_y_row?.sale_total_amount_sum ?? 0,
                    "target_margin": pl_last_y_row?.margin_total_amount_sum ?? 0,
                    "target_margin_rate": (pl_last_y_row?.sale_total_amount_sum ?? 0) === 0 ? 0 : ((pl_last_y_row?.margin_total_amount_sum ?? 0) / pl_last_y_row.sale_total_amount_sum)*100,
                    "target_sale": pl_last_y_row?.sale_total_amount_sum ?? 0,
                    "target_year": last_year
                };

            let curr_margin_rate = (pl_curr_y_row?.["sale_amount_sum"] ?? 0) === 0 ? 0: ((pl_curr_y_row?.["margin_amount_sum"] ?? 0) / (pl_curr_y_row?.["sale_amount_sum"] ?? 0))*100;
            let last_margin_rate = (pl_last_y_row?.["sale_amount_sum"] ?? 0) === 0 ? 0: ((pl_last_y_row?.["margin_amount_sum"] ?? 0) / (pl_last_y_row?.["sale_amount_sum"] ?? 0))*100;

            let sale_curr_rate = (curr_target?.target_sale ?? 0) === 0 ? 0 : ((pl_curr_y_row?.sale_amount_sum ?? 0) / ((curr_target?.target_sale ?? 0)*100000000)) * 100;
            let sale_last_rate = (last_target?.target_sale ?? 0) === 0 ? 0 : ((pl_last_y_row?.sale_amount_sum ?? 0) / (last_target?.target_sale ?? 0)) * 100;
            let margin_curr_rate = (curr_target?.target_margin ?? 0) === 0 ? 0 : ((pl_curr_y_row?.margin_amount_sum ?? 0) / ((curr_target?.target_margin ?? 0)*100000000)) * 100;
            let margin_last_rate = (last_target?.target_margin ?? 0) === 0 ? 0 : ((pl_last_y_row?.margin_amount_sum ?? 0) / (last_target?.target_margin ?? 0)) * 100;
            let margin_rate_curr_rate = (curr_target?.target_margin_rate ?? 0) === 0 ? 0 : (curr_margin_rate / ((curr_target?.target_margin_rate ?? 0)*100000000)) * 100;
            let margin_rate_last_rate = (last_target?.target_margin_rate ?? 0) === 0 ? 0 : (last_margin_rate / (last_target?.target_margin_rate ?? 0)) * 100;
            let dt_curr_rate = (curr_target?.target_dt_sale ?? 0) === 0 ? 0 : ((dt_pl_curr_y_row?.sale_amount_sum ?? 0) / ((curr_target?.target_dt_sale ?? 0)*100000000)) * 100;
            let dt_last_rate = (last_target?.target_dt_sale ?? 0) === 0 ? 0 : ((dt_pl_last_y_row?.sale_amount_sum ?? 0) / (last_target?.target_dt_sale ?? 0)) * 100;
            
            const temp_data =
                {
                    sale_gap : sale_curr_rate - sale_last_rate,
                    margin_gap : margin_curr_rate - margin_last_rate,
                    margin_rate_gap : margin_rate_curr_rate - margin_rate_last_rate,
                    dt_gap : dt_curr_rate - dt_last_rate
                };

            oResult.push(temp_data);
            return oResult
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
};