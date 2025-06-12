module.exports = (srv) => {
    srv.on('get_actual_dt_task_oi', async (req) => {

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
         * target [목표]
         * [부문/본부/팀 + 년,금액] 조직 별 연단위 목표금액
         */
        const target = db.entities('common').target_view;
        /**
         * pl.wideview_unpivot_view [실적]
         * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl').wideview_unpivot_view;
        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;
        /**
         * common.dt_task [과제정보]
         * 조직구조 테이블
         */
        const dt_task = db.entities('common').dt_task
        // =================================================================================

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

        // QUERY 공통 파라미터 선언
        /** 
         * 타겟 뷰 조회용 컬럼
         */
        const target_col_list = [
            'year', 'org_id','sum(ifnull(dt_sale_target,0)) as dt_sale_target'];
        const target_where_conditions = {'is_total' : true, 'year': { in: [year, last_year] }};
        const target_groupBy_cols = ['year', 'org_id']
        /**
         * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const dt_pl_col_list = [
            'year', 'org_id', 'dgtr_task_cd', 'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum'];
        const dt_pl_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month, 'is_delivery': true, 'dgtr_task_cd': {'!=':null}, 'src_type': { 'not in':['WA','D']}};
        const dt_pl_groupBy_cols = ['year', 'org_id', 'dgtr_task_cd'];

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

        let target_column = [...target_col_list];
        let target_where = org_col_nm === 'lv1_id' ? target_where_conditions : { ...target_where_conditions, [org_col_nm]: org_id };
        let target_groupBy = [...target_groupBy_cols];

        let dt_pl_column = [...dt_pl_col_list];
        let dt_pl_where = org_col_nm === 'lv1_id' ? dt_pl_where_conditions : { ...dt_pl_where_conditions, [org_col_nm]: org_id };
        let dt_pl_groupBy = [...dt_pl_groupBy_cols];
        
        // DB 쿼리 실행 (병렬)
        const [dt_pl_data, dt_task_data, target_data] = await Promise.all([
            SELECT.from(pl_view).columns(dt_pl_column).where(dt_pl_where).groupBy(...dt_pl_groupBy),
            SELECT.from(dt_task).columns(['dgtr_task_cd','dgtr_task_nm','sort_order']),
            SELECT.from(target).columns(target_column).where(target_where).groupBy(...target_groupBy),
        ]);
        
        let o_data = {}
        
        dt_pl_data.forEach(a=>{
            if(!o_data[`${a.dgtr_task_cd}`]){
                o_data[`${a.dgtr_task_cd}`]={id:a.dgtr_task_cd}
            }
            if(a.year === year){
                o_data[`${a.dgtr_task_cd}`][`${year}`] = (o_data[`${a.dgtr_task_cd}`][`${year}`] || 0 ) + a.sale_amount_sum;
            }else{
                o_data[`${a.dgtr_task_cd}`][`${last_year}`] = (o_data[`${a.dgtr_task_cd}`][`${last_year}`] || 0 ) + a.sale_amount_sum;
            }
        })
        
        const a_result = Object.values(o_data)

        let o_total = { "display_order": 1, "id": 'total', "name": '합계'};

        dt_task_data.forEach((a,i)=>{
            const o_result_data = a_result.find(b=> a.dgtr_task_cd === b.id);
            
            if(o_result_data){
                let o_temp = {
                    "display_order": a.sort_order + 1,
                    "id": o_result_data['id'],
                    "name": a.dgtr_task_nm,
                    "target_curr_y_value": 0,
                    "actual_curr_ym_value": o_result_data?.[`${year}`] ?? 0,
                    "actual_last_ym_value": o_result_data?.[`${last_year}`] ?? 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0
                }
                o_total['target_curr_y_value'] = (o_total['target_curr_y_value'] || 0) + o_temp['target_curr_y_value'];
                // o_total['target_last_y_value'] = (o_total['target_last_y_value'] || 0) + (last_target_data?.['dt_sale_target'] ?? 0);
                o_total['actual_curr_ym_value'] = (o_total['actual_curr_ym_value'] || 0) + o_temp['actual_curr_ym_value'];
                o_total['actual_last_ym_value'] = (o_total['actual_last_ym_value'] || 0) + o_temp['actual_last_ym_value'];
    
                oResult.push(o_temp)
            }
        })

        o_total['actual_curr_ym_rate'] = o_total['target_curr_y_value'] === 0 ? 0 : o_total['actual_curr_ym_value']/(o_total['target_curr_y_value']*100000000)*100;
        // o_total['actual_last_ym_rate'] = o_total['target_last_y_value'] === 0 ? 0 : o_total['actual_last_ym_value']/(o_total['target_last_y_value']*100000000)*100;
        let o_result_total = {
            "display_order": o_total['display_order'],
            "id": o_total['id'],
            "name": o_total['name'],
            "target_curr_y_value": o_total['target_curr_y_value'],
            "actual_curr_ym_value": o_total['actual_curr_ym_value'],
            "actual_last_ym_value": o_total['actual_last_ym_value'],
            "actual_curr_ym_rate": o_total['actual_curr_ym_rate'],
            "actual_last_ym_rate": 0,
        }
        oResult.push(o_result_total)
        return oResult
    });
}