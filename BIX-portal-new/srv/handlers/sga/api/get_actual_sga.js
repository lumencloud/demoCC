module.exports = (srv) => {
    srv.on('get_actual_sga', async (req) => {
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
        // =================================================================================

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();
        const i_month = Number(month);
        /**
         * SG&A 조회용 컬럼
         */
        let a_exp_columns = [];
        let a_labor_columns = [];
        let a_iv_columns = [];
        for(let i=1; i<=i_month; i++){
            a_exp_columns.push(`sum(ifnull(exp_m${i}_amt,0)) as exp_m${i}_amt`);
            a_labor_columns.push(`sum(ifnull(labor_m${i}_amt,0)) as labor_m${i}_amt`);
            a_iv_columns.push(`sum(ifnull(iv_m${i}_amt,0)) as iv_m${i}_amt`);
        }

        const sga_col_list = ['year', ...a_exp_columns, ...a_labor_columns, ...a_iv_columns];
        const sga_where_conditions = { 'year': { in: [year, last_year] } };
        const sga_groupBy_cols = ['year'];
            
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
        // let orgInfo = await SELECT.one.from(org_full_level).columns([org_col]).where`org_id = ${org_id}`;
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', "org_name"]).where({ 'org_id': org_id });
        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        // 조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        let org_col_nm_name = orgInfo.org_name;
        let search_org, search_org_nm, search_org_ccorg

        let sga_column = sga_col_list;
        let sga_where = org_col_nm.includes('lv1') ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id };
        let sga_groupBy = sga_groupBy_cols;

        // 조회 조건 별 하위 집계대상 (전사~ 부문 상위 - 부문 / 부문 - 본부 / 본부 - 팀)
        if (org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id') {
            search_org = 'div_id';
            search_org_nm = 'div_name';
            search_org_ccorg = 'div_ccorg_cd';
            sga_column = [...sga_col_list, 'div_id as org_id'];
            sga_groupBy = [...sga_groupBy, 'div_id'];
        } else if (org_col_nm === 'div_id') {
            search_org = 'hdqt_id';
            search_org_nm = 'hdqt_name';
            search_org_ccorg = 'hdqt_ccorg_cd';
            sga_column = [...sga_col_list, 'hdqt_id as org_id'];
            sga_groupBy = [...sga_groupBy, 'hdqt_id'];
        } else if (org_col_nm === 'hdqt_id') {
            search_org = 'team_id';
            search_org_nm = 'team_name';
            search_org_ccorg = 'team_ccorg_cd';
            sga_column = [...sga_col_list, 'team_id as org_id'];
            sga_groupBy = [...sga_groupBy, 'team_id'];
        }

        const org_query = await SELECT.from(org_full_level).columns([search_org, search_org_nm, search_org_ccorg, 'org_order']).where({ [org_col_nm]: org_id }).orderBy('org_order');

        //조직 리스트
        let org_list = [];
        org_query.forEach(data=>{
            if(org_col_nm === 'hdqt_id' || org_col_nm === 'team_id'){
                if(org_id === data['org_id']){
                    let oTemp = {
                        id : data['org_id'],
                        name : data['org_name'],
                        ccorg : data['org_ccorg_cd'],
                        org_order : data['org_order']
                    };
                    org_list.push(oTemp);
                };
            }else{
                if(!org_list.find(data2=>data2.id === data[search_org]) && data[search_org]){
                    let oTemp = {
                        id : data[search_org],
                        name : data[search_org_nm],
                        ccorg : data[search_org_ccorg],
                        org_order : data['org_order']
                    };
                    org_list.push(oTemp);
                };
            }
        });

        // DB 쿼리 실행 (병렬)
        const [query] = await Promise.all([
            SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy)
        ]);

        let sga_labor_amt_sum = {
            div_id: org_id,
            div_nm: org_col_nm !== 'hdqt_id' && org_col_nm !== 'team_id' ? '합계' : org_col_nm_name,
            type: 'LABOR',
            actual_curr_ym_value: 0,
            actual_last_ym_value: 0,
            actual_ym_gap: 0,
        };
        let sga_invest_amt_sum = {
            div_id: org_id,
            div_nm: org_col_nm !== 'hdqt_id' && org_col_nm !== 'team_id' ? '합계' : org_col_nm_name,
            type: 'INVEST',
            actual_curr_ym_value: 0,
            actual_last_ym_value: 0,
            actual_ym_gap: 0,
        };
        let sga_expence_amt_sum = {
            div_id: org_id,
            div_nm: org_col_nm !== 'hdqt_id' && org_col_nm !== 'team_id' ? '합계' : org_col_nm_name,
            type: 'EXPENSE',
            actual_curr_ym_value: 0,
            actual_last_ym_value: 0,
            actual_ym_gap: 0,
        };

        //sga 데이터 가공
        let a_curr_y_sga = [];
        let a_last_y_sga = [];
        query.forEach(data => {
            if (data.year === year) {
                data.labor_amount_sum = 0;
                data.iv_amount_sum = 0;
                data.exp_amount_sum = 0;

                for (let i = 1; i <= month; i++) {
                    data.labor_amount_sum += data[`labor_m${i}_amt`] ?? 0;
                    data.iv_amount_sum += data[`iv_m${i}_amt`] ?? 0;
                    data.exp_amount_sum += data[`exp_m${i}_amt`] ?? 0;
                };

                a_curr_y_sga.push(data);
                sga_labor_amt_sum.actual_curr_ym_value += data.labor_amount_sum ?? 0;
                sga_invest_amt_sum.actual_curr_ym_value += data.iv_amount_sum ?? 0;
                sga_expence_amt_sum.actual_curr_ym_value += data.exp_amount_sum ?? 0;
            } else if (data.year === last_year) {
                data.labor_amount_sum = 0;
                data.iv_amount_sum = 0;
                data.exp_amount_sum = 0;

                for (let i = 1; i <= month; i++) {
                    data.labor_amount_sum += data[`labor_m${i}_amt`] ?? 0;
                    data.iv_amount_sum += data[`iv_m${i}_amt`] ?? 0;
                    data.exp_amount_sum += data[`exp_m${i}_amt`] ?? 0;
                };

                a_last_y_sga.push(data);
                sga_labor_amt_sum.actual_last_ym_value += data.labor_amount_sum ?? 0;
                sga_invest_amt_sum.actual_last_ym_value += data.iv_amount_sum ?? 0;
                sga_expence_amt_sum.actual_last_ym_value += data.exp_amount_sum ?? 0;
            };
        });
        sga_labor_amt_sum.actual_ym_gap += sga_labor_amt_sum.actual_curr_ym_value - sga_labor_amt_sum.actual_last_ym_value;
        sga_invest_amt_sum.actual_ym_gap += sga_invest_amt_sum.actual_curr_ym_value - sga_invest_amt_sum.actual_last_ym_value;
        sga_expence_amt_sum.actual_ym_gap += sga_expence_amt_sum.actual_curr_ym_value - sga_expence_amt_sum.actual_last_ym_value;

        const a_result = [];
        org_list.forEach(data => {
            const o_curr_y_sga_org = a_curr_y_sga.find(b => b.org_id === data.id);
            const o_last_y_sga_org = a_last_y_sga.find(b => b.org_id === data.id);

            let o_labor = {
                div_id: data.id,
                div_nm: data.name,
                type: 'LABOR',
                actual_curr_ym_value: o_curr_y_sga_org?.['labor_amount_sum'] ?? 0,
                actual_last_ym_value: o_last_y_sga_org?.['labor_amount_sum'] ?? 0,
                actual_ym_gap: (o_curr_y_sga_org?.['labor_amount_sum'] ?? 0) - (o_last_y_sga_org?.['labor_amount_sum'] ?? 0)
            };
            let o_invest = {
                div_id: data.id,
                div_nm: data.name,
                type: 'INVEST',
                actual_curr_ym_value: o_curr_y_sga_org?.['iv_amount_sum'] ?? 0,
                actual_last_ym_value: o_last_y_sga_org?.['iv_amount_sum'] ?? 0,
                actual_ym_gap: (o_curr_y_sga_org?.['iv_amount_sum'] ?? 0) - (o_last_y_sga_org?.['iv_amount_sum'] ?? 0)
            };
            let o_expence = {
                div_id: data.id,
                div_nm: data.name,
                type: 'EXPENSE',
                actual_curr_ym_value: o_curr_y_sga_org?.['exp_amount_sum'] ?? 0,
                actual_last_ym_value: o_last_y_sga_org?.['exp_amount_sum'] ?? 0,
                actual_ym_gap: (o_curr_y_sga_org?.['exp_amount_sum'] ?? 0) - (o_last_y_sga_org?.['exp_amount_sum'] ?? 0)
            };

            a_result.push(o_labor, o_invest, o_expence)
        });

        aRes.push(sga_labor_amt_sum, sga_invest_amt_sum, sga_expence_amt_sum, ...a_result);

        return aRes;
    })
}