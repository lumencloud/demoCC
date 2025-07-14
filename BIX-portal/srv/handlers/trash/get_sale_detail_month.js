module.exports = (srv) => {
    srv.on('get_sale_detail_month', async (req) => {

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
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본무 조건별 추가)
         */
        const pl_col_list = [
            'year', 'month', 'sum(sale_amount) as sale_amount'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'month': {'between': '01', 'and': month} };
        const pl_groupBy_cols = ['year', 'month'];
        
        let org_query = await SELECT.from(org_view).columns('id', 'parent', 'type', 'name');
        if (org_query.length < 1) return; // 예외처리 추가 필요 throw error
        let orgInfo = org_query.find(e => e.id === org_id);

        let pl_column = pl_col_list;
        let pl_where = pl_where_conditions
        let pl_groupBy = pl_groupBy_cols;

        if (org_id === 'test') {
            pl_where = { ...pl_where, 'div_id': { in: ['6589', '6286', '6193'] }, and: { 'hdqt_id': { in: ['6590', '6287', '6629'] }, or: { 'hdqt_id': null } } };
            target_where_test = { ...target_where_test, 'div_id': { in: ['6589', '6286', '6193'] }, and: { 'hdqt_id': { in: ['6590', '6287', '6629'] }, or: { 'hdqt_id': null } } };
            sga_where = { ...sga_where, 'div_id': { in: ['6589', '6286', '6193'] }, and: { 'hdqt_id': { in: ['6590', '6287', '6629'] }, or: { 'hdqt_id': null } } };
            sga_t_where = { ...sga_t_where, 'div_id': { in: ['6589', '6286', '6193'] }, and: { 'hdqt_id': { in: ['6590', '6287', '6629'] }, or: { 'hdqt_id': null } } };
        } else if (orgInfo) {
            let orgInfo = org_query.find(e => e.id === org_id);
            let pl_target, sga_target = '';

            if (orgInfo.type === divCode || orgInfo.type === hdqtCode) {
                if (orgInfo.type === divCode) {
                    pl_target = 'div_id';
                    sga_target = 'div_id';
                } else if (orgInfo.type === hdqtCode) {
                    pl_target = 'hdqt_id';
                    sga_target = 'hdqt_id';
                };

                pl_column = [...pl_col_list, `${pl_target}`];
                pl_where = { [`${pl_target}`]: org_id, 'year': { in: [year, last_year] }, 'month': {'between': '01', 'and': month} }
                pl_groupBy = ['year', 'month', `${pl_target}`];
            }
        }
        //
        // DB 쿼리 실행 (병렬)
        const [query] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy).orderBy(['year', 'month']),
        ]);

        if (query.length < 2) {
            let oEmpty = {
                "prj_prfm_amount_sum": 0,
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

        let pl_row = query.filter(o => o.year === year),
            pl_last_y_row = query.filter(o => o.year === last_year)
            
        pl_row.forEach(data => {
            let oTemp;
            if(!pl_last_y_row){
                oTemp = {
                    month:data.month,
                    year:data.year,
                    sale:data.sale_amount,
                    rate:0
                };
                oResult.push(oTemp);
            }else{
                let oLastYearData = pl_last_y_row.find(data2 => data2.year === data.year )
                if(oLastYearData){
                    oTemp = {
                        month:data.month,
                        year:data.year,
                        sale:data.sale_amount,
                        saleLastYear:oLastYearData.sale_amount,
                        rate:!oLastYearData.sale_amount ? 0 : data.sale_amount / oLastYearData.sale_amount * 100
                    };
                }else{
                    oTemp = {
                        month:data.month,
                        year:data.year,
                        sale:data.sale_amount,
                        saleLastYear:0,
                        rate:0
                    };
                };
            };

            oResult.push(oTemp);
        })
        return oResult;
    });
}