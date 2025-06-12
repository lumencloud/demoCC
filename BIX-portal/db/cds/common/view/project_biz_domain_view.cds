using common.org_full_level_view as common_org_full_level_view from './org_full_level_view';
using common.project as common_project from '../project';
using common.project_biz_domain as common_project_biz_domain from '../project_biz_domain';

namespace common;

view project_biz_domain_view as
    select
            // prj 정보는 검색조건 추가 시 추가등록 될 수 있음
        key prj.prj_no,
            prj.prj_nm,
            prj.bd_n1_cd,
            case bd.bd_n2_cd
                when
                    null
                then
                    prj.bd_n2_cd
                else
                    bd.bd_n2_cd
            end as bd_n2_cd : String(20),
            case bd.bd_n3_cd
                when
                    null
                then
                    prj.bd_n3_cd
                else
                    bd.bd_n3_cd
            end as bd_n3_cd : String(20),
            bd.bd_n4_cd,
            bd.bd_n5_cd,
            bd.bd_n6_cd,
            org.*,
            bd.createdAt,
            bd.createdBy,
            bd.modifiedAt,
            bd.modifiedBy
    from common_project as prj
    left join common_project_biz_domain as bd
        on prj.prj_no = bd.prj_no
    left join common_org_full_level_view as org
        on prj.sale_ccorg_cd = org.org_ccorg_cd;
