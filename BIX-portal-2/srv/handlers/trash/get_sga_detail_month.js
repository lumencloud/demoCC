module.exports = (srv) => {
    srv.on('get_sga_detail_month', async (req) => {
        // function 호출 리턴 객체
        let aRes = [];

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

        function getMonth(data){
            let iEnd = parseInt(data);
            let aResult = [];
            for(let i = 1 ; i <= iEnd; i++){
                aResult.push(i.toString().padStart(2,'0'));
            };
            return aResult;
        };
        const aMonth = getMonth(month);
        // console.log(aMonth)
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
        const where_condition = { 'year': { in: [year, last_year] }, 'month': {'between': '01', 'and': month}, 'ccorg_cd': { 'not in': ND_list } }; // nd 도 조회되도록 조건제거 'type': '사업',
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

        // 검색 조직의 레벨에 맞게 쿼리 실행
        if (orgInfo['type'] === hdqtCode) { // 본부
            query = await SELECT.from(sga_view)
                .columns([...column_list, 'hdqt_id'])
                .where({ ...where_condition, 'hdqt_id': org_id })
                .groupBy(...groupBy_cols, 'hdqt_id')
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
        }

        // 올해, 작년데이터 구분
        let current_y_data = query.filter(o => o.year === year),
            last_y_data = query.filter(o => o.year === last_year);
        const emptyData = {
            labor_amount: 0,
            labor_amount_sum: 0,
            iv_amount: 0,
            iv_amount_sum: 0,
            exp_amount: 0,
            exp_amount_sum: 0,
            month_sum: 0,
        }

        // 본부 조회시 본부 집계 내용만 화면 출력처리
        if (orgInfo['type'] === hdqtCode) {
            let total_data=[], total_data_last_y=[];
            aMonth.forEach(data =>{
                let oTemp = { ...emptyData, year: year, month:data, div_id: org_query.find(o => o.id === orgInfo.parent)["id"], hdqt_id: org_id };
                let oTemp2 = { ...emptyData, year: last_year, month:data, div_id: org_query.find(o => o.id === orgInfo.parent)["id"], hdqt_id: org_id };
                total_data.push(oTemp);
                total_data_last_y.push(oTemp2);
            });
            
            total_data.forEach(data =>{
                for (const row of current_y_data) {
                    if(data.month === row.month){
                        data["labor_amount"] += row["labor_amount"];
                        data["labor_amount_sum"] += row["labor_amount_sum"];
                        data["iv_amount"] += row["iv_amount"];
                        data["iv_amount_sum"] += row["iv_amount_sum"];
                        data["exp_amount"] += row["exp_amount"];
                        data["exp_amount_sum"] += row["exp_amount_sum"];
                        data["month_sum"] += (row["labor_amount"] + row["iv_amount"] + row["exp_amount"]);
                    }
                }
            })

            total_data_last_y.forEach(data =>{
                for (const row of last_y_data) {
                    if(data.month === row.month){
                        data["labor_amount"] += row["labor_amount"];
                        data["labor_amount_sum"] += row["labor_amount_sum"];
                        data["iv_amount"] += row["iv_amount"];
                        data["iv_amount_sum"] += row["iv_amount_sum"];
                        data["exp_amount"] += row["exp_amount"];
                        data["exp_amount_sum"] += row["exp_amount_sum"];
                        data["month_sum"] += (row["labor_amount"] + row["iv_amount"] + row["exp_amount"]);
                    }
                }
            })
           
            total_data.forEach(data =>{
                total_data_last_y.forEach(data2 =>{
                    if(data.month === data2.month){
                        data.last_year_month_sum = data2.month_sum;
                        data.yoy = !data2.month_sum ? 0 : data2.month_sum / data2.month_sum * 100;
                    }
                })
            })

            aRes = total_data.slice();
        } else if (orgInfo['type'] === divCode || orgInfo['type'] === entCode) {
            // 전사, 부문 합
            let total_data=[], total_data_last_y=[];
            if (orgInfo['type'] === divCode) {
                aMonth.forEach(data =>{
                    let oTemp = { ...emptyData, year: year, month:data, div_id: org_id };
                    let oTemp2 = { ...emptyData, year: last_year, month:data, div_id: org_id };
                    total_data.push(oTemp);
                    total_data_last_y.push(oTemp2);
                });
            } else {
                aMonth.forEach(data =>{
                    let oTemp = { ...emptyData, year: year, month:data };
                    let oTemp2 = { ...emptyData, year: last_year, month:data };
                    total_data.push(oTemp);
                    total_data_last_y.push(oTemp2);
                });
            }
            total_data.forEach(data =>{
                for (const row of current_y_data) {
                    if(data.month === row.month){
                        data["labor_amount"] += row["labor_amount"];
                        data["labor_amount_sum"] += row["labor_amount_sum"];
                        data["iv_amount"] += row["iv_amount"];
                        data["iv_amount_sum"] += row["iv_amount_sum"];
                        data["exp_amount"] += row["exp_amount"];
                        data["exp_amount_sum"] += row["exp_amount_sum"];
                        data["month_sum"] += (row["labor_amount"] + row["iv_amount"] + row["exp_amount"]);
                    }
                }
            })

            total_data_last_y.forEach(data =>{
                for (const row of last_y_data) {
                    if(data.month === row.month){
                        data["labor_amount"] += row["labor_amount"];
                        data["labor_amount_sum"] += row["labor_amount_sum"];
                        data["iv_amount"] += row["iv_amount"];
                        data["iv_amount_sum"] += row["iv_amount_sum"];
                        data["exp_amount"] += row["exp_amount"];
                        data["exp_amount_sum"] += row["exp_amount_sum"];
                        data["month_sum"] += (row["labor_amount"] + row["iv_amount"] + row["exp_amount"]);
                    }
                }
            })
           
            total_data.forEach(data =>{
                total_data_last_y.forEach(data2 =>{
                    if(data.month === data2.month){
                        data.last_year_month_sum = data2.month_sum;
                        data.yoy = !data2.month_sum ? 0 : data2.month_sum / data2.month_sum * 100;
                    }
                })
            })
            aRes = total_data.slice();
        }

        return aRes;
    })
}