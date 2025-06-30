// using rsp.org_b_labor_view as rsp_org_b_labor_view from '../view/org_b_labor_view';
// using rsp.opp_labor as rsp_opp_labor from '../opp_labor';
// using rsp.org_total_labor as rsp_org_total_labor from '../org_total_labor';
// using common.org_target_view as common_org_target_view from '../../common/view/org_target_view';
// using common.version as common_version from '../../common/version';

// namespace rsp;

// view br_cost_view as
//     select from (
//         select
//             sum(total_m1_amt)   over (partition by t.year, t.month, org.lv1_ccorg_cd) as lv1_total_m1_amt,
//             sum(total_m2_amt)   over (partition by t.year, t.month, org.lv1_ccorg_cd) as lv1_total_m1_amt,
//             sum(total_m3_amt)   over (partition by t.year, t.month, org.lv1_ccorg_cd) as lv1_total_m1_amt,
//             sum(total_m4_amt)   over (partition by t.year, t.month, org.lv1_ccorg_cd) as lv1_total_m1_amt,
//             sum(total_m5_amt)   over (partition by t.year, t.month, org.lv1_ccorg_cd) as lv1_total_m1_amt,
//             sum(total_m6_amt)   over (partition by t.year, t.month, org.lv1_ccorg_cd) as lv1_total_m1_amt,
//             sum(total_m7_amt)   over (partition by t.year, t.month, org.lv1_ccorg_cd) as lv1_total_m1_amt,
//             sum(total_m8_amt)   over (partition by t.year, t.month, org.lv1_ccorg_cd) as lv1_total_m1_amt,
//             sum(total_m9_amt)   over (partition by t.year, t.month, org.lv1_ccorg_cd) as lv1_total_m1_amt,
//             sum(total_m10_amt)  over (partition by t.year, t.month, org.lv1_ccorg_cd) as lv1_total_m1_amt,
//             sum(total_m11_amt)  over (partition by t.year, t.month, org.lv1_ccorg_cd) as lv1_total_m1_amt,
//             sum(total_m12_amt)  over (partition by t.year, t.month, org.lv1_ccorg_cd) as lv1_total_m1_amt,
        
//             sum(total_m1_amt)   over (partition by t.year, t.month, org.lv2_ccorg_cd) as lv2_total_m1_amt,
//             sum(total_m2_amt)   over (partition by t.year, t.month, org.lv2_ccorg_cd) as lv2_total_m1_amt,
//             sum(total_m3_amt)   over (partition by t.year, t.month, org.lv2_ccorg_cd) as lv2_total_m1_amt,
//             sum(total_m4_amt)   over (partition by t.year, t.month, org.lv2_ccorg_cd) as lv2_total_m1_amt,
//             sum(total_m5_amt)   over (partition by t.year, t.month, org.lv2_ccorg_cd) as lv2_total_m1_amt,
//             sum(total_m6_amt)   over (partition by t.year, t.month, org.lv2_ccorg_cd) as lv2_total_m1_amt,
//             sum(total_m7_amt)   over (partition by t.year, t.month, org.lv2_ccorg_cd) as lv2_total_m1_amt,
//             sum(total_m8_amt)   over (partition by t.year, t.month, org.lv2_ccorg_cd) as lv2_total_m1_amt,
//             sum(total_m9_amt)   over (partition by t.year, t.month, org.lv2_ccorg_cd) as lv2_total_m1_amt,
//             sum(total_m10_amt)  over (partition by t.year, t.month, org.lv2_ccorg_cd) as lv2_total_m1_amt,
//             sum(total_m11_amt)  over (partition by t.year, t.month, org.lv2_ccorg_cd) as lv2_total_m1_amt,
//             sum(total_m12_amt)  over (partition by t.year, t.month, org.lv2_ccorg_cd) as lv2_total_m1_amt,
        
//             sum(total_m1_amt)   over (partition by t.year, t.month, org.lv3_ccorg_cd) as lv3_total_m1_amt,
//             sum(total_m2_amt)   over (partition by t.year, t.month, org.lv3_ccorg_cd) as lv3_total_m1_amt,
//             sum(total_m3_amt)   over (partition by t.year, t.month, org.lv3_ccorg_cd) as lv3_total_m1_amt,
//             sum(total_m4_amt)   over (partition by t.year, t.month, org.lv3_ccorg_cd) as lv3_total_m1_amt,
//             sum(total_m5_amt)   over (partition by t.year, t.month, org.lv3_ccorg_cd) as lv3_total_m1_amt,
//             sum(total_m6_amt)   over (partition by t.year, t.month, org.lv3_ccorg_cd) as lv3_total_m1_amt,
//             sum(total_m7_amt)   over (partition by t.year, t.month, org.lv3_ccorg_cd) as lv3_total_m1_amt,
//             sum(total_m8_amt)   over (partition by t.year, t.month, org.lv3_ccorg_cd) as lv3_total_m1_amt,
//             sum(total_m9_amt)   over (partition by t.year, t.month, org.lv3_ccorg_cd) as lv3_total_m1_amt,
//             sum(total_m10_amt)  over (partition by t.year, t.month, org.lv3_ccorg_cd) as lv3_total_m1_amt,
//             sum(total_m11_amt)  over (partition by t.year, t.month, org.lv3_ccorg_cd) as lv3_total_m1_amt,
//             sum(total_m12_amt)  over (partition by t.year, t.month, org.lv3_ccorg_cd) as lv3_total_m1_amt,
        
//             sum(total_m1_amt)   over (partition by t.year, t.month, org.div_ccorg_cd) as div_total_m1_amt,
//             sum(total_m2_amt)   over (partition by t.year, t.month, org.div_ccorg_cd) as div_total_m1_amt,
//             sum(total_m3_amt)   over (partition by t.year, t.month, org.div_ccorg_cd) as div_total_m1_amt,
//             sum(total_m4_amt)   over (partition by t.year, t.month, org.div_ccorg_cd) as div_total_m1_amt,
//             sum(total_m5_amt)   over (partition by t.year, t.month, org.div_ccorg_cd) as div_total_m1_amt,
//             sum(total_m6_amt)   over (partition by t.year, t.month, org.div_ccorg_cd) as div_total_m1_amt,
//             sum(total_m7_amt)   over (partition by t.year, t.month, org.div_ccorg_cd) as div_total_m1_amt,
//             sum(total_m8_amt)   over (partition by t.year, t.month, org.div_ccorg_cd) as div_total_m1_amt,
//             sum(total_m9_amt)   over (partition by t.year, t.month, org.div_ccorg_cd) as div_total_m1_amt,
//             sum(total_m10_amt)  over (partition by t.year, t.month, org.div_ccorg_cd) as div_total_m1_amt,
//             sum(total_m11_amt)  over (partition by t.year, t.month, org.div_ccorg_cd) as div_total_m1_amt,
//             sum(total_m12_amt)  over (partition by t.year, t.month, org.div_ccorg_cd) as div_total_m1_amt,

//             sum(total_m1_amt) over (partition by t.year, t.month, org.hdqt_ccorg_cd) as hdqt_total_m1_amt,
//             sum(total_m2_amt) over (partition by t.year, t.month, org.hdqt_ccorg_cd) as hdqt_total_m1_amt,
//             sum(total_m3_amt) over (partition by t.year, t.month, org.hdqt_ccorg_cd) as hdqt_total_m1_amt,
//             sum(total_m4_amt) over (partition by t.year, t.month, org.hdqt_ccorg_cd) as hdqt_total_m1_amt,
//             sum(total_m5_amt) over (partition by t.year, t.month, org.hdqt_ccorg_cd) as hdqt_total_m1_amt,
//             sum(total_m6_amt) over (partition by t.year, t.month, org.hdqt_ccorg_cd) as hdqt_total_m1_amt,
//             sum(total_m7_amt) over (partition by t.year, t.month, org.hdqt_ccorg_cd) as hdqt_total_m1_amt,
//             sum(total_m8_amt) over (partition by t.year, t.month, org.hdqt_ccorg_cd) as hdqt_total_m1_amt,
//             sum(total_m9_amt) over (partition by t.year, t.month, org.hdqt_ccorg_cd) as hdqt_total_m1_amt,
//             sum(total_m10_amt) over (partition by t.year, t.month, org.hdqt_ccorg_cd) as hdqt_total_m1_amt,
//             sum(total_m11_amt) over (partition by t.year, t.month, org.hdqt_ccorg_cd) as hdqt_total_m1_amt,
//             sum(total_m12_amt) over (partition by t.year, t.month, org.hdqt_ccorg_cd) as hdqt_total_m1_amt
//         from common_org_target_view as org
//         left outer join rsp_org_total_labor as t
//             on  org.org_ccorg_cd =  t.ccorg_cd
//             and t.ver   in (
//                 select ver from common_version
//                 where
//                     tag in (
//                         'C', 'Y'
//                     )
//             )
//         left outer join rsp_org_b_labor_view as b
//             on org.org_ccorg_cd =  b.ccorg_cd
//         left outer join rsp_opp_labor as o
//             on org.org_ccorg_cd =  o.ccorg_cd
//             and o.ver   in (
//                 select ver from common_version
//                 where
//                     tag in (
//                         'C', 'Y'
//                     )
//             )
//     ) {

//     };
