const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_actual_sga_chart', async (req) => {
        try{
            /**
             * 핸들러 초기에 권한체크
             */
            await check_user_auth(req);

            // function 호출 리턴 객체
            const aRes = [];

            // cds 모듈을 통한 DB 커넥트
            const db = await cds.connect.to('db');

            // =========================== 조회 대상 DB 테이블 ===========================
            // entities('<cds namespace 명>').<cds entity 명>
            /**
             * sga_wideview_view [sg&a 집계]
             */
            const sga_view = db.entities('sga').wideview_view;
            /**
             * common_org_full_level_view [조직정보]
             */
            const org_full_level = db.entities('common').org_full_level_view;
            /**
             * common_org_target_sum_view
             * 조직 별 연단위 목표금액
             */
            const target = db.entities('common').org_target_sum_view;
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id } = req.data;
            let i_month = Number(month);
            /**
             * SG&A 조회용 컬럼
             */
            let a_labor_columns = [];
            let a_labor_sum_expr_columns = [];
            let a_labor_avg_columns = [];
            for (let i = 1; i <= i_month; i++) {
                a_labor_columns.push(`ifnull(sum(labor_m${i}_am), 0) as labor_m${i}_amt`);
                a_labor_sum_expr_columns.push(`ifnull(labor_m${i}_amt,0)`)
            }
            // 총합 구하기
            const total_sum_columns = `sum(${a_labor_sum_expr_columns.join('+')}) as labor_sum`
            let a_labor_sum_columns = [total_sum_columns]
            //  평균 구하기
            const avg_expr = `sum(${a_labor_sum_expr_columns.join('+')}) / ${i_month} as labor_avg`
            a_labor_avg_columns.push(avg_expr)

            const sga_col_list = [...a_labor_columns, ...a_labor_sum_columns, ...a_labor_avg_columns];
            const sga_where_conditions = { 'year': { in: [year] } };

            /**
             * org_id 파라미터값으로 조직정보 조회
             */
            const org_col = `case
                when lv1_id = '${org_id}' THEN 'lv1_id'
                when lv2_id = '${org_id}' THEN 'lv2_id'
                when lv3_id = '${org_id}' THEN 'lv3_id'
                when div_id = '${org_id}' THEN 'div_id'
                when hdqt_id = '${org_id}' THEN 'hdqt_id'
                when team_id = '${org_id}' THEN 'team_id'
                end as org_level`;

            let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', "org_name"]).where({ 'org_id': org_id });
            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            // 조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level;
            // let org_ccorg_col_nm = org_col_nm.slice(0, -2) + 'ccorg_cd'; // <>_id 에서 id 제거 후 <>_ccorg_cd 컬럼명 생성
            // let org_ccorg_cd = orgInfo.org_ccorg_cd;

            let sga_column = sga_col_list;
            let sga_where = org_col_nm === 'lv1_id' ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id };

            const target_col_list = [
                'labor_target_amt'
            ];
            const target_where_conditions = { 'target_year': year, 'org_id': org_id };
            // let target_where = org_col_nm === 'lv1_id' ? { ...target_where_conditions} : org_col_nm === 'hdqt_id' ? { ...target_where_conditions, [org_ccorg_col_nm]: org_ccorg_cd } : { ...target_where_conditions, div_ccorg_cd: { '!=': null }, hdqt_ccorg_cd: null, [org_ccorg_col_nm]: org_ccorg_cd };
            // let target_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...target_col_list, 'max(ifnull(target_margin_rate,0)) as target_margin_rate', '(ifnull(sum(target_sale_amt), 0) * max(ifnull(target_margin_rate,0))/100) as target_margin'] : target_col_list
            // const target_groupBy = ['target_year']

            // DB 쿼리 실행 (병렬)
            const [query, query_target] = await Promise.all([
                SELECT.from(sga_view).columns(sga_column).where(sga_where),
                SELECT.from(target).columns(target_col_list).where(target_where_conditions)
            ]);

            let o_sga = query[0]
            o_sga.target = Number(query_target[0].labor_target_amt)
            o_sga.ratio = o_sga.target === 0 ? 0 : (o_sga.labor_sum / o_sga.target * 100)
            return o_sga;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}