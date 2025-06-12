module.exports = (srv) => {
    srv.on('get_sale_detail_org', async (req) => {

        /**
         * API 리턴값 담을 배열 선언
         */
        const oResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // function 입력 파라미터
        let { year, month, org_id } = req.data;

        /**
         * pl.view.amount_view [실적]
         * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
         */
        const pl_view = db.entities('pl.view').amount_view;

        /**
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본무 조건별 추가)
         */
        const pl_col_list = [
            'year', 'month', 'sum(sale_amount) as sale_amount', '(sum(sale_amount_sum) - sum(prj_prfm_amount_sum)) as margin_amount_sum'];
        const pl_where_conditions = { 'year': { in: [year] }, 'month': { in: [month] }, 'div_id': {'!=': null} };
        const pl_groupBy_cols = ['year', 'month'];

        /**
         * common.org [조직정보]
         * 조직구조 테이블
         */
        const org_view = db.entities('common').org;

        let org_query = await SELECT.from(org_view).columns('id', 'parent', 'type', 'name');
        if (org_query.length < 1) return; // 예외처리 추가 필요 throw error

        let orgInfo = org_query.find(e => e.id === org_id);
        /**
         * 전사 부문 본부 팀 TYPE 코드
         * [To-Be] 인터페이스 코드 버전관리로 동적 매핑 구현 필요!!!!!!!!!!!!!
         */
        const entCode = "4044",
            divCode = '1796',
            hdqtCode = '6907',
            teamCode = '1414';

        const categories = [ 'sale', 'margin', 'sga', 'profit'] ;
        let org_text = "";

        let pl_cols = pl_col_list;
        let pl_wheres = pl_where_conditions;
        let pl_groupBys = pl_groupBy_cols;
        let pl_orderBy;
        // 전사
        if(orgInfo["type"] === entCode){
            org_text = 'div_id';
            pl_cols = [...pl_cols, 'div_id'];
            pl_groupBys = [...pl_groupBys, 'div_id'];
            pl_orderBy = ['sale_amount', 'div_id', 'year', 'month'];
        } else if (orgInfo["type"] === divCode) {   // 부문
            org_text = 'hdqt_id';
            pl_cols = [...pl_cols, 'hdqt_id']
            pl_wheres = {...pl_wheres, div_id : org_id }
            pl_groupBys = [...pl_groupBys, 'hdqt_id']
            pl_orderBy = ['sale_amount', 'hdqt_id', 'year', 'month'];
        } else if (orgInfo["type"] === hdqtCode) {  // 본부
            org_text = 'team_id';
            pl_cols = [...pl_cols, 'team_id']
            pl_wheres = {...pl_wheres, hdqt_id : org_id }
            pl_groupBys = [...pl_groupBys, 'team_id']
            pl_orderBy = ['sale_amount', 'team_id', 'year', 'month'];
        } else {
            return; // 예외처리 필요!!
        }

        const [query] = await Promise.all([
            // PL 실적
            SELECT.from(pl_view).columns(pl_cols).where(pl_wheres).groupBy(...pl_groupBys).orderBy('sale_amount desc'),
        ]);
//오류 방지용 임시 로직
if(query.length === 0){
    return;
};
        const org_list = query.map(o=>o[org_text]);
        const org_total = [...new Set([...org_list])];
        let iCum = 0;

        for(const elem of org_total) {
            if(!elem){
                continue;
            };
            let data = query.filter(o=>o[org_text] === elem);
            if(!data) data = { [org_text]: elem, year: year, month: month, sale_amount: 0, margin_amount_sum: 0};

            // 매출
            if(Array.isArray(data)){
                data.forEach(data =>{
                    oResult.push({
                        year: data.year,
                        month: data.month,
                        org: org_query.find(o=>o.id === elem)["name"],
                        category : categories[0],
                        actual: data["sale_amount"],
                        progress: iCum += data["sale_amount"]
                    })
                });
            }else{
                oResult.push({
                    year: data.year,
                    month: data.month,
                    org: org_query.find(o=>o.id === elem)["name"],
                    category : categories[0],
                    actual: data["sale_amount"],
                    progress: iCum += data["sale_amount"]
                })
            };
            
        };

        let iSum = oResult[oResult.length-1].progress;
        oResult.forEach(data =>{
            data.rate = !iSum ? 0 : data.progress / iSum * 100;
        });

        return oResult;
    })
}