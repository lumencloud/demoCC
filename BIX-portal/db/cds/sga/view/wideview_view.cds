using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';
using sga.investment_view as sga_investment_view from '../view/investment_view';
using sga.expense_view as sga_expense_view from '../view/expense_view';
using sga.expense_co_view as sga_expense_co_view from '../view/expense_co_view';
using rsp.org_b_labor_view as rsp_org_b_labor_view from '../../rsp/view/org_b_labor_view';
using rsp.wideview_view as rsp_wideview_view from '../../rsp/view/wideview_view';
using rsp.org_total_labor_view as rsp_org_total_labor_view from '../../rsp/view/org_total_labor_view';
using common.version as common_version from '../../common/version';
using common.annual_target as common_annual_target from '../../common/target';

namespace sga;

/**
 * SG&A 장판지 데이터
 *
 * [인건비] <br>
 * = RSP_ORG_TOTAL_LABOR_VIEW[총 인건비] - RSP_ORG_B_LABOR_VIEW([빌링 인건비]) + SGA_EXPENSE_CO('702202')[!!가계정!! 종업원급여/IB배부금]
 *
 * [경비] <br>
 * SGA_EXPENSE_VIEW( CCORG_CD[조직별] 집계- RSP_ORG_B_LABOR_VIEW[간접비] )
 *
 * [투자비] <br>
 * SGA_INVESTMENT_VIEW - CCORG_CD[조직별] 집계
 */

view wideview_view as
    select from (
        select
            sga.*,
            labor_m1_amt + labor_m2_amt + labor_m3_amt + labor_m4_amt + labor_m5_amt + labor_m6_amt + labor_m7_amt + labor_m8_amt + labor_m9_amt + labor_m10_amt + labor_m11_amt + labor_m12_amt as labor_year_amt : Decimal(18, 2) @title: 'SG&A 연간 확정 인건비',
            iv_m1_amt + iv_m2_amt + iv_m3_amt + iv_m4_amt + iv_m5_amt + iv_m6_amt + iv_m7_amt + iv_m8_amt + iv_m9_amt + iv_m10_amt + iv_m11_amt + iv_m12_amt                                     as iv_year_amt    : Decimal(18, 2) @title: 'SG&A 연간 확정 투자비',
            exp_m1_amt + exp_m2_amt + exp_m3_amt + exp_m4_amt + exp_m5_amt + exp_m6_amt + exp_m7_amt + exp_m8_amt + exp_m9_amt + exp_m10_amt + exp_m11_amt + exp_m12_amt                         as exp_year_amt   : Decimal(18, 2) @title: 'SG&A 연간 확정 경비',
            is_delivery,
            case
                when ccorg_cd    =  '999990'
                     then true
                when is_total_cc is null
                     then false
                else is_total_cc
            end                                                                                                                                                                                  as is_total_cc    : Boolean        @title: '전사 집계여부',
            org_tp,
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
        from (
            select
                case
                    when iv.ver         is not null
                         then iv.ver
                    when exp.ver        is not null
                         then exp.ver
                    when labor.ver      is not null
                         then labor.ver
                end as ver           : String(20),
                case
                    when iv.year        is not null
                         then iv.year
                    when exp.year       is not null
                         then exp.year
                    when labor.year     is not null
                         then labor.year
                end as year          : String(4),
                case
                    when iv.month       is not null
                         then iv.month
                    when exp.month      is not null
                         then exp.month
                    when labor.month    is not null
                         then labor.month
                end as month         : String(2),
                case
                    when iv.ccorg_cd    is not null
                         then iv.ccorg_cd
                    when exp.ccorg_cd   is not null
                         then exp.ccorg_cd
                    when labor.ccorg_cd is not null
                         then labor.ccorg_cd
                end as ccorg_cd      : String(10),
                ifnull(
                    labor_m1_amt, 0
                )   as labor_m1_amt  : Decimal(18, 2),
                ifnull(
                    labor_m2_amt, 0
                )   as labor_m2_amt  : Decimal(18, 2),
                ifnull(
                    labor_m3_amt, 0
                )   as labor_m3_amt  : Decimal(18, 2),
                ifnull(
                    labor_m4_amt, 0
                )   as labor_m4_amt  : Decimal(18, 2),
                ifnull(
                    labor_m5_amt, 0
                )   as labor_m5_amt  : Decimal(18, 2),
                ifnull(
                    labor_m6_amt, 0
                )   as labor_m6_amt  : Decimal(18, 2),
                ifnull(
                    labor_m7_amt, 0
                )   as labor_m7_amt  : Decimal(18, 2),
                ifnull(
                    labor_m8_amt, 0
                )   as labor_m8_amt  : Decimal(18, 2),
                ifnull(
                    labor_m9_amt, 0
                )   as labor_m9_amt  : Decimal(18, 2),
                ifnull(
                    labor_m10_amt, 0
                )   as labor_m10_amt : Decimal(18, 2),
                ifnull(
                    labor_m11_amt, 0
                )   as labor_m11_amt : Decimal(18, 2),
                ifnull(
                    labor_m12_amt, 0
                )   as labor_m12_amt : Decimal(18, 2),
                ifnull(
                    iv_m1_amt, 0
                )   as iv_m1_amt     : Decimal(18, 2),
                ifnull(
                    iv_m2_amt, 0
                )   as iv_m2_amt     : Decimal(18, 2),
                ifnull(
                    iv_m3_amt, 0
                )   as iv_m3_amt     : Decimal(18, 2),
                ifnull(
                    iv_m4_amt, 0
                )   as iv_m4_amt     : Decimal(18, 2),
                ifnull(
                    iv_m5_amt, 0
                )   as iv_m5_amt     : Decimal(18, 2),
                ifnull(
                    iv_m6_amt, 0
                )   as iv_m6_amt     : Decimal(18, 2),
                ifnull(
                    iv_m7_amt, 0
                )   as iv_m7_amt     : Decimal(18, 2),
                ifnull(
                    iv_m8_amt, 0
                )   as iv_m8_amt     : Decimal(18, 2),
                ifnull(
                    iv_m9_amt, 0
                )   as iv_m9_amt     : Decimal(18, 2),
                ifnull(
                    iv_m10_amt, 0
                )   as iv_m10_amt    : Decimal(18, 2),
                ifnull(
                    iv_m11_amt, 0
                )   as iv_m11_amt    : Decimal(18, 2),
                ifnull(
                    iv_m12_amt, 0
                )   as iv_m12_amt    : Decimal(18, 2),
                ifnull(
                    exp_m1_amt, 0
                )   as exp_m1_amt    : Decimal(18, 2),
                ifnull(
                    exp_m2_amt, 0
                )   as exp_m2_amt    : Decimal(18, 2),
                ifnull(
                    exp_m3_amt, 0
                )   as exp_m3_amt    : Decimal(18, 2),
                ifnull(
                    exp_m4_amt, 0
                )   as exp_m4_amt    : Decimal(18, 2),
                ifnull(
                    exp_m5_amt, 0
                )   as exp_m5_amt    : Decimal(18, 2),
                ifnull(
                    exp_m6_amt, 0
                )   as exp_m6_amt    : Decimal(18, 2),
                ifnull(
                    exp_m7_amt, 0
                )   as exp_m7_amt    : Decimal(18, 2),
                ifnull(
                    exp_m8_amt, 0
                )   as exp_m8_amt    : Decimal(18, 2),
                ifnull(
                    exp_m9_amt, 0
                )   as exp_m9_amt    : Decimal(18, 2),
                ifnull(
                    exp_m10_amt, 0
                )   as exp_m10_amt   : Decimal(18, 2),
                ifnull(
                    exp_m11_amt, 0
                )   as exp_m11_amt   : Decimal(18, 2),
                ifnull(
                    exp_m12_amt, 0
                )   as exp_m12_amt   : Decimal(18, 2),
                shared_exp_yn
            from (
                select
                    ver,
                    year,
                    month,
                    ccorg_cd,
                    ifnull(
                        sum(iv_cost_m1_amt), 0
                    ) as iv_m1_amt  : Decimal(18, 2),
                    ifnull(
                        sum(iv_cost_m2_amt), 0
                    ) as iv_m2_amt  : Decimal(18, 2),
                    ifnull(
                        sum(iv_cost_m3_amt), 0
                    ) as iv_m3_amt  : Decimal(18, 2),
                    ifnull(
                        sum(iv_cost_m4_amt), 0
                    ) as iv_m4_amt  : Decimal(18, 2),
                    ifnull(
                        sum(iv_cost_m5_amt), 0
                    ) as iv_m5_amt  : Decimal(18, 2),
                    ifnull(
                        sum(iv_cost_m6_amt), 0
                    ) as iv_m6_amt  : Decimal(18, 2),
                    ifnull(
                        sum(iv_cost_m7_amt), 0
                    ) as iv_m7_amt  : Decimal(18, 2),
                    ifnull(
                        sum(iv_cost_m8_amt), 0
                    ) as iv_m8_amt  : Decimal(18, 2),
                    ifnull(
                        sum(iv_cost_m9_amt), 0
                    ) as iv_m9_amt  : Decimal(18, 2),
                    ifnull(
                        sum(iv_cost_m10_amt), 0
                    ) as iv_m10_amt : Decimal(18, 2),
                    ifnull(
                        sum(iv_cost_m11_amt), 0
                    ) as iv_m11_amt : Decimal(18, 2),
                    ifnull(
                        sum(iv_cost_m12_amt), 0
                    ) as iv_m12_amt : Decimal(18, 2)
                from sga_investment_view
                group by
                    ver,
                    year,
                    month,
                    ccorg_cd
            ) as iv
            full outer join (
                select
                    ver,
                    year,
                    month,
                    ccorg_cd,
                    ifnull(
                        sum(exp_m1_amt), 0
                    )     as exp_m1_amt    : Decimal(18, 2),
                    ifnull(
                        sum(exp_m2_amt), 0
                    )     as exp_m2_amt    : Decimal(18, 2),
                    ifnull(
                        sum(exp_m3_amt), 0
                    )     as exp_m3_amt    : Decimal(18, 2),
                    ifnull(
                        sum(exp_m4_amt), 0
                    )     as exp_m4_amt    : Decimal(18, 2),
                    ifnull(
                        sum(exp_m5_amt), 0
                    )     as exp_m5_amt    : Decimal(18, 2),
                    ifnull(
                        sum(exp_m6_amt), 0
                    )     as exp_m6_amt    : Decimal(18, 2),
                    ifnull(
                        sum(exp_m7_amt), 0
                    )     as exp_m7_amt    : Decimal(18, 2),
                    ifnull(
                        sum(exp_m8_amt), 0
                    )     as exp_m8_amt    : Decimal(18, 2),
                    ifnull(
                        sum(exp_m9_amt), 0
                    )     as exp_m9_amt    : Decimal(18, 2),
                    ifnull(
                        sum(exp_m10_amt), 0
                    )     as exp_m10_amt   : Decimal(18, 2),
                    ifnull(
                        sum(exp_m11_amt), 0
                    )     as exp_m11_amt   : Decimal(18, 2),
                    ifnull(
                        sum(exp_m12_amt), 0
                    )     as exp_m12_amt   : Decimal(18, 2),
                    false as shared_exp_yn : Boolean @title: '전사집계 여부'
                    // case
                    //     when sum(case
                    //                  when shared_exp_yn = true
                    //                       then 1
                    //                  else 0
                    //              end)                   > 0
                    //          then true
                    //     else false
                    // end as shared_exp_yn : Boolean @title: '전사집계 여부'
                from sga_expense_view
                group by
                    ver,
                    year,
                    month,
                    ccorg_cd
            ) as exp
                on  iv.ver      = exp.ver
                and iv.year     = exp.year
                and iv.month    = exp.month
                and iv.ccorg_cd = exp.ccorg_cd
            full outer join (
                select
                    ver,
                    year,
                    case
                        when month = '12'
                             then '13'
                        else month
                    end as month,
                    ccorg_cd,
                    ifnull(
                        total_m1_amt, 0
                    ) - (
                        ifnull(
                            bill_m1_amt, 0
                        )-ifnull(
                            co_m1_amt, 0
                        )
                    )   as labor_m1_amt,
                    ifnull(
                        total_m2_amt, 0
                    ) - (
                        ifnull(
                            bill_m2_amt, 0
                        )-ifnull(
                            co_m2_amt, 0
                        )
                    )   as labor_m2_amt,
                    ifnull(
                        total_m3_amt, 0
                    ) - (
                        ifnull(
                            bill_m3_amt, 0
                        )-ifnull(
                            co_m3_amt, 0
                        )
                    )   as labor_m3_amt,
                    ifnull(
                        total_m4_amt, 0
                    ) - (
                        ifnull(
                            bill_m4_amt, 0
                        )-ifnull(
                            co_m4_amt, 0
                        )
                    )   as labor_m4_amt,
                    ifnull(
                        total_m5_amt, 0
                    ) - (
                        ifnull(
                            bill_m5_amt, 0
                        )-ifnull(
                            co_m5_amt, 0
                        )
                    )   as labor_m5_amt,
                    ifnull(
                        total_m6_amt, 0
                    ) - (
                        ifnull(
                            bill_m6_amt, 0
                        )-ifnull(
                            co_m6_amt, 0
                        )
                    )   as labor_m6_amt,
                    ifnull(
                        total_m7_amt, 0
                    ) - (
                        ifnull(
                            bill_m7_amt, 0
                        )-ifnull(
                            co_m7_amt, 0
                        )
                    )   as labor_m7_amt,
                    ifnull(
                        total_m8_amt, 0
                    ) - (
                        ifnull(
                            bill_m8_amt, 0
                        )-ifnull(
                            co_m8_amt, 0
                        )
                    )   as labor_m8_amt,
                    ifnull(
                        total_m9_amt, 0
                    ) - (
                        ifnull(
                            bill_m9_amt, 0
                        )-ifnull(
                            co_m9_amt, 0
                        )
                    )   as labor_m9_amt,
                    ifnull(
                        total_m10_amt, 0
                    ) - (
                        ifnull(
                            bill_m10_amt, 0
                        )-ifnull(
                            co_m10_amt, 0
                        )
                    )   as labor_m10_amt,
                    ifnull(
                        total_m11_amt, 0
                    ) - (
                        ifnull(
                            bill_m11_amt, 0
                        )-ifnull(
                            co_m11_amt, 0
                        )
                    )   as labor_m11_amt,
                    ifnull(
                        total_m12_amt, 0
                    ) - (
                        ifnull(
                            bill_m12_amt, 0
                        )-ifnull(
                            co_m12_amt, 0
                        )
                    )   as labor_m12_amt
                from rsp_wideview_view
            ) as labor
                on(
                        iv.ver       =  labor.ver
                    and iv.year      =  labor.year
                    and iv.month     =  labor.month
                    and iv.ccorg_cd  =  labor.ccorg_cd
                    and exp.ver      is null
                )
                or (
                        exp.ver      =  labor.ver
                    and exp.year     =  labor.year
                    and exp.month    =  labor.month
                    and exp.ccorg_cd =  labor.ccorg_cd
                    and iv.ver       is null
                )
                or (
                        exp.ver      =  labor.ver
                    and exp.year     =  labor.year
                    and exp.month    =  labor.month
                    and exp.ccorg_cd =  labor.ccorg_cd
                    and iv.ver       =  labor.ver
                    and iv.year      =  labor.year
                    and iv.month     =  labor.month
                    and iv.ccorg_cd  =  labor.ccorg_cd
                )
        ) as sga
        left join common_org_full_level_view as org
            on sga.ccorg_cd = org.org_ccorg_cd
    ) {
        key ver,
        key year,
        key month,
        key ccorg_cd,
            labor_year_amt,
            iv_year_amt,
            exp_year_amt,
            labor_m1_amt,
            labor_m2_amt,
            labor_m3_amt,
            labor_m4_amt,
            labor_m5_amt,
            labor_m6_amt,
            labor_m7_amt,
            labor_m8_amt,
            labor_m9_amt,
            labor_m10_amt,
            labor_m11_amt,
            labor_m12_amt,
            iv_m1_amt,
            iv_m2_amt,
            iv_m3_amt,
            iv_m4_amt,
            iv_m5_amt,
            iv_m6_amt,
            iv_m7_amt,
            iv_m8_amt,
            iv_m9_amt,
            iv_m10_amt,
            iv_m11_amt,
            iv_m12_amt,
            exp_m1_amt,
            exp_m2_amt,
            exp_m3_amt,
            exp_m4_amt,
            exp_m5_amt,
            exp_m6_amt,
            exp_m7_amt,
            exp_m8_amt,
            exp_m9_amt,
            exp_m10_amt,
            exp_m11_amt,
            exp_m12_amt,
            shared_exp_yn,
            is_delivery,
            is_total_cc,
            org_tp,
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
    // remark
    };
