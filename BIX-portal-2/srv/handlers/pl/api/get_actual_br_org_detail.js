const { odata } = require("@sap/cds");

module.exports = (srv) => {
    srv.on('get_actual_br_org_detail', async (req) => {

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
        const rsp_wideview_unpivot_view = db.entities('rsp').wideview_unpivot_view;
        const rsp_org_mm_view = db.entities('rsp').org_mm_view;

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
        const annual_target_temp_view = db.entities('common').annual_target_temp_view;

        // function 입력 파라미터
        const { year, org_id } = req.data;
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
            SELECT.one.from(org_full_level).columns([org_col, org_child_col, 'org_ccorg_cd']).where({ 'org_id': org_id }),
            SELECT.one.from(version).columns(version_column).where(version_where),
        ]);

        // 제일 최신 버전의 월
        const month = versionInfo.month;

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        //조직 정보를 where 조건에 추가
        let org_level = orgInfo.org_level;
        let org_child_level = orgInfo.org_child_level;

        /** 
         * 타겟 뷰 조회용 컬럼
         */
        let a_mm_amt_sum = [];
        for (let i = 1; i <= Number(month); i++) {
            a_mm_amt_sum.push(`mm_m${i}_amt`);
        };
        let s_mm_amt_sum = a_mm_amt_sum.join(' + ');

        const mm_column = ['year', org_level, org_child_level, 'bun_tp', 
                `sum(ifnull(mm_m${Number(month)}_amt, 0)) as mm_m${Number(month)}_amt`  // 당월의 합
                // `sum(ifnull${s_mm_amt_sum}), 0)) as mm_amt_sum` // 1월 ~ 당월의 합
            ];
        const mm_where = { 'year': { in: [year, last_year] }, [org_level]: orgInfo.org_ccorg_cd };
        const mm_groupBy = ['year', org_level, org_child_level, 'bun_tp'];

        // rsp wideview (m, opp, total)
        const wideview_column = ['year', 'month_amt', 'ccorg_cd', org_child_level,
            'sum(ifnull(bill_amt, 0)) as bill_amt_sum',
            'sum(ifnull(indirect_cost_amt, 0)) as indirect_cost_amt_sum',
            'sum(ifnull(opp_amt, 0)) as opp_amt_sum',
            'sum(ifnull(total_amt, 0)) as total_amt_sum',
            'sum(ifnull(avg_amt, 0)) as avg_amt_sum',
        ];
        const wideview_where = { 'year': { in: [year, last_year] }, 'actual_yn': true, [org_level]: orgInfo.org_ccorg_cd };
        const wideview_groupBy = ['year', 'month_amt', 'ccorg_cd', org_child_level];

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
        let target_column_set = new Set([org_level, org_child_level, "div_ccorg_cd", "hdqt_ccorg_cd"]);
        const target_column = [...target_column_set, "br_target", "br_cost_target"];
        const target_where = { 'target_type': 'ccorg_cd', 'year': year };

        // DB 쿼리 실행 (병렬)
        const [org_mm_data, wideview_unpivot_data, org_full_level_data, annual_target_temp_view_data] = await Promise.all([
            SELECT.from(rsp_org_mm_view).columns(mm_column).where(mm_where).groupBy(...mm_groupBy),
            SELECT.from(rsp_wideview_unpivot_view).columns(wideview_column).where(wideview_where).groupBy(...wideview_groupBy),
            SELECT.from(org_full_level).where(org_where),
            SELECT.from(annual_target_temp_view).columns(target_column).where(target_where),
        ]);

        // 선택한 조직의 하위 조직들을 기반으로 반복문 실행
        org_full_level_data.forEach(org_data => {
            // 진척도는 계산하지 않음 (임시)
            let curr_org_mm_total = 0, curr_org_mm_secured = 0, last_org_mm_total = 0, last_org_mm_secured = 0;
            org_mm_data.forEach(oData => {
                // 파라미터로 받은 조직의 하위 조직이 같은 경우
                if (org_data[org_child_level] === oData[org_child_level]) {
                    // 금년 총 MM (bun_tp : b, u, n의 합)
                    if (oData.year === year) {
                        curr_org_mm_total += oData[`mm_m${Number(month)}_amt`];
                    }

                    // 금년 확보 MM (bun_tp : b)
                    if (oData.year === year && oData.bun_tp === "B") {
                        curr_org_mm_secured += oData[`mm_m${Number(month)}_amt`];
                    }

                    // 작년 총 MM (bun_tp : b, u, n의 합)
                    if (oData.year === last_year) {
                        last_org_mm_total += oData[`mm_m${Number(month)}_amt`];
                    }

                    // 작년 확보 MM (bun_tp : b)
                    if (oData.year === last_year && oData.bun_tp === "B") {
                        last_org_mm_secured += oData[`mm_m${Number(month)}_amt`];
                    }
                }
            })

            // 조직과 올해 연도, 월로 필터링
            let curr_wideview_unpivot_data = wideview_unpivot_data.filter(oData => {
                return oData.year === year && oData.month_amt === month && org_data[org_child_level] === oData[org_child_level]
            });
            let curr_total_amt_sum = curr_wideview_unpivot_data.reduce((iSum, oData) => iSum += (oData.total_amt_sum || 0), 0);
            let curr_avg_amt_sum = curr_wideview_unpivot_data.reduce((iSum, oData) => iSum += (oData.avg_amt_sum || 0), 0);
            let curr_opp_amt_sum = curr_wideview_unpivot_data.reduce((iSum, oData) => iSum += (oData.opp_amt_sum || 0), 0);
            let curr_bill_amt_sum = curr_wideview_unpivot_data.reduce((iSum, oData) => iSum += (oData.bill_amt_sum || 0), 0);
            let curr_indirect_cost_amt_sum = curr_wideview_unpivot_data.reduce((iSum, oData) => iSum += (oData.indirect_cost_amt_sum || 0), 0);

            // 조직과 작년, 월로 필터링
            let last_wideview_unpivot_data = wideview_unpivot_data.filter(oData => {
                return oData.year === last_year && oData.month_amt === month && org_data[org_child_level] === oData[org_child_level]
            });
            let last_total_amt_sum = last_wideview_unpivot_data.reduce((iSum, oData) => iSum += (oData.total_amt_sum || 0), 0);
            let last_avg_amt_sum = last_wideview_unpivot_data.reduce((iSum, oData) => iSum += (oData.avg_amt_sum || 0), 0);
            let last_opp_amt_sum = last_wideview_unpivot_data.reduce((iSum, oData) => iSum += (oData.opp_amt_sum || 0), 0);
            let last_bill_amt_sum = last_wideview_unpivot_data.reduce((iSum, oData) => iSum += (oData.bill_amt_sum || 0), 0);
            let last_indirect_cost_amt_sum = last_wideview_unpivot_data.reduce((iSum, oData) => iSum += (oData.indirect_cost_amt_sum || 0), 0);

            // 올해 BR(MM) 목표값
            let curr_target = annual_target_temp_view_data.find(oData => org_data[org_child_level] === oData[org_child_level]);
            let curr_br_target = curr_target?.br_target || 0;
            if (!curr_br_target) {
                // 부문의 target 값이 존재하지 않을 때는 하위 본부의 합으로 목표값 설정
                if (org_child_level.includes("div")) {
                    // 부문이 같고 본부인 데이터를 합산
                    curr_br_target = annual_target_temp_view_data.reduce(function (iSum, oData) {
                        if (org_data.div_ccorg_cd === oData.div_ccorg_cd && oData.hdqt_ccorg_cd) {
                            iSum += (oData.br_target || 0);
                        }
                        return iSum;
                    }, 0) || 0;
                }
            }

            // 올해 BR(Cost) 목표값
            let curr_br_cost_target = curr_target?.br_cost_target || 0;
            if (!curr_br_cost_target) {
                // 부문의 target 값이 존재하지 않을 때는 하위 본부의 합으로 목표값 설정
                if (org_child_level.includes("div")) {
                    curr_br_cost_target = annual_target_temp_view_data.reduce(function (iSum, oData) {
                        // 부문이 같고 본부인 데이터를 합산
                        if (org_data.div_ccorg_cd === oData.div_ccorg_cd && oData.hdqt_ccorg_cd) {
                            iSum += (oData.br_cost_target || 0);
                        }
                        return iSum;
                    }, 0) || 0;
                }
            }

            // BR(MM)
            let oMM = {
                type: "BR(MM)",
                org_id: org_data.org_id,
                org_name: org_data.org_name,
                secured_value: curr_org_mm_secured,  // 금년 확보
                not_secured_value: curr_avg_amt_sum ? (curr_opp_amt_sum / curr_avg_amt_sum) : 0,    // 금년 미확보 (opp / avg)
                last_secured_value: last_org_mm_secured,    // 작년 확보
                last_not_secured_value: last_avg_amt_sum ? (last_opp_amt_sum / last_avg_amt_sum) : 0,    // 작년 미확보 (opp / avg)
                
                target_curr_y_value: curr_br_target,   // 금년 목표
                actual_curr_ym_rate: 0, // 당월 진척도
                actual_last_ym_rate: 0, // 전년 동기 진척도
            }
            oMM["actual_curr_ym_value"] = (!curr_org_mm_total) ? 0 : (oMM.secured_value + oMM.not_secured_value) / curr_org_mm_total;   // 당월 실적 : (확보 + 미확보) / 총 MM
            oMM["actual_last_ym_value"] = (!last_org_mm_total) ? 0 : (oMM.last_secured_value + oMM.last_not_secured_value) / last_org_mm_total;   // 전년 동기 : (확보 + 미확보) / 총 MM            
            result_data.push(oMM);

            // BR(Cost)
            let oCost = {
                type: "BR(Cost)",
                org_id: org_data.org_id,
                org_name: org_data.org_name,
                secured_value: (curr_bill_amt_sum + curr_indirect_cost_amt_sum) / 100000000,  // 금년 확보
                not_secured_value: curr_opp_amt_sum / 100000000, // 금년 미확보
                last_secured_value: (last_bill_amt_sum + last_indirect_cost_amt_sum) / 100000000,  // 작년 확보
                last_not_secured_value: last_opp_amt_sum / 100000000, // 작년 미확보

                target_curr_y_value: curr_br_cost_target,   // 금년 목표
                actual_curr_ym_rate: 0, // 당월 진척도
                actual_last_ym_rate: 0, // 전년 동기 진척도
            }
            oCost["actual_curr_ym_value"] = (!curr_total_amt_sum) ? 0 : (oCost.secured_value + oCost.not_secured_value) / (curr_total_amt_sum / 100000000);
            oCost["actual_last_ym_value"] = (!last_total_amt_sum) ? 0 : (oCost.last_secured_value + oCost.last_not_secured_value) / (last_total_amt_sum / 100000000);
            result_data.push(oCost);
        })

        // org_name, type 순으로 정렬
        let a_sort_field = [
            { field: "org_name", order: "asc" },
            { field: "type", order: "desc" },
        ];
        result_data.sort((oItem1, oItem2) => {
            for (const { field, order } of a_sort_field) {
                // 필드가 null일 때
                if (oItem1[field] === null && oItem2[field] !== null) return -1;
                if (oItem1[field] !== null && oItem2[field] === null) return 1;
                if (oItem1[field] === null && oItem2[field] === null) continue;

                const result = oItem1[field].localeCompare(oItem2[field]);
                if (result !== 0) {
                    return (order === "asc") ? result : -result;
                }
            }
            return 0;
        })


        return result_data;
    });
}