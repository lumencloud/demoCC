using common.menu as common_menu from '../../../db/cds/common/menu';
using common.menu_view as common_menu_view from '../../../db/cds/common/view/menu_view';
using common as common_code from '../../../db/cds/common/code';
using common as common_faq from '../../../db/cds/common/faq';
using common.org as common_org from '../../../db/cds/common/org';
using common.org_type as common_org_type from '../../../db/cds/common/org_type';
using common.org_type_view as common_org_type_view from '../../../db/cds/common/view/org_type_view';
using common as common_code_view from '../../../db/cds/common/view/code_view';
using common.faq_header_view as common_faq_header_view from '../../../db/cds/common/view/faq_view';
using common.interface_log_view as common_interface_log_view from '../../../db/cds/common/view/interface_log_view';
using common as dashboard_favorite from '../../../db/cds/common/dashboard_favorite';
using common as common_target from '../../../db/cds/common/target';
using common as common_project_biz_domain from '../../../db/cds/common/project_biz_domain';
using from '../../../db/cds/rsp/org_total_labor';
using from '../../../db/cds/rsp/org_b_labor';
using from '../../../db/cds/rsp/opp_labor';
using common as orgFull from '../../../db/cds/common/view/org_full_level_view';
using common as pjrBD from '../../../db/cds/common/view/project_biz_domain_view';
using common.pl_content_view as plContentView from '../../../db/cds/common/view/pl_content_view';
using common.get_card_name_view as cardNameView from '../../../db/cds/common/view/get_card_name_view';
using common as common_account from '../../../db/cds/common/account';
using common as common_customer from '../../../db/cds/common/customer';
using common as common_version from '../../../db/cds/common/version';
using from '../../../db/cds/common/dt_task';
using common.interface_master as common_interface_master from '../../../db/cds/common/interface_master';
using common as common_target_view from '../../../db/cds/common/view/target_view';
using common as common_org_target_view from '../../../db/cds/common/view/org_target_view';

@impl                        : 'srv/handlers/common/common_srv.js'
@path                        : '/odata/v4/cm'
@requires                    : 'any'
@cds.server.body_parser.limit: '1000mb' // 파일 첨부 시 body 요청 사이즈 제한 증가
service ComService {

    entity interface_master                       as projection on common_interface_master;
    entity org                                    as projection on common_org;
    entity CodesItem                              as projection on common_code.code_item;
    entity CodesHeader                            as projection on common_code.code_header;
    entity FaqHeader                              as projection on common_faq.faq_header;
    entity FaqFile                                as projection on common_faq.faq_file;
    entity FaqUser                                as projection on common_faq.faq_user;
    entity Target                                 as projection on common_target.target;
    entity AnnualTarget                           as projection on common_target.annual_target;
    entity Menus                                  as projection on common_menu;
    entity Menu_view                              as projection on common_menu_view;
    entity Favorite                               as projection on dashboard_favorite.dashboard_favorite;
    entity OrgType                                as projection on common_org_type;
    entity OrgTypeView                            as projection on common_org_type_view;
    entity project_biz_domain                     as projection on common_project_biz_domain.project_biz_domain;
    entity Account                                as projection on common_account.account;
    entity Customer                               as projection on common_customer.customer;
    entity Version                                as projection on common_version.version;

    entity GetCodeItemView(category : String(20)) as projection on common_code_view.get_code_item_view(category : :category)
                                                     order by
                                                         category,
                                                         sort_order;

    entity CodeItemView(category : String(20))    as projection on common_code_view.code_item_view(category : :category)
                                                     order by
                                                         category,
                                                         sort_order;

    entity faqHeaderView                          as projection on common_faq_header_view
                                                     order by
                                                         seq desc;

    entity org_target_sum_view                          as projection on common_org_target_view.org_target_sum_view;

    function get_org_target(type : String(20))                                               returns array of oTarget;
    type oTarget {};

    //dashboard chart
    function get_dashboard_chart(year : String(4), month : String(2), org_id : String(10)) returns array of oDashChart;
    type oDashChart {};

    // @cds.persistence.skip
    // entity org_descendant_view(org_id : String) {
    //     key id              : String(20)  @title: '조직 ID';
    //         name            : String(50)  @title: '조직 이름';
    //         parent          : String(10)  @title: '상위조직 ID';
    //         order           : String(100) @title: '소팅 순서';
    //         str_dt          : String(10)  @title: '시작일';
    //         end_dt          : String(10)  @title: '종료일';
    //         use_yn          : Boolean     @title: '사용 여부';
    //         ccorg_cd        : String(8)   @title: 'ERP CC조직_코드';
    //         type            : String(10)  @title: '조직 타입';
    //         hierarchy_level : Integer;
    //         drill_state     : String(8);
    // };

    /**
     * 사용여부 확인
     */
    view code_item_view(category : String(20)) as
        select from common_code_view.code_item_view (
            category: :category
        );

    view org_full_level as select from orgFull.org_full_level_view;
    view latest_org as select from orgFull.latest_org_view;
    view project_biz_domain_view as select from pjrBD.project_biz_domain_view;
    view interface_log_view as select from common_interface_log_view;
    view annual_target_temp_view as select from common_target_view.annual_target_temp_view;


    view pl_content_view(content_menu_code : String(20),
                         pl_info : String(50),
                         position : String(10),
                         grid_layout_info : String(50),
                         detail_info : String(50),
                         sort_order : Integer) as
        select from plContentView (
            content_menu_code: :content_menu_code, pl_info: :pl_info, position: :position, grid_layout_info: :grid_layout_info, detail_info: :detail_info, sort_order: :sort_order
        )
        order by
            sort_order asc;

    view get_card_name_view(content_menu_code : String(50)) as
        select from cardNameView (
            content_menu_code: :content_menu_code
        )
        order by
            sort_order;

    function get_code_data(category : String(20))                                            returns array of oRes;

    type oRes {
        group      : String(20);
        name       : String(50);
        value      : String(20);
        sort_order : Integer;
    }

    function get_org_descendant(org_id : String(20), isTree : Boolean, isDelivery : Boolean) returns array of oDescendant;

    type oDescendant {

    }

// function get_user_favorite(user_id:String(100), chart_id:String(100), action:String(6)) returns array of oFavorite;

// type oFavorite {
//     chart_id:String;
// }
}
