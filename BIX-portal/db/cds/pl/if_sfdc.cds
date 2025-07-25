using {common.org as org} from '../common/org';

namespace pl;

/**
 * SFDC I/F 테이블
 */
entity if_sfdc {
    key ver                    : String(20)     @title: '인터페이스 버전';
        flag                   : String(10)     @title: '인터페이스 상태';
    key id                     : String(18)     @title: 'SFDC record_id 데이터 구분키';
    key year                   : String(4)      @title: '연도';
        prj_no_sfdc            : String(20)     @title: '사업기회 매출귀속조직 ID';
        prj_no                 : String(20)     @title: '프로젝트 번호';
        // cnrc_dt                : Date           @title: '수주 계약 일자';
        prj_prfm_str_dt        : Date           @title: '프로젝트 시작일';
        prj_prfm_end_dt        : Date           @title: '프로젝트 종료일';
        prj_tp_nm              : String(20)     @title: '프로젝트 타입명';
        sales_ratio            : Decimal(5, 2)  @title: '매출액 비중';
        rodr_ccorg_cd          : String(8)      @title: '수주 조직 코드(cc_code)';
        sale_ccorg_cd          : String(6)      @title: '매출조직 코드';
        biz_opp_no_sfdc        : String(18)     @title: '사업기회 ID';
        biz_opp_no             : String(8)      @title: '사업기회번호';
        biz_opp_nm             : String(120)    @title: '사업기회명';
        deal_stage_cd          : String(20)     @title: 'Deal Stage';
        deal_stage_chg_dt      : Date           @title: 'Deal Stage 변경일';
        cstco_cd               : String(10)     @title: '고객사 코드';
        cstco_name             : String(100)    @title: '고객사 명';
        cstco_no_sfdc          : String(18)     @title: '고객사 코드 SFDC (임시고객사용)';
        dgtr_task_cd           : String(30)     @title: 'DT과제 코드';
        dgtr_task_nm           : String(30)     @title: 'DT과제 명';
        biz_tp_account_cd      : String(30)     @title: 'Account 구분 코드';
        biz_tp_account_nm      : String(30)     @title: 'Account 구분명';
        cls_rsn_tp_cd          : String(30)     @title: '사업기회 종료 구분코드';
        cls_rsn_tp_nm          : String(30)     @title: '사업기회 종료 구분명';
        bd_n2_cd               : String(20)     @title: '비즈니스도메인 2';
        relsco_yn              : Boolean        @title: '관계사 여부';
        expected_contract_date : Date           @title: '예상 계약일자';
        margin_rate            : Decimal(5, 2)  @title: '목표수익률';
        prj_target_m1_amt      : Decimal(18, 2) @title: '수주목표액 1월';
        prj_target_m2_amt      : Decimal(18, 2) @title: '수주목표액 2월';
        prj_target_m3_amt      : Decimal(18, 2) @title: '수주목표액 3월';
        prj_target_m4_amt      : Decimal(18, 2) @title: '수주목표액 4월';
        prj_target_m5_amt      : Decimal(18, 2) @title: '수주목표액 5월';
        prj_target_m6_amt      : Decimal(18, 2) @title: '수주목표액 6월';
        prj_target_m7_amt      : Decimal(18, 2) @title: '수주목표액 7월';
        prj_target_m8_amt      : Decimal(18, 2) @title: '수주목표액 8월';
        prj_target_m9_amt      : Decimal(18, 2) @title: '수주목표액 9월';
        prj_target_m10_amt     : Decimal(18, 2) @title: '수주목표액 10월';
        prj_target_m11_amt     : Decimal(18, 2) @title: '수주목표액 11월';
        prj_target_m12_amt     : Decimal(18, 2) @title: '수주목표액 12월';
        sale_m1_amt            : Decimal(18, 2) @title: '매출액 1월';
        sale_m2_amt            : Decimal(18, 2) @title: '매출액 2월';
        sale_m3_amt            : Decimal(18, 2) @title: '매출액 3월';
        sale_m4_amt            : Decimal(18, 2) @title: '매출액 4월';
        sale_m5_amt            : Decimal(18, 2) @title: '매출액 5월';
        sale_m6_amt            : Decimal(18, 2) @title: '매출액 6월';
        sale_m7_amt            : Decimal(18, 2) @title: '매출액 7월';
        sale_m8_amt            : Decimal(18, 2) @title: '매출액 8월';
        sale_m9_amt            : Decimal(18, 2) @title: '매출액 9월';
        sale_m10_amt           : Decimal(18, 2) @title: '매출액 10월';
        sale_m11_amt           : Decimal(18, 2) @title: '매출액 11월';
        sale_m12_amt           : Decimal(18, 2) @title: '매출액 12월';
        prj_cost_m1_amt        : Decimal(18, 2) @title: '수행(원가 합계) 1월';
        prj_cost_m2_amt        : Decimal(18, 2) @title: '수행(원가 합계) 2월';
        prj_cost_m3_amt        : Decimal(18, 2) @title: '수행(원가 합계) 3월';
        prj_cost_m4_amt        : Decimal(18, 2) @title: '수행(원가 합계) 4월';
        prj_cost_m5_amt        : Decimal(18, 2) @title: '수행(원가 합계) 5월';
        prj_cost_m6_amt        : Decimal(18, 2) @title: '수행(원가 합계) 6월';
        prj_cost_m7_amt        : Decimal(18, 2) @title: '수행(원가 합계) 7월';
        prj_cost_m8_amt        : Decimal(18, 2) @title: '수행(원가 합계) 8월';
        prj_cost_m9_amt        : Decimal(18, 2) @title: '수행(원가 합계) 9월';
        prj_cost_m10_amt       : Decimal(18, 2) @title: '수행(원가 합계) 10월';
        prj_cost_m11_amt       : Decimal(18, 2) @title: '수행(원가 합계) 11월';
        prj_cost_m12_amt       : Decimal(18, 2) @title: '수행(원가 합계) 12월';
        prj_labor_m1_amt       : Decimal(18, 2) @title: '수행(원가 인건비) 1월';
        prj_labor_m2_amt       : Decimal(18, 2) @title: '수행(원가 인건비) 2월';
        prj_labor_m3_amt       : Decimal(18, 2) @title: '수행(원가 인건비) 3월';
        prj_labor_m4_amt       : Decimal(18, 2) @title: '수행(원가 인건비) 4월';
        prj_labor_m5_amt       : Decimal(18, 2) @title: '수행(원가 인건비) 5월';
        prj_labor_m6_amt       : Decimal(18, 2) @title: '수행(원가 인건비) 6월';
        prj_labor_m7_amt       : Decimal(18, 2) @title: '수행(원가 인건비) 7월';
        prj_labor_m8_amt       : Decimal(18, 2) @title: '수행(원가 인건비) 8월';
        prj_labor_m9_amt       : Decimal(18, 2) @title: '수행(원가 인건비) 9월';
        prj_labor_m10_amt      : Decimal(18, 2) @title: '수행(원가 인건비) 10월';
        prj_labor_m11_amt      : Decimal(18, 2) @title: '수행(원가 인건비) 11월';
        prj_labor_m12_amt      : Decimal(18, 2) @title: '수행(원가 인건비) 12월';
        prj_el_m1_amt          : Decimal(18, 2) @title: '수행(원가 외주비) 1월';
        prj_el_m2_amt          : Decimal(18, 2) @title: '수행(원가 외주비) 2월';
        prj_el_m3_amt          : Decimal(18, 2) @title: '수행(원가 외주비) 3월';
        prj_el_m4_amt          : Decimal(18, 2) @title: '수행(원가 외주비) 4월';
        prj_el_m5_amt          : Decimal(18, 2) @title: '수행(원가 외주비) 5월';
        prj_el_m6_amt          : Decimal(18, 2) @title: '수행(원가 외주비) 6월';
        prj_el_m7_amt          : Decimal(18, 2) @title: '수행(원가 외주비) 7월';
        prj_el_m8_amt          : Decimal(18, 2) @title: '수행(원가 외주비) 8월';
        prj_el_m9_amt          : Decimal(18, 2) @title: '수행(원가 외주비) 9월';
        prj_el_m10_amt         : Decimal(18, 2) @title: '수행(원가 외주비) 10월';
        prj_el_m11_amt         : Decimal(18, 2) @title: '수행(원가 외주비) 11월';
        prj_el_m12_amt         : Decimal(18, 2) @title: '수행(원가 외주비) 12월';
        prj_ats_m1_amt         : Decimal(18, 2) @title: '수행(원가 ATS) 1월';
        prj_ats_m2_amt         : Decimal(18, 2) @title: '수행(원가 ATS) 2월';
        prj_ats_m3_amt         : Decimal(18, 2) @title: '수행(원가 ATS) 3월';
        prj_ats_m4_amt         : Decimal(18, 2) @title: '수행(원가 ATS) 4월';
        prj_ats_m5_amt         : Decimal(18, 2) @title: '수행(원가 ATS) 5월';
        prj_ats_m6_amt         : Decimal(18, 2) @title: '수행(원가 ATS) 6월';
        prj_ats_m7_amt         : Decimal(18, 2) @title: '수행(원가 ATS) 7월';
        prj_ats_m8_amt         : Decimal(18, 2) @title: '수행(원가 ATS) 8월';
        prj_ats_m9_amt         : Decimal(18, 2) @title: '수행(원가 ATS) 9월';
        prj_ats_m10_amt        : Decimal(18, 2) @title: '수행(원가 ATS) 10월';
        prj_ats_m11_amt        : Decimal(18, 2) @title: '수행(원가 ATS) 11월';
        prj_ats_m12_amt        : Decimal(18, 2) @title: '수행(원가 ATS) 12월';
        prj_ags_m1_amt         : Decimal(18, 2) @title: '수행(원가 AGS) 1월';
        prj_ags_m2_amt         : Decimal(18, 2) @title: '수행(원가 AGS) 2월';
        prj_ags_m3_amt         : Decimal(18, 2) @title: '수행(원가 AGS) 3월';
        prj_ags_m4_amt         : Decimal(18, 2) @title: '수행(원가 AGS) 4월';
        prj_ags_m5_amt         : Decimal(18, 2) @title: '수행(원가 AGS) 5월';
        prj_ags_m6_amt         : Decimal(18, 2) @title: '수행(원가 AGS) 6월';
        prj_ags_m7_amt         : Decimal(18, 2) @title: '수행(원가 AGS) 7월';
        prj_ags_m8_amt         : Decimal(18, 2) @title: '수행(원가 AGS) 8월';
        prj_ags_m9_amt         : Decimal(18, 2) @title: '수행(원가 AGS) 9월';
        prj_ags_m10_amt        : Decimal(18, 2) @title: '수행(원가 AGS) 10월';
        prj_ags_m11_amt        : Decimal(18, 2) @title: '수행(원가 AGS) 11월';
        prj_ags_m12_amt        : Decimal(18, 2) @title: '수행(원가 AGS) 12월';
        prj_ai_m1_amt          : Decimal(18, 2) @title: '수행(원가 AI) 1월';
        prj_ai_m2_amt          : Decimal(18, 2) @title: '수행(원가 AI) 2월';
        prj_ai_m3_amt          : Decimal(18, 2) @title: '수행(원가 AI) 3월';
        prj_ai_m4_amt          : Decimal(18, 2) @title: '수행(원가 AI) 4월';
        prj_ai_m5_amt          : Decimal(18, 2) @title: '수행(원가 AI) 5월';
        prj_ai_m6_amt          : Decimal(18, 2) @title: '수행(원가 AI) 6월';
        prj_ai_m7_amt          : Decimal(18, 2) @title: '수행(원가 AI) 7월';
        prj_ai_m8_amt          : Decimal(18, 2) @title: '수행(원가 AI) 8월';
        prj_ai_m9_amt          : Decimal(18, 2) @title: '수행(원가 AI) 9월';
        prj_ai_m10_amt         : Decimal(18, 2) @title: '수행(원가 AI) 10월';
        prj_ai_m11_amt         : Decimal(18, 2) @title: '수행(원가 AI) 11월';
        prj_ai_m12_amt         : Decimal(18, 2) @title: '수행(원가 AI) 12월';
        prj_mc_m1_amt          : Decimal(18, 2) @title: '수행(원가 상품) 1월';
        prj_mc_m2_amt          : Decimal(18, 2) @title: '수행(원가 상품) 2월';
        prj_mc_m3_amt          : Decimal(18, 2) @title: '수행(원가 상품) 3월';
        prj_mc_m4_amt          : Decimal(18, 2) @title: '수행(원가 상품) 4월';
        prj_mc_m5_amt          : Decimal(18, 2) @title: '수행(원가 상품) 5월';
        prj_mc_m6_amt          : Decimal(18, 2) @title: '수행(원가 상품) 6월';
        prj_mc_m7_amt          : Decimal(18, 2) @title: '수행(원가 상품) 7월';
        prj_mc_m8_amt          : Decimal(18, 2) @title: '수행(원가 상품) 8월';
        prj_mc_m9_amt          : Decimal(18, 2) @title: '수행(원가 상품) 9월';
        prj_mc_m10_amt         : Decimal(18, 2) @title: '수행(원가 상품) 10월';
        prj_mc_m11_amt         : Decimal(18, 2) @title: '수행(원가 상품) 11월';
        prj_mc_m12_amt         : Decimal(18, 2) @title: '수행(원가 상품) 12월';
        prj_exp_m1_amt         : Decimal(18, 2) @title: '수행(원가 경비) 1월';
        prj_exp_m2_amt         : Decimal(18, 2) @title: '수행(원가 경비) 2월';
        prj_exp_m3_amt         : Decimal(18, 2) @title: '수행(원가 경비) 3월';
        prj_exp_m4_amt         : Decimal(18, 2) @title: '수행(원가 경비) 4월';
        prj_exp_m5_amt         : Decimal(18, 2) @title: '수행(원가 경비) 5월';
        prj_exp_m6_amt         : Decimal(18, 2) @title: '수행(원가 경비) 6월';
        prj_exp_m7_amt         : Decimal(18, 2) @title: '수행(원가 경비) 7월';
        prj_exp_m8_amt         : Decimal(18, 2) @title: '수행(원가 경비) 8월';
        prj_exp_m9_amt         : Decimal(18, 2) @title: '수행(원가 경비) 9월';
        prj_exp_m10_amt        : Decimal(18, 2) @title: '수행(원가 경비) 10월';
        prj_exp_m11_amt        : Decimal(18, 2) @title: '수행(원가 경비) 11월';
        prj_exp_m12_amt        : Decimal(18, 2) @title: '수행(원가 경비) 12월';
        CREATEDAT              : Timestamp      @title: '인터페이스 데이터 생성일';
}
