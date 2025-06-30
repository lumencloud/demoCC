module.exports = (srv) => {
    srv.on('get_forecast_pl_pipeline_org_detail', async (req) => {

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
        
        const code = db.entities('common').code_header;

        const { year, month, org_id } = req.data;
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
            .where({'org_id' : org_id});
        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        // 조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        let org_col_nm_name = org_col_nm.split('_',1) + '_name';
        let org_nm = orgInfo[org_col_nm_name];

        /**
         * 부문, 본부 레벨 조회일 경우, 본부별로 조회, 그 외 부문별로 조회
         */
        let org_column = org_col_nm === 'hdqt_id' ? ['hdqt_id as id', 'hdqt_name as name', 'org_order'] : ['div_id as id', 'div_name as name', 'org_order'];
        let org_where = org_col_nm === 'hdqt_id' ? { 'hdqt_id': { '!=': null }, and: { [org_col_nm]: org_id } } : { 'div_id': { '!=': null }, and: { [org_col_nm]: org_id } };
        let org_groupBy = org_col_nm === 'hdqt_id' ? ['hdqt_id', 'hdqt_name', 'org_order'] : ['div_id', 'div_name', 'org_order'];

        //건수 = 수주 건수
        /**
         * pl 조회 컬럼 - 입력 월 이후 월별 미확보 수주/매출 금액, 총 수주/매출 금액, 수주 건수
         * 조회 조건 - 년도, 데이터 속성 D(Deal)
         */
        const pl_m_col_list = [
            'sum(ifnull(sale_year_amt,0)) as sale_amount_sum',
            'sum(ifnull(rodr_year_amt,0)) as rodr_amount_sum',
            ];
        let a_total_cnt_columns = [];
            let i_index = i_month === 12? 12 : i_month+1
        for(let i=i_index; i<=12; i++){
            pl_m_col_list.push(`sum(ifnull(sale_m${i}_amt,0)) as m_${i}_sale_data`)
            pl_m_col_list.push(`sum(ifnull(rodr_m${i}_amt,0)) as m_${i}_rodr_data`)
            pl_m_col_list.push(`sum(case when ifnull(rodr_m${i}_amt,0) = 0 then 0 else 1 end) as m_${i}_rodr_cnt`)
            a_total_cnt_columns.push(`sum(case when ifnull(rodr_m${i}_amt,0) = 0 then 0 else 1 end)`)
        }
        let s_total_cnt_column = `(${a_total_cnt_columns.join(' + ')}) as total_rodr_cnt`
        pl_m_col_list.push(s_total_cnt_column)

        const pl_m_where_conditions = {'year': year, 'src_type':'D'};
        const pl_m_groupBy_cols = [];

        const pl_deal_col_list = [
            'sum(ifnull(sale_year_amt,0)) as sale_amount_sum',
            'sum(ifnull(rodr_year_amt,0)) as rodr_amount_sum',
            'deal_stage_cd',
            s_total_cnt_column
        ];

        const pl_deal_where_conditions = {'year': year, 'src_type':'D'};
        const pl_deal_groupBy_cols = [ 'deal_stage_cd'];

        const pl_col_list = [];
        for(let i= 1; i<=12; i++){
            pl_col_list.push(`ifnull(sale_m${i}_amt,0) as m_${i}_sale_data`)
            pl_col_list.push(`ifnull(rodr_m${i}_amt,0) as m_${i}_rodr_data`)
        }
        const pl_where_conditions = {'year': year, 'src_type':'D'};

        let pl_column = org_col_nm === 'hdqt_id' ? [...pl_col_list,'hdqt_id as id','hdqt_name as name'] : [...pl_col_list,'div_id as id','div_name as name'];
        let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };

        /**
         * 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
         * 부문, 본부 레벨 조회일 경우, 본부별로 조회, 그 외 부문별로 조회
         */
        let pl_m_column = org_col_nm === 'hdqt_id' ? [...pl_m_col_list, 'hdqt_id as id', 'hdqt_name as name'] : [...pl_m_col_list, 'div_id as id', 'div_name as name'];
        let pl_m_where = org_col_nm === 'lv1_id' ? pl_m_where_conditions : { ...pl_m_where_conditions, [org_col_nm]: org_id }
        let pl_m_groupBy = org_col_nm === 'hdqt_id' ? [...pl_m_groupBy_cols, 'hdqt_id', 'hdqt_name'] : [...pl_m_groupBy_cols, 'div_id', 'div_name'];

        let pl_deal_column = org_col_nm === 'hdqt_id' ? [...pl_deal_col_list, 'hdqt_id as id', 'hdqt_name as name'] : [...pl_deal_col_list, 'div_id as id', 'div_name as name'];
        let pl_deal_where = org_col_nm === 'lv1_id' ? pl_deal_where_conditions : { ...pl_deal_where_conditions, [org_col_nm]: org_id }
        let pl_deal_groupBy = org_col_nm === 'hdqt_id' ? [...pl_deal_groupBy_cols, 'hdqt_id', 'hdqt_name'] : [...pl_deal_groupBy_cols, 'div_id', 'div_name'];

        // DB 쿼리 실행 (병렬)
        const [pl_m_data, pl_deal_data, pl_data, aCodeHeader, org_data]=await Promise.all([
            SELECT.from(pl_view).columns(pl_m_column).where(pl_m_where).groupBy(...pl_m_groupBy),
            SELECT.from(pl_view).columns(pl_deal_column).where(pl_deal_where).groupBy(...pl_deal_groupBy),
            SELECT.from(pl_view).columns(pl_column).where(pl_where),
            SELECT.from(code).where({ category: "deal_stage_code" }).columns(header => { header.items(item => { item.value }) }),
            SELECT.from(org_full_level).columns(org_column).where(org_where).groupBy(...org_groupBy).orderBy('org_order')
        ]) 

        const aDealCode = aCodeHeader[0].items
        let o_result = {org:[],month:{},deal:{},rodr:{}}
        let a_not_secured_data= ['Lead', 'Identified', 'Validated', 'Qualified', 'Negotiated']

        const data_column = {
            'total_data' : 0,
            'less100mil' : 0,
            '100mil-500mil' : 0,
            '500mil-1bil' : 0,
            '1bil-3bil' : 0,
            '3bil-5bil' : 0,
            '5bil-10bil' : 0,
            'more10bil' : 0
        }

        org_data.forEach(org => {
            let o_m_pl = pl_m_data.find(pl => pl.id === org.id);
            let a_deal_pl = pl_deal_data.filter(pl => pl.id === org.id);
            let a_pl = pl_data.filter(pl => pl.id === org.id)

            if(!o_result['month'][`${org.id}_order`]){
                o_result['org'].push({org_name:org.name, org_id:org.id})
                o_result['month'][`${org.id}_order`]={display_order:(org?.org_order ?? 0), item_order:1, org_name:org.name, org_id:org.id, type:'수주',total_data:0}
                o_result['month'][`${org.id}_sale`]={display_order:(org?.org_order ?? 0), item_order:2, org_name:org.name, org_id:org.id, type:'매출',total_data:0}
                o_result['month'][`${org.id}_cnt`]={display_order:(org?.org_order ?? 0), item_order:3, org_name:org.name, org_id:org.id, type:'건수',total_data:0}

                o_result['deal'][`${org.id}_order`]={display_order:(org?.org_order ?? 0), item_order:1, org_name:org.name, org_id:org.id, type:'수주',total_data:0,not_secured_total:0}
                o_result['deal'][`${org.id}_sale`]={display_order:(org?.org_order ?? 0), item_order:2, org_name:org.name, org_id:org.id, type:'매출',total_data:0,not_secured_total:0}
                o_result['deal'][`${org.id}_cnt`]={display_order:(org?.org_order ?? 0), item_order:3, org_name:org.name, org_id:org.id, type:'건수',total_data:0,not_secured_total:0}

                o_result['rodr'][`${org.id}_order`]={display_order:(org?.org_order ?? 0), item_order:1, org_name:org.name, org_id:org.id, type:'수주',total_data:0,...data_column}
                o_result['rodr'][`${org.id}_sale`]={display_order:(org?.org_order ?? 0), item_order:2, org_name:org.name, org_id:org.id, type:'매출',total_data:0,...data_column}
                o_result['rodr'][`${org.id}_cnt`]={display_order:(org?.org_order ?? 0), item_order:3, org_name:org.name, org_id:org.id, type:'건수',total_data:0,...data_column}
                
                for(let i=12; i>Number(month); i--){
                    const s_index = i.toString().padStart(2,'0')
                    o_result['month'][`${org.id}_order`][`m_${s_index}_data`] = (o_m_pl?.[`m_${i}_rodr_data`] ?? 0)
                    o_result['month'][`${org.id}_sale`][`m_${s_index}_data`] = (o_m_pl?.[`m_${i}_sale_data`] ?? 0)
                    o_result['month'][`${org.id}_cnt`][`m_${s_index}_data`] = (o_m_pl?.[`m_${i}_rodr_cnt`] ?? 0)
                    o_result['month'][`${org.id}_order`]['total_data'] += o_result['month'][`${org.id}_order`][`m_${s_index}_data`]
                    o_result['month'][`${org.id}_sale`]['total_data'] += o_result['month'][`${org.id}_sale`][`m_${s_index}_data`]
                    o_result['month'][`${org.id}_cnt`]['total_data'] += o_result['month'][`${org.id}_cnt`][`m_${s_index}_data`]
                }
                aDealCode.forEach(o_code =>{
                    let s_data_column = o_code.value.toLowerCase().replace('-','_').replace(' ','_')+'_data';
                    const o_deal_pl = a_deal_pl.find(pl => pl.deal_stage_cd === o_code.value);
                    if(o_deal_pl){
                        o_result['deal'][`${org.id}_order`][`${s_data_column}`] = o_deal_pl?.rodr_amount_sum ?? 0
                        o_result['deal'][`${org.id}_sale`][`${s_data_column}`] = o_deal_pl?.sale_amount_sum ?? 0
                        o_result['deal'][`${org.id}_cnt`][`${s_data_column}`] = o_deal_pl?.total_rodr_cnt ?? 0
                        o_result['deal'][`${org.id}_order`]['total_data'] += o_deal_pl?.rodr_amount_sum ?? 0
                        o_result['deal'][`${org.id}_sale`]['total_data'] += o_deal_pl?.sale_amount_sum ?? 0
                        o_result['deal'][`${org.id}_cnt`]['total_data'] += o_deal_pl?.total_rodr_cnt ?? 0
                        if(a_not_secured_data.includes(o_deal_pl.deal_stage_cd)){
                            o_result['deal'][`${org.id}_order`]['not_secured_total'] += o_deal_pl?.rodr_amount_sum ?? 0
                            o_result['deal'][`${org.id}_sale`]['not_secured_total'] += o_deal_pl?.sale_amount_sum ?? 0
                            o_result['deal'][`${org.id}_cnt`]['not_secured_total'] += o_deal_pl?.total_rodr_cnt ?? 0
                        }
                    }else{
                        o_result['deal'][`${org.id}_order`][`${s_data_column}`] = 0
                        o_result['deal'][`${org.id}_sale`][`${s_data_column}`] = 0
                        o_result['deal'][`${org.id}_cnt`][`${s_data_column}`] = 0
                    }
                })
                a_pl.forEach(pl => {
                    let i_index = i_month === 12? 12 : i_month+1
                    for(let i=i_index; i<=12; i++){
                        let i_sale = pl?.[`m_${i}_sale_data`] ?? 0
                        let i_order = pl?.[`m_${i}_rodr_data`] ?? 0
                        let sale = i_sale/100000000;
                        let order = i_order/100000000;
                        if(sale>0){
                            if(sale<1){
                                o_result['rodr'][`${org.id}_sale`]['less100mil'] += i_sale
                            }else if(sale<5){
                                o_result['rodr'][`${org.id}_sale`]['100mil-500mil'] += i_sale
                            }else if(sale<10){
                                o_result['rodr'][`${org.id}_sale`]['500mil-1bil'] += i_sale
                            }else if(sale<30){
                                o_result['rodr'][`${org.id}_sale`]['1bil-3bil'] += i_sale
                            }else if(sale<50){
                                o_result['rodr'][`${org.id}_sale`]['3bil-5bil'] += i_sale
                            }else if(sale<100){
                                o_result['rodr'][`${org.id}_sale`]['5bil-10bil'] += i_sale
                            }else{
                                o_result['rodr'][`${org.id}_sale`]['more10bil'] += i_sale
                            }
                            o_result['rodr'][`${org.id}_sale`]['total_data'] += i_sale
                        }
                        if(order>0){
                            if(order<1){
                                o_result['rodr'][`${org.id}_order`]['less100mil'] += i_order
                                o_result['rodr'][`${org.id}_cnt`]['less100mil']++
                            }else if(order<5){
                                o_result['rodr'][`${org.id}_order`]['100mil-500mil'] += i_order
                                o_result['rodr'][`${org.id}_cnt`]['100mil-500mil']++
                            }else if(order<10){
                                o_result['rodr'][`${org.id}_order`]['500mil-1bil'] += i_order
                                o_result['rodr'][`${org.id}_cnt`]['500mil-1bil']++
                            }else if(order<30){
                                o_result['rodr'][`${org.id}_order`]['1bil-3bil'] += i_order
                                o_result['rodr'][`${org.id}_cnt`]['1bil-3bil']++
                            }else if(order<50){
                                o_result['rodr'][`${org.id}_order`]['3bil-5bil'] += i_order
                                o_result['rodr'][`${org.id}_cnt`]['3bil-5bil']++
                            }else if(order<100){
                                o_result['rodr'][`${org.id}_order`]['5bil-10bil'] += i_order
                                o_result['rodr'][`${org.id}_cnt`]['5bil-10bil']++
                            }else{
                                o_result['rodr'][`${org.id}_order`]['more10bil'] += i_order
                                o_result['rodr'][`${org.id}_cnt`]['more10bil']++
                            }
                            
                            o_result['rodr'][`${org.id}_order`]['total_data'] += i_order
                            o_result['rodr'][`${org.id}_cnt`]['total_data']++
                        }
                    }
                })
            }
        })
        
        let a_org = o_result['org']
        let a_month = Object.values(o_result['month']);
        let a_deal = Object.values(o_result['deal']);
        let a_rodr = Object.values(o_result['rodr']);
            
        aRes.push({org:a_org},{month:a_month},{deal:a_deal},{rodr:a_rodr});

        return aRes
    })
}