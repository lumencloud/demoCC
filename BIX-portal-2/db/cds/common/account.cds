/**
 * 수정일 : 250516
 */
using {managed} from '@sap/cds/common';
using {common.customer as customer} from '../common/customer';

namespace common;

/**
 * ACCOUNT 별 고객사 테이블
 */
entity account_old : managed {
    key code            : String(10) not null @title: 'Account 코드';
        name            : String(30) not null @title: 'Account 이름';
        sort_order      : Integer not null    @title: '정렬 순서';
        customer_detail : Association to many customer
                              on customer_detail.account_cd = $self.code;
}

/**
 * ACCOUNT 별 고객사 테이블 (SFDC 인터페이스 구조로 변경)
 */
entity account : managed {
    key ver               : String(20) @title: '인터페이스 버전';
    key biz_tp_account_cd : String(30) @title: 'Account 코드';
        biz_tp_account_nm : String(30) @title: 'Account 이름';
        sort_order        : Integer    @title: '정렬 순서';
        delete_yn         : Boolean    @title: '삭제 여부';
        customer_detail   : Association to many customer
                                on customer_detail.account_cd = $self.biz_tp_account_cd;
}

//삭제예정
entity temp_account_customer_map : managed {
    account        : String(50) not null @title: 'Account 이름';
    account_id     : Integer not null    @title: 'Account 코드';
    cstco_nm       : String(50) not null @title: 'customer 이름';
    cstco_id       : String(50) not null @title: 'customer id';
    erp_cust_co_cd : String(50)          @title: 'customer erp code'; // 기존 데이터 null 제거 후 not null 속성 부여
}
