using common from '../../../db/cds/mis/mis';
using { common as commonAccount } from '../../../db/cds/common/account';
using { common as commonCustomer } from '../../../db/cds/common/customer';
using { common as commonCode } from '../../../db/cds/common/code';

@path    : '/odata/v4/common'
@impl    : 'srv/handlers/common/common_srv.js'
@requires: 'any'
@cds.query.limit.max: 10000
service CommonService {
    entity account as projection on commonAccount.account;
    entity customer as projection on commonCustomer.customer;

    entity mis_com_org       as projection on common.mis_com_org;
    entity mis_com_emp       as projection on common.mis_com_emp;
    entity mis_com_cstco     as projection on common.mis_com_cstco;
    entity mis_com_ctgr      as projection on common.mis_com_ctgr;
    entity mis_esmt_exe      as projection on common.mis_esmt_exe;
    entity mis_esmt_exe_filter as projection on common.mis_esmt_exe_filter;
    /**
     * (pending) mis_esmt_exe 테이블 분리 예정
     */
    entity mis_project       as projection on common.mis_project;
    entity mis_order_amount  as projection on common.mis_order_amount;
    entity mis_sale_amount   as projection on common.mis_sale_amount;
    entity mis_cos_amount    as projection on common.mis_cos_amount;
    entity mis_target_sale_amount as projection on common.mis_target_sale_amount;
    entity mis_target_cos_amount as projection on common.mis_target_cos_amount;
    entity mis_year_amount as projection on common.mis_year_amount;
    
    entity mis_get_org_descendant(id : String(20), use_yn : Boolean) as select from common.mis_get_org_descendant(id: :id, use_yn: :use_yn);
    entity mis_get_org_descendant_target(id : String(20), org_tp_rcid : String(20)) as select from common.mis_get_org_descendant_target(id: :id, org_tp_rcid: :org_tp_rcid);
    entity mis_get_org_ancestor(query : String(300)) as select from common.mis_get_org_ancestor(query: :query);
    entity mis_get_org_ancestor_target(id : String(20)) as select from common.mis_get_org_ancestor_target(id: :id);
    entity mis_get_prj_descendant(id : String(20)) as select from common.mis_get_prj_descendant(id: :id);
    entity mis_get_pl_sales(year : String(4), month : String(2), id : String(20)) as select from common.mis_get_pl_sales(year: :year, month: :month, id: :id);
    entity mis_get_pl_sgna(year : String(4), month : String(2), id : String(20)) as select from common.mis_get_pl_sgna(year: :year, month: :month, id: :id);
    entity mis_get_pl_target_sale(id : String(20), year : String(4)) as select from common.mis_get_pl_target_sale(id: :id, year: :year);
    entity Test3 as projection on common.Test3;
    entity TestHierarchy as projection on common.TestHierarchy;

    @cds.redirection.target
    view mis_com_org_view as select from common.mis_com_org {*} where '2024-01-01T00:00:00Z' between org_str_dt and org_end_dt;
    
    view mis_project_sheet_view as select from common.mis_project as prj
    inner join (
        select prj_no, sell_sls_cnrc_no, year,
        MAX(case when month = '01' then amount else null end) as sale_n1_mm_amt : Decimal,
        MAX(case when month = '02' then amount else null end) as sale_n2_mm_amt : Decimal,
        MAX(case when month = '03' then amount else null end) as sale_n3_mm_amt : Decimal,
        MAX(case when month = '04' then amount else null end) as sale_n4_mm_amt : Decimal,
        MAX(case when month = '05' then amount else null end) as sale_n5_mm_amt : Decimal,
        MAX(case when month = '06' then amount else null end) as sale_n6_mm_amt : Decimal,
        MAX(case when month = '07' then amount else null end) as sale_n7_mm_amt : Decimal,
        MAX(case when month = '08' then amount else null end) as sale_n8_mm_amt : Decimal,
        MAX(case when month = '09' then amount else null end) as sale_n9_mm_amt : Decimal,
        MAX(case when month = '10' then amount else null end) as sale_n10_mm_amt : Decimal,
        MAX(case when month = '11' then amount else null end) as sale_n11_mm_amt : Decimal,
        MAX(case when month = '12' then amount else null end) as sale_n12_mm_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end)
        ) AS sale_n1_qtr_amt : Decimal,
        (
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end)
        ) AS sale_n2_qtr_amt : Decimal,
        (
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end)
        ) AS sale_n3_qtr_amt : Decimal,
        (
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS sale_n4_qtr_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end) +
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end) +
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end) +
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS sale_year_amt : Decimal

        from common.mis_sale_amount
        group by prj_no, sell_sls_cnrc_no, year
    ) as sale on prj.prj_no = sale.prj_no and prj.sell_sls_cnrc_no = sale.sell_sls_cnrc_no
        and substring(prj.rodr_esmt_ym, 1, 4) = sale.year
    inner join (
        select prj_no, sell_sls_cnrc_no, year,
        MAX(case when month = '01' then amount else null end) as rodr_n1_mm_amt : Decimal,
        MAX(case when month = '02' then amount else null end) as rodr_n2_mm_amt : Decimal,
        MAX(case when month = '03' then amount else null end) as rodr_n3_mm_amt : Decimal,
        MAX(case when month = '04' then amount else null end) as rodr_n4_mm_amt : Decimal,
        MAX(case when month = '05' then amount else null end) as rodr_n5_mm_amt : Decimal,
        MAX(case when month = '06' then amount else null end) as rodr_n6_mm_amt : Decimal,
        MAX(case when month = '07' then amount else null end) as rodr_n7_mm_amt : Decimal,
        MAX(case when month = '08' then amount else null end) as rodr_n8_mm_amt : Decimal,
        MAX(case when month = '09' then amount else null end) as rodr_n9_mm_amt : Decimal,
        MAX(case when month = '10' then amount else null end) as rodr_n10_mm_amt : Decimal,
        MAX(case when month = '11' then amount else null end) as rodr_n11_mm_amt : Decimal,
        MAX(case when month = '12' then amount else null end) as rodr_n12_mm_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end)
        ) AS rodr_n1_qtr_amt : Decimal,
        (
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end)
        ) AS rodr_n2_qtr_amt : Decimal,
        (
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end)
        ) AS rodr_n3_qtr_amt : Decimal,
        (
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS rodr_n4_qtr_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end) +
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end) +
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end) +
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS rodr_year_amt : Decimal
        from common.mis_order_amount
        group by prj_no, sell_sls_cnrc_no, year
    ) as order on prj.prj_no = order.prj_no and prj.sell_sls_cnrc_no = order.sell_sls_cnrc_no
        and substring(prj.rodr_esmt_ym, 1, 4) = order.year
    inner join (
        select prj_no, sell_sls_cnrc_no, year,
        MAX(case when month = '01' then amount else null end) as prj_prfm_n1_mm_amt : Decimal,
        MAX(case when month = '02' then amount else null end) as prj_prfm_n2_mm_amt : Decimal,
        MAX(case when month = '03' then amount else null end) as prj_prfm_n3_mm_amt : Decimal,
        MAX(case when month = '04' then amount else null end) as prj_prfm_n4_mm_amt : Decimal,
        MAX(case when month = '05' then amount else null end) as prj_prfm_n5_mm_amt : Decimal,
        MAX(case when month = '06' then amount else null end) as prj_prfm_n6_mm_amt : Decimal,
        MAX(case when month = '07' then amount else null end) as prj_prfm_n7_mm_amt : Decimal,
        MAX(case when month = '08' then amount else null end) as prj_prfm_n8_mm_amt : Decimal,
        MAX(case when month = '09' then amount else null end) as prj_prfm_n9_mm_amt : Decimal,
        MAX(case when month = '10' then amount else null end) as prj_prfm_n10_mm_amt : Decimal,
        MAX(case when month = '11' then amount else null end) as prj_prfm_n11_mm_amt : Decimal,
        MAX(case when month = '12' then amount else null end) as prj_prfm_n12_mm_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end)
        ) AS prj_prfm_n1_qtr_amt : Decimal,
        (
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end)
        ) AS prj_prfm_n2_qtr_amt : Decimal,
        (
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end)
        ) AS prj_prfm_n3_qtr_amt : Decimal,
        (
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS prj_prfm_n4_qtr_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end) +
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end) +
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end) +
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS prj_prfm_year_amt : Decimal
        from common.mis_cos_amount
        group by prj_no, sell_sls_cnrc_no, year
    ) as cos on prj.prj_no = cos.prj_no and prj.sell_sls_cnrc_no = cos.sell_sls_cnrc_no
        and substring(prj.rodr_esmt_ym, 1, 4) = cos.year
    inner join (
        select prj_no, sell_sls_cnrc_no, year,
        MAX(case when month = '01' then amount else null end) as rmdr_sale_n1_mm_amt : Decimal,
        MAX(case when month = '02' then amount else null end) as rmdr_sale_n2_mm_amt : Decimal,
        MAX(case when month = '03' then amount else null end) as rmdr_sale_n3_mm_amt : Decimal,
        MAX(case when month = '04' then amount else null end) as rmdr_sale_n4_mm_amt : Decimal,
        MAX(case when month = '05' then amount else null end) as rmdr_sale_n5_mm_amt : Decimal,
        MAX(case when month = '06' then amount else null end) as rmdr_sale_n6_mm_amt : Decimal,
        MAX(case when month = '07' then amount else null end) as rmdr_sale_n7_mm_amt : Decimal,
        MAX(case when month = '08' then amount else null end) as rmdr_sale_n8_mm_amt : Decimal,
        MAX(case when month = '09' then amount else null end) as rmdr_sale_n9_mm_amt : Decimal,
        MAX(case when month = '10' then amount else null end) as rmdr_sale_n10_mm_amt : Decimal,
        MAX(case when month = '11' then amount else null end) as rmdr_sale_n11_mm_amt : Decimal,
        MAX(case when month = '12' then amount else null end) as rmdr_sale_n12_mm_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end)
        ) AS rmdr_sale_n1_qtr_amt : Decimal,
        (
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end)
        ) AS rmdr_sale_n2_qtr_amt : Decimal,
        (
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end)
        ) AS rmdr_sale_n3_qtr_amt : Decimal,
        (
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS rmdr_sale_n4_qtr_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end) +
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end) +
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end) +
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS rmdr_sale_year_amt : Decimal
        from common.mis_rmdr_amount
        group by prj_no, sell_sls_cnrc_no, year
    ) as rmdr on prj.prj_no = rmdr.prj_no and prj.sell_sls_cnrc_no = rmdr.sell_sls_cnrc_no
        and substring(prj.rodr_esmt_ym, 1, 4) = rmdr.year
    {
        key prj.prj_no,
        key prj.sell_sls_cnrc_no,
        key rodr_esmt_ym,
        dp_no,
        prj_nm,
        cstco_rid,
        cstco : Association to one mis_com_cstco
                                      on cstco.id = $self.cstco_rid,
        rodr_sctr_org_rid,
        rodr_sctr_org           : Association to one mis_com_org
                                      on rodr_sctr_org.id = $self.rodr_sctr_org_rid,
        rodr_hdqt_org_rid,
        rodr_hdqt_org           : Association to one mis_com_org
                                      on rodr_hdqt_org.id = $self.rodr_hdqt_org_rid,
        rodr_org_rid,
        rodr_org                : Association to one mis_com_org
                                      on rodr_org.id = $self.rodr_org_rid,
        sale_sctr_org_rid,
        sale_sctr_org           : Association to one mis_com_org
                                      on sale_sctr_org.id = $self.sale_sctr_org_rid,
        sale_hdqt_org_rid,
        sale_hdqt_org           : Association to one mis_com_org
                                      on sale_hdqt_org.id = $self.sale_hdqt_org_rid,
        sale_org_rid,
        sale_org                : Association to one mis_com_org
                                      on sale_org.id = $self.sale_org_rid,
        rodr_cnrc_ym,
        prj_prfm_end_dt,
        prj_prfm_str_dt,
        new_crov_div_rcid,
        new_crov_div            : Association to one mis_com_ctgr
                                      on  new_crov_div.prnt_ctgr_id = '200358'
                                      and new_crov_div.id           = $self.new_crov_div_rcid,
        prj_scr_yn,
        ovse_biz_yn,
        relsco_yn,
        cnvg_biz_yn,
        prj_tp_rcid,
        prj_tp                  : Association to one mis_com_ctgr
                                      on  prj_tp.prnt_ctgr_id = '100024'
                                      and prj_tp.id           = $self.prj_tp_rcid,
        si_os_div_rcid,
        si_os_div               : Association to one mis_com_ctgr
                                      on  si_os_div.prnt_ctgr_id = '200364'
                                      and si_os_div.id           = $self.si_os_div_rcid,
        dp_knd_cd,
        dev_aplt_dgtr_tech_rcid,
        dev_aplt_dgtr_tech      : Association to one mis_com_ctgr
                                      on  dev_aplt_dgtr_tech.prnt_ctgr_id = '200086'
                                      and dev_aplt_dgtr_tech.id           = $self.dev_aplt_dgtr_tech_rcid,
        brand_nm,
        dp_nm,
        bd_n1_rid,
        bd_n2_rid,
        bd_n3_rid,
        bd_n4_rid,
        bd_n5_rid,
        bd_n6_rid,
        itsm_div_rcid,
        itsm_div                : Association to one mis_com_ctgr
                                      on  itsm_div.prnt_ctgr_id = '200368'
                                      and itsm_div.id           = $self.itsm_div_rcid,
        dblbk_sctr_org_rid,
        dblbk_sctr_org          : Association to one mis_com_org
                                      on dblbk_sctr_org.id = $self.dblbk_sctr_org_rid,
        dblbk_hdqt_org_rid,
        dblbk_hdqt_org          : Association to one mis_com_org
                                      on dblbk_hdqt_org.id = $self.dblbk_hdqt_org_rid,
        dblbk_org_rid,
        dblbk_org               : Association to one mis_com_org
                                      on dblbk_org.id = $self.dblbk_org_rid,
        dblbk_sale_yn,
        rskel_yn,
        cnrc_rskel_cd,
        rskel_tp_rcid,
        excp_logic_clf_rcid,
        excp_logic_clf          : Association to one mis_com_ctgr
                                      on  excp_logic_clf.prnt_ctgr_id = '200678'
                                      and excp_logic_clf.id           = $self.excp_logic_clf_rcid,
        excp_sale_logic_nm,
        excp_sale_logic_desc,
        sctr_dcid_yn,
        sctr_dcid_dt,
        hdqt_dcid_yn,
        hdqt_dcid_dt,
        aco_dcid_yn,
        aco_dcid_dt,
        ver_no,
        org_pfls_dcid_yn,
        dgtr_tp_rcid,
        dgtr_tp                 : Association to one mis_com_ctgr
                                      on  dgtr_tp.prnt_ctgr_id = '200205'
                                      and dgtr_tp.id           = $self.dgtr_tp_rcid,
        dpd_brand_dp_rid,
        src_div_rcid,
        crrn_yn,
        sls_prfm_str_dt,
        sls_prfm_end_dt,
        rmk_cntt,
        team_unt_nm,
        prfm_prjm_rid,
        prfm_prjm               : Association to one mis_com_emp
                                      on prfm_prjm.id = $self.prfm_prjm_rid,
        org_ver_rid,
        esmt_src_div_cd,
        esmt_src_trgt_cd,
        dev_aplt_dgtr_tech_nm,
        rskel_grd_rcid,
        rskel_grd               : Association to one mis_com_ctgr
                                      on  rskel_grd.prnt_ctgr_id = '1500084'
                                      and rskel_grd.id           = $self.rskel_grd_rcid,
        crrn_sno,
        end_prclm_dt,
        qttn_trg_no,
        qttn_pblsh_no,
        crrn_trg_no,
        crrn_cnrc_no,
        rspb_sls_org_rid,
        account_rid,
        erp_stts_cd,

        sale.year as sale_year,
        sale.sale_n1_mm_amt,
        sale.sale_n2_mm_amt,
        sale.sale_n3_mm_amt,
        sale.sale_n4_mm_amt,
        sale.sale_n5_mm_amt,
        sale.sale_n6_mm_amt,
        sale.sale_n7_mm_amt,
        sale.sale_n8_mm_amt,
        sale.sale_n9_mm_amt,
        sale.sale_n10_mm_amt,
        sale.sale_n11_mm_amt,
        sale.sale_n12_mm_amt,
        sale.sale_n1_qtr_amt,
        sale.sale_n2_qtr_amt,
        sale.sale_n3_qtr_amt,
        sale.sale_n4_qtr_amt,
        sale.sale_year_amt,

        order.year as order_year,
        order.rodr_n1_mm_amt,
        order.rodr_n2_mm_amt,
        order.rodr_n3_mm_amt,
        order.rodr_n4_mm_amt,
        order.rodr_n5_mm_amt,
        order.rodr_n6_mm_amt,
        order.rodr_n7_mm_amt,
        order.rodr_n8_mm_amt,
        order.rodr_n9_mm_amt,
        order.rodr_n10_mm_amt,
        order.rodr_n11_mm_amt,
        order.rodr_n12_mm_amt,
        order.rodr_n1_qtr_amt,
        order.rodr_n2_qtr_amt,
        order.rodr_n3_qtr_amt,
        order.rodr_n4_qtr_amt,
        order.rodr_year_amt,

        cos.year as cos_year,
        cos.prj_prfm_n1_mm_amt,
        cos.prj_prfm_n2_mm_amt,
        cos.prj_prfm_n3_mm_amt,
        cos.prj_prfm_n4_mm_amt,
        cos.prj_prfm_n5_mm_amt,
        cos.prj_prfm_n6_mm_amt,
        cos.prj_prfm_n7_mm_amt,
        cos.prj_prfm_n8_mm_amt,
        cos.prj_prfm_n9_mm_amt,
        cos.prj_prfm_n10_mm_amt,
        cos.prj_prfm_n11_mm_amt,
        cos.prj_prfm_n12_mm_amt,
        cos.prj_prfm_n1_qtr_amt,
        cos.prj_prfm_n2_qtr_amt,
        cos.prj_prfm_n3_qtr_amt,
        cos.prj_prfm_n4_qtr_amt,
        cos.prj_prfm_year_amt,

        rmdr.year as rmdr_year,
        rmdr.rmdr_sale_n1_mm_amt,
        rmdr.rmdr_sale_n2_mm_amt,
        rmdr.rmdr_sale_n3_mm_amt,
        rmdr.rmdr_sale_n4_mm_amt,
        rmdr.rmdr_sale_n5_mm_amt,
        rmdr.rmdr_sale_n6_mm_amt,
        rmdr.rmdr_sale_n7_mm_amt,
        rmdr.rmdr_sale_n8_mm_amt,
        rmdr.rmdr_sale_n9_mm_amt,
        rmdr.rmdr_sale_n10_mm_amt,
        rmdr.rmdr_sale_n11_mm_amt,
        rmdr.rmdr_sale_n12_mm_amt,
        rmdr.rmdr_sale_n1_qtr_amt,
        rmdr.rmdr_sale_n2_qtr_amt,
        rmdr.rmdr_sale_n3_qtr_amt,
        rmdr.rmdr_sale_n4_qtr_amt,
        rmdr.rmdr_sale_year_amt
    } where NOT(rmdr_sale_year_amt = 0 and prj_prfm_year_amt = 0 and rodr_year_amt = 0 and sale_year_amt = 0);

    view mis_project_with_order_view as select from mis_project as prj
    left outer join mis_order_amount_view as order
    on prj.prj_no = order.prj_no and prj.sell_sls_cnrc_no = order.sell_sls_cnrc_no
    {
        key prj.prj_no,
        key prj.sell_sls_cnrc_no,
        sale_sctr_org_rid,
        sale_hdqt_org_rid,
        sale_org_rid,
        rodr_esmt_ym,
        rodr_cnrc_ym,
        order.year as order_year,
        order.month as order_month,
        order.amount as order_amount
    };

    view mis_project_with_cos_view as select from mis_project as prj
    left outer join mis_cos_amount_view as cos
    on prj.prj_no = cos.prj_no and prj.sell_sls_cnrc_no = cos.sell_sls_cnrc_no
    {
        key prj.prj_no,
        key prj.sell_sls_cnrc_no,
        sale_sctr_org_rid,
        sale_hdqt_org_rid,
        sale_org_rid,
        rodr_esmt_ym,
        rodr_cnrc_ym,
        cos.year as cos_year,
        cos.month as cos_month,
        cos.amount as cos_amount
    };

    view mis_project_with_sale_view as select from mis_project as prj
    left outer join mis_sale_amount_view as sale
    on prj.prj_no = sale.prj_no and prj.sell_sls_cnrc_no = sale.sell_sls_cnrc_no
    {
        key prj.prj_no,
        key prj.sell_sls_cnrc_no,
        sale_sctr_org_rid,
        sale_hdqt_org_rid,
        sale_org_rid,
        rodr_esmt_ym,
        rodr_cnrc_ym,
        sale.year as sale_year,
        sale.month as sale_month,
        sale.amount as sale_amount
    };

        view mis_target_sale_amount_view as select from
    (
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '01' as month : String(2),
            sale_n1_mm_amt as amount,
            sale_n1_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n1_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '02' as month : String(2),
            sale_n2_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n2_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '03' as month : String(2),
            sale_n3_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n3_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '04' as month : String(2),
            sale_n4_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n4_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '05' as month : String(2),
            sale_n5_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n5_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '06' as month : String(2),
            sale_n6_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n6_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '07' as month : String(2),
            sale_n7_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n7_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '08' as month : String(2),
            sale_n8_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n8_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '09' as month : String(2),
            sale_n9_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n9_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '10' as month : String(2),
            sale_n10_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt+sale_n10_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n10_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '11' as month : String(2),
            sale_n11_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt+sale_n10_mm_amt+sale_n11_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n11_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '12' as month : String(2),
            sale_n12_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt+sale_n10_mm_amt+sale_n11_mm_amt+sale_n12_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n12_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
    )
    {
        key prj_no,
        key sell_sls_cnrc_no,
        substring(rodr_esmt_ym, 1, 4) as year : String(4),
        month,
        amount,
        sum_amount,
        true as final_yn : Boolean
    };

    view mis_target_cos_amount_view as select from
    (
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '01' as month : String(2),
            prj_prfm_n1_mm_amt as amount,
            prj_prfm_n1_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n1_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '02' as month : String(2),
            prj_prfm_n2_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n2_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '03' as month : String(2),
            prj_prfm_n3_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n3_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '04' as month : String(2),
            prj_prfm_n4_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n4_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '05' as month : String(2),
            prj_prfm_n5_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n5_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '06' as month : String(2),
            prj_prfm_n6_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n6_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '07' as month : String(2),
            prj_prfm_n7_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n7_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '08' as month : String(2),
            prj_prfm_n8_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n8_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '09' as month : String(2),
            prj_prfm_n9_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n9_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '10' as month : String(2),
            prj_prfm_n10_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt+prj_prfm_n10_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n10_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '11' as month : String(2),
            prj_prfm_n11_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt+prj_prfm_n10_mm_amt+prj_prfm_n11_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n11_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '12' as month : String(2),
            prj_prfm_n12_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt+prj_prfm_n10_mm_amt+prj_prfm_n11_mm_amt+prj_prfm_n12_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n12_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
    )
    {
        key prj_no,
        key sell_sls_cnrc_no,
        substring(rodr_esmt_ym, 1, 4) as year : String(4),
        month,
        amount,
        sum_amount,
        true as final_yn : Boolean
    };

    view mis_cos_amount_view as select from
    (
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '01' as month : String(2),
            prj_prfm_n1_mm_amt as amount,
            prj_prfm_n1_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n1_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '02' as month : String(2),
            prj_prfm_n2_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n2_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '03' as month : String(2),
            prj_prfm_n3_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n3_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '04' as month : String(2),
            prj_prfm_n4_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n4_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '05' as month : String(2),
            prj_prfm_n5_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n5_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '06' as month : String(2),
            prj_prfm_n6_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n6_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '07' as month : String(2),
            prj_prfm_n7_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n7_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '08' as month : String(2),
            prj_prfm_n8_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n8_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '09' as month : String(2),
            prj_prfm_n9_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n9_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '10' as month : String(2),
            prj_prfm_n10_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt+prj_prfm_n10_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n10_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '11' as month : String(2),
            prj_prfm_n11_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt+prj_prfm_n10_mm_amt+prj_prfm_n11_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n11_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '12' as month : String(2),
            prj_prfm_n12_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt+prj_prfm_n10_mm_amt+prj_prfm_n11_mm_amt+prj_prfm_n12_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n12_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
    )
    {
        key prj_no,
        key sell_sls_cnrc_no,
        substring(rodr_esmt_ym, 1, 4) as year : String(4),
        month,
        amount,
        sum_amount,
        true as final_yn : Boolean
    };
    view mis_order_amount_view as select from
    (
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '01' as month : String(2),
            rodr_n1_mm_amt as amount,
            rodr_n1_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n1_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '02' as month : String(2),
            rodr_n2_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n2_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '03' as month : String(2),
            rodr_n3_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n3_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '04' as month : String(2),
            rodr_n4_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n4_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '05' as month : String(2),
            rodr_n5_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n5_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '06' as month : String(2),
            rodr_n6_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt+rodr_n6_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n6_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '07' as month : String(2),
            rodr_n7_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt+rodr_n6_mm_amt
            +rodr_n7_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n7_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '08' as month : String(2),
            rodr_n8_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt+rodr_n6_mm_amt
            +rodr_n7_mm_amt+rodr_n8_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n8_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '09' as month : String(2),
            rodr_n9_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt+rodr_n6_mm_amt
            +rodr_n7_mm_amt+rodr_n8_mm_amt+rodr_n9_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n9_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '10' as month : String(2),
            rodr_n10_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt+rodr_n6_mm_amt
            +rodr_n7_mm_amt+rodr_n8_mm_amt+rodr_n9_mm_amt+rodr_n10_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n10_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '11' as month : String(2),
            rodr_n11_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt+rodr_n6_mm_amt
            +rodr_n7_mm_amt+rodr_n8_mm_amt+rodr_n9_mm_amt+rodr_n10_mm_amt+rodr_n11_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n11_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '12' as month : String(2),
            rodr_n12_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt+rodr_n6_mm_amt
            +rodr_n7_mm_amt+rodr_n8_mm_amt+rodr_n9_mm_amt+rodr_n10_mm_amt+rodr_n11_mm_amt+rodr_n12_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n12_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
    )
    {
        key prj_no,
        key sell_sls_cnrc_no,
        substring(rodr_esmt_ym, 1, 4) as year : String(4),
        month,
        amount,
        sum_amount,
        true as final_yn : Boolean
    };
    view mis_sale_amount_view as select from
    (
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '01' as month : String(2),
            sale_n1_mm_amt as amount,
            sale_n1_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n1_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '02' as month : String(2),
            sale_n2_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n2_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '03' as month : String(2),
            sale_n3_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n3_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '04' as month : String(2),
            sale_n4_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n4_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '05' as month : String(2),
            sale_n5_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n5_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '06' as month : String(2),
            sale_n6_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n6_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '07' as month : String(2),
            sale_n7_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n7_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '08' as month : String(2),
            sale_n8_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n8_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '09' as month : String(2),
            sale_n9_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n9_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '10' as month : String(2),
            sale_n10_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt+sale_n10_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n10_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '11' as month : String(2),
            sale_n11_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt+sale_n10_mm_amt+sale_n11_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n11_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '12' as month : String(2),
            sale_n12_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt+sale_n10_mm_amt+sale_n11_mm_amt+sale_n12_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n12_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
    )
    {
        key prj_no,
        key sell_sls_cnrc_no,
        substring(rodr_esmt_ym, 1, 4) as year : String(4),
        month,
        amount,
        sum_amount,
        true as final_yn : Boolean
    };

    view mis_rmdr_amount_view as select from
    (
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '01' as month : String(2),
            rmdr_sale_n1_mm_amt as amount,
            rmdr_sale_n1_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n1_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '02' as month : String(2),
            rmdr_sale_n2_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n2_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '03' as month : String(2),
            rmdr_sale_n3_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n3_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '04' as month : String(2),
            rmdr_sale_n4_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n4_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '05' as month : String(2),
            rmdr_sale_n5_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n5_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '06' as month : String(2),
            rmdr_sale_n6_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt+rmdr_sale_n6_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n6_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '07' as month : String(2),
            rmdr_sale_n7_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt+rmdr_sale_n6_mm_amt
            +rmdr_sale_n7_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n7_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '08' as month : String(2),
            rmdr_sale_n8_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt+rmdr_sale_n6_mm_amt
            +rmdr_sale_n7_mm_amt+rmdr_sale_n8_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n8_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '09' as month : String(2),
            rmdr_sale_n9_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt+rmdr_sale_n6_mm_amt
            +rmdr_sale_n7_mm_amt+rmdr_sale_n8_mm_amt+rmdr_sale_n9_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n9_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '10' as month : String(2),
            rmdr_sale_n10_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt+rmdr_sale_n6_mm_amt
            +rmdr_sale_n7_mm_amt+rmdr_sale_n8_mm_amt+rmdr_sale_n9_mm_amt+rmdr_sale_n10_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n10_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '11' as month : String(2),
            rmdr_sale_n11_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt+rmdr_sale_n6_mm_amt
            +rmdr_sale_n7_mm_amt+rmdr_sale_n8_mm_amt+rmdr_sale_n9_mm_amt+rmdr_sale_n10_mm_amt+rmdr_sale_n11_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n11_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '12' as month : String(2),
            rmdr_sale_n12_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt+rmdr_sale_n6_mm_amt
            +rmdr_sale_n7_mm_amt+rmdr_sale_n8_mm_amt+rmdr_sale_n9_mm_amt+rmdr_sale_n10_mm_amt+rmdr_sale_n11_mm_amt+rmdr_sale_n12_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n12_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
    )
    {
        key prj_no,
        key sell_sls_cnrc_no,
        substring(rodr_esmt_ym, 1, 4) as year : String(4),
        month,
        amount,
        sum_amount,
        true as final_yn : Boolean
    };  
    
    entity mis_project_sheet_expand_view(id : String(20)) as select from mis_project_sheet_view as mis_project_sheet_view
    inner join mis_com_cstco as mis_com_cstco on mis_project_sheet_view.cstco_rid = mis_com_cstco.id
    inner join mis_get_org_descendant(id: :id, use_yn: null) as mis_get_org_descendant on mis_project_sheet_view.sale_org_rid = mis_get_org_descendant.id
    {
        key prj_no                  : String(13)    @title: '수행계획코드' @UI.alignment: 'Center',
        key sell_sls_cnrc_no        : String(15)    @title: '영업기회/계약번호' @UI.alignment: 'Center',
        key rodr_esmt_ym            : String(6)     @title: '수주_추정_년월',
            substr(rodr_esmt_ym, 1, 4) as rodr_esmt_y             : String(4)     @title: '추정년도',
            dp_no                   : String(20)    @title: 'DP_번호',
            prj_nm                  : String(300)   @title: '프로젝트명' @UI.alignment: 'Begin',
            cstco_rid               : String(20)    @title: '고객사_RID',
            cstco_nm                : String(300)   @title: '고객사' @UI.alignment: 'Begin',
            rodr_sctr_org_rid       : String(20)    @title: '수주_부문_조직_RID',
            (
                select org_kor_nm
                from mis_com_org
                where mis_com_org.id = mis_project_sheet_view.rodr_sctr_org_rid
            ) as rodr_sctr_org_nm        : String(300)   @title: '수주부문' @UI.alignment: 'Begin',
            rodr_hdqt_org_rid       : String(20)    @title: '수주_본부_조직_RID',
            (
                select org_kor_nm
                from mis_com_org
                where mis_com_org.id = mis_project_sheet_view.rodr_hdqt_org_rid
            ) as rodr_hdqt_org_nm        : String(300)   @title: '수주본부' @UI.alignment: 'Begin',
            rodr_org_rid            : String(20)    @title: '수주_조직_RID',
            (
                select org_kor_nm
                from mis_com_org
                where mis_com_org.id = mis_project_sheet_view.rodr_org_rid
            ) as rodr_org_nm             : String(300)   @title: '수주조직' @UI.alignment: 'Begin',
            sale_sctr_org_rid       : String(20)    @title: '매출_부문_조직_RID',
            (
                select org_kor_nm
                from mis_com_org
                where mis_com_org.id = mis_project_sheet_view.sale_sctr_org_rid
            ) as sale_sctr_org_nm        : String(300)   @title: '매출부문' @UI.alignment: 'Begin',
            sale_hdqt_org_rid       : String(20)    @title: '매출_본부_조직_RID',
            (
                select org_kor_nm
                from mis_com_org
                where mis_com_org.id = mis_project_sheet_view.sale_hdqt_org_rid
            ) as sale_hdqt_org_nm        : String(300)   @title: '매출본부' @UI.alignment: 'Begin',
            sale_org_rid            : String(20)    @title: '매출_조직_RID',
            (
                select org_kor_nm
                from mis_com_org
                where mis_com_org.id = mis_project_sheet_view.sale_org_rid
            ) as sale_org_nm             : String(300)   @title: '매출조직' @UI.alignment: 'Begin',
            rodr_cnrc_ym            : String(6)     @title: '수주계약년월' @UI.alignment: 'Center',
            prj_prfm_end_dt         : Date          @title: '종료일' @UI.alignment: 'Center' @UI.header: '프로젝트 수행기간',
            prj_prfm_str_dt         : Date          @title: '시작일' @UI.alignment: 'Center' @UI.header: '프로젝트 수행기간',
            new_crov_div_rcid       : String(20)    @title: '신규_이월_구분_RCID',
            (
                select ctgr_titl_nm
                from mis_com_ctgr
                where prnt_ctgr_id = '200358'
                and id = mis_project_sheet_view.new_crov_div_rcid
            ) as new_crov_div_nm         : String(300)   @title: '신규/이월 구분' @UI.alignment: 'Center',
            prj_scr_yn              : Boolean       @title: '확보여부' @UI.alignment: 'Center',
            ovse_biz_yn             : Boolean       @title: '해외 사업여부' @UI.alignment: 'Center',
            mis_project_sheet_view.relsco_yn               : Boolean       @title: '관계사 여부' @UI.alignment: 'Center',
            cnvg_biz_yn             : Boolean       @title: '융복합사업 여부' @UI.alignment: 'Center',
            prj_tp_rcid             : String(20)    @title: '프로젝트_유형_RCID',
            (
                select ctgr_titl_nm
                from mis_com_ctgr
                where prnt_ctgr_id = '100024'
                and id = mis_project_sheet_view.prj_tp_rcid
            ) as prj_tp_nm               : String(300)   @title: '프로젝트 유형' @UI.alignment: 'Center',
            si_os_div_rcid          : String(20)    @title: 'SI_OS_구분_RCID',
            (
                select ctgr_titl_nm
                from mis_com_ctgr
                where prnt_ctgr_id = '200364'
                and id = mis_project_sheet_view.si_os_div_rcid
            ) as si_os_div_nm            : String(300)   @title: 'SI/OS 구분' @UI.alignment: 'Center',
            dp_knd_cd               : String(50)    @title: 'DP_종류_코드',
            dev_aplt_dgtr_tech_rcid : String(20)    @title: '개발_적용_DT_기술_RCI',
            dev_aplt_dgtr_tech_nm   : String(300)   @title: '적용 기술' @UI.alignment: 'Begin' @UI.header: '브랜드 체계',
            brand_nm                : String(300)   @title: '브랜드명' @UI.alignment: 'Begin' @UI.header: '브랜드 체계',
            dp_nm                   : String(300)   @title: 'DP명' @UI.alignment: 'Begin' @UI.header: '브랜드 체계',
            bd_n1_rid               : String(20)    @title: 'BD1' @UI.alignment: 'Begin' @UI.header: '매출 Biz Domain',
            bd_n2_rid               : String(20)    @title: 'BD2' @UI.alignment: 'Begin' @UI.header: '매출 Biz Domain',
            bd_n3_rid               : String(20)    @title: 'BD3' @UI.alignment: 'Begin' @UI.header: '매출 Biz Domain',
            bd_n4_rid               : String(20)    @title: 'BD4' @UI.alignment: 'Begin' @UI.header: '매출 Biz Domain',
            bd_n5_rid               : String(20)    @title: 'BD5' @UI.alignment: 'Begin' @UI.header: '매출 Biz Domain',
            bd_n6_rid               : String(20)    @title: 'BD6' @UI.alignment: 'Begin' @UI.header: '매출 Biz Domain',
            itsm_div_rcid           : String(20)    @title: 'ITSM_구분_RCID',
            (
                select ctgr_titl_nm
                from mis_com_ctgr
                where prnt_ctgr_id = '200368'
                and id = mis_project_sheet_view.itsm_div_rcid
            ) as itsm_div_nm             : String(300)   @title: 'ITSM 구분' @UI.alignment: 'Center',
            rodr_n1_mm_amt          : Decimal       @title: '1월' @UI.alignment: 'End' @UI.header: '수주 월별금액',
            rodr_n2_mm_amt          : Decimal       @title: '2월' @UI.alignment: 'End' @UI.header: '수주 월별금액',
            rodr_n3_mm_amt          : Decimal       @title: '3월' @UI.alignment: 'End' @UI.header: '수주 월별금액',
            rodr_n4_mm_amt          : Decimal       @title: '4월' @UI.alignment: 'End' @UI.header: '수주 월별금액',
            rodr_n5_mm_amt          : Decimal       @title: '5월' @UI.alignment: 'End' @UI.header: '수주 월별금액',
            rodr_n6_mm_amt          : Decimal       @title: '6월' @UI.alignment: 'End' @UI.header: '수주 월별금액',
            rodr_n7_mm_amt          : Decimal       @title: '7월' @UI.alignment: 'End' @UI.header: '수주 월별금액',
            rodr_n8_mm_amt          : Decimal       @title: '8월' @UI.alignment: 'End' @UI.header: '수주 월별금액',
            rodr_n9_mm_amt          : Decimal       @title: '9월' @UI.alignment: 'End' @UI.header: '수주 월별금액',
            rodr_n10_mm_amt         : Decimal       @title: '10월' @UI.alignment: 'End' @UI.header: '수주 월별금액',
            rodr_n11_mm_amt         : Decimal       @title: '11월' @UI.alignment: 'End' @UI.header: '수주 월별금액',
            rodr_n12_mm_amt         : Decimal       @title: '12월' @UI.alignment: 'End' @UI.header: '수주 월별금액',
            rodr_n1_qtr_amt         : Decimal       @title: '1Q' @UI.alignment: 'End' @UI.header: '수주 1Q~4Q금액',
            rodr_n2_qtr_amt         : Decimal       @title: '2Q' @UI.alignment: 'End' @UI.header: '수주 1Q~4Q금액',
            rodr_n3_qtr_amt         : Decimal       @title: '3Q' @UI.alignment: 'End' @UI.header: '수주 1Q~4Q금액',
            rodr_n4_qtr_amt         : Decimal       @title: '4Q' @UI.alignment: 'End' @UI.header: '수주 1Q~4Q금액',
            rodr_year_amt           : Decimal       @title: '연간 수주금액' @UI.alignment: 'End',
            sale_n1_mm_amt          : Decimal       @title: '1월' @UI.alignment: 'End' @UI.header: '매출 월별금액',
            sale_n2_mm_amt          : Decimal       @title: '2월' @UI.alignment: 'End' @UI.header: '매출 월별금액',
            sale_n3_mm_amt          : Decimal       @title: '3월' @UI.alignment: 'End' @UI.header: '매출 월별금액',
            sale_n4_mm_amt          : Decimal       @title: '4월' @UI.alignment: 'End' @UI.header: '매출 월별금액',
            sale_n5_mm_amt          : Decimal       @title: '5월' @UI.alignment: 'End' @UI.header: '매출 월별금액',
            sale_n6_mm_amt          : Decimal       @title: '6월' @UI.alignment: 'End' @UI.header: '매출 월별금액',
            sale_n7_mm_amt          : Decimal       @title: '7월' @UI.alignment: 'End' @UI.header: '매출 월별금액',
            sale_n8_mm_amt          : Decimal       @title: '8월' @UI.alignment: 'End' @UI.header: '매출 월별금액',
            sale_n9_mm_amt          : Decimal       @title: '9월' @UI.alignment: 'End' @UI.header: '매출 월별금액',
            sale_n10_mm_amt         : Decimal       @title: '10월' @UI.alignment: 'End' @UI.header: '매출 월별금액',
            sale_n11_mm_amt         : Decimal       @title: '11월' @UI.alignment: 'End' @UI.header: '매출 월별금액',
            sale_n12_mm_amt         : Decimal       @title: '12월' @UI.alignment: 'End' @UI.header: '매출 월별금액',
            sale_n1_qtr_amt         : Decimal       @title: '1Q' @UI.alignment: 'End' @UI.header: '매출 1Q~4Q금액',
            sale_n2_qtr_amt         : Decimal       @title: '2Q' @UI.alignment: 'End' @UI.header: '매출 1Q~4Q금액',
            sale_n3_qtr_amt         : Decimal       @title: '3Q' @UI.alignment: 'End' @UI.header: '매출 1Q~4Q금액',
            sale_n4_qtr_amt         : Decimal       @title: '4Q' @UI.alignment: 'End' @UI.header: '매출 1Q~4Q금액',
            sale_year_amt           : Decimal       @title: '연간 매출금액' @UI.alignment: 'End',
            prj_prfm_n1_mm_amt      : Decimal       @title: '1월' @UI.alignment: 'End' @UI.header: '프로젝트 월별수행금액',
            prj_prfm_n2_mm_amt      : Decimal       @title: '2월' @UI.alignment: 'End' @UI.header: '프로젝트 월별수행금액',
            prj_prfm_n3_mm_amt      : Decimal       @title: '3월' @UI.alignment: 'End' @UI.header: '프로젝트 월별수행금액',
            prj_prfm_n4_mm_amt      : Decimal       @title: '4월' @UI.alignment: 'End' @UI.header: '프로젝트 월별수행금액',
            prj_prfm_n5_mm_amt      : Decimal       @title: '5월' @UI.alignment: 'End' @UI.header: '프로젝트 월별수행금액',
            prj_prfm_n6_mm_amt      : Decimal       @title: '6월' @UI.alignment: 'End' @UI.header: '프로젝트 월별수행금액',
            prj_prfm_n7_mm_amt      : Decimal       @title: '7월' @UI.alignment: 'End' @UI.header: '프로젝트 월별수행금액',
            prj_prfm_n8_mm_amt      : Decimal       @title: '8월' @UI.alignment: 'End' @UI.header: '프로젝트 월별수행금액',
            prj_prfm_n9_mm_amt      : Decimal       @title: '9월' @UI.alignment: 'End' @UI.header: '프로젝트 월별수행금액',
            prj_prfm_n10_mm_amt     : Decimal       @title: '10월' @UI.alignment: 'End' @UI.header: '프로젝트 월별수행금액',
            prj_prfm_n11_mm_amt     : Decimal       @title: '11월' @UI.alignment: 'End' @UI.header: '프로젝트 월별수행금액',
            prj_prfm_n12_mm_amt     : Decimal       @title: '12월' @UI.alignment: 'End' @UI.header: '프로젝트 월별수행금액',
            prj_prfm_n1_qtr_amt     : Decimal       @title: '1Q' @UI.alignment: 'End' @UI.header: '프로젝트 1Q~4Q수행금액',
            prj_prfm_n2_qtr_amt     : Decimal       @title: '2Q' @UI.alignment: 'End' @UI.header: '프로젝트 1Q~4Q수행금액',
            prj_prfm_n3_qtr_amt     : Decimal       @title: '3Q' @UI.alignment: 'End' @UI.header: '프로젝트 1Q~4Q수행금액',
            prj_prfm_n4_qtr_amt     : Decimal       @title: '4Q' @UI.alignment: 'End' @UI.header: '프로젝트 1Q~4Q수행금액',
            prj_prfm_year_amt       : Decimal       @title: '연간프로젝트 수행비용' @UI.alignment: 'End',
            rmdr_sale_n1_mm_amt     : Decimal       @title: '1월' @UI.alignment: 'End' @UI.header: '잔여매출 월별금액',
            rmdr_sale_n2_mm_amt     : Decimal       @title: '2월' @UI.alignment: 'End' @UI.header: '잔여매출 월별금액',
            rmdr_sale_n3_mm_amt     : Decimal       @title: '3월' @UI.alignment: 'End' @UI.header: '잔여매출 월별금액',
            rmdr_sale_n4_mm_amt     : Decimal       @title: '4월' @UI.alignment: 'End' @UI.header: '잔여매출 월별금액',
            rmdr_sale_n5_mm_amt     : Decimal       @title: '5월' @UI.alignment: 'End' @UI.header: '잔여매출 월별금액',
            rmdr_sale_n6_mm_amt     : Decimal       @title: '6월' @UI.alignment: 'End' @UI.header: '잔여매출 월별금액',
            rmdr_sale_n7_mm_amt     : Decimal       @title: '7월' @UI.alignment: 'End' @UI.header: '잔여매출 월별금액',
            rmdr_sale_n8_mm_amt     : Decimal       @title: '8월' @UI.alignment: 'End' @UI.header: '잔여매출 월별금액',
            rmdr_sale_n9_mm_amt     : Decimal       @title: '9월' @UI.alignment: 'End' @UI.header: '잔여매출 월별금액',
            rmdr_sale_n10_mm_amt    : Decimal       @title: '10월' @UI.alignment: 'End' @UI.header: '잔여매출 월별금액',
            rmdr_sale_n11_mm_amt    : Decimal       @title: '11월' @UI.alignment: 'End' @UI.header: '잔여매출 월별금액',
            rmdr_sale_n12_mm_amt    : Decimal       @title: '12월' @UI.alignment: 'End' @UI.header: '잔여매출 월별금액',
            rmdr_sale_n1_qtr_amt    : Decimal       @title: '1Q' @UI.alignment: 'End' @UI.header: '잔여매출 1Q~4Q금액',
            rmdr_sale_n2_qtr_amt    : Decimal       @title: '2Q' @UI.alignment: 'End' @UI.header: '잔여매출 1Q~4Q금액',
            rmdr_sale_n3_qtr_amt    : Decimal       @title: '3Q' @UI.alignment: 'End' @UI.header: '잔여매출 1Q~4Q금액',
            rmdr_sale_n4_qtr_amt    : Decimal       @title: '4Q' @UI.alignment: 'End' @UI.header: '잔여매출 1Q~4Q금액',
            rmdr_sale_year_amt      : Decimal       @title: '연간 잔여매출금액' @UI.alignment: 'End',
            dblbk_sctr_org_rid      : String(20)    @title: '더블부킹_부문_조직_RID',
            (
                select org_kor_nm
                from mis_com_org
                where mis_com_org.id = mis_project_sheet_view.dblbk_sctr_org_rid
            ) as dblbk_sctr_org_nm       : String(300)   @title: 'DB부문' @UI.alignment: 'Begin' @UI.header: '더블부킹 정보',
            dblbk_hdqt_org_rid      : String(20)    @title: '더블부킹_본부_조직_RID',
            (
                select org_kor_nm
                from mis_com_org
                where mis_com_org.id = mis_project_sheet_view.dblbk_hdqt_org_rid
            ) as dblbk_hdqt_org_nm       : String(300)   @title: 'DB본부' @UI.alignment: 'Begin' @UI.header: '더블부킹 정보',
            dblbk_org_rid           : String(20)    @title: '더블부킹_조직_RID',
            (
                select org_kor_nm
                from mis_com_org
                where mis_com_org.id = mis_project_sheet_view.dblbk_org_rid
            ) as dblbk_org_nm            : String(300)   @title: 'DB조직' @UI.alignment: 'Begin' @UI.header: '더블부킹 정보',
            dblbk_sale_yn           : Boolean       @title: 'DB매출여부' @UI.alignment: 'Center' @UI.header: '더블부킹 정보',
            rskel_yn                : Boolean       @title: '리스크 여부' @UI.alignment: 'Center',
            cnrc_rskel_cd           : String(50)    @title: '계약_리스크_코드',
            rskel_tp_rcid           : String(20)    @title: '리스크_유형_RCID',
            excp_logic_clf_rcid     : String(20)    @title: '예외_로직_분류_RCID',
            (
                select ctgr_titl_nm
                from mis_com_ctgr
                where prnt_ctgr_id = '200678'
                and id = mis_project_sheet_view.excp_logic_clf_rcid
            ) as excp_logic_clf_nm       : String(300)   @title: '예외매출로직유형' @UI.alignment: 'Center',
            excp_sale_logic_nm      : String(300)   @title: '예외_매출_로직_명',
            excp_sale_logic_desc    : String(4000)  @title: '예외_매출_로직_설명',
            sctr_dcid_yn            : Boolean       @title: '부문_확정_여부' @UI.alignment: 'Center',
            sctr_dcid_dt            : Date          @title: '부문_확정_일자',
            hdqt_dcid_yn            : Boolean       @title: '본부_확정_여부' @UI.alignment: 'Center',
            hdqt_dcid_dt            : Date          @title: '본부_확정_일자',
            aco_dcid_yn             : Boolean       @title: '전사_확정_여부' @UI.alignment: 'Center',
            aco_dcid_dt             : Date          @title: '전사_확정_일자',
            ver_no                  : Decimal       @title: '버전_번호',
            org_pfls_dcid_yn        : Boolean       @title: '조직_손익_확정_여부' @UI.alignment: 'Center',
            dgtr_tp_rcid            : String(20)    @title: 'DT_유형_RCID',
            (
                select ctgr_titl_nm
                from mis_com_ctgr
                where prnt_ctgr_id = '200205'
                and id = mis_project_sheet_view.dgtr_tp_rcid
            ) as dgtr_tp_nm              : String(300)   @title: 'DT Type' @UI.alignment: 'Center' @UI.header: '브랜드 체계',
            dpd_brand_dp_rid        : String(20)    @title: 'DPD_브랜드DP_RID',
            src_div_rcid            : String(20)    @title: '출처_구분_코드',
            crrn_yn                 : Boolean       @title: '보정_여부' @UI.alignment: 'Center',
            sls_prfm_str_dt         : Date          @title: '영업_수행_시작_일자',
            sls_prfm_end_dt         : Date          @title: '영업_수행_종료_일자',
            rmk_cntt                : String(4000)  @title: '비고' @UI.alignment: 'Begin',
            team_unt_nm             : String(300)   @title: '팀_단위_명',
            prfm_prjm_rid           : String(20)    @title: '수행_PM_RID',
            (
                select org_kor_nm
                from mis_com_org
                where mis_com_org.id = mis_project_sheet_view.prfm_prjm_rid
            ) as prfm_prjm_nm            : String(300)   @title: '수행PM' @UI.alignment: 'Center',
            org_ver_rid             : String(20)    @title: '조직_버전_RID',
            esmt_src_div_cd         : String(100)   @title: '',
            esmt_src_trgt_cd        : String(100)   @title: '',
            rskel_grd_rcid          : String(20)    @title: '리스크_등급_RCID',
            (
                select ctgr_titl_nm
                from mis_com_ctgr
                where prnt_ctgr_id = '1500084'
                and id = mis_project_sheet_view.rskel_grd_rcid
            ) as rskel_grd_nm            : String(300)   @title: '리스크 등급' @UI.alignment: 'Center',
            crrn_sno                : String(10)    @title: '',
            end_prclm_dt            : Date          @title: '',
            qttn_trg_no             : String(13)    @title: '견적_대상_번호',
            qttn_pblsh_no           : String(8)     @title: '견적_발행_번호',
            crrn_trg_no             : String(13)    @title: '보정_사업_번호',
            crrn_cnrc_no            : String(15)    @title: '보정_계약_번호',
            rspb_sls_org_rid        : String(20)    @title: '책임_영업_조직_rid',
            account_rid             : String(20)    @title: 'ACCOUNT_RID',
            erp_stts_cd             : String(5)     @title: 'ERP_상태_코드'
    }
}