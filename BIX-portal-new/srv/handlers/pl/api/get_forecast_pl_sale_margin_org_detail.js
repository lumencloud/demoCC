module.exports = (srv) => {
    srv.on('get_forecast_pl_sale_margin_org_detail', async (req) => {
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
         * pl.wideview_org_view [실적]
         */
        const pl_view = db.entities('pl').wideview_org_view;
        /**
         * common.org_target_sum_view
         * 조직 별 연단위 목표금액
         */
        const target = db.entities('common').org_target_sum_view;
        /**
         * common.org_full_level_view [조직정보]
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
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd','org_name'])
            .where`org_id = ${org_id} and (lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id})`;

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error
        let org_col_nm = orgInfo.org_level;
        let org_ccorg_col_nm = org_col_nm.slice(0, -2) + 'ccorg_cd'; // <>_id 에서 id 제거 후 <>_ccorg_cd 컬럼명 생성
        let org_ccorg_cd = orgInfo.org_ccorg_cd;

        /**
         * pl 조회 컬럼 - 확보(secured) 매출/마진/추정, 미확보(not_secured) 매출/마진/추정, 년도
         * 조회 조건 - 년도
         */
        const pl_col_list = [
            'year',
            'sum(ifnull(sale_year_amt,0)) as secured_sale',
            'sum(ifnull(margin_year_amt,0)) as secured_margin',
            'sum(ifnull(sfdc_sale_year_amt,0)) as not_secured_sale',
            'sum(ifnull(sfdc_margin_year_amt,0)) as not_secured_margin',
            '(sum(ifnull(sale_year_amt,0))+sum(ifnull(sfdc_sale_year_amt,0))) as forecast_sale',
            '(sum(ifnull(margin_year_amt,0))+sum(ifnull(sfdc_margin_year_amt,0))) as forecast_margin'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }};
        const pl_groupBy_cols = ['year'];

        /**
         * 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
         * 부문, 본부 레벨 조회일 경우, 본부별로 조회, 그 외 부문별로 조회
         */
        let pl_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...pl_col_list, 'hdqt_ccorg_cd as ccorg_cd', 'hdqt_name as name'] : [...pl_col_list, 'div_ccorg_cd as ccorg_cd', 'div_name as name'];
        let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id }
        let pl_groupBy = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...pl_groupBy_cols, 'hdqt_ccorg_cd', 'hdqt_name'] : [...pl_groupBy_cols, 'div_ccorg_cd', 'div_name'];

        /** 
         * 타겟 뷰 조회용 컬럼 - 년도, 부문/본부 ccorg_cd, 매출목표
         * 조회 조건 - 년도, 입력 조직 레벨의 ccorg_cd
         */
        const target_col_list = [
            'target_year',
            'div_ccorg_cd',
            'hdqt_ccorg_cd',
            'sum(ifnull(target_sale_amt,0)) as target_sale_amt',
        ];
        const target_where_conditions = { 'target_year': year, [org_ccorg_col_nm]: org_ccorg_cd};
        const target_groupBy_cols = ['target_year','div_ccorg_cd','hdqt_ccorg_cd']
        
        //마진 목표(부문, 본부일 경우만 추가)
        const s_margin_column = '(sum(ifnull(target_sale_amt,0))*max(ifnull(target_margin_rate,0))/100) as target_margin'

        /**
         * target 조건 추가
         * 부문 레벨로 검색 시 - total(전사 검색 여부), 부문 ccorg_cd != null, 본부/팀 ccorg_cd = null
         * 본부 레벨로 검색 시 - total(전사 검색 여부), 팀 ccorg_cd = null
         */
        let target_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...target_col_list, s_margin_column] : target_col_list
        let target_where = org_col_nm === 'hdqt_id' ? {...target_where_conditions, total:false, team_ccorg_cd : null} : {...target_where_conditions, total:false, div_ccorg_cd : {'!=':null}, hdqt_ccorg_cd : null, team_ccorg_cd : null};
        let target_groupBy = target_groupBy_cols;
        
        let lv1_where = { 'target_year': year, total:true}

        /**
         * 부문, 본부 레벨 조회일 경우, 본부별로 조회, 그 외 부문별로 조회
         */
        let org_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? ['hdqt_ccorg_cd as ccorg_cd', 'hdqt_name as name', 'org_order'] : ['div_ccorg_cd as ccorg_cd', 'div_name as name', 'org_order'];
        let org_where = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? { 'hdqt_id': { '!=': null }, and: { [org_col_nm]: org_id } } : { 'div_id': { '!=': null }, and: { [org_col_nm]: org_id } };
        let org_groupBy = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? ['hdqt_ccorg_cd', 'hdqt_name', 'org_order'] : ['div_ccorg_cd', 'div_name', 'org_order'];


        // DB 쿼리 실행 (병렬)
        const [query, target_query,lv1_target_data,org_data] = await Promise.all([
            // PL 실적, 목표 조회
            // SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols),
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(target).columns(target_column).where(target_where).groupBy(...target_groupBy),
            SELECT.from(target).columns(target_column).where(lv1_where).groupBy(...target_groupBy),
            SELECT.from(org_full_level).columns(org_column).where(org_where).groupBy(...org_groupBy)
        ]);
        
        /**
         * 데이터를 년도별로 filter
         */
        const curr_pl = query.filter(o_pl => o_pl.year === year),
            last_pl = query.filter(o_pl => o_pl.year === last_year);
        
        /**
         * 총합데이터
         */
        let o_total = {
            'sale':{"display_order": 0, "item_order" : 1, "type": "매출", "org_name" : '합계','target':0},
            'margin':{"display_order": 0, "item_order" : 2, "type": "마진", "org_name" : '합계','target':0}
        }
        o_total[`sale`]['secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0)
        o_total[`margin`]['secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_margin, 0)
        o_total[`sale`]['not_secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0)
        o_total[`margin`]['not_secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.not_secured_margin, 0)
        o_total[`sale`]['forecast_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.forecast_sale, 0)
        o_total[`margin`]['forecast_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.forecast_margin, 0)
        o_total[`sale`]['last_forecast_value'] = last_pl.reduce((iSum, oData) => iSum += oData.forecast_sale, 0)
        o_total[`margin`]['last_forecast_value'] = last_pl.reduce((iSum, oData) => iSum += oData.forecast_margin, 0)
        
        /**
         * 년도별로 분류한 데이터를 조직별로 정리
         */
        let o_result = {};
        org_data.forEach(org => {
            let o_pl = curr_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
            let o_last_pl = last_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
            let o_target = target_query.find(target => target.hdqt_ccorg_cd === org.ccorg_cd)
            
            if(!o_result[`${org.ccorg_cd}_sale`]){
                o_result[`${org.ccorg_cd}_sale`] = {
                    "display_order": org.org_order,
                    "item_order" : 1,
                    "type": "매출",
                    "org_name" : org.name,
                    "target" : o_target?.target_sale_amt ?? 0
                }
                o_result[`${org.ccorg_cd}_margin`] = {
                    "display_order": org.org_order,
                    "item_order" : 2,
                    "type": "마진",
                    "org_name" : org.name,
                    "target" : o_target?.target_margin ?? 0
                }
            }
            o_result[`${org.ccorg_cd}_sale`]['secured_value'] = o_pl?.secured_sale ?? 0
            o_result[`${org.ccorg_cd}_margin`]['secured_value'] = o_pl?.secured_margin ?? 0
            o_result[`${org.ccorg_cd}_sale`]['not_secured_value'] = o_pl?.not_secured_sale ?? 0
            o_result[`${org.ccorg_cd}_margin`]['not_secured_value'] = o_pl?.not_secured_margin ?? 0
            o_result[`${org.ccorg_cd}_sale`]['forecast_value'] = o_pl?.forecast_sale ?? 0
            o_result[`${org.ccorg_cd}_margin`]['forecast_value'] = o_pl?.forecast_margin ?? 0
            o_result[`${org.ccorg_cd}_sale`]['last_forecast_value'] = o_last_pl?.forecast_sale ?? 0
            o_result[`${org.ccorg_cd}_margin`]['last_forecast_value'] = o_last_pl?.forecast_margin ?? 0
        })

        /**
         * 입력 조직 레벨에 따른 합계데이터의 목표값 세팅
         */
        if(org_col_nm === 'lv1_id'){
            o_total[`sale`]['target'] = lv1_target_data[0]?.target_sale_amt??0
            o_total[`margin`]['target'] = 0
        }else if(org_col_nm === 'div_id'){
            o_total[`sale`]['target'] = target_query.find(target => target.hdqt_ccorg_cd === null && target.div_ccorg_cd === org_ccorg_cd)?.target_sale_amt ?? 0
            o_total[`margin`]['target'] = target_query.find(target => target.hdqt_ccorg_cd === null && target.div_ccorg_cd === org_ccorg_cd)?.target_margin ?? 0
        }else if(org_col_nm === 'hdqt_id'){
            o_total[`sale`]['target'] = target_query.find(target => target.hdqt_ccorg_cd === org_ccorg_cd)?.target_sale_amt??0
            o_total[`margin`]['target'] = target_query.find(target => target.hdqt_ccorg_cd === org_ccorg_cd)?.target_margin??0
        }else if(org_col_nm !== 'team_id'){
            const a_target = target_query.filter(target => target.hdqt_ccorg_cd === null)
            o_total[`sale`]['target'] = a_target.reduce((iSum, oData) => iSum += oData.target_sale_amt, 0)
            o_total[`margin`]['target'] = 0
        }

        let a_result = Object.values(o_result);
        let a_total = Object.values(o_total);

        /**
         * 본부 레벨이 아닐 경우만 합계 데이터 push
         */
        if(org_col_nm !== 'hdqt_id'){
            a_total.forEach(total => {
                let o_temp = {
                    "display_order": total.display_order,
                    "item_order" : total.item_order,
                    "type": total.type,
                    "org_name" : total.org_name,
                    "forecast_value" : total.forecast_value,
                    "secured_value" : total.secured_value,
                    "not_secured_value" : total.not_secured_value,
                    "plan_ratio" : total.forecast_value - total.target*100000000,
                    "yoy" : total.forecast_value - total.last_forecast_value,
                }
                
                oResult.push(o_temp)
            })
        }
        
        a_result.forEach(result => {
            let o_temp = {
                "display_order": result.display_order,
                "item_order" : result.item_order,
                "type": result.type,
                "org_name" : result.org_name,
                "forecast_value" : result.forecast_value,
                "secured_value" : result.secured_value,
                "not_secured_value" : result.not_secured_value,
                "plan_ratio" : result.forecast_value - result.target*100000000,
                "yoy" : result.forecast_value - result.last_forecast_value,
            }
            oResult.push(o_temp)
        })

        /**
         * display_order, item_order기준 오름차순으로 정렬
         */
        let aSortFields = [
            { field: "display_order", order: "asc" },
            { field: "item_order", order: "asc" },
        ];
        oResult.sort((oItem1, oItem2) => {
            for (const { field, order } of aSortFields) {
                // 필드가 null일 때
                if (oItem1[field] === null && oItem2[field] !== null) return -1;
                if (oItem1[field] !== null && oItem2[field] === null) return 1;
                if (oItem1[field] === null && oItem2[field] === null) continue;

                if (typeof oItem1[field] === "string") {    // 문자일 때 localeCompare
                    var iResult = oItem1[field].localeCompare(oItem2[field]);
                } else if (typeof oItem1[field] === "number") { // 숫자일 때
                    var iResult = oItem1[field] - oItem2[field];
                }

                if (iResult !== 0) {
                    return (order === "asc") ? iResult : -iResult;
                }
            }
            return 0;
        })

        return oResult;
    });
};