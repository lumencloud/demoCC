using common.interface_log as common_interface_log from '../interface_log';

namespace common;

/**
 * 인터페이스 로그 뷰
 * ERP RCV 의 경우 페이징 단위로 100건씩 로그가 쌓이게 되기 때문에 총 처리건수를 합하여 보여줌
 */
view interface_log_view as
    select from (
        select
            ver,
            if_step,
            procedure_name,
            table_name,
            execute_time,
            sum(row_count) as row_count : Integer,
            success_yn,
            err_cd,
            log
        from common_interface_log
        group by
            ver,
            if_step,
            procedure_name,
            table_name,
            execute_time,
            success_yn,
            err_cd,
            log
    ) {
        key ver,
        key if_step,
        key procedure_name,
        key table_name,
        key success_yn,
            execute_time,
            row_count,
            err_cd,
            log
    };
