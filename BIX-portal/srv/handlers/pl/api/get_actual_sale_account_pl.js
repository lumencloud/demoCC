const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_sale_account_pl', async (req) => {
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
             * common_target
             * 조직 별 연단위 목표금액
             */
            const target = db.entities('common').annual_target_temp_view;
            /**
             * pl.wideview_view [실적]
             * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const pl_view = db.entities('pl').wideview_view;
            //org_tp:account, hybrid일 경우 사용
            const account_pl_view = db.entities('pl').wideview_account_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;

            const account_view = db.entities('common').account
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id, display_type } = req.data;
            const last_year = (Number(year) - 1).toString();

            // QUERY 공통 파라미터 선언
            /** 
             * 타겟 뷰 조회용 컬럼
             */
            const target_col_list = [
                'year',
                'target_type_cd',
                'ifnull(sale_target,0) as sale_target',
                'ifnull(margin_target,0) as margin_target',
                'ifnull(margin_rate_target,0) as margin_rate_target'
            ];
            const target_where_conditions = { 'year': { in: [year, last_year] }, 'target_type': 'biz_tp_account_cd' };
            const target_groupBy_cols = ['year']
            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            let a_sale_column = [];
            let a_sale_total_column = [];
            let a_margin_column = [];
            let a_margin_total_column = [];
            for (let i = 1; i <= 12; i++) {
                if (i <= Number(month)) {
                    a_sale_column.push(`sum(sale_m${i}_amt)`)
                    a_margin_column.push(`sum(margin_m${i}_amt)`)
                };
                a_sale_total_column.push(`sum(sale_m${i}_amt)`)
                a_margin_total_column.push(`sum(margin_m${i}_amt)`)
            };
            let s_sale_column = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
            let sale_sum_total_col = "(" + a_sale_total_column.join(' + ') + ') as sale_total_amount_sum';
            let s_margin_column = "(" + a_margin_column.join(' + ') + ') as margin_amount_sum';
            let margin_sum_total_col = "(" + a_margin_total_column.join(' + ') + ') as margin_total_amount_sum';
            const pl_col_list = ['year', 'biz_tp_account_cd', s_sale_column, s_margin_column, sale_sum_total_col, margin_sum_total_col];
            const pl_where_conditions = {
                'year': { in: [year, last_year] }, 'src_type': { 'not in': ['WO', 'D'] },
                'biz_tp_account_cd': { '!=': null, and: { 'biz_tp_account_cd': { '!=': '' } } }, cstco_name: { '!=': null }
            };
            const pl_groupBy_cols = ['year', 'biz_tp_account_cd'];

            /**
             * +++++ TBD +++++
             * 권한 체크하여 사용자가 조회 가능한 조직인지 판별 후 코드 진행
             */

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
            let orgInfo = await SELECT.one.from(org_full_level).columns([org_col, 'org_ccorg_cd', 'org_tp'])
                .where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level;
            // ccorg_cd 만 가지고 있는 경우 조회조건으로 사용

            // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
            let target_column = target_col_list;
            let target_where = org_col_nm === 'lv1_id' ? target_where_conditions : { ...target_where_conditions, [org_col_nm]: org_id };
            let target_groupBy = target_groupBy_cols;

            let pl_column = pl_col_list;
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            let pl_groupBy = pl_groupBy_cols;

            let pl_view_selec;
            if((org_col_nm !== 'lv1_id' || org_col_nm !== 'lv2_id') && orgInfo.org_tp === 'hybrid' || orgInfo.org_tp === 'account'){
                pl_view_selec = account_pl_view;
            }else if(org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id'|| orgInfo.org_tp === 'delivery'){
                pl_view_selec = pl_view;
            };

            // DB 쿼리 실행 (병렬)
            const [target_data, pl_data, account_data] = await Promise.all([
                SELECT.from(target).columns(target_column).where(target_where),
                SELECT.from(pl_view_selec).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(account_view).columns(['biz_tp_account_cd', 'biz_tp_account_nm', 'sort_order']).orderBy('sort_order')
            ]);
// return pl_data
            if(display_type !== 'chart' && !pl_data.length && !target_data.length){
                //return req.res.status(204).send();
                return []
            }

            // pl_data 결과 값 flat 하게 데이터 구성
            let flat_target = target_data.reduce((acc, item) => {
                let main = item['target_type_cd'];
                let sub = item['year'];
                let rest = { ...item };
                delete rest['target_type_cd'];
                delete rest['year'];
                Object.entries(rest).forEach(([key, value]) => {
                    acc[`_${main}_${sub}_${key}`] = value;
                });
                return acc;
            }, {});

            let o_data = {}
            pl_data.forEach(o_pl => {
                let o_find_account = account_data.find(o_account => o_account.biz_tp_account_cd === o_pl.biz_tp_account_cd);
                if (o_find_account) {
                    if (!o_data[`${o_pl.biz_tp_account_cd}`]) {
                        o_data[`${o_pl.biz_tp_account_cd}`] = { account_cd: o_pl.biz_tp_account_cd, account_nm: o_find_account.biz_tp_account_nm, sort_order: o_find_account.sort_order };
                    }
                    if (o_pl.year === year) {
                        o_data[`${o_pl.biz_tp_account_cd}`]['curr_sale'] = o_pl.sale_amount_sum;
                        o_data[`${o_pl.biz_tp_account_cd}`]['curr_margin'] = o_pl.margin_amount_sum;
                        o_data[`${o_pl.biz_tp_account_cd}`]['curr_margin_rate'] = (o_pl?.sale_amount_sum ?? 0) === 0 ? 0 : (o_pl?.margin_amount_sum ?? 0) / o_pl.sale_amount_sum;
                        o_data[`${o_pl.biz_tp_account_cd}`]['curr_sale_total_amount_sum'] = o_pl.sale_total_amount_sum;
                        o_data[`${o_pl.biz_tp_account_cd}`]['curr_margin_total_amount_sum'] = o_pl.margin_total_amount_sum;
                    } else if (o_pl.year === last_year) {
                        o_data[`${o_pl.biz_tp_account_cd}`]['last_sale'] = o_pl.sale_amount_sum;
                        o_data[`${o_pl.biz_tp_account_cd}`]['last_margin'] = o_pl.margin_amount_sum;
                        o_data[`${o_pl.biz_tp_account_cd}`]['last_margin_rate'] = (o_pl?.sale_amount_sum ?? 0) === 0 ? 0 : (o_pl?.margin_amount_sum ?? 0) / o_pl.sale_amount_sum;
                        o_data[`${o_pl.biz_tp_account_cd}`]['last_sale_total_amount_sum'] = o_pl.sale_total_amount_sum;
                        o_data[`${o_pl.biz_tp_account_cd}`]['last_margin_total_amount_sum'] = o_pl.margin_total_amount_sum;
                    }
                }
            })

            let a_pl_data = Object.values(o_data);

            let o_total = {
                sale: { "type": "매출" }
                // ,
                // margin: { "type": "마진" },
                // margin_rate: { "type": "마진률" },
            };

            let i_count = 3;
            account_data.forEach(data =>{
                let o_pl_data = a_pl_data.find(data2 => data2.account_cd === data.biz_tp_account_cd);
                const sale_data =
                {
                    "display_order": ++i_count,
                    "account_id": data.biz_tp_account_cd,
                    "account_nm": data.biz_tp_account_nm,
                    "type": "매출",
                    "target_curr_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0, 
                    "actual_curr_ym_value_gap": 0,
                    "actual_curr_ym_rate_gap": 0
                };
                // const margin_data =
                // {
                //     "display_order": ++i_count,
                //     "account_id": data.biz_tp_account_cd,
                //     "account_nm": data.biz_tp_account_nm,
                //     "type": "마진",
                //     "target_curr_y_value": 0,
                //     "actual_curr_ym_value": 0,
                //     "actual_last_ym_value": 0,
                //     "actual_curr_ym_rate": 0,
                //     "actual_last_ym_rate": 0, 
                //     "actual_curr_ym_value_gap": 0,
                //     "actual_curr_ym_rate_gap": 0
                // };
                // const margin_rate_data =
                // {
                //     "display_order": ++i_count,
                //     "account_id": data.biz_tp_account_cd,
                //     "account_nm": data.biz_tp_account_nm,
                //     "type": "마진률",
                //     "target_curr_y_value": 0,
                //     "actual_curr_ym_value": 0,
                //     "actual_last_ym_value": 0,
                //     "actual_curr_ym_rate": 0,
                //     "actual_last_ym_rate": 0,
                //     "actual_curr_ym_value_gap": 0,
                //     "actual_curr_ym_rate_gap": 0
                //     // "actual_curr_ym_rate": (flat_target?.[`_${o_pl_data.account_cd}_${year}_margin_rate_target`] ?? 0) === 0 ? 0 : (o_pl_data?.curr_margin_rate ?? 0) / (flat_target?.[`_${o_pl_data.account_cd}_${year}_margin_rate_target`] ?? 0) ,
                //     // "actual_last_ym_rate": (o_pl_data?.last_sale_total_amount_sum ?? 0) === 0 ? 0 : ((o_pl_data?.last_margin ?? 0) / (o_pl_data?.last_sale ?? 0)) / ((o_pl_data?.last_margin_total_amount_sum ?? 0) / (o_pl_data?.last_sale_total_amount_sum ?? 0)) 
                // };

                if(o_pl_data){
                    sale_data['target_curr_y_value'] = (flat_target?.[`_${o_pl_data.account_cd}_${year}_sale_target`] ?? 0),
                    sale_data['actual_curr_ym_value'] = o_pl_data?.curr_sale ?? 0,
                    sale_data['actual_last_ym_value'] = o_pl_data?.last_sale ?? 0,
                    sale_data['actual_curr_ym_rate'] = (flat_target?.[`_${o_pl_data.account_cd}_${year}_sale_target`] ?? 0) === 0 ? 0 : (o_pl_data?.curr_sale ?? 0) / ((flat_target?.[`_${o_pl_data.account_cd}_${year}_sale_target`] ?? 0)*100000000) ,
                    sale_data['actual_last_ym_rate'] = (o_pl_data?.last_sale_total_amount_sum ?? 0) === 0 ? 0 : (o_pl_data?.last_sale ?? 0) / (o_pl_data?.last_sale_total_amount_sum ?? 0), 
                    sale_data['actual_curr_ym_value_gap'] = (o_pl_data?.curr_sale ?? 0) - (o_pl_data?.last_sale ?? 0),
                    sale_data['actual_curr_ym_rate_gap'] = ((flat_target?.[`_${o_pl_data.account_cd}_${year}_sale_target`] ?? 0) === 0 ? 0 : (o_pl_data?.curr_sale ?? 0) / ((flat_target?.[`_${o_pl_data.account_cd}_${year}_sale_target`] ?? 0)*100000000)) - ((o_pl_data?.last_sale_total_amount_sum ?? 0) === 0 ? 0 : (o_pl_data?.last_sale ?? 0) / (o_pl_data?.last_sale_total_amount_sum ?? 0))

                    // margin_data['target_curr_y_value'] = (flat_target?.[`_${o_pl_data.account_cd}_${year}_margin_target`] ?? 0),
                    // margin_data['actual_curr_ym_value'] = o_pl_data?.curr_margin ?? 0,
                    // margin_data['actual_last_ym_value'] = o_pl_data?.last_margin ?? 0,
                    // margin_data['actual_curr_ym_rate'] = (flat_target?.[`_${o_pl_data.account_cd}_${year}_margin_target`] ?? 0) === 0 ? 0 : (o_pl_data?.curr_margin ?? 0) / ((flat_target?.[`_${o_pl_data.account_cd}_${year}_margin_target`] ?? 0)*100000000) ,
                    // margin_data['actual_last_ym_rate'] = (o_pl_data?.last_margin_total_amount_sum ?? 0) === 0 ? 0 : (o_pl_data?.last_margin ?? 0) / (o_pl_data?.last_margin_total_amount_sum ?? 0), 
                    // margin_data['actual_curr_ym_value_gap'] = (o_pl_data?.curr_margin ?? 0) - (o_pl_data?.last_margin ?? 0),
                    // margin_data['actual_curr_ym_rate_gap'] = ((flat_target?.[`_${o_pl_data.account_cd}_${year}_margin_target`] ?? 0) === 0 ? 0 : (o_pl_data?.curr_margin ?? 0) / ((flat_target?.[`_${o_pl_data.account_cd}_${year}_margin_target`] ?? 0)*100000000)) - ((o_pl_data?.last_margin_total_amount_sum ?? 0) === 0 ? 0 : (o_pl_data?.last_margin ?? 0) / (o_pl_data?.last_margin_total_amount_sum ?? 0))

                    // margin_rate_data['target_curr_y_value'] = (flat_target?.[`_${o_pl_data.account_cd}_${year}_margin_rate_target`] ?? 0),
                    // margin_rate_data['actual_curr_ym_value'] = o_pl_data?.curr_margin_rate ?? 0,
                    // margin_rate_data['actual_last_ym_value'] = o_pl_data?.last_margin_rate ?? 0,
                    // margin_rate_data['actual_curr_ym_rate'] = 0,
                    // margin_rate_data['actual_last_ym_rate'] = 0,
                    // margin_rate_data['actual_curr_ym_value_gap'] = (o_pl_data?.curr_margin_rate ?? 0) - (o_pl_data?.last_margin_rate ?? 0),
                    // margin_rate_data['actual_curr_ym_rate_gap'] = 0

                    o_total['sale']['target_curr_y_value'] = (o_total['sale']['target_curr_y_value'] || 0) + (flat_target?.[`_${o_pl_data.account_cd}_${year}_sale_target`] ?? 0);
                    // o_total['margin']['target_curr_y_value'] = (o_total['margin']['target_curr_y_value'] || 0) + (flat_target?.[`_${o_pl_data.account_cd}_${year}_margin_target`] ?? 0);
                    o_total['sale']['actual_curr_ym_value'] = (o_total['sale']['actual_curr_ym_value'] || 0) + (o_pl_data?.curr_sale ?? 0);
                    // o_total['margin']['actual_curr_ym_value'] = (o_total['margin']['actual_curr_ym_value'] || 0) + (o_pl_data?.curr_margin ?? 0);
                    o_total['sale']['actual_last_ym_value'] = (o_total['sale']['actual_last_ym_value'] || 0) + (o_pl_data?.last_sale ?? 0);
                    // o_total['margin']['actual_last_ym_value'] = (o_total['margin']['actual_last_ym_value'] || 0) + (o_pl_data?.last_margin ?? 0);
                    o_total['sale']['last_total_amount_sum'] = (o_total['sale']['last_total_amount_sum'] || 0) + (o_pl_data?.last_sale_total_amount_sum ?? 0);
                    // o_total['margin']['last_total_amount_sum'] = (o_total['margin']['last_total_amount_sum'] || 0) + (o_pl_data?.last_margin_total_amount_sum ?? 0);
                    // o_total['sale']['actual_curr_ym_value_gap'] = o_total['sale']['actual_curr_ym_value'] - o_total['sale']['actual_last_ym_value']
                    // o_total['sale']['actual_curr_ym_rate_gap'] = o_total['sale']['actual_curr_ym_rate'] - o_total['sale']['actual_last_ym_rate']
                    // o_total['margin']['actual_curr_ym_value_gap'] = o_total['margin']['actual_curr_ym_value'] - o_total['margin']['actual_last_ym_value']
                    // o_total['margin']['actual_curr_ym_rate_gap'] = o_total['margin']['actual_curr_ym_rate'] - o_total['margin']['actual_last_ym_rate']
                };
                
                oResult.push(sale_data);
                // oResult.push(sale_data,margin_data,margin_rate_data);
            })

            // o_total['margin_rate']['target_curr_y_value'] = (o_total['sale']?.['target_curr_y_value'] ?? 0) === 0 ? 0 : (o_total['margin']?.['target_curr_y_value'] ?? 0)/o_total['sale']['target_curr_y_value'];
            // o_total['margin_rate']['actual_curr_ym_value'] = (o_total['sale']?.['actual_curr_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin']?.['actual_curr_ym_value'] ?? 0)/o_total['sale']['actual_curr_ym_value'];
            // o_total['margin_rate']['actual_last_ym_value'] = (o_total['sale']?.['actual_last_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin']?.['actual_last_ym_value'] ?? 0)/o_total['sale']['actual_last_ym_value'];
            // o_total['margin_rate']['last_total_amount_sum'] = (o_total['sale']?.['last_total_amount_sum'] ?? 0) === 0 ? 0 : (o_total['margin']?.['last_total_amount_sum'] ?? 0)/o_total['sale']?.['last_total_amount_sum'];
            // o_total['margin_rate']['acutal_curr_ym_value_gap'] = o_total['margin_rate']['actual_curr_ym_value'] - o_total['margin_rate']['actual_last_ym_value'];
            // o_total['margin_rate']['acutal_curr_ym_rate_gap'] = o_total['margin_rate']['actual_curr_ym_rate'] - o_total['margin_rate']['actual_last_ym_rate'];

            let a_total_data = Object.values(o_total);
            a_total_data.forEach((o_total, i) => {
                let o_temp = {
                    "display_order": i + 1,
                    "account_cd": "total",
                    "account_nm": "합계",
                    "type": o_total.type,
                    "target_curr_y_value": o_total?.target_curr_y_value ?? 0,
                    "actual_curr_ym_value": o_total?.actual_curr_ym_value ?? 0,
                    "actual_last_ym_value": o_total?.actual_last_ym_value ?? 0,
                    "actual_curr_ym_rate": ((o_total?.target_curr_y_value ?? 0) === 0 ? 0 : (o_total?.actual_curr_ym_value ?? 0)/(o_total.target_curr_y_value*100000000)),
                    // "actual_curr_ym_rate": o_total.type === '마진률' ? 0 : ((o_total?.target_curr_y_value ?? 0) === 0 ? 0 : (o_total?.actual_curr_ym_value ?? 0)/(o_total.target_curr_y_value*100000000)),
                    "actual_last_ym_rate": ((o_total?.last_total_amount_sum ?? 0) === 0 ? 0 : (o_total?.actual_last_ym_value ?? 0)/(o_total.last_total_amount_sum)),
                    // "actual_last_ym_rate": o_total.type === '마진률' ? 0 : ((o_total?.last_total_amount_sum ?? 0) === 0 ? 0 : (o_total?.actual_last_ym_value ?? 0)/(o_total.last_total_amount_sum)),
                    "actual_curr_ym_value_gap": (o_total?.actual_curr_ym_value ?? 0) - (o_total?.actual_last_ym_value ?? 0),
                    "actual_curr_ym_rate_gap": ((o_total?.target_curr_y_value ?? 0) === 0 ? 0 : (o_total?.actual_curr_ym_value ?? 0)/(o_total.target_curr_y_value*100000000)) - ((o_total?.actual_curr_ym_value ?? 0) - (o_total?.actual_last_ym_value ?? 0))
                    // "actual_curr_ym_rate_gap": (o_total.type === '마진률' ? 0 : ((o_total?.target_curr_y_value ?? 0) === 0 ? 0 : (o_total?.actual_curr_ym_value ?? 0)/(o_total.target_curr_y_value*100000000))) - ((o_total?.actual_curr_ym_value ?? 0) - (o_total?.actual_last_ym_value ?? 0))
                }
                oResult.unshift(o_temp);
            })

            return oResult
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}