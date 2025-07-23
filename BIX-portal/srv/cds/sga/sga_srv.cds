// using sga.view from '../../../db/cds/sga/_sga_view';
using from '../../../db/cds/sga/expense';
using from '../../../db/cds/sga/investment';
using from '../../../db/cds/sga/view/expense_view';
using from '../../../db/cds/sga/view/investment_view';
using sga.wideview_view as sga_wideview_view from '../../../db/cds/sga/view/wideview_view';
using sga.expense_view as sga_expense_view from '../../../db/cds/sga/view/expense_view';
using sga.investment_view as sga_investment_view from '../../../db/cds/sga/view/investment_view';
using sga.excel_export_view as sga_excel_export_view from '../../../db/cds/sga/view/execl_export_view';
using sga.expense_co as sga_expense_co from '../../../db/cds/sga/expense_co';
using sga.if_expense_co as sag_if_expense_co from '../../../db/cds/sga/if_expense_co';

@impl    : 'srv/handlers/sga/sga_handler.js' // api 구현 코드위치
@path    : '/odata/v4/sga-api'
@requires: 'authenticated-user'
service SgaService {

    @restrict: [
        {
            grant: [
                'CREATE',
                'UPDATE',
                'DELETE'
            ],
            to   : 'bix-portal-system-admin'
        },
        {
            grant: [
                'CREATE',
                'UPDATE',
                'DELETE'
            ],
            to   : 'bix-portal-manage'
        },
        {grant: 'READ'}
    ]
    entity expense_co as projection on sga_expense_co;

    // sga 실적화면 테이블 데이터 호출 API
    function get_actual_sga(year : String(4), month : String(2), org_id : String(10))                                 returns array of oRes_;
    type oRes_ {}
    // sga 디테일 월 차트
    function get_sga_detail_month(year : String(4), month : String(2), org_id : String(10))                           returns array of oDetailMonth;

    type oDetailMonth {
        labor_amount        : Decimal(20, 2);
        labor_amount_sum    : Decimal(20, 2);
        iv_amount           : Decimal(20, 2);
        iv_amount_sum       : Decimal(20, 2);
        exp_amount          : Decimal(20, 2);
        exp_amount_sum      : Decimal(20, 2);
        month_sum           : Decimal(20, 2);
        year                : String(10);
        month               : String(10);
        last_year_month_sum : Decimal(20, 2);
        yoy                 : Decimal(20, 2);
    }

    // sga 디테일 조직 차트
    function get_sga_detail_org(year : String(4), month : String(2), org_id : String(10))                             returns array of oDetailOrg;

    type oDetailOrg {
        level1  : String(30);
        level2  : String(30);
        labor   : Decimal(20, 2);
        invest  : Decimal(20, 2);
        expense : Decimal(20, 2);
        sum     : Decimal(20, 2);
        cumSum  : Decimal(20, 2);
        rate    : Decimal(10, 2);
    }

    /**
     * SGA 엑셀 다운로드
     */
    function get_actual_sga_excel(year : String(4), month : String(2), org_id : String(10))                           returns array of oSgaExcel;

    type oSgaExcel {

    }

    // sga 디테일 테이블 데이터 호출 API
    function get_actual_sga_detail(year : String(4), month : String(2), org_id : String(10), type : String(10))       returns array of oActualSgaDetail;

    type oActualSgaDetail {
        name              : String(50);
        cost_curr_ym      : Decimal(20, 2);
        cost_last_ym      : Decimal(20, 2);
        cost_total_curr_y : Decimal(20, 2);
    }

    // sga 디테일 테이블 데이터 호출 API
    function get_actual_sga_detail_excel(year : String(4), month : String(2), org_id : String(10), type : String(10)) returns array of oActualSgaDetailExcel;
    type oActualSgaDetailExcel {}
    /**
     * [실적PL] PL 디테일 테이블 sga 데이터 호출 API
     */
    function get_actual_sga_org_detail_excel(year : String(4), month : String(2), org_id : String(10))                returns array of oSgaOrgDetailExcelResult;
    type oSgaOrgDetailExcelResult {}
    /**
     * [추정PL] PL sga 디테일 데이터 호출 API
     */
    function get_forecast_sga_detail(year : String(4), month : String(2), org_id : String(10))                        returns array of oForecastSgaDetailResult;
    type oForecastSgaDetailResult {}
    /**
    * [실적PL] PL sga 인건비 차트 데이터 호출 API
    */
    function get_actual_sga_chart(year : String(4), month : String(2), org_id : String(10))                           returns array of oForecastSgaDetailChartResult;
    type oForecastSgaDetailChartResult {}

    @readonly
    entity if_expense_co                              as projection on sag_if_expense_co;
}
