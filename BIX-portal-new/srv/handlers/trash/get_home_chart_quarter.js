const get_org_descendant = require('../function/get_org_descendant');

module.exports = (srv) => {
    srv.on('get_home_chart_quarter', async (req) => {
        /**
         * API 리턴값 담을 배열 선언
         */
        const aResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // function 입력 파라미터
        const { year, month, org_id } = req.data;

        /////////////////////////기존 로직
        // /**
        //  * amount_view
        //  * 매출 및 원가 데이터
        //  */
        // const amount_view = db.entities('pl.view').amount_view;
        // const mis_esmt_exe = db.entities("common").mis_esmt_exe;

        // /**
        //  * common.org [조직정보]
        //  * 조직구조 테이블
        //  */
        // const common_org = db.entities('common').org;

        // // DB 쿼리 실행 (병렬)
        // const [aCommonOrg] = await Promise.all([
        //     SELECT.from(common_org),
        // ]);
        // let aFilteredOrgCcorg = get_org_descendant(aCommonOrg, org_id).map(oData => oData.ccorg_cd);

        // /**
        //  * mis_com_org [조직정보]
        //  * 옛날 조직구조 테이블
        //  */
        // const mis_com_org = db.entities('common').mis_com_org;

        // // ccorg_cd 기준
        // const [aMisOrg] = await Promise.all([
        //     SELECT.from(mis_com_org).columns(["id"]).where({ ccorg_cd: { in: aFilteredOrgCcorg } }),
        // ]);
        // let aFilteredOrgId = aMisOrg.map(oData => oData.id);

        // // 마진 컬럼
        // const margin_column = ["year", "month", "sum(prj_prfm_amount) as cos"];
        // const margin_filter = { ccorg_cd: { in: aFilteredOrgCcorg }, year: { in: [year, year - 1] } };
        // const exe_filter = { sale_org_rid: { in: aFilteredOrgId } };
        // let exe_column = ["rodr_esmt_ym"];
        // for (let i = 1; i <= 12; i++) {
        //     exe_column.push(`sum(sale_n${i}_mm_amt) as sale${i}`);
        //     exe_column.push(`sum(prj_prfm_n${i}_mm_amt) as cos${i}`);
        // }

        // const [aAmountData, aExeData] = await Promise.all([
        //     SELECT.from(amount_view).columns(margin_column).where(margin_filter).groupBy("year", "month"),
        //     SELECT.from(mis_esmt_exe).columns(exe_column).where(exe_filter).groupBy("rodr_esmt_ym"),    // 추정치
        // ]);

        // for (let i = 3; i > 0; i--) {
        //     let iYear = new Date(year, month - i).getFullYear();
        //     let iMonth = new Date(year, month - i).getMonth() + 1;

        //     // 기초원가(비용)
        //     let iCos = aAmountData.find(oData => oData.year == iYear && oData.month == iMonth)?.cos || 0;

        //     // 연 추정치
        //     let oTotalData = aExeData.find(oData => oData.rodr_esmt_ym == `${iYear}00`);
        //     let iTotal = 0;
        //     if (oTotalData) {
        //         for (let i = 1; i <= 12; i++) {
        //             iTotal += (oTotalData[`sale${i}`] - oTotalData[`cos${iMonth}`]);
        //         }
        //     }

        //     // 월 추정치
        //     let oMonthData = aExeData.find(oData => oData.rodr_esmt_ym == `${iYear}${String(iMonth).padStart(2, "0")}`);
        //     let iMonthTotal = 0;
        //     if (oMonthData) {
        //         for (let i = 1; i <= 12; i++) {
        //             iMonthTotal += (oMonthData[`sale${i}`] - oMonthData[`cos${iMonth}`]);
        //         }
        //     }

        //     let iRate = (iTotal === 0) ? 0 : Math.floor(((iMonthTotal - iTotal) / iTotal) * 100);

        //     aResult.push({
        //         year: iYear,
        //         month: iMonth,
        //         cos: iCos,
        //         rate: 0
        //     })
        // }
        /////////////////////////기존 로직

        /////////////////////////신규 로직(데이터가 없어 아직 제대로 테스트 못함. 일단 돌아는 감.)
        const pl_view = db.entities('pl.view').amount_view;
        const org_view = db.entities('common').org;

        /**
         * 전사 부문 본부 팀 TYPE 코드
         * [To-Be] 인터페이스 코드 버전관리로 동적 매핑 구현 필요!!!!!!!!!!!!!
         */
        const entCode = "4044",
        divCode = '1796',
        hdqtCode = '6907',
        teamCode = '1414';

        /**
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본무 조건별 추가)
         */
        const pl_col_list = [
            'year', 'month', 'sum(prj_prfm_amount) as prj_prfm_amount'];
        let sPastMonth = [];
        let sPastYear;
        if(parseInt(month) === 2){
            sPastMonth.push("12");
            sPastMonth.push("01");
            sPastMonth.push("02");
            sPastYear = (year -1).toString();
        }else if(parseInt(month) === 1){
            sPastMonth.push("11");
            sPastMonth.push("12");
            sPastMonth.push("01");
            sPastYear = (year -1).toString();
        }else{
            for(let i = parseInt(month)-2 ; i <= parseInt(month) ; i++){
                sPastMonth.push(i.toString().padStart(2,'0'));
            };
        };
        let pl_where_conditions
        if(sPastYear){
            pl_where_conditions = { 'year': { in: [year, `${sPastYear}`] }, 'month': {in: sPastMonth}, 'div_id': {'!=': null} };
        }else{
            pl_where_conditions = { 'year': { in: [year] }, 'month': {in: sPastMonth}, 'div_id': {'!=': null} };
        }
        // const pl_where_conditions = { 'year': { in: [year] }, 'month': {'between': sPastMonth, 'and': month}, 'div_id': {'!=': null} };
        const pl_groupBy_cols = ['year', 'month'];

        let aBaseData = [];
        if(sPastYear){
            sPastMonth.forEach(data =>{
                let oTemp;
                if(data.startsWith('1')){
                    oTemp = {
                        year: sPastYear,
                        month: data,
                        cos: 0,
                        rate: 0
                    };
                }else{
                    oTemp = {
                        year: year,
                        month: data,
                        cos: 0,
                        rate: 0
                    };
                };
                aBaseData.push(oTemp)
            });
        }else{
            sPastMonth.forEach(data =>{
                let oTemp = {
                    year: year,
                    month: data,
                    cos: 0,
                    rate: 0
                };
                aBaseData.push(oTemp)
            });
        };
// console.log('aBaseData', aBaseData)

        let org_query = await SELECT.from(org_view).columns('id', 'parent', 'type', 'name');
        if (org_query.length < 1) return; // 예외처리 추가 필요 throw error
        let orgInfo = org_query.find(e => e.id === org_id);

        let pl_column = pl_col_list;
        let pl_where = pl_where_conditions
        let pl_groupBy = pl_groupBy_cols;

        if(orgInfo["type"] === entCode){// 전사
            org_text = 'div_id';
            pl_column = [...pl_column, 'div_id'];
            pl_groupBy = [...pl_groupBy, 'div_id'];
            pl_orderBy = ['div_id', 'year', 'month'];
        } else if (orgInfo["type"] === divCode) {   // 부문
            org_text = 'hdqt_id';
            pl_column = [...pl_column, 'hdqt_id'];
            pl_where = {...pl_where, div_id : org_id };
            pl_groupBy = [...pl_groupBy, 'hdqt_id'];
            pl_orderBy = ['hdqt_id', 'year', 'month'];
        } else if (orgInfo["type"] === hdqtCode) {  // 본부
            org_text = 'team_id';
            pl_column = [...pl_column, 'team_id']
            pl_where = {...pl_where, hdqt_id : org_id }
            pl_groupBy = [...pl_groupBy, 'team_id']
            pl_orderBy = ['team_id', 'year', 'month'];
        } else {
            return; // 예외처리 필요!!
        };

        // DB 쿼리 실행 (병렬)
        const [query] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy).orderBy(['year', 'month']),
        ]);
// console.log('query',query);

        aBaseData.forEach(data=>{
            let oMatch = query.find(data2=> data2.month === data.month);
            if(oMatch){
                data.cos = oMatch.prj_prfm_amount;
            };
        });
        aResult.push(...aBaseData);
// console.log('aResult',aResult);
        /////////////////////////신규 로직

        return aResult;
    });
}