/**
 * 등록일 : 250410
 */

namespace sga;

/**
 * SG&A 경비 월추정 I/F 테이블
 */
entity if_expense {
    key ver             : String(20)          @title: '인터페이스 버전';
        flag            : String(10)          @title: '인터페이스 상태';
    key year            : String(4) not null  @title: '회계연도';
    key month           : String(2) not null  @title: '마감월';
    key ccorg_cd        : String(10) not null @title: 'ERP Cost Center';
    key gl_account      : String(10) not null @title: '계정코드';
        commitment_item : String(24) not null @title: '중계정';
        exp_m1_amt      : Decimal(18, 2)      @title: '1월 경비 금액';
        exp_m2_amt      : Decimal(18, 2)      @title: '2월 경비 금액';
        exp_m3_amt      : Decimal(18, 2)      @title: '3월 경비 금액';
        exp_m4_amt      : Decimal(18, 2)      @title: '4월 경비 금액';
        exp_m5_amt      : Decimal(18, 2)      @title: '5월 경비 금액';
        exp_m6_amt      : Decimal(18, 2)      @title: '6월 경비 금액';
        exp_m7_amt      : Decimal(18, 2)      @title: '7월 경비 금액';
        exp_m8_amt      : Decimal(18, 2)      @title: '8월 경비 금액';
        exp_m9_amt      : Decimal(18, 2)      @title: '9월 경비 금액';
        exp_m10_amt     : Decimal(18, 2)      @title: '10월 경비 금액';
        exp_m11_amt     : Decimal(18, 2)      @title: '11월 경비 금액';
        exp_m12_amt     : Decimal(18, 2)      @title: '12월 경비 금액';
        shared_exp_yn   : String(1)           @title: '전사 SG&A 항목';
        CREATEDAT      : Timestamp     @title: '인터페이스 데이터 생성일';
}
