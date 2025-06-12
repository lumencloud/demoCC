using common.code_item as code_item from './code';
using common.code_header as code_header from './code';
using common.org as org from './org';
using common.card as card from './card';
using common.dashboard_content as dashboard_content from './dashboard_content';
using {common.code_header as CodesHeader, common.code_item as CodesItem} from './code';
using dashboard.dashboard_set as dashboard_set from './dashboard';


namespace common.view;

/**
 * 특정 카테고리의 CodeItem 목록
 */
view code_item_view(category : String(20)) as select from (
    select category,
        header.ID,
            item.name,
            item.value,
            item.sort_order
        from CodesHeader as header
        join CodesItem as item
            on header.ID = item.header.ID
    where header.category = :category
        and header.use_yn = true
        and item.use_yn = true
) 
    { 
        category,
        name,
        value,
        key sort_order
    }

/**
 * 부문 본부 팀 3컬럼 구조의 조직구조 view
 * 
 * CCORG_CD 기준 현재 조직코드를 구한 다른 VIEW 들과 JOIN 하여 집계 시 사용
 * 
 * division 부문 - 1796
 * headquater 본부 - 6907
 * team 팀 - 1414
 * 
 * [TO-BE]
 * type - 인터페이스 코드 정보에서 매핑 구현 필요
 */
view org_3depth_view as select from (
    select div.id as div_id, hdqt.id as hdqt_id, team.id as team_id
        from org as div 
    inner join org as hdqt
        on div.id = hdqt.parent
        and div.type = '1796'
        and hdqt.type  = '6907'
    left join org as team
        on hdqt.id = team.parent

    union
    
    // 부문 아래 바로 팀인 경우
    select div.id as div_id, null as hdqt_id,
    case team.type 
        when '1414' then team.id
        else null
    end as team_id
        from org as div 
    inner join org as team
        on div.id = team.parent
        and div.type = '1796'
        and team.type = '1414'
){
    div_id,
    hdqt_id,
    team_id
}

// dashboard view

view get_all_card_list as select from (
    select 
        card.ID,
        card.name,
        card.category,
        card.description,
        card.useFlag,
        card.contentType,
        card.cardComponent,
        card.cardFolder,
        card.richText,
        card.bannerType,
        card.bannerTime
        from card as card
        where card.useFlag = true
) {*}

view get_dashboard_content as select from (
    select
        dashboard_set.ID as dashboard_id,
        content.ID as content_id,
        content.Parent.ID as parent_id,
        content.title,
        content.sub_title,
        content.ui_seq,
        content.widget_id,
        content.column_width
        from dashboard_content as content
    join dashboard_set as dashboard_set
        on dashboard_set.ID = content.dashboard.ID
    left outer join card as card
        on card.ID = content.widget_id
    left outer join dashboard_set as dashboard_widget
        on dashboard_widget.ID = content.widget_id
    where
        (
                content.widget_id is not null
            and card.useFlag      =      true
        )
        or (
                content.widget_id is not null
            and dashboard_widget.ID          is not null
        )
        or content.widget_id is null
    order by
        content.ui_seq
) {
    key dashboard_id,
    key content_id,
    parent_id,
    title,
    sub_title,
    ui_seq,
    widget_id,
    column_width
}

view get_widget_detail(ID:UUID) as select from (
    select 
        card.*,
        cardFolderType_code.name as cardFolderName
        from card as card
    left outer join (select item.*
        from code_item as item
            join code_header as header
                on item.header.ID = header.ID
                and header.category = 'card_type'
        ) as cardFolderType_code
        on cardFolderType_code.value = card.cardFolder
    where card.ID= :ID
) {
    key ID,
    name,
    category,
    description,
    useFlag,
    contentType,
    cardComponent,
    cardFolder,
    cardFolderName,
    richText,
    bannerType,
    bannerTime,
    createdAt
}