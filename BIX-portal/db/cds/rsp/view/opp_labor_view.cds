using rsp.opp_labor as rsp_opp_labor from '../opp_labor';
using common.version as common_version from '../../common/version';
using common.org_type as common_org_type from '../../common/org_type';

namespace rsp;

/**
 * 조직별 총 인건비 데이터
 * (작년 실적마감 + 올해 최신)
 */
view opp_labor_view as
    select from (
        select
            ver,
            year,
            month,
            prj_no_sfdc,
            case
                when
                    ot.replace_ccorg_cd is not null
                then
                    ot.replace_ccorg_cd
                else
                    opp.ccorg_cd
            end as ccorg_cd : String(10) @title: 'ERP Cost Center',
            biz_opp_no,
            prj_tp_cd,
            prj_tp_nm,
            prfm_str_dt,
            prfm_end_dt,
            received_order_amt,
            sales_amt,
            margin_rate,
            opp_m1_amt,
            opp_m2_amt,
            opp_m3_amt,
            opp_m4_amt,
            opp_m5_amt,
            opp_m6_amt,
            opp_m7_amt,
            opp_m8_amt,
            opp_m9_amt,
            opp_m10_amt,
            opp_m11_amt,
            opp_m12_amt

        from (
            select * from rsp_opp_labor
            where
                ver in (
                    select ver from common_version
                    where
                           tag = 'C'
                        // or tag = 'Y'
                )
        ) as opp
        left join common_org_type as ot
            on opp.ccorg_cd = ot.ccorg_cd
    ) {
        key ver,
        key year,
        key month,
        key prj_no_sfdc,
        key ccorg_cd,
            biz_opp_no,
            prj_tp_cd,
            prj_tp_nm,
            prfm_str_dt,
            prfm_end_dt,
            received_order_amt,
            sales_amt,
            margin_rate,
            opp_m1_amt,
            opp_m2_amt,
            opp_m3_amt,
            opp_m4_amt,
            opp_m5_amt,
            opp_m6_amt,
            opp_m7_amt,
            opp_m8_amt,
            opp_m9_amt,
            opp_m10_amt,
            opp_m11_amt,
            opp_m12_amt
    }
