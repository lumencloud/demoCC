using from '../../../db/cds/common/version';
using from '../../../db/cds/common/version_sfdc';
using from '../../../db/cds/oi/if_ito';

@impl    : 'srv/handlers/interface/oi/oi_if_handler.js' // handler 파일 경로 (default는 cds파일과 같은 경로)
@path    : '/odata/v4/oi-if/' // API 호출 경로
@requires: 'any' // 호출 권한 [Temp!!]
service OiInterfaceService {

    // PROMIS
    function call_if_ito_promis() returns array of ReturnTable;

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
