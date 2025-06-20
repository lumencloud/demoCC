namespace common;

/**
 * interface 배치 목록 마스터
 */
entity interface_master {
    key if_step          : String(20)  @title: '인터페이스 단계 (RCV/TRSF)';
    key source           : String(30)  @title: '데이터 출처';
    key table_name       : String(30)  @title: '데이터 처리 대상 테이블 명';
        procedure_name   : String(50)  @title: '실행대상 명';
        ax_if_id         : String(10)  @title: '인터페이스 ID';
        if_name          : String(50)  @title: '인터페이스 명';
        description      : String(500) @title: '설명';
        execute_order    : Integer     @title: '인터페이스 수행 순서';
        namespace        : String(10)  @title: '인터페이스 대상 네임스페이스';
        api              : String(100)  @title: '인터페이스 호출 API (RCV 만 해당)';
        api_parameter    : String(100) @title: 'IS API 호출 파라미터';
        is_yn            : Boolean     @title: 'IS 인터페이스 방식 여부';
        direct_yn        : Boolean     @title: '컨버전 없이 데이터 그대로 적재 여부';
        conversion_logic : String(500) @title: '데이터 컨버전 로직';
        use_yn           : Boolean     @title: '사용여부';
        represent_yn     : Boolean     @title: '대표여부 (로그처리용)';
        dev_complete_yn  : Boolean     @title: '개발여부 (임시)';
}
