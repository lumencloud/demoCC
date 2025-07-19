using common.org_full_level_view as common_org_full_level_view from '../view/org_full_level_view';
using common.org_type as common_org_type from '../org_type';
using common.code_header as common_code_header from '../code';
using common.code_item as common_code_item from '../code';

namespace common;

/**
 * Delivery 여부
 * ACCOUNT / DELIVERY / HYBRID / STAFF 조직 속성관리 뷰
 */
view org_type_view as
    select from (
        select
            org.org_id as id,
            org.org_name as name,
            org.org_parent as parent,
            org.org_order as order,
            org.org_ccorg_cd as ccorg_cd,
            org.org_type as type,
            type.org_tp,
            code_item.name as org_tp_name,
            type.is_delivery,
            type.is_total_cc,
            type.createdAt,
            type.createdBy,
            type.modifiedAt,
            type.modifiedBy
        from common_org_full_level_view as org
        left join common_org_type as type
            on org.org_ccorg_cd = type.ccorg_cd
        left join common_code_header as code_header 
            on code_header.category = 'org_type'
        left join common_code_item as code_item
            on code_item.header.ID = code_header.ID and code_item.value = type.org_tp
        where org.org_id is not null
    ) {
        key id,
            name,
            parent,
            order,
            ccorg_cd,
            type,
            org_tp,
            org_tp_name,
            is_delivery,
            is_total_cc,
            createdAt,
            createdBy,
            modifiedAt,
            modifiedBy
    };
