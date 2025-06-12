using sga.wideview as sga_wideview from '../sga/wideview';
using common.code_header as common_code_header from '../common/code';
using common.code_item as common_code_item from '../common/code';
using common.project as common_project from '../common/project';
using common.project_biz_domain as common_project_biz_domain from '../common/project_biz_domain';
using common.dt_task as common_dt_task from '../common/dt_task';
using common.account as common_account from '../common/account';
using common.project_platform as common_project_platform from '../common/project_platform';
using common.org_full_level_view as common_org_full_level_view from '../common/view/org_full_level_view';

namespace reporting;

// 버전 개발 후 ver 도 조인대상 추가필요
view sga_view as
    select
        sga.*
    from sga_wideview as sga
    left join common_org_full_level_view as org
        on sga.ccorg_cd = org.org_ccorg_cd;
