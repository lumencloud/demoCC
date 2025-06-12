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
         * target [목표]
         * [부문/본부/팀 + 년,금액] 조직 별 연단위 목표금액
         */
        const target = db.entities('common').target_view;
        /**
         * pl.wideview_unpivot_view [실적]
         * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl').wideview_unpivot_view;
        /**
         * sga.wideview_unpivot_view [sg&a 집계]
         * [부문/본부/팀 + 년,month_amt,금액] 프로젝트 판관비 집계 뷰
         */
        const sga_view = db.entities('sga').wideview_unpivot_view;
        /**
         * rsp.wideview_unpivot_view [비용 집계]
         * [부문/본부/팀 + 년,month_amt,금액] 프로젝트 비용 집계 뷰
         */
        const rsp_view = db.entities('rsp').wideview_unpivot_view;
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
         * 타겟 뷰 조회용 컬럼
         */
        const target_col_list = [
            'year', 'sum(ifnull(dt_sale_target,0)) as dt_sale_target', 'sum(ifnull(offshoring_target,0)) as offshoring_target', 'sum(ifnull(non_mm_target,0)) as non_mm_target', 'sum(ifnull(br_target,0)) as br_target', 'sum(ifnull(rohc_target,0)) as rohc_target'];
        const target_where_conditions = {'is_total' : true, 'year': { in: [year, last_year] } };
        const target_groupBy_cols = ['year']

        /**
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const pl_col_list = [
            'year', 'month_amt', 'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(prj_prfm_amount_sum,0)) as prj_prfm_amount_sum', 'sum(ifnull(margin_amount_sum,0)) as margin_amount_sum'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month, 'is_delivery': true , 'src_type': { 'not in':['WA','D']}};
        const pl_groupBy_cols = ['year', 'month_amt'];

        /**
         * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const dt_pl_col_list = [
            'year', 'month_amt', 'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(prj_prfm_amount_sum,0)) as prj_prfm_amount_sum', 'sum(ifnull(margin_amount_sum,0)) as margin_amount_sum'];
        const dt_pl_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month, 'is_delivery': true, 'dgtr_task_cd': {'!=':null}, 'src_type': { 'not in':['WA','D']}};
        const dt_pl_groupBy_cols = ['year', 'month_amt'];

        /**
         * SG&A 조회용 컬럼
         * shared_exp_yn false = 사업 / true = 전사
         */
        const sga_col_list = ['year', 'month_amt', 'shared_exp_yn',
            '(sum(ifnull(labor_amount_sum,0)) + sum(ifnull(iv_amount_sum,0)) + sum(ifnull(exp_amount_sum,0))) as amount_sum'];
        const sga_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month, 'is_delivery': true, 'shared_exp_yn':false };
        const sga_groupBy_cols = ['year', 'month_amt', 'shared_exp_yn'];

        // rsp 조회용 정보
        const rsp_col_list = ['year', 'month_amt', 'sum(ifnull(total_amt_sum,0)) as total_amt_sum', 'sum(ifnull(bill_amt_sum,0)) as bill_amt_sum'];
        const rsp_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month, 'is_delivery': true };
        const rsp_groupBy_cols = ['year', 'month_amt'];

        /**
         * +++++ TBD +++++
         * 권한 체크하여 사용자가 조회 가능한 조직인지 판별 후 코드 진행
         */

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
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd'])
            .where({ 'org_id': org_id });

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        //조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        // ccorg_cd 만 가지고 있는 경우 조회조건으로 사용
        let org_ccorg_col_nm = org_col_nm.slice(0, -2) + 'ccorg_cd'; // <>_id 에서 id 제거 후 <>_ccorg_cd 컬럼명 생성
        let org_ccorg_cd = orgInfo.org_ccorg_cd;

        // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
        let target_column = target_col_list;
        let target_where = org_col_nm === 'lv1_id' ? target_where_conditions : { ...target_where_conditions, [org_col_nm]: org_id };
        let target_groupBy = target_groupBy_cols;

        let pl_column = pl_col_list;
        let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
        let pl_groupBy = pl_groupBy_cols;

        let dt_pl_column = dt_pl_col_list;
        let dt_pl_where = org_col_nm === 'lv1_id' ? dt_pl_where_conditions : { ...dt_pl_where_conditions, [org_col_nm]: org_id };
        let dt_pl_groupBy = dt_pl_groupBy_cols;

        let sga_column = sga_col_list;
        let sga_where = org_col_nm === 'lv1_id' ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id };
        let sga_groupBy = sga_groupBy_cols;

        let rsp_column = rsp_col_list;
        let rsp_where = org_col_nm === 'lv1_id' ? rsp_where_conditions : { ...rsp_where_conditions, [org_ccorg_col_nm]: org_ccorg_cd };
        let rsp_groupBy = rsp_groupBy_cols;

        // DB 쿼리 실행 (병렬)
        const [target_data, pl_data, sga_data, rsp_data, dt_pl_data] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(target).columns(target_column).where(target_where).groupBy(...target_groupBy),
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
            SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
            SELECT.from(pl_view).columns(dt_pl_column).where(dt_pl_where).groupBy(...dt_pl_groupBy),
        ]);
        
        let rsp_curr_y_row = rsp_data.find(o => o.year === year),
            rsp_last_y_row = rsp_data.find(o => o.year === last_year),
            pl_curr_y_row = pl_data.find(o => o.year === year),
            pl_last_y_row = pl_data.find(o => o.year === last_year),
            sga_curr_y_row = sga_data.find(o => o.year === year),
            sga_last_y_row = sga_data.find(o => o.year === last_year),
            dt_pl_curr_y_row = dt_pl_data.find(o => o.year === year),
            dt_pl_last_y_row = dt_pl_data.find(o => o.year === last_year),
            a_curr_target = target_data.find(a=>a.year === year),
            a_last_target = target_data.find(a=>a.year === last_year)
            ;

        // TBD
        // DT매출 = 조직별 월별 매출 중 DT Tagging 대상만 집계 (DT Tagging -> PL_WIDEVIEW 테이블에서 prj_tp_nm이 DT로 시작하는 데이터)
        const sale_data =
        {
            "display_order": 1,
            "type": "DT 매출",
            "target_curr_y_value": a_curr_target?.['dt_sale_target'] ?? 0,
            "actual_curr_ym_value": dt_pl_curr_y_row?.['sale_amount_sum'] ?? 0,
            "actual_last_ym_value": dt_pl_last_y_row?.['sale_amount_sum'] ?? 0,
            "actual_curr_ym_rate": (a_curr_target?.['dt_sale_target'] ?? 0) === 0 ? 0 : (dt_pl_curr_y_row?.['sale_amount_sum'] ?? 0) / (a_curr_target['dt_sale_target']*100000000)*100,
            "actual_last_ym_rate": (a_last_target?.['dt_sale_target'] ?? 0) === 0 ? 0 : (dt_pl_last_y_row?.['sale_amount_sum'] ?? 0) / (a_last_target['dt_sale_target']*100000000)*100
        };
        oResult.push(sale_data);

        // TBD
        // Offshoring = 조직별 월별 AGS외주비(OI_WIDEVIEW) * 환산효과
        const o_offshoring =
        {
            "display_order": 2,
            "type": "Offshoring",
            "target_curr_y_value": a_curr_target?.['offshoring_target'] ?? 0,
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
            "target_curr_y_value": a_curr_target?.['non_mm_target'] ?? 0,
            "actual_curr_ym_value": 0,
            "actual_last_ym_value": 0,
            "actual_curr_ym_rate": 0,
            "actual_last_ym_rate": 0
        };
        oResult.push(non_mm_data);

        // BR = 조직별 월별 빌링인건비 / 총인건비
        const br_data =
        {
            "display_order": 4,
            "type": "BR",
            "target_curr_y_value": a_curr_target?.['br_target'] ?? 0,
            "actual_curr_ym_value": (rsp_curr_y_row?.['total_amt_sum'] ?? 0) !== 0 ? (rsp_curr_y_row?.['bill_amt_sum'] ?? 0) / rsp_curr_y_row['total_amt_sum'] * 100 : 0,
            "actual_last_ym_value": (rsp_last_y_row?.['total_amt_sum'] ?? 0) !== 0 ? (rsp_last_y_row?.['bill_amt_sum'] ?? 0) / rsp_last_y_row['total_amt_sum'] * 100 : 0,
            "actual_curr_ym_rate": (a_curr_target?.['br_target'] ?? 0) === 0 || (rsp_curr_y_row?.['total_amt_sum'] ?? 0) === 0 ? 0 : ((rsp_curr_y_row?.['bill_amt_sum'] ?? 0) / rsp_curr_y_row['total_amt_sum'] * 100) / (a_curr_target['br_target']*100000000) * 100 ,
            "actual_last_ym_rate": (a_last_target?.['br_target'] ?? 0) === 0 || (rsp_last_y_row?.['total_amt_sum'] ?? 0) === 0 ? 0 : ((rsp_last_y_row?.['bill_amt_sum'] ?? 0) / rsp_last_y_row['total_amt_sum'] * 100) / (a_last_target['br_target']*100000000) *100
        };
        oResult.push(br_data);

        // RoHC = 조직별 월별 공헌이익 / 총인건비
        const rohc_data =
        {
            "display_order": 5,
            "type": "RoHC",
            "target_curr_y_value": (a_curr_target?.['rohc_target'] ?? 0),
            "actual_curr_ym_value": (rsp_curr_y_row?.['total_amt_sum'] ?? 0) !== 0 ? ((pl_curr_y_row?.["margin_amount_sum"] ?? 0) - (sga_curr_y_row?.["amount_sum"] ?? 0)) / rsp_curr_y_row['total_amt_sum'] : 0,
            "actual_last_ym_value": (rsp_last_y_row?.['total_amt_sum'] ?? 0) !== 0 ? ((pl_last_y_row?.["margin_amount_sum"] ?? 0) - (sga_last_y_row?.["amount_sum"] ?? 0)) / rsp_last_y_row['total_amt_sum'] : 0,
            "actual_curr_ym_rate": (a_curr_target?.['rohc_target'] ?? 0) === 0 || (rsp_curr_y_row?.['total_amt_sum'] ?? 0) === 0 ? 0 : (((pl_curr_y_row?.["margin_amount_sum"] ?? 0) - (sga_curr_y_row?.["amount_sum"] ?? 0)) / rsp_curr_y_row['total_amt_sum']) / (a_curr_target['rohc_target']*100000000) * 100,
            "actual_last_ym_rate": (a_last_target?.['rohc_target'] ?? 0) === 0 || (rsp_last_y_row?.['total_amt_sum'] ?? 0) === 0 ? 0 : (((pl_last_y_row?.["margin_amount_sum"] ?? 0) - (sga_last_y_row?.["amount_sum"] ?? 0)) / rsp_last_y_row['total_amt_sum']) / (a_last_target['rohc_target']*100000000) * 100
        };
        oResult.push(rohc_data);
        return oResult;

    });
}