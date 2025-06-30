module.exports = (srv) => {
    srv.on('get_forecast_pl_pipeline_account', async (req) => {
        // function 호출 리턴 객체
        const aRes = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        /**
         * pl.wideview_view [실적]
         * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl').wideview_view;
        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;
        /**
         * account 정보
         */
        const common_account = db.entities('common').account;

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

        if (type === 'month') {
            //건수 = 수주 건수
            const pl_col_list = [
                'biz_tp_account_cd',
                `sum(ifnull(sale_year_amt,0)) as sale_amount_sum`,
                `sum(ifnull(rodr_year_amt,0)) as rodr_amount_sum`,
            ];
            let a_total_cnt_columns = [];
            let i_index = i_month === 12? 12 : i_month+1
            for (let i = i_index; i <= 12; i++) {
                pl_col_list.push(`sum(ifnull(sale_m${i}_amt,0)) as m_${i}_sale_data`)
                pl_col_list.push(`sum(ifnull(rodr_m${i}_amt,0)) as m_${i}_rodr_data`)
                pl_col_list.push(`sum(case when ifnull(rodr_m${i}_amt,0) = 0 then 0 else 1 end) as m_${i}_rodr_cnt`)
                a_total_cnt_columns.push(`sum(case when ifnull(rodr_m${i}_amt,0) = 0 then 0 else 1 end)`)
            }
            let s_total_cnt_column = `(${a_total_cnt_columns.join(' + ')}) as total_rodr_cnt`
            pl_col_list.push(s_total_cnt_column)
            const pl_where_conditions = { 'year': year, 'src_type': {'=':'D'} };
            const pl_groupBy_cols = ['biz_tp_account_cd'];

            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };

            //pl 데이터 얻기
            const pl_data = await SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols);

            let o_result = {}
            let o_total = {
                order: { display_order: 1, item_order: 1, div_name: '합계', div_id: 'total', type: '수주' },
                sale: { display_order: 1, item_order: 2, div_name: '합계', div_id: 'total', type: '매출' },
                count: { display_order: 1, item_order: 3, div_name: '합계', div_id: 'total', type: '건수' },
            }

            o_total['order'][`total_data`] = pl_data.reduce((iSum,oData)=>iSum += oData.rodr_amount_sum,0)
            o_total['sale'][`total_data`] = pl_data.reduce((iSum,oData)=>iSum += oData.sale_amount_sum,0)
            o_total['count'][`total_data`] = pl_data.reduce((iSum,oData)=>iSum += oData.total_rodr_cnt,0)

            pl_data.forEach(o_pl => {
                let o_account = account_query.find(account => account.biz_tp_account_cd === o_pl.biz_tp_account_cd)
                if (o_account) {
                    if (!o_result[`${o_pl.biz_tp_account_cd}_order`]) {
                        o_result[`${o_pl.biz_tp_account_cd}_order`] = { display_order: o_account.sort_order + 1, item_order: 1, div_name: o_account.biz_tp_account_nm, div_id: o_account.biz_tp_account_cd, type: '수주', total_data: o_pl.rodr_amount_sum }
                        o_result[`${o_pl.biz_tp_account_cd}_sale`] = { display_order: o_account.sort_order + 1, item_order: 2, div_name: o_account.biz_tp_account_nm, div_id: o_account.biz_tp_account_cd, type: '매출', total_data: o_pl.sale_amount_sum }
                        o_result[`${o_pl.biz_tp_account_cd}_cnt`] = { display_order: o_account.sort_order + 1, item_order: 3, div_name: o_account.biz_tp_account_nm, div_id: o_account.biz_tp_account_cd, type: '건수', total_data: o_pl.total_rodr_cnt }
                    }
                    for (let i = 12; i > Number(month); i--) {
                        const s_index = i.toString().padStart(2, '0')
                        o_result[`${o_pl.biz_tp_account_cd}_order`][`m_${s_index}_data`] = o_pl[`m_${i}_rodr_data`]
                        o_result[`${o_pl.biz_tp_account_cd}_sale`][`m_${s_index}_data`] = o_pl[`m_${i}_sale_data`]
                        o_result[`${o_pl.biz_tp_account_cd}_cnt`][`m_${s_index}_data`] = o_pl[`m_${i}_rodr_cnt`]
                        o_total['order'][`m_${s_index}_data`] = (o_total['order'][`m_${s_index}_data`] || 0) + o_pl[`m_${i}_rodr_data`]
                        o_total['sale'][`m_${s_index}_data`] = (o_total['sale'][`m_${s_index}_data`] || 0) + o_pl[`m_${i}_sale_data`]
                        o_total['count'][`m_${s_index}_data`] = (o_total['count'][`m_${s_index}_data`] || 0) + o_pl[`m_${i}_rodr_cnt`]
                    }
                }
            })
            let a_total = Object.values(o_total),
                a_result = Object.values(o_result);

            aRes.push(...a_total, ...a_result);
        } else if (type === 'deal') {
            //건수 = 수주 건수
            //컬럼 구성
            const pl_col_list = [
                'biz_tp_account_cd',
                `sum(ifnull(sale_year_amt,0)) as sale_amount_sum`,
                `sum(ifnull(rodr_year_amt,0)) as rodr_amount_sum`,
                'deal_stage_cd'
            ];
            let a_total_cnt_columns = [];
            let i_index = i_month === 12? 12 : i_month+1
            for (let i = i_index; i <= 12; i++) {
                a_total_cnt_columns.push(`sum(case when ifnull(rodr_m${i}_amt,0) = 0 then 0 else 1 end)`)
            }
            let s_total_cnt_column = `(${a_total_cnt_columns.join(' + ')}) as total_rodr_cnt`
            pl_col_list.push(s_total_cnt_column)
            //임시로 'biz_opp_no': {'!=':null} 일단은 제거
            const pl_where_conditions = { 'year': year, 'src_type': {'=':'D'},'deal_stage_cd':{'!=':null,and:{'deal_stage_cd':{'!=':''}}}};
            const pl_groupBy_cols = ['deal_stage_cd', 'biz_tp_account_cd'];

            const code = db.entities('common').code_header;

            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };

            //pl 데이터 얻기
            const [pl_data, aCodeHeader] = await Promise.all([
                SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols),
                SELECT.from(code).where({ category: "deal_stage_code" }).columns(header => { header.items(item => { item.value }) })
            ])
            const aDealCode = aCodeHeader[0].items
            
            //Lead Identified Validated Qualified Negotiated

            let o_total = {
                order: { display_order: 0, item_order: 1, div_name: '합계', div_id: 'total', type: '수주', total_data: 0, not_secured_total:0 },
                sale: { display_order: 0, item_order: 2, div_name: '합계', div_id: 'total', type: '매출', total_data: 0, not_secured_total:0 },
                count: { display_order: 0, item_order: 3, div_name: '합계', div_id: 'total', type: '건수', total_data: 0, not_secured_total:0 },
            }

            o_total['order'][`total_data`] = pl_data.reduce((iSum,oData)=>iSum += oData.rodr_amount_sum,0)
            o_total['sale'][`total_data`] = pl_data.reduce((iSum,oData)=>iSum += oData.sale_amount_sum,0)
            o_total['count'][`total_data`] = pl_data.reduce((iSum,oData)=>iSum += oData.total_rodr_cnt,0)
            let o_result = {}
            let a_not_secured_data= ['Lead', 'Identified', 'Validated', 'Qualified', 'Negotiated']
            pl_data.forEach(o_pl => {
                let o_account = account_query.find(account => account.biz_tp_account_cd === o_pl.biz_tp_account_cd)
                if (o_account) {
                    if (!o_result[`${o_pl.biz_tp_account_cd}_order`]) {
                        o_result[`${o_pl.biz_tp_account_cd}_order`] = { display_order: o_account.sort_order, item_order: 1, div_name: o_account.biz_tp_account_nm, div_id: o_account.biz_tp_account_cd, type: '수주', total_data: 0, not_secured_total:0 }
                        o_result[`${o_pl.biz_tp_account_cd}_sale`] = { display_order: o_account.sort_order, item_order: 2, div_name: o_account.biz_tp_account_nm, div_id: o_account.biz_tp_account_cd, type: '매출', total_data: 0, not_secured_total:0 }
                        o_result[`${o_pl.biz_tp_account_cd}_count`] = { display_order: o_account.sort_order, item_order: 3, div_name: o_account.biz_tp_account_nm, div_id: o_account.biz_tp_account_cd, type: '건수', total_data: 0, not_secured_total:0 }
                        aDealCode.forEach(o_code => {
                            let s_data_column = o_code.value.toLowerCase().replace('-', '_').replace(' ', '_') + '_data';
                            o_result[`${o_pl.biz_tp_account_cd}_order`][`${s_data_column}`] = 0
                            o_result[`${o_pl.biz_tp_account_cd}_sale`][`${s_data_column}`] = 0
                            o_result[`${o_pl.biz_tp_account_cd}_count`][`${s_data_column}`] = 0
                            if (!o_total[`order`][`${s_data_column}`]) {
                                o_total[`order`][`${s_data_column}`] = 0
                                o_total[`sale`][`${s_data_column}`] = 0
                                o_total[`count`][`${s_data_column}`] = 0
                            }
                        })
                    }
                    let s_data_column = o_pl.deal_stage_cd.toLowerCase().replace('-', '_').replace(' ', '_') + '_data';
                    o_result[`${o_pl.biz_tp_account_cd}_order`][`${s_data_column}`] = o_pl.rodr_amount_sum
                    o_result[`${o_pl.biz_tp_account_cd}_sale`][`${s_data_column}`] = o_pl.sale_amount_sum
                    o_result[`${o_pl.biz_tp_account_cd}_count`][`${s_data_column}`] = o_pl.total_rodr_cnt
                    o_result[`${o_pl.biz_tp_account_cd}_order`]['total_data'] += o_pl.rodr_amount_sum
                    o_result[`${o_pl.biz_tp_account_cd}_sale`]['total_data'] += o_pl.sale_amount_sum
                    o_result[`${o_pl.biz_tp_account_cd}_count`]['total_data'] += o_pl.total_rodr_cnt

                    o_total[`order`][`${s_data_column}`] += o_pl.rodr_amount_sum
                    o_total[`sale`][`${s_data_column}`] += o_pl.sale_amount_sum
                    o_total[`count`][`${s_data_column}`] += o_pl.total_rodr_cnt
                    if(a_not_secured_data.includes(o_pl.deal_stage_cd)){
                        o_result[`${o_pl.biz_tp_account_cd}_order`]['not_secured_total'] += o_pl.rodr_amount_sum
                        o_result[`${o_pl.biz_tp_account_cd}_sale`]['not_secured_total'] += o_pl.sale_amount_sum
                        o_result[`${o_pl.biz_tp_account_cd}_count`]['not_secured_total'] += o_pl.total_rodr_cnt
                        o_total[`order`]['not_secured_total'] += o_pl.rodr_amount_sum
                        o_total[`sale`]['not_secured_total'] += o_pl.sale_amount_sum
                        o_total[`count`]['not_secured_total'] += o_pl.total_rodr_cnt
                    }
                }
            })
            let a_total = Object.values(o_total), // 합계 필요한 경우 추가
                a_result = Object.values(o_result);

            aRes.push(...a_total,...a_result);
        } else if (type === 'rodr') {
            //건수 = 수주 건수
            const pl_col_list = ['biz_tp_account_cd'];
            for (let i = 1; i <= 12; i++) {
                pl_col_list.push(`ifnull(sale_m${i}_amt,0) as m_${i}_sale_data`)
                pl_col_list.push(`ifnull(rodr_m${i}_amt,0) as m_${i}_rodr_data`)
            }
            const pl_where_conditions = { 'year': year, 'src_type': {'=':'D'} };
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };

            //pl 데이터 얻기
            const pl_data = await SELECT.from(pl_view).columns(pl_col_list).where(pl_where);
            
            const data_column = {
                'total_data': 0,
                'less100mil': 0,
                '100mil-500mil': 0,
                '500mil-1bil': 0,
                '1bil-3bil': 0,
                '3bil-5bil': 0,
                '5bil-10bil': 0,
                'more10bil': 0
            }
            let o_total = {
                order: { display_order: 1, item_order: 1, div_name: '합계', div_id: 'total', type: '수주', ...data_column },
                sale: { display_order: 1, item_order: 2, div_name: '합계', div_id: 'total', type: '매출', ...data_column },
                count: { display_order: 1, item_order: 3, div_name: '합계', div_id: 'total', type: '건수', ...data_column },
            }
            pl_data.forEach(pl => {
                for(let i = 1; i <= 12; i++){
                    o_total['order'][`total_data`] += pl[`m_${i}_rodr_data`]
                    o_total['sale'][`total_data`] += pl[`m_${i}_sale_data`]
                    if(pl[`m_${i}_rodr_data`]){
                        o_total['count'][`total_data`]++
                    }
                }
            })  

            

            let o_result = {}

            pl_data.forEach(o_pl => {
                let o_account = account_query.find(account => account.biz_tp_account_cd === o_pl.biz_tp_account_cd)
                if (o_account) {
                    if (!o_result[`${o_pl.biz_tp_account_cd}_order`]) {
                        o_result[`${o_pl.biz_tp_account_cd}_order`] = { display_order: o_account.sort_order + 1, item_order: 1, div_name: o_account.biz_tp_account_nm, div_id: o_account.biz_tp_account_cd, type: '수주', ...data_column }
                        o_result[`${o_pl.biz_tp_account_cd}_sale`] = { display_order: o_account.sort_order + 1, item_order: 2, div_name: o_account.biz_tp_account_nm, div_id: o_account.biz_tp_account_cd, type: '매출', ...data_column }
                        o_result[`${o_pl.biz_tp_account_cd}_cnt`] = { display_order: o_account.sort_order + 1, item_order: 3, div_name: o_account.biz_tp_account_nm, div_id: o_account.biz_tp_account_cd, type: '건수', ...data_column }
                    }
                    for (let i = 1; i <= 12; i++) {
                        let i_sale = o_pl[`m_${i}_sale_data`] / 100000000;
                        let i_order = o_pl[`m_${i}_rodr_data`] / 100000000;
                        if (i_sale > 0) {
                            if (i_sale < 1) {
                                o_result[`${o_pl.biz_tp_account_cd}_sale`]['less100mil'] += o_pl[`m_${i}_sale_data`]
                                o_total['sale']['less100mil'] += o_pl[`m_${i}_sale_data`]
                            } else if (i_sale < 5) {
                                o_result[`${o_pl.biz_tp_account_cd}_sale`]['100mil-500mil'] += o_pl[`m_${i}_sale_data`]
                                o_total['sale']['100mil-500mil'] += o_pl[`m_${i}_sale_data`]
                            } else if (i_sale < 10) {
                                o_result[`${o_pl.biz_tp_account_cd}_sale`]['500mil-1bil'] += o_pl[`m_${i}_sale_data`]
                                o_total['sale']['500mil-1bil'] += o_pl[`m_${i}_sale_data`]
                            } else if (i_sale < 30) {
                                o_result[`${o_pl.biz_tp_account_cd}_sale`]['1bil-3bil'] += o_pl[`m_${i}_sale_data`]
                                o_total['sale']['1bil-3bil'] += o_pl[`m_${i}_sale_data`]
                            } else if (i_sale < 50) {
                                o_result[`${o_pl.biz_tp_account_cd}_sale`]['3bil-5bil'] += o_pl[`m_${i}_sale_data`]
                                o_total['sale']['3bil-5bil'] += o_pl[`m_${i}_sale_data`]
                            } else if (i_sale < 100) {
                                o_result[`${o_pl.biz_tp_account_cd}_sale`]['5bil-10bil'] += o_pl[`m_${i}_sale_data`]
                                o_total['sale']['5bil-10bil'] += o_pl[`m_${i}_sale_data`]
                            } else {
                                o_result[`${o_pl.biz_tp_account_cd}_sale`]['more10bil'] += o_pl[`m_${i}_sale_data`]
                                o_total['sale']['more10bil'] += o_pl[`m_${i}_sale_data`]
                            }
                            o_result[`${o_pl.biz_tp_account_cd}_sale`]['total_data'] += o_pl[`m_${i}_sale_data`]
                            // o_total['sale']['total_data'] += o_pl[`m_${i}_sale_data`]
                        }
                        if (i_order > 0) {
                            if (i_order < 1) {
                                o_result[`${o_pl.biz_tp_account_cd}_order`]['less100mil'] += o_pl[`m_${i}_rodr_data`]
                                o_result[`${o_pl.biz_tp_account_cd}_cnt`]['less100mil']++
                                o_total[`order`]['less100mil'] += o_pl[`m_${i}_rodr_data`]
                                o_total[`count`]['less100mil']++
                            } else if (i_order < 5) {
                                o_result[`${o_pl.biz_tp_account_cd}_order`]['100mil-500mil'] += o_pl[`m_${i}_rodr_data`]
                                o_result[`${o_pl.biz_tp_account_cd}_cnt`]['100mil-500mil']++
                                o_total[`order`]['100mil-500mil'] += o_pl[`m_${i}_rodr_data`]
                                o_total[`count`]['100mil-500mil']++
                            } else if (i_order < 10) {
                                o_result[`${o_pl.biz_tp_account_cd}_order`]['500mil-1bil'] += o_pl[`m_${i}_rodr_data`]
                                o_result[`${o_pl.biz_tp_account_cd}_cnt`]['500mil-1bil']++
                                o_total[`order`]['500mil-1bil'] += o_pl[`m_${i}_rodr_data`]
                                o_total[`count`]['500mil-1bil']++
                            } else if (i_order < 30) {
                                o_result[`${o_pl.biz_tp_account_cd}_order`]['1bil-3bil'] += o_pl[`m_${i}_rodr_data`]
                                o_result[`${o_pl.biz_tp_account_cd}_cnt`]['1bil-3bil']++
                                o_total[`order`]['1bil-3bil'] += o_pl[`m_${i}_rodr_data`]
                                o_total[`count`]['1bil-3bil']++
                            } else if (i_order < 50) {
                                o_result[`${o_pl.biz_tp_account_cd}_order`]['3bil-5bil'] += o_pl[`m_${i}_rodr_data`]
                                o_result[`${o_pl.biz_tp_account_cd}_cnt`]['3bil-5bil']++
                                o_total[`order`]['3bil-5bil'] += o_pl[`m_${i}_rodr_data`]
                                o_total[`count`]['3bil-5bil']++
                            } else if (i_order < 100) {
                                o_result[`${o_pl.biz_tp_account_cd}_order`]['5bil-10bil'] += o_pl[`m_${i}_rodr_data`]
                                o_result[`${o_pl.biz_tp_account_cd}_cnt`]['5bil-10bil']++
                                o_total[`order`]['5bil-10bil'] += o_pl[`m_${i}_rodr_data`]
                                o_total[`count`]['5bil-10bil']++
                            } else {
                                o_result[`${o_pl.biz_tp_account_cd}_order`]['more10bil'] += o_pl[`m_${i}_rodr_data`]
                                o_result[`${o_pl.biz_tp_account_cd}_cnt`]['more10bil']++
                                o_total[`order`]['more10bil'] += o_pl[`m_${i}_rodr_data`]
                                o_total[`count`]['more10bil']++
                            }

                            o_result[`${o_pl.biz_tp_account_cd}_order`]['total_data'] += o_pl[`m_${i}_rodr_data`]
                            o_result[`${o_pl.biz_tp_account_cd}_cnt`]['total_data']++
                            // o_total[`order`]['total_data'] += o_pl[`m_${i}_rodr_data`]
                            // o_total[`count`]['total_data']++
                        }
                    }
                }
            });

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
    })
}