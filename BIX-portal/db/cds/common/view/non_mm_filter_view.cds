using common.non_mm as common_non_mm from '../non_mm';
using common.org_full_level_view as common_org_full_level_view from './org_full_level_view';

namespace common;

entity non_mm_filter_view as
    select
        non_mm.*,
        rodr_org.org_ccorg_cd as nm_rodr_ccorg_cd
    from common_non_mm as non_mm
    inner join common_org_full_level_view as rodr_org
        on(
                   non_mm.rodr_ccorg_cd_op = 'IN'
            and (
                   non_mm.rodr_ccorg_cd    = rodr_org.lv1_ccorg_cd
                or non_mm.rodr_ccorg_cd    = rodr_org.lv2_ccorg_cd
                or non_mm.rodr_ccorg_cd    = rodr_org.lv3_ccorg_cd
                or non_mm.rodr_ccorg_cd    = rodr_org.div_ccorg_cd
                or non_mm.rodr_ccorg_cd    = rodr_org.hdqt_ccorg_cd
                or non_mm.rodr_ccorg_cd    = rodr_org.team_ccorg_cd
            )
        )
        or (
                   non_mm.rodr_ccorg_cd_op = '='
            and    non_mm.rodr_ccorg_cd    = rodr_org.org_ccorg_cd
        );
