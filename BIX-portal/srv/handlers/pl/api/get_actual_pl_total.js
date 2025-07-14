const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_actual_pl_total', async (req) => {
        try{

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
            const { year, month } = req.data;
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

            const pl_column = ['year', s_sale_column, s_margin_column, s_sale_total_column, s_margin_total_column];
            const pl_where = { 'year': { in: [year, last_year] } };
            const pl_groupBy = ['year'];
            /**
             * SG&A 조회용 컬럼
             * is_total_cc false = 사업 / true = 전사
             */
            const sga_column = ['year', 'is_total_cc', s_sga_column, s_sga_total_column];
            const sga_where = { 'year': { in: [year, last_year] } };
            const sga_groupBy = ['year', 'is_total_cc'];

            /**
             * 최상위 조직 정보 반환
             */
            let orgInfo = await SELECT.one.from(org_full_level).columns(['org_ccorg_cd']).where({ org_id: { '!=': null }, org_parent: null });
            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            // DB 쿼리 실행 (병렬)
            const [query, target_data, sga_query] = await Promise.all([
                // PL 실적, 목표 조회
                SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                get_org_target(year, ['A01','A02','A03','A04','C01','C02','C08']),
                SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy),
            ]);

            let query_target = target_data.filter(data=>data['org_ccorg_cd'] === '100100');

            // if(!query.length && !query_target.length && !sga_query.length){
            //     //return req.res.status(204).send();
            //     return []
            // }

            let a_sga_filtered_curr_y_row = sga_query.filter(o => o.year === year && o.is_total_cc === false),
                a_sga_filtered_last_y_row = sga_query.filter(o => o.year === last_year && o.is_total_cc === false)

            // 임시 - 비어있을 경우 0 값 생성, 추후 에러처리 or 로직 구성
            let pl_curr_y_row = query.find(o => o.year === year),
                pl_last_y_row = query.find(o => o.year === last_year),
                sga_curr_y_row = { sga_amount_sum: a_sga_filtered_curr_y_row.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0), sga_total_amount_sum: a_sga_filtered_curr_y_row.reduce((iSum, oData) => iSum += oData.sga_total_amount_sum, 0) },
                sga_last_y_row = { sga_amount_sum: a_sga_filtered_last_y_row.reduce((iSum, oData) => iSum += oData.sga_amount_sum, 0), sga_total_amount_sum: a_sga_filtered_last_y_row.reduce((iSum, oData) => iSum += oData.sga_total_amount_sum, 0) },
                sga_exp_curr_y_row = sga_query.find(o => o.year === year && o.is_total_cc === true),
                sga_exp_last_y_row = sga_query.find(o => o.year === last_year && o.is_total_cc === true),
                curr_target = query_target.find(oTarget => oTarget)

            const sale_data =
            {
                "display_order": 1,
                "type": "매출",
                "target_curr_y_value": (curr_target?.target_sale ?? 0),
                "actual_curr_ym_value": pl_curr_y_row?.["sale_amount_sum"] ?? 0,
                "actual_last_ym_value": pl_last_y_row?.["sale_amount_sum"] ?? 0,
                "actual_curr_ym_rate": (curr_target?.target_sale ?? 0) !== 0 ? (pl_curr_y_row?.["sale_amount_sum"] ?? 0) / ((curr_target.target_sale) * 100000000) : 0,
                "actual_last_ym_rate": (pl_last_y_row?.sale_total_amount_sum ?? 0) !== 0 ? (pl_last_y_row?.["sale_amount_sum"] ?? 0) / (pl_last_y_row?.sale_total_amount_sum) : 0 // 작년1~마감월 매출 / 작년1~12 매출
            };
            oResult.push(sale_data);

            const margin_data =
            {
                "display_order": 2,
                "type": "마진",
                "target_curr_y_value": (curr_target?.target_margin ?? 0),
                "actual_curr_ym_value": pl_curr_y_row?.["margin_amount_sum"] ?? 0,
                "actual_last_ym_value": pl_last_y_row?.["margin_amount_sum"] ?? 0,
                "actual_curr_ym_rate": (curr_target?.target_margin ?? 0) !== 0 ? (pl_curr_y_row?.["margin_amount_sum"] ?? 0) / ((curr_target.target_margin) * 100000000) : 0,
                "actual_last_ym_rate": (pl_last_y_row?.margin_total_amount_sum ?? 0) !== 0 ? (pl_last_y_row?.["margin_amount_sum"] ?? 0) / (pl_last_y_row?.margin_total_amount_sum) : 0 // 작년1~마감월 마진 / 작년1~12 마진
            };
            oResult.push(margin_data);

            const margin_rate_data =
            {
                "display_order": 3,
                "type": "마진율",
                "target_curr_y_value": (curr_target?.target_margin_rate ?? 0) / 100,
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
                "target_curr_y_value": (curr_target?.target_sga ?? 0),
                "actual_curr_ym_value": sga_curr_y_row?.["sga_amount_sum"] ?? 0,
                "actual_last_ym_value": sga_last_y_row?.["sga_amount_sum"] ?? 0,
                "actual_curr_ym_rate": (curr_target?.target_sga ?? 0) === 0 ? 0 : (sga_curr_y_row?.["sga_amount_sum"] ?? 0) / ((curr_target?.target_sga) * 100000000),
                "actual_last_ym_rate": (sga_last_y_row?.sga_total_amount_sum ?? 0) === 0 ? 0 : (sga_last_y_row?.["sga_amount_sum"] ?? 0) / (sga_last_y_row.sga_total_amount_sum)
            };

            oResult.push(sga_data);

            // 공헌이익 [마진 - 사업SG&A]
            const contribution_data =
            {
                "display_order": 5,
                "type": "공헌이익",
                "target_curr_y_value": (curr_target?.target_cont_profit ?? 0),
                "actual_curr_ym_value": margin_data["actual_curr_ym_value"] - (sga_curr_y_row?.["sga_amount_sum"] ?? 0),
                "actual_last_ym_value": margin_data["actual_last_ym_value"] - (sga_last_y_row?.["sga_amount_sum"] ?? 0),
                "actual_curr_ym_rate": (curr_target?.target_cont_profit ?? 0) === 0 ? 0 : (margin_data["actual_curr_ym_value"] - (sga_curr_y_row?.["sga_amount_sum"] ?? 0)) / ((curr_target?.target_cont_profit ?? 0) * 100000000),
                "actual_last_ym_rate": ((pl_last_y_row?.margin_total_amount_sum ?? 0) - (sga_last_y_row?.sga_total_amount_sum ?? 0)) === 0 ? 0 : (margin_data["actual_last_ym_value"] - (sga_last_y_row?.["sga_amount_sum"] ?? 0)) / ((pl_last_y_row?.margin_total_amount_sum ?? 0) - (sga_last_y_row?.sga_total_amount_sum ?? 0)) // 작년1~마감월 (마진 - 사업sg&a) / 작년1~12 (마진 - 사업sg&a)
            };
            oResult.push(contribution_data);

            // 전사 SG&A
            const sga_total_data =
            {
                "display_order": 6,
                "type": "전사 SG&A",
                "target_curr_y_value": (curr_target?.target_total_sga ?? 0),
                "actual_curr_ym_value": sga_exp_curr_y_row?.["sga_amount_sum"] ?? 0,
                "actual_last_ym_value": sga_exp_last_y_row?.["sga_amount_sum"] ?? 0,
                "actual_curr_ym_rate": (curr_target?.target_total_sga ?? 0) === 0 ? 0 : (sga_exp_curr_y_row?.["sga_amount_sum"] ?? 0)/((curr_target.target_total_sga) * 100000000),
                "actual_last_ym_rate": (sga_exp_last_y_row?.sga_total_amount_sum ?? 0) === 0 ? 0 : (sga_exp_last_y_row?.["sga_amount_sum"] ?? 0) / (sga_exp_last_y_row.sga_total_amount_sum)
            };
            oResult.push(sga_total_data);

            // 영업이익 [공헌이익 - 전사 SG&A] target_sale_profit
            const profit_data =
            {
                "display_order": 7,
                "type": "영업이익",
                "target_curr_y_value": (curr_target?.target_sale_profit ?? 0),
                "actual_curr_ym_value": (contribution_data["actual_curr_ym_value"]) - (sga_exp_curr_y_row?.["sga_amount_sum"] ?? 0),
                "actual_last_ym_value": (contribution_data["actual_last_ym_value"]) - (sga_exp_last_y_row?.["sga_amount_sum"] ?? 0),
                "actual_curr_ym_rate": (curr_target?.target_sale_profit ?? 0) === 0 ? 0 : ((contribution_data["actual_curr_ym_value"]) - (sga_exp_curr_y_row?.["sga_amount_sum"] ?? 0)) / ((curr_target.target_sale_profit) * 100000000),
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
                "target_curr_y_value": (curr_target?.target_sale ?? 0) === 0 ? 0 : (curr_target?.target_sale_profit ?? 0) / (curr_target.target_sale),
                "actual_curr_ym_value": (pl_curr_y_row?.["sale_amount_sum"] ?? 0) !== 0 ? profit_data["actual_curr_ym_value"] / pl_curr_y_row?.["sale_amount_sum"] : 0,
                "actual_last_ym_value": (pl_last_y_row?.["sale_amount_sum"] ?? 0) !== 0 ? profit_data["actual_last_ym_value"] / pl_last_y_row?.["sale_amount_sum"] : 0,
                "actual_curr_ym_rate": (curr_target?.target_sale ?? 0) === 0 || (pl_curr_y_row?.["sale_amount_sum"] ?? 0) === 0 || (curr_target?.target_sale_profit ?? 0) === 0 ? 0 : (profit_data["actual_curr_ym_value"] / pl_curr_y_row?.["sale_amount_sum"]) / ((curr_target?.target_sale_profit ?? 0) / (curr_target?.target_sale)),
                "actual_last_ym_rate": (pl_last_y_row?.sale_total_amount_sum ?? 0) === 0 || (pl_last_y_row?.["sale_amount_sum"] ?? 0) !== 0 ? (profit_data["actual_last_ym_value"] / pl_last_y_row?.["sale_amount_sum"]) / (profit_total_last / (pl_last_y_row?.sale_total_amount_sum ?? 0)) : 0 // 작년1~마감월 (((마진 - 사업sg&a)-전사sg&a)/매출) / 작년1~12 (((마진 - 사업sg&a)-전사sg&a)/매출)
            };
            oResult.push(profit_rate_data);
            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
};