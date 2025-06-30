using rsp.org_total_labor as rsp_org_total_labor from '../org_total_labor';
using common.version as common_version from '../../common/version';
using common.org_target_view as common_org_target_view from '../../common/view/org_target_view';
using common.org_type as common_org_type from '../../common/org_type';

namespace rsp;

/**
 * 조직별 총 인건비 데이터
 */
view org_total_labor_view as
    select from (
        select
            total_labor_origin.*,
            org.*
        from (
            select
                ver,
                year,
                month,
                ccorg_cd,
                sum(total_m1_amt)  as total_m1_amt  : Decimal(18, 2),
                sum(total_m2_amt)  as total_m2_amt  : Decimal(18, 2),
                sum(total_m3_amt)  as total_m3_amt  : Decimal(18, 2),
                sum(total_m4_amt)  as total_m4_amt  : Decimal(18, 2),
                sum(total_m5_amt)  as total_m5_amt  : Decimal(18, 2),
                sum(total_m6_amt)  as total_m6_amt  : Decimal(18, 2),
                sum(total_m7_amt)  as total_m7_amt  : Decimal(18, 2),
                sum(total_m8_amt)  as total_m8_amt  : Decimal(18, 2),
                sum(total_m9_amt)  as total_m9_amt  : Decimal(18, 2),
                sum(total_m10_amt) as total_m10_amt : Decimal(18, 2),
                sum(total_m11_amt) as total_m11_amt : Decimal(18, 2),
                sum(total_m12_amt) as total_m12_amt : Decimal(18, 2),
                sum(total_m1_emp)  as total_m1_emp  : Integer,
                sum(total_m2_emp)  as total_m2_emp  : Integer,
                sum(total_m3_emp)  as total_m3_emp  : Integer,
                sum(total_m4_emp)  as total_m4_emp  : Integer,
                sum(total_m5_emp)  as total_m5_emp  : Integer,
                sum(total_m6_emp)  as total_m6_emp  : Integer,
                sum(total_m7_emp)  as total_m7_emp  : Integer,
                sum(total_m8_emp)  as total_m8_emp  : Integer,
                sum(total_m9_emp)  as total_m9_emp  : Integer,
                sum(total_m10_emp) as total_m10_emp : Integer,
                sum(total_m11_emp) as total_m11_emp : Integer,
                sum(total_m12_emp) as total_m12_emp : Integer,
                sum(avg_m1_amt)    as avg_m1_amt    : Decimal(18, 2),
                sum(avg_m2_amt)    as avg_m2_amt    : Decimal(18, 2),
                sum(avg_m3_amt)    as avg_m3_amt    : Decimal(18, 2),
                sum(avg_m4_amt)    as avg_m4_amt    : Decimal(18, 2),
                sum(avg_m5_amt)    as avg_m5_amt    : Decimal(18, 2),
                sum(avg_m6_amt)    as avg_m6_amt    : Decimal(18, 2),
                sum(avg_m7_amt)    as avg_m7_amt    : Decimal(18, 2),
                sum(avg_m8_amt)    as avg_m8_amt    : Decimal(18, 2),
                sum(avg_m9_amt)    as avg_m9_amt    : Decimal(18, 2),
                sum(avg_m10_amt)   as avg_m10_amt   : Decimal(18, 2),
                sum(avg_m11_amt)   as avg_m11_amt   : Decimal(18, 2),
                sum(avg_m12_amt)   as avg_m12_amt   : Decimal(18, 2)
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
                            total_labor.ccorg_cd
                    end as ccorg_cd : String(10) @title: 'ERP Cost Center',
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
                from (
                    select * from rsp_org_total_labor
                    where
                        ver in (
                            select ver from common_version
                            where
                                   tag = 'C'
                                or tag = 'Y'
                        )
                ) as total_labor
                left join common_org_type as ot
                    on total_labor.ccorg_cd = ot.ccorg_cd
            )
            group by
                ver,
                year,
                month,
                ccorg_cd
        ) as total_labor_origin
        left join common_org_target_view as org
            on total_labor_origin.ccorg_cd = org.org_ccorg_cd
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
            avg_m12_amt,
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
