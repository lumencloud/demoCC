const { isRedirect } = require("@sap/cds/libx/odata/utils");

module.exports = (srv) => {
    srv.on('get_actual_pl_pipeline', async (req) => {

        // function 호출 리턴 객체
        const aRes = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        /**
         * pl.wideview_unpivot_view [실적]
         * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl').wideview_unpivot_view;
        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;

        // function 입력 파라미터 - type 값 month(월기준), deal(deal stage 기준), rodr(수주 금액 기준) 
        const { year, month, org_id, type } = req.data;

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
            .where({'org_id' : org_id});
        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        //조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        let org_nm = orgInfo[org_col_nm.split('_',1) + '_name'];

        if(type === 'month'){
            const pl_col_list = ['month_amt', 'div_id', 'div_name',
                'sum(ifnull(sale_amount,0)) as sale_amount', 'sum(ifnull(rodr_amount,0)) as rodr_amount',
                'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(rodr_amount_sum,0)) as rodr_amount_sum',
                'sum(case when rodr_amount=0 then 0 else 1 end) as rodr_count', 'sum(case when sale_amount=0 then 0 else 1 end) as sale_count'];
            const pl_where_conditions = {'year': year, 'src_type': { 'not in':['WA','D']}, 'month_amt': {'between': '01', 'and': month}};
            const pl_groupBy_cols = ['month_amt', 'div_id', 'div_name'];
    
            let pl_column = pl_col_list;
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            let pl_groupBy = pl_groupBy_cols;
    
            const [pl_data] = await Promise.all([
                SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy)
            ]);
    
            let select_com_name
            if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id'){
                select_com_name = '전사';
            }else{
                select_com_name = org_nm;
            }
            const o_total_order = {
                display_order : 1,
                div_name : select_com_name,
                type : '수주'
            }
            const o_total_order_count = {
                display_order : 2,
                div_name : select_com_name,
                type : '수주 건수'
            }
            const o_total_sale = {
                display_order : 3,
                div_name : select_com_name,
                type : '매출'
            }
            const o_total_sale_count = {
                display_order : 4,
                div_name : select_com_name,
                type : '매출 건수'
            }
    
            let a_month_data={}
            
            pl_data.forEach(a=>{
                if(!a_month_data[`a_${a.month_amt}_data`]){
                    a_month_data[`a_${a.month_amt}_data`]=[]
                }
                a_month_data[`a_${a.month_amt}_data`].push(a);
            })

            let a_result_data={}
            
            for(let i=1; i<=Number(month); i++){
                const s_month = i.toString().padStart(2,'0');
                a_month_data[`a_${s_month}_data`].forEach(a=>{
                    if(!a_result_data[`a_${a.div_id}_order`]){
                        a_result_data[`a_${a.div_id}_order`] = {
                            display_order : 1,
                            div_name : a.div_name,
                            type : '수주'
                        }
                        a_result_data[`a_${a.div_id}_order_count`] = {
                            display_order : 2,
                            div_name : a.div_name,
                            type : '수주 건수'
                        }
                        a_result_data[`a_${a.div_id}_sale`] = {
                            display_order : 3,
                            div_name : a.div_name,
                            type : '매출'
                        }
                        a_result_data[`a_${a.div_id}_sale_count`] = {
                            display_order : 4,
                            div_name : a.div_name,
                            type : '매출 건수'
                        }
                    }
                    
                    o_total_order['total_data'] = (o_total_order?.['total_data'] ?? 0) + (a?.rodr_amount ?? 0)
                    o_total_order[`m_${s_month}_data`] = (o_total_order?.[`m_${s_month}_data`] ?? 0) + (a?.rodr_amount ?? 0)
                    o_total_sale['total_data'] = (o_total_sale?.['total_data'] ?? 0) + (a?.sale_amount ?? 0)
                    o_total_sale[`m_${s_month}_data`] = (o_total_sale?.[`m_${s_month}_data`] ?? 0) + (a?.sale_amount ?? 0)
                    o_total_order_count['total_data'] = (o_total_order_count?.['total_data'] ?? 0) + (a.rodr_count ?? 0)
                    o_total_order_count[`m_${s_month}_data`] = (o_total_order_count?.[`m_${s_month}_data`] ?? 0) + (a.rodr_count ?? 0)
                    o_total_sale_count['total_data'] = (o_total_sale_count?.['total_data'] ?? 0) + (a.sale_count ?? 0)
                    o_total_sale_count[`m_${s_month}_data`] = (o_total_sale_count?.[`m_${s_month}_data`] ?? 0) + (a.sale_count ?? 0)
    
                    a_result_data[`a_${a.div_id}_order`][`m_${s_month}_data`] = (a?.rodr_amount ?? 0)
                    a_result_data[`a_${a.div_id}_sale`][`m_${s_month}_data`] = (a?.sale_amount ?? 0)
                    a_result_data[`a_${a.div_id}_order_count`][`m_${s_month}_data`] = (a?.rodr_count ?? 0)
                    a_result_data[`a_${a.div_id}_sale_count`][`m_${s_month}_data`] = (a?.sale_count ?? 0)
                    a_result_data[`a_${a.div_id}_order_count`][`total_data`] = (a_result_data?.[`a_${a.div_id}_order_count`][`total_data`] ?? 0) + (a?.rodr_count ?? 0)
                    a_result_data[`a_${a.div_id}_sale_count`][`total_data`] = (a_result_data?.[`a_${a.div_id}_sale_count`][`total_data`] ?? 0) + (a?.sale_count ?? 0)
                    a_result_data[`a_${a.div_id}_order`]['total_data'] = (a_result_data?.[`a_${a.div_id}_order`]['total_data'] ?? 0) + (a?.rodr_amount ?? 0)
                    a_result_data[`a_${a.div_id}_sale`]['total_data'] = (a_result_data?.[`a_${a.div_id}_sale`]['total_data'] ?? 0) + (a?.sale_amount ?? 0)
                })
            }
    
            const a_result = Object.values(a_result_data);
            aRes.push(o_total_order,o_total_order_count,o_total_sale,o_total_sale_count,...a_result);
        }else if(type === 'deal'){
            
        }else if(type === 'rodr'){
            const pl_col_list = ['div_id', 'div_name',
                'ifnull(sale_amount,0) as sale_amount', 'ifnull(rodr_amount,0) as rodr_amount', '(case when rodr_amount=0 then `0` else `1` end) as rodr_count', '(case when sale_amount=0 then `0` else `1` end) as sale_count'];
            const pl_where_conditions = {'year': year, 'src_type': { 'not in':['WA','D']}, 'month_amt': {'between': '01', 'and': month}};
    
            let pl_column = pl_col_list;
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
    
            const [pl_data] = await Promise.all([
                SELECT.from(pl_view).columns(pl_column).where(pl_where)
            ]);

            let select_com_name
            if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id'){
                select_com_name = '전사';
            }else{
                select_com_name = org_nm;
            }
            const o_total_order = {
                display_order : 1,
                div_name : select_com_name,
                type : '수주'
            }
            const o_total_order_count = {
                display_order : 2,
                div_name : select_com_name,
                type : '수주 건수'
            }
            const o_total_sale = {
                display_order : 3,
                div_name : select_com_name,
                type : '매출'
            }
            const o_total_sale_count = {
                display_order : 4,
                div_name : select_com_name,
                type : '매출 건수'
            }

            let a_result_data={}
            pl_data.forEach(data=>{
                if(!a_result_data[`a_${data.div_id}_order`]){
                    a_result_data[`a_${data.div_id}_order`] = {
                        display_order : 1,
                        div_name : data.div_name,
                        type : '수주'
                    }
                    a_result_data[`a_${data.div_id}_order_count`] = {
                        display_order : 2,
                        div_name : data.div_name,
                        type : '수주 건수'
                    }
                    a_result_data[`a_${data.div_id}_sale`] = {
                        display_order : 3,
                        div_name : data.div_name,
                        type : '매출'
                    }
                    a_result_data[`a_${data.div_id}_sale_count`] = {
                        display_order : 4,
                        div_name : data.div_name,
                        type : '매출 건수'
                    }
                }
                
                o_total_order['total_data'] = (o_total_order?.['total_data'] ?? 0) + (data?.rodr_amount ?? 0)
                o_total_sale['total_data'] = (o_total_sale?.['total_data'] ?? 0) + (data?.sale_amount ?? 0)
                o_total_order_count['total_data'] = (o_total_order_count?.['total_data'] ?? 0) + (Number(data?.rodr_count) ?? 0)
                o_total_sale_count['total_data'] = (o_total_sale_count?.['total_data'] ?? 0) + (Number(data?.sale_count) ?? 0)

                a_result_data[`a_${data.div_id}_order`]['total_data'] = (a_result_data?.[`a_${data.div_id}_order`]['total_data'] ?? 0) + (data?.rodr_amount ?? 0)
                a_result_data[`a_${data.div_id}_sale`]['total_data'] = (a_result_data?.[`a_${data.div_id}_sale`]['total_data'] ?? 0) + (data?.sale_amount ?? 0)
                a_result_data[`a_${data.div_id}_order_count`][`total_data`] = (a_result_data?.[`a_${data.div_id}_order_count`][`total_data`] ?? 0) + (Number(data?.rodr_count) ?? 0)
                a_result_data[`a_${data.div_id}_sale_count`][`total_data`] = (a_result_data?.[`a_${data.div_id}_sale_count`][`total_data`] ?? 0) + (Number(data?.sale_count) ?? 0)

                if(data.rodr_amount < 100000000){
                    o_total_order['rodrless100mil'] = (o_total_order?.['rodrless100mil'] ?? 0) + (data?.rodr_amount ?? 0);
                    o_total_order_count['rodrless100milcount'] = (o_total_order_count?.['rodrless100milcount'] ?? 0) + (Number(data?.rodr_count) ?? 0);
                    a_result_data[`a_${data.div_id}_order`]['rodrless100mil'] = (a_result_data[`a_${data.div_id}_order`]['rodrless100mil'] ?? 0) + (data?.rodr_amount ?? 0);
                    a_result_data[`a_${data.div_id}_order_count`]['rodrless100milcount'] = (a_result_data[`a_${data.div_id}_order_count`]['rodrless100milcount'] ?? 0) + (Number(data?.rodr_count) ?? 0);
                }else if( 100000000 <= data.rodr_amount && data.rodr_amount < 500000000 ){
                    o_total_order['rodr100mil-500mil'] = (o_total_order?.['rodr100mil-500mil'] ?? 0) + (data?.rodr_amount ?? 0);
                    o_total_order_count['rodr100mil-500milcount'] = (o_total_order_count?.['rodr100mil-500milcount'] ?? 0) + (Number(data?.rodr_count) ?? 0);
                    a_result_data[`a_${data.div_id}_order`]['rodr100mil-500mil'] = (a_result_data[`a_${data.div_id}_order`]['rodr100mil-500mil'] ?? 0) + (data?.rodr_amount ?? 0);
                    a_result_data[`a_${data.div_id}_order_count`]['rodr100mil-500milcount'] = (a_result_data[`a_${data.div_id}_order_count`]['rodr100mil-500milcount'] ?? 0) + (Number(data?.rodr_count) ?? 0);
                }else if( 500000000 <= data.rodr_amount && data.rodr_amount < 1000000000 ){
                    o_total_order['rodr500mil-1bil'] = (o_total_order?.['rodr500mil-1bil'] ?? 0) + (data?.rodr_amount ?? 0);
                    o_total_order_count['rodr500mil-1bilcount'] = (o_total_order_count?.['rodr500mil-1bilcount'] ?? 0) + (Number(data?.rodr_count) ?? 0);
                    a_result_data[`a_${data.div_id}_order`]['rodr500mil-1bil'] = (a_result_data[`a_${data.div_id}_order`]['rodr500mil-1bil'] ?? 0) + (data?.rodr_amount ?? 0);
                    a_result_data[`a_${data.div_id}_order_count`]['rodr500mil-1bilcount'] = (a_result_data[`a_${data.div_id}_order_count`]['rodr500mil-1bilcount'] ?? 0) + (Number(data?.rodr_count) ?? 0);
                }else if( 1000000000 <= data.rodr_amount && data.rodr_amount < 3000000000 ){
                    o_total_order['rodr1bil-3bil'] = (o_total_order?.['rodr1bil-3bil'] ?? 0) + (data?.rodr_amount ?? 0);
                    o_total_order_count['rodr1bil-3bilcount'] = (o_total_order_count?.['rodr1bil-3bilcount'] ?? 0) + (Number(data?.rodr_count) ?? 0);
                    a_result_data[`a_${data.div_id}_order`]['rodr1bil-3bil'] = (a_result_data[`a_${data.div_id}_order`]['rodr1bil-3bil'] ?? 0) + (data?.rodr_amount ?? 0);
                    a_result_data[`a_${data.div_id}_order_count`]['rodr1bil-3bilcount'] = (a_result_data[`a_${data.div_id}_order_count`]['rodr1bil-3bilcount'] ?? 0) + (Number(data?.rodr_count) ?? 0);
                }else if( 3000000000 <= data.rodr_amount && data.rodr_amount < 5000000000 ){
                    o_total_order['rodr3bil-5bil'] = (o_total_order?.['rodr3bil-5bil'] ?? 0) + (data?.rodr_amount ?? 0);
                    o_total_order_count['rodr3bil-5bilcount'] = (o_total_order_count?.['rodr3bil-5bilcount'] ?? 0) + (Number(data?.rodr_count) ?? 0);
                    a_result_data[`a_${data.div_id}_order`]['rodr3bil-5bil'] = (a_result_data[`a_${data.div_id}_order`]['rodr3bil-5bil'] ?? 0) + (data?.rodr_amount ?? 0);
                    a_result_data[`a_${data.div_id}_order_count`]['rodr3bil-5bilcount'] = (a_result_data[`a_${data.div_id}_order_count`]['rodr3bil-5bilcount'] ?? 0) + (Number(data?.rodr_count) ?? 0);
                }else if( 5000000000 <= data.rodr_amount && data.rodr_amount < 10000000000 ){
                    o_total_order['rodr5bil-10bil'] = (o_total_order?.['rodr5bil-10bil'] ?? 0) + (data?.rodr_amount ?? 0);
                    o_total_order_count['rodr5bil-10bilcount'] = (o_total_order_count?.['rodr5bil-10bilcount'] ?? 0) + (Number(data?.rodr_count) ?? 0);
                    a_result_data[`a_${data.div_id}_order`]['rodr5bil-10bil'] = (a_result_data[`a_${data.div_id}_order`]['rodr5bil-10bil'] ?? 0) + (data?.rodr_amount ?? 0);
                    a_result_data[`a_${data.div_id}_order_count`]['rodr5bil-10bilcount'] = (a_result_data[`a_${data.div_id}_order_count`]['rodr5bil-10bilcount'] ?? 0) + (Number(data?.rodr_count) ?? 0);
                }else if( 10000000000 <= data.rodr_amount ){
                    o_total_order['rodrmore10bil'] = (o_total_order?.['rodrmore10bil'] ?? 0) + (data?.rodr_amount ?? 0);
                    o_total_order_count['rodrmore10bilcount'] = (o_total_order_count?.['rodrmore10bilcount'] ?? 0) + (Number(data?.rodr_count) ?? 0);
                    a_result_data[`a_${data.div_id}_order`]['rodrmore10bil'] = (a_result_data[`a_${data.div_id}_order`]['rodrmore10bil'] ?? 0) + (data?.rodr_amount ?? 0);
                    a_result_data[`a_${data.div_id}_order_count`]['rodrmore10bilcount'] = (a_result_data[`a_${data.div_id}_order_count`]['rodrmore10bilcount'] ?? 0) + (Number(data?.rodr_count) ?? 0);
                };

                if(data.sale_amount < 100000000){
                    o_total_sale['saleless100mil'] = (o_total_sale?.['saleless100mil'] ?? 0) + (data?.sale_amount ?? 0);
                    o_total_sale_count['saleless100milcount'] = (o_total_sale_count?.['saleless100milcount'] ?? 0) + (Number(data?.sale_count) ?? 0);
                    a_result_data[`a_${data.div_id}_sale`]['rodrless100mil'] = (a_result_data[`a_${data.div_id}_sale`]['rodrless100mil'] ?? 0) + (data?.sale_amount ?? 0);
                    a_result_data[`a_${data.div_id}_sale_count`]['rodrless100milcount'] = (a_result_data[`a_${data.div_id}_sale_count`]['rodrless100milcount'] ?? 0) + (Number(data?.sale_count) ?? 0);
                }else if( 100000000 <= data.sale_amount && data.sale_amount < 500000000 ){
                    o_total_sale['sale100mil-500mil'] = (o_total_sale?.['sale100mil-500mil'] ?? 0) + (data?.sale_amount ?? 0);
                    o_total_sale_count['sale100mil-500milcount'] = (o_total_sale_count?.['sale100mil-500milcount'] ?? 0) + (Number(data?.sale_count) ?? 0);
                    a_result_data[`a_${data.div_id}_sale`]['sale100mil-500mil'] = (a_result_data[`a_${data.div_id}_sale`]['sale100mil-500mil'] ?? 0) + (data?.sale_amount ?? 0);
                    a_result_data[`a_${data.div_id}_sale_count`]['sale100mil-500milcount'] = (a_result_data[`a_${data.div_id}_sale_count`]['sale100mil-500milcount'] ?? 0) + (Number(data?.sale_count) ?? 0);
                }else if( 500000000 <= data.sale_amount && data.sale_amount < 1000000000 ){
                    o_total_sale['sale500mil-1bil'] = (o_total_sale?.['sale500mil-1bil'] ?? 0) + (data?.sale_amount ?? 0);
                    o_total_sale_count['sale500mil-1bilcount'] = (o_total_sale_count?.['sale500mil-1bilcount'] ?? 0) + (Number(data?.sale_count) ?? 0);
                    a_result_data[`a_${data.div_id}_sale`]['sale500mil-1bil'] = (a_result_data[`a_${data.div_id}_sale`]['sale500mil-1bil'] ?? 0) + (data?.sale_amount ?? 0);
                    a_result_data[`a_${data.div_id}_sale_count`]['sale500mil-1bilcount'] = (a_result_data[`a_${data.div_id}_sale_count`]['sale500mil-1bilcount'] ?? 0) + (Number(data?.sale_count) ?? 0);
                }else if( 1000000000 <= data.sale_amount && data.sale_amount < 3000000000 ){
                    o_total_sale['sale1bil-3bil'] = (o_total_sale?.['sale1bil-3bil'] ?? 0) + (data?.sale_amount ?? 0);
                    o_total_sale_count['sale1bil-3bilcount'] = (o_total_sale_count?.['sale1bil-3bilcount'] ?? 0) + (Number(data?.sale_count) ?? 0);
                    a_result_data[`a_${data.div_id}_sale`]['sale1bil-3bil'] = (a_result_data[`a_${data.div_id}_sale`]['sale1bil-3bil'] ?? 0) + (data?.sale_amount ?? 0);
                    a_result_data[`a_${data.div_id}_sale_count`]['sale1bil-3bilcount'] = (a_result_data[`a_${data.div_id}_sale_count`]['sale1bil-3bilcount'] ?? 0) + (Number(data?.sale_count) ?? 0);
                }else if( 3000000000 <= data.sale_amount && data.sale_amount < 5000000000 ){
                    o_total_sale['sale3bil-5bil'] = (o_total_sale?.['sale3bil-5bil'] ?? 0) + (data?.sale_amount ?? 0);
                    o_total_sale_count['sale3bil-5bilcount'] = (o_total_sale_count?.['sale3bil-5bilcount'] ?? 0) + (Number(data?.sale_count) ?? 0);
                    a_result_data[`a_${data.div_id}_sale`]['sale3bil-5bil'] = (a_result_data[`a_${data.div_id}_sale`]['sale3bil-5bil'] ?? 0) + (data?.sale_amount ?? 0);
                    a_result_data[`a_${data.div_id}_sale_count`]['sale3bil-5bilcount'] = (a_result_data[`a_${data.div_id}_sale_count`]['sale3bil-5bilcount'] ?? 0) + (Number(data?.sale_count) ?? 0);
                }else if( 5000000000 <= data.sale_amount && data.sale_amount < 10000000000 ){
                    o_total_sale['sale5bil-10bil'] = (o_total_sale?.['sale5bil-10bil'] ?? 0) + (data?.sale_amount ?? 0);
                    o_total_sale_count['sale5bil-10bilcount'] = (o_total_sale_count?.['sale5bil-10bilcount'] ?? 0) + (Number(data?.sale_count) ?? 0);
                    a_result_data[`a_${data.div_id}_sale`]['sale5bil-10bil'] = (a_result_data[`a_${data.div_id}_sale`]['sale5bil-10bil'] ?? 0) + (data?.sale_amount ?? 0);
                    a_result_data[`a_${data.div_id}_sale_count`]['sale5bil-10bilcount'] = (a_result_data[`a_${data.div_id}_sale_count`]['sale5bil-10bilcount'] ?? 0) + (Number(data?.sale_count) ?? 0);
                }else if( 10000000000 <= data.sale_amount ){
                    o_total_sale['salemore10bil'] = (o_total_sale?.['salemore10bil'] ?? 0) + (data?.sale_amount ?? 0);
                    o_total_sale_count['salemore10bilcount'] = (o_total_sale_count?.['salemore10bilcount'] ?? 0) + (Number(data?.sale_count) ?? 0);
                    a_result_data[`a_${data.div_id}_sale`]['salemore10bil'] = (a_result_data[`a_${data.div_id}_sale`]['salemore10bil'] ?? 0) + (data?.sale_amount ?? 0);
                    a_result_data[`a_${data.div_id}_sale_count`]['salemore10bilcount'] = (a_result_data[`a_${data.div_id}_sale_count`]['salemore10bilcount'] ?? 0) + (Number(data?.sale_count) ?? 0);
                };
            })
    
            const a_result = Object.values(a_result_data);
            aRes.push(o_total_order,o_total_order_count,o_total_sale,o_total_sale_count,...a_result);
        }else{
            return;
        }

        return aRes
    })
}