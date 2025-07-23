const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_forecast_dt_account_oi', async (req) => {
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
             * common_annual_target_temp_view
             * 조직 별 연단위 목표금액
             */
            const target = db.entities('common').annual_target_temp_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;
            const account_view = db.entities('common').account_view
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id } = req.data;
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
            
            let s_forecast_sale = Number(month) === 12? 0 : aForecastSale.join(" + ");

            const dt_pl_col_list = [
                'year',
                'biz_tp_account_cd', 
                `sum(case when src_type = 'D' then ${s_forecast_sale} else 0 end) as not_secured_sale`,
                `sum(case when src_type = 'D' then 0 else sale_year_amt end) as secured_sale`,
            ];
            const dt_pl_where_conditions = { 'year': {in:[year,last_year]}, 'src_type': { '!=':'WO'}};
            const dt_pl_groupBy_cols = ['year','biz_tp_account_cd'];

            /** 
             * 타겟 뷰 조회용 컬럼
             */
            const target_col_list = [
                'year',
                'target_type_cd',
                'ifnull(dt_sale_target,0) as dt_sale_target'
            ];
            const target_where_conditions = { 'year': year, 'target_type': 'biz_tp_account_cd'};
            const target_groupBy_cols = ['year' ,'target_type_cd']

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
            let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'lv3_ccorg_cd', 'org_ccorg_cd','org_tp'])
                .where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level;
            let lv3_ccorg_cd = orgInfo.lv3_ccorg_cd;
            let org_tp = orgInfo.org_tp;
            
            let pl_view = pl_org_view
            if(org_col_nm !== 'lv1_id' && org_col_nm !== 'lv2_id' && ((org_tp === 'hybrid' && lv3_ccorg_cd === '237100') || org_tp === 'account')){
                pl_view = pl_account_view
            }
            // ccorg_cd 만 가지고 있는 경우 조회조건으로 사용

            // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation

            let dt_pl_column = dt_pl_col_list;
            let dt_pl_where = org_col_nm === 'lv1_id' ? dt_pl_where_conditions : { ...dt_pl_where_conditions, [org_col_nm]: org_id };
            let dt_pl_groupBy = dt_pl_groupBy_cols;

            // DB 쿼리 실행 (병렬)
            const [dt_pl_data, account_data,target_query] = await Promise.all([
                SELECT.from(pl_view).columns(dt_pl_column).where(dt_pl_where).groupBy(...dt_pl_groupBy),
                SELECT.from(account_view).columns(['biz_tp_account_cd','biz_tp_account_nm','sort_order']),
                SELECT.from(target).columns(target_col_list).where(target_where_conditions),
            ]);
            if(!dt_pl_data.length){
                //return req.res.status(204).send();
                return []
            }
            const curr_pl = dt_pl_data.filter(o_pl => o_pl.year === year),
            last_pl = dt_pl_data.filter(o_pl => o_pl.year === last_year);

            let o_result = {}
            let o_total = {
                'sale':{"display_order": 0, "type": "매출", "account_nm" : '합계', 'account_cd':'total', target:0},
            }
            o_total[`sale`]['secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0)
            o_total[`sale`]['not_secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0)
            o_total[`sale`]['forecast_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_sale+oData.not_secured_sale, 0)
            o_total[`sale`]['last_forecast_value'] = last_pl.reduce((iSum, oData) => iSum += oData.secured_sale+oData.not_secured_sale, 0)
            
            account_data.forEach(account => {
                let o_pl = curr_pl.find(pl => pl.biz_tp_account_cd === account.biz_tp_account_cd);
                let o_last_pl = last_pl.find(pl => pl.biz_tp_account_cd === account.biz_tp_account_cd);
                let o_curr_target = target_query.find(target => target.target_type_cd === account.biz_tp_account_cd)
                if(!o_result[`${account.biz_tp_account_cd}_sale`]){
                    o_result[`${account.biz_tp_account_cd}_sale`]={display_order : account.sort_order+1, account_nm : account.biz_tp_account_nm, account_cd : account.biz_tp_account_cd, type: "매출"}
                }
                o_result[`${account.biz_tp_account_cd}_sale`]['secured_value'] = (o_pl?.secured_sale ?? 0)
                o_result[`${account.biz_tp_account_cd}_sale`]['not_secured_value'] = (o_pl?.not_secured_sale ?? 0)
                o_result[`${account.biz_tp_account_cd}_sale`]['forecast_value'] = (o_pl?.secured_sale ?? 0) + (o_pl?.not_secured_sale ?? 0)
                o_result[`${account.biz_tp_account_cd}_sale`]['plan_ratio'] = ((o_pl?.secured_sale ?? 0) + (o_pl?.not_secured_sale ?? 0)) - ((o_curr_target?.dt_sale_target ?? 0)*100000000)
                o_result[`${account.biz_tp_account_cd}_sale`]['yoy'] = ((o_pl?.secured_sale ?? 0) + (o_pl?.not_secured_sale ?? 0)) - ((o_last_pl?.secured_sale ?? 0) + (o_last_pl?.not_secured_sale ?? 0))

                o_total[`sale`]['target'] += (o_curr_target?.dt_sale_target ?? 0)
            })
            
            const a_result = Object.values(o_result)
            const a_total = Object.values(o_total);
            a_total.forEach(total => {
                
                let o_temp = {
                    "display_order": total.display_order,
                    "type": total.type,
                    "account_nm" : total.account_nm,
                    "account_cd" : total.account_cd,
                    "forecast_value" : total.forecast_value,
                    "secured_value" : total.secured_value,
                    "not_secured_value" : total.not_secured_value,
                    "plan_ratio" : total.forecast_value - total.target*100000000,
                    "yoy" : total.forecast_value - total.last_forecast_value,
                }
                
                oResult.push(o_temp)
            })
            a_result.forEach(result => {

                let o_temp = {
                    "display_order": result.display_order,
                    "type": result.type,
                    "account_nm" : result.account_nm,
                    "account_cd" : result.account_cd,
                    "forecast_value" : result.forecast_value,
                    "secured_value" : result.secured_value,
                    "not_secured_value" : result.not_secured_value,
                    "plan_ratio" : result.plan_ratio,
                    "yoy" : result.yoy,
                }
                oResult.push(o_temp)
            })

            let a_sort_field = [
                { field: "display_order", order: "asc" },
            ];
            oResult.sort((oItem1, oItem2) => {
                for (const { field, order } of a_sort_field) {
                    // 필드가 null일 때
                    if (oItem1[field] === null && oItem2[field] !== null) return -1;
                    if (oItem1[field] !== null && oItem2[field] === null) return 1;
                    if (oItem1[field] === null && oItem2[field] === null) continue;

                    if (typeof oItem1[field] === "number") {
                        var result = oItem1[field] - oItem2[field];
                    } else {
                        var result = oItem1[field].localeCompare(oItem2[field]);
                    }

                    if (result !== 0) {
                        return (order === "asc") ? result : -result;
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