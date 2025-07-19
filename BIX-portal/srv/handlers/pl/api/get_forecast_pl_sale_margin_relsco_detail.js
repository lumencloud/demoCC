const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_forecast_pl_sale_margin_relsco_detail', async (req) => {
        try{
            /**
             * 핸들러 초기에 권한체크
             */
            await check_user_auth(req);

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
             * pl.wideview_view [실적]
             */
            const pl_org_view = db.entities('pl').wideview_view;
            const pl_account_view = db.entities('pl').wideview_account_view;
            /**
             * common.org_full_level_view [조직정보]
             */
            const org_full_level = db.entities('common').org_full_level_view;
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id } = req.data;
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
            let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd','org_name','lv3_ccorg_cd','org_tp'])
                .where`org_id = ${org_id} and (lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id})`;

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            let org_col_nm = orgInfo.org_level;
            let lv3_ccorg_cd = orgInfo.lv3_ccorg_cd;
            let org_tp = orgInfo.org_tp;

            // let s_org_tp = 'delivery'
            // let pl_view = pl_org_view
            if(org_col_nm !== 'lv1_id' && org_col_nm !== 'lv2_id' && ((org_tp === 'hybrid' && lv3_ccorg_cd === '237100') || org_tp === 'account')){
                // pl_view = pl_account_view
                // s_org_tp = 'account'
            }

            /**
             * pl 조회 컬럼 - 확보(secured) 매출/마진, 미확보(not_secured) 매출/마진, 관계사 여부(true = 대내, false = 대외), 년도
             * 조회 조건 - 년도, 데이터 속성이 WA(account)가 아닌 것
             */
            let i_index = Number(month) === 12? 12 : Number(month)+1
            let aForecastSale = []; 
            for (let i = 12; i >= i_index; i--) {
                aForecastSale.push(`sale_m${i}_amt`);
            }
            let s_forecast_sale = Number(month) === 12? 0 : aForecastSale.join(" + ");

            const pl_col_list = [
                'year',
                'relsco_yn',
                `sum(case when src_type = 'D' then ${s_forecast_sale} else 0 end) as not_secured_sale`,
                `sum(case when src_type = 'D' then 0 else sale_year_amt end) as secured_sale`,
            ];
            const pl_groupBy_cols = ['year', 'relsco_yn'];
            const pl_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { '!=': 'WA' }};

            /**
             * 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
             * 부문, 본부 레벨 조회일 경우, 본부별로 조회, 그 외 부문별로 조회
             */
            let pl_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...pl_col_list, 'hdqt_ccorg_cd as ccorg_cd', 'hdqt_name as name'] : [...pl_col_list, 'div_ccorg_cd as ccorg_cd', 'div_name as name'];
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id }
            let pl_groupBy = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...pl_groupBy_cols, 'hdqt_ccorg_cd', 'hdqt_name'] : [...pl_groupBy_cols, 'div_ccorg_cd', 'div_name'];

            let org_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? ['hdqt_ccorg_cd as ccorg_cd', 'hdqt_name as name', 'org_order','org_id','lv3_ccorg_cd','lv3_id','lv3_name','org_tp'] : ['div_ccorg_cd as ccorg_cd', 'div_name as name', 'org_order','org_id','lv3_ccorg_cd','lv3_id','lv3_name','org_tp'];
            let org_where = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? { 'hdqt_id': { '!=': null }, and: { [org_col_nm]: org_id }, 'team_id': null} : { 'div_id': { '!=': null }, and: { [org_col_nm]: org_id }, 'hdqt_id': null, 'team_id': null};
            let org_groupBy = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? ['hdqt_ccorg_cd', 'hdqt_name', 'org_order','org_id','lv3_ccorg_cd','lv3_id','lv3_name','org_tp'] : ['div_ccorg_cd', 'div_name', 'org_order','org_id','lv3_ccorg_cd','lv3_id','lv3_name','org_tp'];

            // DB 쿼리 실행 (병렬)
            const [query, account_query, org_data] = await Promise.all([
                // PL 실적, 목표 조회
                SELECT.from(pl_org_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(pl_account_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(org_full_level).columns(org_column).where(org_where).groupBy(...org_groupBy)
            ]);
            if(!query.length){
                //return req.res.status(204).send();
                return []
            }
            /**
             * 데이터를 년도별 대내/대외 filter
             */
            let o_total = {}
            let o_result = {}
            const curr_t_pl = query.filter(pl => pl.relsco_yn && pl.year === year),
                curr_f_pl = query.filter(pl => !pl.relsco_yn && pl.year === year),
                last_t_pl = query.filter(pl => pl.relsco_yn && pl.year === last_year),
                last_f_pl = query.filter(pl => !pl.relsco_yn && pl.year === last_year),
                curr_account_t_pl = account_query.filter(pl => pl.relsco_yn && pl.year === year),
                curr_account_f_pl = account_query.filter(pl => !pl.relsco_yn && pl.year === year),
                last_account_t_pl = account_query.filter(pl => pl.relsco_yn && pl.year === last_year),
                last_account_f_pl = account_query.filter(pl => !pl.relsco_yn && pl.year === last_year);

            /**
             * 총합데이터
             */
            o_total['t_sale'] = { "display_order": 0, "item_order": 1, "type1": "대내", "type2": "매출", "org_name": '합계', "org_id":'total' }
            o_total['f_sale'] = { "display_order": 0, "item_order": 2, "type1": "대외", "type2": "매출", "org_name": '합계', "org_id":'total' }

            o_total[`t_sale`]['secured_value'] = curr_t_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0) + curr_account_t_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0)
            o_total[`t_sale`]['not_secured_value'] = curr_t_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0) + curr_account_t_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0)
            o_total[`t_sale`]['forecast_value'] = curr_t_pl.reduce((iSum, oData) => iSum += oData.secured_sale + oData.not_secured_sale, 0) + curr_account_t_pl.reduce((iSum, oData) => iSum += oData.secured_sale + oData.not_secured_sale, 0)
            o_total[`t_sale`]['last_forecast_value'] = last_t_pl.reduce((iSum, oData) => iSum += oData.secured_sale + oData.not_secured_sale, 0) + last_account_t_pl.reduce((iSum, oData) => iSum += oData.secured_sale + oData.not_secured_sale, 0)
            o_total[`t_sale`]['yoy'] = o_total[`t_sale`]['forecast_value'] - o_total[`t_sale`]['last_forecast_value']

            o_total[`f_sale`]['secured_value'] = curr_f_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0) + curr_account_f_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0)
            o_total[`f_sale`]['not_secured_value'] = curr_f_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0) + curr_account_f_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0)
            o_total[`f_sale`]['forecast_value'] = curr_f_pl.reduce((iSum, oData) => iSum += oData.secured_sale + oData.not_secured_sale, 0) + curr_account_f_pl.reduce((iSum, oData) => iSum += oData.secured_sale + oData.not_secured_sale, 0)
            o_total[`f_sale`]['last_forecast_value'] = last_f_pl.reduce((iSum, oData) => iSum += oData.secured_sale + oData.not_secured_sale, 0) + last_account_f_pl.reduce((iSum, oData) => iSum += oData.secured_sale + oData.not_secured_sale, 0)
            o_total[`f_sale`]['yoy'] = o_total[`f_sale`]['forecast_value'] - o_total[`f_sale`]['last_forecast_value']
            
            /**
             * 년도별로 분류한 데이터를 조직별로 정리
             */
            org_data.forEach(org => {
                let o_curr_t_pl = curr_t_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
                let o_curr_f_pl = curr_f_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
                let o_last_t_pl = last_t_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
                let o_last_f_pl = last_f_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
                if(org.org_tp === 'account'){
                    o_curr_t_pl = curr_account_t_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
                    o_curr_f_pl = curr_account_f_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
                    o_last_t_pl = last_account_t_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
                    o_last_f_pl = last_account_f_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
                }
                if(['lv1_id','lv2_id'].includes(org_col_nm) && org.lv3_ccorg_cd === '610000'){
                    if (!o_result[`${org.lv3_ccorg_cd}_t_sale`]) {
                        o_result[`${org.lv3_ccorg_cd}_t_sale`] = {
                            "display_order": org.org_order,
                            "item_order": 1,
                            "type1": "대내",
                            "type2": "매출",
                            "org_name": org.lv3_name,
                            "org_id": org.lv3_id,
                            "secured_value" : 0,
                            "not_secured_value" : 0,
                            "secured_actual_value" : 0,
                            "secured_forecast_value" : 0,
                            "forecast_value" : 0,
                            "last_forecast_value" : 0,
                            "plan_ratio" : 0,
                            "yoy" : 0,
                        }
                        o_result[`${org.lv3_ccorg_cd}_f_sale`] = {
                            "display_order": org.org_order,
                            "item_order": 3,
                            "type1": "대외",
                            "type2": "매출",
                            "org_name": org.lv3_name,
                            "org_id": org.lv3_id,
                            "secured_value" : 0,
                            "not_secured_value" : 0,
                            "secured_actual_value" : 0,
                            "secured_forecast_value" : 0,
                            "forecast_value" : 0,
                            "last_forecast_value" : 0,
                            "plan_ratio" : 0,
                            "yoy" : 0,
                        }
                    }
                    o_result[`${org.lv3_ccorg_cd}_t_sale`]['secured_value'] += o_curr_t_pl?.secured_sale ?? 0
                    o_result[`${org.lv3_ccorg_cd}_f_sale`]['secured_value'] += o_curr_f_pl?.secured_sale ?? 0
                    o_result[`${org.lv3_ccorg_cd}_t_sale`]['last_secured_value'] += o_last_t_pl?.secured_sale ?? 0
                    o_result[`${org.lv3_ccorg_cd}_f_sale`]['last_secured_value'] += o_last_f_pl?.secured_sale ?? 0
                    
                    o_result[`${org.lv3_ccorg_cd}_t_sale`]['forecast_value'] += (o_curr_t_pl?.secured_sale ?? 0) + (o_curr_t_pl?.not_secured_sale ?? 0)
                    o_result[`${org.lv3_ccorg_cd}_f_sale`]['forecast_value'] += (o_curr_f_pl?.secured_sale ?? 0) + (o_curr_f_pl?.not_secured_sale ?? 0)
                    o_result[`${org.lv3_ccorg_cd}_t_sale`]['last_forecast_value'] += (o_last_t_pl?.secured_sale ?? 0) + (o_last_t_pl?.not_secured_sale ?? 0)
                    o_result[`${org.lv3_ccorg_cd}_f_sale`]['last_forecast_value'] += (o_last_f_pl?.secured_sale ?? 0) + (o_last_f_pl?.not_secured_sale ?? 0)
                    
                    o_result[`${org.lv3_ccorg_cd}_t_sale`]['not_secured_value'] += o_curr_t_pl?.not_secured_sale ?? 0
                    o_result[`${org.lv3_ccorg_cd}_f_sale`]['not_secured_value'] += o_curr_f_pl?.not_secured_sale ?? 0
                    o_result[`${org.lv3_ccorg_cd}_t_sale`]['last_not_secured_value'] += o_last_t_pl?.not_secured_sale ?? 0
                    o_result[`${org.lv3_ccorg_cd}_f_sale`]['last_not_secured_value'] += o_last_f_pl?.not_secured_sale ?? 0
                    
                    o_result[`${org.lv3_ccorg_cd}_t_sale`]['yoy'] = o_result[`${org.lv3_ccorg_cd}_t_sale`]['forecast_value'] - o_result[`${org.lv3_ccorg_cd}_t_sale`]['last_forecast_value']
                    o_result[`${org.lv3_ccorg_cd}_f_sale`]['yoy'] = o_result[`${org.lv3_ccorg_cd}_f_sale`]['forecast_value'] - o_result[`${org.lv3_ccorg_cd}_f_sale`]['last_forecast_value']
                }else{
                    if (!o_result[`${org.ccorg_cd}_t_sale`]) {
                        o_result[`${org.ccorg_cd}_t_sale`] = {
                            "display_order": org.org_order,
                            "item_order": 1,
                            "type1": "대내",
                            "type2": "매출",
                            "org_name": org.name,
                            "org_id": org.org_id
                        }
                        o_result[`${org.ccorg_cd}_f_sale`] = {
                            "display_order": org.org_order,
                            "item_order": 3,
                            "type1": "대외",
                            "type2": "매출",
                            "org_name": org.name,
                            "org_id": org.org_id
                        }
                    }
                    o_result[`${org.ccorg_cd}_t_sale`]['secured_value'] = o_curr_t_pl?.secured_sale ?? 0
                    o_result[`${org.ccorg_cd}_f_sale`]['secured_value'] = o_curr_f_pl?.secured_sale ?? 0
                    o_result[`${org.ccorg_cd}_t_sale`]['last_secured_value'] = o_last_t_pl?.secured_sale ?? 0
                    o_result[`${org.ccorg_cd}_f_sale`]['last_secured_value'] = o_last_f_pl?.secured_sale ?? 0
                    
                    o_result[`${org.ccorg_cd}_t_sale`]['forecast_value'] = (o_curr_t_pl?.secured_sale ?? 0) + (o_curr_t_pl?.not_secured_sale ?? 0)
                    o_result[`${org.ccorg_cd}_f_sale`]['forecast_value'] = (o_curr_f_pl?.secured_sale ?? 0) + (o_curr_f_pl?.not_secured_sale ?? 0)
                    o_result[`${org.ccorg_cd}_t_sale`]['last_forecast_value'] = (o_last_t_pl?.secured_sale ?? 0) + (o_last_t_pl?.not_secured_sale ?? 0)
                    o_result[`${org.ccorg_cd}_f_sale`]['last_forecast_value'] = (o_last_f_pl?.secured_sale ?? 0) + (o_last_f_pl?.not_secured_sale ?? 0)
                    
                    o_result[`${org.ccorg_cd}_t_sale`]['yoy'] = o_result[`${org.ccorg_cd}_t_sale`]['forecast_value'] - o_result[`${org.ccorg_cd}_t_sale`]['last_forecast_value']
                    o_result[`${org.ccorg_cd}_f_sale`]['yoy'] = o_result[`${org.ccorg_cd}_f_sale`]['forecast_value'] - o_result[`${org.ccorg_cd}_f_sale`]['last_forecast_value']
                    
                    o_result[`${org.ccorg_cd}_t_sale`]['not_secured_value'] = o_curr_t_pl?.not_secured_sale ?? 0
                    o_result[`${org.ccorg_cd}_f_sale`]['not_secured_value'] = o_curr_f_pl?.not_secured_sale ?? 0
                    o_result[`${org.ccorg_cd}_t_sale`]['last_not_secured_value'] = o_last_t_pl?.not_secured_sale ?? 0
                    o_result[`${org.ccorg_cd}_f_sale`]['last_not_secured_value'] = o_last_f_pl?.not_secured_sale ?? 0
                }
            })

            let a_result = Object.values(o_result);

            let a_total = Object.values(o_total);

            /**
             * 본부 레벨이 아닐 경우만 합계 데이터 push
             */
            if(org_col_nm !== 'hdqt_id'){
                if(a_result.length>0){
                    oResult.push(...a_total);
                }
            }
            sort_data(a_result)
            oResult.push(...a_result);

            /**
             * display_order, item_order기준 오름차순으로 정렬
             */

            function sort_data (a_data){
                let aSortFields = [
                    { field: "display_order", order: "asc" },
                    { field: "item_order", order: "asc" },
                ];
                a_data.sort((oItem1, oItem2) => {
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
            }

            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
};