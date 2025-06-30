module.exports = (srv) => {
    srv.on('get_forecast_pl_sale_margin_account_detail', async (req) => {
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
        const pl_view = db.entities('pl').wideview_view;
        /**
         * common.org_full_level_view [조직정보]
         */
        const org_full_level = db.entities('common').org_full_level_view;
        /**
         * common.annual_target_temp_view
         * 조직 별 연단위 목표금액
         */
        const target = db.entities('common').annual_target_temp_view;
        /**
         * common.account 정보
         */
        const common_account = db.entities('common').account;
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

        /**
         * pl 조회 컬럼 - 확보(secured) 매출/마진, 미확보(not_secured) 매출/마진, 년도, account 코드
         * 조회 조건 - 년도, 데이터 속성이 WO(org)가 아닌 것
         */
        const pl_col_list = [
            'year', 
            'biz_tp_account_cd', 
            `sum(case when src_type = 'D' then 0 else ifnull(sale_year_amt,0) end) as secured_sale`,
            `sum(case when src_type = 'D' then 0 else ifnull(margin_year_amt,0) end) as secured_margin`,
            `sum(case when src_type = 'D' then ifnull(sale_year_amt,0) else 0 end) as not_secured_sale`,
            `sum(case when src_type = 'D' then ifnull(margin_year_amt,0) else 0 end) as not_secured_margin`
        ];
        const pl_groupBy_cols = ['year','biz_tp_account_cd'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': {'!=':'WO'}};

        // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
        let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
        
        /** 
         * 타겟 뷰 조회용 컬럼 - 년도, 목표 대상 코드, 매출목표, 마진목표
         * 조회 조건 - 년도, 목표 대상
         */
        const target_col_list = [
            'year',
            'target_type_cd',
            'sum(ifnull(sale_target,0)) as sale_target',
            'sum(ifnull(margin_target,0)) as margin_target',
        ];
        const target_where_conditions = { 'year': year, 'target_type': 'biz_tp_account_cd'};
        const target_groupBy_cols = ['year' ,'target_type_cd']

        // DB 쿼리 실행 (병렬)
        const [query, account_query, target_query] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols),
            SELECT.from(common_account).columns(['biz_tp_account_cd','biz_tp_account_nm','sort_order']),
            SELECT.from(target).columns(target_col_list).where(target_where_conditions).groupBy(...target_groupBy_cols),
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
            'sale':{"display_order": 0, "item_order" : 1, "type": "매출", "org_name" : '합계',target:0},
            'margin':{"display_order": 0, "item_order" : 2, "type": "마진", "org_name" : '합계',target:0}
        }
        o_total[`sale`]['secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_sale, 0)
        o_total[`margin`]['secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_margin, 0)
        o_total[`sale`]['not_secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.not_secured_sale, 0)
        o_total[`margin`]['not_secured_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.not_secured_margin, 0)
        o_total[`sale`]['forecast_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_sale+oData.not_secured_sale, 0)
        o_total[`margin`]['forecast_value'] = curr_pl.reduce((iSum, oData) => iSum += oData.secured_margin+oData.not_secured_margin, 0)
        o_total[`sale`]['last_forecast_value'] = last_pl.reduce((iSum, oData) => iSum += oData.secured_sale+oData.not_secured_sale, 0)
        o_total[`margin`]['last_forecast_value'] = last_pl.reduce((iSum, oData) => iSum += oData.secured_margin+oData.not_secured_margin, 0)
        
        /**
         * 년도별로 분류한 데이터를 Account별로 정리
         */
        let o_result = {}
        account_query.forEach(account => {
            let o_pl = curr_pl.find(pl => pl.biz_tp_account_cd === account.biz_tp_account_cd);
            let o_last_pl = o_pl ? last_pl.find(pl => pl.biz_tp_account_cd === o_pl.biz_tp_account_cd) : {};
            let o_curr_target = target_query.find(target => target.target_type_cd === account.biz_tp_account_cd)
            
            if(!o_result[`${account.biz_tp_account_cd}_sale`]){
                o_result[`${account.biz_tp_account_cd}_sale`]={display_order : account.sort_order,
                        item_order : 1,
                        org_name : account.biz_tp_account_nm,
                        org_id : account.biz_tp_account_cd,
                        type: "매출",
                        target : o_curr_target?.sale_target ?? 0
                    }
                o_result[`${account.biz_tp_account_cd}_margin`]={display_order : account.sort_order,
                        item_order : 2,
                        org_name : account.biz_tp_account_nm,
                        org_id : account.biz_tp_account_cd,
                        type: "마진",
                        target : o_curr_target?.margin_target ?? 0
                    }
            }
            o_result[`${account.biz_tp_account_cd}_sale`]['secured_value'] = (o_pl?.secured_sale ?? 0)
            o_result[`${account.biz_tp_account_cd}_margin`]['secured_value'] = (o_pl?.secured_margin ?? 0)
            o_result[`${account.biz_tp_account_cd}_sale`]['not_secured_value'] = (o_pl?.not_secured_sale ?? 0)
            o_result[`${account.biz_tp_account_cd}_margin`]['not_secured_value'] = (o_pl?.not_secured_margin ?? 0)
            o_result[`${account.biz_tp_account_cd}_sale`]['forecast_value'] = (o_pl?.secured_sale ?? 0) + (o_pl?.not_secured_sale ?? 0)
            o_result[`${account.biz_tp_account_cd}_margin`]['forecast_value'] = (o_pl?.secured_margin ?? 0) + (o_pl?.not_secured_margin ?? 0)
            o_result[`${account.biz_tp_account_cd}_sale`]['secured_value'] = o_pl?.secured_sale ?? 0
            o_result[`${account.biz_tp_account_cd}_margin`]['secured_value'] = o_pl?.secured_margin ?? 0
            o_result[`${account.biz_tp_account_cd}_sale`]['not_secured_value'] = o_pl?.not_secured_sale ?? 0
            o_result[`${account.biz_tp_account_cd}_margin`]['not_secured_value'] = o_pl?.not_secured_margin ?? 0
            o_result[`${account.biz_tp_account_cd}_sale`]['forecast_value'] = (o_pl?.secured_sale ?? 0) + (o_pl?.not_secured_sale ?? 0)
            o_result[`${account.biz_tp_account_cd}_margin`]['forecast_value'] = (o_pl?.secured_margin ?? 0) + (o_pl?.not_secured_margin ?? 0)
            o_result[`${account.biz_tp_account_cd}_sale`]['last_forecast_value'] = (o_last_pl?.secured_sale ?? 0) + (o_last_pl?.not_secured_sale ?? 0)
            o_result[`${account.biz_tp_account_cd}_margin`]['last_forecast_value'] = (o_last_pl?.secured_margin ?? 0) + (o_last_pl?.not_secured_margin ?? 0)

            o_total[`sale`]['target'] += (o_curr_target?.sale_target ?? 0)
            o_total[`margin`]['target'] += (o_curr_target?.margin_target ?? 0)
        })
        
        const a_result = Object.values(o_result)
        const a_total = Object.values(o_total);
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
        let a_sort_field = [
            { field: "display_order", order: "asc" },
            { field: "item_order", order: "asc" },
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
        return oResult;
    });
};