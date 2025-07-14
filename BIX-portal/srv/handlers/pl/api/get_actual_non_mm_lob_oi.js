const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_non_mm_lob_oi', async (req) => {
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
             * pl.wideview_non_mm_view [실적]
             * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const pl_view = db.entities('pl').wideview_non_mm_view;
            /**
             * common_target
             * 조직 별 연단위 목표금액
             */
            const target = db.entities('common').annual_target_temp_view;
            //org_tp:account, hybrid일 경우 사용
            const account_pl_view = db.entities('pl').wideview_account_non_mm_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;
            
            const code_header = db.entities('common').code_header;
            const code_item = db.entities('common').code_item;
            let a_codeHeader = await SELECT.one.from(code_header).columns(['ID']).where({'category':'BD2'})
            const s_header_id = a_codeHeader['ID'];
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
            for(let i=1;i<=Number(month); i++){
                a_sale_column.push(`ifnull(sum(sale_m${i}_amt), 0)`)
                a_margin_column.push(`ifnull(sum(margin_m${i}_amt), 0)`)
            }
            let s_sale_column = "("+a_sale_column.join(' + ')+') as sale_amount_sum';
            let s_margin_column = "("+a_margin_column.join(' + ')+') as margin_amount_sum';
            const pl_col_list = [
                'year', 'bd_n2_cd', s_sale_column, s_margin_column];
            const pl_where_conditions = { 'year': { in: [year, last_year] }, 'is_delivery': true, 'src_type': { 'not in':['WA','D']}};
            const pl_groupBy_cols = ['year', 'bd_n2_cd'];

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
            const [pl_data, code_item_data] = await Promise.all([
                SELECT.from(pl_view_selec).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(code_item).columns(['name','value','sort_order']).where({'delete_yn':false,'use_yn':true, 'header_ID':s_header_id})
            ]);
            if(!pl_data.length){
                //return req.res.status(204).send();
                return []
            }
            
            let o_data = {}
            pl_data.forEach(o_pl=>{
                let o_find_account = code_item_data.find(data => data.name === o_pl.bd_n2_cd);
                if(o_find_account){
                    if(!o_data[`${o_pl.bd_n2_cd}`]){
                        o_data[`${o_pl.bd_n2_cd}`]={lob_name: o_find_account.name, display_order:o_find_account.value};
                    }
                    if(o_pl.year === year){
                        o_data[`${o_pl.bd_n2_cd}`]['curr_sale'] = o_pl?.sale_amount_sum ?? 0;
                        o_data[`${o_pl.bd_n2_cd}`]['curr_margin'] = o_pl?.margin_amount_sum ?? 0;
                        o_data[`${o_pl.bd_n2_cd}`]['curr_margin_rate'] = (o_pl?.sale_amount_sum ?? 0) === 0 ? 0 : (o_pl?.margin_amount_sum ?? 0)/o_pl.sale_amount_sum;
                    }else{
                        o_data[`${o_pl.bd_n2_cd}`]['last_sale'] = o_pl?.sale_amount_sum ?? 0;
                        o_data[`${o_pl.bd_n2_cd}`]['last_margin'] = o_pl?.margin_amount_sum ?? 0;
                        o_data[`${o_pl.bd_n2_cd}`]['last_margin_rate'] = (o_pl?.sale_amount_sum ?? 0) === 0 ? 0 : (o_pl?.margin_amount_sum ?? 0)/o_pl.sale_amount_sum;
                    }
                }
            })

            const a_data = Object.values(o_data);
            let o_total = {
                sale: {"type": "매출"},
                margin: {"type": "마진"},
                margin_rate: {"type": "마진율"},
            }; 
            i_count = 2;
            code_item_data.forEach((data,i)=>{
                let o_sale_temp = {
                    "display_order": ++i_count,
                    "lob_name": data.name,
                    "type":'매출',
                    "target_curr_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                }
                let o_margin_temp = {
                    "display_order": ++i_count,
                    "lob_name": data.name,
                    "type":'마진',
                    "target_curr_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                }
                let o_margin_rate_temp = {
                    "display_order": ++i_count,
                    "lob_name": data.name,
                    "type":'마진율',
                    "target_curr_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                }

                a_data.forEach(a_data=>{
                    if(a_data.lob_name === data.name){
                        o_sale_temp["target_curr_y_value"] = 0;
                        o_sale_temp["actual_curr_ym_value"] = a_data?.curr_sale ?? 0;
                        o_sale_temp["actual_last_ym_value"] = a_data?.last_sale ?? 0;
                        o_sale_temp["actual_curr_ym_rate"] = 0;
                        o_sale_temp["actual_last_ym_rate"] = 0;
                            
                        o_margin_temp["target_curr_y_value"] = 0;
                        o_margin_temp["actual_curr_ym_value"] = a_data?.curr_margin ?? 0;
                        o_margin_temp["actual_last_ym_value"] = a_data?.last_margin ?? 0;
                        o_margin_temp["actual_curr_ym_rate"] = 0;
                        o_margin_temp["actual_last_ym_rate"] = 0;

                        o_margin_rate_temp["target_curr_y_value"] = 0;
                        o_margin_rate_temp["actual_curr_ym_value"] = a_data?.curr_margin_rate ?? 0;
                        o_margin_rate_temp["actual_last_ym_value"] = a_data?.last_margin_rate ?? 0;
                        o_margin_rate_temp["actual_curr_ym_rate"] = 0;
                        o_margin_rate_temp["actual_last_ym_rate"] = 0;

                        o_total['sale']['target_curr_y_value'] = 0;
                        o_total['sale']['actual_curr_ym_value'] = (o_total['sale']['actual_curr_ym_value'] || 0) + o_sale_temp.actual_curr_ym_value;
                        o_total['sale']['actual_last_ym_value'] = (o_total['sale']['actual_last_ym_value'] || 0) + o_sale_temp.actual_last_ym_value;
                        o_total['margin']['target_curr_y_value'] = 0;
                        o_total['margin']['actual_curr_ym_value'] = (o_total['margin']['actual_curr_ym_value'] || 0) + o_margin_temp.actual_curr_ym_value;
                        o_total['margin']['actual_last_ym_value'] = (o_total['margin']['actual_last_ym_value'] || 0) + o_margin_temp.actual_last_ym_value;
                    };
                })
                oResult.push(o_sale_temp,o_margin_temp,o_margin_rate_temp);
            });
            
            oResult.sort((a,b)=>a.display_order - b.display_order);
            
            // o_total['margin_rate']['target_curr_y_value'] = (o_total['sale']?.['target_curr_y_value'] ?? 0) === 0 ? 0 : (o_total['margin']?.['target_curr_y_value'] ?? 0)/o_total['sale']['target_curr_y_value'];
            // o_total['margin_rate']['actual_curr_ym_value'] = (o_total['sale']?.['actual_curr_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin']?.['actual_curr_ym_value'] ?? 0)/o_total['sale']['actual_curr_ym_value'];
            // o_total['margin_rate']['actual_last_ym_value'] = (o_total['sale']?.['actual_last_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin']?.['actual_last_ym_value'] ?? 0)/o_total['sale']['actual_last_ym_value'];
            
            let a_total_data = Object.values(o_total);
            let a_total=[];
            a_total_data.forEach((o_total, i)=>{
                let o_temp = {
                    "display_order": i,
                    "lob_name": "합계",
                    "type": o_total.type,
                    "target_curr_y_value": o_total?.target_curr_y_value ?? 0,
                    "actual_curr_ym_value": o_total?.actual_curr_ym_value ?? 0,
                    "actual_last_ym_value": o_total?.actual_last_ym_value ?? 0,
                    "actual_curr_ym_rate": (o_total?.target_curr_y_value ?? 0) === 0 ? 0 : (o_total?.actual_curr_ym_value ?? 0)/(o_total.target_curr_y_value*100000000),
                    "actual_last_ym_rate": (o_total?.target_last_y_value ?? 0) === 0 ? 0 : (o_total?.actual_last_ym_value ?? 0)/(o_total.target_last_y_value*100000000),
                };
                a_total.push(o_temp);
            })
            oResult.unshift(...a_total);

            return oResult
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}