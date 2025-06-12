using sga.expense_co as sga_expense_co from '../expense_co';
using common.version as common_version from '../../common/version';

namespace sga;

/**
 * SG&A 위임 경비 데이터
 * 
 * GL Account '900000' 는 SGA_EXPENSE_VIEW 에서 추가
 * '702101' 은 SGA_WIDEVIEW_VIEW 에서 추가 (RSP 데이터에 추가해야하는지 확인필요)
 */
view expense_co_view as
    select from (
        select * from sga_expense_co
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
        key gl_account,
            commitment_item,
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
            co_m12_amt
    };
