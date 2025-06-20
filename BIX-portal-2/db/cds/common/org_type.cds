using {managed} from '@sap/cds/common';

/**
 * 등록일 : 250513
 * 등록자 : 이금복
 */
namespace common;

/**
 * Delivery 여부
 * ACCOUNT / DELIVERY / HYBRID / STAFF 조직 속성관리 테이블
 */
entity org_type : managed {
    key ccorg_cd    : String(10) not null @title: 'ERP Cost Center';
        org_desc    : String(50);
        org_tp      : String(20)          @title: '조직 유형'  @description: 'ACCOUNT / DELIVERY / HYBRID / STAFF 중 하나';
        is_delivery : Boolean not null    @title: 'Delivery 구분자';
        is_total_cc : Boolean             @title: 'SG&A 전사 조직여부'
}
