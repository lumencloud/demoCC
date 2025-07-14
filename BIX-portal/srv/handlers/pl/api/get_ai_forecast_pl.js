const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_ai_forecast_pl', async (req) => {
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
            const pl_org_view = db.entities('pl').wideview_org_view;
            const pl_account_view = db.entities('pl').wideview_account_org_view;
            /**
             * pl.wideview_dt_view [실적]
             * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const dt_org_view = db.entities('pl').wideview_dt_view;
            const dt_account_view = db.entities('pl').wideview_account_dt_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;

            // function 입력 파라미터
            const { year, org_id, org_tp } = req.data;
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

            let pl_view = pl_org_view
            let dt_view = dt_org_view
            if(org_tp === 'account'){
                pl_view = pl_account_view
                dt_view = dt_account_view
            }
            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error
            let org_col_nm = orgInfo.org_level;

            let pl_col_list = [
                'sum(sale_year_amt)/100000000 as sale_year_amt',
                'sum(sfdc_sale_year_amt)/100000000 as sfdc_sale_year_amt',
                'sum(margin_year_amt)/100000000 as margin_year_amt',
                'sum(sfdc_margin_year_amt)/100000000 as sfdc_margin_year_amt'
            ];
            let dt_col_list = [
                `sum(case when src_type <> 'D' then sale_year_amt/100000000  else 0 end) as sale_year_amt`,
                `sum(case when src_type = 'D' then sale_year_amt/100000000 else 0 end) as sfdc_sale_year_amt`
            ]
            let pl_where_conditions = {year : year}
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : {...pl_where_conditions,[org_col_nm]: org_id}
            let dt_where_conditions = {year : year, src_type: { '!=':'WA'}}
            let dt_where = org_col_nm === 'lv1_id' ? dt_where_conditions : {...dt_where_conditions,[org_col_nm]: org_id}
            
            const [pl_data, dt_data]=await Promise.all([
                SELECT.from(pl_view).columns(pl_col_list).where(pl_where),
                SELECT.from(dt_view).columns(dt_col_list).where(dt_where)
            ])
            
            if(!pl_data.length && !dt_data.length){
                //return req.res.status(204).send();
                return []
            }
            let o_pl = pl_data[0]
            let o_dt = dt_data[0]
            
            let o_sale = {
                type : '매출',
                forecast_value : (o_pl?.sale_year_amt ?? 0)+(o_pl?.sfdc_sale_year_amt ?? 0),
                not_secured_value : o_pl?.sfdc_sale_year_amt ?? 0
            }
            let o_margin = {
                type : '마진',
                forecast_value : (o_pl?.margin_year_amt ?? 0)+(o_pl?.sfdc_margin_year_amt ?? 0),
                not_secured_value : o_pl?.sfdc_margin_year_amt ?? 0
            }
            let o_margin_rate = {
                type : '마진율',
                forecast_value : o_sale.forecast_value === 0 ? 0 : o_margin.forecast_value/o_sale.forecast_value*100,
                not_secured_value : o_sale.not_secured_value === 0 ? 0 : o_margin.not_secured_value/o_sale.not_secured_value*100
            }
            let o_dt_sale = {
                type : 'DT 매출',
                forecast_value : (o_dt?.sale_year_amt ?? 0)+(o_dt?.sfdc_sale_year_amt ?? 0),
                not_secured_value : o_dt?.sfdc_sale_year_amt ?? 0
            }
            aRes.push(o_sale,o_margin,o_margin_rate,o_dt_sale)

            return aRes;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}