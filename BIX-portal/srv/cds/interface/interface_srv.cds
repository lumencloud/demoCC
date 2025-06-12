using from '../../../db/cds/common/version';
using from '../../../db/cds/common/interface_log';
using from '../../../db/cds/common/interface_master';
using from '../../../db/cds/sc/if_expense';
using from '../../../db/cds/sc/if_labor';
using from '../../../db/cds/sc/if_pl';
using from '../../../db/cds/pl/if_wg';

@impl    : 'srv/handlers/interface/interface_handler.js' // handler 파일 경로 (default는 cds파일과 같은 경로)
@path    : '/odata/v4/interface/' // API 호출 경로
@requires: 'any' // 호출 권한 [Temp!!]
service InterfaceService {

    function call_interface_api(ver : String(20))           returns array of ReturnTable;
    function execute_interface(ver : String(20))            returns array of ReturnTable;
    action   execute_if_tester(batch_list : array of batch) returns array of ReturnTable;
    function call_sfdc_interface_api(ver : String(20))      returns array of ReturnTable;
    /**
     * ERP - BIX 전송체크 API (ER6001)
     */
    action BIX_transfer_check(I_CODE : String(100))       returns ERP_Return;

    type ERP_Return  : {
        O_RTCD    : String(1);
        O_MESSAGE : String(300);
    };

    type ReturnTable : {
        RESULT_CODE           : String(30);
        RESULT_VER            : String(20);
        RESULT_MESSAGE_CODE   : String(50);
        RESULT_MESSAGE_PARAMS : String(300);
        ERROR_TYPE            : String(30);
        SQL_ERROR_CODE        : String(30);
        SQL_ERROR_MESSAGE     : String(300)
    };

    type batch       : {
        if_step    : String(20);
        source     : String(30);
        table_name : String(30);
    };

}
