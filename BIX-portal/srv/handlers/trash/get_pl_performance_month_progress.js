const get_org_descendant = require('../function/get_org_descendant');

module.exports = (srv) => {
    srv.on('get_pl_performance_month_progress', async (req) => {
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
        const pl_target_view = db.entities('pl.view').target_view;
        
        /**
         * common.org [조직정보]
         * 조직구조 테이블
         */
        const org_view = db.entities('common').org;

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
        const entCode = "4044",
            divCode = '1796',
            hdqtCode = '6907',
            teamCode = '1414';

        // QUERY 공통 파라미터 선언
        /**
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본무 조건별 추가)
         */
        const pl_col_list = [
            'year', 'month', 'sum(sale_amount) as sale_amount', 'sum(prj_prfm_amount) as prj_prfm_amount'];
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'month': {'between': '01', 'and': month} };
        const pl_groupBy_cols = ['year', 'month'];

        const target_col_list = ['year', 'sum(sale) as target_sale_amount'];
        const target_where_conditions = { 'year': { in: [year] } };
        const target_groupBy_cols = ['year']
        
        let org_query = await SELECT.from(org_view).columns('id', 'parent', 'type', 'name');
        if (org_query.length < 1) return; // 예외처리 추가 필요 throw error
        let orgInfo = org_query.find(e => e.id === org_id);

        let pl_column = pl_col_list;
        let pl_where = pl_where_conditions
        let pl_groupBy = pl_groupBy_cols;

        let target_column = target_col_list;
        let target_where = target_where_conditions;
        let target_groupBy = target_groupBy_cols;

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

                target_column = [...target_column, `${pl_target}`];
                target_where = { ...target_where, [`${pl_target}`]: org_id };
                target_groupBy = [...target_groupBy, `${pl_target}`];
            }
        }

        // DB 쿼리 실행 (병렬)
        const [query, query_target] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy).orderBy(['year', 'month']),
            SELECT.from(pl_target_view).columns(target_column).where(target_where).groupBy(...target_groupBy),
        ]);

        // 임시 - 비어있을 경우 0 값 생성, 추후 에러처리 or 로직 구성
        if (query_target.length < 1) {
            let oEmpty = {
                "target_sale_amount": 0,
            }
            query_target.push({ ...oEmpty, "year": year });
        };

        let pl_row = query.filter(o => o.year === year),
            pl_last_y_row = query.filter(o => o.year === last_year);
            
        aMonth.forEach(data =>{
            let bChk1 = pl_row.some(data2 => data2.month === data);
            let bChk2 = pl_last_y_row.some(data2 => data2.month === data);

            if(!bChk1){
                pl_row.push({ "sale_amount": 0, "prj_prfm_amount": 0, "year": year, "month": data });
            };
            if(!bChk2){
                pl_last_y_row.push({ "sale_amount": 0, "prj_prfm_amount": 0, "year": last_year, "month": data });
            };

            let iCurrentSum = 0;
            pl_row.forEach(data2=>{
                if(parseInt(data2.month) <= parseInt(data)){
                    iCurrentSum += data2.sale_amount;
                };
            });

            let iLastSum = 0;
            pl_last_y_row.forEach(data2=>{
                if(parseInt(data2.month) <= parseInt(data)){
                    iLastSum += data2.sale_amount;
                };
            });

            let oFindPlRow = pl_row.find(data2=>data === data2.month);

            let oTemp = {
                year: year,
                month: data,
                sale: oFindPlRow.sale_amount,
                contract: 5000000000,
                margin: oFindPlRow.sale_amount - oFindPlRow.prj_prfm_amount,
                marginRate: !oFindPlRow.sale_amount ? 0 : ((oFindPlRow.sale_amount - oFindPlRow.prj_prfm_amount) / oFindPlRow.sale_amount) * 100,
                br: !query_target[0].target_sale_amount ? 0 : (iCurrentSum / query_target[0].target_sale_amount) * 100,
                target: query_target[0].target_sale_amount,
                last: iLastSum,
                current: iCurrentSum
            };

            oResult.push(oTemp)
        });
        oResult.sort((a,b)=> Number(a.month) - Number(b.month));
        return oResult;
    });
}