using sga.investment as sga_investment from '../investment';
using common.commitment_item_view as common_commitment_item_view from '../../common/view/commitment_item_view';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';
using common.version as common_version from '../../common/version';

namespace sga;

/**
 * SG&A 투자비 데이터
 */
view investment_view as
    select from (
        select
            iv.*,
            commitment.description,
            org.org_ccorg_cd,
            org.org_order,
            org.org_parent,
            org.org_name,
            org.is_delivery,
            org.lv1_id,
            org.lv1_name,
            org.lv1_ccorg_cd,
            org.lv2_id,
            org.lv2_name,
            org.lv2_ccorg_cd,
            org.lv3_id,
            org.lv3_name,
            org.lv3_ccorg_cd,
            org.div_id,
            org.div_name,
            org.div_ccorg_cd,
            org.hdqt_id,
            org.hdqt_name,
            org.hdqt_ccorg_cd,
            org.team_id,
            org.team_name,
            org.team_ccorg_cd
        from sga_investment as iv
        left join common_commitment_item_view as commitment
            on iv.commitment_item = commitment.commitment_item
        left join common_org_full_level_view as org
            on iv.ccorg_cd = org.org_ccorg_cd
        where
            iv.ver in (
                select ver from common_version
                where
                       tag = 'C'
                    or tag = 'Y'
            )
    ) {
        key ver,
        key year,
        key month,
        key prj_no,
        key ccorg_cd,
        key gl_account,
            commitment_item,
            description,
            asset_yn,
            iv_cash_m1_amt,
            iv_cash_m2_amt,
            iv_cash_m3_amt,
            iv_cash_m4_amt,
            iv_cash_m5_amt,
            iv_cash_m6_amt,
            iv_cash_m7_amt,
            iv_cash_m8_amt,
            iv_cash_m9_amt,
            iv_cash_m10_amt,
            iv_cash_m11_amt,
            iv_cash_m12_amt,
            iv_cost_m1_amt,
            iv_cost_m2_amt,
            iv_cost_m3_amt,
            iv_cost_m4_amt,
            iv_cost_m5_amt,
            iv_cost_m6_amt,
            iv_cost_m7_amt,
            iv_cost_m8_amt,
            iv_cost_m9_amt,
            iv_cost_m10_amt,
            iv_cost_m11_amt,
            iv_cost_m12_amt,
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
    };
