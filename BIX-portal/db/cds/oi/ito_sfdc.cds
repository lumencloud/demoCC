using {managed} from '@sap/cds/common';

namespace oi;

/**
 * 외주비 추정 구분 테이블
 */
entity ito_sfdc : managed {
    key ver         : String(20)           @title: '인터페이스 버전';
    key year        : String(4) not null   @title: '회계연도';
    key month       : String(2) not null   @title: '마감월';
    key ccorg_cd    : String(10) not null  @title: 'ERP Cost Center';
    key ito_type    : String(10) not null  @title: '외주비 구분'    @description: 'K-BP / ATS / AGS / (AI)';
    key prj_tp_nm   : String(20) not null  @title: '프로젝트 타입명'  @description: 'SI / OS / (DT) SI/OS 구분 프로젝트 타입을 보고 SI/OS를 넣음  (SI-MA, OT : OS로 / 프로젝트 타입 유형 : DT가 있음 별도 정리 必)';
        ito_m1_amt  : Decimal(18, 2)       @title: '1월 외주비';
        ito_m2_amt  : Decimal(18, 2)       @title: '2월 외주비';
        ito_m3_amt  : Decimal(18, 2)       @title: '3월 외주비';
        ito_m4_amt  : Decimal(18, 2)       @title: '4월 외주비';
        ito_m5_amt  : Decimal(18, 2)       @title: '5월 외주비';
        ito_m6_amt  : Decimal(18, 2)       @title: '6월 외주비';
        ito_m7_amt  : Decimal(18, 2)       @title: '7월 외주비';
        ito_m8_amt  : Decimal(18, 2)       @title: '8월 외주비';
        ito_m9_amt  : Decimal(18, 2)       @title: '9월 외주비';
        ito_m10_amt : Decimal(18, 2)       @title: '10월 외주비';
        ito_m11_amt : Decimal(18, 2)       @title: '11월 외주비';
        ito_m12_amt : Decimal(18, 2)       @title: '12월 외주비';
}
