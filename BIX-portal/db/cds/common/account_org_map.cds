/**
 * 수정일 : 250516
 */
using {managed} from '@sap/cds/common';

namespace common;

entity account_org_map : managed {
    key biz_tp_account_cd : String(30) not null @title: 'Account 코드';
    key org_ccorg_cd      : String(20) not null @title: '조직 ccorg_cd';
}