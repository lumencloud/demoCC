using {managed} from '@sap/cds/common';

namespace common;

/**
 * sfdc version 정보 테이블
 */
entity version_sfdc : managed {
    key if_id    : UUID not null                 @title: 'I/F ID';
        ver_sfdc : String(20) not null           @title: 'version(D + YYYY + MM + Seq(2자리))' @description : ''; //ex)D20250501
        tag      : String(1) not null            @title: 'C(candidate), F(final)';
        year     : String(4) not null            @title: '년';
        month    : String(2) not null            @title: '월';
        week     : String(2) not null            @title: '주';
        day      : String(2) not null            @title: '일';
        auto_yn  : Boolean default true not null @title: '자동/수동 배치 여부';
}
