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
        const pl_view = db.entities('pl').wideview_view;
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

        let org_col_nm = orgInfo.org_level;

        const pl_col_list = [
            'year', 
            'crov_div_yn', 
            'org_order', 
            `sum(case when src_type = 'D' then 0 else ifnull(sale_year_amt,0) end) as secured_sale`,
            `sum(case when src_type = 'D' then 0 else ifnull(margin_year_amt,0) end) as secured_margin`,
            `sum(case when src_type = 'D' then ifnull(sale_year_amt,0) else 0 end) as not_secured_sale`,
            `sum(case when src_type = 'D' then ifnull(margin_year_amt,0) else 0 end) as not_secured_margin`
        ];
        const pl_groupBy_cols = ['crov_div_yn','org_order','year'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { '!=': 'WA' }, 'crov_div_yn': {'!=': null}};

        // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
        let pl_column = org_col_nm === 'div_id' ? [...pl_col_list,'hdqt_ccorg_cd as ccorg_cd','hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_col_list,'team_ccorg_cd as ccorg_cd','team_name as name'] : [...pl_col_list,'div_ccorg_cd as ccorg_cd','div_name as name'];
        let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : {...pl_where_conditions, [org_col_nm]: org_id}
        let pl_groupBy = org_col_nm === 'div_id' ? [...pl_groupBy_cols, 'hdqt_ccorg_cd','hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_groupBy_cols, 'team_ccorg_cd','team_name'] : [...pl_groupBy_cols, 'div_ccorg_cd','div_name'];

        let org_column = org_col_nm === 'div_id' ? ['hdqt_ccorg_cd as ccorg_cd','hdqt_name as name','org_order'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? ['team_ccorg_cd as ccorg_cd','team_name as name','org_order'] : ['div_ccorg_cd as ccorg_cd','div_name as name','org_order'];
        let org_where = org_col_nm === 'div_id' ? {'hdqt_id':{'!=':null},and:{[org_col_nm]: org_id}} : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? {'team_id':{'!=':null},and:{[org_col_nm]: org_id}} : {'div_id':{'!=':null},and:{[org_col_nm]: org_id}};
        let org_groupBy = org_col_nm === 'div_id' ? ['hdqt_ccorg_cd','hdqt_name','org_order'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? ['team_ccorg_cd','team_name','org_order'] : ['div_ccorg_cd','div_name','org_order'];

        // DB 쿼리 실행 (병렬)
        const [query,org_data] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(org_full_level).columns(org_column).where(org_where).groupBy(...org_groupBy)
        ]);

        const crov_curr_t_pl = query.filter(pl => pl.crov_div_yn && pl.year === year),
                crov_curr_f_pl = query.filter(pl => !pl.crov_div_yn && pl.year === year),
                crov_last_t_pl = query.filter(pl => pl.crov_div_yn && pl.year === last_year),
                crov_last_f_pl = query.filter(pl => !pl.crov_div_yn && pl.year === last_year);
        let o_result = {};
        let o_total = {
            't_sale':{"display_order": 1, "item_order" : 1, "type1": "신규", "type2": "매출", "org_name" : '합계'},
            't_margin':{"display_order": 1, "item_order" : 2, "type1": "신규", "type2": "마진", "org_name" : '합계'},
            'f_sale':{"display_order": 1, "item_order" : 3, "type1": "이월", "type2": "매출", "org_name" : '합계'},
            'f_margin':{"display_order": 1, "item_order" : 4, "type1": "이월", "type2": "마진", "org_name" : '합계'}
        }
        o_total[`t_sale`]['secured_value'] = crov_curr_t_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0)
        o_total[`t_sale`]['not_secured_value'] = crov_curr_t_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0)
        o_total[`t_sale`]['forecast_value'] = crov_curr_t_pl.reduce((iSum, oData) => iSum += oData.secured_sale+oData.not_secured_sale, 0)
        o_total[`t_sale`]['last_forecast_value'] = crov_last_t_pl.reduce((iSum, oData) => iSum += oData.secured_sale+oData.not_secured_sale, 0)
        o_total[`t_margin`]['secured_value'] = crov_curr_t_pl.reduce((iSum, oData) => iSum += oData.secured_margin, 0)
        o_total[`t_margin`]['not_secured_value'] = crov_curr_t_pl.reduce((iSum, oData) => iSum += oData.not_secured_margin, 0)
        o_total[`t_margin`]['forecast_value'] = crov_curr_t_pl.reduce((iSum, oData) => iSum += oData.secured_margin+oData.not_secured_margin, 0)
        o_total[`t_margin`]['last_forecast_value'] = crov_last_t_pl.reduce((iSum, oData) => iSum += oData.secured_margin+oData.not_secured_margin, 0)
        o_total[`f_sale`]['secured_value'] = crov_curr_f_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0)
        o_total[`f_sale`]['not_secured_value'] = crov_curr_f_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0)
        o_total[`f_sale`]['forecast_value'] = crov_curr_f_pl.reduce((iSum, oData) => iSum += oData.secured_sale+oData.not_secured_sale, 0)
        o_total[`f_sale`]['last_forecast_value'] = crov_last_f_pl.reduce((iSum, oData) => iSum += oData.secured_sale+oData.not_secured_sale, 0)
        o_total[`f_margin`]['secured_value'] = crov_curr_f_pl.reduce((iSum, oData) => iSum += oData.secured_margin, 0)
        o_total[`f_margin`]['not_secured_value'] = crov_curr_f_pl.reduce((iSum, oData) => iSum += oData.not_secured_margin, 0)
        o_total[`f_margin`]['forecast_value'] = crov_curr_f_pl.reduce((iSum, oData) => iSum += oData.secured_margin+oData.not_secured_margin, 0)
        o_total[`f_margin`]['last_forecast_value'] = crov_last_f_pl.reduce((iSum, oData) => iSum += oData.secured_margin+oData.not_secured_margin, 0)
        
        org_data.forEach(org => {
            let o_crov_curr_t_pl = crov_curr_t_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
            let o_crov_curr_f_pl = crov_curr_f_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
            let o_crov_last_t_pl = crov_last_t_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
            let o_crov_last_f_pl = crov_last_f_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
            if(!o_result[`${org.ccorg_cd}_t_sale`]){
                o_result[`${org.ccorg_cd}_t_sale`] = {
                    "display_order": org.org_order,
                    "item_order" : 1,
                    "type1": "신규",
                    "type2": "매출",
                    "org_name" : org.name
                }
                o_result[`${org.ccorg_cd}_t_margin`] = {
                    "display_order": org.org_order,
                    "item_order" : 2,
                    "type1": "신규",
                    "type2": "마진",
                    "org_name" : org.name
                }
                o_result[`${org.ccorg_cd}_f_sale`] = {
                    "display_order": org.org_order,
                    "item_order" : 3,
                    "type1": "이월",
                    "type2": "매출",
                    "org_name" : org.name
                }
                o_result[`${org.ccorg_cd}_f_margin`] = {
                    "display_order": org.org_order,
                    "item_order" : 4,
                    "type1": "이월",
                    "type2": "마진",
                    "org_name" : org.name
                }
            }
            o_result[`${org.ccorg_cd}_t_sale`]['secured_value'] = o_crov_curr_t_pl?.secured_sale ?? 0
            o_result[`${org.ccorg_cd}_t_margin`]['secured_value'] = o_crov_curr_t_pl?.secured_margin ?? 0
            o_result[`${org.ccorg_cd}_t_sale`]['not_secured_value'] = o_crov_curr_t_pl?.not_secured_sale ?? 0
            o_result[`${org.ccorg_cd}_t_margin`]['not_secured_value'] = o_crov_curr_t_pl?.not_secured_margin ?? 0
            o_result[`${org.ccorg_cd}_t_sale`]['forecast_value'] = (o_crov_curr_t_pl?.secured_sale ?? 0) + (o_crov_curr_t_pl?.not_secured_sale ?? 0)
            o_result[`${org.ccorg_cd}_t_margin`]['forecast_value'] = (o_crov_curr_t_pl?.secured_margin ?? 0) + (o_crov_curr_t_pl?.not_secured_margin ?? 0)
            o_result[`${org.ccorg_cd}_f_sale`]['secured_value'] = o_crov_curr_f_pl?.secured_sale ?? 0
            o_result[`${org.ccorg_cd}_f_margin`]['secured_value'] = o_crov_curr_f_pl?.secured_margin ?? 0
            o_result[`${org.ccorg_cd}_f_sale`]['not_secured_value'] = o_crov_curr_f_pl?.not_secured_sale ?? 0
            o_result[`${org.ccorg_cd}_f_margin`]['not_secured_value'] = o_crov_curr_f_pl?.not_secured_margin ?? 0
            o_result[`${org.ccorg_cd}_f_sale`]['forecast_value'] = (o_crov_curr_f_pl?.secured_sale ?? 0) + (o_crov_curr_f_pl?.not_secured_sale ?? 0)
            o_result[`${org.ccorg_cd}_f_margin`]['forecast_value'] = (o_crov_curr_f_pl?.secured_margin ?? 0) + (o_crov_curr_f_pl?.not_secured_margin ?? 0)
            o_result[`${org.ccorg_cd}_t_sale`]['last_secured_value'] = o_crov_last_t_pl?.secured_sale ?? 0
            o_result[`${org.ccorg_cd}_t_margin`]['last_secured_value'] = o_crov_last_t_pl?.secured_margin ?? 0
            o_result[`${org.ccorg_cd}_t_sale`]['last_not_secured_value'] = o_crov_last_t_pl?.not_secured_sale ?? 0
            o_result[`${org.ccorg_cd}_t_margin`]['last_not_secured_value'] = o_crov_last_t_pl?.not_secured_margin ?? 0
            o_result[`${org.ccorg_cd}_t_sale`]['last_forecast_value'] = (o_crov_last_t_pl?.secured_sale ?? 0) + (o_crov_last_t_pl?.not_secured_sale ?? 0)
            o_result[`${org.ccorg_cd}_t_margin`]['last_forecast_value'] = (o_crov_last_t_pl?.secured_margin ?? 0) + (o_crov_last_t_pl?.not_secured_margin ?? 0)
            o_result[`${org.ccorg_cd}_f_sale`]['last_secured_value'] = o_crov_last_f_pl?.secured_sale ?? 0
            o_result[`${org.ccorg_cd}_f_margin`]['last_secured_value'] = o_crov_last_f_pl?.secured_margin ?? 0
            o_result[`${org.ccorg_cd}_f_sale`]['last_not_secured_value'] = o_crov_last_f_pl?.not_secured_sale ?? 0
            o_result[`${org.ccorg_cd}_f_margin`]['last_not_secured_value'] = o_crov_last_f_pl?.not_secured_margin ?? 0
            o_result[`${org.ccorg_cd}_f_sale`]['last_forecast_value'] = (o_crov_last_f_pl?.secured_sale ?? 0) + (o_crov_last_f_pl?.not_secured_sale ?? 0)
            o_result[`${org.ccorg_cd}_f_margin`]['last_forecast_value'] = (o_crov_last_f_pl?.secured_margin ?? 0) + (o_crov_last_f_pl?.not_secured_margin ?? 0)
        })

        let a_result = Object.values(o_result);
        let a_total = Object.values(o_total);
        oResult.push(...a_total,...a_result)        

        return oResult;
    });
};