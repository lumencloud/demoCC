const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_forecast_dt_org_oi', async (req) => {
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
             * pl.wideview_dt_view [실적]
             * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const pl_org_view = db.entities('pl').wideview_dt_view;
            const pl_account_view = db.entities('pl').wideview_account_dt_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id, org_tp } = req.data;
            const last_year = (Number(year) - 1).toString();

            // QUERY 공통 파라미터 선언
            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            let i_index = Number(month) === 12? 12 : Number(month)+1
            let aForecastSale = [];
            for (let i = 12; i >= i_index; i--) {
                aForecastSale.push(`sale_m${i}_amt`);
            }
            let s_forecast_sale = Number(month) === 12? 0 : aForecastSale.join(" + ")

            const dt_pl_col_list = [
                'year', 
                `sum(case when src_type = 'D' then ${s_forecast_sale} else 0 end) as not_secured_sale`,
                `sum(case when src_type = 'D' then 0 else sale_year_amt end) as secured_sale`,
            ];
            const dt_pl_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { '!=':'WA'}};
            const dt_pl_groupBy_cols = ['year'];

            /**
             * +++++ TBD +++++
             * 권한 체크하여 사용자가 조회 가능한 조직인지 판별 후 코드 진행
             */

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
                .where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level;
            let org_ccorg_col_nm = org_col_nm.slice(0, -2) + 'ccorg_cd'; // <>_id 에서 id 제거 후 <>_ccorg_cd 컬럼명 생성
            let org_ccorg_cd = orgInfo.org_ccorg_cd;
            // ccorg_cd 만 가지고 있는 경우 조회조건으로 사용
            
            let pl_view = pl_org_view
            if(org_tp === 'account'){
                pl_view = pl_account_view
            }

            // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation

            let dt_pl_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...dt_pl_col_list,'hdqt_ccorg_cd as ccorg_cd','hdqt_name as name'] : [...dt_pl_col_list,'div_ccorg_cd as ccorg_cd','div_name as name'];
            let dt_pl_where = org_col_nm === 'lv1_id' ? dt_pl_where_conditions : { ...dt_pl_where_conditions, [org_col_nm]: org_id };
            let dt_pl_groupBy = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? [...dt_pl_groupBy_cols,'hdqt_ccorg_cd','hdqt_name'] : [...dt_pl_groupBy_cols,'div_ccorg_cd','div_name'];
            
            let org_column = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? ['hdqt_ccorg_cd as ccorg_cd','hdqt_name as name','org_order','org_id','lv3_ccorg_cd','lv3_id','lv3_name'] : ['div_ccorg_cd as ccorg_cd','div_name as name','org_order','org_id','lv3_ccorg_cd','lv3_id','lv3_name'];
            let org_where = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? { 'hdqt_id': { '!=': null }, and: { [org_col_nm]: org_id }, 'team_id':null } : { 'div_id': { '!=': null }, and: { [org_col_nm]: org_id }, 'hdqt_id':null, 'team_id':null };
            let org_groupBy = org_col_nm === 'div_id' || org_col_nm === 'hdqt_id' ? ['hdqt_ccorg_cd','hdqt_name','org_order','org_id','lv3_ccorg_cd','lv3_id','lv3_name'] : ['div_ccorg_cd','div_name','org_order','org_id','lv3_ccorg_cd','lv3_id','lv3_name'];
            
            if(!!org_tp && org_col_nm.includes('lv')){
                org_where = {...org_where, 'org_tp': org_tp}
            }
            if(org_tp === 'delivery' && (['lv1_id','lv2_id'].includes(org_col_nm))){
                dt_pl_where = {...dt_pl_where, 'org_tp': 'delivery'}
            }
            
            // DB 쿼리 실행 (병렬)
            const [dt_pl_data,target_query,org_data] = await Promise.all([
                SELECT.from(pl_view).columns(dt_pl_column).where(dt_pl_where).groupBy(...dt_pl_groupBy),
                get_org_target(year,['B02']),
                SELECT.from(org_full_level).columns(org_column).where(org_where).groupBy(...org_groupBy)
            ]);
            
            if(!dt_pl_data.length){
                //return req.res.status(204).send();
                return []
            }
            const curr_pl = dt_pl_data.filter(o_pl => o_pl.year === year),
                last_pl = dt_pl_data.filter(o_pl => o_pl.year === last_year);
            let o_total_target = target_query.find(target => target.org_ccorg_cd === org_ccorg_cd)
            
            let o_result = {};
            let o_total = {
                'sale':{"display_order": '0', "type": "매출", "org_name" : '합계', "org_id":'total','target':o_total_target.target_dt_sale},
            }
            o_total[`sale`]['secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0)
            o_total[`sale`]['not_secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0)
            o_total[`sale`]['forecast_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_sale+oData.not_secured_sale, 0)
            o_total[`sale`]['last_forecast_value'] = last_pl.reduce((iSum, oData) => iSum += oData.secured_sale+oData.not_secured_sale, 0)
            
            org_data.forEach(org => {
                let o_pl = curr_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
                let o_last_pl = last_pl.find(pl => pl.ccorg_cd === org.ccorg_cd);
                let o_target = target_query.find(target => target.org_ccorg_cd === org.ccorg_cd)
                if(['lv1_id','lv2_id'].includes(org_col_nm) && org.lv3_ccorg_cd === '610000'){
                    if(!o_result[`${org.lv3_ccorg_cd}_sale`]){
                        o_result[`${org.lv3_ccorg_cd}_sale`] = {
                            "display_order": org.org_order,
                            "type": "매출",
                            "org_name" : org.lv3_name,
                            "org_id":org.lv3_id,
                            "secured_value":0,
                            "not_secured_value":0,
                            "forecast_value":0,
                            "plan_ratio":0,
                            "yoy":0,
                        }
                    }
                    
                    o_result[`${org.lv3_ccorg_cd}_sale`]['secured_value'] += (o_pl?.secured_sale ?? 0)
                    o_result[`${org.lv3_ccorg_cd}_sale`]['not_secured_value'] += (o_pl?.not_secured_sale ?? 0)
                    o_result[`${org.lv3_ccorg_cd}_sale`]['forecast_value'] += (o_pl?.secured_sale ?? 0) + (o_pl?.not_secured_sale ?? 0)
                    o_result[`${org.lv3_ccorg_cd}_sale`]['plan_ratio'] += ((o_pl?.secured_sale ?? 0) + (o_pl?.not_secured_sale ?? 0)) - ((o_target?.target_dt_sale ?? 0)*100000000)
                    o_result[`${org.lv3_ccorg_cd}_sale`]['yoy'] += ((o_pl?.secured_sale ?? 0) + (o_pl?.not_secured_sale ?? 0))-((o_last_pl?.secured_sale ?? 0) + (o_last_pl?.not_secured_sale ?? 0))
                }else{
                    if(!o_result[`${org.ccorg_cd}_sale`]){
                        o_result[`${org.ccorg_cd}_sale`] = {
                            "display_order": org.org_order,
                            "type": "매출",
                            "org_name" : org.name,
                            "org_id":org.org_id
                        }
                    }
                    
                    o_result[`${org.ccorg_cd}_sale`]['secured_value'] = (o_pl?.secured_sale ?? 0)
                    o_result[`${org.ccorg_cd}_sale`]['not_secured_value'] = (o_pl?.not_secured_sale ?? 0)
                    o_result[`${org.ccorg_cd}_sale`]['forecast_value'] = (o_pl?.secured_sale ?? 0) + (o_pl?.not_secured_sale ?? 0)
                    o_result[`${org.ccorg_cd}_sale`]['plan_ratio'] = ((o_pl?.secured_sale ?? 0) + (o_pl?.not_secured_sale ?? 0)) - ((o_target?.target_dt_sale ?? 0)*100000000)
                    o_result[`${org.ccorg_cd}_sale`]['yoy'] = ((o_pl?.secured_sale ?? 0) + (o_pl?.not_secured_sale ?? 0))-((o_last_pl?.secured_sale ?? 0) + (o_last_pl?.not_secured_sale ?? 0))
                }
            })
            
            let a_result = Object.values(o_result);
            let a_total = Object.values(o_total);
            if(org_col_nm !== 'hdqt_id' && org_col_nm !== 'team_id'){
                a_total.forEach(total => {
                    let o_temp = {
                        "display_order": total.display_order,
                        "type": total.type,
                        "org_name" : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? orgInfo.org_name : total.org_name,
                        "org_id" : total.org_id,
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
                    "type": result.type,
                    "org_name" : result.org_name,
                    "org_id" : result.org_id,
                    "forecast_value" : result.forecast_value,
                    "secured_value" : result.secured_value,
                    "not_secured_value" : result.not_secured_value,
                    "plan_ratio" : result.plan_ratio,
                    "yoy" : result.yoy,
                }
                oResult.push(o_temp)
            })            
            

            let aSortFields = [
                { field: "display_order", order: "asc" }
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
            return oResult
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}