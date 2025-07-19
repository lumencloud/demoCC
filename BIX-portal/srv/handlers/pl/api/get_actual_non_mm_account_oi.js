const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_non_mm_account_oi', async (req) => {
        try{
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
             * pl.wideview_view [실적]
             * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const pl_view = db.entities('pl').wideview_non_mm_view;
            //org_tp:account, hybrid일 경우 사용
            const account_pl_view = db.entities('pl').wideview_account_non_mm_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;

            const account_view = db.entities('common').account
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id } = req.data;
            const last_year = (Number(year) - 1).toString();

            // QUERY 공통 파라미터 선언
            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            let a_sale_column = [];
            let a_margin_column = [];
            for (let i = 1; i <= Number(month); i++) {
                a_sale_column.push(`sum(sale_m${i}_amt)`)
                a_margin_column.push(`sum(margin_m${i}_amt)`)
            }
            let s_sale_column = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
            let s_margin_column = "(" + a_margin_column.join(' + ') + ') as margin_amount_sum';
            const pl_col_list = ['year', 'biz_tp_account_cd', s_sale_column, s_margin_column];
            const pl_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { 'not in': ['WO', 'D'] } };
            const pl_groupBy_cols = ['year', 'biz_tp_account_cd'];

            /**
             * org_id 파라미터값으로 조직정보 조회
             * 
             */
            let orgInfo = await SELECT.one.from(org_full_level).columns(['org_level', 'org_ccorg_cd', 'org_tp', 'lv3_ccorg_cd'])
                .where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level+'_id';
            // ccorg_cd 만 가지고 있는 경우 조회조건으로 사용

            // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
            let pl_column = pl_col_list;
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            let pl_groupBy = pl_groupBy_cols;

            let pl_view_selec;
            if((org_col_nm !== 'lv1_id' || org_col_nm !== 'lv2_id') && orgInfo.lv3_ccorg_cd === '237100' || orgInfo.org_tp === 'account'){
                pl_view_selec = account_pl_view;
            }else{
                pl_view_selec = pl_view;
            };

            // DB 쿼리 실행 (병렬)
            const [pl_data, account_data] = await Promise.all([
                SELECT.from(pl_view_selec).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(account_view).columns(['biz_tp_account_cd', 'biz_tp_account_nm', 'sort_order']).orderBy('sort_order')
            ]);
            if(!pl_data.length){
                //return req.res.status(204).send();
                return []
            }

            let o_total = {
                sale: { "type": "매출" },
                margin: { "type": "마진" },
                margin_rate: { "type": "마진율" },
            };
            let o_data = {}
            pl_data.forEach(o_pl => {
                let o_find_account = account_data.find(o_account => o_account.biz_tp_account_cd === o_pl.biz_tp_account_cd);
                if (o_find_account) {
                    if (!o_data[`${o_pl.biz_tp_account_cd}`]) {
                        o_data[`${o_pl.biz_tp_account_cd}`] = { account_cd: o_pl.biz_tp_account_cd, account_nm: o_find_account.biz_tp_account_nm, sort_order: o_find_account.sort_order };
                    }
                    if (o_pl.year === year) {
                        o_data[`${o_pl.biz_tp_account_cd}`]['curr_sale'] = o_pl?.sale_amount_sum ?? 0;
                        o_data[`${o_pl.biz_tp_account_cd}`]['curr_margin'] = o_pl?.margin_amount_sum ?? 0;
                        o_data[`${o_pl.biz_tp_account_cd}`]['curr_margin_rate'] = (o_pl?.sale_amount_sum ?? 0) === 0 ? 0 : (o_pl?.margin_amount_sum ?? 0) / o_pl.sale_amount_sum;
                    } else {
                        o_data[`${o_pl.biz_tp_account_cd}`]['last_sale'] = o_pl?.sale_amount_sum ?? 0;
                        o_data[`${o_pl.biz_tp_account_cd}`]['last_margin'] = o_pl?.margin_amount_sum ?? 0;
                        o_data[`${o_pl.biz_tp_account_cd}`]['last_margin_rate'] = (o_pl?.sale_amount_sum ?? 0) === 0 ? 0 : (o_pl?.margin_amount_sum ?? 0) / o_pl.sale_amount_sum;
                    }
                };
                if (o_pl.year === year) {
                    o_total['sale']['actual_curr_ym_value'] = (o_total['sale']['actual_curr_ym_value'] || 0) + (o_pl?.sale_amount_sum ?? 0);
                    o_total['margin']['actual_curr_ym_value'] = (o_total['margin']['actual_curr_ym_value'] || 0) + (o_pl?.margin_amount_sum ?? 0);
                };
            });

            o_total['margin_rate']['actual_curr_ym_value'] = (o_total['sale']?.['actual_curr_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin']?.['actual_curr_ym_value'] ?? 0) / o_total['sale']['actual_curr_ym_value'];
            o_total['margin_rate']['actual_last_ym_value'] = (o_total['sale']?.['actual_last_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin']?.['actual_last_ym_value'] ?? 0) / o_total['sale']['actual_last_ym_value'];
            const a_data = Object.values(o_data);

            i_count = 2;
            account_data.forEach((data, i) => {
                let o_sale_temp = {
                    "display_order": ++i_count,
                    "item_order": 1,
                    "account_id": data.biz_tp_account_cd,
                    "account_nm": data.biz_tp_account_nm,
                    "type": '매출',
                    "target_curr_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                }
                let o_margin_temp = {
                    "display_order": ++i_count,
                    "item_order": 2,
                    "account_id": data.biz_tp_account_cd,
                    "account_nm": data.biz_tp_account_nm,
                    "type": '마진',
                    "target_curr_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                }
                let o_margin_rate_temp = {
                    "display_order": ++i_count,
                    "item_order": 3,
                    "account_id": data.biz_tp_account_cd,
                    "account_nm": data.biz_tp_account_nm,
                    "type": '마진율',
                    "target_curr_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                }

                a_data.forEach(a_data => {
                    if (a_data.account_cd === data.biz_tp_account_cd) {
                        o_sale_temp["actual_curr_ym_value"] = a_data?.curr_sale ?? 0;
                        o_sale_temp["actual_last_ym_value"] = a_data?.last_sale ?? 0;

                        o_margin_temp["actual_curr_ym_value"] = a_data?.curr_margin ?? 0;
                        o_margin_temp["actual_last_ym_value"] = a_data?.last_margin ?? 0;

                        o_margin_rate_temp["actual_curr_ym_value"] = a_data?.curr_margin_rate ?? 0;
                        o_margin_rate_temp["actual_last_ym_value"] = a_data?.last_margin_rate ?? 0;
                    };
                })

                oResult.push(o_sale_temp, o_margin_temp, o_margin_rate_temp);
            });
            oResult.sort((a, b) => a.display_order - b.display_order);

            o_total['margin_rate']['target_curr_y_value'] = (o_total['sale']?.['target_curr_y_value'] ?? 0) === 0 ? 0 : (o_total['margin']?.['target_curr_y_value'] ?? 0) / (o_total['sale']['target_curr_y_value'] * 100000000);

            // 올해 당월 실적 
            let total_data = pl_data.filter(oData => oData.year === year);
            let o_sale_total = {
                "display_order": 0,
                "item_order": 1,
                "account_cd": "total",
                "account_nm": "합계",
                "type": '매출',
                "actual_curr_ym_value": total_data.reduce((iSum, oData) => iSum += parseInt(oData.sale_amount_sum), 0),
            }
            let o_margin_total = {
                "display_order": 0,
                "item_order": 2,
                "account_cd": "total",
                "account_nm": "합계",
                "type": '마진',
                "actual_curr_ym_value": total_data.reduce((iSum, oData) => iSum += parseInt(oData.margin_amount_sum), 0),
            }
            let o_margin_rate_total = {
                "display_order": 0,
                "item_order": 3,
                "account_cd": "total",
                "account_nm": "합계",
                "type": '마진율',
                "actual_curr_ym_value": (o_sale_total.actual_curr_ym_value ?? 0) === 0 ? 0 : (o_margin_total.actual_curr_ym_value / o_sale_total.actual_curr_ym_value),
            }
            oResult.push(o_sale_total, o_margin_total, o_margin_rate_total);

            // display_order, item_order 순으로 최종 정렬
            let aSortFields = [
                { field: "display_order", order: "asc" },
                { field: "item_order", order: "asc" },
            ];
            oResult.sort((oItem1, oItem2) => {
                for (const { field, order } of aSortFields) {
                    // 필드가 null일 때
                    if (oItem1[field] === null && oItem2[field] !== null) return -1;
                    if (oItem1[field] !== null && oItem2[field] === null) return 1;
                    if (oItem1[field] === null && oItem2[field] === null) continue;

                    if (typeof oItem1[field] === "string") {    // 문자일 때 localeCompare
                        var iResult = oItem1[field].localeCompare(oItem2[field]);
                    } else if (typeof oItem1[field] === "number") { // 숫자일 때
                        var iResult = oItem1[field] - oItem2[field];
                    }

                    if (iResult !== 0) {
                        return (order === "asc") ? iResult : -iResult;
                    }
                }
                return 0;
            })

            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}