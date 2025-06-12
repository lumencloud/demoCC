/**
 * 등록일 : 250430
 */

namespace sc;

/**
 * 자회사 SG&A 인건비 I/F 테이블
 */
entity if_labor {
        // ver             : String(20)          @title: '인터페이스 버전';
        flag            : String(10)          @title: '인터페이스 상태';
    key year            : String(4) not null  @title: '년 ';
    key month           : String(2) not null  @title: '추정 월';
    key ccorg_cd        : String(10) not null @title: 'ERP CC조직_코드';
    key gl_account      : String(10) not null @title: '계정코드';
        commitment_item : String(24) not null @title: 'Commitment Item(중계정)';
        labor_m1_amt    : Decimal(18, 2)      @title: '1월 경비 금액';
        labor_m2_amt    : Decimal(18, 2)      @title: '2월 경비 금액';
        labor_m3_amt    : Decimal(18, 2)      @title: '3월 경비 금액';
        labor_m4_amt    : Decimal(18, 2)      @title: '4월 경비 금액';
        labor_m5_amt    : Decimal(18, 2)      @title: '5월 경비 금액';
        labor_m6_amt    : Decimal(18, 2)      @title: '6월 경비 금액';
        labor_m7_amt    : Decimal(18, 2)      @title: '7월 경비 금액';
        labor_m8_amt    : Decimal(18, 2)      @title: '8월 경비 금액';
        labor_m9_amt    : Decimal(18, 2)      @title: '9월 경비 금액';
        labor_m10_amt   : Decimal(18, 2)      @title: '10월 경비 금액';
        labor_m11_amt   : Decimal(18, 2)      @title: '11월 경비 금액';
        labor_m12_amt   : Decimal(18, 2)      @title: '12월 경비 금액';
}
