module.exports = (srv) => {
    srv.on('get_forecast_pl', async (req) => {
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
        /**
         * common_target
         * 조직 별 연단위 목표금액
         */
        const target = db.entities('common').target_view;
        // =================================================================================

        // function 입력 파라미터
        const { year, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();
        // QUERY 공통 파라미터 선언

        /**
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const pl_col_list = [
            'year', 'src_type', 'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(prj_prfm_amount_sum,0)) as prj_prfm_amount_sum', 'sum(ifnull(margin_amount_sum,0)) as margin_amount_sum'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': '12', 'src_type': { '!=': 'WA' } };
        const pl_groupBy_cols = ['year', 'src_type'];

        /**
         * SG&A 조회용 컬럼
         * shared_exp_yn false = 사업 / true = 전사
         */
        const sga_col_list = ['year', 'month_amt', 'shared_exp_yn',
            '(sum(ifnull(labor_amount_sum,0)) + sum(ifnull(iv_amount_sum,0)) + sum(ifnull(exp_amount_sum,0))) as amount_sum'];
        const sga_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': '12' };
        const sga_groupBy_cols = ['year', 'month_amt', 'shared_exp_yn'];

        /** 
         * 타겟 뷰 조회용 컬럼
         */
        const target_col_list = [
            'year', 
            'ifnull(sale_target,0) as sale_target', 
            'ifnull(margin_rate_target,0)*ifnull(sale_target,0)/100 as margin_target',
            'ifnull(margin_rate_target,0) as margin_rate_target'
        ];
        const target_where_conditions = {'is_total' : true, 'year': { in: [year, last_year] } };

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

        // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation

        let pl_column = pl_col_list;
        let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
        let pl_groupBy = pl_groupBy_cols;

        let sga_column = sga_col_list;
        let sga_where = org_col_nm === 'lv1_id' ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id }; 
        let sga_groupBy = sga_groupBy_cols;

        let target_column = target_col_list;
        let target_where = org_col_nm === 'lv1_id' ? target_where_conditions : { ...target_where_conditions, [org_col_nm]: org_id };

        // DB 쿼리 실행 (병렬)
        const [query, sga_query, query_target] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
            SELECT.from(target).columns(target_column).where(target_where)
        ]);

        let a_curr_target = query_target.filter(oTarget => oTarget.year === year);
        let o_curr_target = {
            sale_target: a_curr_target.reduce((iSum, oData) => iSum += oData.sale_target, 0),
            margin_target: a_curr_target.reduce((iSum, oData) => iSum += oData.margin_target, 0),
        }
        // 마진율 (매출 - 마진액)
        o_curr_target.margin_rate_target = (o_curr_target.sale_target) ? (o_curr_target.margin_target / o_curr_target.sale_target) : 0;
        
        let a_last_target = query_target.filter(oTarget => oTarget.year === last_year);
        let o_last_target = {
            sale_target: a_last_target.reduce((iSum, oData) => iSum += oData.sale_target, 0),
            margin_target: a_last_target.reduce((iSum, oData) => iSum += oData.margin_target, 0),
        }
        // 마진율 (매출 - 마진액)
        o_last_target.margin_rate_target = (o_last_target.sale_target) ? (o_last_target.margin_target / o_last_target.sale_target) : 0;

        const o_result_target = {
            [year]: o_curr_target,
            [last_year]: o_last_target
        };
        
        let o_data = {pl:{}}
        o_data['pl'][`${year}`] = {}
        o_data['pl'][`${last_year}`] = {}
        query.forEach(a=>{
            if(a.year === year){
                if(a.src_type==='D'){
                    o_data['pl'][`${year}`]['not_secured_sale'] = (o_data['pl'][`${year}`]?.['not_secured_sale'] ?? 0) + a['sale_amount_sum'];
                    o_data['pl'][`${year}`]['not_secured_prj'] = (o_data['pl'][`${year}`]?.['not_secured_prj'] ?? 0) + a['prj_prfm_amount_sum'];
                    o_data['pl'][`${year}`]['not_secured_margin'] = (o_data['pl'][`${year}`]?.['not_secured_margin'] ?? 0) + a['margin_amount_sum'];
                }else{
                    o_data['pl'][`${year}`]['secured_sale'] = (o_data['pl'][`${year}`]?.['secured_sale'] ?? 0) + a['sale_amount_sum'];
                    o_data['pl'][`${year}`]['secured_prj'] = (o_data['pl'][`${year}`]?.['secured_prj'] ?? 0) + a['prj_prfm_amount_sum'];
                    o_data['pl'][`${year}`]['secured_margin'] = (o_data['pl'][`${year}`]?.['secured_margin'] ?? 0) + a['margin_amount_sum'];
                }
                o_data['pl'][`${year}`]['forecast_sale'] = (o_data['pl'][`${year}`]?.['forecast_sale'] ?? 0) + a['sale_amount_sum'];
                o_data['pl'][`${year}`]['forecast_prj'] = (o_data['pl'][`${year}`]?.['forecast_prj'] ?? 0) + a['prj_prfm_amount_sum'];
                o_data['pl'][`${year}`]['forecast_margin'] = (o_data['pl'][`${year}`]?.['forecast_margin'] ?? 0) + a['margin_amount_sum'];                
            }else{
                
                if(a.src_type==='D'){
                    o_data['pl'][`${last_year}`]['not_secured_sale'] = (o_data['pl'][`${last_year}`]?.['not_secured_sale'] ?? 0) + a['sale_amount_sum'];
                    o_data['pl'][`${last_year}`]['not_secured_prj'] = (o_data['pl'][`${last_year}`]?.['not_secured_prj'] ?? 0) + a['prj_prfm_amount_sum'];
                    o_data['pl'][`${last_year}`]['not_secured_margin'] = (o_data['pl'][`${last_year}`]?.['not_secured_margin'] ?? 0) + a['margin_amount_sum'];
                }else{
                    o_data['pl'][`${last_year}`]['secured_sale'] = (o_data['pl'][`${last_year}`]?.['secured_sale'] ?? 0) + a['sale_amount_sum'];
                    o_data['pl'][`${last_year}`]['secured_prj'] = (o_data['pl'][`${last_year}`]?.['secured_prj'] ?? 0) + a['prj_prfm_amount_sum'];
                    o_data['pl'][`${last_year}`]['secured_margin'] = (o_data['pl'][`${last_year}`]?.['secured_margin'] ?? 0) + a['margin_amount_sum'];
                }
                o_data['pl'][`${last_year}`]['forecast_sale'] = (o_data['pl'][`${last_year}`]?.['forecast_sale'] ?? 0) + a['sale_amount_sum'];
                o_data['pl'][`${last_year}`]['forecast_prj'] = (o_data['pl'][`${last_year}`]?.['forecast_prj'] ?? 0) + a['prj_prfm_amount_sum'];
                o_data['pl'][`${last_year}`]['forecast_margin'] = (o_data['pl'][`${last_year}`]?.['forecast_margin'] ?? 0) + a['margin_amount_sum'];
            }
        })
        
        // 임시 - 비어있을 경우 0 값 생성, 추후 에러처리 or 로직 구성
        let sga_curr_y_row = sga_query.find(o => o.year === year && o.shared_exp_yn === false),
            sga_last_y_row = sga_query.find(o => o.year === last_year && o.shared_exp_yn === false),
            sga_exp_curr_y_row = sga_query.find(o => o.year === year && o.shared_exp_yn === true),
            sga_exp_last_y_row = sga_query.find(o => o.year === last_year && o.shared_exp_yn === true);


        let pl_curr_y_data = o_data['pl'][`${year}`];
        let pl_last_y_data = o_data['pl'][`${last_year}`];

        const sale_data =
        {
            "display_order": 1,
            "type": "매출",
            "forecast_value": pl_curr_y_data?.['forecast_sale'] ?? 0,
            "secured_value": pl_curr_y_data?.["secured_sale"] ?? 0,
            "not_secured_value": pl_curr_y_data?.["not_secured_sale"] ?? 0,
            "plan_ratio": (pl_curr_y_data?.['forecast_sale'] ?? 0) - ((o_result_target[year]['sale_target'] ?? 0) * 100000000),
            // "plan_ratio": (pl_curr_y_data?.['forecast_sale'] ?? 0) !== 0 ? (pl_curr_y_data?.["secured_sale"] ?? 0) / pl_curr_y_data['forecast_sale'] * 100 : 0,
            "yoy": (pl_curr_y_data?.['forecast_sale'] ?? 0) - ((o_result_target[last_year]['sale_target'] ?? 0) * 100000000),
            // "yoy": (pl_last_y_data?.['secured_sale'] ?? 0) !== 0 ? (pl_curr_y_data?.['forecast_sale'] ?? 0) / (pl_last_y_data?.['secured_sale'] ?? 0) * 100 : 0
        };
        oResult.push(sale_data);

        const margin_data =
        {
            "display_order": 2,
            "type": "마진",
            "forecast_value": pl_curr_y_data?.['forecast_margin'] ?? 0,
            "secured_value": pl_curr_y_data?.["secured_margin"] ?? 0,
            "not_secured_value": pl_curr_y_data?.["not_secured_margin"] ?? 0,
            "plan_ratio": (pl_curr_y_data?.['forecast_margin'] ?? 0) - ((o_result_target[year]['margin_target'] ?? 0) * 100000000),
            "yoy": (pl_curr_y_data?.['forecast_margin'] ?? 0) - ((o_result_target[last_year]['margin_target'] ?? 0) * 100000000),
            // "plan_ratio": (pl_curr_y_data?.['forecast_margin'] ?? 0) !== 0 ? (pl_curr_y_data?.["secured_margin"] ?? 0) / pl_curr_y_data['forecast_margin'] * 100 : 0,
            // "yoy": (pl_last_y_data?.['secured_margin'] ?? 0) !== 0 ? (pl_curr_y_data?.['forecast_margin'] ?? 0) / (pl_last_y_data?.['secured_margin'] ?? 0) * 100 : 0
        };
        oResult.push(margin_data);

        const margin_rate_data =
        {
            "display_order": 3,
            "type": "마진률",
            "forecast_value": sale_data?.["forecast_value"] !== 0 ? margin_data?.["forecast_value"] / sale_data?.["forecast_value"] * 100 : 0,
            "secured_value": sale_data?.["secured_value"] !== 0 ? margin_data?.["secured_value"] / sale_data?.["secured_value"] * 100 : 0,
            "not_secured_value": sale_data?.["not_secured_value"] !== 0 ? margin_data?.["not_secured_value"] / sale_data?.["not_secured_value"] * 100 : 0,
            "plan_ratio": (sale_data?.["forecast_value"] !== 0 ? margin_data?.["forecast_value"] / sale_data?.["forecast_value"] * 100 : 0) - ((o_result_target[`${year}`]?.['sale_target'] ?? 0) !== 0 ? (o_result_target[`${year}`]?.['margin'] ?? 0) / (o_result_target[`${year}`]['sale_target']) * 100 : 0),
            "yoy": (sale_data?.["forecast_value"] !== 0 ? margin_data?.["forecast_value"] / sale_data?.["forecast_value"] * 100 : 0) - ((o_result_target[`${last_year}`]?.['sale_target'] ?? 0) !== 0 ? (o_result_target[`${last_year}`]?.['margin'] ?? 0) / (o_result_target[`${last_year}`]['sale_target']) * 100 : 0),
            // "plan_ratio": (sale_data?.["forecast_value"] !== 0 ? margin_data?.["forecast_value"] / sale_data?.["forecast_value"] : 0) !== 0 ? (sale_data?.["secured_value"] !== 0 ? margin_data?.["secured_value"] / sale_data?.["secured_value"] : 0) / (sale_data?.["forecast_value"] !== 0 ? margin_data?.["forecast_value"] / sale_data?.["forecast_value"] : 0) * 100 : 0,
            // "plan_ratio": sale_data?.["plan_ratio"] !== 0 ? margin_data?.["plan_ratio"] / sale_data?.["plan_ratio"] * 100 : 0,
            // "yoy": ((pl_last_y_data?.['secured_sale'] ?? 0) !== 0 ? (pl_last_y_data?.['secured_margin'] ?? 0) / (pl_last_y_data?.['secured_sale'] ?? 0) : 0) != 0 ? (sale_data?.["forecast_value"] !== 0 ? margin_data?.["forecast_value"] / sale_data?.["forecast_value"] : 0) / ((pl_last_y_data?.['secured_sale'] ?? 0) !== 0 ? (pl_last_y_data?.['secured_margin'] ?? 0) / (pl_last_y_data?.['secured_sale'] ?? 0) : 0) * 100: 0,
            // "yoy": sale_data?.["yoy"] !== 0 ? margin_data?.["yoy"] / sale_data?.["yoy"] * 100 : 0,
        };
        oResult.push(margin_rate_data);

        const sga_data =
        {
            "display_order": 4,
            "type": "SG&A",
            "forecast_value": 0,
            "secured_value": 0,
            "not_secured_value": 0,
            "plan_ratio": 0,
            "yoy": 0
        };

        oResult.push(sga_data);

        // 공헌이익 [마진 - 사업SG&A]
        const contribution_data =
        {
            "display_order": 5,
            "type": "공헌이익",
            "forecast_value": 0,
            "secured_value": 0,
            "not_secured_value": 0,
            "plan_ratio": 0,
            "yoy": 0
        };
        oResult.push(contribution_data);

        const sga_total_data =
        {
            "display_order": 6,
            "type": "전사 SG&A",
            "forecast_value": 0,
            "secured_value": 0,
            "not_secured_value": 0,
            "plan_ratio": 0,
            "yoy": 0
        };
        oResult.push(sga_total_data);

        // 영업이익 [공헌이익 - 전사 SG&A]
        const profit_data =
        {
            "display_order": 7,
            "type": "영업이익",
            "forecast_value": 0,
            "secured_value": 0,
            "not_secured_value": 0,
            "plan_ratio": 0,
            "yoy": 0
        };
        oResult.push(profit_data);

        // 영업이익률 데이터 [영업이익/매출]
        const profit_rate_data =
        {
            "display_order": 8,
            "type": "영업이익률",
            "forecast_value": 0,
            "secured_value": 0,
            "not_secured_value": 0,
            "plan_ratio": 0,
            "yoy": 0
        };
        oResult.push(profit_rate_data);
        return oResult;
    });
};