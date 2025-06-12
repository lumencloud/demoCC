/**
 * 등록일 : 250410
 */

namespace sga;

/**
 * SG&A 투자 월추정 I/F 테이블
 */
entity if_investment {
    key ver             : String(20)          @title: '인터페이스 버전';
        flag            : String(10)          @title: '인터페이스 상태';
    key year            : String(4) not null  @title: '추정 년';
    key month           : String(2) not null  @title: '추정 월';
    key prj_no          : String(13) not null @title: '프로젝트 no.';
    key ccorg_cd        : String(10) not null @title: 'ERP CC조직_코드';
    key gl_account      : String(10) not null @title: '계정코드';
        commitment_item : String(24) not null @title: 'Commitment Item(중계정)';
        asset_yn        : String(1) not null  @title: '자산화 여부';
        iv_cash_m1_amt  : Decimal(18, 2)      @title: '1월 Cash 금액';
        iv_cash_m2_amt  : Decimal(18, 2)      @title: '2월 Cash 금액';
        iv_cash_m3_amt  : Decimal(18, 2)      @title: '3월 Cash 금액';
        iv_cash_m4_amt  : Decimal(18, 2)      @title: '4월 Cash 금액';
        iv_cash_m5_amt  : Decimal(18, 2)      @title: '5월 Cash 금액';
        iv_cash_m6_amt  : Decimal(18, 2)      @title: '6월 Cash 금액';
        iv_cash_m7_amt  : Decimal(18, 2)      @title: '7월 Cash 금액';
        iv_cash_m8_amt  : Decimal(18, 2)      @title: '8월 Cash 금액';
        iv_cash_m9_amt  : Decimal(18, 2)      @title: '9월 Cash 금액';
        iv_cash_m10_amt : Decimal(18, 2)      @title: '10월 Cash 금액';
        iv_cash_m11_amt : Decimal(18, 2)      @title: '11월 Cash 금액';
        iv_cash_m12_amt : Decimal(18, 2)      @title: '12월 Cash 금액';
        iv_cost_m1_amt  : Decimal(18, 2)      @title: '1월 Cost 금액';
        iv_cost_m2_amt  : Decimal(18, 2)      @title: '2월 Cost 금액';
        iv_cost_m3_amt  : Decimal(18, 2)      @title: '3월 Cost 금액';
        iv_cost_m4_amt  : Decimal(18, 2)      @title: '4월 Cost 금액';
        iv_cost_m5_amt  : Decimal(18, 2)      @title: '5월 Cost 금액';
        iv_cost_m6_amt  : Decimal(18, 2)      @title: '6월 Cost 금액';
        iv_cost_m7_amt  : Decimal(18, 2)      @title: '7월 Cost 금액';
        iv_cost_m8_amt  : Decimal(18, 2)      @title: '8월 Cost 금액';
        iv_cost_m9_amt  : Decimal(18, 2)      @title: '9월 Cost 금액';
        iv_cost_m10_amt : Decimal(18, 2)      @title: '10월 Cost 금액';
        iv_cost_m11_amt : Decimal(18, 2)      @title: '11월 Cost 금액';
        iv_cost_m12_amt : Decimal(18, 2)      @title: '12월 Cost 금액';
        ingested_at     : Timestamp           @title: 'ERP 전송시간';

}
