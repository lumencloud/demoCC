const { isRedirect } = require("@sap/cds/libx/odata/utils");

module.exports = (srv) => {
    srv.on('get_forecast_pl_pipeline_account', async (req) => {

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
        /**
         * account 정보
         */
        const common_account = db.entities('common').account;
        /**
         * 수주 정보
         */
        const pl_contract_amt = db.entities('pl').sfdc_contract;

        // function 입력 파라미터 - type 값 month(월기준), deal(deal stage 기준), rodr(수주 금액 기준) 
        const { year, month, org_id, type } = req.data;
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
        // DB 쿼리 실행 (병렬)
        const [orgInfo, account_query] = await Promise.all([
            await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', 'lv1_name', 'lv2_name', 'lv3_name', 'div_name', 'hdqt_name', 'team_name']).where({'org_id' : org_id}),
            SELECT.from(common_account).columns(['biz_tp_account_cd','biz_tp_account_nm','sort_order']).orderBy('sort_order')
        ]);
        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        // 조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        
        let account_list = [];        
        account_query.forEach(data=>{
            if(!account_list.includes(data.biz_tp_account_cd)){
                account_list.push(data.biz_tp_account_cd);
            };
        });

        if(type === 'month'){
            //건수 = 수주 건수
            const pl_col_list = ['month_amt', 'biz_tp_account_cd',
                'sum(ifnull(sale_amount,0)) as sale_amount',
                'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum',
                'biz_opp_no'];
            //임시로 'biz_opp_no': {'!=':null} 일단은 제거
            const pl_where_conditions = {'year': year, 'src_type':'D', 'month_amt': {'between': month, 'and': '12'}, 'biz_tp_account_cd': account_list};
            // const pl_where_conditions = {'year': year, 'src_type':'D', 'biz_opp_no': {'!=':null}, 'month_amt': {'between': month, 'and': '12'}, [search_org]: {'!=': null}};
            const pl_groupBy_cols = ['month_amt', 'biz_tp_account_cd', 'biz_opp_no'];
    
            let pl_where = org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
    
            //pl 데이터 얻기
            const pl_data = await SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols);

            // pl_contract_amt 에서 사용할 전체 biz_opp_no인 ent_biz_opp_list와 조직별 포함된 biz_opp_no리스트 org_biz_opp_list정리, org list를 정리.
            let ent_biz_opp_list = [];
            pl_data.forEach(data=>{
                //전체 biz_opp_no 리스트 뽑기
                if(!ent_biz_opp_list.includes(data.biz_opp_no)){
                    ent_biz_opp_list.push(data.biz_opp_no);
                };
            });

            //select column 구성을 위한 for문
            let add_column = [];
            for(let i = i_month+1 ; i <= 12; i++){
                add_column.push(`max(ifnull(rodr_m${i}_amt,0)) as rodr_m${i}_amt`);
            };

            // pl_contract_amt 데이터를 얻기 위한 구성
            const pl_contract_col_list = ['biz_opp_no', ...add_column];
            const pl_contract_where_conditions = {'biz_opp_no': ent_biz_opp_list};
            const pl_contract_groupBy_cols = ['biz_opp_no'];

            const [pl_contract_data] = await Promise.all([
                SELECT.from(pl_contract_amt).columns(pl_contract_col_list).where(pl_contract_where_conditions).groupBy(...pl_contract_groupBy_cols),
            ]);
            
            // pl_contract_data 결과 값 flat 하게 데이터 구성
            let flat_pl_contract = pl_contract_data.reduce((acc, item) =>{
                let main = item['biz_opp_no'];
                let rest = {...item};
                delete rest['biz_opp_no'];
                Object.entries(rest).forEach(([key, value])=>{
                    acc[`_${main}_${key}`] = value;
                });
                return acc;
            }, {});

            // 수주 토탈 row에 들어갈 데이터 구하기
            let total_value=0;
            let total_count=0;
            let total_month_valule={};
            let total_month_count={};
            pl_contract_data.forEach(data=>{
                for(let i=12; i>Number(month); i--){
                    if(!total_month_valule[`${i}month_value`]){
                        total_month_valule[`${i}month_value`] = 0;
                        total_month_count[`${i}month_count`] = 0;
                    };
                    total_value += data[`rodr_m${i}_amt`] ?? 0;
                    total_month_valule[`${i}month_value`] +=  data[`rodr_m${i}_amt`] ?? 0;
                    if(data[`rodr_m${i}_amt`] ?? 0 > 0){
                        total_count++;
                        total_month_count[`${i}month_count`]++;
                    };
                };
            });

            let i_count = 0;

            // pl_data 결과 값 flat 하게 데이터 구성
            let flat_pl = pl_data.reduce((acc, item) =>{
                let main = item['biz_tp_account_cd'];
                let sub = item['month_amt'];
                let rest = {...item};
                delete rest['biz_tp_account_cd'];
                delete rest['month_amt'];
                Object.entries(rest).forEach(([key, value])=>{
                    acc[`_${main}_${sub}_${key}`] = value;
                });
                return acc;
            }, {});

            if(Object.keys(flat_pl).length === 0){return;};
            let a_result_data={}
            account_query.forEach(data=>{
                if(!a_result_data[`a_${data.biz_tp_account_cd}_order`]){
                    a_result_data[`a_${data.biz_tp_account_cd}_order`] = {
                        display_order : ++i_count,
                        div_name : data.biz_tp_account_nm,
                        type : '수주'
                    }
                    a_result_data[`a_${data.biz_tp_account_cd}_sale`] = {
                        display_order : ++i_count,
                        div_name : data.biz_tp_account_nm,
                        type : '매출'
                    }
                    a_result_data[`a_${data.biz_tp_account_cd}_order_count`] = {
                        display_order : ++i_count,
                        div_name : data.biz_tp_account_nm,
                        type : '건수'
                    }
                };
                for(let i=12; i>Number(month); i--){
                    const s_month = i.toString().padStart(2,'0');
                    a_result_data[`a_${data.biz_tp_account_cd}_sale`]['total_data'] = (a_result_data?.[`a_${data.biz_tp_account_cd}_sale`]['total_data'] ?? 0) + flat_pl[`_${data.biz_tp_account_cd}_${s_month}_sale_amount`];
                    a_result_data[`a_${data.biz_tp_account_cd}_sale`][`m_${s_month}_data`] = (a_result_data?.[`a_${data.biz_tp_account_cd}_sale`][`m_${s_month}_data`] ?? 0) + flat_pl[`_${data.biz_tp_account_cd}_${s_month}_sale_amount`];
                };
            })

            const a_result = Object.values(a_result_data);
            aRes.push(...a_result);
        }else if(type === 'deal'){
            //건수 = 수주 건수
            const pl_col_list = ['biz_tp_account_cd',
                'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum',
                'deal_stage_cd', 'biz_opp_no'];
            //임시로 'biz_opp_no': {'!=':null} 일단은 제거
            const pl_where_conditions = {'year': year, 'src_type':'D', 'biz_tp_account_cd': account_list, month_amt : '12', 'deal_stage_cd': {'!=': null}};
            // const pl_where_conditions = {'year': year, 'src_type':'D', 'biz_opp_no': {'!=':null}, [search_org]: {'!=': null}, month_amt : '12', 'deal_stage_cd': {'!=': null}};
            const pl_groupBy_cols = [ 'biz_tp_account_cd', 'deal_stage_cd', 'biz_opp_no'];
    
            let pl_where = org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
    
            //pl 데이터 얻기
            const pl_data = await SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols);

            // pl_contract_amt 에서 사용할 전체 biz_opp_no인 ent_biz_opp_list와 조직별 포함된 biz_opp_no리스트 org_biz_opp_list정리, org list를 정리.
            let ent_biz_opp_list = [];
            let org_biz_opp_list = {};
            pl_data.forEach(data=>{
                //전체 biz_opp_no 리스트 뽑기
                if(!ent_biz_opp_list.includes(data.biz_opp_no)){
                    ent_biz_opp_list.push(data.biz_opp_no);
                };

                //조직별 biz_opp_no 리스트 뽑기 ----- 임시로 biz_opp_no 안뽑음.
                if(!org_biz_opp_list[data['biz_tp_account_cd']]){
                    org_biz_opp_list[data['biz_tp_account_cd']] = [];
                };
                if(data['deal_stage_cd'] && !org_biz_opp_list[data['biz_tp_account_cd']].includes(data['deal_stage_cd'])){
                    org_biz_opp_list[data['biz_tp_account_cd']].push(data['deal_stage_cd']);
                };
            });

            // pl_data 결과 값 flat 하게 데이터 구성
            let flat_pl = pl_data.reduce((acc, item) =>{
                let main = item['deal_stage_cd'];
                let sub = item['biz_tp_account_cd'];
                let rest = {...item};
                delete rest['deal_stage_cd'];
                delete rest['biz_tp_account_cd'];
                Object.entries(rest).forEach(([key, value])=>{
                    acc[`_${main}_${sub}_${key}`] = value;
                });
                return acc;
            }, {});

            let i_count = 0;
            let a_result_data={}
            account_query.forEach(data=>{
                if(!a_result_data[`a_${data.biz_tp_account_cd}_order`]){
                    a_result_data[`a_${data.biz_tp_account_cd}_order`] = {
                        display_order : ++i_count,
                        div_name : data.biz_tp_account_nm,
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
                    a_result_data[`a_${data.biz_tp_account_cd}_sale`] = {
                        display_order : ++i_count,
                        div_name : data.biz_tp_account_nm,
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
                    a_result_data[`a_${data.biz_tp_account_cd}_order_count`] = {
                        display_order : ++i_count,
                        div_name : data.biz_tp_account_nm,
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

                org_biz_opp_list[data.biz_tp_account_cd].forEach(data2=>{
                    a_result_data[`a_${data.biz_tp_account_cd}_sale`]['total_data'] += (flat_pl?.[`_${data2}_${data.biz_tp_account_cd}_sale_amount_sum`] ?? 0);  
                    if(data2 === 'Lead'){
                        a_result_data[`a_${data.biz_tp_account_cd}_sale`]['lead_data'] += (flat_pl?.[`_${data2}_${data.biz_tp_account_cd}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Registered'){
                        a_result_data[`a_${data.biz_tp_account_cd}_sale`]['registered_data'] += (flat_pl?.[`_${data2}_${data.biz_tp_account_cd}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Identified'){
                        a_result_data[`a_${data.biz_tp_account_cd}_sale`]['identified_data'] += (flat_pl?.[`_${data2}_${data.biz_tp_account_cd}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Identified-Remind'){
                        a_result_data[`a_${data.biz_tp_account_cd}_sale`]['identified_remind_data'] += (flat_pl?.[`_${data2}_${data.biz_tp_account_cd}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Validated'){
                        a_result_data[`a_${data.biz_tp_account_cd}_sale`]['validated_data'] += (flat_pl?.[`_${data2}_${data.biz_tp_account_cd}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Qualified'){
                        a_result_data[`a_${data.biz_tp_account_cd}_sale`]['qualified_data'] += (flat_pl?.[`_${data2}_${data.biz_tp_account_cd}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Negotiated'){
                        a_result_data[`a_${data.biz_tp_account_cd}_sale`]['negotiated_data'] += (flat_pl?.[`_${data2}_${data.biz_tp_account_cd}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Contracted'){
                        a_result_data[`a_${data.biz_tp_account_cd}_sale`]['contracted_data'] += (flat_pl?.[`_${data2}_${data.biz_tp_account_cd}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Deal Lost'){
                        a_result_data[`a_${data.biz_tp_account_cd}_sale`]['deal_lost_data'] += (flat_pl?.[`_${data2}_${data.biz_tp_account_cd}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Deselected'){
                        a_result_data[`a_${data.biz_tp_account_cd}_sale`]['deselected_data'] += (flat_pl?.[`_${data2}_${data.biz_tp_account_cd}_sale_amount_sum`] ?? 0);
                    };
                })
            })

            const a_result = Object.values(a_result_data);
            aRes.push(...a_result);
        }else if(type === 'rodr'){
            //건수 = 수주 건수
            const pl_col_list = ['biz_tp_account_cd',
                'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum',
                'biz_opp_no'];
            //임시로 'biz_opp_no': {'!=':null} 일단은 제거
            const pl_where_conditions = {'year': year, 'src_type':'D', 'biz_tp_account_cd': {'!=': null}, month_amt : '12'};
            // const pl_where_conditions = {'year': year, 'src_type':'D', 'biz_opp_no': {'!=':null}, [search_org]: {'!=': null}, month_amt : '12'};
            const pl_groupBy_cols = [ 'biz_tp_account_cd', 'biz_opp_no'];
    
            let pl_where = org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
    
            //pl 데이터 얻기
            const pl_data = await SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols);

            // pl_contract_amt 에서 사용할 전체 biz_opp_no인 ent_biz_opp_list와 조직별 포함된 biz_opp_no리스트 org_biz_opp_list정리, org list를 정리.
            let ent_biz_opp_list = [];
            pl_data.forEach(data=>{
                //전체 biz_opp_no 리스트 뽑기
                if(!ent_biz_opp_list.includes(data.biz_opp_no)){
                    ent_biz_opp_list.push(data.biz_opp_no);
                };
            });

            // pl_data 결과 값 flat 하게 데이터 구성
            let flat_pl = pl_data.reduce((acc, item) =>{
                let main = item['biz_tp_account_cd'];
                let rest = {...item};
                delete rest['biz_tp_account_cd'];
                Object.entries(rest).forEach(([key, value])=>{
                    acc[`_${main}_${key}`] = value;
                });
                return acc;
            }, {});

            //select column 구성을 위한 for문
            let add_column;
            for(let i = 1 ; i <= 12; i++){
                !add_column ? add_column = `max(ifnull(rodr_m${i}_amt,0))` : add_column += ` + max(ifnull(rodr_m${i}_amt,0))`;
            };
            add_column += ` as rodr_max_sum`;

            // pl_contract_amt 데이터를 얻기 위한 구성
            const pl_contract_col_list = ['biz_opp_no', add_column];
            const pl_contract_where_conditions = {'biz_opp_no': ent_biz_opp_list};
            const pl_contract_groupBy_cols = ['biz_opp_no'];

            const [pl_contract_data] = await Promise.all([
                SELECT.from(pl_contract_amt).columns(pl_contract_col_list).where(pl_contract_where_conditions).groupBy(...pl_contract_groupBy_cols),
            ]);

            // pl_contract_data 결과 값 flat 하게 데이터 구성
            let flat_pl_contract = pl_contract_data.reduce((acc, item) =>{
                let main = item['biz_opp_no'];
                let rest = {...item};
                delete rest['biz_opp_no'];
                Object.entries(rest).forEach(([key, value])=>{
                    acc[`_${main}_${key}`] = value;
                });
                return acc;
            }, {});

            let i_count = 0;
            let a_result_data={}
            account_query.forEach(data=>{
                // 임시로직으로 매출이라도 나오게 수정
                if(!a_result_data[`a_${data.biz_tp_account_cd}_order`]){
                    a_result_data[`a_${data.biz_tp_account_cd}_order`] = {
                        display_order : ++i_count,
                        div_name : data.biz_tp_account_nm,
                        type : '수주',
                        total_data : 0
                    }
                    a_result_data[`a_${data.biz_tp_account_cd}_sale`] = {
                        display_order : ++i_count,
                        div_name : data.biz_tp_account_nm,
                        type : '매출',
                        total_data : 0
                    }
                    a_result_data[`a_${data.biz_tp_account_cd}_order_count`] = {
                        display_order : ++i_count,
                        div_name : data.biz_tp_account_nm,
                        type : '건수',
                        total_data : 0
                    }
                };
                a_result_data[`a_${data.biz_tp_account_cd}_sale`]['total_data'] = (a_result_data?.[`a_${data.biz_tp_account_cd}_sale`]['total_data'] ?? 0) + (flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`] ?? 0);  
                if(flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`] < 100000000){
                    a_result_data[`a_${data.biz_tp_account_cd}_sale`]['less100mil'] = (a_result_data[`a_${data.biz_tp_account_cd}_sale`]['less100mil'] ?? 0) + flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`];
                }else if( 100000000 <= flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`] && flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`] < 500000000 ){
                    a_result_data[`a_${data.biz_tp_account_cd}_sale`]['100mil-500mil'] = (a_result_data[`a_${data.biz_tp_account_cd}_sale`]['100mil-500mil'] ?? 0) + flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`];
                }else if( 500000000 <= flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`] && flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`] < 1000000000 ){
                    a_result_data[`a_${data.biz_tp_account_cd}_sale`]['500mil-1bil'] = (a_result_data[`a_${data.biz_tp_account_cd}_sale`]['500mil-1bil'] ?? 0) + flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`];
                }else if( 1000000000 <= flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`] && flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`] < 3000000000 ){
                    a_result_data[`a_${data.biz_tp_account_cd}_sale`]['1bil-3bil'] = (a_result_data[`a_${data.biz_tp_account_cd}_sale`]['1bil-3bil'] ?? 0) + flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`];
                }else if( 3000000000 <= flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`] && flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`] < 5000000000 ){
                    a_result_data[`a_${data.biz_tp_account_cd}_sale`]['3bil-5bil'] = (a_result_data[`a_${data.biz_tp_account_cd}_sale`]['3bil-5bil'] ?? 0) + flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`];
                }else if( 5000000000 <= flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`] && flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`] < 10000000000 ){
                    a_result_data[`a_${data.biz_tp_account_cd}_sale`]['5bil-10bil'] = (a_result_data[`a_${data.biz_tp_account_cd}_sale`]['5bil-10bil'] ?? 0) + flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`];
                }else if( 10000000000 <= flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`] ){
                    a_result_data[`a_${data.biz_tp_account_cd}_sale`]['more10bil'] = (a_result_data[`a_${data.biz_tp_account_cd}_sale`]['more10bil'] ?? 0) + flat_pl?.[`_${data.biz_tp_account_cd}_sale_amount_sum`];
                };
            })

            const a_result = Object.values(a_result_data);
            aRes.push(...a_result);
        }else{
            return;
        }

        return aRes
    })
}