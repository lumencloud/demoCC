namespace common;

/**
 * batch_log 배치 로그를 관리하는 테이블
 */
entity interface_log {
    key ver            : String(20)                     @title: '버전 번호';
    key uuid           : UUID                           @title: '버전 구분자';
        // key if_unit        : String(20)                     @title: '인터페이스 수행단위 (ERP, PL, ...)';
    key if_step        : String(20)                     @title: '인터페이스 단계 (RCV/TRSF)';
    key source         : String(30)                     @title: '데이터 출처';
    key table_name     : String(30)                     @title: '데이터 처리 대상 테이블 명';
        procedure_name : String(50)                     @title: '실행대상 명';
        CREATEDAT      : Timestamp default $now         @title: '로그 생성시점';
        execute_time   : Integer                        @title: '배치로직 수행시간';
        row_count      : Integer                        @title: '인터페이스 데이터 처리 건 수';
        success_yn     : Boolean default false not null @title: '성공 여부';
        err_cd         : String(20)                     @title: '에러코드';
        log            : String(500)                    @title: '로그';
}
