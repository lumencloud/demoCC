const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_ai_total_rodr', async (req) => {
        try{
            /**
             * 핸들러 초기에 권한체크
             */
            await check_user_auth(req);

            // function 호출 리턴 객체
            const aRes = [];

            // cds 모듈을 통한 DB 커넥트
            const db = await cds.connect.to('db');

            /**
             * pl.wideview_org_view [실적]
             * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const pl_view = db.entities('pl').pipeline_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;

            // function 입력 파라미터
            // type = dt or bau
            const { org_id, start_date, end_date, type } = req.data;

            let i_year = new Date(start_date).getFullYear()
            let i_start_month = new Date(start_date).getMonth()
            let i_end_month = new Date(start_date).getMonth()
            let i_start_date = new Date(start_date).getDate()
            let i_end_date = new Date(end_date).getDate()
            
            // 전주 날짜 계산 (월이 바뀌는 경우 포함)
            const dt_last_start = new Date(start_date);
            dt_last_start.setDate(dt_last_start.getDate() - 7);

            const dt_last_end = new Date(end_date);
            dt_last_end.setDate(dt_last_end.getDate() - 7);

            const last_start_date = dt_last_start.toISOString().split("T")[0];
            const last_end_date = dt_last_end.toISOString().split("T")[0];
            
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
            let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd','org_name'])
                .where`org_id = ${org_id} and (lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id})`;

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error
            let org_col_nm = orgInfo.org_level;

            let pl_col_list = [`sum(rodr_year_amt) as rodr_year_amt`,'count(biz_opp_no_sfdc) as rodr_cnt'];
            let pl_where_conditions = {deal_stage_cd:{'not in':['Contracted', 'Deal Lost', 'Deselected']}, deal_stage_chg_dt:{between:start_date, and:end_date}}
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : {...pl_where_conditions,[org_col_nm]: org_id}
            let pl_last_where_conditions = {deal_stage_cd:{'not in':['Contracted', 'Deal Lost', 'Deselected']}, deal_stage_chg_dt:{between:last_start_date, and:last_end_date}}
            let pl_last_where = org_col_nm === 'lv1_id' ? pl_last_where_conditions : {...pl_last_where_conditions,[org_col_nm]: org_id}
            if(type === 'dt'){
                pl_where = {...pl_where,dgtr_task_cd:{'!=':''}}
                pl_last_where = {...pl_last_where,dgtr_task_cd:{'!=':''}}
            }else{
                pl_where = {...pl_where,dgtr_task_cd:{'in':[null,'']}}
                pl_last_where = {...pl_last_where,dgtr_task_cd:{'in':[null,'']}}
            }
            const [pl_data,pl_last_data]=await Promise.all([
                SELECT.from(pl_view).columns(pl_col_list).where(pl_where),
                SELECT.from(pl_view).columns(pl_col_list).where(pl_last_where)
            ])
            if(!pl_data.length && !pl_last_data.length){
                //return req.res.status(204).send();
                return []
            }
            let o_temp = {
                rodr_amt : (pl_data[0]?.rodr_year_amt ?? 0),
                rodr_cnt : (pl_data[0]?.rodr_cnt ?? 0),
                curr_last_rodr_amt : (pl_data[0]?.rodr_year_amt ?? 0) - (pl_last_data[0]?.rodr_year_amt ?? 0),
                curr_last_rodr_cnt : (pl_data[0]?.rodr_cnt ?? 0) - (pl_last_data[0]?.rodr_cnt ?? 0)
            }
            aRes.push(o_temp)
            return aRes;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}