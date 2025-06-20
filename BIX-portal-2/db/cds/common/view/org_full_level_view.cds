using common.org as common_org from '../org.cds';
using common.version as common_version from '../version.cds';
using common.org_type as common_org_type from '../../common/org_type';

namespace common;

view org_full_level_view as
    select from (
        select
            lv1.org_id,
            case
                when
                    lv1.org_ccorg_cd is null
                then
                    org_tp.ccorg_cd
                else
                    lv1.org_ccorg_cd
            end          as org_ccorg_cd : String(8) @title : '조직 CC코드 (인터페이스 외 추가조직 포함)',
            lv1.org_order,
            lv1.org_parent,
            case
                when
                    lv1.org_name is null
                then
                    org_tp.org_desc
                else
                    lv1.org_name
            end          as org_name :String(50) @title: '조직명 (인터페이스 외 추가조직 포함)',
            lv1.org_type,
            lv1.id       as lv1_id,
            lv1.name     as lv1_name,
            lv1.ccorg_cd as lv1_ccorg_cd,
            lv2.id       as lv2_id,
            lv2.name     as lv2_name,
            lv2.ccorg_cd as lv2_ccorg_cd,
            lv3.id       as lv3_id,
            lv3.name     as lv3_name,
            lv3.ccorg_cd as lv3_ccorg_cd,
            lv4.id       as div_id,
            lv4.name     as div_name,
            lv4.ccorg_cd as div_ccorg_cd,
            lv5.id       as hdqt_id,
            lv5.name     as hdqt_name,
            lv5.ccorg_cd as hdqt_ccorg_cd,
            lv6.id       as team_id,
            lv6.name     as team_name,
            lv6.ccorg_cd as team_ccorg_cd,
            org_tp.*
        from (
            select
                org_id,
                org_ccorg_cd,
                org_order,
                org_parent,
                org_name,
                org_type,
                id,
                name,
                ccorg_cd
            from org_unpivot_view
            where
                type in (
                    select distinct org_lv1_type from org_tp_hierachy_view
                )
        ) as lv1
        full outer join (
            select
                org_id,
                org_ccorg_cd,
                org_order,
                org_parent,
                org_name,
                org_type,
                id,
                name,
                ccorg_cd
            from org_unpivot_view
            where
                    type in (
                    select distinct org_lv2_type from org_tp_hierachy_view
                )
                and id   in (
                    select distinct org_lv2_id from org_tp_hierachy_view
                )
        ) as lv2
            on lv1.org_id = lv2.org_id
        full outer join (
            select
                org_id,
                org_ccorg_cd,
                org_order,
                org_parent,
                org_name,
                org_type,
                id,
                name,
                ccorg_cd
            from org_unpivot_view
            where
                    type in (
                    select distinct org_lv3_type from org_tp_hierachy_view
                )
                and id   in (
                    select distinct org_lv3_id from org_tp_hierachy_view
                )
        ) as lv3
            on lv1.org_id = lv3.org_id
        full outer join (
            select
                org_id,
                org_ccorg_cd,
                org_order,
                org_parent,
                org_name,
                org_type,
                id,
                name,
                ccorg_cd
            from org_unpivot_view
            where
                type in (
                    select distinct org_lv4_type from org_tp_hierachy_view
                )
        ) as lv4
            on lv1.org_id = lv4.org_id
        full outer join (
            select
                org_id,
                org_ccorg_cd,
                org_order,
                org_parent,
                org_name,
                org_type,
                id,
                name,
                ccorg_cd
            from org_unpivot_view
            where
                type in (
                    select distinct org_lv5_type from org_tp_hierachy_view
                )
        ) as lv5
            on lv1.org_id = lv5.org_id
        full outer join (
            select
                org_id,
                org_ccorg_cd,
                org_order,
                org_parent,
                org_name,
                org_type,
                id,
                name,
                ccorg_cd
            from org_unpivot_view
            where
                type in (
                    select distinct org_lv6_type from org_tp_hierachy_view
                )
        ) as lv6
            on lv1.org_id = lv6.org_id
        full outer join common_org_type as org_tp
            on lv1.org_ccorg_cd = org_tp.ccorg_cd
    ) {
        key org_id,
        key org_ccorg_cd,
            org_order,
            org_parent,
            org_name,
            org_type,
            is_delivery,
            is_total_cc,
            org_tp,
            lv1_id,
            lv1_name,
            lv1_ccorg_cd,
            lv2_id,
            lv2_name,
            lv2_ccorg_cd,
            lv3_id,
            lv3_name,
            lv3_ccorg_cd,
            div_id,
            div_name,
            div_ccorg_cd,
            hdqt_id,
            hdqt_name,
            hdqt_ccorg_cd,
            team_id,
            team_name,
            team_ccorg_cd
    }

view org_flatten_view as
    select from (
        select
            lv1.id       as lv1_id,
            lv1.name     as lv1_name,
            lv1.type     as lv1_type,
            lv1.ccorg_cd as lv1_ccorg_cd,
            lv2.id       as lv2_id,
            lv2.name     as lv2_name,
            lv2.type     as lv2_type,
            lv2.ccorg_cd as lv2_ccorg_cd,
            lv3.id       as lv3_id,
            lv3.name     as lv3_name,
            lv3.type     as lv3_type,
            lv3.ccorg_cd as lv3_ccorg_cd,
            lv4.id       as lv4_id,
            lv4.name     as lv4_name,
            lv4.type     as lv4_type,
            lv4.ccorg_cd as lv4_ccorg_cd,
            lv5.id       as lv5_id,
            lv5.name     as lv5_name,
            lv5.type     as lv5_type,
            lv5.ccorg_cd as lv5_ccorg_cd,
            lv6.id       as lv6_id,
            lv6.name     as lv6_name,
            lv6.type     as lv6_type,
            lv6.ccorg_cd as lv6_ccorg_cd,
            lv6.order    as lv6_order,
            lv6.parent   as lv6_parent
        from common_org as lv6
        left outer join common_org as lv5
            on  lv6.parent = lv5.id
            and lv6.ver    = lv5.ver
            and lv6.ver    = (
                select ver from common_version
                where
                    tag = 'C'
            )
        left outer join common_org as lv4
            on  lv5.parent = lv4.id
            and lv6.ver    = lv4.ver
        left outer join common_org as lv3
            on  lv4.parent = lv3.id
            and lv6.ver    = lv3.ver
        left outer join common_org as lv2
            on  lv3.parent = lv2.id
            and lv6.ver    = lv2.ver
        left outer join common_org as lv1
            on  lv2.parent = lv1.id
            and lv6.ver    = lv1.ver
        where
            lv6.ver = (
                select ver from common_version
                where
                    tag = 'C'
            )
    ) {
        lv1_id,
        lv1_name,
        lv1_type,
        lv1_ccorg_cd,
        lv2_id,
        lv2_name,
        lv2_type,
        lv2_ccorg_cd,
        lv3_id,
        lv3_name,
        lv3_type,
        lv3_ccorg_cd,
        lv4_id,
        lv4_name,
        lv4_type,
        lv4_ccorg_cd,
        lv5_id,
        lv5_name,
        lv5_type,
        lv5_ccorg_cd,
        lv6_id,
        lv6_name,
        lv6_type,
        lv6_ccorg_cd,
        lv6_order,
        lv6_parent
    }

view org_unpivot_view as
        select from (
            select
                lv6_id       as org_id,
                lv6_ccorg_cd as org_ccorg_cd,
                lv6_order    as org_order,
                lv6_parent   as org_parent,
                lv6_name     as org_name,
                lv6_type     as org_type,
                lv1_id       as id,
                lv1_name     as name,
                lv1_type     as type,
                lv1_ccorg_cd as ccorg_cd
            from org_flatten_view
            where
                lv1_id is not null
        union all
            select
                lv6_id       as org_id,
                lv6_ccorg_cd as org_ccorg_cd,
                lv6_order    as org_order,
                lv6_parent   as org_parent,
                lv6_name     as org_name,
                lv6_type     as org_type,
                lv2_id       as id,
                lv2_name     as name,
                lv2_type     as type,
                lv2_ccorg_cd as ccorg_cd
            from org_flatten_view
            where
                lv2_id is not null
        union all
            select
                lv6_id       as org_id,
                lv6_ccorg_cd as org_ccorg_cd,
                lv6_order    as org_order,
                lv6_parent   as org_parent,
                lv6_name     as org_name,
                lv6_type     as org_type,
                lv3_id       as id,
                lv3_name     as name,
                lv3_type     as type,
                lv3_ccorg_cd as ccorg_cd
            from org_flatten_view
            where
                lv3_id is not null
        union all
            select
                lv6_id       as org_id,
                lv6_ccorg_cd as org_ccorg_cd,
                lv6_order    as org_order,
                lv6_parent   as org_parent,
                lv6_name     as org_name,
                lv6_type     as org_type,
                lv4_id       as id,
                lv4_name     as name,
                lv4_type     as type,
                lv4_ccorg_cd as ccorg_cd
            from org_flatten_view
            where
                lv4_id is not null
        union all
            select
                lv6_id       as org_id,
                lv6_ccorg_cd as org_ccorg_cd,
                lv6_order    as org_order,
                lv6_parent   as org_parent,
                lv6_name     as org_name,
                lv6_type     as org_type,
                lv5_id       as id,
                lv5_name     as name,
                lv5_type     as type,
                lv5_ccorg_cd as ccorg_cd
            from org_flatten_view
            where
                lv5_id is not null
        union all
            select
                lv6_id       as org_id,
                lv6_ccorg_cd as org_ccorg_cd,
                lv6_order    as org_order,
                lv6_parent   as org_parent,
                lv6_name     as org_name,
                lv6_type     as org_type,
                lv6_id       as id,
                lv6_name     as name,
                lv6_type     as type,
                lv6_ccorg_cd as ccorg_cd
            from org_flatten_view
        ) {
            org_id,
            org_ccorg_cd,
            org_order,
            org_parent,
            org_name,
            org_type,
            id,
            name,
            type,
            ccorg_cd
        }

view org_tp_hierachy_view as
    select from (
        select distinct
            lv1.type as org_lv1_type,
            lv1.id   as org_lv1_id,
            lv2.type as org_lv2_type,
            lv2.id   as org_lv2_id,
            lv3.type as org_lv3_type,
            lv3.id   as org_lv3_id,
            lv4.type as org_lv4_type,
            lv5.type as org_lv5_type,
            lv6.type as org_lv6_type
        from common_org as lv6
        left outer join common_org as lv5
            on  lv6.parent = lv5.id
            and lv6.ver    = lv5.ver
            and lv6.ver    = (
                select ver from common_version
                where
                    tag = 'C'
            )
        left outer join common_org as lv4
            on  lv5.parent = lv4.id
            and lv6.ver    = lv4.ver
        left outer join common_org as lv3
            on  lv4.parent = lv3.id
            and lv6.ver    = lv3.ver
        left outer join common_org as lv2
            on  lv3.parent = lv2.id
            and lv6.ver    = lv2.ver
        left outer join common_org as lv1
            on  lv2.parent = lv1.id
            and lv6.ver    = lv1.ver
        where
            lv1.type is not null
    ) {
        key org_lv1_type,
        key org_lv1_id,
        key org_lv2_type,
        key org_lv2_id,
        key org_lv3_type,
        key org_lv3_id,
            org_lv4_type,
            org_lv5_type,
            org_lv6_type
    };

view latest_org_view as
    select from common_org {
        key id,
            name,
            parent,
            order,
            str_dt,
            end_dt,
            use_yn,
            ccorg_cd,
            type
    }
    where
        ver = (
            select ver from common_version
            where
                tag = 'C'
        );
