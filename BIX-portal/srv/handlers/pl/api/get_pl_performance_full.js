const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_pl_performance_full', async (req) => {
        return 
        try{
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

            // 조회 대상 DB 테이블
            // entities('<cds namespace 명>').<cds entity 명>
            // srv .cds 에 using from 구문에 엔티티가 속한 db .cds 파일이 최소 한 번이라도 걸려있어야 db.entities 로 엔티티 인식가능
            // (서비스에 등록할 필요는 없음)
            /**
             * org_target_sum_view
             * 조직 별 목표금액
             */
            const target = db.entities('common').org_target_sum_view;
            /**
             * pl.wideview_unpivot_view [실적]
             * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const pl_view = db.entities('pl').wideview_org_view;
            /**
             * sga.wideview_unpivot_view [sg&a 집계]
             * [부문/본부/팀 + 연,금액] 프로젝트 판관비 집계 뷰
             */
            const sga_view = db.entities('sga').wideview_view;
            /**
             * common_org_full_level_view [조직정보]
             */
            const org_full_level = db.entities('common').org_full_level_view;

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
            for(let i=1;i<=Number(month); i++){
                a_sale_column.push(`sum(ifnull(sale_m${i}_amt,0))`)
                a_margin_column.push(`sum(ifnull(margin_m${i}_amt,0))`)
                a_sga_column.push(`sum(ifnull(labor_m${i}_amt,0))+sum(ifnull(exp_m${i}_amt,0))+sum(ifnull(iv_m${i}_amt,0))`)
            }

            let s_sale_column = "("+a_sale_column.join(' + ')+') as sale_amount_sum';
            let s_margin_column = "("+a_margin_column.join(' + ')+') as margin_amount_sum';
            let s_sga_column = "("+a_sga_column.join(' + ')+') as sga_amount_sum';

            const pl_col_list = ['year', s_sale_column, s_margin_column];
            const pl_where_conditions = { 'year': { in: [year, last_year]}};
            const pl_groupBy_cols = ['year'];
            /**
             * SG&A 조회용 컬럼
             * is_total_cc false = 사업 / true = 전사
             */
            const sga_col_list = ['year', s_sga_column];
            const sga_where_conditions = { 'year': { in: [year, last_year] }, 'is_total_cc':{'!=':true}};
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
            let org_ccorg_col_nm = org_col_nm.slice(0, -2) + 'ccorg_cd'; // <>_id 에서 id 제거 후 <>_ccorg_cd 컬럼명 생성
            let org_ccorg_cd = orgInfo.org_ccorg_cd;

            let pl_column = org_col_nm === 'div_id' ? [...pl_col_list,'hdqt_ccorg_cd as ccorg_cd','hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_col_list,'team_ccorg_cd as ccorg_cd','team_name as name'] : [...pl_col_list,'div_ccorg_cd as ccorg_cd','div_name as name'];
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            let pl_groupBy = org_col_nm === 'div_id' ? [...pl_groupBy_cols,'hdqt_ccorg_cd','hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_groupBy_cols,'team_ccorg_cd','team_name'] : [...pl_groupBy_cols,'div_ccorg_cd','div_name'];
            
            let sga_column = org_col_nm === 'div_id' ? [...sga_col_list,'hdqt_ccorg_cd as ccorg_cd','hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...sga_col_list,'team_ccorg_cd as ccorg_cd','team_name as name'] : [...sga_col_list,'div_ccorg_cd as ccorg_cd','div_name as name'];
            let sga_where = org_col_nm === 'lv1_id' ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id };
            let sga_groupBy = org_col_nm === 'div_id' ? [...sga_groupBy_cols,'hdqt_ccorg_cd','hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...sga_groupBy_cols,'team_ccorg_cd','team_name'] : [...sga_groupBy_cols,'div_ccorg_cd','div_name'];
            
            /** 
             * 타겟 뷰 조회용 컬럼
             */
            const target_col_list = [
                'target_year',
                'org_order',
                'sum(ifnull(target_sale_amt,0)) as target_sale_amt',
                'sum(ifnull(sga_target_amt,0)) as sga_target_amt',
                'sum(ifnull(target_cont_margin_amt,0)) as target_cont_margin_amt'
            ];
            const target_where_conditions = { 'target_year': { in: [year, last_year] }, [org_ccorg_col_nm]: org_ccorg_cd};
            const target_groupBy_cols = ['target_year','org_order']
            
            let s_margin_rate = 'max(ifnull(target_margin_rate,0)) as target_margin_rate'
            let s_margin = '(sum(ifnull(target_sale_amt,0))*max(ifnull(target_margin_rate,0))/100) as target_margin'        
            
            let target_where = org_col_nm === 'hdqt_id' ? {...target_where_conditions, total:false, team_ccorg_cd : null} : {...target_where_conditions, total:false, div_ccorg_cd : {'!=':null}, hdqt_ccorg_cd : null, team_ccorg_cd : null};
            let target_column = org_col_nm === 'div_id' ? [...target_col_list, 'hdqt_ccorg_cd as ccorg_cd','org_name',s_margin_rate,s_margin] : org_col_nm === 'hdqt_id' ? [...target_col_list, 'team_ccorg_cd as ccorg_cd','org_name',s_margin_rate,s_margin] : org_col_nm === 'team_id' ? [...target_col_list, 'team_ccorg_cd as ccorg_cd','org_name'] : [...target_col_list,'div_ccorg_cd as ccorg_cd','org_name']
            let target_groupBy = org_col_nm === 'div_id' ? [...target_groupBy_cols,'hdqt_ccorg_cd','org_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...target_groupBy_cols,'team_ccorg_cd','org_name'] : [...target_groupBy_cols,'div_ccorg_cd','org_name'];
            
            // DB 쿼리 실행 (병렬)
            const [ query,query_target,sga_query] = await Promise.all([
                // PL 실적, 목표 조회
                SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(target).columns(target_column).where(target_where).groupBy(...target_groupBy),
                SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
            ]);
            return query
            
            
            let a_sga_filtered_curr_y_row = sga_query.filter(o => o.year === year),
                a_sga_filtered_last_y_row = sga_query.filter(o => o.year === last_year)
            
            // 임시 - 비어있을 경우 0 값 생성, 추후 에러처리 or 로직 구성
            let pl_curr_y_row = query.find(o => o.year === year),
                pl_last_y_row = query.find(o => o.year === last_year),
                sga_curr_y_row = {sga_amount_sum : a_sga_filtered_curr_y_row.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0)},
                sga_last_y_row = {sga_amount_sum : a_sga_filtered_last_y_row.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0)},
                curr_target = query_target.find(oTarget => oTarget.target_year === year),
                last_target = query_target.find(oTarget => oTarget.target_year === last_year);

            const sale_data =
            {
                "display_order": 1,
                "type": "매출",
                "target_curr_y_value": curr_target?.target_sale_amt ?? 0,
                "actual_curr_ym_value": pl_curr_y_row?.["sale_amount_sum"] ?? 0,
                "actual_last_ym_value": pl_last_y_row?.["sale_amount_sum"] ?? 0,
                "actual_curr_ym_rate": (curr_target?.target_sale_amt ?? 0) !== 0 ? (pl_curr_y_row?.["sale_amount_sum"] ?? 0) / (curr_target.target_sale_amt * 100000000) * 100 : 0,
                "actual_last_ym_rate": (last_target?.target_sale_amt ?? 0) !== 0 ? (pl_last_y_row?.["sale_amount_sum"] ?? 0) / (last_target.target_sale_amt * 100000000) * 100 : 0
            };
            oResult.push(sale_data);

            const margin_data =
            {
                "display_order": 2,
                "type": "마진",
                "target_curr_y_value": (curr_target?.target_margin ?? 0),
                "actual_curr_ym_value": pl_curr_y_row?.["margin_amount_sum"] ?? 0,
                "actual_last_ym_value": pl_last_y_row?.["margin_amount_sum"] ?? 0,
                "actual_curr_ym_rate": (curr_target?.target_margin ?? 0) !== 0 ? (pl_curr_y_row?.["margin_amount_sum"] ?? 0) / (curr_target.target_margin * 100000000) * 100 : 0,
                "actual_last_ym_rate": (last_target?.target_margin ?? 0) !== 0 ? (pl_last_y_row?.["margin_amount_sum"] ?? 0) / (last_target.target_margin * 100000000) * 100 : 0
            };
            oResult.push(margin_data);

            const margin_rate_data =
            {
                "display_order": 3,
                "type": "마진율",
                "target_curr_y_value": (curr_target?.target_margin_rate ?? 0),
                "actual_curr_ym_value": sale_data["actual_curr_ym_value"] !== 0 ? margin_data["actual_curr_ym_value"] / sale_data["actual_curr_ym_value"] * 100 : 0,
                "actual_last_ym_value": sale_data["actual_last_ym_value"] !== 0 ? margin_data["actual_last_ym_value"] / sale_data["actual_last_ym_value"] * 100 : 0,
                "actual_curr_ym_rate": (curr_target?.target_margin_rate ?? 0) === 0 || (sale_data["actual_curr_ym_value"] === 0) ? 0 : (margin_data["actual_curr_ym_value"] / sale_data["actual_curr_ym_value"])/curr_target.target_margin_rate * 100,
                "actual_last_ym_rate": (last_target?.target_margin_rate ?? 0) === 0 || (sale_data["actual_last_ym_value"] === 0) ? 0 : (margin_data["actual_last_ym_value"] / sale_data["actual_last_ym_value"])/last_target.target_margin_rate * 100
            };
            oResult.push(margin_rate_data);

            const sga_data =
            {
                "display_order": 4,
                "type": "SG&A",
                "target_curr_y_value": curr_target?.sga_target_amt ?? 0,
                "actual_curr_ym_value": sga_curr_y_row?.["sga_amount_sum"] ?? 0,
                "actual_last_ym_value": sga_last_y_row?.["sga_amount_sum"] ?? 0,
                "actual_curr_ym_rate": (curr_target?.sga_target_amt ?? 0) === 0 ? 0 : (sga_curr_y_row?.["sga_amount_sum"] ?? 0)/(curr_target.sga_target_amt * 100000000) * 100,
                "actual_last_ym_rate": (last_target?.sga_target_amt ?? 0) === 0 ? 0 : (sga_last_y_row?.["sga_amount_sum"] ?? 0)/(last_target.sga_target_amt * 100000000) * 100
            };

            oResult.push(sga_data);

            // 공헌이익 [마진 - 사업SG&A]
            const contribution_data =
            {
                "display_order": 5,
                "type": "공헌이익",
                "target_curr_y_value": curr_target?.target_cont_margin_amt ?? 0,
                "actual_curr_ym_value": margin_data["actual_curr_ym_value"] - (sga_curr_y_row?.["sga_amount_sum"] ?? 0),
                "actual_last_ym_value": margin_data["actual_last_ym_value"] - (sga_last_y_row?.["sga_amount_sum"] ?? 0),
                "actual_curr_ym_rate": (curr_target?.target_cont_margin_amt ?? 0) === 0 ? 0 : (margin_data["actual_curr_ym_value"] - (sga_curr_y_row?.["sga_amount_sum"] ?? 0))/((curr_target?.target_cont_margin_amt ?? 0)*100000000) * 100,
                "actual_last_ym_rate": (last_target?.target_cont_margin_amt ?? 0) === 0 ? 0 : (margin_data["actual_last_ym_value"] - (sga_last_y_row?.["sga_amount_sum"] ?? 0))/((last_target?.target_cont_margin_amt ?? 0)*100000000) * 100
            };
            oResult.push(contribution_data);
            
            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}