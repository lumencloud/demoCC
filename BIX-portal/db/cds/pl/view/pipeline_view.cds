using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';
using common.dt_task as common_dt_task from '../../common/dt_task';
using common.account as common_account from '../../common/account';
using common.version as common_version from '../../common/version';
using common.version_sfdc as common_version_sfdc from '../../common/version_sfdc';
using common.account_customer_map as common_account_customer_map from '../../common/account';
using pl.sfdc_contract as pl_sfdc_contract from '../../pl/sfdc_contract';
using common.customer as common_customer from '../../common/customer';

namespace pl;

view pipeline_view as
    select from (
        select
            rodr_org.*,
            pipeline.ver,
            case
                when substring(
                         pipeline.ver, 1, 1
                     )                             =  'D'
                     then true
                else false
            end                                                                                                                                                                                                                                                                                                          as weekly_yn         : Boolean        @title: 'SFDC 일간,주간 배치 데이터 여부',
            pipeline.year,
            pipeline.month,
            pipeline.rodr_ccorg_cd,
            pipeline.biz_opp_no_sfdc,
            pipeline.biz_opp_nm,
            pipeline.biz_opp_no,
            pipeline.deal_stage_cd,
            pipeline.deal_stage_chg_dt,
            pipeline.cls_rsn_tp_cd,
            pipeline.cls_rsn_tp_nm,
            pipeline.dgtr_task_cd,
            dt.dgtr_task_nm,
            pipeline.expected_contract_date,
            acc.biz_tp_account_nm,
            case
                when pipeline.biz_tp_account_cd    is null
                     or pipeline.biz_tp_account_cd =  ''
                     then cust_map.biz_tp_account_cd
                else pipeline.biz_tp_account_cd
            end                                                                                                                                                                                                                                                                                                          as biz_tp_account_cd : String(30)     @title: 'Account 구분 코드',
            pipeline.cstco_cd,
            customer.name                                                                                                                                                                                                                                                                                                as cstco_name,
            pipeline.rodr_m1_amt + pipeline.rodr_m2_amt + pipeline.rodr_m3_amt + pipeline.rodr_m4_amt + pipeline.rodr_m5_amt + pipeline.rodr_m6_amt + pipeline.rodr_m7_amt + pipeline.rodr_m8_amt + pipeline.rodr_m9_amt + pipeline.rodr_m10_amt + pipeline.rodr_m11_amt + pipeline.rodr_m12_amt                         as rodr_year_amt     : Decimal(18, 2) @title: '사업기회별 연간 수주금액',
            pipeline.sale_m1_amt + pipeline.sale_m2_amt + pipeline.sale_m3_amt + pipeline.sale_m4_amt + pipeline.sale_m5_amt + pipeline.sale_m6_amt + pipeline.sale_m7_amt + pipeline.sale_m8_amt + pipeline.sale_m9_amt + pipeline.sale_m10_amt + pipeline.sale_m11_amt + pipeline.sale_m12_amt                         as sale_year_amt     : Decimal(18, 2) @title: '사업기회별 연간 매출금액',
            pipeline.margin_m1_amt + pipeline.margin_m2_amt + pipeline.margin_m3_amt + pipeline.margin_m4_amt + pipeline.margin_m5_amt + pipeline.margin_m6_amt + pipeline.margin_m7_amt + pipeline.margin_m8_amt + pipeline.margin_m9_amt + pipeline.margin_m10_amt + pipeline.margin_m11_amt + pipeline.margin_m12_amt as margin_year_amt   : Decimal(18, 2) @title: '사업기회별 연간 마진금액',
            pipeline.rodr_m1_amt,
            pipeline.rodr_m2_amt,
            pipeline.rodr_m3_amt,
            pipeline.rodr_m4_amt,
            pipeline.rodr_m5_amt,
            pipeline.rodr_m6_amt,
            pipeline.rodr_m7_amt,
            pipeline.rodr_m8_amt,
            pipeline.rodr_m9_amt,
            pipeline.rodr_m10_amt,
            pipeline.rodr_m11_amt,
            pipeline.rodr_m12_amt,
            pipeline.sale_m1_amt,
            pipeline.sale_m2_amt,
            pipeline.sale_m3_amt,
            pipeline.sale_m4_amt,
            pipeline.sale_m5_amt,
            pipeline.sale_m6_amt,
            pipeline.sale_m7_amt,
            pipeline.sale_m8_amt,
            pipeline.sale_m9_amt,
            pipeline.sale_m10_amt,
            pipeline.sale_m11_amt,
            pipeline.sale_m12_amt,
            pipeline.margin_m1_amt,
            pipeline.margin_m2_amt,
            pipeline.margin_m3_amt,
            pipeline.margin_m4_amt,
            pipeline.margin_m5_amt,
            pipeline.margin_m6_amt,
            pipeline.margin_m7_amt,
            pipeline.margin_m8_amt,
            pipeline.margin_m9_amt,
            pipeline.margin_m10_amt,
            pipeline.margin_m11_amt,
            pipeline.margin_m12_amt
        from (
            select
                ver,
                year,
                month,
                biz_opp_no,
                biz_opp_no_sfdc,
                biz_opp_nm,
                deal_stage_cd,
                deal_stage_chg_dt,
                biz_tp_account_cd,
                dgtr_task_cd,
                expected_contract_date,
                cstco_cd,
                rodr_ccorg_cd,
                cls_rsn_tp_cd,
                cls_rsn_tp_nm,
                max(rodr_m1_amt)    as rodr_m1_amt    : Decimal(18, 2) @title: '사업기회별 1월 수주금액',
                max(rodr_m2_amt)    as rodr_m2_amt    : Decimal(18, 2) @title: '사업기회별 2월 수주금액',
                max(rodr_m3_amt)    as rodr_m3_amt    : Decimal(18, 2) @title: '사업기회별 3월 수주금액',
                max(rodr_m4_amt)    as rodr_m4_amt    : Decimal(18, 2) @title: '사업기회별 4월 수주금액',
                max(rodr_m5_amt)    as rodr_m5_amt    : Decimal(18, 2) @title: '사업기회별 5월 수주금액',
                max(rodr_m6_amt)    as rodr_m6_amt    : Decimal(18, 2) @title: '사업기회별 6월 수주금액',
                max(rodr_m7_amt)    as rodr_m7_amt    : Decimal(18, 2) @title: '사업기회별 7월 수주금액',
                max(rodr_m8_amt)    as rodr_m8_amt    : Decimal(18, 2) @title: '사업기회별 8월 수주금액',
                max(rodr_m9_amt)    as rodr_m9_amt    : Decimal(18, 2) @title: '사업기회별 9월 수주금액',
                max(rodr_m10_amt)   as rodr_m10_amt   : Decimal(18, 2) @title: '사업기회별 10월 수주금액',
                max(rodr_m11_amt)   as rodr_m11_amt   : Decimal(18, 2) @title: '사업기회별 11월 수주금액',
                max(rodr_m12_amt)   as rodr_m12_amt   : Decimal(18, 2) @title: '사업기회별 12월 수주금액',
                sum(sale_m1_amt)    as sale_m1_amt    : Decimal(18, 2) @title: '사업기회별 1월 매출금액',
                sum(sale_m2_amt)    as sale_m2_amt    : Decimal(18, 2) @title: '사업기회별 2월 매출금액',
                sum(sale_m3_amt)    as sale_m3_amt    : Decimal(18, 2) @title: '사업기회별 3월 매출금액',
                sum(sale_m4_amt)    as sale_m4_amt    : Decimal(18, 2) @title: '사업기회별 4월 매출금액',
                sum(sale_m5_amt)    as sale_m5_amt    : Decimal(18, 2) @title: '사업기회별 5월 매출금액',
                sum(sale_m6_amt)    as sale_m6_amt    : Decimal(18, 2) @title: '사업기회별 6월 매출금액',
                sum(sale_m7_amt)    as sale_m7_amt    : Decimal(18, 2) @title: '사업기회별 7월 매출금액',
                sum(sale_m8_amt)    as sale_m8_amt    : Decimal(18, 2) @title: '사업기회별 8월 매출금액',
                sum(sale_m9_amt)    as sale_m9_amt    : Decimal(18, 2) @title: '사업기회별 9월 매출금액',
                sum(sale_m10_amt)   as sale_m10_amt   : Decimal(18, 2) @title: '사업기회별 10월 매출금액',
                sum(sale_m11_amt)   as sale_m11_amt   : Decimal(18, 2) @title: '사업기회별 11월 매출금액',
                sum(sale_m12_amt)   as sale_m12_amt   : Decimal(18, 2) @title: '사업기회별 12월 매출금액',
                sum(margin_m1_amt)  as margin_m1_amt  : Decimal(18, 2) @title: '사업기회별 1월 마진금액',
                sum(margin_m2_amt)  as margin_m2_amt  : Decimal(18, 2) @title: '사업기회별 2월 마진금액',
                sum(margin_m3_amt)  as margin_m3_amt  : Decimal(18, 2) @title: '사업기회별 3월 마진금액',
                sum(margin_m4_amt)  as margin_m4_amt  : Decimal(18, 2) @title: '사업기회별 4월 마진금액',
                sum(margin_m5_amt)  as margin_m5_amt  : Decimal(18, 2) @title: '사업기회별 5월 마진금액',
                sum(margin_m6_amt)  as margin_m6_amt  : Decimal(18, 2) @title: '사업기회별 6월 마진금액',
                sum(margin_m7_amt)  as margin_m7_amt  : Decimal(18, 2) @title: '사업기회별 7월 마진금액',
                sum(margin_m8_amt)  as margin_m8_amt  : Decimal(18, 2) @title: '사업기회별 8월 마진금액',
                sum(margin_m9_amt)  as margin_m9_amt  : Decimal(18, 2) @title: '사업기회별 9월 마진금액',
                sum(margin_m10_amt) as margin_m10_amt : Decimal(18, 2) @title: '사업기회별 10월 마진금액',
                sum(margin_m11_amt) as margin_m11_amt : Decimal(18, 2) @title: '사업기회별 11월 마진금액',
                sum(margin_m12_amt) as margin_m12_amt : Decimal(18, 2) @title: '사업기회별 12월 마진금액'
            from pl_sfdc_contract
            where
                //        deal_stage_cd in (
                //     'Lead', 'Identified', 'Validated', 'Qualified', 'Negotiated'
                // )
                // and
                (
                       ver in (
                        select ver from common_version
                        where
                            tag = 'C'
                    )
                    or ver in (
                        select ver_sfdc from common_version_sfdc
                        where
                            tag = 'C'
                    )
                )
            group by
                ver,
                year,
                month,
                biz_opp_no,
                biz_opp_no_sfdc,
                biz_opp_nm,
                deal_stage_cd,
                deal_stage_chg_dt,
                biz_tp_account_cd,
                dgtr_task_cd,
                expected_contract_date,
                cstco_cd,
                rodr_ccorg_cd,
                cls_rsn_tp_cd,
                cls_rsn_tp_nm
        ) as pipeline
        left join common_org_full_level_view as rodr_org
            on pipeline.rodr_ccorg_cd = rodr_org.org_ccorg_cd
        left join common_account_customer_map as cust_map
            on substring(
                pipeline.cstco_cd, 5
            ) = cust_map.cstco_cd
        left join common_account as acc
            on         acc.ver                    in (
                select ver from common_version
                where
                    tag = 'C'
            )
            and        pipeline.biz_tp_account_cd =  acc.biz_tp_account_cd
            or (
                (
                       pipeline.biz_tp_account_cd is null
                    or pipeline.biz_tp_account_cd =  ''
                )
                and    cust_map.biz_tp_account_cd =  acc.biz_tp_account_cd
            )
        left join common_dt_task as dt
            on  dt.ver                in (
                select ver from common_version
                where
                    tag = 'C'
            )
            and pipeline.dgtr_task_cd =  dt.dgtr_task_cd
        left join common_customer as customer
            on  trim(leading '0' from pipeline.cstco_cd) = trim(leading '0' from customer.code)
            and customer.ver                             = (
                select version.ver from common_version as version
                where
                    tag = 'C'
            )
    ) {
        key ver,
        key year,
        key month,
        key weekly_yn,
        key rodr_ccorg_cd,
        key biz_opp_no_sfdc,
            biz_opp_nm,
            biz_opp_no,
            deal_stage_cd,
            deal_stage_chg_dt,
            biz_tp_account_nm,
            biz_tp_account_cd,
            dgtr_task_cd,
            dgtr_task_nm,
            expected_contract_date,
            cls_rsn_tp_cd,
            cls_rsn_tp_nm,
            cstco_cd,
            cstco_name,
            rodr_year_amt,
            sale_year_amt,
            margin_year_amt,
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
            org_tp,
            lv1_id,
            lv1_name,
            lv1_ccorg_cd,
            lv1_sort_order,
            lv2_id,
            lv2_name,
            lv2_ccorg_cd,
            lv2_sort_order,
            lv3_id,
            lv3_name,
            lv3_ccorg_cd,
            lv3_sort_order,
            div_id,
            div_name,
            div_ccorg_cd,
            div_sort_order,
            hdqt_id,
            hdqt_name,
            hdqt_ccorg_cd,
            hdqt_sort_order,
            team_id,
            team_name,
            team_ccorg_cd,
            team_sort_order
    };
