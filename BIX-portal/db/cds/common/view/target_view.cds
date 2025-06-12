using common.org_full_level_view as common_org_full_level_view from './org_full_level_view';
using common.target as common_target from '../target';
using common.annual_target as common_annual_target from '../target';
using common.code_header as common_code_header from '../code';
using common.code_item as common_code_item from '../code';
using common.account as common_account from '../account';
using common.dt_task as common_dt_task from '../dt_task';

namespace common;

view target_view as
    select
        org.org_id,
        org.org_ccorg_cd,
        org.org_order,
        org.org_parent,
        org.org_name,
        org.is_delivery,
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

// annual_target_base 기초 데이터 view
view annual_target_base_view as
    select
        target.target_type,
        target.target_type_cd,
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
    from common_annual_target as target
    left join common_code_item as code
        on  target.target_cd    = code.value
        and code.header_opt1.ID = (
            select ID from common_code_header
            where
                upper(category) = 'target_code'
            limit 1
        )
    group by
        target.target_type,
        target.target_type_cd,
        target.year,
        ifnull(target.is_total_calc,false);

// annual_target_base 기초 자료를 기반으로 org, account, dt 테이블과 join 및 union (target: org, account, dt)
view annual_target_temp_view(target_type: String(20)) as select from 
    (
        select
            org.org_id,
            org.org_ccorg_cd,
            org.org_order,
            org.org_parent,
            org.org_name,
            org.is_delivery,
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
            null as biz_tp_account_cd,
            null as biz_tp_account_nm,
            null as sort_order,
            null as dgtr_task_cd,
            null as dgtr_task_nm,
            null as dt_sort_order,
            base.*
        from common_org_full_level_view as org
        left join annual_target_base_view as base
            on org.org_ccorg_cd = base.target_type_cd
        where (:target_type = 'ccorg_cd')
        
        union all

        select
            null as org_id,
            null as org_ccorg_cd,
            null as org_order,
            null as org_parent,
            null as org_name,
            null as is_delivery,
            null as lv1_id,
            null as lv1_name,
            null as lv1_ccorg_cd,
            null as lv2_id,
            null as lv2_name,
            null as lv2_ccorg_cd,
            null as lv3_id,
            null as lv3_name,
            null as lv3_ccorg_cd,
            null as div_id,
            null as div_name,
            null as div_ccorg_cd,
            null as hdqt_id,
            null as hdqt_name,
            null as hdqt_ccorg_cd,
            null as team_id,
            null as team_name,
            null as team_ccorg_cd,
            account.biz_tp_account_cd,
            account.biz_tp_account_nm,
            account.sort_order,
            null as dgtr_task_cd,
            null as dgtr_task_nm,
            null as dt_sort_order,
            base.*
        from common_account as account
        left join annual_target_base_view as base
            on account.biz_tp_account_cd = base.target_type_cd
        where (:target_type = 'account_cd')

        union all

        select
            null as org_id,
            null as org_ccorg_cd,
            null as org_order,
            null as org_parent,
            null as org_name,
            null as is_delivery,
            null as lv1_id,
            null as lv1_name,
            null as lv1_ccorg_cd,
            null as lv2_id,
            null as lv2_name,
            null as lv2_ccorg_cd,
            null as lv3_id,
            null as lv3_name,
            null as lv3_ccorg_cd,
            null as div_id,
            null as div_name,
            null as div_ccorg_cd,
            null as hdqt_id,
            null as hdqt_name,
            null as hdqt_ccorg_cd,
            null as team_id,
            null as team_name,
            null as team_ccorg_cd,
            null as biz_tp_account_cd,
            null as biz_tp_account_nm,
            null as sort_order,
            dt_task.dgtr_task_cd,
            dt_task.dgtr_task_nm,
            dt_task.sort_order as dt_sort_order,
            base.*
        from common_dt_task as dt_task
        left join annual_target_base_view as base
            on dt_task.dgtr_task_cd = base.target_type_cd
        where (:target_type = 'dtgr_task_cd')
    )
    {
        key target_type,
        key target_type_cd,
        key year,
        key is_total : Boolean,
            sale_target : Double,
            margin_rate_target : Double,
            margin_target : Double,
            contribution_margin_target : Double,
            br_target : Double,
            offshoring_target : Double,
            dt_sale_target : Double,
            dt_margin_rate_target : Double,
            non_mm_target : Double,
            sga_target : Double,
            total_operating_profit_target : Double,
            operating_profit_target : Double,
            labor_target : Double,
            org_id,
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
            team_ccorg_cd,
            biz_tp_account_cd : String,
            biz_tp_account_nm : String,
            sort_order : Integer,
            dgtr_task_cd : String,
            dgtr_task_nm : String,
            dt_sort_order : Integer,
    }; 