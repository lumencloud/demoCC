using common.interface_log as common_interface_log from '../interface_log';
using common.interface_check as common_interface_check from '../interface_check';

namespace common;

/**
 * 인터페이스 로그 뷰
 */
view interface_log_view as
    select from (
        select
            log.*,
            ifnull(
                confirm_yn, false
            ) as confirm_yn
        from (
            select
                ver,
                uuid,
                if_step,
                source,
                table_name,
                procedure_name,
                case
                    when max(case
                                 when success_yn = true
                                      then 0
                                 else 1
                             end)                = 1
                         then false
                    else true
                end            as success_yn : Boolean,
                max(CREATEDAT) as createdAt  : Timestamp,
                sum(row_count) as row_count  : Integer
            from common_interface_log
            group by
                ver,
                uuid,
                if_step,
                source,
                table_name,
                procedure_name
        ) as log
        left join common_interface_check as chk
            on  log.ver        = chk.ver
            and log.uuid       = chk.uuid
            and log.if_step    = chk.if_step
            and log.source     = chk.source
            and log.table_name = chk.table_name
    ) {
        key ver,
        key uuid,
        key if_step,
        key source,
        key table_name,
        key success_yn,
        key createdAt,
            procedure_name,
            confirm_yn: Boolean,
            row_count : Integer
    };
