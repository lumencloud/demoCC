using common.org_full_level_view as common_org_full_level_view from './org_full_level_view';
using common.annual_target as common_annual_target from '../target';
using common.version as common_version from '../version';

namespace common;

/**
 * COMMON_ORG_FULL_LEVEL_VIEW (조직구조) + COMMON_ANNUAL_TARGET (연단위 목표 테이블 중 조직[ccorg_cd] 목표)
 *
 * [부문/본부 별]
 * 매출, 마진률, BR(MM), RoHC, Offshore, Non-MM, DT매출, SGA
 */
view org_target_view as
    select from (
        select
            org.*,
            Substring(
                ver.ver, 2, 4
            )                                      as target_year                  : String(4)      @title: '목표 년도',
            div_sale_target.is_total_calc          as div_target_sale_amt_is_total_calc,
            ifnull(
                div_sale_target.target_val, 0
            )                                      as div_target_sale_amt          : Decimal(18, 2) @title: '매출 부문 목표액',
            hdqt_sale_target.is_total_calc         as hdqt_target_sale_amt_is_total_calc,
            ifnull(
                hdqt_sale_target.target_val, 0
            )                                      as hdqt_target_sale_amt         : Decimal(18, 2) @title: '매출 본부 목표액',

            div_margin_target.is_total_calc        as div_target_margin_rate_is_total_calc,
            ifnull(
                div_margin_target.target_val, 0
            )                                      as div_target_margin_rate       : Decimal(18, 2) @title: '마진률 부문 목표액',
            hdqt_margin_target.is_total_calc       as hdqt_target_margin_rate_is_total_calc,
            ifnull(
                hdqt_margin_target.target_val, 0
            )                                      as hdqt_target_margin_rate      : Decimal(18, 2) @title: '마진률 본부 목표액',

            div_cont_margin_target.is_total_calc   as div_target_cont_margin_amt_is_total_calc,
            ifnull(
                div_cont_margin_target.target_val, 0
            )                                      as div_target_cont_margin_amt   : Decimal(18, 2) @title: '공헌이익 부문 목표액',
            hdqt_cont_margin_target.is_total_calc  as hdqt_target_cont_margin_amt_is_total_calc,
            ifnull(
                hdqt_cont_margin_target.target_val, 0
            )                                      as hdqt_target_cont_margin_amt  : Decimal(18, 2) @title: '공헌이익 본부 목표액',

            div_br_mm_target.is_total_calc         as div_target_br_mm_amt_is_total_calc,
            ifnull(
                div_br_mm_target.target_val, 0
            )                                      as div_target_br_mm_amt         : Decimal(18, 2) @title: 'BR MM 부문 목표액',
            hdqt_br_mm_target.is_total_calc        as hdqt_target_br_mm_amt_is_total_calc,
            ifnull(
                hdqt_br_mm_target.target_val, 0
            )                                      as hdqt_target_br_mm_amt        : Decimal(18, 2) @title: 'BR MM 본부 목표액',

            div_br_cost_target.is_total_calc         as div_target_br_cost_amt_is_total_calc,
            ifnull(
                div_br_cost_target.target_val, 0
            )                                      as div_target_br_cost_amt         : Decimal(18, 2) @title: 'BR COST 부문 목표액',
            hdqt_br_cost_target.is_total_calc        as hdqt_target_br_cost_amt_is_total_calc,
            ifnull(
                hdqt_br_cost_target.target_val, 0
            )                                      as hdqt_target_br_cost_amt        : Decimal(18, 2) @title: 'BR COST 본부 목표액',

            div_rohc_target.is_total_calc          as div_target_rohc_is_total_calc,
            ifnull(
                div_rohc_target.target_val, 0
            )                                      as div_target_rohc              : Decimal(18, 2) @title: 'RoHC 부문 목표',
            hdqt_rohc_target.is_total_calc         as hdqt_target_rohc_is_total_calc,
            ifnull(
                hdqt_rohc_target.target_val, 0
            )                                      as hdqt_target_rohc             : Decimal(18, 2) @title: 'RoHC 본부 목표',

            div_offshore_target.is_total_calc      as div_offshore_target_amt_is_total_calc,
            ifnull(
                div_offshore_target.target_val, 0
            )                                      as div_offshore_target_amt      : Decimal(18, 2) @title: 'Offshore 부문 목표액',
            hdqt_offshore_target.is_total_calc     as hdqt_offshore_target_amt_is_total_calc,
            ifnull(
                hdqt_offshore_target.target_val, 0
            )                                      as hdqt_offshore_target_amt     : Decimal(18, 2) @title: 'Offshore 본부 목표액',

            div_non_mm_sale_target.is_total_calc   as div_non_mm_target_sale_amt_is_total_calc,
            ifnull(
                div_non_mm_sale_target.target_val, 0
            )                                      as div_non_mm_target_sale_amt   : Decimal(18, 2) @title: 'Non-MM 매출 부문 목표액',
            hdqt_non_mm_sale_target.is_total_calc  as hdqt_non_mm_target_sale_amt_is_total_calc,
            ifnull(
                hdqt_non_mm_sale_target.target_val, 0
            )                                      as hdqt_non_mm_target_sale_amt  : Decimal(18, 2) @title: 'Non-MM 매출 본부 목표액',

            div_dt_sale_target.is_total_calc       as div_dt_target_sale_amt_is_total_calc,
            ifnull(
                div_dt_sale_target.target_val, 0
            )                                      as div_dt_target_sale_amt       : Decimal(18, 2) @title: 'DT 매출 부문 목표액',
            hdqt_dt_sale_target.is_total_calc      as hdqt_dt_target_sale_amt_is_total_calc,
            ifnull(
                hdqt_dt_sale_target.target_val, 0
            )                                      as hdqt_dt_target_sale_amt      : Decimal(18, 2) @title: 'DT 매출 본부 목표액',

            div_sga_target.is_total_calc           as div_sga_target_amt_is_total_calc,
            ifnull(
                div_sga_target.target_val, 0
            )                                      as div_sga_target_amt           : Decimal(18, 2) @title: 'SGA 부문 목표액',
            hdqt_sga_target.is_total_calc          as hdqt_sga_target_amt_is_total_calc,
            ifnull(
                hdqt_sga_target.target_val, 0
            )                                      as hdqt_sga_target_amt          : Decimal(18, 2) @title: 'SGA 본부 목표액',

            div_profit_target.is_total_calc        as div_profit_target_amt_is_total_calc,
            ifnull(
                div_profit_target.target_val, 0
            )                                      as div_profit_target_amt        : Decimal(18, 2) @title: '영업이익 부문 목표액',
            hdqt_profit_target.is_total_calc       as hdqt_profit_target_amt_is_total_calc,
            ifnull(
                hdqt_profit_target.target_val, 0
            )                                      as hdqt_profit_target_amt       : Decimal(18, 2) @title: '영업이익 본부 목표액',

            div_total_profit_target.is_total_calc  as div_total_profit_target_amt_is_total_calc,
            ifnull(
                div_total_profit_target.target_val, 0
            )                                      as div_total_profit_target_amt  : Decimal(18, 2) @title: '전사영업이익 부문 목표액',
            hdqt_total_profit_target.is_total_calc as hdqt_total_profit_target_amt_is_total_calc,
            ifnull(
                hdqt_total_profit_target.target_val, 0
            )                                      as hdqt_total_profit_target_amt : Decimal(18, 2) @title: '전사영업이익 본부 목표액',

            div_total_labor_target.is_total_calc   as div_total_labor_target_amt_is_total_calc,
            ifnull(
                div_total_labor_target.target_val, 0
            )                                      as div_total_labor_target_amt   : Decimal(18, 2) @title: '총액인건비 부문 목표액',
            hdqt_total_labor_target.is_total_calc  as hdqt_total_labor_target_amt_is_total_calc,
            ifnull(
                hdqt_total_labor_target.target_val, 0
            )                                      as hdqt_total_labor_target_amt  : Decimal(18, 2) @title: '총액인건비 본부 목표액',

            div_labor_target.is_total_calc         as div_labor_target_amt_is_total_calc,
            ifnull(
                div_labor_target.target_val, 0
            )                                      as div_labor_target_amt         : Decimal(18, 2) @title: '인건비 부문 목표액',
            hdqt_labor_target.is_total_calc        as hdqt_labor_target_amt_is_total_calc,
            ifnull(
                hdqt_labor_target.target_val, 0
            )                                      as hdqt_labor_target_amt        : Decimal(18, 2) @title: '인건비 본부 목표액',

            div_invest_target.is_total_calc        as div_invest_target_amt_is_total_calc,
            ifnull(
                div_invest_target.target_val, 0
            )                                      as div_invest_target_amt        : Decimal(18, 2) @title: '투자비 부문 목표액',
            hdqt_invest_target.is_total_calc       as hdqt_invest_target_amt_is_total_calc,
            ifnull(
                hdqt_invest_target.target_val, 0
            )                                      as hdqt_invest_target_amt       : Decimal(18, 2) @title: '투자비 본부 목표액',

            div_expense_target.is_total_calc       as div_expense_target_amt_is_total_calc,
            ifnull(
                div_expense_target.target_val, 0
            )                                      as div_expense_target_amt       : Decimal(18, 2) @title: '경비 부문 목표액',
            hdqt_expense_target.is_total_calc      as hdqt_expense_target_amt_is_total_calc,
            ifnull(
                hdqt_expense_target.target_val, 0
            )                                      as hdqt_expense_target_amt      : Decimal(18, 2) @title: '경비 본부 목표액'
        from common_org_full_level_view as org
        left join common_annual_target as div_sale_target
            on(
                    div_sale_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_sale_target.target_type = 'ccorg_cd'
                and div_sale_target.target_cd   = 'A01'
                and org.div_ccorg_cd            = div_sale_target.target_type_cd
            )
        left join common_annual_target as hdqt_sale_target
            on(
                    hdqt_sale_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_sale_target.target_type = 'ccorg_cd'
                and hdqt_sale_target.target_cd   = 'A01'
                and org.hdqt_ccorg_cd            = hdqt_sale_target.target_type_cd
            )
        left join common_annual_target as div_margin_target
            on(
                    div_margin_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_margin_target.target_type = 'ccorg_cd'
                and div_margin_target.target_cd   = 'A02'
                and org.div_ccorg_cd              = div_margin_target.target_type_cd
            )
        left join common_annual_target as hdqt_margin_target
            on(
                    hdqt_margin_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_margin_target.target_type = 'ccorg_cd'
                and hdqt_margin_target.target_cd   = 'A02'
                and org.hdqt_ccorg_cd              = hdqt_margin_target.target_type_cd
            )
        left join common_annual_target as div_cont_margin_target
            on(
                    div_cont_margin_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_cont_margin_target.target_type = 'ccorg_cd'
                and div_cont_margin_target.target_cd   = 'A04'
                and org.div_ccorg_cd                   = div_cont_margin_target.target_type_cd
            )
        left join common_annual_target as hdqt_cont_margin_target
            on(
                    hdqt_cont_margin_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_cont_margin_target.target_type = 'ccorg_cd'
                and hdqt_cont_margin_target.target_cd   = 'A04'
                and org.hdqt_ccorg_cd                   = hdqt_cont_margin_target.target_type_cd
            )
        left join common_annual_target as div_br_mm_target
            on(
                    div_br_mm_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_br_mm_target.target_type = 'ccorg_cd'
                and div_br_mm_target.target_cd   = 'A05'
                and org.div_ccorg_cd             = div_br_mm_target.target_type_cd
            )
        left join common_annual_target as hdqt_br_mm_target
            on(
                    hdqt_br_mm_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_br_mm_target.target_type = 'ccorg_cd'
                and hdqt_br_mm_target.target_cd   = 'A05'
                and org.hdqt_ccorg_cd             = hdqt_br_mm_target.target_type_cd

            )
        left join common_annual_target as div_br_cost_target
            on(
                    div_br_cost_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_br_cost_target.target_type = 'ccorg_cd'
                and div_br_cost_target.target_cd   = 'A05'
                and org.div_ccorg_cd             = div_br_cost_target.target_type_cd
            )
        left join common_annual_target as hdqt_br_cost_target
            on(
                    hdqt_br_cost_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_br_cost_target.target_type = 'ccorg_cd'
                and hdqt_br_cost_target.target_cd   = 'A05'
                and org.hdqt_ccorg_cd             = hdqt_br_cost_target.target_type_cd

            )
        left join common_annual_target as div_rohc_target
            on(
                    div_rohc_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_rohc_target.target_type = 'ccorg_cd'
                and div_rohc_target.target_cd   = 'A06'
                and org.div_ccorg_cd            = div_rohc_target.target_type_cd
            )
        left join common_annual_target as hdqt_rohc_target
            on(
                    hdqt_rohc_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_rohc_target.target_type = 'ccorg_cd'
                and hdqt_rohc_target.target_cd   = 'A06'
                and org.hdqt_ccorg_cd            = hdqt_rohc_target.target_type_cd
            )
        left join common_annual_target as div_offshore_target
            on(
                    div_offshore_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_offshore_target.target_type = 'ccorg_cd'
                and div_offshore_target.target_cd   = 'B01'
                and org.div_ccorg_cd                = div_offshore_target.target_type_cd
            )
        left join common_annual_target as hdqt_offshore_target
            on(
                    hdqt_offshore_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_offshore_target.target_type = 'ccorg_cd'
                and hdqt_offshore_target.target_cd   = 'B01'
                and org.hdqt_ccorg_cd                = hdqt_offshore_target.target_type_cd
            )
        left join common_annual_target as div_dt_sale_target
            on(
                    div_dt_sale_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_dt_sale_target.target_type = 'ccorg_cd'
                and div_dt_sale_target.target_cd   = 'B02'
                and org.div_ccorg_cd               = div_dt_sale_target.target_type_cd
            )
        left join common_annual_target as hdqt_dt_sale_target
            on(
                    hdqt_dt_sale_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_dt_sale_target.target_type = 'ccorg_cd'
                and hdqt_dt_sale_target.target_cd   = 'B02'
                and org.hdqt_ccorg_cd               = hdqt_dt_sale_target.target_type_cd
            )
        left join common_annual_target as div_non_mm_sale_target
            on(
                    div_non_mm_sale_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_non_mm_sale_target.target_type = 'ccorg_cd'
                and div_non_mm_sale_target.target_cd   = 'B04'
                and org.div_ccorg_cd                   = div_non_mm_sale_target.target_type_cd
            )
        left join common_annual_target as hdqt_non_mm_sale_target
            on(
                    hdqt_non_mm_sale_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_non_mm_sale_target.target_type = 'ccorg_cd'
                and hdqt_non_mm_sale_target.target_cd   = 'B04'
                and org.hdqt_ccorg_cd                   = hdqt_non_mm_sale_target.target_type_cd
            )
        left join common_annual_target as div_sga_target
            on(
                    div_sga_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_sga_target.target_type = 'ccorg_cd'
                and div_sga_target.target_cd   = 'C01'
                and org.div_ccorg_cd           = div_sga_target.target_type_cd

            )
        left join common_annual_target as hdqt_sga_target
            on(
                    hdqt_sga_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_sga_target.target_type = 'ccorg_cd'
                and hdqt_sga_target.target_cd   = 'C01'
                and org.hdqt_ccorg_cd           = hdqt_sga_target.target_type_cd
            )
        left join common_annual_target as div_profit_target
            on(
                    div_profit_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_profit_target.target_type = 'ccorg_cd'
                and div_profit_target.target_cd   = 'C02'
                and org.div_ccorg_cd              = div_profit_target.target_type_cd

            )
        left join common_annual_target as hdqt_profit_target
            on(
                    hdqt_profit_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_profit_target.target_type = 'ccorg_cd'
                and hdqt_profit_target.target_cd   = 'C02'
                and org.hdqt_ccorg_cd              = hdqt_profit_target.target_type_cd
            )
        left join common_annual_target as div_total_profit_target
            on(
                    div_total_profit_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_total_profit_target.target_type = 'ccorg_cd'
                and div_total_profit_target.target_cd   = 'C03'
                and org.div_ccorg_cd                    = div_total_profit_target.target_type_cd

            )
        left join common_annual_target as hdqt_total_profit_target
            on(
                    hdqt_total_profit_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_total_profit_target.target_type = 'ccorg_cd'
                and hdqt_total_profit_target.target_cd   = 'C03'
                and org.hdqt_ccorg_cd                    = hdqt_total_profit_target.target_type_cd
            )
        left join common_annual_target as div_total_labor_target
            on(
                    div_total_labor_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_total_labor_target.target_type = 'ccorg_cd'
                and div_total_labor_target.target_cd   = 'C04'
                and org.div_ccorg_cd                   = div_total_labor_target.target_type_cd

            )
        left join common_annual_target as hdqt_total_labor_target
            on(
                    hdqt_total_labor_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_total_labor_target.target_type = 'ccorg_cd'
                and hdqt_total_labor_target.target_cd   = 'C04'
                and org.hdqt_ccorg_cd                   = hdqt_total_labor_target.target_type_cd
            )
        left join common_annual_target as div_labor_target
            on(
                    div_labor_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_labor_target.target_type = 'ccorg_cd'
                and div_labor_target.target_cd   = 'C05'
                and org.div_ccorg_cd             = div_labor_target.target_type_cd

            )
        left join common_annual_target as hdqt_labor_target
            on(
                    hdqt_labor_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_labor_target.target_type = 'ccorg_cd'
                and hdqt_labor_target.target_cd   = 'C05'
                and org.hdqt_ccorg_cd             = hdqt_labor_target.target_type_cd
            )
        left join common_annual_target as div_invest_target
            on(
                    div_invest_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_invest_target.target_type = 'ccorg_cd'
                and div_invest_target.target_cd   = 'C06'
                and org.div_ccorg_cd              = div_invest_target.target_type_cd

            )
        left join common_annual_target as hdqt_invest_target
            on(
                    hdqt_invest_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_invest_target.target_type = 'ccorg_cd'
                and hdqt_invest_target.target_cd   = 'C06'
                and org.hdqt_ccorg_cd              = hdqt_invest_target.target_type_cd
            )
        left join common_annual_target as div_expense_target
            on(
                    div_expense_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and div_expense_target.target_type = 'ccorg_cd'
                and div_expense_target.target_cd   = 'C07'
                and org.div_ccorg_cd               = div_expense_target.target_type_cd

            )
        left join common_annual_target as hdqt_expense_target
            on(
                    hdqt_expense_target.year        = (
                    select substring(
                        ver, 2, 4
                    ) as year from common_version
                    where
                        tag = 'C'
                    limit 1
                )
                and hdqt_expense_target.target_type = 'ccorg_cd'
                and hdqt_expense_target.target_cd   = 'C07'
                and org.hdqt_ccorg_cd               = hdqt_expense_target.target_type_cd
            )
        left join common_version as ver
            on ver.tag = 'C'
    ) {
        key target_year,
        key org_id,
        key org_ccorg_cd,
            org_order,
            org_parent,
            org_name,
            org_type,
            is_delivery,
            is_total_cc,
            org_tp,
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
            div_target_sale_amt_is_total_calc,
            div_target_sale_amt,
            div_target_margin_rate_is_total_calc,
            div_target_margin_rate,
            div_target_cont_margin_amt_is_total_calc,
            div_target_cont_margin_amt,
            div_target_br_mm_amt_is_total_calc,
            div_target_br_mm_amt,
            div_target_br_cost_amt_is_total_calc,
            div_target_br_cost_amt,
            div_target_rohc_is_total_calc,
            div_target_rohc,
            div_offshore_target_amt_is_total_calc,
            div_offshore_target_amt,
            div_non_mm_target_sale_amt_is_total_calc,
            div_non_mm_target_sale_amt,
            div_dt_target_sale_amt_is_total_calc,
            div_dt_target_sale_amt,
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
            hdqt_target_sale_amt_is_total_calc,
            hdqt_target_sale_amt,
            hdqt_target_margin_rate_is_total_calc,
            hdqt_target_margin_rate,
            hdqt_target_cont_margin_amt_is_total_calc,
            hdqt_target_cont_margin_amt,
            hdqt_target_br_mm_amt_is_total_calc,
            hdqt_target_br_mm_amt,
            hdqt_target_br_cost_amt_is_total_calc,
            hdqt_target_br_cost_amt,
            hdqt_target_rohc_is_total_calc,
            hdqt_target_rohc,
            hdqt_offshore_target_amt_is_total_calc,
            hdqt_offshore_target_amt,
            hdqt_non_mm_target_sale_amt_is_total_calc,
            hdqt_non_mm_target_sale_amt,
            hdqt_dt_target_sale_amt_is_total_calc,
            hdqt_dt_target_sale_amt,
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
            hdqt_expense_target_amt
    }


// BR (Cost)	A07
// BR (MM)	A05
// RoHC	A06
// Offshoring	B01
// DT매출	B02
// DT마진	B03
// Non-MM	B04
// SG&A	C01
// 영업이익	C02
// 전사영업이익	C03
// 총액 인건비	C04
// 인건비	C05
// 투자비	C06
// 경비	C07

view org_target_div_view as
    select distinct
        div_target_sale_amt_is_total_calc,
        div_target_sale_amt,
        div_target_margin_rate_is_total_calc,
        div_target_margin_rate,
        div_target_br_mm_amt_is_total_calc,
        div_target_br_mm_amt,
        div_target_br_cost_amt_is_total_calc,
        div_target_br_cost_amt,
        div_target_rohc_is_total_calc,
        div_target_rohc,
        div_offshore_target_amt_is_total_calc,
        div_offshore_target_amt,
        div_non_mm_target_sale_amt_is_total_calc,
        div_non_mm_target_sale_amt,
        div_dt_target_sale_amt_is_total_calc,
        div_dt_target_sale_amt,
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
        div_target_cont_margin_amt_is_total_calc,
        div_target_cont_margin_amt,
        lv1_ccorg_cd,
        lv2_ccorg_cd,
        lv3_ccorg_cd,
        div_ccorg_cd
    from org_target_view
    where
        div_ccorg_cd is not null;

view org_target_hdqt_view as
    select distinct
        div_target_sale_amt_is_total_calc,
        hdqt_target_sale_amt_is_total_calc,
        hdqt_target_sale_amt,
        div_target_margin_rate_is_total_calc,
        hdqt_target_margin_rate_is_total_calc,
        hdqt_target_margin_rate,
        div_target_br_mm_amt_is_total_calc,
        hdqt_target_br_mm_amt_is_total_calc,
        hdqt_target_br_mm_amt,
        div_target_br_cost_amt_is_total_calc,
        hdqt_target_br_cost_amt_is_total_calc,
        hdqt_target_br_cost_amt,
        div_target_rohc_is_total_calc,
        hdqt_target_rohc_is_total_calc,
        hdqt_target_rohc,
        div_offshore_target_amt_is_total_calc,
        hdqt_offshore_target_amt_is_total_calc,
        hdqt_offshore_target_amt,
        div_non_mm_target_sale_amt_is_total_calc,
        hdqt_non_mm_target_sale_amt_is_total_calc,
        hdqt_non_mm_target_sale_amt,
        div_dt_target_sale_amt_is_total_calc,
        hdqt_dt_target_sale_amt_is_total_calc,
        hdqt_dt_target_sale_amt,
        div_sga_target_amt_is_total_calc,
        hdqt_sga_target_amt_is_total_calc,
        hdqt_sga_target_amt,
        div_profit_target_amt_is_total_calc,
        hdqt_profit_target_amt_is_total_calc,
        hdqt_profit_target_amt,
        div_total_profit_target_amt_is_total_calc,
        hdqt_total_profit_target_amt_is_total_calc,
        hdqt_total_profit_target_amt,
        div_total_labor_target_amt_is_total_calc,
        hdqt_total_labor_target_amt_is_total_calc,
        hdqt_total_labor_target_amt,
        div_labor_target_amt_is_total_calc,
        hdqt_labor_target_amt_is_total_calc,
        hdqt_labor_target_amt,
        div_invest_target_amt_is_total_calc,
        hdqt_invest_target_amt_is_total_calc,
        hdqt_invest_target_amt,
        div_expense_target_amt_is_total_calc,
        hdqt_expense_target_amt_is_total_calc,
        hdqt_expense_target_amt,
        div_target_cont_margin_amt_is_total_calc,
        hdqt_target_cont_margin_amt_is_total_calc,
        hdqt_target_cont_margin_amt,
        lv1_ccorg_cd,
        lv2_ccorg_cd,
        lv3_ccorg_cd,
        div_ccorg_cd,
        hdqt_ccorg_cd
    from org_target_view
    where
        hdqt_ccorg_cd is not null;


view org_target_sum_view as
        select from (
            select
                target.*,
                true as total
            from (
                select
                    org_target.target_year,
                    org_target.org_id,
                    org_target.org_ccorg_cd,
                    org_target.org_parent,
                    org_target.org_name,
                    org_target.org_type,
                    org_target.org_order,
                    org_target.is_delivery,
                    org_target.is_total_cc,
                    org_target.org_tp,
                    org_target.lv1_ccorg_cd,
                    org_target.lv2_ccorg_cd,
                    org_target.lv3_ccorg_cd,
                    org_target.div_ccorg_cd,
                    org_target.hdqt_ccorg_cd,
                    org_target.team_ccorg_cd,
                    ifnull(
                        (
                            select sum(case
                                           when
                                               div_target_sale_amt_is_total_calc = true
                                           then
                                               div_target_sale_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_target_sale_amt_is_total_calc,
                                    div_target_sale_amt,
                                    div_ccorg_cd
                                from org_target_view
                                where
                                        div_target_sale_amt is not null
                                    and div_target_sale_amt <>     0
                            )
                        )+(
                            select sum(case
                                           when
                                               div_target_sale_amt_is_total_calc      <> true
                                               and hdqt_target_sale_amt_is_total_calc =  true
                                           then
                                               hdqt_target_sale_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_target_sale_amt_is_total_calc,
                                    hdqt_target_sale_amt_is_total_calc,
                                    hdqt_target_sale_amt,
                                    hdqt_ccorg_cd
                                from org_target_view
                                where
                                        hdqt_target_sale_amt is not null
                                    and hdqt_target_sale_amt <>     0
                            )
                        ), 0
                    ) as target_sale_amt,

                    0 as target_margin_rate,
                    0 as target_br_mm_amt,
                    0 as target_br_cost_amt,

                    ifnull(
                        (
                            select sum(case
                                           when
                                               div_target_rohc_is_total_calc = true
                                           then
                                               div_target_rohc
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_target_rohc_is_total_calc,
                                    div_target_rohc,
                                    div_ccorg_cd
                                from org_target_view
                                where
                                        div_target_rohc is not null
                                    and div_target_rohc <>     0
                            )
                        )+(
                            select sum(case
                                           when
                                               div_target_rohc_is_total_calc      <> true
                                               and hdqt_target_rohc_is_total_calc =  true
                                           then
                                               hdqt_target_rohc
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_target_rohc_is_total_calc,
                                    hdqt_target_rohc_is_total_calc,
                                    hdqt_target_rohc,
                                    hdqt_ccorg_cd
                                from org_target_view
                                where
                                        hdqt_target_rohc is not null
                                    and hdqt_target_rohc <>     0
                            )
                        ), 0
                    ) as target_rohc,

                    ifnull(
                        (
                            select sum(case
                                           when
                                               div_offshore_target_amt_is_total_calc = true
                                           then
                                               div_offshore_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_offshore_target_amt_is_total_calc,
                                    div_offshore_target_amt,
                                    div_ccorg_cd
                                from org_target_view
                                where
                                        div_offshore_target_amt is not null
                                    and div_offshore_target_amt <>     0
                            )
                        )+(
                            select sum(case
                                           when
                                               div_offshore_target_amt_is_total_calc      <> true
                                               and hdqt_offshore_target_amt_is_total_calc =  true
                                           then
                                               hdqt_offshore_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_offshore_target_amt_is_total_calc,
                                    hdqt_offshore_target_amt_is_total_calc,
                                    hdqt_offshore_target_amt,
                                    hdqt_ccorg_cd
                                from org_target_view
                                where
                                        hdqt_offshore_target_amt is not null
                                    and hdqt_offshore_target_amt <>     0
                            )
                        ), 0
                    ) as offshore_target_amt,

                    ifnull(
                        (
                            select sum(case
                                           when
                                               div_non_mm_target_sale_amt_is_total_calc = true
                                           then
                                               div_non_mm_target_sale_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_non_mm_target_sale_amt_is_total_calc,
                                    div_non_mm_target_sale_amt,
                                    div_ccorg_cd
                                from org_target_view
                                where
                                        div_non_mm_target_sale_amt is not null
                                    and div_non_mm_target_sale_amt <>     0
                            )
                        )+(
                            select sum(case
                                           when
                                               div_non_mm_target_sale_amt_is_total_calc      <> true
                                               and hdqt_non_mm_target_sale_amt_is_total_calc =  true
                                           then
                                               hdqt_non_mm_target_sale_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_non_mm_target_sale_amt_is_total_calc,
                                    hdqt_non_mm_target_sale_amt_is_total_calc,
                                    hdqt_non_mm_target_sale_amt,
                                    hdqt_ccorg_cd
                                from org_target_view
                                where
                                        hdqt_non_mm_target_sale_amt is not null
                                    and hdqt_non_mm_target_sale_amt <>     0
                            )
                        ), 0
                    ) as non_mm_target_sale_amt,

                    ifnull(
                        (
                            select sum(case
                                           when
                                               div_dt_target_sale_amt_is_total_calc = true
                                           then
                                               div_dt_target_sale_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_dt_target_sale_amt_is_total_calc,
                                    div_dt_target_sale_amt,
                                    div_ccorg_cd
                                from org_target_view
                                where
                                        div_dt_target_sale_amt is not null
                                    and div_dt_target_sale_amt <>     0
                            )
                        )+(
                            select sum(case
                                           when
                                               div_dt_target_sale_amt_is_total_calc      <> true
                                               and hdqt_dt_target_sale_amt_is_total_calc =  true
                                           then
                                               hdqt_dt_target_sale_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_dt_target_sale_amt_is_total_calc,
                                    hdqt_dt_target_sale_amt_is_total_calc,
                                    hdqt_dt_target_sale_amt,
                                    hdqt_ccorg_cd
                                from org_target_view
                                where
                                        hdqt_dt_target_sale_amt is not null
                                    and hdqt_dt_target_sale_amt <>     0
                            )
                        ), 0
                    ) as dt_target_sale_amt,

                    ifnull(
                        (
                            select sum(case
                                           when
                                               div_sga_target_amt_is_total_calc = true
                                           then
                                               div_sga_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_sga_target_amt_is_total_calc,
                                    div_sga_target_amt,
                                    div_ccorg_cd
                                from org_target_view
                                where
                                        div_sga_target_amt is not null
                                    and div_sga_target_amt <>     0
                            )
                        )+(
                            select sum(case
                                           when
                                               div_sga_target_amt_is_total_calc      <> true
                                               and hdqt_sga_target_amt_is_total_calc =  true
                                           then
                                               hdqt_sga_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_sga_target_amt_is_total_calc,
                                    hdqt_sga_target_amt_is_total_calc,
                                    hdqt_sga_target_amt,
                                    hdqt_ccorg_cd
                                from org_target_view
                                where
                                        hdqt_sga_target_amt is not null
                                    and hdqt_sga_target_amt <>     0
                            )
                        ), 0
                    ) as sga_target_amt,

                    ifnull(
                        (
                            select sum(case
                                           when
                                               div_profit_target_amt_is_total_calc = true
                                           then
                                               div_profit_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_profit_target_amt_is_total_calc,
                                    div_profit_target_amt,
                                    div_ccorg_cd
                                from org_target_view
                                where
                                        div_profit_target_amt is not null
                                    and div_profit_target_amt <>     0
                            )
                        )+(
                            select sum(case
                                           when
                                               div_profit_target_amt_is_total_calc      <> true
                                               and hdqt_profit_target_amt_is_total_calc =  true
                                           then
                                               hdqt_profit_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_profit_target_amt_is_total_calc,
                                    hdqt_profit_target_amt_is_total_calc,
                                    hdqt_profit_target_amt,
                                    hdqt_ccorg_cd
                                from org_target_view
                                where
                                        hdqt_profit_target_amt is not null
                                    and hdqt_profit_target_amt <>     0
                            )
                        ), 0
                    ) as profit_target_amt,

                    ifnull(
                        (
                            select sum(case
                                           when
                                               div_total_profit_target_amt_is_total_calc = true
                                           then
                                               div_total_profit_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_total_profit_target_amt_is_total_calc,
                                    div_total_profit_target_amt,
                                    div_ccorg_cd
                                from org_target_view
                                where
                                        div_total_profit_target_amt is not null
                                    and div_total_profit_target_amt <>     0
                            )
                        )+(
                            select sum(case
                                           when
                                               div_total_profit_target_amt_is_total_calc      <> true
                                               and hdqt_total_profit_target_amt_is_total_calc =  true
                                           then
                                               hdqt_total_profit_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_total_profit_target_amt_is_total_calc,
                                    hdqt_total_profit_target_amt_is_total_calc,
                                    hdqt_total_profit_target_amt,
                                    hdqt_ccorg_cd
                                from org_target_view
                                where
                                        hdqt_total_profit_target_amt is not null
                                    and hdqt_total_profit_target_amt <>     0
                            )
                        ), 0
                    ) as total_profit_target_amt,

                    ifnull(
                        (
                            select sum(case
                                           when
                                               div_total_labor_target_amt_is_total_calc = true
                                           then
                                               div_total_labor_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_total_labor_target_amt_is_total_calc,
                                    div_total_labor_target_amt,
                                    div_ccorg_cd
                                from org_target_view
                                where
                                        div_total_labor_target_amt is not null
                                    and div_total_labor_target_amt <>     0
                            )
                        )+(
                            select sum(case
                                           when
                                               div_total_labor_target_amt_is_total_calc      <> true
                                               and hdqt_total_labor_target_amt_is_total_calc =  true
                                           then
                                               hdqt_total_labor_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_total_labor_target_amt_is_total_calc,
                                    hdqt_total_labor_target_amt_is_total_calc,
                                    hdqt_total_labor_target_amt,
                                    hdqt_ccorg_cd
                                from org_target_view
                                where
                                        hdqt_total_labor_target_amt is not null
                                    and hdqt_total_labor_target_amt <>     0
                            )
                        ), 0
                    ) as total_labor_target_amt,

                    ifnull(
                        (
                            select sum(case
                                           when
                                               div_labor_target_amt_is_total_calc = true
                                           then
                                               div_labor_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_labor_target_amt_is_total_calc,
                                    div_labor_target_amt,
                                    div_ccorg_cd
                                from org_target_view
                                where
                                        div_labor_target_amt is not null
                                    and div_labor_target_amt <>     0
                            )
                        )+(
                            select sum(case
                                           when
                                               div_labor_target_amt_is_total_calc      <> true
                                               and hdqt_labor_target_amt_is_total_calc =  true
                                           then
                                               hdqt_labor_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_labor_target_amt_is_total_calc,
                                    hdqt_labor_target_amt_is_total_calc,
                                    hdqt_labor_target_amt,
                                    hdqt_ccorg_cd
                                from org_target_view
                                where
                                        hdqt_labor_target_amt is not null
                                    and hdqt_labor_target_amt <>     0
                            )
                        ), 0
                    ) as labor_target_amt,

                    ifnull(
                        (
                            select sum(case
                                           when
                                               div_invest_target_amt_is_total_calc = true
                                           then
                                               div_invest_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_invest_target_amt_is_total_calc,
                                    div_invest_target_amt,
                                    div_ccorg_cd
                                from org_target_view
                                where
                                        div_invest_target_amt is not null
                                    and div_invest_target_amt <>     0
                            )
                        )+(
                            select sum(case
                                           when
                                               div_invest_target_amt_is_total_calc      <> true
                                               and hdqt_invest_target_amt_is_total_calc =  true
                                           then
                                               hdqt_invest_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_invest_target_amt_is_total_calc,
                                    hdqt_invest_target_amt_is_total_calc,
                                    hdqt_invest_target_amt,
                                    hdqt_ccorg_cd
                                from org_target_view
                                where
                                        hdqt_invest_target_amt is not null
                                    and hdqt_invest_target_amt <>     0
                            )
                        ), 0
                    ) as invest_target_amt,

                    ifnull(
                        (
                            select sum(case
                                           when
                                               div_expense_target_amt_is_total_calc = true
                                           then
                                               div_expense_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_expense_target_amt_is_total_calc,
                                    div_expense_target_amt,
                                    div_ccorg_cd
                                from org_target_view
                                where
                                        div_expense_target_amt is not null
                                    and div_expense_target_amt <>     0
                            )
                        )+(
                            select sum(case
                                           when
                                               div_expense_target_amt_is_total_calc      <> true
                                               and hdqt_expense_target_amt_is_total_calc =  true
                                           then
                                               hdqt_expense_target_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_expense_target_amt_is_total_calc,
                                    hdqt_expense_target_amt_is_total_calc,
                                    hdqt_expense_target_amt,
                                    hdqt_ccorg_cd
                                from org_target_view
                                where
                                        hdqt_expense_target_amt is not null
                                    and hdqt_expense_target_amt <>     0
                            )
                        ), 0
                    ) as expense_target_amt,

                    ifnull(
                        (
                            select sum(case
                                           when
                                               div_target_cont_margin_amt_is_total_calc = true
                                           then
                                               div_target_cont_margin_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_target_cont_margin_amt_is_total_calc,
                                    div_target_cont_margin_amt,
                                    div_ccorg_cd
                                from org_target_view
                                where
                                        div_target_cont_margin_amt is not null
                                    and div_target_cont_margin_amt <>     0
                            )
                        )+(
                            select sum(case
                                           when
                                               div_target_cont_margin_amt_is_total_calc      <> true
                                               and hdqt_target_cont_margin_amt_is_total_calc =  true
                                           then
                                               hdqt_target_cont_margin_amt
                                           else
                                               0
                                       end) from (
                                select distinct
                                    div_target_cont_margin_amt_is_total_calc,
                                    hdqt_target_cont_margin_amt_is_total_calc,
                                    hdqt_target_cont_margin_amt,
                                    hdqt_ccorg_cd
                                from org_target_view
                                where
                                        hdqt_target_cont_margin_amt is not null
                                    and hdqt_target_cont_margin_amt <>     0
                            )
                        ), 0
                    ) as target_cont_margin_amt

                from org_target_view as org_target
                left join org_target_div_view as div_target
                    on  org_target.div_ccorg_cd  =  div_target.div_ccorg_cd
                    and org_target.hdqt_ccorg_cd is null
                    and org_target.team_ccorg_cd is null
                left join org_target_hdqt_view as hdqt_target
                    on  org_target.hdqt_ccorg_cd =  hdqt_target.hdqt_ccorg_cd
                    and org_target.team_ccorg_cd is null
                where
                        org_parent is     null
                    and org_id     is not null

                group by
                    org_target.target_year,
                    org_target.org_id,
                    org_target.org_ccorg_cd,
                    org_target.org_parent,
                    org_target.org_name,
                    org_target.org_type,
                    org_target.org_order,
                    org_target.is_delivery,
                    org_target.is_total_cc,
                    org_target.org_tp,
                    org_target.lv1_ccorg_cd,
                    org_target.lv2_ccorg_cd,
                    org_target.lv3_ccorg_cd,
                    org_target.div_ccorg_cd,
                    org_target.hdqt_ccorg_cd,
                    org_target.team_ccorg_cd
            ) as target

        union all

            select
                target.*,
                false as total
            from (
                select
                    org_target.target_year,
                    org_target.org_id,
                    org_target.org_ccorg_cd,
                    org_target.org_parent,
                    org_target.org_name,
                    org_target.org_type,
                    org_target.org_order,
                    org_target.is_delivery,
                    org_target.is_total_cc,
                    org_target.org_tp,
                    org_target.lv1_ccorg_cd,
                    org_target.lv2_ccorg_cd,
                    org_target.lv3_ccorg_cd,
                    org_target.div_ccorg_cd,
                    org_target.hdqt_ccorg_cd,
                    org_target.team_ccorg_cd,
                                       case
                                           when
                                               ifnull(
                                                   sum(div_target.div_target_sale_amt), 0
                                               )                        =      0
                                           then
                                               ifnull(
                                                   sum(case
                                           when
                                               org_target.hdqt_ccorg_cd is not null
                                           then
                                               hdqt_target.hdqt_target_sale_amt
                                           else
                                               0
                                       end), 0
                    )
                else
                    ifnull(
                        sum(div_target.div_target_sale_amt), 0
                    )
            end as target_sale_amt,

case when
    ifnull(div_target.div_target_margin_rate, 0) = 0 
then ifnull(hdqt_target.hdqt_target_margin_rate, 0)
else ifnull(div_target.div_target_margin_rate, 0)
end as target_margin_rate,

case when
    ifnull(div_target.div_target_br_mm_amt, 0) = 0 
then ifnull(hdqt_target.hdqt_target_br_mm_amt, 0)
else ifnull(div_target.div_target_br_mm_amt, 0)
end as target_br_mm_amt,
case when
    ifnull(div_target.div_target_br_cost_amt, 0) = 0 
then ifnull(hdqt_target.hdqt_target_br_cost_amt, 0)
else ifnull(div_target.div_target_br_cost_amt, 0)
end as target_br_cost_amt,

                                       case
                                           when
                                               ifnull(
                                                   sum(div_target.div_target_rohc), 0
                                               )                        =      0
                                           then
                                               ifnull(
                                                   sum(case
                                           when
                                               org_target.hdqt_ccorg_cd is not null
                                           then
                                               hdqt_target.hdqt_target_rohc
                                           else
                                               0
                                       end), 0
)
else
    ifnull(
        sum(div_target.div_target_rohc), 0
    )
end             as target_rohc,

                                       case
                                           when
                                               ifnull(
                                                   sum(div_target.div_offshore_target_amt), 0
                                               )                        =      0
                                           then
                                               ifnull(
                                                   sum(case
                                           when
                                               org_target.hdqt_ccorg_cd is not null
                                           then
                                               hdqt_target.hdqt_offshore_target_amt
                                           else
                                               0
                                       end), 0
)
else
    ifnull(
        sum(div_target.div_offshore_target_amt), 0
    )
end             as offshore_target_amt,

                                       case
                                           when
                                               ifnull(
                                                   sum(div_target.div_non_mm_target_sale_amt), 0
                                               )                        =      0
                                           then
                                               ifnull(
                                                   sum(case
                                           when
                                               org_target.hdqt_ccorg_cd is not null
                                           then
                                               hdqt_target.hdqt_non_mm_target_sale_amt
                                           else
                                               0
                                       end), 0
)
else
    ifnull(
        sum(div_target.div_non_mm_target_sale_amt), 0
    )
end             as non_mm_target_sale_amt,

                                       case
                                           when
                                               ifnull(
                                                   sum(div_target.div_dt_target_sale_amt), 0
                                               )                        =      0
                                           then
                                               ifnull(
                                                   sum(case
                                           when
                                               org_target.hdqt_ccorg_cd is not null
                                           then
                                               hdqt_target.hdqt_dt_target_sale_amt
                                           else
                                               0
                                       end), 0
)
else
    ifnull(
        sum(div_target.div_dt_target_sale_amt), 0
    )
end             as dt_target_sale_amt,

                                       case
                                           when
                                               ifnull(
                                                   sum(div_target.div_sga_target_amt), 0
                                               )                        =      0
                                           then
                                               ifnull(
                                                   sum(case
                                           when
                                               org_target.hdqt_ccorg_cd is not null
                                           then
                                               hdqt_target.hdqt_sga_target_amt
                                           else
                                               0
                                       end), 0
)
else
    ifnull(
        sum(div_target.div_sga_target_amt), 0
    )
end             as sga_target_amt,

                                       case
                                           when
                                               ifnull(
                                                   sum(div_target.div_profit_target_amt), 0
                                               )                        =      0
                                           then
                                               ifnull(
                                                   sum(case
                                           when
                                               org_target.hdqt_ccorg_cd is not null
                                           then
                                               hdqt_target.hdqt_profit_target_amt
                                           else
                                               0
                                       end), 0
)
else
    ifnull(
        sum(div_target.div_profit_target_amt), 0
    )
end             as profit_target_amt,

                                       case
                                           when
                                               ifnull(
                                                   sum(div_target.div_total_profit_target_amt), 0
                                               )                        =      0
                                           then
                                               ifnull(
                                                   sum(case
                                           when
                                               org_target.hdqt_ccorg_cd is not null
                                           then
                                               hdqt_target.hdqt_total_profit_target_amt
                                           else
                                               0
                                       end), 0
)
else
    ifnull(
        sum(div_target.div_total_profit_target_amt), 0
    )
end             as total_profit_target_amt,

                                       case
                                           when
                                               ifnull(
                                                   sum(div_target.div_total_labor_target_amt), 0
                                               )                        =      0
                                           then
                                               ifnull(
                                                   sum(case
                                           when
                                               org_target.hdqt_ccorg_cd is not null
                                           then
                                               hdqt_target.hdqt_total_labor_target_amt
                                           else
                                               0
                                       end), 0
)
else
    ifnull(
        sum(div_target.div_total_labor_target_amt), 0
    )
end             as total_labor_target_amt,

                                       case
                                           when
                                               ifnull(
                                                   sum(div_target.div_labor_target_amt), 0
                                               )                        =      0
                                           then
                                               ifnull(
                                                   sum(case
                                           when
                                               org_target.hdqt_ccorg_cd is not null
                                           then
                                               hdqt_target.hdqt_labor_target_amt
                                           else
                                               0
                                       end), 0
)
else
    ifnull(
        sum(div_target.div_labor_target_amt), 0
    )
end             as labor_target_amt,

                                       case
                                           when
                                               ifnull(
                                                   sum(div_target.div_invest_target_amt), 0
                                               )                        =      0
                                           then
                                               ifnull(
                                                   sum(case
                                           when
                                               org_target.hdqt_ccorg_cd is not null
                                           then
                                               hdqt_target.hdqt_invest_target_amt
                                           else
                                               0
                                       end), 0
)
else
    ifnull(
        sum(div_target.div_invest_target_amt), 0
    )
end             as invest_target_amt,

                                       case
                                           when
                                               ifnull(
                                                   sum(div_target.div_expense_target_amt), 0
                                               )                        =      0
                                           then
                                               ifnull(
                                                   sum(case
                                           when
                                               org_target.hdqt_ccorg_cd is not null
                                           then
                                               hdqt_target.hdqt_expense_target_amt
                                           else
                                               0
                                       end), 0
)
else
    ifnull(
        sum(div_target.div_expense_target_amt), 0
    )
end             as expense_target_amt,

                                       case
                                           when
                                               ifnull(
                                                   sum(div_target.div_target_cont_margin_amt), 0
                                               )                        =      0
                                           then
                                               ifnull(
                                                   sum(case
                                           when
                                               org_target.hdqt_ccorg_cd is not null
                                           then
                                               hdqt_target.hdqt_target_cont_margin_amt
                                           else
                                               0
                                       end), 0
)
else
    ifnull(
        sum(div_target.div_target_cont_margin_amt), 0
    )
end             as target_cont_margin_amt

from org_target_view as org_target
left join org_target_div_view as div_target
on  org_target.div_ccorg_cd  =  div_target.div_ccorg_cd
and org_target.hdqt_ccorg_cd is null
and org_target.team_ccorg_cd is null
left join org_target_hdqt_view as hdqt_target
on  org_target.hdqt_ccorg_cd =  hdqt_target.hdqt_ccorg_cd
and org_target.team_ccorg_cd is null

group by
org_target.target_year,
org_target.org_id,
org_target.org_ccorg_cd,
org_target.org_parent,
org_target.org_name,
org_target.org_type,
org_target.org_order,
org_target.is_delivery,
org_target.is_total_cc,
org_target.org_tp,
org_target.lv1_ccorg_cd,
org_target.lv2_ccorg_cd,
org_target.lv3_ccorg_cd,
org_target.div_ccorg_cd,
org_target.hdqt_ccorg_cd,
org_target.team_ccorg_cd,
div_target.div_target_margin_rate,
hdqt_target.hdqt_target_margin_rate,
div_target.div_target_br_mm_amt,
hdqt_target.hdqt_target_br_mm_amt,
div_target.div_target_br_cost_amt,
hdqt_target.hdqt_target_br_cost_amt
) as target
) {
key org_id,
key target_year             : String(4),
    org_ccorg_cd,
    org_parent,
    org_name,
    org_type,
    org_order,
    total                   : Boolean,
    is_delivery,
    is_total_cc,
    org_tp,
    lv1_ccorg_cd,
    lv2_ccorg_cd,
    lv3_ccorg_cd,
    div_ccorg_cd,
    hdqt_ccorg_cd,
    team_ccorg_cd,
    target_sale_amt         : Decimal(18, 2),
    target_margin_rate      : Decimal(18, 2),
    target_br_mm_amt        : Decimal(18, 2),
    target_br_cost_amt        : Decimal(18, 2),
    target_rohc             : Decimal(18, 2),
    offshore_target_amt     : Decimal(18, 2),
    non_mm_target_sale_amt  : Decimal(18, 2),
    dt_target_sale_amt      : Decimal(18, 2),
    sga_target_amt          : Decimal(18, 2),
    profit_target_amt       : Decimal(18, 2),
    total_profit_target_amt : Decimal(18, 2),
    total_labor_target_amt  : Decimal(18, 2),
    labor_target_amt        : Decimal(18, 2),
    invest_target_amt       : Decimal(18, 2),
    expense_target_amt      : Decimal(18, 2),
    target_cont_margin_amt  : Decimal(18, 2)
}
