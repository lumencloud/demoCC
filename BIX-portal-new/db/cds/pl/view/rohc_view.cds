using pl.wideview_view as pl_wideview_view from './wideview_view';
using sga.wideview_view as sga_wideview_view from '../../sga/view/wideview_view';
using rsp.org_total_labor_view as rsp_org_total_labor_view from '../../rsp/view/org_total_labor_view';

namespace pl;

view rohc_view as
        select from (
            select
                pl.year,
                pl.lv1_ccorg_cd as ccorg_cd,
                pl.src_type,
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
                sga_m1_amt,
                sga_m2_amt,
                sga_m3_amt,
                sga_m4_amt,
                sga_m5_amt,
                sga_m6_amt,
                sga_m7_amt,
                sga_m8_amt,
                sga_m9_amt,
                sga_m10_amt,
                sga_m11_amt,
                sga_m12_amt,
                total_labor_m1_amt,
                total_labor_m2_amt,
                total_labor_m3_amt,
                total_labor_m4_amt,
                total_labor_m5_amt,
                total_labor_m6_amt,
                total_labor_m7_amt,
                total_labor_m8_amt,
                total_labor_m9_amt,
                total_labor_m10_amt,
                total_labor_m11_amt,
                total_labor_m12_amt
            from (
                select
                    year,
                    lv1_ccorg_cd,
                    src_type,
                    sum(margin_m1_amt)  as margin_m1_amt,
                    sum(margin_m2_amt)  as margin_m2_amt,
                    sum(margin_m3_amt)  as margin_m3_amt,
                    sum(margin_m4_amt)  as margin_m4_amt,
                    sum(margin_m5_amt)  as margin_m5_amt,
                    sum(margin_m6_amt)  as margin_m6_amt,
                    sum(margin_m7_amt)  as margin_m7_amt,
                    sum(margin_m8_amt)  as margin_m8_amt,
                    sum(margin_m9_amt)  as margin_m9_amt,
                    sum(margin_m10_amt) as margin_m10_amt,
                    sum(margin_m11_amt) as margin_m11_amt,
                    sum(margin_m12_amt) as margin_m12_amt
                    // sum(margin_m1_amt) over(partition by lv1_ccorg_cd, year, src_type)  as margin_m1_amt,
                    // sum(margin_m2_amt) over(partition by lv1_ccorg_cd, year, src_type)  as margin_m2_amt,
                    // sum(margin_m3_amt) over(partition by lv1_ccorg_cd, year, src_type)  as margin_m3_amt,
                    // sum(margin_m4_amt) over(partition by lv1_ccorg_cd, year, src_type)  as margin_m4_amt,
                    // sum(margin_m5_amt) over(partition by lv1_ccorg_cd, year, src_type)  as margin_m5_amt,
                    // sum(margin_m6_amt) over(partition by lv1_ccorg_cd, year, src_type)  as margin_m6_amt,
                    // sum(margin_m7_amt) over(partition by lv1_ccorg_cd, year, src_type)  as margin_m7_amt,
                    // sum(margin_m8_amt) over(partition by lv1_ccorg_cd, year, src_type)  as margin_m8_amt,
                    // sum(margin_m9_amt) over(partition by lv1_ccorg_cd, year, src_type)  as margin_m9_amt,
                    // sum(margin_m10_amt) over(partition by lv1_ccorg_cd, year, src_type) as margin_m10_amt,
                    // sum(margin_m11_amt) over(partition by lv1_ccorg_cd, year, src_type) as margin_m11_amt,
                    // sum(margin_m12_amt) over(partition by lv1_ccorg_cd, year, src_type) as margin_m12_amt
                from pl_wideview_view
                where
                    src_type <> 'WA'
                group by
                    year,
                    lv1_ccorg_cd,
                    src_type
            ) as pl
            inner join (
                select
                    year,
                    lv1_ccorg_cd,
                    sum(labor_m1_amt  + exp_m1_amt + iv_m1_amt)   as sga_m1_amt,
                    sum(labor_m2_amt  + exp_m2_amt + iv_m2_amt)   as sga_m2_amt,
                    sum(labor_m3_amt  + exp_m3_amt + iv_m3_amt)   as sga_m3_amt,
                    sum(labor_m4_amt  + exp_m4_amt + iv_m4_amt)   as sga_m4_amt,
                    sum(labor_m5_amt  + exp_m5_amt + iv_m5_amt)   as sga_m5_amt,
                    sum(labor_m6_amt  + exp_m6_amt + iv_m6_amt)   as sga_m6_amt,
                    sum(labor_m7_amt  + exp_m7_amt + iv_m7_amt)   as sga_m7_amt,
                    sum(labor_m8_amt  + exp_m8_amt + iv_m8_amt)   as sga_m8_amt,
                    sum(labor_m9_amt  + exp_m9_amt + iv_m9_amt)   as sga_m9_amt,
                    sum(labor_m10_amt + exp_m10_amt + iv_m10_amt) as sga_m10_amt,
                    sum(labor_m11_amt + exp_m11_amt + iv_m11_amt) as sga_m11_amt,
                    sum(labor_m12_amt + exp_m12_amt + iv_m12_amt) as sga_m12_amt
                    // sum(labor_m1_amt  + exp_m1_amt + iv_m1_amt) over(partition by lv1_ccorg_cd, year)   as sga_m1_amt,
                    // sum(labor_m2_amt  + exp_m2_amt + iv_m2_amt) over(partition by lv1_ccorg_cd, year)   as sga_m2_amt,
                    // sum(labor_m3_amt  + exp_m3_amt + iv_m3_amt) over(partition by lv1_ccorg_cd, year)   as sga_m3_amt,
                    // sum(labor_m4_amt  + exp_m4_amt + iv_m4_amt) over(partition by lv1_ccorg_cd, year)   as sga_m4_amt,
                    // sum(labor_m5_amt  + exp_m5_amt + iv_m5_amt) over(partition by lv1_ccorg_cd, year)   as sga_m5_amt,
                    // sum(labor_m6_amt  + exp_m6_amt + iv_m6_amt) over(partition by lv1_ccorg_cd, year)   as sga_m6_amt,
                    // sum(labor_m7_amt  + exp_m7_amt + iv_m7_amt) over(partition by lv1_ccorg_cd, year)   as sga_m7_amt,
                    // sum(labor_m8_amt  + exp_m8_amt + iv_m8_amt) over(partition by lv1_ccorg_cd, year)   as sga_m8_amt,
                    // sum(labor_m9_amt  + exp_m9_amt + iv_m9_amt) over(partition by lv1_ccorg_cd, year)   as sga_m9_amt,
                    // sum(labor_m10_amt + exp_m10_amt + iv_m10_amt) over(partition by lv1_ccorg_cd, year) as sga_m10_amt,
                    // sum(labor_m11_amt + exp_m11_amt + iv_m11_amt) over(partition by lv1_ccorg_cd, year) as sga_m11_amt,
                    // sum(labor_m12_amt + exp_m12_amt + iv_m12_amt) over(partition by lv1_ccorg_cd, year) as sga_m12_amt
                from sga_wideview_view
                group by
                    year,
                    lv1_ccorg_cd
            ) as sga
                on  pl.lv1_ccorg_cd = sga.lv1_ccorg_cd
                and pl.year         = sga.year
            inner join (
                select
                    year,
                    lv1_ccorg_cd,
                    sum(total_m1_amt)  as total_labor_m1_amt,
                    sum(total_m2_amt)  as total_labor_m2_amt,
                    sum(total_m3_amt)  as total_labor_m3_amt,
                    sum(total_m4_amt)  as total_labor_m4_amt,
                    sum(total_m5_amt)  as total_labor_m5_amt,
                    sum(total_m6_amt)  as total_labor_m6_amt,
                    sum(total_m7_amt)  as total_labor_m7_amt,
                    sum(total_m8_amt)  as total_labor_m8_amt,
                    sum(total_m9_amt)  as total_labor_m9_amt,
                    sum(total_m10_amt) as total_labor_m10_amt,
                    sum(total_m11_amt) as total_labor_m11_amt,
                    sum(total_m12_amt) as total_labor_m12_amt
                    // sum(total_m1_amt) over(partition by lv1_ccorg_cd, year)  as total_labor_m1_amt,
                    // sum(total_m2_amt) over(partition by lv1_ccorg_cd, year)  as total_labor_m2_amt,
                    // sum(total_m3_amt) over(partition by lv1_ccorg_cd, year)  as total_labor_m3_amt,
                    // sum(total_m4_amt) over(partition by lv1_ccorg_cd, year)  as total_labor_m4_amt,
                    // sum(total_m5_amt) over(partition by lv1_ccorg_cd, year)  as total_labor_m5_amt,
                    // sum(total_m6_amt) over(partition by lv1_ccorg_cd, year)  as total_labor_m6_amt,
                    // sum(total_m7_amt) over(partition by lv1_ccorg_cd, year)  as total_labor_m7_amt,
                    // sum(total_m8_amt) over(partition by lv1_ccorg_cd, year)  as total_labor_m8_amt,
                    // sum(total_m9_amt) over(partition by lv1_ccorg_cd, year)  as total_labor_m9_amt,
                    // sum(total_m10_amt) over(partition by lv1_ccorg_cd, year) as total_labor_m10_amt,
                    // sum(total_m11_amt) over(partition by lv1_ccorg_cd, year) as total_labor_m11_amt,
                    // sum(total_m12_amt) over(partition by lv1_ccorg_cd, year) as total_labor_m12_amt
                from rsp_org_total_labor_view
                group by
                    year,
                    lv1_ccorg_cd
            ) as labor
                on  pl.lv1_ccorg_cd = labor.lv1_ccorg_cd
                and pl.year         = labor.year
        union all
            select
                pl.year,
                pl.lv2_ccorg_cd as ccorg_cd,
                pl.src_type,
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
                sga_m1_amt,
                sga_m2_amt,
                sga_m3_amt,
                sga_m4_amt,
                sga_m5_amt,
                sga_m6_amt,
                sga_m7_amt,
                sga_m8_amt,
                sga_m9_amt,
                sga_m10_amt,
                sga_m11_amt,
                sga_m12_amt,
                total_labor_m1_amt,
                total_labor_m2_amt,
                total_labor_m3_amt,
                total_labor_m4_amt,
                total_labor_m5_amt,
                total_labor_m6_amt,
                total_labor_m7_amt,
                total_labor_m8_amt,
                total_labor_m9_amt,
                total_labor_m10_amt,
                total_labor_m11_amt,
                total_labor_m12_amt
            from (
                select
                    year,
                    lv2_ccorg_cd,
                    src_type,
                    sum(margin_m1_amt)  as margin_m1_amt,
                    sum(margin_m2_amt)  as margin_m2_amt,
                    sum(margin_m3_amt)  as margin_m3_amt,
                    sum(margin_m4_amt)  as margin_m4_amt,
                    sum(margin_m5_amt)  as margin_m5_amt,
                    sum(margin_m6_amt)  as margin_m6_amt,
                    sum(margin_m7_amt)  as margin_m7_amt,
                    sum(margin_m8_amt)  as margin_m8_amt,
                    sum(margin_m9_amt)  as margin_m9_amt,
                    sum(margin_m10_amt) as margin_m10_amt,
                    sum(margin_m11_amt) as margin_m11_amt,
                    sum(margin_m12_amt) as margin_m12_amt
                    // sum(margin_m1_amt) over(partition by lv2_ccorg_cd, year, src_type)  as margin_m1_amt,
                    // sum(margin_m2_amt) over(partition by lv2_ccorg_cd, year, src_type)  as margin_m2_amt,
                    // sum(margin_m3_amt) over(partition by lv2_ccorg_cd, year, src_type)  as margin_m3_amt,
                    // sum(margin_m4_amt) over(partition by lv2_ccorg_cd, year, src_type)  as margin_m4_amt,
                    // sum(margin_m5_amt) over(partition by lv2_ccorg_cd, year, src_type)  as margin_m5_amt,
                    // sum(margin_m6_amt) over(partition by lv2_ccorg_cd, year, src_type)  as margin_m6_amt,
                    // sum(margin_m7_amt) over(partition by lv2_ccorg_cd, year, src_type)  as margin_m7_amt,
                    // sum(margin_m8_amt) over(partition by lv2_ccorg_cd, year, src_type)  as margin_m8_amt,
                    // sum(margin_m9_amt) over(partition by lv2_ccorg_cd, year, src_type)  as margin_m9_amt,
                    // sum(margin_m10_amt) over(partition by lv2_ccorg_cd, year, src_type) as margin_m10_amt,
                    // sum(margin_m11_amt) over(partition by lv2_ccorg_cd, year, src_type) as margin_m11_amt,
                    // sum(margin_m12_amt) over(partition by lv2_ccorg_cd, year, src_type) as margin_m12_amt
                from pl_wideview_view
                where
                    src_type <> 'WA'
                group by
                    year,
                    lv2_ccorg_cd,
                    src_type
            ) as pl
            inner join (
                select
                    year,
                    lv2_ccorg_cd,
                    sum(labor_m1_amt  + exp_m1_amt + iv_m1_amt)   as sga_m1_amt,
                    sum(labor_m2_amt  + exp_m2_amt + iv_m2_amt)   as sga_m2_amt,
                    sum(labor_m3_amt  + exp_m3_amt + iv_m3_amt)   as sga_m3_amt,
                    sum(labor_m4_amt  + exp_m4_amt + iv_m4_amt)   as sga_m4_amt,
                    sum(labor_m5_amt  + exp_m5_amt + iv_m5_amt)   as sga_m5_amt,
                    sum(labor_m6_amt  + exp_m6_amt + iv_m6_amt)   as sga_m6_amt,
                    sum(labor_m7_amt  + exp_m7_amt + iv_m7_amt)   as sga_m7_amt,
                    sum(labor_m8_amt  + exp_m8_amt + iv_m8_amt)   as sga_m8_amt,
                    sum(labor_m9_amt  + exp_m9_amt + iv_m9_amt)   as sga_m9_amt,
                    sum(labor_m10_amt + exp_m10_amt + iv_m10_amt) as sga_m10_amt,
                    sum(labor_m11_amt + exp_m11_amt + iv_m11_amt) as sga_m11_amt,
                    sum(labor_m12_amt + exp_m12_amt + iv_m12_amt) as sga_m12_amt
                    // sum(labor_m1_amt  + exp_m1_amt + iv_m1_amt) over(partition by lv2_ccorg_cd, year)   as sga_m1_amt,
                    // sum(labor_m2_amt  + exp_m2_amt + iv_m2_amt) over(partition by lv2_ccorg_cd, year)   as sga_m2_amt,
                    // sum(labor_m3_amt  + exp_m3_amt + iv_m3_amt) over(partition by lv2_ccorg_cd, year)   as sga_m3_amt,
                    // sum(labor_m4_amt  + exp_m4_amt + iv_m4_amt) over(partition by lv2_ccorg_cd, year)   as sga_m4_amt,
                    // sum(labor_m5_amt  + exp_m5_amt + iv_m5_amt) over(partition by lv2_ccorg_cd, year)   as sga_m5_amt,
                    // sum(labor_m6_amt  + exp_m6_amt + iv_m6_amt) over(partition by lv2_ccorg_cd, year)   as sga_m6_amt,
                    // sum(labor_m7_amt  + exp_m7_amt + iv_m7_amt) over(partition by lv2_ccorg_cd, year)   as sga_m7_amt,
                    // sum(labor_m8_amt  + exp_m8_amt + iv_m8_amt) over(partition by lv2_ccorg_cd, year)   as sga_m8_amt,
                    // sum(labor_m9_amt  + exp_m9_amt + iv_m9_amt) over(partition by lv2_ccorg_cd, year)   as sga_m9_amt,
                    // sum(labor_m10_amt + exp_m10_amt + iv_m10_amt) over(partition by lv2_ccorg_cd, year) as sga_m10_amt,
                    // sum(labor_m11_amt + exp_m11_amt + iv_m11_amt) over(partition by lv2_ccorg_cd, year) as sga_m11_amt,
                    // sum(labor_m12_amt + exp_m12_amt + iv_m12_amt) over(partition by lv2_ccorg_cd, year) as sga_m12_amt
                from sga_wideview_view
                group by
                    year,
                    lv2_ccorg_cd
            ) as sga
                on  pl.lv2_ccorg_cd = sga.lv2_ccorg_cd
                and pl.year         = sga.year
            inner join (
                select
                    year,
                    lv2_ccorg_cd,
                    sum(total_m1_amt)  as total_labor_m1_amt,
                    sum(total_m2_amt)  as total_labor_m2_amt,
                    sum(total_m3_amt)  as total_labor_m3_amt,
                    sum(total_m4_amt)  as total_labor_m4_amt,
                    sum(total_m5_amt)  as total_labor_m5_amt,
                    sum(total_m6_amt)  as total_labor_m6_amt,
                    sum(total_m7_amt)  as total_labor_m7_amt,
                    sum(total_m8_amt)  as total_labor_m8_amt,
                    sum(total_m9_amt)  as total_labor_m9_amt,
                    sum(total_m10_amt) as total_labor_m10_amt,
                    sum(total_m11_amt) as total_labor_m11_amt,
                    sum(total_m12_amt) as total_labor_m12_amt
                    // sum(total_m1_amt) over(partition by lv2_ccorg_cd, year)  as total_labor_m1_amt,
                    // sum(total_m2_amt) over(partition by lv2_ccorg_cd, year)  as total_labor_m2_amt,
                    // sum(total_m3_amt) over(partition by lv2_ccorg_cd, year)  as total_labor_m3_amt,
                    // sum(total_m4_amt) over(partition by lv2_ccorg_cd, year)  as total_labor_m4_amt,
                    // sum(total_m5_amt) over(partition by lv2_ccorg_cd, year)  as total_labor_m5_amt,
                    // sum(total_m6_amt) over(partition by lv2_ccorg_cd, year)  as total_labor_m6_amt,
                    // sum(total_m7_amt) over(partition by lv2_ccorg_cd, year)  as total_labor_m7_amt,
                    // sum(total_m8_amt) over(partition by lv2_ccorg_cd, year)  as total_labor_m8_amt,
                    // sum(total_m9_amt) over(partition by lv2_ccorg_cd, year)  as total_labor_m9_amt,
                    // sum(total_m10_amt) over(partition by lv2_ccorg_cd, year) as total_labor_m10_amt,
                    // sum(total_m11_amt) over(partition by lv2_ccorg_cd, year) as total_labor_m11_amt,
                    // sum(total_m12_amt) over(partition by lv2_ccorg_cd, year) as total_labor_m12_amt
                from rsp_org_total_labor_view
                group by
                    year,
                    lv2_ccorg_cd
            ) as labor
                on  pl.lv2_ccorg_cd = labor.lv2_ccorg_cd
                and pl.year         = labor.year
        union all
            select
                pl.year,
                pl.lv3_ccorg_cd as ccorg_cd,
                pl.src_type,
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
                sga_m1_amt,
                sga_m2_amt,
                sga_m3_amt,
                sga_m4_amt,
                sga_m5_amt,
                sga_m6_amt,
                sga_m7_amt,
                sga_m8_amt,
                sga_m9_amt,
                sga_m10_amt,
                sga_m11_amt,
                sga_m12_amt,
                total_labor_m1_amt,
                total_labor_m2_amt,
                total_labor_m3_amt,
                total_labor_m4_amt,
                total_labor_m5_amt,
                total_labor_m6_amt,
                total_labor_m7_amt,
                total_labor_m8_amt,
                total_labor_m9_amt,
                total_labor_m10_amt,
                total_labor_m11_amt,
                total_labor_m12_amt
            from (
                select
                    year,
                    lv3_ccorg_cd,
                    src_type,
                    sum(margin_m1_amt)  as margin_m1_amt,
                    sum(margin_m2_amt)  as margin_m2_amt,
                    sum(margin_m3_amt)  as margin_m3_amt,
                    sum(margin_m4_amt)  as margin_m4_amt,
                    sum(margin_m5_amt)  as margin_m5_amt,
                    sum(margin_m6_amt)  as margin_m6_amt,
                    sum(margin_m7_amt)  as margin_m7_amt,
                    sum(margin_m8_amt)  as margin_m8_amt,
                    sum(margin_m9_amt)  as margin_m9_amt,
                    sum(margin_m10_amt) as margin_m10_amt,
                    sum(margin_m11_amt) as margin_m11_amt,
                    sum(margin_m12_amt) as margin_m12_amt
                    // sum(margin_m1_amt) over(partition by lv3_ccorg_cd, year, src_type)  as margin_m1_amt,
                    // sum(margin_m2_amt) over(partition by lv3_ccorg_cd, year, src_type)  as margin_m2_amt,
                    // sum(margin_m3_amt) over(partition by lv3_ccorg_cd, year, src_type)  as margin_m3_amt,
                    // sum(margin_m4_amt) over(partition by lv3_ccorg_cd, year, src_type)  as margin_m4_amt,
                    // sum(margin_m5_amt) over(partition by lv3_ccorg_cd, year, src_type)  as margin_m5_amt,
                    // sum(margin_m6_amt) over(partition by lv3_ccorg_cd, year, src_type)  as margin_m6_amt,
                    // sum(margin_m7_amt) over(partition by lv3_ccorg_cd, year, src_type)  as margin_m7_amt,
                    // sum(margin_m8_amt) over(partition by lv3_ccorg_cd, year, src_type)  as margin_m8_amt,
                    // sum(margin_m9_amt) over(partition by lv3_ccorg_cd, year, src_type)  as margin_m9_amt,
                    // sum(margin_m10_amt) over(partition by lv3_ccorg_cd, year, src_type) as margin_m10_amt,
                    // sum(margin_m11_amt) over(partition by lv3_ccorg_cd, year, src_type) as margin_m11_amt,
                    // sum(margin_m12_amt) over(partition by lv3_ccorg_cd, year, src_type) as margin_m12_amt
                from pl_wideview_view
                where
                    src_type <> 'WA'
                group by
                    year,
                    lv3_ccorg_cd,
                    src_type
            ) as pl
            inner join (
                select
                    year,
                    lv3_ccorg_cd,
                    sum(labor_m1_amt  + exp_m1_amt + iv_m1_amt)   as sga_m1_amt,
                    sum(labor_m2_amt  + exp_m2_amt + iv_m2_amt)   as sga_m2_amt,
                    sum(labor_m3_amt  + exp_m3_amt + iv_m3_amt)   as sga_m3_amt,
                    sum(labor_m4_amt  + exp_m4_amt + iv_m4_amt)   as sga_m4_amt,
                    sum(labor_m5_amt  + exp_m5_amt + iv_m5_amt)   as sga_m5_amt,
                    sum(labor_m6_amt  + exp_m6_amt + iv_m6_amt)   as sga_m6_amt,
                    sum(labor_m7_amt  + exp_m7_amt + iv_m7_amt)   as sga_m7_amt,
                    sum(labor_m8_amt  + exp_m8_amt + iv_m8_amt)   as sga_m8_amt,
                    sum(labor_m9_amt  + exp_m9_amt + iv_m9_amt)   as sga_m9_amt,
                    sum(labor_m10_amt + exp_m10_amt + iv_m10_amt) as sga_m10_amt,
                    sum(labor_m11_amt + exp_m11_amt + iv_m11_amt) as sga_m11_amt,
                    sum(labor_m12_amt + exp_m12_amt + iv_m12_amt) as sga_m12_amt
                    // sum(labor_m1_amt  + exp_m1_amt + iv_m1_amt) over(partition by lv3_ccorg_cd, year)   as sga_m1_amt,
                    // sum(labor_m2_amt  + exp_m2_amt + iv_m2_amt) over(partition by lv3_ccorg_cd, year)   as sga_m2_amt,
                    // sum(labor_m3_amt  + exp_m3_amt + iv_m3_amt) over(partition by lv3_ccorg_cd, year)   as sga_m3_amt,
                    // sum(labor_m4_amt  + exp_m4_amt + iv_m4_amt) over(partition by lv3_ccorg_cd, year)   as sga_m4_amt,
                    // sum(labor_m5_amt  + exp_m5_amt + iv_m5_amt) over(partition by lv3_ccorg_cd, year)   as sga_m5_amt,
                    // sum(labor_m6_amt  + exp_m6_amt + iv_m6_amt) over(partition by lv3_ccorg_cd, year)   as sga_m6_amt,
                    // sum(labor_m7_amt  + exp_m7_amt + iv_m7_amt) over(partition by lv3_ccorg_cd, year)   as sga_m7_amt,
                    // sum(labor_m8_amt  + exp_m8_amt + iv_m8_amt) over(partition by lv3_ccorg_cd, year)   as sga_m8_amt,
                    // sum(labor_m9_amt  + exp_m9_amt + iv_m9_amt) over(partition by lv3_ccorg_cd, year)   as sga_m9_amt,
                    // sum(labor_m10_amt + exp_m10_amt + iv_m10_amt) over(partition by lv3_ccorg_cd, year) as sga_m10_amt,
                    // sum(labor_m11_amt + exp_m11_amt + iv_m11_amt) over(partition by lv3_ccorg_cd, year) as sga_m11_amt,
                    // sum(labor_m12_amt + exp_m12_amt + iv_m12_amt) over(partition by lv3_ccorg_cd, year) as sga_m12_amt
                from sga_wideview_view
                group by
                    year,
                    lv3_ccorg_cd
            ) as sga
                on  pl.lv3_ccorg_cd = sga.lv3_ccorg_cd
                and pl.year         = sga.year
            inner join (
                select
                    year,
                    lv3_ccorg_cd,
                    sum(total_m1_amt)  as total_labor_m1_amt,
                    sum(total_m2_amt)  as total_labor_m2_amt,
                    sum(total_m3_amt)  as total_labor_m3_amt,
                    sum(total_m4_amt)  as total_labor_m4_amt,
                    sum(total_m5_amt)  as total_labor_m5_amt,
                    sum(total_m6_amt)  as total_labor_m6_amt,
                    sum(total_m7_amt)  as total_labor_m7_amt,
                    sum(total_m8_amt)  as total_labor_m8_amt,
                    sum(total_m9_amt)  as total_labor_m9_amt,
                    sum(total_m10_amt) as total_labor_m10_amt,
                    sum(total_m11_amt) as total_labor_m11_amt,
                    sum(total_m12_amt) as total_labor_m12_amt
                    // sum(total_m1_amt) over(partition by lv3_ccorg_cd, year)  as total_labor_m1_amt,
                    // sum(total_m2_amt) over(partition by lv3_ccorg_cd, year)  as total_labor_m2_amt,
                    // sum(total_m3_amt) over(partition by lv3_ccorg_cd, year)  as total_labor_m3_amt,
                    // sum(total_m4_amt) over(partition by lv3_ccorg_cd, year)  as total_labor_m4_amt,
                    // sum(total_m5_amt) over(partition by lv3_ccorg_cd, year)  as total_labor_m5_amt,
                    // sum(total_m6_amt) over(partition by lv3_ccorg_cd, year)  as total_labor_m6_amt,
                    // sum(total_m7_amt) over(partition by lv3_ccorg_cd, year)  as total_labor_m7_amt,
                    // sum(total_m8_amt) over(partition by lv3_ccorg_cd, year)  as total_labor_m8_amt,
                    // sum(total_m9_amt) over(partition by lv3_ccorg_cd, year)  as total_labor_m9_amt,
                    // sum(total_m10_amt) over(partition by lv3_ccorg_cd, year) as total_labor_m10_amt,
                    // sum(total_m11_amt) over(partition by lv3_ccorg_cd, year) as total_labor_m11_amt,
                    // sum(total_m12_amt) over(partition by lv3_ccorg_cd, year) as total_labor_m12_amt
                from rsp_org_total_labor_view
                group by
                    year,
                    lv3_ccorg_cd
            ) as labor
                on  pl.lv3_ccorg_cd = labor.lv3_ccorg_cd
                and pl.year         = labor.year
        union all
            select
                pl.year,
                pl.div_ccorg_cd as ccorg_cd,
                pl.src_type,
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
                sga_m1_amt,
                sga_m2_amt,
                sga_m3_amt,
                sga_m4_amt,
                sga_m5_amt,
                sga_m6_amt,
                sga_m7_amt,
                sga_m8_amt,
                sga_m9_amt,
                sga_m10_amt,
                sga_m11_amt,
                sga_m12_amt,
                total_labor_m1_amt,
                total_labor_m2_amt,
                total_labor_m3_amt,
                total_labor_m4_amt,
                total_labor_m5_amt,
                total_labor_m6_amt,
                total_labor_m7_amt,
                total_labor_m8_amt,
                total_labor_m9_amt,
                total_labor_m10_amt,
                total_labor_m11_amt,
                total_labor_m12_amt
            from (
                select
                    year,
                    div_ccorg_cd,
                    src_type,
                    sum(margin_m1_amt)  as margin_m1_amt,
                    sum(margin_m2_amt)  as margin_m2_amt,
                    sum(margin_m3_amt)  as margin_m3_amt,
                    sum(margin_m4_amt)  as margin_m4_amt,
                    sum(margin_m5_amt)  as margin_m5_amt,
                    sum(margin_m6_amt)  as margin_m6_amt,
                    sum(margin_m7_amt)  as margin_m7_amt,
                    sum(margin_m8_amt)  as margin_m8_amt,
                    sum(margin_m9_amt)  as margin_m9_amt,
                    sum(margin_m10_amt) as margin_m10_amt,
                    sum(margin_m11_amt) as margin_m11_amt,
                    sum(margin_m12_amt) as margin_m12_amt
                    // sum(margin_m1_amt) over(partition by div_ccorg_cd, year, src_type)  as margin_m1_amt,
                    // sum(margin_m2_amt) over(partition by div_ccorg_cd, year, src_type)  as margin_m2_amt,
                    // sum(margin_m3_amt) over(partition by div_ccorg_cd, year, src_type)  as margin_m3_amt,
                    // sum(margin_m4_amt) over(partition by div_ccorg_cd, year, src_type)  as margin_m4_amt,
                    // sum(margin_m5_amt) over(partition by div_ccorg_cd, year, src_type)  as margin_m5_amt,
                    // sum(margin_m6_amt) over(partition by div_ccorg_cd, year, src_type)  as margin_m6_amt,
                    // sum(margin_m7_amt) over(partition by div_ccorg_cd, year, src_type)  as margin_m7_amt,
                    // sum(margin_m8_amt) over(partition by div_ccorg_cd, year, src_type)  as margin_m8_amt,
                    // sum(margin_m9_amt) over(partition by div_ccorg_cd, year, src_type)  as margin_m9_amt,
                    // sum(margin_m10_amt) over(partition by div_ccorg_cd, year, src_type) as margin_m10_amt,
                    // sum(margin_m11_amt) over(partition by div_ccorg_cd, year, src_type) as margin_m11_amt,
                    // sum(margin_m12_amt) over(partition by div_ccorg_cd, year, src_type) as margin_m12_amt
                from pl_wideview_view
                where
                    src_type <> 'WA'
                group by
                    year,
                    div_ccorg_cd,
                    src_type
            ) as pl
            inner join (
                select
                    year,
                    div_ccorg_cd,
                    sum(labor_m1_amt  + exp_m1_amt + iv_m1_amt)   as sga_m1_amt,
                    sum(labor_m2_amt  + exp_m2_amt + iv_m2_amt)   as sga_m2_amt,
                    sum(labor_m3_amt  + exp_m3_amt + iv_m3_amt)   as sga_m3_amt,
                    sum(labor_m4_amt  + exp_m4_amt + iv_m4_amt)   as sga_m4_amt,
                    sum(labor_m5_amt  + exp_m5_amt + iv_m5_amt)   as sga_m5_amt,
                    sum(labor_m6_amt  + exp_m6_amt + iv_m6_amt)   as sga_m6_amt,
                    sum(labor_m7_amt  + exp_m7_amt + iv_m7_amt)   as sga_m7_amt,
                    sum(labor_m8_amt  + exp_m8_amt + iv_m8_amt)   as sga_m8_amt,
                    sum(labor_m9_amt  + exp_m9_amt + iv_m9_amt)   as sga_m9_amt,
                    sum(labor_m10_amt + exp_m10_amt + iv_m10_amt) as sga_m10_amt,
                    sum(labor_m11_amt + exp_m11_amt + iv_m11_amt) as sga_m11_amt,
                    sum(labor_m12_amt + exp_m12_amt + iv_m12_amt) as sga_m12_amt
                    // sum(labor_m1_amt  + exp_m1_amt + iv_m1_amt) over(partition by div_ccorg_cd, year)   as sga_m1_amt,
                    // sum(labor_m2_amt  + exp_m2_amt + iv_m2_amt) over(partition by div_ccorg_cd, year)   as sga_m2_amt,
                    // sum(labor_m3_amt  + exp_m3_amt + iv_m3_amt) over(partition by div_ccorg_cd, year)   as sga_m3_amt,
                    // sum(labor_m4_amt  + exp_m4_amt + iv_m4_amt) over(partition by div_ccorg_cd, year)   as sga_m4_amt,
                    // sum(labor_m5_amt  + exp_m5_amt + iv_m5_amt) over(partition by div_ccorg_cd, year)   as sga_m5_amt,
                    // sum(labor_m6_amt  + exp_m6_amt + iv_m6_amt) over(partition by div_ccorg_cd, year)   as sga_m6_amt,
                    // sum(labor_m7_amt  + exp_m7_amt + iv_m7_amt) over(partition by div_ccorg_cd, year)   as sga_m7_amt,
                    // sum(labor_m8_amt  + exp_m8_amt + iv_m8_amt) over(partition by div_ccorg_cd, year)   as sga_m8_amt,
                    // sum(labor_m9_amt  + exp_m9_amt + iv_m9_amt) over(partition by div_ccorg_cd, year)   as sga_m9_amt,
                    // sum(labor_m10_amt + exp_m10_amt + iv_m10_amt) over(partition by div_ccorg_cd, year) as sga_m10_amt,
                    // sum(labor_m11_amt + exp_m11_amt + iv_m11_amt) over(partition by div_ccorg_cd, year) as sga_m11_amt,
                    // sum(labor_m12_amt + exp_m12_amt + iv_m12_amt) over(partition by div_ccorg_cd, year) as sga_m12_amt
                from sga_wideview_view
                group by
                    year,
                    div_ccorg_cd
            ) as sga
                on  pl.div_ccorg_cd = sga.div_ccorg_cd
                and pl.year         = sga.year
            inner join (
                select
                    year,
                    div_ccorg_cd,
                    sum(total_m1_amt)  as total_labor_m1_amt,
                    sum(total_m2_amt)  as total_labor_m2_amt,
                    sum(total_m3_amt)  as total_labor_m3_amt,
                    sum(total_m4_amt)  as total_labor_m4_amt,
                    sum(total_m5_amt)  as total_labor_m5_amt,
                    sum(total_m6_amt)  as total_labor_m6_amt,
                    sum(total_m7_amt)  as total_labor_m7_amt,
                    sum(total_m8_amt)  as total_labor_m8_amt,
                    sum(total_m9_amt)  as total_labor_m9_amt,
                    sum(total_m10_amt) as total_labor_m10_amt,
                    sum(total_m11_amt) as total_labor_m11_amt,
                    sum(total_m12_amt) as total_labor_m12_amt
                    // sum(total_m1_amt) over(partition by div_ccorg_cd, year)  as total_labor_m1_amt,
                    // sum(total_m2_amt) over(partition by div_ccorg_cd, year)  as total_labor_m2_amt,
                    // sum(total_m3_amt) over(partition by div_ccorg_cd, year)  as total_labor_m3_amt,
                    // sum(total_m4_amt) over(partition by div_ccorg_cd, year)  as total_labor_m4_amt,
                    // sum(total_m5_amt) over(partition by div_ccorg_cd, year)  as total_labor_m5_amt,
                    // sum(total_m6_amt) over(partition by div_ccorg_cd, year)  as total_labor_m6_amt,
                    // sum(total_m7_amt) over(partition by div_ccorg_cd, year)  as total_labor_m7_amt,
                    // sum(total_m8_amt) over(partition by div_ccorg_cd, year)  as total_labor_m8_amt,
                    // sum(total_m9_amt) over(partition by div_ccorg_cd, year)  as total_labor_m9_amt,
                    // sum(total_m10_amt) over(partition by div_ccorg_cd, year) as total_labor_m10_amt,
                    // sum(total_m11_amt) over(partition by div_ccorg_cd, year) as total_labor_m11_amt,
                    // sum(total_m12_amt) over(partition by div_ccorg_cd, year) as total_labor_m12_amt
                from rsp_org_total_labor_view
                group by
                    year,
                    div_ccorg_cd
            ) as labor
                on  pl.div_ccorg_cd = labor.div_ccorg_cd
                and pl.year         = labor.year
        union all
            select
                pl.year,
                pl.hdqt_ccorg_cd as ccorg_cd,
                pl.src_type,
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
                sga_m1_amt,
                sga_m2_amt,
                sga_m3_amt,
                sga_m4_amt,
                sga_m5_amt,
                sga_m6_amt,
                sga_m7_amt,
                sga_m8_amt,
                sga_m9_amt,
                sga_m10_amt,
                sga_m11_amt,
                sga_m12_amt,
                total_labor_m1_amt,
                total_labor_m2_amt,
                total_labor_m3_amt,
                total_labor_m4_amt,
                total_labor_m5_amt,
                total_labor_m6_amt,
                total_labor_m7_amt,
                total_labor_m8_amt,
                total_labor_m9_amt,
                total_labor_m10_amt,
                total_labor_m11_amt,
                total_labor_m12_amt
            from (
                select
                    year,
                    hdqt_ccorg_cd,
                    src_type,
                    sum(margin_m1_amt)  as margin_m1_amt,
                    sum(margin_m2_amt)  as margin_m2_amt,
                    sum(margin_m3_amt)  as margin_m3_amt,
                    sum(margin_m4_amt)  as margin_m4_amt,
                    sum(margin_m5_amt)  as margin_m5_amt,
                    sum(margin_m6_amt)  as margin_m6_amt,
                    sum(margin_m7_amt)  as margin_m7_amt,
                    sum(margin_m8_amt)  as margin_m8_amt,
                    sum(margin_m9_amt)  as margin_m9_amt,
                    sum(margin_m10_amt) as margin_m10_amt,
                    sum(margin_m11_amt) as margin_m11_amt,
                    sum(margin_m12_amt) as margin_m12_amt
                    // sum(margin_m1_amt) over(partition by hdqt_ccorg_cd, year, src_type)  as margin_m1_amt,
                    // sum(margin_m2_amt) over(partition by hdqt_ccorg_cd, year, src_type)  as margin_m2_amt,
                    // sum(margin_m3_amt) over(partition by hdqt_ccorg_cd, year, src_type)  as margin_m3_amt,
                    // sum(margin_m4_amt) over(partition by hdqt_ccorg_cd, year, src_type)  as margin_m4_amt,
                    // sum(margin_m5_amt) over(partition by hdqt_ccorg_cd, year, src_type)  as margin_m5_amt,
                    // sum(margin_m6_amt) over(partition by hdqt_ccorg_cd, year, src_type)  as margin_m6_amt,
                    // sum(margin_m7_amt) over(partition by hdqt_ccorg_cd, year, src_type)  as margin_m7_amt,
                    // sum(margin_m8_amt) over(partition by hdqt_ccorg_cd, year, src_type)  as margin_m8_amt,
                    // sum(margin_m9_amt) over(partition by hdqt_ccorg_cd, year, src_type)  as margin_m9_amt,
                    // sum(margin_m10_amt) over(partition by hdqt_ccorg_cd, year, src_type) as margin_m10_amt,
                    // sum(margin_m11_amt) over(partition by hdqt_ccorg_cd, year, src_type) as margin_m11_amt,
                    // sum(margin_m12_amt) over(partition by hdqt_ccorg_cd, year, src_type) as margin_m12_amt
                from pl_wideview_view
                where
                    src_type <> 'WA'
                group by
                    year,
                    hdqt_ccorg_cd,
                    src_type
            ) as pl
            inner join (
                select
                    year,
                    hdqt_ccorg_cd,
                    sum(labor_m1_amt  + exp_m1_amt + iv_m1_amt)   as sga_m1_amt,
                    sum(labor_m2_amt  + exp_m2_amt + iv_m2_amt)   as sga_m2_amt,
                    sum(labor_m3_amt  + exp_m3_amt + iv_m3_amt)   as sga_m3_amt,
                    sum(labor_m4_amt  + exp_m4_amt + iv_m4_amt)   as sga_m4_amt,
                    sum(labor_m5_amt  + exp_m5_amt + iv_m5_amt)   as sga_m5_amt,
                    sum(labor_m6_amt  + exp_m6_amt + iv_m6_amt)   as sga_m6_amt,
                    sum(labor_m7_amt  + exp_m7_amt + iv_m7_amt)   as sga_m7_amt,
                    sum(labor_m8_amt  + exp_m8_amt + iv_m8_amt)   as sga_m8_amt,
                    sum(labor_m9_amt  + exp_m9_amt + iv_m9_amt)   as sga_m9_amt,
                    sum(labor_m10_amt + exp_m10_amt + iv_m10_amt) as sga_m10_amt,
                    sum(labor_m11_amt + exp_m11_amt + iv_m11_amt) as sga_m11_amt,
                    sum(labor_m12_amt + exp_m12_amt + iv_m12_amt) as sga_m12_amt
                    // sum(labor_m1_amt  + exp_m1_amt + iv_m1_amt) over(partition by hdqt_ccorg_cd, year)   as sga_m1_amt,
                    // sum(labor_m2_amt  + exp_m2_amt + iv_m2_amt) over(partition by hdqt_ccorg_cd, year)   as sga_m2_amt,
                    // sum(labor_m3_amt  + exp_m3_amt + iv_m3_amt) over(partition by hdqt_ccorg_cd, year)   as sga_m3_amt,
                    // sum(labor_m4_amt  + exp_m4_amt + iv_m4_amt) over(partition by hdqt_ccorg_cd, year)   as sga_m4_amt,
                    // sum(labor_m5_amt  + exp_m5_amt + iv_m5_amt) over(partition by hdqt_ccorg_cd, year)   as sga_m5_amt,
                    // sum(labor_m6_amt  + exp_m6_amt + iv_m6_amt) over(partition by hdqt_ccorg_cd, year)   as sga_m6_amt,
                    // sum(labor_m7_amt  + exp_m7_amt + iv_m7_amt) over(partition by hdqt_ccorg_cd, year)   as sga_m7_amt,
                    // sum(labor_m8_amt  + exp_m8_amt + iv_m8_amt) over(partition by hdqt_ccorg_cd, year)   as sga_m8_amt,
                    // sum(labor_m9_amt  + exp_m9_amt + iv_m9_amt) over(partition by hdqt_ccorg_cd, year)   as sga_m9_amt,
                    // sum(labor_m10_amt + exp_m10_amt + iv_m10_amt) over(partition by hdqt_ccorg_cd, year) as sga_m10_amt,
                    // sum(labor_m11_amt + exp_m11_amt + iv_m11_amt) over(partition by hdqt_ccorg_cd, year) as sga_m11_amt,
                    // sum(labor_m12_amt + exp_m12_amt + iv_m12_amt) over(partition by hdqt_ccorg_cd, year) as sga_m12_amt
                from sga_wideview_view
                group by
                    year,
                    hdqt_ccorg_cd
            ) as sga
                on  pl.hdqt_ccorg_cd = sga.hdqt_ccorg_cd
                and pl.year          = sga.year
            inner join (
                select
                    year,
                    hdqt_ccorg_cd,
                    sum(total_m1_amt)  as total_labor_m1_amt,
                    sum(total_m2_amt)  as total_labor_m2_amt,
                    sum(total_m3_amt)  as total_labor_m3_amt,
                    sum(total_m4_amt)  as total_labor_m4_amt,
                    sum(total_m5_amt)  as total_labor_m5_amt,
                    sum(total_m6_amt)  as total_labor_m6_amt,
                    sum(total_m7_amt)  as total_labor_m7_amt,
                    sum(total_m8_amt)  as total_labor_m8_amt,
                    sum(total_m9_amt)  as total_labor_m9_amt,
                    sum(total_m10_amt) as total_labor_m10_amt,
                    sum(total_m11_amt) as total_labor_m11_amt,
                    sum(total_m12_amt) as total_labor_m12_amt
                    // sum(total_m1_amt) over(partition by hdqt_ccorg_cd, year)  as total_labor_m1_amt,
                    // sum(total_m2_amt) over(partition by hdqt_ccorg_cd, year)  as total_labor_m2_amt,
                    // sum(total_m3_amt) over(partition by hdqt_ccorg_cd, year)  as total_labor_m3_amt,
                    // sum(total_m4_amt) over(partition by hdqt_ccorg_cd, year)  as total_labor_m4_amt,
                    // sum(total_m5_amt) over(partition by hdqt_ccorg_cd, year)  as total_labor_m5_amt,
                    // sum(total_m6_amt) over(partition by hdqt_ccorg_cd, year)  as total_labor_m6_amt,
                    // sum(total_m7_amt) over(partition by hdqt_ccorg_cd, year)  as total_labor_m7_amt,
                    // sum(total_m8_amt) over(partition by hdqt_ccorg_cd, year)  as total_labor_m8_amt,
                    // sum(total_m9_amt) over(partition by hdqt_ccorg_cd, year)  as total_labor_m9_amt,
                    // sum(total_m10_amt) over(partition by hdqt_ccorg_cd, year) as total_labor_m10_amt,
                    // sum(total_m11_amt) over(partition by hdqt_ccorg_cd, year) as total_labor_m11_amt,
                    // sum(total_m12_amt) over(partition by hdqt_ccorg_cd, year) as total_labor_m12_amt
                from rsp_org_total_labor_view
                group by
                    year,
                    hdqt_ccorg_cd
            ) as labor
                on  pl.hdqt_ccorg_cd = labor.hdqt_ccorg_cd
                and pl.year          = labor.year
        ) {
            key year,
            key ccorg_cd,
            key src_type,
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
                sga_m1_amt,
                sga_m2_amt,
                sga_m3_amt,
                sga_m4_amt,
                sga_m5_amt,
                sga_m6_amt,
                sga_m7_amt,
                sga_m8_amt,
                sga_m9_amt,
                sga_m10_amt,
                sga_m11_amt,
                sga_m12_amt,
                total_labor_m1_amt,
                total_labor_m2_amt,
                total_labor_m3_amt,
                total_labor_m4_amt,
                total_labor_m5_amt,
                total_labor_m6_amt,
                total_labor_m7_amt,
                total_labor_m8_amt,
                total_labor_m9_amt,
                total_labor_m10_amt,
                total_labor_m11_amt,
                total_labor_m12_amt
        };
