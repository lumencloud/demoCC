using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';
using sga.wideview_view as sga_wideview from '../view/wideview_view';

namespace sga;

/**
 * SG&A 월별 unpivot 뷰
 *
 * 참고
 * sga_wideview.month => [추정월]
 * 1~12 월 (m1~m12_amt 컬럼) 중 [추청월]-1 까지의 컬럼은 실적 / 이후는 추정 데이터
 *
 */
view wideview_unpivot_view as
        select from (
            select * from (
                select
                    year,
                    month,
                    ccorg_cd,
                    shared_exp_yn,
                    case
                        when to_integer(month) > 1 then true
                        else false
                    end as actual_yn : Boolean,
                    '01'         as month_amt                                                                                                                                                                         : String(2),
                    labor_m1_amt as labor_amount,
                    labor_m1_amt as labor_amount_sum,
                    iv_m1_amt    as iv_amount,
                    iv_m1_amt    as iv_amount_sum,
                    exp_m1_amt   as exp_amount,
                    exp_m1_amt   as exp_amount_sum
                from sga_wideview
                union all select
                    year,
                    month,
                    ccorg_cd,
                    shared_exp_yn,
                    case
                        when to_integer(month) > 2 then true
                        else false
                    end as actual_yn : Boolean,
                    '02'                        as month_amt                                                                                                                                                          : String(2),
                    labor_m2_amt                as labor_amount,
                    labor_m1_amt + labor_m2_amt as labor_amount_sum,
                    iv_m2_amt                   as iv_amount,
                    iv_m1_amt + iv_m2_amt       as iv_amount_sum,
                    exp_m2_amt                  as exp_amount,
                    exp_m1_amt + exp_m2_amt     as exp_amount_sum
                from sga_wideview
                union all select
                    year,
                    month,
                    ccorg_cd,
                    shared_exp_yn,
                    case
                        when to_integer(month) > 3 then true
                        else false
                    end as actual_yn : Boolean,
                    '03'                                       as month_amt                                                                                                                                           : String(2),
                    labor_m3_amt                               as labor_amount,
                    labor_m1_amt + labor_m2_amt + labor_m3_amt as labor_amount_sum,
                    iv_m3_amt                                  as iv_amount,
                    iv_m1_amt + iv_m2_amt + iv_m3_amt          as iv_amount_sum,
                    exp_m3_amt                                 as exp_amount,
                    exp_m1_amt + exp_m2_amt + exp_m3_amt       as exp_amount_sum
                from sga_wideview
                union all select
                    year,
                    month,
                    ccorg_cd,
                    shared_exp_yn,
                    case
                        when to_integer(month) > 4 then true
                        else false
                    end as actual_yn : Boolean,
                    '04'                                                      as month_amt                                                                                                                            : String(2),
                    labor_m4_amt                                              as labor_amount,
                    labor_m1_amt + labor_m2_amt + labor_m3_amt + labor_m4_amt as labor_amount_sum,
                    iv_m4_amt                                                 as iv_amount,
                    iv_m1_amt + iv_m2_amt + iv_m3_amt + iv_m4_amt             as iv_amount_sum,
                    exp_m4_amt                                                as exp_amount,
                    exp_m1_amt + exp_m2_amt + exp_m3_amt + exp_m4_amt         as exp_amount_sum
                from sga_wideview
                union all select
                    year,
                    month,
                    ccorg_cd,
                    shared_exp_yn,
                    case
                        when to_integer(month) > 5 then true
                        else false
                    end as actual_yn : Boolean,
                    '05'                                                                     as month_amt                                                                                                             : String(2),
                    labor_m5_amt                                                             as labor_amount,
                    labor_m1_amt + labor_m2_amt + labor_m3_amt + labor_m4_amt + labor_m5_amt as labor_amount_sum,
                    iv_m5_amt                                                                as iv_amount,
                    iv_m1_amt + iv_m2_amt + iv_m3_amt + iv_m4_amt + iv_m5_amt                as iv_amount_sum,
                    exp_m5_amt                                                               as exp_amount,
                    exp_m1_amt + exp_m2_amt + exp_m3_amt + exp_m4_amt + exp_m5_amt           as exp_amount_sum
                from sga_wideview
                union all select
                    year,
                    month,
                    ccorg_cd,
                    shared_exp_yn,
                    case
                        when to_integer(month) > 6 then true
                        else false
                    end as actual_yn : Boolean,
                    '06'                                                                                    as month_amt                                                                                              : String(2),
                    labor_m6_amt                                                                            as labor_amount,
                    labor_m1_amt + labor_m2_amt + labor_m3_amt + labor_m4_amt + labor_m5_amt + labor_m6_amt as labor_amount_sum,
                    iv_m6_amt                                                                               as iv_amount,
                    iv_m1_amt + iv_m2_amt + iv_m3_amt + iv_m4_amt + iv_m5_amt + iv_m6_amt                   as iv_amount_sum,
                    exp_m6_amt                                                                              as exp_amount,
                    exp_m1_amt + exp_m2_amt + exp_m3_amt + exp_m4_amt + exp_m5_amt + exp_m6_amt             as exp_amount_sum
                from sga_wideview
                union all select
                    year,
                    month,
                    ccorg_cd,
                    shared_exp_yn,
                    case
                        when to_integer(month) > 7 then true
                        else false
                    end as actual_yn : Boolean,
                    '07'                                                                                                   as month_amt                                                                               : String(2),
                    labor_m7_amt                                                                                           as labor_amount,
                    labor_m1_amt + labor_m2_amt + labor_m3_amt + labor_m4_amt + labor_m5_amt + labor_m6_amt + labor_m7_amt as labor_amount_sum,
                    iv_m7_amt                                                                                              as iv_amount,
                    iv_m1_amt + iv_m2_amt + iv_m3_amt + iv_m4_amt + iv_m5_amt + iv_m6_amt + iv_m7_amt                      as iv_amount_sum,
                    exp_m7_amt                                                                                             as exp_amount,
                    exp_m1_amt + exp_m2_amt + exp_m3_amt + exp_m4_amt + exp_m5_amt + exp_m6_amt + exp_m7_amt               as exp_amount_sum
                from sga_wideview
                union all select
                    year,
                    month,
                    ccorg_cd,
                    shared_exp_yn,
                    case
                        when to_integer(month) > 8 then true
                        else false
                    end as actual_yn : Boolean,
                    '08'                                                                                                                  as month_amt                                                                : String(2),
                    labor_m8_amt                                                                                                          as labor_amount,
                    labor_m1_amt + labor_m2_amt + labor_m3_amt + labor_m4_amt + labor_m5_amt + labor_m6_amt + labor_m7_amt + labor_m8_amt as labor_amount_sum,
                    iv_m8_amt                                                                                                             as iv_amount,
                    iv_m1_amt + iv_m2_amt + iv_m3_amt + iv_m4_amt + iv_m5_amt + iv_m6_amt + iv_m7_amt + iv_m8_amt                         as iv_amount_sum,
                    exp_m8_amt                                                                                                            as exp_amount,
                    exp_m1_amt + exp_m2_amt + exp_m3_amt + exp_m4_amt + exp_m5_amt + exp_m6_amt + exp_m7_amt + exp_m8_amt                 as exp_amount_sum
                from sga_wideview
                union all select
                    year,
                    month,
                    ccorg_cd,
                    shared_exp_yn,
                    case
                        when to_integer(month) > 9 then true
                        else false
                    end as actual_yn : Boolean,
                    '09'                                                                                                                                 as month_amt                                                 : String(2),
                    labor_m9_amt                                                                                                                         as labor_amount,
                    labor_m1_amt + labor_m2_amt + labor_m3_amt + labor_m4_amt + labor_m5_amt + labor_m6_amt + labor_m7_amt + labor_m8_amt + labor_m9_amt as labor_amount_sum,
                    iv_m9_amt                                                                                                                            as iv_amount,
                    iv_m1_amt + iv_m2_amt + iv_m3_amt + iv_m4_amt + iv_m5_amt + iv_m6_amt + iv_m7_amt + iv_m8_amt + iv_m9_amt                            as iv_amount_sum,
                    exp_m9_amt                                                                                                                           as exp_amount,
                    exp_m1_amt + exp_m2_amt + exp_m3_amt + exp_m4_amt + exp_m5_amt + exp_m6_amt + exp_m7_amt + exp_m8_amt + exp_m9_amt                   as exp_amount_sum
                from sga_wideview
                union all select
                    year,
                    month,
                    ccorg_cd,
                    shared_exp_yn,
                    case
                        when to_integer(month) > 10 then true
                        else false
                    end as actual_yn : Boolean,
                    '10'                                                                                                                                                 as month_amt                                 : String(2),
                    labor_m10_amt                                                                                                                                        as labor_amount,
                    labor_m1_amt + labor_m2_amt + labor_m3_amt + labor_m4_amt + labor_m5_amt + labor_m6_amt + labor_m7_amt + labor_m8_amt + labor_m9_amt + labor_m10_amt as labor_amount_sum,
                    iv_m10_amt                                                                                                                                           as iv_amount,
                    iv_m1_amt + iv_m2_amt + iv_m3_amt + iv_m4_amt + iv_m5_amt + iv_m6_amt + iv_m7_amt + iv_m8_amt + iv_m9_amt + iv_m10_amt                               as iv_amount_sum,
                    exp_m10_amt                                                                                                                                          as exp_amount,
                    exp_m1_amt + exp_m2_amt + exp_m3_amt + exp_m4_amt + exp_m5_amt + exp_m6_amt + exp_m7_amt + exp_m8_amt + exp_m9_amt + exp_m10_amt                     as exp_amount_sum
                from sga_wideview
                union all select
                    year,
                    month,
                    ccorg_cd,
                    shared_exp_yn,
                    case
                        when to_integer(month) > 11 then true
                        else false
                    end as actual_yn : Boolean,
                    '11'                                                                                                                                                                 as month_amt                 : String(2),
                    labor_m11_amt                                                                                                                                                        as labor_amount,
                    labor_m1_amt + labor_m2_amt + labor_m3_amt + labor_m4_amt + labor_m5_amt + labor_m6_amt + labor_m7_amt + labor_m8_amt + labor_m9_amt + labor_m10_amt + labor_m11_amt as labor_amount_sum,
                    iv_m11_amt                                                                                                                                                           as iv_amount,
                    iv_m1_amt + iv_m2_amt + iv_m3_amt + iv_m4_amt + iv_m5_amt + iv_m6_amt + iv_m7_amt + iv_m8_amt + iv_m9_amt + iv_m10_amt + iv_m11_amt                                  as iv_amount_sum,
                    exp_m11_amt                                                                                                                                                          as exp_amount,
                    exp_m1_amt + exp_m2_amt + exp_m3_amt + exp_m4_amt + exp_m5_amt + exp_m6_amt + exp_m7_amt + exp_m8_amt + exp_m9_amt + exp_m10_amt + exp_m11_amt                       as exp_amount_sum
                from sga_wideview
                union all select
                    year,
                    month,
                    ccorg_cd,
                    shared_exp_yn,
                    case
                        when to_integer(month) > 12 then true
                        else false
                    end as actual_yn : Boolean,
                    '12'                                                                                                                                                                                 as month_amt : String(2),
                    labor_m12_amt                                                                                                                                                                        as labor_amount,
                    labor_m1_amt + labor_m2_amt + labor_m3_amt + labor_m4_amt + labor_m5_amt + labor_m6_amt + labor_m7_amt + labor_m8_amt + labor_m9_amt + labor_m10_amt + labor_m11_amt + labor_m12_amt as labor_amount_sum,
                    iv_m12_amt                                                                                                                                                                           as iv_amount,
                    iv_m1_amt + iv_m2_amt + iv_m3_amt + iv_m4_amt + iv_m5_amt + iv_m6_amt + iv_m7_amt + iv_m8_amt + iv_m9_amt + iv_m10_amt + iv_m11_amt + iv_m12_amt                                     as iv_amount_sum,
                    exp_m12_amt                                                                                                                                                                          as exp_amount,
                    exp_m1_amt + exp_m2_amt + exp_m3_amt + exp_m4_amt + exp_m5_amt + exp_m6_amt + exp_m7_amt + exp_m8_amt + exp_m9_amt + exp_m10_amt + exp_m11_amt + exp_m12_amt                         as exp_amount_sum
                from sga_wideview
            ) as sga
            left join common_org_full_level_view as org
                on sga.ccorg_cd = org.org_ccorg_cd
        ) ;
        // {
        //     key year,
        //     key month, // 추정월
        //     key month_amt, // 1~12월 컬럼 데이터의 해당 월
        //     key org_id,
        //     key ccorg_cd,
        //         shared_exp_yn,
        //         actual_yn,
        //         is_delivery,
        //         labor_amount,
        //         labor_amount_sum,
        //         iv_amount,
        //         iv_amount_sum,
        //         exp_amount,
        //         exp_amount_sum,
        //         lv1_id,
        //         lv1_name,
        //         lv1_ccorg_cd,
        //         lv2_id,
        //         lv2_name,
        //         lv2_ccorg_cd,
        //         lv3_id,
        //         lv3_name,
        //         lv3_ccorg_cd,
        //         div_id,
        //         div_name,
        //         div_ccorg_cd,
        //         hdqt_id,
        //         hdqt_name,
        //         hdqt_ccorg_cd,
        //         team_id,
        //         team_name,
        //         team_ccorg_cd
        // }
