using sga.investment as sga_investment from '../investment';
using common.gl_account_view as common_gl_account_view from '../../common/view/gl_account_view';
// using common.commitment_item_view as common_commitment_item_view from '../../common/view/commitment_item_view';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';
using common.org_type as common_org_type from '../../common/org_type';
using common.version as common_version from '../../common/version';

namespace sga;

/**
 * SG&A 투자비 데이터
 *
 * 투자비는 중계정(commitment_item) 없는 건이 많아서 GL 계정 단위로 집계 (25.06.23)
 */
view investment_view as
    select from (
        select
            invest.*,
            gl.name as description,
            org.*
        from (
            select
                ver,
                year,
                month,
                prj_no,
                ccorg_cd,
                gl_account,
                commitment_item,
                case
                    when max(case
                                 when asset_yn = true
                                      then 1
                                 else 0
                             end)              = 1
                         then true
                    else false
                end                  as asset_yn        : Boolean, // seq 추가 후 병합하므로 의미가 애매해짐, view 에서는 제거여부 파악필요
                sum(iv_cash_m1_amt)  as iv_cash_m1_amt  : Decimal(18, 2),
                sum(iv_cash_m2_amt)  as iv_cash_m2_amt  : Decimal(18, 2),
                sum(iv_cash_m3_amt)  as iv_cash_m3_amt  : Decimal(18, 2),
                sum(iv_cash_m4_amt)  as iv_cash_m4_amt  : Decimal(18, 2),
                sum(iv_cash_m5_amt)  as iv_cash_m5_amt  : Decimal(18, 2),
                sum(iv_cash_m6_amt)  as iv_cash_m6_amt  : Decimal(18, 2),
                sum(iv_cash_m7_amt)  as iv_cash_m7_amt  : Decimal(18, 2),
                sum(iv_cash_m8_amt)  as iv_cash_m8_amt  : Decimal(18, 2),
                sum(iv_cash_m9_amt)  as iv_cash_m9_amt  : Decimal(18, 2),
                sum(iv_cash_m10_amt) as iv_cash_m10_amt : Decimal(18, 2),
                sum(iv_cash_m11_amt) as iv_cash_m11_amt : Decimal(18, 2),
                sum(iv_cash_m12_amt) as iv_cash_m12_amt : Decimal(18, 2),
                sum(iv_cost_m1_amt)  as iv_cost_m1_amt  : Decimal(18, 2),
                sum(iv_cost_m2_amt)  as iv_cost_m2_amt  : Decimal(18, 2),
                sum(iv_cost_m3_amt)  as iv_cost_m3_amt  : Decimal(18, 2),
                sum(iv_cost_m4_amt)  as iv_cost_m4_amt  : Decimal(18, 2),
                sum(iv_cost_m5_amt)  as iv_cost_m5_amt  : Decimal(18, 2),
                sum(iv_cost_m6_amt)  as iv_cost_m6_amt  : Decimal(18, 2),
                sum(iv_cost_m7_amt)  as iv_cost_m7_amt  : Decimal(18, 2),
                sum(iv_cost_m8_amt)  as iv_cost_m8_amt  : Decimal(18, 2),
                sum(iv_cost_m9_amt)  as iv_cost_m9_amt  : Decimal(18, 2),
                sum(iv_cost_m10_amt) as iv_cost_m10_amt : Decimal(18, 2),
                sum(iv_cost_m11_amt) as iv_cost_m11_amt : Decimal(18, 2),
                sum(iv_cost_m12_amt) as iv_cost_m12_amt : Decimal(18, 2)
            from (
                select
                    iv.ver,
                    iv.seq,
                    iv.year,
                    iv.month,
                    iv.prj_no,
                    case
                        when ot.replace_ccorg_cd is not null
                             then ot.replace_ccorg_cd
                        else iv.ccorg_cd
                    end as ccorg_cd : String(10) @title: 'ERP Cost Center',
                    iv.gl_account,
                    iv.commitment_item,
                    iv.asset_yn,
                    iv.iv_cash_m1_amt,
                    iv.iv_cash_m2_amt,
                    iv.iv_cash_m3_amt,
                    iv.iv_cash_m4_amt,
                    iv.iv_cash_m5_amt,
                    iv.iv_cash_m6_amt,
                    iv.iv_cash_m7_amt,
                    iv.iv_cash_m8_amt,
                    iv.iv_cash_m9_amt,
                    iv.iv_cash_m10_amt,
                    iv.iv_cash_m11_amt,
                    iv.iv_cash_m12_amt,
                    iv.iv_cost_m1_amt,
                    iv.iv_cost_m2_amt,
                    iv.iv_cost_m3_amt,
                    iv.iv_cost_m4_amt,
                    iv.iv_cost_m5_amt,
                    iv.iv_cost_m6_amt,
                    iv.iv_cost_m7_amt,
                    iv.iv_cost_m8_amt,
                    iv.iv_cost_m9_amt,
                    iv.iv_cost_m10_amt,
                    iv.iv_cost_m11_amt,
                    iv.iv_cost_m12_amt
                from sga_investment as iv
                left join common_org_type as ot
                    on  iv.ccorg_cd         =      ot.ccorg_cd
                    and ot.replace_ccorg_cd is not null
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
                prj_no,
                ccorg_cd,
                gl_account,
                commitment_item
        ) as invest
        left join common_gl_account_view as gl
            on invest.gl_account = gl.gl_account
        left join common_org_full_level_view as org
            on invest.ccorg_cd = org.org_ccorg_cd
    ) {
        key ver,
        key year,
        key month,
        key ccorg_cd,
        key gl_account,
            prj_no,
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
