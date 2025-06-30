const { odata } = require("@sap/cds");
const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_br_org_detail', async (req) => {
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
        const version = db.entities('common').version;

        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;

        /**
         * common.annual_target_temp_view [연 목표 정보]
         * 목표 테이블
         */
        const target_view = db.entities('common').org_target_sum_view;

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

        const version_column = ['year', 'month'];
        const version_where = { 'tag': 'C' };

        const [orgInfo, versionInfo] = await Promise.all([
            SELECT.one.from(org_full_level).columns([org_col, org_child_col, 'org_ccorg_cd', 'org_name']).where({ 'org_id': org_id }),
            SELECT.one.from(version).columns(version_column).where(version_where),
        ]);

        // 제일 최신 버전의 월
        // const month = versionInfo.month;

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        //조직 정보를 where 조건에 추가
        let org_level = orgInfo.org_level;
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
            a_sum_b_mm.push(`sum(ifnull(b_mm_m${i}_amt, 0))`)
            a_sum_bun_mm.push(`sum(ifnull(bun_mm_m${i}_amt, 0))`)
            a_sum_bill.push(`sum(ifnull(bill_m${i}_amt, 0))`)
            a_sum_indirect.push(`sum(ifnull(indirect_cost_m${i}, 0))`)
            a_sum_total.push(`sum(ifnull(total_m${i}_amt, 0))`)
        }
        let s_sum_b_mm = a_sum_b_mm.join(' + ')
        let s_sum_bun_mm = a_sum_bun_mm.join(' + ')
        let s_sum_bill = a_sum_bill.join(' + ')
        let s_sum_indirect = a_sum_indirect.join(' + ')
        let s_sum_total = a_sum_total.join(' + ')
        const rsp_column = ['year', org_child_level,
            `case when sum(ifnull(total_m${Number(month)}_amt, 0)) <> 0 then (sum(ifnull(bill_m${Number(month)}_amt, 0)) + sum(ifnull(indirect_cost_m${Number(month)}, 0))) / sum(ifnull(total_m${Number(month)}_amt, 0)) else 0 end as cost_value`,
            `case when sum(ifnull(bun_mm_m${Number(month)}_amt, 0)) <> 0 then sum(ifnull(b_mm_m${Number(month)}_amt, 0)) / sum(ifnull(bun_mm_m${Number(month)}_amt, 0)) else 0 end as mm_value`,
            'case when sum(ifnull(total_amt_sum, 0)) <> 0 then (sum(ifnull(bill_amt_sum, 0)) + sum(ifnull(indirect_cost_amt_sum, 0))) / sum(ifnull(total_amt_sum, 0)) else 0 end as cost_total_value',
            `case when sum(ifnull(bun_mm_amt_sum, 0)) <> 0 then sum(ifnull(b_mm_amt_sum, 0)) / sum(ifnull(bun_mm_amt_sum, 0)) else 0 end as mm_total_value`,
            `case when ${s_sum_bun_mm} <> 0 then (${s_sum_b_mm})/(${s_sum_bun_mm}) else 0 end as mm_month_sum_value`,
            `case when ${s_sum_total} <> 0 then (${s_sum_bill} + ${s_sum_indirect})/(${s_sum_total}) else 0 end as cost_month_sum_value`
        ];
        const rsp_where = { 'year': { in: [year, last_year] }, [org_level]: orgInfo.org_ccorg_cd, is_delivery: true };
        const rsp_groupBy = ['year', org_child_level];

        // rsp wideview (m, opp, total)
        const rsp_sum_column = ['year',
            `case when sum(ifnull(total_m${Number(month)}_amt, 0)) <> 0 then (sum(ifnull(bill_m${Number(month)}_amt, 0)) + sum(ifnull(indirect_cost_m${Number(month)}, 0))) / sum(ifnull(total_m${Number(month)}_amt, 0)) else 0 end as cost_value`,
            `case when sum(ifnull(bun_mm_m${Number(month)}_amt, 0)) <> 0 then sum(ifnull(b_mm_m${Number(month)}_amt, 0)) / sum(ifnull(bun_mm_m${Number(month)}_amt, 0)) else 0 end as mm_value`,
            'case when sum(ifnull(total_amt_sum, 0)) <> 0 then (sum(ifnull(bill_amt_sum, 0)) + sum(ifnull(indirect_cost_amt_sum, 0))) / sum(ifnull(total_amt_sum, 0)) else 0 end as cost_total_value',
            `case when sum(ifnull(bun_mm_amt_sum, 0)) <> 0 then sum(ifnull(b_mm_amt_sum, 0)) / sum(ifnull(bun_mm_amt_sum, 0)) else 0 end as mm_total_value`,
            `case when ${s_sum_bun_mm} <> 0 then (${s_sum_b_mm})/(${s_sum_bun_mm}) else 0 end as mm_month_sum_value`,
            `case when ${s_sum_total} <> 0 then (${s_sum_bill} + ${s_sum_indirect})/(${s_sum_total}) else 0 end as cost_month_sum_value`
        ];
        const rsp_sum_where = { 'year': { in: [year, last_year] }, [org_level]: orgInfo.org_ccorg_cd, is_delivery: true };
        const rsp_sum_groupBy = ['year'];

        // 선택한 조직에 따른 조직 호출 (부문보다 높을 시 부문 단위, 부문일 때 본부 단위, 본부일 때 팀 단위)
        let org_where = { [org_level]: orgInfo.org_ccorg_cd };
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
        const [rsp_data, rsp_sum_data, org_full_level_data, target_data] = await Promise.all([
            SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
            SELECT.from(rsp_view).columns(rsp_sum_column).where(rsp_sum_where).groupBy(...rsp_sum_groupBy),
            SELECT.from(org_full_level).where(org_where),
            SELECT.from(target_view).columns(target_column).where(target_where),
        ]);
        let curr_rsp = rsp_data.filter(rsp => rsp.year === year),
            last_rsp = rsp_data.filter(rsp => rsp.year === last_year)
        // 선택한 조직의 하위 조직들을 기반으로 반복문 실행
        org_full_level_data.forEach(org_data => {
            const curr_rsp_data = curr_rsp.find(oData => org_data[org_child_level] === oData[org_child_level]);
            const last_rsp_data = last_rsp.find(oData => org_data[org_child_level] === oData[org_child_level]);

            // 올해 BR(MM), BR(Cost) 목표값
            const target = target_data.find(oData => org_data["org_ccorg_cd"] === oData["org_ccorg_cd"]);
            const target_br_mm_amt = Number(target?.target_br_mm_amt || 0);
            const target_br_cost_amt = Number(target?.target_br_cost_amt || 0);

            // BR(MM)
            let oMM = {
                type: "BR(MM)",
                org_id: org_data.org_id,
                org_name: org_data.org_name,
                display_order: org_data.org_order,
                item_order: 1,
                target_curr_y_value: target_br_mm_amt / 100,
                actual_curr_ym_value: curr_rsp_data?.mm_value ?? 0,    // 당월 실적 : (확보 + 미확보) / 총 MM
                actual_last_ym_value: last_rsp_data?.mm_value ?? 0,  // 전년 동기 : (확보 + 미확보) / 총 MM
            }
            // 진척도 (올해: 당월 누계 / 목표, 작년: 작년 당월 누계 / 작년 총합)
            oMM["actual_curr_ym_rate"] = target_br_mm_amt ? ((last_rsp_data?.mm_month_sum_value ?? 0) / (target_br_mm_amt / 100)) : 0;
            oMM["actual_last_ym_rate"] = (last_rsp_data?.mm_total_value ?? 0) === 0 ? 0 : (last_rsp_data?.mm_month_sum_value ?? 0) / last_rsp_data.mm_total_value;
            // oMM["actual_last_ym_rate"] = actual_last_ym_value_full ? (oMM["actual_last_ym_value_sum"] / actual_last_ym_value_full) : 0;
            result_data.push(oMM);

            // BR(Cost)
            let oCost = {
                type: "BR(Cost)",
                org_id: org_data.org_id,
                org_name: org_data.org_name,
                display_order: org_data.org_order,
                item_order: 2,
                target_curr_y_value: target_br_cost_amt/100,

                actual_curr_ym_value: curr_rsp_data?.cost_value ?? 0,
                actual_curr_ym_rate: target_br_cost_amt ? ((curr_rsp_data?.cost_month_sum_value ?? 0) / target_br_cost_amt/100) : 0,

                actual_last_ym_value: last_rsp_data?.cost_value ?? 0,
                actual_last_ym_rate: (last_rsp_data?.cost_total_value ?? 0) === 0 ? 0 : (last_rsp_data?.cost_month_sum_value ?? 0) / last_rsp_data.cost_total_value
                // actual_last_ym_rate: last_rsp_data?.plan_value_year_sum ? (last_rsp_data?.cost_value / last_rsp_data?.plan_value_year_sum) : 0,
            }
            result_data.push(oCost);
        });
        
        // 합계 로직
        const curr_rsp_data = rsp_sum_data.find(oData => oData.year === year);
        const last_rsp_data = rsp_sum_data.find(oData => oData.year === last_year);

        // 올해 BR(MM), BR(Cost) 목표값 (조직 파라미터 기준)
        const curr_target = target_data.find(oData => orgInfo["org_ccorg_cd"] === oData["org_ccorg_cd"]);
        const curr_target_br_mm_amt = Number(curr_target?.target_br_mm_amt || 0);
        const curr_target_br_cost_amt = Number(curr_target?.target_br_cost_amt || 0);

        let o_total_mm = {
            type: "BR(MM)",
            org_id: 'total',
            org_name: org_level.includes("hdqt") || org_level.includes("team") ? org_name : '합계',
            display_order: 1,
            item_order: 1,
            target_curr_y_value: curr_target_br_mm_amt/100,
            actual_curr_ym_value: curr_rsp_data.mm_value,    // 당월 실적 : (확보 + 미확보) / 총 MM
            actual_last_ym_value: last_rsp_data.mm_value,  // 전년 동기 : (확보 + 미확보) / 총 MM
        }
        // 진척도 (올해: 당월 누계 / 목표, 작년: 작년 당월 누계 / 작년 총합)
        o_total_mm["actual_curr_ym_rate"] = curr_target_br_mm_amt ? ((last_rsp_data?.mm_month_sum_value ?? 0) / (curr_target_br_mm_amt / 100)) : 0;
        o_total_mm["actual_last_ym_rate"] = (last_rsp_data?.mm_total_value ?? 0) === 0 ? 0 : (last_rsp_data?.mm_month_sum_value ?? 0) / last_rsp_data.mm_total_value;

        let o_total_cost = {
            type: "BR(Cost)",
            org_id: 'total',
            org_name: org_level.includes("hdqt") || org_level.includes("team") ? org_name : '합계',
            display_order: 1,
            item_order: 2,
            target_curr_y_value: curr_target_br_cost_amt/100,

            actual_curr_ym_value: curr_rsp_data?.cost_value ?? 0,
            actual_curr_ym_rate: curr_target_br_cost_amt ? ((curr_rsp_data?.cost_month_sum_value ?? 0) / curr_target_br_cost_amt/100) : 0,

            actual_last_ym_value: last_rsp_data?.cost_value ?? 0,
            actual_last_ym_rate: (last_rsp_data?.cost_total_value ?? 0) === 0 ? 0 : (last_rsp_data?.cost_month_sum_value ?? 0) / last_rsp_data.cost_total_value
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
    });
}