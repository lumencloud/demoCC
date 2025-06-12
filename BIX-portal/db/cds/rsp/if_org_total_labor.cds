namespace rsp;

/**
 * 조직 연도 별 총_인건비 I/F 테이블
 */
entity if_org_total_labor {
        ver           : String(20)          @title: '인터페이스 버전';
        flag          : String(10)          @title: '인터페이스 상태';
    key year          : String(4) not null  @title: '마감연월';
    key month         : String(2) not null  @title: '실적월';
    key ccorg_cd      : String(10) not null @title: '코스트센터';
        total_m1_amt  : Decimal(18, 2)      @title: '1월 총 인건비';
        total_m2_amt  : Decimal(18, 2)      @title: '2월 총 인건비';
        total_m3_amt  : Decimal(18, 2)      @title: '3월 총 인건비';
        total_m4_amt  : Decimal(18, 2)      @title: '4월 총 인건비';
        total_m5_amt  : Decimal(18, 2)      @title: '5월 총 인건비';
        total_m6_amt  : Decimal(18, 2)      @title: '6월 총 인건비';
        total_m7_amt  : Decimal(18, 2)      @title: '7월 총 인건비';
        total_m8_amt  : Decimal(18, 2)      @title: '8월 총 인건비';
        total_m9_amt  : Decimal(18, 2)      @title: '9월 총 인건비';
        total_m10_amt : Decimal(18, 2)      @title: '10월 총 인건비';
        total_m11_amt : Decimal(18, 2)      @title: '11월 총 인건비';
        total_m12_amt : Decimal(18, 2)      @title: '12월 총 인건비';
        total_m1_emp  : Integer             @title: '1월 총 인원';
        total_m2_emp  : Integer             @title: '2월 총 인원';
        total_m3_emp  : Integer             @title: '3월 총 인원';
        total_m4_emp  : Integer             @title: '4월 총 인원';
        total_m5_emp  : Integer             @title: '5월 총 인원';
        total_m6_emp  : Integer             @title: '6월 총 인원';
        total_m7_emp  : Integer             @title: '7월 총 인원';
        total_m8_emp  : Integer             @title: '8월 총 인원';
        total_m9_emp  : Integer             @title: '9월 총 인원';
        total_m10_emp : Integer             @title: '10월 총 인원';
        total_m11_emp : Integer             @title: '11월 총 인원';
        total_m12_emp : Integer             @title: '12월 총 인원';
        avg_m1_amt    : Decimal(18, 2)      @title: '1월 평균단가';
        avg_m2_amt    : Decimal(18, 2)      @title: '2월 평균단가';
        avg_m3_amt    : Decimal(18, 2)      @title: '3월 평균단가';
        avg_m4_amt    : Decimal(18, 2)      @title: '4월 평균단가';
        avg_m5_amt    : Decimal(18, 2)      @title: '5월 평균단가';
        avg_m6_amt    : Decimal(18, 2)      @title: '6월 평균단가';
        avg_m7_amt    : Decimal(18, 2)      @title: '7월 평균단가';
        avg_m8_amt    : Decimal(18, 2)      @title: '8월 평균단가';
        avg_m9_amt    : Decimal(18, 2)      @title: '9월 평균단가';
        avg_m10_amt   : Decimal(18, 2)      @title: '10월 평균단가';
        avg_m11_amt   : Decimal(18, 2)      @title: '11월 평균단가';
        avg_m12_amt   : Decimal(18, 2)      @title: '12월 평균단가';
}
