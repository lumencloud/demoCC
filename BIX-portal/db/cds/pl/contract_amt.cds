using {managed} from '@sap/cds/common';

namespace pl;

/**
 * 수주금액 테이블
 */
entity contract_amt : managed {
        ver                : String(20)          @title: '인터페이스 버전';
    key year               : String(4) not null  @title: '연도';
    key prj_no_sfdc        : String(20) not null @title: '사업기회 매출귀속조직 ID';
        prj_no             : String(13)          @title: '프로젝트 번호';
        // prj_prfm_str_dt    : Date not null        @title: '프로젝트 시작일';
        // prj_prfm_end_dt    : Date not null        @title: '프로젝트 종료일';
        // prj_tp_nm          : String(20) not null  @title: '프로젝트 타입명';
        biz_opp_no_sfdc    : String(18) not null @title: '사업기회 ID';
        biz_opp_no         : String(8)           @title: '사업기회번호';
        biz_opp_nm         : String(120)         @title: '사업기회명';
        dgtr_task_cd       : String(30)          @title: 'DT과제 코드';
        biz_tp_account_cd  : String(30)          @title: 'Account 구분 코드';
        // deal_stage_cd      : String(20) not null  @title: 'Deal Stage';
        // cstco_cd           : String(10) not null  @title: '고객사 코드';
        // cstco_name         : String(100) not null @title: '고객사 명';
        // rodr_ccorg_cd      : String(6)            @title: '수주조직 코드';
        // sale_ccorg_cd      : String(6) not null   @title: '매출조직 코드';
        prj_target_m1_amt  : Decimal(18, 2)      @title: '수주목표액 1월';
        prj_target_m2_amt  : Decimal(18, 2)      @title: '수주목표액 2월';
        prj_target_m3_amt  : Decimal(18, 2)      @title: '수주목표액 3월';
        prj_target_m4_amt  : Decimal(18, 2)      @title: '수주목표액 4월';
        prj_target_m5_amt  : Decimal(18, 2)      @title: '수주목표액 5월';
        prj_target_m6_amt  : Decimal(18, 2)      @title: '수주목표액 6월';
        prj_target_m7_amt  : Decimal(18, 2)      @title: '수주목표액 7월';
        prj_target_m8_amt  : Decimal(18, 2)      @title: '수주목표액 8월';
        prj_target_m9_amt  : Decimal(18, 2)      @title: '수주목표액 9월';
        prj_target_m10_amt : Decimal(18, 2)      @title: '수주목표액 10월';
        prj_target_m11_amt : Decimal(18, 2)      @title: '수주목표액 11월';
        prj_target_m12_amt : Decimal(18, 2)      @title: '수주목표액 12월';
}
