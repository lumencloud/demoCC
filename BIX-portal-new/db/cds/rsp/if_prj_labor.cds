namespace rsp;

// 이름은 year_month 인데 month 만 들어있는 컬럼 컬럼명..

/**
 * 프로젝트 월 별 인건비 I/F 테이블
 */
entity if_prj_labor {
    key ver           : String(20)              @title: '인터페이스 버전';
        flag          : String(10)              @title: '인터페이스 상태';
    key year          : String(4) not null      @title: '회계연도';
    key month         : String(2)               @title: '월' @description : '1~12월 금액 / 마감월 의미X';
    key year_month    : String(6) not null      @title: '마감연월';
    key ccorg_cd      : String(10) not null     @title: '투입 인건비 귀속 코스트센터';
    key prj_no        : String(30) not null     @title: '프로젝트 번호';
        actual_yn     : Boolean                 @title: '실적여부';
        bill_amt      : Decimal(18, 2) not null @title: '빌링 인건비';
        indirect_cost : Decimal(18, 2)          @title: '사내 간접비';
        eai_pcs_dttm  : Timestamp               @title: 'EAI I/F 처리시간';
        eai_data_seq  : Integer                 @title: 'EAI 시퀀스';
        eai_crud_cd   : String(1)               @title: 'EAI 처리 코드';
}
