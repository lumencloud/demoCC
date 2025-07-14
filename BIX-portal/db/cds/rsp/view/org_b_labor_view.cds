using rsp.prj_labor as rsp_prj_labor from '../prj_labor';
using rsp.org_b_labor as rsp_org_b_labor from '../org_b_labor';
using common.version as common_version from '../../common/version';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';
using common.org_type as common_org_type from '../../common/org_type';

namespace rsp;

/**
 * 조직별 빌링 인건비
 *
 * [PROMIS] 추정구간 RSP_PRJ_LABOR 의 조직별 집계
 * (작년 실적마감 + 올해 최신)
 * [ERP] 실적구간
 */
view org_b_labor_view as
    select from (
        select
            org_b_merge.*,
            org.*
        from (
            select
                ver,
                year,
                month,
                ccorg_cd,
                sum(bill_m1_amt)       as bill_m1_amt,
                sum(bill_m2_amt)       as bill_m2_amt,
                sum(bill_m3_amt)       as bill_m3_amt,
                sum(bill_m4_amt)       as bill_m4_amt,
                sum(bill_m5_amt)       as bill_m5_amt,
                sum(bill_m6_amt)       as bill_m6_amt,
                sum(bill_m7_amt)       as bill_m7_amt,
                sum(bill_m8_amt)       as bill_m8_amt,
                sum(bill_m9_amt)       as bill_m9_amt,
                sum(bill_m10_amt)      as bill_m10_amt,
                sum(bill_m11_amt)      as bill_m11_amt,
                sum(bill_m12_amt)      as bill_m12_amt,
                sum(indirect_cost_m1)  as indirect_cost_m1,
                sum(indirect_cost_m2)  as indirect_cost_m2,
                sum(indirect_cost_m3)  as indirect_cost_m3,
                sum(indirect_cost_m4)  as indirect_cost_m4,
                sum(indirect_cost_m5)  as indirect_cost_m5,
                sum(indirect_cost_m6)  as indirect_cost_m6,
                sum(indirect_cost_m7)  as indirect_cost_m7,
                sum(indirect_cost_m8)  as indirect_cost_m8,
                sum(indirect_cost_m9)  as indirect_cost_m9,
                sum(indirect_cost_m10) as indirect_cost_m10,
                sum(indirect_cost_m11) as indirect_cost_m11,
                sum(indirect_cost_m12) as indirect_cost_m12
            from (
                select
                    ifnull(
                        org_b.ver, org_b_erp.ver
                    )   as ver,
                    ifnull(
                        org_b.year, org_b_erp.year
                    )   as year,
                    ifnull(
                        org_b.month, org_b_erp.month
                    )   as month,
                    case
                        when ot.replace_ccorg_cd       is not null
                             then ot.replace_ccorg_cd
                        else ifnull(
                                 org_b.ccorg_cd, org_b_erp.ccorg_cd
                             )
                    end as ccorg_cd,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     1
                             and org_b_erp.bill_m1_amt is not null
                             then org_b_erp.bill_m1_amt
                        else ifnull(
                                 org_b.bill_m1_amt, 0
                             )
                    end as bill_m1_amt,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     2
                             and org_b_erp.bill_m2_amt is not null
                             then org_b_erp.bill_m2_amt
                        else ifnull(
                                 org_b.bill_m2_amt, 0
                             )
                    end as bill_m2_amt,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     3
                             and org_b_erp.bill_m3_amt is not null
                             then org_b_erp.bill_m3_amt
                        else ifnull(
                                 org_b.bill_m3_amt, 0
                             )
                    end as bill_m3_amt,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     4
                             and org_b_erp.bill_m4_amt is not null
                             then org_b_erp.bill_m4_amt
                        else ifnull(
                                 org_b.bill_m4_amt, 0
                             )
                    end as bill_m4_amt,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     5
                             and org_b_erp.bill_m5_amt is not null
                             then org_b_erp.bill_m5_amt
                        else ifnull(
                                 org_b.bill_m5_amt, 0
                             )
                    end as bill_m5_amt,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     6
                             and org_b_erp.bill_m6_amt is not null
                             then org_b_erp.bill_m6_amt
                        else ifnull(
                                 org_b.bill_m6_amt, 0
                             )
                    end as bill_m6_amt,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     7
                             and org_b_erp.bill_m7_amt is not null
                             then org_b_erp.bill_m7_amt
                        else ifnull(
                                 org_b.bill_m7_amt, 0
                             )
                    end as bill_m7_amt,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     8
                             and org_b_erp.bill_m8_amt is not null
                             then org_b_erp.bill_m8_amt
                        else ifnull(
                                 org_b.bill_m8_amt, 0
                             )
                    end as bill_m8_amt,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     9
                             and org_b_erp.bill_m9_amt is not null
                             then org_b_erp.bill_m9_amt
                        else ifnull(
                                 org_b.bill_m9_amt, 0
                             )
                    end as bill_m9_amt,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     10
                             and org_b_erp.bill_m10_amt is not null
                             then org_b_erp.bill_m10_amt
                        else ifnull(
                                 org_b.bill_m10_amt, 0
                             )
                    end as bill_m10_amt,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     11
                             and org_b_erp.bill_m11_amt is not null
                             then org_b_erp.bill_m11_amt
                        else ifnull(
                                 org_b.bill_m11_amt, 0
                             )
                    end as bill_m11_amt,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     12
                             and org_b_erp.bill_m12_amt is not null
                             then org_b_erp.bill_m12_amt
                        else ifnull(
                                 org_b.bill_m12_amt, 0
                             )
                    end as bill_m12_amt,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     1
                             and org_b_erp.indirect_cost_m1 is not null
                             then org_b_erp.indirect_cost_m1
                        else ifnull(
                                 org_b.indirect_cost_m1, 0
                             )
                    end as indirect_cost_m1,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     2
                             and org_b_erp.indirect_cost_m2 is not null
                             then org_b_erp.indirect_cost_m2
                        else ifnull(
                                 org_b.indirect_cost_m2, 0
                             )
                    end as indirect_cost_m2,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     3
                             and org_b_erp.indirect_cost_m3 is not null
                             then org_b_erp.indirect_cost_m3
                        else ifnull(
                                 org_b.indirect_cost_m3, 0
                             )
                    end as indirect_cost_m3,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     4
                             and org_b_erp.indirect_cost_m4 is not null
                             then org_b_erp.indirect_cost_m4
                        else ifnull(
                                 org_b.indirect_cost_m4, 0
                             )
                    end as indirect_cost_m4,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     5
                             and org_b_erp.indirect_cost_m5 is not null
                             then org_b_erp.indirect_cost_m5
                        else ifnull(
                                 org_b.indirect_cost_m5, 0
                             )
                    end as indirect_cost_m5,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     6
                             and org_b_erp.indirect_cost_m6 is not null
                             then org_b_erp.indirect_cost_m6
                        else ifnull(
                                 org_b.indirect_cost_m6, 0
                             )
                    end as indirect_cost_m6,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     7
                             and org_b_erp.indirect_cost_m7 is not null
                             then org_b_erp.indirect_cost_m7
                        else ifnull(
                                 org_b.indirect_cost_m7, 0
                             )
                    end as indirect_cost_m7,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     8
                             and org_b_erp.indirect_cost_m8 is not null
                             then org_b_erp.indirect_cost_m8
                        else ifnull(
                                 org_b.indirect_cost_m8, 0
                             )
                    end as indirect_cost_m8,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     9
                             and org_b_erp.indirect_cost_m9 is not null
                             then org_b_erp.indirect_cost_m9
                        else ifnull(
                                 org_b.indirect_cost_m9, 0
                             )
                    end as indirect_cost_m9,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     10
                             and org_b_erp.indirect_cost_m10 is not null
                             then org_b_erp.indirect_cost_m10
                        else ifnull(
                                 org_b.indirect_cost_m10, 0
                             )
                    end as indirect_cost_m10,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     11
                             and org_b_erp.indirect_cost_m11 is not null
                             then org_b_erp.indirect_cost_m11
                        else ifnull(
                                 org_b.indirect_cost_m11, 0
                             )
                    end as indirect_cost_m11,
                    case
                        when to_integer(ifnull(
                                 org_b.month, org_b_erp.month
                             ))                        >=     12
                             and org_b_erp.indirect_cost_m12 is not null
                             then org_b_erp.indirect_cost_m12
                        else ifnull(
                                 org_b.indirect_cost_m12, 0
                             )
                    end as indirect_cost_m12
                from (
                    select
                        ver,
                        year,
                        month,
                        ccorg_cd,
                        ifnull(
                            sum(bill_m1_amt), 0
                        ) as bill_m1_amt,
                        ifnull(
                            sum(bill_m2_amt), 0
                        ) as bill_m2_amt,
                        ifnull(
                            sum(bill_m3_amt), 0
                        ) as bill_m3_amt,
                        ifnull(
                            sum(bill_m4_amt), 0
                        ) as bill_m4_amt,
                        ifnull(
                            sum(bill_m5_amt), 0
                        ) as bill_m5_amt,
                        ifnull(
                            sum(bill_m6_amt), 0
                        ) as bill_m6_amt,
                        ifnull(
                            sum(bill_m7_amt), 0
                        ) as bill_m7_amt,
                        ifnull(
                            sum(bill_m8_amt), 0
                        ) as bill_m8_amt,
                        ifnull(
                            sum(bill_m9_amt), 0
                        ) as bill_m9_amt,
                        ifnull(
                            sum(bill_m10_amt), 0
                        ) as bill_m10_amt,
                        ifnull(
                            sum(bill_m11_amt), 0
                        ) as bill_m11_amt,
                        ifnull(
                            sum(bill_m12_amt), 0
                        ) as bill_m12_amt,
                        ifnull(
                            sum(indirect_cost_m1), 0
                        ) as indirect_cost_m1,
                        ifnull(
                            sum(indirect_cost_m2), 0
                        ) as indirect_cost_m2,
                        ifnull(
                            sum(indirect_cost_m3), 0
                        ) as indirect_cost_m3,
                        ifnull(
                            sum(indirect_cost_m4), 0
                        ) as indirect_cost_m4,
                        ifnull(
                            sum(indirect_cost_m5), 0
                        ) as indirect_cost_m5,
                        ifnull(
                            sum(indirect_cost_m6), 0
                        ) as indirect_cost_m6,
                        ifnull(
                            sum(indirect_cost_m7), 0
                        ) as indirect_cost_m7,
                        ifnull(
                            sum(indirect_cost_m8), 0
                        ) as indirect_cost_m8,
                        ifnull(
                            sum(indirect_cost_m9), 0
                        ) as indirect_cost_m9,
                        ifnull(
                            sum(indirect_cost_m10), 0
                        ) as indirect_cost_m10,
                        ifnull(
                            sum(indirect_cost_m11), 0
                        ) as indirect_cost_m11,
                        ifnull(
                            sum(indirect_cost_m12), 0
                        ) as indirect_cost_m12
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
                ) as org_b
                full outer join rsp_org_b_labor as org_b_erp
                    on  org_b.ver      = org_b_erp.ver
                    and org_b.year     = org_b_erp.year
                    and org_b.month    = org_b_erp.month
                    and org_b.ccorg_cd = org_b_erp.ccorg_cd
                left join common_org_type as ot
                    on(
                            org_b.ccorg_cd     =  ot.ccorg_cd
                        and org_b_erp.ccorg_cd =  ot.ccorg_cd
                    )
                    or (
                            org_b.ccorg_cd     =  ot.ccorg_cd
                        and org_b_erp.ccorg_cd is null
                    )
                    or (
                            org_b.ccorg_cd     is null
                        and org_b_erp.ccorg_cd =  ot.ccorg_cd
                    )
            )
            group by
                ver,
                year,
                month,
                ccorg_cd
        ) as org_b_merge
        left join common_org_full_level_view as org
            on org_b_merge.ccorg_cd = org.org_ccorg_cd
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
            indirect_cost_m12,
            org_ccorg_cd,
            org_order,
            org_parent,
            org_name,
            is_delivery,
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
    }
