const get_org_descendant = require('../function/get_org_descendant');

module.exports = (srv) => {
    srv.on('get_pl_performance_detail_excel', async (req) => {
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

        function getMonth(data){
            let iEnd = parseInt(data);
            let aResult = [];
            for(let i = 1 ; i <= iEnd; i++){
                aResult.push(i.toString().padStart(2,'0'));
            };
            return aResult;
        };
        const aMonth = getMonth('12');
        
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
            'year', 'month', 'sum(sale_amount) as sale_amount', 'sum(sale_amount_sum) as sale_amount_sum', 'sum(prj_prfm_amount) as prj_prfm_amount','sum(prj_prfm_amount_sum) as prj_prfm_amount_sum'];
        //추정치 값이 없어 일단은 모든 값을 실적으로 넣음. 그래서 월을 전월 검색 중.
        const pl_where_conditions = { 'year': { in: [year] }, 'month': {'between': '01', 'and': '12'}, 'div_id': {'!=': null} };
        const pl_groupBy_cols = ['year', 'month'];

        const target_col_list = ['year', 'sum(sale) as target_sale_amount', 'sum(margin) as target_margin_amount'];
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

        if(orgInfo["type"] === entCode){// 전사
            org_text = 'div_id';
            pl_column = [...pl_column, 'div_id'];
            pl_groupBy = [...pl_groupBy, 'div_id'];
            pl_orderBy = ['div_id', 'year', 'month'];

            target_column = [...target_column, 'div_id'];
            target_groupBy = [...target_groupBy, 'div_id'];
        } else if (orgInfo["type"] === divCode) {   // 부문
            org_text = 'hdqt_id';
            pl_column = [...pl_column, 'hdqt_id'];
            pl_where = {...pl_where, div_id : org_id };
            pl_groupBy = [...pl_groupBy, 'hdqt_id'];
            pl_orderBy = ['hdqt_id', 'year', 'month'];

            target_column = [...target_column, 'hdqt_id'];
            target_where = {...target_where, div_id : org_id };
            target_groupBy = [...target_groupBy, 'hdqt_id'];
        } else if (orgInfo["type"] === hdqtCode) {  // 본부
            org_text = 'team_id';
            pl_column = [...pl_column, 'team_id']
            pl_where = {...pl_where, hdqt_id : org_id }
            pl_groupBy = [...pl_groupBy, 'team_id']
            pl_orderBy = ['team_id', 'year', 'month'];

            target_column = [...target_column, 'team_id'];
            target_where = {...target_where, hdqt_id : org_id };
            target_groupBy = [...target_groupBy, 'team_id'];
        } else {
            return; // 예외처리 필요!!
        }

        // DB 쿼리 실행 (병렬)
        const [query, query_target, query_pl_ent, query_pl_ent_target] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy).orderBy(['year', 'month']),
            SELECT.from(pl_target_view).columns(target_column).where(target_where).groupBy(...target_groupBy),
            // PL 전사 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_col_list).where(pl_where_conditions).groupBy(...pl_groupBy_cols),
            SELECT.from(pl_target_view).columns(target_col_list).where(target_where_conditions).groupBy(...target_groupBy_cols),
        ]);
//오류 방지용 임시 로직
if(query.length === 0){
    return;
};
        const org_list = query.map(o=>o[org_text]);
        const org_total = [...new Set(org_list.filter(data=>data))];
        const aOrg = [];
        org_total.forEach(data=>{
            let oTemp = {
                id:data,
                name: org_query.find(o=>o.id === data)["name"]
            };
            aOrg.push(oTemp);
        });

        let oEnt1 = {
            org_kor_nm: "전사",
            type: '수주',
            target: 1000000000,  
            progress: 50.00,
            month1: 100000000,
            month2: 100000000,
            month3: 100000000,
            month4: 100000000,
            month5: 100000000,
            month6: 100000000,
            month7: 100000000,
            month8: 100000000,
            month9: 100000000,
            month10: 100000000,
            month11: 100000000,
            month12: 100000000
        };
        oResult.push(oEnt1);

        //선택한 월의 값
        let oEntPlMonthRow = query_pl_ent.find(data=>data.month === month);
        //1~12월 값 flat으로 변환
        let oFlatEntPlMonthRow = query_pl_ent.reduce((acc, item) =>{
            let {month, ...rest} = item;
            Object.entries(rest).forEach(([key, value])=>{
                acc[`${key}${month}`] = value;
            });
            return acc;
        }, {});

        let iTargetSaleAmount = !query_pl_ent_target[0].target_sale_amount ? 0 : query_pl_ent_target[0].target_sale_amount;
        let oEnt2 = {
            org_kor_nm: "전사",
            type: '매출',
            target: iTargetSaleAmount,
            progress: iTargetSaleAmount === 0 ? 0 : ((!oEntPlMonthRow.sale_amount_sum ? 0 : oEntPlMonthRow.sale_amount_sum) / iTargetSaleAmount) * 100,
            month1: !oFlatEntPlMonthRow.sale_amount01 ? 0 : oFlatEntPlMonthRow.sale_amount01,
            month2: !oFlatEntPlMonthRow.sale_amount02 ? 0 : oFlatEntPlMonthRow.sale_amount02,
            month3: !oFlatEntPlMonthRow.sale_amount03 ? 0 : oFlatEntPlMonthRow.sale_amount03,
            month4: !oFlatEntPlMonthRow.sale_amount04 ? 0 : oFlatEntPlMonthRow.sale_amount04,
            month5: !oFlatEntPlMonthRow.sale_amount05 ? 0 : oFlatEntPlMonthRow.sale_amount05,
            month6: !oFlatEntPlMonthRow.sale_amount06 ? 0 : oFlatEntPlMonthRow.sale_amount06,
            month7: !oFlatEntPlMonthRow.sale_amount07 ? 0 : oFlatEntPlMonthRow.sale_amount07,
            month8: !oFlatEntPlMonthRow.sale_amount08 ? 0 : oFlatEntPlMonthRow.sale_amount08,
            month9: !oFlatEntPlMonthRow.sale_amount09 ? 0 : oFlatEntPlMonthRow.sale_amount09,
            month10: !oFlatEntPlMonthRow.sale_amount10 ? 0 : oFlatEntPlMonthRow.sale_amount10,
            month11: !oFlatEntPlMonthRow.sale_amount11 ? 0 : oFlatEntPlMonthRow.sale_amount11,
            month12: !oFlatEntPlMonthRow.sale_amount12 ? 0 : oFlatEntPlMonthRow.sale_amount12
        };
        oResult.push(oEnt2);

        let iTargetMarginAmount = !query_pl_ent_target[0].target_margin_amount ? 0 : query_pl_ent_target[0].target_margin_amount;
        let iSelctMonthMargin = (!oEntPlMonthRow.sale_amount_sum ? 0 : oEntPlMonthRow.sale_amount_sum) - (!oEntPlMonthRow.prj_prfm_amount_sum ? 0 : oEntPlMonthRow.prj_prfm_amount_sum);
        let oEnt3 = {
            org_kor_nm: "전사",
            type: '마진',
            target: iTargetMarginAmount,
            progress: iTargetMarginAmount === 0 ? 0 : (iSelctMonthMargin / iTargetMarginAmount) * 100,
            month1: (!oFlatEntPlMonthRow.sale_amount01 ? 0 : oFlatEntPlMonthRow.sale_amount01) - (!oFlatEntPlMonthRow.prj_prfm_amount01 ? 0 : oFlatEntPlMonthRow.prj_prfm_amount01),
            month2: (!oFlatEntPlMonthRow.sale_amount02 ? 0 : oFlatEntPlMonthRow.sale_amount02) - (!oFlatEntPlMonthRow.prj_prfm_amount02 ? 0 : oFlatEntPlMonthRow.prj_prfm_amount02),
            month3: (!oFlatEntPlMonthRow.sale_amount03 ? 0 : oFlatEntPlMonthRow.sale_amount03) - (!oFlatEntPlMonthRow.prj_prfm_amount03 ? 0 : oFlatEntPlMonthRow.prj_prfm_amount03),
            month4: (!oFlatEntPlMonthRow.sale_amount04 ? 0 : oFlatEntPlMonthRow.sale_amount04) - (!oFlatEntPlMonthRow.prj_prfm_amount04 ? 0 : oFlatEntPlMonthRow.prj_prfm_amount04),
            month5: (!oFlatEntPlMonthRow.sale_amount05 ? 0 : oFlatEntPlMonthRow.sale_amount05) - (!oFlatEntPlMonthRow.prj_prfm_amount05 ? 0 : oFlatEntPlMonthRow.prj_prfm_amount05),
            month6: (!oFlatEntPlMonthRow.sale_amount06 ? 0 : oFlatEntPlMonthRow.sale_amount06) - (!oFlatEntPlMonthRow.prj_prfm_amount06 ? 0 : oFlatEntPlMonthRow.prj_prfm_amount06),
            month7: (!oFlatEntPlMonthRow.sale_amount07 ? 0 : oFlatEntPlMonthRow.sale_amount07) - (!oFlatEntPlMonthRow.prj_prfm_amount07 ? 0 : oFlatEntPlMonthRow.prj_prfm_amount07),
            month8: (!oFlatEntPlMonthRow.sale_amount08 ? 0 : oFlatEntPlMonthRow.sale_amount08) - (!oFlatEntPlMonthRow.prj_prfm_amount08 ? 0 : oFlatEntPlMonthRow.prj_prfm_amount08),
            month9: (!oFlatEntPlMonthRow.sale_amount09 ? 0 : oFlatEntPlMonthRow.sale_amount09) - (!oFlatEntPlMonthRow.prj_prfm_amount09 ? 0 : oFlatEntPlMonthRow.prj_prfm_amount09),
            month10: (!oFlatEntPlMonthRow.sale_amount10 ? 0 : oFlatEntPlMonthRow.sale_amount10) - (!oFlatEntPlMonthRow.prj_prfm_amount10 ? 0 : oFlatEntPlMonthRow.prj_prfm_amount10),
            month11: (!oFlatEntPlMonthRow.sale_amount11 ? 0 : oFlatEntPlMonthRow.sale_amount11) - (!oFlatEntPlMonthRow.prj_prfm_amount11 ? 0 : oFlatEntPlMonthRow.prj_prfm_amount11),
            month12: (!oFlatEntPlMonthRow.sale_amount12 ? 0 : oFlatEntPlMonthRow.sale_amount12) - (!oFlatEntPlMonthRow.prj_prfm_amount12 ? 0 : oFlatEntPlMonthRow.prj_prfm_amount12)
        };
        oResult.push(oEnt3);
        
        //조직id 및 월 기준 pl값 flat으로 변환
        let oFlatPlMonthRow = query.reduce((acc, item) =>{
            let main = item[org_text];
            let sub = item['month'];
            let rest = {...item};
            delete rest[org_text];
            delete rest['month'];
            Object.entries(rest).forEach(([key, value])=>{
                acc[`_${main}_${sub}${key}`] = value;
            });
            return acc;
        }, {});

        //조직id 및 기준 목표값 flat으로 변환
        let oFlatPlTarget = query_target.reduce((acc, item) =>{
            let main = item[org_text];
            let rest = {...item};
            delete rest[org_text];
            Object.entries(rest).forEach(([key, value])=>{
                acc[`_${main}_${key}`] = value;
            });
            return acc;
        }, {});

        aOrg.forEach(data=>{
            let oTemp = {
                org_kor_nm: data.name,
                type: '수주',
                target: 1000000000,  
                progress: 50.00,
                month1: 100000000,
                month2: 100000000,
                month3: 100000000,
                month4: 100000000,
                month5: 100000000,
                month6: 100000000,
                month7: 100000000,
                month8: 100000000,
                month9: 100000000,
                month10: 100000000,
                month11: 100000000,
                month12: 100000000
            };
            oResult.push(oTemp);

            let iTargetSale = !oFlatPlTarget[`_`+data.id+`_target_sale_amount`] ? 0 : oFlatPlTarget[`_`+data.id+`_target_sale_amount`];
            let iSale = !oFlatPlMonthRow[`_`+data.id+`_`+month+`sale_amount_sum`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+month+`sale_amount_sum`];
            oTemp = {
                org_kor_nm: data.name,
                type: '매출',
                target: iTargetSale,
                progress: iTargetSale === 0 ? 0 : (iSale / iTargetSale) * 100,
                month1: !oFlatPlMonthRow[`_`+data.id+`_`+`01sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`01sale_amount`],
                month2: !oFlatPlMonthRow[`_`+data.id+`_`+`02sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`02sale_amount`],
                month3: !oFlatPlMonthRow[`_`+data.id+`_`+`03sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`03sale_amount`],
                month4: !oFlatPlMonthRow[`_`+data.id+`_`+`04sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`04sale_amount`],
                month5: !oFlatPlMonthRow[`_`+data.id+`_`+`05sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`05sale_amount`],
                month6: !oFlatPlMonthRow[`_`+data.id+`_`+`06sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`06sale_amount`],
                month7: !oFlatPlMonthRow[`_`+data.id+`_`+`07sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`07sale_amount`],
                month8: !oFlatPlMonthRow[`_`+data.id+`_`+`08sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`08sale_amount`],
                month9: !oFlatPlMonthRow[`_`+data.id+`_`+`09sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`09sale_amount`],
                month10: !oFlatPlMonthRow[`_`+data.id+`_`+`10sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`10sale_amount`],
                month11: !oFlatPlMonthRow[`_`+data.id+`_`+`11sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`11sale_amount`],
                month12: !oFlatPlMonthRow[`_`+data.id+`_`+`12sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`12sale_amount`]
            };
            oResult.push(oTemp);

            let iTargetMargin = !oFlatPlTarget[`_`+data.id+`_target_margin_amount`] ? 0 : oFlatPlTarget[`_`+data.id+`_target_margin_amount`];
            let iMargin = (!oFlatPlMonthRow[`_`+data.id+`_`+month+`sale_amount_sum`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+month+`sale_amount_sum`]) - (!oFlatPlMonthRow[`_`+data.id+`_`+month+`prj_prfm_amount_sum`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+month+`prj_prfm_amount_sum`]);
            oTemp = {
                org_kor_nm: data.name,
                type: '마진',
                target: iTargetMargin,
                progress: iTargetSale === 0 ? 0 : (iMargin / iTargetSale) * 100,
                month1: (!oFlatPlMonthRow[`_`+data.id+`_`+`01sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`01sale_amount`]) - (!oFlatPlMonthRow[`_`+data.id+`_`+`01prj_prfm_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`01prj_prfm_amount`]),
                month2: (!oFlatPlMonthRow[`_`+data.id+`_`+`02sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`02sale_amount`]) - (!oFlatPlMonthRow[`_`+data.id+`_`+`02prj_prfm_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`02prj_prfm_amount`]),
                month3: (!oFlatPlMonthRow[`_`+data.id+`_`+`03sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`03sale_amount`]) - (!oFlatPlMonthRow[`_`+data.id+`_`+`03prj_prfm_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`03prj_prfm_amount`]),
                month4: (!oFlatPlMonthRow[`_`+data.id+`_`+`04sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`04sale_amount`]) - (!oFlatPlMonthRow[`_`+data.id+`_`+`04prj_prfm_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`04prj_prfm_amount`]),
                month5: (!oFlatPlMonthRow[`_`+data.id+`_`+`05sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`05sale_amount`]) - (!oFlatPlMonthRow[`_`+data.id+`_`+`05prj_prfm_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`05prj_prfm_amount`]),
                month6: (!oFlatPlMonthRow[`_`+data.id+`_`+`06sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`06sale_amount`]) - (!oFlatPlMonthRow[`_`+data.id+`_`+`06prj_prfm_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`06prj_prfm_amount`]),
                month7: (!oFlatPlMonthRow[`_`+data.id+`_`+`07sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`07sale_amount`]) - (!oFlatPlMonthRow[`_`+data.id+`_`+`07prj_prfm_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`07prj_prfm_amount`]),
                month8: (!oFlatPlMonthRow[`_`+data.id+`_`+`08sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`08sale_amount`]) - (!oFlatPlMonthRow[`_`+data.id+`_`+`08prj_prfm_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`08prj_prfm_amount`]),
                month9: (!oFlatPlMonthRow[`_`+data.id+`_`+`09sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`09sale_amount`]) - (!oFlatPlMonthRow[`_`+data.id+`_`+`09prj_prfm_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`09prj_prfm_amount`]),
                month10: (!oFlatPlMonthRow[`_`+data.id+`_`+`10sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`10sale_amount`]) - (!oFlatPlMonthRow[`_`+data.id+`_`+`10prj_prfm_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`10prj_prfm_amount`]),
                month11: (!oFlatPlMonthRow[`_`+data.id+`_`+`11sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`11sale_amount`]) - (!oFlatPlMonthRow[`_`+data.id+`_`+`11prj_prfm_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`11prj_prfm_amount`]),
                month12: (!oFlatPlMonthRow[`_`+data.id+`_`+`12sale_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`12sale_amount`]) - (!oFlatPlMonthRow[`_`+data.id+`_`+`12prj_prfm_amount`] ? 0 : oFlatPlMonthRow[`_`+data.id+`_`+`12prj_prfm_amount`])
            };
            oResult.push(oTemp);

        });
        return oResult;
    });
}