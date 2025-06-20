using pl.wideview as pl_wideview from '../wideview';
using common.version as common_version from '../../common/version';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';
using common.org_target_view as common_org_target_view from '../../common/view/org_target_view';
using common.project_view as common_project_view from '../../common/view/project_view';
using common.annual_target as common_annual_target from '../../common/target';

namespace pl;

view wideview_view as
    select from (
        select
            ifnull(
                account_sale_target.target_val, 0
            )                                                                                                                                                                                                                        as account_target_sale_amt : Decimal(18, 2) @title: 'Account 별 목표 매출',
            ifnull(
                account_margin_target.target_val, 0
            )                                                                                                                                                                                                                        as account_target_margin_rate : Decimal(18, 2) @title: 'Account 별 목표 마진률',
            ifnull(
                dt_sale_target.target_val, 0
            )                                                                                                                                                                                                                        as dt_target_sale_amt      : Decimal(18, 2) @title: 'DT과제 별 목표 매출',
            ifnull(
                dt_margin_target.target_val, 0
            )                                                                                                                                                                                                                        as dt_target_margin_rate   : Decimal(18, 2) @title: 'DT과제 별 목표 마진률',
            org.*,
            pl.*,
            rodr_m1_amt + rodr_m2_amt + rodr_m3_amt + rodr_m4_amt + rodr_m5_amt + rodr_m6_amt + rodr_m7_amt + rodr_m8_amt + rodr_m9_amt + rodr_m10_amt + rodr_m11_amt + rodr_m12_amt                                                 as rodr_year_amt           : Decimal(18, 2) @title: '연 수주금액',
            sale_m1_amt + sale_m2_amt + sale_m3_amt + sale_m4_amt + sale_m5_amt + sale_m6_amt + sale_m7_amt + sale_m8_amt + sale_m9_amt + sale_m10_amt + sale_m11_amt + sale_m12_amt                                                 as sale_year_amt           : Decimal(18, 2) @title: '연 매출금액',
            margin_m1_amt + margin_m2_amt + margin_m3_amt + margin_m4_amt + margin_m5_amt + margin_m6_amt + margin_m7_amt + margin_m8_amt + margin_m9_amt + margin_m10_amt + margin_m11_amt + margin_m12_amt                         as margin_year_amt         : Decimal(18, 2) @title: '연 마진금액',
            prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt + prj_prfm_m4_amt + prj_prfm_m5_amt + prj_prfm_m6_amt + prj_prfm_m7_amt + prj_prfm_m8_amt + prj_prfm_m9_amt + prj_prfm_m10_amt + prj_prfm_m11_amt + prj_prfm_m12_amt as prj_prfm_year_amt       : Decimal(18, 2) @title: '연 수행금액',
            prj.prj_nm,
            prj.cstco_cd,
            prj.rodr_ccorg_cd,
            prj.sale_ccorg_cd,
            prj.prj_prfm_str_dt,
            prj.prj_prfm_end_dt,
            prj.ovse_biz_yn,
            prj.relsco_yn,
            prj.prj_tp_cd,
            prj.itsm_div_yn,
            prj.crov_div_yn,
            case
                when
                    src_type       =                 'E'
                    and count( * ) over(partition by prj.prj_no, pl.year) > 1
                then
                    true
                else
                    prj.cnvg_biz_yn
            end                                                                                                                                                                                                                      as cnvg_biz_yn             : Boolean        @title: '융복합여부',
            prj.dt_tp,
            prj.tech_nm,
            prj.brand_nm,
            prj.quote_issue_no,
            prj.quote_target_no,
            prj.bd_n1_cd,
            prj.bd_n2_cd,
            prj.bd_n3_cd,
            prj.bd_n4_cd,
            prj.bd_n5_cd,
            prj.bd_n6_cd,
            prj.biz_opp_no_sfdc,
            prj.biz_opp_no,
            prj.biz_opp_nm,
            prj.deal_stage_cd,
            prj.deal_stage_chg_dt,
            prj.dgtr_task_cd,
            prj.biz_tp_account_cd,
            prj.cls_rsn_tp_cd,
            prj.cls_rsn_tp_nm,
            prj.expected_contract_date,
            prj.margin_rate
        from pl_wideview as pl
        left join common_project_view as prj
            on(
                    pl.prj_no   =  prj.prj_no
                and pl.seq      =  prj.seq
                and pl.src_type =  'P'
            )
            or (
                    pl.prj_no   =  prj.prj_no
                and prj.seq     is null
                and pl.src_type <> 'P'
            )
        left join common_org_target_view as org
            on prj.sale_ccorg_cd = org.org_ccorg_cd
        left join common_annual_target as account_sale_target
            on(
                    pl.year                         = account_sale_target.year
                and account_sale_target.target_type = 'biz_tp_account_cd'
                and account_sale_target.target_cd   = 'A01'
                and prj.dgtr_task_cd                = account_sale_target.target_type_cd

            )
        left join common_annual_target as account_margin_target
            on(
                    pl.year                           = account_margin_target.year
                and account_margin_target.target_type = 'biz_tp_account_cd'
                and account_margin_target.target_cd   = 'A02'
                and prj.dgtr_task_cd                  = account_margin_target.target_type_cd

            )
        left join common_annual_target as dt_sale_target
            on(
                    pl.year                    = dt_sale_target.year
                and dt_sale_target.target_type = 'dgtr_task_cd'
                and dt_sale_target.target_cd   = 'A01'
                and prj.dgtr_task_cd           = dt_sale_target.target_type_cd

            )
        left join common_annual_target as dt_margin_target
            on(
                    pl.year                      = dt_margin_target.year
                and dt_margin_target.target_type = 'dgtr_task_cd'
                and dt_margin_target.target_cd   = 'A02'
                and prj.dgtr_task_cd             = dt_margin_target.target_type_cd

            )
        where
                       pl.ver          in (
                select ver from common_version
                where
                       tag = 'C'
                    or tag = 'Y'
            )
            and (
                       pl.src_type     =  'E'
                and (
                       prj.cnvg_biz_yn <> true
                    or prj.cnvg_biz_yn is null
                )
            )
            or         pl.src_type     <> 'E'

    ) {
        key ver,
        key year,
        key month,
        key prj_no,
        key seq,
        key src_type,
            prj_nm,
            cstco_cd,
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
            dgtr_task_cd,
            biz_tp_account_cd,
            cls_rsn_tp_cd,
            cls_rsn_tp_nm,
            expected_contract_date,
            margin_rate,
            // 목표 컬럼
            div_target_sale_amt_is_total_calc,
            div_target_sale_amt,
            div_target_margin_rate_is_total_calc,
            div_target_margin_rate,
            div_offshore_target_amt_is_total_calc,
            div_offshore_target_amt,
            div_non_mm_target_sale_amt_is_total_calc,
            div_non_mm_target_sale_amt,
            div_dt_target_sale_amt_is_total_calc,
            div_dt_target_sale_amt,
            hdqt_target_sale_amt_is_total_calc,
            hdqt_target_sale_amt,
            hdqt_target_margin_rate_is_total_calc,
            hdqt_target_margin_rate,
            hdqt_offshore_target_amt_is_total_calc,
            hdqt_offshore_target_amt,
            hdqt_non_mm_target_sale_amt_is_total_calc,
            hdqt_non_mm_target_sale_amt,
            hdqt_dt_target_sale_amt_is_total_calc,
            hdqt_dt_target_sale_amt,
            account_target_sale_amt,
            account_target_margin_rate,
            dt_target_sale_amt,
            dt_target_margin_rate,
            // ------------------------
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
    };
