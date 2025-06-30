module.exports = (srv) => {
    srv.on('get_actual_sga_detail', async (req) => {
        /**
         * API 리턴값 담을 배열 선언
         */
        const oResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // =========================== 조회 대상 DB 테이블 ===========================
        // entities('<cds namespace 명>').<cds entity 명>
        const org_full_level = db.entities('common').org_full_level_view;
        const sga_expense = db.entities('sga').expense_view;
        const sga_investment = db.entities('sga').investment_view;
        // =================================================================================

        // function 입력 파라미터(year - 해당년, month - 마감월(현재4월일시 - 마감월3월입력 받음.), org_id - 조직 id, type - exp:경비, inv-투자비)
        const { year, month, org_id, type } = req.data;
        const last_year = (Number(year) - 1).toString();
        const i_month = Number(month);

        // 조직 정보 얻음
        const org_col = `case
            when lv1_id = '${org_id}' THEN 'lv1_id'
            when lv2_id = '${org_id}' THEN 'lv2_id'
            when lv3_id = '${org_id}' THEN 'lv3_id'
            when div_id = '${org_id}' THEN 'div_id'
            when hdqt_id = '${org_id}' THEN 'hdqt_id'
            when team_id = '${org_id}' THEN 'team_id'
            end as org_level`;
        const orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', "org_name"]).where({ 'org_id': org_id });
        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        const org_col_nm = orgInfo.org_level;
        const org_ccorg_col = org_col_nm.split('_',1) + '_ccorg_cd';
        const org_ccorg_cd = orgInfo.org_ccorg_cd;

        //얻은 데이터를 통해 수치 데이터 추가
        let query, s_col_nm;
        if(type === 'exp'){
            let add_column =[];

            for(let i = 1 ; i <= 12; i++){
                add_column.push(`sum(ifnull(exp_m${i}_amt,0)) as exp_m${i}_amt`);
            };

            const sga_expense_col_list = ['year', 'description', 'commitment_item', ...add_column];
            const sga_expense_where_conditions = { 'year': { in: [year, last_year] }, 'shared_exp_yn': false };
            const sga_expense_groupBy_cols = ['year', 'description', 'commitment_item'];
            const sga_expense_orderBy_cols = ['commitment_item', 'year'];

            let sga_expense_where = org_col_nm === 'lv1_id' ? sga_expense_where_conditions : { ...sga_expense_where_conditions, [`${org_ccorg_col}`]: org_ccorg_cd };
            
            query = await SELECT.from(sga_expense).columns(sga_expense_col_list).where(sga_expense_where).groupBy(...sga_expense_groupBy_cols).orderBy(...sga_expense_orderBy_cols);
            s_col_nm = 'exp';
        }else if(type === 'inv'){
            let add_column =[];
            for(let i = 1 ; i <= 12; i++){
                add_column.push(`sum(ifnull(iv_cost_m${i}_amt,0)) as iv_cost_m${i}_amt`);
            };
            
            const sga_investment_col_list = ['year', 'description', 'commitment_item', ...add_column];
            const sga_investment_where_conditions = { 'year': { in: [year, last_year] } };
            const sga_investment_groupBy_cols = ['year', 'description', 'commitment_item'];
            const sga_investment_orderBy_cols = ['commitment_item', 'year'];

            let sga_investment_where = org_col_nm === 'lv1_id' ? sga_investment_where_conditions : { ...sga_investment_where_conditions, [`${org_ccorg_col}`]: org_ccorg_cd };

            query = await SELECT.from(sga_investment).columns(sga_investment_col_list).where(sga_investment_where).groupBy(...sga_investment_groupBy_cols).orderBy(...sga_investment_orderBy_cols);
            s_col_nm = 'iv_cost';
        }else{
            return;
        };

        let a_list = []
        query.filter(data => {
            let sId = data['commitment_item'] ? data['commitment_item'] : 'etc'
            let sName = data['description'] ? data['description'] : data['commitment_item'] ? data['commitment_item'] : '기타'
            const exist = a_list.some(list => list.name === sName);
            if (!exist) {
                a_list.push({ id: sId, name: sName });
            };
        });

        //데이터 최종 가공
        let o_curr_y_result = {};
        let o_last_y_result = {};
        query.forEach(data => {
            if (data.year === year) {
                let sName = data.description ? data.description : '기타';
                if (!o_curr_y_result[sName]) {
                    o_curr_y_result[sName] = {};
                };
                data.cost_curr_ym = 0;
                data.cost_total_curr_y = 0;

                for (let i = 1; i <= 12; i++) {
                    if (i <= i_month) {
                        data.cost_curr_ym += data[s_col_nm + `_m${i}_amt`] ?? 0;
                    } else {
                        data.cost_total_curr_y += data[s_col_nm + `_m${i}_amt`] ?? 0;
                    }
                };
                o_curr_y_result[sName] = data;
            } else if (data.year === last_year) {
                let sName = data.description ? data.description : '기타';
                if (!o_last_y_result[sName]) {
                    o_last_y_result[sName] = {};
                };
                data.cost_last_ym = 0;

                for (let i = 1; i <= i_month; i++) {
                    data.cost_last_ym += data[s_col_nm + `_m${i}_amt`] ?? 0;
                };
                o_last_y_result[sName] = data;
            };
        });

        let a_final_data = [];
        a_list.forEach(data => {
            let cost_name = data.name;
            let cost_curr_ym = o_curr_y_result?.[data.name]?.cost_curr_ym ?? 0;
            let cost_last_ym = o_last_y_result?.[data.name]?.cost_last_ym ?? 0;
            let cost_total_curr_y = o_curr_y_result?.[data.name]?.cost_total_curr_y ?? 0;
            let cost_gap = (cost_curr_ym - cost_last_ym);

            let oTemp = {
                name: cost_name,
                cost_curr_ym: cost_curr_ym,
                cost_last_ym: cost_last_ym,
                cost_total_curr_y: cost_total_curr_y,
                cost_gap: cost_gap
            };
            a_final_data.push(oTemp);
        });

        oResult.push(...a_final_data);
        return oResult;
    })
}