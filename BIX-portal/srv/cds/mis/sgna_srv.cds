using sgna from '../../../db/cds/mis/sgna';
using common from '../../../db/cds/mis/mis';
using pl from '../../../db/cds/mis/pl';

// @impl: 'srv/handlers/mis/sgna_srv.js'
@path               : '/odata/v4/sgna'
@requires: 'any'
@cds.query.limit.max: 10000
service SgnaService {

    entity sga_wideview as projection on sgna.sga_wideview;
    entity org_b_labor as projection on sgna.org_b_labor;
    entity org_opp_labor as projection on sgna.org_opp_labor;
    entity org_total_labor as projection on sgna.org_total_labor;

    
    /**
     * 조직구조 매핑용 테이블 (테스트)
     */
    view org_mapping_view as select from (
        select org1.id, org2.id as level2,
            org3.id as level3, org4.id as level4, org5.id as level5
            , org6.id as level6, org7.id as level7, org8.id as level8
         from common.mis_com_org as org1
        inner join common.mis_com_org as org2
            on org2.upr_org_id = '2824' and org1.id = '2824' and org2.use_yn = true
        left join common.mis_com_org as org3
            on org3.upr_org_id = org2.id and org3.use_yn = true
        left join common.mis_com_org as org4
            on org4.upr_org_id = org3.id and org4.use_yn = true
        left join common.mis_com_org as org5
            on org5.upr_org_id = org4.id and org5.use_yn = true
        left join common.mis_com_org as org6
            on org6.upr_org_id = org5.id and org6.use_yn = true
        left join common.mis_com_org as org7
            on org7.upr_org_id = org6.id and org7.use_yn = true
        left join common.mis_com_org as org8
            on org8.upr_org_id = org7.id and org8.use_yn = true
    )
    {
        key id,
        key level2,
        key level3,
        key level4,
        key level5,
        key level6,
        key level7,
        key level8
    }

    /**
     * 
     */
    entity sga_wide_with_delivery as select from (
        select year, month, sga.ccorg_cd, commitment_item, sga_type, type, org_id
         from sgna.sga_wideview as sga inner join sgna.sga_biz_org_mapping as ccorg
        on sga.ccorg_cd = ccorg.ccorg_cd
    )
    {
        key year,
        key month,
        key sga_type,
        key ccorg_cd,
        key commitment_item,
        type,
        org_id
    }

    /**
     * 목업 SG&A 구현 용 실적 데이터 장판지 뷰
     * 실적 월 기준
     * (예시: [5월 실적]은 결산 직후인 [6월 데이터(row 중 month = 6)]에서의 [5월 컬럼(sga_m5_amt)] 값 사용)
     */
    entity sga_result_view as select from (
        (
            select year, month, sga_type, ccorg_cd, commitment_item, org_id,
                '01' as result_month : String(2), sga_m1_amt as amount,
                sga_m1_amt as sum_amount
            from sgna.sga_wideview where month = 2
            union all
            select year, month, sga_type, ccorg_cd, commitment_item, org_id,
                '02' as result_month : String(2), sga_m2_amt as amount,
                sga_m1_amt+sga_m2_amt as sum_amount
            from sgna.sga_wideview where month = 3
            union all
            select year, month, sga_type, ccorg_cd, commitment_item, org_id,
                '03' as result_month : String(2), sga_m3_amt as amount,
                sga_m1_amt+sga_m2_amt+sga_m3_amt as sum_amount
            from sgna.sga_wideview where month = 4
            union all
            select year, month, sga_type, ccorg_cd, commitment_item, org_id,
                '04' as result_month : String(2), sga_m4_amt as amount,
                sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt as sum_amount
            from sgna.sga_wideview where month = 5
            union all
            select year, month, sga_type, ccorg_cd, commitment_item, org_id,
                '05' as result_month : String(2), sga_m5_amt as amount,
                sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt as sum_amount
            from sgna.sga_wideview where month = 6
            union all
            select year, month, sga_type, ccorg_cd, commitment_item, org_id,
                '06' as result_month : String(2), sga_m6_amt as amount,
                sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt+sga_m6_amt as sum_amount
            from sgna.sga_wideview where month = 7
            union all
            select year, month, sga_type, ccorg_cd, commitment_item, org_id,
                '07' as result_month : String(2), sga_m7_amt as amount,
                sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt+sga_m6_amt
                +sga_m7_amt as sum_amount
            from sgna.sga_wideview where month = 8
            union all
            select year, month, sga_type, ccorg_cd, commitment_item, org_id,
                '08' as result_month : String(2), sga_m8_amt as amount,
                sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt+sga_m6_amt
                +sga_m7_amt+sga_m8_amt as sum_amount
            from sgna.sga_wideview where month = 9
            union all
            select year, month, sga_type, ccorg_cd, commitment_item, org_id,
                '09' as result_month : String(2), sga_m9_amt as amount,
                sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt+sga_m6_amt
                +sga_m7_amt+sga_m8_amt+sga_m9_amt as sum_amount
            from sgna.sga_wideview where month = 10
            union all
            select year, month, sga_type, ccorg_cd, commitment_item, org_id,
                '10' as result_month : String(2), sga_m10_amt as amount,
                sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt+sga_m6_amt
                +sga_m7_amt+sga_m8_amt+sga_m9_amt+sga_m10_amt as sum_amount
            from sgna.sga_wideview where month = 11
            union all
            select year, month, sga_type, ccorg_cd, commitment_item, org_id,
                '11' as result_month : String(2), sga_m11_amt as amount,
                sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt+sga_m6_amt
                +sga_m7_amt+sga_m8_amt+sga_m9_amt+sga_m10_amt+sga_m11_amt as sum_amount
            from sgna.sga_wideview where month = 12
            union all
            select year, month, sga_type, ccorg_cd, commitment_item, org_id,
                '12' as result_month : String(2), sga_m12_amt as amount,
                sga_m1_amt+sga_m2_amt+sga_m3_amt+sga_m4_amt+sga_m5_amt+sga_m6_amt
                +sga_m7_amt+sga_m8_amt+sga_m9_amt+sga_m10_amt+sga_m11_amt+sga_m12_amt as sum_amount
            from sgna.sga_wideview where month = 12
        ) as result
        inner join sgna.sga_biz_org_mapping as map
        on map.ccorg_cd = result.ccorg_cd
    )
    {
        key year,
        key month,
        key sga_type,
        key result.ccorg_cd,
        key commitment_item,
        map.type,
        cast(year as String(4)) as result_year,
        result_month,
        org_id,
        amount,
        sum_amount
    }

    /**
     * 본부 (1444) 레벨의 SG&A 합
     */
    entity sga_result_sum_by_hdqt_view as select from 
    (
        select org_id, result_year, result_month, sga_type,sum(amount) as amount : Decimal(20,2)
        from (
            /** 본부 자신의 sg&a */
            select org_id, result_year, result_month, sga_type, amount
            from sga_result_view
            where org_id in (select id from common.mis_com_org where org_tp_rcid = '1444')
            and type = '사업'
            union all
            /** 본부 하위의 팀단위 합산 */
            select org.upr_org_id AS org_id, sga.result_year, sga.result_month, sga.sga_type, sum(sga.amount) AS amount : Decimal(20,2)
            from common.mis_com_org as org
            inner join sga_result_view as sga
            on sga.org_id = org.id
            and sga.type = '사업'
            and org.upr_org_id in (select id from common.mis_com_org where org_tp_rcid = '1444')
            group by org.upr_org_id, sga.result_year, sga.result_month, sga.sga_type
        )
        group by org_id, result_year, result_month, sga_type
    )
    {
        key org_id,
        key result_year,
        key result_month,
        key sga_type,
        amount
    }

    /**
     * 부문 (1439) 레벨의 SG&A 값
     */
    entity sga_result_sum_by_sctr_view as select from
    (
        /** 부문 자신의 sg&a */
        select org_id, result_year, result_month, sga_type, amount
        from sga_result_view
        where org_id in (select id from common.mis_com_org where org_tp_rcid = '1439')
        and type = '사업'
        union all
        /** 본부 합산 sg&a */
        select org.upr_org_id AS org_id, sga.result_year, sga.result_month, sga.sga_type, sum(sga.amount) AS amount : Decimal(20,2)
        from common.mis_com_org as org
        inner join sga_result_sum_by_hdqt_view as sga
        on sga.org_id = org.id
        and org.upr_org_id in (select id from common.mis_com_org where org_tp_rcid = '1439')
        group by org.upr_org_id, sga.result_year, sga.result_month, sga.sga_type
    )
    {
        key org_id,
        key result_year,
        key result_month,
        key sga_type,
        amount 
    }

    entity sga_result_sum_enterprise as select from
    (
        select org.id AS org_id, sga.result_year, sga.result_month, sga.sga_type, sum(sga.amount) AS amount : Decimal(20,2)
        from common.mis_com_org as org
        inner join sga_result_sum_by_hdqt_view as sga
        on sga.org_id = org.id
        // and org.use_yn = true
        group by org.id, sga.result_year, sga.result_month, sga.sga_type
    )
    {
        key org_id,
        key result_year,
        key result_month,
        key sga_type,
        amount 
    }

    // function get_sga_result_detail (year:String(4), month:String(2), org_id:String(10)) returns array of oRes;
    type oRes {
        type : String(30);
        expense : String(10);
        goal: Decimal(20,2);
        performanceCurrentYearMonth: Decimal(20,2);
        performanceLastYearMonth: Decimal(20,2);
        performanceYearMonthGap: Decimal(20,2);
        performanceAttainmentRateCurrentYear: Decimal(10,2);
        performanceAttainmentRateLastYear: Decimal(10,2);
        performanceAttainmentRategap: Decimal(10,2);
        parent_type : String(30);
    }

    view org_b_labor_view(id : String(20), year : Integer, month: Integer) as select from (
        select
        labor.*,
        org.id as id,
        div.div_id as div_id,
        hdqt.hdqt_id as hdqt_id,
        team.team_id as team_id
        from org_b_labor as labor
        inner join common.mis_com_org as org on labor.ccorg_cd = org.ccorg_cd and org.use_yn = true

        left join pl.org_structure_view as team
        on org.id = team.team_id
        
        left join ( select distinct div_id, hdqt_id from pl.org_structure_view ) as hdqt
        on org.id = hdqt.hdqt_id
        or team.hdqt_id = hdqt.hdqt_id
        
        left join ( select distinct div_id from pl.org_structure_view ) as div
        on org.id = div.div_id
        or team.div_id = div.div_id
        or hdqt.div_id = div.div_id
        
        where labor.year = :year 
        and (labor.month = :month or :month is null)
        and div.div_id is not null
        and (
            org.id in (
                select id
                from common.mis_get_org_ancestor_target(id: :id)
            ) or org.id in (
                select id
                from common.mis_get_org_descendant_target(id: :id, org_tp_rcid: null)
            )
        )
    )
    {
        key id : String(20),
        div_id : String(300),
        hdqt_id : String(300),
        team_id : String(300),
        year,
        month,
        bill_m1_amt : Double,
        bill_m2_amt : Double,
        bill_m3_amt : Double,
        bill_m4_amt : Double,
        bill_m5_amt : Double,
        bill_m6_amt : Double,
        bill_m7_amt : Double,
        bill_m8_amt : Double,
        bill_m9_amt : Double,
        bill_m10_amt : Double,
        bill_m11_amt : Double,
        bill_m12_amt : Double
    }

    view org_total_labor_view(id : String(20), year : Integer, month: Integer) as select from (
        select
        labor.*,
        org.id as id,
        div.div_id as div_id,
        hdqt.hdqt_id as hdqt_id,
        team.team_id as team_id
        from org_total_labor as labor
        inner join common.mis_com_org as org on labor.ccorg_cd = org.ccorg_cd and org.use_yn = true

        left join pl.org_structure_view as team
        on org.id = team.team_id
        
        left join ( select distinct div_id, hdqt_id from pl.org_structure_view ) as hdqt
        on org.id = hdqt.hdqt_id
        or team.hdqt_id = hdqt.hdqt_id
        
        left join ( select distinct div_id from pl.org_structure_view ) as div
        on org.id = div.div_id
        or team.div_id = div.div_id
        or hdqt.div_id = div.div_id
        
        where labor.year = :year 
        and (labor.month = :month or :month is null)
        and div.div_id is not null
        and (
            org.id in (
                select id
                from common.mis_get_org_ancestor_target(id: :id)
            ) or org.id in (
                select id
                from common.mis_get_org_descendant_target(id: :id, org_tp_rcid: null)
            )
        )    
    )
    {
        key id : String(20),
        div_id : String(300),
        hdqt_id : String(300),
        team_id : String(300),
        year,
        month,
        total_m1_amt : Double,
        total_m2_amt : Double,
        total_m3_amt : Double,
        total_m4_amt : Double,
        total_m5_amt : Double,
        total_m6_amt : Double,
        total_m7_amt : Double,
        total_m8_amt : Double,
        total_m9_amt : Double,
        total_m10_amt : Double,
        total_m11_amt : Double,
        total_m12_amt : Double
    }

    view org_opp_labor_view(id : String(20), year : Integer) as select from (
        select
        target_org.id as id,
        labor.year,
        labor.opp_m1_amt as opp_m1_amt,
        labor.opp_m2_amt as opp_m2_amt,
        labor.opp_m3_amt as opp_m3_amt,
        labor.opp_m4_amt as opp_m4_amt,
        labor.opp_m5_amt as opp_m5_amt,
        labor.opp_m6_amt as opp_m6_amt,
        labor.opp_m7_amt as opp_m7_amt,
        labor.opp_m8_amt as opp_m8_amt,
        labor.opp_m9_amt as opp_m9_amt,
        labor.opp_m10_amt as opp_m10_amt,
        labor.opp_m11_amt as opp_m11_amt,
        labor.opp_m12_amt as opp_m12_amt
        from sgna.org_opp_labor as labor
        inner join common.mis_com_org as id_org on labor.org_id = id_org.id
        inner join common.mis_com_org as target_org on id_org.ccorg_cd = target_org.ccorg_cd and target_org.use_yn = true
        where (
            target_org.id in (
                select id
                from common.mis_get_org_ancestor_target(id: :id)
            ) or target_org.id in (
                select id
                from common.mis_get_org_descendant_target(id: :id, org_tp_rcid: null)
            )
        )
        order by target_org.id
    )
    {
        key id : String(20),
        year,
        opp_m1_amt : Double,
        opp_m2_amt : Double,
        opp_m3_amt : Double,
        opp_m4_amt : Double,
        opp_m5_amt : Double,
        opp_m6_amt : Double,
        opp_m7_amt : Double,
        opp_m8_amt : Double,
        opp_m9_amt : Double,
        opp_m10_amt : Double,
        opp_m11_amt : Double,
        opp_m12_amt : Double
    }

    /**
     * 인력추정 추정치 Detail View
     */
    view org_labor_br(id : String(20), year : Integer, month: Integer) as select from (
        select *
        from (
            select
            bill.div_id,
            null as hdqt_id,
            null as team_id,
            f_mis_get_org_kor_nm(bill.div_id) as level1,
            f_mis_get_org_kor_nm(bill.div_id) as level2,
            f_mis_get_org_kor_nm(bill.div_id) as level3,
            bill.year,
            bill.month,
            sum(bill_m1_amt) as bill_m1_amt,
            sum(bill_m2_amt) as bill_m2_amt,
            sum(bill_m3_amt) as bill_m3_amt,
            sum(bill_m4_amt) as bill_m4_amt,
            sum(bill_m5_amt) as bill_m5_amt,
            sum(bill_m6_amt) as bill_m6_amt,
            sum(bill_m7_amt) as bill_m7_amt,
            sum(bill_m8_amt) as bill_m8_amt,
            sum(bill_m9_amt) as bill_m9_amt,
            sum(bill_m10_amt) as bill_m10_amt,
            sum(bill_m11_amt) as bill_m11_amt,
            sum(bill_m12_amt) as bill_m12_amt,
            sum(opp.opp_m1_amt) as opp_m1_amt,
            sum(opp.opp_m2_amt) as opp_m2_amt,
            sum(opp.opp_m3_amt) as opp_m3_amt,
            sum(opp.opp_m4_amt) as opp_m4_amt,
            sum(opp.opp_m5_amt) as opp_m5_amt,
            sum(opp.opp_m6_amt) as opp_m6_amt,
            sum(opp.opp_m7_amt) as opp_m7_amt,
            sum(opp.opp_m8_amt) as opp_m8_amt,
            sum(opp.opp_m9_amt) as opp_m9_amt,
            sum(opp.opp_m10_amt) as opp_m10_amt,
            sum(opp.opp_m11_amt) as opp_m11_amt,
            sum(opp.opp_m12_amt) as opp_m12_amt,
            sum(total.total_m1_amt) as total_m1_amt,
            sum(total.total_m2_amt) as total_m2_amt,
            sum(total.total_m3_amt) as total_m3_amt,
            sum(total.total_m4_amt) as total_m4_amt,
            sum(total.total_m5_amt) as total_m5_amt,
            sum(total.total_m6_amt) as total_m6_amt,
            sum(total.total_m7_amt) as total_m7_amt,
            sum(total.total_m8_amt) as total_m8_amt,
            sum(total.total_m9_amt) as total_m9_amt,
            sum(total.total_m10_amt) as total_m10_amt,
            sum(total.total_m11_amt) as total_m11_amt,
            sum(total.total_m12_amt) as total_m12_amt            
            from org_b_labor_view(id: :id,year: :year, month: :month) as bill
            left join org_opp_labor_view(id: :id, year: :year) as opp on bill.div_id = opp.id and bill.year = opp.year
            left join org_total_labor_view(id: :id,year: :year, month: :month) as total 
                on bill.id = total.id and bill.year = total.year and bill.month = total.month
            group by bill.div_id, bill.year, bill.month    

            union

            select
            bill.div_id,
            bill.hdqt_id,
            null as team_id,
            f_mis_get_org_kor_nm(bill.div_id) as level1,
            f_mis_get_org_kor_nm(bill.hdqt_id) as level2,
            f_mis_get_org_kor_nm(bill.hdqt_id) as level3,
            bill.year,
            bill.month,
            sum(bill_m1_amt) as bill_m1_amt,
            sum(bill_m2_amt) as bill_m2_amt,
            sum(bill_m3_amt) as bill_m3_amt,
            sum(bill_m4_amt) as bill_m4_amt,
            sum(bill_m5_amt) as bill_m5_amt,
            sum(bill_m6_amt) as bill_m6_amt,
            sum(bill_m7_amt) as bill_m7_amt,
            sum(bill_m8_amt) as bill_m8_amt,
            sum(bill_m9_amt) as bill_m9_amt,
            sum(bill_m10_amt) as bill_m10_amt,
            sum(bill_m11_amt) as bill_m11_amt,
            sum(bill_m12_amt) as bill_m12_amt,
            sum(opp.opp_m1_amt) as opp_m1_amt,
            sum(opp.opp_m2_amt) as opp_m2_amt,
            sum(opp.opp_m3_amt) as opp_m3_amt,
            sum(opp.opp_m4_amt) as opp_m4_amt,
            sum(opp.opp_m5_amt) as opp_m5_amt,
            sum(opp.opp_m6_amt) as opp_m6_amt,
            sum(opp.opp_m7_amt) as opp_m7_amt,
            sum(opp.opp_m8_amt) as opp_m8_amt,
            sum(opp.opp_m9_amt) as opp_m9_amt,
            sum(opp.opp_m10_amt) as opp_m10_amt,
            sum(opp.opp_m11_amt) as opp_m11_amt,
            sum(opp.opp_m12_amt) as opp_m12_amt,
            sum(total.total_m1_amt) as total_m1_amt,
            sum(total.total_m2_amt) as total_m2_amt,
            sum(total.total_m3_amt) as total_m3_amt,
            sum(total.total_m4_amt) as total_m4_amt,
            sum(total.total_m5_amt) as total_m5_amt,
            sum(total.total_m6_amt) as total_m6_amt,
            sum(total.total_m7_amt) as total_m7_amt,
            sum(total.total_m8_amt) as total_m8_amt,
            sum(total.total_m9_amt) as total_m9_amt,
            sum(total.total_m10_amt) as total_m10_amt,
            sum(total.total_m11_amt) as total_m11_amt,
            sum(total.total_m12_amt) as total_m12_amt 
            from org_b_labor_view(id: :id,year: :year, month: :month) as bill
            left join org_opp_labor_view(id: :id, year: :year) as opp on bill.hdqt_id = opp.id and bill.year = opp.year
            left join org_total_labor_view(id: :id,year: :year, month: :month) as total 
                on bill.id = total.id and bill.year = total.year and bill.month = total.month
            where bill.hdqt_id is not null
            group by bill.div_id, bill.hdqt_id, bill.year, bill.month    

            union

            select
            bill.div_id,
            bill.hdqt_id,
            bill.team_id,
            f_mis_get_org_kor_nm(bill.div_id) as level1,
            f_mis_get_org_kor_nm(bill.hdqt_id) as level2,
            f_mis_get_org_kor_nm(bill.team_id) as level3,
            bill.year,
            bill.month,
            sum(bill_m1_amt) as bill_m1_amt,
            sum(bill_m2_amt) as bill_m2_amt,
            sum(bill_m3_amt) as bill_m3_amt,
            sum(bill_m4_amt) as bill_m4_amt,
            sum(bill_m5_amt) as bill_m5_amt,
            sum(bill_m6_amt) as bill_m6_amt,
            sum(bill_m7_amt) as bill_m7_amt,
            sum(bill_m8_amt) as bill_m8_amt,
            sum(bill_m9_amt) as bill_m9_amt,
            sum(bill_m10_amt) as bill_m10_amt,
            sum(bill_m11_amt) as bill_m11_amt,
            sum(bill_m12_amt) as bill_m12_amt,
            sum(opp.opp_m1_amt) as opp_m1_amt,
            sum(opp.opp_m2_amt) as opp_m2_amt,
            sum(opp.opp_m3_amt) as opp_m3_amt,
            sum(opp.opp_m4_amt) as opp_m4_amt,
            sum(opp.opp_m5_amt) as opp_m5_amt,
            sum(opp.opp_m6_amt) as opp_m6_amt,
            sum(opp.opp_m7_amt) as opp_m7_amt,
            sum(opp.opp_m8_amt) as opp_m8_amt,
            sum(opp.opp_m9_amt) as opp_m9_amt,
            sum(opp.opp_m10_amt) as opp_m10_amt,
            sum(opp.opp_m11_amt) as opp_m11_amt,
            sum(opp.opp_m12_amt) as opp_m12_amt,
            sum(total.total_m1_amt) as total_m1_amt,
            sum(total.total_m2_amt) as total_m2_amt,
            sum(total.total_m3_amt) as total_m3_amt,
            sum(total.total_m4_amt) as total_m4_amt,
            sum(total.total_m5_amt) as total_m5_amt,
            sum(total.total_m6_amt) as total_m6_amt,
            sum(total.total_m7_amt) as total_m7_amt,
            sum(total.total_m8_amt) as total_m8_amt,
            sum(total.total_m9_amt) as total_m9_amt,
            sum(total.total_m10_amt) as total_m10_amt,
            sum(total.total_m11_amt) as total_m11_amt,
            sum(total.total_m12_amt) as total_m12_amt 
            from org_b_labor_view(id: :id,year: :year, month: :month) as bill
            left join org_opp_labor_view(id: :id, year: :year) as opp on bill.team_id = opp.id and bill.year = opp.year
            left join org_total_labor_view(id: :id,year: :year, month: :month) as total 
                on bill.id = total.id and bill.year = total.year and bill.month = total.month
            where bill.hdqt_id is not null and bill.team_id is not null
            group by bill.div_id, bill.hdqt_id, bill.team_id, bill.year, bill.month
        ) 
        order by div_id, hdqt_id, team_id, year, month
    )
    {
        key div_id : String(20),
        key hdqt_id : String(20),
        key team_id : String(20),
        key year,
        key month,
        level1 : String(300),
        level2 : String(300),
        level3 : String(300),
        bill_m1_amt : Double,
        bill_m2_amt : Double,
        bill_m3_amt : Double,
        bill_m4_amt : Double,
        bill_m5_amt : Double,
        bill_m6_amt : Double,
        bill_m7_amt : Double,
        bill_m8_amt : Double,
        bill_m9_amt : Double,
        bill_m10_amt : Double,
        bill_m11_amt : Double,
        bill_m12_amt : Double,
        opp_m1_amt : Double,
        opp_m2_amt : Double,
        opp_m3_amt : Double,
        opp_m4_amt : Double,
        opp_m5_amt : Double,
        opp_m6_amt : Double,
        opp_m7_amt : Double,
        opp_m8_amt : Double,
        opp_m9_amt : Double,
        opp_m10_amt : Double,
        opp_m11_amt : Double,
        opp_m12_amt : Double,
        total_m1_amt : Double,
        total_m2_amt : Double,
        total_m3_amt : Double,
        total_m4_amt : Double,
        total_m5_amt : Double,
        total_m6_amt : Double,
        total_m7_amt : Double,
        total_m8_amt : Double,
        total_m9_amt : Double,
        total_m10_amt : Double,
        total_m11_amt : Double,
        total_m12_amt : Double
    }
}