const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_forecast_pl_sale_margin_relsco_detail', async (req) => {
        try {
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
            let orgInfo = await SELECT.one.from(org_full_level).columns(['org_level', 'org_ccorg_cd', 'org_name', 'lv3_ccorg_cd', 'org_tp'])
                .where`org_id = ${org_id} and (lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id})`;

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            /**
             * pl 조회 컬럼 - 확보(secured) 매출/마진, 미확보(not_secured) 매출/마진, 관계사 여부(true = 대내, false = 대외), 년도
             * 조회 조건 - 년도, 데이터 속성이 WA(account)가 아닌 것
             */
            let i_index = Number(month) === 12 ? 12 : Number(month) + 1
            let aForecastSale = [];
            for (let i = 12; i >= i_index; i--) {
                aForecastSale.push(`sale_m${i}_amt`);
            }
            let s_forecast_sale = Number(month) === 12 ? 0 : aForecastSale.join(" + ");

            const pl_col_list = [
                'year',
                'relsco_yn',
                'org_tp',
                `sum(case when src_type = 'D' then ${s_forecast_sale} else 0 end) as not_secured_sale`,
                `sum(case when src_type = 'D' then 0 else sale_year_amt end) as secured_sale`,
                `sum(case when src_type = 'D' then ${s_forecast_sale} else sale_year_amt end) as forecast_value`,
            ];
            const pl_groupBy_cols = ['year', 'relsco_yn', 'org_tp'];
            const pl_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { '!=': 'WA' } };

            /**
             * 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
             * 부문, 본부 레벨 조회일 경우, 본부별로 조회, 그 외 부문별로 조회
             */
            let pl_column = orgInfo.org_level.includes('div') || orgInfo.org_level.includes('hdqt') ? [...pl_col_list, 'hdqt_ccorg_cd as ccorg_cd', 'hdqt_name as name'] : [...pl_col_list, 'div_ccorg_cd as ccorg_cd', 'div_name as name'];
            let pl_where = orgInfo.org_level.includes('lv1') ? pl_where_conditions : { ...pl_where_conditions, [`${orgInfo.org_level}_id`]: org_id }
            let pl_groupBy = orgInfo.org_level.includes('div') || orgInfo.org_level.includes('hdqt') ? [...pl_groupBy_cols, 'hdqt_ccorg_cd', 'hdqt_name'] : [...pl_groupBy_cols, 'div_ccorg_cd', 'div_name'];

            let org_column = orgInfo.org_level.includes('div') || orgInfo.org_level.includes('hdqt') ? ['hdqt_ccorg_cd as ccorg_cd', 'hdqt_name as name', 'org_order', 'org_id', 'lv3_ccorg_cd', 'lv3_id', 'lv3_name', 'org_tp'] : ['div_ccorg_cd as ccorg_cd', 'div_name as name', 'org_order', 'org_id', 'lv3_ccorg_cd', 'lv3_id', 'lv3_name', 'org_tp'];
            let org_where = orgInfo.org_level.includes('div') || orgInfo.org_level.includes('hdqt') ? { 'hdqt_id': { '!=': null }, and: { [`${orgInfo.org_level}_id`]: org_id }, 'team_id': null } : { 'div_id': { '!=': null }, and: { [`${orgInfo.org_level}_id`]: org_id }, 'hdqt_id': null, 'team_id': null };
            let org_groupBy = orgInfo.org_level.includes('div') || orgInfo.org_level.includes('hdqt') ? ['hdqt_ccorg_cd', 'hdqt_name', 'org_order', 'org_id', 'lv3_ccorg_cd', 'lv3_id', 'lv3_name', 'org_tp'] : ['div_ccorg_cd', 'div_name', 'org_order', 'org_id', 'lv3_ccorg_cd', 'lv3_id', 'lv3_name', 'org_tp'];
            
            if (['lv1', 'lv2'].includes(orgInfo.org_level)){
                org_where = {...org_where, org_tp:{in:['delivery','account']}}
            }

            // DB 쿼리 실행 (병렬)
            const [query, account_query, org_data] = await Promise.all([
                // PL 실적, 목표 조회
                SELECT.from(pl_org_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(pl_account_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(org_full_level).columns(org_column).where(org_where).groupBy(...org_groupBy)
            ]);

            // 데이터가 없을 때 빈 배열 반환
            if (!query.find(oData => oData.forecast_value > 0) && !account_query.find(oData => oData.forecast_value > 0)) {
                return [];
            }

            /**
             * 데이터를 년도별 대내/대외 filter
             */
            let o_total = {}
            let o_result = {account:{},delivery:{}}
            let curr_t_pl = query.filter(pl => pl.relsco_yn && pl.year === year),
                curr_f_pl = query.filter(pl => !pl.relsco_yn && pl.year === year),
                last_t_pl = query.filter(pl => pl.relsco_yn && pl.year === last_year),
                last_f_pl = query.filter(pl => !pl.relsco_yn && pl.year === last_year),
                curr_account_t_pl = account_query.filter(pl => pl.relsco_yn && pl.year === year),
                curr_account_f_pl = account_query.filter(pl => !pl.relsco_yn && pl.year === year),
                last_account_t_pl = account_query.filter(pl => pl.relsco_yn && pl.year === last_year),
                last_account_f_pl = account_query.filter(pl => !pl.relsco_yn && pl.year === last_year);

            /**
             * 검색한 조직이 1,2레벨이 아닐 경우 org_name을 합계
             * 1,2레벨일 경우 해당 org_tp의 Account 소계, Delivery 소계
             */
            o_result['account']['t_sale'] = { "display_order": 0, "item_order": 1, "type1": "대내", "type2": "매출", "org_name": ['lv1', 'lv2'].includes(orgInfo.org_level)?'Account 소계':'합계', "org_id": 'account_total' }
            o_result['account']['f_sale'] = { "display_order": 0, "item_order": 2, "type1": "대외", "type2": "매출", "org_name": ['lv1', 'lv2'].includes(orgInfo.org_level)?'Account 소계':'합계', "org_id": 'account_total' }
            o_result['delivery']['t_sale'] = { "display_order": 0, "item_order": 1, "type1": "대내", "type2": "매출", "org_name": ['lv1', 'lv2'].includes(orgInfo.org_level)?'Delivery 소계':'합계', "org_id": 'delivery_total' }
            o_result['delivery']['f_sale'] = { "display_order": 0, "item_order": 2, "type1": "대외", "type2": "매출", "org_name": ['lv1', 'lv2'].includes(orgInfo.org_level)?'Delivery 소계':'합계', "org_id": 'delivery_total' }
            /**
             * 총합 데이터(lv1, lv2일 때만)
             */
            o_total['t_sale'] = { "display_order": 0, "item_order": 1, "type1": "대내", "type2": "매출", "org_name": '합계', "org_id": 'total' }
            o_total['f_sale'] = { "display_order": 0, "item_order": 2, "type1": "대외", "type2": "매출", "org_name": '합계', "org_id": 'total' }

            o_total[`t_sale`]['secured_value'] = curr_t_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0)
            o_total[`t_sale`]['not_secured_value'] = curr_t_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0)
            o_total[`t_sale`]['forecast_value'] = curr_t_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0)
            o_total[`t_sale`]['last_forecast_value'] = last_t_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0)
            o_total[`t_sale`]['yoy'] = o_total[`t_sale`]['forecast_value'] - o_total[`t_sale`]['last_forecast_value']

            o_total[`f_sale`]['secured_value'] = curr_f_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0)
            o_total[`f_sale`]['not_secured_value'] = curr_f_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0)
            o_total[`f_sale`]['forecast_value'] = curr_f_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0)
            o_total[`f_sale`]['last_forecast_value'] = last_f_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0)
            o_total[`f_sale`]['yoy'] = o_total[`f_sale`]['forecast_value'] - o_total[`f_sale`]['last_forecast_value']
            
            //org_tp가 delivery, account인 데이터의 합계
            o_result['account'][`t_sale`]['secured_value'] = curr_account_t_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0)
            o_result['account'][`t_sale`]['not_secured_value'] = curr_account_t_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0)
            o_result['account'][`t_sale`]['forecast_value'] = curr_account_t_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0)
            o_result['account'][`t_sale`]['last_forecast_value'] = last_account_t_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0)
            o_result['account'][`t_sale`]['yoy'] = o_result['account'][`t_sale`]['forecast_value'] - o_result['account'][`t_sale`]['last_forecast_value']

            o_result['account'][`f_sale`]['secured_value'] = curr_account_f_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0)
            o_result['account'][`f_sale`]['not_secured_value'] = curr_account_f_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0)
            o_result['account'][`f_sale`]['forecast_value'] = curr_account_f_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0)
            o_result['account'][`f_sale`]['last_forecast_value'] = last_account_f_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0)
            o_result['account'][`f_sale`]['yoy'] = o_result['account'][`f_sale`]['forecast_value'] - o_result['account'][`f_sale`]['last_forecast_value']
            
            o_result['delivery'][`t_sale`]['secured_value'] = curr_t_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0)
            o_result['delivery'][`t_sale`]['not_secured_value'] = curr_t_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0)
            o_result['delivery'][`t_sale`]['forecast_value'] = curr_t_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0)
            o_result['delivery'][`t_sale`]['last_forecast_value'] = last_t_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0)
            o_result['delivery'][`t_sale`]['yoy'] = o_result['delivery'][`t_sale`]['forecast_value'] - o_result['delivery'][`t_sale`]['last_forecast_value']

            o_result['delivery'][`f_sale`]['secured_value'] = curr_f_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0)
            o_result['delivery'][`f_sale`]['not_secured_value'] = curr_f_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0)
            o_result['delivery'][`f_sale`]['forecast_value'] = curr_f_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0)
            o_result['delivery'][`f_sale`]['last_forecast_value'] = last_f_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0)
            o_result['delivery'][`f_sale`]['yoy'] = o_result['delivery'][`f_sale`]['forecast_value'] - o_result['delivery'][`f_sale`]['last_forecast_value']

            /**
             * 년도별로 분류한 데이터를 조직별로 정리
             */
            org_data.forEach(org => {
                //조직의 org_tp가 account이거나, 검색한 조직이 CCO일 경우 account에 대한 데이터로 변경
                let s_org_tp = org.org_tp === 'account' || org.lv3_ccorg_cd === '237100'? 'account' : 'delivery'

                let o_curr_t_pl = s_org_tp==='delivery' ? curr_t_pl.filter(pl => pl.ccorg_cd === org.ccorg_cd) : curr_account_t_pl.filter(pl => pl.ccorg_cd === org.ccorg_cd);
                let o_curr_f_pl = s_org_tp==='delivery' ? curr_f_pl.filter(pl => pl.ccorg_cd === org.ccorg_cd) : curr_account_f_pl.filter(pl => pl.ccorg_cd === org.ccorg_cd);
                let o_last_t_pl = s_org_tp==='delivery' ? last_t_pl.filter(pl => pl.ccorg_cd === org.ccorg_cd) : last_account_t_pl.filter(pl => pl.ccorg_cd === org.ccorg_cd);
                let o_last_f_pl = s_org_tp==='delivery' ? last_f_pl.filter(pl => pl.ccorg_cd === org.ccorg_cd) : last_account_f_pl.filter(pl => pl.ccorg_cd === org.ccorg_cd);

                let i_curr_t_secured = o_curr_t_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0);
                let i_curr_t_not_secured = o_curr_t_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0);
                let i_curr_t_forecast = o_curr_t_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0);
                let i_last_t_forecast = o_last_t_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0);

                let i_curr_f_secured = o_curr_f_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0);
                let i_curr_f_not_secured = o_curr_f_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0);
                let i_curr_f_forecast = o_curr_f_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0);
                let i_last_f_forecast = o_last_f_pl.reduce((iSum, oData) => iSum += oData.forecast_value, 0);

                if (['lv1', 'lv2'].includes(orgInfo.org_level) && org.lv3_ccorg_cd === '610000') {  // Ackerton Partners인 데이터
                    if (!o_result[`${s_org_tp}`][`${org.lv3_ccorg_cd}_t_sale`]) {
                        o_result[`${s_org_tp}`][`${org.lv3_ccorg_cd}_t_sale`] = {
                            "display_order": org.org_order,
                            "item_order": 1,
                            "type1": "대내",
                            "type2": "매출",
                            "org_name": org.lv3_name,
                            "org_id": org.lv3_id
                        }
                        o_result[`${s_org_tp}`][`${org.lv3_ccorg_cd}_f_sale`] = {
                            "display_order": org.org_order,
                            "item_order": 3,
                            "type1": "대외",
                            "type2": "매출",
                            "org_name": org.lv3_name,
                            "org_id": org.lv3_id
                        }
                    }

                    let o_t_sale = o_result[`${s_org_tp}`][`${org.lv3_ccorg_cd}_t_sale`]
                    let o_f_sale = o_result[`${s_org_tp}`][`${org.lv3_ccorg_cd}_f_sale`]

                    o_t_sale['secured_value'] = (o_t_sale['secured_value'] || 0 ) + i_curr_t_secured
                    o_t_sale['not_secured_value'] = (o_t_sale['not_secured_value'] || 0 ) + i_curr_t_not_secured
                    o_t_sale['forecast_value'] = (o_t_sale['forecast_value'] || 0 ) + i_curr_t_forecast
                    o_t_sale['last_forecast_value'] = (o_t_sale['last_forecast_value'] || 0 ) + i_last_t_forecast

                    o_f_sale['secured_value'] = (o_f_sale['secured_value'] || 0 ) + i_curr_f_secured
                    o_f_sale['not_secured_value'] = (o_f_sale['not_secured_value'] || 0 ) + i_curr_f_not_secured
                    o_f_sale['forecast_value'] = (o_f_sale['forecast_value'] || 0 ) + i_curr_f_forecast
                    o_f_sale['last_forecast_value'] = (o_f_sale['last_forecast_value'] || 0 ) + i_last_f_forecast

                    o_t_sale['yoy'] = o_t_sale['forecast_value'] - o_t_sale['last_forecast_value']
                    o_f_sale['yoy'] = o_f_sale['forecast_value'] - o_f_sale['last_forecast_value']

                } else {    // Ackerton Partners가 아닌 데이터
                    if (!o_result[`${s_org_tp}`][`${org.ccorg_cd}_t_sale`]) {
                        o_result[`${s_org_tp}`][`${org.ccorg_cd}_t_sale`] = {
                            "display_order": org.org_order,
                            "item_order": 1,
                            "type1": "대내",
                            "type2": "매출",
                            "org_name": org.name,
                            "org_id": org.org_id,
                            "secured_value": i_curr_t_secured,
                            "not_secured_value": i_curr_t_not_secured,
                            "forecast_value": i_curr_t_forecast,
                            "yoy": i_curr_t_forecast - i_last_t_forecast
                        }
                        o_result[`${s_org_tp}`][`${org.ccorg_cd}_f_sale`] = {
                            "display_order": org.org_order,
                            "item_order": 3,
                            "type1": "대외",
                            "type2": "매출",
                            "org_name": org.name,
                            "org_id": org.org_id,
                            "secured_value": i_curr_f_secured,
                            "not_secured_value": i_curr_f_not_secured,
                            "forecast_value": i_curr_f_forecast,
                            "yoy": i_curr_f_forecast - i_last_f_forecast
                        }
                    }
                }
            }) 
            
            //account, delivery 조직 데이터 배열로 
            let a_account_result = Object.values(o_result['account']);
            let a_delivery_result = Object.values(o_result['delivery']);

            //졍렬
            sort_data(a_account_result)
            sort_data(a_delivery_result)

            let a_total = Object.values(o_total);

            /**
             * 본부 레벨이 아닐 경우만 합계 데이터 push
             */
            if (!orgInfo.org_level.includes("hdqt") && ['lv1', 'lv2'].includes(orgInfo.org_level)) {
                if (a_account_result.length > 0 || a_delivery_result.length > 0) {
                    oResult.push(...a_total);
                }
            }
            
            /**
             * 1,2레벨에서는 delivery, account 조직 데이터
             * 3레벨 이하에서는 검색한 조직의 org_tp에 대한 데이터
             */
            if(['lv1', 'lv2'].includes(orgInfo.org_level) || (orgInfo.org_tp === 'delivery' && a_delivery_result.length > 0)){
                oResult.push(...a_delivery_result);
            }
            if(['lv1', 'lv2'].includes(orgInfo.org_level) || (orgInfo.org_tp === 'account' || orgInfo.lv3_ccorg_cd === '237100' && a_account_result.length > 0)){
                oResult.push(...a_account_result);
            }

            /**
             * display_order, item_order기준 오름차순으로 정렬
             */

            function sort_data(a_data) {
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
        } catch (error) {
            console.error(error);
            return { code: error.code, message: error.message, isError: true }
        }
    });
};