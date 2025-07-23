using {managed} from '@sap/cds/common';
using {common.customer as customer} from '../common/customer';

namespace common;

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
                                on customer_detail.biz_tp_account_cd = $self.biz_tp_account_cd;
}