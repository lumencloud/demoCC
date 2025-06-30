module.exports = (srv) => {
    srv.on('get_pl_treemap', async (req) => {

        /**
         * API 리턴값 담을 배열 선언
         */
        const oResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // function 입력 파라미터
        let { year, month, org_id, category } = req.data;

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
         * sgna.sga_result_with_org_view [sg&a 집계]
         * [부문/본부/팀 + 연,금액] 프로젝트 판관비 집계 뷰
         */
        const sga_view = db.entities('sga.view').sga_amount_view;

        /** 
         * 타겟 뷰 조회용 컬럼
         */
        const target_col_list = [
            'year','sum(sale) as target_sale_amount',
            'sum(margin) as target_margin_amount', 'sum(br) as target_br' ];
        const target_where_conditions = { 'year': { in: [year] } };
        const target_groupBy_cols = ['year']

        /**
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본무 조건별 추가)
         */
        const pl_col_list = [
            'year', 'month', 'sum(sale_amount_sum) as sale_amount_sum', '(sum(sale_amount_sum) - sum(prj_prfm_amount_sum)) as margin_amount_sum'];
        const pl_where_conditions = { 'year': { in: [year] }, 'month': month, 'div_id': {'!=': null} };
        const pl_groupBy_cols = ['year', 'month'];


        const sga_col_list = ['year', 'month',
            '(coalesce(sum(labor_amount_sum),0) + coalesce(sum(iv_amount_sum),0) + coalesce(sum(exp_amount_sum),0)) as amount_sum'];
        const sga_where_conditions = { 'year': { in: [year] }, 'month': month }
        const sga_groupBy_cols = ['year', 'month'];

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

        let target_pl_cols = target_col_list;
        let target_pl_wheres = target_where_conditions;
        let target_pl_groupBys = target_groupBy_cols;
        let pl_cols = pl_col_list;
        let pl_wheres = pl_where_conditions;
        let pl_groupBys = pl_groupBy_cols;
        let sga_cols = sga_col_list;
        let sga_wheres = sga_where_conditions;
        let sga_groupBys = sga_groupBy_cols;

        // 전사
        if(orgInfo["type"] === entCode){
            org_text = 'div_id';
            target_pl_cols = [...target_pl_cols, 'div_id'];
            target_pl_groupBys = [...target_pl_groupBys, 'div_id'];
            pl_cols = [...pl_cols, 'div_id'];
            pl_groupBys = [...pl_groupBys, 'div_id'];
            sga_cols = [...sga_cols, 'div_id'];
            sga_groupBys = [...sga_groupBys, 'div_id'];
        } else if (orgInfo["type"] === divCode) {   // 부문
            org_text = 'hdqt_id';
            target_pl_cols = [...target_pl_cols, 'hdqt_id']
            target_pl_wheres = {...target_pl_wheres, div_id : org_id }
            target_pl_groupBys = [...target_pl_groupBys, 'hdqt_id']
            pl_cols = [...pl_cols, 'hdqt_id']
            pl_wheres = {...pl_wheres, div_id : org_id }
            pl_groupBys = [...pl_groupBys, 'hdqt_id']
            sga_cols = [...sga_cols, 'hdqt_id']
            sga_wheres = {...sga_wheres, div_id : org_id }
            sga_groupBys = [...sga_groupBys, 'hdqt_id']
        } else if (orgInfo["type"] === hdqtCode) {  // 본부
            org_text = 'team_id';
            target_pl_cols = [...target_pl_cols, 'team_id']
            target_pl_wheres = {...target_pl_wheres, hdqt_id : org_id }
            target_pl_groupBys = [...target_pl_groupBys, 'team_id']
            pl_cols = [...pl_cols, 'team_id']
            pl_wheres = {...pl_wheres, hdqt_id : org_id }
            pl_groupBys = [...pl_groupBys, 'team_id']
            sga_cols = [...sga_cols, 'team_id']
            sga_wheres = {...sga_wheres, hdqt_id : org_id }
            sga_groupBys = [...sga_groupBys, 'team_id']
        } else {
            return; // 예외처리 필요!!
        }
//임시로 sga 제거함.
let sga_query = [];
        const [query, query_target] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_cols).where(pl_wheres).groupBy(...pl_groupBys),
            SELECT.from(pl_target_view).columns(target_pl_cols).where(target_pl_wheres).groupBy(...target_pl_groupBys),
            // SELECT.from(sga_view).columns(sga_cols).where(sga_wheres).groupBy(...sga_groupBys)
        ]);
        const org_list = query.map(o=>o[org_text]);
        const target_org_list = query_target.map(o=>o[org_text]);
        const sga_list = sga_query.map(o=>o[org_text]);
        const org_total = [...new Set([...org_list, ...target_org_list,...sga_list])];

        for(const elem of org_total) {
            if(!elem){
                continue;
            };
            let data = query.find(o=>o[org_text] === elem);
            if(!data) data = { [org_text]: elem, year: year, month: month, sale_amount_sum: 0, margin_amount_sum: 0};
            let target_data = query_target.find(o=>o[org_text] === elem);
            if(!target_data) target_data = { [org_text]: elem, year: year, month: month, target_sale_amount: 0, target_margin_amount: 0, br: 0};
            let sga_data = sga_query.find(o=>o[org_text] === elem);
            if(!sga_data) sga_data = { [org_text]: elem, year: year, month: month, amount_sum: 0};

            // 매출
            if(category === categories[0]){
                oResult.push({
                    year: year,
                    month: month,
                    org: org_query.find(o=>o.id === elem)["name"],
                    category : categories[0],
                    actual: data["sale_amount_sum"],
                    target: target_data["target_sale_amount"],
                    difference: target_data["target_sale_amount"] - data["sale_amount_sum"],
                    progress: data["sale_amount_sum"] / target_data["target_sale_amount"] * 100 || 0
                })
            // 마진
            }else if(category === categories[1]){
                oResult.push({
                    year: year,
                    month: month,
                    org: org_query.find(o=>o["id"] === elem)["name"],
                    category : categories[1],
                    actual: data["margin_amount_sum"],
                    target: target_data["target_margin_amount"],
                    difference: target_data["target_margin_amount"] - data["margin_amount_sum"],
                    progress: data["margin_amount_sum"] / target_data["target_margin_amount"] * 100 || 0
                })
            // 사업 SG&A
            }else if(category === categories[2]){
                oResult.push({
                    year: year,
                    month: month,
                    org: org_query.find(o=>o["id"] === elem)["name"],
                    category : categories[2],
                    actual: sga_data["amount_sum"],
                    target: 0,
                    difference: 0,
                    progress:0
                })
            }else if(category === categories[3]){
                oResult.push({
                    year: year,
                    month: month,
                    org: org_query.find(o=>o["id"] === elem)["name"],
                    category : categories[3],
                    actual: data["margin_amount_sum"] - sga_data["amount_sum"],
                    target: 0,
                    difference: 0,
                    progress:0
                })
            };
        };

        return oResult;
    })
}