using rsp.prj_labor as rsp_prj_labor from '../prj_labor';
using common.version as common_version from '../../common/version';
using common.org_target_view as common_org_target_view from '../../common/view/org_target_view';
using common.org_type as common_org_type from '../../common/org_type';

namespace rsp;

/**
 * 조직별 빌링 인건비
 *
 * [PROMIS] RSP_PRJ_LABOR 의 조직별 집계
 */
view org_b_labor_view as
    select from (
        select
            org_b_origin.*,
            org.*
        from (
            select
                ver,
                year,
                month,
                ccorg_cd,
                sum(bill_m1_amt)       as bill_m1_amt       : Decimal(18, 2),
                sum(bill_m2_amt)       as bill_m2_amt       : Decimal(18, 2),
                sum(bill_m3_amt)       as bill_m3_amt       : Decimal(18, 2),
                sum(bill_m4_amt)       as bill_m4_amt       : Decimal(18, 2),
                sum(bill_m5_amt)       as bill_m5_amt       : Decimal(18, 2),
                sum(bill_m6_amt)       as bill_m6_amt       : Decimal(18, 2),
                sum(bill_m7_amt)       as bill_m7_amt       : Decimal(18, 2),
                sum(bill_m8_amt)       as bill_m8_amt       : Decimal(18, 2),
                sum(bill_m9_amt)       as bill_m9_amt       : Decimal(18, 2),
                sum(bill_m10_amt)      as bill_m10_amt      : Decimal(18, 2),
                sum(bill_m11_amt)      as bill_m11_amt      : Decimal(18, 2),
                sum(bill_m12_amt)      as bill_m12_amt      : Decimal(18, 2),
                sum(indirect_cost_m1)  as indirect_cost_m1  : Decimal(18, 2),
                sum(indirect_cost_m2)  as indirect_cost_m2  : Decimal(18, 2),
                sum(indirect_cost_m3)  as indirect_cost_m3  : Decimal(18, 2),
                sum(indirect_cost_m4)  as indirect_cost_m4  : Decimal(18, 2),
                sum(indirect_cost_m5)  as indirect_cost_m5  : Decimal(18, 2),
                sum(indirect_cost_m6)  as indirect_cost_m6  : Decimal(18, 2),
                sum(indirect_cost_m7)  as indirect_cost_m7  : Decimal(18, 2),
                sum(indirect_cost_m8)  as indirect_cost_m8  : Decimal(18, 2),
                sum(indirect_cost_m9)  as indirect_cost_m9  : Decimal(18, 2),
                sum(indirect_cost_m10) as indirect_cost_m10 : Decimal(18, 2),
                sum(indirect_cost_m11) as indirect_cost_m11 : Decimal(18, 2),
                sum(indirect_cost_m12) as indirect_cost_m12 : Decimal(18, 2)
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
                            org_b.ccorg_cd
                    end as ccorg_cd : String(10) @title: 'ERP Cost Center',
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
                from (
                    select
                        ver,
                        year,
                        month,
                        ccorg_cd,
                        sum(ifnull(
                            bill_m1_amt, 0
                        )) as bill_m1_amt,
                        sum(ifnull(
                            bill_m2_amt, 0
                        )) as bill_m2_amt,
                        sum(ifnull(
                            bill_m3_amt, 0
                        )) as bill_m3_amt,
                        sum(ifnull(
                            bill_m4_amt, 0
                        )) as bill_m4_amt,
                        sum(ifnull(
                            bill_m5_amt, 0
                        )) as bill_m5_amt,
                        sum(ifnull(
                            bill_m6_amt, 0
                        )) as bill_m6_amt,
                        sum(ifnull(
                            bill_m7_amt, 0
                        )) as bill_m7_amt,
                        sum(ifnull(
                            bill_m8_amt, 0
                        )) as bill_m8_amt,
                        sum(ifnull(
                            bill_m9_amt, 0
                        )) as bill_m9_amt,
                        sum(ifnull(
                            bill_m10_amt, 0
                        )) as bill_m10_amt,
                        sum(ifnull(
                            bill_m11_amt, 0
                        )) as bill_m11_amt,
                        sum(ifnull(
                            bill_m12_amt, 0
                        )) as bill_m12_amt,
                        sum(ifnull(
                            indirect_cost_m1, 0
                        )) as indirect_cost_m1,
                        sum(ifnull(
                            indirect_cost_m2, 0
                        )) as indirect_cost_m2,
                        sum(ifnull(
                            indirect_cost_m3, 0
                        )) as indirect_cost_m3,
                        sum(ifnull(
                            indirect_cost_m4, 0
                        )) as indirect_cost_m4,
                        sum(ifnull(
                            indirect_cost_m5, 0
                        )) as indirect_cost_m5,
                        sum(ifnull(
                            indirect_cost_m6, 0
                        )) as indirect_cost_m6,
                        sum(ifnull(
                            indirect_cost_m7, 0
                        )) as indirect_cost_m7,
                        sum(ifnull(
                            indirect_cost_m8, 0
                        )) as indirect_cost_m8,
                        sum(ifnull(
                            indirect_cost_m9, 0
                        )) as indirect_cost_m9,
                        sum(ifnull(
                            indirect_cost_m10, 0
                        )) as indirect_cost_m10,
                        sum(ifnull(
                            indirect_cost_m11, 0
                        )) as indirect_cost_m11,
                        sum(ifnull(
                            indirect_cost_m12, 0
                        )) as indirect_cost_m12
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
                left join common_org_type as ot
                    on org_b.ccorg_cd = ot.ccorg_cd

            )
            group by
                ver,
                year,
                month,
                ccorg_cd
        ) as org_b_origin
        left join common_org_target_view as org
            on org_b_origin.ccorg_cd = org.org_ccorg_cd
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
