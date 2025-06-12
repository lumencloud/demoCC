using pl.wideview as pl_wideview from '../pl/wideview';
using pl.contract_amt as pl_contract_amt from '../pl/contract_amt';
using common.code_header as common_code_header from '../common/code';
using common.code_item as common_code_item from '../common/code';
using common.project as common_project from '../common/project';
using common.project_biz_domain as common_project_biz_domain from '../common/project_biz_domain';
using common.dt_task as common_dt_task from '../common/dt_task';
using common.account as common_account from '../common/account';
using common.project_platform as common_project_platform from '../common/project_platform';
using common.org_full_level_view as common_org_full_level_view from '../common/view/org_full_level_view';

namespace reporting;

// 버전 개발 후 ver 도 조인대상 추가필요
view pl_view as
    select
        org.*,
        pl.ver,
        pl.year,
        pl.month,
        pl.prj_no,
        pl.seq,
        pl.src_type,
           case pl.month
               when
                   '01'
               then
                   pl.rodr_m1_amt
               when
                   '02'
               then
                   pl.rodr_m1_amt + pl.rodr_m2_amt
               when
                   '03'
               then
                   pl.rodr_m1_amt + pl.rodr_m2_amt + pl.rodr_m3_amt
               when
                   '04'
               then
                   pl.rodr_m1_amt + pl.rodr_m2_amt + pl.rodr_m3_amt + pl.rodr_m4_amt
               when
                   '05'
               then
                   pl.rodr_m1_amt + pl.rodr_m2_amt + pl.rodr_m3_amt + pl.rodr_m4_amt + pl.rodr_m5_amt
               when
                   '06'
               then
                   pl.rodr_m1_amt + pl.rodr_m2_amt + pl.rodr_m3_amt + pl.rodr_m4_amt + pl.rodr_m5_amt + pl.rodr_m6_amt
               when
                   '07'
               then
                   pl.rodr_m1_amt + pl.rodr_m2_amt + pl.rodr_m3_amt + pl.rodr_m4_amt + pl.rodr_m5_amt + pl.rodr_m6_amt + pl.rodr_m7_amt
               when
                   '08'
               then
                   pl.rodr_m1_amt + pl.rodr_m2_amt + pl.rodr_m3_amt + pl.rodr_m4_amt + pl.rodr_m5_amt + pl.rodr_m6_amt + pl.rodr_m7_amt + pl.rodr_m8_amt
               when
                   '09'
               then
                   pl.rodr_m1_amt + pl.rodr_m2_amt + pl.rodr_m3_amt + pl.rodr_m4_amt + pl.rodr_m5_amt + pl.rodr_m6_amt + pl.rodr_m7_amt + pl.rodr_m8_amt + pl.rodr_m9_amt
               when
                   '10'
               then
                   pl.rodr_m1_amt + pl.rodr_m2_amt + pl.rodr_m3_amt + pl.rodr_m4_amt + pl.rodr_m5_amt + pl.rodr_m6_amt + pl.rodr_m7_amt + pl.rodr_m8_amt + pl.rodr_m9_amt + pl.rodr_m10_amt
               when
                   '11'
               then
                   pl.rodr_m1_amt + pl.rodr_m2_amt + pl.rodr_m3_amt + pl.rodr_m4_amt + pl.rodr_m5_amt + pl.rodr_m6_amt + pl.rodr_m7_amt + pl.rodr_m8_amt + pl.rodr_m9_amt + pl.rodr_m10_amt + pl.rodr_m11_amt
               when
                   '12'
               then
                   pl.rodr_m1_amt + pl.rodr_m2_amt + pl.rodr_m3_amt + pl.rodr_m4_amt + pl.rodr_m5_amt + pl.rodr_m6_amt + pl.rodr_m7_amt + pl.rodr_m8_amt + pl.rodr_m9_amt + pl.rodr_m10_amt + pl.rodr_m11_amt + pl.rodr_m12_amt
           end        as rodr_ytd_amt   : Decimal(18, 2),
           case pl.month
               when
                   '01'
               then
                   pl.sale_m1_amt
               when
                   '02'
               then
                   pl.sale_m1_amt + pl.sale_m2_amt
               when
                   '03'
               then
                   pl.sale_m1_amt + pl.sale_m2_amt + pl.sale_m3_amt
               when
                   '04'
               then
                   pl.sale_m1_amt + pl.sale_m2_amt + pl.sale_m3_amt + pl.sale_m4_amt
               when
                   '05'
               then
                   pl.sale_m1_amt + pl.sale_m2_amt + pl.sale_m3_amt + pl.sale_m4_amt + pl.sale_m5_amt
               when
                   '06'
               then
                   pl.sale_m1_amt + pl.sale_m2_amt + pl.sale_m3_amt + pl.sale_m4_amt + pl.sale_m5_amt + pl.sale_m6_amt
               when
                   '07'
               then
                   pl.sale_m1_amt + pl.sale_m2_amt + pl.sale_m3_amt + pl.sale_m4_amt + pl.sale_m5_amt + pl.sale_m6_amt + pl.sale_m7_amt
               when
                   '08'
               then
                   pl.sale_m1_amt + pl.sale_m2_amt + pl.sale_m3_amt + pl.sale_m4_amt + pl.sale_m5_amt + pl.sale_m6_amt + pl.sale_m7_amt + pl.sale_m8_amt
               when
                   '09'
               then
                   pl.sale_m1_amt + pl.sale_m2_amt + pl.sale_m3_amt + pl.sale_m4_amt + pl.sale_m5_amt + pl.sale_m6_amt + pl.sale_m7_amt + pl.sale_m8_amt + pl.sale_m9_amt
               when
                   '10'
               then
                   pl.sale_m1_amt + pl.sale_m2_amt + pl.sale_m3_amt + pl.sale_m4_amt + pl.sale_m5_amt + pl.sale_m6_amt + pl.sale_m7_amt + pl.sale_m8_amt + pl.sale_m9_amt + pl.sale_m10_amt
               when
                   '11'
               then
                   pl.sale_m1_amt + pl.sale_m2_amt + pl.sale_m3_amt + pl.sale_m4_amt + pl.sale_m5_amt + pl.sale_m6_amt + pl.sale_m7_amt + pl.sale_m8_amt + pl.sale_m9_amt + pl.sale_m10_amt + pl.sale_m11_amt
               when
                   '12'
               then
                   pl.sale_m1_amt + pl.sale_m2_amt + pl.sale_m3_amt + pl.sale_m4_amt + pl.sale_m5_amt + pl.sale_m6_amt + pl.sale_m7_amt + pl.sale_m8_amt + pl.sale_m9_amt + pl.sale_m10_amt + pl.sale_m11_amt + pl.sale_m12_amt
           end        as sale_ytd_amt   : Decimal(18, 2),
           case pl.month
               when
                   '01'
               then
                   pl.margin_m1_amt
               when
                   '02'
               then
                   pl.margin_m1_amt + pl.margin_m2_amt
               when
                   '03'
               then
                   pl.margin_m1_amt + pl.margin_m2_amt + pl.margin_m3_amt
               when
                   '04'
               then
                   pl.margin_m1_amt + pl.margin_m2_amt + pl.margin_m3_amt + pl.margin_m4_amt
               when
                   '05'
               then
                   pl.margin_m1_amt + pl.margin_m2_amt + pl.margin_m3_amt + pl.margin_m4_amt + pl.margin_m5_amt
               when
                   '06'
               then
                   pl.margin_m1_amt + pl.margin_m2_amt + pl.margin_m3_amt + pl.margin_m4_amt + pl.margin_m5_amt + pl.margin_m6_amt
               when
                   '07'
               then
                   pl.margin_m1_amt + pl.margin_m2_amt + pl.margin_m3_amt + pl.margin_m4_amt + pl.margin_m5_amt + pl.margin_m6_amt + pl.margin_m7_amt
               when
                   '08'
               then
                   pl.margin_m1_amt + pl.margin_m2_amt + pl.margin_m3_amt + pl.margin_m4_amt + pl.margin_m5_amt + pl.margin_m6_amt + pl.margin_m7_amt + pl.margin_m8_amt
               when
                   '09'
               then
                   pl.margin_m1_amt + pl.margin_m2_amt + pl.margin_m3_amt + pl.margin_m4_amt + pl.margin_m5_amt + pl.margin_m6_amt + pl.margin_m7_amt + pl.margin_m8_amt + pl.margin_m9_amt
               when
                   '10'
               then
                   pl.margin_m1_amt + pl.margin_m2_amt + pl.margin_m3_amt + pl.margin_m4_amt + pl.margin_m5_amt + pl.margin_m6_amt + pl.margin_m7_amt + pl.margin_m8_amt + pl.margin_m9_amt + pl.margin_m10_amt
               when
                   '11'
               then
                   pl.margin_m1_amt + pl.margin_m2_amt + pl.margin_m3_amt + pl.margin_m4_amt + pl.margin_m5_amt + pl.margin_m6_amt + pl.margin_m7_amt + pl.margin_m8_amt + pl.margin_m9_amt + pl.margin_m10_amt + pl.margin_m11_amt
               when
                   '12'
               then
                   pl.margin_m1_amt + pl.margin_m2_amt + pl.margin_m3_amt + pl.margin_m4_amt + pl.margin_m5_amt + pl.margin_m6_amt + pl.margin_m7_amt + pl.margin_m8_amt + pl.margin_m9_amt + pl.margin_m10_amt + pl.margin_m11_amt + pl.margin_m12_amt
           end        as margin_ytd_amt : Decimal(18, 2),
        rodr.prj_target_m1_amt,
        rodr.prj_target_m2_amt,
        rodr.prj_target_m3_amt,
        rodr.prj_target_m4_amt,
        rodr.prj_target_m5_amt,
        rodr.prj_target_m6_amt,
        rodr.prj_target_m7_amt,
        rodr.prj_target_m8_amt,
        rodr.prj_target_m9_amt,
        rodr.prj_target_m10_amt,
        rodr.prj_target_m11_amt,
        rodr.prj_target_m12_amt,
        pl.rodr_m1_amt,
        pl.rodr_m2_amt,
        pl.rodr_m3_amt,
        pl.rodr_m4_amt,
        pl.rodr_m5_amt,
        pl.rodr_m6_amt,
        pl.rodr_m7_amt,
        pl.rodr_m8_amt,
        pl.rodr_m9_amt,
        pl.rodr_m10_amt,
        pl.rodr_m11_amt,
        pl.rodr_m12_amt,
        pl.sale_m1_amt,
        pl.sale_m2_amt,
        pl.sale_m3_amt,
        pl.sale_m4_amt,
        pl.sale_m5_amt,
        pl.sale_m6_amt,
        pl.sale_m7_amt,
        pl.sale_m8_amt,
        pl.sale_m9_amt,
        pl.sale_m10_amt,
        pl.sale_m11_amt,
        pl.sale_m12_amt,
        pl.prj_prfm_m1_amt,
        pl.prj_prfm_m2_amt,
        pl.prj_prfm_m3_amt,
        pl.prj_prfm_m4_amt,
        pl.prj_prfm_m5_amt,
        pl.prj_prfm_m6_amt,
        pl.prj_prfm_m7_amt,
        pl.prj_prfm_m8_amt,
        pl.prj_prfm_m9_amt,
        pl.prj_prfm_m10_amt,
        pl.prj_prfm_m11_amt,
        pl.prj_prfm_m12_amt,
        pl.margin_m1_amt,
        pl.margin_m2_amt,
        pl.margin_m3_amt,
        pl.margin_m4_amt,
        pl.margin_m5_amt,
        pl.margin_m6_amt,
        pl.margin_m7_amt,
        pl.margin_m8_amt,
        pl.margin_m9_amt,
        pl.margin_m10_amt,
        pl.margin_m11_amt,
        pl.margin_m12_amt,
        prj.bd_n1_cd,
           case bd.bd_n2_cd
               when
                   null
               then
                   prj.bd_n2_cd
               else
                   bd.bd_n2_cd
           end        as bd_n2_cd       : String(20),
           case bd.bd_n3_cd
               when
                   null
               then
                   prj.bd_n3_cd
               else
                   bd.bd_n3_cd
           end        as bd_n3_cd       : String(20),
        bd.bd_n4_cd,
        bd.bd_n5_cd,
        bd.bd_n6_cd,
        prj.biz_opp_no,
        prj.biz_opp_nm,
        prj.cls_rsn_tp_cd,
        code_cls.name as cls_rsn_tp_nm,
        prj.biz_tp_account_cd,
        acc.biz_tp_account_nm,
        prj.dgtr_task_cd,
        dt.dgtr_task_nm as dgtr_task_nm,
        prj.deal_stage_cd,
        prj.crov_div_yn,
        prj.brand_nm,
        prj.cnvg_biz_yn,
        prj.prj_tp_cd,
           case
               when
                   prj_platform.quote_target_no is not null
                   and prj_platform.quote_target_no <> ''
               then
                   prj_platform.quote_target_no
               else
                   null
           end        as quote_target_no
    from pl_wideview as pl
    left join common_project as prj
        on pl.prj_no = prj.prj_no
    left join pl_contract_amt as rodr
        on pl.prj_no = rodr.prj_no
        and prj.biz_opp_no = rodr.biz_opp_no
    left join common_project_platform as prj_platform
        on  pl.prj_no   = prj_platform.prj_no
        and pl.seq      = prj_platform.seq
        and pl.src_type = 'P'
    left join common_org_full_level_view as org
        on case pl.src_type
               when
                   'P'
               then
                   prj_platform.sale_ccorg_cd
               else
                   prj.sale_ccorg_cd
           end = org.org_ccorg_cd
    left join common_project_biz_domain as bd
        on prj.prj_no = bd.prj_no
    left join common_dt_task as dt
        on prj.dgtr_task_cd = dt.dgtr_task_cd
    left join common_account as acc
        on prj.biz_tp_account_cd = acc.biz_tp_account_cd
    left join common_code_item as code_cls
        on  prj.cls_rsn_tp_cd  = code_cls.value
        and code_cls.header.ID = (
            select ID from common_code_header
            where
                upper(category) = 'CLOSE_REASON'
            limit 1
        );
