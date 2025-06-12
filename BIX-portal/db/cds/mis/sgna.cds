using {managed} from '@sap/cds/common';
using common from '../../../db/cds/mis/mis';
using pl from '../../../db/cds/mis/pl';

namespace sgna;

/**
 * 부문 본부 팀 조직구조 포함 SG&A 뷰 - api 호출 시조직 명 기준 aggregation 요청
 */
view sga_result_with_org_view as select from
( 
    select d.div_id, c.hdqt_id, b.team_id, a.*
    from sgna.sga_result_view as a
    left join pl.org_structure_view as b
    on a.c_org_id = b.team_id
    left join ( select distinct div_id, hdqt_id from pl.org_structure_view ) as c
    on a.c_org_id = c.hdqt_id
    or b.hdqt_id = c.hdqt_id
    left join ( select distinct div_id from pl.org_structure_view ) as d
    on a.c_org_id = d.div_id
    or b.div_id = d.div_id
    or c.div_id = d.div_id
){
    key year,
    key month,
    key sga_type,
    key ccorg_cd,
    key commitment_item,
    type,
    result_year,
    result_month,
    div_id,
    hdqt_id,
    team_id,
    org_id,
    c_org_id,
    amount,
    amount_sum 
}

/**
 * 코스트센터 계정 - 전사/사업 타입 구분 매핑기준 테이블 (임시)
 */
entity sga_biz_org_mapping {
    key ccorg_cd : String(10);
        type     : String(2);
}

/**
 * [SG&A 실적] 목업테이블
 */
entity sga_wideview : managed {
    key year            : Integer;
    key month           : Integer;
    key sga_type        : String(10);
    key ccorg_cd        : String(10);
    key commitment_item : String(24);
        org_id          : String(10) not null;
        gl_account      : String(10);
        sga_m1_amt      : Decimal(20, 2);
        sga_m2_amt      : Decimal(20, 2);
        sga_m3_amt      : Decimal(20, 2);
        sga_m4_amt      : Decimal(20, 2);
        sga_m5_amt      : Decimal(20, 2);
        sga_m6_amt      : Decimal(20, 2);
        sga_m7_amt      : Decimal(20, 2);
        sga_m8_amt      : Decimal(20, 2);
        sga_m9_amt      : Decimal(20, 2);
        sga_m10_amt     : Decimal(20, 2);
        sga_m11_amt     : Decimal(20, 2);
        sga_m12_amt     : Decimal(20, 2);
        remark          : String(40);
}

entity sga_wideview_test : managed {
    key year            : Integer;
    key month           : Integer;
    key sga_type        : String(10);
    key ccorg_cd        : String(10);
    key commitment_item : String(24);
        org_id          : String(10) not null;
        gl_account      : String(10);
        sga_m1_amt      : Decimal(20, 2);
        sga_m2_amt      : Decimal(20, 2);
        sga_m3_amt      : Decimal(20, 2);
        sga_m4_amt      : Decimal(20, 2);
        sga_m5_amt      : Decimal(20, 2);
        sga_m6_amt      : Decimal(20, 2);
        sga_m7_amt      : Decimal(20, 2);
        sga_m8_amt      : Decimal(20, 2);
        sga_m9_amt      : Decimal(20, 2);
        sga_m10_amt     : Decimal(20, 2);
        sga_m11_amt     : Decimal(20, 2);
        sga_m12_amt     : Decimal(20, 2);
        remark          : String(40);
}

/**
 * sg&a 실적 장판지 데이터의 ccorg_cd 와
 * 조직 테이블의 use_yn = true 인 현재 유효한 조직의 ccorg_cd 값을 기준으로
 * 현재 기준 조직아이디 c_org_id 컬럼조인
 * 
 * use_yn true 중 ccorg_cd 144000 값이 10934 [DT TF(본부)] / 10989 [DT TF(팀)] 중복으로 존재하여, 10989 임의 제거
 * 
 * ccorg_cd 기준 매핑이 불가능한 816개 데이터는 not null 조건으로 제외
 */
view sga_wideview_with_current_org as select from (
    select b.id as c_org_id, a.*
        from sgna.sga_wideview_test as a
    left join 
    (
        select *
            from common.mis_com_org
        where use_yn = true
        and vrtl_org_yn = false
        and id <> '10989'   // use_yn true 중 ccorg_cd 144000 값이 10934 / 10989 중복으로 존재하여, 10989 임의 제거 
    ) as b
    on a.ccorg_cd = b.ccorg_cd
    where b.id is not null
){
    key year,
    key month,
    key sga_type,
    key ccorg_cd,
    key commitment_item,
        c_org_id,
        org_id,
        sga_m1_amt,
        sga_m2_amt,
        sga_m3_amt,
        sga_m4_amt,
        sga_m5_amt,
        sga_m6_amt,
        sga_m7_amt,
        sga_m8_amt,
        sga_m9_amt,
        sga_m10_amt,
        sga_m11_amt,
        sga_m12_amt,
        remark
}

/**
 * SG&A 월별 unpivot 뷰
 * 
 * 데이터 등록월 (month 컬럼) 기준 전 월의 실적 값을 실적으로 보여주는 뷰
 * 
 * 구분을 위해 result_month (month 전 월) 컬럼 별도 추가
 */
entity sga_result_view as select from (
    select year, month, sga_type,
        result.ccorg_cd, commitment_item, org_id, c_org_id,
        result_month, amount, amount_sum, map.type
    from 
    (
        select year, month, sga_type, ccorg_cd, commitment_item, org_id, c_org_id,
            '01' as result_month : String(2), sga_m1_amt as amount,
            sga_m1_amt as amount_sum
        from sgna.sga_wideview_with_current_org where month = 2
        union all
        select year, month, sga_type, ccorg_cd, commitment_item, org_id, c_org_id,
            '02' as result_month : String(2), sga_m2_amt as amount,
            sga_m1_amt+sga_m2_amt as amount_sum
        from sgna.sga_wideview_with_current_org where month = 3
        union all
        select year, month, sga_type, ccorg_cd, commitment_item, org_id, c_org_id,
            '03' as result_month : String(2), sga_m3_amt as amount,
            sga_m1_amt+sga_m2_amt+sga_m3_amt as amount_sum
        from sgna.sga_wideview_with_current_org where month = 4
        union all
        select year, month, sga_type, ccorg_cd, commitment_item, org_id, c_org_id,
            '04' as result_month : String(2), sga_m4_amt as amount,
            sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt as amount_sum
        from sgna.sga_wideview_with_current_org where month = 5
        union all
        select year, month, sga_type, ccorg_cd, commitment_item, org_id, c_org_id,
            '05' as result_month : String(2), sga_m5_amt as amount,
            sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt as amount_sum
        from sgna.sga_wideview_with_current_org where month = 6
        union all
        select year, month, sga_type, ccorg_cd, commitment_item, org_id, c_org_id,
            '06' as result_month : String(2), sga_m6_amt as amount,
            sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt+sga_m6_amt as amount_sum
        from sgna.sga_wideview_with_current_org where month = 7
        union all
        select year, month, sga_type, ccorg_cd, commitment_item, org_id, c_org_id,
            '07' as result_month : String(2), sga_m7_amt as amount,
            sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt+sga_m6_amt
            +sga_m7_amt as amount_sum
        from sgna.sga_wideview_with_current_org where month = 8
        union all
        select year, month, sga_type, ccorg_cd, commitment_item, org_id, c_org_id,
            '08' as result_month : String(2), sga_m8_amt as amount,
            sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt+sga_m6_amt
            +sga_m7_amt+sga_m8_amt as amount_sum
        from sgna.sga_wideview_with_current_org where month = 9
        union all
        select year, month, sga_type, ccorg_cd, commitment_item, org_id, c_org_id,
            '09' as result_month : String(2), sga_m9_amt as amount,
            sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt+sga_m6_amt
            +sga_m7_amt+sga_m8_amt+sga_m9_amt as amount_sum
        from sgna.sga_wideview_with_current_org where month = 10
        union all
        select year, month, sga_type, ccorg_cd, commitment_item, org_id, c_org_id,
            '10' as result_month : String(2), sga_m10_amt as amount,
            sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt+sga_m6_amt
            +sga_m7_amt+sga_m8_amt+sga_m9_amt+sga_m10_amt as amount_sum
        from sgna.sga_wideview_with_current_org where month = 11
        union all
        select year, month, sga_type, ccorg_cd, commitment_item, org_id, c_org_id,
            '11' as result_month : String(2), sga_m11_amt as amount,
            sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt+sga_m6_amt
            +sga_m7_amt+sga_m8_amt+sga_m9_amt+sga_m10_amt+sga_m11_amt as amount_sum
        from sgna.sga_wideview_with_current_org where month = 12
        union all
        select year, month, sga_type, ccorg_cd, commitment_item, org_id, c_org_id,
            '12' as result_month : String(2), sga_m12_amt as amount,
            sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt+sga_m6_amt
            +sga_m7_amt+sga_m8_amt+sga_m9_amt+sga_m10_amt+sga_m11_amt+sga_m12_amt as amount_sum
        from sgna.sga_wideview_with_current_org where month = 12
    ) as result
    left join sgna.sga_biz_org_mapping as map
    on map.ccorg_cd = result.ccorg_cd
)
{
    key year,
    key month,
    key sga_type,
    key ccorg_cd,
    key commitment_item,
    type,
    cast(year as String(4)) as result_year,
    result_month,
    org_id,
    c_org_id,
    amount,
    amount_sum
}

/**
 * [인력 계획] 목업테이블
 */
entity org_b_labor : managed {
    key org_id           :  String(10) not null;
    key year             : Integer;
    key month            : Integer;
        ccorg_cd         : String(10);
        bill_m1_amt      : Double;
        bill_m2_amt      : Double;
        bill_m3_amt      : Double;
        bill_m4_amt      : Double;
        bill_m5_amt      : Double;
        bill_m6_amt      : Double;
        bill_m7_amt      : Double;
        bill_m8_amt      : Double;
        bill_m9_amt      : Double;
        bill_m10_amt     : Double;
        bill_m11_amt     : Double;
        bill_m12_amt     : Double;
}

/**
 * [인력 계획] 목업테이블
 */
entity org_opp_labor : managed {
    key id               : Integer not null;
        year             : Integer;
        org_id           : String(10) not null;
        type             : String(2);
        prfm_str_dt      : Date;
        prfm_end_dt      : Date;
        obtain_order_amt : Double;
        sales_amt        : Double;
        margin_rate      : Double;
        opp_m1_amt       : Double;
        opp_m2_amt       : Double;
        opp_m3_amt       : Double;
        opp_m4_amt       : Double;
        opp_m5_amt       : Double;
        opp_m6_amt       : Double;
        opp_m7_amt       : Double;
        opp_m8_amt       : Double;
        opp_m9_amt       : Double;
        opp_m10_amt      : Double;
        opp_m11_amt      : Double;
        opp_m12_amt      : Double;
}

/**
 * [인력 계획] 목업테이블
 */
entity org_total_labor : managed {
    key org_id        : String(10) not null;
    key year          : Integer;
    key month         : Integer;
        ccorg_cd      : String(10);
        total_m1_amt  : Double;
        total_m2_amt  : Double;
        total_m3_amt  : Double;
        total_m4_amt  : Double;
        total_m5_amt  : Double;
        total_m6_amt  : Double;
        total_m7_amt  : Double;
        total_m8_amt  : Double;
        total_m9_amt  : Double;
        total_m10_amt : Double;
        total_m11_amt : Double;
        total_m12_amt : Double;
}