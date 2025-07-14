using rsp.org_b_labor as rsp_org_b_labor from '../org_b_labor';
using rsp.opp_labor as rsp_opp_labor from '../opp_labor';
using rsp.org_total_labor as rsp_org_total_labor from '../org_total_labor';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';

namespace rsp;

view br_view as
    select from (
        select
            org_total.year,
            org_total.month,
            org_total.ccorg_cd,
            org_b.ccorg_cd AS prj_ccorg_cd,
            case
                when
                    org_b.bill_m1_amt          is not null
                    and org_total.total_m1_amt is not null
                    and org_total.total_m1_amt <>     0
                then
                    FLOOR(
                        100 * org_b.bill_m1_amt / org_total.total_m1_amt
                    )
                else
                    null
            end as bill_m1_rate  : Integer,
            case
                when
                    org_b.bill_m2_amt          is not null
                    and org_total.total_m2_amt is not null
                    and org_total.total_m2_amt <>     0
                then
                    FLOOR(
                        100 * org_b.bill_m2_amt / org_total.total_m2_amt
                    )
                else
                    null
            end as bill_m2_rate  : Integer,
            case
                when
                    org_b.bill_m3_amt          is not null
                    and org_total.total_m3_amt is not null
                    and org_total.total_m3_amt <>     0
                then
                    FLOOR(
                        100 * org_b.bill_m3_amt / org_total.total_m3_amt
                    )
                else
                    null
            end as bill_m3_rate  : Integer,
            case
                when
                    org_b.bill_m4_amt          is not null
                    and org_total.total_m4_amt is not null
                    and org_total.total_m4_amt <>     0
                then
                    FLOOR(
                        100 * org_b.bill_m4_amt / org_total.total_m4_amt
                    )
                else
                    null
            end as bill_m4_rate  : Integer,
            case
                when
                    org_b.bill_m5_amt          is not null
                    and org_total.total_m5_amt is not null
                    and org_total.total_m5_amt <>     0
                then
                    FLOOR(
                        100 * org_b.bill_m5_amt / org_total.total_m5_amt
                    )
                else
                    null
            end as bill_m5_rate  : Integer,
            case
                when
                    org_b.bill_m6_amt          is not null
                    and org_total.total_m6_amt is not null
                    and org_total.total_m6_amt <>     0
                then
                    FLOOR(
                        100 * org_b.bill_m6_amt / org_total.total_m6_amt
                    )
                else
                    null
            end as bill_m6_rate  : Integer,
            case
                when
                    org_b.bill_m7_amt          is not null
                    and org_total.total_m7_amt is not null
                    and org_total.total_m7_amt <>     0
                then
                    FLOOR(
                        100 * org_b.bill_m7_amt / org_total.total_m7_amt
                    )
                else
                    null
            end as bill_m7_rate  : Integer,
            case
                when
                    org_b.bill_m8_amt          is not null
                    and org_total.total_m8_amt is not null
                    and org_total.total_m8_amt <>     0
                then
                    FLOOR(
                        100 * org_b.bill_m8_amt / org_total.total_m8_amt
                    )
                else
                    null
            end as bill_m8_rate  : Integer,
            case
                when
                    org_b.bill_m9_amt          is not null
                    and org_total.total_m9_amt is not null
                    and org_total.total_m9_amt <>     0
                then
                    FLOOR(
                        100 * org_b.bill_m9_amt / org_total.total_m9_amt
                    )
                else
                    null
            end as bill_m9_rate  : Integer,
            case
                when
                    org_b.bill_m10_amt          is not null
                    and org_total.total_m10_amt is not null
                    and org_total.total_m10_amt <>     0
                then
                    FLOOR(
                        100 * org_b.bill_m10_amt / org_total.total_m10_amt
                    )
                else
                    null
            end as bill_m10_rate  : Integer,
            case
                when
                    org_b.bill_m11_amt          is not null
                    and org_total.total_m11_amt is not null
                    and org_total.total_m11_amt <>     0
                then
                    FLOOR(
                        100 * org_b.bill_m11_amt / org_total.total_m11_amt
                    )
                else
                    null
            end as bill_m11_rate  : Integer,
            case
                when
                    org_b.bill_m12_amt          is not null
                    and org_total.total_m12_amt is not null
                    and org_total.total_m12_amt <>     0
                then
                    FLOOR(
                        100 * org_b.bill_m12_amt / org_total.total_m12_amt
                    )
                else
                    null
            end as bill_m12_rate  : Integer
        from rsp_org_b_labor as org_b
        full outer join rsp_org_total_labor as org_total
            on  org_b.year     = org_total.year
            and org_b.month    = org_total.month
            and org_b.ccorg_cd = org_total.ccorg_cd
    )

    {
        key ccorg_cd,
        key prj_ccorg_cd,
        key year,
        key month,
            bill_m1_rate,
            bill_m2_rate,
            bill_m3_rate,
            bill_m4_rate,
            bill_m5_rate,
            bill_m6_rate,
            bill_m7_rate,
            bill_m8_rate,
            bill_m9_rate,
            bill_m10_rate,
            bill_m11_rate,
            bill_m12_rate

    }
