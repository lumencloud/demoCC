const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_ai_forecast_deal_pipeline', async (req) => {
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
            let pl_col_list = ['deal_stage_cd'];
            if(i_month !== 12){
                let a_sale_col = []
                let a_rodr_col = []
                for(let i=12; i>=i_index; i--){
                    a_sale_col.push(`sale_m${i}_amt`)
                    a_rodr_col.push(`rodr_m${i}_amt`)
                }

                pl_col_list.push(`sum(${a_sale_col.join(' + ')})/100000000 as sale_amt_sum`,`sum(${a_rodr_col.join(' + ')})/100000000 as rodr_amt_sum`)
                pl_col_list.push(`sum(case when (${a_rodr_col.join(' + ')}) = 0 then 0 else 1 end) as total_rodr_cnt`)
            }
            let pl_groupBy = ['deal_stage_cd']
            let pl_where_conditions = {year : year, deal_stage_chg_dt: { between: s_first_date, and: s_last_date }, weekly_yn: false, 'deal_stage_cd': { in: a_not_secured_data } }
            
            if(org_tp === 'account' || org_tp === 'delivery'){
                pl_where_conditions = {...pl_where_conditions,org_tp : org_tp}
            }
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            
            
            const [pl_data,code_data]=await Promise.all([
                SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(code).where({ category: "deal_stage_code" }).columns(header => { header.items(item => { item.value, item.sort_order }) }),
            ])
            
            // if(!pl_data.length){
            //     //return req.res.status(204).send();
            //     return []
            // }
            /**
             * Deal Stage item 데이터
             */
            const a_code = code_data[0].items
            
            let o_result = {}
            a_code.forEach(code => {
                if(a_not_secured_data.includes(code.value)){
                    let s_data_column = code.value.toLowerCase().replace('-', '_').replace(' ', '_') + '_data';
                    let o_pl = pl_data.find(pl => pl.deal_stage_cd === code.value);
                    if(!o_result[`${s_data_column}`]){
                        o_result[`${s_data_column}`]={
                            deal_stage_cd: code.value,
                            sort_order: code.sort_order,
                            rodr_amt_sum: o_pl?.rodr_amt_sum ?? 0,
                            sale_amt_sum: o_pl?.sale_amt_sum ?? 0,
                            total_rodr_cnt: o_pl?.total_rodr_cnt ?? 0
                        }
                    }
                }
            })
            let a_result = Object.values(o_result)
            aRes.push(...a_result)

            let aSortFields = [
                { field: "sort_order", order: "asc" }
            ];
            aRes.sort((oItem1, oItem2) => {
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
            return aRes;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}