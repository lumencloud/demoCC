namespace oi;

// 실적월 month 샘플은6자리.. 컬럼 정의는 2자리 월만
// vendor_cd 테이블정의는 not null.. 샘플데이터는 비어있음

/**
 *  외주비 실적/계획 구분 I/F Table
 */
entity if_ito {
        ver          : String(20)          @title: '인터페이스 버전';
        flag         : String(10)          @title: '인터페이스 상태';
    key year         : String(4) not null  @title: '회계연도';
    key year_month   : String(6) not null  @title: '마감연월';
    key month        : String(2) not null  @title: '실적월';
    key prj_no       : String(20) not null @title: '프로젝트 번호';
    key vendor_cd    : String(10)          @title: '업체 코드'  @description: '실적이관 등 업체 없으면 기타거래처 받지 않음 (실투입만 받음)';
        vendor_nm    : String(40)          @title: '업체명';
        oi_ito_amt   : Decimal(18, 2)      @title: '외주비';
        actual_yn    : Boolean             @title: '실적 여부';
        eai_pcs_dttm : Timestamp           @title: 'EAI I/F 처리시간';
        eai_data_seq : Integer             @title: 'EAI 시퀀스';
        eai_crud_cd  : String(1)           @title: 'EAI 처리 코드';
}
