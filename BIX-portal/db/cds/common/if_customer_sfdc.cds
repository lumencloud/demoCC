namespace common;

/**
 *  고객사 I/F 테이블
 */
entity if_customer_sfdc {
    key ver         : String(20)          @title: '인터페이스 버전';
        flag        : String(10)          @title: '인터페이스 상태';
    key code        : String(18) not null @title: '고객 코드';
        name        : String(100)         @title: '고객사 명';
        rpstr_name  : String(300)         @title: '고객사 대표자 명';
        country     : String(3)           @title: '국가 코드';
        biz_type    : String(20)          @title: '업종 구분 RCID';
        relscomp_yn : Boolean             @title: '관계사 여부';
        sfdc_id     : String(18)          @title: 'SFDC 고객사 ID';
        type        : String(10)          @title: 'Account 구분코드';
        type_code   : String(30)          @title: 'Account 구분';
        temp_yn     : Boolean             @title: '임시고객사 여부';
}
