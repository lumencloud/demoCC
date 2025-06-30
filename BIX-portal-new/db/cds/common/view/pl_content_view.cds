using common.pl_content_info as common_pl_content_info from '../pl_content_info';
using common.pl_content_info_sub as common_pl_content_info_sub from '../pl_content_info';
using common.menu as common_menu from '../menu';
using common.menu_test as common_menu_test from '../menu';


namespace common;

// view pl_content_view (
//     pl_info : String(50),
//     position : String(10),
//     grid_layout_info : String(50),
//     content_menu_code : String(20),
//     detail_info : String(50)
// ) as
//     select from (
//         select 
//         row_number() over (
//             order by 
//                 content.pl_info asc, 
//                 content.position asc,
//                 content.grid_layout_info desc, 
//                 menu.sort_order asc, 
//                 content.content_menu_code asc, 
//                 content.detail_info desc, 
//                 content.sort_order asc,
//                 content_sub.sort_order asc
//         ) as row,
//         content.pl_info, 
//         content.position,
//         content.grid_layout_info,
//         menu.sort_order AS menu_sort_order,
//         content.content_menu_code, 
//         content.detail_info,
//         menu.name, 
//         content.card_info,
//         content.sort_order as content_sort_order,
//         content_sub.sort_order AS sub_sort_order,
//         content_sub.sub_key,
//         content_sub.sub_text

//         from common_pl_content_info as content 
//         left join common_pl_content_info_sub as content_sub 
//             on content.ID = content_sub.content_info.ID 
//             and ifnull(content_sub.use_yn, false) <> false
//         left join common_menu as menu 
//             on menu.page_path = content.pl_info 
//             and menu.detail_path = content.content_menu_code 

//         where ifnull(content.use_yn, false) = true
//         and (content.content_menu_code = :content_menu_code or ifnull(length(:content_menu_code), 0) = 0)
//         and (content.pl_info = :pl_info or ifnull(length(:pl_info), 0) = 0)
//         and (content.position = :position or ifnull(length(:position), 0) = 0)
//         and (content.grid_layout_info = :grid_layout_info or ifnull(length(:grid_layout_info), 0) = 0)            
//         and (content.detail_info = :detail_info or ifnull(length(:detail_info), 0) = 0)
//     ) {
//         key row: Integer,
//         pl_info, 
//         position,
//         grid_layout_info,
//         menu_sort_order,
//         content_menu_code, 
//         detail_info,
//         name, 
//         card_info,
//         content_sort_order,
//         sub_sort_order,
//         sub_key,
//         sub_text
//     }


view pl_content_view (
    page_path : String(50), // actual <-> plan (실적 PL <-> 추정 PL)
    position : String(10),  // master <-> detail (실적 PL 좌/우측 여부)
    grid_layout_info : String(50),  // grid <-> table
    detail_path : String(20),   // 메뉴 이름 (content_menu_code)
    detail_info : String(50)    // chart <-> detail
) as
    select from (
        select 
        row_number() over (
            order by 
                card.page_path asc, 
                card.position asc,
                card.grid_layout_info desc, 
                menu.sort_order asc,
                card.detail_path asc, 
                card.detail_info desc,
                card.sort_order asc
        ) as row,
        card.page_path, 
        card.position,
        card.grid_layout_info,
        menu.sort_order as menu_sort_order,
        card.detail_path, 
        card.detail_info,
        card.name, 
        card.card_info,
        card.sort_order as card_sort_order,
        card.sub_key,
        card.sub_text

        from common_menu as card
        left join common_menu as menu on card.Parent.ID = menu.ID

        where ifnull(card.use_yn, false) = true
        and (card.page_path = :page_path or ifnull(length(:page_path), 0) = 0)
        and (card.position = :position or ifnull(length(:position), 0) = 0)
        and (card.grid_layout_info = :grid_layout_info or ifnull(length(:grid_layout_info), 0) = 0)    
        and (card.detail_path = :detail_path or ifnull(length(:detail_path), 0) = 0)
        and (card.detail_info = :detail_info or ifnull(length(:detail_info), 0) = 0)
    ) {
        key row: Integer,
        page_path, 
        position,
        grid_layout_info,
        menu_sort_order,
        detail_path, 
        detail_info,
        name, 
        card_info,
        card_sort_order,
        sub_key,
        sub_text
    }
