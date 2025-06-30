module.exports = (srv) => {
    srv.on('get_plan_dt_sale', async (req) => {

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

        const pl_col_list = ['src_type', 'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum' ];
        const pl_where_conditions = {'year': year, 'dgtr_task_cd': {'!=':null, and : {'dgtr_task_cd': {'!=':''}}}, 'src_type': { '!=':'WA'}};
        const pl_groupBy_cols = ['src_type'];

        let pl_column = org_col_nm === 'div_id' ? [...pl_col_list,'hdqt_id as id','hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_col_list,'team_id as id','team_name as name'] : [...pl_col_list,'div_id as id','div_name as name'];
        let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
        let pl_groupBy = org_col_nm === 'div_id' ? [...pl_groupBy_cols,'hdqt_id','hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_groupBy_cols,'team_id','team_name'] : [...pl_groupBy_cols,'div_id','div_name'];

        const [pl_data] = await Promise.all([
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy)
        ]);

        let o_data = {}

        pl_data.forEach(a=>{
            if(!o_data[`${a.id}`]){
                o_data[`${a.id}`]={id:a.id, type:a.name}
                if(a.src_type === 'D'){
                    o_data[`${a.id}`]['secured_sale']= (o_data[`${a.id}`]['secured_sale'] || 0) + a.sale_amount_sum
                    o_data[`${a.id}`]['not_secured_sale']= 0
                }else{
                    o_data[`${a.id}`]['secured_sale']= 0
                    o_data[`${a.id}`]['not_secured_sale']= (o_data[`${a.id}`]['not_secured_sale'] || 0) + a.sale_amount_sum
                }
            }else{
                if(a.src_type === 'D'){
                    o_data[`${a.id}`]['secured_sale']= (o_data[`${a.id}`]['secured_sale'] || 0) + a.sale_amount_sum
                }else{
                    o_data[`${a.id}`]['not_secured_sale']= (o_data[`${a.id}`]['not_secured_sale'] || 0) + a.sale_amount_sum
                }
            }
            o_data[`${a.id}`]['plan_sale']= (o_data[`${a.id}`]['plan_sale'] || 0) + a.sale_amount_sum
        })

        const a_result = Object.values(o_data)

        a_result.forEach((a,i)=>{
            const o_data = {
                ...a,
                display_order:i+1,
                plan_ratio : (a?.plan_sale ?? 0) !== 0 ? (a?.secured_sale ?? 0) / a.plan_sale * 100 : 0
            }
            aRes.push(o_data)
        })
        return aRes
    })
}