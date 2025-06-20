using common.code_item as code_item from './code';

using {
    cuid,
    managed
} from '@sap/cds/common';

namespace common;

/**
 * 공통 FAQ
 */
entity faq_header : cuid, managed {
    category  : Association to one code_item   @title: '카테고리';
    title     : String(200) not null           @title: '제목';
    use_yn    : Boolean not null default true  @title: '사용여부';
    delete_yn : Boolean not null default false @title: '삭제여부';
    content   : LargeString                    @title: '내용';
    count     : Integer not null default 0     @title: '조회수';
    files     : Composition of many faq_file
                    on files.header = $self;
    user      : Composition of many faq_user
                    on user.header = $self;
}

/**
 * 공통 FAQ 파일
 */
entity faq_file : cuid, managed {
    name    : String(50) not null   @title: '파일명';

    @Core.MediaType  : type
    content : LargeBinary not null  @title: '내용'  @stream;

    @Core.IsMediaType: true
    type    : String(200) not null  @title: '타입';
    size    : Integer not null      @title: '크기';
    url     : String(200)           @title: 'URL';
    header  : Association to one faq_header;
}

/**
 * 공통 FAQ 사용자 확인
 */
entity faq_user : managed {
    key header  : Association to one faq_header;
    key user_id : String(50) not null @title: '사용자 ID';
}
