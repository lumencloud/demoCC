using {managed} from '@sap/cds/common';
using {common.customer as customer} from '../common/customer';
using {common.org as org} from '../common/org';
using {common.version as version} from '../common/version';

namespace common;

/**
 * 프로젝트 platform 공통 테이블
 */
entity project_platform : managed {
    key ver             : String(20)  @title: '버전번호';
    key prj_no          : String(20)  @title: '프로젝트 번호';
    key seq             : Integer     @title: 'platform 구분 번호';
        prj_nm          : String(300) @title: '프로젝트 명';
        sale_ccorg_cd   : String(20)  @title: '매출 조직 코드(cc_code)';
        biz_opp_no      : String(30)  @title: '사업기회번호';
        cstco_cd        : String(20)  @title: '고객사 코드';
        cnvg_biz_yn     : Boolean     @title: '융복합 사업 여부';
        prj_tp_cd       : String(20)  @title: '프로젝트 유형 코드';
        dt_tp           : String(20)  @title: 'DT TYPE';
        tech_nm         : String(40)  @title: '적용기술(명)';
        brand_nm        : String(100) @title: '브랜드(명)';
        quote_issue_no  : String(20)  @title: '견적발행번호';
        quote_target_no : String(20)  @title: '견적대상번호';

        
        relsco_yn       : Boolean     @title: '관계사 여부';
        bd_n2_cd          : String(20)    @title: '비즈니스도메인 2';
        crov_div_yn     : Boolean     @title: '이월 여부';
}
