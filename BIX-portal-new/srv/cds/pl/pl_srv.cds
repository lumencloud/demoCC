// handler 파일 내에서 호출하는 db 아티펙트는 using 으로 등록되어야 사용가능

using from '../../../db/cds/common/org';


using from '../../../db/cds/sga/company_sga_org';
using from '../../../db/cds/rsp/view/wideview_unpivot_view';
using from '../../../db/cds/rsp/view/wideview_view';
using from '../../../db/cds/rsp/view/opp_labor_view';
using from '../../../db/cds/rsp/view/org_total_labor_view';
using from '../../../db/cds/rsp/view/org_mm_view';

using from '../../../db/cds/pl/view/wideview_unpivot_view';
using from '../../../db/cds/pl/view/wideview_dt_view';
using from '../../../db/cds/sga/view/wideview_unpivot_view';

using from '../../../db/cds/common/view/target_view';
using from '../../../db/cds/pl/sfdc_contract';
using pl.wideview_view as pl_wideview from '../../../db/cds/pl/view/wideview_view';
using pl.wideview_org_view as wideview_org_view from '../../../db/cds/pl/view/wideview_org_view';
using from '../../../db/cds/pl/view/wideview_non_mm_view';

@impl    : 'srv/handlers/pl/handler.js' // api 구현 코드위치
@path    : '/odata/v4/pl_api'
@requires: 'any'
service PL_Service {

    // $apply Test
    // entity wideview_unpivot_view                     as projection on pl_wideview_unpivot_view.wideview_unpivot_view;
    entity wideview_view                     as projection on pl_wideview;
    entity pl_wideview_org_view                 as projection on wideview_org_view;

    /**
     * 연 목표관리 조직별 매출/마진 목표 테이블
     * CRUD
     */
    // entity target as projection on pl.target;
    /**
     * [실적PL] PL 테이블 데이터 호출 API
     */
    function get_actual_pl(year : String(4), month : String(2), org_id : String(10))                                       returns array of oRes;
    /**
     * [실적PL] OI 테이블 데이터 호출 API
     */
    function get_actual_oi(year : String(4), month : String(2), org_id : String(10))                                       returns array of oRes;
    /**
     * [실적PL] PL 디테일 테이블 pl 데이터 호출 API
     */
    function get_actual_pl_org_detail(year : String(4), month : String(2), org_id : String(10))                            returns array of oPlOrgDetailResult;
    type oPlOrgDetailResult {}
    /**
     * [실적PL] PL 디테일 테이블 목표 데이터 호출 API
     */
    function get_actual_pl_org_detail_excel(year : String(4), month : String(2), org_id : String(10))                      returns array of oPlOrgDetailExcelResult;
    type oPlOrgDetailExcelResult {}
    /**
     * [실적PL] PL 디테일 테이블 데이터 호출 API
     */
    function get_actual_pl_org_detail_target_excel(year : String(4), month : String(2), org_id : String(10))               returns array of oPlOrgDetailTargetExcelResult;
    type oPlOrgDetailTargetExcelResult {}
    function get_actual_dt_org_oi(year : String(4), month : String(2), org_id : String(10))                                returns array of oRes;
    function get_actual_dt_task_oi(year : String(4), month : String(2), org_id : String(10))                               returns array of oRes;
    function get_actual_non_mm_account_oi(year : String(4), month : String(2), org_id : String(10))                        returns array of oRes;
    function get_actual_non_mm_lob_oi(year : String(4), month : String(2), org_id : String(10))                            returns array of oRes;
    function get_actual_sale_org_pl(year : String(4), month : String(2), org_id : String(10))                              returns array of oRes;
    function get_actual_sale_sub_company_pl(year : String(4), month : String(2), org_id : String(10))                      returns array of oRes;
    function get_actual_sale_account_pl(year : String(4), month : String(2), org_id : String(10))                          returns array of oRes;
    function get_actual_sale_relsco_pl(year : String(4), month : String(2), org_id : String(10))                           returns array of oRes;
    function get_actual_sale_crov_pl(year : String(4), month : String(2), org_id : String(10))                             returns array of oRes;
    function get_actual_dt_account_oi(year : String(4), month : String(2), org_id : String(10))                            returns array of oRes;
    function get_actual_rohc_org_oi(year : String(4), month : String(2), org_id : String(10))                              returns array of oRes;
    function get_actual_rohc_account_oi(year : String(4), month : String(2), org_id : String(10))                          returns array of oRes;
    function get_actual_sale_chart_pl(year : String(4), month : String(2), org_id : String(10))                            returns array of oRes;
    function get_cstco_by_biz_account(year : String(4), month : String(2), org_id : String(10), account_cd: String(30))                            returns array of oRes;
    function get_cstco_by_biz_account_dt(year : String(4), month : String(2), org_id : String(10), account_cd: String(30))                            returns array of oRes;

    type oRes {
        display_order        : Integer; // seq
        type                 : String;
        target_curr_y_value  : Double;
        actual_curr_ym_value : Double; // performanceCurrentYearMonth
        actual_last_ym_value : Double; // performanceLastYearMonth
        actual_curr_ym_rate  : Double; // performanceAttainmentRateCurrentYear
        actual_last_ym_rate  : Double; // performanceAttainmentRateLastYear
    }


    /**
     * [추정PL] PL 테이블 데이터 호출 API
     */
    function get_forecast_pl(year : String(4), month: String(2), org_id : String(10))                                                        returns array of oForecastRes;
    /**
     * [추정PL] OI 테이블 데이터 호출 API
     */
    function get_forecast_oi(year : String(4), month: String(2), org_id : String(10))                                                        returns array of oForecastRes;
    function get_forecast_dt_org_oi(year : String(4), org_id : String(10))                                                 returns array of oForecastRes;
    function get_forecast_dt_account_oi(year : String(4), org_id : String(10))                                             returns array of oForecastRes;
    function get_forecast_non_mm_account_oi(year : String(4), org_id : String(10))                                         returns array of oForecastRes;
    function get_forecast_non_mm_lob_oi(year : String(4), org_id : String(10))                                             returns array of oForecastRes;
    function get_forecast_dt_task_oi(year : String(4), org_id : String(10))                                                returns array of oForecastRes;

    type oForecastRes {
        display_order     : Integer; // seq
        type              : String;
        forecast_value    : Double;
        secured_value     : Double;
        not_secured_value : Double;
        plan_ratio        : Double;
        yoy               : Double;
    };

    function get_forecast_br(year : String(4), month : String(2), org_id : String(10))                                     returns array of oForecastBr;

    type oForecastBr {
        ccorg_cd          : String;
        div_id            : String;
        div_name          : String;
        hdqt_id           : String;
        hdqt_name         : String;
        team_id           : String;
        team_name         : String;
        forecast_value    : Double;
        secured_value     : Double;
        not_secured_value : Double;
        target            : Double;
    }

    function get_forecast_br_detail(year : String(4), month : String(2), org_id : String(10))                              returns array of oForecastMonthlyBr;

    type oForecastMonthlyBr {
        div_id    : String;
        div_name  : String;
        hdqt_id   : String;
        hdqt_name : String;
        team_id   : String;
        team_name : String;
        m_01_data : Double;
        m_02_data : Double;
        m_03_data : Double;
        m_04_data : Double;
        m_05_data : Double;
        m_06_data : Double;
        m_07_data : Double;
        m_08_data : Double;
        m_09_data : Double;
        m_10_data : Double;
        m_11_data : Double;
        m_12_data : Double;
    }

    function get_forecast_opp_br(year : String(4), ccorg_cd : String(10))                                                  returns array of oForecastOppBr;

    type oForecastOppBr {
        biz_opp_no         : String;
        biz_opp_nm         : String;
        prj_tp_nm          : String;
        labor_cost         : Double;
        received_order_amt : Double;
        sales_amt          : Double;
    }

    function get_forecast_dt_task_year_oi(year : String(4), org_id : String(10))                                           returns array of oForecastDtTaskYearOi;

    type oForecastDtTaskYearOi {};

function get_forecast_dt_customer_oi(year : String(4), org_id : String(10))                                           returns array of oForecastDtCustomerOi;

    type oForecastDtCustomerOi {
        display_order : Integer; // seq
        id            : String;
        name          : String;
        y_1_data      : Double;
        y_2_data      : Double;
        y_3_data      : Double;
        y_4_data      : Double;
        total_sale    : Double;
        w_rate        : Double;
    };
    /**
     * [추정PL] OI 테이블 데이터 호출 API
     */
    function get_plan_dt_sale(year : String(4), org_id : String(10))                                                       returns array of oDtRes;

    type oDtRes {
        display_order    : Integer; // seq
        id               : String;
        type             : String;
        plan_sale        : Double;
        secured_sale     : Double;
        not_secured_sale : Double;
        plan_ratio       : Double;
    };

    function get_plan_dt_sale_excel(year : String(4), org_id : String(10))                                                 returns array of oDtExcelRes;
    type oDtExcelRes {};


    function get_actual_br_org_detail(year : String(4), month : String(2), org_id : String(10))                                                 returns array of oBrOrgDetail;
    type oBrOrgDetail {};


    /**
     * [월별 실적PL] PL 테이블 데이터 호출 api
     */
    function get_actual_m_pl(year : String(4), month : String(2), org_id : String(10))                                                        returns array of oMonthly;
    /**
     * [월별 실적OI] OI 테이블 데이터 호출 api
     */
    function get_actual_m_oi(year : String(4), org_id : String(10))                                                        returns array of oMonthly;
    /**
     * [월별 추정 Trend] 월별 추정 Trend 테이블 데이터 호출 api
     */
    function get_forecast_trend(year : String(4), org_id : String(10))                                                     returns array of oMonthly;

    type oMonthly {
        display_order : Integer;
        type          : String(20);
        total_data    : Double;
        m_01_data     : Double;
        m_02_data     : Double;
        m_03_data     : Double;
        m_04_data     : Double;
        m_05_data     : Double;
        m_06_data     : Double;
        m_07_data     : Double;
        m_08_data     : Double;
        m_09_data     : Double;
        m_10_data     : Double;
        m_11_data     : Double;
        m_12_data     : Double;
    }

    /**
     * [월별 추정 미확보PL] 월별 추정 미확보PL 테이블 데이터 호출 api
     */
    function get_forecast_m_pl(year : String(4), org_id : String(10))                                                      returns array of oMonthlyForecast;

    type oMonthlyForecast {
        display_order : Integer;
        div_name      : String(30);
        type          : String(20);
        total_data    : Double;
        m_01_data     : Double;
        m_02_data     : Double;
        m_03_data     : Double;
        m_04_data     : Double;
        m_05_data     : Double;
        m_06_data     : Double;
        m_07_data     : Double;
        m_08_data     : Double;
        m_09_data     : Double;
        m_10_data     : Double;
        m_11_data     : Double;
        m_12_data     : Double;
    }

    function get_forecast_m_pl_excel(year : String(4), org_id : String(10))                                                returns array of oMonthlyForecastExcel;
    type oMonthlyForecastExcel {}
    /**
     * [추정 미확보PL] 추정 미확보PL pipeline 테이블 데이터 호출 api
     */
    // function get_forecast_pl_pipeline(year : String(4), month : String(2), org_id : String(10), type : String(10))         returns array of oForecastPipeline;
    // type oForecastPipeline {}
    /**
     * [추정 미확보PL] 추정 미확보PL pipeline 디테일 테이블 데이터 호출 api
     */
    function get_forecast_pl_pipeline_detail(year : String(4), month : String(2), org_id : String(10), type : String(10))  returns array of oForecastPipelineDetail;
    type oForecastPipelineDetail {}
    function get_forecast_pl_pipeline_org_detail(year : String(4), month : String(2), org_id : String(10))  returns array of oForecastPipelineOrgDetail;
    type oForecastPipelineOrgDetail {}
    /**
     * [추정 미확보PL] 추정 미확보PL pipeline 디테일 테이블 데이터 호출 api
     */
    function get_forecast_pl_pipeline_account(year : String(4), month : String(2), org_id : String(10), type : String(10)) returns array of oForecastPipelineAccount;
    type oForecastPipelineAccount {}
    /**
     * [실적] 실적 pipeline 테이블 테이블 데이터 호출 api
     */
    function get_actual_pl_pipeline(year : String(4), month : String(2), org_id : String(10), type : String(10))           returns array of oActualPipeline;
    type oActualPipeline {}
    /**
     * [월별 추정 미확보PL] PL 전체 데이터 엑셀 다운로드 호출 api
     */
    function get_actual_pl_excel(year : String(4), month : String(2), org_id : String(10))                                 returns array of oPlExcel;

    type oPlExcel {
        // lv1_id;
    // lv1_name,
    // lv1_ccorg_cd,
    // lv2_id,
    // lv2_name,
    // lv2_ccorg_cd,
    // lv3_id,
    // lv3_name,
    // lv3_ccorg_cd,
    // div_id,
    // div_name,
    // div_ccorg_cd,
    // hdqt_id,
    // hdqt_name,
    // hdqt_ccorg_cd,
    // team_id,
    // team_name,
    // team_ccorg_cd
    }

    /**
     * [실적PL] DT과제별 연간 총 수주금액 테이블 데이터 호출 API
     */
    function get_rodr_dt_y()                                                                                               returns array of oRodrDtYearResult;
    type oRodrDtYearResult {}
    function get_rodr_dt_y_excel()                                                                                         returns array of oRodrDtYearExcelResult;
    type oRodrDtYearExcelResult {}
    /**
     * [실적PL] ACCOUNT별 연간 총 수주금액 테이블 데이터 호출 API
     */
    function get_rodr_account_y()                                                                                          returns array of oRodrAccountYearResult;
    type oRodrAccountYearResult {}
    function get_rodr_account_y_excel()                                                                                    returns array of oRodrAccountYearExcelResult;
    type oRodrAccountYearExcelResult {}
    /**
     * [추정PL] 추정 PL 테이블 매출 마진 클릭시 조직별 디테일 테이블 API
     */
    function get_forecast_pl_sale_margin_org_detail(year : String(4), org_id : String(10))                                 returns array of oForecastPlSaleMarginResult;

    type oForecastPlSaleMarginResult {
        display_order     : Integer;
        org_name          : String(50);
        org_id            : String(20);
        type              : String(10);
        forecast_value    : Double;
        secured_value     : Double;
        not_secured_value : Double;
        plan_ratio        : Double;
        yoy               : Double;
    }

    /**
     * [추정PL] 추정 PL 테이블 매출 마진 클릭시 대내/대외 디테일 테이블 API
     */
    function get_forecast_pl_sale_margin_relsco_detail(year : String(4), org_id : String(10))                              returns array of oForecastPlSaleMarginOvseResult;

    type oForecastPlSaleMarginOvseResult {
        display_order     : Integer;
        org_name          : String(50);
        org_id            : String(20);
        type1             : String(10);
        type2             : String(10);
        forecast_value    : Double;
        secured_value     : Double;
        not_secured_value : Double;
        plan_ratio        : Double;
        yoy               : Double;
    }

    /**
     * [추정PL] 추정 PL 테이블 매출 마진 클릭시 신규/이월 디테일 테이블 API
     */
    function get_forecast_pl_sale_margin_crov_detail(year : String(4), org_id : String(10))                                returns array of oForecastPlSaleMarginCrovResult;
    type oForecastPlSaleMarginCrovResult {}
    /**
     * [추정PL] 추정 PL 테이블 매출 마진 클릭시 Account 디테일 테이블 API
     */
    function get_forecast_pl_sale_margin_account_detail(year : String(4), org_id : String(10))                             returns array of oForecastPlSaleMarginAccountResult;
    type oForecastPlSaleMarginAccountResult {}
    /**
     * [실적PL] 실적 PL 테이블 매출 마진 클릭시 조직별 디테일 테이블 API
     */
    function get_actual_pl_sale_margin_org_detail(year : String(4), month : String(2), org_id : String(10))                returns array of oActualPlSaleMarginOrgResult;
    type oActualPlSaleMarginOrgResult {}
    function get_forecast_br_org_oi(year : String(4), month : String(2), org_id : String(10))                              returns array of oForecastBrOrgOi;
    type oForecastBrOrgOi {}
    function get_forecast_br_org_detail(year : String(4), org_id : String(10))                                              returns array of oForecastBrOrgDetail;
    type oForecastBrOrgDetail {}

// // pl 실적 테이블 BAR 차트 조회 전체보기 API
function get_pl_performance_full(year : String(4), month : String(2), org_id : String(10))                          returns array of oPerformanceFull;

type oPerformanceFull {
    seq                                  : Integer;
    org_kor_nm                           : String(300);
    type                                 : String;
    goal                                 : Double;
    performanceCurrentYearMonth          : Double;
    performanceLastYearMonth             : Double;
    performanceAttainmentRateCurrentYear : Double;
    performanceAttainmentRateLastYear    : Double;
}

// function get_pl_target_sale()                                                                                       returns array of oTargetSale;

// type oTargetSale {
//     id                        : String(20);
//     name                      : String(300);
//     type                      : String(20) @title: '조직_유형_RCID';
//     parent                    : String(20) @title: '상위_조직_ID';
//     hierarchy_level           : Integer;
//     drill_state               : String(8);
//     lastYearTargetSale        : Integer;
//     lastYearTargetMargin      : Integer;
//     lastYearPerformanceSale   : Double;
//     lastYearPerformanceMargin : Double;
//     thisYearTargetSale        : Integer;
//     thisYearTargetMargin      : Integer;
// }

// function get_sga_result_detail_excel(year : String(4), org_id : String(10))                                         returns array of oExcel;

// type oExcel {
//     div_id           : String(20);
//     div_nm           : String(300);
//     hdqt_id          : String(20);
//     hdqt_nm          : String(300);
//     team_id          : String(20);
//     team_nm          : String(300);
//     type             : String(30);
//     month1           : Decimal(20, 2);
//     month2           : Decimal(20, 2);
//     month3           : Decimal(20, 2);
//     month4           : Decimal(20, 2);
//     month5           : Decimal(20, 2);
//     month6           : Decimal(20, 2);
//     month7           : Decimal(20, 2);
//     month8           : Decimal(20, 2);
//     month9           : Decimal(20, 2);
//     month10          : Decimal(20, 2);
//     month11          : Decimal(20, 2);
//     month12          : Decimal(20, 2);
//     quarter1         : Decimal(20, 2);
//     quarter2         : Decimal(20, 2);
//     quarter3         : Decimal(20, 2);
//     quarter4         : Decimal(20, 2);
//     totalCurrentYear : Decimal(20, 2);
//     totalLastYear    : Decimal(20, 2);
// }


// /**
//  * 실적 PL treemap 차트 데이터 조회 API
//  */
// function get_pl_treemap(year : String(4), month : String(2), org_id : String(10), category : String(10))            returns array of oTree;

// type oTree {
//     category   : String;
//     actual     : Decimal(18, 2);
//     target     : Decimal(18, 2);
//     difference : Decimal(18, 2);
//     progress   : Decimal(2, 2);
// }

// // pl 실적 테이블 BAR 차트 조회 API
// function get_pl_performance_bar_chart(year : String(4), month : String(2), org_id : String(10))                     returns array of oBarChart;

// type oBarChart {
//     seq                         : Integer;
//     type                        : String;
//     goal                        : Decimal(18, 2);
//     performanceCurrentYearMonth : Decimal(18, 2);
// }

// function get_home_chart_year(year : String(4), range : Integer, org_id : String(10))                                returns array of oHomeYearChart;

// type oHomeYearChart {
//     year       : Integer;
//     bill       : Integer;
//     opp        : Integer;
//     sale_yoy   : Double;
//     margin     : Integer;
//     margin_yoy : Double;
//     cont       : Integer;
//     cont_yoy   : Double;
//     labor      : Integer;
//     invest     : Integer;
//     sale       : Integer;
//     br         : Double;
//     rohc       : Double;
// }

// function get_home_chart_volatility_cost(year : String(4), org_id : String(10))                                      returns array of oCostChart;

// type oCostChart {
//     year  : Integer;
//     month : Integer;
//     sale  : Integer;
//     cos   : Integer;
//     sgna  : Integer;
// }

// function get_home_chart_quarter(year : String(4), month : String(2), org_id : String(10))                           returns array of oQuarterChart;

// type oQuarterChart {
//     year  : Integer;
//     month : Integer;
//     sale  : Integer;
//     cos   : Integer;
//     sgna  : Integer;
//     rate  : Integer;
// }

// function get_home_chart_sgna_pie(year : String(4), month : String(2), org_id : String(10))                          returns array of oSgnaPieChart;

// type oSgnaPieChart {
//     type   : String(20);
//     amount : Integer;
//     rate   : Double;
// }

// // pl 실적 테이블 BAR 차트 조회 API
// function get_pl_performance_month_rate(year : String(4), month : String(2), org_id : String(10))                    returns array of oMonthRateChart;

// type oMonthRateChart {
//     year              : Integer;
//     month             : Integer;
//     sale              : Decimal(18, 2);
//     targetSale        : Decimal(18, 2);
//     saleRate          : Decimal(18, 2);
//     margin            : Decimal(18, 2);
//     marginTarget      : Decimal(18, 2);
//     marginRate1       : Decimal(18, 2);
//     marginRate2       : Decimal(18, 2);
//     marginRateTarget2 : Decimal(18, 2);
// }

// // pl 실적 테이블 BAR 차트 조회 API
// function get_pl_performance_month_progress(year : String(4), month : String(2), org_id : String(10))                returns array of oMonthProgressChart;

// type oMonthProgressChart {
//     year       : Integer;
//     month      : Integer;
//     sale       : Double;
//     contract   : Double;
//     margin     : Double;
//     marginRate : Double;
//     br         : Double;
//     target     : Double;
//     last       : Double;
//     current    : Double;
// }

// // pl 매출/마진 실적 엑셀 다운로드
// function get_pl_performance_detail_excel(year : String(4), month : String(2), org_id : String(10))                  returns array of oDetailExcel;

// type oDetailExcel {
//     org_kor_nm : String(300);
//     type       : String(30);
//     target     : Double;
//     progress   : Double;
//     month1     : Double;
//     month2     : Double;
//     month3     : Double;
//     month4     : Double;
//     month5     : Double;
//     month6     : Double;
//     month7     : Double;
//     month8     : Double;
//     month9     : Double;
//     month10    : Double;
//     month11    : Double;
//     month12    : Double;
// };

// function get_pl_performance_tile_quarter(year : String(4), month : String(2), org_id : String(10))                  returns array of oTileQuarterChart;

// type oTileQuarterChart {
//     year  : Integer;
//     month : Integer;
//     sale  : Double;
// }

// //트리맵차트 월별 라인 차트
// function get_pl_treemap_month_rate(year : String(4), month : String(2), org_id : String(10), category : String(10)) returns array of oTreeMonthRate;

// type oTreeMonthRate {
//     category   : String;
//     actual     : Decimal(18, 2);
//     target     : Decimal(18, 2);
//     difference : Decimal(18, 2);
//     progress   : Decimal(2, 2);
// }

// // pl sale detail chart - month
// function get_sale_detail_month(year : String(4), month : String(2), org_id : String(10))                            returns array of oSaleDetailMonth;

// type oSaleDetailMonth {
//     year         : Integer;
//     month        : Integer;
//     sale         : Decimal(18, 2);
//     saleLastYear : Decimal(18, 2);
//     rate         : Decimal(5, 2);
// }

// // pl sale detail chart - org
// function get_sale_detail_org(year : String(4), month : String(2), org_id : String(10))                              returns array of oSaleDetailOrg;

// type oSaleDetailOrg {
//     category : String;
//     actual   : Decimal(18, 2);
//     progress : Decimal(2, 2);
//     rate     : Decimal(5, 2);
// }

// function get_pl_account_sale_chart(year : String(4), month : String(2))                                             returns array of oAccountSaleChart;

// type oAccountSaleChart {
//     account  : String(30);
//     sale     : Double;
//     margin   : Double;
//     contract : Double;
// }

// function get_pl_account_sale_detail(year : String(4), month : String(2))                                            returns array of oAccountSaleDetail;

// type oAccountSaleDetail {
//     account       : String(30);
//     target        : Double;
//     confirmedSale : Double;
//     progress      : Double;
//     sale          : Double;
//     margin        : Double;
//     contract      : Double;
// }

// // pl 실적화면 excel download data
// function get_pl_performance_excel(year : String(4), month : String(2), org_id : String(10))                         returns array of oResExcel;

// type oResExcel {
//     seq                                  : Integer;
//     type                                 : String;
//     goal                                 : Decimal(18, 2);
//     performance                          : Decimal(18, 2);
//     performanceCurrentYearMonth          : Decimal(18, 2);
//     performanceLastYearMonth             : Decimal(18, 2);
//     performanceAttainmentRateCurrentYear : Decimal(5, 2);
//     performanceAttainmentRateLastYear    : Decimal(5, 2);
//     month01                              : Decimal(18, 2);
//     month02                              : Decimal(18, 2);
//     month03                              : Decimal(18, 2);
//     month04                              : Decimal(18, 2);
//     month05                              : Decimal(18, 2);
//     month06                              : Decimal(18, 2);
//     month07                              : Decimal(18, 2);
//     month08                              : Decimal(18, 2);
//     month09                              : Decimal(18, 2);
//     month10                              : Decimal(18, 2);
//     month11                              : Decimal(18, 2);
//     month12                              : Decimal(18, 2);
//     quarter1                             : Decimal(18, 2);
//     quarter2                             : Decimal(18, 2);
//     quarter3                             : Decimal(18, 2);
//     quarter4                             : Decimal(18, 2);
//     yearValue                            : Decimal(18, 2);
// }

// // pl 실적화면 excel download data
// function get_pl_month_sale(id : String(10))                                                                         returns array of oMonthSale;

// type oMonthSale {
//     name   : String;
//     sale   : Decimal(18, 2);
//     margin : Decimal(18, 2);
// }

// // pl 실적화면 테이블 데이터 호출 API. 반환값 지정 안해주면 반환 해주는 모든 값이 반환 됨.
// function get_pl_org_rate_table(year : String(4), month : String(2), org_id : String(10))                            returns array of oPlHdqtRateResult;
// type oPlHdqtRateResult {}
}
