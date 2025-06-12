/**
 * 등록일 : 250531
 */

namespace sga;

/**
 * SG&A 위임 경비 월추정 I/F 테이블
 */
entity if_expense_co {
    key ver             : String(20)          @title: '인터페이스 버전';
        flag            : String(10)          @title: '인터페이스 상태';
    key year            : String(4) not null  @title: '년 ';
    key month           : String(2) not null  @title: '추정 월';
    key ccorg_cd        : String(10) not null @title: 'ERP CC조직_코드';
    key gl_account      : String(10) not null @title: '계정코드';
        commitment_item : String(24) not null @title: 'Commitment Item(중계정)';
        co_m1_amt      : Decimal(18, 2)      @title: '1월 위임 비용';
        co_m2_amt      : Decimal(18, 2)      @title: '2월 위임 비용';
        co_m3_amt      : Decimal(18, 2)      @title: '3월 위임 비용';
        co_m4_amt      : Decimal(18, 2)      @title: '4월 위임 비용';
        co_m5_amt      : Decimal(18, 2)      @title: '5월 위임 비용';
        co_m6_amt      : Decimal(18, 2)      @title: '6월 위임 비용';
        co_m7_amt      : Decimal(18, 2)      @title: '7월 위임 비용';
        co_m8_amt      : Decimal(18, 2)      @title: '8월 위임 비용';
        co_m9_amt      : Decimal(18, 2)      @title: '9월 위임 비용';
        co_m10_amt     : Decimal(18, 2)      @title: '10월 위임 비용';
        co_m11_amt     : Decimal(18, 2)      @title: '11월 위임 비용';
        co_m12_amt     : Decimal(18, 2)      @title: '12월 위임 비용';
}
