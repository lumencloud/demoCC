module.exports = (srv) => {
    srv.on('get_actual_pl', async (req) => {
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
         * common_target
         * 조직 별 연단위 목표금액
         */
        const target = db.entities('common').target_view;
        /**
         * pl_wideview_unpivot_view [실적]
         */
        const pl_view = db.entities('pl').wideview_unpivot_view;
        /**
         * sga_wideview_unpivot_view [sg&a 집계]
         */
        const sga_view = db.entities('sga').wideview_unpivot_view;
        /**
         * common_org_full_level_view [조직정보]
         */
        const org_full_level = db.entities('common').org_full_level_view;

        const code_header = db.entities('common').code_header;
        const code_item = db.entities('common').code_item;
        let codeHeader = await SELECT.one.from(code_header).columns(['ID']).where({ 'category': 'target_code' })
        // =================================================================================

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

        // QUERY 공통 파라미터 선언
        /** 
         * 타겟 뷰 조회용 컬럼
         */
        const target_col_list = [
            'year', 
            'org_ccorg_cd',
            'ifnull(sale_target,0) as sale_target', 
            'ifnull(margin_rate_target,0)*ifnull(sale_target,0)/100 as margin_target',
            'ifnull(margin_rate_target,0) as margin_rate_target', 
            'ifnull(sga_target,0) as sga_target', 
            'ifnull(contribution_margin_target,0) as contribution_margin_target', 
            'ifnull(total_operating_profit_target,0) as total_operating_profit_target'
        ];
        const target_where_conditions = {'is_total' : true, 'year': { in: [year, last_year] } };
        const target_groupBy_cols = ['year']

        /**
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const pl_col_list = [
            'year', 'month_amt', 'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(prj_prfm_amount_sum,0)) as prj_prfm_amount_sum', 'sum(ifnull(margin_amount_sum,0)) as margin_amount_sum'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month, 'src_type': { 'not in': ['WA', 'D'] } };
        const pl_groupBy_cols = ['year', 'month_amt'];

        /**
         * SG&A 조회용 컬럼
         * shared_exp_yn false = 사업 / true = 전사
         */
        const sga_col_list = ['year', 'month_amt', 'shared_exp_yn',
            '(sum(ifnull(labor_amount_sum,0)) + sum(ifnull(iv_amount_sum,0)) + sum(ifnull(exp_amount_sum,0))) as amount_sum'];
        const sga_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month };
        const sga_groupBy_cols = ['year', 'month_amt', 'shared_exp_yn'];

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
            .where`org_id = ${org_id} and (lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id})`;

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        // 조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        // ccorg_cd 만 가지고 있는 경우 조회조건으로 사용
        // let org_ccorg_col_nm = org_col_nm.slice(0, -2) + 'ccorg_cd'; // <>_id 에서 id 제거 후 <>_ccorg_cd 컬럼명 생성
        let org_ccorg_cd = orgInfo.org_ccorg_cd;

        // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
        let target_column = target_col_list;
        let target_where = { ...target_where_conditions, [org_col_nm]: org_id };
        // let target_where = org_col_nm === 'lv1_id' ? target_where_conditions : { ...target_where_conditions, [org_col_nm]: org_id };
        let target_groupBy = target_groupBy_cols;

        let pl_column = pl_col_list;
        let pl_where =  { ...pl_where_conditions, [org_col_nm]: org_id };
        // let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
        let pl_groupBy = pl_groupBy_cols;

        let sga_column = sga_col_list;
        let sga_where = { ...sga_where_conditions, [org_col_nm]: org_id };
        // let sga_where = org_col_nm === 'lv1_id' ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id };
        let sga_groupBy = sga_groupBy_cols;

        // DB 쿼리 실행 (병렬)
        const [query, query_target, sga_query] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(target).columns(target_column).where(target_where),
            SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
        ]);

        let a_curr_target = query_target.filter(oTarget => oTarget.year === year);
        let o_curr_target = {
            sale_target: a_curr_target.reduce((iSum, oData) => iSum += oData.sale_target, 0),
            margin_target: a_curr_target.reduce((iSum, oData) => iSum += oData.margin_target, 0),
            sga_target: a_curr_target.reduce((iSum, oData) => iSum += oData.sga_target, 0),
            contribution_margin_target: a_curr_target.reduce((iSum, oData) => iSum += oData.contribution_margin_target, 0),
            total_operating_profit_target: a_curr_target.reduce((iSum, oData) => iSum += oData.total_operating_profit_target, 0)
        }
        // 마진율 (매출 - 마진액)
        o_curr_target.margin_rate_target = (o_curr_target.sale_target) ? (o_curr_target.margin_target / o_curr_target.sale_target) : 0;
        
        let a_last_target = query_target.filter(oTarget => oTarget.year === last_year);
        let o_last_target = {
            sale_target: a_last_target.reduce((iSum, oData) => iSum += oData.sale_target, 0),
            margin_target: a_last_target.reduce((iSum, oData) => iSum += oData.margin_target, 0),
            sga_target: a_last_target.reduce((iSum, oData) => iSum += oData.sga_target, 0),
            contribution_margin_target: a_last_target.reduce((iSum, oData) => iSum += oData.contribution_margin_target, 0),
            total_operating_profit_target: a_last_target.reduce((iSum, oData) => iSum += oData.total_operating_profit_target, 0)
        }
        // 마진율 (매출 - 마진액)
        o_last_target.margin_rate_target = (o_last_target.sale_target) ? (o_last_target.margin_target / o_last_target.sale_target) : 0;
        

        const o_result_target = {
            [year]: o_curr_target,
            [last_year]: o_last_target
        };

        // 임시 - 비어있을 경우 0 값 생성, 추후 에러처리 or 로직 구성
        let pl_curr_y_row = query.find(o => o.year === year),
            pl_last_y_row = query.find(o => o.year === last_year),
            sga_curr_y_row = sga_query.find(o => o.year === year && o.shared_exp_yn === false),
            sga_last_y_row = sga_query.find(o => o.year === last_year && o.shared_exp_yn === false),
            sga_exp_curr_y_row = sga_query.find(o => o.year === year && o.shared_exp_yn === true),
            sga_exp_last_y_row = sga_query.find(o => o.year === last_year && o.shared_exp_yn === true);

        const sale_data =
        {
            "display_order": 1,
            "type": "매출",
            "target_curr_y_value": o_result_target[`${year}`]?.['sale_target'] ?? 0,
            "actual_curr_ym_value": pl_curr_y_row?.["sale_amount_sum"] ?? 0,
            "actual_last_ym_value": pl_last_y_row?.["sale_amount_sum"] ?? 0,
            "actual_curr_ym_rate": (o_result_target[`${year}`]?.['sale_target'] ?? 0) !== 0 ? (pl_curr_y_row?.["sale_amount_sum"] ?? 0) / (o_result_target[`${year}`]['sale_target'] * 100000000) * 100 : 0,
            "actual_last_ym_rate": (o_result_target[`${last_year}`]?.['sale_target'] ?? 0) !== 0 ? (pl_last_y_row?.["sale_amount_sum"] ?? 0) / (o_result_target[`${last_year}`]['sale_target'] * 100000000) * 100 : 0
        };
        oResult.push(sale_data);

        const margin_data =
        {
            "display_order": 2,
            "type": "마진",
            "target_curr_y_value": o_result_target[`${year}`]?.['margin'] ?? 0,
            "actual_curr_ym_value": pl_curr_y_row?.["margin_amount_sum"] ?? 0,
            "actual_last_ym_value": pl_last_y_row?.["margin_amount_sum"] ?? 0,
            "actual_curr_ym_rate": (o_result_target[`${year}`]?.['margin'] ?? 0) !== 0 ? (pl_curr_y_row?.["margin_amount_sum"] ?? 0) / (o_result_target[`${year}`]['margin'] * 100000000) * 100 : 0,
            "actual_last_ym_rate": (o_result_target[`${last_year}`]?.['margin'] ?? 0) !== 0 ? (pl_last_y_row?.["margin_amount_sum"] ?? 0) / (o_result_target[`${last_year}`]['margin'] * 100000000) * 100 : 0
        };
        oResult.push(margin_data);

        const margin_rate_data =
        {
            "display_order": 3,
            "type": "마진률",
            "target_curr_y_value": (o_result_target[`${year}`]?.['sale_target'] ?? 0) !== 0 ? (o_result_target[`${year}`]?.['margin'] ?? 0) / (o_result_target[`${year}`]['sale_target']) * 100 : 0,
            "actual_curr_ym_value": sale_data?.["actual_curr_ym_value"] !== 0 ? margin_data?.["actual_curr_ym_value"] / sale_data?.["actual_curr_ym_value"] * 100 : 0,
            "actual_last_ym_value": sale_data?.["actual_last_ym_value"] !== 0 ? margin_data?.["actual_last_ym_value"] / sale_data?.["actual_last_ym_value"] * 100 : 0,
            "actual_curr_ym_rate": 0,
            "actual_last_ym_rate": 0
        };
        oResult.push(margin_rate_data);

        const sga_data =
        {
            "display_order": 4,
            "type": "SG&A",
            "target_curr_y_value": o_result_target[`${year}`]?.['sga_target'] ?? 0,
            "actual_curr_ym_value": sga_curr_y_row?.["amount_sum"] ?? 0,
            "actual_last_ym_value": sga_last_y_row?.["amount_sum"] ?? 0,
            "actual_curr_ym_rate": 0,
            "actual_last_ym_rate": 0
        };

        oResult.push(sga_data);

        // 공헌이익 [마진 - 사업SG&A]
        const contribution_data =
        {
            "display_order": 5,
            "type": "공헌이익",
            "target_curr_y_value": o_result_target[`${year}`]?.['contribution_margin_target'] ?? 0,
            "actual_curr_ym_value": margin_data?.["actual_curr_ym_value"] - (sga_curr_y_row?.["amount_sum"] ?? 0),
            "actual_last_ym_value": margin_data?.["actual_last_ym_value"] - (sga_last_y_row?.["amount_sum"] ?? 0),
            "actual_curr_ym_rate": 0,
            "actual_last_ym_rate": 0
        };
        oResult.push(contribution_data);

        const sga_total_data =
        {
            "display_order": 6,
            "type": "전사 SG&A",
            "target_curr_y_value": (o_result_target[`${year}`]?.['contribution_margin_target'] ?? 0) - (o_result_target[`${year}`]?.['total_operating_profit_target'] ?? 0),
            "actual_curr_ym_value": sga_exp_curr_y_row?.["amount_sum"] ?? 0,
            "actual_last_ym_value": sga_exp_last_y_row?.["amount_sum"] ?? 0,
            "actual_curr_ym_rate": 0,
            "actual_last_ym_rate": 0
        };
        oResult.push(sga_total_data);

        // 영업이익 [공헌이익 - 전사 SG&A]
        const profit_data =
        {
            "display_order": 7,
            "type": "영업이익",
            "target_curr_y_value": o_result_target[`${year}`]?.['total_operating_profit_target'] ?? 0,
            "actual_curr_ym_value": contribution_data?.["actual_curr_ym_value"] - (sga_exp_curr_y_row?.["amount_sum"] ?? 0),
            "actual_last_ym_value": contribution_data?.["actual_last_ym_value"] - (sga_exp_last_y_row?.["amount_sum"] ?? 0),
            "actual_curr_ym_rate": 0,
            "actual_last_ym_rate": 0
        };
        oResult.push(profit_data);

        // 영업이익률 데이터 [영업이익/매출]
        const profit_rate_data =
        {
            "display_order": 8,
            "type": "영업이익률",
            "target_curr_y_value": (o_result_target[`${year}`]?.['sale_target'] ?? 0) === 0 ? 0 : (o_result_target[`${year}`]?.['total_operating_profit_target'] ?? 0) / o_result_target[`${year}`]['sale_target'] * 100,
            "actual_curr_ym_value": (pl_curr_y_row?.["sale_amount_sum"] ?? 0) !== 0 ? profit_data?.["actual_curr_ym_value"] / pl_curr_y_row?.["sale_amount_sum"] * 100 : 0,
            "actual_last_ym_value": (pl_last_y_row?.["sale_amount_sum"] ?? 0) !== 0 ? profit_data?.["actual_last_ym_value"] / pl_last_y_row?.["sale_amount_sum"] * 100 : 0,
            "actual_curr_ym_rate": 0,
            "actual_last_ym_rate": 0
        };
        oResult.push(profit_rate_data);
        return oResult;
    });
};