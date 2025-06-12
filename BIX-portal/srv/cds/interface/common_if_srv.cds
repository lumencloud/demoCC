using from '../../../db/cds/common/version';
using from '../../../db/cds/common/version_sfdc';
using from '../../../db/cds/common/if_org';
using from '../../../db/cds/common/if_org_map';
using from '../../../db/cds/common/if_project';

@impl    : 'srv/handlers/interface/common/common_if_handler.js' // handler 파일 경로 (default는 cds파일과 같은 경로)
@path    : '/odata/v4/common-if/' // API 호출 경로
@requires: 'any' // 호출 권한 [Temp!!]
service CommonInterfaceService {
    // action 은 HTTP - POST 방식 호출 / function 은 GET 방식 호출
    // ERP
    function call_if_gl_account_erp(ver : String(20))                              returns array of ReturnTable;
    function call_if_customer_erp(ver : String(20))                returns array of ReturnTable;
    function call_if_commitment_item_erp(ver : String(20))         returns array of ReturnTable;
    function call_if_project_os_erp()                              returns array of ReturnTable;
    // HR
    function call_if_org_hr()                                      returns array of ReturnTable;
    function call_if_org_map_hr()                                  returns array of ReturnTable;
    // PROMIS
    function call_if_project_promis()                              returns array of ReturnTable;
    // 인터페이스 직접호출방식 <- 사용여부 확인!
    action   call_if_project(CUDMX : String(1), JSONDATA : String) returns array of ReturnTable;

    type ReturnTable : {
        RESULT_CODE           : String(30);
        RESULT_VER            : String(20);
        RESULT_MESSAGE_CODE   : String(50);
        RESULT_MESSAGE_PARAMS : String(300);
        ERROR_TYPE            : String(30);
        SQL_ERROR_CODE        : String(30);
        SQL_ERROR_MESSAGE     : String(300)
    };
}
