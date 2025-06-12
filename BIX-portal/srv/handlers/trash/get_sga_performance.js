module.exports = (srv) => {
    srv.on('get_sga_performance', async (req) => {
        // function 호출 리턴 객체
        const aRes = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // =========================== 조회 대상 DB 테이블 ===========================
        // entities('<cds namespace 명>').<cds entity 명>
        /**
         * sga_wideview_unpivot_view [sg&a 집계]
         */
        const sga_view = db.entities('sga').wideview_unpivot_view;
        /**
         * common_org_full_level_view [조직정보]
         */
        const org_full_level = db.entities('common').org_full_level_view;
        // =================================================================================

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

        /**
         * SG&A 조회용 컬럼
         * shared_exp_yn false = 사업 대상만 조회
         */
        const sga_col_list = ['year', 'month_amt',
            'sum(ifnull(labor_amount_sum,0)) as labor_amount_sum', 'sum(ifnull(iv_amount_sum,0)) as iv_amount_sum',
            'sum(ifnull(exp_amount_sum,0)) as exp_amount_sum'];
        const sga_where_conditions = { 'year': year, 'month_amt': month, 'shared_exp_yn': false };
        const sga_groupBy_cols = ['year', 'month_amt'];
        // const sga_groupBy_cols = ['year', 'month_amt', 'shared_exp_yn'];

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
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col]).where`org_id = ${org_id}`;
        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        // 조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        let sub_orgInfo = [];

        let sga_column = sga_col_list;
        let sga_where = { ...sga_where_conditions, [org_col_nm]: org_id };
        let sga_groupBy = sga_groupBy_cols;

        // 조회 조건 별 하위 집계대상 (전사~ 부문 상위 - 부문 / 부문 - 본부 / 본부 - 팀)
        if (org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id') {
            sub_orgInfo = await SELECT.from(org_full_level).columns(['org_id', 'org_name', 'org_ccorg_cd'])
                .where({ [org_col_nm]: org_id, div_id: {"!=":null}, hdqt_id: null, team_id: null }).orderBy(['org_order']);

            sga_column = [...sga_col_list, 'div_id as org_id'];
            sga_groupBy = [...sga_groupBy, 'div_id'];
        } else if (org_col_nm === 'div_id') {
            sub_orgInfo = await SELECT.from(org_full_level).columns(['org_id', 'org_name', 'org_ccorg_cd'])
                .where({ div_id: org_id, hdqt_id: null, team_id: null }).orderBy(['org_order']);

            sga_column = [...sga_col_list, 'hdqt_id as org_id'];
            sga_groupBy = [...sga_groupBy, 'hdqt_id'];
        } else if (org_col_nm === 'hdqt_id') {
            sub_orgInfo = await SELECT.from(org_full_level).columns(['org_id', 'org_name', 'org_ccorg_cd'])
                .where({ hdqt_id: org_id, team_id: null }).orderBy(['org_order']);

            sga_column = [...sga_col_list, 'team_id as org_id'];
            sga_groupBy = [...sga_groupBy, 'team_id'];
        }

        // let sga_where = org_col_nm === 'lv1_id' ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id }; 

        // DB 쿼리 실행 (병렬)
        const [query] = await Promise.all([
            SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy)
        ]);

        let sga_labor_amt_sum = {
            type: '합계',
            expense: 'LABOR',
            goal: 0,
            performanceCurrentYearMonth: 0,
            performanceLastYearMonth: 0,
            performanceYearMonthGap: 0,
            performanceAttainmentRateCurrentYear: 0,
            performanceAttainmentRateLastYear: 0,
            performanceAttainmentRategap: 0
        };
        let sga_invest_amt_sum = {
            type: '합계',
            expense: 'INVEST',
            goal: 0,
            performanceCurrentYearMonth: 0,
            performanceLastYearMonth: 0,
            performanceYearMonthGap: 0,
            performanceAttainmentRateCurrentYear: 0,
            performanceAttainmentRateLastYear: 0,
            performanceAttainmentRategap: 0
        };
        let sga_expence_amt_sum = {
            type: '합계',
            expense: 'EXPENSE',
            goal: 0,
            performanceCurrentYearMonth: 0,
            performanceLastYearMonth: 0,
            performanceYearMonthGap: 0,
            performanceAttainmentRateCurrentYear: 0,
            performanceAttainmentRateLastYear: 0,
            performanceAttainmentRategap: 0
        };
        let a_result = [];

        for (const org of sub_orgInfo) {
            let labor_amt = {
                type: org['org_name'],
                expense: 'LABOR',
                goal: 0,
                performanceCurrentYearMonth: query.find(o=>o.org_id === org.org_id)?.['labor_amount_sum'] ?? 0,
                performanceLastYearMonth: 0,
                performanceYearMonthGap: 0,
                performanceAttainmentRateCurrentYear: 0,
                performanceAttainmentRateLastYear: 0,
                performanceAttainmentRategap: 0
            }
            let exp_amt = {
                type: org['org_name'],
                expense: 'EXPENSE',
                goal: 0,
                performanceCurrentYearMonth: query.find(o=>o.org_id === org.org_id)?.['exp_amount_sum'] ?? 0,
                performanceLastYearMonth: 0,
                performanceYearMonthGap: 0,
                performanceAttainmentRateCurrentYear: 0,
                performanceAttainmentRateLastYear: 0,
                performanceAttainmentRategap: 0
            }
            let iv_amt = {
                type: org['org_name'],
                expense: 'INVEST',
                goal: 0,
                performanceCurrentYearMonth: query.find(o=>o.org_id === org.org_id)?.['iv_amount_sum'] ?? 0,
                performanceLastYearMonth: 0,
                performanceYearMonthGap: 0,
                performanceAttainmentRateCurrentYear: 0,
                performanceAttainmentRateLastYear: 0,
                performanceAttainmentRategap: 0
            }
            a_result.push(labor_amt, exp_amt, iv_amt);
            sga_labor_amt_sum["performanceCurrentYearMonth"] += labor_amt["performanceCurrentYearMonth"];
            sga_expence_amt_sum["performanceCurrentYearMonth"] += exp_amt["performanceCurrentYearMonth"];
            sga_invest_amt_sum["performanceCurrentYearMonth"] += iv_amt["performanceCurrentYearMonth"];

        }

        a_result

        aRes.push(sga_labor_amt_sum, sga_invest_amt_sum, sga_expence_amt_sum, ...a_result);

        return aRes;
    })
}