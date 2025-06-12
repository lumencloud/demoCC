using rsp.prj_labor as rsp_prj_labor from '../prj_labor';
using common.version as common_version from '../../common/version';

namespace rsp;

/**
 * 조직별 빌링 인건비
 *
 * [PROMIS] RSP_PRJ_LABOR 의 조직별 집계
 */
view org_b_labor_view as
    select from (
        select
            ver,
            year,
            month,
            ccorg_cd,
            sum(ifnull(bill_m1_amt,0))       as bill_m1_amt,
            sum(ifnull(bill_m2_amt,0))       as bill_m2_amt,
            sum(ifnull(bill_m3_amt,0))       as bill_m3_amt,
            sum(ifnull(bill_m4_amt,0))       as bill_m4_amt,
            sum(ifnull(bill_m5_amt,0))       as bill_m5_amt,
            sum(ifnull(bill_m6_amt,0))       as bill_m6_amt,
            sum(ifnull(bill_m7_amt,0))       as bill_m7_amt,
            sum(ifnull(bill_m8_amt,0))       as bill_m8_amt,
            sum(ifnull(bill_m9_amt,0))       as bill_m9_amt,
            sum(ifnull(bill_m10_amt,0))      as bill_m10_amt,
            sum(ifnull(bill_m11_amt,0))      as bill_m11_amt,
            sum(ifnull(bill_m12_amt,0))      as bill_m12_amt,
            sum(ifnull(indirect_cost_m1,0))  as indirect_cost_m1,
            sum(ifnull(indirect_cost_m2,0))  as indirect_cost_m2,
            sum(ifnull(indirect_cost_m3,0))  as indirect_cost_m3,
            sum(ifnull(indirect_cost_m4,0))  as indirect_cost_m4,
            sum(ifnull(indirect_cost_m5,0))  as indirect_cost_m5,
            sum(ifnull(indirect_cost_m6,0))  as indirect_cost_m6,
            sum(ifnull(indirect_cost_m7,0))  as indirect_cost_m7,
            sum(ifnull(indirect_cost_m8,0))  as indirect_cost_m8,
            sum(ifnull(indirect_cost_m9,0))  as indirect_cost_m9,
            sum(ifnull(indirect_cost_m10,0)) as indirect_cost_m10,
            sum(ifnull(indirect_cost_m11,0)) as indirect_cost_m11,
            sum(ifnull(indirect_cost_m12,0)) as indirect_cost_m12
        from rsp_prj_labor
        where
            ver in (
                select ver from common_version
                where
                       tag = 'C'
                    or tag = 'Y'
            )
        group by
            ver,
            year,
            month,
            ccorg_cd
    ) {
        key ver,
        key year,
        key month,
        key ccorg_cd,
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
            indirect_cost_m12
    }
