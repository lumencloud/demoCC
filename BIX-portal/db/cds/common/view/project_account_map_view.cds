using common.project_view as common_project_view from './project_view';
using common.account as common_account from '../account';
using common.customer as common_customer from '../customer';
using common.version as common_version from '../version';
using common.org_full_level_view as common_org_full_level_view from './org_full_level_view';

namespace common;

view project_account_map_view as
    select from (
        select
            version.year,
            version.month,
            prj.prj_no,
            prj.prj_nm,
            prj.if_source,
            prj.cstco_cd,
            customer.name     as cstco_nm      : String(100) @title: '고객사 명',
            rodr_org.org_name as rodr_org_name : String(50),
            prj.rodr_ccorg_cd,
            sale_org.org_name as sale_org_name : String(50),
            prj.sale_ccorg_cd
        from common_project_view as prj
        left join common_customer as customer
            on  prj.cstco_cd =  customer.code
            and customer.ver in (
                select ver from common_version
                where
                    tag = 'C'
            )
        left join common_org_full_level_view as rodr_org
            on prj.rodr_ccorg_cd = rodr_org.org_ccorg_cd
        left join common_org_full_level_view as sale_org
            on prj.sale_ccorg_cd = sale_org.org_ccorg_cd
        left join common_version as version
            on  version.tag in (
                'C', 'Y'
            )
            and prj.ver     =  version.ver
        where
            (
                   prj.biz_tp_account_cd is     null
                or prj.biz_tp_account_cd =      ''
            )
            and    prj.if_source         <>     'WG'
            and    prj.if_source         <>     'BIX'
            and    prj.if_source         is not null
            and    prj.cstco_cd          <>     ''
            and    prj.cstco_cd          is not null
    ) {
        key year,
        key month,
        key prj_no,
            prj_nm,
            if_source,
            cstco_cd,
            cstco_nm,
            rodr_org_name,
            rodr_ccorg_cd,
            sale_org_name,
            sale_ccorg_cd
    }
