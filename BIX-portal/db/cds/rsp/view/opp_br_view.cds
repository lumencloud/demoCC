using rsp.opp_labor as rsp_opp_labor from '../opp_labor';
using rsp.org_total_labor as rsp_org_total_labor from '../org_total_labor';

namespace rsp;

view opp_br_view as
    select from (
        select
            opp.year,
            opp.month,
            org_total.ccorg_cd,
            opp.opp_m1_amt / org_total.total_m1_amt   as bill_m1_rate  : Decimal(5, 2),
            opp.opp_m2_amt / org_total.total_m2_amt   as bill_m2_rate  : Decimal(5, 2),
            opp.opp_m3_amt / org_total.total_m3_amt   as bill_m3_rate  : Decimal(5, 2),
            opp.opp_m4_amt / org_total.total_m4_amt   as bill_m4_rate  : Decimal(5, 2),
            opp.opp_m5_amt / org_total.total_m5_amt   as bill_m5_rate  : Decimal(5, 2),
            opp.opp_m6_amt / org_total.total_m6_amt   as bill_m6_rate  : Decimal(5, 2),
            opp.opp_m7_amt / org_total.total_m7_amt   as bill_m7_rate  : Decimal(5, 2),
            opp.opp_m8_amt / org_total.total_m8_amt   as bill_m8_rate  : Decimal(5, 2),
            opp.opp_m9_amt / org_total.total_m9_amt   as bill_m9_rate  : Decimal(5, 2),
            opp.opp_m10_amt / org_total.total_m10_amt as bill_m10_rate : Decimal(5, 2),
            opp.opp_m11_amt / org_total.total_m11_amt as bill_m11_rate : Decimal(5, 2),
            opp.opp_m12_amt / org_total.total_m12_amt as bill_m12_rate : Decimal(5, 2)
        from rsp_opp_labor as opp
        inner join rsp_org_total_labor as org_total
            on     opp.year                =      org_total.year
            and    opp.month               =      org_total.month
            and    opp.ccorg_cd            =      org_total.ccorg_cd
            and (
                   org_total.total_m1_amt  is not null
                or org_total.total_m1_amt  <>     0
            )
            and (
                   org_total.total_m2_amt  is not null
                or org_total.total_m2_amt  <>     0
            )
            and (
                   org_total.total_m3_amt  is not null
                or org_total.total_m3_amt  <>     0
            )
            and (
                   org_total.total_m4_amt  is not null
                or org_total.total_m4_amt  <>     0
            )
            and (
                   org_total.total_m5_amt  is not null
                or org_total.total_m5_amt  <>     0
            )
            and (
                   org_total.total_m6_amt  is not null
                or org_total.total_m6_amt  <>     0
            )
            and (
                   org_total.total_m7_amt  is not null
                or org_total.total_m7_amt  <>     0
            )
            and (
                   org_total.total_m8_amt  is not null
                or org_total.total_m8_amt  <>     0
            )
            and (
                   org_total.total_m9_amt  is not null
                or org_total.total_m9_amt  <>     0
            )
            and (
                   org_total.total_m10_amt is not null
                or org_total.total_m10_amt <>     0
            )
            and (
                   org_total.total_m11_amt is not null
                or org_total.total_m11_amt <>     0
            )
            and (
                   org_total.total_m12_amt is not null
                or org_total.total_m12_amt <>     0
            )

    ) {
        key ccorg_cd,
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
