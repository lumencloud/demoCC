const { isRedirect } = require("@sap/cds/libx/odata/utils");

module.exports = (srv) => {
    srv.on('get_forecast_m_pl_excel', async (req) => {

        // function 호출 리턴 객체
        const aRes = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        /**
         * pl.wideview_unpivot_view [실적]
         * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl').wideview_unpivot_view;
        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;

        // function 입력 파라미터
        const { year, org_id } = req.data;

        /**
         * org_id 파라미터값으로 조직정보 조회
         */
        const org_col = `case
            when lv1_id = '${org_id}' THEN 'lv1_id'
            when lv2_id = '${org_id}' THEN 'lv2_id'
            when lv3_id = '${org_id}' THEN 'lv3_id'
            when div_id = '${org_id}' THEN 'div_id'
            when hdqt_id = '${org_id}' THEN 'hdqt_id'
            when team_id = '${org_id}' THEN 'team_id'
            end as org_level`;
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd'])
            .where({'org_id' : org_id});

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        //조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        
        const pl_where_conditions = {'year': year, 'src_type':'D', 'src_type': { '!=':'WA'}};

        let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };

        const [pl_data] = await Promise.all([
            SELECT.from(pl_view).where(pl_where)
        ]);

        aRes.push(...pl_data)
        return aRes
    })
}