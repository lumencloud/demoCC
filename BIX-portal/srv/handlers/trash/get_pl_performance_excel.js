module.exports = (srv) => {
    srv.on('get_pl_performance_excel', async (req) => {
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
         * pl.view.target_view
         * [부문/본부/팀 + 년,판매,판매,마진,BR 목표금액] ccorg_cd 기준으로 포탈에 입력한 목표
         */
        const pl_target_view = db.entities('pl.view').target_view;
        /**
         * pl.view.amount_view [실적]
         * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl.view').wideview_unpivot;
        /**
         * sgna.sga_result_with_org_view [sg&a 집계]
         * [부문/본부/팀 + 연,금액] 프로젝트 판관비 집계 뷰
         */
        const sga_view = db.entities('sga.view').wideview_unpivot;

        /**
         * common.org [조직정보]
         * 조직구조 테이블
         */
        const org_view = db.entities('common.view').org_full_level;

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

        function getMonth(data){
            let iEnd = parseInt(data);
            let aResult = [];
            for(let i = 1 ; i <= iEnd; i++){
                aResult.push(i.toString().padStart(2,'0'));
            };
            return aResult;
        };
        const aMonth = getMonth(month);

        /**
         * 전사 부문 본부 팀 TYPE 코드
         * [To-Be] 인터페이스 코드 버전관리로 동적 매핑 구현 필요!!!!!!!!!!!!!
         */
        const entCode = ['5', '100100', '5600', '100300'];// 최상위인 sk그룹 및 사장 선택시.

        // QUERY 공통 파라미터 선언
        /** 
         * 타겟 뷰 조회용 컬럼
         */
        const target_col_list = [
            'year', 'sum(ifnull(sale,0)) as target_sale_amount',
            'sum(ifnull(margin,0)) as target_margin_amount', 'sum(ifnull(br,0)) as target_br'];
        const target_where_conditions = { 'year': { in: [year, last_year] } };
        const target_groupBy_cols = ['year']

        /**
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */
        const pl_col_list = [
            'year', 'month_amt', 'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(prj_prfm_amount_sum,0)) as prj_prfm_amount_sum', 'sum(sale_amount) as sale_amount', 'sum(prj_prfm_amount) as prj_prfm_amount'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': {'between': '01', 'and': month}, 'org_id':{"!=":null}};
        const pl_groupBy_cols = ['year', 'month_amt'];
        
        /**
         * [TEMP]
         * SG&A 조회용 컬럼
         */
        const sga_col_list = ['year', 'month_amt',
            '(coalesce(sum(labor_amount),0) + coalesce(sum(iv_amount),0) + coalesce(sum(exp_amount),0)) as amount',
            '(coalesce(sum(labor_amount_sum),0) + coalesce(sum(iv_amount_sum),0) + coalesce(sum(exp_amount_sum),0)) as amount_sum'];
        const sga_where_conditions = {'year': { in: [year, last_year] }, 'month_amt':{'between': '01', 'and': month}, 'org_id':{"!=":null}};

        let target_column = target_col_list;
        let target_where = target_where_conditions;
        let target_groupBy = target_groupBy_cols;

        let pl_column = pl_col_list;
        let pl_where = pl_where_conditions
        let pl_groupBy = pl_groupBy_cols;

        let sga_t_where;
        let sga_t_groupBy = ['year', 'month_amt'];

        let sga_column = sga_col_list;
        let sga_where;
        let sga_groupBy = ['year', 'month_amt'];

        ////////조직 추출
        let org_query = await SELECT.from(org_view);
        if (org_query.length < 1) return; // 예외처리 추가 필요 throw error

        let sOrgChk;
        if(entCode.includes(org_id)){
            sOrgChk = "ent"
        };

        let aOrgData;
        if(sOrgChk === "ent"){
            let aKey = new Set;
            aOrgData = org_query.filter(data =>{
                if(!aKey.has(data.div_id)){
                    aKey.add(data.div_id);
                    return true;
                };
                return false;
            });
        }else{
            let oDivChk = org_query.find(data => data.div_id === org_id);
            let oHdqtChk = org_query.find(data => data.hdqt_id === org_id);

            if(oDivChk){
                sOrgChk = "div";
                let aKey = new Set;
                aOrgData = org_query.filter(data =>{
                if(!aKey.has(data.hdqt_id) && data.div_id === org_id && data.hdqt_id){
                    aKey.add(data.hdqt_id);
                    return true;
                };
                return false;
                });
            }else if(oHdqtChk){
                sOrgChk = "hdqt";
                let aKey = new Set;
                aOrgData = org_query.filter(data =>{
                if(!aKey.has(data.team_id) && data.hdqt_id === org_id && data.team_id){
                    aKey.add(data.team_id);
                    return true;
                };
                return false;
                });
            };
        };

        ////////조직 추출 끝.
        let pl_target = '';
        if (aOrgData.length > 0) {
            if (sOrgChk === "div") {
                pl_target = 'hdqt_id';
            } else if (sOrgChk === "hdqt") {
                pl_target = 'team_id';
            };

            let aOrgCode = [];
            aOrgData.forEach(data =>{
                if(data[`${pl_target}`]){
                    aOrgCode.push(data[`${pl_target}`]);
                };
            });
            // console.log('aOrgCode',aOrgCode)

            let aCCOrgCode = [];
            aOrgData.forEach(data =>{
                if(data[`${pl_target}`]){
                    aCCOrgCode.push(data[`${pl_target.split('_',1)}`+`_ccorg_cd`]);
                };
            });

            pl_where = {...pl_where, [`${pl_target}`]: [...aOrgCode]}
            pl_groupBy = ['year', 'month_amt'];

            target_column = [...target_column];
            target_where = { ...target_where, [`${pl_target}`]: [...aOrgCode] };
            target_groupBy = [...target_groupBy];

            sga_where = { ...sga_where_conditions, 'shared_exp_yn': false, [`${pl_target}`]: [...aOrgCode]};
            sga_t_where = { ...sga_where_conditions, 'shared_exp_yn': true, [`${pl_target}`]: [...aOrgCode]};
           
            if (sOrgChk === "ent") {
                pl_where = pl_where_conditions;
                target_where = target_where_conditions;
                sga_where = { ...sga_where_conditions, 'shared_exp_yn': false};
                sga_t_where = { ...sga_where_conditions, 'shared_exp_yn': true};
            };
        }else{
            return;
        };
        const [query, query_target, query_pl_ent, sga_biz, sga_total] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy).orderBy(['year', 'month_amt']),
            SELECT.from(pl_target_view).columns(target_column).where(target_where).groupBy(...target_groupBy),
            // PL 전사레벨 실적, 목표조회 (전사 SG&A, 영업이익 항목 계산용)
            SELECT.from(pl_view).columns(pl_col_list).where(pl_where_conditions).groupBy('year', 'month_amt').orderBy(['year', 'month_amt']),
            // SG&A 사업 실적데이터 [올해년월, 작년동월]
            SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
            // SG&A 전사영역 실적데이터 [올해년월, 작년동월]
            SELECT.from(sga_view).columns(sga_column).where(sga_t_where).groupBy(...sga_t_groupBy),
        ]);

        // 임시 - 비어있을 경우 0 값 생성, 추후 에러처리 or 로직 구성
        if (query_target.length < 2) {
            let oEmpty = {
                "target_sale_amoun": 0,
                "target_margin_amount": 0,
                "target_br": 0,
            }
            // 검색기준 올해,작년,전체 데이터가 없을 경우
            if (query_target.filter(o => o.year === year).length === 1) {
                query_target.push({ ...oEmpty, "year": last_year });
            } else if (query_target.filter(o => o.year === last_year).length === 1) {
                query_target.push({ ...oEmpty, "year": year });
            } else {
                query_target.push({ ...oEmpty, "year": year });
                query_target.push({ ...oEmpty, "year": last_year });
            };
        };

        let pl_target_row = query_target.find(o => o.year === year),
            pl_target_last_y_row = query_target.find(o => o.year === last_year),
            pl_row = query.filter(o => o.year === year),
            pl_last_y_row = query.filter(o => o.year === last_year),
            pl_ent_row = query_pl_ent.filter(o => o.year === year),
            pl_ent_last_y_row = query_pl_ent.filter(o => o.year === last_year),
            sga_row = sga_biz.filter(o => o.year === year),
            sga_last_y_row = sga_biz.filter(o => o.year === last_year),
            sga_t_row = sga_total.filter(o => o.year === year),
            sga_t_last_y_row = sga_total.filter(o => o.year === last_year);

        aMonth.forEach(data =>{
            let bChk1 = pl_row.some(data2 => data2.month_amt === data);
            let bChk2 = pl_last_y_row.some(data2 => data2.month_amt === data);
            let bChk3 = sga_row.some(data2 => data2.month_amt === data);
            let bChk4 = sga_last_y_row.some(data2 => data2.month_amt === data);
            let bChk5 = sga_t_row.some(data2 => data2.month_amt === data);
            let bChk6 = sga_t_last_y_row.some(data2 => data2.month_amt === data);
            let bChk7 = pl_ent_row.some(data2 => data2.month_amt === data);
            let bChk8 = pl_ent_last_y_row.some(data2 => data2.month_amt === data);

            if(!bChk1){
                pl_row.push({ "prj_prfm_amount_sum": 0, "sale_amount_sum": 0, "prj_prfm_amount": 0, "sale_amount": 0, "year": year, "month_amt": data });
            };
            if(!bChk2){
                pl_last_y_row.push({ "prj_prfm_amount_sum": 0, "sale_amount_sum": 0, "prj_prfm_amount": 0, "sale_amount": 0, "year": last_year, "month_amt": data });
            };
            if(!bChk3){
                sga_row.push({ "amount_sum": 0, "amount":0, "year": year, "month_amt": data });
            };
            if(!bChk4){
                sga_last_y_row.push({ "amount_sum": 0, "amount":0, "year": last_year, "month_amt": data });
            };
            if(!bChk5){
                sga_t_row.push({ "amount_sum": 0, "amount":0, "year": year, "month_amt": data });
            };
            if(!bChk6){
                sga_t_last_y_row.push({ "amount_sum": 0, "amount":0, "year": last_year, "month_amt": data });
            };
            if(!bChk7){
                pl_ent_row.push({ "prj_prfm_amount_sum": 0, "sale_amount_sum": 0, "prj_prfm_amount": 0, "sale_amount": 0, "year": year, "month_amt": data });
            };
            if(!bChk8){
                pl_ent_last_y_row.push({ "prj_prfm_amount_sum": 0, "sale_amount_sum": 0, "prj_prfm_amount": 0, "sale_amount": 0, "year": last_year, "month_amt": data });
            };

        });
        pl_row.sort((a,b)=> Number(a.month_amt) - Number(b.month_amt));
        pl_last_y_row.sort((a,b)=> Number(a.month_amt) - Number(b.month_amt));
        sga_row.sort((a,b)=> Number(a.month_amt) - Number(b.month_amt));
        sga_last_y_row.sort((a,b)=> Number(a.month_amt) - Number(b.month_amt));
        sga_t_row.sort((a,b)=> Number(a.month_amt) - Number(b.month_amt));
        sga_t_last_y_row.sort((a,b)=> Number(a.month_amt) - Number(b.month_amt));
        pl_ent_row.sort((a,b)=> Number(a.month_amt) - Number(b.month_amt));
        pl_ent_last_y_row.sort((a,b)=> Number(a.month_amt) - Number(b.month_amt));

        const sale_data =
        {
            "seq": 1,
            "type": "매출",
            "goal": !pl_target_row["target_sale_amount"] ? 0 : pl_target_row["target_sale_amount"],
            "performanceCurrentYearMonth": pl_row[parseInt(month)-1] ? pl_row[parseInt(month)-1]["sale_amount_sum"] : 0,
            "performanceLastYearMonth": pl_last_y_row[parseInt(month)-1] ? pl_last_y_row[parseInt(month)-1]["sale_amount_sum"] : 0,
            "performanceAttainmentRateCurrentYear": pl_target_row["target_sale_amount"] !== 0 ? (pl_row[parseInt(month)-1] ? pl_row[parseInt(month)-1]["sale_amount_sum"] : 0) / pl_target_row["target_sale_amount"] * 100 : 0,
            "performanceAttainmentRateLastYear": pl_target_last_y_row["target_sale_amount"] !== 0 ? (pl_last_y_row[parseInt(month)-1] ? pl_last_y_row[parseInt(month)-1]["sale_amount_sum"] : 0) / pl_target_last_y_row["target_sale_amount"] * 100 : 0,
            "month01":pl_row[0] ? pl_row[0]["sale_amount_sum"] : 0,
            "month02":pl_row[1] ? pl_row[1]["sale_amount"] : 0,
            "month03":pl_row[2] ? pl_row[2]["sale_amount"] : 0,
            "month04":pl_row[3] ? pl_row[3]["sale_amount"] : 0,
            "month05":pl_row[4] ? pl_row[4]["sale_amount"] : 0,
            "month06":pl_row[5] ? pl_row[5]["sale_amount"] : 0,
            "month07":pl_row[6] ? pl_row[6]["sale_amount"] : 0,
            "month08":pl_row[7] ? pl_row[7]["sale_amount"] : 0,
            "month09":pl_row[8] ? pl_row[8]["sale_amount"] : 0,
            "month10":pl_row[9] ? pl_row[9]["sale_amount"] : 0,
            "month11":pl_row[10] ? pl_row[10]["sale_amount"] : 0,
            "month12":pl_row[11] ? pl_row[11]["sale_amount"] : 0,
            "quarter1":(pl_row[0] ? pl_row[0]["sale_amount"] : 0)+ 
                    (pl_row[1] ? pl_row[1]["sale_amount"] : 0)+ 
                    (pl_row[2] ? pl_row[2]["sale_amount"] : 0),
            "quarter2":(pl_row[3] ? pl_row[3]["sale_amount"] : 0)+ 
                    (pl_row[4] ? pl_row[4]["sale_amount"] : 0)+ 
                    (pl_row[5] ? pl_row[5]["sale_amount"] : 0),
            "quarter3":(pl_row[6] ? pl_row[6]["sale_amount"] : 0)+ 
                    (pl_row[7] ? pl_row[7]["sale_amount"] : 0)+ 
                    (pl_row[8] ? pl_row[8]["sale_amount"] : 0),
            "quarter4":(pl_row[9] ? pl_row[9]["sale_amount"] : 0)+ 
                    (pl_row[10] ? pl_row[10]["sale_amount"] : 0)+ 
                    (pl_row[11] ? pl_row[11]["sale_amount"] : 0),
            "yearValue":pl_row[parseInt(month)-1] ? pl_row[parseInt(month)-1]["sale_amount_sum"] : 0
        };
        oResult.push(sale_data);

        const margin_target = pl_target_row["target_margin_amount"];
        const margin_target_last_y = pl_target_last_y_row["target_margin_amount"];
        const margin_value = sale_data.performanceCurrentYearMonth - (pl_row[parseInt(month)-1] ? pl_row[parseInt(month)-1]["prj_prfm_amount_sum"] : 0);
        const margin_value_last_y = sale_data.performanceLastYearMonth - (pl_last_y_row[parseInt(month)-1] ? pl_last_y_row[parseInt(month)-1]["prj_prfm_amount_sum"] : 0);
        const margin_data =
        {
            "seq": 2,
            "type": "마진",
            "goal": !pl_target_row["target_margin_amount"] ? 0 : pl_target_row["target_margin_amount"],
            "performanceCurrentYearMonth": margin_value,
            "performanceLastYearMonth": margin_value_last_y,
            "performanceAttainmentRateCurrentYear": margin_target !== 0 ? margin_value / margin_target * 100 : 0,
            "performanceAttainmentRateLastYear": margin_target_last_y !== 0 ? margin_value_last_y / margin_target_last_y * 100 : 0,
            "month01":sale_data.month01 - (pl_row[0] ? pl_row[0]["prj_prfm_amount"] : 0),
            "month02":sale_data.month02 - (pl_row[1] ? pl_row[1]["prj_prfm_amount"] : 0),
            "month03":sale_data.month03 - (pl_row[2] ? pl_row[2]["prj_prfm_amount"] : 0),
            "month04":sale_data.month04 - (pl_row[3] ? pl_row[3]["prj_prfm_amount"] : 0),
            "month05":sale_data.month05 - (pl_row[4] ? pl_row[4]["prj_prfm_amount"] : 0),
            "month06":sale_data.month06 - (pl_row[5] ? pl_row[5]["prj_prfm_amount"] : 0),
            "month07":sale_data.month07 - (pl_row[6] ? pl_row[6]["prj_prfm_amount"] : 0),
            "month08":sale_data.month08 - (pl_row[7] ? pl_row[7]["prj_prfm_amount"] : 0),
            "month09":sale_data.month09 - (pl_row[8] ? pl_row[8]["prj_prfm_amount"] : 0),
            "month10":sale_data.month10 - (pl_row[9] ? pl_row[9]["prj_prfm_amount"] : 0),
            "month11":sale_data.month11 - (pl_row[10] ? pl_row[10]["prj_prfm_amount"] : 0),
            "month12":sale_data.month12 - (pl_row[11] ? pl_row[11]["prj_prfm_amount"] : 0),
            "quarter1":(sale_data.month01 - (pl_row[0] ? pl_row[0]["prj_prfm_amount"] : 0))+ 
                    (sale_data.month02 - (pl_row[1] ? pl_row[1]["prj_prfm_amount"] : 0))+ 
                    (sale_data.month03 - (pl_row[2] ? pl_row[2]["prj_prfm_amount"] : 0)),
            "quarter2":(sale_data.month04 - (pl_row[3] ? pl_row[3]["prj_prfm_amount"] : 0))+ 
                    (sale_data.month05 - (pl_row[4] ? pl_row[4]["prj_prfm_amount"] : 0))+ 
                    (sale_data.month06 - (pl_row[5] ? pl_row[5]["prj_prfm_amount"] : 0)),
            "quarter3":(sale_data.month07 - (pl_row[6] ? pl_row[6]["prj_prfm_amount"] : 0))+ 
                    (sale_data.month08 - (pl_row[7] ? pl_row[7]["prj_prfm_amount"] : 0))+ 
                    (sale_data.month09 - (pl_row[8] ? pl_row[8]["prj_prfm_amount"] : 0)),
            "quarter4":(sale_data.month10 - (pl_row[9] ? pl_row[9]["prj_prfm_amount"] : 0))+ 
                    (sale_data.month11 - (pl_row[10] ? pl_row[10]["prj_prfm_amount"] : 0))+ 
                    (sale_data.month12 - (pl_row[11] ? pl_row[11]["prj_prfm_amount"] : 0)),
            "yearValue":margin_value
        };
        oResult.push(margin_data);

        const margin_rate_data =
        {
            "seq": 3,
            "type": "마진율",
            "goal": sale_data["goal"] !== 0 ? margin_data["goal"] / sale_data["goal"] * 100 : 0,
            "performanceCurrentYearMonth": sale_data["performanceCurrentYearMonth"] !== 0 ? margin_data["performanceCurrentYearMonth"] / sale_data["performanceCurrentYearMonth"] * 100 : 0,
            "performanceLastYearMonth": sale_data["performanceLastYearMonth"] !== 0 ? margin_data["performanceLastYearMonth"] / sale_data["performanceLastYearMonth"] * 100 : 0,
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0,
            "month01":sale_data.month01 !== 0 ? margin_data.month01 / sale_data.month01 * 100 : 0,
            "month02":sale_data.month02 !== 0 ? margin_data.month02 / sale_data.month02 * 100 : 0,
            "month03":sale_data.month03 !== 0 ? margin_data.month03 / sale_data.month03 * 100 : 0,
            "month04":sale_data.month04 !== 0 ? margin_data.month04 / sale_data.month04 * 100 : 0,
            "month05":sale_data.month05 !== 0 ? margin_data.month05 / sale_data.month05 * 100 : 0,
            "month06":sale_data.month06 !== 0 ? margin_data.month06 / sale_data.month06 * 100 : 0,
            "month07":sale_data.month07 !== 0 ? margin_data.month07 / sale_data.month07 * 100 : 0,
            "month08":sale_data.month08 !== 0 ? margin_data.month08 / sale_data.month08 * 100 : 0,
            "month09":sale_data.month09 !== 0 ? margin_data.month09 / sale_data.month09 * 100 : 0,
            "month10":sale_data.month10 !== 0 ? margin_data.month10 / sale_data.month10 * 100 : 0,
            "month11":sale_data.month11 !== 0 ? margin_data.month11 / sale_data.month11 * 100 : 0,
            "month12":sale_data.month12 !== 0 ? margin_data.month12 / sale_data.month12 * 100 : 0,
            "quarter1":sale_data.quarter1 !== 0 ? margin_data.quarter1 / sale_data.quarter1 * 100 : 0,
            "quarter2":sale_data.quarter2 !== 0 ? margin_data.quarter2 / sale_data.quarter2 * 100 : 0,
            "quarter3":sale_data.quarter3 !== 0 ? margin_data.quarter3 / sale_data.quarter3 * 100 : 0,
            "quarter4":sale_data.quarter4 !== 0 ? margin_data.quarter4 / sale_data.quarter4 * 100 : 0,
            "yearValue":margin_value
        };
        oResult.push(margin_rate_data);

        const sga_data =
        {
            "seq": 4,
            "type": "SG&A",
            "goal": 0,
            "performanceCurrentYearMonth": sga_row[parseInt(month)-1] ? sga_row[parseInt(month)-1]["amount_sum"] : 0,
            "performanceLastYearMonth": sga_last_y_row[parseInt(month)-1] ? sga_last_y_row[parseInt(month)-1]["amount_sum"] : 0,
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0,
            "month01":sga_row[0] ? sga_row[0]["amount"] : 0,
            "month02":sga_row[1] ? sga_row[1]["amount"] : 0,
            "month03":sga_row[2] ? sga_row[2]["amount"] : 0,
            "month04":sga_row[3] ? sga_row[3]["amount"] : 0,
            "month05":sga_row[4] ? sga_row[4]["amount"] : 0,
            "month06":sga_row[5] ? sga_row[5]["amount"] : 0,
            "month07":sga_row[6] ? sga_row[6]["amount"] : 0,
            "month08":sga_row[7] ? sga_row[7]["amount"] : 0,
            "month09":sga_row[8] ? sga_row[8]["amount"] : 0,
            "month10":sga_row[9] ? sga_row[9]["amount"] : 0,
            "month11":sga_row[10] ? sga_row[10]["amount"] : 0,
            "month12":sga_row[11] ? sga_row[11]["amount"] : 0,
            "quarter1":(sga_row[0] ? sga_row[0]["amount"] : 0)+ 
                    (sga_row[1] ? sga_row[1]["amount"] : 0)+ 
                    (sga_row[2] ? sga_row[2]["amount"] : 0),
            "quarter2":(sga_row[3] ? sga_row[3]["amount"] : 0)+ 
                    (sga_row[4] ? sga_row[4]["amount"] : 0)+ 
                    (sga_row[5] ? sga_row[5]["amount"] : 0),
            "quarter3":(sga_row[6] ? sga_row[6]["amount"] : 0)+ 
                    (sga_row[7] ? sga_row[7]["amount"] : 0)+ 
                    (sga_row[8] ? sga_row[8]["amount"] : 0),
            "quarter4":(sga_row[9] ? sga_row[9]["amount"] : 0)+ 
                    (sga_row[10] ? sga_row[10]["amount"] : 0)+ 
                    (sga_row[11] ? sga_row[11]["amount"] : 0),
            "yearValue":sga_row[parseInt(month)-1] ? sga_row[parseInt(month)-1]["amount_sum"] : 0,
        };

        oResult.push(sga_data);
        
        // 공헌이익 [마진 - 사업SG&A]
        const contribution_data =
        {
            "seq": 5,
            "type": "공헌이익",
            "goal": 0,
            "performanceCurrentYearMonth": margin_data["performanceCurrentYearMonth"] - sga_data["performanceCurrentYearMonth"],
            "performanceLastYearMonth": margin_data["performanceLastYearMonth"] - sga_data["performanceLastYearMonth"],
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0,
            "month01":margin_data["month01"] - sga_data["month01"],
            "month02":margin_data["month02"] - sga_data["month02"],
            "month03":margin_data["month03"] - sga_data["month03"],
            "month04":margin_data["month04"] - sga_data["month04"],
            "month05":margin_data["month05"] - sga_data["month05"],
            "month06":margin_data["month06"] - sga_data["month06"],
            "month07":margin_data["month07"] - sga_data["month07"],
            "month08":margin_data["month08"] - sga_data["month08"],
            "month09":margin_data["month09"] - sga_data["month09"],
            "month10":margin_data["month10"] - sga_data["month10"],
            "month11":margin_data["month11"] - sga_data["month11"],
            "month12":margin_data["month12"] - sga_data["month12"],
            "quarter1":margin_data["quarter1"] - sga_data["quarter1"],
            "quarter2":margin_data["quarter2"] - sga_data["quarter2"],
            "quarter3":margin_data["quarter3"] - sga_data["quarter3"],
            "quarter4":margin_data["quarter4"] - sga_data["quarter4"],
            "yearValue":margin_data["performanceCurrentYearMonth"] - sga_data["performanceCurrentYearMonth"],
        };
        oResult.push(contribution_data);
        
        const sga_total_data =
        {
            "seq": 6,
            "type": "전사 SG&A",
            "goal": 0,
            "performanceCurrentYearMonth": (sga_row[parseInt(month)-1] ? sga_row[parseInt(month)-1]["amount_sum"] : 0) + (sga_t_row[parseInt(month)-1] ? sga_t_row[parseInt(month)-1]["amount_sum"] : 0),
            "performanceLastYearMonth": (sga_last_y_row[parseInt(month)-1] ? sga_last_y_row[parseInt(month)-1]["amount_sum"] : 0) + (sga_t_last_y_row[parseInt(month)-1] ? sga_t_last_y_row[parseInt(month)-1]["amount_sum"] : 0),
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0,
            "month01":(sga_row[0] ? sga_row[0]["amount"] : 0) + (sga_t_row[0] ? sga_t_row[0]["amount"] : 0),
            "month02":(sga_row[1] ? sga_row[1]["amount"] : 0) + (sga_t_row[1] ? sga_t_row[1]["amount"] : 0),
            "month03":(sga_row[2] ? sga_row[2]["amount"] : 0) + (sga_t_row[2] ? sga_t_row[2]["amount"] : 0),
            "month04":(sga_row[3] ? sga_row[3]["amount"] : 0) + (sga_t_row[3] ? sga_t_row[3]["amount"] : 0),
            "month05":(sga_row[4] ? sga_row[4]["amount"] : 0) + (sga_t_row[4] ? sga_t_row[4]["amount"] : 0),
            "month06":(sga_row[5] ? sga_row[5]["amount"] : 0) + (sga_t_row[5] ? sga_t_row[5]["amount"] : 0),
            "month07":(sga_row[6] ? sga_row[6]["amount"] : 0) + (sga_t_row[6] ? sga_t_row[6]["amount"] : 0),
            "month08":(sga_row[7] ? sga_row[7]["amount"] : 0) + (sga_t_row[7] ? sga_t_row[7]["amount"] : 0),
            "month09":(sga_row[8] ? sga_row[8]["amount"] : 0) + (sga_t_row[8] ? sga_t_row[8]["amount"] : 0),
            "month10":(sga_row[9] ? sga_row[9]["amount"] : 0) + (sga_t_row[9] ? sga_t_row[9]["amount"] : 0),
            "month11":(sga_row[10] ? sga_row[10]["amount"] : 0) + (sga_t_row[10] ? sga_t_row[10]["amount"] : 0),
            "month12":(sga_row[11] ? sga_row[11]["amount"] : 0) + (sga_t_row[11] ? sga_t_row[11]["amount"] : 0),
            "quarter1":(sga_row[0] ? sga_row[0]["amount"] : 0) + (sga_t_row[0] ? sga_t_row[0]["amount"] : 0)+
                    (sga_row[1] ? sga_row[1]["amount"] : 0) + (sga_t_row[1] ? sga_t_row[1]["amount"] : 0)+
                    (sga_row[2] ? sga_row[2]["amount"] : 0) + (sga_t_row[2] ? sga_t_row[2]["amount"] : 0),
            "quarter2":(sga_row[3] ? sga_row[3]["amount"] : 0) + (sga_t_row[3] ? sga_t_row[3]["amount"] : 0)+
                    (sga_row[4] ? sga_row[4]["amount"] : 0) + (sga_t_row[4] ? sga_t_row[4]["amount"] : 0)+
                    (sga_row[5] ? sga_row[5]["amount"] : 0) + (sga_t_row[5] ? sga_t_row[5]["amount"] : 0),
            "quarter3":(sga_row[6] ? sga_row[6]["amount"] : 0) + (sga_t_row[6] ? sga_t_row[6]["amount"] : 0)+
                    (sga_row[7] ? sga_row[7]["amount"] : 0) + (sga_t_row[7] ? sga_t_row[7]["amount"] : 0)+
                    (sga_row[8] ? sga_row[8]["amount"] : 0) + (sga_t_row[8] ? sga_t_row[8]["amount"] : 0),
            "quarter4":(sga_row[9] ? sga_row[9]["amount"] : 0) + (sga_t_row[9] ? sga_t_row[9]["amount"] : 0)+
                    (sga_row[10] ? sga_row[10]["amount"] : 0) + (sga_t_row[10] ? sga_t_row[10]["amount"] : 0)+
                    (sga_row[11] ? sga_row[11]["amount"] : 0) + (sga_t_row[11] ? sga_t_row[11]["amount"] : 0),
            "yearValue":(sga_row[parseInt(month)-1] ? sga_row[parseInt(month)-1]["amount_sum"] : 0) + (sga_t_row[parseInt(month)-1] ? sga_t_row[parseInt(month)-1]["amount_sum"] : 0)
        };
        oResult.push(sga_total_data);

        // 영업이익 [공헌이익 - 전사 SG&A]
        const profit_data =
        {
            "seq": 7,
            "type": "영업이익",
            "goal": 0,
            "performanceCurrentYearMonth": (pl_ent_row[parseInt(month)-1] ? pl_ent_row[parseInt(month)-1]["sale_amount_sum"] : 0) - (pl_ent_row[parseInt(month)-1] ? pl_ent_row[parseInt(month)-1]["prj_prfm_amount_sum"] : 0) - (sga_row[parseInt(month)-1] ? sga_row[parseInt(month)-1]["amount_sum"] : 0) - (sga_t_row[parseInt(month)-1] ? sga_t_row[parseInt(month)-1]["amount_sum"] : 0),
            "performanceLastYearMonth": (pl_ent_last_y_row[parseInt(month)-1] ? pl_ent_last_y_row[parseInt(month)-1]["sale_amount_sum"] : 0) - (pl_ent_last_y_row[parseInt(month)-1] ? pl_ent_last_y_row[parseInt(month)-1]["prj_prfm_amount_sum"] : 0) - (sga_last_y_row[parseInt(month)-1] ? sga_last_y_row[parseInt(month)-1]["amount_sum"] : 0) - (sga_t_last_y_row[parseInt(month)-1] ? sga_t_last_y_row[parseInt(month)-1]["amount_sum"] : 0),
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0,
            "month01":(pl_ent_row[0] ? pl_ent_row[0]["sale_amount"] : 0)- 
                    (pl_ent_row[0] ? pl_ent_row[0]["prj_prfm_amount"] : 0)-
                    (sga_row[0] ? sga_row[0]["amount"] : 0)-
                    (sga_t_row[0] ? sga_t_row[0]["amount"] : 0),
            "month02":(pl_ent_row[1] ? pl_ent_row[1]["sale_amount"] : 0)- 
                    (pl_ent_row[1] ? pl_ent_row[1]["prj_prfm_amount"] : 0)-
                    (sga_row[1] ? sga_row[1]["amount"] : 0)-
                    (sga_t_row[1] ? sga_t_row[1]["amount"] : 0),
            "month03":(pl_ent_row[2] ? pl_ent_row[2]["sale_amount"] : 0)- 
                    (pl_ent_row[2] ? pl_ent_row[2]["prj_prfm_amount"] : 0)-
                    (sga_row[2] ? sga_row[2]["amount"] : 0)-
                    (sga_t_row[2] ? sga_t_row[2]["amount"] : 0),
            "month04":(pl_ent_row[3] ? pl_ent_row[3]["sale_amount"] : 0)- 
                    (pl_ent_row[3] ? pl_ent_row[3]["prj_prfm_amount"] : 0)-
                    (sga_row[3] ? sga_row[3]["amount"] : 0)-
                    (sga_t_row[3] ? sga_t_row[3]["amount"] : 0),
            "month05":(pl_ent_row[4] ? pl_ent_row[4]["sale_amount"] : 0)- 
                    (pl_ent_row[4] ? pl_ent_row[4]["prj_prfm_amount"] : 0)-
                    (sga_row[4] ? sga_row[4]["amount"] : 0)-
                    (sga_t_row[4] ? sga_t_row[4]["amount"] : 0),
            "month06":(pl_ent_row[5] ? pl_ent_row[5]["sale_amount"] : 0)- 
                    (pl_ent_row[5] ? pl_ent_row[5]["prj_prfm_amount"] : 0)-
                    (sga_row[5] ? sga_row[5]["amount"] : 0)-
                    (sga_t_row[5] ? sga_t_row[5]["amount"] : 0),
            "month07":(pl_ent_row[6] ? pl_ent_row[6]["sale_amount"] : 0)- 
                    (pl_ent_row[6] ? pl_ent_row[6]["prj_prfm_amount"] : 0)-
                    (sga_row[6] ? sga_row[6]["amount"] : 0)-
                    (sga_t_row[6] ? sga_t_row[6]["amount"] : 0),
            "month08":(pl_ent_row[7] ? pl_ent_row[7]["sale_amount"] : 0)- 
                    (pl_ent_row[7] ? pl_ent_row[7]["prj_prfm_amount"] : 0)-
                    (sga_row[7] ? sga_row[7]["amount"] : 0)-
                    (sga_t_row[7] ? sga_t_row[7]["amount"] : 0),
            "month09":(pl_ent_row[8] ? pl_ent_row[8]["sale_amount"] : 0)- 
                    (pl_ent_row[8] ? pl_ent_row[8]["prj_prfm_amount"] : 0)-
                    (sga_row[8] ? sga_row[8]["amount"] : 0)-
                    (sga_t_row[8] ? sga_t_row[8]["amount"] : 0),
            "month10":(pl_ent_row[9] ? pl_ent_row[9]["sale_amount"] : 0)- 
                    (pl_ent_row[9] ? pl_ent_row[9]["prj_prfm_amount"] : 0)-
                    (sga_row[9] ? sga_row[9]["amount"] : 0)-
                    (sga_t_row[9] ? sga_t_row[9]["amount"] : 0),
            "month11":(pl_ent_row[10] ? pl_ent_row[10]["sale_amount"] : 0)- 
                    (pl_ent_row[10] ? pl_ent_row[10]["prj_prfm_amount"] : 0)-
                    (sga_row[10] ? sga_row[10]["amount"] : 0)-
                    (sga_t_row[10] ? sga_t_row[10]["amount"] : 0),
            "month12":(pl_ent_row[11] ? pl_ent_row[11]["sale_amount"] : 0)- 
                    (pl_ent_row[11] ? pl_ent_row[11]["prj_prfm_amount"] : 0)-
                    (sga_row[11] ? sga_row[11]["amount"] : 0)-
                    (sga_t_row[11] ? sga_t_row[11]["amount"] : 0),
            "quarter1":((pl_ent_row[0] ? pl_ent_row[0]["sale_amount"] : 0)- 
                        (pl_ent_row[0] ? pl_ent_row[0]["prj_prfm_amount"] : 0)-
                        (sga_row[0] ? sga_row[0]["amount"] : 0)-
                        (sga_t_row[0] ? sga_t_row[0]["amount"] : 0))+
                    ((pl_ent_row[1] ? pl_ent_row[1]["sale_amount"] : 0)- 
                        (pl_ent_row[1] ? pl_ent_row[1]["prj_prfm_amount"] : 0)-
                        (sga_row[1] ? sga_row[1]["amount"] : 0)-
                        (sga_t_row[1] ? sga_t_row[1]["amount"] : 0))+
                    ((pl_ent_row[2] ? pl_ent_row[2]["sale_amount"] : 0)- 
                        (pl_ent_row[2] ? pl_ent_row[2]["prj_prfm_amount"] : 0)-
                        (sga_row[2] ? sga_row[2]["amount"] : 0)-
                        (sga_t_row[2] ? sga_t_row[2]["amount"] : 0)),
            "quarter2":((pl_ent_row[3] ? pl_ent_row[3]["sale_amount"] : 0)- 
                        (pl_ent_row[3] ? pl_ent_row[3]["prj_prfm_amount"] : 0)-
                        (sga_row[3] ? sga_row[3]["amount"] : 0)-
                        (sga_t_row[3] ? sga_t_row[3]["amount"] : 0))+
                    ((pl_ent_row[4] ? pl_ent_row[4]["sale_amount"] : 0)- 
                        (pl_ent_row[4] ? pl_ent_row[4]["prj_prfm_amount"] : 0)-
                        (sga_row[4] ? sga_row[4]["amount"] : 0)-
                        (sga_t_row[4] ? sga_t_row[4]["amount"] : 0))+
                    ((pl_ent_row[5] ? pl_ent_row[5]["sale_amount"] : 0)- 
                        (pl_ent_row[5] ? pl_ent_row[5]["prj_prfm_amount"] : 0)-
                        (sga_row[5] ? sga_row[5]["amount"] : 0)-
                        (sga_t_row[5] ? sga_t_row[5]["amount"] : 0)),
            "quarter3":((pl_ent_row[6] ? pl_ent_row[6]["sale_amount"] : 0)- 
                        (pl_ent_row[6] ? pl_ent_row[6]["prj_prfm_amount"] : 0)-
                        (sga_row[6] ? sga_row[6]["amount"] : 0)-
                        (sga_t_row[6] ? sga_t_row[6]["amount"] : 0))+
                    ((pl_ent_row[7] ? pl_ent_row[7]["sale_amount"] : 0)- 
                        (pl_ent_row[7] ? pl_ent_row[7]["prj_prfm_amount"] : 0)-
                        (sga_row[7] ? sga_row[7]["amount"] : 0)-
                        (sga_t_row[7] ? sga_t_row[7]["amount"] : 0))+
                    ((pl_ent_row[8] ? pl_ent_row[8]["sale_amount"] : 0)- 
                        (pl_ent_row[8] ? pl_ent_row[8]["prj_prfm_amount"] : 0)-
                        (sga_row[8] ? sga_row[8]["amount"] : 0)-
                        (sga_t_row[8] ? sga_t_row[8]["amount"] : 0)),
            "quarter4":((pl_ent_row[9] ? pl_ent_row[9]["sale_amount"] : 0)- 
                        (pl_ent_row[9] ? pl_ent_row[9]["prj_prfm_amount"] : 0)-
                        (sga_row[9] ? sga_row[9]["amount"] : 0)-
                        (sga_t_row[9] ? sga_t_row[9]["amount"] : 0))+
                    ((pl_ent_row[10] ? pl_ent_row[10]["sale_amount"] : 0)- 
                        (pl_ent_row[10] ? pl_ent_row[10]["prj_prfm_amount"] : 0)-
                        (sga_row[10] ? sga_row[10]["amount"] : 0)-
                        (sga_t_row[10] ? sga_t_row[10]["amount"] : 0))+
                    ((pl_ent_row[11] ? pl_ent_row[11]["sale_amount"] : 0)- 
                        (pl_ent_row[11] ? pl_ent_row[11]["prj_prfm_amount"] : 0)-
                        (sga_row[11] ? sga_row[11]["amount"] : 0)-
                        (sga_t_row[11] ? sga_t_row[11]["amount"] : 0)),
            "yearValue":(pl_ent_row[parseInt(month)-1] ? pl_ent_row[parseInt(month)-1]["sale_amount_sum"] : 0) - (pl_ent_row[parseInt(month)-1] ? pl_ent_row[parseInt(month)-1]["prj_prfm_amount_sum"] : 0) - (sga_row[parseInt(month)-1] ? sga_row[parseInt(month)-1]["amount_sum"] : 0) - (sga_t_row[parseInt(month)-1] ? sga_t_row[parseInt(month)-1]["amount_sum"] : 0)
        };
        oResult.push(profit_data);

        // 영업이익률 데이터 [영업이익/매출]
        const profit_rate_data =
        {
            "seq": 8,
            "type": "영업이익률",
            "goal": 0,
            "performanceCurrentYearMonth": ((pl_ent_row[parseInt(month)-1] ? pl_ent_row[parseInt(month)-1]["sale_amount_sum"] : 0) !== 0) ? (profit_data["performanceCurrentYearMonth"] / (pl_ent_row[parseInt(month)-1] ? pl_ent_row[parseInt(month)-1]["sale_amount_sum"] : 0) * 100) : 0,
            "performanceLastYearMonth": ((pl_ent_last_y_row[parseInt(month)-1] ? pl_ent_last_y_row[parseInt(month)-1]["sale_amount_sum"] : 0) !== 0) ? (profit_data["performanceLastYearMonth"] / (pl_ent_last_y_row[parseInt(month)-1] ? pl_ent_last_y_row[parseInt(month)-1]["sale_amount_sum"] : 0) * 100) : 0,
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0,
            "month01":((pl_ent_row[0] ? pl_ent_row[0]["sale_amount_sum"] : 0) !== 0) ? (profit_data["month01"] / (pl_ent_row[0] ? pl_ent_row[0]["sale_amount_sum"] : 0) * 100) : 0,
            "month02":((pl_ent_row[1] ? pl_ent_row[1]["sale_amount_sum"] : 0) !== 0) ? (profit_data["month02"] / (pl_ent_row[1] ? pl_ent_row[1]["sale_amount_sum"] : 0) * 100) : 0,
            "month03":((pl_ent_row[2] ? pl_ent_row[2]["sale_amount_sum"] : 0) !== 0) ? (profit_data["month03"] / (pl_ent_row[2] ? pl_ent_row[2]["sale_amount_sum"] : 0) * 100) : 0,
            "month04":((pl_ent_row[3] ? pl_ent_row[3]["sale_amount_sum"] : 0) !== 0) ? (profit_data["month04"] / (pl_ent_row[3] ? pl_ent_row[3]["sale_amount_sum"] : 0) * 100) : 0,
            "month05":((pl_ent_row[4] ? pl_ent_row[4]["sale_amount_sum"] : 0) !== 0) ? (profit_data["month05"] / (pl_ent_row[4] ? pl_ent_row[4]["sale_amount_sum"] : 0) * 100) : 0,
            "month06":((pl_ent_row[5] ? pl_ent_row[5]["sale_amount_sum"] : 0) !== 0) ? (profit_data["month06"] / (pl_ent_row[5] ? pl_ent_row[5]["sale_amount_sum"] : 0) * 100) : 0,
            "month07":((pl_ent_row[6] ? pl_ent_row[6]["sale_amount_sum"] : 0) !== 0) ? (profit_data["month07"] / (pl_ent_row[6] ? pl_ent_row[6]["sale_amount_sum"] : 0) * 100) : 0,
            "month08":((pl_ent_row[7] ? pl_ent_row[7]["sale_amount_sum"] : 0) !== 0) ? (profit_data["month08"] / (pl_ent_row[7] ? pl_ent_row[7]["sale_amount_sum"] : 0) * 100) : 0,
            "month09":((pl_ent_row[8] ? pl_ent_row[8]["sale_amount_sum"] : 0) !== 0) ? (profit_data["month09"] / (pl_ent_row[8] ? pl_ent_row[8]["sale_amount_sum"] : 0) * 100) : 0,
            "month10":((pl_ent_row[9] ? pl_ent_row[9]["sale_amount_sum"] : 0) !== 0) ? (profit_data["month10"] / (pl_ent_row[9] ? pl_ent_row[9]["sale_amount_sum"] : 0) * 100) : 0,
            "month11":((pl_ent_row[10] ? pl_ent_row[10]["sale_amount_sum"] : 0) !== 0) ? (profit_data["month11"] / (pl_ent_row[10] ? pl_ent_row[10]["sale_amount_sum"] : 0) * 100) : 0,
            "month12":((pl_ent_row[11] ? pl_ent_row[11]["sale_amount_sum"] : 0) !== 0) ? (profit_data["month12"] / (pl_ent_row[11] ? pl_ent_row[11]["sale_amount_sum"] : 0) * 100) : 0,
            "quarter1":((((pl_ent_row[0] ? pl_ent_row[0]["sale_amount_sum"] : 0) !== 0) + ((pl_ent_row[1] ? pl_ent_row[1]["sale_amount_sum"] : 0) !== 0) + ((pl_ent_row[2] ? pl_ent_row[2]["sale_amount_sum"] : 0) !== 0)) !== 0) ? 
                    ((profit_data["month01"] + profit_data["month02"] + profit_data["month03"]) / ((pl_ent_row[0] ? pl_ent_row[0]["sale_amount_sum"] : 0) + (pl_ent_row[1] ? pl_ent_row[1]["sale_amount_sum"] : 0) + (pl_ent_row[2] ? pl_ent_row[2]["sale_amount_sum"] : 0)) * 100) : 0,
            "quarter2":((((pl_ent_row[3] ? pl_ent_row[3]["sale_amount_sum"] : 0) !== 0) + ((pl_ent_row[4] ? pl_ent_row[4]["sale_amount_sum"] : 0) !== 0) + ((pl_ent_row[5] ? pl_ent_row[5]["sale_amount_sum"] : 0) !== 0)) !== 0) ? 
                    ((profit_data["month04"] + profit_data["month05"] + profit_data["month06"]) / ((pl_ent_row[3] ? pl_ent_row[3]["sale_amount_sum"] : 0) + (pl_ent_row[4] ? pl_ent_row[4]["sale_amount_sum"] : 0) + (pl_ent_row[5] ? pl_ent_row[5]["sale_amount_sum"] : 0)) * 100) : 0,
            "quarter3":((((pl_ent_row[6] ? pl_ent_row[6]["sale_amount_sum"] : 0) !== 0) + ((pl_ent_row[7] ? pl_ent_row[7]["sale_amount_sum"] : 0) !== 0) + ((pl_ent_row[8] ? pl_ent_row[8]["sale_amount_sum"] : 0) !== 0)) !== 0) ? 
                    ((profit_data["month07"] + profit_data["month08"] + profit_data["month09"]) / ((pl_ent_row[6] ? pl_ent_row[6]["sale_amount_sum"] : 0) + (pl_ent_row[7] ? pl_ent_row[7]["sale_amount_sum"] : 0) + (pl_ent_row[8] ? pl_ent_row[8]["sale_amount_sum"] : 0)) * 100) : 0,
            "quarter4":((((pl_ent_row[9] ? pl_ent_row[9]["sale_amount_sum"] : 0) !== 0) + ((pl_ent_row[10] ? pl_ent_row[10]["sale_amount_sum"] : 0) !== 0) + ((pl_ent_row[11] ? pl_ent_row[11]["sale_amount_sum"] : 0) !== 0)) !== 0) ? 
                    ((profit_data["month10"] + profit_data["month11"] + profit_data["month12"]) / ((pl_ent_row[9] ? pl_ent_row[9]["sale_amount_sum"] : 0) + (pl_ent_row[10] ? pl_ent_row[10]["sale_amount_sum"] : 0) + (pl_ent_row[11] ? pl_ent_row[11]["sale_amount_sum"] : 0)) * 100) : 0,
            "yearValue":((pl_ent_row[parseInt(month)-1] ? pl_ent_row[parseInt(month)-1]["sale_amount_sum"] : 0) !== 0) ? (profit_data["performanceCurrentYearMonth"] / (pl_ent_row[parseInt(month)-1] ? pl_ent_row[parseInt(month)-1]["sale_amount_sum"] : 0) * 100) : 0
        };
        oResult.push(profit_rate_data);

        const dt_sale_margin =
        {
            "seq": 9,
            "type": "DT 매출/마진",
            "goal": 0,
            "performanceCurrentYearMonth": 0,
            "performanceLastYearMonth": 0,
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0,
            "month01":0,
            "month02":0,
            "month03":0,
            "month04":0,
            "month05":0,
            "month06":0,
            "month07":0,
            "month08":0,
            "month09":0,
            "month10":0,
            "month11":0,
            "month12":0,
            "quarter1":0,
            "quarter2":0,
            "quarter3":0,
            "quarter4":0,
            "yearValue":0
        };
        oResult.push(dt_sale_margin);

        const offshoring =
        {
            "seq": 10,
            "type": "Offshoring",
            "goal": 0,
            "performanceCurrentYearMonth": 0,
            "performanceLastYearMonth": 0,
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0,
            "month01":0,
            "month02":0,
            "month03":0,
            "month04":0,
            "month05":0,
            "month06":0,
            "month07":0,
            "month08":0,
            "month09":0,
            "month10":0,
            "month11":0,
            "month12":0,
            "quarter1":0,
            "quarter2":0,
            "quarter3":0,
            "quarter4":0,
            "yearValue":0
        };
        oResult.push(offshoring);

        const non_mm =
        {
            "seq": 11,
            "type": "Non-MM",
            "goal": 0,
            "performanceCurrentYearMonth": 0,
            "performanceLastYearMonth": 0,
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0,
            "month01":0,
            "month02":0,
            "month03":0,
            "month04":0,
            "month05":0,
            "month06":0,
            "month07":0,
            "month08":0,
            "month09":0,
            "month10":0,
            "month11":0,
            "month12":0,
            "quarter1":0,
            "quarter2":0,
            "quarter3":0,
            "quarter4":0,
            "yearValue":0
        };
        oResult.push(non_mm);

        const br =
        {
            "seq": 12,
            "type": "BR",
            "goal": 0,
            "performanceCurrentYearMonth": 0,
            "performanceLastYearMonth": 0,
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0,
            "month01":0,
            "month02":0,
            "month03":0,
            "month04":0,
            "month05":0,
            "month06":0,
            "month07":0,
            "month08":0,
            "month09":0,
            "month10":0,
            "month11":0,
            "month12":0,
            "quarter1":0,
            "quarter2":0,
            "quarter3":0,
            "quarter4":0,
            "yearValue":0
        };
        oResult.push(br);

        const rohc =
        {
            "seq": 13,
            "type": "RoHC",
            "goal": 0,
            "performanceCurrentYearMonth": 0,
            "performanceLastYearMonth": 0,
            "performanceAttainmentRateCurrentYear": 0,
            "performanceAttainmentRateLastYear": 0,
            "month01":0,
            "month02":0,
            "month03":0,
            "month04":0,
            "month05":0,
            "month06":0,
            "month07":0,
            "month08":0,
            "month09":0,
            "month10":0,
            "month11":0,
            "month12":0,
            "quarter1":0,
            "quarter2":0,
            "quarter3":0,
            "quarter4":0,
            "yearValue":0
        };
        oResult.push(rohc);

        return oResult;
    });
}