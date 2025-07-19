const { odata } = require("@sap/cds");
const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_m_br_org_detail', async (req) => {
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
            const { year, month, org_id, org_tp } = req.data;

            // QUERY 공통 파라미터 선언
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
            let org_level = orgInfo.org_level+'_ccorg_cd';
            let org_child_level = orgInfo.org_child_level;
            let org_name = orgInfo.org_name;

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

            /** Number(month)
             * 타겟 뷰 조회용 컬럼
             */
            const rsp_column = ['year', org_child_level,
                `case when ifnull(${s_sum_bun_mm}, 0) <> 0 then ifnull(${s_sum_b_mm}, 0)/ifnull(${s_sum_bun_mm}, 0) else 0 end as mm_month_sum_value`,
                `case when ifnull(${s_sum_total}, 0) <> 0 then (ifnull(${s_sum_bill}, 0) + ifnull(${s_sum_indirect},0))/ifnull(${s_sum_total}, 0) else 0 end as cost_month_sum_value`,
                `ifnull(${s_sum_b_mm}, 0) as sum_b_mm`,
                `ifnull(${s_sum_bun_mm}, 0) as sum_bun_mm`,
                `ifnull(${s_sum_bill}, 0) as sum_bill`,
                `ifnull(${s_sum_indirect}, 0) as sum_indirect`,
                `ifnull(${s_sum_total}, 0) as sum_total`
                // `case when ifnull(sum(bun_mm_m${Number(month)}_amt), 0) <> 0 then (ifnull(sum(b_mm_m${Number(month)}_amt), 0))/(ifnull(sum(bun_mm_m${Number(month)}_amt), 0)) else 0 end as mm_month_sum_value`,
                // `case when ifnull(sum(total_m${Number(month)}_amt), 0) <> 0 then (ifnull(sum(bill_m${Number(month)}_amt), 0) + ifnull(sum(indirect_cost_m${Number(month)}), 0))/(ifnull(sum(total_m${Number(month)}_amt), 0)) else 0 end as cost_month_sum_value`,
                // `ifnull(sum(b_mm_m${Number(month)}_amt), 0) as sum_b_mm`,
                // `ifnull(sum(bun_mm_m${Number(month)}_amt), 0) as sum_bun_mm`,
                // `ifnull(sum(bill_m${Number(month)}_amt), 0) as sum_bill`,
                // `ifnull(sum(indirect_cost_m${Number(month)}), 0) as sum_indirect`,
                // `ifnull(sum(total_m${Number(month)}_amt), 0) as sum_total`
            ];
            const rsp_where_condition = { 'year': { in: [year] }, [org_level]: orgInfo.org_ccorg_cd, is_delivery: true };
            let rsp_where = rsp_where_condition
            if(org_tp === 'account'){
                rsp_where ={ ...rsp_where_condition, 'org_tp' : org_tp }
            }
            const rsp_groupBy = ['year', org_child_level];

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
            const [rsp_data, org_full_level_data] = await Promise.all([
                SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
                SELECT.from(org_full_level).where(org_where)
            ]);
            // if(!rsp_data.length){
            //     //return req.res.status(204).send();
            //     return []
            // }

            let curr_rsp = rsp_data.filter(rsp => rsp.year === year)

            //ackerton 로직
            let ackerton_list = [];
            if((orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2') && org_tp !== 'account'){
                org_full_level_data.forEach(data=>{
                    if (!ackerton_list.find(data2 => data2 === data[org_child_level]) && data[org_child_level] && data['lv3_ccorg_cd'] === '610000') {
                        ackerton_list.push(data.org_id);
                    };
                });
            };

            // 선택한 조직의 하위 조직들을 기반으로 반복문 실행
            org_full_level_data.forEach(org_data => {
                const curr_rsp_data = curr_rsp.find(oData => org_data[org_child_level] === oData[org_child_level]);

                let temp_data = {
                    org_id: org_data.org_id,
                    org_name: org_data.org_name,
                    display_order: org_data.org_order,
                    br_mm: (curr_rsp_data?.mm_month_sum_value ?? 0),
                    br_cost: (curr_rsp_data?.cost_month_sum_value ?? 0),
                }

                if(org_level === "lv1_ccorg_cd" || org_level === "lv2_ccorg_cd"){
                    if(org_data.org_tp !== 'account' && !ackerton_list.includes(temp_data.org_id)){
                        result_data.push(temp_data);
                    };
                }else{
                    result_data.push(temp_data);
                };
            });

            if(org_level.includes("div")){
                let total = {
                    org_id: org_id,
                    org_name: org_name,
                    display_order: 0,
                    br_mm: 0,
                    br_cost: 0,
                };
                let sum_b_mm = 0;
                let sum_bun_mm = 0;
                let sum_bill = 0;
                let sum_indirect = 0;
                let sum_total = 0;
                rsp_data.forEach(data=>{
                    sum_b_mm += data.sum_b_mm;
                    sum_bun_mm += data.sum_bun_mm;
                    sum_bill += data.sum_bill;
                    sum_indirect += data.sum_indirect;
                    sum_total += data.sum_total;
                })
                total.br_mm = sum_bun_mm === 0 ? 0 : sum_b_mm / sum_bun_mm;
                total.br_cost = sum_total === 0 ? 0 : (sum_bill + sum_indirect) / sum_total;
                result_data.unshift(total);
            };
            
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
            oResult.push(...result_data)

            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}