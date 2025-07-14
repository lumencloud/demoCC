namespace pl;

/**
 * 매출 장판지 I/F 테이블
 */
entity if_wideview {
    key ver             : String(20)     @title: '인터페이스 버전';
        flag            : String(10)     @title: '인터페이스 상태';
    key year            : Integer        @title: '회계연도';
    key month           : Integer        @title: '마감월';
        biz_opp_no      : String(24)     @title: '사업기회번호';
    key prj_no          : String(20)     @title: '프로젝트 번호';
        biz_opp_desc    : String(120)    @title: '사업기회 Desc';
        prj_desc        : String(300)    @title: '프로젝트 Desc.';
        prj_tp_cd       : String(2)      @title: '프로젝트 유형 코드';
        prj_tp_nm       : String(40)     @title: '프로젝트 유형 명';
        prj_prfm_str_dt : String(10)     @title: '사업수행 시작일자';
        prj_prfm_end_dt : String(10)     @title: '사업수행 종료일자';
        sale_ccorg_cd   : String(10)     @title: '매출조직 코드';
        sale_ccorg_nm   : String(50)     @title: '매출조직 명';
        cstco_cd        : String(10)     @title: '고객 코드';
        cstco_nm        : String(35)     @title: '고객 명';
        revenue_m1_amt  : Decimal(18, 2) @title: '1월 진행매출';
        revenue_m2_amt  : Decimal(18, 2) @title: '2월 진행매출';
        revenue_m3_amt  : Decimal(18, 2) @title: '3월 진행매출';
        revenue_m4_amt  : Decimal(18, 2) @title: '4월 진행매출';
        revenue_m5_amt  : Decimal(18, 2) @title: '5월 진행매출';
        revenue_m6_amt  : Decimal(18, 2) @title: '6월 진행매출';
        revenue_m7_amt  : Decimal(18, 2) @title: '7월 진행매출';
        revenue_m8_amt  : Decimal(18, 2) @title: '8월 진행매출';
        revenue_m9_amt  : Decimal(18, 2) @title: '9월 진행매출';
        revenue_m10_amt : Decimal(18, 2) @title: '10월 진행매출';
        revenue_m11_amt : Decimal(18, 2) @title: '11월 진행매출';
        revenue_m12_amt : Decimal(18, 2) @title: '12월 진행매출';
        tcost_m1_amt    : Decimal(18, 2) @title: '1월 원가';
        tcost_m2_amt    : Decimal(18, 2) @title: '2월 원가';
        tcost_m3_amt    : Decimal(18, 2) @title: '3월 원가';
        tcost_m4_amt    : Decimal(18, 2) @title: '4월 원가';
        tcost_m5_amt    : Decimal(18, 2) @title: '5월 원가';
        tcost_m6_amt    : Decimal(18, 2) @title: '6월 원가';
        tcost_m7_amt    : Decimal(18, 2) @title: '7월 원가';
        tcost_m8_amt    : Decimal(18, 2) @title: '8월 원가';
        tcost_m9_amt    : Decimal(18, 2) @title: '9월 원가';
        tcost_m10_amt   : Decimal(18, 2) @title: '10월 원가';
        tcost_m11_amt   : Decimal(18, 2) @title: '11월 원가';
        tcost_m12_amt   : Decimal(18, 2) @title: '12월 원가';
        fx_waers        : String(5)      @title: '계약통화(FX)';
        fx_rev1_amt     : Decimal(18, 2) @title: '1월 매출 FX';
        fx_rev2_amt     : Decimal(18, 2) @title: '2월 매출 FX';
        fx_rev3_amt     : Decimal(18, 2) @title: '3월 매출 FX';
        fx_rev4_amt     : Decimal(18, 2) @title: '4월 매출 FX';
        fx_rev5_amt     : Decimal(18, 2) @title: '5월 매출 FX';
        fx_rev6_amt     : Decimal(18, 2) @title: '6월 매출 FX';
        fx_rev7_amt     : Decimal(18, 2) @title: '7월 매출 FX';
        fx_rev8_amt     : Decimal(18, 2) @title: '8월 매출 FX';
        fx_rev9_amt     : Decimal(18, 2) @title: '9월 매출 FX';
        fx_rev10_amt    : Decimal(18, 2) @title: '10월 매출 FX';
        fx_rev11_amt    : Decimal(18, 2) @title: '11월 매출 FX';
        fx_rev12_amt    : Decimal(18, 2) @title: '12월 매출 FX';
        CREATEDAT       : Timestamp      @title: '인터페이스 데이터 생성일';
}
