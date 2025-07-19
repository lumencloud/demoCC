using sga.expense as sga_expense from '../expense';
using sga.expense_co as sga_expense_co from '../expense_co';
using sga.investment as sga_investment from '../investment';
using rsp.org_total_labor as rsp_org_total_labor from '../../rsp/org_total_labor';
using rsp.org_b_labor_view as rsp_org_b_labor_view from '../../rsp/view/org_b_labor_view';
using common.version as common_version from '../../common/version';
using common.gl_account as common_gl_account from '../../common/gl_account';
using common.commitment_item as common_commitment_item from '../../common/commitment_item';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';
using common.org_type as common_org_type from '../../common/org_type';

namespace sga;

/**
 * SG&A 항목 전체
 */
view excel_export_view as
        select from (
            select
                sga.*,
                org.*,
                case
                    when sga.gl_account    = '900000'
                         then '위임성경비'
                    when sga.gl_account    = '702202'
                         or sga.gl_account = '702201'
                         then 'IB배부금'
                    else gl.name
                end              as gl_name,
                comm.description as comm_name
            from (
                select
                    case
                        when gl_account = '900000'
                             then '위임성경비'
                        when gl_account = '702202'
                             then 'IB배부금'
                    end        as type,
                    ver,
                    seq,
                    year,
                    month,
                    ccorg_cd,
                    gl_account,
                    commitment_item,
                    co_m1_amt  as m1_amt,
                    co_m2_amt  as m2_amt,
                    co_m3_amt  as m3_amt,
                    co_m4_amt  as m4_amt,
                    co_m5_amt  as m5_amt,
                    co_m6_amt  as m6_amt,
                    co_m7_amt  as m7_amt,
                    co_m8_amt  as m8_amt,
                    co_m9_amt  as m9_amt,
                    co_m10_amt as m10_amt,
                    co_m11_amt as m11_amt,
                    co_m12_amt as m12_amt,
                    null       as asset_yn,
                    null       as shared_exp_yn
                from sga_expense_co
                where
                    ver in (
                        select ver from common_version
                        where
                               tag = 'C'
                            or tag = 'Y'
                    )
            union all
                select
                    '경비'        as type,
                    ver,
                    seq,
                    year,
                    month,
                    ccorg_cd,
                    gl_account,
                    commitment_item,
                    exp_m1_amt  as m1_amt,
                    exp_m2_amt  as m2_amt,
                    exp_m3_amt  as m3_amt,
                    exp_m4_amt  as m4_amt,
                    exp_m5_amt  as m5_amt,
                    exp_m6_amt  as m6_amt,
                    exp_m7_amt  as m7_amt,
                    exp_m8_amt  as m8_amt,
                    exp_m9_amt  as m9_amt,
                    exp_m10_amt as m10_amt,
                    exp_m11_amt as m11_amt,
                    exp_m12_amt as m12_amt,
                    null        as asset_yn,
                    shared_exp_yn
                from sga_expense
                where
                    ver in (
                        select ver from common_version
                        where
                               tag = 'C'
                            or tag = 'Y'
                    )
            union all
                select
                    '투자비'           as type,
                    ver,
                    seq,
                    year,
                    month,
                    ccorg_cd,
                    gl_account,
                    commitment_item,
                    iv_cost_m1_amt  as m1_amt,
                    iv_cost_m2_amt  as m2_amt,
                    iv_cost_m3_amt  as m3_amt,
                    iv_cost_m4_amt  as m4_amt,
                    iv_cost_m5_amt  as m5_amt,
                    iv_cost_m6_amt  as m6_amt,
                    iv_cost_m7_amt  as m7_amt,
                    iv_cost_m8_amt  as m8_amt,
                    iv_cost_m9_amt  as m9_amt,
                    iv_cost_m10_amt as m10_amt,
                    iv_cost_m11_amt as m11_amt,
                    iv_cost_m12_amt as m12_amt,
                    asset_yn,
                    null            as shared_exp_yn
                from sga_investment
                where
                    ver in (
                        select ver from common_version
                        where
                               tag = 'C'
                            or tag = 'Y'
                    )
            union all
                select
                    '총인건비'        as type,
                    ver,
                    null          as seq,
                    year,
                    month,
                    ccorg_cd,
                    null          as gl_account,
                    null          as commitment_item,
                    total_m1_amt  as m1_amt,
                    total_m2_amt  as m2_amt,
                    total_m3_amt  as m3_amt,
                    total_m4_amt  as m4_amt,
                    total_m5_amt  as m5_amt,
                    total_m6_amt  as m6_amt,
                    total_m7_amt  as m7_amt,
                    total_m8_amt  as m8_amt,
                    total_m9_amt  as m9_amt,
                    total_m10_amt as m10_amt,
                    total_m11_amt as m11_amt,
                    total_m12_amt as m12_amt,
                    null          as asset_yn,
                    null          as shared_exp_yn
                from rsp_org_total_labor
                where
                    ver in (
                        select ver from common_version
                        where
                               tag = 'C'
                            or tag = 'Y'
                    )
            union all
                select
                    '빌링인건비'      as type,
                    ver,
                    null         as seq,
                    year,
                    month,
                    ccorg_cd,
                    null         as gl_account,
                    null         as commitment_item,
                    bill_m1_amt  as m1_amt,
                    bill_m2_amt  as m2_amt,
                    bill_m3_amt  as m3_amt,
                    bill_m4_amt  as m4_amt,
                    bill_m5_amt  as m5_amt,
                    bill_m6_amt  as m6_amt,
                    bill_m7_amt  as m7_amt,
                    bill_m8_amt  as m8_amt,
                    bill_m9_amt  as m9_amt,
                    bill_m10_amt as m10_amt,
                    bill_m11_amt as m11_amt,
                    bill_m12_amt as m12_amt,
                    null         as asset_yn,
                    null         as shared_exp_yn
                from rsp_org_b_labor_view
            union all
                select
                    '간접비'             as type,
                    ver,
                    null              as seq,
                    year,
                    month,
                    ccorg_cd,
                    null              as gl_account,
                    null              as commitment_item,
                    indirect_cost_m1  as m1_amt,
                    indirect_cost_m2  as m2_amt,
                    indirect_cost_m3  as m3_amt,
                    indirect_cost_m4  as m4_amt,
                    indirect_cost_m5  as m5_amt,
                    indirect_cost_m6  as m6_amt,
                    indirect_cost_m7  as m7_amt,
                    indirect_cost_m8  as m8_amt,
                    indirect_cost_m9  as m9_amt,
                    indirect_cost_m10 as m10_amt,
                    indirect_cost_m11 as m11_amt,
                    indirect_cost_m12 as m12_amt,
                    null              as asset_yn,
                    null              as shared_exp_yn
                from rsp_org_b_labor_view
            ) as sga
            left join common_org_full_level_view as org
                on sga.ccorg_cd = org.org_ccorg_cd
            left join common_gl_account as gl
                on sga.gl_account = gl.gl_account
            left join common_commitment_item as comm
                on sga.commitment_item = comm.commitment_item
        ) {
            key type,
            key ver,
            key year,
            key month,
            key ccorg_cd,
            key gl_account,
                gl_name,
                commitment_item,
                comm_name,
                shared_exp_yn,
                asset_yn,
                is_total_cc,
                m1_amt,
                m2_amt,
                m3_amt,
                m4_amt,
                m5_amt,
                m6_amt,
                m7_amt,
                m8_amt,
                m9_amt,
                m10_amt,
                m11_amt,
                m12_amt,
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
