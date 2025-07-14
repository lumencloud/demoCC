const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_ai_forecast_m_pl', async (req) => {
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
             * pl.pipeline_view [실적]
             * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const pl_view = db.entities('pl').pipeline_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;

            // function 입력 파라미터
            //org_tp : Delivery(delivery), Account(account), 전사 or 조직 ('')
            const { year, month, org_id, org_tp } = req.data;
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

            let pl_col_list = ['year'];
            let pl_where_conditions = {year : year, [org_col_nm]: org_id}
            let pl_groupBy = ['year'];
            for(let i=1; i<=12; i++){
                pl_col_list.push(`sum(sale_m${i}_amt)/100000000 as m_${i}_sale`)
                pl_col_list.push(`sum(rodr_m${i}_amt)/100000000 as m_${i}_rodr`)
            }

            if(!!org_tp){
                pl_where_conditions = {...pl_where_conditions,org_tp : org_tp}
            }
            
            const [pl_data,target_data]=await Promise.all([
                SELECT.from(pl_view).columns(pl_col_list).where(pl_where_conditions).groupBy(...pl_groupBy),
                get_org_target(year,['A01'])
            ])
            
            const o_target = target_data.find(target => target.org_id === org_id )
            
            let o_result = {target:o_target?.target_sale??0}
            for(let i=1; i<=12; i++){
                const i_month = Number(month);
                if(i<=i_month){
                    o_result[`m_${i}_sale`] = pl_data[0]?.[`m_${i}_sale`]??0
                    o_result[`m_${i}_type`] = 'actual'
                }else{
                    o_result[`m_${i}_sale`] = pl_data[0]?.[`m_${i}_rodr`]??0
                    o_result[`m_${i}_type`] = 'plan'
                }
            }
            
            aRes.push(o_result);

            return aRes;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}