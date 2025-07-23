const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_forecast_pl_pipeline_account', async (req) => {
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
            /**
             * account 정보
             */
            const common_account = db.entities('common').account_view;

            // function 입력 파라미터 - type 값 month(월기준), deal(deal stage 기준), rodr(수주 금액 기준) 
            const { year, month, org_id, type } = req.data;
            const i_month = Number(month);
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
            // DB 쿼리 실행 (병렬)
            const [orgInfo, account_query] = await Promise.all([
                SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd']).where({ 'org_id': org_id }),
                SELECT.from(common_account).columns(['biz_tp_account_cd', 'biz_tp_account_nm', 'sort_order'])
            ]);
            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level;
            // ccorg_cd 만 가지고 있는 경우 조회조건으로 사용
            let org_ccorg_col_nm = org_col_nm.slice(0, -2) + 'ccorg_cd'; // <>_id 에서 id 제거 후 <>_ccorg_cd 컬럼명 생성
            let org_ccorg_cd = orgInfo.org_ccorg_cd;

            let a_not_secured_data = ['Lead', 'Identified', 'Validated', 'Qualified', 'Negotiated']
            let i_index = i_month === 12? 12 : i_month+1

            if (type === 'month') {
                //건수 = 수주 건수
                const pl_col_list = [
                    'biz_tp_account_cd'
                ];

                let a_sale_columns = [];
                let a_rodr_columns = [];
                let a_total_cnt_columns = [];
                for(let i=12; i>=i_index; i--){
                    pl_col_list.push(`sum(sale_m${i}_amt) as m_${i}_sale_data`)
                    pl_col_list.push(`sum(rodr_m${i}_amt) as m_${i}_rodr_data`)
                    pl_col_list.push(`sum(case when rodr_m${i}_amt = 0 then 0 else 1 end) as m_${i}_rodr_cnt`)
                    a_sale_columns.push(`sum(sale_m${i}_amt)`)
                    a_rodr_columns.push(`sum(rodr_m${i}_amt)`)
                    a_total_cnt_columns.push(`sum(case when rodr_m${i}_amt = 0 then 0 else 1 end)`)
                }
                let s_total_cnt_column = i_month === 12 ? `0 as total_rodr_cnt` : `(${a_total_cnt_columns.join(' + ')}) as total_rodr_cnt`
                let s_sale_column = i_month === 12 ? `0 as sale_amount_sum` : `(${a_sale_columns.join(' + ')}) as sale_amount_sum`
                let s_rodr_column = i_month === 12 ? `0 as rodr_amount_sum` : `(${a_rodr_columns.join(' + ')}) as rodr_amount_sum`
                pl_col_list.push(s_total_cnt_column,s_sale_column,s_rodr_column)
                const pl_where_conditions = { 'year': year, 'weekly_yn': false, 'deal_stage_cd': { in: a_not_secured_data } };
                const pl_groupBy_cols = ['biz_tp_account_cd'];

                let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
                
                //pl 데이터 얻기
                const pl_data = await SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols);

                if(!pl_data.length){
                    //return req.res.status(204).send();
                return []
                }
                let o_result = {}
                let o_total = {
                    order: { display_order: 0, item_order: 1, div_name: '합계', div_id: 'total', type: '수주' },
                    sale: { display_order: 0, item_order: 2, div_name: '합계', div_id: 'total', type: '매출' },
                    count: { display_order: 0, item_order: 3, div_name: '합계', div_id: 'total', type: '건수' },
                }

                o_total['order'][`total_data`] = pl_data.reduce((iSum,oData)=>iSum += oData.rodr_amount_sum,0)
                o_total['sale'][`total_data`] = pl_data.reduce((iSum,oData)=>iSum += oData.sale_amount_sum,0)
                o_total['count'][`total_data`] = pl_data.reduce((iSum,oData)=>iSum += oData.total_rodr_cnt,0)
                account_query.forEach(account => {
                    let o_pl = pl_data.find(pl => pl.biz_tp_account_cd === account.biz_tp_account_cd)
                    if (!o_result[`${account.biz_tp_account_cd}_order`]) {
                        o_result[`${account.biz_tp_account_cd}_order`] = { display_order: account.sort_order + 1, item_order: 1, div_name: account.biz_tp_account_nm, div_id: account.biz_tp_account_cd, type: '수주', total_data: o_pl?.rodr_amount_sum??0 }
                        o_result[`${account.biz_tp_account_cd}_sale`] = { display_order: account.sort_order + 1, item_order: 2, div_name: account.biz_tp_account_nm, div_id: account.biz_tp_account_cd, type: '매출', total_data: o_pl?.sale_amount_sum??0 }
                        o_result[`${account.biz_tp_account_cd}_cnt`] = { display_order: account.sort_order + 1, item_order: 3, div_name: account.biz_tp_account_nm, div_id: account.biz_tp_account_cd, type: '건수', total_data: o_pl?.total_rodr_cnt??0 }
                    }
                    for (let i = 12; i > Number(month); i--) {
                        const s_index = i.toString().padStart(2, '0')
                        o_result[`${account.biz_tp_account_cd}_order`][`m_${s_index}_data`] = (o_pl?.[`m_${i}_rodr_data`]??0)
                        o_result[`${account.biz_tp_account_cd}_sale`][`m_${s_index}_data`] = (o_pl?.[`m_${i}_sale_data`]??0)
                        o_result[`${account.biz_tp_account_cd}_cnt`][`m_${s_index}_data`] = (o_pl?.[`m_${i}_rodr_cnt`]??0)
                        o_total['order'][`m_${s_index}_data`] = (o_total['order'][`m_${s_index}_data`] || 0) + (o_pl?.[`m_${i}_rodr_data`]??0)
                        o_total['sale'][`m_${s_index}_data`] = (o_total['sale'][`m_${s_index}_data`] || 0) + (o_pl?.[`m_${i}_sale_data`]??0)
                        o_total['count'][`m_${s_index}_data`] = (o_total['count'][`m_${s_index}_data`] || 0) + (o_pl?.[`m_${i}_rodr_cnt`]??0)
                    }
                })
                let a_total = Object.values(o_total),
                    a_result = Object.values(o_result);

                aRes.push(...a_total, ...a_result);
            } else if (type === 'deal') {
                //건수 = 수주 건수
                //컬럼 구성
                let a_total_cnt_columns = [];
                let a_sale_columns = [];
                let a_rodr_columns = [];
                for(let i=12; i>=i_index; i--){
                    a_total_cnt_columns.push(`sum(case when rodr_m${i}_amt = 0 then 0 else 1 end)`)
                    a_sale_columns.push(`sum(sale_m${i}_amt)`)
                    a_rodr_columns.push(`sum(rodr_m${i}_amt)`)
                }
                let s_total_cnt_column = i_month === 12 ? `0 as total_rodr_cnt` : `(${a_total_cnt_columns.join(' + ')}) as total_rodr_cnt`
                let s_sale_column = i_month === 12 ? `0 as sale_amount_sum` : `(${a_sale_columns.join(' + ')}) as sale_amount_sum`
                let s_rodr_column = i_month === 12 ? `0 as rodr_amount_sum` : `(${a_rodr_columns.join(' + ')}) as rodr_amount_sum`

                const pl_col_list = [
                    'biz_tp_account_cd',
                    'deal_stage_cd',
                    s_total_cnt_column,
                    s_sale_column,
                    s_rodr_column
                ];
                //임시로 'biz_opp_no': {'!=':null} 일단은 제거
                const pl_where_conditions = { 'year': year, 'weekly_yn':false, 'deal_stage_cd': { in: a_not_secured_data }};
                const pl_groupBy_cols = ['deal_stage_cd', 'biz_tp_account_cd'];

                const code = db.entities('common').code_header;

                let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };

                //pl 데이터 얻기
                const [pl_data] = await Promise.all([
                    SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols)
                ])
                if(!pl_data.length){
                    //return req.res.status(204).send();
                return []
                }
                
                //Lead Identified Validated Qualified Negotiated

                let o_total = {
                    order: { display_order: 0, item_order: 1, div_name: '합계', div_id: 'total', type: '수주', not_secured_total:0 },
                    sale: { display_order: 0, item_order: 2, div_name: '합계', div_id: 'total', type: '매출', not_secured_total:0 },
                    count: { display_order: 0, item_order: 3, div_name: '합계', div_id: 'total', type: '건수', not_secured_total:0 },
                }
                let o_result = {}
                account_query.forEach(account => {
                    let o_pl = pl_data.filter(pl => pl.biz_tp_account_cd === account.biz_tp_account_cd)
                    if (!o_result[`${account.biz_tp_account_cd}_order`]) {
                        o_result[`${account.biz_tp_account_cd}_order`] = { display_order: account.sort_order+1, item_order: 1, div_name: account.biz_tp_account_nm, div_id: account.biz_tp_account_cd, type: '수주', not_secured_total:0 }
                        o_result[`${account.biz_tp_account_cd}_sale`] = { display_order: account.sort_order+1, item_order: 2, div_name: account.biz_tp_account_nm, div_id: account.biz_tp_account_cd, type: '매출', not_secured_total:0 }
                        o_result[`${account.biz_tp_account_cd}_count`] = { display_order: account.sort_order+1, item_order: 3, div_name: account.biz_tp_account_nm, div_id: account.biz_tp_account_cd, type: '건수', not_secured_total:0 }
                        a_not_secured_data.forEach(code => {
                            let s_data_column = code.toLowerCase().replace('-', '_').replace(' ', '_') + '_data';
                            let pl_data = o_pl.find(pl => pl.deal_stage_cd === code)

                            o_result[`${account.biz_tp_account_cd}_order`][`${s_data_column}`] = (pl_data?.rodr_amount_sum ?? 0)
                            o_result[`${account.biz_tp_account_cd}_sale`][`${s_data_column}`] = (pl_data?.sale_amount_sum ?? 0)
                            o_result[`${account.biz_tp_account_cd}_count`][`${s_data_column}`] = (pl_data?.total_rodr_cnt ?? 0)
        
                            o_total[`order`][`${s_data_column}`] = (o_total[`order`][`${s_data_column}`] || 0) + (pl_data?.rodr_amount_sum ?? 0)
                            o_total[`sale`][`${s_data_column}`] = (o_total[`sale`][`${s_data_column}`] || 0) + (pl_data?.sale_amount_sum ?? 0)
                            o_total[`count`][`${s_data_column}`] = (o_total[`count`][`${s_data_column}`] || 0) + (pl_data?.total_rodr_cnt ?? 0)
                            o_total[`order`][`not_secured_total`] = (o_total[`order`][`not_secured_total`] || 0) + (pl_data?.rodr_amount_sum ?? 0)
                            o_total[`sale`][`not_secured_total`] = (o_total[`sale`][`not_secured_total`] || 0) + (pl_data?.sale_amount_sum ?? 0)
                            o_total[`count`][`not_secured_total`] = (o_total[`count`][`not_secured_total`] || 0) + (pl_data?.total_rodr_cnt ?? 0)
        
                            o_result[`${account.biz_tp_account_cd}_order`]['not_secured_total'] = (o_result[`${account.biz_tp_account_cd}_order`]['not_secured_total'] || 0) + (pl_data?.rodr_amount_sum ?? 0)
                            o_result[`${account.biz_tp_account_cd}_sale`]['not_secured_total'] = (o_result[`${account.biz_tp_account_cd}_sale`]['not_secured_total'] || 0) + (pl_data?.sale_amount_sum ?? 0)
                            o_result[`${account.biz_tp_account_cd}_count`]['not_secured_total'] = (o_result[`${account.biz_tp_account_cd}_count`]['not_secured_total'] || 0) + (pl_data?.total_rodr_cnt ?? 0)
                        })
                    }
                })
                let a_total = Object.values(o_total), // 합계 필요한 경우 추가
                    a_result = Object.values(o_result);

                aRes.push(...a_total,...a_result);
            } else if (type === 'rodr') {
                //건수 = 수주 건수
                const pl_col_list = ['biz_opp_no','biz_tp_account_cd'];
                if(i_month !== 12){
                    let a_sale_columns = [];
                    let a_rodr_columns = [];
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
                    pl_col_list.push(`sum(${s_rodr_column}) as rodr_total_data`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} >= 10000000000 then ${s_rodr_column} else 0 end) as rodr_more10bil`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} < 100000000 then ${s_sale_column} else 0 end) as sale_less100mil`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} >= 100000000 and ${s_rodr_column} <500000000 then ${s_sale_column} else 0 end) as sale_100mil_500mil`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} >= 500000000 and ${s_rodr_column} <1000000000 then ${s_sale_column} else 0 end) as sale_500mil_1bil`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} >= 1000000000 and ${s_rodr_column} <3000000000 then ${s_sale_column} else 0 end) as sale_1bil_3bil`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} >= 3000000000 and ${s_rodr_column} <5000000000 then ${s_sale_column} else 0 end) as sale_3bil_5bil`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} >= 5000000000 and ${s_rodr_column} <10000000000 then ${s_sale_column} else 0 end) as sale_5bil_10bil`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} >= 10000000000 then ${s_sale_column} else 0 end) as sale_more10bil`)
                    pl_col_list.push(`sum(${s_sale_column}) as sale_total_data`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} < 100000000 then 1 else 0 end) as cnt_less100mil`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} >= 100000000 and ${s_rodr_column} <500000000 then 1 else 0 end) as cnt_100mil_500mil`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} >= 500000000 and ${s_rodr_column} <1000000000 then 1 else 0 end) as cnt_500mil_1bil`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} >= 1000000000 and ${s_rodr_column} <3000000000 then 1 else 0 end) as cnt_1bil_3bil`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} >= 3000000000 and ${s_rodr_column} <5000000000 then 1 else 0 end) as cnt_3bil_5bil`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} >= 5000000000 and ${s_rodr_column} <10000000000 then 1 else 0 end) as cnt_5bil_10bil`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} >= 10000000000 then 1 else 0 end) as cnt_more10bil`)
                    pl_col_list.push(`sum(case when ${s_rodr_column} > 0 then 1 else 0 end) as cnt_total_data`)
                }
                const pl_where_conditions = { 'year': year, 'weekly_yn':false, 'deal_stage_cd': { in: a_not_secured_data } };
                let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
                const pl_groupBy = ['biz_opp_no','biz_tp_account_cd']
                //pl 데이터 얻기
                const pl_data = await SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy);
                
                if(!pl_data.length){
                    //return req.res.status(204).send();
                return []
                }
                const data_column = {
                    'total_data': 0,
                    'less100mil': 0,
                    '100mil_500mil': 0,
                    '500mil_1bil': 0,
                    '1bil_3bil': 0,
                    '3bil_5bil': 0,
                    '5bil_10bil': 0,
                    'more10bil': 0
                }

                let a_data_key = Object.keys(data_column)

                let o_total = {
                    order: { display_order: 0, item_order: 1, div_name: '합계', div_id: 'total', type: '수주', ...data_column },
                    sale: { display_order: 0, item_order: 2, div_name: '합계', div_id: 'total', type: '매출', ...data_column },
                    count: { display_order: 0, item_order: 3, div_name: '합계', div_id: 'total', type: '건수', ...data_column },
                } 

                a_data_key.forEach(key => {
                    o_total.order[`${key}`] = pl_data.reduce((iSum,oData) => iSum += oData?.[`rodr_${key}`]??0,0);
                    o_total.sale[`${key}`] = pl_data.reduce((iSum,oData) => iSum += oData?.[`sale_${key}`]??0,0);
                    o_total.count[`${key}`] = pl_data.reduce((iSum,oData) => iSum += oData?.[`cnt_${key}`]??0,0);
                })

        
                let o_result = {}
                account_query.forEach(account => {
                    let o_pl = pl_data.filter(pl => pl.biz_tp_account_cd === account.biz_tp_account_cd)
                    if (!o_result[`${account.biz_tp_account_cd}_order`]) {
                        o_result[`${account.biz_tp_account_cd}_order`] = { display_order: account.sort_order + 1, item_order: 1, div_name: account.biz_tp_account_nm, div_id: account.biz_tp_account_cd, type: '수주', ...data_column }
                        o_result[`${account.biz_tp_account_cd}_sale`] = { display_order: account.sort_order + 1, item_order: 2, div_name: account.biz_tp_account_nm, div_id: account.biz_tp_account_cd, type: '매출', ...data_column }
                        o_result[`${account.biz_tp_account_cd}_count`] = { display_order: account.sort_order + 1, item_order: 3, div_name: account.biz_tp_account_nm, div_id: account.biz_tp_account_cd, type: '건수', ...data_column }
                    }
                    a_data_key.forEach(key => {
                        o_result[`${account.biz_tp_account_cd}_order`][`${key}`] = o_pl.reduce((iSum,oData) => iSum += oData?.[`rodr_${key}`]??0,0);
                        o_result[`${account.biz_tp_account_cd}_sale`][`${key}`] = o_pl.reduce((iSum,oData) => iSum += oData?.[`sale_${key}`]??0,0);
                        o_result[`${account.biz_tp_account_cd}_count`][`${key}`] = o_pl.reduce((iSum,oData) => iSum += oData?.[`cnt_${key}`]??0,0);
                    })
                })

                let a_total = Object.values(o_total),
                    a_result = Object.values(o_result);

                aRes.push(...a_total, ...a_result);
            } else {
                return;
            }

            // org_name, type 순으로 정렬
            let a_sort_field = [
                { field: "display_order", order: "asc" },
                { field: "item_order", order: "asc" },
            ];
            aRes.sort((oItem1, oItem2) => {
                for (const { field, order } of a_sort_field) {
                    // 필드가 null일 때
                    if (oItem1[field] === null && oItem2[field] !== null) return -1;
                    if (oItem1[field] !== null && oItem2[field] === null) return 1;
                    if (oItem1[field] === null && oItem2[field] === null) continue;

                    if (typeof oItem1[field] === "number") {
                        var result = oItem1[field] - oItem2[field];
                    } else {
                        var result = oItem1[field].localeCompare(oItem2[field]);
                    }

                    if (result !== 0) {
                        return (order === "asc") ? result : -result;
                    }
                }
                return 0;
            })

            return aRes
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true}
        } 
    })
}