using {managed} from '@sap/cds/common';
using {common.customer as customer} from '../common/customer';
using {common.org as org} from '../common/org';
using {common.version as version} from '../common/version';

namespace common;

/**
 * 프로젝트 공통 테이블
 */
entity project_sfdc : managed {
    key ver                    : String(20)    @title: '인터페이스 버전';
    key id                     : String(18)    @title: 'SFDC record_id 데이터 구분키';
    key year                   : String(4)     @title: '연도';
        prj_no_sfdc            : String(20)    @title: '사업기회 매출귀속조직 ID';
        prj_no                 : String(20)    @title: '프로젝트 번호';
        prj_prfm_str_dt        : Date          @title: '프로젝트 시작일';
        prj_prfm_end_dt        : Date          @title: '프로젝트 종료일';
        prj_tp_nm              : String(20)    @title: '프로젝트 타입명';
        prj_tp_cd              : String(20)    @title: '프로젝트 유형 코드'  @description: 'PROMIS / ERP / PLATFORM';
        // itsm_div_yn            : Boolean       @title: 'ITSM 여부'     @description: '[계산] prj_no 가 2011로 시작하면 TRUE';
        crov_div_yn            : Boolean       @title: '이월 여부'       @description: '[계산] prj_prfm_str_dt(프로젝트 시작연도)가 올해보다 클 경우 이월 TRUE';
        sales_ratio            : Decimal(5, 2) @title: '매출액 비중';
        rodr_ccorg_cd          : String(8)     @title: '수주 조직 코드(cc_code)';
        sale_ccorg_cd          : String(6)     @title: '매출조직 코드';
        biz_opp_no_sfdc        : String(18)    @title: '사업기회 ID';
        biz_opp_no             : String(8)     @title: '사업기회번호';
        biz_opp_nm             : String(120)   @title: '사업기회명';
        deal_stage_cd          : String(20)    @title: 'Deal Stage';
        deal_stage_chg_dt      : Date          @title: 'Deal Stage 변경일';
        cstco_cd               : String(10)    @title: '고객사 코드';
        cstco_name             : String(100)   @title: '고객사 명';
        cstco_no_sfdc          : String(18)    @title: '고객사 코드 SFDC (임시고객사용)';
        dgtr_task_cd           : String(30)    @title: 'DT과제 코드';
        biz_tp_account_cd      : String(30)    @title: 'Account 구분 코드';
        cls_rsn_tp_cd          : String(30)    @title: '사업기회 종료 구분코드';
        cls_rsn_tp_nm          : String(30)    @title: '사업기회 종료 구분명';
        bd_n2_cd               : String(20)    @title: '비즈니스도메인 2';
        relsco_yn              : Boolean       @title: '관계사 여부';
        expected_contract_date : Date          @title: '예상 계약일자';
        margin_rate            : Decimal(5, 2) @title: '목표수익률';
}
