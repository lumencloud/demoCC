const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_forecast_pl_sale_margin_org_detail', async (req) => {
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
         * pl.wideview_org_view [실적]
         */
        const pl_org_view = db.entities('pl').wideview_org_view;
        const pl_account_view = db.entities('pl').wideview_account_org_view;
        
        /**
         * common.org_full_level_view [조직정보]
         */
        const org_full_level = db.entities('common').org_full_level_view;
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id, org_tp, display_type } = req.data;
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
            let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', 'lv3_ccorg_cd', 'org_name'])
                .where`org_id = ${org_id} and (lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id})`;

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error
            let org_col_nm = orgInfo.org_level;
            let org_ccorg_col_nm = org_col_nm.slice(0, -2) + 'ccorg_cd'; // <>_id 에서 id 제거 후 <>_ccorg_cd 컬럼명 생성
            let org_ccorg_cd = orgInfo.org_ccorg_cd;
            let lv3_ccorg_cd = orgInfo.lv3_ccorg_cd;

            let pl_view = pl_org_view
            if(org_tp === 'account'){
                pl_view = pl_account_view
            }

            /**
             * pl 조회 컬럼 - 확보(secured) 매출/마진/추정, 미확보(not_secured) 매출/마진/추정, 년도
             * 조회 조건 - 년도
             */
            let pl_col_list = [
                'year',
                `sum(sale_year_amt) as secured_sale`,
                `sum(margin_year_amt) as secured_margin`,
                'sum(sfdc_sale_year_amt) as not_secured_sale',
                'sum(sfdc_margin_year_amt) as not_secured_margin',
                '(sum(sale_year_amt)+sum(sfdc_sale_year_amt)) as forecast_sale',
                '(sum(margin_year_amt)+sum(sfdc_margin_year_amt)) as forecast_margin'];
            const pl_where_conditions = { 'year': { in: [year, last_year] }};
            const pl_groupBy_cols = ['year'];

            // 월 파라미터가 있는 경우 실적, 확보 추정 컬럼 추가
            if (month) {
                let aActualSale = [], aForecastSale = [], aActualMargin = [], aForecastMargin = [];
                for (let i = 1; i <= 12; i++) {
                    // 마감월 이전
                    if (i <= Number(month)) {
                        aActualSale.push(`sale_m${i}_amt`);
                        aActualMargin.push(`margin_m${i}_amt`);
                    } else {    // 마감월 이후
                        aForecastSale.push(`sale_m${i}_amt`);
                        aForecastMargin.push(`margin_m${i}_amt`);
                    }
                }

                // pl 컬럼에 네 개 컬럼(실적 및 확보 추정) 추가
                pl_col_list.push(
                    `sum(${aActualSale.join(" + ")}) as secured_actual_sale`,
                    `sum(${aActualMargin.join(" + ")}) as secured_actual_margin`
                );
                if(Number(month) !== 12){
                    pl_col_list.push(`sum(${aForecastSale.join(" + ")}) as secured_forecast_sale`,`sum(${aForecastMargin.join(" + ")}) as secured_forecast_margin`)
                }
            }

            /**
             * 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
             * 부문, 본부 레벨 조회일 경우, 본부별로 조회, 그 외 부문별로 조회
             */
            let pl_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...pl_col_list, 'hdqt_ccorg_cd as ccorg_cd', 'hdqt_name as name'] : [...pl_col_list, 'div_ccorg_cd as ccorg_cd', 'div_name as name'];
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id }
            let pl_groupBy = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...pl_groupBy_cols, 'hdqt_ccorg_cd', 'hdqt_name'] : [...pl_groupBy_cols, 'div_ccorg_cd', 'div_name'];

            /**
             * 부문, 본부 레벨 조회일 경우, 본부별로 조회, 그 외 부문별로 조회
             */
            let org_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? ['hdqt_ccorg_cd as ccorg_cd', 'hdqt_name as name', 'org_order', 'org_id','lv3_ccorg_cd','lv3_id','lv3_name'] : ['div_ccorg_cd as ccorg_cd', 'div_name as name', 'org_order', 'org_id','lv3_ccorg_cd','lv3_id','lv3_name'];
            let org_where = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? { 'hdqt_id': { '!=': null }, and: { [org_col_nm]: org_id }, 'team_id': null,'org_tp':org_tp } : { 'div_id': { '!=': null }, and: { [org_col_nm]: org_id }, 'hdqt_id': null, 'team_id': null,'org_tp':org_tp };
            let org_groupBy = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? ['hdqt_ccorg_cd', 'hdqt_name', 'org_order', 'org_id','lv3_ccorg_cd','lv3_id','lv3_name'] : ['div_ccorg_cd', 'div_name', 'org_order', 'org_id','lv3_ccorg_cd','lv3_id','lv3_name'];


            // DB 쿼리 실행 (병렬)
            const [query, target_query, org_data] = await Promise.all([
                SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                get_org_target(year,['A01','A03']),
                SELECT.from(org_full_level).columns(org_column).where(org_where).groupBy(...org_groupBy)
            ]);
            if(display_type !== 'chart' && !query.length){
                //return req.res.status(204).send();
                return []
            }

            let o_total = {sale:{},margin:{}}
            let o_result = {};

            /**
             * 데이터를 년도별로 filter
             */
            const curr_pl = query.filter(o_pl => o_pl.year === year),
                last_pl = query.filter(o_pl => o_pl.year === last_year);

            /**
             * 총합데이터
             */
            let o_total_target = target_query.find(target => target.org_ccorg_cd === org_ccorg_cd)
            let i_last_forecast_sale = last_pl.reduce((iSum, oData) => iSum += oData.forecast_sale, 0)
            let i_last_forecast_margin = last_pl.reduce((iSum, oData) => iSum += oData.forecast_margin, 0)

            o_total['sale'] = { "display_order": 0, "item_order": 1, "type": "매출", "org_name": '합계', "org_id": 'total' }
            o_total['margin'] = { "display_order": 0, "item_order": 2, "type": "마진", "org_name": '합계', "org_id": 'total' }

            o_total[`sale`]['secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0)
            o_total[`margin`]['secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_margin, 0)
            // 실적 및 확보 추정
            if (month) {
                o_total[`sale`]['secured_actual_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_actual_sale, 0)
                o_total[`margin`]['secured_actual_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_actual_margin, 0)
                o_total[`sale`]['secured_forecast_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_forecast_sale, 0)
                o_total[`margin`]['secured_forecast_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_forecast_margin, 0)
            }

            o_total[`sale`]['not_secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0)
            o_total[`margin`]['not_secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.not_secured_margin, 0)
            o_total[`sale`]['forecast_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.forecast_sale, 0)
            o_total[`margin`]['forecast_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.forecast_margin, 0)

            o_total[`sale`]['plan_ratio'] = o_total[`sale`]['forecast_value'] - ((o_total_target?.target_sale??0) * 100000000)
            o_total[`margin`]['plan_ratio'] = o_total[`margin`]['forecast_value'] - ((o_total_target?.target_margin??0) * 100000000)
            o_total[`sale`]['yoy'] = o_total[`sale`]['forecast_value'] - i_last_forecast_sale
            o_total[`margin`]['yoy'] = o_total[`margin`]['forecast_value'] - i_last_forecast_margin


            /**
            * 년도별로 분류한 데이터를 조직별로 정리
            */
            org_data.forEach(org => {
                let o_pl = curr_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
                let o_last_pl = last_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
                let o_target = target_query.find(target => target.org_ccorg_cd === org.ccorg_cd)
                if(['lv1_id','lv2_id'].includes(org_col_nm) && org.lv3_ccorg_cd === '610000'){
                    if (!o_result[`${org.lv3_ccorg_cd}_sale`]) {
                        o_result[`${org.lv3_ccorg_cd}_sale`] = {
                            "display_order": org.org_order,
                            "item_order": 1,
                            "type": "매출",
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
                        o_result[`${org.lv3_ccorg_cd}_margin`] = {
                            "display_order": org.org_order,
                            "item_order": 2,
                            "type": "마진",
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
                    o_result[`${org.lv3_ccorg_cd}_sale`]['secured_value'] += (o_pl?.secured_sale ?? 0)
                    o_result[`${org.lv3_ccorg_cd}_margin`]['secured_value'] += (o_pl?.secured_margin ?? 0)
                    // 실적 및 확보 추정
                    if (month) {
                        o_result[`${org.lv3_ccorg_cd}_sale`]['secured_actual_value'] += (o_pl?.secured_actual_sale ?? 0)
                        o_result[`${org.lv3_ccorg_cd}_margin`]['secured_actual_value'] += (o_pl?.secured_actual_margin ?? 0)
                        o_result[`${org.lv3_ccorg_cd}_sale`]['secured_forecast_value'] += (o_pl?.secured_forecast_sale ?? 0)
                        o_result[`${org.lv3_ccorg_cd}_margin`]['secured_forecast_value'] += (o_pl?.secured_forecast_margin ?? 0)
                    }
    
                    o_result[`${org.lv3_ccorg_cd}_sale`]['not_secured_value'] += (o_pl?.not_secured_sale ?? 0)
                    o_result[`${org.lv3_ccorg_cd}_margin`]['not_secured_value'] += (o_pl?.not_secured_margin ?? 0)
                    o_result[`${org.lv3_ccorg_cd}_sale`]['forecast_value'] += (o_pl?.forecast_sale ?? 0)
                    o_result[`${org.lv3_ccorg_cd}_margin`]['forecast_value'] += (o_pl?.forecast_margin ?? 0)
                    o_result[`${org.lv3_ccorg_cd}_sale`]['last_forecast_value'] += (o_last_pl?.forecast_sale ?? 0)
                    o_result[`${org.lv3_ccorg_cd}_margin`]['last_forecast_value'] += (o_last_pl?.forecast_margin ?? 0)
                    o_result[`${org.lv3_ccorg_cd}_sale`]['plan_ratio'] = o_result[`${org.lv3_ccorg_cd}_sale`]['forecast_value'] - ((o_target?.target_sale ?? 0) * 100000000)
                    o_result[`${org.lv3_ccorg_cd}_margin`]['plan_ratio'] = o_result[`${org.lv3_ccorg_cd}_margin`]['forecast_value'] - ((o_target?.target_margin ?? 0) * 100000000)
                    o_result[`${org.lv3_ccorg_cd}_sale`]['yoy'] = o_result[`${org.lv3_ccorg_cd}_sale`]['forecast_value'] - o_result[`${org.lv3_ccorg_cd}_margin`]['forecast_value']
                    o_result[`${org.lv3_ccorg_cd}_margin`]['yoy'] = o_result[`${org.lv3_ccorg_cd}_margin`]['forecast_value'] - o_result[`${org.lv3_ccorg_cd}_margin`]['last_forecast_value']
                }else{
                    if (!o_result[`${org.ccorg_cd}_sale`]) {
                        o_result[`${org.ccorg_cd}_sale`] = {
                            "display_order": org.org_order,
                            "item_order": 1,
                            "type": "매출",
                            "org_name": org.name,
                            "org_id": org.org_id
                        }
                        o_result[`${org.ccorg_cd}_margin`] = {
                            "display_order": org.org_order,
                            "item_order": 2,
                            "type": "마진",
                            "org_name": org.name,
                            "org_id": org.org_id
                        }
                    }
                    o_result[`${org.ccorg_cd}_sale`]['secured_value'] = (o_pl?.secured_sale ?? 0)
                    o_result[`${org.ccorg_cd}_margin`]['secured_value'] = (o_pl?.secured_margin ?? 0)
                    // 실적 및 확보 추정
                    if (month) {
                        o_result[`${org.ccorg_cd}_sale`]['secured_actual_value'] = (o_pl?.secured_actual_sale ?? 0)
                        o_result[`${org.ccorg_cd}_margin`]['secured_actual_value'] = (o_pl?.secured_actual_margin ?? 0)
                        o_result[`${org.ccorg_cd}_sale`]['secured_forecast_value'] = (o_pl?.secured_forecast_sale ?? 0)
                        o_result[`${org.ccorg_cd}_margin`]['secured_forecast_value'] = (o_pl?.secured_forecast_margin ?? 0)
                    }
    
                    o_result[`${org.ccorg_cd}_sale`]['not_secured_value'] = (o_pl?.not_secured_sale ?? 0)
                    o_result[`${org.ccorg_cd}_margin`]['not_secured_value'] = (o_pl?.not_secured_margin ?? 0)
                    o_result[`${org.ccorg_cd}_sale`]['forecast_value'] = (o_pl?.forecast_sale ?? 0)
                    o_result[`${org.ccorg_cd}_margin`]['forecast_value'] = (o_pl?.forecast_margin ?? 0)
                    o_result[`${org.ccorg_cd}_sale`]['last_forecast_value'] = (o_last_pl?.forecast_sale ?? 0)
                    o_result[`${org.ccorg_cd}_margin`]['last_forecast_value'] = (o_last_pl?.forecast_margin ?? 0)
                    o_result[`${org.ccorg_cd}_sale`]['plan_ratio'] = o_result[`${org.ccorg_cd}_sale`]['forecast_value'] - ((o_target?.target_sale ?? 0) * 100000000)
                    o_result[`${org.ccorg_cd}_margin`]['plan_ratio'] = o_result[`${org.ccorg_cd}_margin`]['forecast_value'] - ((o_target?.target_margin ?? 0) * 100000000)
                    o_result[`${org.ccorg_cd}_sale`]['yoy'] = o_result[`${org.ccorg_cd}_sale`]['forecast_value'] - o_result[`${org.ccorg_cd}_margin`]['forecast_value']
                    o_result[`${org.ccorg_cd}_margin`]['yoy'] = o_result[`${org.ccorg_cd}_margin`]['forecast_value'] - o_result[`${org.ccorg_cd}_margin`]['last_forecast_value']
                }
            })

            let a_result = Object.values(o_result);
            let a_total = Object.values(o_total);

            /**
            * 본부 레벨이 아닐 경우만 합계 데이터 push
            */
            if (org_col_nm !== 'hdqt_id') {
                oResult.push(...a_total)
            }
            oResult.push(...a_result)

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
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
};