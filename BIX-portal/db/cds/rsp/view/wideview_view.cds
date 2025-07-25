using sga.expense_co_view as sga_expense_co_view from '../../sga/view/expense_co_view';
using rsp.org_b_labor_view as rsp_org_b_labor_view from '../../rsp/view/org_b_labor_view';
using rsp.org_mm_view as rsp_org_mm_view from '../../rsp/view/org_mm_view';
using rsp.opp_labor_view as rsp_opp_labor_view from '../../rsp/view/opp_labor_view';
using rsp.org_total_labor_view as rsp_org_total_labor_view from '../../rsp/view/org_total_labor_view';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';

namespace rsp;

/**
 * 조직별 인건비 장판지 데이터
 *
 * 모든 인건비 관련 테이블을 조직(CCORG_CD) 단위로 묶어놓은 장판지 뷰
 *
 * [조직별 총 인건비] RSP_ORG_TOTAL_LABOR_VIEW [ERP] <br/>
 * [조직별 프로젝트 투입 인건비] RSP_ORG_LABOR_VIEW (RSP_PJR_LABOR 프로젝트 투입 인건비의 조직별 집계) [PROMIS] <br/>
 * [위임 경비 중 종업원급여/IB배부금] SGA_EXPENSE_CO - gl_account = '702202' '702201'(실적월 only) [수기] <br/>
 * [조직별 계획 인건비] RSP_ORG_MM_VIEW [PROMIS] <br/>
 * [사업기회, 조직별 미확보 인건비] RSP_OPP_LABOR_VIEW [SFDC] <br/>
 */
view wideview_view as
          select from (
               select
                    case
                         when sga_labor.ver      is not null
                              then sga_labor.ver
                         when org_mm.ver         is not null
                              then org_mm.ver
                         when opp.ver            is not null
                              then opp.ver
                    end as ver,
                    case
                         when sga_labor.year     is not null
                              then sga_labor.year
                         when org_mm.year        is not null
                              then org_mm.year
                         when opp.year           is not null
                              then opp.year
                    end as year,
                    case
                         when sga_labor.month    is not null
                              then sga_labor.month
                         when org_mm.month       is not null
                              and org_mm.month   =      '12'
                              and substring(
                                   org_mm.ver, 6, 2
                              )                  =      '13'
                              then '13'
                         when org_mm.month       is not null
                              then org_mm.month
                         when opp.month          is not null
                              and opp.month      =      '12'
                              and substring(
                                   opp.ver, 6, 2
                              )                  =      '13'
                              then '13'
                         when opp.month          is not null
                              then opp.month
                    end as month,
                    case
                         when sga_labor.ccorg_cd is not null
                              then sga_labor.ccorg_cd
                         when org_mm.ccorg_cd    is not null
                              then org_mm.ccorg_cd
                         when opp.ccorg_cd       is not null
                              then opp.ccorg_cd
                    end as ccorg_cd,
                    total_m1_amt,
                    total_m2_amt,
                    total_m3_amt,
                    total_m4_amt,
                    total_m5_amt,
                    total_m6_amt,
                    total_m7_amt,
                    total_m8_amt,
                    total_m9_amt,
                    total_m10_amt,
                    total_m11_amt,
                    total_m12_amt,
                    total_m1_emp,
                    total_m2_emp,
                    total_m3_emp,
                    total_m4_emp,
                    total_m5_emp,
                    total_m6_emp,
                    total_m7_emp,
                    total_m8_emp,
                    total_m9_emp,
                    total_m10_emp,
                    total_m11_emp,
                    total_m12_emp,
                    avg_m1_amt,
                    avg_m2_amt,
                    avg_m3_amt,
                    avg_m4_amt,
                    avg_m5_amt,
                    avg_m6_amt,
                    avg_m7_amt,
                    avg_m8_amt,
                    avg_m9_amt,
                    avg_m10_amt,
                    avg_m11_amt,
                    avg_m12_amt,
                    bill_m1_amt,
                    bill_m2_amt,
                    bill_m3_amt,
                    bill_m4_amt,
                    bill_m5_amt,
                    bill_m6_amt,
                    bill_m7_amt,
                    bill_m8_amt,
                    bill_m9_amt,
                    bill_m10_amt,
                    bill_m11_amt,
                    bill_m12_amt,
                    indirect_cost_m1,
                    indirect_cost_m2,
                    indirect_cost_m3,
                    indirect_cost_m4,
                    indirect_cost_m5,
                    indirect_cost_m6,
                    indirect_cost_m7,
                    indirect_cost_m8,
                    indirect_cost_m9,
                    indirect_cost_m10,
                    indirect_cost_m11,
                    indirect_cost_m12,
                    co_m1_amt,
                    co_m2_amt,
                    co_m3_amt,
                    co_m4_amt,
                    co_m5_amt,
                    co_m6_amt,
                    co_m7_amt,
                    co_m8_amt,
                    co_m9_amt,
                    co_m10_amt,
                    co_m11_amt,
                    co_m12_amt,
                    bun_mm_m1_amt,
                    bun_mm_m2_amt,
                    bun_mm_m3_amt,
                    bun_mm_m4_amt,
                    bun_mm_m5_amt,
                    bun_mm_m6_amt,
                    bun_mm_m7_amt,
                    bun_mm_m8_amt,
                    bun_mm_m9_amt,
                    bun_mm_m10_amt,
                    bun_mm_m11_amt,
                    bun_mm_m12_amt,
                    bun_mm_amt_sum,
                    b_mm_m1_amt,
                    b_mm_m2_amt,
                    b_mm_m3_amt,
                    b_mm_m4_amt,
                    b_mm_m5_amt,
                    b_mm_m6_amt,
                    b_mm_m7_amt,
                    b_mm_m8_amt,
                    b_mm_m9_amt,
                    b_mm_m10_amt,
                    b_mm_m11_amt,
                    b_mm_m12_amt,
                    b_mm_amt_sum,
                    bn_mm_m1_amt,
                    bn_mm_m2_amt,
                    bn_mm_m3_amt,
                    bn_mm_m4_amt,
                    bn_mm_m5_amt,
                    bn_mm_m6_amt,
                    bn_mm_m7_amt,
                    bn_mm_m8_amt,
                    bn_mm_m9_amt,
                    bn_mm_m10_amt,
                    bn_mm_m11_amt,
                    bn_mm_m12_amt,
                    bn_mm_amt_sum,
                    opp_m1_amt,
                    opp_m2_amt,
                    opp_m3_amt,
                    opp_m4_amt,
                    opp_m5_amt,
                    opp_m6_amt,
                    opp_m7_amt,
                    opp_m8_amt,
                    opp_m9_amt,
                    opp_m10_amt,
                    opp_m11_amt,
                    opp_m12_amt,
                    opp_year_amt,
                    est_avg_year_amt,
                    est_total_year_emp,
                    est_total_year_amt,
                    total_year_emp,
                    total_year_amt,
                    avg_year_amt,
                    bill_year_amt,
                    indirect_cost_year,
                    co_year_amt,
                    org.*
               from (
                    select
                         case
                              when total_labor.ver      is not null
                                   then total_labor.ver
                              when org_b.ver            is not null
                                   then org_b.ver
                              when co.ver               is not null
                                   then co.ver
                         end                                                                                                                                                                                                                                  as ver,
                         case
                              when total_labor.year     is not null
                                   then total_labor.year
                              when org_b.year           is not null
                                   then org_b.year
                              when co.year              is not null
                                   then co.year
                         end                                                                                                                                                                                                                                  as year,
                         case
                              when total_labor.month    is not null
                                   then total_labor.month
                              when org_b.month          is not null
                                   and org_b.month      =      '12'
                                   and substring(
                                        org_b.ver, 6, 2
                                   )                    =      '13'
                                   then '13'
                              when org_b.month          is not null
                                   then org_b.month
                              when co.month             is not null
                                   then co.month
                         end                                                                                                                                                                                                                                  as month,
                         case
                              when total_labor.ccorg_cd is not null
                                   then total_labor.ccorg_cd
                              when org_b.ccorg_cd       is not null
                                   then org_b.ccorg_cd
                              when co.ccorg_cd          is not null
                                   then co.ccorg_cd
                         end                                                                                                                                                                                                                                  as ccorg_cd,
                         total_m1_amt,
                         total_m2_amt,
                         total_m3_amt,
                         total_m4_amt,
                         total_m5_amt,
                         total_m6_amt,
                         total_m7_amt,
                         total_m8_amt,
                         total_m9_amt,
                         total_m10_amt,
                         total_m11_amt,
                         total_m12_amt,
                         total_m1_emp,
                         total_m2_emp,
                         total_m3_emp,
                         total_m4_emp,
                         total_m5_emp,
                         total_m6_emp,
                         total_m7_emp,
                         total_m8_emp,
                         total_m9_emp,
                         total_m10_emp,
                         total_m11_emp,
                         total_m12_emp,
                         avg_m1_amt,
                         avg_m2_amt,
                         avg_m3_amt,
                         avg_m4_amt,
                         avg_m5_amt,
                         avg_m6_amt,
                         avg_m7_amt,
                         avg_m8_amt,
                         avg_m9_amt,
                         avg_m10_amt,
                         avg_m11_amt,
                         avg_m12_amt,
                         bill_m1_amt,
                         bill_m2_amt,
                         bill_m3_amt,
                         bill_m4_amt,
                         bill_m5_amt,
                         bill_m6_amt,
                         bill_m7_amt,
                         bill_m8_amt,
                         bill_m9_amt,
                         bill_m10_amt,
                         bill_m11_amt,
                         bill_m12_amt,
                         indirect_cost_m1,
                         indirect_cost_m2,
                         indirect_cost_m3,
                         indirect_cost_m4,
                         indirect_cost_m5,
                         indirect_cost_m6,
                         indirect_cost_m7,
                         indirect_cost_m8,
                         indirect_cost_m9,
                         indirect_cost_m10,
                         indirect_cost_m11,
                         indirect_cost_m12,
                         co_m1_amt,
                         co_m2_amt,
                         co_m3_amt,
                         co_m4_amt,
                         co_m5_amt,
                         co_m6_amt,
                         co_m7_amt,
                         co_m8_amt,
                         co_m9_amt,
                         co_m10_amt,
                         co_m11_amt,
                         co_m12_amt,
                         (
                              case
                                   when to_integer(total_labor.month)                                                                   < 1
                                        then avg_m1_amt
                                   else 0
                              end + case
                                         when to_integer(total_labor.month)                                                             < 2
                                              then avg_m2_amt
                                         else 0
                                    end + case
                                               when to_integer(total_labor.month)                                                       < 3
                                                    then avg_m3_amt
                                               else 0
                                          end + case
                                                     when to_integer(total_labor.month)                                                 < 4
                                                          then avg_m4_amt
                                                     else 0
                                                end + case
                                                           when to_integer(total_labor.month)                                           < 5
                                                                then avg_m5_amt
                                                           else 0
                                                      end + case
                                                                 when to_integer(total_labor.month)                                     < 6
                                                                      then avg_m6_amt
                                                                 else 0
                                                            end + case
                                                                       when to_integer(total_labor.month)                               < 7
                                                                            then avg_m7_amt
                                                                       else 0
                                                                  end + case
                                                                             when to_integer(total_labor.month)                         < 8
                                                                                  then avg_m8_amt
                                                                             else 0
                                                                        end + case
                                                                                   when to_integer(total_labor.month)                   < 9
                                                                                        then avg_m9_amt
                                                                                   else 0
                                                                              end + case
                                                                                         when to_integer(total_labor.month)             < 10
                                                                                              then avg_m10_amt
                                                                                         else 0
                                                                                    end + case
                                                                                               when to_integer(total_labor.month)       < 11
                                                                                                    then avg_m11_amt
                                                                                               else 0
                                                                                          end + case
                                                                                                     when to_integer(total_labor.month) < 12
                                                                                                          then avg_m12_amt
                                                                                                     else 0
                                                                                                end
                         )                                                                                                                                                                                                                                    as est_avg_year_amt   : Decimal(18, 2),

                         (
                              case
                                   when to_integer(total_labor.month)                                                                   < 1
                                        then total_m1_emp
                                   else 0
                              end + case
                                         when to_integer(total_labor.month)                                                             < 2
                                              then total_m2_emp
                                         else 0
                                    end + case
                                               when to_integer(total_labor.month)                                                       < 3
                                                    then total_m3_emp
                                               else 0
                                          end + case
                                                     when to_integer(total_labor.month)                                                 < 4
                                                          then total_m4_emp
                                                     else 0
                                                end + case
                                                           when to_integer(total_labor.month)                                           < 5
                                                                then total_m5_emp
                                                           else 0
                                                      end + case
                                                                 when to_integer(total_labor.month)                                     < 6
                                                                      then total_m6_emp
                                                                 else 0
                                                            end + case
                                                                       when to_integer(total_labor.month)                               < 7
                                                                            then total_m7_emp
                                                                       else 0
                                                                  end + case
                                                                             when to_integer(total_labor.month)                         < 8
                                                                                  then total_m8_emp
                                                                             else 0
                                                                        end + case
                                                                                   when to_integer(total_labor.month)                   < 9
                                                                                        then total_m9_emp
                                                                                   else 0
                                                                              end + case
                                                                                         when to_integer(total_labor.month)             < 10
                                                                                              then total_m10_emp
                                                                                         else 0
                                                                                    end + case
                                                                                               when to_integer(total_labor.month)       < 11
                                                                                                    then total_m11_emp
                                                                                               else 0
                                                                                          end + case
                                                                                                     when to_integer(total_labor.month) < 12
                                                                                                          then total_m12_emp
                                                                                                     else 0
                                                                                                end
                         )                                                                                                                                                                                                                                    as est_total_year_emp : Decimal(18, 2),

                         (
                              case
                                   when to_integer(total_labor.month)                                                                   < 1
                                        then total_m1_amt
                                   else 0
                              end + case
                                         when to_integer(total_labor.month)                                                             < 2
                                              then total_m2_amt
                                         else 0
                                    end + case
                                               when to_integer(total_labor.month)                                                       < 3
                                                    then total_m3_amt
                                               else 0
                                          end + case
                                                     when to_integer(total_labor.month)                                                 < 4
                                                          then total_m4_amt
                                                     else 0
                                                end + case
                                                           when to_integer(total_labor.month)                                           < 5
                                                                then total_m5_amt
                                                           else 0
                                                      end + case
                                                                 when to_integer(total_labor.month)                                     < 6
                                                                      then total_m6_amt
                                                                 else 0
                                                            end + case
                                                                       when to_integer(total_labor.month)                               < 7
                                                                            then total_m7_amt
                                                                       else 0
                                                                  end + case
                                                                             when to_integer(total_labor.month)                         < 8
                                                                                  then total_m8_amt
                                                                             else 0
                                                                        end + case
                                                                                   when to_integer(total_labor.month)                   < 9
                                                                                        then total_m9_amt
                                                                                   else 0
                                                                              end + case
                                                                                         when to_integer(total_labor.month)             < 10
                                                                                              then total_m10_amt
                                                                                         else 0
                                                                                    end + case
                                                                                               when to_integer(total_labor.month)       < 11
                                                                                                    then total_m11_amt
                                                                                               else 0
                                                                                          end + case
                                                                                                     when to_integer(total_labor.month) < 12
                                                                                                          then total_m12_amt
                                                                                                     else 0
                                                                                                end
                         )                                                                                                                                                                                                                                    as est_total_year_amt : Decimal(18, 2),
                         total_m1_emp + total_m2_emp + total_m3_emp + total_m4_emp + total_m5_emp + total_m6_emp + total_m7_emp + total_m8_emp + total_m9_emp + total_m10_emp + total_m11_emp + total_m12_emp                                                 as total_year_emp     : Decimal(18, 2),
                         total_m1_amt + total_m2_amt + total_m3_amt + total_m4_amt + total_m5_amt + total_m6_amt + total_m7_amt + total_m8_amt + total_m9_amt + total_m10_amt + total_m11_amt + total_m12_amt                                                 as total_year_amt     : Decimal(18, 2),
                         avg_m1_amt + avg_m2_amt + avg_m3_amt + avg_m4_amt + avg_m5_amt + avg_m6_amt + avg_m7_amt + avg_m8_amt + avg_m9_amt + avg_m10_amt + avg_m11_amt + avg_m12_amt                                                                         as avg_year_amt       : Decimal(18, 2),
                         bill_m1_amt + bill_m2_amt + bill_m3_amt + bill_m4_amt + bill_m5_amt + bill_m6_amt + bill_m7_amt + bill_m8_amt + bill_m9_amt + bill_m10_amt + bill_m11_amt + bill_m12_amt                                                             as bill_year_amt      : Decimal(18, 2),
                         indirect_cost_m1 + indirect_cost_m2 + indirect_cost_m3 + indirect_cost_m4 + indirect_cost_m5 + indirect_cost_m6 + indirect_cost_m7 + indirect_cost_m8 + indirect_cost_m9 + indirect_cost_m10 + indirect_cost_m11 + indirect_cost_m12 as indirect_cost_year : Decimal(18, 2),
                         co_m1_amt + co_m2_amt + co_m3_amt + co_m4_amt + co_m5_amt + co_m6_amt + co_m7_amt + co_m8_amt + co_m9_amt + co_m10_amt + co_m11_amt + co_m12_amt                                                                                     as co_year_amt        : Decimal(18, 2) @title: '연간 총 위임 비용'
                    from rsp_org_total_labor_view as total_labor
                    full outer join rsp_org_b_labor_view as org_b
                         on  total_labor.ver             = org_b.ver
                         and total_labor.year            = org_b.year
                         and case
                                  when total_labor.month = '13'
                                       then '12'
                                  else total_labor.month
                             end = org_b.month
                         and total_labor.ccorg_cd        = org_b.ccorg_cd
                    full outer join (
                         select
                              ver,
                              year,
                              month,
                              ccorg_cd,
                              gl_account,
                              commitment_item,
                              sum(co_m1_amt)  as co_m1_amt,
                              sum(co_m2_amt)  as co_m2_amt,
                              sum(co_m3_amt)  as co_m3_amt,
                              sum(co_m4_amt)  as co_m4_amt,
                              sum(co_m5_amt)  as co_m5_amt,
                              sum(co_m6_amt)  as co_m6_amt,
                              sum(co_m7_amt)  as co_m7_amt,
                              sum(co_m8_amt)  as co_m8_amt,
                              sum(co_m9_amt)  as co_m9_amt,
                              sum(co_m10_amt) as co_m10_amt,
                              sum(co_m11_amt) as co_m11_amt,
                              sum(co_m12_amt) as co_m12_amt
                         from (
                              select * from sga_expense_co_view
                              where
                                   gl_account = '702202'
                         union all
                              select
                                   ver,
                                   year,
                                   month,
                                   ccorg_cd,
                                   '702202' as gl_account,
                                   commitment_item,
                                   case
                                        when gl_account            =  '702201'
                                             and to_integer(month) >= 1
                                             then co_m1_amt
                                        else 0
                                   end      as co_m1_amt,
                                   case
                                        when gl_account            =  '702201'
                                             and to_integer(month) >= 2
                                             then co_m2_amt
                                        else 0
                                   end      as co_m2_amt,
                                   case
                                        when gl_account            =  '702201'
                                             and to_integer(month) >= 3
                                             then co_m3_amt
                                        else 0
                                   end      as co_m3_amt,
                                   case
                                        when gl_account            =  '702201'
                                             and to_integer(month) >= 4
                                             then co_m4_amt
                                        else 0
                                   end      as co_m4_amt,
                                   case
                                        when gl_account            =  '702201'
                                             and to_integer(month) >= 5
                                             then co_m5_amt
                                        else 0
                                   end      as co_m5_amt,
                                   case
                                        when gl_account            =  '702201'
                                             and to_integer(month) >= 6
                                             then co_m6_amt
                                        else 0
                                   end      as co_m6_amt,
                                   case
                                        when gl_account            =  '702201'
                                             and to_integer(month) >= 7
                                             then co_m7_amt
                                        else 0
                                   end      as co_m7_amt,
                                   case
                                        when gl_account            =  '702201'
                                             and to_integer(month) >= 8
                                             then co_m8_amt
                                        else 0
                                   end      as co_m8_amt,
                                   case
                                        when gl_account            =  '702201'
                                             and to_integer(month) >= 9
                                             then co_m9_amt
                                        else 0
                                   end      as co_m9_amt,
                                   case
                                        when gl_account            =  '702201'
                                             and to_integer(month) >= 10
                                             then co_m10_amt
                                        else 0
                                   end      as co_m10_amt,
                                   case
                                        when gl_account            =  '702201'
                                             and to_integer(month) >= 11
                                             then co_m11_amt
                                        else 0
                                   end      as co_m11_amt,
                                   case
                                        when gl_account            =  '702201'
                                             and to_integer(month) >= 12
                                             then co_m12_amt
                                        else 0
                                   end      as co_m12_amt
                              from sga_expense_co_view
                              where
                                   gl_account = '702201'
                         )
                         group by
                              ver,
                              year,
                              month,
                              ccorg_cd,
                              gl_account,
                              commitment_item
                    ) as co
                         on (
                                  total_labor.ver      = co.ver
                              and total_labor.year     = co.year
                              and total_labor.month    = co.month
                              and total_labor.ccorg_cd = co.ccorg_cd
                              and co.gl_account        = '702202'
                         )
                         or (
                                  org_b.ver            = co.ver
                              and org_b.year           = co.year
                              and org_b.month          = case
                                                              when co.month = '13'
                                                                   then '12'
                                                              else co.month
                                                         end
                              and org_b.ccorg_cd       = co.ccorg_cd
                              and co.gl_account        = '702202'
                         )
                    where
                            co.gl_account =  '702202'
                         or co.gl_account is null
               ) as sga_labor
               full outer join (
                    select
                         ver,
                         year,
                         month,
                         ccorg_cd,
                         sum(mm_m1_amt)  as bun_mm_m1_amt,
                         sum(mm_m2_amt)  as bun_mm_m2_amt,
                         sum(mm_m3_amt)  as bun_mm_m3_amt,
                         sum(mm_m4_amt)  as bun_mm_m4_amt,
                         sum(mm_m5_amt)  as bun_mm_m5_amt,
                         sum(mm_m6_amt)  as bun_mm_m6_amt,
                         sum(mm_m7_amt)  as bun_mm_m7_amt,
                         sum(mm_m8_amt)  as bun_mm_m8_amt,
                         sum(mm_m9_amt)  as bun_mm_m9_amt,
                         sum(mm_m10_amt) as bun_mm_m10_amt,
                         sum(mm_m11_amt) as bun_mm_m11_amt,
                         sum(mm_m12_amt) as bun_mm_m12_amt,
                         sum(mm_amt_sum) as bun_mm_amt_sum
                    from rsp_org_mm_view
                    group by
                         ver,
                         year,
                         month,
                         ccorg_cd
               ) as org_mm
                    on (
                             sga_labor.ver             = org_mm.ver
                         and sga_labor.year            = org_mm.year
                         and case
                                  when sga_labor.month = '13'
                                       then '12'
                                  else sga_labor.month
                             end = org_mm.month
                         and sga_labor.ccorg_cd        = org_mm.ccorg_cd
                    )
               full outer join (
                    select
                         ver,
                         year,
                         month,
                         ccorg_cd,
                         sum(mm_m1_amt)  as b_mm_m1_amt,
                         sum(mm_m2_amt)  as b_mm_m2_amt,
                         sum(mm_m3_amt)  as b_mm_m3_amt,
                         sum(mm_m4_amt)  as b_mm_m4_amt,
                         sum(mm_m5_amt)  as b_mm_m5_amt,
                         sum(mm_m6_amt)  as b_mm_m6_amt,
                         sum(mm_m7_amt)  as b_mm_m7_amt,
                         sum(mm_m8_amt)  as b_mm_m8_amt,
                         sum(mm_m9_amt)  as b_mm_m9_amt,
                         sum(mm_m10_amt) as b_mm_m10_amt,
                         sum(mm_m11_amt) as b_mm_m11_amt,
                         sum(mm_m12_amt) as b_mm_m12_amt,
                         sum(mm_amt_sum) as b_mm_amt_sum
                    from rsp_org_mm_view
                    where
                         bun_tp = 'B'
                    group by
                         ver,
                         year,
                         month,
                         ccorg_cd
               ) as org_mm_b
                    on (
                             sga_labor.ver             = org_mm_b.ver
                         and sga_labor.year            = org_mm_b.year
                         and case
                                  when sga_labor.month = '13'
                                       then '12'
                                  else sga_labor.month
                             end = org_mm_b.month
                         and sga_labor.ccorg_cd        = org_mm_b.ccorg_cd
                    )
                    or (
                             org_mm.ver                = org_mm_b.ver
                         and org_mm.year               = org_mm_b.year
                         and org_mm.month              = org_mm_b.month
                         and org_mm.ccorg_cd           = org_mm_b.ccorg_cd
                    )
               full outer join (
                    select
                         ver,
                         year,
                         month,
                         ccorg_cd,
                         sum(mm_m1_amt)  as bn_mm_m1_amt,
                         sum(mm_m2_amt)  as bn_mm_m2_amt,
                         sum(mm_m3_amt)  as bn_mm_m3_amt,
                         sum(mm_m4_amt)  as bn_mm_m4_amt,
                         sum(mm_m5_amt)  as bn_mm_m5_amt,
                         sum(mm_m6_amt)  as bn_mm_m6_amt,
                         sum(mm_m7_amt)  as bn_mm_m7_amt,
                         sum(mm_m8_amt)  as bn_mm_m8_amt,
                         sum(mm_m9_amt)  as bn_mm_m9_amt,
                         sum(mm_m10_amt) as bn_mm_m10_amt,
                         sum(mm_m11_amt) as bn_mm_m11_amt,
                         sum(mm_m12_amt) as bn_mm_m12_amt,
                         sum(mm_amt_sum) as bn_mm_amt_sum
                    from rsp_org_mm_view
                    where
                         bun_tp in (
                              'B', 'N'
                         )
                    group by
                         ver,
                         year,
                         month,
                         ccorg_cd
               ) as org_mm_bn
                    on (
                             sga_labor.ver             = org_mm_bn.ver
                         and sga_labor.year            = org_mm_bn.year
                         and case
                                  when sga_labor.month = '13'
                                       then '12'
                                  else sga_labor.month
                             end = org_mm_bn.month
                         and sga_labor.ccorg_cd        = org_mm_bn.ccorg_cd
                    )
                    or (
                             org_mm.ver                = org_mm_bn.ver
                         and org_mm.year               = org_mm_bn.year
                         and org_mm.month              = org_mm_bn.month
                         and org_mm.ccorg_cd           = org_mm_bn.ccorg_cd
                    )
                    or (
                             org_mm_b.ver              = org_mm_bn.ver
                         and org_mm_b.year             = org_mm_bn.year
                         and org_mm_b.month            = org_mm_bn.month
                         and org_mm_b.ccorg_cd         = org_mm_bn.ccorg_cd
                    )
               full outer join (
                    select
                         ver,
                         year,
                         month,
                         ccorg_cd,
                         sum(opp_m1_amt)  as opp_m1_amt,
                         sum(opp_m2_amt)  as opp_m2_amt,
                         sum(opp_m3_amt)  as opp_m3_amt,
                         sum(opp_m4_amt)  as opp_m4_amt,
                         sum(opp_m5_amt)  as opp_m5_amt,
                         sum(opp_m6_amt)  as opp_m6_amt,
                         sum(opp_m7_amt)  as opp_m7_amt,
                         sum(opp_m8_amt)  as opp_m8_amt,
                         sum(opp_m9_amt)  as opp_m9_amt,
                         sum(opp_m10_amt) as opp_m10_amt,
                         sum(opp_m11_amt) as opp_m11_amt,
                         sum(opp_m12_amt) as opp_m12_amt,
                         (
                              case
                                   when to_integer(month)                                                                   < 1
                                        then sum(opp_m1_amt)
                                   else 0
                              end + case
                                         when to_integer(month)                                                             < 2
                                              then sum(opp_m2_amt)
                                         else 0
                                    end + case
                                               when to_integer(month)                                                       < 3
                                                    then sum(opp_m3_amt)
                                               else 0
                                          end + case
                                                     when to_integer(month)                                                 < 4
                                                          then sum(opp_m4_amt)
                                                     else 0
                                                end + case
                                                           when to_integer(month)                                           < 5
                                                                then sum(opp_m5_amt)
                                                           else 0
                                                      end + case
                                                                 when to_integer(month)                                     < 6
                                                                      then sum(opp_m6_amt)
                                                                 else 0
                                                            end + case
                                                                       when to_integer(month)                               < 7
                                                                            then sum(opp_m7_amt)
                                                                       else 0
                                                                  end + case
                                                                             when to_integer(month)                         < 8
                                                                                  then sum(opp_m8_amt)
                                                                             else 0
                                                                        end + case
                                                                                   when to_integer(month)                   < 9
                                                                                        then sum(opp_m9_amt)
                                                                                   else 0
                                                                              end + case
                                                                                         when to_integer(month)             < 10
                                                                                              then sum(opp_m10_amt)
                                                                                         else 0
                                                                                    end + case
                                                                                               when to_integer(month)       < 11
                                                                                                    then sum(opp_m11_amt)
                                                                                               else 0
                                                                                          end + case
                                                                                                     when to_integer(month) < 12
                                                                                                          then sum(opp_m12_amt)
                                                                                                     else 0
                                                                                                end
                         )                as opp_year_amt : Decimal(18, 2)

                         // sum(opp_m1_amt) + sum(opp_m2_amt) + sum(opp_m3_amt) + sum(opp_m4_amt) + sum(opp_m5_amt) + sum(opp_m6_amt) + sum(opp_m7_amt) + sum(opp_m8_amt) + sum(opp_m9_amt) + sum(opp_m10_amt) + sum(opp_m11_amt) + sum(opp_m12_amt) as opp_year_amt : Decimal(18, 2)
                    from rsp_opp_labor_view
                    where
                         year = substring(
                              ver, 2, 4
                         )
                    group by
                         ver,
                         year,
                         month,
                         ccorg_cd
               ) as opp
                    on (
                             sga_labor.ver             = opp.ver
                         and sga_labor.year            = opp.year
                         and case
                                  when sga_labor.month = '13'
                                       then '12'
                                  else sga_labor.month
                             end = opp.month
                         and sga_labor.ccorg_cd        = opp.ccorg_cd
                    )
                    or (
                             org_mm_b.ver              = opp.ver
                         and org_mm_b.year             = opp.year
                         and org_mm_b.month            = opp.month
                         and org_mm_b.ccorg_cd         = opp.ccorg_cd
                    )
                    or (
                             org_mm.ver                = opp.ver
                         and org_mm.year               = opp.year
                         and org_mm.month              = opp.month
                         and org_mm.ccorg_cd           = opp.ccorg_cd
                    )
                    or (
                             org_mm_bn.ver             = opp.ver
                         and org_mm_bn.year            = opp.year
                         and org_mm_bn.month           = opp.month
                         and org_mm_bn.ccorg_cd        = opp.ccorg_cd
                    )
               left join common_org_full_level_view as org
                    on sga_labor.ccorg_cd = org.org_ccorg_cd
          ) {
               key ver,
               key year,
               key month,
               key ccorg_cd,
                   total_m1_amt,
                   total_m2_amt,
                   total_m3_amt,
                   total_m4_amt,
                   total_m5_amt,
                   total_m6_amt,
                   total_m7_amt,
                   total_m8_amt,
                   total_m9_amt,
                   total_m10_amt,
                   total_m11_amt,
                   total_m12_amt,
                   total_m1_emp,
                   total_m2_emp,
                   total_m3_emp,
                   total_m4_emp,
                   total_m5_emp,
                   total_m6_emp,
                   total_m7_emp,
                   total_m8_emp,
                   total_m9_emp,
                   total_m10_emp,
                   total_m11_emp,
                   total_m12_emp,
                   avg_m1_amt,
                   avg_m2_amt,
                   avg_m3_amt,
                   avg_m4_amt,
                   avg_m5_amt,
                   avg_m6_amt,
                   avg_m7_amt,
                   avg_m8_amt,
                   avg_m9_amt,
                   avg_m10_amt,
                   avg_m11_amt,
                   avg_m12_amt,
                   bill_m1_amt,
                   bill_m2_amt,
                   bill_m3_amt,
                   bill_m4_amt,
                   bill_m5_amt,
                   bill_m6_amt,
                   bill_m7_amt,
                   bill_m8_amt,
                   bill_m9_amt,
                   bill_m10_amt,
                   bill_m11_amt,
                   bill_m12_amt,
                   indirect_cost_m1,
                   indirect_cost_m2,
                   indirect_cost_m3,
                   indirect_cost_m4,
                   indirect_cost_m5,
                   indirect_cost_m6,
                   indirect_cost_m7,
                   indirect_cost_m8,
                   indirect_cost_m9,
                   indirect_cost_m10,
                   indirect_cost_m11,
                   indirect_cost_m12,
                   co_m1_amt,
                   co_m2_amt,
                   co_m3_amt,
                   co_m4_amt,
                   co_m5_amt,
                   co_m6_amt,
                   co_m7_amt,
                   co_m8_amt,
                   co_m9_amt,
                   co_m10_amt,
                   co_m11_amt,
                   co_m12_amt,
                   bun_mm_m1_amt,
                   bun_mm_m2_amt,
                   bun_mm_m3_amt,
                   bun_mm_m4_amt,
                   bun_mm_m5_amt,
                   bun_mm_m6_amt,
                   bun_mm_m7_amt,
                   bun_mm_m8_amt,
                   bun_mm_m9_amt,
                   bun_mm_m10_amt,
                   bun_mm_m11_amt,
                   bun_mm_m12_amt,
                   bun_mm_amt_sum,
                   b_mm_m1_amt,
                   b_mm_m2_amt,
                   b_mm_m3_amt,
                   b_mm_m4_amt,
                   b_mm_m5_amt,
                   b_mm_m6_amt,
                   b_mm_m7_amt,
                   b_mm_m8_amt,
                   b_mm_m9_amt,
                   b_mm_m10_amt,
                   b_mm_m11_amt,
                   b_mm_m12_amt,
                   b_mm_amt_sum,
                   bn_mm_m1_amt,
                   bn_mm_m2_amt,
                   bn_mm_m3_amt,
                   bn_mm_m4_amt,
                   bn_mm_m5_amt,
                   bn_mm_m6_amt,
                   bn_mm_m7_amt,
                   bn_mm_m8_amt,
                   bn_mm_m9_amt,
                   bn_mm_m10_amt,
                   bn_mm_m11_amt,
                   bn_mm_m12_amt,
                   bn_mm_amt_sum,
                   opp_m1_amt,
                   opp_m2_amt,
                   opp_m3_amt,
                   opp_m4_amt,
                   opp_m5_amt,
                   opp_m6_amt,
                   opp_m7_amt,
                   opp_m8_amt,
                   opp_m9_amt,
                   opp_m10_amt,
                   opp_m11_amt,
                   opp_m12_amt,
                   opp_year_amt,
                   est_avg_year_amt,
                   est_total_year_emp,
                   est_total_year_amt,
                   total_year_emp,
                   total_year_amt,
                   avg_year_amt,
                   bill_year_amt,
                   indirect_cost_year,
                   co_year_amt,
                   is_delivery,
                   is_total_cc,
                   org_id,
                   org_ccorg_cd,
                   org_order,
                   org_parent,
                   org_name,
                   org_tp,
                   lv1_id,
                   lv1_name,
                   lv1_ccorg_cd,
                   lv2_id,
                   lv2_name,
                   lv2_ccorg_cd,
                   lv3_id,
                   lv3_name,
                   lv3_ccorg_cd,
                   div_id,
                   div_name,
                   div_ccorg_cd,
                   hdqt_id,
                   hdqt_name,
                   hdqt_ccorg_cd,
                   team_id,
                   team_name,
                   team_ccorg_cd
          };
