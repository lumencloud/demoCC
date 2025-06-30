// using sga.expense as sga_expense from '../expense';
// using sga.expense_co as sga_expense_co from '../expense_co';
// using rsp.org_b_labor_view as rsp_org_b_labor_view from '../../rsp/view/org_b_labor_view';
// using common.gl_account_view as common_gl_account_view from '../../common/view/gl_account_view';
// using common.commitment_item_view as common_commitment_item_view from '../../common/view/commitment_item_view';
// using common.org_target_view as common_org_target_view from '../../common/view/org_target_view';
// using common.org_type as common_org_type from '../../common/org_type';
// using common.version as common_version from '../../common/version';

// namespace sga;

// /**
//  * SG&A 경비 데이터
//  *
//  * 세부 항목은 중계정 기준 + 할당 안될시 GL 계정 기준 (25.06.23)
//  *
//  * [ERP] SGA_EXPENSE <br>
//  * [ERP] SGA_EXPENSE_CO (900000/관리회계(위임성)) <br>
//  * [PROMIS] RSP_ORG_B_LABOR_VIEW (80003/간접비)
//  */
// view expense_view as
//         select from (
//             select
//                 expense.*,
//                 org.*
//             from (
//                 select
//                     ver,
//                     year,
//                     month,
//                     ccorg_cd,
//                     gl_account,
//                     commitment_item,
//                     description,
//                     sum(exp_m1_amt)  as exp_m1_amt    : Decimal(18, 2),
//                     sum(exp_m2_amt)  as exp_m2_amt    : Decimal(18, 2),
//                     sum(exp_m3_amt)  as exp_m3_amt    : Decimal(18, 2),
//                     sum(exp_m4_amt)  as exp_m4_amt    : Decimal(18, 2),
//                     sum(exp_m5_amt)  as exp_m5_amt    : Decimal(18, 2),
//                     sum(exp_m6_amt)  as exp_m6_amt    : Decimal(18, 2),
//                     sum(exp_m7_amt)  as exp_m7_amt    : Decimal(18, 2),
//                     sum(exp_m8_amt)  as exp_m8_amt    : Decimal(18, 2),
//                     sum(exp_m9_amt)  as exp_m9_amt    : Decimal(18, 2),
//                     sum(exp_m10_amt) as exp_m10_amt   : Decimal(18, 2),
//                     sum(exp_m11_amt) as exp_m11_amt   : Decimal(18, 2),
//                     sum(exp_m12_amt) as exp_m12_amt   : Decimal(18, 2),
//                     case
//                         when
//                             max(case
//                         when
//                             shared_exp_yn = true
//                         then
//                             1
//                         else
//                             0
//                     end)                  > 0
//                     then
//                         true
//                     else
//                         false
//                 end                  as shared_exp_yn : Boolean
// from (
//     select
//         expense.ver,
//         expense.year,
//         expense.month,
//                     case
//                         when
//                             ot.replace_ccorg_cd is not null
//                         then
//                             ot.replace_ccorg_cd
//                         else
//                             expense.ccorg_cd
//                     end as ccorg_cd    : String(10) @title: 'ERP Cost Center',
//         expense.gl_account,
//         expense.commitment_item,
//         expense.exp_m1_amt,
//         expense.exp_m2_amt,
//         expense.exp_m3_amt,
//         expense.exp_m4_amt,
//         expense.exp_m5_amt,
//         expense.exp_m6_amt,
//         expense.exp_m7_amt,
//         expense.exp_m8_amt,
//         expense.exp_m9_amt,
//         expense.exp_m10_amt,
//         expense.exp_m11_amt,
//         expense.exp_m12_amt,
//         expense.shared_exp_yn,
//                     case
//                         when
//                             expense.gl_account  =      '800003'
//                         then
//                             '간접비'
//                         when
//                             expense.gl_account  =      '900000'
//                         then
//                             '관리회계(위임성)'
//                         when
//                             commit.description  is     null
//                         then
//                             gl.name
//                         else
//                             commit.description
//                     end as description : String(40) @title: 'GL 계정이름'
//     from (
//         select
//             ver,
//             year,
//             month,
//             ccorg_cd,
//             gl_account,
//             commitment_item,
//             exp_m1_amt,
//             exp_m2_amt,
//             exp_m3_amt,
//             exp_m4_amt,
//             exp_m5_amt,
//             exp_m6_amt,
//             exp_m7_amt,
//             exp_m8_amt,
//             exp_m9_amt,
//             exp_m10_amt,
//             exp_m11_amt,
//             exp_m12_amt,
//             shared_exp_yn
//         from sga_expense
//         where
//             ver in (
//                 select ver from common_version
//                 where
//                        tag = 'C'
//                     or tag = 'Y'
//             )
//     union all
//         select
//             ver,
//             year,
//                     // case 버전이 12월 (12월 마감) 일 경우만 +1 처리 [temp]'
//                     case
//                         when
//                             substring(
//                                 ver, 5, 2
//                             )                               = '12'
//                             or (
//                                 year      = '2024'
//                                 and month = '12'
//                             )
//                         then
//                             lpad(
//                                 to_varchar(to_integer(month)+ 1), 2, '0'
//                             )
//                         else
//                             month
//                     end            as month           : String(2), // 마감월(promis) / 추정월(erp) 기준 조정
//             ccorg_cd,
//             '800003'               as gl_account      : String(10),
//             '800003'               as commitment_item : String(24),
//             -1 * indirect_cost_m1  as exp_m1_amt      : Decimal(18, 2),
//             -1 * indirect_cost_m2  as exp_m2_amt      : Decimal(18, 2),
//             -1 * indirect_cost_m3  as exp_m3_amt      : Decimal(18, 2),
//             -1 * indirect_cost_m4  as exp_m4_amt      : Decimal(18, 2),
//             -1 * indirect_cost_m5  as exp_m5_amt      : Decimal(18, 2),
//             -1 * indirect_cost_m6  as exp_m6_amt      : Decimal(18, 2),
//             -1 * indirect_cost_m7  as exp_m7_amt      : Decimal(18, 2),
//             -1 * indirect_cost_m8  as exp_m8_amt      : Decimal(18, 2),
//             -1 * indirect_cost_m9  as exp_m9_amt      : Decimal(18, 2),
//             -1 * indirect_cost_m10 as exp_m10_amt     : Decimal(18, 2),
//             -1 * indirect_cost_m11 as exp_m11_amt     : Decimal(18, 2),
//             -1 * indirect_cost_m12 as exp_m12_amt     : Decimal(18, 2),
//             false                  as shared_exp_yn   : Boolean
//         from rsp_org_b_labor_view
//     union all
//         select
//             ver,
//             year,
//             month,
//             ccorg_cd,
//             gl_account,
//             commitment_item,
//             co_m1_amt  as exp_m1_amt    : Decimal(18, 2),
//             co_m2_amt  as exp_m2_amt    : Decimal(18, 2),
//             co_m3_amt  as exp_m3_amt    : Decimal(18, 2),
//             co_m4_amt  as exp_m4_amt    : Decimal(18, 2),
//             co_m5_amt  as exp_m5_amt    : Decimal(18, 2),
//             co_m6_amt  as exp_m6_amt    : Decimal(18, 2),
//             co_m7_amt  as exp_m7_amt    : Decimal(18, 2),
//             co_m8_amt  as exp_m8_amt    : Decimal(18, 2),
//             co_m9_amt  as exp_m9_amt    : Decimal(18, 2),
//             co_m10_amt as exp_m10_amt   : Decimal(18, 2),
//             co_m11_amt as exp_m11_amt   : Decimal(18, 2),
//             co_m12_amt as exp_m12_amt   : Decimal(18, 2),
//             false      as shared_exp_yn : Boolean
//         from sga_expense_co
//         where
//                 gl_account =  '900000'
//             and ver        in (
//                 select ver from common_version
//                 where
//                        tag = 'C'
//                     or tag = 'Y'
//             )
//     ) as expense
//     left join common_commitment_item_view as commit
//         on expense.commitment_item = commit.commitment_item
//     left join common_gl_account_view as gl
//         on expense.gl_account = gl.gl_account
//     left join common_org_type as ot
//         on expense.ccorg_cd = ot.ccorg_cd
// )
// group by
//     ver,
//     year,
//     month,
//     ccorg_cd,
//     gl_account,
//     commitment_item,
//     description
// ) as expense
// left join common_org_target_view as org
//     on expense.ccorg_cd = org.org_ccorg_cd

// ) {
// key ver,
// key year,
// key month,
// key ccorg_cd,
// key gl_account,
//     commitment_item,
//     description,
//     exp_m1_amt,
//     exp_m2_amt,
//     exp_m3_amt,
//     exp_m4_amt,
//     exp_m5_amt,
//     exp_m6_amt,
//     exp_m7_amt,
//     exp_m8_amt,
//     exp_m9_amt,
//     exp_m10_amt,
//     exp_m11_amt,
//     exp_m12_amt,
//     shared_exp_yn,
//     org_ccorg_cd,
//     org_order,
//     org_parent,
//     org_name,
//     is_delivery,
//     lv1_id,
//     lv1_name,
//     lv1_ccorg_cd,
//     lv2_id,
//     lv2_name,
//     lv2_ccorg_cd,
//     lv3_id,
//     lv3_name,
//     lv3_ccorg_cd,
//     div_id,
//     div_name,
//     div_ccorg_cd,
//     hdqt_id,
//     hdqt_name,
//     hdqt_ccorg_cd,
//     team_id,
//     team_name,
//     team_ccorg_cd
// };
