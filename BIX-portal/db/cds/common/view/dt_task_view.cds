using common.version as common_version from '../version';
using common.dt_task as common_dt_task  from '../dt_task';

namespace common;

view dt_task_view as
    select from (
        select 
            dt_task.*
        from common_dt_task as dt_task
        join common_version as version
            on version.ver = dt_task.ver
            and version.tag = 'C'
    ){
        key ver,
        key dgtr_task_cd,
        dgtr_task_nm,
        sort_order
    }