namespace pl;

/**
 * Platform I/F 테이블
 */
entity if_platform {
    key ver              : String(20)     @title: '인터페이스 버전';
        flag             : String(10)     @title: '인터페이스 상태';
    key year_month       : String(6)      @title: '마감년월';
    key prj_no           : String(20)     @title: '프로젝트 번호';
    key seq              : Integer        @title: 'Platform 구분 pk';
        prj_nm           : String(300)    @title: '프로젝트 Desc.';
        biz_opp_no       : String(30)     @title: '사업기회 번호';
        cstco_cd         : String(20)     @title: '고객사 코드';
        sale_ccorg_cd    : String(20)     @title: '매출 조직 코드(cc_code)';
        // 아래 컬럼은 quote_target_no 대표 프로젝트 정보에서 가져옴
        // rodr_ccorg_cd    : String(20)     @title: '수주 조직 코드';
        // cnrc_dt          : Date           @title: '수주 계약 일자';
        // prj_prfm_str_dt  : String(8)      @title: '사업수행 시작일자';
        // prj_prfm_end_dt  : String(8)      @title: '사업수행 종료일자';
        // crov_div_yn      : String(1)      @title: '이월 여부';
        // ovse_biz_yn      : String(1)      @title: '해외 사업 여부';
        // relsco_yn        : String(1)      @title: '관계사 여부';
        // prj_tp_cd        : String(20)     @title: '프로젝트 유형 코드';
        quote_issue_no   : String(20)     @title: '견적발행번호';
        quote_target_no  : String(20)     @title: '견적대상번호';
        dt_tp            : String(20)     @title: 'DT TYPE';
        tech_nm          : String(40)     @title: '적용기술(명)';
        brand_nm         : String(100)    @title: '브랜드(명)';
        cnvg_biz_yn      : String(1)      @title: '융복합사업여부';
        sale_m1_amt      : Decimal(18, 2) @title: '매출 1월 금액';
        sale_m2_amt      : Decimal(18, 2) @title: '매출 2월 금액';
        sale_m3_amt      : Decimal(18, 2) @title: '매출 3월 금액';
        sale_m4_amt      : Decimal(18, 2) @title: '매출 4월 금액';
        sale_m5_amt      : Decimal(18, 2) @title: '매출 5월 금액';
        sale_m6_amt      : Decimal(18, 2) @title: '매출 6월 금액';
        sale_m7_amt      : Decimal(18, 2) @title: '매출 7월 금액';
        sale_m8_amt      : Decimal(18, 2) @title: '매출 8월 금액';
        sale_m9_amt      : Decimal(18, 2) @title: '매출 9월 금액';
        sale_m10_amt     : Decimal(18, 2) @title: '매출 10월 금액';
        sale_m11_amt     : Decimal(18, 2) @title: '매출 11월 금액';
        sale_m12_amt     : Decimal(18, 2) @title: '매출 12월 금액';
        prj_prfm_m1_amt  : Decimal(18, 2) @title: '수행 1월 금액';
        prj_prfm_m2_amt  : Decimal(18, 2) @title: '수행 2월 금액';
        prj_prfm_m3_amt  : Decimal(18, 2) @title: '수행 3월 금액';
        prj_prfm_m4_amt  : Decimal(18, 2) @title: '수행 4월 금액';
        prj_prfm_m5_amt  : Decimal(18, 2) @title: '수행 5월 금액';
        prj_prfm_m6_amt  : Decimal(18, 2) @title: '수행 6월 금액';
        prj_prfm_m7_amt  : Decimal(18, 2) @title: '수행 7월 금액';
        prj_prfm_m8_amt  : Decimal(18, 2) @title: '수행 8월 금액';
        prj_prfm_m9_amt  : Decimal(18, 2) @title: '수행 9월 금액';
        prj_prfm_m10_amt : Decimal(18, 2) @title: '수행 10월 금액';
        prj_prfm_m11_amt : Decimal(18, 2) @title: '수행 11월 금액';
        prj_prfm_m12_amt : Decimal(18, 2) @title: '수행 12월 금액';
        eai_pcs_dttm     : Timestamp      @title: 'EAI I/F 처리시간';
        eai_data_seq     : Integer        @title: 'EAI 시퀀스';
        eai_crud_cd      : String(1)      @title: 'EAI 처리 코드';
}
