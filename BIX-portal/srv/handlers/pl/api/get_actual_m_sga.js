const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_m_sga', async (req) => {
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
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id, org_tp } = req.data;
            const i_month = Number(month);
            /**
             * SG&A 조회용 컬럼
             */
            const sga_col_list = ['year', `ifnull(sum(exp_m${i_month}_amt), 0) as exp_amt`, `ifnull(sum(labor_m${i_month}_amt), 0) as labor_amt`, `ifnull(sum(iv_m${i_month}_amt), 0) as iv_amt`];
            const sga_where_conditions = { 'year': { in: [year] } , is_total_cc : false };
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
            let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', "org_name"]).where({ 'org_id': org_id });
            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            // 조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level;
            let org_col_nm_name = orgInfo.org_name;
            let search_org, search_org_name, search_org_ccorg

            let sga_column = sga_col_list;
            let sga_where = org_col_nm.includes('lv1') ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id };
            let sga_groupBy = sga_groupBy_cols;

            // 조회 조건 별 하위 집계대상 (전사~ 부문 상위 - 부문 / 부문 - 본부 / 본부 - 팀)
            if (org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id') {
                search_org = 'div_id';
                search_org_name = 'div_name';
                search_org_ccorg = 'div_ccorg_cd';
                sga_column = [...sga_col_list, 'div_id as org_id'];
                sga_groupBy = [...sga_groupBy, 'div_id'];
            } else if (org_col_nm === 'div_id') {
                search_org = 'hdqt_id';
                search_org_name = 'hdqt_name';
                search_org_ccorg = 'hdqt_ccorg_cd';
                sga_column = [...sga_col_list, 'hdqt_id as org_id'];
                sga_groupBy = [...sga_groupBy, 'hdqt_id'];
            } else if (org_col_nm === 'hdqt_id') {
                search_org = 'team_id';
                search_org_name = 'team_name';
                search_org_ccorg = 'team_ccorg_cd';
                sga_column = [...sga_col_list, 'team_id as org_id'];
                sga_groupBy = [...sga_groupBy, 'team_id'];
            }
            sga_where = org_tp ? { ...sga_where, 'org_tp' : org_tp } : sga_where;

            const org_query = await SELECT.from(org_full_level).columns([search_org, search_org_name, search_org_ccorg, 'org_order']).where({ [org_col_nm]: org_id }).orderBy('org_order');

            //조직 리스트
            let org_list = [];
            org_query.forEach(data=>{
                if(!org_list.find(data2=>data2.id === data[search_org]) && data[search_org]){
                    let oTemp = {
                        id : data[search_org],
                        name : data[search_org_name],
                        ccorg : data[search_org_ccorg],
                        org_order : data['org_order']
                    };
                    org_list.push(oTemp);
                };
            });

            // DB 쿼리 실행 (병렬)
            const [query] = await Promise.all([
                SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy)
            ]);
            // if(!query.length){
            //     //return req.res.status(204).send();
            //     return []
            // }

            const a_result = [];
            org_list.forEach(data => {
                const o_curr_y_sga_org = query.find(b => b.org_id === data.id);
                let temp_data = {
                    div_id: data.id,
                    org_name: data.name,
                    labor:o_curr_y_sga_org?.['labor_amt'] ?? 0,
                    invest:o_curr_y_sga_org?.['iv_amt'] ?? 0,
                    expense:o_curr_y_sga_org?.['exp_amt'] ?? 0
                }

                a_result.push(temp_data)
            });

            if(org_col_nm === 'div_id'){
                let temp_data = {
                    div_id: org_id,
                    org_name: org_col_nm_name,
                    labor:0,
                    invest:0,
                    expense:0
                }

                query.forEach(data => {
                    temp_data.labor += data.labor_amt ?? 0;
                    temp_data.invest += data.iv_amt ?? 0;
                    temp_data.expense += data.exp_amt ?? 0;
                });
                aRes.push(temp_data);
            };
            aRes.push(...a_result);

            return aRes;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}