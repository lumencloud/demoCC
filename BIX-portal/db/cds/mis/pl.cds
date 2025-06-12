using common from './mis';

namespace pl;

/**
 * 수주/매출 관리조직
 * 
 * 10999	AT/DT사업부문
 * 11015	Hi-Tech사업부문
 * 11023	금융/전략사업부문
 * 11035	제조/Global사업부문
 * 10671	Cloud부문
 * 10955	Ackerton Partners '10956', '11200', '11190'
 * 11056	AT서비스부문
 * 11083	제조서비스부문
 * 11104	Enterprise서비스부문
 * 10763    전략기획부문
 */
view org_structure_view as select from (
    // 부문, 본부, 팀
    select div.id as div_id, hdqt.id as hdqt_id, team.id as team_id
    from pl.org_filter_view as div 
    inner join pl.org_filter_view as hdqt
    on div.id = hdqt.upr_org_id
    and div.org_tp_rcid = '1439'
    and ( hdqt.org_tp_rcid  = '1444' or hdqt.org_tp_rcid  = '1440' )
    left join pl.org_filter_view as team
    on hdqt.id = team.upr_org_id
    union
    // 부문 아래 바로 팀인 경우
    select div.id as div_id, null as hdqt_id,
    case hdqt.org_tp_rcid 
        when '1438' then hdqt.id
        else null
    end as team_id
    from pl.org_filter_view as div 
    inner join pl.org_filter_view as hdqt
    on div.id = hdqt.upr_org_id
    and div.org_tp_rcid = '1439'
    and hdqt.org_tp_rcid = '1438'
){
    div_id,
    hdqt_id,
    team_id
}

view org_filter_view as select from (
    // 부문 코드 기준 위(3단계) 아래(팀까지)
    select id,
        org_cd,
        // case use_yn
        //     when true then org_kor_nm
        //     when false then concat(org_kor_nm, ' (24년)')
        // end as org_kor_nm,
        org_kor_nm,
        org_eng_nm,
        org_abbr_nm,
        upr_org_id,
        org_tp_rcid,
        ccorg_cd,
        pcorg_cd,
        org_stp_dgr,
        org_sort_id,
        vrtl_org_yn,
        real_org_cd,
        org_desc,
        org_str_dt,
        org_end_dt,
        use_yn
        // true as use_yn  // use_yn 기준으로 필터링하는, 기존 개발 코드 적용을 위한 true 처리
    from common.mis_com_org
    where use_yn = true and
    (
    // 본부
    upr_org_id in ('10999', '11015', '11023', '11035', '10671', '10955', '10956', '11200', '11190', '11056', '11083', '11104', '10763' )
    // 부문
    or
    id in ('10999', '11015', '11023', '11035', '10671', '10955', '10956', '11200', '11190', '11056', '11083', '11104', '10763' )
    // 부문 상위
    or id in (
        select upr_org_id from common.mis_com_org
        where id in ('10999', '11015', '11023', '11035', '10671', '10955', '10956', '11200', '11190', '11056', '11083', '11104', '10763' )
    )
    // 부문 상위 - 상위
    or id in (
        select upr_org_id from common.mis_com_org
        where id in (
            select upr_org_id from common.mis_com_org
            where id in ('10999', '11015', '11023', '11035', '10671', '10955', '10956', '11200', '11190', '11056', '11083', '11104', '10763' )
        )
    )
    // 부문 상위 - 상위 - 상위
    or id in (
        select upr_org_id from common.mis_com_org
        where id in (
            select upr_org_id from common.mis_com_org
            where id in (
                select upr_org_id from common.mis_com_org
                    where id in (
                        select upr_org_id from common.mis_com_org
                        where id in ('10999', '11015', '11023', '11035', '10671', '10955', '10956', '11200', '11190', '11056', '11083', '11104', '10763' )
                    )
            )
        )
    )
    // 부문 하위 팀
    or id in (
        select id from common.mis_com_org
        where upr_org_id in (
            select id
            from common.mis_com_org
            where upr_org_id in ('10999', '11015', '11023', '11035', '10671', '10955', '10956', '11200', '11190', '11056', '11083', '11104', '10763' )
        )
    )
    // Ackerton Partners - 한단계 하위 탐색 부문 하위 팀
    or id in (
        select id from common.mis_com_org
        where upr_org_id in (
            select id from common.mis_com_org
            where upr_org_id in (
                select id
                from common.mis_com_org
                where upr_org_id in ('10999', '11015', '11023', '11035', '10671', '10955', '10956', '11200', '11190', '11056', '11083', '11104', '10763' )
            )
        )
    )
    )
)
{
    key id,
        org_cd,
        org_kor_nm,
        org_eng_nm,
        org_abbr_nm,
        upr_org_id,
        org_tp_rcid,
        ccorg_cd,
        pcorg_cd,
        org_stp_dgr,
        org_sort_id,
        vrtl_org_yn,
        real_org_cd,
        org_desc,
        org_str_dt,
        org_end_dt,
        use_yn
}

/**
 * 팀 레벨 합산 연단위 실적금액
 */
view performance_month_amount_view as select from (
    select orgStr.*, calc.* from pl.org_structure_view as orgStr
    inner join (
        select now.id as org_id, now.ccorg_cd, origin.sale_org_rid, origin.year, origin.month,
            origin.sale_amount, origin.sale_amount_sum, origin.prj_prfm_amount, origin.prj_prfm_amount_sum
        from common.mis_com_org as now
        inner join
        (
            select org.id, org.ccorg_cd, f.* from common.mis_com_org as org
            inner join
            (
                select sale_org_rid, year, month, sum(sale_amount) as sale_amount, sum(sale_amount_sum) as sale_amount_sum,
                    sum(prj_prfm_amount) as prj_prfm_amount, sum(prj_prfm_amount_sum) as prj_prfm_amount_sum
                from (
                    select a.*, b.year, b.month, b.sale_amount, b.sale_amount_sum, b.prj_prfm_amount, b.prj_prfm_amount_sum, b.final_yn
                    from pl.project_view as a
                    inner join pl.project_monthly_amount_view as b
                    on a.prj_no = b.prj_no
                    and a.sell_sls_cnrc_no = b.sell_sls_cnrc_no
                    and a.rodr_esmt_ym = b.rodr_esmt_ym
                    and b.final_yn = true
                )
            group by sale_org_rid, year, month
            ) as f
        on org.id = f.sale_org_rid
        ) as origin
        on origin.ccorg_cd = now.ccorg_cd and now.use_yn = true and now.vrtl_org_yn = false
        ) as calc
    on orgStr.team_id = calc.org_id
)
{
    key div_id,
    key hdqt_id,
    key team_id,
    key ccorg_cd,
    key sale_org_rid,
        year,
        month,
        sale_amount,
        sale_amount_sum,
        prj_prfm_amount,
        prj_prfm_amount_sum
};

/**
 * 팀 레벨 합산 연단위 목표금액
 */
view target_year_amount_view as select from (
    select orgStr.*, calc.* from pl.org_structure_view as orgStr
    inner join (
        select now.id as org_id, now.ccorg_cd, origin.sale_org_rid, origin.year,
            origin.target_sale_amount, origin.target_prj_prfm_amount
        from common.mis_com_org as now
        inner join
        (
            select org.id, org.ccorg_cd, f.*
                from common.mis_com_org as org
            inner join
            (
                select sale_org_rid, year, sum(sale_amount) as target_sale_amount, sum(prj_prfm_amount) as target_prj_prfm_amount
                from (
                    select a.prj_no, a.sale_org_rid, b.year, b.month, b.sale_amount, b.prj_prfm_amount, b.final_yn
                        from pl.project_view as a
                    inner join pl.project_monthly_target_amount_view as b
                        on a.prj_no = b.prj_no
                    and a.sell_sls_cnrc_no = b.sell_sls_cnrc_no
                    and a.rodr_esmt_ym = b.rodr_esmt_ym
                    and b.final_yn = true
                )
                group by sale_org_rid, year
            ) as f
                on org.id = f.sale_org_rid
        ) as origin
        on origin.ccorg_cd = now.ccorg_cd and now.use_yn = true and now.vrtl_org_yn = false
        ) as calc
    on orgStr.team_id = calc.org_id
)
{
    key div_id,
    key hdqt_id,
    key team_id,
    key ccorg_cd,
    key sale_org_rid,
        year,
        target_sale_amount,
        target_prj_prfm_amount
}

/**
 * 202413 최근 실적 기준 - exe(project) 의 sale 조직으로 PL 합 계산
 * 
 * 본부 단위로 aggregation
 */
view pl_view as select from(
    select year, month, sale_sctr_org_rid, sale_hdqt_org_rid,
        sum(sale_amount) as sale_amount,
        sum(sale_amount_sum) as sale_amount_sum,
        sum(prj_prfm_amount) as prj_prfm_amount,
        sum(prj_prfm_amount_sum) as prj_prfm_amount_sum,
        sum(target_sale_amount_year) as target_sale_amount_year,
        sum(target_prj_prfm_amount_year) as target_prj_prfm_amount_year
    from (
        select prj.prj_no, prj.sell_sls_cnrc_no,
            prj.sale_sctr_org_rid, prj.sale_hdqt_org_rid, prj.sale_org_rid,
            target.target_sale_amount_year,
            target.target_prj_prfm_amount_year,
            actual.sale_amount, actual.sale_amount_sum,
            actual.prj_prfm_amount, actual.prj_prfm_amount_sum,
            actual.year, actual.month
        from pl.project_view as prj

        inner join pl.project_monthly_amount_view as actual
            on prj.prj_no = actual.prj_no
            and prj.sell_sls_cnrc_no = actual.sell_sls_cnrc_no
            and prj.rodr_esmt_ym = '202413' // 목업 202413 최근 데이터 기준 조직구조 사용

        inner join (
            select prj_no, sell_sls_cnrc_no, year, sum(sale_amount) as target_sale_amount_year, sum(prj_prfm_amount) as target_prj_prfm_amount_year
                from pl.project_monthly_target_amount_view
                group by prj_no, sell_sls_cnrc_no, year
        ) as target
            on prj.prj_no = target.prj_no
            and prj.sell_sls_cnrc_no = target.sell_sls_cnrc_no
            and actual.year = target.year
    )
    group by year, month, sale_sctr_org_rid, sale_hdqt_org_rid
)
{
    key year,
    key month,
    key sale_sctr_org_rid,
    key sale_hdqt_org_rid,
    sale_amount,
    sale_amount_sum,
    prj_prfm_amount,
    prj_prfm_amount_sum,
    target_sale_amount_year,
    target_prj_prfm_amount_year
};

/**
 * exe 목업 데이터 기준
 */
view project_view as select from common.mis_esmt_exe_filter {
    key prj_no,
    key sell_sls_cnrc_no,
    key rodr_esmt_ym,
    sale_sctr_org_rid,
    sale_hdqt_org_rid,
    sale_org_rid,
    sale_n1_mm_amt,
    sale_n2_mm_amt,
    sale_n3_mm_amt,
    sale_n4_mm_amt,
    sale_n5_mm_amt,
    sale_n6_mm_amt,
    sale_n7_mm_amt,
    sale_n8_mm_amt,
    sale_n9_mm_amt,
    sale_n10_mm_amt,
    sale_n11_mm_amt,
    sale_n12_mm_amt,
    prj_prfm_n1_mm_amt,
    prj_prfm_n2_mm_amt,
    prj_prfm_n3_mm_amt,
    prj_prfm_n4_mm_amt,
    prj_prfm_n5_mm_amt,
    prj_prfm_n6_mm_amt,
    prj_prfm_n7_mm_amt,
    prj_prfm_n8_mm_amt,
    prj_prfm_n9_mm_amt,
    prj_prfm_n10_mm_amt,
    prj_prfm_n11_mm_amt,
    prj_prfm_n12_mm_amt,
    ver_no
}
// 23, 24 실적/목표 다 있는 데이터만 조회조건
// where (prj_no, sell_sls_cnrc_no) IN (
//     select prj_no, sell_sls_cnrc_no
//     from common.mis_esmt_exe
//     where rodr_esmt_ym IN ('202313', '202413', '202300', '202400')
//     and sell_sls_cnrc_no is not null
//     and sell_sls_cnrc_no != ''
//     group by prj_no, sell_sls_cnrc_no
//     having count(distinct rodr_esmt_ym) = 4 )
;

/**
 * 목표금액 월별 unpivot
 * 
 * 01~12 월 해당 컬럼 에서 금액 가져와서 [월,금액] 구조로 row 생성
 * 
 * 진행률 위한 월별 누계 함께 계산
 */
view project_monthly_target_amount_view as select from
(
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '01' as month : String(2),
        sale_n1_mm_amt as sale_amount,
        prj_prfm_n1_mm_amt as prj_prfm_amount
    from pl.project_view
    where sale_n1_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('00') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '02' as month : String(2),
        sale_n2_mm_amt as sale_amount,
        prj_prfm_n2_mm_amt as prj_prfm_amount
    from pl.project_view
    where sale_n2_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('00') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '03' as month : String(2),
        sale_n3_mm_amt as sale_amount,
        prj_prfm_n3_mm_amt as prj_prfm_amount
    from pl.project_view
    where sale_n3_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('00') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '04' as month : String(2),
        sale_n4_mm_amt as sale_amount,
        prj_prfm_n4_mm_amt as prj_prfm_amount
    from pl.project_view
    where sale_n4_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('00') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '05' as month : String(2),
        sale_n5_mm_amt as sale_amount,
        prj_prfm_n5_mm_amt as prj_prfm_amount
    from pl.project_view
    where sale_n5_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('00') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '06' as month : String(2),
        sale_n6_mm_amt as sale_amount,
        prj_prfm_n6_mm_amt as prj_prfm_amount
    from pl.project_view
    where sale_n6_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('00') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '07' as month : String(2),
        sale_n7_mm_amt as sale_amount,
        prj_prfm_n7_mm_amt as prj_prfm_amount
    from pl.project_view
    where sale_n7_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('00') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '08' as month : String(2),
        sale_n8_mm_amt as sale_amount,
        prj_prfm_n8_mm_amt as prj_prfm_amount
    from pl.project_view
    where sale_n8_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('00') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '09' as month : String(2),
        sale_n9_mm_amt as sale_amount,
        prj_prfm_n9_mm_amt as prj_prfm_amount
    from pl.project_view
    where sale_n9_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('00') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '10' as month : String(2),
        sale_n10_mm_amt as sale_amount,
        prj_prfm_n10_mm_amt as prj_prfm_amount
    from pl.project_view
    where sale_n10_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('00') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '11' as month : String(2),
        sale_n11_mm_amt as sale_amount,
        prj_prfm_n11_mm_amt as prj_prfm_amount
    from pl.project_view
    where sale_n11_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('00') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '12' as month : String(2),
        sale_n12_mm_amt as sale_amount,
        prj_prfm_n12_mm_amt as prj_prfm_amount
    from pl.project_view
    where sale_n12_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('00') and ver_no = 1000
)
{
    key prj_no,
    key sell_sls_cnrc_no,
    rodr_esmt_ym,
    substring(rodr_esmt_ym, 1, 4) as year : String(4),
    month,
    sale_amount,
    prj_prfm_amount,
    true as final_yn : Boolean
};

/**
 * 실적금액 월별 unpivot
 * 
 * 01~12 월 해당 컬럼 에서 금액 가져와서 [월,금액] 구조로 row 생성
 * 
 * 진행률 위한 월별 누계 함께 계산
 */
view project_monthly_amount_view as select from
(
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '01' as month : String(2),
        sale_n1_mm_amt as sale_amount,
        sale_n1_mm_amt as sale_amount_sum,
        prj_prfm_n1_mm_amt as prj_prfm_amount,
        prj_prfm_n1_mm_amt as prj_prfm_amount_sum
    from pl.project_view
    where sale_n1_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('13') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '02' as month : String(2),
        sale_n2_mm_amt as sale_amount,
        sale_n1_mm_amt+sale_n2_mm_amt as sale_amount_sum,
        prj_prfm_n2_mm_amt as prj_prfm_amount,
        prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt as prj_prfm_amount_sum
    from pl.project_view
    where sale_n2_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('13') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '03' as month : String(2),
        sale_n3_mm_amt as sale_amount,
        sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt as sale_amount_sum,
        prj_prfm_n3_mm_amt as prj_prfm_amount,
        prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt as prj_prfm_amount_sum
    from pl.project_view
    where sale_n3_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('13') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '04' as month : String(2),
        sale_n4_mm_amt as sale_amount,
        sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt as sale_amount_sum,
        prj_prfm_n4_mm_amt as prj_prfm_amount,
        prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt as prj_prfm_amount_sum
    from pl.project_view
    where sale_n4_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('13') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '05' as month : String(2),
        sale_n5_mm_amt as sale_amount,
        sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt as sale_amount_sum,
        prj_prfm_n5_mm_amt as prj_prfm_amount,
        prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt as prj_prfm_amount_sum
    from pl.project_view
    where sale_n5_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('13') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '06' as month : String(2),
        sale_n6_mm_amt as sale_amount,
        sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt as sale_amount_sum,
        prj_prfm_n6_mm_amt as prj_prfm_amount,
        prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt as prj_prfm_amount_sum
    from pl.project_view
    where sale_n6_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('13') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '07' as month : String(2),
        sale_n7_mm_amt as sale_amount,
        sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
        +sale_n7_mm_amt as sale_amount_sum,
        prj_prfm_n7_mm_amt as prj_prfm_amount,
        prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
        +prj_prfm_n7_mm_amt as prj_prfm_amount_sum
    from pl.project_view
    where sale_n7_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('13') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '08' as month : String(2),
        sale_n8_mm_amt as sale_amount,
        sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
        +sale_n7_mm_amt+sale_n8_mm_amt as sale_amount_sum,
        prj_prfm_n8_mm_amt as prj_prfm_amount,
        prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
        +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt as prj_prfm_amount_sum
    from pl.project_view
    where sale_n8_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('13') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '09' as month : String(2),
        sale_n9_mm_amt as sale_amount,
        sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
        +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt as sale_amount_sum,
        prj_prfm_n9_mm_amt as prj_prfm_amount,
        prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
        +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt as prj_prfm_amount_sum
    from pl.project_view
    where sale_n9_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('13') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '10' as month : String(2),
        sale_n10_mm_amt as sale_amount,
        sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
        +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt+sale_n10_mm_amt as sale_amount_sum,
        prj_prfm_n10_mm_amt as prj_prfm_amount,
        prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
        +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt+prj_prfm_n10_mm_amt as prj_prfm_amount_sum
    from pl.project_view
    where sale_n10_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('13') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '11' as month : String(2),
        sale_n11_mm_amt as sale_amount,
        sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
        +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt+sale_n10_mm_amt+sale_n11_mm_amt as sale_amount_sum,
        prj_prfm_n11_mm_amt as prj_prfm_amount,
        prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
        +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt+prj_prfm_n10_mm_amt+prj_prfm_n11_mm_amt as prj_prfm_amount_sum
    from pl.project_view
    where sale_n11_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('13') and ver_no = 1000
    union all
    select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
        '12' as month : String(2),
        sale_n12_mm_amt as sale_amount,
        sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
        +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt+sale_n10_mm_amt+sale_n11_mm_amt+sale_n12_mm_amt as sale_amount_sum,
        prj_prfm_n12_mm_amt as prj_prfm_amount,
        prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
        +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt+prj_prfm_n10_mm_amt+prj_prfm_n11_mm_amt+prj_prfm_n12_mm_amt as prj_prfm_amount_sum
    from pl.project_view
    where sale_n12_mm_amt is not null and substring(rodr_esmt_ym,5,2) in ('13') and ver_no = 1000
)
{
    key prj_no,
    key sell_sls_cnrc_no,
    rodr_esmt_ym,
    substring(rodr_esmt_ym, 1, 4) as year : String(4),
    month,
    sale_amount,
    sale_amount_sum,
    prj_prfm_amount,
    prj_prfm_amount_sum,
    true as final_yn : Boolean
};

view mis_project_sheet_view as select from common.mis_project as prj
    inner join (
        select prj_no, sell_sls_cnrc_no, year,
        MAX(case when month = '01' then amount else null end) as sale_n1_mm_amt : Decimal,
        MAX(case when month = '02' then amount else null end) as sale_n2_mm_amt : Decimal,
        MAX(case when month = '03' then amount else null end) as sale_n3_mm_amt : Decimal,
        MAX(case when month = '04' then amount else null end) as sale_n4_mm_amt : Decimal,
        MAX(case when month = '05' then amount else null end) as sale_n5_mm_amt : Decimal,
        MAX(case when month = '06' then amount else null end) as sale_n6_mm_amt : Decimal,
        MAX(case when month = '07' then amount else null end) as sale_n7_mm_amt : Decimal,
        MAX(case when month = '08' then amount else null end) as sale_n8_mm_amt : Decimal,
        MAX(case when month = '09' then amount else null end) as sale_n9_mm_amt : Decimal,
        MAX(case when month = '10' then amount else null end) as sale_n10_mm_amt : Decimal,
        MAX(case when month = '11' then amount else null end) as sale_n11_mm_amt : Decimal,
        MAX(case when month = '12' then amount else null end) as sale_n12_mm_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end)
        ) AS sale_n1_qtr_amt : Decimal,
        (
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end)
        ) AS sale_n2_qtr_amt : Decimal,
        (
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end)
        ) AS sale_n3_qtr_amt : Decimal,
        (
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS sale_n4_qtr_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end) +
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end) +
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end) +
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS sale_year_amt : Decimal

        from common.mis_sale_amount
        group by prj_no, sell_sls_cnrc_no, year
    ) as sale on prj.prj_no = sale.prj_no and prj.sell_sls_cnrc_no = sale.sell_sls_cnrc_no
        and substring(prj.rodr_esmt_ym, 1, 4) = sale.year
    inner join (
        select prj_no, sell_sls_cnrc_no, year,
        MAX(case when month = '01' then amount else null end) as rodr_n1_mm_amt : Decimal,
        MAX(case when month = '02' then amount else null end) as rodr_n2_mm_amt : Decimal,
        MAX(case when month = '03' then amount else null end) as rodr_n3_mm_amt : Decimal,
        MAX(case when month = '04' then amount else null end) as rodr_n4_mm_amt : Decimal,
        MAX(case when month = '05' then amount else null end) as rodr_n5_mm_amt : Decimal,
        MAX(case when month = '06' then amount else null end) as rodr_n6_mm_amt : Decimal,
        MAX(case when month = '07' then amount else null end) as rodr_n7_mm_amt : Decimal,
        MAX(case when month = '08' then amount else null end) as rodr_n8_mm_amt : Decimal,
        MAX(case when month = '09' then amount else null end) as rodr_n9_mm_amt : Decimal,
        MAX(case when month = '10' then amount else null end) as rodr_n10_mm_amt : Decimal,
        MAX(case when month = '11' then amount else null end) as rodr_n11_mm_amt : Decimal,
        MAX(case when month = '12' then amount else null end) as rodr_n12_mm_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end)
        ) AS rodr_n1_qtr_amt : Decimal,
        (
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end)
        ) AS rodr_n2_qtr_amt : Decimal,
        (
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end)
        ) AS rodr_n3_qtr_amt : Decimal,
        (
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS rodr_n4_qtr_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end) +
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end) +
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end) +
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS rodr_year_amt : Decimal
        from common.mis_order_amount
        group by prj_no, sell_sls_cnrc_no, year
    ) as order on prj.prj_no = order.prj_no and prj.sell_sls_cnrc_no = order.sell_sls_cnrc_no
        and substring(prj.rodr_esmt_ym, 1, 4) = order.year
    inner join (
        select prj_no, sell_sls_cnrc_no, year,
        MAX(case when month = '01' then amount else null end) as prj_prfm_n1_mm_amt : Decimal,
        MAX(case when month = '02' then amount else null end) as prj_prfm_n2_mm_amt : Decimal,
        MAX(case when month = '03' then amount else null end) as prj_prfm_n3_mm_amt : Decimal,
        MAX(case when month = '04' then amount else null end) as prj_prfm_n4_mm_amt : Decimal,
        MAX(case when month = '05' then amount else null end) as prj_prfm_n5_mm_amt : Decimal,
        MAX(case when month = '06' then amount else null end) as prj_prfm_n6_mm_amt : Decimal,
        MAX(case when month = '07' then amount else null end) as prj_prfm_n7_mm_amt : Decimal,
        MAX(case when month = '08' then amount else null end) as prj_prfm_n8_mm_amt : Decimal,
        MAX(case when month = '09' then amount else null end) as prj_prfm_n9_mm_amt : Decimal,
        MAX(case when month = '10' then amount else null end) as prj_prfm_n10_mm_amt : Decimal,
        MAX(case when month = '11' then amount else null end) as prj_prfm_n11_mm_amt : Decimal,
        MAX(case when month = '12' then amount else null end) as prj_prfm_n12_mm_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end)
        ) AS prj_prfm_n1_qtr_amt : Decimal,
        (
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end)
        ) AS prj_prfm_n2_qtr_amt : Decimal,
        (
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end)
        ) AS prj_prfm_n3_qtr_amt : Decimal,
        (
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS prj_prfm_n4_qtr_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end) +
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end) +
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end) +
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS prj_prfm_year_amt : Decimal
        from common.mis_cos_amount
        group by prj_no, sell_sls_cnrc_no, year
    ) as cos on prj.prj_no = cos.prj_no and prj.sell_sls_cnrc_no = cos.sell_sls_cnrc_no
        and substring(prj.rodr_esmt_ym, 1, 4) = cos.year
    inner join (
        select prj_no, sell_sls_cnrc_no, year,
        MAX(case when month = '01' then amount else null end) as rmdr_sale_n1_mm_amt : Decimal,
        MAX(case when month = '02' then amount else null end) as rmdr_sale_n2_mm_amt : Decimal,
        MAX(case when month = '03' then amount else null end) as rmdr_sale_n3_mm_amt : Decimal,
        MAX(case when month = '04' then amount else null end) as rmdr_sale_n4_mm_amt : Decimal,
        MAX(case when month = '05' then amount else null end) as rmdr_sale_n5_mm_amt : Decimal,
        MAX(case when month = '06' then amount else null end) as rmdr_sale_n6_mm_amt : Decimal,
        MAX(case when month = '07' then amount else null end) as rmdr_sale_n7_mm_amt : Decimal,
        MAX(case when month = '08' then amount else null end) as rmdr_sale_n8_mm_amt : Decimal,
        MAX(case when month = '09' then amount else null end) as rmdr_sale_n9_mm_amt : Decimal,
        MAX(case when month = '10' then amount else null end) as rmdr_sale_n10_mm_amt : Decimal,
        MAX(case when month = '11' then amount else null end) as rmdr_sale_n11_mm_amt : Decimal,
        MAX(case when month = '12' then amount else null end) as rmdr_sale_n12_mm_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end)
        ) AS rmdr_sale_n1_qtr_amt : Decimal,
        (
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end)
        ) AS rmdr_sale_n2_qtr_amt : Decimal,
        (
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end)
        ) AS rmdr_sale_n3_qtr_amt : Decimal,
        (
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS rmdr_sale_n4_qtr_amt : Decimal,
        (
            MAX(case when month = '01' then amount else null end) +
            MAX(case when month = '02' then amount else null end) +
            MAX(case when month = '03' then amount else null end) +
            MAX(case when month = '04' then amount else null end) +
            MAX(case when month = '05' then amount else null end) +
            MAX(case when month = '06' then amount else null end) +
            MAX(case when month = '07' then amount else null end) +
            MAX(case when month = '08' then amount else null end) +
            MAX(case when month = '09' then amount else null end) +
            MAX(case when month = '10' then amount else null end) +
            MAX(case when month = '11' then amount else null end) +
            MAX(case when month = '12' then amount else null end)
        ) AS rmdr_sale_year_amt : Decimal
        from common.mis_rmdr_amount
        group by prj_no, sell_sls_cnrc_no, year
    ) as rmdr on prj.prj_no = rmdr.prj_no and prj.sell_sls_cnrc_no = rmdr.sell_sls_cnrc_no
        and substring(prj.rodr_esmt_ym, 1, 4) = rmdr.year
    {
        key prj.prj_no,
        key prj.sell_sls_cnrc_no,
        key rodr_esmt_ym,
        dp_no,
        prj_nm,
        cstco_rid,
        cstco : Association to one common.mis_com_cstco
                                      on cstco.id = $self.cstco_rid,
        rodr_sctr_org_rid,
        rodr_sctr_org           : Association to one common.mis_com_org
                                      on rodr_sctr_org.id = $self.rodr_sctr_org_rid,
        rodr_hdqt_org_rid,
        rodr_hdqt_org           : Association to one common.mis_com_org
                                      on rodr_hdqt_org.id = $self.rodr_hdqt_org_rid,
        rodr_org_rid,
        rodr_org                : Association to one common.mis_com_org
                                      on rodr_org.id = $self.rodr_org_rid,
        sale_sctr_org_rid,
        sale_sctr_org           : Association to one common.mis_com_org
                                      on sale_sctr_org.id = $self.sale_sctr_org_rid,
        sale_hdqt_org_rid,
        sale_hdqt_org           : Association to one common.mis_com_org
                                      on sale_hdqt_org.id = $self.sale_hdqt_org_rid,
        sale_org_rid,
        sale_org                : Association to one common.mis_com_org
                                      on sale_org.id = $self.sale_org_rid,
        rodr_cnrc_ym,
        prj_prfm_end_dt,
        prj_prfm_str_dt,
        new_crov_div_rcid,
        new_crov_div            : Association to one common.mis_com_ctgr
                                      on  new_crov_div.prnt_ctgr_id = '200358'
                                      and new_crov_div.id           = $self.new_crov_div_rcid,
        prj_scr_yn,
        ovse_biz_yn,
        relsco_yn,
        cnvg_biz_yn,
        prj_tp_rcid,
        prj_tp                  : Association to one common.mis_com_ctgr
                                      on  prj_tp.prnt_ctgr_id = '100024'
                                      and prj_tp.id           = $self.prj_tp_rcid,
        si_os_div_rcid,
        si_os_div               : Association to one common.mis_com_ctgr
                                      on  si_os_div.prnt_ctgr_id = '200364'
                                      and si_os_div.id           = $self.si_os_div_rcid,
        dp_knd_cd,
        dev_aplt_dgtr_tech_rcid,
        dev_aplt_dgtr_tech      : Association to one common.mis_com_ctgr
                                      on  dev_aplt_dgtr_tech.prnt_ctgr_id = '200086'
                                      and dev_aplt_dgtr_tech.id           = $self.dev_aplt_dgtr_tech_rcid,
        brand_nm,
        dp_nm,
        bd_n1_rid,
        bd_n2_rid,
        bd_n3_rid,
        bd_n4_rid,
        bd_n5_rid,
        bd_n6_rid,
        itsm_div_rcid,
        itsm_div                : Association to one common.mis_com_ctgr
                                      on  itsm_div.prnt_ctgr_id = '200368'
                                      and itsm_div.id           = $self.itsm_div_rcid,
        dblbk_sctr_org_rid,
        dblbk_sctr_org          : Association to one common.mis_com_org
                                      on dblbk_sctr_org.id = $self.dblbk_sctr_org_rid,
        dblbk_hdqt_org_rid,
        dblbk_hdqt_org          : Association to one common.mis_com_org
                                      on dblbk_hdqt_org.id = $self.dblbk_hdqt_org_rid,
        dblbk_org_rid,
        dblbk_org               : Association to one common.mis_com_org
                                      on dblbk_org.id = $self.dblbk_org_rid,
        dblbk_sale_yn,
        rskel_yn,
        cnrc_rskel_cd,
        rskel_tp_rcid,
        excp_logic_clf_rcid,
        excp_logic_clf          : Association to one common.mis_com_ctgr
                                      on  excp_logic_clf.prnt_ctgr_id = '200678'
                                      and excp_logic_clf.id           = $self.excp_logic_clf_rcid,
        excp_sale_logic_nm,
        excp_sale_logic_desc,
        sctr_dcid_yn,
        sctr_dcid_dt,
        hdqt_dcid_yn,
        hdqt_dcid_dt,
        aco_dcid_yn,
        aco_dcid_dt,
        ver_no,
        org_pfls_dcid_yn,
        dgtr_tp_rcid,
        dgtr_tp                 : Association to one common.mis_com_ctgr
                                      on  dgtr_tp.prnt_ctgr_id = '200205'
                                      and dgtr_tp.id           = $self.dgtr_tp_rcid,
        dpd_brand_dp_rid,
        src_div_rcid,
        crrn_yn,
        sls_prfm_str_dt,
        sls_prfm_end_dt,
        rmk_cntt,
        team_unt_nm,
        prfm_prjm_rid,
        prfm_prjm               : Association to one common.mis_com_emp
                                      on prfm_prjm.id = $self.prfm_prjm_rid,
        org_ver_rid,
        esmt_src_div_cd,
        esmt_src_trgt_cd,
        dev_aplt_dgtr_tech_nm,
        rskel_grd_rcid,
        rskel_grd               : Association to one common.mis_com_ctgr
                                      on  rskel_grd.prnt_ctgr_id = '1500084'
                                      and rskel_grd.id           = $self.rskel_grd_rcid,
        crrn_sno,
        end_prclm_dt,
        qttn_trg_no,
        qttn_pblsh_no,
        crrn_trg_no,
        crrn_cnrc_no,
        rspb_sls_org_rid,
        account_rid,
        erp_stts_cd,

        sale.year as sale_year,
        sale.sale_n1_mm_amt,
        sale.sale_n2_mm_amt,
        sale.sale_n3_mm_amt,
        sale.sale_n4_mm_amt,
        sale.sale_n5_mm_amt,
        sale.sale_n6_mm_amt,
        sale.sale_n7_mm_amt,
        sale.sale_n8_mm_amt,
        sale.sale_n9_mm_amt,
        sale.sale_n10_mm_amt,
        sale.sale_n11_mm_amt,
        sale.sale_n12_mm_amt,
        sale.sale_n1_qtr_amt,
        sale.sale_n2_qtr_amt,
        sale.sale_n3_qtr_amt,
        sale.sale_n4_qtr_amt,
        sale.sale_year_amt,

        order.year as order_year,
        order.rodr_n1_mm_amt,
        order.rodr_n2_mm_amt,
        order.rodr_n3_mm_amt,
        order.rodr_n4_mm_amt,
        order.rodr_n5_mm_amt,
        order.rodr_n6_mm_amt,
        order.rodr_n7_mm_amt,
        order.rodr_n8_mm_amt,
        order.rodr_n9_mm_amt,
        order.rodr_n10_mm_amt,
        order.rodr_n11_mm_amt,
        order.rodr_n12_mm_amt,
        order.rodr_n1_qtr_amt,
        order.rodr_n2_qtr_amt,
        order.rodr_n3_qtr_amt,
        order.rodr_n4_qtr_amt,
        order.rodr_year_amt,

        cos.year as cos_year,
        cos.prj_prfm_n1_mm_amt,
        cos.prj_prfm_n2_mm_amt,
        cos.prj_prfm_n3_mm_amt,
        cos.prj_prfm_n4_mm_amt,
        cos.prj_prfm_n5_mm_amt,
        cos.prj_prfm_n6_mm_amt,
        cos.prj_prfm_n7_mm_amt,
        cos.prj_prfm_n8_mm_amt,
        cos.prj_prfm_n9_mm_amt,
        cos.prj_prfm_n10_mm_amt,
        cos.prj_prfm_n11_mm_amt,
        cos.prj_prfm_n12_mm_amt,
        cos.prj_prfm_n1_qtr_amt,
        cos.prj_prfm_n2_qtr_amt,
        cos.prj_prfm_n3_qtr_amt,
        cos.prj_prfm_n4_qtr_amt,
        cos.prj_prfm_year_amt,

        rmdr.year as rmdr_year,
        rmdr.rmdr_sale_n1_mm_amt,
        rmdr.rmdr_sale_n2_mm_amt,
        rmdr.rmdr_sale_n3_mm_amt,
        rmdr.rmdr_sale_n4_mm_amt,
        rmdr.rmdr_sale_n5_mm_amt,
        rmdr.rmdr_sale_n6_mm_amt,
        rmdr.rmdr_sale_n7_mm_amt,
        rmdr.rmdr_sale_n8_mm_amt,
        rmdr.rmdr_sale_n9_mm_amt,
        rmdr.rmdr_sale_n10_mm_amt,
        rmdr.rmdr_sale_n11_mm_amt,
        rmdr.rmdr_sale_n12_mm_amt,
        rmdr.rmdr_sale_n1_qtr_amt,
        rmdr.rmdr_sale_n2_qtr_amt,
        rmdr.rmdr_sale_n3_qtr_amt,
        rmdr.rmdr_sale_n4_qtr_amt,
        rmdr.rmdr_sale_year_amt
    } where NOT(rmdr_sale_year_amt = 0 and prj_prfm_year_amt = 0 and rodr_year_amt = 0 and sale_year_amt = 0);

view mis_project_sheet_expand_view(id : String(20)) as select from pl.mis_project_sheet_view as mis_project_sheet_view
    inner join common.mis_com_cstco as mis_com_cstco on mis_project_sheet_view.cstco_rid = mis_com_cstco.id
    inner join common.mis_get_org_descendant(id: :id, use_yn: true) as mis_get_org_descendant on mis_project_sheet_view.sale_org_rid = mis_get_org_descendant.id
    {
        key prj_no, 
        key sell_sls_cnrc_no,
        key rodr_esmt_ym,
            substr(rodr_esmt_ym, 1, 4) as rodr_esmt_y,
            dp_no,
            prj_nm,
            cstco_rid,
            cstco_nm,
            rodr_sctr_org_rid,
            (
                select org_kor_nm
                from common.mis_com_org
                where mis_com_org.id = mis_project_sheet_view.rodr_sctr_org_rid
            ) as rodr_sctr_org_nm,
            rodr_hdqt_org_rid,
            (
                select org_kor_nm
                from common.mis_com_org
                where mis_com_org.id = mis_project_sheet_view.rodr_hdqt_org_rid
            ) as rodr_hdqt_org_nm,
            rodr_org_rid,
            (
                select org_kor_nm
                from common.mis_com_org
                where mis_com_org.id = mis_project_sheet_view.rodr_org_rid
            ) as rodr_org_nm,
            sale_sctr_org_rid,
            (
                select org_kor_nm
                from common.mis_com_org
                where mis_com_org.id = mis_project_sheet_view.sale_sctr_org_rid
            ) as sale_sctr_org_nm,
            sale_hdqt_org_rid,
            (
                select org_kor_nm
                from common.mis_com_org
                where mis_com_org.id = mis_project_sheet_view.sale_hdqt_org_rid
            ) as sale_hdqt_org_nm,
            sale_org_rid,
            (
                select org_kor_nm
                from common.mis_com_org
                where mis_com_org.id = mis_project_sheet_view.sale_org_rid
            ) as sale_org_nm,
            rodr_cnrc_ym,
            prj_prfm_end_dt,
            prj_prfm_str_dt,
            new_crov_div_rcid,
            (
                select ctgr_titl_nm
                from common.mis_com_ctgr
                where prnt_ctgr_id = '200358'
                and id = mis_project_sheet_view.new_crov_div_rcid
            ) as new_crov_div_nm,
            prj_scr_yn,
            ovse_biz_yn,
            mis_project_sheet_view.relsco_yn,
            cnvg_biz_yn,
            prj_tp_rcid,
            (
                select ctgr_titl_nm
                from common.mis_com_ctgr
                where prnt_ctgr_id = '100024'
                and id = mis_project_sheet_view.prj_tp_rcid
            ) as prj_tp_nm,
            si_os_div_rcid,
            (
                select ctgr_titl_nm
                from common.mis_com_ctgr
                where prnt_ctgr_id = '200364'
                and id = mis_project_sheet_view.si_os_div_rcid
            ) as si_os_div_nm,
            dp_knd_cd,
            dev_aplt_dgtr_tech_rcid,
            dev_aplt_dgtr_tech_nm,
            brand_nm,
            dp_nm,
            bd_n1_rid,
            bd_n2_rid,
            bd_n3_rid,
            bd_n4_rid,
            bd_n5_rid,
            bd_n6_rid,
            itsm_div_rcid,
            (
                select ctgr_titl_nm
                from common.mis_com_ctgr
                where prnt_ctgr_id = '200368'
                and id = mis_project_sheet_view.itsm_div_rcid
            ) as itsm_div_nm,
            rodr_n1_mm_amt,
            rodr_n2_mm_amt,
            rodr_n3_mm_amt,
            rodr_n4_mm_amt,
            rodr_n5_mm_amt,
            rodr_n6_mm_amt,
            rodr_n7_mm_amt,
            rodr_n8_mm_amt,
            rodr_n9_mm_amt,
            rodr_n10_mm_amt,
            rodr_n11_mm_amt,
            rodr_n12_mm_amt,
            rodr_n1_qtr_amt,
            rodr_n2_qtr_amt,
            rodr_n3_qtr_amt,
            rodr_n4_qtr_amt,
            rodr_year_amt,
            sale_n1_mm_amt,
            sale_n2_mm_amt,
            sale_n3_mm_amt,
            sale_n4_mm_amt,
            sale_n5_mm_amt,
            sale_n6_mm_amt,
            sale_n7_mm_amt,
            sale_n8_mm_amt,
            sale_n9_mm_amt,
            sale_n10_mm_amt,
            sale_n11_mm_amt,
            sale_n12_mm_amt,
            sale_n1_qtr_amt,
            sale_n2_qtr_amt,
            sale_n3_qtr_amt,
            sale_n4_qtr_amt,
            sale_year_amt,
            prj_prfm_n1_mm_amt,
            prj_prfm_n2_mm_amt,
            prj_prfm_n3_mm_amt,
            prj_prfm_n4_mm_amt,
            prj_prfm_n5_mm_amt,
            prj_prfm_n6_mm_amt,
            prj_prfm_n7_mm_amt,
            prj_prfm_n8_mm_amt,
            prj_prfm_n9_mm_amt,
            prj_prfm_n10_mm_amt,
            prj_prfm_n11_mm_amt,
            prj_prfm_n12_mm_amt,
            prj_prfm_n1_qtr_amt,
            prj_prfm_n2_qtr_amt,
            prj_prfm_n3_qtr_amt,
            prj_prfm_n4_qtr_amt,
            prj_prfm_year_amt,
            rmdr_sale_n1_mm_amt,
            rmdr_sale_n2_mm_amt,
            rmdr_sale_n3_mm_amt,
            rmdr_sale_n4_mm_amt,
            rmdr_sale_n5_mm_amt,
            rmdr_sale_n6_mm_amt,
            rmdr_sale_n7_mm_amt,
            rmdr_sale_n8_mm_amt,
            rmdr_sale_n9_mm_amt,
            rmdr_sale_n10_mm_amt,
            rmdr_sale_n11_mm_amt,
            rmdr_sale_n12_mm_amt,
            rmdr_sale_n1_qtr_amt,
            rmdr_sale_n2_qtr_amt,
            rmdr_sale_n3_qtr_amt,
            rmdr_sale_n4_qtr_amt,
            rmdr_sale_year_amt,
            dblbk_sctr_org_rid,
            (
                select org_kor_nm
                from common.mis_com_org
                where mis_com_org.id = mis_project_sheet_view.dblbk_sctr_org_rid
            ) as dblbk_sctr_org_nm,
            dblbk_hdqt_org_rid,
            (
                select org_kor_nm
                from common.mis_com_org
                where mis_com_org.id = mis_project_sheet_view.dblbk_hdqt_org_rid
            ) as dblbk_hdqt_org_nm,
            dblbk_org_rid,
            (
                select org_kor_nm
                from common.mis_com_org
                where mis_com_org.id = mis_project_sheet_view.dblbk_org_rid
            ) as dblbk_org_nm,
            dblbk_sale_yn,
            rskel_yn,
            cnrc_rskel_cd,
            rskel_tp_rcid,
            excp_logic_clf_rcid,
            (
                select ctgr_titl_nm
                from common.mis_com_ctgr
                where prnt_ctgr_id = '200678'
                and id = mis_project_sheet_view.excp_logic_clf_rcid
            ) as excp_logic_clf_nm,
            excp_sale_logic_nm,
            excp_sale_logic_desc,
            sctr_dcid_yn,
            sctr_dcid_dt,
            hdqt_dcid_yn,
            hdqt_dcid_dt,
            aco_dcid_yn,
            aco_dcid_dt,
            ver_no,
            org_pfls_dcid_yn,
            dgtr_tp_rcid,
            (
                select ctgr_titl_nm
                from common.mis_com_ctgr
                where prnt_ctgr_id = '200205'
                and id = mis_project_sheet_view.dgtr_tp_rcid
            ) as dgtr_tp_nm,
            dpd_brand_dp_rid,
            src_div_rcid,
            crrn_yn,
            sls_prfm_str_dt,
            sls_prfm_end_dt,
            rmk_cntt,
            team_unt_nm,
            prfm_prjm_rid,
            (
                select org_kor_nm
                from common.mis_com_org
                where mis_com_org.id = mis_project_sheet_view.prfm_prjm_rid
            ) as prfm_prjm_nm,
            org_ver_rid,
            esmt_src_div_cd,
            esmt_src_trgt_cd,
            rskel_grd_rcid,
            (
                select ctgr_titl_nm
                from common.mis_com_ctgr
                where prnt_ctgr_id = '1500084'
                and id = mis_project_sheet_view.rskel_grd_rcid
            ) as rskel_grd_nm,
            crrn_sno,
            end_prclm_dt,
            qttn_trg_no,
            qttn_pblsh_no,
            crrn_trg_no,
            crrn_cnrc_no,
            rspb_sls_org_rid,
            account_rid,
            erp_stts_cd
    }

// 전체 조직
view org_view as select from(
    select
        id,
        upr_org_id,
        org_kor_nm,
        org_cd,
        org_eng_nm,
        use_yn
    from
        common.mis_com_org
    where
        vrtl_org_yn = false
        // and use_yn = true // use YN 일단은 처리 안함.
)
{
    id,
    org_cd,
    org_kor_nm,
    org_eng_nm,
    upr_org_id,
    use_yn
}

