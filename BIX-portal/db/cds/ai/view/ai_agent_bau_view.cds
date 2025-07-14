using pl.pipeline_view as pl_pipeline_view from '../../pl/view/pipeline_view';
using pl.sfdc_contract_view as pl_sfdc_contract_view from '../../pl/view/sfdc_contract_view';
using common.org_full_level_view as org_full_level_view from '../../common/view/org_full_level_view';

namespace ai;

view ai_agent_bau_view2(start_date : String(10), end_date : String(10)) as
    select from (
        select
            biz_opp_nm,
            MIN(deal_stage_chg_dt) as change_date,
            MIN(deal_stage_cd)     as deal_stage_cd,
            MIN(cstco_name)        as cstco_nm,
            MIN(dgtr_task_nm)      as dgtr_task_nm,
            MIN(biz_tp_account_nm) as biz_tp_account_nm,
            MIN(biz_tp_account_cd) as biz_account,
            ROUND(
                SUM(COALESCE(
                    rodr_m1_amt, 0
                )  + COALESCE(
                    rodr_m2_amt, 0
                )+COALESCE(
                    rodr_m3_amt, 0
                )+COALESCE(
                    rodr_m4_amt, 0
                )+COALESCE(
                    rodr_m5_amt, 0
                )+COALESCE(
                    rodr_m6_amt, 0
                )+COALESCE(
                    rodr_m7_amt, 0
                )+COALESCE(
                    rodr_m8_amt, 0
                )+COALESCE(
                    rodr_m9_amt, 0
                )+COALESCE(
                    rodr_m10_amt, 0
                )+COALESCE(
                    rodr_m11_amt, 0
                )+COALESCE(
                    rodr_m12_amt, 0
                )) / 100000000, 2
            )                      as total_target_amt,
            COUNT( * )             as record_count
        from pl_pipeline_view
        where
                    1                 =       1
            and     deal_stage_chg_dt between :start_date
            and :end_date
            and (
                    deal_stage_cd     =       'Lead'
                                                    // or deal_stage_cd     =       'Identified'
                                                    // or deal_stage_cd     =       'Registered'
                                                    // or deal_stage_cd     =       'Validated'
                                              )
                and ifnull(length(dgtr_task_cd),0) = 0
                and weekly_yn         =       true
            group by
                biz_opp_nm
            order by
                total_target_amt desc
        ) {
            biz_opp_nm        : String(120),
            change_date       : Date,
            deal_stage_cd     : String(20),
            cstco_nm          : String(100),
            dgtr_task_nm      : String(30),
            biz_tp_account_nm : String(30),
            biz_account       : String(30),
            total_target_amt  : Decimal(18, 2),
            record_count      : Integer
        }


view ai_agent_bau_view3(start_date : String(10), end_date : String(10)) as
        select from (
            (
                select
                    biz_opp_nm,
                    deal_stage_change_date,
                    deal_stage_cd,
                    cstco_nm,
                    dgtr_task_nm,
                    biz_tp_account_nm,
                    biz_account,
                    deselected_reason,
                    total_target_amt,
                    1 as record_count
                from (
                    select
                        biz_opp_nm,
                        deal_stage_change_date,
                        deal_stage_cd,
                        cstco_nm,
                        dgtr_task_nm,
                        biz_tp_account_nm,
                        biz_account,
                        deselected_reason,
                        total_target_amt,
                        ROW_NUMBER() over(order by total_target_amt desc) as rn
                    from (
                        select
                            biz_opp_nm,
                            MIN(deal_stage_chg_dt) as deal_stage_change_date,
                            MIN(deal_stage_cd)     as deal_stage_cd,
                            MIN(cstco_name)        as cstco_nm,
                            MIN(dgtr_task_nm)      as dgtr_task_nm,
                            MIN(biz_tp_account_nm) as biz_tp_account_nm,
                            MIN(biz_tp_account_cd) as biz_account,
                            MIN(cls_rsn_tp_nm)     as deselected_reason,
                            SUM(COALESCE(
                                rodr_m1_amt, 0
                            )+COALESCE(
                                rodr_m2_amt, 0
                            )+COALESCE(
                                rodr_m3_amt, 0
                            )+COALESCE(
                                rodr_m4_amt, 0
                            )+COALESCE(
                                rodr_m5_amt, 0
                            )+COALESCE(
                                rodr_m6_amt, 0
                            )+COALESCE(
                                rodr_m7_amt, 0
                            )+COALESCE(
                                rodr_m8_amt, 0
                            )+COALESCE(
                                rodr_m9_amt, 0
                            )+COALESCE(
                                rodr_m10_amt, 0
                            )+COALESCE(
                                rodr_m11_amt, 0
                            )+COALESCE(
                                rodr_m12_amt, 0
                            ))                     as total_target_amt,
                            COUNT( * )             as record_count
                        from pl_pipeline_view
                        where
                                   deal_stage_chg_dt between :start_date
                            and :end_date
                            and (
                                   deal_stage_cd     =       'Deselected'
                                or deal_stage_cd     =       'Deal Lost'
                            )
                            and    ifnull(length(dgtr_task_cd),0) = 0
                            and    weekly_yn         =       true
                        group by
                            biz_opp_nm
                        order by
                            total_target_amt desc
                    )
                )
                where
                    rn < 5
            )

            union all

            (
                select
                    max(case
                            when rn = 5
                                 then '기타'
                            else ''
                        end)              as biz_opp_nm,
                    max(case
                            when rn = 5
                                 then deal_stage_change_date
                            else ''
                        end)              as deal_stage_change_date,
                    max(case
                            when rn = 5
                                 then deal_stage_cd
                            else ''
                        end)              as deal_stage_cd,
                    max(case
                            when rn = 5
                                 then cstco_nm
                            else ''
                        end)              as cstco_nm,
                    max(case
                            when rn = 5
                                 then dgtr_task_nm
                            else ''
                        end)              as dgtr_task_nm,
                    max(case
                            when rn = 5
                                 then biz_tp_account_nm
                            else ''
                        end)              as biz_tp_account_nm,
                    max(case
                            when rn = 5
                                 then biz_account
                            else ''
                        end)              as biz_account,
                    max(case
                            when rn = 5
                                 then deselected_reason
                            else ''
                        end)              as deselected_reason,
                    sum(total_target_amt) as total_target_amt,
                    sum(record_count)     as record_count
                from (
                    select
                        biz_opp_nm,
                        deal_stage_change_date,
                        deal_stage_cd,
                        cstco_nm,
                        dgtr_task_nm,
                        biz_tp_account_nm,
                        biz_account,
                        deselected_reason,
                        total_target_amt,
                        ROW_NUMBER() over(order by total_target_amt desc) as rn,
                        record_count
                    from (
                        select
                            biz_opp_nm,
                            MIN(deal_stage_chg_dt) as deal_stage_change_date,
                            MIN(deal_stage_cd)     as deal_stage_cd,
                            MIN(cstco_name)        as cstco_nm,
                            MIN(dgtr_task_nm)      as dgtr_task_nm,
                            MIN(biz_tp_account_nm) as biz_tp_account_nm,
                            MIN(biz_tp_account_cd) as biz_account,
                            MIN(cls_rsn_tp_nm)     as deselected_reason,
                            SUM(COALESCE(
                                rodr_m1_amt, 0
                            )+COALESCE(
                                rodr_m2_amt, 0
                            )+COALESCE(
                                rodr_m3_amt, 0
                            )+COALESCE(
                                rodr_m4_amt, 0
                            )+COALESCE(
                                rodr_m5_amt, 0
                            )+COALESCE(
                                rodr_m6_amt, 0
                            )+COALESCE(
                                rodr_m7_amt, 0
                            )+COALESCE(
                                rodr_m8_amt, 0
                            )+COALESCE(
                                rodr_m9_amt, 0
                            )+COALESCE(
                                rodr_m10_amt, 0
                            )+COALESCE(
                                rodr_m11_amt, 0
                            )+COALESCE(
                                rodr_m12_amt, 0
                            ))                     as total_target_amt,
                            COUNT( * )             as record_count
                        from pl_pipeline_view
                        where
                                   deal_stage_chg_dt between :start_date
                            and :end_date
                            and (
                                   deal_stage_cd     =       'Deselected'
                                or deal_stage_cd     =       'Deal Lost'
                            )
                            and    ifnull(length(dgtr_task_cd),0) = 0
                            and    weekly_yn         =       true
                        group by
                            biz_opp_nm
                        order by
                            total_target_amt desc
                    )
                )
                where
                    rn >= 5
                having
                    count(biz_opp_nm) > 0
            )
        ) {
            biz_opp_nm             : String(120),
            deal_stage_change_date : Date,
            deal_stage_cd          : String(20),
            cstco_nm               : String(100),
            dgtr_task_nm           : String(30),
            biz_tp_account_nm      : String(30),
            biz_account            : String(30),
            deselected_reason      : String(30),
            total_target_amt       : Decimal(18, 2),
            record_count           : Integer
        }

view ai_agent_bau_view4(start_date : String(10), end_date : String(10)) as
        select from (
            (
                select
                    biz_opp_nm,
                    deal_stage_change_date,
                    deal_stage_cd,
                    cstco_nm,
                    dgtr_task_nm,
                    biz_tp_account_nm,
                    biz_account,
                    deselected_reason,
                    total_target_amt,
                    1 as record_count
                from (
                    select
                        biz_opp_nm,
                        deal_stage_change_date,
                        deal_stage_cd,
                        cstco_nm,
                        dgtr_task_nm,
                        biz_tp_account_nm,
                        biz_account,
                        deselected_reason,
                        total_target_amt,
                        ROW_NUMBER() over(order by total_target_amt desc) as rn
                    from (
                        select
                            biz_opp_nm,
                            MIN(deal_stage_chg_dt) as deal_stage_change_date,
                            MIN(deal_stage_cd)     as deal_stage_cd,
                            MIN(cstco_name)        as cstco_nm,
                            MIN(dgtr_task_nm)      as dgtr_task_nm,
                            MIN(biz_tp_account_nm) as biz_tp_account_nm,
                            MIN(biz_tp_account_cd) as biz_account,
                            MIN(cls_rsn_tp_nm)     as deselected_reason,
                            SUM(COALESCE(
                                rodr_m1_amt, 0
                            )+COALESCE(
                                rodr_m2_amt, 0
                            )+COALESCE(
                                rodr_m3_amt, 0
                            )+COALESCE(
                                rodr_m4_amt, 0
                            )+COALESCE(
                                rodr_m5_amt, 0
                            )+COALESCE(
                                rodr_m6_amt, 0
                            )+COALESCE(
                                rodr_m7_amt, 0
                            )+COALESCE(
                                rodr_m8_amt, 0
                            )+COALESCE(
                                rodr_m9_amt, 0
                            )+COALESCE(
                                rodr_m10_amt, 0
                            )+COALESCE(
                                rodr_m11_amt, 0
                            )+COALESCE(
                                rodr_m12_amt, 0
                            ))                     as total_target_amt,
                            COUNT( * )             as record_count
                        from pl_pipeline_view
                        where
                                deal_stage_chg_dt between :start_date
                            and :end_date
                            and deal_stage_cd     =       'Negotiated'
                            and ifnull(length(dgtr_task_cd),0) = 0
                            and weekly_yn         =       true
                        group by
                            biz_opp_nm
                        order by
                            total_target_amt desc
                    )
                )
                where
                    rn < 5
            )

        union all

            (
                select
                    max(case
                            when rn = 5
                                 then '기타'
                            else ''
                        end)              as biz_opp_nm,
                    max(case
                            when rn = 5
                                 then deal_stage_change_date
                            else ''
                        end)              as deal_stage_change_date,
                    max(case
                            when rn = 5
                                 then deal_stage_cd
                            else ''
                        end)              as deal_stage_cd,
                    max(case
                            when rn = 5
                                 then cstco_nm
                            else ''
                        end)              as cstco_nm,
                    max(case
                            when rn = 5
                                 then dgtr_task_nm
                            else ''
                        end)              as dgtr_task_nm,
                    max(case
                            when rn = 5
                                 then biz_tp_account_nm
                            else ''
                        end)              as biz_tp_account_nm,
                    max(case
                            when rn = 5
                                 then biz_account
                            else ''
                        end)              as biz_account,
                    max(case
                            when rn = 5
                                 then deselected_reason
                            else ''
                        end)              as deselected_reason,
                    sum(total_target_amt) as total_target_amt,
                    sum(record_count)     as record_count
                from (
                    select
                        biz_opp_nm,
                        deal_stage_change_date,
                        deal_stage_cd,
                        cstco_nm,
                        dgtr_task_nm,
                        biz_tp_account_nm,
                        biz_account,
                        deselected_reason,
                        total_target_amt,
                        ROW_NUMBER() over(order by total_target_amt desc) as rn,
                        record_count
                    from (
                        select
                            biz_opp_nm,
                            MIN(deal_stage_chg_dt) as deal_stage_change_date,
                            MIN(deal_stage_cd)     as deal_stage_cd,
                            MIN(cstco_name)        as cstco_nm,
                            MIN(dgtr_task_nm)      as dgtr_task_nm,
                            MIN(biz_tp_account_nm) as biz_tp_account_nm,
                            MIN(biz_tp_account_cd) as biz_account,
                            MIN(cls_rsn_tp_nm)     as deselected_reason,
                            SUM(COALESCE(
                                rodr_m1_amt, 0
                            )+COALESCE(
                                rodr_m2_amt, 0
                            )+COALESCE(
                                rodr_m3_amt, 0
                            )+COALESCE(
                                rodr_m4_amt, 0
                            )+COALESCE(
                                rodr_m5_amt, 0
                            )+COALESCE(
                                rodr_m6_amt, 0
                            )+COALESCE(
                                rodr_m7_amt, 0
                            )+COALESCE(
                                rodr_m8_amt, 0
                            )+COALESCE(
                                rodr_m9_amt, 0
                            )+COALESCE(
                                rodr_m10_amt, 0
                            )+COALESCE(
                                rodr_m11_amt, 0
                            )+COALESCE(
                                rodr_m12_amt, 0
                            ))                     as total_target_amt,
                            COUNT( * )             as record_count
                        from pl_pipeline_view
                        where
                                deal_stage_chg_dt between :start_date
                            and :end_date
                            and deal_stage_cd     =       'Negotiated'
                            and ifnull(length(dgtr_task_cd),0) = 0
                            and weekly_yn         =       true
                        group by
                            biz_opp_nm
                        order by
                            total_target_amt desc
                    )
                )
                where
                    rn >= 5
                having
                    count(biz_opp_nm) > 0
            )
        ) {
            biz_opp_nm             : String(120),
            deal_stage_change_date : Date,
            deal_stage_cd          : String(20),
            cstco_nm               : String(100),
            dgtr_task_nm           : String(30),
            biz_tp_account_nm      : String(30),
            biz_account            : String(30),
            deselected_reason      : String(30),
            total_target_amt       : Decimal(18, 2),
            record_count           : Integer
        }

view ai_agent_bau_view5(start_date : String(10), end_date : String(10)) as
        select from (
            (
                select
                    biz_opp_nm,
                    deal_stage_change_date,
                    deal_stage_cd,
                    cstco_nm,
                    dgtr_task_nm,
                    biz_tp_account_nm,
                    biz_account,
                    deselected_reason,
                    total_target_amt,
                    1 as record_count
                from (
                    select
                        biz_opp_nm,
                        deal_stage_change_date,
                        deal_stage_cd,
                        cstco_nm,
                        dgtr_task_nm,
                        biz_tp_account_nm,
                        biz_account,
                        deselected_reason,
                        total_target_amt,
                        ROW_NUMBER() over(order by total_target_amt desc) as rn
                    from (
                        select
                            biz_opp_nm,
                            MIN(deal_stage_chg_dt) as deal_stage_change_date,
                            MIN(deal_stage_cd)     as deal_stage_cd,
                            MIN(cstco_name)        as cstco_nm,
                            MIN(dgtr_task_nm)      as dgtr_task_nm,
                            MIN(biz_tp_account_nm) as biz_tp_account_nm,
                            MIN(biz_tp_account_cd) as biz_account,
                            MIN(cls_rsn_tp_nm)     as deselected_reason,
                            SUM(COALESCE(
                                rodr_m1_amt, 0
                            )+COALESCE(
                                rodr_m2_amt, 0
                            )+COALESCE(
                                rodr_m3_amt, 0
                            )+COALESCE(
                                rodr_m4_amt, 0
                            )+COALESCE(
                                rodr_m5_amt, 0
                            )+COALESCE(
                                rodr_m6_amt, 0
                            )+COALESCE(
                                rodr_m7_amt, 0
                            )+COALESCE(
                                rodr_m8_amt, 0
                            )+COALESCE(
                                rodr_m9_amt, 0
                            )+COALESCE(
                                rodr_m10_amt, 0
                            )+COALESCE(
                                rodr_m11_amt, 0
                            )+COALESCE(
                                rodr_m12_amt, 0
                            ))                     as total_target_amt,
                            COUNT( * )             as record_count
                        from pl_pipeline_view
                        where
                                deal_stage_chg_dt between :start_date
                            and :end_date
                            and deal_stage_cd     =       'Contracted'
                            and ifnull(length(dgtr_task_cd),0) = 0
                            and weekly_yn         =       true
                        group by
                            biz_opp_nm
                        order by
                            total_target_amt desc
                    )
                )
                where
                    rn < 5
            )

        union all

            (
                select
                    max(case
                            when rn = 5
                                 then '기타'
                            else ''
                        end)              as biz_opp_nm,
                    max(case
                            when rn = 5
                                 then deal_stage_change_date
                            else ''
                        end)              as deal_stage_change_date,
                    max(case
                            when rn = 5
                                 then deal_stage_cd
                            else ''
                        end)              as deal_stage_cd,
                    max(case
                            when rn = 5
                                 then cstco_nm
                            else ''
                        end)              as cstco_nm,
                    max(case
                            when rn = 5
                                 then dgtr_task_nm
                            else ''
                        end)              as dgtr_task_nm,
                    max(case
                            when rn = 5
                                 then biz_tp_account_nm
                            else ''
                        end)              as biz_tp_account_nm,
                    max(case
                            when rn = 5
                                 then biz_account
                            else ''
                        end)              as biz_account,
                    max(case
                            when rn = 5
                                 then deselected_reason
                            else ''
                        end)              as deselected_reason,
                    sum(total_target_amt) as total_target_amt,
                    sum(record_count)     as record_count
                from (
                    select
                        biz_opp_nm,
                        deal_stage_change_date,
                        deal_stage_cd,
                        cstco_nm,
                        dgtr_task_nm,
                        biz_tp_account_nm,
                        biz_account,
                        deselected_reason,
                        total_target_amt,
                        ROW_NUMBER() over(order by total_target_amt desc) as rn,
                        record_count
                    from (
                        select
                            biz_opp_nm,
                            MIN(deal_stage_chg_dt) as deal_stage_change_date,
                            MIN(deal_stage_cd)     as deal_stage_cd,
                            MIN(cstco_name)        as cstco_nm,
                            MIN(dgtr_task_nm)      as dgtr_task_nm,
                            MIN(biz_tp_account_nm) as biz_tp_account_nm,
                            MIN(biz_tp_account_cd) as biz_account,
                            MIN(cls_rsn_tp_nm)     as deselected_reason,
                            SUM(COALESCE(
                                rodr_m1_amt, 0
                            )+COALESCE(
                                rodr_m2_amt, 0
                            )+COALESCE(
                                rodr_m3_amt, 0
                            )+COALESCE(
                                rodr_m4_amt, 0
                            )+COALESCE(
                                rodr_m5_amt, 0
                            )+COALESCE(
                                rodr_m6_amt, 0
                            )+COALESCE(
                                rodr_m7_amt, 0
                            )+COALESCE(
                                rodr_m8_amt, 0
                            )+COALESCE(
                                rodr_m9_amt, 0
                            )+COALESCE(
                                rodr_m10_amt, 0
                            )+COALESCE(
                                rodr_m11_amt, 0
                            )+COALESCE(
                                rodr_m12_amt, 0
                            ))                     as total_target_amt,
                            COUNT( * )             as record_count
                        from pl_pipeline_view
                        where
                                deal_stage_chg_dt between :start_date
                            and :end_date
                            and deal_stage_cd     =       'Contracted'

                            and ifnull(length(dgtr_task_cd),0) = 0
                            and weekly_yn         =       true
                        group by
                            biz_opp_nm
                        order by
                            total_target_amt desc
                    )
                )
                where
                    rn >= 5
                having
                    count(biz_opp_nm) > 0
            )
        ) {
            biz_opp_nm             : String(120),
            deal_stage_change_date : Date,
            deal_stage_cd          : String(20),
            cstco_nm               : String(100),
            dgtr_task_nm           : String(30),
            biz_tp_account_nm      : String(30),
            biz_account            : String(30),
            deselected_reason      : String(30),
            total_target_amt       : Decimal(18, 2),
            record_count           : Integer
        }


view ai_agent_bau_view6(start_date : String(10), end_date : String(10)) as
        select from (
            (
                select
                    biz_opp_nm,
                    expected_contract_date,
                    rodr_ccorg_cd,
                    account_div_name,
                    sale_ccorg_cd,
                    delivery_div_name,
                    change_date,
                    deal_stage_cd,
                    cstco_nm,
                    dgtr_task_nm,
                    biz_tp_account_nm,
                    biz_account,
                    total_target_amt,
                    1 as record_count
                from (
                    select
                        biz_opp_nm,
                        expected_contract_date,
                        rodr_ccorg_cd,
                        account_div_name,
                        sale_ccorg_cd,
                        delivery_div_name,
                        change_date,
                        deal_stage_cd,
                        cstco_nm,
                        dgtr_task_nm,
                        biz_tp_account_nm,
                        biz_account,
                        total_target_amt,
                        record_count,
                        ROW_NUMBER() over(order by total_target_amt desc) as rn
                    from (
                        select
                            s.biz_opp_nm,
                            MIN(s.expected_contract_date) as expected_contract_date,
                            MAX(s.rodr_ccorg_cd)          as rodr_ccorg_cd,
                            MIN(w3.div_name)              as account_div_name, //Account 부문
                            MAX(w1.sale_ccorg_cd)         as sale_ccorg_cd,
                            MIN(w2.div_name)              as delivery_div_name, // Delivery 부문
                            MIN(s.deal_stage_chg_dt)      as change_date,
                            MIN(s.deal_stage_cd)          as deal_stage_cd,
                            MIN(s.cstco_name)             as cstco_nm,
                            MIN(s.dgtr_task_nm)           as dgtr_task_nm,
                            MIN(s.biz_tp_account_nm)      as biz_tp_account_nm,
                            MIN(s.biz_tp_account_cd)      as biz_account,
                            ROUND(
                                (
                                    SUM(coalesce(
                                        s.rodr_m1_amt, 0
                                    )+COALESCE(
                                        s.rodr_m2_amt, 0
                                    )+COALESCE(
                                        s.rodr_m3_amt, 0
                                    )+COALESCE(
                                        s.rodr_m4_amt, 0
                                    )+COALESCE(
                                        s.rodr_m5_amt, 0
                                    )+COALESCE(
                                        s.rodr_m6_amt, 0
                                    )+COALESCE(
                                        s.rodr_m7_amt, 0
                                    )+COALESCE(
                                        s.rodr_m8_amt, 0
                                    )+COALESCE(
                                        s.rodr_m9_amt, 0
                                    )+COALESCE(
                                        s.rodr_m10_amt, 0
                                    )+COALESCE(
                                        s.rodr_m11_amt, 0
                                    )+COALESCE(
                                        s.rodr_m12_amt, 0
                                    ))
                                ) / 100000000, 2
                            )                             as total_target_amt,
                            COUNT( * )                    as record_count
                        from pl_pipeline_view as s
                        left join pl_sfdc_contract_view as w1
                            on s.biz_opp_no_sfdc = w1.biz_opp_no_sfdc
                        left join org_full_level_view as w2
                            on s.rodr_ccorg_cd = w2.team_ccorg_cd //Delivery 부문
                        left join org_full_level_view as w3
                            on w1.sale_ccorg_cd = w3.team_ccorg_cd //Account 부문
                        where
                                1                               =             1
                            and s.expected_contract_date between :start_date and :end_date
                            and s.deal_stage_cd                 =             'Qualified'
                            and ifnull(length(s.dgtr_task_cd),0) = 0
                        group by
                            s.biz_opp_nm,
                            w1.div_name,
                            w2.div_name
                        order by
                            total_target_amt desc
                    )
                )
                where
                    rn < 5
            )

        union all

            (
                select
                    max(case
                            when rn = 5
                                 then '기타'
                            else ''
                        end)              as biz_opp_nm,
                    max(case
                            when rn = 5
                                 then expected_contract_date
                            else ''
                        end)              as expected_contract_date,
                    max(case
                            when rn = 5
                                 then rodr_ccorg_cd
                            else ''
                        end)              as rodr_ccorg_cd,
                    max(case
                            when rn = 5
                                 then account_div_name
                            else ''
                        end)              as account_div_name,
                    max(case
                            when rn = 5
                                 then sale_ccorg_cd
                            else ''
                        end)              as sale_ccorg_cd,
                    max(case
                            when rn = 5
                                 then delivery_div_name
                            else ''
                        end)              as delivery_div_name,
                    max(case
                            when rn = 5
                                 then change_date
                            else ''
                        end)              as change_date,
                    max(case
                            when rn = 5
                                 then deal_stage_cd
                            else ''
                        end)              as deal_stage_cd,
                    max(case
                            when rn = 5
                                 then cstco_nm
                            else ''
                        end)              as cstco_nm,
                    max(case
                            when rn = 5
                                 then dgtr_task_nm
                            else ''
                        end)              as dgtr_task_nm,
                    max(case
                            when rn = 5
                                 then biz_tp_account_nm
                            else ''
                        end)              as biz_tp_account_nm,
                    max(case
                            when rn = 5
                                 then biz_account
                            else ''
                        end)              as biz_account,
                    sum(total_target_amt) as total_target_amt,
                    sum(record_count)     as record_count
                from (
                    select
                        biz_opp_nm,
                        expected_contract_date,
                        rodr_ccorg_cd,
                        account_div_name,
                        sale_ccorg_cd,
                        delivery_div_name,
                        change_date,
                        deal_stage_cd,
                        cstco_nm,
                        dgtr_task_nm,
                        biz_tp_account_nm,
                        biz_account,
                        total_target_amt,
                        record_count,
                        ROW_NUMBER() over(order by total_target_amt desc) as rn
                    from (
                        select
                            s.biz_opp_nm,
                            MIN(s.expected_contract_date) as expected_contract_date,
                            MAX(s.rodr_ccorg_cd)          as rodr_ccorg_cd,
                            MIN(w3.div_name)              as account_div_name, //Account 부문
                            MAX(w1.sale_ccorg_cd)         as sale_ccorg_cd,
                            MIN(w2.div_name)              as delivery_div_name, // Delivery 부문
                            MIN(s.deal_stage_chg_dt)      as change_date,
                            MIN(s.deal_stage_cd)          as deal_stage_cd,
                            MIN(s.cstco_name)             as cstco_nm,
                            MIN(s.dgtr_task_nm)           as dgtr_task_nm,
                            MIN(s.biz_tp_account_nm)      as biz_tp_account_nm,
                            MIN(s.biz_tp_account_cd)      as biz_account,
                            ROUND(
                                (
                                    SUM(coalesce(
                                        s.rodr_m1_amt, 0
                                    )+COALESCE(
                                        s.rodr_m2_amt, 0
                                    )+COALESCE(
                                        s.rodr_m3_amt, 0
                                    )+COALESCE(
                                        s.rodr_m4_amt, 0
                                    )+COALESCE(
                                        s.rodr_m5_amt, 0
                                    )+COALESCE(
                                        s.rodr_m6_amt, 0
                                    )+COALESCE(
                                        s.rodr_m7_amt, 0
                                    )+COALESCE(
                                        s.rodr_m8_amt, 0
                                    )+COALESCE(
                                        s.rodr_m9_amt, 0
                                    )+COALESCE(
                                        s.rodr_m10_amt, 0
                                    )+COALESCE(
                                        s.rodr_m11_amt, 0
                                    )+COALESCE(
                                        s.rodr_m12_amt, 0
                                    ))
                                ) / 100000000, 2
                            )                             as total_target_amt,
                            COUNT( * )                    as record_count
                        from pl_pipeline_view as s
                        left join pl_sfdc_contract_view as w1
                            on s.biz_opp_no_sfdc = w1.biz_opp_no_sfdc
                        left join org_full_level_view as w2
                            on s.rodr_ccorg_cd = w2.team_ccorg_cd //Delivery 부문
                        left join org_full_level_view as w3
                            on w1.sale_ccorg_cd = w3.team_ccorg_cd //Account 부문
                        where
                                1                               =             1
                            and s.expected_contract_date between :start_date and :end_date
                            and s.deal_stage_cd                 =             'Qualified'
                            and ifnull(length(s.dgtr_task_cd),0) = 0
                        group by
                            s.biz_opp_nm,
                            w1.div_name,
                            w2.div_name
                        order by
                            total_target_amt desc
                    )
                )
                where
                    rn >= 5
                having
                    count(biz_opp_nm) > 0
            )
        ) {
            biz_opp_nm             : String(120),
            expected_contract_date : Date,
            rodr_ccorg_cd          : String(8),
            account_div_name       : String(50),
            sale_ccorg_cd          : String(6),
            delivery_div_name      : String(50),
            change_date            : Date,
            deal_stage_cd          : String(20),
            cstco_nm               : String(100),
            dgtr_task_nm           : String(30),
            biz_tp_account_nm      : String(30),
            biz_account            : String(30),
            total_target_amt       : Decimal(18, 2),
            record_count           : Integer
        }