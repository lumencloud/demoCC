using pl.wideview_view as pl_wideview_view from './wideview_view';
using common.annual_target as common_annual_target from '../../common/target';
using common.org_hierachy_view as common_org_hierachy_view from '../../common/view/org_hierachy_view';

namespace pl;

view wideview_org_view as
    select from (
        select
            pl.*,
            div_sale_target.is_total_calc as div_target_sale_is_total_calc,
            ifnull(
                div_sale_target.target_val, 0
            )                             as div_target_sale_amt,
            ifnull(
                div_margin_target.target_val, 0
            )                             as div_target_margin_rate,
            case
                when
                    div_sale_target.target_val       is not null
                    and div_margin_target.target_val is not null
                then
                    div_sale_target.target_val       *      div_margin_target.target_val / 100
                else
                    0
            end                           as div_target_margin_amt,
            sale_target.is_total_calc     as target_sale_is_total_calc,
            ifnull(
                sale_target.target_val, 0
            )                             as target_sale_amt,
            ifnull(
                margin_target.target_val, 0
            )                             as target_margin_rate,
            case
                when
                    sale_target.target_val           is not null
                    and margin_target.target_val     is not null
                then
                    sale_target.target_val           *      margin_target.target_val / 100
                else
                    0
            end                           as target_margin_amt,
            // margin_target.is_total_calc     as margin_is_total_calc,
            // margin_amt_target.is_total_calc as margin_is_total_calc,
            org.*
        from (
            select
                ver,
                year,
                month,
                // src_type,
                div_ccorg_cd          as sale_div_ccorg_cd,
                hdqt_ccorg_cd         as sale_hdqt_ccorg_cd,
                max(rodr_m1_amt)      as rodr_m1_amt      : Decimal(18, 2),
                max(rodr_m2_amt)      as rodr_m2_amt      : Decimal(18, 2),
                max(rodr_m3_amt)      as rodr_m3_amt      : Decimal(18, 2),
                max(rodr_m4_amt)      as rodr_m4_amt      : Decimal(18, 2),
                max(rodr_m5_amt)      as rodr_m5_amt      : Decimal(18, 2),
                max(rodr_m6_amt)      as rodr_m6_amt      : Decimal(18, 2),
                max(rodr_m7_amt)      as rodr_m7_amt      : Decimal(18, 2),
                max(rodr_m8_amt)      as rodr_m8_amt      : Decimal(18, 2),
                max(rodr_m9_amt)      as rodr_m9_amt      : Decimal(18, 2),
                max(rodr_m10_amt)     as rodr_m10_amt     : Decimal(18, 2),
                max(rodr_m11_amt)     as rodr_m11_amt     : Decimal(18, 2),
                max(rodr_m12_amt)     as rodr_m12_amt     : Decimal(18, 2),
                sum(sale_m1_amt)      as sale_m1_amt      : Decimal(18, 2),
                sum(sale_m2_amt)      as sale_m2_amt      : Decimal(18, 2),
                sum(sale_m3_amt)      as sale_m3_amt      : Decimal(18, 2),
                sum(sale_m4_amt)      as sale_m4_amt      : Decimal(18, 2),
                sum(sale_m5_amt)      as sale_m5_amt      : Decimal(18, 2),
                sum(sale_m6_amt)      as sale_m6_amt      : Decimal(18, 2),
                sum(sale_m7_amt)      as sale_m7_amt      : Decimal(18, 2),
                sum(sale_m8_amt)      as sale_m8_amt      : Decimal(18, 2),
                sum(sale_m9_amt)      as sale_m9_amt      : Decimal(18, 2),
                sum(sale_m10_amt)     as sale_m10_amt     : Decimal(18, 2),
                sum(sale_m11_amt)     as sale_m11_amt     : Decimal(18, 2),
                sum(sale_m12_amt)     as sale_m12_amt     : Decimal(18, 2),
                sum(prj_prfm_m1_amt)  as prj_prfm_m1_amt  : Decimal(18, 2),
                sum(prj_prfm_m2_amt)  as prj_prfm_m2_amt  : Decimal(18, 2),
                sum(prj_prfm_m3_amt)  as prj_prfm_m3_amt  : Decimal(18, 2),
                sum(prj_prfm_m4_amt)  as prj_prfm_m4_amt  : Decimal(18, 2),
                sum(prj_prfm_m5_amt)  as prj_prfm_m5_amt  : Decimal(18, 2),
                sum(prj_prfm_m6_amt)  as prj_prfm_m6_amt  : Decimal(18, 2),
                sum(prj_prfm_m7_amt)  as prj_prfm_m7_amt  : Decimal(18, 2),
                sum(prj_prfm_m8_amt)  as prj_prfm_m8_amt  : Decimal(18, 2),
                sum(prj_prfm_m9_amt)  as prj_prfm_m9_amt  : Decimal(18, 2),
                sum(prj_prfm_m10_amt) as prj_prfm_m10_amt : Decimal(18, 2),
                sum(prj_prfm_m11_amt) as prj_prfm_m11_amt : Decimal(18, 2),
                sum(prj_prfm_m12_amt) as prj_prfm_m12_amt : Decimal(18, 2),
                sum(margin_m1_amt)    as margin_m1_amt    : Decimal(18, 2),
                sum(margin_m2_amt)    as margin_m2_amt    : Decimal(18, 2),
                sum(margin_m3_amt)    as margin_m3_amt    : Decimal(18, 2),
                sum(margin_m4_amt)    as margin_m4_amt    : Decimal(18, 2),
                sum(margin_m5_amt)    as margin_m5_amt    : Decimal(18, 2),
                sum(margin_m6_amt)    as margin_m6_amt    : Decimal(18, 2),
                sum(margin_m7_amt)    as margin_m7_amt    : Decimal(18, 2),
                sum(margin_m8_amt)    as margin_m8_amt    : Decimal(18, 2),
                sum(margin_m9_amt)    as margin_m9_amt    : Decimal(18, 2),
                sum(margin_m10_amt)   as margin_m10_amt   : Decimal(18, 2),
                sum(margin_m11_amt)   as margin_m11_amt   : Decimal(18, 2),
                sum(margin_m12_amt)   as margin_m12_amt   : Decimal(18, 2)
            from pl_wideview_view
            where
                src_type not in (
                    'WA', 'D'
                )
            group by
                ver,
                year,
                month,
                // src_type,
                div_ccorg_cd,
                hdqt_ccorg_cd
        ) as pl
        left join common_org_hierachy_view as org
            on      pl.sale_hdqt_ccorg_cd =  org.org_ccorg_cd
            or (
                    pl.sale_div_ccorg_cd  =  org.org_ccorg_cd
                and pl.sale_hdqt_ccorg_cd is null
            )
        left join common_annual_target as sale_target
            on  org.org_ccorg_cd        = sale_target.target_type_cd
            and pl.year                 = sale_target.year
            and sale_target.target_cd   = 'A01'
            and sale_target.target_type = 'ccorg_cd'
        left join common_annual_target as margin_target
            on  org.org_ccorg_cd          = margin_target.target_type_cd
            and pl.year                   = margin_target.year
            and margin_target.target_cd   = 'A02'
            and margin_target.target_type = 'ccorg_cd'
        left join common_annual_target as margin_amt_target
            on  org.org_ccorg_cd              = margin_amt_target.target_type_cd
            and pl.year                       = margin_amt_target.year
            and margin_amt_target.target_cd   = 'A03'
            and margin_amt_target.target_type = 'ccorg_cd'
        // 부문의 목표
        left join common_annual_target as div_sale_target
            on  org.div_ccorg_cd            = div_sale_target.target_type_cd
            and pl.year                     = div_sale_target.year
            and div_sale_target.target_cd   = 'A01'
            and div_sale_target.target_type = 'ccorg_cd'
        left join common_annual_target as div_margin_target
            on  org.div_ccorg_cd              = div_margin_target.target_type_cd
            and pl.year                       = div_margin_target.year
            and div_margin_target.target_cd   = 'A02'
            and div_margin_target.target_type = 'ccorg_cd'
    ) {
        key ver,
        key year,
        key month,
            // key src_type,
        key org_ccorg_cd,
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
            team_ccorg_cd,
            div_target_sale_is_total_calc,
            div_target_sale_amt : Double,
            div_target_margin_rate : Double,
            div_target_margin_amt : Double,
            target_sale_is_total_calc,
            target_sale_amt : Double,
            target_margin_rate : Double,
            target_margin_amt : Double,
            rodr_m1_amt,
            rodr_m2_amt,
            rodr_m3_amt,
            rodr_m4_amt,
            rodr_m5_amt,
            rodr_m6_amt,
            rodr_m7_amt,
            rodr_m8_amt,
            rodr_m9_amt,
            rodr_m10_amt,
            rodr_m11_amt,
            rodr_m12_amt,
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
            prj_prfm_m1_amt,
            prj_prfm_m2_amt,
            prj_prfm_m3_amt,
            prj_prfm_m4_amt,
            prj_prfm_m5_amt,
            prj_prfm_m6_amt,
            prj_prfm_m7_amt,
            prj_prfm_m8_amt,
            prj_prfm_m9_amt,
            prj_prfm_m10_amt,
            prj_prfm_m11_amt,
            prj_prfm_m12_amt,
            margin_m1_amt,
            margin_m2_amt,
            margin_m3_amt,
            margin_m4_amt,
            margin_m5_amt,
            margin_m6_amt,
            margin_m7_amt,
            margin_m8_amt,
            margin_m9_amt,
            margin_m10_amt,
            margin_m11_amt,
            margin_m12_amt
    };
