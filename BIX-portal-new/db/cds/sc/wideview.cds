/**
 * 등록일 : 250430
 */

using {managed} from '@sap/cds/common';

namespace sc;

/**
 * 자회사 SG&A 장판지
 */
entity wideview : managed {
    key ver           : String(20)          @title: '인터페이스 버전';
    key year          : String(4) not null  @title: '회계연도';
    key month         : String(2) not null  @title: '마감월';
    key ccorg_cd      : String(10) not null @title: 'ERP Cost Center';
        labor_m1_amt  : Decimal(18, 2)      @title: '인건비 1월 금액';
        labor_m2_amt  : Decimal(18, 2)      @title: '인건비 2월 금액';
        labor_m3_amt  : Decimal(18, 2)      @title: '인건비 3월 금액';
        labor_m4_amt  : Decimal(18, 2)      @title: '인건비 4월 금액';
        labor_m5_amt  : Decimal(18, 2)      @title: '인건비 5월 금액';
        labor_m6_amt  : Decimal(18, 2)      @title: '인건비 6월 금액';
        labor_m7_amt  : Decimal(18, 2)      @title: '인건비 7월 금액';
        labor_m8_amt  : Decimal(18, 2)      @title: '인건비 8월 금액';
        labor_m9_amt  : Decimal(18, 2)      @title: '인건비 9월 금액';
        labor_m10_amt : Decimal(18, 2)      @title: '인건비 10월 금액';
        labor_m11_amt : Decimal(18, 2)      @title: '인건비 11월 금액';
        labor_m12_amt : Decimal(18, 2)      @title: '인건비 12월 금액';
        exp_m1_amt    : Decimal(18, 2)      @title: '경비 1월 금액';
        exp_m2_amt    : Decimal(18, 2)      @title: '경비 2월 금액';
        exp_m3_amt    : Decimal(18, 2)      @title: '경비 3월 금액';
        exp_m4_amt    : Decimal(18, 2)      @title: '경비 4월 금액';
        exp_m5_amt    : Decimal(18, 2)      @title: '경비 5월 금액';
        exp_m6_amt    : Decimal(18, 2)      @title: '경비 6월 금액';
        exp_m7_amt    : Decimal(18, 2)      @title: '경비 7월 금액';
        exp_m8_amt    : Decimal(18, 2)      @title: '경비 8월 금액';
        exp_m9_amt    : Decimal(18, 2)      @title: '경비 9월 금액';
        exp_m10_amt   : Decimal(18, 2)      @title: '경비 10월 금액';
        exp_m11_amt   : Decimal(18, 2)      @title: '경비 11월 금액';
        exp_m12_amt   : Decimal(18, 2)      @title: '경비 12월 금액';
        shared_exp_yn : Boolean             @title: '전사 SG&A 항목';
        remark        : String(40)          @title: '비고';
}
