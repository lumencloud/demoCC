using pl.wideview_view as pl_wideview_view from './wideview_view';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';
using common.annual_target as common_annual_target from '../../common/target';


namespace pl;

view org_view as
        select from (
            select
                pl.year,
                month,
                pl.ccorg_cd,
                org.*,
                case
                    when
                        target.target_cd = 'A01'
                    then
                        target.target_val
                    else
                        0
                end as target_sale_year_amt,
                case
                    when
                        target.target_cd = 'A01'
                    then
                        target.is_total_calc
                    else
                        false
                end as target_sale_year_amt_is_total,
                case
                    when
                        target.target_cd = 'A02'
                    then
                        target.target_val
                    else
                        0
                end as target_margin_year_rate,
                case
                    when
                        target.target_cd = 'A01'
                    then
                        target.is_total_calc
                    else
                        false
                end as target_margin_year_rate_is_total,
                src_type,
                sale_year_amt,
                margin_year_amt,
                prj_prfm_year_amt,
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
                margin_m12_amt,
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
                prj_prfm_m12_amt
            from (
                select
                    year,
                    month,
                    lv1_ccorg_cd                                                                                                                                                                                                                  as ccorg_cd,
                    src_type,
                    sum(sale_m1_amt     + sale_m2_amt + sale_m3_amt + sale_m4_amt + sale_m5_amt + sale_m6_amt + sale_m7_amt + sale_m8_amt + sale_m9_amt + sale_m10_amt + sale_m11_amt + sale_m12_amt)                                             as sale_year_amt,
                    sum(margin_m1_amt   + margin_m2_amt + margin_m3_amt + margin_m4_amt + margin_m5_amt + margin_m6_amt + margin_m7_amt + margin_m8_amt + margin_m9_amt + margin_m10_amt + margin_m11_amt + margin_m12_amt)                       as margin_year_amt,
                    sum(prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt + prj_prfm_m4_amt + prj_prfm_m5_amt + prj_prfm_m6_amt + prj_prfm_m7_amt + prj_prfm_m8_amt + prj_prfm_m9_amt + prj_prfm_m10_amt + prj_prfm_m11_amt + prj_prfm_m12_amt) as prj_prfm_year_amt,
                    sum(sale_m1_amt)                                                                                                                                                                                                              as sale_m1_amt,
                    sum(sale_m2_amt)                                                                                                                                                                                                              as sale_m2_amt,
                    sum(sale_m3_amt)                                                                                                                                                                                                              as sale_m3_amt,
                    sum(sale_m4_amt)                                                                                                                                                                                                              as sale_m4_amt,
                    sum(sale_m5_amt)                                                                                                                                                                                                              as sale_m5_amt,
                    sum(sale_m6_amt)                                                                                                                                                                                                              as sale_m6_amt,
                    sum(sale_m7_amt)                                                                                                                                                                                                              as sale_m7_amt,
                    sum(sale_m8_amt)                                                                                                                                                                                                              as sale_m8_amt,
                    sum(sale_m9_amt)                                                                                                                                                                                                              as sale_m9_amt,
                    sum(sale_m10_amt)                                                                                                                                                                                                             as sale_m10_amt,
                    sum(sale_m11_amt)                                                                                                                                                                                                             as sale_m11_amt,
                    sum(sale_m12_amt)                                                                                                                                                                                                             as sale_m12_amt,
                    sum(margin_m1_amt)                                                                                                                                                                                                            as margin_m1_amt,
                    sum(margin_m2_amt)                                                                                                                                                                                                            as margin_m2_amt,
                    sum(margin_m3_amt)                                                                                                                                                                                                            as margin_m3_amt,
                    sum(margin_m4_amt)                                                                                                                                                                                                            as margin_m4_amt,
                    sum(margin_m5_amt)                                                                                                                                                                                                            as margin_m5_amt,
                    sum(margin_m6_amt)                                                                                                                                                                                                            as margin_m6_amt,
                    sum(margin_m7_amt)                                                                                                                                                                                                            as margin_m7_amt,
                    sum(margin_m8_amt)                                                                                                                                                                                                            as margin_m8_amt,
                    sum(margin_m9_amt)                                                                                                                                                                                                            as margin_m9_amt,
                    sum(margin_m10_amt)                                                                                                                                                                                                           as margin_m10_amt,
                    sum(margin_m11_amt)                                                                                                                                                                                                           as margin_m11_amt,
                    sum(margin_m12_amt)                                                                                                                                                                                                           as margin_m12_amt,
                    sum(prj_prfm_m1_amt)                                                                                                                                                                                                          as prj_prfm_m1_amt,
                    sum(prj_prfm_m2_amt)                                                                                                                                                                                                          as prj_prfm_m2_amt,
                    sum(prj_prfm_m3_amt)                                                                                                                                                                                                          as prj_prfm_m3_amt,
                    sum(prj_prfm_m4_amt)                                                                                                                                                                                                          as prj_prfm_m4_amt,
                    sum(prj_prfm_m5_amt)                                                                                                                                                                                                          as prj_prfm_m5_amt,
                    sum(prj_prfm_m6_amt)                                                                                                                                                                                                          as prj_prfm_m6_amt,
                    sum(prj_prfm_m7_amt)                                                                                                                                                                                                          as prj_prfm_m7_amt,
                    sum(prj_prfm_m8_amt)                                                                                                                                                                                                          as prj_prfm_m8_amt,
                    sum(prj_prfm_m9_amt)                                                                                                                                                                                                          as prj_prfm_m9_amt,
                    sum(prj_prfm_m10_amt)                                                                                                                                                                                                         as prj_prfm_m10_amt,
                    sum(prj_prfm_m11_amt)                                                                                                                                                                                                         as prj_prfm_m11_amt,
                    sum(prj_prfm_m12_amt)                                                                                                                                                                                                         as prj_prfm_m12_amt
                from pl_wideview_view
                where
                    src_type <> 'WA'
                group by
                    year,
                    month,
                    lv1_ccorg_cd,
                    src_type
            union all
                select
                    year,
                    month,
                    lv2_ccorg_cd                                                                                                                                                                                                                  as ccorg_cd,
                    src_type,
                    sum(sale_m1_amt     + sale_m2_amt + sale_m3_amt + sale_m4_amt + sale_m5_amt + sale_m6_amt + sale_m7_amt + sale_m8_amt + sale_m9_amt + sale_m10_amt + sale_m11_amt + sale_m12_amt)                                             as sale_year_amt,
                    sum(margin_m1_amt   + margin_m2_amt + margin_m3_amt + margin_m4_amt + margin_m5_amt + margin_m6_amt + margin_m7_amt + margin_m8_amt + margin_m9_amt + margin_m10_amt + margin_m11_amt + margin_m12_amt)                       as margin_year_amt,
                    sum(prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt + prj_prfm_m4_amt + prj_prfm_m5_amt + prj_prfm_m6_amt + prj_prfm_m7_amt + prj_prfm_m8_amt + prj_prfm_m9_amt + prj_prfm_m10_amt + prj_prfm_m11_amt + prj_prfm_m12_amt) as prj_prfm_year_amt,
                    sum(sale_m1_amt)                                                                                                                                                                                                              as sale_m1_amt,
                    sum(sale_m2_amt)                                                                                                                                                                                                              as sale_m2_amt,
                    sum(sale_m3_amt)                                                                                                                                                                                                              as sale_m3_amt,
                    sum(sale_m4_amt)                                                                                                                                                                                                              as sale_m4_amt,
                    sum(sale_m5_amt)                                                                                                                                                                                                              as sale_m5_amt,
                    sum(sale_m6_amt)                                                                                                                                                                                                              as sale_m6_amt,
                    sum(sale_m7_amt)                                                                                                                                                                                                              as sale_m7_amt,
                    sum(sale_m8_amt)                                                                                                                                                                                                              as sale_m8_amt,
                    sum(sale_m9_amt)                                                                                                                                                                                                              as sale_m9_amt,
                    sum(sale_m10_amt)                                                                                                                                                                                                             as sale_m10_amt,
                    sum(sale_m11_amt)                                                                                                                                                                                                             as sale_m11_amt,
                    sum(sale_m12_amt)                                                                                                                                                                                                             as sale_m12_amt,
                    sum(margin_m1_amt)                                                                                                                                                                                                            as margin_m1_amt,
                    sum(margin_m2_amt)                                                                                                                                                                                                            as margin_m2_amt,
                    sum(margin_m3_amt)                                                                                                                                                                                                            as margin_m3_amt,
                    sum(margin_m4_amt)                                                                                                                                                                                                            as margin_m4_amt,
                    sum(margin_m5_amt)                                                                                                                                                                                                            as margin_m5_amt,
                    sum(margin_m6_amt)                                                                                                                                                                                                            as margin_m6_amt,
                    sum(margin_m7_amt)                                                                                                                                                                                                            as margin_m7_amt,
                    sum(margin_m8_amt)                                                                                                                                                                                                            as margin_m8_amt,
                    sum(margin_m9_amt)                                                                                                                                                                                                            as margin_m9_amt,
                    sum(margin_m10_amt)                                                                                                                                                                                                           as margin_m10_amt,
                    sum(margin_m11_amt)                                                                                                                                                                                                           as margin_m11_amt,
                    sum(margin_m12_amt)                                                                                                                                                                                                           as margin_m12_amt,
                    sum(prj_prfm_m1_amt)                                                                                                                                                                                                          as prj_prfm_m1_amt,
                    sum(prj_prfm_m2_amt)                                                                                                                                                                                                          as prj_prfm_m2_amt,
                    sum(prj_prfm_m3_amt)                                                                                                                                                                                                          as prj_prfm_m3_amt,
                    sum(prj_prfm_m4_amt)                                                                                                                                                                                                          as prj_prfm_m4_amt,
                    sum(prj_prfm_m5_amt)                                                                                                                                                                                                          as prj_prfm_m5_amt,
                    sum(prj_prfm_m6_amt)                                                                                                                                                                                                          as prj_prfm_m6_amt,
                    sum(prj_prfm_m7_amt)                                                                                                                                                                                                          as prj_prfm_m7_amt,
                    sum(prj_prfm_m8_amt)                                                                                                                                                                                                          as prj_prfm_m8_amt,
                    sum(prj_prfm_m9_amt)                                                                                                                                                                                                          as prj_prfm_m9_amt,
                    sum(prj_prfm_m10_amt)                                                                                                                                                                                                         as prj_prfm_m10_amt,
                    sum(prj_prfm_m11_amt)                                                                                                                                                                                                         as prj_prfm_m11_amt,
                    sum(prj_prfm_m12_amt)                                                                                                                                                                                                         as prj_prfm_m12_amt
                from pl_wideview_view
                where
                        src_type     <>     'WA'
                    and lv2_ccorg_cd is not null
                group by
                    year,
                    month,
                    lv2_ccorg_cd,
                    src_type
            union all
                select
                    year,
                    month,
                    lv3_ccorg_cd                                                                                                                                                                                                                  as ccorg_cd,
                    src_type,
                    sum(sale_m1_amt     + sale_m2_amt + sale_m3_amt + sale_m4_amt + sale_m5_amt + sale_m6_amt + sale_m7_amt + sale_m8_amt + sale_m9_amt + sale_m10_amt + sale_m11_amt + sale_m12_amt)                                             as sale_year_amt,
                    sum(margin_m1_amt   + margin_m2_amt + margin_m3_amt + margin_m4_amt + margin_m5_amt + margin_m6_amt + margin_m7_amt + margin_m8_amt + margin_m9_amt + margin_m10_amt + margin_m11_amt + margin_m12_amt)                       as margin_year_amt,
                    sum(prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt + prj_prfm_m4_amt + prj_prfm_m5_amt + prj_prfm_m6_amt + prj_prfm_m7_amt + prj_prfm_m8_amt + prj_prfm_m9_amt + prj_prfm_m10_amt + prj_prfm_m11_amt + prj_prfm_m12_amt) as prj_prfm_year_amt,
                    sum(sale_m1_amt)                                                                                                                                                                                                              as sale_m1_amt,
                    sum(sale_m2_amt)                                                                                                                                                                                                              as sale_m2_amt,
                    sum(sale_m3_amt)                                                                                                                                                                                                              as sale_m3_amt,
                    sum(sale_m4_amt)                                                                                                                                                                                                              as sale_m4_amt,
                    sum(sale_m5_amt)                                                                                                                                                                                                              as sale_m5_amt,
                    sum(sale_m6_amt)                                                                                                                                                                                                              as sale_m6_amt,
                    sum(sale_m7_amt)                                                                                                                                                                                                              as sale_m7_amt,
                    sum(sale_m8_amt)                                                                                                                                                                                                              as sale_m8_amt,
                    sum(sale_m9_amt)                                                                                                                                                                                                              as sale_m9_amt,
                    sum(sale_m10_amt)                                                                                                                                                                                                             as sale_m10_amt,
                    sum(sale_m11_amt)                                                                                                                                                                                                             as sale_m11_amt,
                    sum(sale_m12_amt)                                                                                                                                                                                                             as sale_m12_amt,
                    sum(margin_m1_amt)                                                                                                                                                                                                            as margin_m1_amt,
                    sum(margin_m2_amt)                                                                                                                                                                                                            as margin_m2_amt,
                    sum(margin_m3_amt)                                                                                                                                                                                                            as margin_m3_amt,
                    sum(margin_m4_amt)                                                                                                                                                                                                            as margin_m4_amt,
                    sum(margin_m5_amt)                                                                                                                                                                                                            as margin_m5_amt,
                    sum(margin_m6_amt)                                                                                                                                                                                                            as margin_m6_amt,
                    sum(margin_m7_amt)                                                                                                                                                                                                            as margin_m7_amt,
                    sum(margin_m8_amt)                                                                                                                                                                                                            as margin_m8_amt,
                    sum(margin_m9_amt)                                                                                                                                                                                                            as margin_m9_amt,
                    sum(margin_m10_amt)                                                                                                                                                                                                           as margin_m10_amt,
                    sum(margin_m11_amt)                                                                                                                                                                                                           as margin_m11_amt,
                    sum(margin_m12_amt)                                                                                                                                                                                                           as margin_m12_amt,
                    sum(prj_prfm_m1_amt)                                                                                                                                                                                                          as prj_prfm_m1_amt,
                    sum(prj_prfm_m2_amt)                                                                                                                                                                                                          as prj_prfm_m2_amt,
                    sum(prj_prfm_m3_amt)                                                                                                                                                                                                          as prj_prfm_m3_amt,
                    sum(prj_prfm_m4_amt)                                                                                                                                                                                                          as prj_prfm_m4_amt,
                    sum(prj_prfm_m5_amt)                                                                                                                                                                                                          as prj_prfm_m5_amt,
                    sum(prj_prfm_m6_amt)                                                                                                                                                                                                          as prj_prfm_m6_amt,
                    sum(prj_prfm_m7_amt)                                                                                                                                                                                                          as prj_prfm_m7_amt,
                    sum(prj_prfm_m8_amt)                                                                                                                                                                                                          as prj_prfm_m8_amt,
                    sum(prj_prfm_m9_amt)                                                                                                                                                                                                          as prj_prfm_m9_amt,
                    sum(prj_prfm_m10_amt)                                                                                                                                                                                                         as prj_prfm_m10_amt,
                    sum(prj_prfm_m11_amt)                                                                                                                                                                                                         as prj_prfm_m11_amt,
                    sum(prj_prfm_m12_amt)                                                                                                                                                                                                         as prj_prfm_m12_amt
                from pl_wideview_view
                where
                        src_type     <>     'WA'
                    and lv3_ccorg_cd is not null
                group by
                    year,
                    month,
                    lv3_ccorg_cd,
                    src_type
            union all
                select
                    year,
                    month,
                    div_ccorg_cd                                                                                                                                                                                                                  as ccorg_cd,
                    src_type,
                    sum(sale_m1_amt     + sale_m2_amt + sale_m3_amt + sale_m4_amt + sale_m5_amt + sale_m6_amt + sale_m7_amt + sale_m8_amt + sale_m9_amt + sale_m10_amt + sale_m11_amt + sale_m12_amt)                                             as sale_year_amt,
                    sum(margin_m1_amt   + margin_m2_amt + margin_m3_amt + margin_m4_amt + margin_m5_amt + margin_m6_amt + margin_m7_amt + margin_m8_amt + margin_m9_amt + margin_m10_amt + margin_m11_amt + margin_m12_amt)                       as margin_year_amt,
                    sum(prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt + prj_prfm_m4_amt + prj_prfm_m5_amt + prj_prfm_m6_amt + prj_prfm_m7_amt + prj_prfm_m8_amt + prj_prfm_m9_amt + prj_prfm_m10_amt + prj_prfm_m11_amt + prj_prfm_m12_amt) as prj_prfm_year_amt,
                    sum(sale_m1_amt)                                                                                                                                                                                                              as sale_m1_amt,
                    sum(sale_m2_amt)                                                                                                                                                                                                              as sale_m2_amt,
                    sum(sale_m3_amt)                                                                                                                                                                                                              as sale_m3_amt,
                    sum(sale_m4_amt)                                                                                                                                                                                                              as sale_m4_amt,
                    sum(sale_m5_amt)                                                                                                                                                                                                              as sale_m5_amt,
                    sum(sale_m6_amt)                                                                                                                                                                                                              as sale_m6_amt,
                    sum(sale_m7_amt)                                                                                                                                                                                                              as sale_m7_amt,
                    sum(sale_m8_amt)                                                                                                                                                                                                              as sale_m8_amt,
                    sum(sale_m9_amt)                                                                                                                                                                                                              as sale_m9_amt,
                    sum(sale_m10_amt)                                                                                                                                                                                                             as sale_m10_amt,
                    sum(sale_m11_amt)                                                                                                                                                                                                             as sale_m11_amt,
                    sum(sale_m12_amt)                                                                                                                                                                                                             as sale_m12_amt,
                    sum(margin_m1_amt)                                                                                                                                                                                                            as margin_m1_amt,
                    sum(margin_m2_amt)                                                                                                                                                                                                            as margin_m2_amt,
                    sum(margin_m3_amt)                                                                                                                                                                                                            as margin_m3_amt,
                    sum(margin_m4_amt)                                                                                                                                                                                                            as margin_m4_amt,
                    sum(margin_m5_amt)                                                                                                                                                                                                            as margin_m5_amt,
                    sum(margin_m6_amt)                                                                                                                                                                                                            as margin_m6_amt,
                    sum(margin_m7_amt)                                                                                                                                                                                                            as margin_m7_amt,
                    sum(margin_m8_amt)                                                                                                                                                                                                            as margin_m8_amt,
                    sum(margin_m9_amt)                                                                                                                                                                                                            as margin_m9_amt,
                    sum(margin_m10_amt)                                                                                                                                                                                                           as margin_m10_amt,
                    sum(margin_m11_amt)                                                                                                                                                                                                           as margin_m11_amt,
                    sum(margin_m12_amt)                                                                                                                                                                                                           as margin_m12_amt,
                    sum(prj_prfm_m1_amt)                                                                                                                                                                                                          as prj_prfm_m1_amt,
                    sum(prj_prfm_m2_amt)                                                                                                                                                                                                          as prj_prfm_m2_amt,
                    sum(prj_prfm_m3_amt)                                                                                                                                                                                                          as prj_prfm_m3_amt,
                    sum(prj_prfm_m4_amt)                                                                                                                                                                                                          as prj_prfm_m4_amt,
                    sum(prj_prfm_m5_amt)                                                                                                                                                                                                          as prj_prfm_m5_amt,
                    sum(prj_prfm_m6_amt)                                                                                                                                                                                                          as prj_prfm_m6_amt,
                    sum(prj_prfm_m7_amt)                                                                                                                                                                                                          as prj_prfm_m7_amt,
                    sum(prj_prfm_m8_amt)                                                                                                                                                                                                          as prj_prfm_m8_amt,
                    sum(prj_prfm_m9_amt)                                                                                                                                                                                                          as prj_prfm_m9_amt,
                    sum(prj_prfm_m10_amt)                                                                                                                                                                                                         as prj_prfm_m10_amt,
                    sum(prj_prfm_m11_amt)                                                                                                                                                                                                         as prj_prfm_m11_amt,
                    sum(prj_prfm_m12_amt)                                                                                                                                                                                                         as prj_prfm_m12_amt
                from pl_wideview_view
                where
                        src_type     <>     'WA'
                    and div_ccorg_cd is not null
                group by
                    year,
                    month,
                    div_ccorg_cd,
                    src_type
            union all
                select
                    year,
                    month,
                    hdqt_ccorg_cd                                                                                                                                                                                                                 as ccorg_cd,
                    src_type,
                    sum(sale_m1_amt     + sale_m2_amt + sale_m3_amt + sale_m4_amt + sale_m5_amt + sale_m6_amt + sale_m7_amt + sale_m8_amt + sale_m9_amt + sale_m10_amt + sale_m11_amt + sale_m12_amt)                                             as sale_year_amt,
                    sum(margin_m1_amt   + margin_m2_amt + margin_m3_amt + margin_m4_amt + margin_m5_amt + margin_m6_amt + margin_m7_amt + margin_m8_amt + margin_m9_amt + margin_m10_amt + margin_m11_amt + margin_m12_amt)                       as margin_year_amt,
                    sum(prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt + prj_prfm_m4_amt + prj_prfm_m5_amt + prj_prfm_m6_amt + prj_prfm_m7_amt + prj_prfm_m8_amt + prj_prfm_m9_amt + prj_prfm_m10_amt + prj_prfm_m11_amt + prj_prfm_m12_amt) as prj_prfm_year_amt,
                    sum(sale_m1_amt)                                                                                                                                                                                                              as sale_m1_amt,
                    sum(sale_m2_amt)                                                                                                                                                                                                              as sale_m2_amt,
                    sum(sale_m3_amt)                                                                                                                                                                                                              as sale_m3_amt,
                    sum(sale_m4_amt)                                                                                                                                                                                                              as sale_m4_amt,
                    sum(sale_m5_amt)                                                                                                                                                                                                              as sale_m5_amt,
                    sum(sale_m6_amt)                                                                                                                                                                                                              as sale_m6_amt,
                    sum(sale_m7_amt)                                                                                                                                                                                                              as sale_m7_amt,
                    sum(sale_m8_amt)                                                                                                                                                                                                              as sale_m8_amt,
                    sum(sale_m9_amt)                                                                                                                                                                                                              as sale_m9_amt,
                    sum(sale_m10_amt)                                                                                                                                                                                                             as sale_m10_amt,
                    sum(sale_m11_amt)                                                                                                                                                                                                             as sale_m11_amt,
                    sum(sale_m12_amt)                                                                                                                                                                                                             as sale_m12_amt,
                    sum(margin_m1_amt)                                                                                                                                                                                                            as margin_m1_amt,
                    sum(margin_m2_amt)                                                                                                                                                                                                            as margin_m2_amt,
                    sum(margin_m3_amt)                                                                                                                                                                                                            as margin_m3_amt,
                    sum(margin_m4_amt)                                                                                                                                                                                                            as margin_m4_amt,
                    sum(margin_m5_amt)                                                                                                                                                                                                            as margin_m5_amt,
                    sum(margin_m6_amt)                                                                                                                                                                                                            as margin_m6_amt,
                    sum(margin_m7_amt)                                                                                                                                                                                                            as margin_m7_amt,
                    sum(margin_m8_amt)                                                                                                                                                                                                            as margin_m8_amt,
                    sum(margin_m9_amt)                                                                                                                                                                                                            as margin_m9_amt,
                    sum(margin_m10_amt)                                                                                                                                                                                                           as margin_m10_amt,
                    sum(margin_m11_amt)                                                                                                                                                                                                           as margin_m11_amt,
                    sum(margin_m12_amt)                                                                                                                                                                                                           as margin_m12_amt,
                    sum(prj_prfm_m1_amt)                                                                                                                                                                                                          as prj_prfm_m1_amt,
                    sum(prj_prfm_m2_amt)                                                                                                                                                                                                          as prj_prfm_m2_amt,
                    sum(prj_prfm_m3_amt)                                                                                                                                                                                                          as prj_prfm_m3_amt,
                    sum(prj_prfm_m4_amt)                                                                                                                                                                                                          as prj_prfm_m4_amt,
                    sum(prj_prfm_m5_amt)                                                                                                                                                                                                          as prj_prfm_m5_amt,
                    sum(prj_prfm_m6_amt)                                                                                                                                                                                                          as prj_prfm_m6_amt,
                    sum(prj_prfm_m7_amt)                                                                                                                                                                                                          as prj_prfm_m7_amt,
                    sum(prj_prfm_m8_amt)                                                                                                                                                                                                          as prj_prfm_m8_amt,
                    sum(prj_prfm_m9_amt)                                                                                                                                                                                                          as prj_prfm_m9_amt,
                    sum(prj_prfm_m10_amt)                                                                                                                                                                                                         as prj_prfm_m10_amt,
                    sum(prj_prfm_m11_amt)                                                                                                                                                                                                         as prj_prfm_m11_amt,
                    sum(prj_prfm_m12_amt)                                                                                                                                                                                                         as prj_prfm_m12_amt
                from pl_wideview_view
                where
                        src_type      <>     'WA'
                    and hdqt_ccorg_cd is not null
                group by
                    year,
                    month,
                    hdqt_ccorg_cd,
                    src_type
            ) as pl
            left join common_org_full_level_view as org
                on pl.ccorg_cd = org.org_ccorg_cd
            left join (
                select from 
                common_annual_target
                ) as target
                on  pl.ccorg_cd = target.target_type_cd
                and pl.year     = target.year
        ) {
            key year,
            key month,
            key ccorg_cd,
            key src_type,
                org_ccorg_cd,
                org_sort_order,
                org_parent,
                org_name,
                lv1_id,
                lv1_name,
                lv1_ccorg_cd,
                lv1_sort_order,
                lv2_id,
                lv2_name,
                lv2_ccorg_cd,
                lv2_sort_order,
                lv3_id,
                lv3_name,
                lv3_ccorg_cd,
                lv3_sort_order,
                div_id,
                div_name,
                div_ccorg_cd,
                div_sort_order,
                hdqt_id,
                hdqt_name,
                hdqt_ccorg_cd,
                hdqt_sort_order,
                target_sale_year_amt,
                target_sale_year_amt_is_total,
                target_margin_year_rate,
                target_margin_year_rate_is_total,
                sale_year_amt,
                margin_year_amt,
                prj_prfm_year_amt,
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
                margin_m12_amt,
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
                prj_prfm_m12_amt
        };
