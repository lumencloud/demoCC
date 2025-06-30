const cds = require('@sap/cds');
const { keysOf } = require('@sap/cds/libx/odata/utils');

module.exports = class SgaService extends cds.ApplicationService {
    init() {

        const get_actual_sga = require('./api/get_actual_sga');
        get_actual_sga(this);




        /**
         * [실적PL] SGA 테이블 전체보기 Raw Data 반환 API
         */
        const get_actual_sga_excel = require('./api/get_actual_sga_excel');
        get_actual_sga_excel(this);

        const get_actual_sga_detail = require('./api/get_actual_sga_detail');
        get_actual_sga_detail(this);

        /**
         * [실적PL] PL 디테일 테이블 엑셀 sga 데이터 호출 API
         */
        const get_actual_sga_org_detail_excel = require('./api/get_actual_sga_org_detail_excel');
        get_actual_sga_org_detail_excel(this);

        /**
         * [추정PL] PL sga 디테일 데이터 호출 API
         */
        const get_forecast_sga_detail = require('./api/get_forecast_sga_detail');
        get_forecast_sga_detail(this);

        /**
         * [실적 PL] PL sga 차트 인건비 데이터 호출 API
         */
        const get_actual_sga_chart = require('./api/get_actual_sga_chart');
        get_actual_sga_chart(this);


        // const get_sga_detail_month = require('./get_sga_detail_month');
        // get_sga_detail_month(this);

        // const get_sga_detail_org = require('./get_sga_detail_org');
        // get_sga_detail_org(this);

        return super.init();
    }
}