/**
 * 수정일 : 250516
 */
using {managed} from '@sap/cds/common';

namespace common;

entity account_customer_map : managed {
    key biz_tp_account_cd : String(30) not null @title: 'Account 코드';
    key cstco_cd          : String(18)          @title: '고객 코드';
        cstco_nm          : String(100)         @title: '고객사 명';
        customer_exist_yn : Boolean             @title: '고객코드 존재여부';
}
