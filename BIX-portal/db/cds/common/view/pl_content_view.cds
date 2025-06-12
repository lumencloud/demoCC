using common.pl_content_info as plContent from '../pl_content_info';

namespace common;

view pl_content_view (
    content_menu_code : String(20),
    pl_info : String(50),
    position : String(10),
    grid_layout_info : String(50),
    detail_info : String(50),
    sort_order : Integer
) as
    select from (
        select 
            card_info,
            sort_order
        from plContent
        where 
            content_menu_code = :content_menu_code
            and pl_info = :pl_info
            and position = :position
            and (
                grid_layout_info = :grid_layout_info
                or detail_info = :detail_info
            )
            and (sort_order = :sort_order or :sort_order is null)
    )
    {
        key card_info,
            sort_order
    }