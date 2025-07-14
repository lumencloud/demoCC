using oi.ito as oi_ito from '../ito';
using oi.ito_sfdc as oi_ito_sfdc from '../ito_sfdc';
using common.version as common_version from '../../common/version';
using common.code_item as common_code_item from '../../common/code';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';

namespace oi;

view wideview_view as
        select from (
            select
                oi.*,
                org.*
            from (
                select
                    ver,
                    year,
                    month,
                    ccorg_cd,
                    ito_type,
                    prj_tp_nm,
                    'oi'                                                                                                                                                         as source        : String(10),
                    ito_m1_amt,
                    ito_m2_amt,
                    ito_m3_amt,
                    ito_m4_amt,
                    ito_m5_amt,
                    ito_m6_amt,
                    ito_m7_amt,
                    ito_m8_amt,
                    ito_m9_amt,
                    ito_m10_amt,
                    ito_m11_amt,
                    ito_m12_amt,
                    case
                        when to_integer(month)                                                                   >= 1
                             then ito_m1_amt
                        else 0
                    end + case
                              when to_integer(month)                                                             >= 2
                                   then ito_m2_amt
                              else 0
                          end + case
                                    when to_integer(month)                                                       >= 3
                                         then ito_m3_amt
                                    else 0
                                end + case
                                          when to_integer(month)                                                 >= 4
                                               then ito_m4_amt
                                          else 0
                                      end + case
                                                when to_integer(month)                                           >= 5
                                                     then ito_m5_amt
                                                else 0
                                            end + case
                                                      when to_integer(month)                                     >= 6
                                                           then ito_m6_amt
                                                      else 0
                                                  end + case
                                                            when to_integer(month)                               >= 7
                                                                 then ito_m7_amt
                                                            else 0
                                                        end + case
                                                                  when to_integer(month)                         >= 8
                                                                       then ito_m8_amt
                                                                  else 0
                                                              end + case
                                                                        when to_integer(month)                   >= 9
                                                                             then ito_m9_amt
                                                                        else 0
                                                                    end + case
                                                                              when to_integer(month)             >= 10
                                                                                   then ito_m10_amt
                                                                              else 0
                                                                          end + case
                                                                                    when to_integer(month)       >= 11
                                                                                         then ito_m11_amt
                                                                                    else 0
                                                                                end + case
                                                                                          when to_integer(month) >= 12
                                                                                               then ito_m12_amt
                                                                                          else 0
                                                                                      end                                                                                        as ito_month_amt : Decimal(18, 2),
                    ito_m1_amt + ito_m2_amt + ito_m3_amt + ito_m4_amt + ito_m5_amt + ito_m6_amt + ito_m7_amt + ito_m8_amt + ito_m9_amt + ito_m10_amt + ito_m11_amt + ito_m12_amt as ito_year_amt  : Decimal(18, 2)
                from oi_ito as oi
                where
                        ito_type in (
                        'AGS', 'ATS'
                    )
                    and ver      in (
                        select ver from common_version
                        where
                            tag in ('C')
                    )
            union all
                select
                    ver,
                    year,
                    month,
                    ccorg_cd,
                    ito_type,
                    prj_tp_nm,
                    'sfdc'                                                                       as source        : String(10),
                    ito_m1_amt / to_integer(oi_avg_labor.value) * to_integer(oi_offshore.value)  as ito_m1_amt    : Decimal(18, 2),
                    ito_m2_amt / to_integer(oi_avg_labor.value) * to_integer(oi_offshore.value)  as ito_m2_amt    : Decimal(18, 2),
                    ito_m3_amt / to_integer(oi_avg_labor.value) * to_integer(oi_offshore.value)  as ito_m3_amt    : Decimal(18, 2),
                    ito_m4_amt / to_integer(oi_avg_labor.value) * to_integer(oi_offshore.value)  as ito_m4_amt    : Decimal(18, 2),
                    ito_m5_amt / to_integer(oi_avg_labor.value) * to_integer(oi_offshore.value)  as ito_m5_amt    : Decimal(18, 2),
                    ito_m6_amt / to_integer(oi_avg_labor.value) * to_integer(oi_offshore.value)  as ito_m6_amt    : Decimal(18, 2),
                    ito_m7_amt / to_integer(oi_avg_labor.value) * to_integer(oi_offshore.value)  as ito_m7_amt    : Decimal(18, 2),
                    ito_m8_amt / to_integer(oi_avg_labor.value) * to_integer(oi_offshore.value)  as ito_m8_amt    : Decimal(18, 2),
                    ito_m9_amt / to_integer(oi_avg_labor.value) * to_integer(oi_offshore.value)  as ito_m9_amt    : Decimal(18, 2),
                    ito_m10_amt / to_integer(oi_avg_labor.value) * to_integer(oi_offshore.value) as ito_m10_amt   : Decimal(18, 2),
                    ito_m11_amt / to_integer(oi_avg_labor.value) * to_integer(oi_offshore.value) as ito_m11_amt   : Decimal(18, 2),
                    ito_m12_amt / to_integer(oi_avg_labor.value) * to_integer(oi_offshore.value) as ito_m12_amt   : Decimal(18, 2),
                    (
                        case
                            when to_integer(month)                                                                   < 1
                                 then ito_m1_amt
                            else 0
                        end + case
                                  when to_integer(month)                                                             < 2
                                       then ito_m2_amt
                                  else 0
                              end + case
                                        when to_integer(month)                                                       < 3
                                             then ito_m3_amt
                                        else 0
                                    end + case
                                              when to_integer(month)                                                 < 4
                                                   then ito_m4_amt
                                              else 0
                                          end + case
                                                    when to_integer(month)                                           < 5
                                                         then ito_m5_amt
                                                    else 0
                                                end + case
                                                          when to_integer(month)                                     < 6
                                                               then ito_m6_amt
                                                          else 0
                                                      end + case
                                                                when to_integer(month)                               < 7
                                                                     then ito_m7_amt
                                                                else 0
                                                            end + case
                                                                      when to_integer(month)                         < 8
                                                                           then ito_m8_amt
                                                                      else 0
                                                                  end + case
                                                                            when to_integer(month)                   < 9
                                                                                 then ito_m9_amt
                                                                            else 0
                                                                        end + case
                                                                                  when to_integer(month)             < 10
                                                                                       then ito_m10_amt
                                                                                  else 0
                                                                              end + case
                                                                                        when to_integer(month)       < 11
                                                                                             then ito_m11_amt
                                                                                        else 0
                                                                                    end + case
                                                                                              when to_integer(month) < 12
                                                                                                   then ito_m12_amt
                                                                                              else 0
                                                                                          end
                    ) / to_integer(oi_avg_labor.value) * to_integer(oi_offshore.value)           as ito_month_amt : Decimal(18, 2),
                    (
                        ito_m1_amt + ito_m2_amt + ito_m3_amt + ito_m4_amt + ito_m5_amt + ito_m6_amt + ito_m7_amt + ito_m8_amt + ito_m9_amt + ito_m10_amt + ito_m11_amt + ito_m12_amt
                    ) / to_integer(oi_avg_labor.value) * to_integer(oi_offshore.value)           as ito_year_amt  : Decimal(18, 2)
                from oi_ito_sfdc as oi_sfdc
                left join common_code_item as oi_avg_labor
                    on  oi_avg_labor.value_opt1 = oi_sfdc.year
                    and oi_avg_labor.name       = 'oi_avg_labor'
                left join common_code_item as oi_offshore
                    on  oi_offshore.value_opt1 = oi_sfdc.year
                    and oi_offshore.name       = 'oi_offshore'
                where
                        ito_type in (
                        'AGS', 'ATS'
                    )
                    and ver      in (
                        select ver from common_version
                        where
                            tag in ('C')
                    )
                    and year     =  substring(
                        ver, 2, 4
                    )
            ) as oi
            left join common_org_full_level_view as org
                on oi.ccorg_cd = org.org_ccorg_cd
        ) {
            key ver,
            key year,
            key month,
            key ccorg_cd,
            key ito_type,
            key prj_tp_nm,
            key source,
                ito_month_amt,
                ito_year_amt,
                ito_m1_amt,
                ito_m2_amt,
                ito_m3_amt,
                ito_m4_amt,
                ito_m5_amt,
                ito_m6_amt,
                ito_m7_amt,
                ito_m8_amt,
                ito_m9_amt,
                ito_m10_amt,
                ito_m11_amt,
                ito_m12_amt,
                is_delivery,
                is_total_cc,
                org_tp,
                org_id,
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
        }
