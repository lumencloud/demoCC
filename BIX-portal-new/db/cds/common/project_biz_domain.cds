using {managed} from '@sap/cds/common';

namespace common;

/**
 * 프로젝트 공통 테이블
 */
entity project_biz_domain : managed {
    key prj_no   : String(20) @title: '프로젝트 번호';
        bd_n2_cd : String(20) @title: '비즈니스도메인 2';
        bd_n3_cd : String(20) @title: '비즈니스도메인 3';
        bd_n4_cd : String(20) @title: '비즈니스도메인 4';
        bd_n5_cd : String(20) @title: '비즈니스도메인 5';
        bd_n6_cd : String(20) @title: '비즈니스도메인 6';
}
