using {managed} from '@sap/cds/common';

/**
 * 등록일 : 250423
 * 등록자 : 기재민
 */
namespace common;

/**
 * D/ND 조직 구분 Delivery 조직 정보 저장 테이블
 */
entity delivery_org : managed {
    key org_id      : String(20) not null @title: '조직 ID';
    key ccorg_cd    : String(10) not null @title: 'ERP Cost Center';
        year        : String(4) not null  @title: '연도';
        is_delivery : Boolean not null    @title: 'Delivery 구분자'
}
