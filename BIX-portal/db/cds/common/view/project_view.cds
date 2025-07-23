using common.version as common_version from '../../common/version';
using common.project as common_project from '../../common/project';
using common.project_platform as common_project_platform from '../../common/project_platform';
using common.code_item as common_code_item from '../../common/code';
using common.code_header as common_code_header from '../../common/code';
using common.project_biz_domain as common_project_biz_domain from '../../common/project_biz_domain';
using common.customer as common_customer from '../../common/customer';
using common.org_type as common_org_type from '../../common/org_type';
using common.account_customer_map as common_account_customer_map from '../../common/account_customer_map';
using pl.sfdc_contract_view as pl_sfdc_contract_view from '../../pl/view/sfdc_contract_view';
using pl.wideview as pl_wideview from '../../pl/wideview';
using common.project_master_mapping as common_project_master_mapping from '../../common/project_master_mapping';

namespace common;

/**
 * 프로젝트 마스터 데이터
 *
 * common_project (PROMIS + ERP + WG) <br/>
 * common_project_platform (PROMIS) <br/>
 * pl_sfdc_contract
 *
 *  ** ECC 구 고객코드 하드코딩 처리 **
 * 600441 / 한국지능정보사회진흥원/ 대외 (관계사 아님)
 * 600964 / 대한무역투자진흥공사 (KOTRA) / 대외 (관계사아님)
 * 600665 / 통계청/ 대외(관계사아님)
 */
view project_view as
        select from (
            select
                actual_prj.ver,
                actual_prj.prj_no,
                actual_prj.if_source,
                actual_prj.seq,
                actual_prj.prj_nm,
                actual_prj.cstco_cd,
                customer.name as cstco_name,
                case
                    when master.rodr_ccorg_cd         is not null
                         then master.rodr_ccorg_cd
                    when
                         //     actual_prj.cnvg_biz_yn       =      true
                         //  and
                         actual_prj.rodr_ccorg_cd     is     null
                         and sfdc1.rodr_ccorg_cd      is not null
                         and sfdc1.rodr_ccorg_cd      <>     ''
                         then sfdc1.rodr_ccorg_cd
                    when actual_prj.cnvg_biz_yn       =      true
                         and actual_prj.rodr_ccorg_cd is     null
                         and sfdc2.rodr_ccorg_cd      is not null
                         and sfdc2.rodr_ccorg_cd      <>     ''
                         then sfdc2.rodr_ccorg_cd
                    when ot_r.replace_ccorg_cd        is not null
                         then ot_r.replace_ccorg_cd
                    else actual_prj.rodr_ccorg_cd
                end           as rodr_ccorg_cd          : String(10) @title: '수주 ERP Cost Center',
                case
                    when ot_s.replace_ccorg_cd        is not null
                         then ot_s.replace_ccorg_cd
                    else actual_prj.sale_ccorg_cd
                end           as sale_ccorg_cd          : String(10) @title: '매출 ERP Cost Center',
                actual_prj.prj_prfm_str_dt,
                actual_prj.prj_prfm_end_dt,
                actual_prj.ovse_biz_yn,
                case
                    when actual_prj.relsco_yn         is     null
                         and customer.relsco_yn       is not null
                         then customer.relsco_yn
                    when substring(
                             actual_prj.cstco_cd, 5
                         )                            in     (
                             '600441', '600964', '600665'
                         )
                         then false
                    when actual_prj.relsco_yn         is     null
                         and customer.relsco_yn       is     null
                         then(
                                 case
                                     when substring(
                                              ifnull(
                                                  (
                                                      case
                                                          when sfdc1.biz_tp_account_cd     is not null
                                                               and sfdc1.biz_tp_account_cd <>     ''
                                                               then sfdc1.biz_tp_account_cd
                                                          when sfdc2.biz_tp_account_cd     is not null
                                                               and sfdc2.biz_tp_account_cd <>     ''
                                                               then sfdc2.biz_tp_account_cd
                                                          when sfdc3.biz_tp_account_cd     is not null
                                                               and sfdc3.biz_tp_account_cd <>     ''
                                                               then sfdc3.biz_tp_account_cd
                                                          when customer.biz_tp_account_cd  is not null
                                                               then customer.biz_tp_account_cd
                                                          else account_map.biz_tp_account_cd
                                                      end
                                                  ), 'EX'
                                              ), 1, 2
                                          ) = 'IN'
                                          then true
                                     else false
                                 end
                             )
                // ECC 구 고객코드 하드코딩 처리
                // 600441 / 한국지능정보사회진흥원/ 대외 (관계사 아님)
                // 600964 / 대한무역투자진흥공사 (KOTRA) / 대외 (관계사아님)
                // 600665 / 통계청/ 대외(관계사아님)
                    else actual_prj.relsco_yn
                end           as relsco_yn              : Boolean    @title: '관계사 여부',
                case
                    when bd_bix.prj_tp_cd             is not null
                         then bd_bix.prj_tp_cd
                    else actual_prj.prj_tp_cd
                end           as prj_tp_cd              : String(20),
                actual_prj.itsm_div_yn,
                actual_prj.crov_div_yn,
                actual_prj.cnvg_biz_yn,
                actual_prj.dt_tp,
                actual_prj.tech_nm,
                actual_prj.brand_nm,
                actual_prj.quote_issue_no,
                actual_prj.quote_target_no,
                case
                    when bd_bix.bd_n1_cd              is not null
                         then bd_bix.bd_n1_cd
                    when bd1.name                     is not null
                         then bd1.name
                    else null
                end           as bd_n1_cd               : String(20),
                case
                    when bd_bix.bd_n2_cd              is not null
                         then bd_bix.bd_n2_cd
                    when bd2.name                     is not null
                         then bd2.name
                    else null
                end           as bd_n2_cd               : String(20),
                bd_bix.bd_n3_cd,
                bd_bix.bd_n4_cd,
                bd_bix.bd_n5_cd,
                bd_bix.bd_n6_cd,
                case
                    when sfdc1.biz_opp_no             is not null
                         then sfdc1.biz_opp_no
                    when sfdc2.biz_opp_no             is not null
                         then sfdc2.biz_opp_no
                    when sfdc3.biz_opp_no             is not null
                         then sfdc3.biz_opp_no_sfdc
                end           as biz_opp_no_sfdc        : String(18),
                case
                    when sfdc1.biz_opp_no             is not null
                         then sfdc1.biz_opp_no
                    when sfdc2.biz_opp_no             is not null
                         then sfdc2.biz_opp_no
                    when sfdc3.biz_opp_no             is not null
                         then sfdc3.biz_opp_no
                end           as biz_opp_no             : String(30),
                case
                    when sfdc1.biz_opp_no             is not null
                         then sfdc1.biz_opp_nm
                    when sfdc2.biz_opp_no             is not null
                         then sfdc2.biz_opp_nm
                    when sfdc3.biz_opp_no             is not null
                         then sfdc3.biz_opp_nm
                end           as biz_opp_nm             : String(120),
                case
                    when sfdc1.biz_opp_no             is not null
                         then sfdc1.deal_stage_cd
                    when sfdc2.biz_opp_no             is not null
                         then sfdc2.deal_stage_cd
                    when sfdc3.biz_opp_no             is not null
                         then sfdc3.deal_stage_cd
                end           as deal_stage_cd          : String(20),
                case
                    when sfdc1.biz_opp_no             is not null
                         then sfdc1.deal_stage_chg_dt
                    when sfdc2.biz_opp_no             is not null
                         then sfdc2.deal_stage_chg_dt
                    when sfdc3.biz_opp_no             is not null
                         then sfdc3.deal_stage_chg_dt
                end           as deal_stage_chg_dt      : Date,
                case
                    when bd_bix.dgtr_task_cd          is not null
                         then bd_bix.dgtr_task_cd
                    when sfdc1.dgtr_task_cd           is not null
                         and sfdc1.dgtr_task_cd       <>     ''
                         then sfdc1.dgtr_task_cd
                    when sfdc2.dgtr_task_cd           is not null
                         and sfdc2.dgtr_task_cd       <>     ''
                         then sfdc2.dgtr_task_cd
                    when sfdc3.dgtr_task_cd           is not null
                         and sfdc3.dgtr_task_cd       <>     ''
                         then sfdc3.dgtr_task_cd
                    else null
                end           as dgtr_task_cd           : String(30) @title: 'DT 코드',
                case
                    when sfdc1.biz_tp_account_cd      is not null
                         and sfdc1.biz_tp_account_cd  <>     ''
                         then sfdc1.biz_tp_account_cd
                    when sfdc2.biz_tp_account_cd      is not null
                         and sfdc2.biz_tp_account_cd  <>     ''
                         then sfdc2.biz_tp_account_cd
                    when sfdc3.biz_tp_account_cd      is not null
                         and sfdc3.biz_tp_account_cd  <>     ''
                         then sfdc3.biz_tp_account_cd
                    when customer.biz_tp_account_cd   is not null
                         then customer.biz_tp_account_cd
                    else account_map.biz_tp_account_cd
                end           as biz_tp_account_cd      : String(30) @title: 'Account 코드',
                case
                    when sfdc1.biz_opp_no             is not null
                         then sfdc1.cls_rsn_tp_cd
                    when sfdc2.biz_opp_no             is not null
                         then sfdc2.cls_rsn_tp_cd
                    when sfdc3.biz_opp_no             is not null
                         then sfdc3.cls_rsn_tp_cd
                end           as cls_rsn_tp_cd          : String(30),
                case
                    when sfdc1.biz_opp_no             is not null
                         then sfdc1.cls_rsn_tp_nm
                    when sfdc2.biz_opp_no             is not null
                         then sfdc2.cls_rsn_tp_nm
                    when sfdc3.biz_opp_no             is not null
                         then sfdc3.cls_rsn_tp_nm
                end           as cls_rsn_tp_nm          : String(30),
                case
                    when sfdc1.biz_opp_no             is not null
                         then sfdc1.expected_contract_date
                    when sfdc2.biz_opp_no             is not null
                         then sfdc2.expected_contract_date
                    when sfdc3.biz_opp_no             is not null
                         then sfdc3.expected_contract_date
                end           as expected_contract_date : Date,
                case
                    when sfdc1.biz_opp_no             is not null
                         then sfdc1.margin_rate
                    when sfdc2.biz_opp_no             is not null
                         then sfdc2.margin_rate
                    when sfdc3.biz_opp_no             is not null
                         then sfdc3.margin_rate
                end           as margin_rate            : Decimal(5, 2)
            from (
                select
                    ver,
                    prj.prj_no,
                    null as seq : Integer,
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
                    case
                        when tp_cd.prj_tp_cd    is not null
                             then tp_cd.prj_tp_cd

                        else prj.prj_tp_cd
                    end  as prj_tp_cd,
                    null as cnvg_biz_yn,
                    null as dt_tp,
                    null as tech_nm,
                    null as brand_nm,
                    null as quote_issue_no,
                    null as quote_target_no,
                    if_source
                from common_project as prj
                left join common_project_biz_domain as tp_cd
                    on prj.prj_no = tp_cd.prj_no
                where
                        ver        in (
                        select ver from common_version
                        where
                            tag = 'C'
                    )
                    and prj.prj_no in (
                        select distinct prj_no from pl_wideview
                        where
                                src_type <> 'P'
                            and ver      in (
                                select ver from common_version
                                where
                                    tag in (
                                        'C', 'Y'
                                    )
                            )
                    )
            union
                select
                    ver.ver,
                    last_prj.prj_no,
                    null as seq : Integer,
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
                    case
                        when tp_cd.prj_tp_cd    is not null
                             then tp_cd.prj_tp_cd

                        else last_prj.prj_tp_cd
                    end  as prj_tp_cd,
                    null as cnvg_biz_yn,
                    null as dt_tp,
                    null as tech_nm,
                    null as brand_nm,
                    null as quote_issue_no,
                    null as quote_target_no,
                    if_source
                from common_project as last_prj
                left join common_version as ver
                    on ver.tag = 'C'
                left join common_project_biz_domain as tp_cd
                    on last_prj.prj_no = tp_cd.prj_no
                where
                        last_prj.ver    in (
                        select ver from common_version
                        where
                            tag = 'Y'
                    )
                    and last_prj.prj_no in (
                        select distinct prj_no from pl_wideview
                        where
                                src_type <> 'P'
                            and ver      in (
                                select ver from common_version
                                where
                                    tag in ('Y')
                            )
                    )
            union all
                select
                    platform.ver,
                    platform.prj_no,
                    platform.seq,
                    platform.prj_nm,
                    case
                        when platform.cstco_cd  is     null
                             then prj.cstco_cd
                        else platform.cstco_cd
                    end        as cstco_cd,
                    prj.rodr_ccorg_cd,
                    platform.sale_ccorg_cd,
                    prj.prj_prfm_str_dt,
                    prj.prj_prfm_end_dt,
                    prj.ovse_biz_yn,
                    platform.relsco_yn,
                    false      as itsm_div_yn : Boolean,
                    prj.crov_div_yn,
                    platform.biz_opp_no,
                    case
                        when tp_cd.prj_tp_cd    is not null
                             then tp_cd.prj_tp_cd
                        when platform.prj_tp_cd is     null
                             then prj.prj_tp_cd
                        else platform.prj_tp_cd
                    end        as prj_tp_cd,
                    platform.cnvg_biz_yn,
                    platform.dt_tp,
                    platform.tech_nm,
                    platform.brand_nm,
                    platform.quote_issue_no,
                    platform.quote_target_no,
                    'PLATFORM' as if_source   : String(10)
                from common_project_platform as platform
                left join common_project as prj
                    on (
                            platform.ver             in (
                            select ver from common_version
                            where
                                tag in (
                                    'C', 'Y'
                                )
                        )
                        and prj.ver                  in (
                            select ver from common_version
                            where
                                tag in ('C')
                        )
                        and platform.cnvg_biz_yn     =  true
                        and platform.quote_target_no =  prj.prj_no
                    )
                left join common_project_biz_domain as tp_cd
                    on platform.prj_no = tp_cd.prj_no
                where
                    platform.ver in (
                        select ver from common_version
                        where
                            tag in (
                                'C', 'Y'
                            )
                    )
            ) as actual_prj
            left join common_code_item as tp
                on (
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
                    rodr_ccorg_cd,
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
                from pl_sfdc_contract_view
                where
                        substring(
                        ver, 1, 1
                    )             = 'P'
                    and year      = substring(
                        ver, 2, 4
                    )
                    and weekly_yn = false
            ) as sfdc1
                on  actual_prj.ver        =  sfdc1.ver
                and actual_prj.prj_no     =  sfdc1.prj_no
                and actual_prj.biz_opp_no is null
            left join (
                select
                    ver,
                    year,
                    rodr_ccorg_cd,
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
                from pl_sfdc_contract_view
                where
                        substring(
                        ver, 1, 1
                    )              =  'P'
                    and year       =  substring(
                        ver, 2, 4
                    )
                    and biz_opp_no <> ''
                group by
                    ver,
                    year,
                    rodr_ccorg_cd,
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
            ) as sfdc2
                on  actual_prj.ver        =  sfdc2.ver
                and substring(
                    actual_prj.prj_no, 1, 8
                )                         =  sfdc2.biz_opp_no
                and actual_prj.biz_opp_no is null
                or (
                    actual_prj.biz_opp_no =  sfdc2.biz_opp_no
                )
            left join (
                select
                    ver,
                    year,
                    rodr_ccorg_cd,
                    prj_no_sfdc,
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
                from pl_sfdc_contract_view
                where
                        substring(
                        ver, 1, 1
                    )        = 'P'
                    and year = substring(
                        ver, 2, 4
                    )
            ) as sfdc3
                on  actual_prj.ver    = sfdc3.ver
                and actual_prj.prj_no = sfdc3.prj_no_sfdc
            // left join (
            //     SELECT max(ver) as ver, code, name, relsco_yn, biz_tp_account_cd
            //     FROM common_customer
            //     GROUP BY code, name, relsco_yn, biz_tp_account_cd
            // ) as customer
            left join common_customer as customer
                on customer.ver in (
                    select ver from common_version
                    where
                        tag in ('C')
                )
                and case
                        when left(
                                 actual_prj.cstco_cd, 4
                             )  =  '0000'
                             then substring(
                                      actual_prj.cstco_cd, 5
                                  )
                        else actual_prj.cstco_cd
                    end = customer.code
            left join common_org_type as ot_r
                on actual_prj.rodr_ccorg_cd = ot_r.ccorg_cd
            left join common_org_type as ot_s
                on actual_prj.sale_ccorg_cd = ot_s.ccorg_cd
            left join common_account_customer_map as account_map
                on case
                       when left(
                                actual_prj.cstco_cd, 4
                            ) = '0000'
                            then substring(
                                     actual_prj.cstco_cd, 5
                                 )
                       else actual_prj.cstco_cd
                   end        = account_map.cstco_cd
            left join common_project_master_mapping as master
                on             actual_prj.prj_no    =  master.prj_no
                and (
                    (
                               actual_prj.if_source =  'PLATFORM'
                        and    actual_prj.seq       =  master.seq
                        and    substring(
                            actual_prj.ver, 2, 4
                        )                           =  master.year
                    )
                    or (
                        (
                               actual_prj.if_source <> 'PLATFORM'
                            or actual_prj.if_source is null
                        )
                        and    actual_prj.seq       is null
                        and    master.seq           =  0
                    )
                )
        ) {
            key ver,
            key prj_no,
            key seq,
                if_source,
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
                dgtr_task_cd,
                biz_tp_account_cd,
                cls_rsn_tp_cd,
                cls_rsn_tp_nm,
                expected_contract_date,
                margin_rate
        };
