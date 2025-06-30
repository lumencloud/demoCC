using common.version as common_version from '../../common/version';
using common.project as common_project from '../../common/project';
using pl.sfdc_contract as pl_sfdc_contract from '../../pl/sfdc_contract';
using common.project_platform as common_project_platform from '../../common/project_platform';
using common.code_item as common_code_item from '../../common/code';
using common.code_header as common_code_header from '../../common/code';
using common.project_biz_domain as common_project_biz_domain from '../../common/project_biz_domain';
using common.customer as common_customer from '../../common/customer';
using common.org_type as common_org_type from '../../common/org_type';
using common.account_customer_map as common_account_customer_map from '../../common/account';

namespace common;

/**
 * 프로젝트 마스터 데이터
 *
 * common_project (PROMIS + ERP + WG) <br/>
 * common_project_platform (PROMIS) <br/>
 * pl_sfdc_contract
 *
 *  ** ECC 구 고객코드 하드코딩 처리 **
 * 600441/ 한국지능정보사회진흥원/ 대외 (관계사 아님)
 * 600964 / 대한무역투자진흥공사 (KOTRA) / 대외 (관계사아님)
 * 600665 / 통계청/ 대외(관계사아님)
 */
view project_view as
        select from (
            select
                actual_prj.ver,
                actual_prj.prj_no,
                actual_prj.seq,
                actual_prj.prj_nm,
                actual_prj.cstco_cd,
                    case
                        when
                            ot_r.replace_ccorg_cd      is not null
                        then
                            ot_r.replace_ccorg_cd
                        else
                            actual_prj.rodr_ccorg_cd
                    end  as rodr_ccorg_cd     : String(10) @title: '수주 ERP Cost Center',
                    case
                        when
                            ot_s.replace_ccorg_cd      is not null
                        then
                            ot_s.replace_ccorg_cd
                        else
                            actual_prj.sale_ccorg_cd
                    end  as sale_ccorg_cd     : String(10) @title: '매출 ERP Cost Center',
                actual_prj.prj_prfm_str_dt,
                actual_prj.prj_prfm_end_dt,
                actual_prj.ovse_biz_yn,
                    case
                        when
                            actual_prj.relsco_yn       is     null
                            and customer.relsco_yn     is not null
                        then
                            customer.relsco_yn
                        when
                            substring(
                                actual_prj.cstco_cd, 5
                            )                          in     (
                                '600441', '600964', '600665'
                            )
                        then
                            false
                    // ECC 구 고객코드 하드코딩 처리
                    // 600441 / 한국지능정보사회진흥원/ 대외 (관계사 아님)
                    // 600964 / 대한무역투자진흥공사 (KOTRA) / 대외 (관계사아님)
                    // 600665 / 통계청/ 대외(관계사아님)
                        else
                            actual_prj.relsco_yn
                    end  as relsco_yn         : Boolean    @title: '관계사 여부',
                actual_prj.prj_tp_cd,
                actual_prj.itsm_div_yn,
                actual_prj.crov_div_yn,
                actual_prj.cnvg_biz_yn,
                actual_prj.dt_tp,
                actual_prj.tech_nm,
                actual_prj.brand_nm,
                actual_prj.quote_issue_no,
                actual_prj.quote_target_no,
                bd1.name as bd_n1_cd          : String(20),
                    case
                        when
                            bd_bix.bd_n2_cd            is not null
                        then
                            bd_bix.bd_n2_cd
                        when
                            bd2.name                   is not null
                        then
                            bd2.name
                        when
                            sfdc.bd_n2_cd              is not null
                        then
                            sfdc.bd_n2_cd
                        else
                            null
                    end  as bd_n2_cd          : String(20),
                bd_bix.bd_n3_cd,
                bd_bix.bd_n4_cd,
                bd_bix.bd_n5_cd,
                bd_bix.bd_n6_cd,
                sfdc.biz_opp_no_sfdc,
                    case
                        when
                            actual_prj.biz_opp_no      is     null
                            or actual_prj.biz_opp_no   =      ''
                        then
                            sfdc.biz_opp_no
                        else
                            actual_prj.biz_opp_no
                    end  as biz_opp_no        : String(30),
                sfdc.biz_opp_nm,
                sfdc.deal_stage_cd,
                sfdc.deal_stage_chg_dt,
                    case sfdc.dgtr_task_cd
                        when
                            ''
                        then
                            null
                        else
                            sfdc.dgtr_task_cd
                    end  as dgtr_task_cd      : String(30),
                    case
                        when
                            sfdc.biz_tp_account_cd     <>     ''
                            and sfdc.biz_tp_account_cd is not null
                        then
                            sfdc.biz_tp_account_cd
                        when
                            customer.biz_tp_account_cd is not null
                        then
                            customer.biz_tp_account_cd
                        else
                            account_map.biz_tp_account_cd
                    end  as biz_tp_account_cd : String(30) @title: 'Account 코드',
                sfdc.cls_rsn_tp_cd,
                sfdc.cls_rsn_tp_nm,
                sfdc.expected_contract_date,
                sfdc.margin_rate
            from (
                // common_project
                select
                    ver,
                    prj_no,
                    null as seq             : Integer,
                    prj_nm,
                    cstco_cd,
                    rodr_ccorg_cd,
                    sale_ccorg_cd,
                    prj_prfm_str_dt,
                    prj_prfm_end_dt,
                    ovse_biz_yn,
                    relsco_yn,
                    itsm_div_yn,
                    crov_div_yn,
                    biz_opp_no,
                    prj_tp_cd,
                    null as cnvg_biz_yn     : Boolean,
                    null as dt_tp           : String(20),
                    null as tech_nm         : String(40),
                    null as brand_nm        : String(100),
                    null as quote_issue_no  : String(20),
                    null as quote_target_no : String(20)
                from common_project
                where
                    ver in (
                        select ver from common_version
                        where
                            tag = 'C'
                    )
            union all
                // common_project_platform
                select
                    platform.ver,
                    platform.prj_no,
                    platform.seq,
                    platform.prj_nm,
                    platform.cstco_cd,
                    prj.rodr_ccorg_cd,
                    platform.sale_ccorg_cd,
                    prj.prj_prfm_str_dt,
                    prj.prj_prfm_end_dt,
                    prj.ovse_biz_yn,
                    prj.relsco_yn,
                    prj.itsm_div_yn,
                    prj.crov_div_yn,
                    platform.biz_opp_no,
                    platform.prj_tp_cd,
                    platform.cnvg_biz_yn,
                    platform.dt_tp,
                    platform.tech_nm,
                    platform.brand_nm,
                    platform.quote_issue_no,
                    platform.quote_target_no
                from common_project_platform as platform
                left join common_project as prj
                    on(
                               platform.ver             =  prj.ver
                        and    platform.prj_no          =  prj.prj_no
                        and (
                               platform.quote_target_no is null
                            or platform.quote_target_no =  ''
                        )
                    )
                    or (
                               platform.ver             =  prj.ver
                        and    platform.prj_no          <> prj.prj_no
                        and    platform.quote_target_no =  prj.prj_no
                    )
                where
                    platform.ver in (
                        select ver from common_version
                        where
                            tag = 'C'
                    )
            ) as actual_prj
            left join common_code_item as tp
                on(
                       upper(replace(
                        actual_prj.prj_tp_cd, ' ', ''
                    ))              = upper(replace(
                        tp.name, ' ', ''
                    ))
                    or upper(replace(
                        actual_prj.prj_tp_cd, ' ', ''
                    ))              = upper(replace(
                        tp.value, ' ', ''
                    ))
                    or upper(replace(
                        actual_prj.prj_tp_cd, ' ', ''
                    ))              = upper(replace(
                        tp.memo, ' ', ''
                    ))
                )
                and    tp.header.ID = (
                    select ID from common_code_header
                    where
                        upper(category) = 'PROJECT_TYPE'
                    limit 1
                )
            left join common_code_item as bd1
                on  tp.value_opt1     = bd1.value
                and tp.header_opt1.ID = bd1.header.ID
            left join common_code_item as bd2
                on  tp.value_opt2     = bd2.value
                and tp.header_opt2.ID = bd2.header.ID
            left join common_project_biz_domain as bd_bix
                on actual_prj.prj_no = bd_bix.prj_no
            left join (
                select
                    ver,
                    year,
                    prj_no,
                    biz_opp_no_sfdc,
                    biz_opp_no,
                    biz_opp_nm,
                    prj_tp_cd,
                    bd_n2_cd,
                    deal_stage_cd,
                    deal_stage_chg_dt,
                    dgtr_task_cd,
                    biz_tp_account_cd,
                    cls_rsn_tp_cd,
                    cls_rsn_tp_nm,
                    expected_contract_date,
                    margin_rate
                from pl_sfdc_contract
                where
                    (
                           prj_no <>     ''
                        or prj_no is not null
                    )
                    and    year   =      substring(
                        ver, 2, 4
                    )
            union all
                select
                    ver,
                    year,
                    prj_no_sfdc as prj_no,
                    biz_opp_no_sfdc,
                    biz_opp_no,
                    biz_opp_nm,
                    prj_tp_cd,
                    bd_n2_cd,
                    deal_stage_cd,
                    deal_stage_chg_dt,
                    dgtr_task_cd,
                    biz_tp_account_cd,
                    cls_rsn_tp_cd,
                    cls_rsn_tp_nm,
                    expected_contract_date,
                    margin_rate
                from pl_sfdc_contract
                where
                    (
                           prj_no      =      ''
                        or prj_no      is     null
                    )
                    and (
                           prj_no_sfdc <>     ''
                        or prj_no_sfdc is not null
                    )
                    and    year        =      substring(
                        ver, 2, 4
                    )
            union all
                select
                    ver,
                    year,
                    id as prj_no,
                    biz_opp_no_sfdc,
                    biz_opp_no,
                    biz_opp_nm,
                    prj_tp_cd,
                    bd_n2_cd,
                    deal_stage_cd,
                    deal_stage_chg_dt,
                    dgtr_task_cd,
                    biz_tp_account_cd,
                    cls_rsn_tp_cd,
                    cls_rsn_tp_nm,
                    expected_contract_date,
                    margin_rate
                from pl_sfdc_contract
                where
                    (
                           prj_no      =  ''
                        or prj_no      is null
                    )
                    and (
                           prj_no_sfdc =  ''
                        or prj_no_sfdc is null
                    )
                    and    year        =  substring(
                        ver, 2, 4
                    )
            union all
                select distinct
                    ver,
                    year,
                    null as prj_no,
                    biz_opp_no_sfdc,
                    biz_opp_no,
                    biz_opp_nm,
                    prj_tp_cd,
                    bd_n2_cd,
                    deal_stage_cd,
                    deal_stage_chg_dt,
                    dgtr_task_cd,
                    biz_tp_account_cd,
                    cls_rsn_tp_cd,
                    cls_rsn_tp_nm,
                    expected_contract_date,
                    margin_rate
                from pl_sfdc_contract
                where
                        biz_opp_no <> ''
                    and year       =  substring(
                        ver, 2, 4
                    )
            ) as sfdc
                on          actual_prj.ver    =  sfdc.ver
                and (
                            actual_prj.prj_no =  sfdc.prj_no
                    or (
                            actual_prj.prj_no <> sfdc.prj_no
                        and sfdc.prj_no       is null
                        and substring(
                            actual_prj.prj_no, 1, 8
                        )                     =  sfdc.biz_opp_no
                    )
                )
            left join common_customer as customer
                on actual_prj.ver = customer.ver
                and case
                                  when
                                    left(
                                actual_prj.cstco_cd, 4
                            )     = '0000'
                        then
                            substring(
                                actual_prj.cstco_cd, 5
                            )
                        else
                            actual_prj.cstco_cd
                    end = customer.code
            left join common_org_type as ot_r
                on actual_prj.rodr_ccorg_cd = ot_r.ccorg_cd
            left join common_org_type as ot_s
                on actual_prj.sale_ccorg_cd = ot_s.ccorg_cd
            left join common_account_customer_map as account_map
                on  case
                              when
                                left(
                                actual_prj.cstco_cd, 4
                            ) = '0000'
                        then
                            substring(
                                actual_prj.cstco_cd, 5
                            )
                        else
                            actual_prj.cstco_cd
                    end = account_map.cstco_cd
        ) {
            key ver,
            key prj_no,
            key seq,
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
                margin_rate
        };
