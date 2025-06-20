module.exports = (srv) => {
    srv.on('get_actual_oi', async (req) => {

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
         * org_target_sum_view [목표]
         * [부문/본부/팀 + 년,금액] 조직 별 연단위 목표금액
         */
        const target_view = db.entities('common').org_target_sum_view;
        /**
         * pl.wideview_unpivot_view [실적]
         * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl').wideview_org_view;
        const dt_view = db.entities('pl').wideview_view;
        const non_mm_view = db.entities('pl').wideview_non_mm_view;

        /**
         * sga.wideview_unpivot_view [sg&a 집계]
         * [부문/본부/팀 + 년,month_amt,금액] 프로젝트 판관비 집계 뷰
         */
        const sga_view = db.entities('sga').wideview_view;

        const rsp_view = db.entities('rsp').wideview_unpivot_view

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
        let a_margin_column = [];
        let a_sga_column = [];
        for (let i = 1; i <= Number(month); i++) {
            a_sale_column.push(`sum(ifnull(sale_m${i}_amt,0))`)
            a_margin_column.push(`sum(ifnull(margin_m${i}_amt,0))`)
            a_sga_column.push(`sum(ifnull(labor_m${i}_amt,0))+sum(ifnull(exp_m${i}_amt,0))+sum(ifnull(iv_m${i}_amt,0))`)
        }

        let s_sale_column = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
        let s_margin_column = "(" + a_margin_column.join(' + ') + ') as margin_amount_sum';
        let s_sga_column = "(" + a_sga_column.join(' + ') + ') as sga_amount_sum';

        const pl_col_list = ['year', s_margin_column];
        const pl_where_conditions = { 'year': { in: [year, last_year] }};
        const pl_groupBy_cols = ['year'];

        const non_mm_col_list = ['year', s_sale_column];
        const non_mm_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { 'not in':['WA','D']}};
        const non_mm_groupBy_cols = ['year'];

        /**
         * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const dt_pl_col_list = ['year', s_sale_column];
        const dt_pl_where_conditions = { 'year': { in: [year, last_year] }, 'dgtr_task_cd': { '!=': null, and: { 'dgtr_task_cd': { '!=': '' } } }, src_type: { in: ['E', 'WO', 'P'] } };
        const dt_pl_groupBy_cols = ['year'];

        /**
         * SG&A 조회용 컬럼
         * is_total_cc false = 사업 / true = 전사
         */
        const sga_col_list = ['year', s_sga_column];
        const sga_where_conditions = { 'year': { in: [year, last_year] }, 'is_total_cc':{in:[false,null]}};
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
        const org_child_col = `case
            when lv1_id = '${org_id}' THEN 'div_ccorg_cd'
            when lv2_id = '${org_id}' THEN 'div_ccorg_cd'
            when lv3_id = '${org_id}' THEN 'div_ccorg_cd'
            when div_id = '${org_id}' THEN 'hdqt_ccorg_cd'
            when hdqt_id = '${org_id}' THEN 'team_ccorg_cd'
            when team_id = '${org_id}' THEN 'team_ccorg_cd'
            end as org_child_level`;

        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, org_child_col, 'org_ccorg_cd'])
            .where({ 'org_id': org_id });

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        // 조직 정보를 where 조건에 추가
        let org_level = orgInfo.org_level;
        let org_child_level = orgInfo.org_child_level;
        let org_ccorg_cd = orgInfo.org_ccorg_cd;

        // 선택한 조직에 따른 조직 호출 (부문보다 높을 시 부문 단위, 부문일 때 본부 단위, 본부일 때 팀 단위)
        let org_where = { [org_level]: orgInfo.org_ccorg_cd };
        if (org_level.includes("lv")) {    // 부문보다 높은 조직은 부문 목록 반환
            org_where["org_type"] = "1796";
        } else if (org_level.includes("div")) {    // 부문은 부문 하위의 본부 목록 반환
            org_where["org_type"] = "6907";
        } else if (org_level.includes("hdqt")) {   // 본부는 본부 하위의 팀 목록 반환
            org_where["org_type"] = "1414";
        } else if (org_level.includes("team")) {   // 팀
            org_where["org_type"] = "1414";
        }

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
        //년도 추가해야함
        const target_where_conditions = { 'target_year': { in: [year, last_year] }};
        let target_where = org_level.includes('lv1') ? {...target_where_conditions, total:true } : org_level.includes('hdqt') ? {...target_where_conditions, total:false ,[org_level]: org_ccorg_cd} : {...target_where_conditions, total:false, div_ccorg_cd : {'!=':null},hdqt_ccorg_cd : null, [org_level]: org_ccorg_cd};
        
        let target_column = org_level.includes('div') || org_level.includes('hdqt') ? [...target_col_list, 'max(ifnull(target_br_cost_amt,0)) as target_br_cost_amt'] : target_col_list
        const target_groupBy = ['target_year']

        const rsp_col_list = ['year', 'month_amt',
            'sum(ifnull(bill_amt_sum, 0)) as bill_amt_sum',
            'sum(ifnull(indirect_cost_amt_sum, 0)) as indirect_cost_amt_sum',
            'sum(ifnull(opp_amt_sum, 0)) as opp_amt_sum',
            'sum(ifnull(total_amt_sum, 0)) as total_amt_sum',
            'sum(ifnull(avg_amt_sum, 0)) as avg_amt_sum',
        ];
        const rsp_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt':month, 'actual_yn': true, [org_level]: orgInfo.org_ccorg_cd };
        const rsp_groupBy_cols = ['year', 'month_amt'];
        
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

        let rsp_column = rsp_col_list;
        let rsp_where = rsp_where_conditions;
        let rsp_groupBy = rsp_groupBy_cols;

        // DB 쿼리 실행 (병렬)
        const [target_data, pl_data, non_mm, sga_data, dt_pl_data, rsp_data, org_full_level_data] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(target_view).columns(target_column).where(target_where).groupBy(...target_groupBy),
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(non_mm_view).columns(non_mm_column).where(non_mm_where).groupBy(...non_mm_groupBy),
            SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
            SELECT.from(dt_view).columns(dt_pl_column).where(dt_pl_where).groupBy(...dt_pl_groupBy),
            SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
            SELECT.from(org_full_level).where(org_where),
        ]);

        
        let a_sga_filtered_curr_y_rou = sga_data.filter(o => o.year === year),
            a_sga_filtered_last_y_rou = sga_data.filter(o => o.year === last_year);

        let pl_curr_y_row = pl_data.find(o => o.year === year),
            pl_last_y_row = pl_data.find(o => o.year === last_year),
            sga_curr_y_row = { sga_amount_sum: a_sga_filtered_curr_y_rou.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0) },
            sga_last_y_row = { sga_amount_sum: a_sga_filtered_last_y_rou.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0) },
            dt_pl_curr_y_row = dt_pl_data.find(o => o.year === year),
            dt_pl_last_y_row = dt_pl_data.find(o => o.year === last_year),
            curr_target = target_data.find(a => a.target_year === year),
            last_target = target_data.find(a => a.target_year === last_year),
            curr_non_mm = non_mm.find(a => a.year === year),
            last_non_mm = non_mm.find(a => a.year === last_year),
            a_rsp_curr_y_row = rsp_data.find(o => o.year === year),
            a_rsp_last_y_row = rsp_data.find(o => o.year === last_year);

        // TBD
        // DT매출 = 조직별 월별 매출 중 DT Tagging 대상만 집계 (DT Tagging -> PL_WIDEVIEW 테이블에서 prj_tp_nm이 DT로 시작하는 데이터)
        const sale_data =
        {
            "display_order": 1,
            "type": "DT 매출",
            "target_curr_y_value": curr_target?.dt_target_sale_amt ?? 0,
            "actual_curr_ym_value": dt_pl_curr_y_row?.['sale_amount_sum'] ?? 0,
            "actual_last_ym_value": dt_pl_last_y_row?.['sale_amount_sum'] ?? 0,
            "actual_curr_ym_rate": (curr_target?.dt_target_sale_amt ?? 0) !== 0 ? (dt_pl_curr_y_row?.["sale_amount_sum"] ?? 0) / (curr_target.dt_target_sale_amt * 100000000) * 100 : 0,
            "actual_last_ym_rate": (last_target?.dt_target_sale_amt ?? 0) !== 0 ? (dt_pl_last_y_row?.["sale_amount_sum"] ?? 0) / (last_target.dt_target_sale_amt * 100000000) * 100 : 0
        };
        oResult.push(sale_data);

        // TBD
        // Offshoring = 조직별 월별 AGS외주비(OI_WIDEVIEW) * 환산효과
        const o_offshoring =
        {
            "display_order": 2,
            "type": "Offshoring",
            "target_curr_y_value": curr_target?.offshore_target_amt ?? 0,
            "actual_curr_ym_value": 0,
            "actual_last_ym_value": 0,
            "actual_curr_ym_rate": 0,
            "actual_last_ym_rate": 0
        };
        oResult.push(o_offshoring);

        // TBD
        // Non-MM = 조직별 월별 매출 중 Non-MM Tagging 대상만 집계 (Non-MM Tagging 대상 기준?)
        const non_mm_data =
        {
            "display_order": 3,
            "type": "Non-MM",
            "target_curr_y_value": curr_target?.non_mm_target_sale_amt ?? 0,
            "actual_curr_ym_value": curr_non_mm?.sale_amount_sum ?? 0,
            "actual_last_ym_value": last_non_mm?.sale_amount_sum ?? 0,
            "actual_curr_ym_rate": (curr_target?.non_mm_target_sale_amt ?? 0) === 0 ? 0 : (curr_non_mm?.sale_amount_sum ?? 0)/curr_target.non_mm_target_sale_amt*100,
            "actual_last_ym_rate": (last_target?.non_mm_target_sale_amt ?? 0) === 0 ? 0 : (last_non_mm?.sale_amount_sum ?? 0)/last_target.non_mm_target_sale_amt*100
        };
        oResult.push(non_mm_data);
        
        // BR = 조직별 월별 빌링인건비 / 총인건비
        const br_data =
        {
            "display_order": 4,
            "type": "BR",
            "target_curr_y_value": curr_target?.target_br_cost_amt ?? 0,
            "actual_curr_ym_value": (a_rsp_curr_y_row?.total_amt_sum ?? 0) === 0 ? 0 : ((a_rsp_curr_y_row?.bill_amt_sum ?? 0) + (a_rsp_curr_y_row?.indirect_cost_amt_sum ?? 0) + (a_rsp_curr_y_row?.opp_amt_sum ?? 0))/a_rsp_curr_y_row.total_amt_sum,
            "actual_last_ym_value": (a_rsp_last_y_row?.total_amt_sum ?? 0) === 0 ? 0 : ((a_rsp_last_y_row?.bill_amt_sum ?? 0) + (a_rsp_last_y_row?.indirect_cost_amt_sum ?? 0) + (a_rsp_last_y_row?.opp_amt_sum ?? 0))/a_rsp_last_y_row.total_amt_sum,
            "actual_curr_ym_rate": (curr_target?.target_br_cost_amt ?? 0) === 0 || (a_rsp_curr_y_row?.total_amt_sum ?? 0) === 0 ? 0 : ((a_rsp_curr_y_row?.bill_amt_sum ?? 0) + (a_rsp_curr_y_row?.indirect_cost_amt_sum ?? 0) + (a_rsp_curr_y_row?.opp_amt_sum ?? 0))/a_rsp_curr_y_row.total_at_sum/(curr_target.target_br_cost_am)*100,
            "actual_last_ym_rate": (last_target?.target_br_cost_amt ?? 0) === 0 || (a_rsp_last_y_row?.total_amt_sum ?? 0) === 0 ? 0 : ((a_rsp_last_y_row?.bill_amt_sum ?? 0) + (a_rsp_last_y_row?.indirect_cost_amt_sum ?? 0) + (a_rsp_last_y_row?.opp_amt_sum ?? 0))/a_rsp_last_y_row.total_at_sum/(last_target.target_br_cost_am)*100,
        };
        oResult.push(br_data);

        // RoHC = 조직별 월별 공헌이익 / 총인건비
        const rohc_data =
        {
            "display_order": 5,
            "type": "RoHC",
            "target_curr_y_value": curr_target?.target_rohc ?? 0,
            "actual_curr_ym_value": (a_rsp_curr_y_row?.['total_amt_sum'] ?? 0) !== 0 ? ((pl_curr_y_row?.["margin_amount_sum"] ?? 0) - (sga_curr_y_row?.["sga_amount_sum"] ?? 0)) / a_rsp_curr_y_row['total_amt_sum'] : 0,
            "actual_last_ym_value": (a_rsp_last_y_row?.['total_amt_sum'] ?? 0) !== 0 ? ((pl_last_y_row?.["margin_amount_sum"] ?? 0) - (sga_last_y_row?.["sga_amount_sum"] ?? 0)) / a_rsp_last_y_row['total_amt_sum'] : 0,
            "actual_curr_ym_rate": (curr_target?.target_rohc ?? 0) === 0 || (a_rsp_curr_y_row?.['total_amt_sum'] ?? 0) === 0 ? 0 : (((pl_curr_y_row?.["margin_amount_sum"] ?? 0) - (sga_curr_y_row?.["sga_amount_sum"] ?? 0)) / a_rsp_curr_y_row['total_amt_sum']) / (curr_target.target_rohc * 100000000) * 100,
            "actual_last_ym_rate": (last_target?.target_rohc ?? 0) === 0 || (a_rsp_last_y_row?.['total_amt_sum'] ?? 0) === 0 ? 0 : (((pl_last_y_row?.["margin_amount_sum"] ?? 0) - (sga_last_y_row?.["sga_amount_sum"] ?? 0)) / a_rsp_last_y_row['total_amt_sum']) / (last_target.target_rohc * 100000000) * 100,
        };
        oResult.push(rohc_data);
        return oResult;

    });
}