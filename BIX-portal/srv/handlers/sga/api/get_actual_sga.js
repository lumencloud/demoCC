const e = require('express');
const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_actual_sga', async (req) => {
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
                a_exp_columns.push(`sum(exp_m${i}_amt) as exp_m${i}_amt`);
                a_labor_columns.push(`sum(labor_m${i}_amt) as labor_m${i}_amt`);
                a_iv_columns.push(`sum(iv_m${i}_amt) as iv_m${i}_amt`);
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

            const org_query = await SELECT.from(org_full_level).orderBy('org_order');
            // const org_query = await SELECT.from(org_full_level).columns([search_org, search_org_name, search_org_ccorg, 'org_order']).where({ [org_col_nm]: org_id }).orderBy('org_order');
            let org_query_data = [];
            org_query.forEach(data=>{
                if(data[org_col_nm] === org_id){
                    org_query_data.push(data)
                };
            })

            // DB 쿼리 실행 (병렬)
            let [query] = await Promise.all([
                SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy)
            ]);

            if(!query.length){
                //return req.res.status(204).send();
                return []
            }

            //ackerton 로직
            let ackerton_list = [];
            let ackerton_org;
            if(orgInfo.org_level === 'lv1_id' || orgInfo.org_level === 'lv2_id'){
                let ac_map = []
                ackerton_org = org_query.find(data=>data.org_ccorg_cd === '610000');
                org_query.forEach(data=>{
                    if (!ackerton_list.find(data2 => data2.id === data[search_org]) && data[search_org] && data['lv3_ccorg_cd'] === '610000') {
                        let oTemp = {
                            id: data[search_org],
                            name: data[search_org_name],
                            ccorg: data[search_org_ccorg],
                            org_order: data['org_order']
                        };
                        ac_map.push(data[search_org])
                        ackerton_list.push(oTemp);
                    };
                });
                sga_where = { ...sga_where, 'lv3_ccorg_cd' : '610000' };

                let ackerton_data = await SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy);

                let ackerton_curr_sga_sum_data = {
                    org_id: ackerton_org.org_id,
                    year: year
                };

                let ackerton_last_sga_sum_data = {
                    org_id: ackerton_org.org_id,
                    year: last_year
                };

                for(let i=1; i<=i_month; i++){
                    ackerton_curr_sga_sum_data[`exp_m${i}_amt`] = 0;
                    ackerton_curr_sga_sum_data[`labor_m${i}_amt`] = 0;
                    ackerton_curr_sga_sum_data[`iv_m${i}_amt`] = 0;

                    ackerton_last_sga_sum_data[`exp_m${i}_amt`] = 0;
                    ackerton_last_sga_sum_data[`labor_m${i}_amt`] = 0;
                    ackerton_last_sga_sum_data[`iv_m${i}_amt`] = 0;
                }

                //ackerton 하위 리스트
                ackerton_data.forEach(data => {
                    if(data.year === year){
                        for(let i=1; i<=i_month; i++){
                            ackerton_curr_sga_sum_data[`exp_m${i}_amt`] += data[`exp_m${i}_amt`];
                            ackerton_curr_sga_sum_data[`labor_m${i}_amt`] += data[`labor_m${i}_amt`];
                            ackerton_curr_sga_sum_data[`iv_m${i}_amt`] += data[`iv_m${i}_amt`];
                        }
                    }else if(data.year === last_year){
                        for(let i=1; i<=i_month; i++){
                            ackerton_last_sga_sum_data[`exp_m${i}_amt`] += data[`exp_m${i}_amt`];
                            ackerton_last_sga_sum_data[`labor_m${i}_amt`] += data[`labor_m${i}_amt`];
                            ackerton_last_sga_sum_data[`iv_m${i}_amt`] += data[`iv_m${i}_amt`];
                        }
                    }
                });

                query = query.filter(item=>!ac_map.includes(item['org_id']))
                query.push(ackerton_curr_sga_sum_data);
                query.push(ackerton_last_sga_sum_data);
            };
            
            //조직 리스트
            let org_list = [];
            org_query_data.forEach(data => {
                if (!org_list.find(data2 => data2.id === data[search_org]) && data[search_org]) {
                    let oTemp = {
                        id: data[search_org],
                        name: data[search_org_name],
                        ccorg: data[search_org_ccorg],
                        org_order: data['org_order']
                    };
                    
                    if(orgInfo.org_level === 'lv1_id' || orgInfo.org_level === 'lv2_id'){
                        if(!ackerton_list.find(data3 => data3.ccorg === oTemp.ccorg)){
                            org_list.push(oTemp);
                        };
                    }else{
                        org_list.push(oTemp);
                    }
                };
            });

            if(orgInfo.org_level === 'lv1_id' || orgInfo.org_level === 'lv2_id'){
                let oTemp = {
                    id: ackerton_org.org_id,
                    name: ackerton_org.org_name,
                    ccorg: ackerton_org.org_ccorg_cd,
                    org_order: ackerton_org.org_order
                };
                org_list.push(oTemp);
            };

            let sga_labor_amt_sum = {
                div_id: org_id,
                org_name: org_col_nm !== 'hdqt_id' && org_col_nm !== 'team_id' ? '합계' : org_col_nm_name,
                type: 'LABOR',
                actual_curr_ym_value: 0,
                actual_last_ym_value: 0,
                actual_ym_gap: 0,
            };
            let sga_invest_amt_sum = {
                div_id: org_id,
                org_name: org_col_nm !== 'hdqt_id' && org_col_nm !== 'team_id' ? '합계' : org_col_nm_name,
                type: 'INVEST',
                actual_curr_ym_value: 0,
                actual_last_ym_value: 0,
                actual_ym_gap: 0,
            };
            let sga_expence_amt_sum = {
                div_id: org_id,
                org_name: org_col_nm !== 'hdqt_id' && org_col_nm !== 'team_id' ? '합계' : org_col_nm_name,
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
                    org_name: data.name,
                    type: 'LABOR',
                    actual_curr_ym_value: o_curr_y_sga_org?.['labor_amount_sum'] ?? 0,
                    actual_last_ym_value: o_last_y_sga_org?.['labor_amount_sum'] ?? 0,
                    actual_ym_gap: (o_curr_y_sga_org?.['labor_amount_sum'] ?? 0) - (o_last_y_sga_org?.['labor_amount_sum'] ?? 0)
                };
                let o_invest = {
                    div_id: data.id,
                    org_name: data.name,
                    type: 'INVEST',
                    actual_curr_ym_value: o_curr_y_sga_org?.['iv_amount_sum'] ?? 0,
                    actual_last_ym_value: o_last_y_sga_org?.['iv_amount_sum'] ?? 0,
                    actual_ym_gap: (o_curr_y_sga_org?.['iv_amount_sum'] ?? 0) - (o_last_y_sga_org?.['iv_amount_sum'] ?? 0)
                };
                let o_expence = {
                    div_id: data.id,
                    org_name: data.name,
                    type: 'EXPENSE',
                    actual_curr_ym_value: o_curr_y_sga_org?.['exp_amount_sum'] ?? 0,
                    actual_last_ym_value: o_last_y_sga_org?.['exp_amount_sum'] ?? 0,
                    actual_ym_gap: (o_curr_y_sga_org?.['exp_amount_sum'] ?? 0) - (o_last_y_sga_org?.['exp_amount_sum'] ?? 0)
                };

                a_result.push(o_labor, o_invest, o_expence)
            });

            aRes.push(sga_labor_amt_sum, sga_invest_amt_sum, sga_expence_amt_sum);
            if(org_col_nm !== 'hdqt_id' && org_col_nm !== 'team_id'){
                aRes.push(...a_result);
            }
            return aRes;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}