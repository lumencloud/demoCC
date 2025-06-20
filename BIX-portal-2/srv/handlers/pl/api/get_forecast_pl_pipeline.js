const { isRedirect } = require("@sap/cds/libx/odata/utils");

module.exports = (srv) => {
    srv.on('get_forecast_pl_pipeline', async (req) => {

        // function 호출 리턴 객체
        const aRes = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        /**
         * pl.wideview_unpivot_view [실적]
         * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl').wideview_view;
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

        // 조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        let org_nm = orgInfo[org_col_nm.split('_',1) + '_name'];

        let search_org, search_org_nm;
        if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id'){
            search_org = 'div_id';
            search_org_nm = 'div_name';
        }else if(org_col_nm === 'div_id'){
            search_org = 'hdqt_id';
            search_org_nm = 'hdqt_name';
        }else if(org_col_nm === 'hdqt_id'){
            search_org = 'team_id';
            search_org_nm = 'team_name';
        };

        if(type === 'month'){
            //건수 = 수주 건수
            let sale_sum_col = [];
            let rodr_sum_col = [];
            let rodr_count_sum_col = [];
            for(let i = Number(month)+1 ; i <= 12; i++){
                sale_sum_col.push(`sum(ifnull(sale_m${i}_amt,0)) as sale_m${i}_amt`);
                rodr_sum_col.push(`sum(ifnull(rodr_m${i}_amt,0)) as rodr_m${i}_amt`);
                rodr_count_sum_col.push(`sum(case when ifnull(rodr_m${i}_amt,0)=0 then 0 else 1 end) as rodr_m${i}_cnt`);
            };

            const pl_col_list = ['year', search_org, search_org_nm, ...sale_sum_col, ...rodr_sum_col, ...rodr_count_sum_col];
            const pl_where_conditions = {'year': year, 'src_type':'D'};
            const pl_groupBy_cols = ['year', search_org, search_org_nm];

            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };

            //pl 데이터 얻기
            const pl_data = await SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols);

            let total_sale_value=0;
            let total_rodr_value=0;
            let total_rodr_count=0;
            let total_sale_month_value={};
            let total_rodr_month_value={};
            let total_rodr_month_count={};
            let org_list = [];
            pl_data.forEach(data=>{
                for(let i=Number(month) + 1; i <= 12; i++){
                    if(!total_sale_month_value[`${i}sale_month_value`]){
                        total_sale_month_value[`${i}sale_month_value`] = 0;
                        total_rodr_month_value[`${i}rodr_month_value`] = 0;
                        total_rodr_month_count[`${i}rodr_month_count`] = 0;
                    };
                    total_sale_value += data[`sale_m${i}_amt`] ?? 0;
                    total_rodr_value += data[`rodr_m${i}_amt`] ?? 0;
                    total_rodr_count += data[`rodr_m${i}_cnt`] ?? 0;
                    total_sale_month_value[`${i}sale_month_value`] +=  data[`sale_m${i}_amt`] ?? 0;
                    total_rodr_month_value[`${i}rodr_month_value`] +=  data[`rodr_m${i}_amt`] ?? 0;
                    total_rodr_month_count[`${i}rodr_month_count`] += data[`rodr_m${i}_cnt`] ?? 0;
                };
                //조직 리스트 뽑기
                const exist = org_list.some(org => org.id === data[search_org]);
                if(!exist && data[search_org_nm]){
                    org_list.push({id:data[search_org], name:data[search_org_nm]});
                };
            });
            org_list.sort((a,b) =>Number(a.id)-Number(b.id));

            // pl_data 결과 값 flat 하게 데이터 구성
            let flat_pl = pl_data.reduce((acc, item) =>{
                let main = item[search_org];
                let rest = {...item};
                delete rest[search_org];
                Object.entries(rest).forEach(([key, value])=>{
                    acc[`_${main}_${key}`] = value;
                });
                return acc;
            }, {});

            if(Object.keys(flat_pl).length === 0){return;};

            let i_count = 0;
            let a_result_data={}
            a_result_data[`total_order`] = {
                display_order : ++i_count,
                div_name : org_nm,
                type : '수주',
                total_data : total_rodr_value
            };
            a_result_data[`total_sale`] = {
                display_order : ++i_count,
                div_name : org_nm,
                type : '매출',
                total_data : total_sale_value
            };
            a_result_data[`total_order_count`] = {
                display_order : ++i_count,
                div_name : org_nm,
                type : '건수',
                total_data : total_rodr_count
            };

            for(let i=Number(month) + 1; i <= 12; i++){
                let s_month = String(i).padStart(2,"0");
                a_result_data[`total_order`][`m_${s_month}_data`] = total_rodr_month_value[`${i}rodr_month_value`];
                a_result_data[`total_sale`][`m_${s_month}_data`] = total_sale_month_value[`${i}sale_month_value`];
                a_result_data[`total_order_count`][`m_${s_month}_data`] = total_rodr_month_count[`${i}rodr_month_count`];
            };

            org_list.forEach(data=>{
                if(!a_result_data[`a_${data.id}_order`]){
                    a_result_data[`a_${data.id}_order`] = {
                        display_order : ++i_count,
                        div_name : data.name,
                        type : '수주',
                        total_data : 0
                    }
                    a_result_data[`a_${data.id}_sale`] = {
                        display_order : ++i_count,
                        div_name : data.name,
                        type : '매출',
                        total_data : 0
                    }
                    a_result_data[`a_${data.id}_order_count`] = {
                        display_order : ++i_count,
                        div_name : data.name,
                        type : '건수',
                        total_data : 0
                    }
                };
                for(let i=Number(month) + 1; i <= 12; i++){
                    let s_month = String(i).padStart(2,"0");
                    a_result_data[`a_${data.id}_order`][`m_${s_month}_data`] = flat_pl?.[`_${data.id}_rodr_m${i}_amt`] ?? 0;
                    a_result_data[`a_${data.id}_sale`][`m_${s_month}_data`] = flat_pl?.[`_${data.id}_sale_m${i}_amt`] ?? 0;
                    a_result_data[`a_${data.id}_order_count`][`m_${s_month}_data`] = flat_pl?.[`_${data.id}_rodr_m${i}_cnt`] ?? 0;

                    a_result_data[`a_${data.id}_order`][`total_data`] += flat_pl?.[`_${data.id}_rodr_m${i}_amt`] ?? 0;
                    a_result_data[`a_${data.id}_sale`][`total_data`] += flat_pl?.[`_${data.id}_sale_m${i}_amt`] ?? 0;
                    a_result_data[`a_${data.id}_order_count`][`total_data`] += flat_pl?.[`_${data.id}_rodr_m${i}_cnt`] ?? 0;
                };
            })

            const a_result = Object.values(a_result_data);
            aRes.push(...a_result);
        }else if(type === 'deal'){
            //건수 = 수주 건수
            let sale_sum_col = [];
            let rodr_sum_col = [];
            let rodr_count_sum_col = [];
            for(let i = Number(month)+1 ; i <= 12; i++){
                sale_sum_col.push(`sum(ifnull(sale_m${i}_amt,0)) as sale_m${i}_amt`);
                rodr_sum_col.push(`sum(ifnull(rodr_m${i}_amt,0)) as rodr_m${i}_amt`);
                rodr_count_sum_col.push(`sum(case when ifnull(rodr_m${i}_amt,0)=0 then 0 else 1 end) as rodr_m${i}_cnt`);
            };

            const pl_col_list = ['year', 'deal_stage_cd', search_org, search_org_nm, 'sum(ifnull(sale_year_amt,0)) as sale_year_amt', 'sum(ifnull(rodr_year_amt,0)) as rodr_year_amt', ...rodr_count_sum_col, ...sale_sum_col, ...rodr_sum_col,];
            const pl_where_conditions = {'year': year, 'src_type':'D', 'deal_stage_cd': {'!=': null}};
            const pl_groupBy_cols = ['year', 'deal_stage_cd', search_org, search_org_nm];

            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };

            //pl 데이터 얻기
            const pl_data = await SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols);

            let pl_sort_data =[];
            let org_deal_stage_cd = [];
            let total_sale_value=0;
            let total_rodr_value=0;
            let total_rodr_count=0;
            let org_list = [];
            pl_data.forEach(data=>{
                let total_sale_month_value=0;
                let total_rodr_month_value=0;
                let total_rodr_month_count=0;
                for(let i=Number(month) + 1; i <= 12; i++){
                    if(!total_sale_month_value[`${i}sale_month_value`]){
                        total_sale_month_value[`${i}sale_month_value`] = 0;
                        total_rodr_month_value[`${i}rodr_month_value`] = 0;
                        total_rodr_month_count[`${i}rodr_month_count`] = 0;
                    };
                    total_sale_value += data[`sale_m${i}_amt`] ?? 0;
                    total_rodr_value += data[`rodr_m${i}_amt`] ?? 0;
                    total_rodr_count += data[`rodr_m${i}_cnt`] ?? 0;
                    total_sale_month_value += data[`sale_m${i}_amt`] ?? 0;
                    total_rodr_month_value += data[`rodr_m${i}_amt`] ?? 0;
                    total_rodr_month_count += data[`rodr_m${i}_cnt`] ?? 0;
                };

                let temp = {
                    year : data.year,
                    div_id : data.div_id,
                    div_name : data.div_name,
                    deal_stage_cd : data.deal_stage_cd,
                    rodr_year_amt : total_rodr_month_value,
                    sale_year_amt : total_sale_month_value,
                    count : total_rodr_month_count
                };
                pl_sort_data.push(temp);

                if(!org_deal_stage_cd.includes(data['deal_stage_cd']) && data['deal_stage_cd']){
                    org_deal_stage_cd.push(data['deal_stage_cd'])
                };

                //조직 리스트 뽑기
                const exist = org_list.some(org => org.id === data[search_org]);
                if(!exist && data[search_org_nm]){
                    org_list.push({id:data[search_org], name:data[search_org_nm]});
                };
            });
            org_list.sort((a,b) =>Number(a.id)-Number(b.id));

            // pl_data 결과 값 flat 하게 데이터 구성
            let flat_pl = pl_sort_data.reduce((acc, item) =>{
                let main = item['deal_stage_cd'];
                let sub = item[search_org];
                let rest = {...item};
                delete rest['deal_stage_cd'];
                delete rest[search_org];
                Object.entries(rest).forEach(([key, value])=>{
                    acc[`_${main}_${sub}_${key}`] = value;
                });
                return acc;
            }, {});

            let i_count = 0;
            let a_result_data={}
            a_result_data[`total_order`] = {
                display_order : ++i_count,
                div_name : org_nm,
                type : '수주',
                total_data : total_rodr_value,
                lead_data : 0,
                registered_data : 0,
                identified_data : 0,
                identified_remind_data : 0,
                validated_data : 0,
                qualified_data : 0,
                negotiated_data : 0,
                contracted_data : 0,
                deal_lost_data : 0,
                deselected_data : 0
            };
            a_result_data[`total_sale`] = {
                display_order : ++i_count,
                div_name : org_nm,
                type : '매출',
                total_data : total_sale_value,
                lead_data : 0,
                registered_data : 0,
                identified_data : 0,
                identified_remind_data : 0,
                validated_data : 0,
                qualified_data : 0,
                negotiated_data : 0,
                contracted_data : 0,
                deal_lost_data : 0,
                deselected_data : 0
            };
            a_result_data[`total_order_count`] = {
                display_order : ++i_count,
                div_name : org_nm,
                type : '건수',
                total_data : total_rodr_count,
                lead_data : 0,
                registered_data : 0,
                identified_data : 0,
                identified_remind_data : 0,
                validated_data : 0,
                qualified_data : 0,
                negotiated_data : 0,
                contracted_data : 0,
                deal_lost_data : 0,
                deselected_data : 0
            };

            // 출력 데이터 구성
            org_list.forEach(data=>{
                if(!a_result_data[`a_${data.id}_order`]){
                    a_result_data[`a_${data.id}_order`] = {
                        display_order : ++i_count,
                        div_name : data.name,
                        type : '수주',
                        total_data : 0,
                        lead_data : 0,
                        registered_data : 0,
                        identified_data : 0,
                        identified_remind_data : 0,
                        validated_data : 0,
                        qualified_data : 0,
                        negotiated_data : 0,
                        contracted_data : 0,
                        deal_lost_data : 0,
                        deselected_data : 0
                    }
                    a_result_data[`a_${data.id}_sale`] = {
                        display_order : ++i_count,
                        div_name : data.name,
                        type : '매출',
                        total_data : 0,
                        lead_data : 0,
                        registered_data : 0,
                        identified_data : 0,
                        identified_remind_data : 0,
                        validated_data : 0,
                        qualified_data : 0,
                        negotiated_data : 0,
                        contracted_data : 0,
                        deal_lost_data : 0,
                        deselected_data : 0
                    }
                    a_result_data[`a_${data.id}_order_count`] = {
                        display_order : ++i_count,
                        div_name : data.name,
                        type : '건수',
                        total_data : 0,
                        lead_data : 0,
                        registered_data : 0,
                        identified_data : 0,
                        identified_remind_data : 0,
                        validated_data : 0,
                        qualified_data : 0,
                        negotiated_data : 0,
                        contracted_data : 0,
                        deal_lost_data : 0,
                        deselected_data : 0
                    }
                };

                org_deal_stage_cd.forEach(data2=>{
                    if(data2 === 'Lead'){
                        a_result_data[`total_order`]['lead_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);  
                        a_result_data[`total_sale`]['lead_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);  
                        a_result_data[`total_order_count`]['lead_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);  

                        a_result_data[`a_${data.id}_order`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);

                        a_result_data[`a_${data.id}_order`]['lead_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['lead_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['lead_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);
                    }else if(data2 === 'Registered'){
                        a_result_data[`total_order`]['registered_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);  
                        a_result_data[`total_sale`]['registered_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);  
                        a_result_data[`total_order_count`]['registered_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);  

                        a_result_data[`a_${data.id}_order`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);

                        a_result_data[`a_${data.id}_order`]['registered_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['registered_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['registered_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);
                    }else if(data2 === 'Identified'){
                        a_result_data[`total_order`]['identified_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);  
                        a_result_data[`total_sale`]['identified_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);  
                        a_result_data[`total_order_count`]['identified_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);  

                        a_result_data[`a_${data.id}_order`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);

                        a_result_data[`a_${data.id}_order`]['identified_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['identified_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['identified_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);
                    }else if(data2 === 'Identified-Remind'){
                        a_result_data[`total_order`]['identified_remind_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);  
                        a_result_data[`total_sale`]['identified_remind_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);  
                        a_result_data[`total_order_count`]['identified_remind_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0); 

                        a_result_data[`a_${data.id}_order`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);
                        
                        a_result_data[`a_${data.id}_order`]['identified_remind_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['identified_remind_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['identified_remind_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);
                    }else if(data2 === 'Validated'){
                        a_result_data[`total_order`]['validated_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);  
                        a_result_data[`total_sale`]['validated_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);  
                        a_result_data[`total_order_count`]['validated_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);  

                        a_result_data[`a_${data.id}_order`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);

                        a_result_data[`a_${data.id}_order`]['validated_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['validated_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['validated_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);
                    }else if(data2 === 'Qualified'){
                        a_result_data[`total_order`]['qualified_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);  
                        a_result_data[`total_sale`]['qualified_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);  
                        a_result_data[`total_order_count`]['qualified_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);  

                        a_result_data[`a_${data.id}_order`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);

                        a_result_data[`a_${data.id}_order`]['qualified_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['qualified_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['qualified_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);
                    }else if(data2 === 'Negotiated'){
                        a_result_data[`total_order`]['negotiated_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);  
                        a_result_data[`total_sale`]['negotiated_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);  
                        a_result_data[`total_order_count`]['negotiated_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);  

                        a_result_data[`a_${data.id}_order`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);

                        a_result_data[`a_${data.id}_order`]['negotiated_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['negotiated_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['negotiated_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);
                    }else if(data2 === 'Contracted'){
                        a_result_data[`total_order`]['contracted_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);  
                        a_result_data[`total_sale`]['contracted_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);  
                        a_result_data[`total_order_count`]['contracted_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);  

                        a_result_data[`a_${data.id}_order`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);

                        a_result_data[`a_${data.id}_order`]['contracted_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['contracted_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['contracted_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);
                    }else if(data2 === 'Deal Lost'){
                        a_result_data[`total_order`]['deal_lost_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);  
                        a_result_data[`total_sale`]['deal_lost_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);  
                        a_result_data[`total_order_count`]['deal_lost_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);  

                        a_result_data[`a_${data.id}_order`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);

                        a_result_data[`a_${data.id}_order`]['deal_lost_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['deal_lost_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['deal_lost_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);
                    }else if(data2 === 'Deselected'){
                        a_result_data[`total_order`]['deselected_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);  
                        a_result_data[`total_sale`]['deselected_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);  
                        a_result_data[`total_order_count`]['deselected_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);  

                        a_result_data[`a_${data.id}_order`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['total_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);

                        a_result_data[`a_${data.id}_order`]['deselected_data'] += (flat_pl?.[`_${data2}_${data.id}_rodr_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_sale`]['deselected_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_year_amt`] ?? 0);
                        a_result_data[`a_${data.id}_order_count`]['deselected_data'] += (flat_pl?.[`_${data2}_${data.id}_count`] ?? 0);
                    };
                });
            });

            const a_result = Object.values(a_result_data);
            aRes.push(...a_result);
        }else if(type === 'rodr'){
            //건수 = 수주 건수
            let rodr_col = [];
            let sale_col = [];
            for(let i = Number(month)+1 ; i <= 12; i++){
                rodr_col.push(`rodr_m${i}_amt`);
                sale_col.push(`sale_m${i}_amt`);
            };
            
            const pl_col_list = ['year', search_org, search_org_nm, ...rodr_col, ...sale_col];
            const pl_where_conditions = {'year': year, 'src_type':'D'};
           
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
    
            //pl 데이터 얻기
            const pl_data = await SELECT.from(pl_view).columns(pl_col_list).where(pl_where);

            let org_list = [];
            pl_data.forEach(data=>{
                //조직 리스트 뽑기
                const exist = org_list.some(org => org.id === data[search_org]);
                if(!exist && data[search_org_nm]){
                    org_list.push({id:data[search_org], name:data[search_org_nm]});
                };
            });
            org_list.sort((a,b) =>Number(a.id)-Number(b.id));

            let i_count = 0;
            let a_result_data={};
            a_result_data[`total_order`] = {
                'display_order' : ++i_count,
                'div_name' : org_nm,
                'type' : '수주',
                'total_data' : 0,
                'less100mil' : 0,
                '100mil-500mil' : 0,
                '500mil-1bil' : 0,
                '1bil-3bil' : 0,
                '3bil-5bil' : 0,
                '5bil-10bil' : 0,
                'more10bil' : 0
            };
            a_result_data[`total_sale`] = {
                'display_order' : ++i_count,
                'div_name' : org_nm,
                'type' : '매출',
                'total_data' : 0,
                'less100mil' : 0,
                '100mil-500mil' : 0,
                '500mil-1bil' : 0,
                '1bil-3bil' : 0,
                '3bil-5bil' : 0,
                '5bil-10bil' : 0,
                'more10bil' : 0
            };
            a_result_data[`total_order_count`] = {
                'display_order' : ++i_count,
                'div_name' : org_nm,
                'type' : '건수',
                'total_data' : 0,
                'less100mil' : 0,
                '100mil-500mil' : 0,
                '500mil-1bil' : 0,
                '1bil-3bil' : 0,
                '3bil-5bil' : 0,
                '5bil-10bil' : 0,
                'more10bil' : 0
            };
            
            org_list.forEach((data, index)=>{
                if(!a_result_data[`a_${data.id}_order`]){
                    a_result_data[`a_${data.id}_order`] = {
                        'display_order' : ++i_count,
                        'div_name' : data.name,
                        'type' : '수주',
                        'total_data' : 0,
                        'less100mil' : 0,
                        '100mil-500mil' : 0,
                        '500mil-1bil' : 0,
                        '1bil-3bil' : 0,
                        '3bil-5bil' : 0,
                        '5bil-10bil' : 0,
                        'more10bil' : 0
                    }
                    a_result_data[`a_${data.id}_sale`] = {
                        'display_order' : ++i_count,
                        'div_name' : data.name,
                        'type' : '매출',
                        'total_data' : 0,
                        'less100mil' : 0,
                        '100mil-500mil' : 0,
                        '500mil-1bil' : 0,
                        '1bil-3bil' : 0,
                        '3bil-5bil' : 0,
                        '5bil-10bil' : 0,
                        'more10bil' : 0
                    }
                    a_result_data[`a_${data.id}_order_count`] = {
                        'display_order' : ++i_count,
                        'div_name' : data.name,
                        'type' : '건수',
                        'total_data' : 0,
                        'less100mil' : 0,
                        '100mil-500mil' : 0,
                        '500mil-1bil' : 0,
                        '1bil-3bil' : 0,
                        '3bil-5bil' : 0,
                        '5bil-10bil' : 0,
                        'more10bil' : 0
                    }
                };

                pl_data.forEach(data2=>{
                    for(let i = Number(month)+1 ; i <= 12; i++){
                        if(Number(data2[`rodr_m${i}_amt`]) > 0){
                            if(index === 0){
                                a_result_data[`total_order`]['total_data'] += Number(data2[`rodr_m${i}_amt`]);
                                ++a_result_data[`total_order_count`]['total_data'];
                            };
                            if(data2[search_org] === data.id){
                                a_result_data[`a_${data.id}_order`]['total_data'] += Number(data2[`rodr_m${i}_amt`]);
                                ++a_result_data[`a_${data.id}_order_count`]['total_data'];
                            };
                            if(Number(data2[`rodr_m${i}_amt`]) < 100000000){
                                if(index === 0){
                                    a_result_data[`total_order`]['less100mil'] += Number(data2[`rodr_m${i}_amt`]);
                                    ++a_result_data[`total_order_count`]['less100mil'];
                                };
                                if(data2[search_org] === data.id){
                                    a_result_data[`a_${data.id}_order`]['less100mil'] += Number(data2[`rodr_m${i}_amt`]);
                                    ++a_result_data[`a_${data.id}_order_count`]['less100mil'];
                                };
                            }else if( 100000000 <= Number(data2[`rodr_m${i}_amt`]) && Number(data2[`rodr_m${i}_amt`]) < 500000000 ){
                                if(index === 0){
                                    a_result_data[`total_order`]['100mil-500mil'] += Number(data2[`rodr_m${i}_amt`]);
                                    ++a_result_data[`total_order_count`]['100mil-500mil'];
                                };
                                if(data2[search_org] === data.id){
                                    a_result_data[`a_${data.id}_order`]['100mil-500mil'] += Number(data2[`rodr_m${i}_amt`]);
                                    ++a_result_data[`a_${data.id}_order_count`]['100mil-500mil'];
                                };
                            }else if( 500000000 <= Number(data2[`rodr_m${i}_amt`]) && Number(data2[`rodr_m${i}_amt`]) < 1000000000 ){
                                if(index === 0){
                                    a_result_data[`total_order`]['500mil-1bil'] += Number(data2[`rodr_m${i}_amt`]);
                                    ++a_result_data[`total_order_count`]['500mil-1bil'];
                                };
                                if(data2[search_org] === data.id){
                                    a_result_data[`a_${data.id}_order`]['500mil-1bil'] += Number(data2[`rodr_m${i}_amt`]);
                                    ++a_result_data[`a_${data.id}_order_count`]['500mil-1bil'];
                                };                                    
                            }else if( 1000000000 <= Number(data2[`rodr_m${i}_amt`]) && Number(data2[`rodr_m${i}_amt`]) < 3000000000 ){
                                if(index === 0){
                                    a_result_data[`total_order`]['1bil-3bil'] += Number(data2[`rodr_m${i}_amt`]);
                                    ++a_result_data[`total_order_count`]['1bil-3bil'];
                                };
                                if(data2[search_org] === data.id){
                                    a_result_data[`a_${data.id}_order`]['1bil-3bil'] += Number(data2[`rodr_m${i}_amt`]);
                                    ++a_result_data[`a_${data.id}_order_count`]['1bil-3bil'];
                                };                                    
                            }else if( 3000000000 <= Number(data2[`rodr_m${i}_amt`]) && Number(data2[`rodr_m${i}_amt`]) < 5000000000 ){
                                if(index === 0){
                                    a_result_data[`total_order`]['3bil-5bil'] += Number(data2[`rodr_m${i}_amt`]);
                                    ++a_result_data[`total_order_count`]['3bil-5bil'];
                                };
                                if(data2[search_org] === data.id){
                                    a_result_data[`a_${data.id}_order`]['3bil-5bil'] += Number(data2[`rodr_m${i}_amt`]);
                                    ++a_result_data[`a_${data.id}_order_count`]['3bil-5bil'];
                                };
                            }else if( 5000000000 <= Number(data2[`rodr_m${i}_amt`]) && Number(data2[`rodr_m${i}_amt`]) < 10000000000 ){
                                if(index === 0){
                                    a_result_data[`total_order`]['5bil-10bil'] += Number(data2[`rodr_m${i}_amt`]);
                                    ++a_result_data[`total_order_count`]['5bil-10bil'];
                                };
                                if(data2[search_org] === data.id){
                                    a_result_data[`a_${data.id}_order`]['5bil-10bil'] += Number(data2[`rodr_m${i}_amt`]);
                                    ++a_result_data[`a_${data.id}_order_count`]['5bil-10bil'];
                                };
                            }else if( 10000000000 <= Number(data2[`rodr_m${i}_amt`])){
                                if(index === 0){
                                    a_result_data[`total_order`]['more10bil'] += Number(data2[`rodr_m${i}_amt`]);
                                    ++a_result_data[`total_order_count`]['more10bil'];
                                };
                                if(data2[search_org] === data.id){
                                    a_result_data[`a_${data.id}_order`]['more10bil'] += Number(data2[`rodr_m${i}_amt`]);
                                    ++a_result_data[`a_${data.id}_order_count`]['more10bil'];
                                };
                            };
                        };

                        if(Number(data2[`sale_m${i}_amt`]) > 0){
                            if(index === 0){
                                a_result_data[`total_sale`]['total_data'] += Number(data2[`sale_m${i}_amt`]);
                            };
                            if(data2[search_org] === data.id){
                                a_result_data[`a_${data.id}_sale`]['total_data'] += Number(data2[`sale_m${i}_amt`]);
                            };
                            if(Number(data2[`sale_m${i}_amt`]) < 100000000){
                                if(index === 0){
                                    a_result_data[`total_sale`]['less100mil'] += Number(data2[`sale_m${i}_amt`]);
                                };
                                if(data2[search_org] === data.id){
                                    a_result_data[`a_${data.id}_sale`]['less100mil'] += Number(data2[`sale_m${i}_amt`]);
                                };
                            }else if( 100000000 <= Number(data2[`sale_m${i}_amt`]) && Number(data2[`sale_m${i}_amt`]) < 500000000 ){
                                if(index === 0){
                                    a_result_data[`total_sale`]['100mil-500mil'] += Number(data2[`sale_m${i}_amt`]);
                                };
                                if(data2[search_org] === data.id){
                                    a_result_data[`a_${data.id}_sale`]['100mil-500mil'] += Number(data2[`sale_m${i}_amt`]);
                                };
                            }else if( 500000000 <= Number(data2[`sale_m${i}_amt`]) && Number(data2[`sale_m${i}_amt`]) < 1000000000 ){
                                if(index === 0){
                                    a_result_data[`total_sale`]['500mil-1bil'] += Number(data2[`sale_m${i}_amt`]);
                                };
                                if(data2[search_org] === data.id){
                                    a_result_data[`a_${data.id}_sale`]['500mil-1bil'] += Number(data2[`sale_m${i}_amt`]);
                                };
                            }else if( 1000000000 <= Number(data2[`sale_m${i}_amt`]) && Number(data2[`sale_m${i}_amt`]) < 3000000000 ){
                                if(index === 0){
                                    a_result_data[`total_sale`]['1bil-3bil'] += Number(data2[`sale_m${i}_amt`]);
                                };
                                if(data2[search_org] === data.id){
                                    a_result_data[`a_${data.id}_sale`]['1bil-3bil'] += Number(data2[`sale_m${i}_amt`]);
                                };
                            }else if( 3000000000 <= Number(data2[`sale_m${i}_amt`]) && Number(data2[`sale_m${i}_amt`]) < 5000000000 ){
                                if(index === 0){
                                    a_result_data[`total_sale`]['3bil-5bil'] += Number(data2[`sale_m${i}_amt`]);
                                };
                                if(data2[search_org] === data.id){
                                    a_result_data[`a_${data.id}_sale`]['3bil-5bil'] += Number(data2[`sale_m${i}_amt`]);
                                };    
                            }else if( 5000000000 <= Number(data2[`sale_m${i}_amt`]) && Number(data2[`sale_m${i}_amt`]) < 10000000000 ){
                                if(index === 0){
                                    a_result_data[`total_sale`]['5bil-10bil'] += Number(data2[`sale_m${i}_amt`]);
                                };
                                if(data2[search_org] === data.id){
                                    a_result_data[`a_${data.id}_sale`]['5bil-10bil'] += Number(data2[`sale_m${i}_amt`]);
                                };
                            }else if( 10000000000 <= Number(data2[`sale_m${i}_amt`])){
                                if(index === 0){
                                    a_result_data[`total_sale`]['more10bil'] += Number(data2[`sale_m${i}_amt`]);
                                };
                                if(data2[search_org] === data.id){
                                    a_result_data[`a_${data.id}_sale`]['more10bil'] += Number(data2[`sale_m${i}_amt`]);
                                };
                            };
                        };
                    };
                });
            });
        
            const a_result = Object.values(a_result_data);
            aRes.push(...a_result);
        }else{
            return;
        }

        return aRes
    })
}