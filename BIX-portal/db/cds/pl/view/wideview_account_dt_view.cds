using pl.wideview_account_view as pl_wideview_account_view from './wideview_account_view';
using common.annual_target as common_annual_target from '../../common/target';
using common.dt_task as common_dt_task from '../../common/dt_task';

namespace pl;

view wideview_account_dt_view as
    select from (
        select
            pl.*,
            dt.sort_order,
            dgtr_task_nm,
            ifnull(
                sale_target.target_val, 0
            )   as target_sale_amt,
            ifnull(
                margin_target.target_val, 0
            )   as target_margin_rate,
            case
                when
                    sale_target.target_val       is not null
                    and margin_target.target_val is not null
                then
                    sale_target.target_val       *      margin_target.target_val / 100
                else
                    0
            end as target_margin_amt
        from (
            select *
            from pl_wideview_account_view
            where length(dgtr_task_cd) > 0
        ) as pl
        left join common_dt_task as dt
            on pl.dgtr_task_cd = dt.dgtr_task_cd
            and pl.ver = dt.ver
        left join common_annual_target as sale_target
            on  pl.dgtr_task_cd         = sale_target.target_type_cd
            and pl.year                 = sale_target.year
            and sale_target.target_cd   = 'A01'
            and sale_target.target_type = 'dgtr_task_cd'
        left join common_annual_target as margin_target
            on  pl.dgtr_task_cd           = margin_target.target_type_cd
            and pl.year                   = margin_target.year
            and margin_target.target_cd   = 'A02'
            and margin_target.target_type = 'dgtr_task_cd'
        where length(pl.dgtr_task_cd) > 0
    ) {
        key ver,
        key year,
        key month,
        key src_type,
        key dgtr_task_cd,
            dgtr_task_nm,
            sort_order,
            prj_no,
            prj_nm,
            cstco_cd,
            cstco_name,
            rodr_ccorg_cd,
            sale_ccorg_cd,
            prj_prfm_str_dt,
            prj_prfm_end_dt,
            ovse_biz_yn,
            relsco_yn,
            prj_tp_cd,
            itsm_div_yn,
            crov_div_yn,
            cnvg_biz_yn,
            dt_tp,
            tech_nm,
            brand_nm,
            quote_issue_no,
            quote_target_no,
            bd_n1_cd,
            bd_n2_cd,
            bd_n3_cd,
            bd_n4_cd,
            bd_n5_cd,
            bd_n6_cd,
            biz_opp_no_sfdc,
            biz_opp_no,
            biz_opp_nm,
            deal_stage_cd,
            deal_stage_chg_dt,
            biz_tp_account_cd,
            cls_rsn_tp_cd,
            cls_rsn_tp_nm,
            expected_contract_date,
            margin_rate,
            target_sale_amt,
            target_margin_rate,
            target_margin_amt,
            rodr_year_amt,
            sale_year_amt,
            margin_year_amt,
            prj_prfm_year_amt,
            rodr_m1_amt,
            rodr_m2_amt,
            rodr_m3_amt,
            rodr_m4_amt,
            rodr_m5_amt,
            rodr_m6_amt,
            rodr_m7_amt,
            rodr_m8_amt,
            rodr_m9_amt,
            rodr_m10_amt,
            rodr_m11_amt,
            rodr_m12_amt,
            sale_m1_amt,
            sale_m2_amt,
            sale_m3_amt,
            sale_m4_amt,
            sale_m5_amt,
            sale_m6_amt,
            sale_m7_amt,
            sale_m8_amt,
            sale_m9_amt,
            sale_m10_amt,
            sale_m11_amt,
            sale_m12_amt,
            prj_prfm_m1_amt,
            prj_prfm_m2_amt,
            prj_prfm_m3_amt,
            prj_prfm_m4_amt,
            prj_prfm_m5_amt,
            prj_prfm_m6_amt,
            prj_prfm_m7_amt,
            prj_prfm_m8_amt,
            prj_prfm_m9_amt,
            prj_prfm_m10_amt,
            prj_prfm_m11_amt,
            prj_prfm_m12_amt,
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
            team_ccorg_cd
    };
