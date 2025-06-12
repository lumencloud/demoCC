using common.org as org from '../../common/org';
using common.version as common_version from '../../common/version';
using common.project as common_project from '../../common/project';
using common.project_platform as common_project_platform from '../../common/project_platform';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';
using pl.wideview as pl_wideview from '../wideview';

namespace pl;

/**
 * pl_wideview 1~12월 컬럼 unpivot 뷰 + 집계처리 용도의 조직정보 컬럼 추가
 */
view wideview_unpivot_view as
    select
        // key cast(row_number() over (order by amount.prj_no asc) as Integer) as row,
        amount.*,
        org.*
    from monthly_amount_view as amount
    left join common_org_full_level_view as org
        on amount.sale_ccorg_cd = org.org_ccorg_cd;


/**
 * [실적]
 * 매출 / 수행 금액 월별 unpivot
 *
 * 01~12 월 해당 컬럼 에서 금액 가져와서 [월,금액] 구조로 row 생성
 *
 */
view monthly_amount_view as
        select from (
            select
                    case
                        when
                            src_type = 'P'
                        then
                            platform.prj_no
                        else
                            prj.prj_no
                    end       as prj_no,
                    case
                        when
                            src_type = 'P'
                        then
                            platform.sale_ccorg_cd
                        else
                            prj.sale_ccorg_cd
                    end       as sale_ccorg_cd,
                    case
                        when
                            src_type = 'P'
                        then
                            platform.cstco_cd
                        else
                            prj.cstco_cd
                    end       as cstco_cd,
                    case
                        when
                            src_type = 'P'
                        then
                            platform.relsco_yn
                        else
                            prj.relsco_yn
                    end       as relsco_yn,
                    case
                        when
                            src_type = 'P'
                        then
                            platform.crov_div_yn
                        else
                            prj.crov_div_yn
                    end       as crov_div_yn,
                    case
                        when
                            src_type = 'P'
                        then
                            platform.biz_opp_no
                        else
                            prj.biz_opp_no
                    end       as biz_opp_no,
                prj.dgtr_task_cd,
                prj.deal_stage_cd,
                prj.biz_tp_account_cd,
                    case
                        when
                            src_type = 'P'
                        then
                            platform.bd_n2_cd
                        else
                            prj.bd_n2_cd
                    end       as bd_n2_cd,
                amount.prj_no as wideview_prj_no,
                amount.seq,
                amount.year,
                amount.month,
                amount.month_amt,
                amount.actual_yn,
                amount.src_type,
                amount.sale_amount,
                amount.sale_amount_sum,
                amount.prj_prfm_amount,
                amount.prj_prfm_amount_sum,
                amount.margin_amount,
                amount.margin_amount_sum,
                amount.rodr_amount,
                amount.rodr_amount_sum
            from (
                select
                    prj_no,
                    seq,
                    year,
                    month,
                    '01'            as month_amt : String(2),
                    case
                        when
                            to_integer(month) > 1
                        then
                            true
                        else
                            false
                    end             as actual_yn : Boolean,
                    src_type,
                    sale_m1_amt     as sale_amount,
                    sale_m1_amt     as sale_amount_sum,
                    prj_prfm_m1_amt as prj_prfm_amount,
                    prj_prfm_m1_amt as prj_prfm_amount_sum,
                    margin_m1_amt   as margin_amount,
                    margin_m1_amt   as margin_amount_sum,
                    ifnull(rodr_m1_amt,0)     as rodr_amount,
                    ifnull(rodr_m1_amt,0)     as rodr_amount_sum
                from wideview_platform_compose_view
                where
                    sale_m1_amt is not null
            union all
                select
                    prj_no,
                    seq,
                    year,
                    month,
                    '02'                              as month_amt : String(2),
                    case
                        when
                            to_integer(month) > 2
                        then
                            true
                        else
                            false
                    end                               as actual_yn : Boolean,
                    src_type,
                    sale_m2_amt                       as sale_amount,
                    sale_m1_amt + sale_m2_amt         as sale_amount_sum,
                    prj_prfm_m2_amt                   as prj_prfm_amount,
                    prj_prfm_m1_amt + prj_prfm_m2_amt as prj_prfm_amount_sum,
                    margin_m2_amt                     as margin_amount,
                    margin_m1_amt + margin_m2_amt     as margin_amount_sum,
                    ifnull(rodr_m2_amt,0)                       as rodr_amount,
                    ifnull(rodr_m1_amt,0) + ifnull(rodr_m2_amt,0)         as rodr_amount_sum
                from wideview_platform_compose_view
                where
                    sale_m2_amt is not null
            union all
                select
                    prj_no,
                    seq,
                    year,
                    month,
                    '03'                                                as month_amt : String(2),
                    case
                        when
                            to_integer(month) > 3
                        then
                            true
                        else
                            false
                    end                                                 as actual_yn : Boolean,
                    src_type,
                    sale_m3_amt                                         as sale_amount,
                    sale_m1_amt + sale_m2_amt + sale_m3_amt             as sale_amount_sum,
                    prj_prfm_m3_amt                                     as prj_prfm_amount,
                    prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt as prj_prfm_amount_sum,
                    margin_m3_amt                                       as margin_amount,
                    margin_m1_amt + margin_m2_amt + margin_m3_amt       as margin_amount_sum,
                    ifnull(rodr_m3_amt,0)                                         as rodr_amount,
                    ifnull(rodr_m1_amt,0) + ifnull(rodr_m2_amt,0) + ifnull(rodr_m3_amt,0)             as rodr_amount_sum
                from wideview_platform_compose_view
                where
                    sale_m3_amt is not null
            union all
                select
                    prj_no,
                    seq,
                    year,
                    month,
                    '04'                                                                  as month_amt : String(2),
                    case
                        when
                            to_integer(month) > 4
                        then
                            true
                        else
                            false
                    end                                                                   as actual_yn : Boolean,
                    src_type,
                    sale_m4_amt                                                           as sale_amount,
                    sale_m1_amt + sale_m2_amt + sale_m3_amt + sale_m4_amt                 as sale_amount_sum,
                    prj_prfm_m4_amt                                                       as prj_prfm_amount,
                    prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt + prj_prfm_m4_amt as prj_prfm_amount_sum,
                    margin_m4_amt                                                         as margin_amount,
                    margin_m1_amt + margin_m2_amt + margin_m3_amt + margin_m4_amt         as margin_amount_sum,
                    ifnull(rodr_m4_amt,0)                                                           as rodr_amount,
                    ifnull(rodr_m1_amt,0) + ifnull(rodr_m2_amt,0) + ifnull(rodr_m3_amt,0) + ifnull(rodr_m4_amt,0)                 as rodr_amount_sum
                from wideview_platform_compose_view
                where
                    sale_m4_amt is not null
            union all
                select
                    prj_no,
                    seq,
                    year,
                    month,
                    '05'                                                                                    as month_amt : String(2),
                    case
                        when
                            to_integer(month) > 5
                        then
                            true
                        else
                            false
                    end                                                                                     as actual_yn : Boolean,
                    src_type,
                    sale_m5_amt                                                                             as sale_amount,
                    sale_m1_amt + sale_m2_amt + sale_m3_amt + sale_m4_amt + sale_m5_amt                     as sale_amount_sum,
                    prj_prfm_m5_amt                                                                         as prj_prfm_amount,
                    prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt + prj_prfm_m4_amt + prj_prfm_m5_amt as prj_prfm_amount_sum,
                    margin_m5_amt                                                                           as margin_amount,
                    margin_m1_amt + margin_m2_amt + margin_m3_amt + margin_m4_amt + margin_m5_amt           as margin_amount_sum,
                    ifnull(rodr_m5_amt,0)                                                                             as rodr_amount,
                    ifnull(rodr_m1_amt,0) + ifnull(rodr_m2_amt,0) + ifnull(rodr_m3_amt,0) + ifnull(rodr_m4_amt,0) + ifnull(rodr_m5_amt,0)                     as rodr_amount_sum
                from wideview_platform_compose_view
                where
                    sale_m5_amt is not null
            union all
                select
                    prj_no,
                    seq,
                    year,
                    month,
                    '06'                                                                                                      as month_amt : String(2),
                    case
                        when
                            to_integer(month) > 6
                        then
                            true
                        else
                            false
                    end                                                                                                       as actual_yn : Boolean,
                    src_type,
                    sale_m6_amt                                                                                               as sale_amount,
                    sale_m1_amt + sale_m2_amt + sale_m3_amt + sale_m4_amt + sale_m5_amt + sale_m6_amt                         as sale_amount_sum,
                    prj_prfm_m6_amt                                                                                           as prj_prfm_amount,
                    prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt + prj_prfm_m4_amt + prj_prfm_m5_amt + prj_prfm_m6_amt as prj_prfm_amount_sum,
                    margin_m6_amt                                                                                             as margin_amount,
                    margin_m1_amt + margin_m2_amt + margin_m3_amt + margin_m4_amt + margin_m5_amt + margin_m6_amt             as margin_amount_sum,
                    ifnull(rodr_m6_amt,0)                                                                                               as rodr_amount,
                    ifnull(rodr_m1_amt,0) + ifnull(rodr_m2_amt,0) + ifnull(rodr_m3_amt,0) + ifnull(rodr_m4_amt,0) + ifnull(rodr_m5_amt,0) + ifnull(rodr_m6_amt,0)                         as rodr_amount_sum
                from wideview_platform_compose_view
                where
                    sale_m6_amt is not null
            union all
                select
                    prj_no,
                    seq,
                    year,
                    month,
                    '07'                                                                                                                        as month_amt : String(2),
                    case
                        when
                            to_integer(month) > 7
                        then
                            true
                        else
                            false
                    end                                                                                                                         as actual_yn : Boolean,
                    src_type,
                    sale_m7_amt                                                                                                                 as sale_amount,
                    sale_m1_amt + sale_m2_amt + sale_m3_amt + sale_m4_amt + sale_m5_amt + sale_m6_amt + sale_m7_amt                             as sale_amount_sum,
                    prj_prfm_m7_amt                                                                                                             as prj_prfm_amount,
                    prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt + prj_prfm_m4_amt + prj_prfm_m5_amt + prj_prfm_m6_amt + prj_prfm_m7_amt as prj_prfm_amount_sum,
                    margin_m7_amt                                                                                                               as margin_amount,
                    margin_m1_amt + margin_m2_amt + margin_m3_amt + margin_m4_amt + margin_m5_amt + margin_m6_amt + margin_m7_amt               as margin_amount_sum,
                    ifnull(rodr_m7_amt,0)                                                                                                                 as rodr_amount,
                    ifnull(rodr_m1_amt,0) + ifnull(rodr_m2_amt,0) + ifnull(rodr_m3_amt,0) + ifnull(rodr_m4_amt,0) + ifnull(rodr_m5_amt,0) + ifnull(rodr_m6_amt,0) + ifnull(rodr_m7_amt,0)                             as rodr_amount_sum
                from wideview_platform_compose_view
                where
                    sale_m7_amt is not null
            union all
                select
                    prj_no,
                    seq,
                    year,
                    month,
                    '08'                                                                                                                                          as month_amt : String(2),
                    case
                        when
                            to_integer(month) > 8
                        then
                            true
                        else
                            false
                    end                                                                                                                                           as actual_yn : Boolean,
                    src_type,
                    sale_m8_amt                                                                                                                                   as sale_amount,
                    sale_m1_amt + sale_m2_amt + sale_m3_amt + sale_m4_amt + sale_m5_amt + sale_m6_amt + sale_m7_amt + sale_m8_amt                                 as sale_amount_sum,
                    prj_prfm_m8_amt                                                                                                                               as prj_prfm_amount,
                    prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt + prj_prfm_m4_amt + prj_prfm_m5_amt + prj_prfm_m6_amt + prj_prfm_m7_amt + prj_prfm_m8_amt as prj_prfm_amount_sum,
                    margin_m8_amt                                                                                                                                 as margin_amount,
                    margin_m1_amt + margin_m2_amt + margin_m3_amt + margin_m4_amt + margin_m5_amt + margin_m6_amt + margin_m7_amt + margin_m8_amt                 as margin_amount_sum,
                    ifnull(rodr_m8_amt,0)                                                                                                                                   as rodr_amount,
                    ifnull(rodr_m1_amt,0) + ifnull(rodr_m2_amt,0) + ifnull(rodr_m3_amt,0) + ifnull(rodr_m4_amt,0) + ifnull(rodr_m5_amt,0) + ifnull(rodr_m6_amt,0) + ifnull(rodr_m7_amt,0) + ifnull(rodr_m8_amt,0)                                 as rodr_amount_sum
                from wideview_platform_compose_view
                where
                    sale_m8_amt is not null
            union all
                select
                    prj_no,
                    seq,
                    year,
                    month,
                    '09'                                                                                                                                                            as month_amt : String(2),
                    case
                        when
                            to_integer(month) > 9
                        then
                            true
                        else
                            false
                    end                                                                                                                                                             as actual_yn : Boolean,
                    src_type,
                    sale_m9_amt                                                                                                                                                     as sale_amount,
                    sale_m1_amt + sale_m2_amt + sale_m3_amt + sale_m4_amt + sale_m5_amt + sale_m6_amt + sale_m7_amt + sale_m8_amt + sale_m9_amt                                     as sale_amount_sum,
                    prj_prfm_m9_amt                                                                                                                                                 as prj_prfm_amount,
                    prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt + prj_prfm_m4_amt + prj_prfm_m5_amt + prj_prfm_m6_amt + prj_prfm_m7_amt + prj_prfm_m8_amt + prj_prfm_m9_amt as prj_prfm_amount_sum,
                    margin_m9_amt                                                                                                                                                   as margin_amount,
                    margin_m1_amt + margin_m2_amt + margin_m3_amt + margin_m4_amt + margin_m5_amt + margin_m6_amt + margin_m7_amt + margin_m8_amt + margin_m9_amt                   as margin_amount_sum,
                    ifnull(rodr_m9_amt,0)                                                                                                                                                     as rodr_amount,
                    ifnull(rodr_m1_amt,0) + ifnull(rodr_m2_amt,0) + ifnull(rodr_m3_amt,0) + ifnull(rodr_m4_amt,0) + ifnull(rodr_m5_amt,0) + ifnull(rodr_m6_amt,0) + ifnull(rodr_m7_amt,0) + ifnull(rodr_m8_amt,0) + ifnull(rodr_m9_amt,0)                                     as rodr_amount_sum
                from wideview_platform_compose_view
                where
                    sale_m9_amt is not null
            union all
                select
                    prj_no,
                    seq,
                    year,
                    month,
                    '10'                                                                                                                                                                               as month_amt : String(2),
                    case
                        when
                            to_integer(month) > 10
                        then
                            true
                        else
                            false
                    end                                                                                                                                                                                as actual_yn : Boolean,
                    src_type,
                    sale_m10_amt                                                                                                                                                                       as sale_amount,
                    sale_m1_amt + sale_m2_amt + sale_m3_amt + sale_m4_amt + sale_m5_amt + sale_m6_amt + sale_m7_amt + sale_m8_amt + sale_m9_amt + sale_m10_amt                                         as sale_amount_sum,
                    prj_prfm_m10_amt                                                                                                                                                                   as prj_prfm_amount,
                    prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt + prj_prfm_m4_amt + prj_prfm_m5_amt + prj_prfm_m6_amt + prj_prfm_m7_amt + prj_prfm_m8_amt + prj_prfm_m9_amt + prj_prfm_m10_amt as prj_prfm_amount_sum,
                    margin_m10_amt                                                                                                                                                                     as margin_amount,
                    margin_m1_amt + margin_m2_amt + margin_m3_amt + margin_m4_amt + margin_m5_amt + margin_m6_amt + margin_m7_amt + margin_m8_amt + margin_m9_amt + margin_m10_amt                     as margin_amount_sum,
                    ifnull(rodr_m10_amt,0)                                                                                                                                                                       as rodr_amount,
                    ifnull(rodr_m1_amt,0) + ifnull(rodr_m2_amt,0) + ifnull(rodr_m3_amt,0) + ifnull(rodr_m4_amt,0) + ifnull(rodr_m5_amt,0) + ifnull(rodr_m6_amt,0) + ifnull(rodr_m7_amt,0) + ifnull(rodr_m8_amt,0) + ifnull(rodr_m9_amt,0) + ifnull(rodr_m10_amt,0)                                         as rodr_amount_sum
                from wideview_platform_compose_view
                where
                    sale_m10_amt is not null
            union all
                select
                    prj_no,
                    seq,
                    year,
                    month,
                    '11'                                                                                                                                                                                                  as month_amt : String(2),
                    case
                        when
                            to_integer(month) > 11
                        then
                            true
                        else
                            false
                    end                                                                                                                                                                                                   as actual_yn : Boolean,
                    src_type,
                    sale_m11_amt                                                                                                                                                                                          as sale_amount,
                    sale_m1_amt + sale_m2_amt + sale_m3_amt + sale_m4_amt + sale_m5_amt + sale_m6_amt + sale_m7_amt + sale_m8_amt + sale_m9_amt + sale_m10_amt + sale_m11_amt                                             as sale_amount_sum,
                    prj_prfm_m11_amt                                                                                                                                                                                      as prj_prfm_amount,
                    prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt + prj_prfm_m4_amt + prj_prfm_m5_amt + prj_prfm_m6_amt + prj_prfm_m7_amt + prj_prfm_m8_amt + prj_prfm_m9_amt + prj_prfm_m10_amt + prj_prfm_m11_amt as prj_prfm_amount_sum,
                    margin_m11_amt                                                                                                                                                                                        as margin_amount,
                    margin_m1_amt + margin_m2_amt + margin_m3_amt + margin_m4_amt + margin_m5_amt + margin_m6_amt + margin_m7_amt + margin_m8_amt + margin_m9_amt + margin_m10_amt + margin_m11_amt                       as margin_amount_sum,
                    ifnull(rodr_m11_amt,0)                                                                                                                                                                                          as rodr_amount,
                    ifnull(rodr_m1_amt,0) + ifnull(rodr_m2_amt,0) + ifnull(rodr_m3_amt,0) + ifnull(rodr_m4_amt,0) + ifnull(rodr_m5_amt,0) + ifnull(rodr_m6_amt,0) + ifnull(rodr_m7_amt,0) + ifnull(rodr_m8_amt,0) + ifnull(rodr_m9_amt,0) + ifnull(rodr_m10_amt,0) + ifnull(rodr_m11_amt,0)                                             as rodr_amount_sum
                from wideview_platform_compose_view
                where
                    sale_m11_amt is not null
            union all
                select
                    prj_no,
                    seq,
                    year,
                    month,
                    '12'                                                                                                                                                                                                                     as month_amt : String(2),
                    case
                        when
                            to_integer(month) > 12
                        then
                            true
                        else
                            false
                    end                                                                                                                                                                                                                      as actual_yn : Boolean,
                    src_type,
                    sale_m12_amt                                                                                                                                                                                                             as sale_amount,
                    sale_m1_amt + sale_m2_amt + sale_m3_amt + sale_m4_amt + sale_m5_amt + sale_m6_amt + sale_m7_amt + sale_m8_amt + sale_m9_amt + sale_m10_amt + sale_m11_amt + sale_m12_amt                                                 as sale_amount_sum,
                    prj_prfm_m12_amt                                                                                                                                                                                                         as prj_prfm_amount,
                    prj_prfm_m1_amt + prj_prfm_m2_amt + prj_prfm_m3_amt + prj_prfm_m4_amt + prj_prfm_m5_amt + prj_prfm_m6_amt + prj_prfm_m7_amt + prj_prfm_m8_amt + prj_prfm_m9_amt + prj_prfm_m10_amt + prj_prfm_m11_amt + prj_prfm_m12_amt as prj_prfm_amount_sum,
                    margin_m12_amt                                                                                                                                                                                                           as margin_amount,
                    margin_m1_amt + margin_m2_amt + margin_m3_amt + margin_m4_amt + margin_m5_amt + margin_m6_amt + margin_m7_amt + margin_m8_amt + margin_m9_amt + margin_m10_amt + margin_m11_amt + margin_m12_amt                         as margin_amount_sum,
                    ifnull(rodr_m12_amt,0)                                                                                                                                                                                                             as rodr_amount,
                    ifnull(rodr_m1_amt,0) + ifnull(rodr_m2_amt,0) + ifnull(rodr_m3_amt,0) + ifnull(rodr_m4_amt,0) + ifnull(rodr_m5_amt,0) + ifnull(rodr_m6_amt,0) + ifnull(rodr_m7_amt,0) + ifnull(rodr_m8_amt,0) + ifnull(rodr_m9_amt,0) + ifnull(rodr_m10_amt,0) + ifnull(rodr_m11_amt,0) + ifnull(rodr_m12_amt,0)                                                 as rodr_amount_sum
                from wideview_platform_compose_view
                where
                    sale_m12_amt is not null

            ) as amount
            left join common_project as prj
                on prj.prj_no = amount.prj_no
            left join common_project_platform as platform
                on  platform.prj_no = amount.prj_no
                and platform.seq    = amount.seq

        ) {
            key prj_no : String(20),
            key wideview_prj_no,
            key seq,
            key sale_ccorg_cd: String(10),
            key year,
            key month,
            key month_amt,
            key src_type,
                dgtr_task_cd,
                relsco_yn,
                crov_div_yn,
                deal_stage_cd,
                biz_opp_no,
                biz_tp_account_cd,
                bd_n2_cd,
                actual_yn,
                cstco_cd: String(20),
                sale_amount,
                sale_amount_sum,
                prj_prfm_amount,
                prj_prfm_amount_sum,
                margin_amount,
                margin_amount_sum,
                rodr_amount: Decimal(18, 2),
                rodr_amount_sum: Decimal(18, 2),
        };

/**
 * platform 메인 프로젝트
 * (quote_target_no 가 없는, 금액 조정대상)
 *
 * ERP 에서 온 데이터('E' or 'WA') 제거하는 방식으로 처리
 *
 * platform 마스터에 존재하는 prj_no 제외 후
 * 같은 해에 prj_no 가 platform - erp 둘 다 존재하는 경우는 'P' 만
 * 존재하지 않는 경우는 'P' 를 제외
 */
view wideview_platform_compose_view as
    select * from pl_wideview as a
    where
        (
                    prj_no not in (
                select distinct prj_no from common_project_platform
                where
                       quote_target_no is null
                    or quote_target_no =  ''
            )
        )
        or (
                    prj_no in     (
                select distinct prj_no from common_project_platform
                where
                       quote_target_no is null
                    or quote_target_no =  ''
            )
            and (
                (
                    exists (select 1 from pl_wideview as b
                    where
                            a.prj_no   =  b.prj_no
                        and a.year     =  b.year
                        and a.src_type <> b.src_type
                    )
                    and           src_type = 'P'
                )
                or (
                    not    exists(
                        select 1 from pl_wideview as b
                        where
                                a.prj_no   =  b.prj_no
                            and a.year     =  b.year
                            and a.src_type <> b.src_type
                    )
                    and           src_type <> 'P'
                )
            )
        );

/**
 * 버전 적용시 현재기준 pl 데이터
 */
view latest_pl_wideview_view as
    select pl.* from pl_wideview as pl
    inner join common_version as ver
        on  pl.ver  = ver.ver
        and ver.tag = 'F';
