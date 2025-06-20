using dashboard as dashboard from '../../../db/cds/common/dashboard';
using common as common from '../../../db/cds/common/dashboard';
using common.card_list_view as common_card_list_view from '../../../db/cds/common/view/card_list_view';

@impl    : 'srv/handlers/common/publish_srv.js'
@path    : '/odata/v4/publish'
@requires: 'any'
service PublishService {

    entity Menu              as projection on dashboard.Menu;
    entity dashboard_set     as projection on dashboard.dashboard_set;
    entity dashboard_content as projection on common.dashboard_content;
    view GetGroupMenuDetail as select from dashboard.GetGroupMenuDetail;
    view GetMenuTarget as select from dashboard.GetMenuTarget;
    view GetHomeRoutableMenu as select from dashboard.GetMenuView;
    view GetMenuContent as select from dashboard.GetMenuContent;
    view GetAllCardList as select from dashboard.GetAllCardList;
    view GetGroupMenuAll as select from dashboard.GetGroupMenuAll;
    view GetGroupMenuGroup as select from dashboard.GetGroupMenuGroup;
    view GetMyWorkCheck as select from dashboard.GetMyWorkCheck;
    view GetCode as select from dashboard.GetCode;
    /**
     * 명칭 수정 필요
     */
    view get_all_card_list as select from common_card_list_view;
    function get_dashboard_content(dashboard_id : UUID) returns array of hy_dashboard_content;
    function get_dashboard_display_content()            returns array of hy_dashboard_content;

    type hy_dashboard_content {
        dashboard_id : UUID;
        ID           : UUID;
        Parent_id    : UUID;
        title        : String(50);
        sub_title    : String(100);
        ui_seq       : Integer;
        widget_id    : String(50);
        column_width : Integer;
        children     : Map;
    }
}
