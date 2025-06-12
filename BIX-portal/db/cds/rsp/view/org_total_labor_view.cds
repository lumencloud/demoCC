using rsp.org_total_labor as rsp_org_total_labor from '../org_total_labor';
using common.version as common_version from '../../common/version';

namespace rsp;

/**
 * 조직별 총 인건비 데이터
 */
view org_total_labor_view as
    select from (
        select * from rsp_org_total_labor
        where
            ver in (
                select ver from common_version
                where
                       tag = 'C'
                    or tag = 'Y'
            )
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
            avg_m12_amt
    }
