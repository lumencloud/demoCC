const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_ai_forecast_rodr_pipeline', async (req) => {
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
             * pl.wideview_view [실적]
             * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const pl_view = db.entities('pl').pipeline_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;
            /**
             * common.code_header [code 정보]
             */
            const code = db.entities('common').code_header;

            // function 입력 파라미터
            //org_tp : Delivery(delivery), Account(account), 전사 or 조직 ('')
            const { year, month, org_id, org_tp } = req.data;
            let s_first_day = new Date(year, month, 1).getDate().toString().padStart(2, '0'),
                s_last_day = new Date(year, month, 0).getDate().toString().padStart(2, '0');
            let s_first_date = `${year}-${month}-${s_first_day}`
            let s_last_date = `${year}-${month}-${s_last_day}`
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

            const i_month = Number(month);
            let a_not_secured_data = ['Lead', 'Identified', 'Validated', 'Qualified', 'Negotiated']
            let i_index = i_month === 12? 12 : i_month+1
            let pl_col_list = ['year'];
            if(i_month !== 12){
                let a_sale_columns = []
                let a_rodr_columns = []
                for(let i=12; i>=i_index; i--){
                    a_sale_columns.push(`sale_m${i}_amt`)
                    a_rodr_columns.push(`rodr_m${i}_amt`)
                }

                let s_sale_column = `(${a_sale_columns.join(' + ')})`
                let s_rodr_column = `(${a_rodr_columns.join(' + ')})`

                pl_col_list.push(`sum(case when ${s_rodr_column} < 100000000 then ${s_rodr_column} else 0 end) as rodr_less100mil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 100000000 and ${s_rodr_column} <500000000 then ${s_rodr_column} else 0 end) as rodr_100mil_500mil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 500000000 and ${s_rodr_column} <1000000000 then ${s_rodr_column} else 0 end) as rodr_500mil_1bil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 1000000000 and ${s_rodr_column} <3000000000 then ${s_rodr_column} else 0 end) as rodr_1bil_3bil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 3000000000 and ${s_rodr_column} <5000000000 then ${s_rodr_column} else 0 end) as rodr_3bil_5bil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 5000000000 and ${s_rodr_column} <10000000000 then ${s_rodr_column} else 0 end) as rodr_5bil_10bil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 10000000000 then ${s_rodr_column} else 0 end) as rodr_more10bil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} < 100000000 then ${s_sale_column} else 0 end) as sale_less100mil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 100000000 and ${s_rodr_column} <500000000 then ${s_sale_column} else 0 end) as sale_100mil_500mil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 500000000 and ${s_rodr_column} <1000000000 then ${s_sale_column} else 0 end) as sale_500mil_1bil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 1000000000 and ${s_rodr_column} <3000000000 then ${s_sale_column} else 0 end) as sale_1bil_3bil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 3000000000 and ${s_rodr_column} <5000000000 then ${s_sale_column} else 0 end) as sale_3bil_5bil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 5000000000 and ${s_rodr_column} <10000000000 then ${s_sale_column} else 0 end) as sale_5bil_10bil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 10000000000 then ${s_sale_column} else 0 end) as sale_more10bil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} < 100000000 then 1 else 0 end) as cnt_less100mil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 100000000 and ${s_rodr_column} <500000000 then 1 else 0 end) as cnt_100mil_500mil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 500000000 and ${s_rodr_column} <1000000000 then 1 else 0 end) as cnt_500mil_1bil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 1000000000 and ${s_rodr_column} <3000000000 then 1 else 0 end) as cnt_1bil_3bil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 3000000000 and ${s_rodr_column} <5000000000 then 1 else 0 end) as cnt_3bil_5bil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 5000000000 and ${s_rodr_column} <10000000000 then 1 else 0 end) as cnt_5bil_10bil`)
                pl_col_list.push(`sum(case when ${s_rodr_column} >= 10000000000 then 1 else 0 end) as cnt_more10bil`)
            }
            let pl_where_conditions = {year : year, deal_stage_chg_dt: { between: s_first_date, and: s_last_date }, weekly_yn: false, 'deal_stage_cd': { in: a_not_secured_data } }
            
            if(org_tp === 'account' || org_tp === 'delivery'){
                pl_where_conditions = {...pl_where_conditions,org_tp : org_tp}
            }
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            
            const [pl_data]=await Promise.all([
                SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy('year')
            ])
            // if(!pl_data.length){
            //     //return req.res.status(204).send();
            //     return []
            // }
            let o_pl = pl_data[0]
            const data_column = {
                'less100mil': 0,
                '100mil_500mil': 0,
                '500mil_1bil': 0,
                '1bil_3bil': 0,
                '3bil_5bil': 0,
                '5bil_10bil': 0,
                'more10bil': 0
            }
            let a_data_key = Object.keys(data_column)
            let o_result = {order: {}, sale: {}, cnt: {}}
            a_data_key.forEach(key => {
                o_result[`order`][`${key}`] = (o_pl?.[`rodr_${key}`] ?? 0)/100000000;
                o_result[`sale`][`${key}`] = (o_pl?.[`sale_${key}`] ?? 0)/100000000;
                o_result[`cnt`][`${key}`] = o_pl?.[`cnt_${key}`] ?? 0;
            })
            
            return o_result
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}