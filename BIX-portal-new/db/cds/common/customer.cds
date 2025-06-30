using {managed} from '@sap/cds/common';
using {common.account as account} from '../common/account';

namespace common;

/**
 * 고객사 공통 테이블
 */
entity customer : managed {
    key ver                   : String(20)  @title: '인터페이스 버전';
    key code                  : String(18)  @title: '고객 코드';
        name                  : String(100) @title: '고객사 명';
        rpstr_name            : String(300) @title: '고객사 대표자 명';
        country               : String(3)   @title: '국가 코드';
        biz_type              : String(300) @title: '업종 구분 RCID';
        relsco_yn             : Boolean     @title: '관계사 여부';
        erp_pbl_div_rcid      : Boolean     @title: 'ERP 공공 구분 RCID';
        use_yn                : Boolean     @title: '사용 여부';
        biz_tp_account_cd     : String(30)  @title: 'Account 코드';
        biz_tp_account_detail : Association to account
                                    on biz_tp_account_detail.biz_tp_account_cd = $self.biz_tp_account_cd;
}
