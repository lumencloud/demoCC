namespace rsp;

// 샘플데이터에 month 없음

/**
 * PROMIS 인력 경영계획(M/M) I/F 테이블
 */
entity if_org_mm {
    key ver          : String(20)          @title: '인터페이스 버전';
        flag         : String(10)          @title: '인터페이스 상태';
    key year_month   : String(6) not null  @title: '마감연월';
    key ccorg_cd     : String(10) not null @title: 'ERP Cost Center';
    key bun_tp       : String(1) not null  @title: 'B/U/N 타입';
        mm_m1_amt    : Decimal(5, 1)       @title: '1월 MM';
        mm_m2_amt    : Decimal(5, 1)       @title: '2월 MM';
        mm_m3_amt    : Decimal(5, 1)       @title: '3월 MM';
        mm_m4_amt    : Decimal(5, 1)       @title: '4월 MM';
        mm_m5_amt    : Decimal(5, 1)       @title: '5월 MM';
        mm_m6_amt    : Decimal(5, 1)       @title: '6월 MM';
        mm_m7_amt    : Decimal(5, 1)       @title: '7월 MM';
        mm_m8_amt    : Decimal(5, 1)       @title: '8월 MM';
        mm_m9_amt    : Decimal(5, 1)       @title: '9월 MM';
        mm_m10_amt   : Decimal(5, 1)       @title: '10월 MM';
        mm_m11_amt   : Decimal(5, 1)       @title: '11월 MM';
        mm_m12_amt   : Decimal(5, 1)       @title: '12월 MM';
        eai_pcs_dttm : Timestamp           @title: 'EAI I/F 처리시간';
        eai_data_seq : Integer             @title: 'EAI 시퀀스';
        eai_crud_cd  : String(1)           @title: 'EAI 처리 코드';
}
