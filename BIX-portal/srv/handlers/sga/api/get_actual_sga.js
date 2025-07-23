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
                a_exp_columns.push(`sum(exp_m${i}_amt)`);
                a_labor_columns.push(`sum(labor_m${i}_amt)`);
                a_iv_columns.push(`sum(iv_m${i}_amt)`);
            }
            let s_exp_columns = "(" + a_exp_columns.join(' + ') + ') as exp_amount_sum';
            let s_labor_columns = "(" + a_labor_columns.join(' + ') + ') as labor_amount_sum';
            let s_iv_columns = "(" + a_iv_columns.join(' + ') + ') as iv_amount_sum';

            const sga_col_list = ['year', 'ccorg_cd', 'lv3_ccorg_cd', 'ifnull(sum(labor_year_amt), 0) as labor_y_sum', 'ifnull(sum(exp_year_amt), 0) + ifnull(sum(iv_year_amt), 0) as ex_iv_y_sum', s_exp_columns, s_labor_columns, s_iv_columns];
            const sga_where_conditions = { 'year': { in: [year, last_year] } };
            const sga_groupBy_cols = ['year', 'ccorg_cd', 'lv3_ccorg_cd'];
                
            /**
             * org_id 파라미터값으로 조직정보 조회
             * 
             */
            let orgInfo = await SELECT.one.from(org_full_level).columns(['org_ccorg_cd', "org_name", 'org_level']).where({ 'org_id': org_id });
            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            // 조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level + '_ccorg_cd';
            let org_col_nm_name = orgInfo.org_name;
            let search_org, search_org_name, search_org_ccorg, child_level

            let sga_column = sga_col_list;
            let sga_where = (org_col_nm.includes('lv1') || org_col_nm.includes('lv2')) ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: orgInfo.org_ccorg_cd };
            let sga_groupBy = sga_groupBy_cols;

            // 조회 조건 별 하위 집계대상 (전사~ 부문 상위 - 부문 / 부문 - 본부 / 본부 - 팀)
            if (org_col_nm === 'lv1_ccorg_cd' || org_col_nm === 'lv2_ccorg_cd' || org_col_nm === 'lv3_ccorg_cd') {
                search_org = 'div_id';
                search_org_name = 'div_name';
                search_org_ccorg = 'div_ccorg_cd';
                child_level = 'div';
            } else if (org_col_nm === 'div_ccorg_cd') {
                search_org = 'hdqt_id';
                search_org_name = 'hdqt_name';
                search_org_ccorg = 'hdqt_ccorg_cd';
                child_level = 'hdqt';
            } else if (org_col_nm === 'hdqt_ccorg_cd') {
                search_org = 'team_id';
                search_org_name = 'team_name';
                search_org_ccorg = 'team_ccorg_cd';
                child_level = 'team';
            }
            sga_column = [...sga_col_list, `${search_org_ccorg} as org_ccorg_cd`];
            sga_groupBy = [...sga_groupBy, search_org_ccorg];

            // DB 쿼리 실행 (병렬)
            const [query, target_query, org_query] = await Promise.all([
                SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
                get_org_target(year,['C05','C07']),
                SELECT.from(org_full_level)
            ]);

            if(!query.length){
                //return req.res.status(204).send();
                return []
            }

            //org 정리 및 ackerton 리스트 작성
            let org_query_data = [];
            let ackerton_list = [];
            org_query.forEach(data=>{
                if(data[org_col_nm] === orgInfo.org_ccorg_cd && data['org_level'] !== 'team' && data['org_level'] === child_level){
                    org_query_data.push(data)
                };
                if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                    if (!ackerton_list.find(data2 => data2 === data[search_org_ccorg]) && data[search_org_ccorg] && data['lv3_ccorg_cd'] === '610000') {
                        ackerton_list.push(data[search_org_ccorg]);
                    };
                };
            });

            let ackerton_org, ackerton_curr_sga_sum_data, ackerton_last_sga_sum_data;
            if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                ackerton_org = org_query.find(data=>data.org_ccorg_cd === '610000');

                ackerton_curr_sga_sum_data = {
                    org_ccorg_cd: ackerton_org.org_ccorg_cd,
                    year: year,
                    exp_amount_sum: 0,
                    labor_amount_sum: 0,
                    iv_amount_sum: 0,
                    labor_y_sum: 0,
                    ex_iv_y_sum: 0
                };

                ackerton_last_sga_sum_data = {
                    org_ccorg_cd: ackerton_org.org_ccorg_cd,
                    year: last_year,
                    exp_amount_sum: 0,
                    labor_amount_sum: 0,
                    iv_amount_sum: 0,
                    labor_y_sum: 0,
                    ex_iv_y_sum: 0
                };
            };

            //토탈값 구하기 위한 베이스 작성
            let total_target = target_query.find(data=>data.org_ccorg_cd === orgInfo.org_ccorg_cd);
            let sga_labor_amt_sum = {
                div_id: org_id,
                org_name: org_col_nm !== 'hdqt_ccorg_cd' && org_col_nm !== 'team_ccorg_cd' ? '합계' : org_col_nm_name,
                type: 'LABOR',
                org_order: '001',
                curr_target_value: total_target.target_labor,
                last_target_value: 0,
                actual_curr_ym_value: 0,
                actual_last_ym_value: 0,
                actual_ym_gap: 0,
                curr_ex_iv_sum: null,
                last_ex_iv_sum: null,
                curr_rate: 0,
                last_rate: 0,
                rate_gap: 0
            };
            let sga_invest_amt_sum = {
                div_id: org_id,
                org_name: org_col_nm !== 'hdqt_ccorg_cd' && org_col_nm !== 'team_ccorg_cd' ? '합계' : org_col_nm_name,
                type: 'INVEST',
                org_order: '002',
                curr_target_value: total_target.target_expense,
                last_target_value: 0,
                actual_curr_ym_value: 0,
                actual_last_ym_value: 0,
                actual_ym_gap: 0,
                curr_ex_iv_sum: 0,
                last_ex_iv_sum: 0,
                curr_rate: 0,
                last_rate: 0,
                rate_gap: 0
            };
            let sga_expence_amt_sum = {
                div_id: org_id,
                org_name: org_col_nm !== 'hdqt_ccorg_cd' && org_col_nm !== 'team_ccorg_cd' ? '합계' : org_col_nm_name,
                type: 'EXPENSE',
                org_order: '003',
                curr_target_value: total_target.target_expense,
                last_target_value: 0,
                actual_curr_ym_value: 0,
                actual_last_ym_value: 0,
                actual_ym_gap: 0,
                curr_ex_iv_sum: 0,
                last_ex_iv_sum: 0,
                curr_rate: 0,
                last_rate: 0,
                rate_gap: 0
            };

            //전체 값으로 데이터 작성 및 akerton 값 작성
            let o_query_sum = {};
            query.forEach(data=>{
                if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                    if(data.ccorg_cd === '999990'){
                        data.org_ccorg_cd = '999990';
                    };
                    if(data.lv3_ccorg_cd === '610000'){
                        if(data.year === year){
                            ackerton_curr_sga_sum_data.exp_amount_sum += data.exp_amount_sum;
                            ackerton_curr_sga_sum_data.labor_amount_sum += data.labor_amount_sum;
                            ackerton_curr_sga_sum_data.iv_amount_sum += data.iv_amount_sum;
                            ackerton_curr_sga_sum_data.labor_y_sum += data.labor_y_sum;
                            ackerton_curr_sga_sum_data.ex_iv_y_sum += data.ex_iv_y_sum;
                        }else if(data.year === last_year){
                            ackerton_last_sga_sum_data.exp_amount_sum += data.exp_amount_sum;
                            ackerton_last_sga_sum_data.labor_amount_sum += data.labor_amount_sum;
                            ackerton_last_sga_sum_data.iv_amount_sum += data.iv_amount_sum;
                            ackerton_last_sga_sum_data.labor_y_sum += data.labor_y_sum;
                            ackerton_last_sga_sum_data.ex_iv_y_sum += data.ex_iv_y_sum;
                        };
                    };
                };
                
                if(!o_query_sum[`${data.org_ccorg_cd}_${data.year}`]){
                    o_query_sum[`${data.org_ccorg_cd}_${data.year}`] = {org_ccorg_cd : data.org_ccorg_cd, year:data.year};
                };
                o_query_sum[`${data.org_ccorg_cd}_${data.year}`]['exp_amount_sum'] = (o_query_sum[`${data.org_ccorg_cd}_${data.year}`]?.['exp_amount_sum'] ?? 0) + (data?.['exp_amount_sum']??0);
                o_query_sum[`${data.org_ccorg_cd}_${data.year}`]['labor_amount_sum'] = (o_query_sum[`${data.org_ccorg_cd}_${data.year}`]?.['labor_amount_sum'] ?? 0) + (data?.['labor_amount_sum']??0);
                o_query_sum[`${data.org_ccorg_cd}_${data.year}`]['iv_amount_sum'] = (o_query_sum[`${data.org_ccorg_cd}_${data.year}`]?.['iv_amount_sum'] ?? 0) + (data?.['iv_amount_sum']??0);
                o_query_sum[`${data.org_ccorg_cd}_${data.year}`]['labor_y_sum'] = (o_query_sum[`${data.org_ccorg_cd}_${data.year}`]?.['labor_y_sum'] ?? 0) + (data?.['labor_y_sum']??0);
                o_query_sum[`${data.org_ccorg_cd}_${data.year}`]['ex_iv_y_sum'] = (o_query_sum[`${data.org_ccorg_cd}_${data.year}`]?.['ex_iv_y_sum'] ?? 0) + (data?.['ex_iv_y_sum']??0);

                if(data.year === year){
                    sga_labor_amt_sum.actual_curr_ym_value += data.labor_amount_sum ?? 0;
                    sga_invest_amt_sum.actual_curr_ym_value += data.iv_amount_sum ?? 0;
                    sga_expence_amt_sum.actual_curr_ym_value += data.exp_amount_sum ?? 0;

                    sga_invest_amt_sum.curr_ex_iv_sum += (data.iv_amount_sum ?? 0)+(data.exp_amount_sum ?? 0);
                    sga_expence_amt_sum.curr_ex_iv_sum += (data.iv_amount_sum ?? 0)+(data.exp_amount_sum ?? 0);
                }else if(data.year === last_year){
                    sga_labor_amt_sum.actual_last_ym_value += data.labor_amount_sum ?? 0;
                    sga_invest_amt_sum.actual_last_ym_value += data.iv_amount_sum ?? 0;
                    sga_expence_amt_sum.actual_last_ym_value += data.exp_amount_sum ?? 0;

                    sga_labor_amt_sum.last_target_value += data.labor_y_sum ?? 0;
                    sga_invest_amt_sum.last_target_value += data.ex_iv_y_sum ?? 0;
                    sga_expence_amt_sum.last_target_value += data.ex_iv_y_sum ?? 0;

                    sga_invest_amt_sum.last_ex_iv_sum += (data.iv_amount_sum ?? 0)+(data.exp_amount_sum ?? 0);
                    sga_expence_amt_sum.last_ex_iv_sum += (data.iv_amount_sum ?? 0)+(data.exp_amount_sum ?? 0);
                };
            });

            sga_labor_amt_sum.actual_ym_gap += sga_labor_amt_sum.actual_curr_ym_value - sga_labor_amt_sum.actual_last_ym_value;
            sga_invest_amt_sum.actual_ym_gap += sga_invest_amt_sum.actual_curr_ym_value - sga_invest_amt_sum.actual_last_ym_value;
            sga_expence_amt_sum.actual_ym_gap += sga_expence_amt_sum.actual_curr_ym_value - sga_expence_amt_sum.actual_last_ym_value;

            sga_labor_amt_sum.curr_rate = (sga_labor_amt_sum?.curr_target_value ?? 0) === 0 ? 0 : (sga_labor_amt_sum?.actual_curr_ym_value ?? 0) / ((sga_labor_amt_sum?.curr_target_value ?? 0)*100000000);
            sga_invest_amt_sum.curr_rate = (sga_invest_amt_sum?.curr_target_value ?? 0) === 0 ? 0 : (sga_invest_amt_sum?.curr_ex_iv_sum ?? 0) / ((sga_invest_amt_sum?.curr_target_value ?? 0)*100000000);
            sga_expence_amt_sum.curr_rate = (sga_invest_amt_sum?.curr_target_value ?? 0) === 0 ? 0 : (sga_invest_amt_sum?.curr_ex_iv_sum ?? 0) / ((sga_invest_amt_sum?.curr_target_value ?? 0)*100000000);

            sga_labor_amt_sum.last_rate = (sga_labor_amt_sum?.last_target_value ?? 0) === 0 ? 0 : (sga_labor_amt_sum?.actual_last_ym_value ?? 0) / (sga_labor_amt_sum?.last_target_value ?? 0);
            sga_invest_amt_sum.last_rate = (sga_invest_amt_sum?.last_target_value ?? 0) === 0 ? 0 : (sga_invest_amt_sum?.last_ex_iv_sum ?? 0) / (sga_invest_amt_sum?.last_target_value ?? 0);
            sga_expence_amt_sum.last_rate = (sga_invest_amt_sum?.last_target_value ?? 0) === 0 ? 0 : (sga_invest_amt_sum?.last_ex_iv_sum ?? 0) / (sga_invest_amt_sum?.last_target_value ?? 0);

            sga_labor_amt_sum.rate_gap = ((sga_labor_amt_sum?.curr_target_value ?? 0) === 0 ? 0 : (sga_labor_amt_sum?.actual_curr_ym_value ?? 0) / ((sga_labor_amt_sum?.curr_target_value ?? 0)*100000000)) - ((sga_labor_amt_sum?.last_target_value ?? 0) === 0 ? 0 : (sga_labor_amt_sum?.actual_last_ym_value ?? 0) / (sga_labor_amt_sum?.last_target_value ?? 0));
            sga_invest_amt_sum.rate_gap = ((sga_invest_amt_sum?.curr_target_value ?? 0) === 0 ? 0 : (sga_invest_amt_sum?.curr_ex_iv_sum ?? 0) / ((sga_invest_amt_sum?.curr_target_value ?? 0)*100000000)) - ((sga_invest_amt_sum?.last_target_value ?? 0) === 0 ? 0 : (sga_invest_amt_sum?.last_ex_iv_sum ?? 0) / (sga_invest_amt_sum?.last_target_value ?? 0));
            sga_expence_amt_sum.rate_gap = ((sga_invest_amt_sum?.curr_target_value ?? 0) === 0 ? 0 : (sga_invest_amt_sum?.curr_ex_iv_sum ?? 0) / ((sga_invest_amt_sum?.curr_target_value ?? 0)*100000000)) - ((sga_invest_amt_sum?.last_target_value ?? 0) === 0 ? 0 : (sga_invest_amt_sum?.last_ex_iv_sum ?? 0) / (sga_invest_amt_sum?.last_target_value ?? 0));

            let a_query_sum = Object.values(o_query_sum);
            if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                a_query_sum.push(ackerton_curr_sga_sum_data);
                a_query_sum.push(ackerton_last_sga_sum_data);
            };

            //최종 조직 리스트 작성
            let org_list = [];
            org_query_data.forEach(data => {
                let oTemp = {
                    id: data[search_org],
                    name: data[search_org_name],
                    ccorg: data[search_org_ccorg],
                    org_order: data['org_order']
                };
                
                if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                    if(!ackerton_list.find(data2 => data2 === oTemp.ccorg)){
                        org_list.push(oTemp);
                    };
                }else{
                    org_list.push(oTemp);
                }
            });

            //akerton 및 999990 조직 작성
            if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                let oTemp = {
                    id: ackerton_org.org_id,
                    name: ackerton_org.org_name,
                    ccorg: ackerton_org.org_ccorg_cd,
                    org_order: ackerton_org.org_order
                };
                org_list.push(oTemp);
                let oTemp2 = {
                    id: "999990",
                    name: "전사",
                    ccorg: "999990",
                    org_order: '99999999999'
                };
                org_list.push(oTemp2);
            };

            //최종 데이터 작성
            let a_curr_y_sga = [];
            let a_last_y_sga = [];
            a_query_sum.forEach(data => {
                if (data.year === year) {
                    a_curr_y_sga.push(data);
                } else if (data.year === last_year) {
                    a_last_y_sga.push(data);
                };
            });

            const a_result = [];
            org_list.forEach(data => {
                const o_curr_y_sga_org = a_curr_y_sga.find(data2 => data2.org_ccorg_cd === data.ccorg);
                const o_last_y_sga_org = a_last_y_sga.find(data2 => data2.org_ccorg_cd === data.ccorg);
                const target = target_query.find(data2=>data2.org_ccorg_cd === data.ccorg);

                let o_labor = {
                    div_id: data.id,
                    org_name: data.name,
                    type: 'LABOR',
                    org_order: data.org_order,
                    curr_target_value: target?.target_labor ?? 0,
                    last_target_value: o_last_y_sga_org?.labor_y_sum ?? 0,
                    actual_curr_ym_value: o_curr_y_sga_org?.['labor_amount_sum'] ?? 0,
                    actual_last_ym_value: o_last_y_sga_org?.['labor_amount_sum'] ?? 0,
                    actual_ym_gap: (o_curr_y_sga_org?.['labor_amount_sum'] ?? 0) - (o_last_y_sga_org?.['labor_amount_sum'] ?? 0),
                    curr_ex_iv_sum: null,
                    last_ex_iv_sum: null,
                    curr_rate: (target?.target_labor ?? 0) === 0 ? 0 : (o_curr_y_sga_org?.['labor_amount_sum'] ?? 0) / ((target?.target_labor ?? 0)*100000000),
                    last_rate: (o_last_y_sga_org?.labor_y_sum ?? 0) === 0 ? 0 : (o_last_y_sga_org?.['labor_amount_sum'] ?? 0) / (o_last_y_sga_org?.labor_y_sum ?? 0),
                    rate_gap: ((target?.target_labor ?? 0) === 0 ? 0 : (o_curr_y_sga_org?.['labor_amount_sum'] ?? 0) / ((target?.target_labor ?? 0)*100000000)) - ((o_last_y_sga_org?.labor_y_sum ?? 0) === 0 ? 0 : (o_last_y_sga_org?.['labor_amount_sum'] ?? 0) / (o_last_y_sga_org?.labor_y_sum ?? 0))
                };
                let o_invest = {
                    div_id: data.id,
                    org_name: data.name,
                    type: 'INVEST',
                    org_order: data.org_order,
                    curr_target_value: target?.target_expense ?? 0,
                    last_target_value: o_last_y_sga_org.ex_iv_y_sum ?? 0,
                    actual_curr_ym_value: o_curr_y_sga_org?.['iv_amount_sum'] ?? 0,
                    actual_last_ym_value: o_last_y_sga_org?.['iv_amount_sum'] ?? 0,
                    actual_ym_gap: (o_curr_y_sga_org?.['iv_amount_sum'] ?? 0) - (o_last_y_sga_org?.['iv_amount_sum'] ?? 0),
                    curr_ex_iv_sum: (o_curr_y_sga_org?.['iv_amount_sum'] ?? 0) + (o_curr_y_sga_org?.['exp_amount_sum'] ?? 0),
                    last_ex_iv_sum: (o_last_y_sga_org?.['iv_amount_sum'] ?? 0) + (o_last_y_sga_org?.['exp_amount_sum'] ?? 0),
                    curr_rate: (target?.target_expense ?? 0) === 0 ? 0 : ((o_curr_y_sga_org?.['iv_amount_sum'] ?? 0) + (o_curr_y_sga_org?.['exp_amount_sum'] ?? 0)) / ((target?.target_expense ?? 0)*100000000),
                    last_rate: (o_last_y_sga_org?.ex_iv_y_sum ?? 0) === 0 ? 0 : ((o_last_y_sga_org?.['iv_amount_sum'] ?? 0) + (o_last_y_sga_org?.['exp_amount_sum'] ?? 0)) / (o_last_y_sga_org?.ex_iv_y_sum ?? 0),
                    rate_gap: ((target?.target_expense ?? 0) === 0 ? 0 : ((o_curr_y_sga_org?.['iv_amount_sum'] ?? 0) + (o_curr_y_sga_org?.['exp_amount_sum'] ?? 0)) / ((target?.target_expense ?? 0)*100000000)) - ((o_last_y_sga_org?.ex_iv_y_sum ?? 0) === 0 ? 0 : ((o_last_y_sga_org?.['iv_amount_sum'] ?? 0) + (o_last_y_sga_org?.['exp_amount_sum'] ?? 0)) / (o_last_y_sga_org?.ex_iv_y_sum ?? 0))
                };
                let o_expence = {
                    div_id: data.id,
                    org_name: data.name,
                    type: 'EXPENSE',
                    org_order: data.org_order,
                    curr_target_value: target?.target_expense ?? 0,
                    last_target_value: o_last_y_sga_org.ex_iv_y_sum ?? 0,
                    actual_curr_ym_value: o_curr_y_sga_org?.['exp_amount_sum'] ?? 0,
                    actual_last_ym_value: o_last_y_sga_org?.['exp_amount_sum'] ?? 0,
                    actual_ym_gap: (o_curr_y_sga_org?.['exp_amount_sum'] ?? 0) - (o_last_y_sga_org?.['exp_amount_sum'] ?? 0),
                    curr_ex_iv_sum: (o_curr_y_sga_org?.['iv_amount_sum'] ?? 0) + (o_curr_y_sga_org?.['exp_amount_sum'] ?? 0),
                    last_ex_iv_sum: (o_last_y_sga_org?.['iv_amount_sum'] ?? 0) + (o_last_y_sga_org?.['exp_amount_sum'] ?? 0),
                    curr_rate: (target?.target_expense ?? 0) === 0 ? 0 : ((o_curr_y_sga_org?.['iv_amount_sum'] ?? 0) + (o_curr_y_sga_org?.['exp_amount_sum'] ?? 0)) / ((target?.target_expense ?? 0)*100000000),
                    last_rate: (o_last_y_sga_org?.ex_iv_y_sum ?? 0) === 0 ? 0 : ((o_last_y_sga_org?.['iv_amount_sum'] ?? 0) + (o_last_y_sga_org?.['exp_amount_sum'] ?? 0)) / (o_last_y_sga_org?.ex_iv_y_sum ?? 0),
                    rate_gap: ((target?.target_expense ?? 0) === 0 ? 0 : ((o_curr_y_sga_org?.['iv_amount_sum'] ?? 0) + (o_curr_y_sga_org?.['exp_amount_sum'] ?? 0)) / ((target?.target_expense ?? 0)*100000000)) - ((o_last_y_sga_org?.ex_iv_y_sum ?? 0) === 0 ? 0 : ((o_last_y_sga_org?.['iv_amount_sum'] ?? 0) + (o_last_y_sga_org?.['exp_amount_sum'] ?? 0)) / (o_last_y_sga_org?.ex_iv_y_sum ?? 0))
                };

                a_result.push(o_labor, o_expence, o_invest)
            });
            
            aRes.push(sga_labor_amt_sum, sga_expence_amt_sum, sga_invest_amt_sum);
            if(org_col_nm !== 'hdqt_ccorg_cd' && org_col_nm !== 'team_ccorg_cd'){
                aRes.push(...a_result);
            }

            //데이터 정렬
            let a_sort_field = [
                { field: "org_order", order: "asc" }
            ];
            aRes.sort((oItem1, oItem2) => {
                for (const { field, order } of a_sort_field) {
                    // 필드가 null일 때
                    if (oItem1[field] === null && oItem2[field] !== null) return -1;
                    if (oItem1[field] !== null && oItem2[field] === null) return 1;
                    if (oItem1[field] === null && oItem2[field] === null) continue;

                    if (typeof oItem1[field] === "number") {
                        var result = oItem1[field] - oItem2[field];
                    } else {
                        var result = oItem1[field].localeCompare(oItem2[field]);
                    }

                    if (result !== 0) {
                        return (order === "asc") ? result : -result;
                    }
                }
                return 0;
            })

            return aRes;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}         