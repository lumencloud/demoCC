// using sga.view from '../../../db/cds/sga/_sga_view';
using from '../../../db/cds/rsp/org_mm';
using from '../../../db/cds/rsp/view/org_mm_view';
using common.annual_target_temp_view from '../../../db/cds/common/view/target_view';


@impl    : 'srv/handlers/rsp/rsp_handler.js' // api 구현 코드위치
@path    : '/odata/v4/rsp-api'
@requires: 'authenticated-user'
service RspService {
    /**
     * RSP 엑셀 다운로드
     */
    function get_actual_rsp_excel(year : String(4), month : String(2), org_id : String(10))            returns array of oSgaExcel;

    type oSgaExcel {

    }

    /**
     * [실적PL] PL 디테일 테이블 rsp 데이터 호출 API
     */
    function get_actual_rsp_org_detail_excel(year : String(4), month : String(2), org_id : String(10)) returns array of oRspOrgDetailExcelResult;
    type oRspOrgDetailExcelResult {}

}
