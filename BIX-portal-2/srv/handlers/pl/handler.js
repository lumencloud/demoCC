const cds = require('@sap/cds');

module.exports = class PL_Service extends cds.ApplicationService {

    init() {
        

        /**
         * [실적PL] OI 테이블 데이터 호출 api
         */
        const get_actual_oi = require('./api/get_actual_oi');
        get_actual_oi(this);
        
        /**
         * [실적PL] PL 디테일 테이블 데이터 호출 API
         */
        const get_actual_pl_org_detail = require('./api/get_actual_pl_org_detail');
        get_actual_pl_org_detail(this);

        /**
         * [실적PL] PL 디테일 테이블 엑셀 pl 데이터 호출 API
         */
        const get_actual_pl_org_detail_excel = require('./api/get_actual_pl_org_detail_excel');
        get_actual_pl_org_detail_excel(this);
        /**
         * [실적PL] PL 디테일 테이블 엑셀 목표 데이터 호출 API
         */
        const get_actual_pl_org_detail_target_excel = require('./api/get_actual_pl_org_detail_target_excel');
        get_actual_pl_org_detail_target_excel(this);

        
        /**
         * [월별 실적OI] OI 테이블 데이터 호출 api
         */
        const get_actual_m_oi = require('./api/get_actual_m_oi');
        get_actual_m_oi(this);
        /**
         * [월별 추정 Trend] 월별 추정 Trend 테이블 데이터 호출 api
         */
        const get_forecast_trend = require('./api/get_forecast_trend');
        get_forecast_trend(this);
        /**
         * [월별 추정 미확보PL] 월별 추정 미확보PL 테이블 데이터 호출 api
         */
        const get_forecast_m_pl = require('./api/get_forecast_m_pl');
        get_forecast_m_pl(this);

        const get_forecast_m_pl_excel = require('./api/get_forecast_m_pl_excel');
        get_forecast_m_pl_excel(this);
        /**
         * [추정 미확보PL] 추정 미확보PL pipeline 테이블 데이터 호출 api
         */
        const get_forecast_pl_pipeline = require('./api/get_forecast_pl_pipeline');
        get_forecast_pl_pipeline(this);
        /**
         * [추정 미확보PL] 추정 미확보PL pipeline 디테일 테이블 데이터 호출 api
         */
        const get_forecast_pl_pipeline_detail = require('./api/get_forecast_pl_pipeline_detail');
        get_forecast_pl_pipeline_detail(this);
        /**
         * [추정 미확보PL] 추정 미확보PL pipeline account 테이블 데이터 호출 api
         */
        const get_forecast_pl_pipeline_account = require('./api/get_forecast_pl_pipeline_account');
        get_forecast_pl_pipeline_account(this);
        /**
         * [실적] 실적 pipeline 테이블 테이블 데이터 호출 api
         */
        const get_actual_pl_pipeline = require('./api/get_actual_pl_pipeline');
        get_actual_pl_pipeline(this);
        
        /**
         * [실적PL] DT과제별 연간 총 수주금액 테이블 데이터 호출 API
         */
        const get_rodr_dt_y = require('./api/get_rodr_dt_y');
        get_rodr_dt_y(this);

        const get_rodr_dt_y_excel = require('./api/get_rodr_dt_y_excel');
        get_rodr_dt_y_excel(this);

        /**
         * [실적PL] 조직별 BR 테이블 데이터 호출 API
         */
        const get_actual_br_org_detail = require('./api/get_actual_br_org_detail');
        get_actual_br_org_detail(this);

        /**
         * [추정PL] 조직별 BR 테이블 데이터 호출 API
         */
        const get_forecast_br_org_detail = require('./api/get_forecast_br_org_detail');
        get_forecast_br_org_detail(this);        

        /**
         * [실적PL] ACCOUNT별 연간 총 수주금액 테이블 데이터 호출 API
         */
        const get_rodr_account_y = require('./api/get_rodr_account_y');
        get_rodr_account_y(this);

        const get_rodr_account_y_excel = require('./api/get_rodr_account_y_excel');
        get_rodr_account_y_excel(this);

        /**
         * [실적PL] PL 테이블 전체보기 Raw Data 반환 API
         */
        const get_actual_pl_excel = require('./api/get_actual_pl_excel');
        get_actual_pl_excel(this);
        
        const get_forecast_oi = require('./api/get_forecast_oi');
        get_forecast_oi(this);
        
        const get_forecast_br = require('./api/get_forecast_br');
        get_forecast_br(this);
        
        const get_forecast_br_detail = require('./api/get_forecast_br_detail');
        get_forecast_br_detail(this);
        
        const get_forecast_opp_br = require('./api/get_forecast_opp_br');
        get_forecast_opp_br(this);

        const get_forecast_dt_org_oi = require('./api/get_forecast_dt_org_oi');
        get_forecast_dt_org_oi(this);

        const get_forecast_dt_account_oi = require('./api/get_forecast_dt_account_oi');
        get_forecast_dt_account_oi(this);

        const get_forecast_dt_task_oi = require('./api/get_forecast_dt_task_oi');
        get_forecast_dt_task_oi(this);

        const get_forecast_dt_task_year_oi = require('./api/get_forecast_dt_task_year_oi');
        get_forecast_dt_task_year_oi(this);

        const get_forecast_pl = require('./api/get_forecast_pl');
        get_forecast_pl(this);

        const get_plan_dt_sale = require('./api/get_plan_dt_sale');
        get_plan_dt_sale(this);

        const get_plan_dt_sale_excel = require('./api/get_plan_dt_sale_excel');
        get_plan_dt_sale_excel(this);

        const get_actual_dt_org_oi = require('./api/get_actual_dt_org_oi');
        get_actual_dt_org_oi(this);

        const get_actual_dt_task_oi = require('./api/get_actual_dt_task_oi');
        get_actual_dt_task_oi(this);

        const get_forecast_non_mm_account_oi = require('./api/get_forecast_non_mm_account_oi');
        get_forecast_non_mm_account_oi(this);

        const get_forecast_non_mm_lob_oi = require('./api/get_forecast_non_mm_lob_oi');
        get_forecast_non_mm_lob_oi(this);

        const get_actual_non_mm_account_oi = require('./api/get_actual_non_mm_account_oi');
        get_actual_non_mm_account_oi(this);

        const get_actual_non_mm_lob_oi = require('./api/get_actual_non_mm_lob_oi');
        get_actual_non_mm_lob_oi(this);

        const get_actual_sale_org_pl = require('./api/get_actual_sale_org_pl');
        get_actual_sale_org_pl(this);

        const get_actual_sale_sub_company_pl = require('./api/get_actual_sale_sub_company_pl');
        get_actual_sale_sub_company_pl(this);

        const get_actual_sale_account_pl = require('./api/get_actual_sale_account_pl');
        get_actual_sale_account_pl(this);

        const get_actual_sale_relsco_pl = require('./api/get_actual_sale_relsco_pl');
        get_actual_sale_relsco_pl(this);

        const get_actual_sale_crov_pl = require('./api/get_actual_sale_crov_pl');
        get_actual_sale_crov_pl(this);

        const get_actual_dt_account_oi = require('./api/get_actual_dt_account_oi');
        get_actual_dt_account_oi(this);

        const get_actual_rohc_org_oi = require('./api/get_actual_rohc_org_oi');
        get_actual_rohc_org_oi(this);

        const get_actual_rohc_account_oi = require('./api/get_actual_rohc_account_oi');
        get_actual_rohc_account_oi(this);
        

        /**
         * [추정PL] 추정 PL 테이블 매출 마진 클릭시 조직별 디테일 테이블 API
         */        
        const get_forecast_br_org_oi = require('./api/get_forecast_br_org_oi');
        get_forecast_br_org_oi(this);

        /**
         * [추정PL] 추정 PL 테이블 매출 마진 클릭시 조직별 디테일 테이블 API
         */
        const get_forecast_pl_sale_margin_org_detail = require('./api/get_forecast_pl_sale_margin_org_detail');
        get_forecast_pl_sale_margin_org_detail(this);

        /**
         * [추정PL] 추정 PL 테이블 매출 마진 클릭시 대내/대외 디테일 테이블 API
         */
        const get_forecast_pl_sale_margin_relsco_detail = require('./api/get_forecast_pl_sale_margin_relsco_detail');
        get_forecast_pl_sale_margin_relsco_detail(this);

        /**
         * [추정PL] 추정 PL 테이블 매출 마진 클릭시 신규/이월 디테일 테이블 API
         */
        const get_forecast_pl_sale_margin_crov_detail = require('./api/get_forecast_pl_sale_margin_crov_detail');
        get_forecast_pl_sale_margin_crov_detail(this);

        /**
         * [추정PL] 추정 PL 테이블 매출 마진 클릭시 Account별 디테일 테이블 API
         */
        const get_forecast_pl_sale_margin_account_detail = require('./api/get_forecast_pl_sale_margin_account_detail');
        get_forecast_pl_sale_margin_account_detail(this);

        /**
         * [실적PL] 실적 PL 테이블 매출 마진 클릭시 조직별 디테일 테이블 API
         */
        const get_actual_pl_sale_margin_org_detail = require('./api/get_actual_pl_sale_margin_org_detail');
        get_actual_pl_sale_margin_org_detail(this);
        
        // const get_pl_performance = require('./get_pl_performance');
        // get_pl_performance(this);

        // const get_oi_performance = require('./get_oi_performance');
        // get_oi_performance(this);

        // const get_pl_target_sale = require('./get_pl_target_sale');
        // get_pl_target_sale(this);

        // const get_sga_result_detail_excel = require('./get_sga_result_detail_excel');
        // get_sga_result_detail_excel(this);

        // const get_pl_performance_bar_chart = require('./get_pl_performance_bar_chart');
        // get_pl_performance_bar_chart(this);

        // // 홈 화면 카드 1.1.1 ~ 1.1.4 3개월
        // const get_home_chart_quarter = require('./get_home_chart_quarter');
        // get_home_chart_quarter(this);

        // // 홈 화면 카드 2.1.1 ~ 2.1.3 YoY
        // const get_home_chart_year = require('./get_home_chart_year');
        // get_home_chart_year(this);

        // // 홈 화면 카드 2.1.4 매출 대비 비용 변동성 추이
        // const get_home_chart_volatility_cost = require('./get_home_chart_volatility_cost');
        // get_home_chart_volatility_cost(this);

        // // 홈 화면 카드 3.1
        // const get_home_chart_sgna_pie = require('./get_home_chart_sgna_pie');
        // get_home_chart_sgna_pie(this);

        // // PL 실적 타일 분기 차트
        // const get_pl_performance_tile_quarter = require('./get_pl_performance_tile_quarter');
        // get_pl_performance_tile_quarter(this);

        // const get_pl_performance_month_rate = require('./get_pl_performance_month_rate');
        // get_pl_performance_month_rate(this);

        // const get_pl_treemap_month_rate = require('./get_pl_treemap_month_rate');
        // get_pl_treemap_month_rate(this);

        // const get_sale_detail_month = require('./get_sale_detail_month');
        // get_sale_detail_month(this);

        // const get_pl_performance_month_progress = require('./get_pl_performance_month_progress');
        // get_pl_performance_month_progress(this);

        // const get_pl_performance_full = require('./get_pl_performance_full');
        // get_pl_performance_full(this);

        // const get_pl_performance_detail_excel = require('./get_pl_performance_detail_excel');
        // get_pl_performance_detail_excel(this);

        // const get_sale_detail_org = require('./get_sale_detail_org');
        // get_sale_detail_org(this);

        // // 매출/마진 상세 -> Account별 매출 현황 차트
        // const get_pl_account_sale_chart = require('./get_pl_account_sale_chart');
        // get_pl_account_sale_chart(this);

        // // 매출/마진 상세 -> Account별 매출 현황 상세 테이블
        // const get_pl_account_sale_detail = require('./get_pl_account_sale_detail');
        // get_pl_account_sale_detail(this);

        // const get_pl_performance_excel = require('./get_pl_performance_excel');
        // get_pl_performance_excel(this);

        // const get_pl_month_sale = require('./get_pl_month_sale');
        // get_pl_month_sale(this);

        // const get_pl_org_rate_table = require('./get_pl_org_rate_table');
        // get_pl_org_rate_table(this);

        /**
         * [실적PL] PL 테이블 데이터 호출 api
         */
        const get_actual_pl = require('./api/get_actual_pl');
        get_actual_pl(this);

        /**
         * [월별 실적PL] PL 테이블 데이터 호출 api
         */
        const get_actual_m_pl = require('./api/get_actual_m_pl');
        get_actual_m_pl(this);

        // function 핸들러 소스코드 분리
        // const get_pl_treemap = require('./get_pl_treemap');
        // get_pl_treemap(this);        

        return super.init();
    }
}
