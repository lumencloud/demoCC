using {managed} from '@sap/cds/common';
using {common.project as project} from '../common/project';

namespace pl;

/**
 * 매출 장판지 공통 테이블
 */
entity wideview : managed {
    key ver              : String(20)          @title: '인터페이스 버전';
    key year             : String(6) not null  @title: '회계연도';
    key month            : String(6) not null  @title: '마감월';
    key prj_no           : String(30) not null @title: '프로젝트 번호';
        prj_detail       : Association to project
                               on prj_detail.prj_no = $self.prj_no;
    key seq              : Integer             @title: 'Platform 구분 pk';
    key src_type         : String(5) not null  @title: 'Data 속성(E(매출), WO(WG ORG(본부별)), WA(WG ACCOUNT(고객사별)), P(Platform), S(자회사), D(SFDC(Deal)))';
        // biz_opp_no       : String(30)          @title: '사업기회번호';
        rodr_m1_amt      : Decimal(18, 2)      @title: '수주 1월 금액';
        rodr_m2_amt      : Decimal(18, 2)      @title: '수주 2월 금액';
        rodr_m3_amt      : Decimal(18, 2)      @title: '수주 3월 금액';
        rodr_m4_amt      : Decimal(18, 2)      @title: '수주 4월 금액';
        rodr_m5_amt      : Decimal(18, 2)      @title: '수주 5월 금액';
        rodr_m6_amt      : Decimal(18, 2)      @title: '수주 6월 금액';
        rodr_m7_amt      : Decimal(18, 2)      @title: '수주 7월 금액';
        rodr_m8_amt      : Decimal(18, 2)      @title: '수주 8월 금액';
        rodr_m9_amt      : Decimal(18, 2)      @title: '수주 9월 금액';
        rodr_m10_amt     : Decimal(18, 2)      @title: '수주 10월 금액';
        rodr_m11_amt     : Decimal(18, 2)      @title: '수주 11월 금액';
        rodr_m12_amt     : Decimal(18, 2)      @title: '수주 12월 금액';
        sale_m1_amt      : Decimal(18, 2)      @title: '매출 1월 금액';
        sale_m2_amt      : Decimal(18, 2)      @title: '매출 2월 금액';
        sale_m3_amt      : Decimal(18, 2)      @title: '매출 3월 금액';
        sale_m4_amt      : Decimal(18, 2)      @title: '매출 4월 금액';
        sale_m5_amt      : Decimal(18, 2)      @title: '매출 5월 금액';
        sale_m6_amt      : Decimal(18, 2)      @title: '매출 6월 금액';
        sale_m7_amt      : Decimal(18, 2)      @title: '매출 7월 금액';
        sale_m8_amt      : Decimal(18, 2)      @title: '매출 8월 금액';
        sale_m9_amt      : Decimal(18, 2)      @title: '매출 9월 금액';
        sale_m10_amt     : Decimal(18, 2)      @title: '매출 10월 금액';
        sale_m11_amt     : Decimal(18, 2)      @title: '매출 11월 금액';
        sale_m12_amt     : Decimal(18, 2)      @title: '매출 12월 금액';
        prj_prfm_m1_amt  : Decimal(18, 2)      @title: '수행 1월 금액';
        prj_prfm_m2_amt  : Decimal(18, 2)      @title: '수행 2월 금액';
        prj_prfm_m3_amt  : Decimal(18, 2)      @title: '수행 3월 금액';
        prj_prfm_m4_amt  : Decimal(18, 2)      @title: '수행 4월 금액';
        prj_prfm_m5_amt  : Decimal(18, 2)      @title: '수행 5월 금액';
        prj_prfm_m6_amt  : Decimal(18, 2)      @title: '수행 6월 금액';
        prj_prfm_m7_amt  : Decimal(18, 2)      @title: '수행 7월 금액';
        prj_prfm_m8_amt  : Decimal(18, 2)      @title: '수행 8월 금액';
        prj_prfm_m9_amt  : Decimal(18, 2)      @title: '수행 9월 금액';
        prj_prfm_m10_amt : Decimal(18, 2)      @title: '수행 10월 금액';
        prj_prfm_m11_amt : Decimal(18, 2)      @title: '수행 11월 금액';
        prj_prfm_m12_amt : Decimal(18, 2)      @title: '수행 12월 금액';
        margin_m1_amt    : Decimal(18, 2)      @title: '마진 1월 금액';
        margin_m2_amt    : Decimal(18, 2)      @title: '마진 2월 금액';
        margin_m3_amt    : Decimal(18, 2)      @title: '마진 3월 금액';
        margin_m4_amt    : Decimal(18, 2)      @title: '마진 4월 금액';
        margin_m5_amt    : Decimal(18, 2)      @title: '마진 5월 금액';
        margin_m6_amt    : Decimal(18, 2)      @title: '마진 6월 금액';
        margin_m7_amt    : Decimal(18, 2)      @title: '마진 7월 금액';
        margin_m8_amt    : Decimal(18, 2)      @title: '마진 8월 금액';
        margin_m9_amt    : Decimal(18, 2)      @title: '마진 9월 금액';
        margin_m10_amt   : Decimal(18, 2)      @title: '마진 10월 금액';
        margin_m11_amt   : Decimal(18, 2)      @title: '마진 11월 금액';
        margin_m12_amt   : Decimal(18, 2)      @title: '마진 12월 금액';
}
