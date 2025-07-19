namespace pl;

/**
 * 2024 어카운트 실적 조정용
 */
entity account_convert {
    key ver               : String(20)     @title: '인터페이스 버전';
    key year              : String(6)      @title: '회계연도';
    key month             : String(6)      @title: '마감월';
    key biz_tp_account_cd : String(30)     @title: 'Account 구분 코드';
        biz_tp_account_nm : String(30)     @title: 'Account 구분 코드명';
    key rodr_ccorg_cd     : String(20)     @title: '수주 조직 코드';
        sale_m1_amt       : Decimal(18, 2) @title: '매출 1월 금액';
        sale_m2_amt       : Decimal(18, 2) @title: '매출 2월 금액';
        sale_m3_amt       : Decimal(18, 2) @title: '매출 3월 금액';
        sale_m4_amt       : Decimal(18, 2) @title: '매출 4월 금액';
        sale_m5_amt       : Decimal(18, 2) @title: '매출 5월 금액';
        sale_m6_amt       : Decimal(18, 2) @title: '매출 6월 금액';
        sale_m7_amt       : Decimal(18, 2) @title: '매출 7월 금액';
        sale_m8_amt       : Decimal(18, 2) @title: '매출 8월 금액';
        sale_m9_amt       : Decimal(18, 2) @title: '매출 9월 금액';
        sale_m10_amt      : Decimal(18, 2) @title: '매출 10월 금액';
        sale_m11_amt      : Decimal(18, 2) @title: '매출 11월 금액';
        sale_m12_amt      : Decimal(18, 2) @title: '매출 12월 금액';
}
