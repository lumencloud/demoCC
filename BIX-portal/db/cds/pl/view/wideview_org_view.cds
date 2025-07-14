using pl.wideview_view as pl_wideview_view from './wideview_view';
using common.annual_target as common_annual_target from '../../common/target';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';

namespace pl;

view wideview_org_view as
    select from (
        select
            pl.*,
            org.*
        from (
            select
                ver,
                year,
                month,
                // src_type,
                div_ccorg_cd  as sale_div_ccorg_cd,
                hdqt_ccorg_cd as sale_hdqt_ccorg_cd,
                // max(case
                //         when
                //             src_type <> 'D'
                //         then
                //             0
                //         else
                //             rodr_year_amt
                //     end)      as sfdc_rodr_year_amt     : Decimal(18, 2) @title: '미확보 연간 수주금액',
                sum(case
                        when
                            src_type <> 'D'
                        then
                            0
                        else
                            sfdc_sale_year_amt
                    end)      as sfdc_sale_year_amt     : Decimal(18, 2) @title: '미확보 연간 매출금액',
                sum(case
                        when
                            src_type <> 'D'
                        then
                            0
                        else
                            sfdc_margin_year_amt
                    end)      as sfdc_margin_year_amt   : Decimal(18, 2) @title: '미확보 연간 마진금액',
                // sum(case
                //         when
                //             src_type <> 'D'
                //         then
                //             0
                //         else
                //             prj_prfm_year_amt
                //     end)      as sfdc_prj_prfm_year_amt : Decimal(18, 2) @title: '미확보 연간 수행금액',
                max(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            rodr_year_amt
                    end)      as rodr_year_amt          : Decimal(18, 2) @title: '확보 연간 수행금액',
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            sale_year_amt
                    end)      as sale_year_amt          : Decimal(18, 2) @title: '확보 연간 매출금액',
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            margin_year_amt
                    end)      as margin_year_amt        : Decimal(18, 2) @title: '확보 연간 마진금액',
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            prj_prfm_year_amt
                    end)      as prj_prfm_year_amt      : Decimal(18, 2) @title: '확보 연간 수행금액',
                max(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            rodr_m1_amt
                    end)      as rodr_m1_amt            : Decimal(18, 2),
                max(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            rodr_m2_amt
                    end)      as rodr_m2_amt            : Decimal(18, 2),
                max(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            rodr_m3_amt
                    end)      as rodr_m3_amt            : Decimal(18, 2),
                max(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            rodr_m4_amt
                    end)      as rodr_m4_amt            : Decimal(18, 2),
                max(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            rodr_m5_amt
                    end)      as rodr_m5_amt            : Decimal(18, 2),
                max(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            rodr_m6_amt
                    end)      as rodr_m6_amt            : Decimal(18, 2),
                max(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            rodr_m7_amt
                    end)      as rodr_m7_amt            : Decimal(18, 2),
                max(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            rodr_m8_amt
                    end)      as rodr_m8_amt            : Decimal(18, 2),
                max(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            rodr_m9_amt
                    end)      as rodr_m9_amt            : Decimal(18, 2),
                max(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            rodr_m10_amt
                    end)      as rodr_m10_amt           : Decimal(18, 2),
                max(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            rodr_m11_amt
                    end)      as rodr_m11_amt           : Decimal(18, 2),
                max(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            rodr_m12_amt
                    end)      as rodr_m12_amt           : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            sale_m1_amt
                    end)      as sale_m1_amt            : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            sale_m2_amt
                    end)      as sale_m2_amt            : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            sale_m3_amt
                    end)      as sale_m3_amt            : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            sale_m4_amt
                    end)      as sale_m4_amt            : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            sale_m5_amt
                    end)      as sale_m5_amt            : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            sale_m6_amt
                    end)      as sale_m6_amt            : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            sale_m7_amt
                    end)      as sale_m7_amt            : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            sale_m8_amt
                    end)      as sale_m8_amt            : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            sale_m9_amt
                    end)      as sale_m9_amt            : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            sale_m10_amt
                    end)      as sale_m10_amt           : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            sale_m11_amt
                    end)      as sale_m11_amt           : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            sale_m12_amt
                    end)      as sale_m12_amt           : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            prj_prfm_m1_amt
                    end)      as prj_prfm_m1_amt        : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            prj_prfm_m2_amt
                    end)      as prj_prfm_m2_amt        : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            prj_prfm_m3_amt
                    end)      as prj_prfm_m3_amt        : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            prj_prfm_m4_amt
                    end)      as prj_prfm_m4_amt        : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            prj_prfm_m5_amt
                    end)      as prj_prfm_m5_amt        : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            prj_prfm_m6_amt
                    end)      as prj_prfm_m6_amt        : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            prj_prfm_m7_amt
                    end)      as prj_prfm_m7_amt        : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            prj_prfm_m8_amt
                    end)      as prj_prfm_m8_amt        : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            prj_prfm_m9_amt
                    end)      as prj_prfm_m9_amt        : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            prj_prfm_m10_amt
                    end)      as prj_prfm_m10_amt       : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            prj_prfm_m11_amt
                    end)      as prj_prfm_m11_amt       : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            prj_prfm_m12_amt
                    end)      as prj_prfm_m12_amt       : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            margin_m1_amt
                    end)      as margin_m1_amt          : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            margin_m2_amt
                    end)      as margin_m2_amt          : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            margin_m3_amt
                    end)      as margin_m3_amt          : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            margin_m4_amt
                    end)      as margin_m4_amt          : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            margin_m5_amt
                    end)      as margin_m5_amt          : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            margin_m6_amt
                    end)      as margin_m6_amt          : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            margin_m7_amt
                    end)      as margin_m7_amt          : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            margin_m8_amt
                    end)      as margin_m8_amt          : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            margin_m9_amt
                    end)      as margin_m9_amt          : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            margin_m10_amt
                    end)      as margin_m10_amt         : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            margin_m11_amt
                    end)      as margin_m11_amt         : Decimal(18, 2),
                sum(case
                        when
                            src_type = 'D'
                        then
                            0
                        else
                            margin_m12_amt
                    end)      as margin_m12_amt         : Decimal(18, 2)
            from pl_wideview_view
            where
                src_type not in ('WA')
            group by
                ver,
                year,
                month,
                // src_type,
                div_ccorg_cd,
                hdqt_ccorg_cd
        ) as pl
        left join common_org_full_level_view as org
            on      pl.sale_hdqt_ccorg_cd =  org.org_ccorg_cd
            or (
                    pl.sale_div_ccorg_cd  =  org.org_ccorg_cd
                and pl.sale_hdqt_ccorg_cd is null
            )
        left join common_annual_target as sale_target
            on  org.org_ccorg_cd        = sale_target.target_type_cd
            and pl.year                 = sale_target.year
            and sale_target.target_cd   = 'A01'
            and sale_target.target_type = 'ccorg_cd'
        left join common_annual_target as margin_target
            on  org.org_ccorg_cd          = margin_target.target_type_cd
            and pl.year                   = margin_target.year
            and margin_target.target_cd   = 'A02'
            and margin_target.target_type = 'ccorg_cd'
        left join common_annual_target as margin_amt_target
            on  org.org_ccorg_cd              = margin_amt_target.target_type_cd
            and pl.year                       = margin_amt_target.year
            and margin_amt_target.target_cd   = 'A03'
            and margin_amt_target.target_type = 'ccorg_cd'
        // 부문의 목표
        left join common_annual_target as div_sale_target
            on  org.div_ccorg_cd            = div_sale_target.target_type_cd
            and pl.year                     = div_sale_target.year
            and div_sale_target.target_cd   = 'A01'
            and div_sale_target.target_type = 'ccorg_cd'
        left join common_annual_target as div_margin_target
            on  org.div_ccorg_cd              = div_margin_target.target_type_cd
            and pl.year                       = div_margin_target.year
            and div_margin_target.target_cd   = 'A02'
            and div_margin_target.target_type = 'ccorg_cd'
    ) {
        key ver,
        key year,
        key month,
            // key src_type,
        key org_ccorg_cd,
            org_id,
            org_order,
            org_parent,
            org_name,
            org_tp,
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
            team_ccorg_cd,
            rodr_year_amt,
            sale_year_amt,
            margin_year_amt,
            prj_prfm_year_amt,
            sfdc_sale_year_amt,
            sfdc_margin_year_amt,
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
