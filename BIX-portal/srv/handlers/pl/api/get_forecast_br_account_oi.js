const { data } = require("@sap/cds/lib/dbs/cds-deploy");

module.exports = (srv) => {
    srv.on('get_forecast_non_mm_account_oi', async (req) => {

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
         * rsp.wideview_unpivot_view [비용 집계]
         * [부문/본부/팀 + 년,month_amt,금액] 프로젝트 비용 집계 뷰
         */
        const rsp_view = db.entities('rsp').wideview_unpivot_view;
        /**
         * common.org_full_level_view [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level_view;
        const account_view = db.entities('common').account
        // =================================================================================

        // function 입력 파라미터
        const { year, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

        // QUERY 공통 파라미터 선언

        // rsp 조회용 정보
        const rsp_col_list = ['year', 'month_amt', 'sum(ifnull(total_amt_sum,0)) as total_amt_sum', 'sum(ifnull(bill_amt_sum,0)) as bill_amt_sum'];
        const rsp_where_conditions = { 'year': { in: [year, last_year] }, 'is_delivery': true };
        const rsp_groupBy_cols = ['year', 'month_amt'];
        /**
         * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const pl_col_list = [
            'year', 'src_type', 'biz_tp_account_cd', 'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(margin_amount_sum,0)) as margin_amount_sum'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': '12', 'is_delivery': true, 'src_type': { '!=':'WO'}};
        const pl_groupBy_cols = ['year', 'src_type', 'biz_tp_account_cd'];

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
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd'])
            .where({ 'org_id': org_id });

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        //조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        // ccorg_cd 만 가지고 있는 경우 조회조건으로 사용

        // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation

        let pl_column = pl_col_list;
        let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
        let pl_groupBy = pl_groupBy_cols;

        // DB 쿼리 실행 (병렬)
        const [pl_data, account_data] = await Promise.all([
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(account_view).columns(['biz_tp_account_cd','biz_tp_account_nm','sort_order'])
        ]);
        let o_data = {}

        pl_data.forEach(o_item=>{
            let o_find_account = account_data.find(o_account => o_account.biz_tp_account_cd === o_item.biz_tp_account_cd);
            if(o_find_account){
                if(!o_data[`${o_item.biz_tp_account_cd}`]){
                    o_data[`${o_item.biz_tp_account_cd}`]={account_cd: o_item.biz_tp_account_cd, account_nm: o_find_account.biz_tp_account_nm, sort_order:o_find_account.sort_order, margin:{},sale:{}};
                }
                if(o_item.year === year){
                    if(o_item.src_type === 'D'){
                        o_data[`${o_item.biz_tp_account_cd}`]['sale']['secured_sale'] = (o_data[`${o_item.biz_tp_account_cd}`]['sale']['secured_sale'] || 0) + o_item.sale_amount_sum;
                        o_data[`${o_item.biz_tp_account_cd}`]['margin']['secured_margin'] = (o_data[`${o_item.biz_tp_account_cd}`]['margin']['secured_margin'] || 0) + o_item.margin_amount_sum;
                    }else{
                        o_data[`${o_item.biz_tp_account_cd}`]['sale']['not_secured_sale'] = (o_data[`${o_item.biz_tp_account_cd}`]['sale']['not_secured_sale'] || 0) + o_item.sale_amount_sum;
                        o_data[`${o_item.biz_tp_account_cd}`]['margin']['not_secured_margin'] = (o_data[`${o_item.biz_tp_account_cd}`]['margin']['not_secured_margin'] || 0) + o_item.margin_amount_sum;
                    }
                    o_data[`${o_item.biz_tp_account_cd}`]['sale']['curr_plan_sale'] = (o_data[`${o_item.biz_tp_account_cd}`]['sale']['curr_plan_sale'] || 0) + o_item.sale_amount_sum;
                    o_data[`${o_item.biz_tp_account_cd}`]['margin']['curr_plan_margin'] = (o_data[`${o_item.biz_tp_account_cd}`]['margin']['curr_plan_margin'] || 0) + o_item.margin_amount_sum;
                }else{
                    o_data[`${o_item.biz_tp_account_cd}`]['sale']['last_plan_sale'] = (o_data[`${o_item.biz_tp_account_cd}`]['sale']['last_plan_sale'] || 0) + o_item.sale_amount_sum;
                    o_data[`${o_item.biz_tp_account_cd}`]['margin']['last_plan_margin'] = (o_data[`${o_item.biz_tp_account_cd}`]['margin']['last_plan_margin'] || 0) + o_item.margin_amount_sum;
                }
            }
        })
        const a_data = Object.values(o_data)

        a_data.forEach(o_dt_data=>{
            let o_sale_temp = {
                "display_order": (o_dt_data.sort_order*2)-1,
                "account_id": o_dt_data.account_cd,
                "account_nm": o_dt_data.account_nm,
                "type":'매출',
                "forecast_value": o_dt_data.sale?.['curr_plan_sale'] ?? 0,
                "secured_value": o_dt_data.sale?.['secured_sale'] ?? 0,
                "not_secured_value": o_dt_data.sale?.['not_secured_sale'] ?? 0,
                "plan_ratio": (o_dt_data.sale?.['curr_plan_sale'] ?? 0) === 0 ? 0 : (o_dt_data.sale?.['secured_sale'] ?? 0)/o_dt_data.sale['curr_plan_sale'] * 100,
                "yoy": (o_dt_data.sale?.['last_plan_sale'] ?? 0) === 0 ? 0 : (o_dt_data.sale?.['curr_plan_sale'] ?? 0)/o_dt_data.sale['last_plan_sale'] * 100,
            }
            let o_margin_temp = {
                "display_order": o_dt_data.sort_order*2,
                "account_id": o_dt_data.account_cd,
                "account_nm": o_dt_data.account_nm,
                "type":'마진',
                "forecast_value": o_dt_data.margin?.['curr_plan_margin'] ?? 0,
                "secured_value": o_dt_data.margin?.['secured_margin'] ?? 0,
                "not_secured_value": o_dt_data.margin?.['not_secured_margin'] ?? 0,
                "plan_ratio": (o_dt_data.margin?.['curr_plan_margin'] ?? 0) === 0 ? 0 : (o_dt_data.margin?.['secured_margin'] ?? 0)/o_dt_data.margin['curr_plan_margin'] * 100,
                "yoy": (o_dt_data.margin?.['last_plan_margin'] ?? 0) === 0 ? 0 : (o_dt_data.margin?.['curr_plan_margin'] ?? 0)/o_dt_data.margin['last_plan_margin'] * 100,
            }
            oResult.push(o_sale_temp,o_margin_temp)
        })
        return oResult
    });
}