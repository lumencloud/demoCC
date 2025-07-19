const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_actual_oi', async (req) => {
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
             * pl.wideview_org_view [실적]
             * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const pl_view = db.entities('pl').wideview_org_view;
            const dt_view = db.entities('pl').wideview_dt_view;
            const non_mm_view = db.entities('pl').wideview_non_mm_view;

            //org_tp:account, hybrid일 경우 사용
            const account_pl_view = db.entities('pl').wideview_account_org_view;
            const account_dt_view = db.entities('pl').wideview_account_dt_view;
            const account_nonmm_view = db.entities('pl').wideview_account_non_mm_view;

            /**
             * sga.wideview_view [sg&a 집계]
             * [부문/본부/팀 + 년,month_amt,금액] 프로젝트 판관비 집계 뷰
             */
            const sga_view = db.entities('sga').wideview_view;
            const rsp_view = db.entities('rsp').wideview_view;
            const oi_view = db.entities('oi').wideview_view;

            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;
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
            let a_sga_column = [];
            let a_sga_total_column = [];
            let a_rsp_total_amt_ym = [];
            let a_rsp_total_amt_y_total = [];
            let a_sum_b_mm = [];
            let a_sum_bun_mm = [];
            for (let i = 1; i <= 12; i++) {
                if (i <= Number(month)) {
                    a_sale_column.push(`sum(sale_m${i}_amt)`)
                    a_margin_column.push(`sum(margin_m${i}_amt)`)
                    a_sga_column.push(`sum(labor_m${i}_amt)+sum(exp_m${i}_amt)+sum(iv_m${i}_amt)`)
                    a_rsp_total_amt_ym.push(`ifnull(sum(total_m${i}_amt), 0)`)
                    a_sum_b_mm.push(`sum(b_mm_m${i}_amt)`)
                    a_sum_bun_mm.push(`sum(bun_mm_m${i}_amt)`)
                };
                a_sale_total_column.push(`sum(sale_m${i}_amt)`)
                a_margin_total_column.push(`sum(margin_m${i}_amt)`)
                a_sga_total_column.push(`sum(labor_m${i}_amt)+sum(exp_m${i}_amt)+sum(iv_m${i}_amt)`)
                a_rsp_total_amt_y_total.push(`sum(total_m${i}_amt)`)
            };

            let s_sale_column = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
            let s_sale_total_column = "(" + a_sale_total_column.join(' + ') + ') as sale_total_amount_sum';
            let s_margin_column = "(" + a_margin_column.join(' + ') + ') as margin_amount_sum';
            let s_margin_total_column = "(" + a_margin_total_column.join(' + ') + ') as margin_total_amount_sum';
            let s_sga_column = "(" + a_sga_column.join(' + ') + ') as sga_amount_sum';
            let s_sga_total_column = "(" + a_sga_total_column.join(' + ') + ') as sga_total_amount_sum';
            let s_rsp_total_amt_ym = "(" + a_rsp_total_amt_ym.join(' + ') + ")";
            // let s_rsp_total_amt_ym = "(" + a_rsp_total_amt_ym.join(' + ') + ') as total_year_amt';
            // let s_rsp_total_amt_ym_total = "(" + a_rsp_total_amt_y_total.join(' + ') + ') as total_amt_year_sum';
            let s_sum_b_mm = a_sum_b_mm.join(' + ')
            let s_sum_bun_mm = a_sum_bun_mm.join(' + ')

            const pl_col_list = ['year', s_margin_column, s_margin_total_column];
            const pl_where_conditions = { 'year': { in: [year, last_year] } };
            const pl_groupBy_cols = ['year'];

            const non_mm_col_list = ['year', s_sale_column, s_sale_total_column];
            const non_mm_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { 'not in': ['WA', 'D'] } };
            const non_mm_groupBy_cols = ['year'];

            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            const dt_pl_col_list = ['year', s_sale_column, s_sale_total_column];
            const dt_pl_where_conditions = { 'year': { in: [year, last_year] } };
            const dt_pl_groupBy_cols = ['year'];

            /**
             * SG&A 조회용 컬럼
             * is_total_cc false = 사업 / true = 전사
             */
            const sga_col_list = ['year', s_sga_column, s_sga_total_column];
            const sga_where_conditions = { 'year': { in: [year, last_year] }, 'is_total_cc': { in: [false, null] } };
            const sga_groupBy_cols = ['year'];

            /**
             * +++++ TBD +++++
             * 권한 체크하여 사용자가 조회 가능한 조직인지 판별 후 코드 진행
             */

            /**
             * org_id 파라미터값으로 조직정보 조회
             */
            let orgInfo = await SELECT.one.from(org_full_level).columns(['org_level', 'org_ccorg_cd', 'org_tp', 'lv3_ccorg_cd'])
                .where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            // 조직 정보를 where 조건에 추가
            let org_level = orgInfo.org_level+'_ccorg_cd';
            let org_ccorg_cd = orgInfo.org_ccorg_cd;

            // 선택한 조직에 따른 조직 호출 (부문보다 높을 시 부문 단위, 부문일 때 본부 단위, 본부일 때 팀 단위)
            let org_where = { [org_level]: orgInfo.org_ccorg_cd };
            if (org_level.includes("lv")) {    // 부문보다 높은 조직은 부문 목록 반환
                org_where["org_level"] = "div";
            } else if (org_level.includes("div")) {    // 부문은 부문 하위의 본부 목록 반환
                org_where["org_level"] = "hdqt";
            } else if (org_level.includes("hdqt")) {   // 본부는 본부 하위의 팀 목록 반환
                org_where["org_level"] = "team";
            } else if (org_level.includes("team")) {   // 팀
                org_where["org_level"] = "team";
            }

            let pl_column = pl_col_list;
            let pl_where = org_level.includes('lv1') ? pl_where_conditions : { ...pl_where_conditions, [org_level]: org_ccorg_cd };
            let pl_groupBy = pl_groupBy_cols;

            let non_mm_column = non_mm_col_list;
            let non_mm_where = org_level.includes('lv1') ? non_mm_where_conditions : { ...non_mm_where_conditions, [org_level]: org_ccorg_cd };
            let non_mm_groupBy = non_mm_groupBy_cols;

            let dt_pl_column = dt_pl_col_list;
            let dt_pl_where = org_level.includes('lv1') ? dt_pl_where_conditions : { ...dt_pl_where_conditions, [org_level]: org_ccorg_cd };
            let dt_pl_groupBy = dt_pl_groupBy_cols;

            let sga_column = sga_col_list;
            let sga_where = org_level.includes('lv1') ? sga_where_conditions : { ...sga_where_conditions, [org_level]: org_ccorg_cd };
            let sga_groupBy = sga_groupBy_cols;

            // rsp wideview (m, opp, total)
            const rsp_column = ['year',
                `case when sum(bun_mm_amt_sum) <> 0 then sum(b_mm_amt_sum) / sum(bun_mm_amt_sum) else 0 end as mm_total_value`,
                `case when ${s_sum_bun_mm} <> 0 then (${s_sum_b_mm})/(${s_sum_bun_mm}) else 0 end as mm_month_sum_value`,
                `${s_rsp_total_amt_ym} as total_year_amt`, `sum(total_year_amt) as total_amt_year_sum`
            ];
            const rsp_where = { 'year': { in: [year, last_year] }, [org_level]: orgInfo.org_ccorg_cd, is_delivery: true };
            const rsp_groupBy = ['year'];

            const oi_column = [ 'year', 'sum(ito_month_amt) as ito_month_amt', 'sum(ito_year_amt) as ito_year_amt' ];
            const oi_where = { 'year': { in: [year, last_year] }, 'source' : 'oi', [org_level]: orgInfo.org_ccorg_cd };
            const oi_groupBy = ['year'];

            let pl_view_selec;
            let dt_view_selec;
            let nonmm_view_select;
            if((org_level !== 'lv1_ccorg_cd' || org_level !== 'lv2_ccorg_cd') && orgInfo.lv3_ccorg_cd === '237100' || orgInfo.org_tp === 'account'){
                pl_view_selec = account_pl_view;
                dt_view_selec = account_dt_view;
                nonmm_view_select = account_nonmm_view;
            }else{
                pl_view_selec = pl_view;
                dt_view_selec = dt_view;
                nonmm_view_select = non_mm_view;
            };

            // DB 쿼리 실행 (병렬)
            const [target_data, pl_data, non_mm, sga_data, dt_pl_data, rsp_data, offshoring_data] = await Promise.all([
                // PL 실적, 목표 조회
                get_org_target(year,['B01','B02','B04','A06','A05','A04','C04']),
                SELECT.from(pl_view_selec).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(nonmm_view_select).columns(non_mm_column).where(non_mm_where).groupBy(...non_mm_groupBy),
                SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
                SELECT.from(dt_view_selec).columns(dt_pl_column).where(dt_pl_where).groupBy(...dt_pl_groupBy),
                SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
                SELECT.from(oi_view).columns(oi_column).where(oi_where).groupBy(...oi_groupBy),
            ]);

            let a_sga_filtered_curr_y_row = sga_data.filter(o => o.year === year),
                a_sga_filtered_last_y_row = sga_data.filter(o => o.year === last_year);

            let pl_curr_y_row = pl_data.find(o => o.year === year),
                pl_last_y_row = pl_data.find(o => o.year === last_year),
                sga_curr_y_row = { sga_amount_sum: a_sga_filtered_curr_y_row.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0), sga_total_amount_sum: a_sga_filtered_curr_y_row.reduce((iSum, oData) => iSum += oData.sga_total_amount_sum, 0) },
                sga_last_y_row = { sga_amount_sum: a_sga_filtered_last_y_row.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0), sga_total_amount_sum: a_sga_filtered_last_y_row.reduce((iSum, oData) => iSum += oData.sga_total_amount_sum, 0) },
                dt_pl_curr_y_row = dt_pl_data.find(o => o.year === year),
                dt_pl_last_y_row = dt_pl_data.find(o => o.year === last_year),
                curr_target = target_data.find(a => a.org_ccorg_cd === org_ccorg_cd),
                curr_non_mm = non_mm.find(a => a.year === year),
                last_non_mm = non_mm.find(a => a.year === last_year),
                rsp_curr_y_row = rsp_data.find(o => o.year === year),
                rsp_last_y_row = rsp_data.find(o => o.year === last_year),
                off_curr_y_row = offshoring_data.find(o => o.year === year),
                off_last_y_row = offshoring_data.find(o => o.year === last_year)

            // TBD
            // DT매출 = 조직별 월별 매출 중 DT Tagging 대상만 집계 (DT Tagging -> PL_WIDEVIEW 테이블에서 prj_tp_nm이 DT로 시작하는 데이터)
            const sale_data =
            {
                "display_order": 1,
                "type": "DT 매출",
                "target_curr_y_value": curr_target?.target_dt_sale ?? 0,
                "actual_curr_ym_value": dt_pl_curr_y_row?.['sale_amount_sum'] ?? 0,
                "actual_last_ym_value": dt_pl_last_y_row?.['sale_amount_sum'] ?? 0,
                // "actual_last_ym_value": 0,
                "actual_curr_ym_rate": (curr_target?.target_dt_sale ?? 0) !== 0 ? (dt_pl_curr_y_row?.["sale_amount_sum"] ?? 0) / (curr_target?.target_dt_sale * 100000000) : 0,
                "actual_last_ym_rate": (dt_pl_last_y_row?.sale_total_amount_sum ?? 0) !== 0 ? (dt_pl_last_y_row?.sale_amount_sum ?? 0) / (dt_pl_last_y_row?.sale_total_amount_sum ?? 0) : 0 // 작년1~마감월 dt매출 / 작년1~12 dt매출
            };
            oResult.push(sale_data);

            // TBD
            // Offshoring = 조직별 월별 AGS외주비(OI_WIDEVIEW) * 환산효과
            const o_offshoring =
            {
                "display_order": 2,
                "type": "Offshoring",
                "target_curr_y_value": 0,
                "actual_curr_ym_value":0,
                "actual_last_ym_value":0,
                "actual_curr_ym_rate":0,
                "actual_last_ym_rate":0,
                // "target_curr_y_value": curr_target?.target_offshoring ?? 0,
                // "actual_curr_ym_value": off_curr_y_row?.ito_month_amt ?? 0,
                // "actual_last_ym_value": off_last_y_row?.ito_month_amt ?? 0,
                // "actual_curr_ym_rate": (curr_target?.target_offshoring ?? 0) === 0 ? 0 : (off_curr_y_row?.ito_month_amt ?? 0)/(curr_target.target_offshoring * 100000000),
                // "actual_last_ym_rate": (off_last_y_row?.ito_year_amt ?? 0) !== 0 ? (off_last_y_row?.ito_month_amt ?? 0) / (off_last_y_row?.ito_year_amt ?? 0) : 0 // 작년1~마감월 dt매출 / 작년1~12 dt매출
            };
            oResult.push(o_offshoring);

            // TBD
            // Non-MM = 조직별 월별 매출 중 Non-MM Tagging 대상만 집계 (Non-MM Tagging 대상 기준?)
            const non_mm_data =
            {
                "display_order": 3,
                "type": "Non-MM",
                "target_curr_y_value": curr_target?.target_non_mm ?? 0,
                "actual_curr_ym_value": curr_non_mm?.sale_amount_sum ?? 0,
                "actual_last_ym_value": last_non_mm?.sale_amount_sum ?? 0,
                "actual_curr_ym_rate": (curr_target?.target_non_mm ?? 0) === 0 ? 0 : ((curr_non_mm?.sale_amount_sum ?? 0) / 100000000) / curr_target.target_non_mm,
                "actual_last_ym_rate": (last_non_mm?.sale_total_amount_sum ?? 0) === 0 ? 0 : (last_non_mm?.sale_amount_sum ?? 0)/ last_non_mm.sale_total_amount_sum
            };
            oResult.push(non_mm_data);

            // BR = 조직별 월별 빌링인건비 / 총인건비
            const br_data =
            {
                "display_order": 4,
                "type": "BR",
                "target_curr_y_value": (curr_target?.target_br_mm ?? 0) / 100,
                "actual_curr_ym_value": rsp_curr_y_row?.mm_month_sum_value ?? 0,
                "actual_last_ym_value": rsp_last_y_row?.mm_month_sum_value ?? 0,
                "actual_curr_ym_rate": (curr_target?.target_br_mm ?? 0) === 0 ? 0 : (rsp_curr_y_row?.mm_month_sum_value ?? 0)/curr_target.target_br_mm,
                "actual_last_ym_rate": (rsp_last_y_row?.mm_total_value ?? 0) === 0 ? 0 : (rsp_last_y_row?.mm_month_sum_value ?? 0)/rsp_last_y_row.mm_total_value,
            };
            oResult.push(br_data);

            // RoHC = 조직별 월별 공헌이익 / 총인건비
            const rohc_data =
            {
                "display_order": 5,
                "type": "RoHC",
                "target_curr_y_value": (curr_target?.target_rohc ?? 0),
                "actual_curr_ym_value": (rsp_curr_y_row?.['total_year_amt'] ?? 0) !== 0 ? ((pl_curr_y_row?.["margin_amount_sum"] ?? 0) - (sga_curr_y_row?.["sga_amount_sum"] ?? 0)) / rsp_curr_y_row['total_year_amt'] : 0,
                "actual_last_ym_value": (rsp_last_y_row?.['total_year_amt'] ?? 0) !== 0 ? ((pl_last_y_row?.["margin_amount_sum"] ?? 0) - (sga_last_y_row?.["sga_amount_sum"] ?? 0)) / rsp_last_y_row['total_year_amt'] : 0,
                "actual_curr_ym_rate": (curr_target?.target_rohc ?? 0) === 0 || (rsp_curr_y_row?.['total_year_amt'] ?? 0) === 0 ? 0 : (((pl_curr_y_row?.["margin_amount_sum"] ?? 0) - (sga_curr_y_row?.["sga_amount_sum"] ?? 0)) / rsp_curr_y_row['total_year_amt']) / (curr_target?.target_rohc ?? 0),
                "actual_last_ym_rate": (rsp_last_y_row?.total_amt_year_sum ?? 0) === 0 || (rsp_last_y_row?.['total_year_amt'] ?? 0) === 0 ? 0 : (((pl_last_y_row?.["margin_amount_sum"] ?? 0) - (sga_last_y_row?.["sga_amount_sum"] ?? 0)) / rsp_last_y_row['total_year_amt']) / (((pl_last_y_row?.margin_total_amount_sum ?? 0) - (sga_last_y_row?.sga_total_amount_sum ?? 0)) / (rsp_last_y_row?.total_amt_year_sum)), // 작년 1~마감월(조직별 월별 공헌이익 / 총인건비) / 작년1~12 (조직별 월별 공헌이익 / 총인건비)
            };
            oResult.push(rohc_data);
            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}