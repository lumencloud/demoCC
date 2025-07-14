using rsp.org_b_labor as rsp_org_b_labor from '../../rsp/org_b_labor';
using rsp.org_total_labor as rsp_org_total_labor from '../../rsp/org_total_labor';

namespace sga;

/**
 * SG&A 인건비
 */
view org_nb_labor_view as
    select
        total.year,
        total.month,
        total.ccorg_cd,
        total.total_m1_amt - (
            org_b.bill_m1_amt - org_b.indirect_cost_m1
        ) as cal_m1_amt  : Decimal(18, 2),
        total.total_m2_amt - (
            org_b.bill_m2_amt - org_b.indirect_cost_m2
        ) as cal_m2_amt  : Decimal(18, 2),
        total.total_m3_amt - (
            org_b.bill_m3_amt - org_b.indirect_cost_m3
        ) as cal_m3_amt  : Decimal(18, 2),
        total.total_m4_amt - (
            org_b.bill_m4_amt - org_b.indirect_cost_m4
        ) as cal_m4_amt  : Decimal(18, 2),
        total.total_m5_amt - (
            org_b.bill_m5_amt - org_b.indirect_cost_m5
        ) as cal_m5_amt  : Decimal(18, 2),
        total.total_m6_amt - (
            org_b.bill_m6_amt - org_b.indirect_cost_m6
        ) as cal_m6_amt  : Decimal(18, 2),
        total.total_m7_amt - (
            org_b.bill_m7_amt - org_b.indirect_cost_m7
        ) as cal_m7_amt  : Decimal(18, 2),
        total.total_m8_amt - (
            org_b.bill_m8_amt - org_b.indirect_cost_m8
        ) as cal_m8_amt  : Decimal(18, 2),
        total.total_m9_amt - (
            org_b.bill_m9_amt - org_b.indirect_cost_m9
        ) as cal_m9_amt  : Decimal(18, 2),
        total.total_m10_amt - (
            org_b.bill_m10_amt - org_b.indirect_cost_m10
        ) as cal_m10_amt : Decimal(18, 2),
        total.total_m11_amt - (
            org_b.bill_m11_amt - org_b.indirect_cost_m11
        ) as cal_m11_amt : Decimal(18, 2),
        total.total_m12_amt - (
            org_b.bill_m12_amt - org_b.indirect_cost_m12
        ) as cal_m12_amt : Decimal(18, 2)
    from rsp_org_total_labor as total
    left join rsp_org_b_labor as org_b
        on  total.ccorg_cd = org_b.ccorg_cd
        and total.year     = org_b.year
        and total.month    = org_b.month
// and total.ver = org_b.ver
;