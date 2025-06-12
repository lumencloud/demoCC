module.exports = (srv) => {
    srv.on('get_actual_sga_excel', async (req) => {
        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // function 입력 파라미터
        const { year, month, org_id } = req.data;

        // =========================== 조회 대상 DB 테이블 ===========================
        // entities('<cds namespace 명>').<cds entity 명>
        /**
         * sga_wideview_unpivot_view [sg&a 집계]
         */
        const sga_view = db.entities('sga').wideview_unpivot_view;
        /**
         * common_org_full_level_view [조직정보]
         */
        const org_full_level = db.entities('common').org_full_level_view;

        /**
         * +++++ TBD +++++
         * 권한 체크하여 사용자가 조회 가능한 조직인지 판별 후 코드 진행
         */

        /**
         * org_id 파라미터값으로 조직정보 조회
         * 
         */
        const org_col = `case
            when lv1_id = '${org_id}' THEN 'lv1_id'
            when lv2_id = '${org_id}' THEN 'lv2_id'
            when lv3_id = '${org_id}' THEN 'lv3_id'
            when div_id = '${org_id}' THEN 'div_id'
            when hdqt_id = '${org_id}' THEN 'hdqt_id'
            when team_id = '${org_id}' THEN 'team_id'
            end as org_level`;
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col]).where`org_id = ${org_id}`;
        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        // 조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;

        const sga_where_conditions = { 'year': year, 'month_amt': month };
        let sga_where = { ...sga_where_conditions, [org_col_nm]: org_id };

        // DB 쿼리 실행 (병렬)
        const [aSgaData] = await Promise.all([
            SELECT.from(sga_view).where(sga_where).orderBy("lv1_name","lv2_name","lv3_name","div_name","hdqt_name","team_name","month_amt")
        ]);

        let aResult = aSgaData;
        return aResult;
    })
}