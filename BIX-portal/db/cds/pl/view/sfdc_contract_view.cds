using pl.sfdc_contract as pl_sfdc_contract from '../sfdc_contract';
using common.org_full_level_view as common_org_full_level_view from '../../common/view/org_full_level_view';
using common.version as common_version from '../../common/version';
using common.version_sfdc as common_version_sfdc from '../../common/version_sfdc';

namespace pl;

view sfdc_contract_view as
    select
        sfdc_contract.*,
        case
            when substring(
                     ver, 1, 1
                 ) = 'D'
                 then true
            else false
        end                                                                                                                                                                                                                                                                                                                                              as weekly_yn : Boolean,
        sfdc_contract.sale_m1_amt + sfdc_contract.sale_m2_amt + sfdc_contract.sale_m3_amt + sfdc_contract.sale_m4_amt + sfdc_contract.sale_m5_amt + sfdc_contract.sale_m6_amt + sfdc_contract.sale_m7_amt + sfdc_contract.sale_m8_amt + sfdc_contract.sale_m9_amt + sfdc_contract.sale_m10_amt + sfdc_contract.sale_m11_amt + sfdc_contract.sale_m12_amt as sale_year_amt,
        sfdc_contract.rodr_m1_amt + sfdc_contract.rodr_m2_amt + sfdc_contract.rodr_m3_amt + sfdc_contract.rodr_m4_amt + sfdc_contract.rodr_m5_amt + sfdc_contract.rodr_m6_amt + sfdc_contract.rodr_m7_amt + sfdc_contract.rodr_m8_amt + sfdc_contract.rodr_m9_amt + sfdc_contract.rodr_m10_amt + sfdc_contract.rodr_m11_amt + sfdc_contract.rodr_m12_amt as rodr_year_amt,
        sale_org.*,
        rodr_org.is_delivery                                                                                                                                                                                                                                                                                                                             as rodr_is_delivery,
        rodr_org.is_total_cc                                                                                                                                                                                                                                                                                                                             as rodr_is_total_cc,
        rodr_org.org_tp                                                                                                                                                                                                                                                                                                                                  as rodr_org_tp,
        rodr_org.org_id                                                                                                                                                                                                                                                                                                                                  as rodr_org_id,
        rodr_org.org_ccorg_cd                                                                                                                                                                                                                                                                                                                            as rodr_org_ccorg_cd,
        rodr_org.org_order                                                                                                                                                                                                                                                                                                                               as rodr_org_order,
        rodr_org.org_parent                                                                                                                                                                                                                                                                                                                              as rodr_org_parent,
        rodr_org.org_name                                                                                                                                                                                                                                                                                                                                as rodr_org_name,
        rodr_org.lv1_id                                                                                                                                                                                                                                                                                                                                  as rodr_lv1_id,
        rodr_org.lv1_name                                                                                                                                                                                                                                                                                                                                as rodr_lv1_name,
        rodr_org.lv1_ccorg_cd                                                                                                                                                                                                                                                                                                                            as rodr_lv1_ccorg_cd,
        rodr_org.lv2_id                                                                                                                                                                                                                                                                                                                                  as rodr_lv2_id,
        rodr_org.lv2_name                                                                                                                                                                                                                                                                                                                                as rodr_lv2_name,
        rodr_org.lv2_ccorg_cd                                                                                                                                                                                                                                                                                                                            as rodr_lv2_ccorg_cd,
        rodr_org.lv3_id                                                                                                                                                                                                                                                                                                                                  as rodr_lv3_id,
        rodr_org.lv3_name                                                                                                                                                                                                                                                                                                                                as rodr_lv3_name,
        rodr_org.lv3_ccorg_cd                                                                                                                                                                                                                                                                                                                            as rodr_lv3_ccorg_cd,
        rodr_org.div_id                                                                                                                                                                                                                                                                                                                                  as rodr_div_id,
        rodr_org.div_name                                                                                                                                                                                                                                                                                                                                as rodr_div_name,
        rodr_org.div_ccorg_cd                                                                                                                                                                                                                                                                                                                            as rodr_div_ccorg_cd,
        rodr_org.hdqt_id                                                                                                                                                                                                                                                                                                                                 as rodr_hdqt_id,
        rodr_org.hdqt_name                                                                                                                                                                                                                                                                                                                               as rodr_hdqt_name,
        rodr_org.hdqt_ccorg_cd                                                                                                                                                                                                                                                                                                                           as rodr_hdqt_ccorg_cd,
        rodr_org.team_id                                                                                                                                                                                                                                                                                                                                 as rodr_team_id,
        rodr_org.team_name                                                                                                                                                                                                                                                                                                                               as rodr_team_name,
        rodr_org.team_ccorg_cd                                                                                                                                                                                                                                                                                                                           as rodr_team_ccorg_cd
    from pl_sfdc_contract as sfdc_contract
    left join common_org_full_level_view as sale_org
        on sfdc_contract.sale_ccorg_cd = sale_org.org_ccorg_cd
    left join common_org_full_level_view as rodr_org
        on sfdc_contract.rodr_ccorg_cd = rodr_org.org_ccorg_cd
    where
           ver in (
            select ver from common_version
            where
                tag = 'C'
        )
        or ver in (
            select ver_sfdc from common_version_sfdc
            where
                tag = 'C'
        );
