module.exports = (srv) => {
    srv.on('get_actual_sga_detail_excel', async (req) => {
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
        let i_month = Number(month);

        // 조직 정보 얻음
        let org_query = await SELECT.from(org_full_level).where({org_id : org_id});  
        if (!org_query) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        // 조직 정보 추가
        let lv_chk = org_query.find(data => data.lv1_id === org_id || data.lv2_id === org_id)
        let org_chk;
        if(lv_chk){
            org_chk = 'ent';
        }else{
            let div_chk = org_query.find(data => data.div_id === org_id);
            let hdqt_chk = org_query.find(data => data.hdqt_id === org_id);

            if(div_chk){
                org_chk = "div_ccorg_cd";
            }else if(hdqt_chk){
                org_chk = "hdqt_ccorg_cd";
            };
        };

        const ccorg_cd = org_query[0].org_ccorg_cd;

        //얻은 데이터를 통해 수치 데이터 추가
        let query, query_total;
        if(type === 'exp'){
            let add_column;
            for(let i = 1 ; i <= i_month; i++){
                !add_column ? add_column = `sum(ifnull(exp_m1_amt,0))` : add_column += ` + sum(ifnull(exp_m${i}_amt,0))`;
                if(i === i_month){
                    add_column = `${add_column} as sga_sum`
                };
            };

            const sga_expense_where_conditions = { 'year': { in: [year, last_year] }, 'shared_exp_yn': false };

            let sga_expense_where;
            if(org_chk === 'ent'){
                sga_expense_where = sga_expense_where_conditions;
            }else{
                sga_expense_where = { ...sga_expense_where_conditions, [`${org_chk}`]: ccorg_cd };
            };

            // DB 쿼리 실행 (병렬)
            [query, query_total] = await Promise.all([
                SELECT.from(sga_expense).where(sga_expense_where)
            ]);
        }else if(type === 'inv'){
            let add_column;
            for(let i = 1 ; i <= i_month; i++){
                !add_column ? add_column = `sum(ifnull(iv_cost_m1_amt,0))` : add_column += ` + sum(ifnull(iv_cost_m${i}_amt,0))`;
                if(i === i_month){
                    add_column = `${add_column} as sga_sum`
                };
            };
            const sga_investment_where_conditions = { 'year': { in: [year, last_year] } };

            let sga_investment_where;
            if(org_chk === 'ent'){
                sga_investment_where = sga_investment_where_conditions;
            }else{
                sga_investment_where = { ...sga_investment_where_conditions, [`${org_chk}`]: ccorg_cd };
            };

            // DB 쿼리 실행 (병렬)
            [query, query_total] = await Promise.all([
                SELECT.from(sga_investment).where(sga_investment_where)
            ]);
        }else{
            return;
        };

        oResult.push(...query);
        return oResult;
    })
}