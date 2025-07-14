using common.code_item as common_code_item from '../code';
using common.code_header as common_code_header from '../code';
using common.card as common_card from '../card';

namespace common;

view widget_detail_view(ID : UUID) as
    select from (
        select
            card.*,
            cardFolderType_code.name as cardFolderName
        from common_card as card
        left outer join (
            select item.* from common_code_item as item
            join common_code_header as header
                on  item.header.ID  = header.ID
                and header.category = 'card_type'
        ) as cardFolderType_code
            on cardFolderType_code.value = card.cardFolder
        where
            card.ID = :ID
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
