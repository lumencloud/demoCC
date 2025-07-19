using {managed} from '@sap/cds/common';

namespace common;

/**
 * Delivery 여부
 * ACCOUNT / DELIVERY / HYBRID / STAFF 조직 속성관리 테이블
 * + 매핑 불가 조직 추가관리
 */
entity org_type : managed {
    key ccorg_cd         : String(10) not null @title: 'ERP Cost Center';
        parent_ccorg_cd  : String(10)          @title: 'ERP Cost Center';
        replace_ccorg_cd : String(10)          @title: '대체 ERP Cost Center';
        close_yn         : Boolean;
        org_desc         : String(50);
        org_tp           : String(20)          @title: '조직 유형'  @description: 'ACCOUNT / DELIVERY / HYBRID / STAFF 중 하나';
        is_delivery      : Boolean             @title: 'Delivery 구분자';
        is_total_cc      : Boolean             @title: 'SG&A 전사 조직여부';
        org_year         : String(4)           @title: '조직 관리연도';
}
