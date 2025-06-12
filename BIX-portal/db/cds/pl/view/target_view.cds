using pl.target as pl_target from '../target';
using common.target as common_target from '../../common/target';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';

namespace pl;

/**
 * pl_wideview 1~12월 컬럼 unpivot 뷰 + 집계처리 용도의 조직정보 컬럼 추가
 */
view target_view as
    select * from pl_target as tar
    left join common_org_full_level_view as org
        on tar.ccorg_cd = org.org_ccorg_cd;

view target_view_ver2 as
    select * from common_target as tar
    left join common_org_full_level_view as org
        on tar.ccorg_cd = org.org_ccorg_cd;
