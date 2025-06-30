module.exports = (srv) => {
    srv.on('get_pl_performance_month_rate', async (req) => {

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
         * pl.view.target_amount_view [목표]
         * [부문/본부/팀 + 연,금액] 팀,본부 단위의 프로젝트 목표비용 집계 뷰
         */
        const pl_target_amount_view = db.entities('pl.view').target_amount_view;
        /**
         * sgna.sga_result_with_org_view [sg&a 집계]
         * [부문/본부/팀 + 연,금액] 프로젝트 판관비 집계 뷰
         */
        // const sga_view = db.entities('sga.view').sga_amount_view;
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
        const pl_where_conditions = { 'year': { in: [year, last_year] }, 'month': month };
        const pl_groupBy_cols = ['year', 'month'];
        /**
         * [TEMP] - 목표는 포탈 목표입력과 연계하여 조정 예정
         * 목표 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 부문, 본무 조건별 추가) [실적은 연 단위]
         */
        const pl_target_col_list = ['year', 'sum(sale_amount) as target_sale_amount', 'sum(prj_prfm_amount) as target_prj_prfm_amount']
        /**
         * [TEMP]
         * SG&A 조회용 컬럼
         */
        // const sga_col_list = ['year', 'month',
        //     '(coalesce(sum(labor_amount),0) + coalesce(sum(iv_amount),0) + coalesce(sum(exp_amount),0)) as amount',
        //     '(coalesce(sum(labor_amount_sum),0) + coalesce(sum(iv_amount_sum),0) + coalesce(sum(exp_amount_sum),0)) as amount_sum'];

        let org_query = await SELECT.from(org_view).columns('id', 'parent', 'type', 'name');
        if (org_query.length < 1) return; // 예외처리 추가 필요 throw error
        let orgInfo = org_query.find(e => e.id === org_id);
// console.log('orgInfo',orgInfo)
        // let sga_t_where = { 'year': { in: [year, last_year] }, 'month': month }
        // let sga_t_groupBy = ['year', 'month'];

        let target_column = target_col_list;
        let target_where = target_where_conditions;
        let target_groupBy = target_groupBy_cols;

        let target_where_test = target_where_conditions;

        let pl_column = pl_col_list;
        let pl_where = { 'year': { 'in': [year, last_year] }, 'month': {'between': '01', 'and': month} }
        // let pl_where = { 'year': { in: [year, last_year] }, 'month': month }
        let pl_groupBy = ['year', 'month'];

        let pl_target_column = pl_target_col_list;
        let pl_target_where = { 'year': { in: [year, last_year] } };
        let pl_target_groupBy = ['year'];

        // let sga_column = sga_col_list;
        // let sga_where = { ...sga_t_where, 'type': '사업' }
        // let sga_groupBy = sga_t_groupBy;

        if (org_id === 'test') {
            pl_where = { ...pl_where, 'div_id': { in: ['6589', '6286', '6193'] }, and: { 'hdqt_id': { in: ['6590', '6287', '6629'] }, or: { 'hdqt_id': null } } };
            pl_target_where = { ...pl_target_where, 'div_id': { in: ['6589', '6286', '6193'] }, and: { 'hdqt_id': { in: ['6590', '6287', '6629'] }, or: { 'hdqt_id': null } } };
            target_where_test = { ...target_where_test, 'div_id': { in: ['6589', '6286', '6193'] }, and: { 'hdqt_id': { in: ['6590', '6287', '6629'] }, or: { 'hdqt_id': null } } };
            // sga_where = { ...sga_where, 'div_id': { in: ['6589', '6286', '6193'] }, and: { 'hdqt_id': { in: ['6590', '6287', '6629'] }, or: { 'hdqt_id': null } } };
            // sga_t_where = { ...sga_t_where, 'div_id': { in: ['6589', '6286', '6193'] }, and: { 'hdqt_id': { in: ['6590', '6287', '6629'] }, or: { 'hdqt_id': null } } };
        } else if (orgInfo) {
            let orgInfo = org_query.find(e => e.id === org_id);
            let pl_target;
            // let pl_target, sga_target = '';

            if (orgInfo.type === divCode || orgInfo.type === hdqtCode) {
                if (orgInfo.type === divCode) {
                    pl_target = 'div_id';
                    // sga_target = 'div_id';
                } else if (orgInfo.type === hdqtCode) {
                    pl_target = 'hdqt_id';
                    // sga_target = 'hdqt_id';
                }

                target_column = [...target_column, `${pl_target}`];
                target_where = { ...target_where, [`${pl_target}`]: org_id };
                target_groupBy = [...target_groupBy, `${pl_target}`];

                pl_column = [...pl_col_list, `${pl_target}`];
                // pl_where = { [`${pl_target}`]: org_id, 'year': { 'in': year }, 'month': {'between': '01', 'and': '03'} }
                // pl_where = { [`${pl_target}`]: org_id, 'year': { 'in': year }, 'month': {'between': '01', 'and': month} }
                pl_where = { [`${pl_target}`]: org_id, 'year': { in: [year, last_year] }, 'month': {'between': '01', 'and': month} }
                pl_groupBy = ['year', 'month', `${pl_target}`];

                // sga_column = [...sga_col_list, `${sga_target}`];
                // sga_where = { ...sga_t_where, 'type': '사업', [`${sga_target}`]: org_id }
                // sga_groupBy = [...sga_t_groupBy, `${sga_target}`];
            }
        }
        // console.log('pl_where', pl_where)
        // DB 쿼리 실행 (병렬)
        const [query, query_target] = await Promise.all([
            // PL 실적, 목표 조회
            // SELECT.from(pl_view),
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy).orderBy(['year', 'month']),
            SELECT.from(pl_target_view).columns(target_column).where(target_where).groupBy(...target_groupBy),
            // PL 전사레벨 실적, 목표조회 (전사 SG&A, 영업이익 항목 계산용)
            // SELECT.from(pl_view).columns(pl_col_list).where({ 'year': { in: [year, last_year] }, 'month': month }).groupBy('year', 'month'),
            // SELECT.from(pl_target_view).columns(target_col_list).where(target_where_test).groupBy(...target_groupBy_cols),
            // SELECT.from(pl_target_amount_view).columns(pl_target_col_list).where({ 'year': { in: [year, last_year] } }).groupBy('year'),
            // SG&A 사업 실적데이터 [올해년월, 작년동월]
            // SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
            // SG&A 전사영역 실적데이터 [올해년월, 작년동월]
            // SELECT.from(sga_view).columns([...sga_col_list, 'type']).where(sga_t_where).groupBy(...sga_t_groupBy, 'type')
        ]);
// console.log('query', query)
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
        // if (query_pl_ent.length < 2) {
        //     let oEmpty = {
        //         "prj_prfm_amount": 0,
        //         "prj_prfm_amount_sum": 0,
        //         "sale_amount": 0,
        //         "sale_amount_sum": 0
        //     }
        //     // 검색기준 올해,작년,전체 데이터가 없을 경우
        //     if (query_pl_ent.filter(o => o.year === year).length === 1) {
        //         query_pl_ent.push({ ...oEmpty, "year": last_year, "month": month });
        //     } else if (query_pl_ent.filter(o => o.year === last_year).length === 1) {
        //         query_pl_ent.push({ ...oEmpty, "year": year, "month": month });
        //     } else {
        //         query_pl_ent.push({ ...oEmpty, "year": year, "month": month });
        //         query_pl_ent.push({ ...oEmpty, "year": last_year, "month": month });
        //     }
        // }
        // if (query_pl_ent_target.length < 2) {
        //     let oEmpty = {
        //         "target_margin_amount": 0,
        //         "target_sale_amount": 0
        //     }
        //     // 검색기준 올해,작년,전체 데이터가 없을 경우
        //     if (query_pl_ent_target.filter(o => o.year === year).length === 1) {
        //         query_pl_ent_target.push({ ...oEmpty, "year": last_year });
        //     } else if (query.filter(o => o.year === last_year).length === 1) {
        //         query_pl_ent_target.push({ ...oEmpty, "year": year });
        //     } else {
        //         query_pl_ent_target.push({ ...oEmpty, "year": year });
        //         query_pl_ent_target.push({ ...oEmpty, "year": last_year });
        //     }
        // }
        // if (sga_biz.length < 2) {
        //     let oEmpty = {
        //         "amount": 0,
        //         "amount_sum": 0
        //     }
        //     // 검색기준 올해,작년,전체 데이터가 없을 경우
        //     if (sga_biz.filter(o => o.year === year).length === 1) {
        //         sga_biz.push({ ...oEmpty, "year": last_year, "month": month });
        //     } else if (sga_biz.filter(o => o.year === last_year).length === 1) {
        //         sga_biz.push({ ...oEmpty, "year": year, "month": month });
        //     } else {
        //         sga_biz.push({ ...oEmpty, "year": year, "month": month });
        //         sga_biz.push({ ...oEmpty, "year": last_year, "month": month });
        //     }
        // }

        // if (sga_total.filter(o => o.type === '사업').length < 2) {
        //     let oEmpty = {
        //         "amount": 0,
        //         "amount_sum": 0,
        //         "type": "사업"
        //     }
        //     // 검색기준 올해,작년,전체 데이터가 없을 경우
        //     if (sga_total.filter(o => o.year === year && o.type === '사업').length === 1) {
        //         sga_total.push({ ...oEmpty, "year": last_year, "month": month });
        //     } else if (sga_total.filter(o => o.year === last_year && o.type === '사업').length === 1) {
        //         sga_total.push({ ...oEmpty, "year": year, "month": month });
        //     } else {
        //         sga_total.push({ ...oEmpty, "year": year, "month": month });
        //         sga_total.push({ ...oEmpty, "year": last_year, "month": month });
        //     }
        // }

        // if (sga_total.filter(o => o.type === '전사').length < 2) {
        //     let oEmpty = {
        //         "amount": 0,
        //         "amount_sum": 0,
        //         "type": "전사"
        //     }
        //     // 검색기준 올해,작년,전체 데이터가 없을 경우
        //     if (sga_total.filter(o => o.year === year && o.type === '전사').length === 1) {
        //         sga_total.push({ ...oEmpty, "year": last_year, "month": month });
        //     } else if (sga_total.filter(o => o.year === last_year && o.type === '전사').length === 1) {
        //         sga_total.push({ ...oEmpty, "year": year, "month": month });
        //     } else {
        //         sga_total.push({ ...oEmpty, "year": year, "month": month });
        //         sga_total.push({ ...oEmpty, "year": last_year, "month": month });
        //     }
        // }

        let pl_target_row = query_target.find(o => o.year === year),
            // pl_target_last_y_row = query_target.find(o => o.year === last_year),
            pl_row = query.filter(o => o.year === year)
            // pl_last_y_row = query.find(o => o.year === last_year),
            // pl_ent_row = query_pl_ent.find(o => o.year === year),
            // pl_ent_last_y_row = query_pl_ent.find(o => o.year === last_year),
            // pl_ent_target_row = query_pl_ent_target.find(o => o.year === year),
            // pl_ent_target_last_y_row = query_pl_ent_target.find(o => o.year === last_year),
            // sga_row = sga_biz.find(o => o.year === year),
            // sga_last_y_row = sga_biz.find(o => o.year === last_year),
            // sga_t_biz_row = sga_total.find(o => o.year === year && o.type === '사업'),
            // sga_t_biz_last_y_row = sga_total.find(o => o.year === last_year && o.type === '사업'),
            // sga_t_row = sga_total.find(o => o.year === year && o.type === '전사'),
            // sga_t_last_y_row = sga_total.find(o => o.year === last_year && o.type === '전사');

        // if (!sga_t_last_y_row) {
        //     sga_t_last_y_row = {
        //         amount: 0,
        //         amount_sum: 0,
        //         month: month,
        //         type: '전사',
        //         year: last_year
        //     }
        // }
// console.log("pl_row", pl_row)
        if (!pl_target_row) {
            pl_target_row = {};
            pl_target_row["target_sale_amount"] = 0;
            pl_target_row["target_margin_amount"] = 0;
        }
        // if (!pl_target_last_y_row) {
        //     pl_target_last_y_row = {};
        //     pl_target_last_y_row["target_sale_amount"] = 0;
        //     pl_target_last_y_row["target_margin_amount"] = 0;
        // }

        pl_row.forEach(data=>{
            let oData = {
                year:parseInt(year),
                month:parseInt(data.month),
                sale:data.sale_amount_sum,
                targetSale:pl_target_row["target_sale_amount"],
                saleRate:pl_target_row["target_sale_amount"] !== 0 ? data.sale_amount_sum / pl_target_row["target_sale_amount"] * 100 : 0,
                margin:data["sale_amount_sum"] - data["prj_prfm_amount_sum"],
                marginTarget:pl_target_row["target_margin_amount"],
                marginRate1:pl_target_row["target_margin_amount"] !== 0 ? (data["sale_amount_sum"] - data["prj_prfm_amount_sum"]) / pl_target_row["target_margin_amount"] * 100 : 0,
                marginRate2:data["sale_amount_sum"] !== 0 ? (data["sale_amount_sum"] - data["prj_prfm_amount_sum"]) / data["sale_amount_sum"] * 100 : 0,
                marginRateTarget2:pl_target_row["target_sale_amount"] !== 0 ? pl_target_row["target_margin_amount"] / pl_target_row["target_sale_amount"] * 100 : 0
            }
            oResult.push(oData);
        });
        // console.log("aResult", oResult)
        
        return oResult;
    });
}