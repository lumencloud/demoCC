const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_actual_pl', async (req) => {
        /**
         * 핸들러 초기에 권한체크
         */
        await check_user_auth(req);

        /**
         * API 리턴값 담을 배열 선언
         */
        const oResult = [];

        // cds 모듈을 통한 DB 커넥트
        const db = await cds.connect.to('db');

        // =========================== 조회 대상 DB 테이블 ===========================
        // entities('<cds namespace 명>').<cds entity 명>
        // srv .cds 에 using from 구문에 엔티티가 속한 db .cds 파일이 최소 한 번이라도 걸려있어야 db.entities 로 엔티티 인식가능
        // (서비스에 등록할 필요는 없음)
        /**
         * org_target_sum_view
         * 조직 별 목표금액
         */
        const target = db.entities('common').org_target_sum_view;

        /**
         * pl_wideview_org_view [실적]
         */
        const pl_view = db.entities('pl').wideview_org_view;
        /**
         * wideview_view [sg&a 집계]
         */
        const sga_view = db.entities('sga').wideview_view;
        /**
         * common_org_full_level_view [조직정보]
         */
        const org_full_level = db.entities('common').org_full_level_view;

        // =================================================================================

        // function 입력 파라미터
        const { year, month, org_id } = req.data;
        const last_year = (Number(year) - 1).toString();

        // QUERY 공통 파라미터 선언
        /**
         * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
         */

        let a_sale_column = [];
        let a_sale_total_column = [];
        let a_margin_column = [];
        let a_margin_total_column = [];
        let a_sga_column = [];
        let a_sga_total_column = [];
        for (let i = 1; i <= 12; i++) {
            if (i <= Number(month)) {
                a_sale_column.push(`ifnull(sum(sale_m${i}_amt), 0)`)
                a_margin_column.push(`ifnull(sum(margin_m${i}_amt), 0)`)
                a_sga_column.push(`ifnull(sum(labor_m${i}_amt), 0)+ifnull(sum(exp_m${i}_amt), 0)+ifnull(sum(iv_m${i}_amt), 0)`)
            };
            a_sale_total_column.push(`ifnull(sum(sale_m${i}_amt), 0)`)
            a_margin_total_column.push(`ifnull(sum(margin_m${i}_amt), 0)`)
            a_sga_total_column.push(`ifnull(sum(labor_m${i}_amt), 0)+ifnull(sum(exp_m${i}_amt), 0)+ifnull(sum(iv_m${i}_amt), 0)`)
        };

        let s_sale_column = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
        let s_sale_total_column = "(" + a_sale_total_column.join(' + ') + ') as sale_total_amount_sum';
        let s_margin_column = "(" + a_margin_column.join(' + ') + ') as margin_amount_sum';
        let s_margin_total_column = "(" + a_margin_total_column.join(' + ') + ') as margin_total_amount_sum';
        let s_sga_column = "(" + a_sga_column.join(' + ') + ') as sga_amount_sum';
        let s_sga_total_column = "(" + a_sga_total_column.join(' + ') + ') as sga_total_amount_sum';

        const pl_col_list = ['year', s_sale_column, s_margin_column, s_sale_total_column, s_margin_total_column];
        const pl_where_conditions = { 'year': { in: [year, last_year] } };
        const pl_groupBy_cols = ['year'];
        /**
         * SG&A 조회용 컬럼
         * is_total_cc false = 사업 / true = 전사
         */
        const sga_col_list = ['year', 'is_total_cc', s_sga_column, s_sga_total_column];
        const sga_where_conditions = { 'year': { in: [year, last_year] } };
        const sga_groupBy_cols = ['year', 'is_total_cc'];

        /**
         * org_id 파라미터값으로 조직정보 조회
         * 
         */
        const org_col = `case
            when lv1_id = '${org_id}' THEN 'lv1_id'
            when lv2_id = '${org_id}' THEN 'lv2_id'
            when lv3_id = '${org_id}' THEN 'lv3_id'
            when div_id = '${org_id}' THEN 'div_id'
            when hdqt_id = '${org_id}' THEN 'hdqt_id'
            when team_id = '${org_id}' THEN 'team_id'
            end as org_level`;
        let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd'])
            .where`org_id = ${org_id} and (lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id})`;

        if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

        // 조직 정보를 where 조건에 추가
        let org_col_nm = orgInfo.org_level;
        // ccorg_cd 만 가지고 있는 경우 조회조건으로 사용
        let org_ccorg_col_nm = org_col_nm.slice(0, -2) + 'ccorg_cd'; // <>_id 에서 id 제거 후 <>_ccorg_cd 컬럼명 생성
        let org_ccorg_cd = orgInfo.org_ccorg_cd;

        let pl_column = pl_col_list;
        let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
        let pl_groupBy = pl_groupBy_cols;

        let sga_column = sga_col_list;
        let sga_where = org_col_nm === 'lv1_id' ? sga_where_conditions : { ...sga_where_conditions, [org_col_nm]: org_id };
        let sga_groupBy = sga_groupBy_cols;


        /** 
         * 타겟 뷰 조회용 컬럼
         */
        const target_col_list = ['target_year', 'target_sale_amt','sga_target_amt', 'target_cont_margin_amt', 'profit_target_amt', 'target_margin_amt', 'target_margin_rate'];
        const target_where_conditions = { 'target_year': { in: [year, last_year] }, org_id : org_id };
        // DB 쿼리 실행 (병렬)
        const [query, query_target, sga_query] = await Promise.all([
            // PL 실적, 목표 조회
            SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
            SELECT.from(target).columns(target_col_list).where(target_where_conditions),
            SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
        ]);
        if(!query.length && !query_target.length && !sga_query.length){
            //return req.res.status(204).send();
            return []
        }

        let a_sga_filtered_curr_y_row = sga_query.filter(o => o.year === year && o.is_total_cc === false),
            a_sga_filtered_last_y_row = sga_query.filter(o => o.year === last_year && o.is_total_cc === false)

        // 임시 - 비어있을 경우 0 값 생성, 추후 에러처리 or 로직 구성
        let pl_curr_y_row = query.find(o => o.year === year),
            pl_last_y_row = query.find(o => o.year === last_year),
            sga_curr_y_row = { sga_amount_sum: a_sga_filtered_curr_y_row.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0), sga_total_amount_sum: a_sga_filtered_curr_y_row.reduce((iSum, oData) => iSum += oData.sga_total_amount_sum, 0) },
            sga_last_y_row = { sga_amount_sum: a_sga_filtered_last_y_row.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0), sga_total_amount_sum: a_sga_filtered_last_y_row.reduce((iSum, oData) => iSum += oData.sga_total_amount_sum, 0) },
            sga_exp_curr_y_row = sga_query.find(o => o.year === year && o.is_total_cc === true),
            sga_exp_last_y_row = sga_query.find(o => o.year === last_year && o.is_total_cc === true),
            curr_target = query_target.find(oTarget => oTarget.target_year === year),
            last_target = query_target.find(oTarget => oTarget.target_year === last_year);

        const sale_data =
        {
            "display_order": 1,
            "type": "매출",
            "target_curr_y_value": Number(curr_target?.target_sale_amt ?? 0),
            "target_last_y_value": Number(last_target?.target_sale_amt ?? 0),
            "actual_curr_ym_value": pl_curr_y_row?.["sale_amount_sum"] ?? 0,
            "actual_last_ym_value": pl_last_y_row?.["sale_amount_sum"] ?? 0,
            "actual_curr_ym_rate": Number(curr_target?.target_sale_amt ?? 0) !== 0 ? (pl_curr_y_row?.["sale_amount_sum"] ?? 0) / (Number(curr_target.target_sale_amt) * 100000000) : 0,
            "actual_last_ym_rate": (pl_last_y_row?.sale_total_amount_sum ?? 0) !== 0 ? (pl_last_y_row?.["sale_amount_sum"] ?? 0) / (pl_last_y_row?.sale_total_amount_sum) : 0 // 작년1~마감월 매출 / 작년1~12 매출
        };
        oResult.push(sale_data);

        const margin_data =
        {
            "display_order": 2,
            "type": "마진",
            "target_curr_y_value": Number(curr_target?.target_margin_amt ?? 0),
            "actual_curr_ym_value": pl_curr_y_row?.["margin_amount_sum"] ?? 0,
            "actual_last_ym_value": pl_last_y_row?.["margin_amount_sum"] ?? 0,
            "actual_curr_ym_rate": Number(curr_target?.target_margin ?? 0) !== 0 ? (pl_curr_y_row?.["margin_amount_sum"] ?? 0) / (Number(curr_target.target_margin) * 100000000) : 0,
            "actual_last_ym_rate": (pl_last_y_row?.margin_total_amount_sum ?? 0) !== 0 ? (pl_last_y_row?.["margin_amount_sum"] ?? 0) / (pl_last_y_row?.margin_total_amount_sum) : 0 // 작년1~마감월 마진 / 작년1~12 마진
        };
        oResult.push(margin_data);

        const margin_rate_data =
        {
            "display_order": 3,
            "type": "마진율",
            "target_curr_y_value": Number(curr_target?.target_margin_rate ?? 0) / 100,
            "actual_curr_ym_value": sale_data["actual_curr_ym_value"] !== 0 ? margin_data["actual_curr_ym_value"] / sale_data["actual_curr_ym_value"] : 0,
            "actual_last_ym_value": sale_data["actual_last_ym_value"] !== 0 ? margin_data["actual_last_ym_value"] / sale_data["actual_last_ym_value"] : 0,
            "actual_curr_ym_rate": 0,
            "actual_last_ym_rate": 0
            // "actual_curr_ym_rate": (curr_target?.target_margin_rate ?? 0) === 0 || (sale_data["actual_curr_ym_value"] === 0) ? 0 : (margin_data["actual_curr_ym_value"] / sale_data["actual_curr_ym_value"])/curr_target.target_margin_rate,
            // "actual_last_ym_rate": (pl_last_y_row?.sale_total_amount_sum ?? 0) === 0 || (sale_data["actual_last_ym_value"] === 0) ? 0 : (margin_data["actual_last_ym_value"] / sale_data["actual_last_ym_value"])/((pl_last_y_row?.margin_total_amount_sum ?? 0)/(pl_last_y_row?.sale_total_amount_sum ?? 0)) // 작년1~마감월 마진율 / 작년1~12 마진율
        };
        oResult.push(margin_rate_data);

        const sga_data =
        {
            "display_order": 4,
            "type": "SG&A",
            "target_curr_y_value": Number(curr_target?.sga_target_amt ?? 0),
            "actual_curr_ym_value": sga_curr_y_row?.["sga_amount_sum"] ?? 0,
            "actual_last_ym_value": sga_last_y_row?.["sga_amount_sum"] ?? 0,
            "actual_curr_ym_rate": Number(curr_target?.sga_target_amt ?? 0) === 0 ? 0 : (sga_curr_y_row?.["sga_amount_sum"] ?? 0) / (Number(curr_target?.sga_target_amt) * 100000000),
            "actual_last_ym_rate": (sga_last_y_row?.sga_total_amount_sum ?? 0) === 0 ? 0 : (sga_last_y_row?.["sga_amount_sum"] ?? 0) / (sga_last_y_row.sga_total_amount_sum)
        };

        oResult.push(sga_data);

        // 공헌이익 [마진 - 사업SG&A]
        const contribution_data =
        {
            "display_order": 5,
            "type": "공헌이익",
            "target_curr_y_value": Number(curr_target?.target_cont_margin_amt) ?? 0,
            "actual_curr_ym_value": margin_data["actual_curr_ym_value"] - (sga_curr_y_row?.["sga_amount_sum"] ?? 0),
            "actual_last_ym_value": margin_data["actual_last_ym_value"] - (sga_last_y_row?.["sga_amount_sum"] ?? 0),
            "actual_curr_ym_rate": Number(curr_target?.target_cont_margin_amt ?? 0) === 0 ? 0 : (margin_data["actual_curr_ym_value"] - (sga_curr_y_row?.["sga_amount_sum"] ?? 0)) / (Number(curr_target?.target_cont_margin_amt ?? 0) * 100000000),
            "actual_last_ym_rate": ((pl_last_y_row?.margin_total_amount_sum ?? 0) - (sga_last_y_row?.sga_total_amount_sum ?? 0)) === 0 ? 0 : (margin_data["actual_last_ym_value"] - (sga_last_y_row?.["sga_amount_sum"] ?? 0)) / ((pl_last_y_row?.margin_total_amount_sum ?? 0) - (sga_last_y_row?.sga_total_amount_sum ?? 0)) // 작년1~마감월 (마진 - 사업sg&a) / 작년1~12 (마진 - 사업sg&a)
        };
        oResult.push(contribution_data);

        // 전사 SG&A
        const sga_total_data =
        {
            "display_order": 6,
            "type": "전사 SG&A",
            "target_curr_y_value": 0,
            "actual_curr_ym_value": sga_exp_curr_y_row?.["sga_amount_sum"] ?? 0,
            "actual_last_ym_value": sga_exp_last_y_row?.["sga_amount_sum"] ?? 0,
            "actual_curr_ym_rate": 0,
            "actual_last_ym_rate": (sga_exp_last_y_row?.sga_total_amount_sum ?? 0) === 0 ? 0 : (sga_exp_last_y_row?.["sga_amount_sum"] ?? 0) / (sga_exp_last_y_row.sga_total_amount_sum)
        };
        oResult.push(sga_total_data);

        // 영업이익 [공헌이익 - 전사 SG&A] profit_target_amt
        const profit_data =
        {
            "display_order": 7,
            "type": "영업이익",
            "target_curr_y_value": Number(curr_target?.profit_target_amt ?? 0),
            "actual_curr_ym_value": (contribution_data["actual_curr_ym_value"]) - (sga_exp_curr_y_row?.["sga_amount_sum"] ?? 0),
            "actual_last_ym_value": (contribution_data["actual_last_ym_value"]) - (sga_exp_last_y_row?.["sga_amount_sum"] ?? 0),
            "actual_curr_ym_rate": Number(curr_target?.profit_target_amt ?? 0) === 0 ? 0 : ((contribution_data["actual_curr_ym_value"]) - (sga_exp_curr_y_row?.["sga_amount_sum"] ?? 0)) / (Number(curr_target.profit_target_amt) * 100000000),
            "actual_last_ym_rate": (((pl_last_y_row?.margin_total_amount_sum ?? 0) - (sga_last_y_row?.sga_total_amount_sum ?? 0)) - (sga_exp_last_y_row?.sga_total_amount_sum ?? 0)) === 0 ? 0 : ((contribution_data["actual_last_ym_value"]) - (sga_exp_last_y_row?.["sga_amount_sum"] ?? 0)) / (((pl_last_y_row?.margin_total_amount_sum ?? 0) - (sga_last_y_row?.sga_total_amount_sum ?? 0)) - (sga_exp_last_y_row?.sga_total_amount_sum ?? 0)) // 작년1~마감월 ((마진 - 사업sg&a)-전사sg&a) / 작년1~12 ((마진 - 사업sg&a)-전사sg&a)
        };
        oResult.push(profit_data);

        let contribution_total_last = (pl_last_y_row?.margin_total_amount_sum ?? 0) - (sga_last_y_row?.sga_total_amount_sum ?? 0)//작년1~12월 공헌이익
        let profit_total_last = contribution_total_last - (sga_exp_last_y_row?.sga_total_amount_sum ?? 0) //작년1~12월 영업이익
        // 영업이익률 데이터 [영업이익/매출]
        const profit_rate_data =
        {
            "display_order": 8,
            "type": "영업이익률",
            "target_curr_y_value": Number(curr_target?.target_sale_amt ?? 0) === 0 ? 0 : Number(curr_target?.profit_target_amt ?? 0) / Number(curr_target.target_sale_amt),
            "actual_curr_ym_value": (pl_curr_y_row?.["sale_amount_sum"] ?? 0) !== 0 ? profit_data["actual_curr_ym_value"] / pl_curr_y_row?.["sale_amount_sum"] : 0,
            "actual_last_ym_value": (pl_last_y_row?.["sale_amount_sum"] ?? 0) !== 0 ? profit_data["actual_last_ym_value"] / pl_last_y_row?.["sale_amount_sum"] : 0,
            "actual_curr_ym_rate": Number(curr_target?.target_sale_amt ?? 0) === 0 || (pl_curr_y_row?.["sale_amount_sum"] ?? 0) === 0 || Number(curr_target?.profit_target_amt ?? 0) === 0 ? 0 : (profit_data["actual_curr_ym_value"] / pl_curr_y_row?.["sale_amount_sum"]) / (Number(curr_target?.profit_target_amt ?? 0) / Number(curr_target?.target_sale_amt)),
            "actual_last_ym_rate": (pl_last_y_row?.sale_total_amount_sum ?? 0) === 0 || (pl_last_y_row?.["sale_amount_sum"] ?? 0) !== 0 ? (profit_data["actual_last_ym_value"] / pl_last_y_row?.["sale_amount_sum"]) / (profit_total_last / (pl_last_y_row?.sale_total_amount_sum ?? 0)) : 0 // 작년1~마감월 (((마진 - 사업sg&a)-전사sg&a)/매출) / 작년1~12 (((마진 - 사업sg&a)-전사sg&a)/매출)
        };
        oResult.push(profit_rate_data);
        return oResult;
    });
};