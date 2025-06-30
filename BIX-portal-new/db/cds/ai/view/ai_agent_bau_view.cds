using pl.if_sfdc as PL_IF_SFDC from '../../pl/if_sfdc';

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
                    prj_target_m1_amt, 0
                )  + COALESCE(
                    prj_target_m2_amt, 0
                )+COALESCE(
                    prj_target_m3_amt, 0
                )+COALESCE(
                    prj_target_m4_amt, 0
                )+COALESCE(
                    prj_target_m5_amt, 0
                )+COALESCE(
                    prj_target_m6_amt, 0
                )+COALESCE(
                    prj_target_m7_amt, 0
                )+COALESCE(
                    prj_target_m8_amt, 0
                )+COALESCE(
                    prj_target_m9_amt, 0
                )+COALESCE(
                    prj_target_m10_amt, 0
                )+COALESCE(
                    prj_target_m11_amt, 0
                )+COALESCE(
                    prj_target_m12_amt, 0
                )) / 100000000, 2
            )                      as total_target_amt,
            COUNT( * )             as record_count
        from PL_IF_SFDC
        where
                   1                 =       1
            and    deal_stage_chg_dt between :start_date
            and :end_date
            and (
                   deal_stage_cd     =       'Lead'
                or deal_stage_cd     =       'Identified'
                or deal_stage_cd     =       'Registered'
                or deal_stage_cd     =       'Validated'
            )
            and    biz_tp_account_cd like    '%EX_%'
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
                prj_target_m1_amt, 0
            )+COALESCE(
                prj_target_m2_amt, 0
            )+COALESCE(
                prj_target_m3_amt, 0
            )+COALESCE(
                prj_target_m4_amt, 0
            )+COALESCE(
                prj_target_m5_amt, 0
            )+COALESCE(
                prj_target_m6_amt, 0
            )+COALESCE(
                prj_target_m7_amt, 0
            )+COALESCE(
                prj_target_m8_amt, 0
            )+COALESCE(
                prj_target_m9_amt, 0
            )+COALESCE(
                prj_target_m10_amt, 0
            )+COALESCE(
                prj_target_m11_amt, 0
            )+COALESCE(
                prj_target_m12_amt, 0
            ))                     as total_target_amt,
            COUNT( * )             as record_count
        from PL_IF_SFDC
        where
                deal_stage_chg_dt between :start_date
            and :end_date
            and deal_stage_cd     =       'Deselected'
            and biz_tp_account_cd like    '%EX_%'
        group by
            biz_opp_nm
        order by
            total_target_amt desc

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
                    prj_target_m1_amt, 0
                )  + COALESCE(
                    prj_target_m2_amt, 0
                )+COALESCE(
                    prj_target_m3_amt, 0
                )+COALESCE(
                    prj_target_m4_amt, 0
                )+COALESCE(
                    prj_target_m5_amt, 0
                )+COALESCE(
                    prj_target_m6_amt, 0
                )+COALESCE(
                    prj_target_m7_amt, 0
                )+COALESCE(
                    prj_target_m8_amt, 0
                )+COALESCE(
                    prj_target_m9_amt, 0
                )+COALESCE(
                    prj_target_m10_amt, 0
                )+COALESCE(
                    prj_target_m11_amt, 0
                )+COALESCE(
                    prj_target_m12_amt, 0
                )) / 100000000, 2
            )                      as total_target_amt,
            COUNT( * )             as record_count
        from PL_IF_SFDC
        where
                1                 =       1
            and deal_stage_chg_dt between :start_date
            and :end_date
            and deal_stage_cd     =       'Negotiated'
            and biz_tp_account_cd like    '%EX_%'
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


view ai_agent_bau_view5(start_date : String(10), end_date : String(10)) as
    select from (
        select
            biz_opp_nm,
            MIN(deal_stage_chg_dt) as deal_stage_change_date,
            MIN(deal_stage_cd)     as deal_stage_cd,
            MIN(cstco_name)        as cstco_nm,
            MIN(dgtr_task_nm)      as dgtr_task_nm,
            MIN(biz_tp_account_nm) as biz_tp_account_nm,
            SUM(COALESCE(
                prj_target_m1_amt, 0
            )+COALESCE(
                prj_target_m2_amt, 0
            )+COALESCE(
                prj_target_m3_amt, 0
            )+COALESCE(
                prj_target_m4_amt, 0
            )+COALESCE(
                prj_target_m5_amt, 0
            )+COALESCE(
                prj_target_m6_amt, 0
            )+COALESCE(
                prj_target_m7_amt, 0
            )+COALESCE(
                prj_target_m8_amt, 0
            )+COALESCE(
                prj_target_m9_amt, 0
            )+COALESCE(
                prj_target_m10_amt, 0
            )+COALESCE(
                prj_target_m11_amt, 0
            )+COALESCE(
                prj_target_m12_amt, 0
            ))                     as total_target_amt,
            COUNT( * )             as record_count
        from PL_IF_SFDC
        where
                1                 =       1
            and deal_stage_chg_dt between '2025-05-12'
            and '2025-05-18'
            and deal_stage_cd     =       'Contracted'
            and biz_tp_account_cd like    '%EX_%'
        group by
            biz_opp_nm
        order by
            total_target_amt desc
    ) {
        biz_opp_nm             : String(120),
        deal_stage_change_date : Date,
        deal_stage_cd          : String(20),
        cstco_nm               : String(100),
        dgtr_task_nm           : String(30),
        biz_tp_account_nm      : String(30),
        total_target_amt       : Decimal(18, 2),
        record_count           : Integer
    }


view ai_agent_bau_view6(start_date : String(10), end_date : String(10)) as
    select from (
        select
            biz_opp_nm,
            MIN(expected_contract_date) as expected_contract_date,
            MIN(deal_stage_chg_dt)      as change_date,
            MIN(deal_stage_cd)          as deal_stage_cd,
            MIN(cstco_name)             as cstco_nm,
            MIN(dgtr_task_nm)           as dgtr_task_nm,
            MIN(biz_tp_account_nm)      as biz_tp_account_nm,
            MIN(biz_tp_account_cd)      as biz_account,
            ROUND(
                SUM(COALESCE(
                    prj_target_m1_amt, 0
                )  + COALESCE(
                    prj_target_m2_amt, 0
                )+COALESCE(
                    prj_target_m3_amt, 0
                )+COALESCE(
                    prj_target_m4_amt, 0
                )+COALESCE(
                    prj_target_m5_amt, 0
                )+COALESCE(
                    prj_target_m6_amt, 0
                )+COALESCE(
                    prj_target_m7_amt, 0
                )+COALESCE(
                    prj_target_m8_amt, 0
                )+COALESCE(
                    prj_target_m9_amt, 0
                )+COALESCE(
                    prj_target_m10_amt, 0
                )+COALESCE(
                    prj_target_m11_amt, 0
                )+COALESCE(
                    prj_target_m12_amt, 0
                )) / 100000000, 2
            )                           as total_target_amt,
            COUNT( * )                  as record_count
        from PL_IF_SFDC
        where
                1                      =       1
            and expected_contract_date between :start_date
            and :end_date
            and deal_stage_cd          =       'Qualified'
            and biz_tp_account_cd      like    '%EX_%'
        group by
            biz_opp_nm
        order by
            total_target_amt desc

    ) {
        biz_opp_nm             : String(120),
        expected_contract_date : Date,
        change_date            : Date,
        deal_stage_cd          : String(20),
        cstco_nm               : String(100),
        dgtr_task_nm           : String(30),
        biz_tp_account_nm      : String(30),
        biz_account            : String(30),
        total_target_amt       : Decimal(18, 2),
        record_count           : Integer
    }
