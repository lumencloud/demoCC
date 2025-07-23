using common.dashboard_set as dashboard_set_ from '../../../db/cds/common/dashboard_set';
using common as common from '../../../db/cds/common/dashboard_content';
using common.card_list_view as common_card_list_view from '../../../db/cds/common/view/card_list_view';

@impl    : 'srv/handlers/common/publish_srv.js'
@path    : '/odata/v4/publish'
@requires: 'authenticated-user'
service PublishService {

    @restrict: [
        {
            grant: [
                'CREATE',
                'UPDATE'
            ],
            to   : 'bix-portal-system-admin'
        },
        {grant: 'READ'}
    ]
    entity dashboard_set     as projection on dashboard_set_;

    @restrict: [
        {
            grant: [
                'CREATE',
                'UPDATE'
            ],
            to   : 'bix-portal-system-admin'
        },
        {grant: 'READ'}
    ]
    entity dashboard_content as projection on common.dashboard_content;
    
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
