namespace sc;

// prj_no ccorg_cd 수기 입력인데 키/ not null 조건 ,,,
// 컬럼 정의 재확인

/**
 * 자회사 수주매출 실적 I/F 테이블
 */
entity if_pl {
        // ver              : String(20)         @title: '인터페이스 버전';
        flag             : String(10)         @title: '인터페이스 상태';
    key year             : String(6)          @title: '회계연도';
    key month            : String(6)          @title: '추정월';
    key prj_no           : String(20)         @title: '프로젝트 번호';
        prj_desc         : String(300)        @title: '프로젝트 Desc.';
        cstco_cd         : String(10)         @title: '고객사 코드';
        cstco_nm         : String(100)        @title: '고객사 명';
        rodr_ccorg_cd    : String(8) not null @title: '수주 조직 코드(cc_code)';
        sale_ccorg_cd    : String(8) not null @title: '매출 조직 코드(cc_code)';
        sale_m1_amt      : Decimal(18, 2)     @title: '매출 1월 금액';
        sale_m2_amt      : Decimal(18, 2)     @title: '매출 2월 금액';
        sale_m3_amt      : Decimal(18, 2)     @title: '매출 3월 금액';
        sale_m4_amt      : Decimal(18, 2)     @title: '매출 4월 금액';
        sale_m5_amt      : Decimal(18, 2)     @title: '매출 5월 금액';
        sale_m6_amt      : Decimal(18, 2)     @title: '매출 6월 금액';
        sale_m7_amt      : Decimal(18, 2)     @title: '매출 7월 금액';
        sale_m8_amt      : Decimal(18, 2)     @title: '매출 8월 금액';
        sale_m9_amt      : Decimal(18, 2)     @title: '매출 9월 금액';
        sale_m10_amt     : Decimal(18, 2)     @title: '매출 10월 금액';
        sale_m11_amt     : Decimal(18, 2)     @title: '매출 11월 금액';
        sale_m12_amt     : Decimal(18, 2)     @title: '매출 12월 금액';
        prj_prfm_m1_amt  : Decimal(18, 2)     @title: '수행 1월 금액';
        prj_prfm_m2_amt  : Decimal(18, 2)     @title: '수행 2월 금액';
        prj_prfm_m3_amt  : Decimal(18, 2)     @title: '수행 3월 금액';
        prj_prfm_m4_amt  : Decimal(18, 2)     @title: '수행 4월 금액';
        prj_prfm_m5_amt  : Decimal(18, 2)     @title: '수행 5월 금액';
        prj_prfm_m6_amt  : Decimal(18, 2)     @title: '수행 6월 금액';
        prj_prfm_m7_amt  : Decimal(18, 2)     @title: '수행 7월 금액';
        prj_prfm_m8_amt  : Decimal(18, 2)     @title: '수행 8월 금액';
        prj_prfm_m9_amt  : Decimal(18, 2)     @title: '수행 9월 금액';
        prj_prfm_m10_amt : Decimal(18, 2)     @title: '수행 10월 금액';
        prj_prfm_m11_amt : Decimal(18, 2)     @title: '수행 11월 금액';
        prj_prfm_m12_amt : Decimal(18, 2)     @title: '수행 12월 금액';
        margin_m1_amt    : Decimal(18, 2)     @title: '마진 1월 금액';
        margin_m2_amt    : Decimal(18, 2)     @title: '마진 2월 금액';
        margin_m3_amt    : Decimal(18, 2)     @title: '마진 3월 금액';
        margin_m4_amt    : Decimal(18, 2)     @title: '마진 4월 금액';
        margin_m5_amt    : Decimal(18, 2)     @title: '마진 5월 금액';
        margin_m6_amt    : Decimal(18, 2)     @title: '마진 6월 금액';
        margin_m7_amt    : Decimal(18, 2)     @title: '마진 7월 금액';
        margin_m8_amt    : Decimal(18, 2)     @title: '마진 8월 금액';
        margin_m9_amt    : Decimal(18, 2)     @title: '마진 9월 금액';
        margin_m10_amt   : Decimal(18, 2)     @title: '마진 10월 금액';
        margin_m11_amt   : Decimal(18, 2)     @title: '마진 11월 금액';
        margin_m12_amt   : Decimal(18, 2)     @title: '마진 12월 금액';
}
