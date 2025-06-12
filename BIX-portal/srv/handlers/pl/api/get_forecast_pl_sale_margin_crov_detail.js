module.exports = (srv) => {
    srv.on('get_forecast_pl_sale_margin_crov_detail', async (req) => {
        /**
         * API 리턴값 담을 배열 선언
         */
        const oResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');
  
        // =========================== 조회 대상 DB 테이블 ===========================
        // entities('<cds namespace 명>').<cds entity 명>
        // srv .cds 에 using from 구문에 엔티티가 속한 db .cds 파일이 최소 한 번이라도 걸려있어야 db.entities 로 엔티티 인식가능
        // (서비스에 등록할 필요는 없음)
        /**
         * pl_wideview_unpivot_view [실적]
         */
        const pl_view = db.entities('pl').wideview_unpivot_view;
        /**
         * common_org_full_level_view [조직정보]
         */
        const org_full_level = db.entities('common').org_full_level_view;
        // =================================================================================

        // function 입력 파라미터
        const { year, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

        /**
         * org_id 파라미터값으로 조직정보 조회
         * 
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
            .where`org_id = ${org_id} and (lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id})`;

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        // 조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
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

        /**
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const pl_col_list = [
            'year', 'src_type', 'crov_div_yn', 'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(prj_prfm_amount_sum,0)) as prj_prfm_amount_sum', 'sum(ifnull(margin_amount_sum,0)) as margin_amount_sum'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': '12', 'src_type': { '!=': 'WA' }, 'crov_div_yn': {'!=': null}, [search_org]: {'!=': null}};
        const pl_groupBy_cols = ['year', 'src_type', 'crov_div_yn'];

        // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
        let pl_column = [ ...pl_col_list, search_org, search_org_nm ];
        let pl_where = (org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id') ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
        let pl_groupBy = [ ...pl_groupBy_cols, search_org, search_org_nm ];

        // DB 쿼리 실행 (병렬)
        const [query] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy)
        ]);
        
        let pl_crovtrue_last_y_row = {}
        let pl_crovfalse_last_y_row = {}
        let pl_crovtrue_curr_y_row = {}
        let pl_crovfalse_curr_y_row = {}
        let not_secured_pl_crovtrue_last_y_row = {}
        let not_secured_pl_crovfalse_last_y_row = {}
        let not_secured_pl_crovtrue_curr_y_row = {} 
        let not_secured_pl_crovfalse_curr_y_row = {} 
        let secured_pl_crovtrue_last_y_row = {} 
        let secured_pl_crovfalse_last_y_row = {} 
        let secured_pl_crovtrue_curr_y_row = {}
        let secured_pl_crovfalse_curr_y_row = {}
        let org_key = [];

        query.forEach(a=>{
            if(a.crov_div_yn){
                if(a.year === year){
                    if(a.src_type==='D'){
                        if(!not_secured_pl_crovtrue_curr_y_row[a[search_org]]){
                            not_secured_pl_crovtrue_curr_y_row[a[search_org]] = {};
                        };
                        not_secured_pl_crovtrue_curr_y_row[a[search_org]]['sale_amount_sum'] = (not_secured_pl_crovtrue_curr_y_row?.[a[search_org]]['sale_amount_sum'] ?? 0) + a['sale_amount_sum'];
                        not_secured_pl_crovtrue_curr_y_row[a[search_org]]['prj_prfm_amount_sum'] = (not_secured_pl_crovtrue_curr_y_row?.[a[search_org]]['prj_prfm_amount_sum'] ?? 0) + a['prj_prfm_amount_sum'];
                        not_secured_pl_crovtrue_curr_y_row[a[search_org]]['margin_amount_sum'] = (not_secured_pl_crovtrue_curr_y_row?.[a[search_org]]['margin_amount_sum'] ?? 0) + a['margin_amount_sum'];
                    }else{
                        if(!secured_pl_crovtrue_curr_y_row[a[search_org]]){
                            secured_pl_crovtrue_curr_y_row[a[search_org]] = {};
                        };
                        secured_pl_crovtrue_curr_y_row[a[search_org]]['sale_amount_sum'] = (secured_pl_crovtrue_curr_y_row?.[a[search_org]]['sale_amount_sum'] ?? 0) + a['sale_amount_sum'];
                        secured_pl_crovtrue_curr_y_row[a[search_org]]['prj_prfm_amount_sum'] = (secured_pl_crovtrue_curr_y_row?.[a[search_org]]['prj_prfm_amount_sum'] ?? 0) + a['prj_prfm_amount_sum'];
                        secured_pl_crovtrue_curr_y_row[a[search_org]]['margin_amount_sum'] = (secured_pl_crovtrue_curr_y_row?.[a[search_org]]['margin_amount_sum'] ?? 0) + a['margin_amount_sum'];
                    };
                    if(!pl_crovtrue_curr_y_row[a[search_org]]){
                        pl_crovtrue_curr_y_row[a[search_org]] = {};
                    };
                    pl_crovtrue_curr_y_row[a[search_org]]['sale_amount_sum'] = (pl_crovtrue_curr_y_row?.[a[search_org]]['sale_amount_sum'] ?? 0) + a['sale_amount_sum'];
                    pl_crovtrue_curr_y_row[a[search_org]]['prj_prfm_amount_sum'] = (pl_crovtrue_curr_y_row?.[a[search_org]]['prj_prfm_amount_sum'] ?? 0) + a['prj_prfm_amount_sum'];
                    pl_crovtrue_curr_y_row[a[search_org]]['margin_amount_sum'] = (pl_crovtrue_curr_y_row?.[a[search_org]]['margin_amount_sum'] ?? 0) + a['margin_amount_sum'];
                    
                }else{
                    if(a.src_type==='D'){
                        if(!not_secured_pl_crovtrue_last_y_row[a[search_org]]){
                            not_secured_pl_crovtrue_last_y_row[a[search_org]] = {};
                        };
                        not_secured_pl_crovtrue_last_y_row[a[search_org]]['sale_amount_sum'] = (not_secured_pl_crovtrue_last_y_row?.[a[search_org]]['sale_amount_sum'] ?? 0) + a['sale_amount_sum'];
                        not_secured_pl_crovtrue_last_y_row[a[search_org]]['prj_prfm_amount_sum'] = (not_secured_pl_crovtrue_last_y_row?.[a[search_org]]['prj_prfm_amount_sum'] ?? 0) + a['prj_prfm_amount_sum'];
                        not_secured_pl_crovtrue_last_y_row[a[search_org]]['margin_amount_sum'] = (not_secured_pl_crovtrue_last_y_row?.[a[search_org]]['margin_amount_sum'] ?? 0) + a['margin_amount_sum'];
                    }else{
                        if(!secured_pl_crovtrue_last_y_row[a[search_org]]){
                            secured_pl_crovtrue_last_y_row[a[search_org]] = {};
                        };
                        secured_pl_crovtrue_last_y_row[a[search_org]]['sale_amount_sum'] = (secured_pl_crovtrue_last_y_row?.[a[search_org]]['sale_amount_sum'] ?? 0) + a['sale_amount_sum'];
                        secured_pl_crovtrue_last_y_row[a[search_org]]['prj_prfm_amount_sum'] = (secured_pl_crovtrue_last_y_row?.[a[search_org]]['prj_prfm_amount_sum'] ?? 0) + a['prj_prfm_amount_sum'];
                        secured_pl_crovtrue_last_y_row[a[search_org]]['margin_amount_sum'] = (secured_pl_crovtrue_last_y_row?.[a[search_org]]['margin_amount_sum'] ?? 0) + a['margin_amount_sum'];
                    };
                    if(!pl_crovtrue_last_y_row[a[search_org]]){
                        pl_crovtrue_last_y_row[a[search_org]] = {};
                    };
                    pl_crovtrue_last_y_row[a[search_org]]['sale_amount_sum'] = (pl_crovtrue_last_y_row?.[a[search_org]]['sale_amount_sum'] ?? 0) + a['sale_amount_sum'];
                    pl_crovtrue_last_y_row[a[search_org]]['prj_prfm_amount_sum'] = (pl_crovtrue_last_y_row?.[a[search_org]]['prj_prfm_amount_sum'] ?? 0) + a['prj_prfm_amount_sum'];
                    pl_crovtrue_last_y_row[a[search_org]]['margin_amount_sum'] = (pl_crovtrue_last_y_row?.[a[search_org]]['margin_amount_sum'] ?? 0) + a['margin_amount_sum'];
                };
            }else{
                if(a.year === year){
                    if(a.src_type==='D'){
                        if(!not_secured_pl_crovfalse_curr_y_row[a[search_org]]){
                            not_secured_pl_crovfalse_curr_y_row[a[search_org]] = {};
                        };
                        not_secured_pl_crovfalse_curr_y_row[a[search_org]]['sale_amount_sum'] = (not_secured_pl_crovfalse_curr_y_row?.[a[search_org]]['sale_amount_sum'] ?? 0) + a['sale_amount_sum'];
                        not_secured_pl_crovfalse_curr_y_row[a[search_org]]['prj_prfm_amount_sum'] = (not_secured_pl_crovfalse_curr_y_row?.[a[search_org]]['prj_prfm_amount_sum'] ?? 0) + a['prj_prfm_amount_sum'];
                        not_secured_pl_crovfalse_curr_y_row[a[search_org]]['margin_amount_sum'] = (not_secured_pl_crovfalse_curr_y_row?.[a[search_org]]['margin_amount_sum'] ?? 0) + a['margin_amount_sum'];
                    }else{
                        if(!secured_pl_crovfalse_curr_y_row[a[search_org]]){
                            secured_pl_crovfalse_curr_y_row[a[search_org]] = {};
                        };
                        secured_pl_crovfalse_curr_y_row[a[search_org]]['sale_amount_sum'] = (secured_pl_crovfalse_curr_y_row?.[a[search_org]]['sale_amount_sum'] ?? 0) + a['sale_amount_sum'];
                        secured_pl_crovfalse_curr_y_row[a[search_org]]['prj_prfm_amount_sum'] = (secured_pl_crovfalse_curr_y_row?.[a[search_org]]['prj_prfm_amount_sum'] ?? 0) + a['prj_prfm_amount_sum'];
                        secured_pl_crovfalse_curr_y_row[a[search_org]]['margin_amount_sum'] = (secured_pl_crovfalse_curr_y_row?.[a[search_org]]['margin_amount_sum'] ?? 0) + a['margin_amount_sum'];
                    };
                    if(!pl_crovfalse_curr_y_row[a[search_org]]){
                        pl_crovfalse_curr_y_row[a[search_org]] = {};
                    };
                    pl_crovfalse_curr_y_row[a[search_org]]['sale_amount_sum'] = (pl_crovfalse_curr_y_row?.[a[search_org]]['sale_amount_sum'] ?? 0) + a['sale_amount_sum'];
                    pl_crovfalse_curr_y_row[a[search_org]]['prj_prfm_amount_sum'] = (pl_crovfalse_curr_y_row?.[a[search_org]]['prj_prfm_amount_sum'] ?? 0) + a['prj_prfm_amount_sum'];
                    pl_crovfalse_curr_y_row[a[search_org]]['margin_amount_sum'] = (pl_crovfalse_curr_y_row?.[a[search_org]]['margin_amount_sum'] ?? 0) + a['margin_amount_sum'];
                    
                }else{
                    if(a.src_type==='D'){
                        if(!not_secured_pl_crovfalse_last_y_row[a[search_org]]){
                            not_secured_pl_crovfalse_last_y_row[a[search_org]] = {};
                        };
                        not_secured_pl_crovfalse_last_y_row[a[search_org]]['sale_amount_sum'] = (not_secured_pl_crovfalse_last_y_row?.[a[search_org]]['sale_amount_sum'] ?? 0) + a['sale_amount_sum'];
                        not_secured_pl_crovfalse_last_y_row[a[search_org]]['prj_prfm_amount_sum'] = (not_secured_pl_crovfalse_last_y_row?.[a[search_org]]['prj_prfm_amount_sum'] ?? 0) + a['prj_prfm_amount_sum'];
                        not_secured_pl_crovfalse_last_y_row[a[search_org]]['margin_amount_sum'] = (not_secured_pl_crovfalse_last_y_row?.[a[search_org]]['margin_amount_sum'] ?? 0) + a['margin_amount_sum'];
                    }else{
                        if(!secured_pl_crovfalse_last_y_row[a[search_org]]){
                            secured_pl_crovfalse_last_y_row[a[search_org]] = {};
                        };
                        secured_pl_crovfalse_last_y_row[a[search_org]]['sale_amount_sum'] = (secured_pl_crovfalse_last_y_row?.[a[search_org]]['sale_amount_sum'] ?? 0) + a['sale_amount_sum'];
                        secured_pl_crovfalse_last_y_row[a[search_org]]['prj_prfm_amount_sum'] = (secured_pl_crovfalse_last_y_row?.[a[search_org]]['prj_prfm_amount_sum'] ?? 0) + a['prj_prfm_amount_sum'];
                        secured_pl_crovfalse_last_y_row[a[search_org]]['margin_amount_sum'] = (secured_pl_crovfalse_last_y_row?.[a[search_org]]['margin_amount_sum'] ?? 0) + a['margin_amount_sum'];
                    };
                    if(!pl_crovfalse_last_y_row[a[search_org]]){
                        pl_crovfalse_last_y_row[a[search_org]] = {};
                    };
                    pl_crovfalse_last_y_row[a[search_org]]['sale_amount_sum'] = (pl_crovfalse_last_y_row?.[a[search_org]]['sale_amount_sum'] ?? 0) + a['sale_amount_sum'];
                    pl_crovfalse_last_y_row[a[search_org]]['prj_prfm_amount_sum'] = (pl_crovfalse_last_y_row?.[a[search_org]]['prj_prfm_amount_sum'] ?? 0) + a['prj_prfm_amount_sum'];
                    pl_crovfalse_last_y_row[a[search_org]]['margin_amount_sum'] = (pl_crovfalse_last_y_row?.[a[search_org]]['margin_amount_sum'] ?? 0) + a['margin_amount_sum'];
                };
            }

            const exist = org_key.some(data=> data['id'] === a[search_org]);
            if(!exist){
                let oTemp = {
                    id : a[search_org],
                    name : a[search_org_nm]
                }
                org_key.push(oTemp);
            };
        })

        let i_count = 0;
        org_key.forEach(data=>{
            let oTemp = {
                display_order : ++i_count,
                org_name : data.name,
                org_id : data.id,
                type1: "신규",
                type2: "매출",
                forecast_value : pl_crovfalse_curr_y_row?.[data.id]?.['sale_amount_sum'] ?? 0,
                secured_value : secured_pl_crovfalse_curr_y_row?.[data.id]?.["sale_amount_sum"] ?? 0,
                not_secured_value : not_secured_pl_crovfalse_curr_y_row?.[data.id]?.["sale_amount_sum"] ?? 0,
                plan_ratio : (pl_crovfalse_curr_y_row?.[data.id]?.['sale_amount_sum'] ?? 0) !== 0 ? (secured_pl_crovfalse_curr_y_row?.[data.id]?.["sale_amount_sum"] ?? 0) / pl_crovfalse_curr_y_row[data.id]['sale_amount_sum'] * 100 : 0,
                yoy : (pl_crovfalse_curr_y_row?.[data.id]?.['sale_amount_sum'] ?? 0) !== 0 ? (pl_crovfalse_last_y_row?.[data.id]?.['sale_amount_sum'] ?? 0)/pl_crovfalse_curr_y_row[data.id]['sale_amount_sum'] * 100 : 0
            };
            oResult.push(oTemp);

            oTemp = {
                display_order : ++i_count,
                org_name : data.name,
                org_id : data.id,
                type1: "신규",
                type2: "마진",
                forecast_value : pl_crovfalse_curr_y_row?.[data.id]?.['margin_amount_sum'] ?? 0,
                secured_value : secured_pl_crovfalse_curr_y_row?.[data.id]?.["margin_amount_sum"] ?? 0,
                not_secured_value : not_secured_pl_crovfalse_curr_y_row?.[data.id]?.["margin_amount_sum"] ?? 0,
                plan_ratio : (pl_crovfalse_curr_y_row?.[data.id]?.['margin_amount_sum'] ?? 0) !== 0 ? (secured_pl_crovfalse_curr_y_row?.[data.id]?.["margin_amount_sum"] ?? 0) / pl_crovfalse_curr_y_row[data.id]['margin_amount_sum'] * 100 : 0,
                yoy : (pl_crovfalse_curr_y_row?.[data.id]?.['margin_amount_sum'] ?? 0) !== 0 ? (pl_crovfalse_last_y_row?.[data.id]?.['margin_amount_sum'] ?? 0)/pl_crovfalse_curr_y_row[data.id]['margin_amount_sum'] * 100 : 0
            };
            oResult.push(oTemp);

            oTemp = {
                display_order : ++i_count,
                org_name : data.name,
                org_id : data.id,
                type1: "이월",
                type2: "매출",
                forecast_value : pl_crovtrue_curr_y_row?.[data.id]?.['sale_amount_sum'] ?? 0,
                secured_value : secured_pl_crovtrue_curr_y_row?.[data.id]?.["sale_amount_sum"] ?? 0,
                not_secured_value : not_secured_pl_crovtrue_curr_y_row?.[data.id]?.["sale_amount_sum"] ?? 0,
                plan_ratio : (pl_crovtrue_curr_y_row?.[data.id]?.['sale_amount_sum'] ?? 0) !== 0 ? (secured_pl_crovtrue_curr_y_row?.[data.id]?.["sale_amount_sum"] ?? 0) / pl_crovtrue_curr_y_row[data.id]['sale_amount_sum'] * 100 : 0,
                yoy : (pl_crovtrue_curr_y_row?.[data.id]?.['sale_amount_sum'] ?? 0) !== 0 ? (pl_crovtrue_last_y_row?.[data.id]?.['sale_amount_sum'] ?? 0)/pl_crovtrue_curr_y_row[data.id]['sale_amount_sum'] * 100 : 0
            };
            oResult.push(oTemp);

            oTemp = {
                display_order : ++i_count,
                org_name : data.name,
                org_id : data.id,
                type1: "이월",
                type2: "마진",
                forecast_value : pl_crovtrue_curr_y_row?.[data.id]?.['margin_amount_sum'] ?? 0,
                secured_value : secured_pl_crovtrue_curr_y_row?.[data.id]?.["margin_amount_sum"] ?? 0,
                not_secured_value : not_secured_pl_crovtrue_curr_y_row?.[data.id]?.["margin_amount_sum"] ?? 0,
                plan_ratio : (pl_crovtrue_curr_y_row?.[data.id]?.['margin_amount_sum'] ?? 0) !== 0 ? (secured_pl_crovtrue_curr_y_row?.[data.id]?.["margin_amount_sum"] ?? 0) / pl_crovtrue_curr_y_row[data.id]['margin_amount_sum'] * 100 : 0,
                yoy : (pl_crovtrue_curr_y_row?.[data.id]?.['margin_amount_sum'] ?? 0) !== 0 ? (pl_crovtrue_last_y_row?.[data.id]?.['margin_amount_sum'] ?? 0)/pl_crovtrue_curr_y_row[data.id]['margin_amount_sum'] * 100 : 0
            };
            oResult.push(oTemp);
        });

        return oResult;
    });
};