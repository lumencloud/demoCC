const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_forecast_br', async (req) => {
        try{
            /**
             * 핸들러 초기에 권한체크
             */
            await check_user_auth(req);

            /**
             * API 리턴값 담을 배열 선언
             */
            const a_result = [];

            // cds 모듈을 통한 DB 커넥트
            const db = await cds.connect.to('db');

            // =========================== 조회 대상 DB 테이블 ===========================
            // entities('<cds namespace 명>').<cds entity 명>
            // srv .cds 에 using from 구문에 엔티티가 속한 db .cds 파일이 최소 한 번이라도 걸려있어야 db.entities 로 엔티티 인식가능
            // (서비스에 등록할 필요는 없음)
            /**
             * rsp.wideview_view [비용 집계]
             * [부문/본부/팀 + 년,month_amt,금액] 프로젝트 비용 집계 뷰
             */
            const rsp_view = db.entities('rsp').wideview_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level_view = db.entities('common').org_full_level_view;
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id } = req.data;

            // QUERY 공통 파라미터 선언

            /**
             * +++++ TBD +++++
             * 권한 체크하여 사용자가 조회 가능한 조직인지 판별 후 코드 진행
             */

            /**
             * org_id 파라미터값으로 조직정보 조회
             * 
             */
            const org_col = `case
                when lv1_id = '${org_id}' THEN 'lv1_ccorg_cd'
                when lv2_id = '${org_id}' THEN 'lv2_ccorg_cd'
                when lv3_id = '${org_id}' THEN 'lv3_ccorg_cd'
                when div_id = '${org_id}' THEN 'div_ccorg_cd'
                when hdqt_id = '${org_id}' THEN 'hdqt_ccorg_cd'
                when team_id = '${org_id}' THEN 'team_ccorg_cd'
                end as org_level`;
            const orgInfo = await SELECT.one.from(org_full_level_view).columns([org_col, 'org_ccorg_cd'])
                .where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            // rsp 조회용 정보
            const rsp_column = ['org_order', 'ccorg_cd', 'div_id', 'div_ccorg_cd', 'hdqt_id', 'hdqt_ccorg_cd', 'team_id', 'team_ccorg_cd', 'div_name', 'hdqt_name', 'team_name',
                'sum(bun_mm_amt_sum) as total_year_emp',
                'sum(b_mm_amt_sum) as b_mm_amt_sum',
                'sum(opp_year_amt) as opp_year_amt',
                'sum(avg_year_amt) as avg_year_amt',
                'sum(est_total_year_emp) as est_total_year_emp',
                'sum(est_avg_year_amt) as est_avg_year_amt'
            ];
            const rsp_where = { 'year': year, 'is_delivery': true, [orgInfo.org_level]: orgInfo.org_ccorg_cd };
            const rsp_groupBy = ['org_order', 'ccorg_cd', 'div_id', 'div_ccorg_cd', 'hdqt_id', 'hdqt_ccorg_cd', 'team_id', 'team_ccorg_cd', 'div_name', 'hdqt_name', 'team_name'];
            const rsp_orderBy = { org_order: true };

            // DB 쿼리 실행 (병렬)
            const [rsp_data, target_data] = await Promise.all([
                // PL 실적, 목표 조회
                SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy).orderBy(rsp_orderBy),
                get_org_target(year,['A05'])
            ]);
            if(!rsp_data.length){
                //return req.res.status(204).send();
                return []
            }

            rsp_data.forEach(o_rsp_data => {
                let a_filtered_rsp_data = [];
                let org_flag;

                // 조직별로 데이터 필터링
                if (!o_rsp_data["div_id"]) {    // 기타일 때
                    return;
                } else if (o_rsp_data["team_id"]) { // 팀일 때
                    a_filtered_rsp_data = rsp_data.filter(oData => oData.team_id === o_rsp_data.team_id);
                    org_flag = "team";
                } else if (o_rsp_data["hdqt_id"]) { // 본부일 때
                    a_filtered_rsp_data = rsp_data.filter(oData => oData.hdqt_id === o_rsp_data.hdqt_id);
                    org_flag = "hdqt";
                } else if (o_rsp_data["div_id"]) {  // 부문일 때
                    a_filtered_rsp_data = rsp_data.filter(oData => oData.div_id === o_rsp_data.div_id);
                    org_flag = "div";
                }

                // 합계
                let sum_opp = a_filtered_rsp_data.reduce((iSum, oData) => iSum += oData.opp_year_amt, 0) || 0;
                let sum_avg = a_filtered_rsp_data.reduce((iSum, oData) => iSum += oData.avg_year_amt, 0) || 0;
                let sum_mm = a_filtered_rsp_data.reduce((iSum, oData) => iSum += oData.total_year_emp, 0) || 0;
                let sum_est_total_emp = a_filtered_rsp_data.reduce((iSum, oData) => iSum += oData.est_total_year_emp, 0) || 0;
                let sum_est_avg = a_filtered_rsp_data.reduce((iSum, oData) => iSum += oData.est_avg_year_amt, 0) || 0;
                let sum_secured = a_filtered_rsp_data.reduce((iSum, oData) => iSum += oData.b_mm_amt_sum, 0) || 0;
                let i_target = target_data.find(oData => oData.org_ccorg_cd === o_rsp_data.ccorg_cd)?.target_br_mm || 0;

                let secured_value = sum_secured;
                let not_secured_value = sum_avg ? (sum_opp / sum_est_avg) : 0;
                let total_value = sum_mm;

                let o_final = {
                    ccorg_cd: o_rsp_data.ccorg_cd,
                    div_id: o_rsp_data.div_id,
                    div_name: (org_flag === "div") ? `소계 : ${o_rsp_data.div_name}` : o_rsp_data.div_name,
                    hdqt_id: o_rsp_data.hdqt_id,
                    hdqt_name: (org_flag === "div") ? `소계 : ${o_rsp_data.div_name}` : (org_flag === "hdqt") ? `소계 : ${o_rsp_data.hdqt_name}` : o_rsp_data.hdqt_name,
                    team_id: o_rsp_data.team_id,
                    team_name: (org_flag === "div") ? `소계 : ${o_rsp_data.div_name}` : (org_flag === "hdqt") ? `소계 : ${o_rsp_data.hdqt_name}` : o_rsp_data.team_name,
                    forecast_value: total_value ? (secured_value + not_secured_value) / total_value : 0,
                    secured_value: total_value ? (secured_value / total_value) : 0,
                    not_secured_value: total_value ? (not_secured_value / sum_est_total_emp) : 0,
                    target: i_target,
                }

                a_result.push(o_final);
            });



            return a_result;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}