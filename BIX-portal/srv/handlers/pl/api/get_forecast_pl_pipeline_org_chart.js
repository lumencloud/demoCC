const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_forecast_pl_pipeline_org_chart', async (req) => {
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

            const code = db.entities('common').code_header;

            const { year, month, org_id, type, ai_flag } = req.data;
            let i_month = Number(month);

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
            let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', 'lv1_name', 'lv2_name', 'lv3_name', 'div_name', 'hdqt_name', 'team_name'])
                .where({ 'org_id': org_id });
            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            // 조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level;
            let org_col_nm_name = org_col_nm.split('_', 1) + '_name';
            let org_name = orgInfo[org_col_nm_name];

            let a_not_secured_data = ['Lead', 'Identified', 'Validated', 'Qualified', 'Negotiated']
            let a_secured_data = ['Contracted', 'Deselected', 'Deal Lost']

            /**
             * 부문, 본부 레벨 조회일 경우, 본부별로 조회, 그 외 부문별로 조회
             */
            let org_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? ['hdqt_id as id', 'hdqt_name as name', 'org_order', 'org_id','lv3_ccorg_cd','lv3_id','lv3_name'] : ['div_id as id', 'div_name as name', 'org_order', 'org_id','lv3_ccorg_cd','lv3_id','lv3_name'];
            let org_where = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? { 'hdqt_id': { '!=': null }, and: { [org_col_nm]: org_id }, 'team_id': null} : { 'div_id': { '!=': null }, and: { [org_col_nm]: org_id }, 'hdqt_id': null, 'team_id': null};
            let org_groupBy = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? ['hdqt_id', 'hdqt_name', 'org_order', 'org_id','lv3_ccorg_cd','lv3_id','lv3_name'] : ['div_id', 'div_name', 'org_order', 'org_id','lv3_ccorg_cd','lv3_id','lv3_name'];
            if(['lv1_id','lv2_id'].includes(org_col_nm)){
                org_where = {...org_where,'org_tp':'account'}
            }

            let o_result = { org: [], secured: {}, not_secured: {} }

            let i_index = i_month === 12 ? 12 : i_month + 1

            if(type === 'month'){
                const pl_col_list = [];
                const pl_not_col_list = [];
                let a_total_cnt_columns = [];
                let a_not_total_cnt_columns = [];
                for(let i=12; i>=1; i--){
                    if(i>=i_index){
                        pl_not_col_list.push(`sum(sale_m${i}_amt) as m_${i}_sale_data`)
                        pl_not_col_list.push(`sum(rodr_m${i}_amt) as m_${i}_rodr_data`)
                        pl_not_col_list.push(`sum(case when rodr_m${i}_amt = 0 then 0 else 1 end) as m_${i}_rodr_cnt`)
                        a_not_total_cnt_columns.push(`sum(case when rodr_m${i}_amt = 0 then 0 else 1 end)`)
                    }
                    pl_col_list.push(`sum(sale_m${i}_amt) as m_${i}_sale_data`)
                    pl_col_list.push(`sum(rodr_m${i}_amt) as m_${i}_rodr_data`)
                    pl_col_list.push(`sum(case when rodr_m${i}_amt = 0 then 0 else 1 end) as m_${i}_rodr_cnt`)
                    a_total_cnt_columns.push(`sum(case when rodr_m${i}_amt = 0 then 0 else 1 end)`)
                }
                let s_total_cnt_column = i_month===12 ? `0 as total_rodr_cnt` : `(${a_total_cnt_columns.join(' + ')}) as total_rodr_cnt`
                let s_not_total_cnt_column = i_month===12 ? `0 as total_rodr_cnt` : `(${a_not_total_cnt_columns.join(' + ')}) as total_rodr_cnt`
                pl_col_list.push(s_total_cnt_column)
                pl_not_col_list.push(s_not_total_cnt_column)
    
                const pl_where_conditions = { 'year': year, 'weekly_yn': false, 'deal_stage_cd': { in: a_secured_data } };
                const pl_not_where_conditions = { 'year': year, 'weekly_yn': false, 'deal_stage_cd': { in: a_not_secured_data } };
                const pl_groupBy_cols = [];
                
                let pl_column = !org_col_nm.includes("lv") ? [...pl_col_list, 'hdqt_id as id', 'hdqt_name as name'] : [...pl_col_list, 'div_id as id', 'div_name as name'];
                let pl_not_column = !org_col_nm.includes("lv") ? [...pl_not_col_list, 'hdqt_id as id', 'hdqt_name as name'] : [...pl_not_col_list, 'div_id as id', 'div_name as name'];
                let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id }
                let pl_not_where = org_col_nm === 'lv1_id' ? pl_not_where_conditions : { ...pl_not_where_conditions, [org_col_nm]: org_id }
                let pl_groupBy = !org_col_nm.includes("lv") ? [...pl_groupBy_cols, 'hdqt_id', 'hdqt_name'] : [...pl_groupBy_cols, 'div_id', 'div_name'];

                const [pl_data, pl_not_data, org_data] = await Promise.all([
                    SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                    SELECT.from(pl_view).columns(pl_not_column).where(pl_not_where).groupBy(...pl_groupBy),
                    SELECT.from(org_full_level).columns(org_column).where(org_where).groupBy(...org_groupBy).orderBy('org_order')
                ])
                
                org_data.forEach(org => {
                    let o_pl = pl_data.find(pl => pl.id === org.id);
                    let o_not_pl = pl_not_data.find(pl => pl.id === org.id);
                    o_result['org'].push({ org_name: org.name, org_id: org.id })
                    if (!o_result['secured'][`${org.id}_order`]) {
                        o_result['secured'][`${org.id}_order`] = { display_order: (org?.org_order ?? 0), item_order: 1, org_name: org.name, org_id: org.id, type: '수주', total_data: 0 }
                        o_result['secured'][`${org.id}_sale`] = { display_order: (org?.org_order ?? 0), item_order: 2, org_name: org.name, org_id: org.id, type: '매출', total_data: 0 }
                        o_result['secured'][`${org.id}_cnt`] = { display_order: (org?.org_order ?? 0), item_order: 3, org_name: org.name, org_id: org.id, type: '건수', total_data: 0 }
                        o_result['not_secured'][`${org.id}_order`] = { display_order: (org?.org_order ?? 0), item_order: 1, org_name: org.name, org_id: org.id, type: '수주', total_data: 0 }
                        o_result['not_secured'][`${org.id}_sale`] = { display_order: (org?.org_order ?? 0), item_order: 2, org_name: org.name, org_id: org.id, type: '매출', total_data: 0 }
                        o_result['not_secured'][`${org.id}_cnt`] = { display_order: (org?.org_order ?? 0), item_order: 3, org_name: org.name, org_id: org.id, type: '건수', total_data: 0 }
                    }
                    
                        for (let i = 12; i >= 1; i--) {
                            const s_index = i.toString().padStart(2, '0')
                            o_result['secured'][`${org.id}_order`][`m_${s_index}_data`] = (o_pl?.[`m_${i}_rodr_data`] ?? 0)
                            o_result['secured'][`${org.id}_sale`][`m_${s_index}_data`] = (o_pl?.[`m_${i}_sale_data`] ?? 0)
                            o_result['secured'][`${org.id}_cnt`][`m_${s_index}_data`] = (o_pl?.[`m_${i}_rodr_cnt`] ?? 0)
                            o_result['secured'][`${org.id}_order`]['total_data'] += o_result['secured'][`${org.id}_order`][`m_${s_index}_data`]
                            o_result['secured'][`${org.id}_sale`]['total_data'] += o_result['secured'][`${org.id}_sale`][`m_${s_index}_data`]
                            o_result['secured'][`${org.id}_cnt`]['total_data'] += o_result['secured'][`${org.id}_cnt`][`m_${s_index}_data`]
                            if(i>=i_index && i_month !== 12){
                                o_result['not_secured'][`${org.id}_order`][`m_${s_index}_data`] = (o_not_pl?.[`m_${i}_rodr_data`] ?? 0)
                                o_result['not_secured'][`${org.id}_sale`][`m_${s_index}_data`] = (o_not_pl?.[`m_${i}_sale_data`] ?? 0)
                                o_result['not_secured'][`${org.id}_cnt`][`m_${s_index}_data`] = (o_not_pl?.[`m_${i}_rodr_cnt`] ?? 0)
                                o_result['not_secured'][`${org.id}_order`]['total_data'] += o_result['not_secured'][`${org.id}_order`][`m_${s_index}_data`]
                                o_result['not_secured'][`${org.id}_sale`]['total_data'] += o_result['not_secured'][`${org.id}_sale`][`m_${s_index}_data`]
                                o_result['not_secured'][`${org.id}_cnt`]['total_data'] += o_result['not_secured'][`${org.id}_cnt`][`m_${s_index}_data`]
                            }
                        }
                    if(i_month === 12){
                        o_result['not_secured'][`${org.id}_order`]['total_data'] = 0
                        o_result['not_secured'][`${org.id}_sale`]['total_data'] = 0
                        o_result['not_secured'][`${org.id}_cnt`]['total_data'] = 0
                    }
                })
            }else if(type === 'deal'){
                let a_sum_sale_columns = [];
                let a_sum_rodr_columns = [];
                let a_total_cnt_columns = [];
                let a_not_sum_sale_columns = [];
                let a_not_sum_rodr_columns = [];
                let a_not_total_cnt_columns = [];
                let a_where_condition = [];
                let a_not_where_condition = [];

                for(let i=12; i>=1; i--){
                    if(i>=i_index){
                        a_not_total_cnt_columns.push(`sum(case when rodr_m${i}_amt = 0 then 0 else 1 end)`)
                        a_not_sum_sale_columns.push(`sum(sale_m${i}_amt)`)
                        a_not_sum_rodr_columns.push(`sum(rodr_m${i}_amt)`)
                        a_not_where_condition.push(`rodr_m${i}_amt`)
                    }
                    a_total_cnt_columns.push(`sum(case when rodr_m${i}_amt = 0 then 0 else 1 end)`)
                    a_sum_sale_columns.push(`sum(sale_m${i}_amt)`)
                    a_sum_rodr_columns.push(`sum(rodr_m${i}_amt)`)
                    a_where_condition.push(`rodr_m${i}_amt`)
                }
                let s_not_total_cnt_column = i_month===12 ? `0 as total_rodr_cnt` : `(${a_not_total_cnt_columns.join(' + ')}) as total_rodr_cnt`
                let s_not_sum_sale_column = i_month===12 ? `0 as sale_amount_sum` : `(${a_not_sum_sale_columns.join(' + ')}) as sale_amount_sum`
                let s_not_sum_rodr_column = i_month===12 ? `0 as rodr_amount_sum` : `(${a_not_sum_rodr_columns.join(' + ')}) as rodr_amount_sum`
                let s_total_cnt_column = `(${a_total_cnt_columns.join(' + ')}) as total_rodr_cnt`
                let s_sum_sale_column = `(${a_sum_sale_columns.join(' + ')}) as sale_amount_sum`
                let s_sum_rodr_column = `(${a_sum_rodr_columns.join(' + ')}) as rodr_amount_sum`

                const pl_col_list = [
                    'deal_stage_cd',
                    s_total_cnt_column,
                    s_sum_sale_column, s_sum_rodr_column
                ];
                const pl_not_col_list = [
                    'deal_stage_cd',
                    s_not_total_cnt_column,
                    s_not_sum_sale_column, s_not_sum_rodr_column
                ];

                let pl_where_conditions = { 'year': year, 'weekly_yn': false, 'deal_stage_cd': { in: a_secured_data } };
                let pl_not_where_conditions = { 'year': year, 'weekly_yn': false, 'deal_stage_cd': { in: a_not_secured_data } };
                
                if(i_month !== 12){
                    let s_where_condition = {[`${a_where_condition.join(' + ')}`]:{'!=':0}}
                    let s_not_where_condition = {[`${a_not_where_condition.join(' + ')}`]:{'!=':0}}
                    pl_where_conditions = {...pl_where_conditions,...s_where_condition}
                    pl_not_where_conditions = {...pl_not_where_conditions,...s_not_where_condition}
                }
                const pl_groupBy_cols = ['deal_stage_cd'];
                let pl_column = !org_col_nm.includes("lv") ? [...pl_col_list, 'hdqt_id as id', 'hdqt_name as name'] : [...pl_col_list, 'div_id as id', 'div_name as name'];
                let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id }
                let pl_not_column = !org_col_nm.includes("lv") ? [...pl_not_col_list, 'hdqt_id as id', 'hdqt_name as name'] : [...pl_not_col_list, 'div_id as id', 'div_name as name'];
                let pl_not_where = org_col_nm === 'lv1_id' ? pl_not_where_conditions : { ...pl_not_where_conditions, [org_col_nm]: org_id }
                let pl_groupBy = !org_col_nm.includes("lv") ? [...pl_groupBy_cols, 'hdqt_id', 'hdqt_name'] : [...pl_groupBy_cols, 'div_id', 'div_name'];

                // DB 쿼리 실행 (병렬)
                const [pl_data, pl_not_data, org_data] = await Promise.all([
                    SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                    SELECT.from(pl_view).columns(pl_not_column).where(pl_not_where).groupBy(...pl_groupBy),
                    SELECT.from(org_full_level).columns(org_column).where(org_where).groupBy(...org_groupBy).orderBy('org_order')
                ])
                
                org_data.forEach(org => {
                    let a_pl = pl_data.filter(pl => pl.id === org.id);
                    let a_not_pl = pl_not_data.filter(pl => pl.id === org.id);
                    o_result['org'].push({ org_name: org.name, org_id: org.id })
                    if (!o_result['secured'][`${org.id}_order`]) {
                        o_result['secured'][`${org.id}_order`] = { display_order: (org?.org_order ?? 0), item_order: 1, org_name: org.name, org_id: org.id, type: '수주', total_data: 0 }
                        o_result['secured'][`${org.id}_sale`] = { display_order: (org?.org_order ?? 0), item_order: 2, org_name: org.name, org_id: org.id, type: '매출', total_data: 0 }
                        o_result['secured'][`${org.id}_cnt`] = { display_order: (org?.org_order ?? 0), item_order: 3, org_name: org.name, org_id: org.id, type: '건수', total_data: 0 }
                        o_result['not_secured'][`${org.id}_order`] = { display_order: (org?.org_order ?? 0), item_order: 1, org_name: org.name, org_id: org.id, type: '수주', total_data: 0 }
                        o_result['not_secured'][`${org.id}_sale`] = { display_order: (org?.org_order ?? 0), item_order: 2, org_name: org.name, org_id: org.id, type: '매출', total_data: 0 }
                        o_result['not_secured'][`${org.id}_cnt`] = { display_order: (org?.org_order ?? 0), item_order: 3, org_name: org.name, org_id: org.id, type: '건수', total_data: 0 }
                    }
                    a_secured_data.forEach(code => {
                        let s_data_column = code.toLowerCase().replace('-', '_').replace(' ', '_') + '_data';
                        const o_deal_pl = a_pl.find(pl => pl.deal_stage_cd === code);
                        o_result['secured'][`${org.id}_order`][`${s_data_column}`] = o_deal_pl?.rodr_amount_sum ?? 0
                        o_result['secured'][`${org.id}_sale`][`${s_data_column}`] = o_deal_pl?.sale_amount_sum ?? 0
                        o_result['secured'][`${org.id}_cnt`][`${s_data_column}`] = o_deal_pl?.total_rodr_cnt ?? 0
                        o_result['secured'][`${org.id}_order`]['total_data'] += o_deal_pl?.rodr_amount_sum ?? 0
                        o_result['secured'][`${org.id}_sale`]['total_data'] += o_deal_pl?.sale_amount_sum ?? 0
                        o_result['secured'][`${org.id}_cnt`]['total_data'] += o_deal_pl?.total_rodr_cnt ?? 0
                    })
                    a_not_secured_data.forEach(code => {
                        let s_data_column = code.toLowerCase().replace('-', '_').replace(' ', '_') + '_data';
                        const o_deal_pl = a_not_pl.find(pl => pl.deal_stage_cd === code);
                        o_result['not_secured'][`${org.id}_order`][`${s_data_column}`] = o_deal_pl?.rodr_amount_sum ?? 0
                        o_result['not_secured'][`${org.id}_sale`][`${s_data_column}`] = o_deal_pl?.sale_amount_sum ?? 0
                        o_result['not_secured'][`${org.id}_cnt`][`${s_data_column}`] = o_deal_pl?.total_rodr_cnt ?? 0
                        o_result['not_secured'][`${org.id}_order`]['total_data'] += o_deal_pl?.rodr_amount_sum ?? 0
                        o_result['not_secured'][`${org.id}_sale`]['total_data'] += o_deal_pl?.sale_amount_sum ?? 0
                        o_result['not_secured'][`${org.id}_cnt`]['total_data'] += o_deal_pl?.total_rodr_cnt ?? 0
                    })
                })
            }else if(type === 'rodr'){

                let a_sale_columns = [];
                let a_rodr_columns = [];
                let a_not_sale_columns = [];
                let a_not_rodr_columns = [];
                let i_index = i_month === 12 ? 12 : i_month + 1
                for(let i=12; i>=1; i--){
                    if(i>=i_index){
                        a_not_sale_columns.push(`sale_m${i}_amt`)
                        a_not_rodr_columns.push(`rodr_m${i}_amt`)
                    }
                    a_sale_columns.push(`sale_m${i}_amt`)
                    a_rodr_columns.push(`rodr_m${i}_amt`)
                }
                let s_sale_column = `(${a_sale_columns.join(' + ')})`
                let s_rodr_column = `(${a_rodr_columns.join(' + ')})`
                let s_not_sale_column = `(${a_not_sale_columns.join(' + ')})`
                let s_not_rodr_column = `(${a_not_rodr_columns.join(' + ')})`
                const pl_col_list = ['biz_opp_no'];
                const pl_not_col_list = ['biz_opp_no'];
                if(i_month !== 12){
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} < 100000000 then ${s_not_rodr_column} else 0 end) as rodr_less100mil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 100000000 and ${s_not_rodr_column} <500000000 then ${s_not_rodr_column} else 0 end) as rodr_100mil_500mil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 500000000 and ${s_not_rodr_column} <1000000000 then ${s_not_rodr_column} else 0 end) as rodr_500mil_1bil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 1000000000 and ${s_not_rodr_column} <3000000000 then ${s_not_rodr_column} else 0 end) as rodr_1bil_3bil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 3000000000 and ${s_not_rodr_column} <5000000000 then ${s_not_rodr_column} else 0 end) as rodr_3bil_5bil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 5000000000 and ${s_not_rodr_column} <10000000000 then ${s_not_rodr_column} else 0 end) as rodr_5bil_10bil`)
                    pl_not_col_list.push(`sum(${s_not_rodr_column}) as rodr_total_data`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 10000000000 then ${s_not_rodr_column} else 0 end) as rodr_more10bil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} < 100000000 then ${s_not_sale_column} else 0 end) as sale_less100mil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 100000000 and ${s_not_rodr_column} <500000000 then ${s_not_sale_column} else 0 end) as sale_100mil_500mil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 500000000 and ${s_not_rodr_column} <1000000000 then ${s_not_sale_column} else 0 end) as sale_500mil_1bil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 1000000000 and ${s_not_rodr_column} <3000000000 then ${s_not_sale_column} else 0 end) as sale_1bil_3bil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 3000000000 and ${s_not_rodr_column} <5000000000 then ${s_not_sale_column} else 0 end) as sale_3bil_5bil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 5000000000 and ${s_not_rodr_column} <10000000000 then ${s_not_sale_column} else 0 end) as sale_5bil_10bil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 10000000000 then ${s_not_sale_column} else 0 end) as sale_more10bil`)
                    pl_not_col_list.push(`sum(${s_not_sale_column}) as sale_total_data`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} < 100000000 then 1 else 0 end) as cnt_less100mil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 100000000 and ${s_not_rodr_column} <500000000 then 1 else 0 end) as cnt_100mil_500mil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 500000000 and ${s_not_rodr_column} <1000000000 then 1 else 0 end) as cnt_500mil_1bil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 1000000000 and ${s_not_rodr_column} <3000000000 then 1 else 0 end) as cnt_1bil_3bil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 3000000000 and ${s_not_rodr_column} <5000000000 then 1 else 0 end) as cnt_3bil_5bil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 5000000000 and ${s_not_rodr_column} <10000000000 then 1 else 0 end) as cnt_5bil_10bil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} >= 10000000000 then 1 else 0 end) as cnt_more10bil`)
                    pl_not_col_list.push(`sum(case when ${s_not_rodr_column} > 0 then 1 else 0 end) as cnt_total_data`)            
                }
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
                const pl_where_conditions = { 'year': year, 'weekly_yn': false, 'deal_stage_cd': { in: a_secured_data } };
                const pl_not_where_conditions = { 'year': year, 'weekly_yn': false, 'deal_stage_cd': { in: a_not_secured_data } };
                const pl_groupBy_cols = ['biz_opp_no'];

                let pl_column = !org_col_nm.includes("lv") ? [...pl_col_list, 'hdqt_id as id', 'hdqt_name as name'] : [...pl_col_list, 'div_id as id', 'div_name as name'];
                let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
                let pl_not_column = !org_col_nm.includes("lv") ? [...pl_not_col_list, 'hdqt_id as id', 'hdqt_name as name'] : [...pl_not_col_list, 'div_id as id', 'div_name as name'];
                let pl_not_where = org_col_nm === 'lv1_id' ? pl_not_where_conditions : { ...pl_not_where_conditions, [org_col_nm]: org_id };
                let pl_groupBy = !org_col_nm.includes("lv") ? [...pl_groupBy_cols, 'hdqt_id', 'hdqt_name'] : [...pl_groupBy_cols, 'div_id', 'div_name'];
                // DB 쿼리 실행 (병렬)
                const [pl_data, pl_not_data, org_data] = await Promise.all([
                    SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                    SELECT.from(pl_view).columns(pl_not_column).where(pl_not_where).groupBy(...pl_groupBy),
                    SELECT.from(org_full_level).columns(org_column).where(org_where).groupBy(...org_groupBy).orderBy('org_order')
                ])
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

                org_data.forEach(org => {
                    let a_pl = pl_data.filter(pl => pl.id === org.id);
                    let a_not_pl = pl_not_data.filter(pl => pl.id === org.id);
                    o_result['org'].push({ org_name: org.name, org_id: org.id })
                    if (!o_result['secured'][`${org.id}_order`]) {
                        o_result['secured'][`${org.id}_order`] = { display_order: (org?.org_order ?? 0), item_order: 1, org_name: org.name, org_id: org.id, type: '수주', total_data: 0, ...data_column }
                        o_result['secured'][`${org.id}_sale`] = { display_order: (org?.org_order ?? 0), item_order: 2, org_name: org.name, org_id: org.id, type: '매출', total_data: 0, ...data_column }
                        o_result['secured'][`${org.id}_cnt`] = { display_order: (org?.org_order ?? 0), item_order: 3, org_name: org.name, org_id: org.id, type: '건수', total_data: 0, ...data_column }
                        o_result['not_secured'][`${org.id}_order`] = { display_order: (org?.org_order ?? 0), item_order: 1, org_name: org.name, org_id: org.id, type: '수주', total_data: 0, ...data_column }
                        o_result['not_secured'][`${org.id}_sale`] = { display_order: (org?.org_order ?? 0), item_order: 2, org_name: org.name, org_id: org.id, type: '매출', total_data: 0, ...data_column }
                        o_result['not_secured'][`${org.id}_cnt`] = { display_order: (org?.org_order ?? 0), item_order: 3, org_name: org.name, org_id: org.id, type: '건수', total_data: 0, ...data_column }
                    }
                    a_data_key.forEach(key => {
                        o_result['secured'][`${org.id}_order`][`${key}`] = a_pl.reduce((iSum,oData) => iSum += oData?.[`rodr_${key}`]??0,0);
                        o_result['secured'][`${org.id}_sale`][`${key}`] = a_pl.reduce((iSum,oData) => iSum += oData?.[`sale_${key}`]??0,0);
                        o_result['secured'][`${org.id}_cnt`][`${key}`] = a_pl.reduce((iSum,oData) => iSum += oData?.[`cnt_${key}`]??0,0);
                        o_result['not_secured'][`${org.id}_order`][`${key}`] = a_not_pl.reduce((iSum,oData) => iSum += oData?.[`rodr_${key}`]??0,0);
                        o_result['not_secured'][`${org.id}_sale`][`${key}`] = a_not_pl.reduce((iSum,oData) => iSum += oData?.[`sale_${key}`]??0,0);
                        o_result['not_secured'][`${org.id}_cnt`][`${key}`] = a_not_pl.reduce((iSum,oData) => iSum += oData?.[`cnt_${key}`]??0,0);
                    })
                })
            }

            let a_org = o_result['org']
            let a_secured = Object.values(o_result['secured']);
            let a_not_secured = Object.values(o_result['not_secured']);

            aRes.push({ org: a_org, secured: a_secured, not_secured: a_not_secured });
            // aRes.push({ org: a_org }, { month: a_month }, { deal: a_deal }, { rodr: a_rodr });
            return aRes
            if (typeof type !== "undefined"){
                return aRes[0][type];
            }
            else {
                return aRes;
            }
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}