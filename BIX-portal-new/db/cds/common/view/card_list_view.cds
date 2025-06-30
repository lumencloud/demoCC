using common.card as common_card from '../card';

namespace common;

view card_list_view as
    select from (
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
        from common_card as card
        where
            card.useFlag = true
    ) {
        *
    }
