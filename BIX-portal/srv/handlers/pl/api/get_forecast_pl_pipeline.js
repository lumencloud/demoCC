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
        const pl_view = db.entities('pl').wideview_unpivot_view;
        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;

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
            const pl_col_list = ['month_amt', search_org, search_org_nm,
                'sum(ifnull(sale_amount,0)) as sale_amount',
                'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum',
                'biz_opp_no'];
            //임시로 'biz_opp_no': {'!=':null} 일단은 제거
            const pl_where_conditions = {'year': year, 'src_type':'D', 'month_amt': {'between': month, 'and': '12'}, [search_org]: {'!=': null}};
            // const pl_where_conditions = {'year': year, 'src_type':'D', 'biz_opp_no': {'!=':null}, 'month_amt': {'between': month, 'and': '12'}, [search_org]: {'!=': null}};
            const pl_groupBy_cols = ['month_amt', search_org, search_org_nm, 'biz_opp_no'];
    
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
            let select_com_name
            if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id'){
                select_com_name = '전사';
            }else{
                select_com_name = org_nm;
            }
            const o_total_order = {
                display_order : i_count,
                div_name : select_com_name,
                type : '수주'
            }
            const o_total_sale = {
                display_order : ++i_count,
                div_name : select_com_name,
                type : '매출'
            }
            const o_total_order_count = {
                display_order : ++i_count,
                div_name : select_com_name,
                type : '건수'
            }
    
            let a_month_data={}
            pl_data.forEach(a=>{
                if(!a_month_data[`a_${a.month_amt}_data`]){
                    a_month_data[`a_${a.month_amt}_data`]=[]
                }
                a_month_data[`a_${a.month_amt}_data`].push(a);
            });

            let a_result_data={}
            for(let i=12; i>Number(month); i--){
                const s_month = i.toString().padStart(2,'0');
                o_total_order[`m_${s_month}_data`] = (total_month_valule?.[`${i}month_value`] ?? 0);
                o_total_order_count[`m_${s_month}_data`] = (total_month_count?.[`${i}month_count`] ?? 0);

                if(Object.keys(a_month_data).length === 0){break;};
                a_month_data[`a_${s_month}_data`].forEach(a=>{
                    if(!a_result_data[`a_${a[search_org]}_order`]){
                        a_result_data[`a_${a[search_org]}_order`] = {
                            display_order : ++i_count,
                            div_name : a[search_org_nm],
                            type : '수주'
                        }
                        a_result_data[`a_${a[search_org]}_sale`] = {
                            display_order : ++i_count,
                            div_name : a[search_org_nm],
                            type : '매출'
                        }
                        a_result_data[`a_${a[search_org]}_order_count`] = {
                            display_order : ++i_count,
                            div_name : a[search_org_nm],
                            type : '건수'
                        }
                    }
                    
                    o_total_sale['total_data'] = (o_total_sale?.['total_data'] ?? 0) + (a?.sale_amount ?? 0);
                    o_total_sale[`m_${s_month}_data`] = (o_total_sale?.[`m_${s_month}_data`] ?? 0) + (a?.sale_amount ?? 0);
    
                    a_result_data[`a_${a[search_org]}_order`]['total_data'] = (a_result_data?.[`a_${a[search_org]}_order`]['total_data'] ?? 0) + (flat_pl_contract?.[`_${a.biz_opp_no}_rodr_m${i}_amt`] ?? 0)
                    a_result_data[`a_${a[search_org]}_order`][`m_${s_month}_data`] = (a_result_data?.[`a_${a[search_org]}_order`][`m_${s_month}_data`] ?? 0) + (flat_pl_contract?.[`_${a.biz_opp_no}_rodr_m${i}_amt`] ?? 0)
                    a_result_data[`a_${a[search_org]}_sale`]['total_data'] = (a_result_data?.[`a_${a[search_org]}_sale`]['total_data'] ?? 0) + (a?.sale_amount ?? 0);
                    a_result_data[`a_${a[search_org]}_sale`][`m_${s_month}_data`] = (a_result_data?.[`a_${a[search_org]}_sale`][`m_${s_month}_data`] ?? 0) + (a?.sale_amount ?? 0);
                    a_result_data[`a_${a[search_org]}_order_count`][`total_data`] = (flat_pl_contract?.[`_${a.biz_opp_no}_rodr_m${i}_amt`] ?? 0) > 0 ? (a_result_data[`a_${a[search_org]}_order_count`][`total_data`] ?? 0) + 1 : a_result_data[`a_${a[search_org]}_order_count`][`total_data`];
                    a_result_data[`a_${a[search_org]}_order_count`][`m_${s_month}_data`] = (flat_pl_contract?.[`_${a.biz_opp_no}_rodr_m${i}_amt`] ?? 0) > 0 ? (a_result_data[`a_${a[search_org]}_order_count`][`m_${s_month}_data`] ?? 0) + 1 : a_result_data[`a_${a[search_org]}_order_count`][`m_${s_month}_data`] ?? 0;
                })
            }
            o_total_order['total_data'] = total_value;
            o_total_order_count['total_data'] = total_count;

            const a_result = Object.values(a_result_data);
            aRes.push(o_total_order,o_total_sale,o_total_order_count,...a_result);
        }else if(type === 'deal'){
            //건수 = 수주 건수
            const pl_col_list = [search_org, search_org_nm,
                'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum',
                'deal_stage_cd', 'biz_opp_no'];
            //임시로 'biz_opp_no': {'!=':null} 일단은 제거
            const pl_where_conditions = {'year': year, 'src_type':'D', [search_org]: {'!=': null}, month_amt : '12', 'deal_stage_cd': {'!=': null}};
            // const pl_where_conditions = {'year': year, 'src_type':'D', 'biz_opp_no': {'!=':null}, [search_org]: {'!=': null}, month_amt : '12', 'deal_stage_cd': {'!=': null}};
            const pl_groupBy_cols = [ search_org, search_org_nm, 'deal_stage_cd', 'biz_opp_no'];
    
            let pl_where = org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
    
            //pl 데이터 얻기
            const pl_data = await SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols);

            // pl_contract_amt 에서 사용할 전체 biz_opp_no인 ent_biz_opp_list와 조직별 포함된 biz_opp_no리스트 org_biz_opp_list정리, org list를 정리.
            let ent_biz_opp_list = [];
            let org_biz_opp_list = {};
            let org_list = [];
            pl_data.forEach(data=>{
                //전체 biz_opp_no 리스트 뽑기
                if(!ent_biz_opp_list.includes(data.biz_opp_no)){
                    ent_biz_opp_list.push(data.biz_opp_no);
                };

                //조직별 biz_opp_no 리스트 뽑기 ----- 임시로 biz_opp_no 안뽑음.
                if(!org_biz_opp_list[data[search_org]]){
                    org_biz_opp_list[data[search_org]] = [];
                };
                if(data.deal_stage_cd && !org_biz_opp_list[data[search_org]].includes(data.deal_stage_cd)){
                    org_biz_opp_list[data[search_org]].push(data.deal_stage_cd);
                };

                //조직 리스트 뽑기
                const exist = org_list.some(org => org.id === data[search_org]);
                if(!exist){
                    org_list.push({id:data[search_org], name:data[search_org_nm]});
                };
            });
            org_list.sort((a,b) =>Number(a.id)-Number(b.id));

            // pl_data 결과 값 flat 하게 데이터 구성
            let flat_pl = pl_data.reduce((acc, item) =>{
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
            let select_com_name
            if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id'){
                select_com_name = '전사';
            }else{
                select_com_name = org_nm;
            }
            const o_total_order = {
                display_order : i_count,
                div_name : select_com_name,
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
            const o_total_sale = {
                display_order : ++i_count,
                div_name : select_com_name,
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
            const o_total_order_count = {
                display_order : ++i_count,
                div_name : select_com_name,
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

            // 매출 토탈 row에 들어갈 데이터 구하기
            pl_data.forEach(data=>{
                o_total_sale['total_data'] += data.sale_amount_sum??0;
                if(data.deal_stage_cd === 'Lead'){
                    o_total_sale['lead_data'] += data.sale_amount_sum??0;
                }else if(data.deal_stage_cd === 'Registered'){
                    o_total_sale['registered_data'] += data.sale_amount_sum??0;
                }else if(data.deal_stage_cd === 'Identified'){
                    o_total_sale['identified_data'] += data.sale_amount_sum??0;
                }else if(data.deal_stage_cd === 'Identified-Remind'){
                    o_total_sale['identified_remind_data'] += data.sale_amount_sum??0;
                }else if(data.deal_stage_cd === 'Validated'){
                    o_total_sale['validated_data'] += data.sale_amount_sum??0;
                }else if(data.deal_stage_cd === 'Qualified'){
                    o_total_sale['qualified_data'] += data.sale_amount_sum??0;
                }else if(data.deal_stage_cd === 'Negotiated'){
                    o_total_sale['negotiated_data'] += data.sale_amount_sum??0;
                }else if(data.deal_stage_cd === 'Contracted'){
                    o_total_sale['contracted_data'] += data.sale_amount_sum??0;
                }else if(data.deal_stage_cd === 'Deal Lost'){
                    o_total_sale['deal_lost_data'] += data.sale_amount_sum??0;
                }else if(data.deal_stage_cd === 'Deselected'){
                    o_total_sale['deselected_data'] += data.sale_amount_sum??0;
                };
            });

            let a_result_data={}
            org_list.forEach(data=>{
                org_biz_opp_list[data.id].forEach(data2=>{
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

                    a_result_data[`a_${data.id}_sale`]['total_data'] = (a_result_data?.[`a_${data.id}_sale`]['total_data'] ?? 0) + (flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] ?? 0);  
                    if(data2 === 'Lead'){
                        a_result_data[`a_${data.id}_sale`]['lead_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Registered'){
                        a_result_data[`a_${data.id}_sale`]['registered_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Identified'){
                        a_result_data[`a_${data.id}_sale`]['identified_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Identified-Remind'){
                        a_result_data[`a_${data.id}_sale`]['identified_remind_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Validated'){
                        a_result_data[`a_${data.id}_sale`]['validated_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Qualified'){
                        a_result_data[`a_${data.id}_sale`]['qualified_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Negotiated'){
                        a_result_data[`a_${data.id}_sale`]['negotiated_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Contracted'){
                        a_result_data[`a_${data.id}_sale`]['contracted_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Deal Lost'){
                        a_result_data[`a_${data.id}_sale`]['deal_lost_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] ?? 0);
                    }else if(data2 === 'Deselected'){
                        a_result_data[`a_${data.id}_sale`]['deselected_data'] += (flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] ?? 0);
                    };
                })
            })

            const a_result = Object.values(a_result_data);
            aRes.push(o_total_order,o_total_sale,o_total_order_count,...a_result);
        }else if(type === 'rodr'){
            //건수 = 수주 건수
            const pl_col_list = [search_org, search_org_nm,
                'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum',
                'biz_opp_no'];
            //임시로 'biz_opp_no': {'!=':null} 일단은 제거
            const pl_where_conditions = {'year': year, 'src_type':'D', [search_org]: {'!=': null}, month_amt : '12'};
            // const pl_where_conditions = {'year': year, 'src_type':'D', 'biz_opp_no': {'!=':null}, [search_org]: {'!=': null}, month_amt : '12'};
            const pl_groupBy_cols = [ search_org, search_org_nm, 'biz_opp_no'];
    
            let pl_where = org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
    
            //pl 데이터 얻기
            const pl_data = await SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols);

            // pl_contract_amt 에서 사용할 전체 biz_opp_no인 ent_biz_opp_list와 조직별 포함된 biz_opp_no리스트 org_biz_opp_list정리, org list를 정리.
            let ent_biz_opp_list = [];
            let org_biz_opp_list = {};
            let org_list = [];
            pl_data.forEach(data=>{
                //전체 biz_opp_no 리스트 뽑기
                if(!ent_biz_opp_list.includes(data.biz_opp_no)){
                    ent_biz_opp_list.push(data.biz_opp_no);
                };

                //조직별 biz_opp_no 리스트 뽑기
                if(!org_biz_opp_list[data[search_org]]){
                    org_biz_opp_list[data[search_org]] = [];
                };
                if(data.biz_opp_no && !org_biz_opp_list[data[search_org]].includes(data.biz_opp_no)){
                    org_biz_opp_list[data[search_org]].push(data.biz_opp_no);
                };

                //조직 리스트 뽑기
                const exist = org_list.some(org => org.id === data[search_org]);
                if(!exist){
                    org_list.push({id:data[search_org], name:data[search_org_nm]});
                };
            });
            org_list.sort((a,b) =>Number(a.id)-Number(b.id));

            // pl_data 결과 값 flat 하게 데이터 구성
            let flat_pl = pl_data.reduce((acc, item) =>{
                let main = item['biz_opp_no'];
                let sub = item[search_org];
                let rest = {...item};
                delete rest['biz_opp_no'];
                delete rest[search_org];
                Object.entries(rest).forEach(([key, value])=>{
                    acc[`_${main}_${sub}_${key}`] = value;
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
            let select_com_name
            if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id'){
                select_com_name = '전사';
            }else{
                select_com_name = org_nm;
            }
            const o_total_order = {
                display_order : i_count,
                div_name : select_com_name,
                type : '수주',
                total_data : 0
            }
            const o_total_sale = {
                display_order : ++i_count,
                div_name : select_com_name,
                type : '매출',
                total_data : 0
            }
            const o_total_order_count = {
                display_order : ++i_count,
                div_name : select_com_name,
                type : '건수',
                total_data : 0
            }

            // 수주 토탈 row에 들어갈 데이터 구하기
            pl_contract_data.forEach(data=>{
                o_total_order['total_data'] += data.rodr_max_sum??0;
                if(data.rodr_max_sum > 0){
                    o_total_order_count['total_data']++;
                };
                
                if(data.rodr_max_sum < 100000000){
                    o_total_order['less100mil'] = (o_total_order?.['less100mil'] ?? 0) + (data?.rodr_max_sum ?? 0);
                    o_total_order_count['less100mil'] = (o_total_order_count?.['less100mil'] ?? 0) + 1;
                }else if( 100000000 <= data.rodr_max_sum && data.rodr_max_sum < 500000000 ){
                    o_total_order['100mil-500mil'] = (o_total_order?.['100mil-500mil'] ?? 0) + (data?.rodr_max_sum ?? 0);
                    o_total_order_count['100mil-500mil'] = (o_total_order_count?.['100mil-500mil'] ?? 0) + 1;
                }else if( 500000000 <= data.rodr_max_sum && data.rodr_max_sum < 1000000000 ){
                    o_total_order['500mil-1bil'] = (o_total_order?.['500mil-1bil'] ?? 0) + (data?.rodr_max_sum ?? 0);
                    o_total_order_count['500mil-1bil'] = (o_total_order_count?.['500mil-1bil'] ?? 0) + 1;
                }else if( 1000000000 <= data.rodr_max_sum && data.rodr_max_sum < 3000000000 ){
                    o_total_order['1bil-3bil'] = (o_total_order?.['1bil-3bil'] ?? 0) + (data?.rodr_max_sum ?? 0);
                    o_total_order_count['1bil-3bil'] = (o_total_order_count?.['1bil-3bil'] ?? 0) + 1;
                }else if( 3000000000 <= data.rodr_max_sum && data.rodr_max_sum < 5000000000 ){
                    o_total_order['3bil-5bil'] = (o_total_order?.['3bil-5bil'] ?? 0) + (data?.rodr_max_sum ?? 0);
                    o_total_order_count['3bil-5bil'] = (o_total_order_count?.['3bil-5bil'] ?? 0) + 1;
                }else if( 5000000000 <= data.rodr_max_sum && data.rodr_max_sum < 10000000000 ){
                    o_total_order['5bil-10bil'] = (o_total_order?.['5bil-10bil'] ?? 0) + (data?.rodr_max_sum ?? 0);
                    o_total_order_count['5bil-10bil'] = (o_total_order_count?.['5bil-10bil'] ?? 0) + 1;
                }else if( 10000000000 <= data.rodr_max_sum ){
                    o_total_order['more10bil'] = (o_total_order?.['more10bil'] ?? 0) + (data?.rodr_max_sum ?? 0);
                    o_total_order_count['more10bil'] = (o_total_order_count?.['more10bil'] ?? 0) + 1;
                };
            });

            // 매출 토탈 row에 들어갈 데이터 구하기
            pl_data.forEach(data=>{
                o_total_sale['total_data'] += data.sale_amount_sum??0;
                
                if(data.sale_amount_sum < 100000000){
                    o_total_sale['less100mil'] = (o_total_sale?.['less100mil'] ?? 0) + (data.sale_amount_sum ?? 0);
                }else if( 100000000 <= data.sale_amount_sum && data.sale_amount_sum < 500000000 ){
                    o_total_sale['100mil-500mil'] = (o_total_sale?.['100mil-500mil'] ?? 0) + (data.sale_amount_sum ?? 0);
                }else if( 500000000 <= data.sale_amount_sum && data.sale_amount_sum < 1000000000 ){
                    o_total_sale['500mil-1bil'] = (o_total_sale?.['500mil-1bil'] ?? 0) + (data.sale_amount_sum ?? 0);
                }else if( 1000000000 <= data.sale_amount_sum && data.sale_amount_sum < 3000000000 ){
                    o_total_sale['1bil-3bil'] = (o_total_sale?.['1bil-3bil'] ?? 0) + (data.sale_amount_sum ?? 0);
                }else if( 3000000000 <= data.sale_amount_sum && data.sale_amount_sum < 5000000000 ){
                    o_total_sale['3bil-5bil'] = (o_total_sale?.['3bil-5bil'] ?? 0) + (data.sale_amount_sum ?? 0);
                }else if( 5000000000 <= data.sale_amount_sum && data.sale_amount_sum < 10000000000 ){
                    o_total_sale['5bil-10bil'] = (o_total_sale?.['5bil-10bil'] ?? 0) + (data.sale_amount_sum ?? 0);
                }else if( 10000000000 <= data.sale_amount_sum ){
                    o_total_sale['more10bil'] = (o_total_sale?.['more10bil'] ?? 0) + (data.sale_amount_sum ?? 0);
                };
            });

            let a_result_data={}
            org_list.forEach(data=>{
                // 임시로직으로 매출이라도 나오게 수정
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
                a_result_data[`a_${data.id}_sale`]['total_data'] = (a_result_data?.[`a_${data.id}_sale`]['total_data'] ?? 0) + (flat_pl?.[`_null_${data.id}_sale_amount_sum`] ?? 0);  
                if(flat_pl?.[`_null_${data.id}_sale_amount_sum`] < 100000000){
                    a_result_data[`a_${data.id}_sale`]['less100mil'] = (a_result_data[`a_${data.id}_sale`]['less100mil'] ?? 0) + flat_pl?.[`_null_${data.id}_sale_amount_sum`];
                }else if( 100000000 <= flat_pl?.[`_null_${data.id}_sale_amount_sum`] && flat_pl?.[`_null_${data.id}_sale_amount_sum`] < 500000000 ){
                    a_result_data[`a_${data.id}_sale`]['100mil-500mil'] = (a_result_data[`a_${data.id}_sale`]['100mil-500mil'] ?? 0) + flat_pl?.[`_null_${data.id}_sale_amount_sum`];
                }else if( 500000000 <= flat_pl?.[`_null_${data.id}_sale_amount_sum`] && flat_pl?.[`_null_${data.id}_sale_amount_sum`] < 1000000000 ){
                    a_result_data[`a_${data.id}_sale`]['500mil-1bil'] = (a_result_data[`a_${data.id}_sale`]['500mil-1bil'] ?? 0) + flat_pl?.[`_null_${data.id}_sale_amount_sum`];
                }else if( 1000000000 <= flat_pl?.[`_null_${data.id}_sale_amount_sum`] && flat_pl?.[`_null_${data.id}_sale_amount_sum`] < 3000000000 ){
                    a_result_data[`a_${data.id}_sale`]['1bil-3bil'] = (a_result_data[`a_${data.id}_sale`]['1bil-3bil'] ?? 0) + flat_pl?.[`_null_${data.id}_sale_amount_sum`];
                }else if( 3000000000 <= flat_pl?.[`_null_${data.id}_sale_amount_sum`] && flat_pl?.[`_null_${data.id}_sale_amount_sum`] < 5000000000 ){
                    a_result_data[`a_${data.id}_sale`]['3bil-5bil'] = (a_result_data[`a_${data.id}_sale`]['3bil-5bil'] ?? 0) + flat_pl?.[`_null_${data.id}_sale_amount_sum`];
                }else if( 5000000000 <= flat_pl?.[`_null_${data.id}_sale_amount_sum`] && flat_pl?.[`_null_${data.id}_sale_amount_sum`] < 10000000000 ){
                    a_result_data[`a_${data.id}_sale`]['5bil-10bil'] = (a_result_data[`a_${data.id}_sale`]['5bil-10bil'] ?? 0) + flat_pl?.[`_null_${data.id}_sale_amount_sum`];
                }else if( 10000000000 <= flat_pl?.[`_null_${data.id}_sale_amount_sum`] ){
                    a_result_data[`a_${data.id}_sale`]['more10bil'] = (a_result_data[`a_${data.id}_sale`]['more10bil'] ?? 0) + flat_pl?.[`_null_${data.id}_sale_amount_sum`];
                };
                // 임시로직으로 매출이라도 나오게 수정
                // org_biz_opp_list[data.id].forEach(data2=>{
                //     if(!a_result_data[`a_${data.id}_order`]){
                //         a_result_data[`a_${data.id}_order`] = {
                //             display_order : ++i_count,
                //             div_name : data.name,
                //             type : '수주',
                //             total_data : 0
                //         }
                //         a_result_data[`a_${data.id}_sale`] = {
                //             display_order : ++i_count,
                //             div_name : data.name,
                //             type : '매출',
                //             total_data : 0
                //         }
                //         a_result_data[`a_${data.id}_order_count`] = {
                //             display_order : ++i_count,
                //             div_name : data.name,
                //             type : '건수',
                //             total_data : 0
                //         }
                //     };

                //     a_result_data[`a_${data.id}_order`]['total_data'] = (a_result_data?.[`a_${data.id}_order`]['total_data'] ?? 0) + (flat_pl_contract?.[`_${data2}_rodr_max_sum`] ?? 0);
                //     a_result_data[`a_${data.id}_sale`]['total_data'] = (a_result_data?.[`a_${data.id}_sale`]['total_data'] ?? 0) + (flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] ?? 0);  
                //     a_result_data[`a_${data.id}_order_count`][`total_data`] = (flat_pl_contract?.[`_${data2}_rodr_max_sum`] ?? 0) > 0 ? a_result_data[`a_${data.id}_order_count`][`total_data`] + 1 : a_result_data[`a_${data.id}_order_count`][`total_data`];

                //     if(flat_pl_contract?.[`_${data2}_rodr_max_sum`] < 100000000){
                //         a_result_data[`a_${data.id}_order`]['less100mil'] = (a_result_data[`a_${data.id}_order`]['less100mil'] ?? 0) + flat_pl_contract?.[`_${data2}_rodr_max_sum`];
                //         a_result_data[`a_${data.id}_order_count`]['less100mil'] = (a_result_data[`a_${data.id}_order_count`]['less100mil'] ?? 0) + 1;
                //     }else if( 100000000 <= flat_pl_contract?.[`_${data2}_rodr_max_sum`] && flat_pl_contract?.[`_${data2}_rodr_max_sum`] < 500000000 ){
                //         a_result_data[`a_${data.id}_order`]['100mil-500mil'] = (a_result_data[`a_${data.id}_order`]['100mil-500mil'] ?? 0) + flat_pl_contract?.[`_${data2}_rodr_max_sum`];
                //         a_result_data[`a_${data.id}_order_count`]['100mil-500mil'] = (a_result_data[`a_${data.id}_order_count`]['100mil-500mil'] ?? 0) + 1;
                //     }else if( 500000000 <= flat_pl_contract?.[`_${data2}_rodr_max_sum`] && flat_pl_contract?.[`_${data2}_rodr_max_sum`] < 1000000000 ){
                //         a_result_data[`a_${data.id}_order`]['500mil-1bil'] = (a_result_data[`a_${data.id}_order`]['500mil-1bil'] ?? 0) + flat_pl_contract?.[`_${data2}_rodr_max_sum`];
                //         a_result_data[`a_${data.id}_order_count`]['500mil-1bil'] = (a_result_data[`a_${data.id}_order_count`]['500mil-1bil'] ?? 0) + 1;
                //     }else if( 1000000000 <= flat_pl_contract?.[`_${data2}_rodr_max_sum`] && flat_pl_contract?.[`_${data2}_rodr_max_sum`] < 3000000000 ){
                //         a_result_data[`a_${data.id}_order`]['1bil-3bil'] = (a_result_data[`a_${data.id}_order`]['1bil-3bil'] ?? 0) + flat_pl_contract?.[`_${data2}_rodr_max_sum`];
                //         a_result_data[`a_${data.id}_order_count`]['1bil-3bil'] = (a_result_data[`a_${data.id}_order_count`]['1bil-3bil'] ?? 0) + 1;
                //     }else if( 3000000000 <= flat_pl_contract?.[`_${data2}_rodr_max_sum`] && flat_pl_contract?.[`_${data2}_rodr_max_sum`] < 5000000000 ){
                //         a_result_data[`a_${data.id}_order`]['3bil-5bil'] = (a_result_data[`a_${data.id}_order`]['3bil-5bil'] ?? 0) + flat_pl_contract?.[`_${data2}_rodr_max_sum`];
                //         a_result_data[`a_${data.id}_order_count`]['3bil-5bil'] = (a_result_data[`a_${data.id}_order_count`]['3bil-5bil'] ?? 0) + 1;
                //     }else if( 5000000000 <= flat_pl_contract?.[`_${data2}_rodr_max_sum`] && flat_pl_contract?.[`_${data2}_rodr_max_sum`] < 10000000000 ){
                //         a_result_data[`a_${data.id}_order`]['5bil-10bil'] = (a_result_data[`a_${data.id}_order`]['5bil-10bil'] ?? 0) + flat_pl_contract?.[`_${data2}_rodr_max_sum`];
                //         a_result_data[`a_${data.id}_order_count`]['5bil-10bil'] = (a_result_data[`a_${data.id}_order_count`]['5bil-10bil'] ?? 0) + 1;
                //     }else if( 10000000000 <= flat_pl_contract?.[`_${data2}_rodr_max_sum`] ){
                //         a_result_data[`a_${data.id}_order`]['more10bil'] = (a_result_data[`a_${data.id}_order`]['more10bil'] ?? 0) + flat_pl_contract?.[`_${data2}_rodr_max_sum`];
                //         a_result_data[`a_${data.id}_order_count`]['more10bil'] = (a_result_data[`a_${data.id}_order_count`]['more10bil'] ?? 0) + 1;
                //     };

                //     if(flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] < 100000000){
                //         a_result_data[`a_${data.id}_sale`]['less100mil'] = (a_result_data[`a_${data.id}_sale`]['less100mil'] ?? 0) + flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`];
                //     }else if( 100000000 <= flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] && flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] < 500000000 ){
                //         a_result_data[`a_${data.id}_sale`]['100mil-500mil'] = (a_result_data[`a_${data.id}_sale`]['100mil-500mil'] ?? 0) + flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`];
                //     }else if( 500000000 <= flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] && flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] < 1000000000 ){
                //         a_result_data[`a_${data.id}_sale`]['500mil-1bil'] = (a_result_data[`a_${data.id}_sale`]['500mil-1bil'] ?? 0) + flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`];
                //     }else if( 1000000000 <= flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] && flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] < 3000000000 ){
                //         a_result_data[`a_${data.id}_sale`]['1bil-3bil'] = (a_result_data[`a_${data.id}_sale`]['1bil-3bil'] ?? 0) + flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`];
                //     }else if( 3000000000 <= flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] && flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] < 5000000000 ){
                //         a_result_data[`a_${data.id}_sale`]['3bil-5bil'] = (a_result_data[`a_${data.id}_sale`]['3bil-5bil'] ?? 0) + flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`];
                //     }else if( 5000000000 <= flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] && flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] < 10000000000 ){
                //         a_result_data[`a_${data.id}_sale`]['5bil-10bil'] = (a_result_data[`a_${data.id}_sale`]['5bil-10bil'] ?? 0) + flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`];
                //     }else if( 10000000000 <= flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`] ){
                //         a_result_data[`a_${data.id}_sale`]['more10bil'] = (a_result_data[`a_${data.id}_sale`]['more10bil'] ?? 0) + flat_pl?.[`_${data2}_${data.id}_sale_amount_sum`];
                //     };
                // })
            })

            const a_result = Object.values(a_result_data);
            aRes.push(o_total_order,o_total_sale,o_total_order_count,...a_result);
        }else{
            return;
        }

        return aRes
    })
}