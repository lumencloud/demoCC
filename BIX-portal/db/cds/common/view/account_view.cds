using common.version as common_version from '../version';
using common.account as common_account  from '../account';

namespace common;

view account_view as
    select from (
        select 
            account.*
        from common_account as account
        join common_version as version
            on version.ver = account.ver
            and version.tag = 'C'
        where account.delete_yn = false
    ){
        key ver,
        key biz_tp_account_cd,
        biz_tp_account_nm,
        sort_order
    }