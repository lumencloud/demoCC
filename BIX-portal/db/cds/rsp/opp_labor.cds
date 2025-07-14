using {managed} from '@sap/cds/common';

namespace rsp;

/**
 * 사업기회 별 월 별 인건비 테이블
 */
entity opp_labor : managed {
    key ver                : String(20)          @title: '인터페이스 버전';
    key year               : String(4) not null  @title: '사업기회 연도';
    key month              : String(2) not null  @title: '마감월';
    key prj_no_sfdc        : String(20) not null @title: '사업기회 매출귀속조직 ID';
    key ccorg_cd           : String(10) not null @title: 'ERP Cost Center';
        biz_opp_no         : String(8)           @title: '사업기회 번호';
        prj_tp_cd          : String(20)          @title: '프로젝트 타입코드명';
        prj_tp_nm          : String(20) not null @title: '프로젝트 타입명';
        prfm_str_dt        : Date                @title: '사업 수행 시작 일자';
        prfm_end_dt        : Date                @title: '사업 수행 종료 일자';
        received_order_amt : Decimal(18, 2)      @title: '수주 금액';
        sales_amt          : Decimal(18, 2)      @title: '매출 금액';
        margin_rate        : Decimal(5, 2)       @title: '마진율';
        opp_m1_amt         : Decimal(18, 2)      @title: '1월 인건비';
        opp_m2_amt         : Decimal(18, 2)      @title: '2월 인건비';
        opp_m3_amt         : Decimal(18, 2)      @title: '3월 인건비';
        opp_m4_amt         : Decimal(18, 2)      @title: '4월 인건비';
        opp_m5_amt         : Decimal(18, 2)      @title: '5월 인건비';
        opp_m6_amt         : Decimal(18, 2)      @title: '6월 인건비';
        opp_m7_amt         : Decimal(18, 2)      @title: '7월 인건비';
        opp_m8_amt         : Decimal(18, 2)      @title: '8월 인건비';
        opp_m9_amt         : Decimal(18, 2)      @title: '9월 인건비';
        opp_m10_amt        : Decimal(18, 2)      @title: '10월 인건비';
        opp_m11_amt        : Decimal(18, 2)      @title: '11월 인건비';
        opp_m12_amt        : Decimal(18, 2)      @title: '12월 인건비';
}
