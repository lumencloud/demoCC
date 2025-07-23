const check_user_auth = require('../function/check_user_auth');
const get_org_target = require('../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_forecast_trend', async (req) => {
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
             * pl.wideview_unpivot_view [실적]
             * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const pl_org_view = db.entities('pl').wideview_view;
            const pl_account_view = db.entities('pl').wideview_account_view;
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
            let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd','lv3_ccorg_cd','org_tp'])
                .where({'org_id' : org_id});

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level;
            let org_tp = orgInfo.org_tp;
            let lv3_ccorg_cd = orgInfo.lv3_ccorg_cd;

            let pl_view = pl_org_view
            if(org_col_nm !== 'lv1_ccorg_cd' && org_col_nm !== 'lv2_ccorg_cd' && ((org_tp === 'hybrid' && lv3_ccorg_cd === '237100') || org_tp === 'account')){
                pl_view = pl_account_view
            }

            const pl_col_list = ['month_amt', 'actual_yn', 'src_type', 'sum(sale_amount_sum) as sale_amount_sum' ];
            const pl_where_conditions = {'year': year, 'src_type': { '!=':'WA'}};
            const pl_groupBy_cols = ['month_amt', 'actual_yn', 'src_type'];

            let pl_column = pl_col_list;
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            let pl_groupBy = pl_groupBy_cols;

            const [pl_data] = await Promise.all([
                SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy)
            ]);

            const o_actual = {
                display_order : 1,
                type : '확보(실적)'
            }
            const o_forecast = {
                display_order : 2,
                type : '확보(추정)'
            }
            const o_opp = {
                display_order : 3,
                type : '미확보'
            }

            pl_data.forEach(a=>{
                if(a.src_type === 'D'){
                    o_opp[`m_${a.month_amt}_data`] = (o_opp[`m_${a.month_amt}_data`] || 0) + (a?.sale_amount_sum ?? 0)
                }else if(a.src_type === 'E' || a.src_type === 'P' || a.src_type === 'S' || a.src_type === 'WO'){
                    if(a.actual_yn){
                        o_actual[`m_${a.month_amt}_data`] = (o_actual[`m_${a.month_amt}_data`] || 0) + (a?.sale_amount_sum ?? 0)
                    }else{
                        o_forecast[`m_${a.month_amt}_data`] = (o_forecast[`m_${a.month_amt}_data`] || 0) + (a?.sale_amount_sum ?? 0)
                    }
                }
            })

            aRes.push(o_actual, o_forecast, o_opp)

            return aRes
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}