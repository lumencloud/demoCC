module.exports = (srv) => {
    srv.on('get_home_chart_year', async (req) => {
        /**
         * API 리턴값 담을 배열 선언
         */
        const aResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // function 입력 파라미터
        const { year, range, org_id } = req.data;

        /**
         * org_b_labor, org_opp_labor, org_total_labor
         * 확보 매출, 미확보 매출, 전체
         */
        const org_b_labor = db.entities('rsp').org_b_labor;
        const org_opp_labor = db.entities('rsp').opp_labor;
        const org_total_labor = db.entities('rsp').org_total_labor;

        /**
         * amount_view
         * 매출 및 원가 데이터
         */
        const amount_view = db.entities('pl.view').amount_view;

        /**
         * amount_view
         * sgna 매출 및 원가 데이터
         */
        const wideview_unpivot = db.entities('sga.view').wideview_unpivot;

        /**
         * common.org [조직정보]
         * 조직구조 테이블
         */
        const org_full_level = db.entities('common.view').org_full_level;
        
        // DB 쿼리 실행 (병렬)
        const [aCommonOrg] = await Promise.all([
            SELECT.from(org_full_level).where`lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id}`
        ]);
        let aFilteredOrgCcorg = aCommonOrg.map(oData => oData.org_ccorg_cd);

        // Bill 데이터
        let aBillField = [];
        for (let i = 1; i <= 12; i++) {
            aBillField.push(`sum(ifnull(bill_m${i}_amt,0))`);
        }
        let sBillField = aBillField.join(" + ") + " as amount";
        const bill_column = ["year", sBillField];

        // opp 테이블 컬럼
        let aOppField = [];
        for (let i = 1; i <= 12; i++) {
            aOppField.push(`sum(ifnull(opp_m${i}_amt,0))`);
        }
        let sOppField = aOppField.join(" + ") + " as amount";
        const opp_column = ["year", sOppField];

        // Total 데이터
        let aTotalFied = [];
        for (let i = 1; i <= 12; i++) {
            aTotalFied.push(`sum(ifnull(total_m${i}_amt,0))`);
        }
        let sTotalFied = aTotalFied.join(" + ") + " as amount";
        const total_column = ["year", sTotalFied];

        // 마진 컬럼
        const margin_column = ["year", "sum(sale_amount_sum) as sale", "sum(prj_prfm_amount_sum) as cos"];

        // 공헌이익 컬럼
        const sga_column = [
            "year",
            "ifnull(sum(labor_amount),0) as labor",
            "ifnull(sum(iv_amount),0) as invest",
            "ifnull(sum(exp_amount),0) as expense",
            "(ifnull(sum(labor_amount),0) + ifnull(sum(iv_amount),0) + ifnull(sum(exp_amount),0)) as amount"
        ];

        // 데이터 호출
        const [aBillData, aOppData, aTotalData, aAmountData, aSgaData] = await Promise.all([
            SELECT.from(org_b_labor).columns(bill_column).where({ ccorg_cd: { in: aFilteredOrgCcorg } }).groupBy("year"),
            SELECT.from(org_opp_labor).columns(opp_column).where({ ccorg_cd: { in: aFilteredOrgCcorg } }).groupBy("year"),
            SELECT.from(org_total_labor).columns(total_column).where({ ccorg_cd: { in: aFilteredOrgCcorg } }).groupBy("year"),

            SELECT.from(amount_view).columns(margin_column).where({ ccorg_cd: { in: aFilteredOrgCcorg }, month: "12" }).groupBy("year"),
            SELECT.from(wideview_unpivot).columns(sga_column).where({ ccorg_cd: { in: aFilteredOrgCcorg } }).groupBy("year"),
        ]);

        for (let i = range - 1; i >= 0; i--) {
            let iYear = parseInt(year) - i;

            // 확보 및 미확보 매출 (카드 2.1.1)
            let iBill = aBillData.find(oData => oData.year == iYear)?.amount || 0;
            let iOpp = aOppData.find(oData => oData.year == iYear)?.amount || 0;
            let iSumSale = iBill + iOpp;

            let iLastBill = aBillData.find(oData => oData.year == iYear - 1)?.amount || 0;
            let iLastOpp = aOppData.find(oData => oData.year == iYear - 1)?.amount || 0;
            let iLastSumSale = iLastBill + iLastOpp;
            let iSaleYoY = (iLastSumSale === 0) ? 0 : ((iSumSale - iLastSumSale) / iLastSumSale * 100).toFixed(2);

            // 마진 (카드 2.1.2)
            let iSale = aAmountData.find(oData => oData.year == iYear)?.sale || 0;
            let iCos = aAmountData.find(oData => oData.year == iYear)?.cos || 0;
            let iMargin = iSale - iCos;

            let iLastSale = aAmountData.find(oData => oData.year == iYear - 1)?.sale || 0;
            let iLastCos = aAmountData.find(oData => oData.year == iYear - 1)?.cos || 0;
            let iLastMargin = iLastSale - iLastCos;
            let iMarginYoY = (iLastMargin === 0) ? 0 : ((iMargin - iLastMargin) / iLastMargin * 100).toFixed(2);

            // 공헌이익 (마진 - sgna) (카드 2.1.3)
            let iCont = iMargin - (aSgaData.find(oData => oData.year == iYear)?.amount || 0);
            let iLastCont = iLastMargin - (aSgaData.find(oData => oData.year == iYear)?.amount || 0);
            let iContYoY = (iLastCont === 0) ? 0 : ((iCont - iLastCont) / iLastCont * 100).toFixed(2);

            // 투입 대비 매출 추이 (카드 3.2)
            let iLabor = aSgaData.find(oData => oData.year == iYear)?.labor || 0;
            let iInvest = aSgaData.find(oData => oData.year == iYear)?.invest || 0;

            // 투입 대비 BR, RoHC 추이 (카드 3.3)
            let iTotal = aTotalData.find(oData => oData.year == iYear)?.amount || 0;
            let iBr = (iTotal === 0) ? 0 : ((iBill + iOpp) / iTotal * 100).toFixed(2);
            let iRohc = (iLabor === 0) ? 0 : (iCont / iLabor).toFixed(2);

            aResult.push({
                year: iYear,
                bill: iBill,
                opp: iOpp,
                sale_yoy: iSaleYoY,

                margin: iMargin,
                margin_yoy: iMarginYoY,

                cont: iCont,
                cont_yoy: iContYoY,

                labor: iLabor,
                invest: iInvest,
                sale: iSale,

                br: iBr,
                rohc: iRohc,
            })
        }

        return aResult;
    });
}