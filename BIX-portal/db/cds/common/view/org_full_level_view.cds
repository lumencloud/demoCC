using common.org as common_org from '../org.cds';
using common.version as common_version from '../version.cds';
using common.delivery_org as common_delivery_org from '../delivery_org.cds';

namespace common;

view org_full_level_view as
    select from (
        select 
            org_view.*,
            latest_org_view.type as org_type
        from (
            select
                lv1.org_id,
                lv1.org_ccorg_cd,
                lv1.org_order,
                lv1.org_parent,
                lv1.org_name,
                lv1.is_delivery,
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
                lv6.ccorg_cd as team_ccorg_cd
            from (
                select
                    org_id,
                    org_ccorg_cd,
                    org_order,
                    org_parent,
                    org_name,
                    is_delivery,
                    id,
                    name,
                    type,
                    ccorg_cd,
                    'lv1' as level
                from org_unpivotted_view
                where
                    type in (
                        select distinct org_lv1_type from org_type_str_view
                    )
            ) as lv1
            full outer join (
                select
                    org_id,
                    org_ccorg_cd,
                    org_order,
                    org_parent,
                    org_name,
                    is_delivery,
                    id,
                    name,
                    type,
                    ccorg_cd,
                    'lv2' as level
                from org_unpivotted_view
                where
                        type in (
                        select distinct org_lv2_type from org_type_str_view
                    )
                    and id   in (
                        select distinct org_lv2_id from org_type_str_view
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
                    is_delivery,
                    id,
                    name,
                    type,
                    ccorg_cd,
                    'lv3' as level
                from org_unpivotted_view
                where
                        type in (
                        select distinct org_lv3_type from org_type_str_view
                    )
                    and id   in (
                        select distinct org_lv3_id from org_type_str_view
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
                    is_delivery,
                    id,
                    name,
                    type,
                    ccorg_cd
                from org_unpivotted_view
                where
                    type in (
                        select distinct org_lv4_type from org_type_str_view
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
                    is_delivery,
                    id,
                    name,
                    type,
                    ccorg_cd
                from org_unpivotted_view
                where
                    type in (
                        select distinct org_lv5_type from org_type_str_view
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
                    is_delivery,
                    id,
                    name,
                    type,
                    ccorg_cd
                from org_unpivotted_view
                where
                    type in (
                        select distinct org_lv6_type from org_type_str_view
                    )
            ) as lv6
                on lv1.org_id = lv6.org_id
        ) as org_view
        join latest_org_view on org_view.org_id = latest_org_view.id
    ) {
        key org_id,
        key org_ccorg_cd,
            org_order,
            org_parent,
            org_name,
            org_type,
            is_delivery,
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

view org_pivotted_view as
    select from (
        select
            l1.id       as lv1_id,
            l1.name     as lv1_name,
            l1.type     as lv1_type,
            l1.ccorg_cd as lv1_ccorg_cd,
            l2.id       as lv2_id,
            l2.name     as lv2_name,
            l2.type     as lv2_type,
            l2.ccorg_cd as lv2_ccorg_cd,
            l3.id       as lv3_id,
            l3.name     as lv3_name,
            l3.type     as lv3_type,
            l3.ccorg_cd as lv3_ccorg_cd,
            l4.id       as lv4_id,
            l4.name     as lv4_name,
            l4.type     as lv4_type,
            l4.ccorg_cd as lv4_ccorg_cd,
            l5.id       as lv5_id,
            l5.name     as lv5_name,
            l5.type     as lv5_type,
            l5.ccorg_cd as lv5_ccorg_cd,
            l6.id       as lv6_id,
            l6.name     as lv6_name,
            l6.type     as lv6_type,
            l6.ccorg_cd as lv6_ccorg_cd,
            l6.order    as lv6_order,
            l6.parent   as lv6_parent,
            d.is_delivery
        from latest_org_view as l6
        left outer join latest_org_view as l5
            on l6.parent = l5.id
        left outer join latest_org_view as l4
            on l5.parent = l4.id
        left outer join latest_org_view as l3
            on l4.parent = l3.id
        left outer join latest_org_view as l2
            on l3.parent = l2.id
        left outer join latest_org_view as l1
            on l2.parent = l1.id
        left outer join common_delivery_org as d
            on  l6.ccorg_cd = d.ccorg_cd
            and l6.id       = d.org_id
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
        lv6_parent,
        is_delivery
    }

view org_unpivotted_view as
        select from (
            select
                lv6_id       as org_id,
                lv6_ccorg_cd as org_ccorg_cd,
                lv6_order    as org_order,
                lv6_parent   as org_parent,
                lv6_name     as org_name,
                is_delivery,
                lv1_id       as id,
                lv1_name     as name,
                lv1_type     as type,
                lv1_ccorg_cd as ccorg_cd
            from org_pivotted_view
            where
                lv1_id is not null
        union all
            select
                lv6_id       as org_id,
                lv6_ccorg_cd as org_ccorg_cd,
                lv6_order    as org_order,
                lv6_parent   as org_parent,
                lv6_name     as org_name,
                is_delivery,
                lv2_id       as id,
                lv2_name     as name,
                lv2_type     as type,
                lv2_ccorg_cd as ccorg_cd
            from org_pivotted_view
            where
                lv2_id is not null
        union all
            select
                lv6_id       as org_id,
                lv6_ccorg_cd as org_ccorg_cd,
                lv6_order    as org_order,
                lv6_parent   as org_parent,
                lv6_name     as org_name,
                is_delivery,
                lv3_id       as id,
                lv3_name     as name,
                lv3_type     as type,
                lv3_ccorg_cd as ccorg_cd
            from org_pivotted_view
            where
                lv3_id is not null
        union all
            select
                lv6_id       as org_id,
                lv6_ccorg_cd as org_ccorg_cd,
                lv6_order    as org_order,
                lv6_parent   as org_parent,
                lv6_name     as org_name,
                is_delivery,
                lv4_id       as id,
                lv4_name     as name,
                lv4_type     as type,
                lv4_ccorg_cd as ccorg_cd
            from org_pivotted_view
            where
                lv4_id is not null
        union all
            select
                lv6_id       as org_id,
                lv6_ccorg_cd as org_ccorg_cd,
                lv6_order    as org_order,
                lv6_parent   as org_parent,
                lv6_name     as org_name,
                is_delivery,
                lv5_id       as id,
                lv5_name     as name,
                lv5_type     as type,
                lv5_ccorg_cd as ccorg_cd
            from org_pivotted_view
            where
                lv5_id is not null
        union all
            select
                lv6_id       as org_id,
                lv6_ccorg_cd as org_ccorg_cd,
                lv6_order    as org_order,
                lv6_parent   as org_parent,
                lv6_name     as org_name,
                is_delivery,
                lv6_id       as id,
                lv6_name     as name,
                lv6_type     as type,
                lv6_ccorg_cd as ccorg_cd
            from org_pivotted_view
        ) {
            org_id,
            org_ccorg_cd,
            org_order,
            org_parent,
            org_name,
            is_delivery,
            id,
            name,
            type,
            ccorg_cd
        }

view org_type_str_view as
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
        from latest_org_view as lv6
        left outer join latest_org_view as lv5
            on lv6.parent = lv5.id
        left outer join latest_org_view as lv4
            on lv5.parent = lv4.id
        left outer join latest_org_view as lv3
            on lv4.parent = lv3.id
        left outer join latest_org_view as lv2
            on lv3.parent = lv2.id
        left outer join latest_org_view as lv1
            on lv2.parent = lv1.id
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
    }

view latest_org_view as
    select from common_org
    // select from common_org as org
    // inner join common_version as ver
    //     on  org.ver  = ver.ver
    //     and ver.tag  = 'F'
    //     and ver.year = to_varchar(year(current_date))
    //     and ver.month = lpad(to_varchar(month(current_date)-1),2,'0')
    {
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
        ver = 'P20250501';
