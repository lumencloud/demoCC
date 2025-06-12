using pl.wideview_view as pl_wideview_view from './wideview_view';
using common.annual_target as common_annual_target from '../../common/target';
using common.account as common_account from '../../common/account';

namespace pl;

view wideview_account_view as
    select from (
        select
            pl.*,
            biz_tp_account_nm,
            ifnull(
                sale_target.target_val, 0
            )                         as target_sale_amt,
            ifnull(
                margin_target.target_val, 0
            )                         as target_margin_rate,
            case
                when
                    sale_target.target_val       is not null
                    and margin_target.target_val is not null
                then
                    sale_target.target_val       *      margin_target.target_val / 100
                else
                    0
            end                       as target_margin_amt
        from (
            select
                ver,
                year,
                month,
                biz_tp_account_cd,
                max(rodr_m1_amt)      as rodr_m1_amt      : Decimal(18, 2),
                max(rodr_m2_amt)      as rodr_m2_amt      : Decimal(18, 2),
                max(rodr_m3_amt)      as rodr_m3_amt      : Decimal(18, 2),
                max(rodr_m4_amt)      as rodr_m4_amt      : Decimal(18, 2),
                max(rodr_m5_amt)      as rodr_m5_amt      : Decimal(18, 2),
                max(rodr_m6_amt)      as rodr_m6_amt      : Decimal(18, 2),
                max(rodr_m7_amt)      as rodr_m7_amt      : Decimal(18, 2),
                max(rodr_m8_amt)      as rodr_m8_amt      : Decimal(18, 2),
                max(rodr_m9_amt)      as rodr_m9_amt      : Decimal(18, 2),
                max(rodr_m10_amt)     as rodr_m10_amt     : Decimal(18, 2),
                max(rodr_m11_amt)     as rodr_m11_amt     : Decimal(18, 2),
                max(rodr_m12_amt)     as rodr_m12_amt     : Decimal(18, 2),
                sum(sale_m1_amt)      as sale_m1_amt      : Decimal(18, 2),
                sum(sale_m2_amt)      as sale_m2_amt      : Decimal(18, 2),
                sum(sale_m3_amt)      as sale_m3_amt      : Decimal(18, 2),
                sum(sale_m4_amt)      as sale_m4_amt      : Decimal(18, 2),
                sum(sale_m5_amt)      as sale_m5_amt      : Decimal(18, 2),
                sum(sale_m6_amt)      as sale_m6_amt      : Decimal(18, 2),
                sum(sale_m7_amt)      as sale_m7_amt      : Decimal(18, 2),
                sum(sale_m8_amt)      as sale_m8_amt      : Decimal(18, 2),
                sum(sale_m9_amt)      as sale_m9_amt      : Decimal(18, 2),
                sum(sale_m10_amt)     as sale_m10_amt     : Decimal(18, 2),
                sum(sale_m11_amt)     as sale_m11_amt     : Decimal(18, 2),
                sum(sale_m12_amt)     as sale_m12_amt     : Decimal(18, 2),
                sum(prj_prfm_m1_amt)  as prj_prfm_m1_amt  : Decimal(18, 2),
                sum(prj_prfm_m2_amt)  as prj_prfm_m2_amt  : Decimal(18, 2),
                sum(prj_prfm_m3_amt)  as prj_prfm_m3_amt  : Decimal(18, 2),
                sum(prj_prfm_m4_amt)  as prj_prfm_m4_amt  : Decimal(18, 2),
                sum(prj_prfm_m5_amt)  as prj_prfm_m5_amt  : Decimal(18, 2),
                sum(prj_prfm_m6_amt)  as prj_prfm_m6_amt  : Decimal(18, 2),
                sum(prj_prfm_m7_amt)  as prj_prfm_m7_amt  : Decimal(18, 2),
                sum(prj_prfm_m8_amt)  as prj_prfm_m8_amt  : Decimal(18, 2),
                sum(prj_prfm_m9_amt)  as prj_prfm_m9_amt  : Decimal(18, 2),
                sum(prj_prfm_m10_amt) as prj_prfm_m10_amt : Decimal(18, 2),
                sum(prj_prfm_m11_amt) as prj_prfm_m11_amt : Decimal(18, 2),
                sum(prj_prfm_m12_amt) as prj_prfm_m12_amt : Decimal(18, 2),
                sum(margin_m1_amt)    as margin_m1_amt    : Decimal(18, 2),
                sum(margin_m2_amt)    as margin_m2_amt    : Decimal(18, 2),
                sum(margin_m3_amt)    as margin_m3_amt    : Decimal(18, 2),
                sum(margin_m4_amt)    as margin_m4_amt    : Decimal(18, 2),
                sum(margin_m5_amt)    as margin_m5_amt    : Decimal(18, 2),
                sum(margin_m6_amt)    as margin_m6_amt    : Decimal(18, 2),
                sum(margin_m7_amt)    as margin_m7_amt    : Decimal(18, 2),
                sum(margin_m8_amt)    as margin_m8_amt    : Decimal(18, 2),
                sum(margin_m9_amt)    as margin_m9_amt    : Decimal(18, 2),
                sum(margin_m10_amt)   as margin_m10_amt   : Decimal(18, 2),
                sum(margin_m11_amt)   as margin_m11_amt   : Decimal(18, 2),
                sum(margin_m12_amt)   as margin_m12_amt   : Decimal(18, 2)
            from pl_wideview_view
            where
                src_type <> 'WO'
            group by
                ver,
                year,
                month,
                biz_tp_account_cd
        ) as pl
        left join common_account as dt
            on pl.biz_tp_account_cd = dt.biz_tp_account_cd
        left join common_annual_target as sale_target
            on  pl.biz_tp_account_cd         = sale_target.target_type_cd
            and pl.year                 = sale_target.year
            and sale_target.target_cd   = 'A01'
            and sale_target.target_type = 'biz_tp_account_cd'
        left join common_annual_target as margin_target
            on  pl.biz_tp_account_cd           = margin_target.target_type_cd
            and pl.year                   = margin_target.year
            and margin_target.target_cd   = 'A02'
            and margin_target.target_type = 'biz_tp_account_cd'
        // where pl.biz_tp_account_cd is not null
        // and pl.biz_tp_account_cd <> ''
    ) {
        key ver,
        key year,
        key month,
        key biz_tp_account_cd,
            biz_tp_account_nm,
            target_sale_amt,
            target_margin_rate,
            target_margin_amt,
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
            margin_m12_amt
    };
