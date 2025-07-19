using pl.account_convert as pl_account_convert from '../account_convert';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';


namespace pl;

/**
 * 2024 어카운트 실적 조정용
 */
view account_convert_view as
    select from (
        select
            c.*,
            org.*
        from pl_account_convert as c
        left join common_org_full_level_view as org
            on c.rodr_ccorg_cd = org.org_ccorg_cd
    ) {
        key ver,
        key year,
        key month,
        key biz_tp_account_cd,
            biz_tp_account_nm,
        key rodr_ccorg_cd,
            sale_m1_amt,
            sale_m2_amt,
            sale_m3_amt,
            sale_m4_amt,
            sale_m5_amt,
            sale_m6_amt,
            sale_m7_amt,
            sale_m8_amt,
            sale_m9_amt,
            sale_m10_amt,
            sale_m11_amt,
            sale_m12_amt,
            is_delivery,
            is_total_cc,
            org_tp,
            org_level,
            org_id,
            org_ccorg_cd,
            org_order,
            org_parent,
            org_name,
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
