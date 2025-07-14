using common.code_header as common_code_header from '../code';
using common.code_item as common_code_item from '../code';

/**
 * 등록일 : 250521
 * 등록자 : 윤희승
 */
namespace common;

/**
 * 파라미터로 넘긴 코드 그룹의 코드 아이템 반환 (Select로 사용)
 * 실제 사용하는 코드 아이템만 반환함 (use_yn = true & deleye_yn <> true)
 */
view get_code_item_view(category: String(20)) as
    select from (
        select
            header.ID as header_ID,
            item.ID as item_ID,
            header.category,
            item.name,
            item.value,
            item.sort_order
        from common_code_header as header
        inner join common_code_item as item
            on item.header.ID = header.ID 
        where (header.category = :category or :category = '')
            and header.use_yn = true and header.delete_yn <> true
            and item.use_yn = true and item.delete_yn <> true
        order by header.category asc, item.sort_order asc
    ) 
    {
            header_ID,
        key item_ID,
            category,
            name,
            value,
            sort_order
    }


/**
 * 파라미터로 넘긴 코드 그룹의 전체 코드 아이템 반환 (코드 관리에서 사용)
 */
view code_item_view(category: String(20)) as
    select from (
        select
            header.ID as header_ID,
            item.ID as item_ID,
            header.category,
            item.name,
            item.value,
            item.datatype,
            item.sort_order,
            item.use_yn,
            item.header_opt1.ID as header_opt1_ID,
            item.value_opt1,
            item.header_opt2.ID as header_opt2_ID,
            item.value_opt2
        from common_code_header as header
        inner join common_code_item as item
            on item.header.ID = header.ID 
        where (header.category = :category or :category = '')
            and header.delete_yn <> true
            and item.delete_yn <> true
        order by header.category asc, item.sort_order asc
    ) 
    {
            header_ID,
        key item_ID,
            category,
            name,
            value,
            datatype,
            sort_order,
            use_yn,
            header_opt1_ID,
            value_opt1,
            header_opt2_ID,
            value_opt2
    }