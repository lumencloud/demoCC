using common.pl_content_info as plContent from '../pl_content_info';
using common.card as card from '../card';

namespace common;

view get_card_name_view (content_menu_code:String(50)) as
    select from (
        select 
            card.name,
            pl.card_info,
            pl.sort_order
        from plContent as pl
        join card as card
            on card.cardFolder = pl.card_info
        where 
            pl.content_menu_code = :content_menu_code
    )
    {
        key name,
            card_info,
            sort_order
    }