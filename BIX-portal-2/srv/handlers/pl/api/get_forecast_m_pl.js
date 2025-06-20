const { isRedirect } = require("@sap/cds/libx/odata/utils");

module.exports = (srv) => {
    srv.on('get_forecast_m_pl', async (req) => {

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
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd'])
            .where({'org_id' : org_id});

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        //조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;

        // 조직 레벨에 따른 동적 컬럼 및 그룹핑 설정
        const { pl_col_list, pl_groupBy_cols } = getDynamicColumns(org_col_nm);
        
        const pl_where_conditions = {'year': year, 'src_type':'D', 'src_type': { '!=':'WA'}};
        let pl_column = pl_col_list;
        let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
        let pl_groupBy = pl_groupBy_cols;

        const pl_data = await SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy);

        const o_total_order = {
            display_order : 1,
            div_name : '합계',
            type : '수주'
        }
        const o_total_order_count = {
            display_order : 2,
            div_name : '합계',
            type : '수주 건수'
        }
        const o_total_sale = {
            display_order : 3,
            div_name : '합계',
            type : '매출'
        }
        const o_total_sale_count = {
            display_order : 4,
            div_name : '합계',
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
        
        for(let i=1; i<13; i++){
            const s_month = i.toString().padStart(2,'0');
            
            if (!a_month_data[`a_${s_month}_data`]) {
                a_month_data[`a_${s_month}_data`] = [];
            }
            
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
                
                o_total_order['total_data'] = (o_total_order['total_data'] || 0) + (a?.rodr_amount ?? 0)
                o_total_order[`m_${s_month}_data`] = (o_total_order[`m_${s_month}_data`] || 0) + (a?.rodr_amount ?? 0)
                o_total_sale['total_data'] = (o_total_sale['total_data'] || 0) + (a?.sale_amount ?? 0)
                o_total_sale[`m_${s_month}_data`] = (o_total_sale[`m_${s_month}_data`] || 0) + (a?.sale_amount ?? 0)
                o_total_order_count['total_data'] = (o_total_order_count['total_data'] || 0) + (a.rodr_count)
                o_total_order_count[`m_${s_month}_data`] = (o_total_order_count[`m_${s_month}_data`] || 0) + (a.rodr_count)
                o_total_sale_count['total_data'] = (o_total_sale_count['total_data'] || 0) + (a.sale_count)
                o_total_sale_count[`m_${s_month}_data`] = (o_total_sale_count[`m_${s_month}_data`] || 0) + (a.sale_count)

                a_result_data[`a_${a.div_id}_order`][`m_${s_month}_data`] = (a?.rodr_amount ?? 0)
                a_result_data[`a_${a.div_id}_sale`][`m_${s_month}_data`] = (a?.sale_amount ?? 0)
                a_result_data[`a_${a.div_id}_order_count`][`m_${s_month}_data`] = (a.rodr_count)
                a_result_data[`a_${a.div_id}_sale_count`][`m_${s_month}_data`] = (a.sale_count)
                a_result_data[`a_${a.div_id}_order_count`][`total_data`] = (a_result_data[`a_${a.div_id}_order_count`][`total_data`] || 0) + (a.rodr_count)
                a_result_data[`a_${a.div_id}_sale_count`][`total_data`] = (a_result_data[`a_${a.div_id}_sale_count`][`total_data`] || 0) + (a.sale_count)

                if(i === 12){
                    a_result_data[`a_${a.div_id}_order`]['total_data'] = a?.rodr_amount_sum ?? 0
                    a_result_data[`a_${a.div_id}_sale`]['total_data'] = a?.sale_amount_sum ?? 0
                }
            })
        }

        const a_result = Object.values(a_result_data)

        aRes.push(o_total_order,o_total_order_count,o_total_sale,o_total_sale_count,...a_result)

        return aRes
    })

    /**
     * 조직 레벨에 따른 동적 컬럼 및 그룹핑 설정
     */
    function getDynamicColumns(org_level) {
        switch (org_level) {
            case 'lv1_id':
                // 전사 레벨: 부문별로 집계
                return {
                    pl_col_list: ['month_amt', 'div_id', 'div_name',
                        'sum(ifnull(sale_amount,0)) as sale_amount', 'sum(ifnull(rodr_amount,0)) as rodr_amount',
                        'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(rodr_amount_sum,0)) as rodr_amount_sum',
                        'sum(case when rodr_amount=0 then 0 else 1 end) as rodr_count', 'sum(case when sale_amount=0 then 0 else 1 end) as sale_count'],
                    pl_groupBy_cols: ['month_amt', 'div_id', 'div_name']
                };
                
            case 'div_id':
                // 부문 레벨: 본부별로 집계 (div_id, div_name을 hdqt로 매핑)
                return {
                    pl_col_list: ['month_amt', 'hdqt_id as div_id', 'hdqt_name as div_name',
                        'sum(ifnull(sale_amount,0)) as sale_amount', 'sum(ifnull(rodr_amount,0)) as rodr_amount',
                        'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(rodr_amount_sum,0)) as rodr_amount_sum',
                        'sum(case when rodr_amount=0 then 0 else 1 end) as rodr_count', 'sum(case when sale_amount=0 then 0 else 1 end) as sale_count'],
                    pl_groupBy_cols: ['month_amt', 'hdqt_id', 'hdqt_name']
                };
                
            case 'hdqt_id':
                // 본부 레벨: 팀별로 집계 (div_id, div_name을 team으로 매핑)
                return {
                    pl_col_list: ['month_amt', 'team_id as div_id', 'team_name as div_name',
                        'sum(ifnull(sale_amount,0)) as sale_amount', 'sum(ifnull(rodr_amount,0)) as rodr_amount',
                        'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(rodr_amount_sum,0)) as rodr_amount_sum',
                        'sum(case when rodr_amount=0 then 0 else 1 end) as rodr_count', 'sum(case when sale_amount=0 then 0 else 1 end) as sale_count'],
                    pl_groupBy_cols: ['month_amt', 'team_id', 'team_name']
                };
                
            default:
                // 기본값 (기존 코드와 동일)
                return {
                    pl_col_list: ['month_amt', 'div_id', 'div_name',
                        'sum(ifnull(sale_amount,0)) as sale_amount', 'sum(ifnull(rodr_amount,0)) as rodr_amount',
                        'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(rodr_amount_sum,0)) as rodr_amount_sum',
                        'sum(case when rodr_amount=0 then 0 else 1 end) as rodr_count', 'sum(case when sale_amount=0 then 0 else 1 end) as sale_count'],
                    pl_groupBy_cols: ['month_amt', 'div_id', 'div_name']
                };
        }
    }
}