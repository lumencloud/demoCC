using common.version as common_version from '../version.cds';
using common.org_type as common_org_type from '../org_type';
using common.code_header as common_code_header from '../code';
using common.code_item as common_code_item from '../code';
using common.org as common_org from '../org';


/**
 * 등록일 : 250513
 * 등록자 : 이금복
 */
namespace common;

/**
 * Delivery 여부
 * ACCOUNT / DELIVERY / HYBRID / STAFF 조직 속성관리 뷰
 */
view org_type_view as
    select from (
        select
            org.id,
            org.name,
            org.parent,
            org.order,
            org.str_dt,
            org.end_dt,
            org.use_yn,
            org.ccorg_cd,
            org.type,
            type.org_tp,
            code_item.name as org_tp_name,
            type.is_delivery,
            type.createdAt,
            type.createdBy,
            type.modifiedAt,
            type.modifiedBy
        from common_org as org
        inner join common_version as ver
            on  org.ver  = ver.ver
            and ver.tag  = 'F'
            and ver.year = to_varchar(year(current_date))
        left join common_org_type as type
            on org.ccorg_cd = type.ccorg_cd
        left join common_code_header as code_header 
            on code_header.category = 'org_type'
        left join common_code_item as code_item
            on code_item.header.ID = code_header.ID and code_item.value = type.org_tp
    ) {
        key id,
            name,
            parent,
            order,
            str_dt,
            end_dt,
            use_yn,
            ccorg_cd,
            type,
            org_tp,
            org_tp_name,
            is_delivery,
            createdAt,
            createdBy,
            modifiedAt,
            modifiedBy
    };
