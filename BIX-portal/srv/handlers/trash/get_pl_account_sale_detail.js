const get_org_descendant = require('../function/get_org_descendant');

module.exports = (srv) => {
    srv.on('get_pl_account_sale_detail', async (req) => {
        /**
         * API 리턴값 담을 배열 선언
         */
        const aResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // function 입력 파라미터
        const { year, month } = req.data;

        const common_account = db.entities('common').account_view;
        // DB 쿼리 실행 (병렬)
        const [aAccount] = await Promise.all([
            SELECT.from(common_account).columns("code", "name").orderBy("sort_order"),
        ]);
        
        let aTest = aAccount.map(oAccount => {
            oAccount.sale = String(oAccount.code).length * String(oAccount.name).length * 1000;
            oAccount.margin = String(oAccount.code).length * String(oAccount.name).length * 500;
            oAccount.contract = String(oAccount.code).length * String(oAccount.name).length * 1000;
            
            oAccount.target = oAccount.sale * 0.8;
            oAccount.confirmedSale = oAccount.sale - 3000;
            oAccount.progress = (oAccount.confirmedSale / oAccount.target * 100).toFixed(2);

            return oAccount;
        })
        return aTest;







        /**
         * amount_view
         * 매출 및 원가 데이터
         */
        const amount_view = db.entities('pl.view').amount_view;

        /**
         * amount_view
         * sgna 매출 및 원가 데이터
         */
        // const sga_result_view = db.entities('sgna').sga_result_view;
        const sga_amount_view = db.entities('sga.view').sga_amount_view;

        /**
         * common.org [조직정보]
         * 조직구조 테이블
         */
        const common_org = db.entities('common').org;

        /**
         * mis_com_org [조직정보]
         * 옛날 조직구조 테이블
         */
        const mis_com_org = db.entities('common').mis_com_org;

        // DB 쿼리 실행 (병렬)
        const [aCommonOrg] = await Promise.all([
            SELECT.from(common_org),
        ]);
        let aFilteredOrgCcorg = get_org_descendant(aCommonOrg, org_id).map(oData => oData.ccorg_cd);

        // ccorg_cd 기준
        const [aMisOrg] = await Promise.all([
            SELECT.from(mis_com_org).columns(["id"]).where({ ccorg_cd: { in: aFilteredOrgCcorg } }),
        ]);
        let aFilteredOrgId = aMisOrg.map(oData => oData.id);

        // Bill 데이터
        let aBillField = [];
        for (let i = 1; i <= 12; i++) {
            aBillField.push(`sum(bill_m${i}_amt)`);
        }
        let sBillField = aBillField.join(" + ") + " as amount";
        const bill_column = ["year", sBillField];

        // opp 테이블 컬럼
        let aOppField = [];
        for (let i = 1; i <= 12; i++) {
            aOppField.push(`sum(opp_m${i}_amt)`);
        }
        let sOppField = aOppField.join(" + ") + " as amount";
        const opp_column = ["year", sOppField];

        // Total 데이터
        let aTotalFied = [];
        for (let i = 1; i <= 12; i++) {
            aTotalFied.push(`sum(total_m${i}_amt)`);
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

        const [aBillData, aOppData, aTotalData, aAmountData, aSgaData] = await Promise.all([
            SELECT.from(org_b_labor).columns(bill_column).where({ org_id: { in: aFilteredOrgId }, month: "12" }).groupBy("year"),
            SELECT.from(org_opp_labor).columns(opp_column).where({ org_id: { in: aFilteredOrgId } }).groupBy("year"),
            SELECT.from(org_total_labor).columns(total_column).where({ org_id: { in: aFilteredOrgId }, month: "12" }).groupBy("year"),
            SELECT.from(amount_view).columns(margin_column).where({ ccorg_cd: { in: aFilteredOrgCcorg }, month: "12" }).groupBy("year"),
            SELECT.from(sga_amount_view).columns(sga_column).where({ ccorg_cd: { in: aFilteredOrgCcorg } }).groupBy("year"),
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