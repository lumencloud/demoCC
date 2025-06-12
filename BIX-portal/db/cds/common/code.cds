using {
    cuid,
    managed
} from '@sap/cds/common';

namespace common;

/**
 * 공통코드그룹
 */
entity code_header : cuid, managed {
    category    : String(20) not null   @title: 'category';
    description : String(20) not null   @title: 'description';
    use_yn      : Boolean               @title: '사용여부';
    system_yn   : Boolean               @title: '시스템 사용여부';
    delete_yn   : Boolean default false @title: '삭제여부';
    items       : Composition of many code_item
                      on items.header = $self;
}

/**
 * 공통코드아이템
 */
entity code_item : cuid, managed {
    name        : String(50) not null   @title: 'text';
    value       : String(20) not null   @title: 'value';
    datatype    : String(20)            @title: 'datatype';
    value_opt1  : String(20)            @title: 'option1 value';
    value_opt2  : String(20)            @title: 'option2 value';
    sort_order  : Integer not null      @title: '정렬순서';
    memo        : String(100)           @title: 'memo';
    use_yn      : Boolean               @title: '사용여부';
    delete_yn   : Boolean default false @title: '삭제여부';
    header      : Association to one code_header;
    header_opt1 : Association to one code_header;
    header_opt2 : Association to one code_header;
}
