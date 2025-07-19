using {managed} from '@sap/cds/common';

namespace common;

/**
 * 프로젝트 공통 테이블
 */
entity project_master_mapping : managed {
    key prj_no          : String(20) @title: '프로젝트 번호';
    key seq             : Integer;
    key year            : String(4) default '';
        if_source       : String(10) @title: '인터페이스 출처';
        rodr_ccorg_cd   : String(20) @title: '수주 조직 코드';
        sale_ccorg_cd   : String(20) @title: '매출 조직 코드';
        prj_prfm_str_dt : Date       @title: '사업수행 시작일자';
        prj_prfm_end_dt : Date       @title: '사업수행 종료일자';
        relsco_yn       : Boolean    @title: '관계사 여부';
}
