const cds = require('@sap/cds');

module.exports = class PLService extends cds.ApplicationService {

    init() {
        // function 핸들러 소스코드 분리
        // const get_pl_treemap = require('./get_pl_treemap');
        // get_pl_treemap(this);

        // const get_pl_performance = require('./get_pl_performance');
        // get_pl_performance(this);

        // const get_oi_performance = require('./get_oi_performance');
        // get_oi_performance(this);

        const get_pl_target = require('./get_pl_target');
        get_pl_target(this);

        const get_sga_result_detail_excel = require('./get_sga_result_detail_excel');
        get_sga_result_detail_excel(this);

        // const get_pl_performance_bar_chart = require('./get_pl_performance_bar_chart');
        // get_pl_performance_bar_chart(this);

        // 홈 화면 카드 1.1.1 ~ 1.1.4 3개월
        // const get_home_chart_quarter = require('./get_home_chart_quarter');
        // get_home_chart_quarter(this);

        // 홈 화면 카드 2.1.1 ~ 2.1.3 YoY
        // const get_home_chart_year = require('./get_home_chart_year');
        // get_home_chart_year(this);

        // 홈 화면 카드 2.1.4 매출 대비 비용 변동성 추이
        // const get_home_chart_volatility_cost = require('./get_home_chart_volatility_cost');
        // get_home_chart_volatility_cost(this);

        // 홈 화면 카드 3.1
        // const get_home_chart_sgna_pie = require('./get_home_chart_sgna_pie');
        // get_home_chart_sgna_pie(this);

        // PL 실적 타일 분기 차트
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

        // 매출/마진 상세 -> Account별 매출 현황 차트
        // const get_pl_account_sale_chart = require('./get_pl_account_sale_chart');
        // get_pl_account_sale_chart(this);

        // 매출/마진 상세 -> Account별 매출 현황 상세 테이블
        // const get_pl_account_sale_detail = require('./get_pl_account_sale_detail');
        // get_pl_account_sale_detail(this);

        // const get_pl_performance_excel = require('./get_pl_performance_excel');
        // get_pl_performance_excel(this);

        // const get_pl_month_sale = require('./get_pl_month_sale');
        // get_pl_month_sale(this);

        // const get_pl_org_rate_table = require('./get_pl_org_rate_table');
        // get_pl_org_rate_table(this);
        
        return super.init();
    }
}
