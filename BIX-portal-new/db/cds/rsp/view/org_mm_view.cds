using rsp.org_mm as rsp_org_mm from '../org_mm';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';
using common.org_type as common_org_type from '../../common/org_type';
using common.version as common_version from '../../common/version';

namespace rsp;

view org_mm_view as
    select from (
        select
            ver,
            year,
            substring(
                year_month, 5
            )      as month    : String(2),
            year_month,
            bun_tp,
               case
                   when
                       ot.replace_ccorg_cd is not null
                   then
                       ot.replace_ccorg_cd
                   else
                       mm.ccorg_cd
               end as ccorg_cd : String(10)                                                                                                                                                         @title: 'ERP Cost Center',
            mm_m1_amt,
            mm_m2_amt,
            mm_m3_amt,
            mm_m4_amt,
            mm_m5_amt,
            mm_m6_amt,
            mm_m7_amt,
            mm_m8_amt,
            mm_m9_amt,
            mm_m10_amt,
            mm_m11_amt,
            mm_m12_amt,
            mm_amt_sum,
            org.*
        from (
            select
                ver,
                year,
                year_month,
                ccorg_cd,
                bun_tp,
                mm_m1_amt,
                mm_m2_amt,
                mm_m3_amt,
                mm_m4_amt,
                mm_m5_amt,
                mm_m6_amt,
                mm_m7_amt,
                mm_m8_amt,
                mm_m9_amt,
                mm_m10_amt,
                mm_m11_amt,
                mm_m12_amt,
                sum(mm_m1_amt + mm_m2_amt + mm_m3_amt + mm_m4_amt + mm_m5_amt + mm_m6_amt + mm_m7_amt + mm_m8_amt + mm_m9_amt + mm_m10_amt + mm_m11_amt + mm_m12_amt) as mm_amt_sum : Decimal(5, 1) @title: '연간 총 MM'
            from rsp_org_mm
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
                year_month,
                ccorg_cd,
                bun_tp,
                mm_m1_amt,
                mm_m2_amt,
                mm_m3_amt,
                mm_m4_amt,
                mm_m5_amt,
                mm_m6_amt,
                mm_m7_amt,
                mm_m8_amt,
                mm_m9_amt,
                mm_m10_amt,
                mm_m11_amt,
                mm_m12_amt
        ) as mm
        left join common_org_type as ot
            on mm.ccorg_cd = ot.ccorg_cd
        left join common_org_full_level_view as org
            on case
                                           when
                       ot.replace_ccorg_cd is not null
                   then
                       ot.replace_ccorg_cd
                   else
                       mm.ccorg_cd
               end = org.org_ccorg_cd
    ) {
        key ver,
        key year,
        key month,
        key bun_tp,
        key ccorg_cd,
            year_month,
            mm_m1_amt,
            mm_m2_amt,
            mm_m3_amt,
            mm_m4_amt,
            mm_m5_amt,
            mm_m6_amt,
            mm_m7_amt,
            mm_m8_amt,
            mm_m9_amt,
            mm_m10_amt,
            mm_m11_amt,
            mm_m12_amt,
            mm_amt_sum,
            org_order,
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
