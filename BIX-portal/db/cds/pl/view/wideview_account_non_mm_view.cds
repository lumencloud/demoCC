using pl.wideview_account_view as pl_wideview_account_view from './wideview_account_view';
using common.non_mm_filter_view as common_non_mm_filter_view from '../../common/view/non_mm_filter_view';

namespace pl;

view wideview_account_non_mm_view as
    select from (
        select pl.* from (
            select * from pl_wideview_account_view
        ) as pl
        inner join common_non_mm_filter_view as non_mm
            on (
                (
                                    non_mm.nm_rodr_ccorg_cd   =      pl.rodr_ccorg_cd
                    or              non_mm.nm_rodr_ccorg_cd   =      pl.sale_ccorg_cd
                )
                and (
                    (
                                    pl.prj_nm                 like   non_mm.prj_nm
                        and         non_mm.prj_nm_op          =      'LIKE'
                    )
                    or              non_mm.prj_nm_op          is     null
                )
                and (
                    (
                                    pl.prj_prfm_str_dt        >=     non_mm.prj_prfm_str_dt
                        and         non_mm.prj_prfm_str_dt_op =      '>='
                    )
                    or              non_mm.prj_prfm_str_dt_op is     null
                )
                and (
                    (
                                    pl.bd_n2_cd               =      non_mm.bd_n2_cd
                        and         non_mm.bd_n2_cd_op        =      '='
                    )
                    or (
                                    pl.bd_n2_cd               <>     non_mm.bd_n2_cd
                        and         non_mm.bd_n2_cd_op        =      '<>'
                    )
                    or              non_mm.bd_n2_cd_op        is     null
                )
                and (
                    (
                                    non_mm.dgtr_task_cd_op    =      '='
                        and (
                            (
                                    non_mm.dgtr_task_cd       is not null
                                and pl.dgtr_task_cd           =      non_mm.dgtr_task_cd
                            )
                            or (
                                    non_mm.dgtr_task_cd       is     null
                                and pl.dgtr_task_cd           is     null
                            )
                        )
                    )
                    or (
                                    non_mm.dgtr_task_cd_op    =      '<>'
                        and (
                            (
                                    non_mm.dgtr_task_cd       is not null
                                and pl.dgtr_task_cd           <>     non_mm.dgtr_task_cd
                            )
                            or (
                                    non_mm.dgtr_task_cd       is     null
                                and pl.dgtr_task_cd           is not null
                            )
                        )
                    )
                    or              non_mm.dgtr_task_cd_op    is     null
                )
                and (
                    (
                        (
                                    pl.cstco_cd               =      non_mm.cstco_cd
                            or      pl.cstco_cd               =      lpad(
                                non_mm.cstco_cd, 10, '0'
                            )
                        )
                        and         non_mm.cstco_cd_op        =      '='
                    )
                    or (
                                    pl.cstco_cd               <>     non_mm.cstco_cd
                        and         pl.cstco_cd               <>     lpad(
                            non_mm.cstco_cd, 10, '0'
                        )
                        and         non_mm.cstco_cd_op        =      '<>'
                    )
                    or              non_mm.cstco_cd_op        is     null
                )
                and (
                    (
                                    pl.prj_tp_cd              =      non_mm.prj_tp_cd
                        and         non_mm.prj_tp_cd_op       =      '='
                    )
                    or (
                                    pl.prj_tp_cd              <>     non_mm.prj_tp_cd
                        and         non_mm.prj_tp_cd_op       =      '<>'
                    )
                    or              non_mm.prj_tp_cd          is     null
                )
                and (
                    (
                                    pl.itsm_div_yn            =      non_mm.itsm_div_yn
                        and         non_mm.itsm_div_yn_op     =      '='
                    )
                    or (
                                    pl.itsm_div_yn            <>     non_mm.itsm_div_yn
                        and         non_mm.itsm_div_yn_op     =      '<>'
                    )
                    or              non_mm.itsm_div_yn        is     null
                )
            )
    ) {
        key ver,
        key year,
        key month,
        key src_type,
            prj_no,
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
            account_target_sale_amt,
            account_target_margin_rate,
            dt_target_sale_amt,
            dt_target_margin_rate,
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
