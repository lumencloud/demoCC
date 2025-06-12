using pl.wideview as pl_wideview from '../wideview';
using common.version as common_version from '../../common/version';
using common.org_hierachy_view as common_org_hierachy_view from '../../common/view/org_hierachy_view';
using common.project_view as common_project_view from '../../common/view/project_view';
using common.annual_target as common_annual_target from '../../common/target';

namespace pl;

view wideview_view as
    select from (
        select
            org.*,
            pl.*,
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
            end as cnvg_biz_yn : Boolean,
            // prj.cnvg_biz_yn,
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
        left join common_org_hierachy_view as org
            on prj.sale_ccorg_cd = org.org_ccorg_cd
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
