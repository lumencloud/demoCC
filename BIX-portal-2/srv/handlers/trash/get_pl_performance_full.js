module.exports = (srv) => {
    srv.on('get_pl_performance_full', async (req) => {
return;
        /**
         * API 리턴값 담을 배열 선언
         */
        const oResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // 조회 대상 DB 테이블
        // entities('<cds namespace 명>').<cds entity 명>
        // srv .cds 에 using from 구문에 엔티티가 속한 db .cds 파일이 최소 한 번이라도 걸려있어야 db.entities 로 엔티티 인식가능
        // (서비스에 등록할 필요는 없음)
        /**
         * pl.target_view
         * [부문/본부/팀 + 년,판매,판매,마진,BR 목표금액] ccorg_cd 기준으로 포탈에 입력한 목표
         */
        const pl_target_view = db.entities('pl').target_view;
        /**
         * pl.wideview_unpivot_view [실적]
         * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl').wideview_unpivot_view;
        /**
         * sga.wideview_unpivot_view [sg&a 집계]
         * [부문/본부/팀 + 연,금액] 프로젝트 판관비 집계 뷰
         */
        const sga_view = db.entities('sga').wideview_unpivot_view;
        /**
         * common.org_full_level [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common').org_full_level;

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

        
        let org_query = await SELECT.from(org_full_level).where`lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id}`;
        if (org_query.length < 1) return; // 예외처리 추가 필요 throw error
        let a_condition = {'div_id':org_query[0].div_id, 'hdqt_id':org_query[0].hdqt_id,'team_id':org_query[0].team_id}
        org_query.forEach((a,i) =>{
            if(i !== 0){
                a_condition = {'div_id':a.div_id, 'hdqt_id':a.hdqt_id,'team_id':a.team_id, or:a_condition}
            }
        })
        
        const orgInfo = [...new Set(org_query.filter(a=>a.div_id !== null).map(a=>a.div_id))];
        const orgInfo_data = org_query.filter(a=>a.div_id !== null).map(a=>({div_id:a.div_id, div_name:a.div_name}));

        // QUERY 공통 파라미터 선언
        /** 
         * 타겟 뷰 조회용 컬럼
         */
        const target_col_list = [
            'year', 'div_id', 'sum(ifnull(sale,0)) as target_sale_amount',
            'sum(ifnull(margin,0)) as target_margin_amount', 'sum(ifnull(br,0)) as target_br'];
        const target_where_conditions = { 'year': { in: [year, last_year] } , 'div_id':{in: orgInfo}};
        const target_groupBy_cols = ['year', 'div_id']

        /**
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본무 조건별 추가)
         */
        const pl_col_list = [
            'year', 'div_id', 'month_amt', 'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(prj_prfm_amount_sum,0)) as prj_prfm_amount_sum', 'sum(ifnull(margin_amount_sum,0)) as margin_amount_sum'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month , 'div_id':{in: orgInfo}};
        const pl_groupBy_cols = ['year', 'month_amt', 'div_id'];

        /**
         * SG&A 조회용 컬럼
         */
        const sga_col_list = ['year','div_id',
            '(sum(ifnull(labor_amount_sum,0)) + sum(ifnull(iv_amount_sum,0)) + sum(ifnull(exp_amount_sum,0))) as amount_sum'];
        const sga_where_conditions = {'year': { in: [year, last_year] }, 'month_amt':month, 'div_id':{in: orgInfo}};
        
        let sga_column = sga_col_list;

        //shared_exp_yn (true=사업, false=전사)
        let sga_where = { ...sga_where_conditions, and: {'shared_exp_yn': true}};
        let sga_groupBy = ['year', 'div_id'];

        let target_column = target_col_list;
        let target_where = {...target_where_conditions, and: a_condition};
        let target_groupBy = target_groupBy_cols;

        let pl_column = pl_col_list;
        let pl_where = {...pl_where_conditions, and: a_condition};
        let pl_groupBy = pl_groupBy_cols;
        
        // DB 쿼리 실행 (병렬)
        const [query, query_target, sga_biz] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(pl_target_view).columns(target_column).where(target_where).groupBy(...target_groupBy),
            // SG&A 사업 실적데이터 [올해년월, 작년동월]
            SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
        ]);
        const o_empty_pl = {
            prj_prfm_amount_sum: 0,
            sale_amount_sum: 0,
            margin_amount_sum: 0
        }
        const o_empty_pl_target = {
            target_sale_amount: 0,
            target_margin_amount: 0,
            target_br: 0
        }
        const o_empty_sga = {
            amount_sum: 0
        }

        const _setting_empty_data = async (data, o_empty_data) => {
            if(data.length<1){
                orgInfo.forEach(a=>{
                    data.push({...o_empty_data, div_id:a, year: year})
                    data.push({...o_empty_data, div_id:a, year: last_year})
                })
            }else{
                orgInfo.forEach(a=>{
                    const filter_data = data.filter(b => b.div_id === a);
                    if(!filter_data.find(c => c.year === year)){
                        data.push({...o_empty_data, div_id:a, year: year})
                    }
                    if(!filter_data.find(c => c.year === last_year)){
                        data.push({...o_empty_data, div_id:a, year: last_year})
                    }
                })
            }
        }

        await Promise.all([
            _setting_empty_data(query,o_empty_pl),
            _setting_empty_data(query_target,o_empty_pl_target),
            _setting_empty_data(sga_biz,o_empty_sga),
        ])

        orgInfo.forEach(a=>{
            const org_filtered_data = orgInfo_data.find(b=>b.div_id === a);
            const pl_row = query.find(b => b.div_id === a && b.year === year);
            const pl_last_y_row = query.find(b => b.div_id === a && b.year === last_year);
            const pl_target_row = query.find(b => b.div_id === a && b.year === year);
            const pl_target_last_y_row = query.find(b => b.div_id === a && b.year === last_year);
            const sga_row = query.find(b => b.div_id === a && b.year === year);
            const sga_last_y_row = query.find(b => b.div_id === a && b.year === last_year);
            const sale_data = {
                "seq": 1,
                "org_kor_nm":org_filtered_data['div_name'],
                "type": "매출",
                "goal": pl_target_row?.["target_sale_amount"]||0,
                "performanceCurrentYearMonth": pl_row?.["sale_amount_sum"] || 0,
                "performanceLastYearMonth": pl_last_y_row?.["sale_amount_sum"]||0,
                "performanceAttainmentRateCurrentYear": pl_target_row?.["target_sale_amount"]||0 ? (pl_row?.["sale_amount_sum"] || 0) / pl_target_row["target_sale_amount"] * 100 : 0,
                "performanceAttainmentRateLastYear": pl_target_last_y_row?.["target_sale_amount"]||0 ?( pl_last_y_row?.["sale_amount_sum"]||0) / pl_target_last_y_row["target_sale_amount"] * 100 : 0
            };

            const margin_data ={
                "seq": 2,
                "org_kor_nm":org_filtered_data['div_name'],
                "type": "마진",
                "goal": pl_target_row?.["target_margin_amount"]||0,
                "performanceCurrentYearMonth": pl_row?.["margin_amount_sum"] || 0,
                "performanceLastYearMonth": pl_last_y_row?.["margin_amount_sum"]||0,
                "performanceAttainmentRateCurrentYear": (pl_target_row?.["target_margin_amount"]||0) !== 0 ? (pl_row?.["margin_amount_sum"] || 0) / pl_target_row["target_margin_amount"] * 100 : 0,
                "performanceAttainmentRateLastYear": (pl_target_last_y_row?.["target_margin_amount"]||0) !== 0 ? (pl_last_y_row?.["margin_amount_sum"]||0) / pl_target_last_y_row["target_margin_amount"] * 100 : 0
            };

            const margin_rate_data = {
                "seq": 3,
                "org_kor_nm":org_filtered_data['div_name'],
                "type": "마진률",
                "goal": sale_data["goal"] !== 0 ? margin_data["goal"] / sale_data["goal"] * 100 : 0,
                "performanceCurrentYearMonth": sale_data["performanceCurrentYearMonth"] !== 0 ? margin_data["performanceCurrentYearMonth"] / sale_data["performanceCurrentYearMonth"] * 100 : 0,
                "performanceLastYearMonth": sale_data["performanceLastYearMonth"] !== 0 ? margin_data["performanceLastYearMonth"] / sale_data["performanceLastYearMonth"] * 100 : 0,
                "performanceAttainmentRateCurrentYear": 0,
                "performanceAttainmentRateLastYear": 0
            };

            const sga_data = {
                "seq": 4,
                "org_kor_nm":org_filtered_data['div_name'],
                "type": "SG&A",
                "goal": 0,
                "performanceCurrentYearMonth": sga_row?.["amount_sum"]||0,
                "performanceLastYearMonth": sga_last_y_row?.["amount_sum"]||0,
                "performanceAttainmentRateCurrentYear": 0,
                "performanceAttainmentRateLastYear": 0
            };
            
            const contribution_data = {
                "seq": 5,
                "org_kor_nm":org_filtered_data['div_name'],
                "type": "공헌이익",
                "goal": 0,
                "performanceCurrentYearMonth": margin_data["performanceCurrentYearMonth"] - (sga_row?.["amount_sum"]||0),
                "performanceLastYearMonth": margin_data["performanceLastYearMonth"] - (sga_last_y_row?.["amount_sum"]||0),
                "performanceAttainmentRateCurrentYear": 0,
                "performanceAttainmentRateLastYear": 0
            };

            oResult.push(sale_data,margin_data,margin_rate_data,sga_data,contribution_data);
        })


        return oResult;
    });
}