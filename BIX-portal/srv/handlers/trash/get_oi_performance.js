module.exports = (srv) => {
    srv.on('get_oi_performance', async (req) => {

        /**
         * API 리턴값 담을 배열 선언
         */
        const oResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');
        
        /**
         * common.view.org_full_level [조직정보]
         * 조직구조 테이블
         */
        const org_view = db.entities('common.view').org_full_level;
        /**
         * pl.view.target_view
         * [부문/본부/팀 + 년,판매,판매,마진,BR 목표금액] ccorg_cd 기준으로 포탈에 입력한 목표
         */
        const target_view = db.entities('pl.view').target_view;
        /**
         * pl.view.wideview_unpivot [실적]
         * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl.view').wideview_unpivot;
        /**
         * sga.view.wideview_unpivot [sg&a 집계]
         * [부문/본부/팀 + 연,금액] 프로젝트 판관비 집계 뷰
         */
        const sga_view = db.entities('sga.view').wideview_unpivot;

        const rsp_view = db.entities('rsp').wideview_unpivot;

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

        const org_where = {lv1_id:org_id, or: {lv2_id:org_id, or: {lv3_id:org_id, or: {div_id:org_id, or: {hdqt_id:org_id, or: {team_id:org_id}}}}}};
        let orgInfo = await SELECT.from(org_view).where(org_where);
        if (orgInfo.length < 1) return; // 예외처리 추가 필요 throw error
        const a_filter_org = orgInfo.map(a => a.org_ccorg_cd);

        let a_condition = {'div_id':orgInfo[0].div_id, 'hdqt_id':orgInfo[0].hdqt_id,'team_id':orgInfo[0].team_id}
        orgInfo.forEach((a,i) =>{
            if(i !== 0){
                a_condition = {'div_id':a.div_id, 'hdqt_id':a.hdqt_id,'team_id':a.team_id, or:a_condition}
            }
        })
        
            
        /**
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const pl_col_list = [
            'year', 'month_amt', 'sum(ifnull(margin_amount_sum,0)) as margin_amount_sum'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month, 'org_id': { "!=": null }, and: a_condition };
        const pl_groupBy_cols = ['year', 'month_amt'];

        /**
         * SG&A 조회용 컬럼
         * shared_exp_yn false = 사업 / true = 전사
         */
        const sga_col_list = ['year',
            '(sum(ifnull(labor_amount_sum,0)) + sum(ifnull(iv_amount_sum,0)) + sum(ifnull(exp_amount_sum,0))) as amount_sum'];
        const sga_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month , 'shared_exp_yn':false, 'org_id':{'!=':null}};
        const sga_groupBy_cols = ['year'];


        const target_column = ['year', 'sum(ifnull(br,0)) as target_br'];
        const target_where = { 'year': year, and: a_condition};
        const target_group_by = ['year']
        
        const rsp_column = ['year', 'month_amt', 'sum(ifnull(total_year_amt,0)) as total_year_amt', 'sum(ifnull(bill_year_amt,0)) as bill_year_amt'];
        const rsp_where = {'year' :{in:[year,last_year]}, 'month_amt': month, 'ccorg_cd':{in:a_filter_org}, 'is_delivery': true};
        const rsp_groupBy = ['year','month_amt'];

        
        // DB 쿼리 실행 (병렬)
        const [target_data, rsp_data, pl_data, sga_data] = await Promise.all([
            SELECT.from(target_view).columns(target_column).where(target_where).groupBy(...target_group_by),
            SELECT.from(rsp_view).columns(rsp_column).where(rsp_where).groupBy(...rsp_groupBy),
            SELECT.from(pl_view).columns(pl_col_list).where(pl_where_conditions).groupBy(...pl_groupBy_cols),
            SELECT.from(sga_view).columns(sga_col_list).where(sga_where_conditions).groupBy(...sga_groupBy_cols)
        ]);
        if (target_data.length < 1) {
            target_data.push({ "target_br": 0, "year": year, "month": month });
        }

        //DT매출 = 조직별 월별 매출 중 DT Tagging 대상만 집계 (DT Tagging -> PL_WIDEVIEW 테이블에서 prj_tp_nm이 DT로 시작하는 데이터)
        const sale_data =
        {
            "seq": 1,
            "type": "DT 매출",
            "goal": 0,
            "performanceCurrentYearMonth": 0,
            "performanceLastYearMonth": 0,
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0
        };
        oResult.push(sale_data);

        //Offshoring = 조직별 월별 AGS외주비(OI_WIDEVIEW) * 환산효과
        const margin_data =
        {
            "seq": 2,
            "type": "Offshoring",
            "goal": 0,
            "performanceCurrentYearMonth": 0,
            "performanceLastYearMonth": 0,
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0
        };
        oResult.push(margin_data);

        //Non-MM = 조직별 월별 매출 중 Non-MM Tagging 대상만 집계 (Non-MM Tagging 대상 기준?)
        //===>최근 미팅에서 고객사가 빼라고 한걸로 기억(?)하는데 재확인 필요
        const non_mm_data =
        {
            "seq": 3,
            "type": "Non-MM",
            "goal": 0,
            "performanceCurrentYearMonth": 0,
            "performanceLastYearMonth": 0,
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0
        };
        oResult.push(non_mm_data);

        let target_row = target_data.find(o => o.year === year),
            rsp_row = rsp_data.find(o=>o.year === year),
            rsp_last_y_row = rsp_data.find(o=>o.year === last_year),
            pl_row = pl_data.find(o => o.year === year),
            pl_last_y_row = pl_data.find(o => o.year === last_year),
            sga_row = sga_data.find(o => o.year === year),
            sga_last_y_row = sga_data.find(o => o.year === last_year)
            ;
        
        //BR = 조직별 월별 빌링인건비 / 총인건비
        const br_data =
        {
            "seq": 4,
            "type": "BR",
            "goal": target_row['target_br'],
            "performanceCurrentYearMonth": rsp_row['total_year_amt'] !== 0 ? rsp_row['bill_year_amt']/rsp_row['total_year_amt']* 100:0,
            "performanceLastYearMonth": rsp_last_y_row['total_year_amt'] !== 0 ? rsp_last_y_row['bill_year_amt']/rsp_last_y_row['total_year_amt']* 100:0,
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0
        };
        
        oResult.push(br_data);
        
        //RoHC = 조직별 월별 공헌이익 / 총인건비
        const rohc_data =
        {
            "seq": 5,
            "type": "RoHC",
            "goal": 0,
            "performanceCurrentYearMonth": rsp_row['total_year_amt'] !== 0 ? ((pl_row?.["margin_amount_sum"] || 0) - (sga_row?.["amount_sum"] || 0))/rsp_row['total_year_amt']:0,
            "performanceLastYearMonth": rsp_last_y_row['total_year_amt'] !== 0 ? ((pl_last_y_row?.["margin_amount_sum"] || 0) - (sga_last_y_row?.["amount_sum"] || 0))/rsp_last_y_row['total_year_amt']:0,
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0
        };
        oResult.push(rohc_data);

        return oResult;

    });
}