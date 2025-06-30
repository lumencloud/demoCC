const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_forecast_br', async (req) => {
        /**
         * 핸들러 초기에 권한체크
         */
        // await check_user_auth(req);

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
         * target [목표]
         * [부문/본부/팀 + 년,금액] 조직 별 연단위 목표금액
         */
        const target = db.entities('common').org_target_sum_view;
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

        /** 
         * 타겟 뷰 조회용 컬럼
         */
        const target_column = ['org_ccorg_cd', 'ifnull(target_br_mm_amt, 0) as target_br_mm_amt'];
        const target_where = { 'total': false, 'target_year': year };

        // rsp 조회용 정보
        const rsp_column = ['org_order', 'ccorg_cd', 'div_id', 'div_ccorg_cd', 'hdqt_id', 'hdqt_ccorg_cd', 'team_id', 'team_ccorg_cd', 'div_name', 'hdqt_name', 'team_name',
            'sum(ifnull(bun_mm_amt_sum,0)) as bun_mm_amt_sum',
            'sum(ifnull(b_mm_amt_sum,0)) as b_mm_amt_sum',
            'sum(ifnull(opp_amt_sum, 0)) as opp_amt_sum',
            'sum(ifnull(avg_amt_sum, 0)) as avg_amt_sum',
        ];
        const rsp_where = { 'year': year, 'is_delivery': true, [orgInfo.org_level]: orgInfo.org_ccorg_cd };
        const rsp_groupBy = ['org_order', 'ccorg_cd', 'div_id', 'div_ccorg_cd', 'hdqt_id', 'hdqt_ccorg_cd', 'team_id', 'team_ccorg_cd', 'div_name', 'hdqt_name', 'team_name'];
        const rsp_orderBy = { org_order: true };

        // DB 쿼리 실행 (병렬)
        const [rsp_data, target_data] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy).orderBy(rsp_orderBy),
            SELECT.from(target).columns(target_column).where(target_where),
        ]);

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
            let sum_opp = a_filtered_rsp_data.reduce((iSum, oData) => iSum += oData.opp_amt_sum, 0) || 0;
            let sum_avg = a_filtered_rsp_data.reduce((iSum, oData) => iSum += oData.avg_amt_sum, 0) || 0;
            let sum_mm = a_filtered_rsp_data.reduce((iSum, oData) => iSum += oData.bun_mm_amt_sum, 0) || 0;
            let sum_secured = a_filtered_rsp_data.reduce((iSum, oData) => iSum += oData.b_mm_amt_sum, 0) || 0;
            let i_target = target_data.find(oData => oData.org_ccorg_cd === o_rsp_data.ccorg_cd)?.target_br_mm_amt || 0;

            let secured_value = sum_secured;
            let not_secured_value = sum_avg ? (sum_opp / sum_avg) : 0;
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
                not_secured_value: total_value ? (not_secured_value / total_value) : 0,
                target: i_target,
            }

            a_result.push(o_final);
        });



        return a_result;
    });
}