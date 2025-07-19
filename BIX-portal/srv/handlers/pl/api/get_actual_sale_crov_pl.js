const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_sale_crov_pl', async (req) => {
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
            const pl_view = db.entities('pl').wideview_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;
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
            const pl_col_list = [
                'year', 'crov_div_yn', s_sale_column, s_margin_column];
            const pl_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { 'not in': ['WA', 'D'] }, 'crov_div_yn': { '!=': null } };
            const pl_groupBy_cols = ['year', 'crov_div_yn'];

            /**
             * org_id 파라미터값으로 조직정보 조회
             */
            let orgInfo = await SELECT.one.from(org_full_level).columns(['org_level', 'org_ccorg_cd', 'org_name'])
                .where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level+'_id';
            let org_col_nm_name = orgInfo['org_name'];
            let search_org, search_org_name, search_org_ccorg;
            if (org_col_nm === 'lv1_id' || org_col_nm === 'lv2_id' || org_col_nm === 'lv3_id') {
                search_org = 'div_id';
                search_org_name = 'div_name';
                search_org_ccorg = 'div_ccorg_cd';
            } else if (org_col_nm === 'div_id') {
                search_org = 'hdqt_id';
                search_org_name = 'hdqt_name';
                search_org_ccorg = 'hdqt_ccorg_cd';
            } else if (org_col_nm === 'hdqt_id' || org_col_nm === 'team_id') {
                search_org = 'team_id';
                search_org_name = 'team_name';
                search_org_ccorg = 'team_ccorg_cd';
            } else { return; };

            const org_query = await SELECT.from(org_full_level).orderBy('org_order');
            let org_query_data = [];
            org_query.forEach(data=>{
                if(data[org_col_nm] === org_id){
                    org_query_data.push(data)
                };
            })

            let pl_column = org_col_nm === 'div_id' ? [...pl_col_list, 'hdqt_id as id', 'hdqt_name as name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_col_list, 'team_id as id', 'team_name as name'] : [...pl_col_list, 'div_id as id', 'div_name as name'];
            let pl_where = org_col_nm === 'div_id' ? { ...pl_where_conditions, and: { [org_col_nm]: org_id } } : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? { ...pl_where_conditions, and: { [org_col_nm]: org_id } } : { ...pl_where_conditions, and: { [org_col_nm]: org_id } };
            let pl_groupBy = org_col_nm === 'div_id' ? [...pl_groupBy_cols, 'hdqt_id', 'hdqt_name'] : org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? [...pl_groupBy_cols, 'team_id', 'team_name'] : [...pl_groupBy_cols, 'div_id', 'div_name'];

            // DB 쿼리 실행 (병렬)
            let [pl_data] = await Promise.all([
                SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy)
            ]);

            //ackerton 로직
            let ackerton_list = [];
            let ackerton_org;
            if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                let ac_map = []
                ackerton_org = org_query.find(data=>data.org_ccorg_cd === '610000');
                org_query.forEach(data=>{
                    if (!ackerton_list.find(data2 => data2.id === data[search_org]) && data[search_org] && data['lv3_ccorg_cd'] === '610000') {
                        let oTemp = {
                            id: data[search_org],
                            name: data[search_org_name],
                            ccorg: data[search_org_ccorg],
                            org_order: data['org_order']
                        };
                        ackerton_list.push(oTemp);
                        ac_map.push(data[search_org])
                    };
                });
                pl_where = { ...pl_where, 'lv3_ccorg_cd' : '610000' };

                let ackerton_data = await SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols);

                let ackerton_curr_crov_t_sum_data = {
                    id: ackerton_org.org_id,
                    margin_amount_sum: 0,
                    name: ackerton_org.org_name,
                    crov_div_yn: true,
                    sale_amount_sum: 0,
                    year: year
                };

                let ackerton_curr_crov_f_sum_data = {
                    id: ackerton_org.org_id,
                    margin_amount_sum: 0,
                    name: ackerton_org.org_name,
                    crov_div_yn: false,
                    sale_amount_sum: 0,
                    year: year
                };

                let ackerton_last_crov_t_sum_data = {
                    id: ackerton_org.org_id,
                    margin_amount_sum: 0,
                    name: ackerton_org.org_name,
                    crov_div_yn: true,
                    sale_amount_sum: 0,
                    year: last_year
                };

                let ackerton_last_crov_f_sum_data = {
                    id: ackerton_org.org_id,
                    margin_amount_sum: 0,
                    name: ackerton_org.org_name,
                    crov_div_yn: false,
                    sale_amount_sum: 0,
                    year: last_year
                };

                //ackerton 하위 리스트
                ackerton_data.forEach(data => {
                    if(data.year === year){
                        if(data.crov_div_yn){
                            ackerton_curr_crov_t_sum_data.sale_amount_sum += data.sale_amount_sum;
                            ackerton_curr_crov_t_sum_data.margin_amount_sum += data.margin_amount_sum;
                        }else{
                            ackerton_curr_crov_f_sum_data.sale_amount_sum += data.sale_amount_sum;
                            ackerton_curr_crov_f_sum_data.margin_amount_sum += data.margin_amount_sum;
                        }
                    }else if(data.year === last_year){
                        if(data.crov_div_yn){
                            ackerton_last_crov_t_sum_data.sale_amount_sum += data.sale_amount_sum;
                            ackerton_last_crov_t_sum_data.margin_amount_sum += data.margin_amount_sum;
                        }else{
                            ackerton_last_crov_f_sum_data.sale_amount_sum += data.sale_amount_sum;
                            ackerton_last_crov_f_sum_data.margin_amount_sum += data.margin_amount_sum;
                        }
                    }
                });

                pl_data = pl_data.filter(item=>!ac_map.includes(item['id']))
                pl_data.push(ackerton_curr_crov_t_sum_data);
                pl_data.push(ackerton_curr_crov_f_sum_data);
                pl_data.push(ackerton_last_crov_t_sum_data);
                pl_data.push(ackerton_last_crov_f_sum_data);
            };
            
            //조직 리스트
            let org_list = [];
            org_query_data.forEach(data => {
                if (!org_list.find(data2 => data2.id === data[search_org]) && data[search_org]) {
                    let oTemp = {
                        id: data[search_org],
                        name: data[search_org_name],
                        ccorg: data[search_org_ccorg],
                        org_order: data['org_order']
                    };
                    
                    if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                        if(!ackerton_list.find(data3 => data3.ccorg === oTemp.ccorg)){
                            org_list.push(oTemp);
                        };
                    }else{
                        org_list.push(oTemp);
                    }
                };
            });

            if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                let oTemp = {
                    id: ackerton_org.org_id,
                    name: ackerton_org.org_name,
                    ccorg: ackerton_org.org_ccorg_cd,
                    org_order: ackerton_org.org_order
                };
                org_list.push(oTemp);
            };

            if (!pl_data.length) {
                //return req.res.status(204).send();
                return []
            }

            let i_count = 0;
            let o_data = {}
            let o_total = {
                sale_true: { "display_order": i_count, "org_name": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계', "crov_type": "신규", "type": "매출" },
                margin_true: { "display_order": ++i_count, "org_name": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계', "crov_type": "신규", "type": "마진" },
                margin_rate_true: { "display_order": ++i_count, "org_name": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계', "crov_type": "신규", "type": "마진율" },
                sale_false: { "display_order": ++i_count, "org_name": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계', "crov_type": "이월", "type": "매출" },
                margin_false: { "display_order": ++i_count, "org_name": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계', "crov_type": "이월", "type": "마진" },
                margin_rate_false: { "display_order": ++i_count, "org_name": org_col_nm === 'hdqt_id' || org_col_nm === 'team_id' ? org_col_nm_name : '합계', "crov_type": "이월", "type": "마진율" },
            };

            pl_data.forEach(o_pl => {
                if (!o_data[`${o_pl.id}`]) {
                    o_data[`${o_pl.id}`] = { id: o_pl.id, name: o_pl.name }
                }
                if (o_pl.year === year) {
                    if (o_pl.crov_div_yn === true) {
                        o_data[`${o_pl.id}`]['curr_true_sale'] = o_pl.sale_amount_sum
                        o_data[`${o_pl.id}`]['curr_true_margin'] = o_pl.margin_amount_sum
                    } else {
                        o_data[`${o_pl.id}`]['curr_false_sale'] = o_pl.sale_amount_sum
                        o_data[`${o_pl.id}`]['curr_false_margin'] = o_pl.margin_amount_sum
                    }
                } else {
                    if (o_pl.crov_div_yn === true) {
                        o_data[`${o_pl.id}`]['last_true_sale'] = o_pl.sale_amount_sum
                        o_data[`${o_pl.id}`]['last_true_margin'] = o_pl.margin_amount_sum
                    } else {
                        o_data[`${o_pl.id}`]['last_false_sale'] = o_pl.sale_amount_sum
                        o_data[`${o_pl.id}`]['last_false_margin'] = o_pl.margin_amount_sum
                    }
                }
            })
            let a_pl_data = Object.values(o_data);
            let org_data = [];
            org_list.forEach((data, i) => {
                let sale_true_data =
                {
                    "display_order": ++i_count,
                    "org_id": data.id,
                    "org_name": data.name,
                    "crov_type": "신규",
                    "type": "매출",
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_value_gap": 0
                };
                let margin_true_data =
                {
                    "display_order": ++i_count,
                    "org_id": data.id,
                    "org_name": data.name,
                    "crov_type": "신규",
                    "type": "마진",
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_value_gap": 0
                };
                let margin_rate_true_data =
                {
                    "display_order": ++i_count,
                    "org_id": data.id,
                    "org_name": data.name,
                    "crov_type": "신규",
                    "type": "마진율",
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_value_gap": 0
                };
                let sale_false_data =
                {
                    "display_order": ++i_count,
                    "org_id": data.id,
                    "org_name": data.name,
                    "crov_type": "이월",
                    "type": "매출",
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_value_gap": 0
                };
                let margin_false_data =
                {
                    "display_order": ++i_count,
                    "org_id": data.id,
                    "org_name": data.name,
                    "crov_type": "이월",
                    "type": "마진",
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_value_gap": 0
                };
                let margin_rate_false_data =
                {
                    "display_order": ++i_count,
                    "org_id": data.id,
                    "org_name": data.name,
                    "crov_type": "이월",
                    "type": "마진율",
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_value_gap": 0
                };
                a_pl_data.forEach((o_pl_data) => {
                    if (data.id === o_pl_data.id) {
                        sale_true_data["actual_curr_ym_value"] = o_pl_data?.["curr_true_sale"] ?? 0;
                        sale_true_data["actual_last_ym_value"] = o_pl_data?.["last_true_sale"] ?? 0;
                        sale_true_data["actual_curr_ym_value_gap"] = (o_pl_data?.["curr_true_sale"] ?? 0) - (o_pl_data?.["last_true_sale"] ?? 0);
                        margin_true_data["actual_curr_ym_value"] = o_pl_data?.["curr_true_margin"] ?? 0;
                        margin_true_data["actual_last_ym_value"] = o_pl_data?.["last_true_margin"] ?? 0;
                        margin_true_data["actual_curr_ym_value_gap"] = (o_pl_data?.["curr_true_margin"] ?? 0) - (o_pl_data?.["last_true_margin"] ?? 0);
                        margin_rate_true_data["actual_curr_ym_value"] = (o_pl_data?.["curr_true_sale"] ?? 0) === 0 ? 0 : (o_pl_data?.["curr_true_margin"] ?? 0) / o_pl_data["curr_true_sale"];
                        margin_rate_true_data["actual_last_ym_value"] = (o_pl_data?.["last_true_sale"] ?? 0) === 0 ? 0 : (o_pl_data?.["last_true_margin"] ?? 0) / o_pl_data["last_true_sale"];
                        margin_rate_true_data["actual_curr_ym_value_gap"] = ((o_pl_data?.["curr_true_sale"] ?? 0) === 0 ? 0 : (o_pl_data?.["curr_true_margin"] ?? 0) / o_pl_data["curr_true_sale"]) - ((o_pl_data?.["last_true_sale"] ?? 0) === 0 ? 0 : (o_pl_data?.["last_true_margin"] ?? 0) / o_pl_data["last_true_sale"]);
                        sale_false_data["actual_curr_ym_value"] = o_pl_data?.["curr_false_sale"] ?? 0;
                        sale_false_data["actual_last_ym_value"] = o_pl_data?.["last_false_sale"] ?? 0;
                        sale_false_data["actual_curr_ym_value_gap"] = (o_pl_data?.["curr_false_sale"] ?? 0) - (o_pl_data?.["last_false_sale"] ?? 0);
                        margin_false_data["actual_curr_ym_value"] = o_pl_data?.["curr_false_margin"] ?? 0;
                        margin_false_data["actual_last_ym_value"] = o_pl_data?.["last_false_margin"] ?? 0;
                        margin_false_data["actual_curr_ym_value_gap"] = (o_pl_data?.["curr_false_margin"] ?? 0) - (o_pl_data?.["last_false_margin"] ?? 0);
                        margin_rate_false_data["actual_curr_ym_value"] = (o_pl_data?.["curr_false_sale"] ?? 0) === 0 ? 0 : (o_pl_data?.["curr_false_margin"] ?? 0) / o_pl_data["curr_false_sale"];
                        margin_rate_false_data["actual_last_ym_value"] = (o_pl_data?.["last_false_sale"] ?? 0) === 0 ? 0 : (o_pl_data?.["last_false_margin"] ?? 0) / o_pl_data["last_false_sale"];
                        margin_rate_false_data["actual_curr_ym_value_gap"] = ((o_pl_data?.["curr_false_sale"] ?? 0) === 0 ? 0 : (o_pl_data?.["curr_false_margin"] ?? 0) / o_pl_data["curr_false_sale"]) - ((o_pl_data?.["last_false_sale"] ?? 0) === 0 ? 0 : (o_pl_data?.["last_false_margin"] ?? 0) / o_pl_data["last_false_sale"]);

                        org_data.push(sale_true_data, margin_true_data, margin_rate_true_data, sale_false_data, margin_false_data, margin_rate_false_data);
                    };

                    if (i === 0) {
                        o_total['sale_true']['actual_curr_ym_value'] = (o_total['sale_true']['actual_curr_ym_value'] || 0) + (o_pl_data?.["curr_true_sale"] ?? 0)
                        o_total['sale_true']['actual_last_ym_value'] = (o_total['sale_true']['actual_last_ym_value'] || 0) + (o_pl_data?.["last_true_sale"] ?? 0)
                        o_total['sale_true']['actual_curr_ym_value_gap'] = o_total['sale_true']['actual_curr_ym_value'] - o_total['sale_true']['actual_last_ym_value']
                        o_total['margin_true']['actual_curr_ym_value'] = (o_total['margin_true']['actual_curr_ym_value'] || 0) + (o_pl_data?.["curr_true_margin"] ?? 0)
                        o_total['margin_true']['actual_last_ym_value'] = (o_total['margin_true']['actual_last_ym_value'] || 0) + (o_pl_data?.["last_true_margin"] ?? 0)
                        o_total['margin_true']['actual_curr_ym_value_gap'] = o_total['margin_true']['actual_curr_ym_value'] - o_total['margin_true']['actual_last_ym_value']
                        o_total['sale_false']['actual_curr_ym_value'] = (o_total['sale_false']['actual_curr_ym_value'] || 0) + (o_pl_data?.["curr_false_sale"] ?? 0)
                        o_total['sale_false']['actual_last_ym_value'] = (o_total['sale_false']['actual_last_ym_value'] || 0) + (o_pl_data?.["last_false_sale"] ?? 0)
                        o_total['sale_false']['actual_curr_ym_value_gap'] = o_total['sale_false']['actual_curr_ym_value'] - o_total['sale_false']['actual_last_ym_value']
                        o_total['margin_false']['actual_curr_ym_value'] = (o_total['margin_false']['actual_curr_ym_value'] || 0) + (o_pl_data?.["curr_false_margin"] ?? 0)
                        o_total['margin_false']['actual_last_ym_value'] = (o_total['margin_false']['actual_last_ym_value'] || 0) + (o_pl_data?.["last_false_margin"] ?? 0)
                        o_total['margin_false']['actual_curr_ym_value_gap'] = o_total['margin_false']['actual_curr_ym_value'] - o_total['margin_false']['actual_last_ym_value']
                    }
                });
            });
            o_total['margin_rate_true']['actual_curr_ym_value'] = (o_total['sale_true']?.['actual_curr_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin_true']?.['actual_curr_ym_value'] ?? 0) / o_total['sale_true']['actual_curr_ym_value'];
            o_total['margin_rate_true']['actual_last_ym_value'] = (o_total['sale_true']?.['actual_last_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin_true']?.['actual_last_ym_value'] ?? 0) / o_total['sale_true']['actual_last_ym_value'];
            o_total['margin_rate_true']['actual_curr_ym_value_gap'] = o_total['margin_rate_true']['actual_curr_ym_value'] - o_total['margin_rate_true']['actual_last_ym_value'];
            o_total['margin_rate_false']['actual_curr_ym_value'] = (o_total['sale_false']?.['actual_curr_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin_false']?.['actual_curr_ym_value'] ?? 0) / o_total['sale_false']['actual_curr_ym_value'];
            o_total['margin_rate_false']['actual_last_ym_value'] = (o_total['sale_false']?.['actual_last_ym_value'] ?? 0) === 0 ? 0 : (o_total['margin_false']?.['actual_last_ym_value'] ?? 0) / o_total['sale_false']['actual_last_ym_value'];
            o_total['margin_rate_false']['actual_curr_ym_value_gap'] = o_total['margin_rate_false']['actual_curr_ym_value'] - o_total['margin_rate_false']['actual_last_ym_value'];

            let a_total_data = Object.values(o_total);
            a_total_data.forEach((o_total, i) => {
                o_total["actual_curr_ym_value"] = o_total?.actual_curr_ym_value ?? 0;
                o_total["actual_last_ym_value"] = o_total?.actual_last_ym_value ?? 0;
                o_total["actual_curr_ym_value_gap"] = o_total?.actual_curr_ym_value_gap ?? 0;
            });

            oResult.push(...a_total_data);
            if (org_col_nm !== 'hdqt_id' && org_col_nm !== 'team_id') {
                oResult.push(...org_data);
            }

            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}