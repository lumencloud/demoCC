namespace common;

/**
 * 조직 I/F 테이블
 */
entity if_org {
    key ver            : String(20)    @title: '인터페이스 버전';
        flag           : String(10)    @title: '인터페이스 상태';
    key org_id         : String(20)    @title: '조직 ID';
        name           : String(50)    @title: '조직 이름';
        parent         : String(10)    @title: '상위조직 ID';
        rank           : String(100)   @title: '정렬 순서';
        s_date         : String(10)    @title: '시작일';
        e_date         : String(10)    @title: '종료일';
        org_type       : Decimal(5, 2) @title: 'org_type';
        status         : String(1)     @title: '사용 여부';
        cost_center    : String(8)     @title: 'ERP CC조직_코드';
        org_gubun      : String(10)    @title: '조직 코드';
        eai_pcs_dttm   : Timestamp     @title: 'EAI I/F 처리시간';
        eai_data_seq   : Integer       @title: 'EAI 시퀀스';
        eai_crud_cd    : String(1)     @title: 'EAI 처리 코드';
        create_time    : Timestamp     @title: '생성시간';
        create_user_id : String(255)   @title: '생성자';
        change_time    : Timestamp     @title: '변경시간';
        change_user_id : String(255)   @title: '변경자';
        CREATEDAT      : Timestamp     @title: '인터페이스 데이터 생성일';
}
