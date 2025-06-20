using rsp.org_b_labor as rsp_org_b_labor from '../org_b_labor';
using rsp.opp_labor as rsp_opp_labor from '../opp_labor';
using rsp.org_total_labor as rsp_org_total_labor from '../org_total_labor';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';
using common.project as common_project from '../../common/project';

namespace rsp;

//삭제 예정
view wideview_unpivot as select from wideview_unpivot_view;

view wideview_unpivot_view as
        select * from (
            select
                year,
                month,
                ccorg_cd,
                prj_no_sfdc,
                biz_tp_account_cd,
                case
                    when
                        to_integer(month) >= 1
                    then
                        true
                    else
                        false
                end              as actual_yn : Boolean,
                '01'             as month_amt : String(2),
                total_m1_amt     as total_amt,
                total_m1_amt     as total_amt_sum,
                total_m1_emp     as total_emp,
                avg_m1_amt       as avg_amt,
                avg_m1_amt       as avg_amt_sum,
                bill_m1_amt      as bill_amt,
                bill_m1_amt      as bill_amt_sum,
                indirect_cost_m1 as indirect_cost_amt,
                indirect_cost_m1 as indirect_cost_amt_sum,
                opp_m1_amt       as opp_amt,
                opp_m1_amt       as opp_amt_sum
            from wideview_view
        union all
            select
                year,
                month,
                ccorg_cd,
                prj_no_sfdc,
                biz_tp_account_cd,
                case
                    when
                        to_integer(month) >= 2
                    then
                        true
                    else
                        false
                end                                 as actual_yn : Boolean,
                '02'                                as month_amt : String(2),
                total_m2_amt                        as total_amt,
                total_m1_amt + total_m2_amt         as total_amt_sum,
                total_m2_emp                        as total_emp,
                avg_m2_amt                          as avg_amt,
                avg_m1_amt + avg_m2_amt             as avg_amt_sum,
                bill_m2_amt                         as bill_amt,
                bill_m1_amt + bill_m2_amt           as bill_amt_sum,
                indirect_cost_m2                    as indirect_cost_amt,
                indirect_cost_m1 + indirect_cost_m2 as indirect_cost_amt_sum,
                opp_m1_amt                          as opp_amt,
                opp_m1_amt + opp_m2_amt             as opp_amt_sum
            from wideview_view
        union all
            select
                year,
                month,
                ccorg_cd,
                prj_no_sfdc,
                biz_tp_account_cd,
                case
                    when
                        to_integer(month) >= 3
                    then
                        true
                    else
                        false
                end                                                    as actual_yn : Boolean,
                '03'                                                   as month_amt : String(2),
                total_m3_amt                                           as total_amt,
                total_m1_amt + total_m2_amt + total_m3_amt             as total_amt_sum,
                total_m3_emp                                           as total_emp,
                avg_m3_amt                                             as avg_amt,
                avg_m1_amt + avg_m2_amt + avg_m3_amt                   as avg_amt_sum,
                bill_m3_amt                                            as bill_amt,
                bill_m1_amt + bill_m2_amt + bill_m3_amt                as bill_amt_sum,
                indirect_cost_m3                                       as indirect_cost_amt,
                indirect_cost_m1 + indirect_cost_m2 + indirect_cost_m3 as indirect_cost_amt_sum,
                opp_m3_amt                                             as opp_amt,
                opp_m1_amt + opp_m2_amt + opp_m3_amt                   as opp_amt_sum
            from wideview_view
        union all
            select
                year,
                month,
                ccorg_cd,
                prj_no_sfdc,
                biz_tp_account_cd,
                case
                    when
                        to_integer(month) >= 4
                    then
                        true
                    else
                        false
                end                                                                       as actual_yn : Boolean,
                '04'                                                                      as month_amt : String(2),
                total_m4_amt                                                              as total_amt,
                total_m1_amt + total_m2_amt + total_m3_amt + total_m4_amt                 as total_amt_sum,
                total_m4_emp                                                              as total_emp,
                avg_m4_amt                                                                as avg_amt,
                avg_m1_amt + avg_m2_amt + avg_m3_amt + avg_m4_amt                         as avg_amt_sum,
                bill_m4_amt                                                               as bill_amt,
                bill_m1_amt + bill_m2_amt + bill_m3_amt + bill_m4_amt                     as bill_amt_sum,
                indirect_cost_m4                                                          as indirect_cost_amt,
                indirect_cost_m1 + indirect_cost_m2 + indirect_cost_m3 + indirect_cost_m4 as indirect_cost_amt_sum,
                opp_m4_amt                                                                as opp_amt,
                opp_m1_amt + opp_m2_amt + opp_m3_amt + opp_m4_amt                         as opp_amt_sum
            from wideview_view
        union all
            select
                year,
                month,
                ccorg_cd,
                prj_no_sfdc,
                biz_tp_account_cd,
                case
                    when
                        to_integer(month) >= 5
                    then
                        true
                    else
                        false
                end                                                                                          as actual_yn : Boolean,
                '05'                                                                                         as month_amt : String(2),
                total_m5_amt                                                                                 as total_amt,
                total_m1_amt + total_m2_amt + total_m3_amt + total_m4_amt + total_m5_amt                     as total_amt_sum,
                total_m5_emp                                                                                 as total_emp,
                avg_m5_amt                                                                                   as avg_amt,
                avg_m1_amt + avg_m2_amt + avg_m3_amt + avg_m4_amt + avg_m5_amt                               as avg_amt_sum,
                bill_m5_amt                                                                                  as bill_amt,
                bill_m1_amt + bill_m2_amt + bill_m3_amt + bill_m4_amt + bill_m5_amt                          as bill_amt_sum,
                indirect_cost_m5                                                                             as indirect_cost_amt,
                indirect_cost_m1 + indirect_cost_m2 + indirect_cost_m3 + indirect_cost_m4 + indirect_cost_m5 as indirect_cost_amt_sum,
                opp_m5_amt                                                                                   as opp_amt,
                opp_m1_amt + opp_m2_amt + opp_m3_amt + opp_m4_amt + opp_m5_amt                               as opp_amt_sum
            from wideview_view
        union all
            select
                year,
                month,
                ccorg_cd,
                prj_no_sfdc,
                biz_tp_account_cd,
                case
                    when
                        to_integer(month) >= 6
                    then
                        true
                    else
                        false
                end                                                                                                             as actual_yn : Boolean,
                '06'                                                                                                            as month_amt : String(2),
                total_m6_amt                                                                                                    as total_amt,
                total_m1_amt + total_m2_amt + total_m3_amt + total_m4_amt + total_m5_amt + total_m6_amt                         as total_amt_sum,
                total_m6_emp                                                                                                    as total_emp,
                avg_m6_amt                                                                                                      as avg_amt,
                avg_m1_amt + avg_m2_amt + avg_m3_amt + avg_m4_amt + avg_m5_amt + avg_m6_amt                                     as avg_amt_sum,
                bill_m6_amt                                                                                                     as bill_amt,
                bill_m1_amt + bill_m2_amt + bill_m3_amt + bill_m4_amt + bill_m5_amt + bill_m6_amt                               as bill_amt_sum,
                indirect_cost_m6                                                                                                as indirect_cost_amt,
                indirect_cost_m1 + indirect_cost_m2 + indirect_cost_m3 + indirect_cost_m4 + indirect_cost_m5 + indirect_cost_m6 as indirect_cost_amt_sum,
                opp_m6_amt                                                                                                      as opp_amt,
                opp_m1_amt + opp_m2_amt + opp_m3_amt + opp_m4_amt + opp_m5_amt + opp_m6_amt                                     as opp_amt_sum
            from wideview_view
        union all
            select
                year,
                month,
                ccorg_cd,
                prj_no_sfdc,
                biz_tp_account_cd,
                case
                    when
                        to_integer(month) >= 7
                    then
                        true
                    else
                        false
                end                                                                                                                                as actual_yn : Boolean,
                '07'                                                                                                                               as month_amt : String(2),
                total_m7_amt                                                                                                                       as total_amt,
                total_m1_amt + total_m2_amt + total_m3_amt + total_m4_amt + total_m5_amt + total_m6_amt + total_m7_amt                             as total_amt_sum,
                total_m7_emp                                                                                                                       as total_emp,
                avg_m7_amt                                                                                                                         as avg_amt,
                avg_m1_amt + avg_m2_amt + avg_m3_amt + avg_m4_amt + avg_m5_amt + avg_m6_amt + avg_m7_amt                                           as avg_amt_sum,
                bill_m7_amt                                                                                                                        as bill_amt,
                bill_m1_amt + bill_m2_amt + bill_m3_amt + bill_m4_amt + bill_m5_amt + bill_m6_amt + bill_m7_amt                                    as bill_amt_sum,
                indirect_cost_m7                                                                                                                   as indirect_cost_amt,
                indirect_cost_m1 + indirect_cost_m2 + indirect_cost_m3 + indirect_cost_m4 + indirect_cost_m5 + indirect_cost_m6 + indirect_cost_m7 as indirect_cost_amt_sum,
                opp_m7_amt                                                                                                                         as opp_amt,
                opp_m1_amt + opp_m2_amt + opp_m3_amt + opp_m4_amt + opp_m5_amt + opp_m6_amt + opp_m7_amt                                           as opp_amt_sum
            from wideview_view
        union all
            select
                year,
                month,
                ccorg_cd,
                prj_no_sfdc,
                biz_tp_account_cd,
                case
                    when
                        to_integer(month) >= 8
                    then
                        true
                    else
                        false
                end                                                                                                                                                   as actual_yn : Boolean,
                '08'                                                                                                                                                  as month_amt : String(2),
                total_m8_amt                                                                                                                                          as total_amt,
                total_m1_amt + total_m2_amt + total_m3_amt + total_m4_amt + total_m5_amt + total_m6_amt + total_m7_amt + total_m8_amt                                 as total_amt_sum,
                total_m8_emp                                                                                                                                          as total_emp,
                avg_m8_amt                                                                                                                                            as avg_amt,
                avg_m1_amt + avg_m2_amt + avg_m3_amt + avg_m4_amt + avg_m5_amt + avg_m6_amt + avg_m7_amt + avg_m8_amt                                                 as avg_amt_sum,
                bill_m8_amt                                                                                                                                           as bill_amt,
                bill_m1_amt + bill_m2_amt + bill_m3_amt + bill_m4_amt + bill_m5_amt + bill_m6_amt + bill_m7_amt + bill_m8_amt                                         as bill_amt_sum,
                indirect_cost_m8                                                                                                                                      as indirect_cost_amt,
                indirect_cost_m1 + indirect_cost_m2 + indirect_cost_m3 + indirect_cost_m4 + indirect_cost_m5 + indirect_cost_m6 + indirect_cost_m7 + indirect_cost_m8 as indirect_cost_amt_sum,
                opp_m8_amt                                                                                                                                            as opp_amt,
                opp_m1_amt + opp_m2_amt + opp_m3_amt + opp_m4_amt + opp_m5_amt + opp_m6_amt + opp_m7_amt + opp_m8_amt                                                 as opp_amt_sum
            from wideview_view
        union all
            select
                year,
                month,
                ccorg_cd,
                prj_no_sfdc,
                biz_tp_account_cd,
                case
                    when
                        to_integer(month) >= 9
                    then
                        true
                    else
                        false
                end                                                                                                                                                                      as actual_yn : Boolean,
                '09'                                                                                                                                                                     as month_amt : String(2),
                total_m9_amt                                                                                                                                                             as total_amt,
                total_m1_amt + total_m2_amt + total_m3_amt + total_m4_amt + total_m5_amt + total_m6_amt + total_m7_amt + total_m8_amt + total_m9_amt                                     as total_amt_sum,
                total_m9_emp                                                                                                                                                             as total_emp,
                avg_m9_amt                                                                                                                                                               as avg_amt,
                avg_m1_amt + avg_m2_amt + avg_m3_amt + avg_m4_amt + avg_m5_amt + avg_m6_amt + avg_m7_amt + avg_m8_amt + avg_m9_amt                                                       as avg_amt_sum,
                bill_m9_amt                                                                                                                                                              as bill_amt,
                bill_m1_amt + bill_m2_amt + bill_m3_amt + bill_m4_amt + bill_m5_amt + bill_m6_amt + bill_m7_amt + bill_m8_amt + bill_m9_amt                                              as bill_amt_sum,
                indirect_cost_m9                                                                                                                                                         as indirect_cost_amt,
                indirect_cost_m1 + indirect_cost_m2 + indirect_cost_m3 + indirect_cost_m4 + indirect_cost_m5 + indirect_cost_m6 + indirect_cost_m7 + indirect_cost_m8 + indirect_cost_m9 as indirect_cost_amt_sum,
                opp_m9_amt                                                                                                                                                               as opp_amt,
                opp_m1_amt + opp_m2_amt + opp_m3_amt + opp_m4_amt + opp_m5_amt + opp_m6_amt + opp_m7_amt + opp_m8_amt + opp_m9_amt                                                       as opp_amt_sum
            from wideview_view
        union all
            select
                year,
                month,
                ccorg_cd,
                prj_no_sfdc,
                biz_tp_account_cd,
                case
                    when
                        to_integer(month) >= 10
                    then
                        true
                    else
                        false
                end                                                                                                                                                                                          as actual_yn : Boolean,
                '10'                                                                                                                                                                                         as month_amt : String(2),
                total_m10_amt                                                                                                                                                                                as total_amt,
                total_m1_amt + total_m2_amt + total_m3_amt + total_m4_amt + total_m5_amt + total_m6_amt + total_m7_amt + total_m8_amt + total_m9_amt + total_m10_amt                                         as total_amt_sum,
                total_m10_emp                                                                                                                                                                                as total_emp,
                avg_m10_amt                                                                                                                                                                                  as avg_amt,
                avg_m1_amt + avg_m2_amt + avg_m3_amt + avg_m4_amt + avg_m5_amt + avg_m6_amt + avg_m7_amt + avg_m8_amt + avg_m9_amt + avg_m10_amt                                                             as avg_amt_sum,
                bill_m10_amt                                                                                                                                                                                 as bill_amt,
                bill_m1_amt + bill_m2_amt + bill_m3_amt + bill_m4_amt + bill_m5_amt + bill_m6_amt + bill_m7_amt + bill_m8_amt + bill_m9_amt + bill_m10_amt                                                   as bill_amt_sum,
                indirect_cost_m10                                                                                                                                                                            as indirect_cost_amt,
                indirect_cost_m1 + indirect_cost_m2 + indirect_cost_m3 + indirect_cost_m4 + indirect_cost_m5 + indirect_cost_m6 + indirect_cost_m7 + indirect_cost_m8 + indirect_cost_m9 + indirect_cost_m10 as indirect_cost_amt_sum,
                opp_m10_amt                                                                                                                                                                                  as opp_amt,
                opp_m1_amt + opp_m2_amt + opp_m3_amt + opp_m4_amt + opp_m5_amt + opp_m6_amt + opp_m7_amt + opp_m8_amt + opp_m9_amt + opp_m10_amt                                                             as opp_amt_sum
            from wideview_view
        union all
            select
                year,
                month,
                ccorg_cd,
                prj_no_sfdc,
                biz_tp_account_cd,
                case
                    when
                        to_integer(month) >= 11
                    then
                        true
                    else
                        false
                end                                                                                                                                                                                                              as actual_yn : Boolean,
                '11'                                                                                                                                                                                                             as month_amt : String(2),
                total_m11_amt                                                                                                                                                                                                    as total_amt,
                total_m1_amt + total_m2_amt + total_m3_amt + total_m4_amt + total_m5_amt + total_m6_amt + total_m7_amt + total_m8_amt + total_m9_amt + total_m10_amt + total_m11_amt                                             as total_amt_sum,
                total_m11_emp                                                                                                                                                                                                    as total_emp,
                avg_m11_amt                                                                                                                                                                                                      as avg_amt,
                avg_m1_amt + avg_m2_amt + avg_m3_amt + avg_m4_amt + avg_m5_amt + avg_m6_amt + avg_m7_amt + avg_m8_amt + avg_m9_amt + avg_m10_amt + avg_m11_amt                                                                   as avg_amt_sum,
                bill_m11_amt                                                                                                                                                                                                     as bill_amt,
                bill_m1_amt + bill_m2_amt + bill_m3_amt + bill_m4_amt + bill_m5_amt + bill_m6_amt + bill_m7_amt + bill_m8_amt + bill_m9_amt + bill_m10_amt + bill_m11_amt                                                        as bill_amt_sum,
                indirect_cost_m11                                                                                                                                                                                                as indirect_cost_amt,
                indirect_cost_m1 + indirect_cost_m2 + indirect_cost_m3 + indirect_cost_m4 + indirect_cost_m5 + indirect_cost_m6 + indirect_cost_m7 + indirect_cost_m8 + indirect_cost_m9 + indirect_cost_m10 + indirect_cost_m11 as indirect_cost_amt_sum,
                opp_m11_amt                                                                                                                                                                                                      as opp_amt,
                opp_m1_amt + opp_m2_amt + opp_m3_amt + opp_m4_amt + opp_m5_amt + opp_m6_amt + opp_m7_amt + opp_m8_amt + opp_m9_amt + opp_m10_amt + opp_m11_amt                                                                   as opp_amt_sum
            from wideview_view
        union all
            select
                year,
                month,
                ccorg_cd,
                prj_no_sfdc,
                biz_tp_account_cd,
                case
                    when
                        to_integer(month) >= 12
                    then
                        true
                    else
                        false
                end                                                                                                                                                                                                                                  as actual_yn : Boolean,
                '12'                                                                                                                                                                                                                                 as month_amt : String(2),
                total_m12_amt                                                                                                                                                                                                                        as total_amt,
                total_m1_amt + total_m2_amt + total_m3_amt + total_m4_amt + total_m5_amt + total_m6_amt + total_m7_amt + total_m8_amt + total_m9_amt + total_m10_amt + total_m11_amt + total_m12_amt                                                 as total_amt_sum,
                total_m12_emp                                                                                                                                                                                                                        as total_emp,
                avg_m12_amt                                                                                                                                                                                                                          as avg_amt,
                avg_m1_amt + avg_m2_amt + avg_m3_amt + avg_m4_amt + avg_m5_amt + avg_m6_amt + avg_m7_amt + avg_m8_amt + avg_m9_amt + avg_m10_amt + avg_m11_amt + avg_m12_amt                                                                         as avg_amt_sum,
                bill_m12_amt                                                                                                                                                                                                                         as bill_amt,
                bill_m1_amt + bill_m2_amt + bill_m3_amt + bill_m4_amt + bill_m5_amt + bill_m6_amt + bill_m7_amt + bill_m8_amt + bill_m9_amt + bill_m10_amt + bill_m11_amt + bill_m12_amt                                                             as bill_amt_sum,
                indirect_cost_m12                                                                                                                                                                                                                    as indirect_cost_amt,
                indirect_cost_m1 + indirect_cost_m2 + indirect_cost_m3 + indirect_cost_m4 + indirect_cost_m5 + indirect_cost_m6 + indirect_cost_m7 + indirect_cost_m8 + indirect_cost_m9 + indirect_cost_m10 + indirect_cost_m11 + indirect_cost_m12 as indirect_cost_amt_sum,
                opp_m12_amt                                                                                                                                                                                                                          as opp_amt,
                opp_m1_amt + opp_m2_amt + opp_m3_amt + opp_m4_amt + opp_m5_amt + opp_m6_amt + opp_m7_amt + opp_m8_amt + opp_m9_amt + opp_m10_amt + opp_m11_amt + opp_m12_amt                                                                         as opp_amt_sum
            from wideview_view
        ) as rsp
        left join common_org_full_level_view as org
            on rsp.ccorg_cd = org.org_ccorg_cd;

/**
 * TBD - 작년,올해 최신 인터페이스 버전 데이터 두 건만 사용 조건 추가필요!!
 */
view wideview_view as
    select
                case
                    when
                        total.year is not null
                    then
                        total.year
                    when
                        org_b.year is not null
                    then
                        org_b.year
                    when
                        opp.year is not null
                    then
                        opp.year
                end as year,
                case
                    when
                        total.month is not null
                    then
                        lpad(
                            to_varchar(total.month), 2, '0'
                        )
                    when
                        org_b.month is not null
                    then
                        lpad(
                            to_varchar(org_b.month), 2, '0'
                        )
                    when
                        opp.month is not null
                    then
                        lpad(
                            to_varchar(opp.month), 2, '0'
                        )
                end as month,
                case
                    when
                        total.ccorg_cd is not null
                    then
                        total.ccorg_cd
                    when
                        org_b.ccorg_cd is not null
                    then
                        org_b.ccorg_cd
                    when
                        opp.ccorg_cd is not null
                    then
                        opp.ccorg_cd
                end as ccorg_cd,
        total.total_m1_amt,
        total.total_m2_amt,
        total.total_m3_amt,
        total.total_m4_amt,
        total.total_m5_amt,
        total.total_m6_amt,
        total.total_m7_amt,
        total.total_m8_amt,
        total.total_m9_amt,
        total.total_m10_amt,
        total.total_m11_amt,
        total.total_m12_amt,
        total.total_m1_emp,
        total.total_m2_emp,
        total.total_m3_emp,
        total.total_m4_emp,
        total.total_m5_emp,
        total.total_m6_emp,
        total.total_m7_emp,
        total.total_m8_emp,
        total.total_m9_emp,
        total.total_m10_emp,
        total.total_m11_emp,
        total.total_m12_emp,
        total.avg_m1_amt,
        total.avg_m2_amt,
        total.avg_m3_amt,
        total.avg_m4_amt,
        total.avg_m5_amt,
        total.avg_m6_amt,
        total.avg_m7_amt,
        total.avg_m8_amt,
        total.avg_m9_amt,
        total.avg_m10_amt,
        total.avg_m11_amt,
        total.avg_m12_amt,
        org_b.bill_m1_amt,
        org_b.bill_m2_amt,
        org_b.bill_m3_amt,
        org_b.bill_m4_amt,
        org_b.bill_m5_amt,
        org_b.bill_m6_amt,
        org_b.bill_m7_amt,
        org_b.bill_m8_amt,
        org_b.bill_m9_amt,
        org_b.bill_m10_amt,
        org_b.bill_m11_amt,
        org_b.bill_m12_amt,
        org_b.indirect_cost_m1,
        org_b.indirect_cost_m2,
        org_b.indirect_cost_m3,
        org_b.indirect_cost_m4,
        org_b.indirect_cost_m5,
        org_b.indirect_cost_m6,
        org_b.indirect_cost_m7,
        org_b.indirect_cost_m8,
        org_b.indirect_cost_m9,
        org_b.indirect_cost_m10,
        org_b.indirect_cost_m11,
        org_b.indirect_cost_m12,
        opp.prj_no_sfdc,
        opp.opp_m1_amt,
        opp.opp_m2_amt,
        opp.opp_m3_amt,
        opp.opp_m4_amt,
        opp.opp_m5_amt,
        opp.opp_m6_amt,
        opp.opp_m7_amt,
        opp.opp_m8_amt,
        opp.opp_m9_amt,
        opp.opp_m10_amt,
        opp.opp_m11_amt,
        opp.opp_m12_amt,
        project.biz_tp_account_cd
    from rsp_org_total_labor as total
    full outer join rsp_org_b_labor as org_b
        on  total.ccorg_cd          = org_b.ccorg_cd
        and total.year              = org_b.year
        and to_integer(total.month) = to_integer(org_b.month)
    full outer join rsp_opp_labor as opp
        on(
                total.ccorg_cd          = opp.ccorg_cd
            and total.year              = opp.year
            and to_integer(total.month) = to_integer(opp.month)
        )
        or (
                org_b.ccorg_cd          = opp.ccorg_cd
            and org_b.year              = opp.year
            and to_integer(org_b.month) = to_integer(opp.month)
        )
    left join common_project as project
        on opp.prj_no_sfdc = project.prj_no;
