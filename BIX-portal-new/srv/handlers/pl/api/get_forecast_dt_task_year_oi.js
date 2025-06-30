const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_forecast_dt_task_year_oi', async (req) => {
        /**
         * 핸들러 초기에 권한체크
         */
        // await check_user_auth(req);

        /**
         * API 리턴값 담을 배열 선언
         */
        const oResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // =========================== 조회 대상 DB 테이블 ===========================
        // entities('<cds namespace 명>').<cds entity 명>
        // srv .cds 에 using from 구문에 엔티티가 속한 db .cds 파일이 최소 한 번이라도 걸려있어야 db.entities 로 엔티티 인식가능
        // (서비스에 등록할 필요는 없음)
        /**
         * pl.wideview_view [실적]
         * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl').wideview_view;
        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;
        const dt_task = db.entities('common').dt_task
        // =================================================================================

        // function 입력 파라미터
        const { year, org_id } = req.data;
        const last_year = Number(year) - 1;

        // QUERY 공통 파라미터 선언
        /**
         * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const dt_pl_col_list = [
            'year', 'dgtr_task_cd', 'sum(ifnull(sale_year_amt,0)) as sale_amount_sum'];
        const dt_pl_where_conditions = {'dgtr_task_cd': {'!=':null, and : {'dgtr_task_cd': {'!=':''}}}, 'src_type': { '!=':'WA'}};
        const dt_pl_groupBy_cols = ['year', 'dgtr_task_cd'];

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
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd'])
            .where({ 'org_id': org_id });

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        //조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        // ccorg_cd 만 가지고 있는 경우 조회조건으로 사용

        // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation

        let dt_pl_column = dt_pl_col_list;
        let dt_pl_where = org_col_nm === 'lv1_id' ? dt_pl_where_conditions : { ...dt_pl_where_conditions, [org_col_nm]: org_id };
        let dt_pl_groupBy = dt_pl_groupBy_cols;

        // DB 쿼리 실행 (병렬)
        const [dt_pl_data, year_data, dt_task_data] = await Promise.all([
            SELECT.from(pl_view).columns(dt_pl_column).where(dt_pl_where).groupBy(...dt_pl_groupBy),
            SELECT.from(pl_view).columns(['year']).where(dt_pl_where).groupBy('year'),
            SELECT.from(dt_task).columns(['dgtr_task_cd','dgtr_task_nm','sort_order'])
        ]);

        let o_result_data = {}
        let o_total = {
            "display_order": 0,
            "id": 'total',
            "name": "합계",
            "w_rate": 0
        }
        dt_task_data.forEach(task => {
            let a_dt_data = dt_pl_data.filter(dt_pl => dt_pl.dgtr_task_cd === task.dgtr_task_cd);
            if(!o_result_data[`${task.dgtr_task_cd}`]){
                o_result_data[`${task.dgtr_task_cd}`]={id:task.dgtr_task_cd, name: task.dgtr_task_nm,display_order: task.sort_order};
            }
            year_data.forEach(year => {
                const o_dt_data = a_dt_data.find(dt => dt.year === year.year);
                o_result_data[`${task.dgtr_task_cd}`][`${year.year}`]= (o_result_data[`${task.dgtr_task_cd}`][`${year.year}`] || 0) + (o_dt_data?.sale_amount_sum??0)
                o_result_data[`${task.dgtr_task_cd}`]['total_sale'] = (o_result_data[`${task.dgtr_task_cd}`]['total_sale'] || 0) + (o_dt_data?.sale_amount_sum??0)
                
                o_total[`${year.year}`] = (o_total[`${year.year}`] || 0) + (o_dt_data?.sale_amount_sum??0)
                o_total['total_sale'] = (o_total['total_sale'] || 0) + (o_dt_data?.sale_amount_sum??0)
            })
        })

        let a_result = Object.values(o_result_data);
        oResult.push(o_total,...a_result)
        
        let aSortFields = [
            { field: "display_order", order: "asc" },
        ];
        oResult.sort((oItem1, oItem2) => {
            for (const { field, order } of aSortFields) {
                // 필드가 null일 때
                if (oItem1[field] === null && oItem2[field] !== null) return -1;
                if (oItem1[field] !== null && oItem2[field] === null) return 1;
                if (oItem1[field] === null && oItem2[field] === null) continue;

                if (typeof oItem1[field] === "string") {    // 문자일 때 localeCompare
                    var iResult = oItem1[field].localeCompare(oItem2[field]);
                } else if (typeof oItem1[field] === "number") { // 숫자일 때
                    var iResult = oItem1[field] - oItem2[field];
                }

                if (iResult !== 0) {
                    return (order === "asc") ? iResult : -iResult;
                }
            }
            return 0;
        })

        return oResult
    });
}