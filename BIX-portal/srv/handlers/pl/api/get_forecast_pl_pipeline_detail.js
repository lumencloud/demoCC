const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_forecast_pl_pipeline_detail', async (req) => {
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
    
            // function 입력 파라미터 - type 값 month(월기준), deal(deal stage 기준), rodr(수주 금액 기준) 
            const { year, month, org_id, type, display_type } = req.data;
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
    
            /**
             * 부문, 본부 레벨 조회일 경우, 본부별로 조회, 그 외 부문별로 조회
             */
            let org_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? ['hdqt_id as id', 'hdqt_name as name', 'org_order','lv3_ccorg_cd','lv3_id','lv3_name'] : ['div_id as id', 'div_name as name', 'org_order','lv3_ccorg_cd','lv3_id','lv3_name'];
            let org_where = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? { 'hdqt_id': { '!=': null }, and: { [org_col_nm]: org_id }, 'team_id': null } : { 'div_id': { '!=': null }, and: { [org_col_nm]: org_id }, 'hdqt_id': null, 'team_id': null };
            let org_groupBy = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? ['hdqt_id', 'hdqt_name', 'org_order','lv3_ccorg_cd','lv3_id','lv3_name'] : ['div_id', 'div_name', 'org_order','lv3_ccorg_cd','lv3_id','lv3_name'];
    
            let a_not_secured_data = ['Lead', 'Identified', 'Validated', 'Qualified', 'Negotiated']
            let i_index = i_month === 12 ? 12 : i_month + 1
    
            if (type === 'month') {
                //건수 = 수주 건수
                /**
                 * pl 조회 컬럼 - 입력 월 이후 월별 미확보 수주/매출 금액, 총 수주/매출 금액, 수주 건수
                 * 조회 조건 - 년도, 데이터 속성 D(Deal)
                 */
                const pl_col_list = [];
                let a_total_cnt_columns = [];
                for(let i=12; i>=i_index; i--){
                    pl_col_list.push(`sum(sale_m${i}_amt) as m_${i}_sale_data`)
                    pl_col_list.push(`sum(rodr_m${i}_amt) as m_${i}_rodr_data`)
                    pl_col_list.push(`sum(case when rodr_m${i}_amt = 0 then 0 else 1 end) as m_${i}_rodr_cnt`)
                    a_total_cnt_columns.push(`sum(case when rodr_m${i}_amt = 0 then 0 else 1 end)`)
                }
                
                let s_total_cnt_column = i_month === 12 ? `0 as total_rodr_cnt` : `(${a_total_cnt_columns.join(' + ')}) as total_rodr_cnt`
                pl_col_list.push(s_total_cnt_column)
    
                const pl_where_conditions = { 'year': year, 'weekly_yn': false, 'deal_stage_cd': { in: a_not_secured_data } };
                const pl_groupBy_cols = [];
                /**
                 * 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
                 * 부문, 본부 레벨 조회일 경우, 본부별로 조회, 그 외 부문별로 조회
                 */
                let pl_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...pl_col_list, 'hdqt_id as id', 'hdqt_name as name'] : [...pl_col_list, 'div_id as id', 'div_name as name'];
                let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id }
                let pl_groupBy = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...pl_groupBy_cols, 'hdqt_id', 'hdqt_name'] : [...pl_groupBy_cols, 'div_id', 'div_name'];
    
                // DB 쿼리 실행 (병렬)
                const [pl_data, org_data] = await Promise.all([
                    SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                    SELECT.from(org_full_level).columns(org_column).where(org_where).groupBy(...org_groupBy)
                ])
                if(display_type !== 'chart' && !pl_data.length){
                    //return req.res.status(204).send();
                return []
                }
    
                /**
                 * 총합데이터
                 */
                let o_total = {
                    order: { display_order: 0, item_order: 1, div_name: org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_name : '합계', div_id: 'total', type: '수주', total_data: 0 },
                    sale: { display_order: 0, item_order: 2, div_name: org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_name : '합계', div_id: 'total', type: '매출', total_data: 0 },
                    count: { display_order: 0, item_order: 3, div_name: org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_name : '합계', div_id: 'total', type: '건수', total_data: 0 },
                }
                if(i_month !== 12){
                    for(let i=12; i>=i_index; i--){
                        const s_index = i.toString().padStart(2, '0')
                        o_total['order'][`m_${s_index}_data`] = pl_data.reduce((iSum, oData) => iSum += (oData?.[`m_${i}_rodr_data`] ?? 0), 0)
                        o_total['sale'][`m_${s_index}_data`] = pl_data.reduce((iSum, oData) => iSum += (oData?.[`m_${i}_sale_data`] ?? 0), 0)
                        o_total['count'][`m_${s_index}_data`] = pl_data.reduce((iSum, oData) => iSum += (oData?.[`m_${i}_rodr_cnt`] ?? 0), 0)
                        o_total['order'][`total_data`] += o_total['order'][`m_${s_index}_data`]
                        o_total['sale'][`total_data`] += o_total['sale'][`m_${s_index}_data`]
                        o_total['count'][`total_data`] += o_total['count'][`m_${s_index}_data`]
                    }
                }else{
                    o_total['order'][`total_data`] = 0
                    o_total['sale'][`total_data`] = 0
                    o_total['count'][`total_data`] = 0
                }
    
                /**
                 * 데이터를 조직별로 정리
                 */
                let o_result = {}
                org_data.forEach(org => {
                    let o_pl = pl_data.find(pl => pl.id === org.id);
                    if(['lv1_id','lv2_id'].includes(org_col_nm) && org.lv3_ccorg_cd === '610000'){
                        if (!o_result[`${org.lv3_ccorg_cd}_order`]) {
                            o_result[`${org.lv3_ccorg_cd}_order`] = { display_order: (org?.org_order ?? 0), item_order: 1, div_name: org.lv3_name, div_id: org.lv3_id, type: '수주', total_data: 0 }
                            o_result[`${org.lv3_ccorg_cd}_sale`] = { display_order: (org?.org_order ?? 0), item_order: 2, div_name: org.lv3_name, div_id: org.lv3_id, type: '매출', total_data: 0 }
                            o_result[`${org.lv3_ccorg_cd}_cnt`] = { display_order: (org?.org_order ?? 0), item_order: 3, div_name: org.lv3_name, div_id: org.lv3_id, type: '건수', total_data: 0 }
                        }
                        if(i_month !== 12){
                            for(let i=12; i>=i_index; i--){
                                const s_index = i.toString().padStart(2, '0')
                                o_result[`${org.lv3_ccorg_cd}_order`][`m_${s_index}_data`] = (o_result[`${org.lv3_ccorg_cd}_order`][`m_${s_index}_data`] || 0) + (o_pl?.[`m_${i}_rodr_data`] ?? 0)
                                o_result[`${org.lv3_ccorg_cd}_sale`][`m_${s_index}_data`] = (o_result[`${org.lv3_ccorg_cd}_sale`][`m_${s_index}_data`] || 0) + (o_pl?.[`m_${i}_sale_data`] ?? 0)
                                o_result[`${org.lv3_ccorg_cd}_cnt`][`m_${s_index}_data`] = (o_result[`${org.lv3_ccorg_cd}_cnt`][`m_${s_index}_data`] || 0) + (o_pl?.[`m_${i}_rodr_cnt`] ?? 0)
                                o_result[`${org.lv3_ccorg_cd}_order`][`total_data`] += (o_pl?.[`m_${i}_rodr_data`] ?? 0)
                                o_result[`${org.lv3_ccorg_cd}_sale`][`total_data`] += (o_pl?.[`m_${i}_sale_data`] ?? 0)
                                o_result[`${org.lv3_ccorg_cd}_cnt`][`total_data`] += (o_pl?.[`m_${i}_rodr_cnt`] ?? 0)
                            }
                        }else{
                            o_result[`${org.lv3_ccorg_cd}_order`][`total_data`] = 0
                            o_result[`${org.lv3_ccorg_cd}_sale`][`total_data`] = 0
                            o_result[`${org.lv3_ccorg_cd}_cnt`][`total_data`] = 0
                        }
                    }else{
                        if (!o_result[`${org.id}_order`]) {
                            o_result[`${org.id}_order`] = { display_order: (org?.org_order ?? 0), item_order: 1, div_name: org.name, div_id: org.id, type: '수주', total_data: 0 }
                            o_result[`${org.id}_sale`] = { display_order: (org?.org_order ?? 0), item_order: 2, div_name: org.name, div_id: org.id, type: '매출', total_data: 0 }
                            o_result[`${org.id}_cnt`] = { display_order: (org?.org_order ?? 0), item_order: 3, div_name: org.name, div_id: org.id, type: '건수', total_data: 0 }
                        }
                        if(i_month !== 12){
                            for(let i=12; i>=i_index; i--){
                                const s_index = i.toString().padStart(2, '0')
                                o_result[`${org.id}_order`][`m_${s_index}_data`] = (o_pl?.[`m_${i}_rodr_data`] ?? 0)
                                o_result[`${org.id}_sale`][`m_${s_index}_data`] = (o_pl?.[`m_${i}_sale_data`] ?? 0)
                                o_result[`${org.id}_cnt`][`m_${s_index}_data`] = (o_pl?.[`m_${i}_rodr_cnt`] ?? 0)
                                o_result[`${org.id}_order`][`total_data`] += (o_pl?.[`m_${i}_rodr_data`] ?? 0)
                                o_result[`${org.id}_sale`][`total_data`] += (o_pl?.[`m_${i}_sale_data`] ?? 0)
                                o_result[`${org.id}_cnt`][`total_data`] += (o_pl?.[`m_${i}_rodr_cnt`] ?? 0)
                            }
                        }else{
                            o_result[`${org.id}_order`][`total_data`] = 0
                            o_result[`${org.id}_sale`][`total_data`] = 0
                            o_result[`${org.id}_cnt`][`total_data`] = 0
                        }
                    }
                })
    
                let a_total = Object.values(o_total),
                    a_result = Object.values(o_result);
    
                /**
                 * 본부 레벨이 아닐 경우만 합계 데이터 push
                 */
                if (org_col_nm !== 'hdqt_id') {
                    aRes.push(...a_total);
                }
                aRes.push(...a_result);
    
            } else if (type === 'deal') {
                //건수 = 수주 건수
                /**
                 * pl 조회 컬럼 - 월별 미확보 수주/매출 금액, 총 수주/매출 금액, 수주 건수, Deal Stage 코드
                 * 조회 조건 - 년도, 데이터 속성 D(Deal)
                 */
                let a_total_cnt_columns = [];
                let a_sale_columns = [];
                let a_rodr_columns = [];
                for(let i=12; i>=i_index; i--){
                    a_total_cnt_columns.push(`rodr_m${i}_amt`)
                    a_sale_columns.push(`sum(sale_m${i}_amt)`)
                    a_rodr_columns.push(`sum(rodr_m${i}_amt)`)
                }
                let s_total_cnt_column = i_month === 12 ? `0 as total_rodr_cnt` : `sum(case when (${a_total_cnt_columns.join(' + ')}) = 0 then 0 else 1 end) as total_rodr_cnt`
                let s_sale_column = i_month === 12 ? `0 as sale_amount_sum` : `(${a_sale_columns.join(' + ')}) as sale_amount_sum`
                let s_rodr_column = i_month === 12 ? `0 as rodr_amount_sum` : `(${a_rodr_columns.join(' + ')}) as rodr_amount_sum`
    
                //'count(biz_opp_no_sfdc) as rodr_cnt',
                const pl_col_list = [
                    'deal_stage_cd',
                    s_sale_column, s_rodr_column, s_total_cnt_column
                ];
                // 미확보 스테이지 조건 추가 ['Lead', 'Identified', 'Validated', 'Qualified', 'Negotiated']
                //, [s_deal_where_condition]: { '!=': 0 }
                const pl_where_conditions = { 'year': year, 'weekly_yn': false, 'deal_stage_cd': { in: a_not_secured_data } };
                const pl_groupBy_cols = ['deal_stage_cd'];
    
                /**
                 * 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
                 * 부문, 본부 레벨 조회일 경우, 본부별로 조회, 그 외 부문별로 조회
                 */
                let pl_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...pl_col_list, 'hdqt_id as id', 'hdqt_name as name'] : [...pl_col_list, 'div_id as id', 'div_name as name'];
                let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id }
                let pl_groupBy = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...pl_groupBy_cols, 'hdqt_id', 'hdqt_name'] : [...pl_groupBy_cols, 'div_id', 'div_name'];
    
                /**
                 * common.code_header [code 정보]
                 */
                const code = db.entities('common').code_header;
    
                // DB 쿼리 실행 (병렬)
                const [pl_data, aCodeHeader, org_data] = await Promise.all([
                    SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                    SELECT.from(code).where({ category: "deal_stage_code" }).columns(header => { header.items(item => { item.value }) }),
                    SELECT.from(org_full_level).columns(org_column).where(org_where).groupBy(...org_groupBy)
                ])
                if(display_type !== 'chart' && !pl_data.length){
                    //return req.res.status(204).send();
                return []
                }
    
                /**
                 * Deal Stage item 데이터
                 */
                const aDealCode = aCodeHeader[0].items
    
                /**
                 * 총합데이터
                 */
                let o_total = {
                    order: { display_order: 0, item_order: 1, div_name: '합계', div_id: 'total', type: '수주', not_secured_total: 0 },
                    sale: { display_order: 0, item_order: 2, div_name: '합계', div_id: 'total', type: '매출', not_secured_total: 0 },
                    count: { display_order: 0, item_order: 3, div_name: '합계', div_id: 'total', type: '건수', not_secured_total: 0 },
                }
                o_total['order'][`not_secured_total`] = pl_data.reduce((iSum, oData) => iSum += oData.rodr_amount_sum, 0)
                o_total['sale'][`not_secured_total`] = pl_data.reduce((iSum, oData) => iSum += oData.sale_amount_sum, 0)
                o_total['count'][`not_secured_total`] = pl_data.reduce((iSum, oData) => iSum += oData.total_rodr_cnt, 0)
    
                let o_result = {}
    
                /**
                 * 데이터를 조직별로 정리
                 */
                org_data.forEach(org => {
                    
                    if(['lv1_id','lv2_id'].includes(org_col_nm) && org.lv3_ccorg_cd === '610000'){
                        if (!o_result[`${org.lv3_ccorg_cd}_order`]) {
                            o_result[`${org.lv3_ccorg_cd}_order`] = { display_order: (org?.org_order ?? 0), item_order: 1, div_name: org.lv3_name, div_id: org.lv3_ccorg_cd, type: '수주', not_secured_total: 0 }
                            o_result[`${org.lv3_ccorg_cd}_sale`] = { display_order: (org?.org_order ?? 0), item_order: 2, div_name: org.lv3_name, div_id: org.lv3_ccorg_cd, type: '매출', not_secured_total: 0 }
                            o_result[`${org.lv3_ccorg_cd}_count`] = { display_order: (org?.org_order ?? 0), item_order: 3, div_name: org.lv3_name, div_id: org.lv3_ccorg_cd, type: '건수', not_secured_total: 0 }
                        }
                        aDealCode.forEach(o_code => {
                            let s_data_column = o_code.value.toLowerCase().replace('-', '_').replace(' ', '_') + '_data';
                            let o_pl = pl_data.find(pl => pl.id === org.id && pl.deal_stage_cd === o_code.value);
                            o_result[`${org.lv3_ccorg_cd}_order`][`${s_data_column}`] = (o_result[`${org.lv3_ccorg_cd}_order`][`${s_data_column}`] || 0) + (o_pl?.rodr_amount_sum ?? 0)
                            o_result[`${org.lv3_ccorg_cd}_sale`][`${s_data_column}`] = (o_result[`${org.lv3_ccorg_cd}_sale`][`${s_data_column}`] || 0) + (o_pl?.sale_amount_sum ?? 0)
                            o_result[`${org.lv3_ccorg_cd}_count`][`${s_data_column}`] = (o_result[`${org.lv3_ccorg_cd}_count`][`${s_data_column}`] || 0) + (o_pl?.total_rodr_cnt ?? 0)
                            o_result[`${org.lv3_ccorg_cd}_order`]['not_secured_total'] = (o_result[`${org.lv3_ccorg_cd}_order`]['not_secured_total'] || 0) + (o_pl?.rodr_amount_sum ?? 0)
                            o_result[`${org.lv3_ccorg_cd}_sale`]['not_secured_total'] = (o_result[`${org.lv3_ccorg_cd}_sale`]['not_secured_total'] || 0) + (o_pl?.sale_amount_sum ?? 0)
                            o_result[`${org.lv3_ccorg_cd}_count`]['not_secured_total'] = (o_result[`${org.lv3_ccorg_cd}_count`]['not_secured_total'] || 0) + (o_pl?.total_rodr_cnt ?? 0)
                            o_total[`order`][`${s_data_column}`] = (o_total[`order`][`${s_data_column}`] || 0) + (o_pl?.rodr_amount_sum ?? 0)
                            o_total[`sale`][`${s_data_column}`] = (o_total[`sale`][`${s_data_column}`] || 0) + (o_pl?.sale_amount_sum ?? 0)
                            o_total[`count`][`${s_data_column}`] = (o_total[`count`][`${s_data_column}`] || 0) + (o_pl?.total_rodr_cnt ?? 0)
                        })
                    }else{
                        if (!o_result[`${org.id}_order`]) {
                            o_result[`${org.id}_order`] = { display_order: (org?.org_order ?? 0), item_order: 1, div_name: org.name, div_id: org.id, type: '수주', not_secured_total: 0 }
                            o_result[`${org.id}_sale`] = { display_order: (org?.org_order ?? 0), item_order: 2, div_name: org.name, div_id: org.id, type: '매출', not_secured_total: 0 }
                            o_result[`${org.id}_count`] = { display_order: (org?.org_order ?? 0), item_order: 3, div_name: org.name, div_id: org.id, type: '건수', not_secured_total: 0 }
                            aDealCode.forEach(o_code => {
                                let s_data_column = o_code.value.toLowerCase().replace('-', '_').replace(' ', '_') + '_data';
                                let o_pl = pl_data.find(pl => pl.id === org.id && pl.deal_stage_cd === o_code.value);
                                o_result[`${org.id}_order`][`${s_data_column}`] = (o_result[`${org.id}_order`][`${s_data_column}`] || 0) + (o_pl?.rodr_amount_sum ?? 0)
                                o_result[`${org.id}_sale`][`${s_data_column}`] = (o_result[`${org.id}_sale`][`${s_data_column}`] || 0) + (o_pl?.sale_amount_sum ?? 0)
                                o_result[`${org.id}_count`][`${s_data_column}`] = (o_result[`${org.id}_count`][`${s_data_column}`] || 0) + (o_pl?.total_rodr_cnt ?? 0)
                                o_result[`${org.id}_order`]['not_secured_total'] = (o_result[`${org.id}_order`]['not_secured_total'] || 0) + (o_pl?.rodr_amount_sum ?? 0)
                                o_result[`${org.id}_sale`]['not_secured_total'] = (o_result[`${org.id}_sale`]['not_secured_total'] || 0) + (o_pl?.sale_amount_sum ?? 0)
                                o_result[`${org.id}_count`]['not_secured_total'] = (o_result[`${org.id}_count`]['not_secured_total'] || 0) + (o_pl?.total_rodr_cnt ?? 0)
                                o_total[`order`][`${s_data_column}`] = (o_total[`order`][`${s_data_column}`] || 0) + (o_pl?.rodr_amount_sum ?? 0)
                                o_total[`sale`][`${s_data_column}`] = (o_total[`sale`][`${s_data_column}`] || 0) + (o_pl?.sale_amount_sum ?? 0)
                                o_total[`count`][`${s_data_column}`] = (o_total[`count`][`${s_data_column}`] || 0) + (o_pl?.total_rodr_cnt ?? 0)
                            })
                        }
                    }
                })
    
                let a_total = Object.values(o_total),
                    a_result = Object.values(o_result);
    
                /**
                 * 본부 레벨이 아닐 경우만 합계 데이터 push
                 */
                if (org_col_nm !== 'hdqt_id') {
                    aRes.push(...a_total);
                }
    
                aRes.push(...a_result);
    
            } else if (type === 'rodr') {
                //건수 = 수주 건수
                const pl_col_list = ['biz_opp_no'];
                let a_sale_columns = [];
                let a_rodr_columns = [];
                if(i_month !== 12){
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
                const pl_where_conditions = { 'year': year, 'weekly_yn': false, 'deal_stage_cd': { in: a_not_secured_data } };
                const pl_groupBy_cols = ['biz_opp_no'];
                let pl_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...pl_col_list, 'hdqt_id as id', 'hdqt_name as name'] :  [...pl_col_list, 'div_id as id', 'div_name as name'];
                let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
                let pl_groupBy = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...pl_groupBy_cols, 'hdqt_id', 'hdqt_name'] : [...pl_groupBy_cols, 'div_id', 'div_name'];
    
                //pl 데이터 얻기
                const [pl_data, org_data] = await Promise.all([
                    SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                    SELECT.from(org_full_level).columns(org_column).where(org_where).groupBy(...org_groupBy)
                ])
                if(display_type !== 'chart' && !pl_data.length){
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
                    order: { display_order: 0, item_order: 1, div_name: org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_name : '합계', div_id: 'total', type: '수주', ...data_column },
                    sale: { display_order: 0, item_order: 2, div_name: org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_name : '합계', div_id: 'total', type: '매출', ...data_column },
                    cnt: { display_order: 0, item_order: 3, div_name: org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_name : '합계', div_id: 'total', type: '건수', ...data_column },
                }
                a_data_key.forEach(key => {
                    o_total['order'][`${key}`] = pl_data.reduce((iSum,oData) => iSum += oData?.[`rodr_${key}`]??0,0);
                    o_total['sale'][`${key}`] = pl_data.reduce((iSum,oData) => iSum += oData?.[`sale_${key}`]??0,0);
                    o_total['cnt'][`${key}`] = pl_data.reduce((iSum,oData) => iSum += oData?.[`cnt_${key}`]??0,0);
                })
    
                let o_result = {}
    
                org_data.forEach(org => {
                    let o_pl = pl_data.filter(pl => pl.id === org.id);
                    if(['lv1_id','lv2_id'].includes(org_col_nm) && org.lv3_ccorg_cd === '610000'){
                        if (!o_result[`${org.lv3_ccorg_cd}_order`]) {
                            o_result[`${org.lv3_ccorg_cd}_order`] = { display_order: (org?.org_order ?? 0), item_order: 1, div_name: org.lv3_name, div_id: org.lv3_ccorg_cd, type: '수주', ...data_column }
                            o_result[`${org.lv3_ccorg_cd}_sale`] = { display_order: (org?.org_order ?? 0), item_order: 2, div_name: org.lv3_name, div_id: org.lv3_ccorg_cd, type: '매출', ...data_column }
                            o_result[`${org.lv3_ccorg_cd}_cnt`] = { display_order: (org?.org_order ?? 0), item_order: 3, div_name: org.lv3_name, div_id: org.lv3_ccorg_cd, type: '건수', ...data_column }
                        }
                        a_data_key.forEach(key => {
                            o_result[`${org.lv3_ccorg_cd}_order`][`${key}`] += o_pl.reduce((iSum,oData) => iSum += oData?.[`rodr_${key}`]??0,0);
                            o_result[`${org.lv3_ccorg_cd}_sale`][`${key}`] += o_pl.reduce((iSum,oData) => iSum += oData?.[`sale_${key}`]??0,0);
                            o_result[`${org.lv3_ccorg_cd}_cnt`][`${key}`] += o_pl.reduce((iSum,oData) => iSum += oData?.[`cnt_${key}`]??0,0);
                        })
                    }else{
                        if (!o_result[`${org.id}_order`]) {
                            o_result[`${org.id}_order`] = { display_order: (org?.org_order ?? 0), item_order: 1, div_name: org.name, div_id: org.id, type: '수주', ...data_column }
                            o_result[`${org.id}_sale`] = { display_order: (org?.org_order ?? 0), item_order: 2, div_name: org.name, div_id: org.id, type: '매출', ...data_column }
                            o_result[`${org.id}_cnt`] = { display_order: (org?.org_order ?? 0), item_order: 3, div_name: org.name, div_id: org.id, type: '건수', ...data_column }
            
                            a_data_key.forEach(key => {
                                o_result[`${org.id}_order`][`${key}`] = o_pl.reduce((iSum,oData) => iSum += oData?.[`rodr_${key}`]??0,0);
                                o_result[`${org.id}_sale`][`${key}`] = o_pl.reduce((iSum,oData) => iSum += oData?.[`sale_${key}`]??0,0);
                                o_result[`${org.id}_cnt`][`${key}`] = o_pl.reduce((iSum,oData) => iSum += oData?.[`cnt_${key}`]??0,0);
                            })
                        }
                    }
                })
    
                let a_total = Object.values(o_total),
                    a_result = Object.values(o_result);
    
                if (org_col_nm === 'hdqt_id' || org_col_nm === 'team_id') {
                    aRes.push(...a_total);
                } else {
                    aRes.push(...a_total, ...a_result);
                }
            } else {
                return;
            }
    
            let aSortFields = [
                { field: "display_order", order: "asc" },
                { field: "item_order", order: "asc" },
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
    
            return aRes
        } catch(error) { 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}