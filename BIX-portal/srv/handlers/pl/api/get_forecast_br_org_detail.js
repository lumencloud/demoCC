const { odata } = require("@sap/cds");
const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_forecast_br_org_detail', async (req) => {
        try{
            /**
             * 핸들러 초기에 권한체크
             */
            await check_user_auth(req);

            /**
             * API 리턴값 담을 배열 선언
             */
            let result_data = [];

            // cds 모듈을 통한 DB 커넥트
            const db = await cds.connect.to('db');

            // =========================== 조회 대상 DB 테이블 ===========================
            // entities('<cds namespace 명>').<cds entity 명>
            // srv .cds 에 using from 구문에 엔티티가 속한 db .cds 파일이 최소 한 번이라도 걸려있어야 db.entities 로 엔티티 인식가능
            // (서비스에 등록할 필요는 없음)
            /**
             * BR [실적]
             */
            const rsp_view = db.entities('rsp').wideview_view;

            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;

            // function 입력 파라미터
            const { year, org_id } = req.data;
            const last_year = (Number(year) - 1).toString();

            // QUERY 공통 파라미터 선언

            /**
             * +++++ TBD +++++
             * 권한 체크하여 사용자가 조회 가능한 조직인지 판별 후 코드 진행
             */

            /**
             * org_id 파라미터값으로 조직정보 조회
             */
            const org_col = `case
                when lv1_id = '${org_id}' THEN 'lv1_ccorg_cd'
                when lv2_id = '${org_id}' THEN 'lv2_ccorg_cd'
                when lv3_id = '${org_id}' THEN 'lv3_ccorg_cd'
                when div_id = '${org_id}' THEN 'div_ccorg_cd'
                when hdqt_id = '${org_id}' THEN 'hdqt_ccorg_cd'
                when team_id = '${org_id}' THEN 'team_ccorg_cd'
                end as org_level`;
            let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd','org_name'])
                .where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_level = orgInfo.org_level;
            let org_ccorg_cd = orgInfo.org_ccorg_cd;

            let a_total = [];
            for(let i=1; i<13; i++){
                let s_total = `sum(total_m${i}_amt, 0))`
                a_total.push(s_total)
            }
            // rsp wideview (m, opp, total)
            const rsp_col_list = ['year',
                'case when sum(total_year_amt) <> 0 then (sum(bill_year_amt) + sum(indirect_cost_year) + sum(opp_year_amt)) / sum(total_year_amt) else 0 end as plan_value',
                'case when sum(total_year_amt) <> 0 then (sum(bill_year_amt) + sum(indirect_cost_year)) / sum(total_year_amt) else 0 end as secured_value',
                'case when sum(total_year_amt) <> 0 then (sum(opp_year_amt) / sum(total_year_amt)) else 0 end as not_secured_value',
                'sum(total_year_amt) as total_year_amt',
                'sum(bill_year_amt) as bill_year_amt',
                'sum(indirect_cost_year) as indirect_cost_year',
                'sum(b_mm_amt_sum) as b_mm_amt_sum',
                'sum(bun_mm_amt_sum) as mm_total_sum',
                'sum(opp_year_amt) as opp_year_amt',
                'sum(avg_year_amt) as avg_year_amt',
                'sum(est_total_year_emp) as est_total_year_emp',
                'sum(est_avg_year_amt) as est_avg_year_amt'
            ];
            const rsp_where_conditions = { 'year': { in: [year, last_year] }, [org_level]: orgInfo.org_ccorg_cd, is_delivery: true };
            const rsp_groupBy_cols = ['year'];
            let rsp_column = org_level === 'div_ccorg_cd' || org_level === 'hdqt_ccorg_cd' ? [...rsp_col_list, 'hdqt_ccorg_cd as ccorg_cd', 'hdqt_name as name'] : [...rsp_col_list, 'div_ccorg_cd as ccorg_cd', 'div_name as name'];
            let rsp_where = org_level === 'lv1_ccorg_cd' ? rsp_where_conditions : { ...rsp_where_conditions, [org_level]: org_ccorg_cd }
            let rsp_groupBy = org_level === 'div_ccorg_cd' || org_level === 'hdqt_ccorg_cd' ? [...rsp_groupBy_cols, 'hdqt_ccorg_cd', 'hdqt_name'] : [...rsp_groupBy_cols, 'div_ccorg_cd', 'div_name'];

            let org_column = org_level === 'div_ccorg_cd' || org_level === 'hdqt_ccorg_cd' ? ['hdqt_ccorg_cd as ccorg_cd', 'hdqt_id as id', 'hdqt_name as name', 'org_order','org_ccorg_cd','lv3_ccorg_cd', 'lv3_id','lv3_name'] : ['div_ccorg_cd as ccorg_cd', 'div_id as id', 'div_name as name', 'org_order','org_ccorg_cd','lv3_ccorg_cd', 'lv3_id','lv3_name'];
            let org_where = org_level === 'div_ccorg_cd' || org_level === 'hdqt_ccorg_cd' ? { 'hdqt_ccorg_cd': { '!=': null }, and: { [org_level]: org_ccorg_cd }, 'team_ccorg_cd': null } : { 'div_ccorg_cd': { '!=': null }, and: { [org_level]: org_ccorg_cd }, 'hdqt_ccorg_cd': null, 'team_ccorg_cd': null };
            let org_groupBy = org_level === 'div_ccorg_cd' || org_level === 'hdqt_ccorg_cd' ? ['hdqt_ccorg_cd', 'hdqt_id', 'hdqt_name', 'org_order','org_ccorg_cd','lv3_ccorg_cd', 'lv3_id','lv3_name'] : ['div_ccorg_cd', 'div_id', 'div_name', 'org_order','org_ccorg_cd','lv3_ccorg_cd', 'lv3_id','lv3_name'];


            // rsp wideview (m, opp, total)
            const rsp_sum_column = ['year',
                'case when sum(total_year_amt) <> 0 then (sum(bill_year_amt) + sum(indirect_cost_year) + sum(opp_year_amt)) / sum(total_year_amt) else 0 end as plan_value',
                'case when sum(total_year_amt) <> 0 then (sum(bill_year_amt) + sum(indirect_cost_year)) / sum(total_year_amt) else 0 end as secured_value',
                'case when sum(total_year_amt) <> 0 then (sum(opp_year_amt) / sum(total_year_amt)) else 0 end as not_secured_value',
                'sum(b_mm_amt_sum) as b_mm_amt_sum',
                'sum(bun_mm_amt_sum) as mm_total_sum',
                'sum(opp_year_amt) as opp_year_amt',
                'sum(avg_year_amt) as avg_year_amt',
                'sum(est_total_year_emp) as est_total_year_emp',
                'sum(est_avg_year_amt) as est_avg_year_amt'
            ];
            const rsp_sum_where = { 'year': { in: [year, last_year] }, [org_level]: orgInfo.org_ccorg_cd, is_delivery: true };
            const rsp_sum_groupBy = ['year'];
            const lv3_rsp_sum_column = ['year',
                'case when sum(total_year_amt) <> 0 then (sum(bill_year_amt) + sum(indirect_cost_year) + sum(opp_year_amt)) / sum(total_year_amt) else 0 end as plan_value',
                'case when sum(total_year_amt) <> 0 then (sum(bill_year_amt) + sum(indirect_cost_year)) / sum(total_year_amt) else 0 end as secured_value',
                'case when sum(total_year_amt) <> 0 then (sum(opp_year_amt) / sum(total_year_amt)) else 0 end as not_secured_value',
                'sum(b_mm_amt_sum) as b_mm_amt_sum',
                'sum(bun_mm_amt_sum) as mm_total_sum',
                'sum(opp_year_amt) as opp_year_amt',
                'sum(avg_year_amt) as avg_year_amt',
                'sum(est_total_year_emp) as est_total_year_emp',
                'sum(est_avg_year_amt) as est_avg_year_amt'
            ];
            const lv3_rsp_sum_where = { 'year': { in: [year, last_year] }, 'lv3_ccorg_cd': '610000', is_delivery: true };
            const lv3_rsp_sum_groupBy = ['year'];

            // DB 쿼리 실행 (병렬)
            const [data, org_full_level_data, target_data, sum_data, lv3_data] = await Promise.all([
                SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
                SELECT.from(org_full_level).columns(org_column).where(org_where).groupBy(...org_groupBy),
                get_org_target(year,['A05','A07']),
                SELECT.from(rsp_view).columns(rsp_sum_column).where(rsp_sum_where).groupBy(...rsp_sum_groupBy),
                SELECT.from(rsp_view).columns(lv3_rsp_sum_column).where(lv3_rsp_sum_where).groupBy(...lv3_rsp_sum_groupBy),
            ]);
            if(!data.length && !sum_data.length){
                //return req.res.status(204).send();
                return []
            }
            // 조직 정보가 없는 조직 추가
            // org_full_level_data.push({[org_child_level]: null, "org_ccorg_cd": null, org_ccorg_cd: null, org_name: "기타", org_order: 99999999});
            
            let o_result = {}
            const curr_lv3_data = lv3_data.find(oData => oData.year === year);
            const last_lv3_data = lv3_data.find(oData => oData.year === last_year);
            
            // 선택한 조직의 하위 조직들을 기반으로 반복문 실행
            org_full_level_data.forEach(org => {
                const curr_data = data.find(oData => oData.year === year && oData.ccorg_cd === org.ccorg_cd);
                const last_data = data.find(oData => oData.year === last_year && oData.ccorg_cd === org.ccorg_cd);

                // 올해 BR(MM), BR(Cost) 목표값
                const curr_target = target_data.find(oData => org["org_ccorg_cd"] === oData["org_ccorg_cd"]);
                const curr_target_br_mm_amt = curr_target?.target_br_mm || 0;
                const curr_target_br_cost_amt = curr_target?.target_br_cost || 0;
                if(['lv1_ccorg_cd','lv2_ccorg_cd'].includes(org_level) && org.lv3_ccorg_cd === '610000'){
                    if(!o_result[`${org.lv3_ccorg_cd}_mm`]){
                        o_result[`${org.lv3_ccorg_cd}_mm`] = {
                            type: "BR(MM)",
                            org_id: org.lv3_id,
                            org_name: org.lv3_name,
                            display_order: org.org_order,
                            item_order: 1,
                            secured_value: curr_lv3_data?.b_mm_amt_sum / curr_lv3_data?.mm_total_sum,
                            not_secured_value: (curr_lv3_data?.opp_year_amt / curr_lv3_data?.est_avg_year_amt) / curr_lv3_data?.est_total_year_emp,
                            last_secured_value: last_lv3_data?.b_mm_amt_sum / last_lv3_data?.mm_total_sum,
                            last_not_secured_value: (last_lv3_data?.opp_year_amt / last_lv3_data?.est_avg_year_amt) / last_lv3_data?.est_total_year_emp,  
                        }
                        o_result[`${org.lv3_ccorg_cd}_mm`]["plan_value"] = o_result[`${org.lv3_ccorg_cd}_mm`].secured_value + o_result[`${org.lv3_ccorg_cd}_mm`].not_secured_value;
                        o_result[`${org.lv3_ccorg_cd}_mm`]["last_plan_value"] = o_result[`${org.lv3_ccorg_cd}_mm`].last_secured_value + o_result[`${org.lv3_ccorg_cd}_mm`].last_not_secured_value;
                        o_result[`${org.lv3_ccorg_cd}_mm`]["plan_ratio"] = o_result[`${org.lv3_ccorg_cd}_mm`].plan_value - (curr_target_br_mm_amt / 100);
                        o_result[`${org.lv3_ccorg_cd}_mm`]["yoy"] = o_result[`${org.lv3_ccorg_cd}_mm`].plan_value - o_result[`${org.lv3_ccorg_cd}_mm`].last_plan_value;
                        o_result[`${org.lv3_ccorg_cd}_cost`]={
                            type: "BR(Cost)",
                            org_id: org.lv3_id,
                            org_name: org.lv3_name,
                            display_order: org.org_order,
                            item_order: 2,
                            plan_value: curr_lv3_data?.plan_value,
                            secured_value: curr_lv3_data?.secured_value,
                            not_secured_value: curr_lv3_data?.not_secured_value,
                            plan_ratio: curr_lv3_data?.plan_value - (curr_target_br_cost_amt / 100),
                            yoy: curr_lv3_data?.plan_value - last_lv3_data?.plan_value,
                        }
                    }
                }else{
                    if(!o_result[`${org.ccorg_cd}_mm`]){
                        o_result[`${org.ccorg_cd}_mm`] = {
                            type: "BR(MM)",
                            org_id: org.id,
                            org_name: org.name,
                            display_order: org.org_order,
                            item_order: 1,
                            secured_value: curr_data?.b_mm_amt_sum / curr_data?.mm_total_sum,
                            not_secured_value: (curr_data?.opp_year_amt / curr_data?.est_avg_year_amt) / curr_data?.est_total_year_emp,
                            last_secured_value: last_data?.b_mm_amt_sum / last_data?.mm_total_sum,
                            last_not_secured_value: (last_data?.opp_year_amt / last_data?.est_avg_year_amt) / last_data?.est_total_year_emp,  
                        }
                        o_result[`${org.ccorg_cd}_mm`]["plan_value"] = o_result[`${org.ccorg_cd}_mm`].secured_value + o_result[`${org.ccorg_cd}_mm`].not_secured_value;
                        o_result[`${org.ccorg_cd}_mm`]["last_plan_value"] = o_result[`${org.ccorg_cd}_mm`].last_secured_value + o_result[`${org.ccorg_cd}_mm`].last_not_secured_value;
                        o_result[`${org.ccorg_cd}_mm`]["plan_ratio"] = o_result[`${org.ccorg_cd}_mm`].plan_value - (curr_target_br_mm_amt / 100);
                        o_result[`${org.ccorg_cd}_mm`]["yoy"] = o_result[`${org.ccorg_cd}_mm`].plan_value - o_result[`${org.ccorg_cd}_mm`].last_plan_value;
                        o_result[`${org.ccorg_cd}_cost`]={
                            type: "BR(Cost)",
                            org_id: org.id,
                            org_name: org.name,
                            display_order: org.org_order,
                            item_order: 2,
                            plan_value: curr_data?.plan_value,
                            secured_value: curr_data?.secured_value,
                            not_secured_value: curr_data?.not_secured_value,
                            plan_ratio: curr_data?.plan_value - (curr_target_br_cost_amt / 100),
                            yoy: curr_data?.plan_value - last_data?.plan_value,
                        }
                    }
                }
            })
            let a_result = Object.values(o_result)
            result_data.push(...a_result)

            // 합계 로직
            // 연도별로 필터링
            const curr_data = sum_data.find(oData => oData.year === year);
            const last_data = sum_data.find(oData => oData.year === last_year);

            // 올해 BR(MM), BR(Cost) 목표값
            const curr_target = target_data.find(oData => orgInfo["org_ccorg_cd"] === oData["org_ccorg_cd"]);
            const curr_target_br_mm_amt = curr_target?.target_br_mm || 0;
            const curr_target_br_cost_amt = curr_target?.target_br_cost || 0;

            let o_total_mm = {
                type: "BR(MM)",
                org_id: 'total',
                org_name:  org_level === 'hdqt_ccorg_cd' || org_level === 'team_ccorg_cd' ? orgInfo.org_name : '합계',
                display_order: 1,
                item_order: 1,
                secured_value: curr_data?.b_mm_amt_sum / curr_data?.mm_total_sum,
                not_secured_value: curr_data?.est_total_year_emp && curr_data?.est_avg_year_amt ? (curr_data?.opp_year_amt / curr_data?.est_avg_year_amt) / curr_data?.est_total_year_emp : 0,
                last_secured_value: last_data?.b_mm_amt_sum / last_data?.mm_total_sum,
                last_not_secured_value: last_data?.est_total_year_emp && last_data?.est_avg_year_amt ? (last_data?.opp_year_amt / last_data?.est_avg_year_amt) / last_data?.est_total_year_emp : 0,                
            }
            o_total_mm["plan_value"] = o_total_mm.secured_value + o_total_mm.not_secured_value;    
            o_total_mm["last_plan_value"] = o_total_mm.last_secured_value + o_total_mm.last_not_secured_value;
            o_total_mm["plan_ratio"] = o_total_mm.plan_value - (curr_target_br_mm_amt / 100);
            o_total_mm["yoy"] = o_total_mm.plan_value - o_total_mm.last_plan_value;
            
            let o_total_cost = {
                type: "BR(COST)",
                org_id: 'total',
                org_name: org_level === 'hdqt_ccorg_cd' || org_level === 'team_ccorg_cd' ? orgInfo.org_name : '합계',
                display_order: 1,
                item_order: 2,
                plan_value: curr_data?.plan_value,
                secured_value: curr_data?.secured_value,
                not_secured_value: curr_data?.not_secured_value,
                plan_ratio: curr_data?.plan_value - (curr_target_br_cost_amt / 100),
                yoy: curr_data?.plan_value - last_data?.plan_value,
            }

            // org_name, type 순으로 정렬
            let a_sort_field = [
                { field: "display_order", order: "asc" },
                { field: "item_order", order: "asc" },
            ];
            result_data.sort((oItem1, oItem2) => {
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
            let oResult = []

            oResult.push(o_total_mm);
            oResult.push(o_total_cost);
            
            if(org_level !== 'hdqt_ccorg_cd' && org_level !== 'team_ccorg_cd'){
                oResult.push(...result_data)
            }

            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}