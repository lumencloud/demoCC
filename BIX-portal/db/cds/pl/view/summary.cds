// using pl.wideview_view as pl_wideview_view from './wideview_view';
// using sga.wideview_view as sga_wideview_view from '../../sga/view/wideview_view';

// namespace pl;

// view summary as
//     select from (
//         select
//             pl.year,
//             pl.sale,
//             pl.margin,
//             sga.sga,
//             margin - sga    as contribution_margin,
//             sga.total_sga,
//             (
//                 margin - sga
//             )-sga.total_sga as profit
//         from (
//             select
//                 year,
//                 sum(sale_m1_amt   + sale_m2_amt + sale_m3_amt + sale_m4_amt)       as sale,
//                 sum(margin_m1_amt + margin_m2_amt + margin_m3_amt + margin_m4_amt) as margin,
//                 sum(case
//                         when year = '2024'
//                              then sale_year_amt
//                         when year = '2025'
//                              then 0
//                     end)                                                           as sale_year,
//                 sum(case
//                         when year = '2024'
//                              then margin_year_amt
//                         when year = '2025'
//                              then 0
//                     end)                                                           as margin_year
//             from pl_wideview_view
//             where
//                 src_type in (
//                     'P', 'E', 'WO'
//                 )
//             group by
//                 year
//         ) as pl
//         full outer join (
//             select
//                 year,
//                 sum(labor_m1_amt               + labor_m2_amt + labor_m3_amt + labor_m4_amt + exp_m1_amt + exp_m2_amt + exp_m3_amt + exp_m4_amt + iv_m1_amt + iv_m2_amt + iv_m3_amt + iv_m4_amt) as sga,
//                 sum(case
//                         when is_total_cc       = true
//                              then labor_m1_amt + labor_m2_amt + labor_m3_amt + labor_m4_amt + exp_m1_amt + exp_m2_amt + exp_m3_amt + exp_m4_amt + iv_m1_amt + iv_m2_amt + iv_m3_amt + iv_m4_amt
//                         else 0
//                     end)                                                                                                                                                                         as total_sga
//             from sga_wideview_view
//             group by
//                 year
//         ) as sga
//             on pl.year = sga.year
//     ) {

//     }
