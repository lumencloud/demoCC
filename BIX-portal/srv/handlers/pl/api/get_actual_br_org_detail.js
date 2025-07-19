const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_actual_br_org_detail', async (req) => {
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
            const version = db.entities('common').version;

            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;

            // function 입력 파라미터
            const { year, month, org_id } = req.data;
            const last_year = (Number(year) - 1).toString();

            // QUERY 공통 파라미터 선언

            /**
             * +++++ TBD +++++
             * 권한 체크하여 사용자가 조회 가능한 조직인지 판별 후 코드 진행
             */

            /**
             * org_id 파라미터값으로 조직정보 조회 및 버전 확인
             */
            const org_child_col = `case
                when lv1_id = '${org_id}' THEN 'div_ccorg_cd'
                when lv2_id = '${org_id}' THEN 'div_ccorg_cd'
                when lv3_id = '${org_id}' THEN 'div_ccorg_cd'
                when div_id = '${org_id}' THEN 'hdqt_ccorg_cd'
                when hdqt_id = '${org_id}' THEN 'team_ccorg_cd'
                when team_id = '${org_id}' THEN 'team_ccorg_cd'
                end as org_child_level`;

            const version_column = ['year', 'month'];
            const version_where = { 'tag': 'C' };

            const [orgInfo, versionInfo] = await Promise.all([
                SELECT.one.from(org_full_level).columns(['org_level', org_child_col, 'org_ccorg_cd', 'org_name']).where({ 'org_id': org_id }),
                SELECT.one.from(version).columns(version_column).where(version_where),
            ]);

            // 제일 최신 버전의 월
            // const month = versionInfo.month;

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_level = orgInfo.org_level + '_ccorg_cd';
            let org_child_level = orgInfo.org_child_level;
            let org_name = orgInfo.org_name;

            /** 
             * 타겟 뷰 조회용 컬럼
             */
            let a_sum_b_mm = []
            let a_sum_bun_mm = []
            let a_sum_bill = []
            let a_sum_indirect = []
            let a_sum_total = []
            for(let i = 1; i<=Number(month); i++){
                a_sum_b_mm.push(`sum(b_mm_m${i}_amt)`)
                a_sum_bun_mm.push(`sum(bun_mm_m${i}_amt)`)
                a_sum_bill.push(`sum(bill_m${i}_amt)`)
                a_sum_indirect.push(`sum(indirect_cost_m${i})`)
                a_sum_total.push(`sum(total_m${i}_amt)`)
            }
            let s_sum_b_mm = a_sum_b_mm.join(' + ')
            let s_sum_bun_mm = a_sum_bun_mm.join(' + ')
            let s_sum_bill = a_sum_bill.join(' + ')
            let s_sum_indirect = a_sum_indirect.join(' + ')
            let s_sum_total = a_sum_total.join(' + ')
            const rsp_column = ['year', org_child_level,
                'case when sum(total_year_amt) <> 0 then (sum(bill_year_amt) + sum(indirect_cost_year)) / sum(total_year_amt) else 0 end as cost_total_value',
                `case when sum(total_year_emp) <> 0 then sum(b_mm_amt_sum) / sum(total_year_emp) else 0 end as mm_total_value`,
                `case when ${s_sum_bun_mm} <> 0 then (${s_sum_b_mm})/(${s_sum_bun_mm}) else 0 end as mm_month_sum_value`,
                `case when ${s_sum_total} <> 0 then (${s_sum_bill} + ${s_sum_indirect})/(${s_sum_total}) else 0 end as cost_month_sum_value`,
                `case when (sum(bill_year_amt) + sum(indirect_cost_year) + sum(opp_year_amt) + sum(b_mm_amt_sum) + ${s_sum_b_mm} + ${s_sum_bill} + ${s_sum_indirect}) <> 0 then true else false end as data_flag`
            ];
            const rsp_where = { 'year': { in: [year, last_year] }, [org_level]: orgInfo.org_ccorg_cd, is_delivery: true };
            const rsp_groupBy = ['year', org_child_level];

            // rsp wideview (m, opp, total)
            const rsp_sum_column = ['year',
                'case when sum(total_year_amt) <> 0 then (sum(bill_year_amt) + sum(indirect_cost_year)) / sum(total_year_amt) else 0 end as cost_total_value',
                `case when sum(bun_mm_amt_sum) <> 0 then sum(b_mm_amt_sum) / sum(bun_mm_amt_sum) else 0 end as mm_total_value`,
                `case when ${s_sum_bun_mm} <> 0 then (${s_sum_b_mm})/(${s_sum_bun_mm}) else 0 end as mm_month_sum_value`,
                `case when ${s_sum_total} <> 0 then (${s_sum_bill} + ${s_sum_indirect})/(${s_sum_total}) else 0 end as cost_month_sum_value`
            ];
            const rsp_sum_where = { 'year': { in: [year, last_year] }, [org_level]: orgInfo.org_ccorg_cd, is_delivery: true };
            const rsp_sum_groupBy = ['year'];

            // 선택한 조직에 따른 조직 호출 (부문보다 높을 시 부문 단위, 부문일 때 본부 단위, 본부일 때 팀 단위)
            let org_where = { [org_level]: orgInfo.org_ccorg_cd };
            if (org_level.includes("lv")) {    // 부문보다 높은 조직은 부문 목록 반환
                org_where["org_level"] = "div";
            } else if (org_level.includes("div")) {    // 부문은 부문 하위의 본부 목록 반환
                org_where["org_level"] = "hdqt";
            } else if (org_level.includes("hdqt")) {   // 본부는 본부 하위의 팀 목록 반환
                org_where["org_level"] = "team";
            } else if (org_level.includes("team")) {   // 팀
                org_where["org_level"] = "team";
            }

            // DB 쿼리 실행 (병렬)
            let [rsp_data, rsp_sum_data, org_full_level_data, target_data] = await Promise.all([
                SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
                SELECT.from(rsp_view).columns(rsp_sum_column).where(rsp_sum_where).groupBy(...rsp_sum_groupBy),
                SELECT.from(org_full_level),
                get_org_target(year, ['A05', 'A07'])
            ]);

            // return rsp_sum_data
            let b_data = false
            rsp_data.forEach(data => {
                if(data.data_flag){
                    b_data = data.data_flag
                }
            })
            if(!b_data){
                return []
            }
 
            // if(!rsp_data.length && !rsp_sum_data.length){
            //     //return req.res.status(204).send();
            //     return []
            // }

            let org_query_data = [];
            org_full_level_data.forEach(data=>{
                if(data[org_level] === orgInfo.org_ccorg_cd && data['org_level'] !== 'team' && data.org_tp === 'delivery'){
                    org_query_data.push(data)
                };
            })

            //ackerton 로직
            let ackerton_list = [];
            let ackerton_org;
            if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                let ac_map = []
                ackerton_org = org_full_level_data.find(data=>data.org_ccorg_cd === '610000');
                org_full_level_data.forEach(data=>{
                    if (!ackerton_list.find(data2 => data2[org_child_level] === data[org_child_level]) && data[org_child_level] && data['lv3_ccorg_cd'] === '610000') {
                        ackerton_list.push(data);
                        ac_map.push(data[org_child_level])
                    };
                });
        
                let rsp_ack_where = { ...rsp_where, 'lv3_ccorg_cd' : '610000' };

                let ackerton_data = await SELECT.from(rsp_view).columns(rsp_column).where(rsp_ack_where).groupBy(...rsp_groupBy);

                // 올해 BR(MM), BR(Cost) 목표값
                const target = target_data.find(oData => oData["org_ccorg_cd"] === '610000');
                const target_br_mm = target?.target_br_mm || 0;
                const target_br_cost = target?.target_br_cost || 0;

                let ackerton_mm_sum_data = {
                    type: "BR(MM)",
                    org_id: ackerton_org.org_id,
                    org_name: ackerton_org.org_name,
                    display_order: ackerton_org.org_order,
                    item_order: 98,
                    target_curr_y_value: target_br_mm / 100,
                    actual_curr_ym_value: 0,
                    actual_curr_ym_rate: 0,
                    actual_last_ym_value: 0,
                    actual_last_ym_rate: 0,
                    actual_curr_ym_value_gap: 0,
                    actual_curr_ym_rate_gap: 0
                };

                let ackerton_cost_sum_data = {
                    type: "BR(Cost)",
                    org_id: ackerton_org.org_id,
                    org_name: ackerton_org.org_name,
                    display_order: ackerton_org.org_order,
                    item_order: 99,
                    target_curr_y_value: target_br_cost/100,
                    actual_curr_ym_value: 0,
                    actual_curr_ym_rate: 0,
                    actual_last_ym_value: 0,
                    actual_last_ym_rate: 0,
                    actual_curr_ym_value_gap: 0,
                    actual_curr_ym_rate_gap: 0
                };

                ackerton_data.forEach(data=>{
                    if(data.year === year){
                        ackerton_mm_sum_data.actual_curr_ym_value += data?.mm_month_sum_value ?? 0;
                        ackerton_cost_sum_data.actual_curr_ym_value += data?.cost_month_sum_value ?? 0;
                    }else if(data.year === last_year){
                        ackerton_mm_sum_data.actual_last_ym_value += data?.mm_month_sum_value ?? 0;
                        ackerton_mm_sum_data.mm_total_value += data?.mm_total_value ?? 0;
                        ackerton_cost_sum_data.actual_last_ym_value += data?.cost_month_sum_value ?? 0;
                        ackerton_cost_sum_data.cost_total_value += data?.cost_total_value ?? 0;
                    }
                })
                ackerton_mm_sum_data.actual_curr_ym_value_gap = ackerton_mm_sum_data.actual_curr_ym_value - ackerton_mm_sum_data.actual_last_ym_value;
                ackerton_mm_sum_data.actual_curr_ym_rate = target_br_mm ? (ackerton_mm_sum_data.actual_curr_ym_value / (target_br_mm / 100)) : 0;
                ackerton_mm_sum_data.actual_last_ym_rate = (ackerton_mm_sum_data?.mm_total_value ?? 0) === 0 ? 0 : (ackerton_mm_sum_data?.actual_last_ym_value ?? 0) / ackerton_mm_sum_data.mm_total_value;
                ackerton_mm_sum_data.actual_curr_ym_rate_gap = (target_br_mm ? ((ackerton_mm_sum_data.actual_last_ym_value ?? 0) / (target_br_mm / 100)) : 0) - ((ackerton_mm_sum_data.mm_total_value ?? 0) === 0 ? 0 : (ackerton_mm_sum_data.actual_last_ym_value ?? 0) / ackerton_mm_sum_data.mm_total_value);

                ackerton_cost_sum_data.actual_curr_ym_value_gap = ackerton_cost_sum_data.actual_curr_ym_value - ackerton_cost_sum_data.actual_last_ym_value;
                ackerton_cost_sum_data.actual_curr_ym_rate = target_br_cost ? (ackerton_cost_sum_data.actual_curr_ym_value / target_br_cost/100) : 0,
                ackerton_cost_sum_data.actual_curr_ym_rate_gap = (target_br_cost ? ((ackerton_cost_sum_data.actual_curr_ym_value ?? 0) / target_br_cost/100) : 0) - ((ackerton_cost_sum_data.cost_total_value ?? 0) === 0 ? 0 : (ackerton_cost_sum_data.actual_last_ym_value ?? 0) / ackerton_cost_sum_data.cost_total_value)
                
                rsp_data = rsp_data.filter(item=>!ac_map.includes(item[org_child_level]))
                rsp_data.push(ackerton_mm_sum_data);
                rsp_data.push(ackerton_cost_sum_data);
            };

            //조직 리스트
            let org_list = [];
            org_query_data.forEach(data => {
                if (!org_list.find(data2 => data2[org_child_level] === data[org_child_level]) && data[org_child_level] && org_where["org_level"] === data.org_level) {
                    if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                        if(!ackerton_list.find(data3 => data3[org_child_level] === data[org_child_level]) && data.org_tp !== 'account'){
                            org_list.push(data);
                        };
                    }else if(orgInfo.org_level === 'lv3'){
                        if(data.org_tp !== 'account'){
                            org_list.push(data);
                        }
                    }else{
                        org_list.push(data);
                    }
                };
            });

            if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                org_list.push(ackerton_org);
            };

            let curr_rsp = rsp_data.filter(rsp => rsp.year === year),
                last_rsp = rsp_data.filter(rsp => rsp.year === last_year)

            // 선택한 조직의 하위 조직들을 기반으로 반복문 실행
            org_list.forEach(org_data => {
                const curr_rsp_data = curr_rsp.find(oData => org_data[org_child_level] === oData[org_child_level]);
                const last_rsp_data = last_rsp.find(oData => org_data[org_child_level] === oData[org_child_level]);

                // 올해 BR(MM), BR(Cost) 목표값
                const target = target_data.find(oData => org_data["org_ccorg_cd"] === oData["org_ccorg_cd"]);
                const target_br_mm = target?.target_br_mm ?? 0;
                const target_br_cost = target?.target_br_cost ?? 0;

                // BR(MM)
                let oMM = {
                    type: "BR(MM)",
                    org_id: org_data.org_id,
                    org_name: org_data.org_name,
                    display_order: org_data.org_order,
                    item_order: 1,
                    target_curr_y_value: target_br_mm / 100,
                    
                    actual_curr_ym_value: curr_rsp_data?.mm_month_sum_value ?? 0,    // 당월 실적 : (확보 + 미확보) / 총 MM
                    actual_last_ym_value: last_rsp_data?.mm_month_sum_value ?? 0,  // 전년 동기 : (확보 + 미확보) / 총 MM

                    actual_curr_ym_value_gap: (curr_rsp_data?.mm_month_sum_value ?? 0) - (last_rsp_data?.mm_month_sum_value ?? 0)
                }
                // 진척도 (올해: 당월 누계 / 목표, 작년: 작년 당월 누계 / 작년 총합)
                oMM["actual_curr_ym_rate"] = target_br_mm ? ((curr_rsp_data?.mm_month_sum_value ?? 0) / (target_br_mm / 100)) : 0;
                oMM["actual_last_ym_rate"] = (last_rsp_data?.mm_total_value ?? 0) === 0 ? 0 : (last_rsp_data?.mm_month_sum_value ?? 0) / last_rsp_data.mm_total_value;
                oMM["actual_curr_ym_rate_gap"] = (target_br_mm ? ((curr_rsp_data?.mm_month_sum_value ?? 0) / (target_br_mm / 100)) : 0) - ((last_rsp_data?.mm_total_value ?? 0) === 0 ? 0 : (last_rsp_data?.mm_month_sum_value ?? 0) / last_rsp_data.mm_total_value);
                result_data.push(oMM);

                // BR(Cost)
                let oCost = {
                    type: "BR(Cost)",
                    org_id: org_data.org_id,
                    org_name: org_data.org_name,
                    display_order: org_data.org_order,
                    item_order: 2,
                    target_curr_y_value: target_br_cost/100,

                    actual_curr_ym_value: curr_rsp_data?.cost_month_sum_value ?? 0,
                    actual_curr_ym_rate: target_br_cost ? ((curr_rsp_data?.cost_month_sum_value ?? 0) / target_br_cost/100) : 0,

                    actual_last_ym_value: last_rsp_data?.cost_month_sum_value ?? 0,
                    actual_last_ym_rate: (last_rsp_data?.cost_total_value ?? 0) === 0 ? 0 : (last_rsp_data?.cost_month_sum_value ?? 0) / last_rsp_data.cost_total_value,
                    
                    actual_curr_ym_value_gap: (curr_rsp_data?.cost_month_sum_value ?? 0) - (last_rsp_data?.cost_month_sum_value ?? 0),
                    actual_curr_ym_rate_gap: (target_br_cost ? ((curr_rsp_data?.cost_month_sum_value ?? 0) / target_br_cost/100) : 0) - ((last_rsp_data?.cost_total_value ?? 0) === 0 ? 0 : (last_rsp_data?.cost_month_sum_value ?? 0) / last_rsp_data.cost_total_value)
                }
                result_data.push(oCost);
            });

            // 합계 로직
            const curr_rsp_data = rsp_sum_data.find(oData => oData.year === year);
            const last_rsp_data = rsp_sum_data.find(oData => oData.year === last_year);

            // 올해 BR(MM), BR(Cost) 목표값 (조직 파라미터 기준)
            const curr_target = target_data.find(oData => orgInfo["org_ccorg_cd"] === oData["org_ccorg_cd"]);
            const curr_target_br_mm = curr_target?.target_br_mm ?? 0;
            const curr_target_br_cost = curr_target?.target_br_cost ?? 0;

            let o_total_mm = {
                type: "BR(MM)",
                org_id: 'total',
                org_name: org_level.includes("hdqt") || org_level.includes("team") ? org_name : '합계',
                display_order: 1,
                item_order: 1,
                target_curr_y_value: curr_target_br_mm/100,
                actual_curr_ym_value: curr_rsp_data?.mm_month_sum_value ?? 0,    // 당월 실적 : (확보 + 미확보) / 총 MM
                actual_last_ym_value: last_rsp_data?.mm_month_sum_value ?? 0,  // 전년 동기 : (확보 + 미확보) / 총 MM
                actual_curr_ym_value_gap: (curr_rsp_data?.mm_month_sum_value ?? 0) - (last_rsp_data?.mm_month_sum_value ?? 0)
            }
            // 진척도 (올해: 당월 누계 / 목표, 작년: 작년 당월 누계 / 작년 총합)
            o_total_mm["actual_curr_ym_rate"] = curr_target_br_mm ? ((last_rsp_data?.mm_month_sum_value ?? 0) / (curr_target_br_mm / 100)) : 0;
            o_total_mm["actual_last_ym_rate"] = (last_rsp_data?.mm_total_value ?? 0) === 0 ? 0 : (last_rsp_data?.mm_month_sum_value ?? 0) / last_rsp_data.mm_total_value;
            o_total_mm["actual_curr_ym_rate_gap"] = (curr_target_br_mm ? ((last_rsp_data?.mm_month_sum_value ?? 0) / (curr_target_br_mm / 100)) : 0) - ((last_rsp_data?.mm_total_value ?? 0) === 0 ? 0 : (last_rsp_data?.mm_month_sum_value ?? 0) / last_rsp_data.mm_total_value);

            let o_total_cost = {
                type: "BR(Cost)",
                org_id: 'total',
                org_name: org_level.includes("hdqt") || org_level.includes("team") ? org_name : '합계',
                display_order: 1,
                item_order: 2,
                target_curr_y_value: curr_target_br_cost/100,

                actual_curr_ym_value: curr_rsp_data?.cost_month_sum_value ?? 0,
                actual_curr_ym_rate: curr_target_br_cost ? ((curr_rsp_data?.cost_month_sum_value ?? 0) / curr_target_br_cost/100) : 0,

                actual_last_ym_value: last_rsp_data?.cost_month_sum_value ?? 0,
                actual_last_ym_rate: (last_rsp_data?.cost_total_value ?? 0) === 0 ? 0 : (last_rsp_data?.cost_month_sum_value ?? 0) / last_rsp_data.cost_total_value,
                
                actual_curr_ym_value_gap: (curr_rsp_data?.cost_month_sum_value ?? 0) - (last_rsp_data?.cost_month_sum_value ?? 0),
                actual_curr_ym_rate_gap: (curr_target_br_cost ? ((curr_rsp_data?.cost_month_sum_value ?? 0) / curr_target_br_cost/100) : 0) - ((last_rsp_data?.cost_total_value ?? 0) === 0 ? 0 : (last_rsp_data?.cost_month_sum_value ?? 0) / last_rsp_data.cost_total_value)
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
            if (!org_level.includes("hdqt") && !org_level.includes("team")) {
                oResult.push(...result_data)
            }

            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true}
        } 
    });
}