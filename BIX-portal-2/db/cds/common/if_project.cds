using {managed} from '@sap/cds/common';

namespace common;

/**
 * 프로젝트 I/F 테이블
 */
entity if_project : managed {
    key ver             : String(20)          @title: 'version';
        flag            : String(10)          @title: '인터페이스 상태(NULL/S/E)';
    key prj_no          : String(20) not null @title: '프로젝트 번호';
        prj_nm          : String(300)         @title: '프로젝트 명';
        cstco_cd        : String(20)          @title: '고객사 코드';
        rodr_ccorg_cd   : String(20)          @title: '수주 조직 코드(cc_code)';
        sale_ccorg_cd   : String(20)          @title: '매출 조직 코드(cc_code)';
        cnrc_dt         : Date                @title: '수주 계약 일자';
        prj_prfm_str_dt : Date                @title: '사업수행 시작일자';
        prj_prfm_end_dt : Date                @title: '사업수행 종료일자';
        ovse_biz_yn     : Boolean             @title: '해외 사업 여부';
        biz_opp_no      : String(30)          @title: '사업기회번호';
        relsco_yn       : Boolean             @title: '관계사 여부';
        prj_tp_cd       : String(20)          @title: '프로젝트 유형 코드';
        dt_tp           : String(20)          @title: 'DT TYPE';
        tech_nm         : String(40)          @title: '적용기술(명)';
        brand_nm        : String(40)          @title: '브랜드(명)';
        quote_issue_no  : String(20)          @title: '견적발행번호';
        quote_target_no : String(20)          @title: '견적대상번호';
        if_source       : String(10)          @title: '인터페이스 출처';
        eai_pcs_dttm    : DateTime            @title: 'EAI I/F 처리시간';
        eai_data_seq    : Integer             @title: 'EAI 시퀀스';
        eai_crud_cd     : String(1)           @title: 'EAI 처리 코드';
}
