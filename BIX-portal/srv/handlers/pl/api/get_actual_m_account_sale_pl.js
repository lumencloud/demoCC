const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_m_account_sale_pl', async (req) => {
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
            const account_org_map = db.entities('common').account_org_map;
            const account_view = db.entities('common').account_view;
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id, org_tp } = req.data;
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
            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            let a_sale_column = [];
            let a_sale_total_column = [];
            let a_margin_column = [];
            let a_margin_total_column = [];
            for (let i = 1; i <= 12; i++) {
                if (i <= Number(month)) {
                    a_sale_column.push(`ifnull(sum(sale_m${i}_amt), 0)`)
                    a_margin_column.push(`ifnull(sum(margin_m${i}_amt), 0)`)
                };
                a_sale_total_column.push(`ifnull(sum(sale_m${i}_amt), 0)`)
                a_margin_total_column.push(`ifnull(sum(margin_m${i}_amt), 0)`)
            };
            let s_sale_column = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
            let sale_sum_total_col = "(" + a_sale_total_column.join(' + ') + ') as sale_total_amount_sum';
            let s_margin_column = "(" + a_margin_column.join(' + ') + ') as margin_amount_sum';
            let margin_sum_total_col = "(" + a_margin_total_column.join(' + ') + ') as margin_total_amount_sum';
            const pl_col_list = ['year', 'biz_tp_account_cd', s_sale_column, s_margin_column, sale_sum_total_col, margin_sum_total_col];
            const pl_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { 'not in': ['WO', 'D'] }, 'biz_tp_account_cd': { '!=': null, and: { 'biz_tp_account_cd': { '!=': '' } } } };
            const pl_groupBy_cols = ['year', 'biz_tp_account_cd'];

            /**
             * +++++ TBD +++++
             * 권한 체크하여 사용자가 조회 가능한 조직인지 판별 후 코드 진행
             */

            /**
             * org_id 파라미터값으로 조직정보 조회
             * 
             */
            let orgInfo = await SELECT.one.from(org_full_level).columns(['org_level', 'org_ccorg_cd', 'org_tp', 'lv3_ccorg_cd'])
                .where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error
            //조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level + '_id';
            // ccorg_cd 만 가지고 있는 경우 조회조건으로 사용
            // 전사 (lv1_) 레벨 조회일 경우, 조직 정보가 없는 ccorg_cd 포함하도록, org_id 조건 없이 전체 aggregation
            let target_column = target_col_list;
            let target_where = org_col_nm === 'lv1_id' ? target_where_conditions : { ...target_where_conditions, [org_col_nm]: org_id }
            let pl_column = pl_col_list;
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            let pl_groupBy = pl_groupBy_cols;

            let account_map_where = org_col_nm === 'div_id' ? { 'org_ccorg_cd': orgInfo.org_ccorg_cd } : {};

            let pl_view_select;
            if((org_col_nm !== 'lv1_id' || org_col_nm !== 'lv2_id') && orgInfo.lv3_ccorg_cd === '237100' || orgInfo.org_tp === 'account' || org_tp === 'account'){
                pl_view_select = account_pl_view;
            }else{
                pl_view_select = pl_view;
            };
            // DB 쿼리 실행 (병렬)
            const [target_data, pl_data, account_data, account_org_map_data, org_full_level_data] = await Promise.all([
                SELECT.from(target).columns(target_column).where(target_where),
                SELECT.from(pl_view_select).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(account_view).columns(['biz_tp_account_cd', 'biz_tp_account_nm', 'sort_order']),
                SELECT.from(account_org_map).columns(["biz_tp_account_cd", "org_ccorg_cd"]).where(account_map_where),
                SELECT.from(org_full_level).columns(['org_ccorg_cd', 'org_name']),
            ]);

            // if(!target_data.length && !pl_data.length){
            //     //return req.res.status(204).send();
            //     return []
            // }
            
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

            // div_name 삽입 (상위 Div)
            let account_pl_data = [];
            account_org_map_data.forEach(data=>{
                a_pl_data.forEach(data2=>{
                    if(data.biz_tp_account_cd === data2.account_cd){
                        const s_div_name = org_full_level_data.find(oData => oData.org_ccorg_cd === data.org_ccorg_cd)?.org_name;

                        data2.div_name = s_div_name;
                        account_pl_data.push(data2);
                    }
                })
            })

            account_org_map_data.forEach(data=>{
                let chk = account_pl_data.find(data2=>data.biz_tp_account_cd === data2.account_cd)
                if(!chk){
                    let o_find_account = account_data.find(o_account => o_account.biz_tp_account_cd === data.biz_tp_account_cd);
                    const s_div_name = org_full_level_data.find(oData => oData.org_ccorg_cd === data.org_ccorg_cd)?.org_name;
                    temp = {
                        "account_cd": data.biz_tp_account_cd,
                        "account_nm": o_find_account.biz_tp_account_nm,
                        "sort_order": o_find_account.sort_order,
                        "div_name":s_div_name,
                        "curr_sale": 0,
                        "curr_margin": 0,
                        "curr_margin_rate": 0,
                        "curr_sale_total_amount_sum": 0,
                        "curr_margin_total_amount_sum": 0
                    }
                    account_pl_data.push(temp);
                }
            })
            
            // 매출, 마진, 마진율 계산
            account_pl_data.forEach((o_pl_data, i) => {
                const s_org_ccorg_cd = account_org_map_data.find(oData => oData.biz_tp_account_cd === o_pl_data.account_cd)?.org_ccorg_cd;
                if (!s_org_ccorg_cd) return;
                const a_same_div = account_pl_data.filter(oData => oData.div_name === o_pl_data.div_name);
                const sale_data = {
                    "display_order": ((o_pl_data.sort_order + 1) * 3) - 2,
                    "div_name": o_pl_data.div_name,
                    "div_value": a_same_div.reduce((iSum, oData) => iSum += (oData?.curr_sale || 0), 0),
                    "account_id": o_pl_data.account_cd,
                    "account_nm": o_pl_data.account_nm,
                    "type": "매출",
                    "target_curr_y_value": (flat_target?.[`_${o_pl_data.account_cd}_${year}_sale_target`] ?? 0),
                    "actual_curr_ym_value": o_pl_data?.curr_sale ?? 0,
                    "actual_last_ym_value": o_pl_data?.last_sale ?? 0,
                    "actual_curr_ym_rate": (flat_target?.[`_${o_pl_data.account_cd}_${year}_sale_target`] ?? 0) === 0 ? 0 : (o_pl_data?.curr_sale ?? 0) / ((flat_target?.[`_${o_pl_data.account_cd}_${year}_sale_target`] ?? 0) * 100000000),
                    "actual_last_ym_rate": (o_pl_data?.last_sale_total_amount_sum ?? 0) === 0 ? 0 : (o_pl_data?.last_sale ?? 0) / (o_pl_data?.last_sale_total_amount_sum ?? 0)
                };

                const margin_data =
                {
                    "display_order": ((o_pl_data.sort_order + 1) * 3) - 1,
                    "div_name": o_pl_data.div_name,
                    "div_value": a_same_div.reduce((iSum, oData) => iSum += (oData?.curr_margin || 0), 0),
                    "account_id": o_pl_data.account_cd,
                    "account_nm": o_pl_data.account_nm,
                    "type": "마진",
                    "target_curr_y_value": (flat_target?.[`_${o_pl_data.account_cd}_${year}_margin_target`] ?? 0),
                    "actual_curr_ym_value": o_pl_data?.curr_margin ?? 0,
                    "actual_last_ym_value": o_pl_data?.last_margin ?? 0,
                    "actual_curr_ym_rate": (flat_target?.[`_${o_pl_data.account_cd}_${year}_margin_target`] ?? 0) === 0 ? 0 : (o_pl_data?.curr_margin ?? 0) / ((flat_target?.[`_${o_pl_data.account_cd}_${year}_margin_target`] ?? 0) * 100000000),
                    "actual_last_ym_rate": (o_pl_data?.last_margin_total_amount_sum ?? 0) === 0 ? 0 : (o_pl_data?.last_margin ?? 0) / (o_pl_data?.last_margin_total_amount_sum ?? 0)
                };

                const margin_rate_data =
                {
                    "display_order": ((o_pl_data.sort_order + 1) * 3),
                    "div_name": o_pl_data.div_name,
                    "div_value": (sale_data.div_value > 0) ? (margin_data.div_value / sale_data.div_value) : 0,
                    "account_id": o_pl_data.account_cd,
                    "account_nm": o_pl_data.account_nm,
                    "type": "마진율",
                    "target_curr_y_value": (flat_target?.[`_${o_pl_data.account_cd}_${year}_margin_rate_target`] ?? 0),
                    "actual_curr_ym_value": o_pl_data?.curr_margin_rate ?? 0,
                    "actual_last_ym_value": o_pl_data?.last_margin_rate ?? 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0
                    // "actual_curr_ym_rate": (flat_target?.[`_${o_pl_data.account_cd}_${year}_margin_rate_target`] ?? 0) === 0 ? 0 : (o_pl_data?.curr_margin_rate ?? 0) / (flat_target?.[`_${o_pl_data.account_cd}_${year}_margin_rate_target`] ?? 0) ,
                    // "actual_last_ym_rate": (o_pl_data?.last_sale_total_amount_sum ?? 0) === 0 ? 0 : ((o_pl_data?.last_margin ?? 0) / (o_pl_data?.last_sale ?? 0)) / ((o_pl_data?.last_margin_total_amount_sum ?? 0) / (o_pl_data?.last_sale_total_amount_sum ?? 0)) 
                };

                oResult.push(sale_data, margin_data, margin_rate_data);
            })

            oResult.sort((a, b) => a.display_order - b.display_order);
            return oResult
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}