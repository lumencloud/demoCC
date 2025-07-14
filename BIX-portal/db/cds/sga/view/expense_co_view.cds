using sga.expense_co as sga_expense_co from '../expense_co';
using common.version as common_version from '../../common/version';
using common.org_type as common_org_type from '../../common/org_type';

namespace sga;

/**
 * SG&A 위임 경비 데이터
 *
 * GL Account '900000' 는 SGA_EXPENSE_VIEW 에서 추가
 */
view expense_co_view as
    select from (
        select
            ver,
            year,
            month,
            ccorg_cd,
            gl_account,
            commitment_item,
            sum(co_m1_amt) as co_m1_amt : Decimal(18,2) @title : '1월 위임 비용',
            sum(co_m2_amt) as co_m2_amt : Decimal(18,2) @title : '2월 위임 비용',
            sum(co_m3_amt) as co_m3_amt : Decimal(18,2) @title : '3월 위임 비용',
            sum(co_m4_amt) as co_m4_amt : Decimal(18,2) @title : '4월 위임 비용',
            sum(co_m5_amt) as co_m5_amt : Decimal(18,2) @title : '5월 위임 비용',
            sum(co_m6_amt) as co_m6_amt : Decimal(18,2) @title : '6월 위임 비용',
            sum(co_m7_amt) as co_m7_amt : Decimal(18,2) @title : '7월 위임 비용',
            sum(co_m8_amt) as co_m8_amt : Decimal(18,2) @title : '8월 위임 비용',
            sum(co_m9_amt) as co_m9_amt : Decimal(18,2) @title : '9월 위임 비용',
            sum(co_m10_amt) as co_m10_amt : Decimal(18,2) @title : '10월 위임 비용',
            sum(co_m11_amt) as co_m11_amt : Decimal(18,2) @title : '11월 위임 비용',
            sum(co_m12_amt) as co_m12_amt : Decimal(18,2) @title : '12월 위임 비용'
        from (
            select
                ver,
                year,
                month,
                case
                    when
                        ot.replace_ccorg_cd is not null
                    then
                        ot.replace_ccorg_cd
                    else
                        exp_co.ccorg_cd
                end as ccorg_cd : String(10) @title: 'ERP Cost Center',
                gl_account,
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
            from sga_expense_co as exp_co
            left join common_org_type as ot
                on exp_co.ccorg_cd = ot.ccorg_cd
            where
                ver in (
                    select ver from common_version
                    where
                           tag = 'C'
                        or tag = 'Y'
                )
        )
        group by
            ver,
            year,
            month,
            ccorg_cd,
            gl_account,
            commitment_item
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
