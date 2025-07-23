using from '../../../db/cds/common/version';
using from '../../../db/cds/common/interface_log';
using from '../../../db/cds/common/interface_master';
using from '../../../db/cds/common/if_project';
using from '../../../db/cds/sc/if_expense';
using from '../../../db/cds/sc/if_labor';
using from '../../../db/cds/sc/if_pl';
using from '../../../db/cds/pl/if_wg';
using from '../../../db/cds/pl/if_wideview';

@impl: 'srv/handlers/interface/interface_handler.js' // handler 파일 경로 (default는 cds파일과 같은 경로)
@path: '/odata/v4/interface/' // API 호출 경로
// @requires: 'any' // 호출 권한 [Temp!!]
service InterfaceService {

    function execute_batch(ver : String(20), cust_param : String(20))                          returns array of ReturnTable;
    function execute_pipeline_batch(auto : Boolean, ver : String(20), cust_param : String(20)) returns array of ReturnTable;
    action   execute_batch_renew(batch_list : array of batch)                                  returns array of ReturnTable;
    function execute_wbs_prj_batch(ver : String(20), ver_last : String(20), trsf : Boolean)    returns array of ReturnTable;
    function execute_wbs_prj_platform_batch(ver : String(20), ver_last : String(20))           returns array of ReturnTable;

    /**
     * ERP - BIX 전송체크 API (ER6001)
     */
    @requires: 'authenticated-user'
    action   BIX_transfer_check(I_CODE : String(100))                                          returns ERP_Return;

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

    type prj_no      : String(23);

    type batch       : {
        ver        : String(20);
        param      : String(20);
        if_step    : String(20);
        source     : String(30);
        table_name : String(30);
    };

    /**
     * 배치 잡 목록 조회
     */
    function get_job_list()                                                                    returns batch;
    /**
     * 배치 잡 스케줄링 조회
     */
    function get_job_schedule(jobId : String(20))                                              returns array of schedule;

    /**
     * 배치 잡 스케줄링 CUD
     */
    action   create_job_schedule(schedule : schedule)                                          returns schedule;

    action   update_job_schedule(schedule : schedule)                                          returns batch;

    function delete_job_schedule(jobId : String(20), scheduleId : String(20))                  returns batch;

    type schedule    : {
        jobId          : String(20);
        scheduleId     : UUID;
        data           : String(500);
        decription     : String(500);
        active         : Boolean;
        startTime      : String(50);
        endTime        : String(50);
        cron           : String(50);
        time           : String(50);
        repeatInterval : String(50);
        repeatAt       : String(50);
        nextRunAt      : String(50);
    }

}
