using common.faq_header as common_faq_header from '../faq';
using common.faq_user as common_faq_user from '../faq';
using common.faq_file as common_faq_file from '../faq';
using common.code_header as common_code_header from '../code';
using common.code_item as common_code_item from '../code';

/**
 * 등록일 : 250522
 * 등록자 : 윤희승
 */
namespace common;

/**
 * 파라미터로 넘긴 코드 그룹의 코드 아이템 반환
 * 파라미터가 빈 값이면 전체 코드 아이템을 반환
 */
view faq_header_view as
    select from (
        select
            faq_header.*,
            code.name as category_name,
            case when faq_user.user_id is null then false else true end as view_yn,
            case when faq_file_distinct.header_ID is null then false else true end as file_yn,
            row_number() over (order by faq_header.createdAt asc) as seq
        from common_faq_header as faq_header
        join (
            select item.ID, item.name
            from common_code_header as header
            join common_code_item as item on header.ID = item.header.ID
            where header.category = 'faq_type'
        ) as code on faq_header.category.ID = code.ID
        left join common_faq_user as faq_user on faq_header.ID = faq_user.header.ID and user_id = session_context('APPLICATIONUSER')
        left join (
            select distinct header.ID as header_ID
            from common_faq_file
        )  as faq_file_distinct on faq_file_distinct.header_ID = faq_header.ID
    ) 
    {
        key ID,
        seq: Integer,
        category,
        category_name,
        title,
        use_yn,
        delete_yn,
        content,
        count,
        view_yn: Boolean,
        file_yn: Boolean,
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy
    } 
