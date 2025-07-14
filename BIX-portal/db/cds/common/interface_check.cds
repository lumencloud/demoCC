using {
    managed,
    cuid
} from '@sap/cds/common';

namespace common;

/**
 * 인터페이스 결과 확인 여부
 */
entity interface_check : managed, cuid {
    key ver        : String(20) @title: '버전 번호';
    key uuid       : UUID       @title: '버전 구분자';
    key if_step    : String(20) @title: '인터페이스 단계 (RCV/TRSF)';
    key source     : String(30) @title: '데이터 출처';
    key table_name : String(30) @title: '데이터 처리 대상 테이블 명';
        confirm_yn : Boolean    @title: '관리자 확인여부';
};
