using common.account_customer_map as common_account_customer_map from '../account_customer_map';
using common.account as common_account from '../account';
using common.customer as common_customer from '../customer';
using common.version as common_version from '../version';

namespace common;

view account_customer_map_view as
    select from (
        select
            map.biz_tp_account_cd,
            account.biz_tp_account_nm,
            map.cstco_cd,
            case
                when customer.name is null
                     then map.cstco_nm
                else customer.name
            end as cstco_nm : String(100) @title: '고객사 명',
            map.modifiedAt,
            map.modifiedBy
        from common_account_customer_map as map
        left join common_account as account
            on  map.biz_tp_account_cd =  account.biz_tp_account_cd
            and account.ver           in (
                select ver from common_version
                where
                    tag = 'C'
            )
        left join common_customer as customer
            on  map.cstco_cd =  customer.code
            and customer.ver in (
                select ver from common_version
                where
                    tag = 'C'
            )
    ) {
        key biz_tp_account_cd,
        key biz_tp_account_nm,
        key cstco_cd,
            cstco_nm,
            modifiedAt,
            modifiedBy
    }
