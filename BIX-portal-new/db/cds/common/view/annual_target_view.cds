using common.org_full_level_view as common_org_full_level_view from './org_full_level_view';
using common.target as common_target from '../target';
using common.code_header as common_code_header from '../code';
using common.code_item as common_code_item from '../code';

namespace common;

view annual_target_view as
    select
        org.org_id,
        org.org_ccorg_cd,
        org.org_order,
        org.org_parent,
        org.org_name,
        org.lv1_id,
        org.lv1_name,
        org.lv1_ccorg_cd,
        org.lv2_id,
        org.lv2_name,
        org.lv2_ccorg_cd,
        org.lv3_id,
        org.lv3_name,
        org.lv3_ccorg_cd,
        org.div_id,
        org.div_name,
        org.div_ccorg_cd,
        org.hdqt_id,
        org.hdqt_name,
        org.hdqt_ccorg_cd,
        org.team_id,
        org.team_name,
        org.team_ccorg_cd,
        target_pivot.*
    from common_org_full_level_view as org
    left join (
        select
            target.ccorg_cd,
            target.year,
            max(case
                    when
                        target.target_cd = 'A01'
                    then
                        target.target_val
                end) as sale_target,
            max(case
                    when
                        target.target_cd = 'A02'
                    then
                        target.target_val
                end) as margin_rate_target,
            max(case
                    when
                        target.target_cd = 'A03'
                    then
                        target.target_val
                end) as margin_target,
            max(case
                    when
                        target.target_cd = 'A04'
                    then
                        target.target_val
                end) as contribution_margin_target,
            max(case
                    when
                        target.target_cd = 'A05'
                    then
                        target.target_val
                end) as br_target,
            max(case
                    when
                        target.target_cd = 'A06'
                    then
                        target.target_val
                end) as rohc_target,
            max(case
                    when
                        target.target_cd = 'B01'
                    then
                        target.target_val
                end) as offshoring_target,
            max(case
                    when
                        target.target_cd = 'B02'
                    then
                        target.target_val
                end) as dt_sale_target,
            max(case
                    when
                        target.target_cd = 'B03'
                    then
                        target.target_val
                end) as dt_margin_rate_target,
            max(case
                    when
                        target.target_cd = 'B04'
                    then
                        target.target_val
                end) as non_mm_target,
            max(case
                    when
                        target.target_cd = 'C01'
                    then
                        target.target_val
                end) as sga_target,
            max(case
                    when
                        target.target_cd = 'C02'
                    then
                        target.target_val
                end) as total_operating_profit_target,
            max(case
                    when
                        target.target_cd = 'C03'
                    then
                        target.target_val
                end) as operating_profit_target,
            max(case
                    when
                        target.target_cd = 'C04'
                    then
                        target.target_val
                end) as labor_target,
            ifnull(target.is_total_calc,false)  as is_total
    from common_target as target
    left join common_code_item as code
        on  target.target_cd    = code.value
        and code.header_opt1.ID = (
            select ID from common_code_header
            where
                upper(category) = 'target_code'
            limit 1
        )
    left join common_code_item as opt_code
        on  code.header_opt1.ID = opt_code.header.ID
        and code.value_opt1     = opt_code.value
    group by
        target.ccorg_cd,
        target.year,
        target.is_total_calc
) as target_pivot
    on org.org_ccorg_cd = target_pivot.ccorg_cd;
