using {managed} from '@sap/cds/common';

namespace common;

/**
 * version 정보 공통 테이블(SFCD 제외)
 */
entity version : managed {
    key if_id   : UUID not null                 @title: 'I/F ID';
        ver     : String(20) not null           @title: 'version(P + YYYY + MM + Seq(2자리))'; //ex)P20250501, P20250502...
        tag     : String(1) not null            @title: 'I(In Progress), C(Current 현재 버전), P(Pending 보류), O(Old 이전 성공건), E(Error), Y(전년도 실적 기준버전)';
        year    : String(4) not null            @title: '년';
        month   : String(2) not null            @title: '월';
        auto_yn : Boolean default true not null @title: '자동/수동 배치 여부';
}
