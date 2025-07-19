const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_forecast_pl', async (req) => {
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
            const pl_org_view = db.entities('pl').wideview_org_view;
            const pl_account_view = db.entities('pl').wideview_account_org_view;
            /**
             * sga_wideview_view [sg&a 집계]
             */
            const sga_view = db.entities('sga').wideview_view;
            /**
             * common_org_full_level_view [조직정보]
             */
            const org_full_level = db.entities('common').org_full_level_view;
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
                'sum(sale_year_amt) as secured_sale',
                'sum(margin_year_amt) as secured_margin',
                'sum(sfdc_sale_year_amt) as not_secured_sale',
                'sum(sfdc_margin_year_amt) as not_secured_margin',
                'sum(sale_year_amt)+sum(sfdc_sale_year_amt) as forecast_sale',
                'sum(margin_year_amt)+sum(sfdc_margin_year_amt) as forecast_margin'];
            const pl_where_conditions = { 'year': { in: [year, last_year] } };
            const pl_groupBy_cols = ['year'];

            /**
             * SG&A 조회용 컬럼
             */
            let s_secured = 'sum(labor_year_amt+iv_year_amt+exp_year_amt) as secured_value';

            const sga_col_list = ['year', 'is_total_cc', s_secured];
            const sga_where_conditions = { 'year': { in: [year, last_year] } };
            const sga_groupBy_cols = ['year', 'is_total_cc'];

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
            let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'lv3_ccorg_cd', 'org_ccorg_cd','org_tp'])
                .where`org_id = ${org_id} and (lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id})`;

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            // 조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level;
            let org_ccorg_col_nm = org_col_nm.slice(0, -2) + 'ccorg_cd'; // <>_id 에서 id 제거 후 <>_ccorg_cd 컬럼명 생성
            let lv3_ccorg_cd = orgInfo.lv3_ccorg_cd;
            let org_tp = orgInfo.org_tp;

            let pl_view = pl_org_view
            if(org_col_nm !== 'lv1_id' && org_col_nm !== 'lv2_id' && ((org_tp === 'hybrid' && lv3_ccorg_cd === '237100') || org_tp === 'account')){
                pl_view = pl_account_view
            }
            // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
            // const {sale,margin,sga} = add_column(['sale','margin','sga'],org_col_nm)

            let pl_column = pl_col_list;
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            let pl_groupBy = pl_groupBy_cols;

            let sga_column = sga_col_list;
            let sga_where = org_col_nm === 'lv1_id' ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id };
            let sga_groupBy = sga_groupBy_cols;

            // DB 쿼리 실행 (병렬)
            const [query, sga_query, query_target] = await Promise.all([
                // PL 실적, 목표 조회
                SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
                get_org_target(year,['A01','A02','A03','A04','C01','C02','C08'])
            ]);
            
            // 임시 - 비어있을 경우 0 값 생성, 추후 에러처리 or 로직 구성
            let sga_curr_y_row = sga_query.filter(o => !o.is_total_cc && o.year === year),
                sga_exp_curr_y_row = sga_query.filter(o => o.is_total_cc === true && o.year === year),
                sga_last_y_row = sga_query.filter(o => !o.is_total_cc && o.year === last_year),
                sga_exp_last_y_row = sga_query.filter(o => o.is_total_cc === true && o.year === last_year),
                pl_curr_y_data = query.find(pl => pl.year === year),
                pl_last_y_data = query.find(pl => pl.year === last_year),
                curr_target = query_target.find(target => target.org_ccorg_cd === orgInfo.org_ccorg_cd);

            const i_last_sga_forecast = sga_last_y_row.reduce((iSum, oData) => iSum += oData.secured_value, 0),
                i_last_exp_sga_forecast = sga_exp_last_y_row.reduce((iSum, oData) => iSum += oData.secured_value, 0)
            let i_last_sale_forecast = pl_last_y_data?.forecast_sale ?? 0,
                i_last_margin_forecast = pl_last_y_data?.forecast_margin ?? 0;

            const o_sga_row = {
                forecast_value: sga_curr_y_row.reduce((iSum, oData) => iSum += oData.secured_value, 0),
                secured_value: sga_curr_y_row.reduce((iSum, oData) => iSum += oData.secured_value, 0),
                not_secured_value: 0,
            };
            const o_exp_sga_row = {
                forecast_value: sga_exp_curr_y_row.reduce((iSum, oData) => iSum += oData.secured_value, 0) + sga_exp_curr_y_row.reduce((iSum, oData) => iSum += oData.not_secured_value, 0),
                secured_value: sga_exp_curr_y_row.reduce((iSum, oData) => iSum += oData.secured_value, 0),
                not_secured_value: 0,
            };

            const sale_data =
            {
                "display_order": 1,
                "type": "매출",
                "forecast_value": pl_curr_y_data?.['forecast_sale'] ?? 0,
                "secured_value": pl_curr_y_data?.["secured_sale"] ?? 0,
                "not_secured_value": pl_curr_y_data?.["not_secured_sale"] ?? 0,
                "plan_ratio": (pl_curr_y_data?.["forecast_sale"] ?? 0) - ((curr_target?.['target_sale'] ?? 0) * 100000000),
                "yoy": (pl_curr_y_data?.["forecast_sale"] ?? 0) - i_last_sale_forecast
            };

            oResult.push(sale_data);

            const margin_data =
            {
                "display_order": 2,
                "type": "마진",
                "forecast_value": pl_curr_y_data?.['forecast_margin'] ?? 0,
                "secured_value": pl_curr_y_data?.["secured_margin"] ?? 0,
                "not_secured_value": pl_curr_y_data?.["not_secured_margin"] ?? 0,
                "plan_ratio": (pl_curr_y_data?.["forecast_margin"] ?? 0) - ((curr_target?.['target_margin'] ?? 0) * 100000000),
                "yoy": (pl_curr_y_data?.["forecast_margin"] ?? 0) - i_last_margin_forecast
            };
            oResult.push(margin_data);

            const margin_rate_data =
            {
                "display_order": 3,
                "type": "마진율",
                "forecast_value": sale_data?.["forecast_value"] !== 0 ? margin_data?.["forecast_value"] / sale_data?.["forecast_value"] : 0,
                "secured_value": sale_data?.["secured_value"] !== 0 ? margin_data?.["secured_value"] / sale_data?.["secured_value"] : 0,
                "not_secured_value": sale_data?.["not_secured_value"] !== 0 ? margin_data?.["not_secured_value"] / sale_data?.["not_secured_value"] : 0,
                "plan_ratio": sale_data?.["forecast_value"] !== 0 ? ((margin_data?.["forecast_value"] / sale_data?.["forecast_value"]) - (curr_target?.['target_margin_rate'] ?? 0) / 100) : 0,
                "yoy": (sale_data?.["forecast_value"] === 0 ? 0 : (margin_data?.["forecast_value"]) / sale_data["forecast_value"]) - (i_last_sale_forecast === 0 ? 0 : i_last_margin_forecast / i_last_sale_forecast)
            };
            oResult.push(margin_rate_data);

            // 사업 SG&A
            const sga_data =
            {
                "display_order": 4,
                "type": "사업 SG&A",
                "forecast_value": o_sga_row.forecast_value,
                "secured_value": o_sga_row.secured_value,
                "not_secured_value": 0,
                "plan_ratio": o_sga_row.forecast_value - (curr_target?.["sga_target"] * 100000000),
                "yoy": o_sga_row.forecast_value - i_last_sga_forecast,
            };
            oResult.push(sga_data);

            // 공헌이익 [마진 - 사업SG&A] target_cont_profit
            const contribution_data =
            {
                "display_order": 5,
                "type": "공헌이익",
                "forecast_value": margin_data['forecast_value'] - sga_data['forecast_value'],
                "secured_value": margin_data['secured_value'] - sga_data['secured_value'],
                "not_secured_value": 0,
                "yoy": margin_data['secured_value'] - sga_data['secured_value'] - ((pl_last_y_data?.['forecast_value'] ?? 0) - i_last_sga_forecast)
            };
            contribution_data["plan_ratio"] = contribution_data["forecast_value"] - (curr_target?.["target_cont_profit"] * 100000000);
            oResult.push(contribution_data);

            // 전사 SG&A [공헌이익 - 영업이익]
            const sga_total_data =
            {
                "display_order": 6,
                "type": "전사 SG&A",
                "forecast_value": o_exp_sga_row.secured_value,
                "secured_value": o_exp_sga_row.secured_value,
                "not_secured_value": 0,
                "yoy": o_exp_sga_row.secured_value - i_last_exp_sga_forecast
            };
            sga_total_data["plan_ratio"] = sga_total_data["forecast_value"] - (curr_target?.["target_total_sga"] * 100000000);
            oResult.push(sga_total_data);

            // 영업이익 [공헌이익 - 전사 SG&A]
            const profit_data =
            {
                "display_order": 7,
                "type": "영업이익",
                "forecast_value": contribution_data['forecast_value'] - sga_total_data['forecast_value'],
                "secured_value": contribution_data['secured_value'] - sga_total_data['secured_value'],
                "not_secured_value": 0,
                "yoy": contribution_data['forecast_value'] - sga_total_data['forecast_value'] - (i_last_margin_forecast - i_last_sga_forecast - i_last_exp_sga_forecast)
            };
            profit_data["plan_ratio"] = profit_data["forecast_value"] - (curr_target?.["target_sale_profit"] * 100000000);
            oResult.push(profit_data);

            // 영업이익률 데이터 [영업이익/매출]
            const profit_rate_data =
            {
                "display_order": 8,
                "type": "영업이익률",
                "forecast_value": sale_data['forecast_value'] === 0 ? 0 : profit_data['forecast_value'] / sale_data['forecast_value'],
                "secured_value": sale_data['secured_value'] === 0 ? 0 : profit_data['secured_value'] / sale_data['secured_value'],
                "not_secured_value": 0,
                "yoy": (sale_data['forecast_value'] === 0 ? 0 : ((profit_data['forecast_value'] / sale_data['forecast_value'])) - (i_last_sale_forecast === 0 ? 0 : (i_last_margin_forecast - i_last_sga_forecast - i_last_exp_sga_forecast) / i_last_sale_forecast)),
            };
            // 영업이익 계획비
            let target_profit_rate = curr_target?.["target_sale"] ? (curr_target?.["target_sale_profit"] / curr_target?.["target_sale"]) : 0;
            profit_rate_data["plan_ratio"] = profit_rate_data["forecast_value"] - target_profit_rate;
            oResult.push(profit_rate_data);

            // 데이터 반환
            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
};