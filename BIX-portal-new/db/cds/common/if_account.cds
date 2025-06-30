/**
 * 등록일 : 250516
 */
namespace common;

/**
 * SFDC 고객 Account I/F
 */
entity if_account {
    key ver               : String(20)          @title: '인터페이스 버전';
        flag              : String(10)          @title: '인터페이스 상태';
    key biz_tp_account_cd : String(30) not null @title: 'Account 구분 코드';
        biz_tp_account_nm : String(30)          @title: 'Account 구분명';
        CREATEDAT         : Timestamp           @title: '인터페이스 데이터 생성일';
}
