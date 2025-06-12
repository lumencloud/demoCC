using from '../../../db/cds/common/version';
using from '../../../db/cds/common/version_sfdc';

@impl    : 'srv/handlers/interface/pl/pl_if_handler.js' // handler 파일 경로 (default는 cds파일과 같은 경로)
@path    : '/odata/v4/pl-if/' // API 호출 경로
@requires: 'any' // 호출 권한 [Temp!!]
service PlInterfaceService {

    function call_sfdc_api() returns array of ReturnTable;
    function call_if_sfdc()  returns array of ReturnTable;

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
