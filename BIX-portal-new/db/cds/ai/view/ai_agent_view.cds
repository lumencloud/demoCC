using pl.if_sfdc as PL_IF_SFDC from '../../pl/if_sfdc';
using pl.wideview_unpivot_view as pl_wideview_unpivot_view from '../../pl/view/wideview_unpivot_view';

namespace ai;

view ai_agent_view2(start_date : String(10), end_date : String(10)) as
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
            and    biz_tp_account_cd like    '%IN_%'
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

view ai_agent_view3(start_date : String(10), end_date : String(10)) as
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
            and biz_tp_account_cd like    '%IN_%'
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


view ai_agent_view4(start_date : String(10), end_date : String(10)) as
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
            and biz_tp_account_cd like    '%IN_%'
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


view ai_agent_view5(start_date : String(10), end_date : String(10)) as
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
            and deal_stage_chg_dt between :start_date
            and :end_date
            and deal_stage_cd     =       'Contracted'
            and biz_tp_account_cd like    '%IN_%'
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


view ai_agent_view6(start_date : String(10), end_date : String(10)) as
    select from (
        select
            s.biz_opp_nm,
            MIN(s.expected_contract_date) as expected_contract_date,
            MAX(s.rodr_ccorg_cd)          as rodr_ccorg_cd,
            MIN(w1.div_name)              as account_div_name, //Account 부문
            MAX(s.sale_ccorg_cd)          as sale_ccorg_cd,
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
                        s.prj_target_m1_amt, 0
                    )+COALESCE(
                        s.prj_target_m2_amt, 0
                    )+COALESCE(
                        s.prj_target_m3_amt, 0
                    )+COALESCE(
                        s.prj_target_m4_amt, 0
                    )+COALESCE(
                        s.prj_target_m5_amt, 0
                    )+COALESCE(
                        s.prj_target_m6_amt, 0
                    )+COALESCE(
                        s.prj_target_m7_amt, 0
                    )+COALESCE(
                        s.prj_target_m8_amt, 0
                    )+COALESCE(
                        s.prj_target_m9_amt, 0
                    )+COALESCE(
                        s.prj_target_m10_amt, 0
                    )+COALESCE(
                        s.prj_target_m11_amt, 0
                    )+COALESCE(
                        s.prj_target_m12_amt, 0
                    ))
                ) / 100000000, 2
            )                             as total_target_amt,
            COUNT( * )                    as record_count
        from PL_IF_SFDC as s
        left join pl_wideview_unpivot_view as w1
            on s.rodr_ccorg_cd = w1.team_ccorg_cd //Account 부문
        left join pl_wideview_unpivot_view as w2
            on s.sale_ccorg_cd = w2.team_ccorg_cd //Delivery 부문
        where
                1                        =       1
            and s.expected_contract_date between :start_date
            and :end_date
            and s.deal_stage_cd          =       'Qualified'
            and s.biz_tp_account_cd      like    '%IN_%'
        group by
            s.biz_opp_nm,
            w1.div_name,
            w2.div_name
        order by
            total_target_amt desc
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
