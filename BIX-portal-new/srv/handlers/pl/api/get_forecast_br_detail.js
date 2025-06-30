const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_forecast_br_detail', async (req) => {
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
         * rsp.wideview_view [비용 집계]
         * [부문/본부/팀 + 년,month_amt,금액] 프로젝트 비용 집계 뷰
         */
        const rsp_view = db.entities('rsp').wideview_view;
        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;
        // =================================================================================

        // function 입력 파라미터
        const { year, month, org_id } = req.data;

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
        const orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd'])
            .where({ 'org_id': org_id });

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        const rsp_column = ['org_order', 'ccorg_cd', 'div_id', 'div_ccorg_cd', 'hdqt_id', 'hdqt_ccorg_cd', 'team_id', 'team_ccorg_cd', 'div_name', 'hdqt_name', 'team_name'];
        const rsp_where = { 'year': year, 'is_delivery': true, [orgInfo.org_level]: orgInfo.org_ccorg_cd };
        const rsp_groupBy = ['org_order', 'ccorg_cd', 'div_id', 'div_ccorg_cd', 'hdqt_id', 'hdqt_ccorg_cd', 'team_id', 'team_ccorg_cd', 'div_name', 'hdqt_name', 'team_name'];
        const rsp_orderBy = { org_order: true };

        for(let i = 1; i<=12; i++){
            rsp_column.push(`sum(ifnull(opp_m${i}_amt, 0)) as opp_m${i}_value`)
            rsp_column.push(`sum(ifnull(avg_m${i}_amt, 0)) as avg_m${i}_value`)
            rsp_column.push(`sum(ifnull(bun_mm_m${i}_amt, 0)) as total_m${i}_value`)
            rsp_column.push(`sum(ifnull(b_mm_m${i}_amt, 0)) as secured_m${i}_value`)
        }
        
        // DB 쿼리 실행 (병렬)
        const [rsp_data] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy).orderBy(rsp_orderBy),
        ]);

        rsp_data.forEach(o_rsp_data => {
            let a_filtered_rsp_data = [];
            let org_flag;

            // 이미 추가된 조직은 Return
            let has_same = a_result.find(o_result => o_result.ccorg_cd === o_rsp_data.ccorg_cd);
            if (has_same) return;

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

            // 조직 구조
            let o_final = {
                ccorg_cd: o_rsp_data.ccorg_cd,
                div_id: o_rsp_data.div_id,
                div_name: (org_flag === "div") ? `소계 : ${o_rsp_data.div_name}` : o_rsp_data.div_name,
                hdqt_id: o_rsp_data.hdqt_id,
                hdqt_name: (org_flag === "div") ? `소계 : ${o_rsp_data.div_name}` : (org_flag === "hdqt") ? `소계 : ${o_rsp_data.hdqt_name}` : o_rsp_data.hdqt_name,
                team_id: o_rsp_data.team_id,
                team_name: (org_flag === "div") ? `소계 : ${o_rsp_data.div_name}` : (org_flag === "hdqt") ? `소계 : ${o_rsp_data.hdqt_name}` : o_rsp_data.team_name,
            }

            // 월별 합계 필드 추가
            for (let i = 1; i <= 12; i++) {
                let i_month = Number(month)
                let total_value = a_filtered_rsp_data.reduce((iSum, oData) => iSum += oData[`total_m${i}_value`], 0);
                let secured_value = a_filtered_rsp_data.reduce((iSum, oData) => iSum += oData[`secured_m${i}_value`], 0);;
                let opp_value = a_filtered_rsp_data.reduce((iSum, oData) => iSum += oData[`opp_m${i}_value`], 0);
                let avg_value = a_filtered_rsp_data.reduce((iSum, oData) => iSum += oData[`avg_m${i}_value`], 0);
                let forecast_value;
                if(i<=i_month){
                    forecast_value = total_value === 0 ? 0 : secured_value/total_value
                }else{
                    forecast_value = total_value === 0 || avg_value === 0 ? 0 : opp_value/avg_value/total_value
                }
                o_final[`m_${i}_data`] = forecast_value;
            }

            a_result.push(o_final);
        });

        return a_result;
    });
}