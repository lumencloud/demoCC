using {managed} from '@sap/cds/common';
using {common.customer as customer} from '../common/customer';
using {common.org as org} from '../common/org';
using {common.version as version} from '../common/version';

namespace common;

/**
 * 프로젝트 공통 테이블
 */
entity project : managed {
    key ver               : String(20)    @title: '버전번호'; //추후 key로 지정
        // PROMIS, ERP
    key prj_no            : String(20)    @title: '프로젝트 번호'              @description: 'PROMIS / ERP / PLATFORM';
        if_source         : String(10)    @title: '인터페이스 출처';
        prj_nm            : String(300)   @title: '프로젝트 명'               @description: 'PROMIS / ERP / PLATFORM';
        cstco_cd          : String(20)    @title: '고객사 코드'               @description: 'PROMIS / ERP / PLATFORM';
        rodr_ccorg_cd     : String(20)    @title: '수주 조직 코드'             @description: 'PROMIS';
        sale_ccorg_cd     : String(20)    @title: '매출 조직 코드'             @description: 'PROMIS / ERP / PLATFORM';
        prj_prfm_str_dt   : Date          @title: '사업수행 시작일자'            @description: 'PROMIS / ERP';
        prj_prfm_end_dt   : Date          @title: '사업수행 종료일자'            @description: 'PROMIS / ERP';
        ovse_biz_yn       : Boolean       @title: '해외 사업 여부'             @description: 'PROMIS';
        relsco_yn         : Boolean       @title: '관계사 여부'               @description: 'PROMIS';
        prj_tp_cd         : String(20)    @title: '프로젝트 유형 코드'           @description: 'PROMIS / ERP / PLATFORM';
        itsm_div_yn       : Boolean       @title: 'ITSM 여부'              @description: '[계산] prj_no 가 2011로 시작하면 TRUE';
        crov_div_yn       : Boolean       @title: '이월 여부'                @description: '[계산] prj_prfm_str_dt(프로젝트 시작연도)가 올해보다 클 경우 이월 TRUE';
        // -----------------
        // PLATFORM
        cnvg_biz_yn       : Boolean       @title: '융복합 사업 여부'            @description: 'PLATFORM / SRC_TYPE = E인 경우, SRC_TYPE = P, TRUE 인 데이터가 존재할 경우 업데이트';
        quote_issue_no    : String(20)    @title: '견적발행번호'               @description: 'PLATFORM';
        quote_target_no   : String(20)    @title: '견적대상번호'               @description: 'PLATFORM';
        // -----------------
        // SFDC > View 로 전환
        prj_tp_nm         : String(20)    @title: '프로젝트 타입명';
        si_os_div_cd      : String(20)    @title: 'SI OS 구분 코드';
        biz_opp_no        : String(30)    @title: '사업기회번호';
        biz_opp_nm        : String(120)   @title: '사업기회명';
        deal_stage_cd     : String(20)    @title: 'Deal Stage 코드';
        deal_stage_nm     : String(30)    @title: 'Deal Stage 명';
        margin_rate       : Decimal(5, 2) @title: '목표수익율(마진율)';
        dgtr_task_cd      : String(30)    @title: 'DT 과제 코드';
        dgtr_task_nm      : String(30)    @title: 'DT 과제 명';
        biz_tp_account_cd : String(30)    @title: 'Account 구분 코드';
        cls_rsn_tp_cd     : String(30)    @title: '사업기회 종료 구분코드';
        // -----------------
        // PRJ_TP_CD 종속 > View 로 전환
        // COMMON_CODE_ITEM (기본값)
        // COMMON_PROJECT_BIZ_DOMAIN (커스터마이징 값이 존재할 경우 우선순위)
        bd_n1_cd          : String(20)    @title: '비즈니스도메인 1';
        bd_n2_cd          : String(20)    @title: '비즈니스도메인 2';
        bd_n3_cd          : String(20)    @title: '비즈니스도메인 3';
        bd_n4_cd          : String(20)    @title: '비즈니스도메인 4';
        bd_n5_cd          : String(20)    @title: '비즈니스도메인 5';
        bd_n6_cd          : String(20)    @title: '비즈니스도메인 6';
        // RESERVED 컬럼
        cnrc_dt           : Date          @title: '[Reserved] 수주 계약 일자'  @description: 'SFDC 삭제됨';
        dt_tp             : String(20)    @title: '[Reserved] DT TYPE'   @description: 'PLATFORM 에서는 들어옴';
        tech_nm           : String(40)    @title: '[Reserved] 적용기술(명)'   @description: 'PLATFORM 에서는 들어옴';
        brand_nm          : String(40)    @title: '[Reserved] 브랜드(명)'    @description: 'PLATFORM 에서는 들어옴';
}

// entity project : managed {
//             ver               : String(20)    @title: '버전번호'; //추후 key로 지정
//             ver_detail        : Association to version
//                                         on ver_detail.ver = $self.ver;
//         key prj_no            : String(20)    @title: '프로젝트 번호';
//             prj_nm            : String(300)   @title: '프로젝트 명';
//             cstco_cd          : String(20)    @title: '고객사 코드(ERP)';
//             cstco_detail      : Association to customer
//                                         on cstco_detail.code = $self.cstco_cd;
//             rodr_ccorg_cd     : String(20)    @title: '수주 조직 코드(cc_code)';
//             rodr_ccorg_detail : Association to org
//                                         on  rodr_ccorg_detail.ccorg_cd = $self.rodr_ccorg_cd
//                                         and rodr_ccorg_detail.use_yn   = true;
//             sale_ccorg_cd     : String(20)    @title: '매출 조직 코드(cc_code)';
//             sale_ccorg_detail : Association to org
//                                         on  sale_ccorg_detail.ccorg_cd = $self.sale_ccorg_cd
//                                         and sale_ccorg_detail.use_yn   = true;
//             cnrc_dt           : Date          @title: '수주 계약 일자';
//             prj_prfm_str_dt   : Date          @title: '사업수행 시작일자';
//             prj_prfm_end_dt   : Date          @title: '사업수행 종료일자';
//             crov_div_yn       : Boolean       @title: '이월 여부';
//             ovse_biz_yn       : Boolean       @title: '해외 사업 여부';
//             relsco_yn         : Boolean       @title: '관계사 여부';
//             cnvg_biz_yn       : Boolean       @title: '융복합 사업 여부';
//             prj_tp_cd         : String(20)    @title: '프로젝트 유형 코드';
//             prj_tp_nm         : String(20)    @title: '프로젝트 타입명';
//             si_os_div_cd      : String(20)    @title: 'SI OS 구분 코드';
//             bd_n1_cd          : String(20)    @title: '비즈니스도메인 1';
//             bd_n2_cd          : String(20)    @title: '비즈니스도메인 2';
//             bd_n3_cd          : String(20)    @title: '비즈니스도메인 3';
//             bd_n4_cd          : String(20)    @title: '비즈니스도메인 4';
//             bd_n5_cd          : String(20)    @title: '비즈니스도메인 5';
//             bd_n6_cd          : String(20)    @title: '비즈니스도메인 6';
//             dt_tp             : String(20)    @title: 'DT TYPE';
//             tech_nm           : String(40)    @title: '적용기술(명)';
//             brand_nm          : String(40)    @title: '브랜드(명)';
//             quote_issue_no    : String(20)    @title: '견적발행번호';
//             quote_target_no   : String(20)    @title: '견적대상번호';
//             itsm_div_yn       : Boolean       @title: 'ITSM 여부';
//             biz_opp_no        : String(30)    @title: '사업기회번호';
//             biz_opp_nm        : String(120)   @title: '사업기회명';
//             deal_stage_cd     : String(20)    @title: 'Deal Stage 코드';
//             deal_stage_nm     : String(30)    @title: 'Deal Stage 명';
//             margin_rate       : Decimal(5, 2) @title: '목표수익율(마진율)';
//             dgtr_task_cd      : String(30)    @title: 'DT 과제 코드';
//             dgtr_task_nm      : String(30)    @title: 'DT 과제 명';
//             biz_tp_account_cd : String(30)    @title: 'Account 구분 코드';
//             cls_rsn_tp_cd     : String(30)    @title: '사업기회 종료 구분코드';

// // biz_tp_account_nm      : String(30)     @title: 'Account 구분명';
// // cls_rsn_tp_nm          : String(30)     @title: '사업기회 종료 구분명';
// }
