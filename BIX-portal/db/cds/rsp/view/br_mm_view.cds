using rsp.wideview_view as rsp_wideview_view from './wideview_view';
using rsp.opp_labor_view as rsp_opp_labor_view from './opp_labor_view';
using common.org_target_view as common_org_target_view from '../../common/view/org_target_view';

namespace rsp;

view br_mm_view as
    select from (
        select
            year,
            month,
            ccorg_cd,
            case
                when total_m1_emp     <>     0
                     and total_m1_emp is not null
                     then ifnull(
                              b_mm_m1_amt, 0
                          )           /      total_m1_emp
                else 0
            end as br_mm_m1 : Decimal(5, 2) @title: 'BR MM 1월',
            case
                when total_m2_emp     <>     0
                     and total_m2_emp is not null
                     then ifnull(
                              b_mm_m2_amt, 0
                          )           /      total_m2_emp
                else 0
            end as br_mm_m2 : Decimal(5, 2) @title: 'BR MM 2월',
            case
                when total_m3_emp     <>     0
                     and total_m3_emp is not null
                     then ifnull(
                              b_mm_m3_amt, 0
                          )           /      total_m3_emp
                else 0
            end as br_mm_m3 : Decimal(5, 2) @title: 'BR MM 3월',
            case
                when total_m4_emp     <>     0
                     and total_m4_emp is not null
                     then ifnull(
                              b_mm_m4_amt, 0
                          )           /      total_m4_emp
                else 0
            end as br_mm_m4 : Decimal(5, 2) @title: 'BR MM 4월',
            case
                when total_m5_emp     <>     0
                     and total_m5_emp is not null
                     then ifnull(
                              b_mm_m5_amt, 0
                          )           /      total_m5_emp
                else 0
            end as br_mm_m5 : Decimal(5, 2) @title: 'BR MM 5월',
            case
                when total_m6_emp     <>     0
                     and total_m6_emp is not null
                     then ifnull(
                              b_mm_m6_amt, 0
                          )           /      total_m6_emp
                else 0
            end as br_mm_m6 : Decimal(5, 2) @title: 'BR MM 6월',
            case
                when total_m7_emp     <>     0
                     and total_m7_emp is not null
                     then ifnull(
                              b_mm_m7_amt, 0
                          )           /      total_m7_emp
                else 0
            end as br_mm_m7 : Decimal(5, 2) @title: 'BR MM 7월',
            case
                when total_m8_emp     <>     0
                     and total_m8_emp is not null
                     then ifnull(
                              b_mm_m8_amt, 0
                          )           /      total_m8_emp
                else 0
            end as br_mm_m8 : Decimal(5, 2) @title: 'BR MM 8월',
            case
                when total_m9_emp     <>     0
                     and total_m9_emp is not null
                     then ifnull(
                              b_mm_m9_amt, 0
                          )           /      total_m9_emp
                else 0
            end as br_mm_m9 : Decimal(5, 2) @title: 'BR MM 9월',
            case
                when total_m10_emp     <>     0
                     and total_m10_emp is not null
                     then ifnull(
                              b_mm_m10_amt, 0
                          )           /      total_m10_emp
                else 0
            end as br_mm_m10 : Decimal(5, 2) @title: 'BR MM 10월',
            case
                when total_m11_emp     <>     0
                     and total_m11_emp is not null
                     then ifnull(
                              b_mm_m11_amt, 0
                          )           /      total_m11_emp
                else 0
            end as br_mm_m11 : Decimal(5, 2) @title: 'BR MM 11월',
            case
                when total_m12_emp     <>     0
                     and total_m12_emp is not null
                     then ifnull(
                              b_mm_m12_amt, 0
                          )           /      total_m12_emp
                else 0
            end as br_mm_m12 : Decimal(5, 2) @title: 'BR MM 12월',
            est_avg_year_amt,
            est_total_year_emp,
            opp_year_amt
        from rsp_wideview_view
    ) {
        key year,
        key month,
        key ccorg_cd,
            br_mm_m1,
            br_mm_m2,
            br_mm_m3,
            br_mm_m4,
            br_mm_m5,
            br_mm_m6,
            br_mm_m7,
            br_mm_m8,
            br_mm_m9,
            br_mm_m10,
            br_mm_m11,
            br_mm_m12
    }
