module.exports = (srv) => {
    srv.on('get_pl_performance_bar_chart', async (req) => {

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
        const pl_view = db.entities('pl.view').amount_view;
       
        /**
         * common.org [조직정보]
         * 조직구조 테이블
         */
        const org_view = db.entities('common').org;

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

        /**
         * 전사 부문 본부 팀 TYPE 코드
         * [To-Be] 인터페이스 코드 버전관리로 동적 매핑 구현 필요!!!!!!!!!!!!!
         */
        const entCode = "4044",
            divCode = '1796',
            hdqtCode = '6907',
            teamCode = '1414';

        // QUERY 공통 파라미터 선언
        /** 
         * 타겟 뷰 조회용 컬럼
         */
        const target_col_list = [
            'year', 'sum(sale) as target_sale_amount',
            'sum(margin) as target_margin_amount', 'sum(br) as target_br'];
        const target_where_conditions = { 'year': { in: [year, last_year] } };
        const target_groupBy_cols = ['year']
        /**
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본무 조건별 추가)
         */
        const pl_col_list = [
            'year', 'month', 'sum(sale_amount) as sale_amount', 'sum(sale_amount_sum) as sale_amount_sum',
            'sum(prj_prfm_amount) as prj_prfm_amount', 'sum(prj_prfm_amount_sum) as prj_prfm_amount_sum'];
        /**
         * [TEMP] - 목표는 포탈 목표입력과 연계하여 조정 예정
         * 목표 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 부문, 본무 조건별 추가) [실적은 연 단위]
         */

        /**
         * [TEMP]
         * SG&A 조회용 컬럼
         */
        let org_query = await SELECT.from(org_view).columns('id', 'parent', 'type', 'name');
        if (org_query.length < 1) return; // 예외처리 추가 필요 throw error
        let orgInfo = org_query.find(e => e.id === org_id);

        let target_column = target_col_list;
        let target_where = target_where_conditions;
        let target_groupBy = target_groupBy_cols;
        let target_where_test = target_where_conditions;

        let pl_column = pl_col_list;
        let pl_where = { 'year': { in: [year, last_year] }, 'month': month }
        let pl_groupBy = ['year', 'month'];

        if (org_id === 'test') {
            pl_where = { ...pl_where, 'div_id': { in: ['6589', '6286', '6193'] }, and: { 'hdqt_id': { in: ['6590', '6287', '6629'] }, or: { 'hdqt_id': null } } };
            target_where_test = { ...target_where_test, 'div_id': { in: ['6589', '6286', '6193'] }, and: { 'hdqt_id': { in: ['6590', '6287', '6629'] }, or: { 'hdqt_id': null } } };
        } else if (orgInfo) {
            let orgInfo = org_query.find(e => e.id === org_id);
            let pl_target;

            if (orgInfo.type === divCode || orgInfo.type === hdqtCode) {
                if (orgInfo.type === divCode) {
                    pl_target = 'div_id';
                } else if (orgInfo.type === hdqtCode) {
                    pl_target = 'hdqt_id';
                }

                target_column = [...target_column, `${pl_target}`];
                target_where = { ...target_where, [`${pl_target}`]: org_id };
                target_groupBy = [...target_groupBy, `${pl_target}`];

                pl_column = [...pl_col_list, `${pl_target}`];
                pl_where = { [`${pl_target}`]: org_id, 'year': { in: [year, last_year] }, 'month': month }
                pl_groupBy = ['year', 'month', `${pl_target}`];
            }
        }
        // DB 쿼리 실행 (병렬)
        const [query, query_target, query_pl_ent, query_pl_ent_target] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(pl_target_view).columns(target_column).where(target_where).groupBy(...target_groupBy),
            // PL 전사레벨 실적, 목표조회 (전사 SG&A, 영업이익 항목 계산용)
            SELECT.from(pl_view).columns(pl_col_list).where({ 'year': { in: [year, last_year] }, 'month': month }).groupBy('year', 'month'),
            SELECT.from(pl_target_view).columns(target_col_list).where(target_where_test).groupBy(...target_groupBy_cols),
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
            }
        }
        if (query.length < 2) {
            let oEmpty = {
                "prj_prfm_amount": 0,
                "prj_prfm_amount_sum": 0,
                "sale_amount": 0,
                "sale_amount_sum": 0
            }
            // 검색기준 올해,작년,전체 데이터가 없을 경우
            if (query.filter(o => o.year === year).length === 1) {
                query.push({ ...oEmpty, "year": last_year, "month": month });
            } else if (query.filter(o => o.year === last_year).length === 1) {
                query.push({ ...oEmpty, "year": year, "month": month });
            } else {
                query.push({ ...oEmpty, "year": year, "month": month });
                query.push({ ...oEmpty, "year": last_year, "month": month });
            }
        }
        if (query_pl_ent.length < 2) {
            let oEmpty = {
                "prj_prfm_amount": 0,
                "prj_prfm_amount_sum": 0,
                "sale_amount": 0,
                "sale_amount_sum": 0
            }
            // 검색기준 올해,작년,전체 데이터가 없을 경우
            if (query_pl_ent.filter(o => o.year === year).length === 1) {
                query_pl_ent.push({ ...oEmpty, "year": last_year, "month": month });
            } else if (query_pl_ent.filter(o => o.year === last_year).length === 1) {
                query_pl_ent.push({ ...oEmpty, "year": year, "month": month });
            } else {
                query_pl_ent.push({ ...oEmpty, "year": year, "month": month });
                query_pl_ent.push({ ...oEmpty, "year": last_year, "month": month });
            }
        }
        if (query_pl_ent_target.length < 2) {
            let oEmpty = {
                "target_margin_amount": 0,
                "target_sale_amount": 0
            }
            // 검색기준 올해,작년,전체 데이터가 없을 경우
            if (query_pl_ent_target.filter(o => o.year === year).length === 1) {
                query_pl_ent_target.push({ ...oEmpty, "year": last_year });
            } else if (query.filter(o => o.year === last_year).length === 1) {
                query_pl_ent_target.push({ ...oEmpty, "year": year });
            } else {
                query_pl_ent_target.push({ ...oEmpty, "year": year });
                query_pl_ent_target.push({ ...oEmpty, "year": last_year });
            }
        }

        let pl_target_row = query_target.find(o => o.year === year),
            pl_row = query.find(o => o.year === year)

        if (!pl_target_row) {
            pl_target_row = {};
            pl_target_row["target_sale_amount"] = 0;
            pl_target_row["target_margin_amount"] = 0;
        }
        
        const sale_data =
        {
            "seq": 1,
            "type": "매출",
            "goal": pl_target_row["target_sale_amount"],
            "performanceCurrentYearMonth": pl_row["sale_amount_sum"],
        };
        oResult.push(sale_data);

        const margin_value_sum = pl_row["sale_amount_sum"] - pl_row["prj_prfm_amount_sum"];
        const margin_data =
        {
            "seq": 2,
            "type": "마진",
            "goal": pl_target_row["target_margin_amount"],
            "performanceCurrentYearMonth": margin_value_sum,
        };
        oResult.push(margin_data);

        const margin_rate_data =
        {
            "seq": 3,
            "type": "마진률",
            "goal": sale_data["goal"] !== 0 ? margin_data["goal"] / sale_data["goal"] * 100 : 0,
            "performanceCurrentYearMonth": sale_data["performanceCurrentYearMonth"] !== 0 ? margin_data["performanceCurrentYearMonth"] / sale_data["performanceCurrentYearMonth"] * 100 : 0,
        };
        oResult.push(margin_rate_data);

        return oResult;
    });
}