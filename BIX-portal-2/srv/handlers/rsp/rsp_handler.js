const cds = require('@sap/cds');

module.exports = class RspService extends cds.ApplicationService {
    init() {

        /**
         * [실적PL] RSP 테이블 전체보기 Raw Data 반환 API
         */
        const get_actual_rsp_excel = require('./api/get_actual_rsp_excel');
        get_actual_rsp_excel(this);   
        
        /**
         * [실적PL] PL 디테일 테이블 엑셀 rsp 데이터 호출 API
         */
        const get_actual_rsp_org_detail_excel = require('./api/get_actual_rsp_org_detail_excel');
        get_actual_rsp_org_detail_excel(this);  
        
        return super.init();
    }
}