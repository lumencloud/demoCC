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
        // const get_actual_pl_org_detail_excel = require('./api/get_actual_pl_org_detail_excel');
        // get_actual_pl_org_detail_excel(this);
        /**
         * [실적PL] PL 디테일 테이블 엑셀 목표 데이터 호출 API
         */
        // const get_actual_pl_org_detail_target_excel = require('./api/get_actual_pl_org_detail_target_excel');
        // get_actual_pl_org_detail_target_excel(this);

        
        /**
         * [월별 실적OI] OI 테이블 데이터 호출 api
         */
        // const get_actual_m_oi = require('./api/get_actual_m_oi');
        // get_actual_m_oi(this);
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
        // const get_forecast_pl_pipeline = require('./api/get_forecast_pl_pipeline');
        // get_forecast_pl_pipeline(this);
        /**
         * [추정 미확보PL] 추정 미확보PL pipeline 디테일 테이블 데이터 호출 api
         */
        const get_forecast_pl_pipeline_detail = require('./api/get_forecast_pl_pipeline_detail');
        get_forecast_pl_pipeline_detail(this);
        
        const get_forecast_pl_pipeline_org_detail = require('./api/get_forecast_pl_pipeline_org_detail');
        get_forecast_pl_pipeline_org_detail(this);
        /**
         * [추정 미확보PL] 추정 미확보PL pipeline account 테이블 데이터 호출 api
         */
        const get_forecast_pl_pipeline_account = require('./api/get_forecast_pl_pipeline_account');
        get_forecast_pl_pipeline_account(this);
                
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

        /**
         * [AI] 사업기회, 선택한 조직을 기준으로 고객사 매출 Top5를 반환
         */
        const get_cstco_by_biz_account = require('./api/get_cstco_by_biz_account');
        get_cstco_by_biz_account(this);

        /**
         * [AI] DT 매출 중 사업기회, 선택한 조직을 기준으로 고객사 매출 Top5를 반환
         */
        const get_cstco_by_biz_account_dt = require('./api/get_cstco_by_biz_account_dt');
        get_cstco_by_biz_account_dt(this);

        /**
         * [AI] 사업기회, 선택한 조직을 기준으로 고객사 연간 추정 매출 Top5를 반환
         */
        const get_plan_cstco_by_biz_account = require('./api/get_plan_cstco_by_biz_account');
        get_plan_cstco_by_biz_account(this);

        /**
         * [AI] Account 상세 기준으로 수주, 매출, 건수 Top5를 반환
         */
        const get_plan_account_by_cstco = require('./api/get_plan_account_by_cstco');
        get_plan_account_by_cstco(this);

        /**
         * [AI] 사업기회, 선택한 조직을 기준으로 고객사 연간 추정 DT 매출 Top5를 반환
         */
        const get_plan_cstco_by_biz_account_dt = require('./api/get_plan_cstco_by_biz_account_dt');
        get_plan_cstco_by_biz_account_dt(this);
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

        const get_forecast_dt_customer_oi = require('./api/get_forecast_dt_customer_oi');
        get_forecast_dt_customer_oi(this);

        const get_forecast_dt_task_oi = require('./api/get_forecast_dt_task_oi');
        get_forecast_dt_task_oi(this);

        const get_forecast_dt_task_year_oi = require('./api/get_forecast_dt_task_year_oi');
        get_forecast_dt_task_year_oi(this);

        const get_forecast_pl = require('./api/get_forecast_pl');
        get_forecast_pl(this);

        const get_pl_excel = require('./api/get_pl_excel');
        get_pl_excel(this);

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

        const get_actual_sale_org_pl_total = require('./api/get_actual_sale_org_pl_total');
        get_actual_sale_org_pl_total(this);

        const get_actual_sale_chart_pl = require('./api/get_actual_sale_chart_pl');
        get_actual_sale_chart_pl(this);

        const get_actual_sale_sub_company_pl = require('./api/get_actual_sale_sub_company_pl');
        get_actual_sale_sub_company_pl(this);

        const get_actual_sale_account_pl = require('./api/get_actual_sale_account_pl');
        get_actual_sale_account_pl(this);

        const get_actual_sale_relsco_pl = require('./api/get_actual_sale_relsco_pl');
        get_actual_sale_relsco_pl(this);

        const get_actual_sale_relsco_pl_total = require('./api/get_actual_sale_relsco_pl_total');
        get_actual_sale_relsco_pl_total(this);
        
        const get_actual_sale_crov_pl = require('./api/get_actual_sale_crov_pl');
        get_actual_sale_crov_pl(this);

        const get_actual_sale_crov_pl_total = require('./api/get_actual_sale_crov_pl_total');
        get_actual_sale_crov_pl_total(this);

        const get_actual_dt_account_oi = require('./api/get_actual_dt_account_oi');
        get_actual_dt_account_oi(this);

        const get_actual_rohc_org_oi = require('./api/get_actual_rohc_org_oi');
        get_actual_rohc_org_oi(this);

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

        const get_pl_performance_full = require('./api/get_pl_performance_full');
        get_pl_performance_full(this);
        
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
         * [실적PL] 전사 조회용 PL 테이블 데이터 호출 api
         */
        const get_actual_pl_total = require('./api/get_actual_pl_total');
        get_actual_pl_total(this);

        /**
         * [월별 실적PL] PL 테이블 데이터 호출 api
         */
        const get_actual_m_pl = require('./api/get_actual_m_pl');
        get_actual_m_pl(this);
        const get_ai_forecast_m_pl = require('./api/get_ai_forecast_m_pl');
        get_ai_forecast_m_pl(this);
        const get_ai_forecast_pl = require('./api/get_ai_forecast_pl');
        get_ai_forecast_pl(this);
        const get_ai_total_rodr = require('./api/get_ai_total_rodr');
        get_ai_total_rodr(this);
        const get_ai_forecast_deal_type_pl = require('./api/get_ai_forecast_deal_type_pl');
        get_ai_forecast_deal_type_pl(this);
        const get_ai_forecast_deal_pipeline = require('./api/get_ai_forecast_deal_pipeline');
        get_ai_forecast_deal_pipeline(this);
        const get_ai_forecast_rodr_pipeline = require('./api/get_ai_forecast_rodr_pipeline');
        get_ai_forecast_rodr_pipeline(this);

        /**
         * [월별 실적PL] 전사 조회용 PL 테이블 데이터 호출 api
         */
        const get_actual_m_pl_total = require('./api/get_actual_m_pl_total');
        get_actual_m_pl_total(this);
        const get_actual_m_pl_total_org = require('./api/get_actual_m_pl_total_org');
        get_actual_m_pl_total_org(this);

        // function 핸들러 소스코드 분리
        // const get_pl_treemap = require('./get_pl_treemap');
        // get_pl_treemap(this);   
        
        // ai 6p 당월 누계 실적
        const get_actual_m_pl_oi = require('./api/get_actual_m_pl_oi');
        get_actual_m_pl_oi(this);

         // ai account 6p 당월 누계 실적
         const get_actual_m_account_pl_oi = require('./api/get_actual_m_account_pl_oi');
         get_actual_m_account_pl_oi(this);

        // ai 7p 당월 누계 목표 대비 실적
        const get_actual_m_target_pl_oi = require('./api/get_actual_m_target_pl_oi');
        get_actual_m_target_pl_oi(this);

        // ai 8p 당월 BR 현황
        const get_actual_m_br_org_detail = require('./api/get_actual_m_br_org_detail');
        get_actual_m_br_org_detail(this);

        // ai 9p 당월 rohc 현황
        const get_actual_m_rohc_org_oi = require('./api/get_actual_m_rohc_org_oi');
        get_actual_m_rohc_org_oi(this);
        
        // ai 10p 당월 매출,마진,마진율 현황
        const get_actual_m_sale_org_pl = require('./api/get_actual_m_sale_org_pl');
        get_actual_m_sale_org_pl(this);

        // ai 11p 당월 sga 현황
        const get_actual_m_sga = require('./api/get_actual_m_sga');
        get_actual_m_sga(this);

        // 추가- ai 6p 전년동기 대비 진척도 gap
        const get_actual_m_rate_gap_pl_oi = require('./api/get_actual_m_rate_gap_pl_oi');
        get_actual_m_rate_gap_pl_oi(this);

        // 추가- ai account 6p 전년동기 대비 진척도 gap
        const get_actual_m_account_rate_gap_pl_oi = require('./api/get_actual_m_account_rate_gap_pl_oi');
        get_actual_m_account_rate_gap_pl_oi(this);

        // ai 8p account별 매출,마진,마진율 현황
        const get_actual_m_account_sale_pl = require('./api/get_actual_m_account_sale_pl');
        get_actual_m_account_sale_pl(this);
        
        // ai 당월 수주,매출 현황
        const get_actual_m_sale_rodr_org_pl = require('./api/get_actual_m_sale_rodr_org_pl');
        get_actual_m_sale_rodr_org_pl(this);

        // ai account 전년 대비 분기별 매출 현황
        const get_actual_q_account_sale_pl = require('./api/get_actual_q_account_sale_pl');
        get_actual_q_account_sale_pl(this);
        
        return super.init();
    }
}
