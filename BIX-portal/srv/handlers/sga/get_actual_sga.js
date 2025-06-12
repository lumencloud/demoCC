const { isRedirect } = require("@sap/cds/libx/odata/utils");

module.exports = (srv) => {
    srv.on('get_actual_sga', async (req) => {
        // function 호출 리턴 객체
        const aRes = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');
        const sga_view = db.entities('sga').wideview_unpivot_view;
        const org_full_level = db.entities('common').org_full_level_view;

        // cap api - function 의 인풋 파라미터 상수 선언
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

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
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', 'div_id'])
            .where({ 'org_id': org_id });

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        //조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        let org_div_nm = orgInfo.div_id;

        // SELECT 공통 조회조건
        const {sga_col_list, groupBy_cols} = getDynamicColumns(org_col_nm);       /**/
        const sga_where_conditions = {'year': { in: [year, last_year] }, 'month_amt':month};

        let sga_column = sga_col_list;
        let sga_where = org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id' ? sga_where_conditions : { ...sga_where_conditions, 'div_id': org_div_nm };
        let sga_groupBy = groupBy_cols;

        // sg&a 쿼리 객체
        const query = await SELECT.from(sga_view)
            .columns(sga_column)
            .where(sga_where)
            .groupBy(...sga_groupBy);

        let curr_y_sga = [];
        let last_y_sga = [];

        query.forEach(a => {
            if (a.year === year) {
                curr_y_sga.push(a);
            } else {
                last_y_sga.push(a);
            }
        })

        let o_sum_labor = {
            div_nm: '합계',
            div_id: org_id,
            type: 'LABOR',
            actual_curr_ym_value: 0,
            actual_last_ym_value: 0,
            actual_ym_gap: 0,
            actual_curr_ym_rate: 0,
            actual_last_ym_rate: 0,
            actual_ym_rate_gap: 0
        };
        let o_sum_invest = {
            div_nm: '합계',
            div_id: org_id,
            type: 'INVEST',
            actual_curr_ym_value: 0,
            actual_last_ym_value: 0,
            actual_ym_gap: 0,
            actual_curr_ym_rate: 0,
            actual_last_ym_rate: 0,
            actual_ym_rate_gap: 0
        };
        let o_sum_expence = {
            div_nm: '합계',
            div_id: org_id,
            type: 'EXPENSE',
            actual_curr_ym_value: 0,
            actual_last_ym_value: 0,
            actual_ym_gap: 0,
            actual_curr_ym_rate: 0,
            actual_last_ym_rate: 0,
            actual_ym_rate_gap: 0
        };
        let a_result = [];



        curr_y_sga.forEach(a => {



            const last_y_data = last_y_sga.find(b => b.div_id === a.div_id);
            let o_labor = {
                div_nm: a['div_name'],
                div_id: a['div_id'],
                type: 'LABOR',
                actual_curr_ym_value: a?.['labor_amount_sum'] ?? 0,
                actual_last_ym_value: last_y_data?.['labor_amount_sum'] ?? 0,
                actual_ym_gap: (a?.['labor_amount_sum'] ?? 0) - (last_y_data?.['labor_amount_sum'] ?? 0),
                actual_curr_ym_rate: 0,
                actual_last_ym_rate: 0,
                actual_ym_rate_gap: 0
            }
            let o_invest = {
                div_nm: a['div_name'],
                div_id: a['div_id'],
                type: 'INVEST',
                actual_curr_ym_value: a?.['iv_amount_sum'] ?? 0,
                actual_last_ym_value: last_y_data?.['iv_amount_sum'] ?? 0,
                actual_ym_gap: (a?.['iv_amount_sum'] ?? 0) - (last_y_data?.['iv_amount_sum'] ?? 0),
                actual_curr_ym_rate: 0,
                actual_last_ym_rate: 0,
                actual_ym_rate_gap: 0
            }
            let o_expence = {
                div_nm: a['div_name'],
                div_id: a['div_id'],
                type: 'EXPENSE',
                actual_curr_ym_value: a?.['exp_amount_sum'] ?? 0,
                actual_last_ym_value: last_y_data?.['exp_amount_sum'] ?? 0,
                actual_ym_gap: (a?.['exp_amount_sum'] ?? 0) - (last_y_data?.['exp_amount_sum'] ?? 0),
                actual_curr_ym_rate: 0,
                actual_last_ym_rate: 0,
                actual_ym_rate_gap: 0
            }

            o_sum_labor.actual_curr_ym_value += o_labor.actual_curr_ym_value;
            o_sum_labor.actual_last_ym_value += o_labor.actual_last_ym_value;
            o_sum_labor.actual_ym_gap += o_labor.actual_ym_gap;
            o_sum_invest.actual_curr_ym_value += o_invest.actual_curr_ym_value;
            o_sum_invest.actual_last_ym_value += o_invest.actual_last_ym_value;
            o_sum_invest.actual_ym_gap += o_invest.actual_ym_gap;
            o_sum_expence.actual_curr_ym_value += o_expence.actual_curr_ym_value;
            o_sum_expence.actual_last_ym_value += o_expence.actual_last_ym_value;
            o_sum_expence.actual_ym_gap += o_expence.actual_ym_gap;

            if (a.div_id) {
                a_result.push(o_labor, o_invest, o_expence)
            }
        })

        aRes.push(o_sum_labor, o_sum_invest, o_sum_expence, ...a_result);

        return aRes;
    })
    
    /**
     * 조직 레벨에 따른 동적 컬럼 및 그룹핑 설정
     */
    function getDynamicColumns(org_level) {
        switch (org_level) {
            case 'lv1_id':
                // 전사 레벨: 부문별로 집계
                return {
                    sga_col_list: ['year', 'div_id', 'div_name',
                        'sum(ifnull(labor_amount_sum,0)) as labor_amount_sum',
                        'sum(ifnull(iv_amount_sum,0)) as iv_amount_sum',
                        'sum(ifnull(exp_amount_sum,0)) as exp_amount_sum'],
                    groupBy_cols: ['year', 'div_id', 'div_name']
                };
                
            case 'div_id':
                // 부문 레벨: 본부별로 집계 (div_id, div_name을 hdqt로 매핑)
                return {
                    sga_col_list: ['year', 'hdqt_id as div_id', 'hdqt_name as div_name',
                        'sum(ifnull(labor_amount_sum,0)) as labor_amount_sum',
                        'sum(ifnull(iv_amount_sum,0)) as iv_amount_sum',
                        'sum(ifnull(exp_amount_sum,0)) as exp_amount_sum'],
                    groupBy_cols: ['year', 'hdqt_id', 'hdqt_name']
                };
                
            case 'hdqt_id':
                // 본부 레벨: 팀별로 집계 (div_id, div_name을 team으로 매핑)
                return {
                    sga_col_list: ['year', 'team_id as div_id', 'team_name as div_name',
                        'sum(ifnull(labor_amount_sum,0)) as labor_amount_sum',
                        'sum(ifnull(iv_amount_sum,0)) as iv_amount_sum',
                        'sum(ifnull(exp_amount_sum,0)) as exp_amount_sum'],
                    groupBy_cols: ['year', 'team_id', 'team_name']
                };
                
            default:
                // 기본값 (기존 코드와 동일)
                return {
                    sga_col_list: ['year', 'div_id', 'div_name',
                        'sum(ifnull(labor_amount_sum,0)) as labor_amount_sum',
                        'sum(ifnull(iv_amount_sum,0)) as iv_amount_sum',
                        'sum(ifnull(exp_amount_sum,0)) as exp_amount_sum'],
                    groupBy_cols: ['year', 'div_id', 'div_name']
                };
        }
    }
}