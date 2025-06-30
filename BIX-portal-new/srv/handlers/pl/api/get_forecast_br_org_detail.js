const { odata } = require("@sap/cds");
const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_forecast_br_org_detail', async (req) => {
        /**
         * 핸들러 초기에 권한체크
         */
        // await check_user_auth(req);

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

        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const target = db.entities('common').org_target_sum_view;

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
        const org_child_col = `case
            when lv1_id = '${org_id}' THEN 'div_ccorg_cd'
            when lv2_id = '${org_id}' THEN 'div_ccorg_cd'
            when lv3_id = '${org_id}' THEN 'div_ccorg_cd'
            when div_id = '${org_id}' THEN 'hdqt_ccorg_cd'
            when hdqt_id = '${org_id}' THEN 'team_ccorg_cd'
            when team_id = '${org_id}' THEN 'team_ccorg_cd'
            end as org_child_level`;
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, org_child_col, 'org_ccorg_cd','org_name'])
            .where({ 'org_id': org_id });

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        //조직 정보를 where 조건에 추가
        let org_level = orgInfo.org_level;
        let org_child_level = orgInfo.org_child_level;

        let a_total = [];
        for(let i=1; i<13; i++){
            let s_total = `sum(ifnull(total_m${i}_amt, 0))`
            a_total.push(s_total)
        }
        // rsp wideview (m, opp, total)
        const rsp_column = ['year', org_child_level,
            'case when sum(ifnull(total_amt_sum, 0)) <> 0 then (sum(ifnull(bill_amt_sum, 0)) + sum(ifnull(indirect_cost_amt_sum, 0)) + sum(ifnull(opp_amt_sum, 0))) / sum(ifnull(total_amt_sum, 0)) else 0 end as plan_value',
            'case when sum(ifnull(total_amt_sum, 0)) <> 0 then (sum(ifnull(bill_amt_sum, 0)) + sum(ifnull(indirect_cost_amt_sum, 0))) / sum(ifnull(total_amt_sum, 0)) else 0 end as secured_value',
            'case when sum(ifnull(total_amt_sum, 0)) <> 0 then (sum(ifnull(opp_amt_sum, 0)) / sum(ifnull(total_amt_sum, 0))) else 0 end as not_secured_value',
            'sum(ifnull(b_mm_amt_sum, 0)) as b_mm_amt_sum',
            'sum(ifnull(bun_mm_amt_sum, 0)) as mm_total_sum',
            'sum(ifnull(opp_amt_sum, 0)) as opp_amt_sum',
            'sum(ifnull(avg_amt_sum, 0)) as avg_amt_sum',
        ];
        const rsp_where = { 'year': { in: [year, last_year] }, [org_level]: orgInfo.org_ccorg_cd, is_delivery: true };
        const rsp_groupBy = ['year', org_child_level];

        // rsp wideview (m, opp, total)
        const rsp_sum_column = ['year',
            'case when sum(ifnull(total_amt_sum, 0)) <> 0 then (sum(ifnull(bill_amt_sum, 0)) + sum(ifnull(indirect_cost_amt_sum, 0)) + sum(ifnull(opp_amt_sum, 0))) / sum(ifnull(total_amt_sum, 0)) else 0 end as plan_value',
            'case when sum(ifnull(total_amt_sum, 0)) <> 0 then (sum(ifnull(bill_amt_sum, 0)) + sum(ifnull(indirect_cost_amt_sum, 0))) / sum(ifnull(total_amt_sum, 0)) else 0 end as secured_value',
            'case when sum(ifnull(total_amt_sum, 0)) <> 0 then (sum(ifnull(opp_amt_sum, 0)) / sum(ifnull(total_amt_sum, 0))) else 0 end as not_secured_value',
            'sum(ifnull(b_mm_amt_sum, 0)) as b_mm_amt_sum',
            'sum(ifnull(bun_mm_amt_sum, 0)) as mm_total_sum',
            'sum(ifnull(opp_amt_sum, 0)) as opp_amt_sum',
            'sum(ifnull(avg_amt_sum, 0)) as avg_amt_sum',
        ];
        const rsp_sum_where = { 'year': { in: [year, last_year] }, [org_level]: orgInfo.org_ccorg_cd, is_delivery: true };
        const rsp_sum_groupBy = ['year'];

        // 선택한 조직에 따른 조직 호출 (부문보다 높을 시 부문 단위, 부문일 때 본부 단위, 본부일 때 팀 단위)
        // const org_column = ['org_id', 'org_ccorg_cd', 'org_name'];
        let org_where = { [org_level]: orgInfo.org_ccorg_cd};
        if (org_level.includes("lv")) {    // 부문보다 높은 조직은 부문 목록 반환
            org_where["org_type"] = "1796";
        } else if (org_level.includes("div")) {    // 부문은 부문 하위의 본부 목록 반환
            org_where["org_type"] = "6907";
        } else if (org_level.includes("hdqt")) {   // 본부는 본부 하위의 팀 목록 반환
            org_where["org_type"] = "1414";
        } else if (org_level.includes("team")) {   // 팀
            org_where["org_type"] = "1414";
        }

        // 연 목표 (BR(MM), BR(Cost))
        const target_column = ["target_year", "org_ccorg_cd", "target_br_mm_amt", "target_br_cost_amt"];
        const target_where = { 'target_year': year };

        // DB 쿼리 실행 (병렬)
        const [data, org_full_level_data, target_data, sum_data] = await Promise.all([
            SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
            SELECT.from(org_full_level).where(org_where),
            SELECT.from(target).columns(target_column).where(target_where),
            SELECT.from(rsp_view).columns(rsp_sum_column).where(rsp_sum_where).groupBy(...rsp_sum_groupBy),
        ]);

        // 조직 정보가 없는 조직 추가
        // org_full_level_data.push({[org_child_level]: null, "org_ccorg_cd": null, org_id: null, org_name: "기타", org_order: 99999999});
        
        // 선택한 조직의 하위 조직들을 기반으로 반복문 실행
        org_full_level_data.forEach(org_data => {
            const curr_data = data.find(oData => oData.year === year && org_data[org_child_level] === oData[org_child_level]);
            const last_data = data.find(oData => oData.year === last_year && org_data[org_child_level] === oData[org_child_level]);

            // 올해 BR(MM), BR(Cost) 목표값
            const curr_target = target_data.find(oData => org_data["org_ccorg_cd"] === oData["org_ccorg_cd"]);
            const curr_target_br_mm_amt = curr_target?.target_br_mm_amt || 0;
            const curr_target_br_cost_amt = curr_target?.target_br_cost_amt || 0;

            // BR(MM)
            let oMM = {
                type: "BR(MM)",
                org_id: org_data.org_id,
                org_name: org_data.org_name,
                display_order: org_data.org_order,
                item_order: 1,
                secured_value: curr_data?.b_mm_amt_sum / curr_data?.mm_total_sum,
                not_secured_value: (curr_data?.opp_amt_sum / curr_data?.avg_amt_sum) / curr_data?.mm_total_sum,
                last_secured_value: last_data?.b_mm_amt_sum / last_data?.mm_total_sum,
                last_not_secured_value: (last_data?.opp_amt_sum / last_data?.avg_amt_sum) / last_data?.mm_total_sum,                
            }
            oMM["plan_value"] = oMM.secured_value + oMM.not_secured_value;
            oMM["last_plan_value"] = oMM.last_secured_value + oMM.last_not_secured_value;
            oMM["plan_ratio"] = oMM.plan_value - (curr_target_br_mm_amt / 100);
            oMM["yoy"] = oMM.plan_value - oMM.last_plan_value;
            result_data.push(oMM);

            // BR(Cost)
            let oCost = {
                type: "BR(Cost)",
                org_id: org_data.org_id,
                org_name: org_data.org_name,
                display_order: org_data.org_order,
                item_order: 2,
                plan_value: curr_data?.plan_value,
                secured_value: curr_data?.secured_value,
                not_secured_value: curr_data?.not_secured_value,
                plan_ratio: curr_data?.plan_value - (curr_target_br_cost_amt / 100),
                yoy: curr_data?.plan_value - last_data?.plan_value,
            }
            result_data.push(oCost);
        })


        // 합계 로직
        // 연도별로 필터링
        const curr_data = sum_data.find(oData => oData.year === year);
        const last_data = sum_data.find(oData => oData.year === last_year);

        // 올해 BR(MM), BR(Cost) 목표값
        const curr_target = target_data.find(oData => orgInfo["org_ccorg_cd"] === oData["org_ccorg_cd"]);
        const curr_target_br_mm_amt = curr_target?.target_br_mm_amt || 0;
        const curr_target_br_cost_amt = curr_target?.target_br_cost_amt || 0;

        let o_total_mm = {
            type: "BR(MM)",
            org_id: 'total',
            org_name:  org_level === 'hdqt_ccorg_cd' || org_level === 'team_ccorg_cd' ? orgInfo.org_name : '합계',
            display_order: 1,
            item_order: 1,
            secured_value: curr_data?.b_mm_amt_sum / curr_data?.mm_total_sum,
            not_secured_value: (curr_data?.opp_amt_sum / curr_data?.avg_amt_sum) / curr_data?.mm_total_sum,
            last_secured_value: last_data?.b_mm_amt_sum / last_data?.mm_total_sum,
            last_not_secured_value: (last_data?.opp_amt_sum / last_data?.avg_amt_sum) / last_data?.mm_total_sum,                
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
    });
}