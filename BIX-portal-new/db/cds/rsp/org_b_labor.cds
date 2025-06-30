// 삭제예정

using {managed} from '@sap/cds/common';

namespace rsp;

/**
 * 조직 간 월 별 빌링 인건비 테이블
 */
entity org_b_labor : managed {
    key ver               : String(20)          @title: '인터페이스 버전';
    key year              : String(4) not null  @title: '회계연도';
    key month             : String(2) not null  @title: '실적월';
    key ccorg_cd          : String(10) not null @title: 'ERP Cost Center';
        bill_m1_amt       : Decimal(18, 2)      @title: '1월 인건비';
        bill_m2_amt       : Decimal(18, 2)      @title: '2월 인건비';
        bill_m3_amt       : Decimal(18, 2)      @title: '3월 인건비';
        bill_m4_amt       : Decimal(18, 2)      @title: '4월 인건비';
        bill_m5_amt       : Decimal(18, 2)      @title: '5월 인건비';
        bill_m6_amt       : Decimal(18, 2)      @title: '6월 인건비';
        bill_m7_amt       : Decimal(18, 2)      @title: '7월 인건비';
        bill_m8_amt       : Decimal(18, 2)      @title: '8월 인건비';
        bill_m9_amt       : Decimal(18, 2)      @title: '9월 인건비';
        bill_m10_amt      : Decimal(18, 2)      @title: '10월 인건비';
        bill_m11_amt      : Decimal(18, 2)      @title: '11월 인건비';
        bill_m12_amt      : Decimal(18, 2)      @title: '12월 인건비';
        indirect_cost_m1  : Decimal(18, 2)      @title: '1월 사내 간접비';
        indirect_cost_m2  : Decimal(18, 2)      @title: '2월 사내 간접비';
        indirect_cost_m3  : Decimal(18, 2)      @title: '3월 사내 간접비';
        indirect_cost_m4  : Decimal(18, 2)      @title: '4월 사내 간접비';
        indirect_cost_m5  : Decimal(18, 2)      @title: '5월 사내 간접비';
        indirect_cost_m6  : Decimal(18, 2)      @title: '6월 사내 간접비';
        indirect_cost_m7  : Decimal(18, 2)      @title: '7월 사내 간접비';
        indirect_cost_m8  : Decimal(18, 2)      @title: '8월 사내 간접비';
        indirect_cost_m9  : Decimal(18, 2)      @title: '9월 사내 간접비';
        indirect_cost_m10 : Decimal(18, 2)      @title: '10월 사내 간접비';
        indirect_cost_m11 : Decimal(18, 2)      @title: '11월 사내 간접비';
        indirect_cost_m12 : Decimal(18, 2)      @title: '12월 사내 간접비';
}
