using {managed} from '@sap/cds/common';

namespace pl;

/**
 * SFDC 계약완료 프로젝트
 */
entity sfdc_contract : managed {
    key ver                    : String(20)          @title: '인터페이스 버전';
    key id                     : String(18)          @title: 'SFDC record_id 데이터 구분키';
    key year                   : String(4) not null  @title: '연도';
        prj_no_sfdc            : String(20)          @title: '사업기회 매출귀속조직 ID';
        prj_no                 : String(20)          @title: '프로젝트 번호';
        prj_prfm_str_dt        : Date                @title: '프로젝트 시작일';
        prj_prfm_end_dt        : Date                @title: '프로젝트 종료일';
        prj_tp_cd              : String(20)          @title: '프로젝트 타입코드명';
        prj_tp_nm              : String(20)          @title: '프로젝트 타입명';
        biz_opp_no_sfdc        : String(18) not null @title: '사업기회 ID';
        biz_opp_no             : String(8)           @title: '사업기회번호';
        biz_opp_nm             : String(120)         @title: '사업기회명';
        deal_stage_cd          : String(20) not null @title: 'Deal Stage';
        deal_stage_chg_dt      : Date                @title: 'Deal Stage 변경일';
        cstco_cd               : String(10)          @title: '고객사 코드';
        cstco_name             : String(100)         @title: '고객사 명';
        rodr_ccorg_cd          : String(6)           @title: '수주조직 코드';
        sale_ccorg_cd          : String(6)           @title: '매출조직 코드';
        dgtr_task_cd           : String(30)          @title: 'DT과제 코드';
        biz_tp_account_cd      : String(30)          @title: 'Account 구분 코드';
        cls_rsn_tp_cd          : String(30)          @title: '사업기회 종료 구분코드';
        cls_rsn_tp_nm          : String(30)          @title: '사업기회 종료 구분명';
        bd_n2_cd               : String(20)          @title: '비즈니스도메인 2';
        relsco_yn              : Boolean             @title: '관계사 여부';
        expected_contract_date : Date                @title: '예상 계약일자';
        margin_rate            : Decimal(5, 2)       @title: '목표수익률';
        rodr_m1_amt            : Decimal(18, 2)      @title: '수주 1월 금액';   @description : 'prj_target_m1_amt '
        rodr_m2_amt            : Decimal(18, 2)      @title: '수주 2월 금액';   @description : 'prj_target_m2_amt '
        rodr_m3_amt            : Decimal(18, 2)      @title: '수주 3월 금액';   @description : 'prj_target_m3_amt '
        rodr_m4_amt            : Decimal(18, 2)      @title: '수주 4월 금액';   @description : 'prj_target_m4_amt '
        rodr_m5_amt            : Decimal(18, 2)      @title: '수주 5월 금액';   @description : 'prj_target_m5_amt '
        rodr_m6_amt            : Decimal(18, 2)      @title: '수주 6월 금액';   @description : 'prj_target_m6_amt '
        rodr_m7_amt            : Decimal(18, 2)      @title: '수주 7월 금액';   @description : 'prj_target_m7_amt '
        rodr_m8_amt            : Decimal(18, 2)      @title: '수주 8월 금액';   @description : 'prj_target_m8_amt '
        rodr_m9_amt            : Decimal(18, 2)      @title: '수주 9월 금액';   @description : 'prj_target_m9_amt '
        rodr_m10_amt           : Decimal(18, 2)      @title: '수주 10월 금액';  @description : 'prj_target_m10_amt'
        rodr_m11_amt           : Decimal(18, 2)      @title: '수주 11월 금액';  @description : 'prj_target_m11_amt'
        rodr_m12_amt           : Decimal(18, 2)      @title: '수주 12월 금액';  @description : 'prj_target_m12_amt'
        sale_m1_amt            : Decimal(18, 2)      @title: '매출 1월 금액';
        sale_m2_amt            : Decimal(18, 2)      @title: '매출 2월 금액';
        sale_m3_amt            : Decimal(18, 2)      @title: '매출 3월 금액';
        sale_m4_amt            : Decimal(18, 2)      @title: '매출 4월 금액';
        sale_m5_amt            : Decimal(18, 2)      @title: '매출 5월 금액';
        sale_m6_amt            : Decimal(18, 2)      @title: '매출 6월 금액';
        sale_m7_amt            : Decimal(18, 2)      @title: '매출 7월 금액';
        sale_m8_amt            : Decimal(18, 2)      @title: '매출 8월 금액';
        sale_m9_amt            : Decimal(18, 2)      @title: '매출 9월 금액';
        sale_m10_amt           : Decimal(18, 2)      @title: '매출 10월 금액';
        sale_m11_amt           : Decimal(18, 2)      @title: '매출 11월 금액';
        sale_m12_amt           : Decimal(18, 2)      @title: '매출 12월 금액';
        prj_prfm_m1_amt        : Decimal(18, 2)      @title: '수행 1월 금액';   @description : 'prj_cost_m1_amt '
        prj_prfm_m2_amt        : Decimal(18, 2)      @title: '수행 2월 금액';   @description : 'prj_cost_m2_amt '
        prj_prfm_m3_amt        : Decimal(18, 2)      @title: '수행 3월 금액';   @description : 'prj_cost_m3_amt '
        prj_prfm_m4_amt        : Decimal(18, 2)      @title: '수행 4월 금액';   @description : 'prj_cost_m4_amt '
        prj_prfm_m5_amt        : Decimal(18, 2)      @title: '수행 5월 금액';   @description : 'prj_cost_m5_amt '
        prj_prfm_m6_amt        : Decimal(18, 2)      @title: '수행 6월 금액';   @description : 'prj_cost_m6_amt '
        prj_prfm_m7_amt        : Decimal(18, 2)      @title: '수행 7월 금액';   @description : 'prj_cost_m7_amt '
        prj_prfm_m8_amt        : Decimal(18, 2)      @title: '수행 8월 금액';   @description : 'prj_cost_m8_amt '
        prj_prfm_m9_amt        : Decimal(18, 2)      @title: '수행 9월 금액';   @description : 'prj_cost_m9_amt '
        prj_prfm_m10_amt       : Decimal(18, 2)      @title: '수행 10월 금액';  @description : 'prj_cost_m10_amt'
        prj_prfm_m11_amt       : Decimal(18, 2)      @title: '수행 11월 금액';  @description : 'prj_cost_m11_amt'
        prj_prfm_m12_amt       : Decimal(18, 2)      @title: '수행 12월 금액';  @description : 'prj_cost_m12_amt'
        margin_m1_amt          : Decimal(18, 2)      @title: '마진 1월 금액';
        margin_m2_amt          : Decimal(18, 2)      @title: '마진 2월 금액';
        margin_m3_amt          : Decimal(18, 2)      @title: '마진 3월 금액';
        margin_m4_amt          : Decimal(18, 2)      @title: '마진 4월 금액';
        margin_m5_amt          : Decimal(18, 2)      @title: '마진 5월 금액';
        margin_m6_amt          : Decimal(18, 2)      @title: '마진 6월 금액';
        margin_m7_amt          : Decimal(18, 2)      @title: '마진 7월 금액';
        margin_m8_amt          : Decimal(18, 2)      @title: '마진 8월 금액';
        margin_m9_amt          : Decimal(18, 2)      @title: '마진 9월 금액';
        margin_m10_amt         : Decimal(18, 2)      @title: '마진 10월 금액';
        margin_m11_amt         : Decimal(18, 2)      @title: '마진 11월 금액';
        margin_m12_amt         : Decimal(18, 2)      @title: '마진 12월 금액';

//         cnrc_dt
// prj_tp_nm
// si_os_div_cd
// bd_n1_cd
// bd_n2_cd
// bd_n3_cd
// bd_n4_cd
// bd_n5_cd
// bd_n6_cd
// biz_opp_no
// biz_opp_nm
// deal_stage_cd
// deal_stage_nm
// margin_rate
// dgtr_task_cd
// dgtr_task_nm
// biz_tp_account_cd
// cls_rsn_tp_cd
}
