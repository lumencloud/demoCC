const get_org_descendant = require('../function/get_org_descendant');

module.exports = (srv) => {
    srv.on('get_sga_result_detail_excel', async (req) => {
        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // db/ .cds 파일 'sgna' 네임스페이스 중 sga_result_with_org_view 뷰를 CQL 대상 객체로 선언
        const sga_amount_view = db.entities('sga.view').sga_amount_view;
        const common_org = db.entities('common').org;
        const common_org_3depth_view = db.entities('common.view').org_3depth_view;
        const sga_company = db.entities('sga').company_sga_org;

        const aCodeHeader = await SELECT.from(`cm.CodesHeader`).where({ category: "cost" }).columns(header => { header.codesItem(item => { item`.*` }) });
        const aCostTypes = aCodeHeader[0].codesItem;

        // cap api - function 의 인풋 파라미터 상수 선언
        const { year, org_id } = req.data;

        // DB 쿼리 실행 (병렬)
        let [aCommonOrg, aOrgStructure, query_ND_list] = await Promise.all([
            SELECT.from(common_org).columns("id", "parent", "ccorg_cd", "name", "type"),    // 기본 조직 데이터 
            SELECT.from(common_org_3depth_view).columns('div_id', 'hdqt_id', 'team_id'),    // 부문, 본부, 팀 Structure
            SELECT.from(sga_company).columns(['ccorg_cd'])
        ]);
        const ND_list = query_ND_list.map(o => o.ccorg_cd);

        const [aOrgDescendant] = await Promise.all([
            get_org_descendant(aCommonOrg, org_id),   // 선택한 조직의 하위 조직만 반환
        ]);

        // 선택한 Org의 하위 조직만 필터링
        let aFilteredOrg = aCommonOrg.filter(oCommonOrg => {
            return aOrgDescendant.map(oDescendant => oDescendant.id).includes(oCommonOrg.id)
        })

        // Ackerton Partners 하위 조직일 때 div_id를 Ackerton Partners로 변경
        aOrgStructure.forEach(oStructure => {
            if (oStructure.div_id === "6676" || oStructure.div_id === "6685") {
                oStructure.div_id = "6444";
            }
        })
        aFilteredOrg.forEach(oOrg => {
            // 조직이 팀인지 확인
            if (oOrg.type === "1414") {  // 팀일 때
                let oTeamInfo = aOrgStructure.find(oStructure => oStructure.team_id === oOrg.id);
                if (!oTeamInfo) {   // Structure에 존재하지 않는 팀일 때 Return
                    return;
                }

                oOrg.div_id = oTeamInfo.div_id;
                oOrg.hdqt_id = oTeamInfo.hdqt_id;
                oOrg.team_id = oTeamInfo.team_id;
            } else if (oOrg.type === "4044") { // skAX
                oOrg.div_id = null;
                oOrg.hdqt_id = null;
                oOrg.team_id = null;
            } else if (oOrg.type === "1796") { // 부문
                if (oOrg.parent === "6444") {  // Ackerton Partners
                    oOrg.div_id = "6444";
                    oOrg.hdqt_id = null;
                    oOrg.team_id = null;
                } else {
                    oOrg.div_id = oOrg.id;
                    oOrg.hdqt_id = null;
                    oOrg.team_id = null;
                }
            } else {  // 본부
                if (oOrg.parent === "6676" || oOrg.parent === "6685" || oOrg.parent === "6444") {  // Ackerton Partners 하위 본부들
                    oOrg.div_id = "6444";
                    oOrg.hdqt_id = oOrg.id;
                    oOrg.team_id = null;
                } else {
                    oOrg.div_id = oOrg.parent;
                    oOrg.hdqt_id = oOrg.id;
                    oOrg.team_id = null;
                }
            }
        })

        // 부문 중 Structure에 포함되지 않은 데이터 필터링
        aFilteredOrg = aFilteredOrg.filter(oOrg => {
            return aOrgStructure.map(oStructure => oStructure.div_id).includes(oOrg.div_id) === true;
        });

        // function 호출 시 입력한 조직의 정보 (id로 할지 ccorg_cd로 할지?)
        let orgInfo = aCommonOrg.find(oOrg => oOrg.id === org_id);

        // 선택한 조직의 하위 조직만 필터링
        // let aFilteredOrg = aCommonOrg.filter(oOrg => {
        //     return (oOrg.div_id === org_id || oOrg.hdqt_id === org_id || oOrg.team_id === org_id)
        //         && (oOrg.type === '1414' || oOrg.type === '1796' || oOrg.type === '6907')
        // });

        // 필터링된 데이터가 없을 때 전체 데이터 반환 (본부, 부문, 팀만 반환)
        if (aFilteredOrg.length === 0) {
            // aFilteredOrg = aCommonOrg;
        }

        // 조직 type에 따른 Select Query 설정
        const column_list = ['year', 'month', 'div_id', 'hdqt_id', 'team_id',
            'sum(labor_amount) as labor_amount', 'sum(iv_amount) as iv_amount', 'sum(exp_amount) as exp_amount'];

        const where_condition = { 'ccorg_cd': { 'not in': ND_list }, 'year': { in: [year, (Number(year) - 1).toString()] } };
        const groupBy_cols = ['year', 'month', 'div_id', 'hdqt_id', 'team_id'];

        if (orgInfo['type'] === '4044') { //전사
            var query = await SELECT.from(sga_amount_view).columns(column_list).where(where_condition).groupBy(...groupBy_cols);
        } else if (orgInfo['type'] === '1796') { // 부문조직 검색시
            var query = await SELECT.from(sga_amount_view)
                .columns(column_list)
                .where({ ...where_condition, 'div_id': org_id })
                .groupBy(...groupBy_cols);
        } else if (orgInfo['type'] === '6907') { // 본부
            var query = await SELECT.from(sga_amount_view)
                .columns(column_list)
                .where({ ...where_condition, 'hdqt_id': org_id })
                .groupBy(...groupBy_cols);
        }

        let current_y_data = query.filter(oData => oData.year === year),
            last_y_data = query.filter(oData => oData.year === year - 1);

        // function 호출 리턴 객체
        let aFinalData = [];
        aFilteredOrg.forEach((oFilteredOrg) => {
            // 부문, 본부, 팀 아니면 Return
            if (oFilteredOrg.type !== '1414' && oFilteredOrg.type !== '1796' && oFilteredOrg.type !== '6907') {
                return;
            }

            // 이미 Ackerton Partners 부문이 FinalData에 있을 시 Return
            if (oFilteredOrg.div_id === "6444" && oFilteredOrg.hdqt_id === null && oFilteredOrg.team_id === null
                && aFinalData.find(oFinalData => oFinalData.div_id === "6444" && oFinalData.hdqt_id === null && oFinalData.team_id === null)) {
                return;
            }

            // 조직에 따른 데이터 필터링
            if (oFilteredOrg.div_id === "6444" && oFilteredOrg.hdqt_id === null && oFilteredOrg.team_id === null) { // Ackerton Partners 부문 합치기
                var aCurrentData = current_y_data.filter(oCurrentData => oCurrentData.div_id === "6676" || oCurrentData.div_id === "6685");
                var aLastData = last_y_data.filter(oCurrentData => oCurrentData.div_id === "6676" || oCurrentData.div_id === "6685");
            } else if (oFilteredOrg.team_id) {
                var aCurrentData = current_y_data.filter(oCurrentData => oCurrentData.team_id === oFilteredOrg.team_id);
                var aLastData = last_y_data.filter(oCurrentData => oCurrentData.team_id === oFilteredOrg.team_id);
            } else if (oFilteredOrg.hdqt_id) {
                var aCurrentData = current_y_data.filter(oCurrentData => oCurrentData.hdqt_id === oFilteredOrg.hdqt_id);
                var aLastData = last_y_data.filter(oCurrentData => oCurrentData.hdqt_id === oFilteredOrg.hdqt_id);
            } else if (oFilteredOrg.div_id) {
                var aCurrentData = current_y_data.filter(oCurrentData => oCurrentData.div_id === oFilteredOrg.div_id);
                var aLastData = last_y_data.filter(oCurrentData => oCurrentData.div_id === oFilteredOrg.div_id);
            } else {  // div_id가 없는 경우 Return
                return;
            }

            aCostTypes.forEach(oCostType => {
                if (oCostType.value === "expense") {
                    var sAmounField = "exp_amount";
                } else if (oCostType.value === "labor") {
                    var sAmounField = "labor_amount";
                } else if (oCostType.value === "invest") {
                    var sAmounField = "iv_amount";
                }

                let oData = {
                    div_id: oFilteredOrg.div_id,
                    div_nm: aCommonOrg.find(oOrg => oOrg.id === oFilteredOrg.div_id)?.name,
                    hdqt_id: oFilteredOrg.hdqt_id || null,
                    hdqt_nm: aCommonOrg.find(oOrg => oOrg.id === oFilteredOrg.hdqt_id)?.name || null,
                    team_id: oFilteredOrg.team_id || null,
                    team_nm: aCommonOrg.find(oOrg => oOrg.id === oFilteredOrg.team_id)?.name || null,
                    type_id: oCostType.value,
                    type: oCostType.name,
                    totalCurrentYear: aCurrentData.reduce((iTotal, oCurrentData) => iTotal += oCurrentData[sAmounField], 0),
                    totalLastYear: aLastData.reduce((iTotal, oLastData) => iTotal += oLastData[sAmounField], 0),
                }

                // 월 데이터 설정
                for (let iMonth = 1; iMonth <= 12; iMonth++) {
                    // 인건비 유형과 month로 데이터 필터링
                    let iQuarter = Math.ceil(iMonth / 3);
                    let aFilteredCurrentData = aCurrentData.filter(oCurrentData => {
                        return Number(oCurrentData.month) === iMonth;
                    });

                    // 데이터 모두 합함
                    let iMonthSum = aFilteredCurrentData.reduce((iTotal, oCurrentData) => (iTotal += oCurrentData[sAmounField]), 0);
                    oData[`month${iMonth}`] = iMonthSum;
                    oData[`quarter${iQuarter}`] = (oData[`quarter${iQuarter}`] || 0) + iMonthSum;
                }

                // 조직별 올해 합계
                aFinalData.push(oData);
            })
        })

        // div_nm, hdqt_nm, team_nm, type 순으로 정렬
        let aSortFields = [
            { field: "div_nm", order: "asc" },
            { field: "hdqt_nm", order: "asc" },
            { field: "team_nm", order: "asc" },
            { field: "type", order: "asc" },
        ];
        aFinalData.sort((oItem1, oItem2) => {
            for (const { field, order } of aSortFields) {
                // 필드가 null일 때
                if (oItem1[field] === null && oItem2[field] !== null) return -1;
                if (oItem1[field] !== null && oItem2[field] === null) return 1;
                if (oItem1[field] === null && oItem2[field] === null) continue;

                const result = oItem1[field].localeCompare(oItem2[field]);
                if (result !== 0) {
                    return (order === "asc") ? result : -result;
                }
            }
            return 0;
        })

        return aFinalData;
    });
}