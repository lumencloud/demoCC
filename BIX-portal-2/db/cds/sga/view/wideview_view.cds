using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';
using common.org_target_view as common_org_target_view from '../../common/view/org_target_view';
using sga.investment_view as sga_investment_view from '../view/investment_view';
using sga.expense_view as sga_expense_view from '../view/expense_view';
using sga.expense_co as sga_expense_co from '../expense_co';
using rsp.org_b_labor_view as rsp_org_b_labor_view from '../../rsp/view/org_b_labor_view';
using rsp.org_total_labor_view as rsp_org_total_labor_view from '../../rsp/view/org_total_labor_view';
using common.version as common_version from '../../common/version';
using common.annual_target as common_annual_target from '../../common/target';

namespace sga;

/**
 * SG&A 장판지 데이터
 *
 * [인건비] <br>
 * = RSP_ORG_TOTAL_LABOR_VIEW[총 인건비] - RSP_ORG_B_LABOR_VIEW([빌링 인건비] - [간접비]) + SGA_EXPENSE_CO('702101')[종업원급여]
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
                    case
                        when
                            org.org_ccorg_cd is not null
                        then
                            'Y'
                        else
                            'N'
                    end                                                                                                                                                                          as org_exist      : String(1),
            org.*
        from (
            select
                    case
                        when
                            iv.ver         is not null
                        then
                            'Y'
                        else
                            'N'
                    end as iv_exist      : String(1),
                    case
                        when
                            exp.ver        is not null
                        then
                            'Y'
                        else
                            'N'
                    end as exp_exist     : String(1),
                    case
                        when
                            co.ver         is not null
                        then
                            'Y'
                        else
                            'N'
                    end as exp_co_exist  : String(1),
                    case
                        when
                            total_exist    is not null
                        then
                            'Y'
                        else
                            'N'
                    end as total_exist   : String(1),
                    case
                        when
                            billing_exist  is not null
                        then
                            'Y'
                        else
                            'N'
                    end as billing_exist : String(1),
                    case
                        when
                            iv.ver         is not null
                        then
                            iv.ver
                        when
                            exp.ver        is not null
                        then
                            exp.ver
                        when
                            labor.ver      is not null
                        then
                            labor.ver
                    end as ver           : String(20),
                    case
                        when
                            iv.year        is not null
                        then
                            iv.year
                        when
                            exp.year       is not null
                        then
                            exp.year
                        when
                            labor.year     is not null
                        then
                            labor.year
                    end as year          : String(4),
                    case
                        when
                            iv.month       is not null
                        then
                            iv.month
                        when
                            exp.month      is not null
                        then
                            exp.month
                        when
                            labor.month    is not null
                        then
                            labor.month
                    end as month         : String(2),
                    case
                        when
                            iv.ccorg_cd    is not null
                        then
                            iv.ccorg_cd
                        when
                            exp.ccorg_cd   is not null
                        then
                            exp.ccorg_cd
                        when
                            labor.ccorg_cd is not null
                        then
                            labor.ccorg_cd
                    end as ccorg_cd      : String(10),
                ifnull(
                    labor_m1_amt, 0
                ) + ifnull(
                    co_m1_amt, 0
                )       as labor_m1_amt  : Decimal(18, 2),
                ifnull(
                    labor_m2_amt, 0
                ) + ifnull(
                    co_m2_amt, 0
                )       as labor_m2_amt  : Decimal(18, 2),
                ifnull(
                    labor_m3_amt, 0
                ) + ifnull(
                    co_m3_amt, 0
                )       as labor_m3_amt  : Decimal(18, 2),
                ifnull(
                    labor_m4_amt, 0
                ) + ifnull(
                    co_m4_amt, 0
                )       as labor_m4_amt  : Decimal(18, 2),
                ifnull(
                    labor_m5_amt, 0
                ) + ifnull(
                    co_m5_amt, 0
                )       as labor_m5_amt  : Decimal(18, 2),
                ifnull(
                    labor_m6_amt, 0
                ) + ifnull(
                    co_m6_amt, 0
                )       as labor_m6_amt  : Decimal(18, 2),
                ifnull(
                    labor_m7_amt, 0
                ) + ifnull(
                    co_m7_amt, 0
                )       as labor_m7_amt  : Decimal(18, 2),
                ifnull(
                    labor_m8_amt, 0
                ) + ifnull(
                    co_m8_amt, 0
                )       as labor_m8_amt  : Decimal(18, 2),
                ifnull(
                    labor_m9_amt, 0
                ) + ifnull(
                    co_m9_amt, 0
                )       as labor_m9_amt  : Decimal(18, 2),
                ifnull(
                    labor_m10_amt, 0
                ) + ifnull(
                    co_m10_amt, 0
                )       as labor_m10_amt : Decimal(18, 2),
                ifnull(
                    labor_m11_amt, 0
                ) + ifnull(
                    co_m11_amt, 0
                )       as labor_m11_amt : Decimal(18, 2),
                ifnull(
                    labor_m12_amt, 0
                ) + ifnull(
                    co_m12_amt, 0
                )       as labor_m12_amt : Decimal(18, 2),
                ifnull(
                    iv_m1_amt, 0
                )       as iv_m1_amt     : Decimal(18, 2),
                ifnull(
                    iv_m2_amt, 0
                )       as iv_m2_amt     : Decimal(18, 2),
                ifnull(
                    iv_m3_amt, 0
                )       as iv_m3_amt     : Decimal(18, 2),
                ifnull(
                    iv_m4_amt, 0
                )       as iv_m4_amt     : Decimal(18, 2),
                ifnull(
                    iv_m5_amt, 0
                )       as iv_m5_amt     : Decimal(18, 2),
                ifnull(
                    iv_m6_amt, 0
                )       as iv_m6_amt     : Decimal(18, 2),
                ifnull(
                    iv_m7_amt, 0
                )       as iv_m7_amt     : Decimal(18, 2),
                ifnull(
                    iv_m8_amt, 0
                )       as iv_m8_amt     : Decimal(18, 2),
                ifnull(
                    iv_m9_amt, 0
                )       as iv_m9_amt     : Decimal(18, 2),
                ifnull(
                    iv_m10_amt, 0
                )       as iv_m10_amt    : Decimal(18, 2),
                ifnull(
                    iv_m11_amt, 0
                )       as iv_m11_amt    : Decimal(18, 2),
                ifnull(
                    iv_m12_amt, 0
                )       as iv_m12_amt    : Decimal(18, 2),
                ifnull(
                    exp_m1_amt, 0
                )       as exp_m1_amt    : Decimal(18, 2),
                ifnull(
                    exp_m2_amt, 0
                )       as exp_m2_amt    : Decimal(18, 2),
                ifnull(
                    exp_m3_amt, 0
                )       as exp_m3_amt    : Decimal(18, 2),
                ifnull(
                    exp_m4_amt, 0
                )       as exp_m4_amt    : Decimal(18, 2),
                ifnull(
                    exp_m5_amt, 0
                )       as exp_m5_amt    : Decimal(18, 2),
                ifnull(
                    exp_m6_amt, 0
                )       as exp_m6_amt    : Decimal(18, 2),
                ifnull(
                    exp_m7_amt, 0
                )       as exp_m7_amt    : Decimal(18, 2),
                ifnull(
                    exp_m8_amt, 0
                )       as exp_m8_amt    : Decimal(18, 2),
                ifnull(
                    exp_m9_amt, 0
                )       as exp_m9_amt    : Decimal(18, 2),
                ifnull(
                    exp_m10_amt, 0
                )       as exp_m10_amt   : Decimal(18, 2),
                ifnull(
                    exp_m11_amt, 0
                )       as exp_m11_amt   : Decimal(18, 2),
                ifnull(
                    exp_m12_amt, 0
                )       as exp_m12_amt   : Decimal(18, 2),
                shared_exp_yn
            from (
                select
                    ver,
                    year,
                    month,
                    ccorg_cd,
                    sum(ifnull(
                        iv_cost_m1_amt, 0
                    )) as iv_m1_amt  : Decimal(18, 2),
                    sum(ifnull(
                        iv_cost_m2_amt, 0
                    )) as iv_m2_amt  : Decimal(18, 2),
                    sum(ifnull(
                        iv_cost_m3_amt, 0
                    )) as iv_m3_amt  : Decimal(18, 2),
                    sum(ifnull(
                        iv_cost_m4_amt, 0
                    )) as iv_m4_amt  : Decimal(18, 2),
                    sum(ifnull(
                        iv_cost_m5_amt, 0
                    )) as iv_m5_amt  : Decimal(18, 2),
                    sum(ifnull(
                        iv_cost_m6_amt, 0
                    )) as iv_m6_amt  : Decimal(18, 2),
                    sum(ifnull(
                        iv_cost_m7_amt, 0
                    )) as iv_m7_amt  : Decimal(18, 2),
                    sum(ifnull(
                        iv_cost_m8_amt, 0
                    )) as iv_m8_amt  : Decimal(18, 2),
                    sum(ifnull(
                        iv_cost_m9_amt, 0
                    )) as iv_m9_amt  : Decimal(18, 2),
                    sum(ifnull(
                        iv_cost_m10_amt, 0
                    )) as iv_m10_amt : Decimal(18, 2),
                    sum(ifnull(
                        iv_cost_m11_amt, 0
                    )) as iv_m11_amt : Decimal(18, 2),
                    sum(ifnull(
                        iv_cost_m12_amt, 0
                    )) as iv_m12_amt : Decimal(18, 2)
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
                    sum(ifnull(
                        exp_m1_amt, 0
                    )) as exp_m1_amt  : Decimal(18, 2),
                    sum(ifnull(
                        exp_m2_amt, 0
                    )) as exp_m2_amt  : Decimal(18, 2),
                    sum(ifnull(
                        exp_m3_amt, 0
                    )) as exp_m3_amt  : Decimal(18, 2),
                    sum(ifnull(
                        exp_m4_amt, 0
                    )) as exp_m4_amt  : Decimal(18, 2),
                    sum(ifnull(
                        exp_m5_amt, 0
                    )) as exp_m5_amt  : Decimal(18, 2),
                    sum(ifnull(
                        exp_m6_amt, 0
                    )) as exp_m6_amt  : Decimal(18, 2),
                    sum(ifnull(
                        exp_m7_amt, 0
                    )) as exp_m7_amt  : Decimal(18, 2),
                    sum(ifnull(
                        exp_m8_amt, 0
                    )) as exp_m8_amt  : Decimal(18, 2),
                    sum(ifnull(
                        exp_m9_amt, 0
                    )) as exp_m9_amt  : Decimal(18, 2),
                    sum(ifnull(
                        exp_m10_amt, 0
                    )) as exp_m10_amt : Decimal(18, 2),
                    sum(ifnull(
                        exp_m11_amt, 0
                    )) as exp_m11_amt : Decimal(18, 2),
                    sum(ifnull(
                        exp_m12_amt, 0
                    )) as exp_m12_amt : Decimal(18, 2),
                    shared_exp_yn
                from sga_expense_view
                group by
                    ver,
                    year,
                    month,
                    ccorg_cd,
                    shared_exp_yn
            ) as exp
                on  iv.ver      = exp.ver
                and iv.year     = exp.year
                and iv.month    = exp.month
                and iv.ccorg_cd = exp.ccorg_cd
            full outer join (
                select
                    case
                        when
                            total.ver                           is not null
                        then
                            'Y'
                        else
                            'N'
                    end as total_exist   : String(1),
                    case
                        when
                            billing.ver                         is not null
                        then
                            'Y'
                        else
                            'N'
                    end as billing_exist : String(1),
                    case
                        when
                            total.ver                           is not null
                        then
                            total.ver
                        when
                            billing.ver                         is not null
                        then
                            billing.ver
                    end as ver,
                    case
                        when
                            total.year                          is not null
                        then
                            total.year
                        when
                            billing.year                        is not null
                        then
                            billing.year
                    end as year,
                    case
                        when
                            total.month                         is not null
                        then
                            total.month
                        when
                            billing.month                       is not null
                        then
                            to_varchar(to_integer(billing.month)+      1) //임시
                    end as month,
                    case
                        when
                            total.ccorg_cd                      is not null
                        then
                            total.ccorg_cd
                        when
                            billing.ccorg_cd                    is not null
                        then
                            billing.ccorg_cd
                    end as ccorg_cd,
                    ifnull(
                        total_m1_amt, 0
                    ) - (
                        ifnull(
                            bill_m1_amt, 0
                        )-ifnull(
                            indirect_cost_m1, 0
                        )
                    )   as labor_m1_amt  : Decimal(18, 2),
                    ifnull(
                        total_m2_amt, 0
                    ) - (
                        ifnull(
                            bill_m2_amt, 0
                        )-ifnull(
                            indirect_cost_m2, 0
                        )
                    )   as labor_m2_amt  : Decimal(18, 2),
                    ifnull(
                        total_m3_amt, 0
                    ) - (
                        ifnull(
                            bill_m3_amt, 0
                        )-ifnull(
                            indirect_cost_m3, 0
                        )
                    )   as labor_m3_amt  : Decimal(18, 2),
                    ifnull(
                        total_m4_amt, 0
                    ) - (
                        ifnull(
                            bill_m4_amt, 0
                        )-ifnull(
                            indirect_cost_m4, 0
                        )
                    )   as labor_m4_amt  : Decimal(18, 2),
                    ifnull(
                        total_m5_amt, 0
                    ) - (
                        ifnull(
                            bill_m5_amt, 0
                        )-ifnull(
                            indirect_cost_m5, 0
                        )
                    )   as labor_m5_amt  : Decimal(18, 2),
                    ifnull(
                        total_m6_amt, 0
                    ) - (
                        ifnull(
                            bill_m6_amt, 0
                        )-ifnull(
                            indirect_cost_m6, 0
                        )
                    )   as labor_m6_amt  : Decimal(18, 2),
                    ifnull(
                        total_m7_amt, 0
                    ) - (
                        ifnull(
                            bill_m7_amt, 0
                        )-ifnull(
                            indirect_cost_m7, 0
                        )
                    )   as labor_m7_amt  : Decimal(18, 2),
                    ifnull(
                        total_m8_amt, 0
                    ) - (
                        ifnull(
                            bill_m8_amt, 0
                        )-ifnull(
                            indirect_cost_m8, 0
                        )
                    )   as labor_m8_amt  : Decimal(18, 2),
                    ifnull(
                        total_m9_amt, 0
                    ) - (
                        ifnull(
                            bill_m9_amt, 0
                        )-ifnull(
                            indirect_cost_m9, 0
                        )
                    )   as labor_m9_amt  : Decimal(18, 2),
                    ifnull(
                        total_m10_amt, 0
                    ) - (
                        ifnull(
                            bill_m10_amt, 0
                        )-ifnull(
                            indirect_cost_m10, 0
                        )
                    )   as labor_m10_amt : Decimal(18, 2),
                    ifnull(
                        total_m11_amt, 0
                    ) - (
                        ifnull(
                            bill_m11_amt, 0
                        )-ifnull(
                            indirect_cost_m11, 0
                        )
                    )   as labor_m11_amt : Decimal(18, 2),
                    ifnull(
                        total_m12_amt, 0
                    ) - (
                        ifnull(
                            bill_m12_amt, 0
                        )-ifnull(
                            indirect_cost_m12, 0
                        )
                    )   as labor_m12_amt : Decimal(18, 2),
                    indirect_cost_m1,
                    indirect_cost_m2,
                    indirect_cost_m3,
                    indirect_cost_m4,
                    indirect_cost_m5,
                    indirect_cost_m6,
                    indirect_cost_m7,
                    indirect_cost_m8,
                    indirect_cost_m9,
                    indirect_cost_m10,
                    indirect_cost_m11,
                    indirect_cost_m12
                from rsp_org_total_labor_view as total
                full outer join rsp_org_b_labor_view as billing
                    on          total.year     = billing.year
                    and (
                                total.month    = billing.month
                        or (
                                total.month    = '13'
                            and billing.month  = '12' // 조건 수정 필요(인터페이스 시점이 12 월 마감 데이터 인 경우)
                        )
                    )
                    and         total.ccorg_cd = billing.ccorg_cd
                    and         total.ver      = billing.ver
            ) as labor
                on(
                        iv.ver       = labor.ver
                    and iv.year      = labor.year
                    and iv.month     = labor.month
                    and iv.ccorg_cd  = labor.ccorg_cd
                )
                or (
                        exp.ver      = labor.ver
                    and exp.year     = labor.year
                    and exp.month    = labor.month
                    and exp.ccorg_cd = labor.ccorg_cd
                )
            left join (
                select
                    ver,
                    year,
                    month,
                    ccorg_cd,
                    sum(ifnull(
                        co_m1_amt, 0
                    )) as co_m1_amt  : Decimal(18, 2),
                    sum(ifnull(
                        co_m2_amt, 0
                    )) as co_m2_amt  : Decimal(18, 2),
                    sum(ifnull(
                        co_m3_amt, 0
                    )) as co_m3_amt  : Decimal(18, 2),
                    sum(ifnull(
                        co_m4_amt, 0
                    )) as co_m4_amt  : Decimal(18, 2),
                    sum(ifnull(
                        co_m5_amt, 0
                    )) as co_m5_amt  : Decimal(18, 2),
                    sum(ifnull(
                        co_m6_amt, 0
                    )) as co_m6_amt  : Decimal(18, 2),
                    sum(ifnull(
                        co_m7_amt, 0
                    )) as co_m7_amt  : Decimal(18, 2),
                    sum(ifnull(
                        co_m8_amt, 0
                    )) as co_m8_amt  : Decimal(18, 2),
                    sum(ifnull(
                        co_m9_amt, 0
                    )) as co_m9_amt  : Decimal(18, 2),
                    sum(ifnull(
                        co_m10_amt, 0
                    )) as co_m10_amt : Decimal(18, 2),
                    sum(ifnull(
                        co_m11_amt, 0
                    )) as co_m11_amt : Decimal(18, 2),
                    sum(ifnull(
                        co_m12_amt, 0
                    )) as co_m12_amt : Decimal(18, 2)
                from sga_expense_co
                where
                        gl_account =  '702101'
                    and ver        in (
                        select ver from common_version
                        where
                               tag = 'C'
                            or tag = 'Y'
                    )
                group by
                    ver,
                    year,
                    month,
                    ccorg_cd
            ) as co
                on  labor.ver      = co.ver
                and labor.year     = co.year
                and labor.month    = co.month
                and labor.ccorg_cd = co.ccorg_cd

        ) as sga
        left join common_org_target_view as org
            on sga.ccorg_cd = org.org_ccorg_cd
        left join common_annual_target as target
            on(
                    sga.year           = target.year
                and target.target_type = 'ccorg_cd'
                and target.target_cd   = 'C01'
            )
            and (
                    org.div_ccorg_cd   = target.target_type_cd
                or  org.hdqt_ccorg_cd  = target.target_type_cd
            )
    ) {
        key ver,
        key year,
        key month,
        key ccorg_cd,
            div_sga_target_amt_is_total_calc,
            div_sga_target_amt,
            div_profit_target_amt_is_total_calc,
            div_profit_target_amt,
            div_total_profit_target_amt_is_total_calc,
            div_total_profit_target_amt,
            div_total_labor_target_amt_is_total_calc,
            div_total_labor_target_amt,
            div_labor_target_amt_is_total_calc,
            div_labor_target_amt,
            div_invest_target_amt_is_total_calc,
            div_invest_target_amt,
            div_expense_target_amt_is_total_calc,
            div_expense_target_amt,
            hdqt_sga_target_amt_is_total_calc,
            hdqt_sga_target_amt,
            hdqt_profit_target_amt_is_total_calc,
            hdqt_profit_target_amt,
            hdqt_total_profit_target_amt_is_total_calc,
            hdqt_total_profit_target_amt,
            hdqt_total_labor_target_amt_is_total_calc,
            hdqt_total_labor_target_amt,
            hdqt_labor_target_amt_is_total_calc,
            hdqt_labor_target_amt,
            hdqt_invest_target_amt_is_total_calc,
            hdqt_invest_target_amt,
            hdqt_expense_target_amt_is_total_calc,
            hdqt_expense_target_amt,
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
            team_ccorg_cd,
            iv_exist,
            exp_exist,
            exp_co_exist,
            total_exist,
            billing_exist,
            org_exist
    // remark
    };
