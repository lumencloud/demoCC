const { isRedirect } = require("@sap/cds/libx/odata/utils");

module.exports = (srv) => {
    srv.on('get_forecast_sga_detail', async (req) => {

        // function 호출 리턴 객체
        const aRes = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        /**
         * pl.wideview_unpivot_view [실적]
         * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const sga_view = db.entities('sga').wideview_unpivot_view;
        /**
         * rsp_wideview_unpivot_view [총비용]
         */
        const rsp_view = db.entities('rsp').wideview_unpivot_view;
        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;
        
        // function 입력 파라미터 - type 값 month(월기준), deal(deal stage 기준), rodr(수주 금액 기준) 
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

        //sga 및 rsp db 검색 조건.
        const sga_col_list = ['year', 'month_amt', search_org, search_org_nm,
            'sum(ifnull(labor_amount,0)) as labor_amount',
            'sum(ifnull(labor_amount_sum,0)) as labor_amount_sum',
            'sum(ifnull(iv_amount,0)) as iv_amount',
            'sum(ifnull(iv_amount_sum,0)) as iv_amount_sum',
            'sum(ifnull(exp_amount,0)) as exp_amount',
            'sum(ifnull(exp_amount_sum,0)) as exp_amount_sum',
            ];
        const sga_where_conditions = {'year': year, [search_org]: {'!=': null}};
        const sga_groupBy_cols = ['year', 'month_amt', search_org, search_org_nm];

        const rsp_col_list = ['year', 'month_amt', search_org, search_org_nm, 'sum(ifnull(opp_amt,0)) as opp_amt', 'sum(ifnull(opp_amt_sum,0)) as opp_amt_sum'];
        const rsp_where_conditions = {'year' : year, [search_org]: {'!=': null}, 'is_delivery': true};
        const rsp_groupBy_cols = ['year','month_amt', search_org, search_org_nm];
        
        let sga_where = org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id };
        let rsp_where = org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' ? rsp_where_conditions : { ...rsp_where_conditions, [org_col_nm]: org_id };
        
        const [sga_query, rsp_query] = await Promise.all([
            SELECT.from(sga_view).columns(sga_col_list).where(sga_where).groupBy(...sga_groupBy_cols),
            SELECT.from(rsp_view).columns(rsp_col_list).where(rsp_where).groupBy(...rsp_groupBy_cols),
        ]);
        
        let flat_sga = sga_query.reduce((acc, item) =>{
            let main = item['year'];
            let mon = item['month_amt'];
            let sub = item[search_org];
            let rest = {...item};
            delete rest['year'];
            delete rest['month_amt'];
            delete rest[search_org];
            Object.entries(rest).forEach(([key, value])=>{
                acc[`_${main}_${mon}_${sub}_${key}`] = value;
            });
            return acc;
        }, {});
        
        let flat_rsp = rsp_query.reduce((acc, item) =>{
            let main = item['year'];
            let mon = item['month_amt'];
            let sub = item[search_org];
            let rest = {...item};
            delete rest['year'];
            delete rest['month_amt'];
            delete rest[search_org];
            Object.entries(rest).forEach(([key, value])=>{
                acc[`_${main}_${mon}_${sub}_${key}`] = value;
            });
            return acc;
        }, {});

        //조직 리스트 뽑기
        let org_list=[];
        sga_query.forEach(data=>{
            const exist = org_list.some(org => org.id === data[search_org]);
            if(!exist){
                org_list.push({id:data[search_org], name:data[search_org_nm]});
            };
        });
        org_list.sort((a,b) =>Number(a.id)-Number(b.id));

        // 테이블 row 정렬 순서 정의를 위한 count 및 조직 이름 설정.
        let i_count = 0;
        let select_com_name
        if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id'){
            select_com_name = '전사';
        }else{
            select_com_name = org_nm;
        };

        //선택한 조직의 row 구성을 위한 base data
        const o_total_ex = {
            display_order : i_count,
            div_name : select_com_name,
            type : '경비',
            forecast_value:0,
            secured_value:0,
            not_secured_value:0
        }
        const o_total_la = {
            display_order : ++i_count,
            div_name : select_com_name,
            type : '인건비',
            forecast_value:0,
            secured_value:0,
            not_secured_value:0
        }
        const o_total_iv = {
            display_order : ++i_count,
            div_name : select_com_name,
            type : '투자비',
            forecast_value:0,
            secured_value:0,
            not_secured_value:0
        }
        
        //선택한 조직의 sga 및 rsp 데이터 구성.
        sga_query.forEach(data=>{
            for(let i = i_month+1 ; i <= 12; i++){
                let s_month = i.toString().padStart(2,'0');
                if(data.month_amt === s_month){
                    o_total_ex['secured_value'] += data.exp_amount??0;
                    o_total_iv['secured_value'] += data.iv_amount??0;
                    o_total_la['secured_value'] += data.labor_amount??0;
                };
            };

            for(let i = 1 ; i <= i_month; i++){
                let s_month = i.toString().padStart(2,'0');
                if(data.month_amt === s_month){
                    o_total_ex['forecast_value'] += data.exp_amount??0;
                    o_total_ex['not_secured_value'] += data.exp_amount??0;
                    o_total_iv['forecast_value'] += data.iv_amount??0;
                    o_total_iv['not_secured_value'] += data.iv_amount??0;
                };
            };
        });
        
        rsp_query.forEach(data=>{
            for(let i = 1 ; i <= i_month; i++){
                let s_month = i.toString().padStart(2,'0');
                if(data.month_amt === s_month){
                    o_total_la['forecast_value'] += data.opp_amt??0;
                    o_total_la['not_secured_value'] += data.opp_amt??0;
                };
            };
        });
        
        //선택한 조직의 하위 조직 데이터 구성
        let a_result_data={}
        org_list.forEach(data=>{
            if(!a_result_data[`a_${data['id']}_ex`]){
                a_result_data[`a_${data['id']}_ex`] = {
                    display_order : ++i_count,
                    div_name : data['name'],
                    type : '경비',
                    forecast_value:0,
                    secured_value:0,
                    not_secured_value:0
                }
                a_result_data[`a_${data['id']}_la`] = {
                    display_order : ++i_count,
                    div_name : data['name'],
                    type : '인건비',
                    forecast_value:0,
                    secured_value:0,
                    not_secured_value:0
                }
                a_result_data[`a_${data['id']}_iv`] = {
                    display_order : ++i_count,
                    div_name : data['name'],
                    type : '투자비',
                    forecast_value:0,
                    secured_value:0,
                    not_secured_value:0
                }
            };

            for(let i = i_month+1 ; i <= 12; i++){
                let s_month = i.toString().padStart(2,'0');
                a_result_data[`a_${data['id']}_ex`]['secured_value'] = a_result_data[`a_${data['id']}_ex`]['secured_value'] + (flat_sga?.[`_${year}_${s_month}_${data['id']}_exp_amount`] ?? 0)
                a_result_data[`a_${data['id']}_iv`]['secured_value'] = a_result_data[`a_${data['id']}_ex`]['secured_value'] + (flat_sga?.[`_${year}_${s_month}_${data['id']}_iv_amount`] ?? 0)
                a_result_data[`a_${data['id']}_la`]['secured_value'] = a_result_data[`a_${data['id']}_ex`]['secured_value'] + (flat_sga?.[`_${year}_${s_month}_${data['id']}_labor_amount`] ?? 0)

            };

            for(let i = 1 ; i <= i_month; i++){
                let s_month = i.toString().padStart(2,'0');
                a_result_data[`a_${data['id']}_ex`]['forecast_value'] = a_result_data[`a_${data['id']}_ex`]['forecast_value'] + (flat_sga?.[`_${year}_${s_month}_${data['id']}_exp_amount`] ?? 0)
                a_result_data[`a_${data['id']}_ex`]['not_secured_value'] = a_result_data[`a_${data['id']}_ex`]['not_secured_value'] + (flat_sga?.[`_${year}_${s_month}_${data['id']}_exp_amount`] ?? 0)
                a_result_data[`a_${data['id']}_iv`]['forecast_value'] = a_result_data[`a_${data['id']}_ex`]['forecast_value'] + (flat_sga?.[`_${year}_${s_month}_${data['id']}_iv_amount`] ?? 0)
                a_result_data[`a_${data['id']}_iv`]['not_secured_value'] = a_result_data[`a_${data['id']}_ex`]['not_secured_value'] + (flat_sga?.[`_${year}_${s_month}_${data['id']}_iv_amount`] ?? 0)
                a_result_data[`a_${data['id']}_la`]['forecast_value'] = a_result_data[`a_${data['id']}_ex`]['forecast_value'] + (flat_rsp?.[`_${year}_${s_month}_${data['id']}_opp_amt`] ?? 0)
                a_result_data[`a_${data['id']}_la`]['not_secured_value'] = a_result_data[`a_${data['id']}_ex`]['not_secured_value'] + (flat_rsp?.[`_${year}_${s_month}_${data['id']}_opp_amt`] ?? 0)
            };
        });

        //구성된 데이터 리턴
        const a_result = Object.values(a_result_data);
        aRes.push(o_total_ex,o_total_la,o_total_iv,...a_result);

        return aRes
    })
}