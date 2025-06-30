module.exports = (srv) => {
    srv.on('get_sga_detail_org', async (req) => {
        // function 호출 리턴 객체
        const aRes = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');
        // db/ .cds 파일 'sgna' 네임스페이스 중 sga_result_with_org_view 뷰를 CQL 대상 객체로 선언
        const sga_view = db.entities('sga.view').sga_amount_view;
        const org_view = db.entities('common').org;

        /**
        * 전사 구분 ccorg_cd 목록
        */
        const sga_company = db.entities('sga').company_sga_org;
        const query_ND_list = await SELECT.from(sga_company).columns(['ccorg_cd']);
        const ND_list = query_ND_list.map(o => o.ccorg_cd);

        // cap api - function 의 인풋 파라미터 상수 선언
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

        // SELECT 공통 조회조건
        const column_list = [
            'year', 'month', 'div_id', 'sum(labor_amount) as labor_amount', 'sum(labor_amount_sum) as labor_amount_sum',
            'sum(iv_amount) as iv_amount', 'sum(iv_amount_sum) as iv_amount_sum',
            'sum(exp_amount) as exp_amount', 'sum(exp_amount_sum) as exp_amount_sum'
        ];
        const where_condition = { 'year': { in: [year, last_year] }, 'month': month, 'ccorg_cd': { 'not in': ND_list } }; // nd 도 조회되도록 조건제거 'type': '사업',
        const groupBy_cols = ['year', 'month', 'div_id'];

        // function 로직처리에 필요한 조직정보 select
        let org_query = await SELECT.from(org_view).columns('id', 'parent', 'type', 'name');
        if (org_query.length < 1) return; // [to-do] 예외처리 추가 필요 throw error

        // function 호출 시 입력한 조직의 정보
        let orgInfo = org_query.find(o => o.id === org_id);
        if (org_id === 'test') orgInfo = org_query.find(o => o.type === entCode);
        if (!orgInfo) return;

        // sg&a 쿼리 객체
        let query;
        let aTemp = [];

        // sg&a 조회 데이터 올해, 작년 비교계산 후 api 결과값 push 함수
        const _calc_sga_data = async (query, last_y_query, type, bTop) => {

            const lastKeyMap = {
                labor_amount: 'labor_amount_last_y',
                labor_amount_sum: 'labor_amount_sum_last_y',
                iv_amount: 'iv_amount_last_y',
                iv_amount_sum: 'iv_amount_sum_last_y',
                exp_amount: 'exp_amount_last_y',
                exp_amount_sum: 'exp_amount_sum_last_y'
            }
            let oCurrent = query[0];
            let oLast = Object.fromEntries(Object.entries(last_y_query[0]).map(([key, value]) => [lastKeyMap[key] || key, value]));
            const oRow = { ...oCurrent, ...oLast };
            let level1_text, level2_text = null;
            if (type === hdqtCode) {
                let org_info = org_query.find(o => o.id === oRow['div_id']);
                level1_text = org_info["name"];
                let org_info2 = org_query.find(o => o.id === oRow['hdqt_id']);
                level2_text = org_info2["name"];
            } else if (type === entCode) {
                if (bTop) {
                    let org_info = org_query.find(o => o.type === type);
                    level1_text = org_info["name"];
                } else {
                    let org_info = org_query.find(o => o.type === type);
                    level1_text = org_info["name"];
                    let org_info2 = org_query.find(o => o.id === oRow['div_id']);
                    level2_text = org_info2["name"];
                };
            } else if (type === divCode) {
                if (bTop) {
                    let org_info = org_query.find(o => o.id === oRow['div_id']);
                    level1_text = org_info["name"];
                } else {
                    if (!oRow['hdqt_id']) return;  // 부문 아래 팀인 경우 본부 정보 없어서 제외
                    let org_info = org_query.find(o => o.id === oRow['div_id']);
                    level1_text = org_info["name"];
                    let org_info2 = org_query.find(o => o.id === oRow['hdqt_id']);
                    level2_text = org_info2["name"];
                };
            };

            let oResult = {
                level1: level1_text,
                level2: level2_text,
                labor: oRow["labor_amount"],
                invest: oRow["iv_amount"],
                expense: oRow["exp_amount"],
                sum: (oRow["labor_amount"]+oRow["iv_amount"]+oRow["exp_amount"]),
                cumSum:0
            };

            aTemp.push(oResult);
        };

        // 검색 조직의 레벨에 맞게 쿼리 실행
        if (orgInfo['type'] === hdqtCode) { // 본부
            query = await SELECT.from(sga_view)
                .columns([...column_list, 'hdqt_id'])
                .where({ ...where_condition, 'hdqt_id': org_id })
                .groupBy(...groupBy_cols, 'hdqt_id');
        } else if (orgInfo['type'] === divCode) { // 부문조직 검색시
            query = await SELECT.from(sga_view)
                .columns([...column_list, 'hdqt_id'])
                .where({ ...where_condition, 'div_id': org_id })
                .groupBy(...groupBy_cols, 'hdqt_id');
        } else if (orgInfo['type'] === entCode && org_id === 'test') { // 테스트 조직 대상
            query = await SELECT.from(sga_view).columns(column_list)
                .where({ ...where_condition, 'div_id': { in: ['6589', '6286', '6193'] }, and: { 'hdqt_id': { in: ['6590', '6287', '6629'] }, or: { 'hdqt_id': null } } })
                .groupBy(...groupBy_cols);
        } else if (orgInfo['type'] === entCode && org_id !== 'test') { //전사
            query = await SELECT.from(sga_view).columns(column_list).where(where_condition).groupBy(...groupBy_cols);
        };

        // 올해, 작년데이터 구분
        let current_y_data = query.filter(o => o.year === year),
            last_y_data = query.filter(o => o.year === last_year);
        const emptyData = {
            month: month,
            labor_amount: 0,
            labor_amount_sum: 0,
            iv_amount: 0,
            iv_amount_sum: 0,
            exp_amount: 0,
            exp_amount_sum: 0
        };

        // 본부 조회시 본부 집계 내용만 화면 출력처리
        if (orgInfo['type'] === hdqtCode) {
            if (!current_y_data.length) current_y_data = [{ ...emptyData, year: year, div_id: org_query.find(o => o.id === orgInfo.parent)["id"], hdqt_id: org_id }];
            if (!last_y_data.length) last_y_data = [{ ...emptyData, year: last_year, div_id: org_query.find(o => o.id === orgInfo.parent)["id"], hdqt_id: org_id }];
            await _calc_sga_data(current_y_data, last_y_data, orgInfo['type']);
        } else if (orgInfo['type'] === divCode || orgInfo['type'] === entCode) {
            // 전사, 부문 조회시 전사, 부문 합 처리 후 하위 조직 처리
            if (!current_y_data.length) current_y_data = [{ ...emptyData, year: year }];
            if (!last_y_data.length) last_y_data = [{ ...emptyData, year: last_year }];

            // 전사, 부문 합
            let total_data, total_data_last_y;
            if (orgInfo['type'] === divCode) {
                total_data = { ...emptyData, year: year, div_id: org_id }, total_data_last_y = { ...emptyData, year: last_year, div_id: org_id }
            } else {
                total_data = { ...emptyData, year: year }, total_data_last_y = { ...emptyData, year: last_year }
            }
            for (const row of current_y_data) {
                total_data["labor_amount"] += row["labor_amount"];
                total_data["labor_amount_sum"] += row["labor_amount_sum"];
                total_data["iv_amount"] += row["iv_amount"];
                total_data["iv_amount_sum"] += row["iv_amount_sum"];
                total_data["exp_amount"] += row["exp_amount"];
                total_data["exp_amount_sum"] += row["exp_amount_sum"];
            }
            for (const row of last_y_data) {
                total_data_last_y["labor_amount"] += row["labor_amount"];
                total_data_last_y["labor_amount_sum"] += row["labor_amount_sum"];
                total_data_last_y["iv_amount"] += row["iv_amount"];
                total_data_last_y["iv_amount_sum"] += row["iv_amount_sum"];
                total_data_last_y["exp_amount"] += row["exp_amount"];
                total_data_last_y["exp_amount_sum"] += row["exp_amount_sum"];
            }


            await _calc_sga_data([total_data], [total_data_last_y], orgInfo['type'], true);

            // 하위 조직 빈값 처리 후 화면출력 처리
            if (orgInfo['type'] === entCode) {
                // 전사 조회시 전체 부문 목록에 빈값 채움
                let divisions;
                if (org_id === 'test') {
                    divisions = org_query.filter(o => o.type === divCode && (o.id === '6589' || o.id === '6286' || o.id === '6193'));
                } else {
                    divisions = org_query.filter(o => o.type === divCode);
                }
                for (const div of divisions) {
                    let div_data = current_y_data.filter(o => o.div_id === div.id);
                    let div_data_last_y = last_y_data.filter(o => o.div_id === div.id);

                    if (!div_data.length) div_data = [{ ...emptyData, year: year, div_id: div.id }];
                    if (!div_data_last_y.length) div_data_last_y = [{ ...emptyData, year: last_year, div_id: div.id }];

                    await _calc_sga_data(div_data, div_data_last_y, orgInfo['type']);
                }
            } else {
                let headquaters = org_query.filter(o => o.type === hdqtCode && o.parent === org_id);
                for (const hdqt of headquaters) {
                    let hdqt_data = current_y_data.filter(o => o.hdqt_id === hdqt.id);
                    let hdqt_data_last_y = last_y_data.filter(o => o.hdqt_id === hdqt.id);

                    if (!hdqt_data.length) hdqt_data = [{ ...emptyData, year: year, div_id: org_id, hdqt_id: hdqt.id }];
                    if (!hdqt_data_last_y.length) hdqt_data_last_y = [{ ...emptyData, year: last_year, div_id: org_id, hdqt_id: hdqt.id }];

                    await _calc_sga_data(hdqt_data, hdqt_data_last_y, orgInfo['type']);
                }
            }
        }

        let aTemp2 = aTemp.filter(data => data.level2).sort((a,b)=>b.sum - a.sum);
        for(let i = 0 ; i < aTemp2.length ; i++){
            if(i === 0){
                aTemp2[i].cumSum = aTemp2[i].sum;
            }else{
                aTemp2[i].cumSum = aTemp2[i-1].cumSum + aTemp2[i].sum
            };
        };

        for(let i = 0 ; i < aTemp2.length ; i++){
            aTemp2[i].rate = !aTemp2[aTemp2.length-1].cumSum ? 0 : aTemp2[i].cumSum / aTemp2[aTemp2.length-1].cumSum *100
        };
        aRes.push(...aTemp2)
        return aRes;
    })
}