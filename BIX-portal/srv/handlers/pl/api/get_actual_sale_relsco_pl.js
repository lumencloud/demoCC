const e = require('express');
const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_sale_relsco_pl', async (req) => {
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
            //org_tp:account, hybrid일 경우 사용
            const account_pl_view = db.entities('pl').wideview_account_view;
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
            for(let i=1;i<=Number(month); i++){
                a_sale_column.push(`sum(sale_m${i}_amt)`)
            }
            let s_sale_column = "("+a_sale_column.join(' + ')+') as sale_amount_sum';
            
            const pl_col_list = ['year', 'lv3_ccorg_cd', 'relsco_yn', 'org_tp', s_sale_column];
            const pl_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { 'not in': ['WA', 'D']}, 'relsco_yn': {'!=': null}};
            const pl_groupBy_cols = ['year', 'lv3_ccorg_cd', 'relsco_yn', 'org_tp',];

            /**
             * org_id 파라미터값으로 조직정보 조회
             * 
             */
            let orgInfo = await SELECT.one.from(org_full_level).columns(['org_level', 'org_ccorg_cd', 'org_name', 'org_tp', 'lv3_ccorg_cd']).where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level+'_ccorg_cd';
            let org_col_nm_name = orgInfo['org_name'];
            let search_org, search_org_name, search_org_ccorg, child_level;
            if(org_col_nm === 'lv1_ccorg_cd' || org_col_nm === 'lv2_ccorg_cd' || org_col_nm === 'lv3_ccorg_cd'){
                search_org = 'div_id';
                search_org_name = 'div_name';
                search_org_ccorg = 'div_ccorg_cd';
                child_level = 'div';
            }else if(org_col_nm === 'div_ccorg_cd'){
                search_org = 'hdqt_id';
                search_org_name = 'hdqt_name';
                search_org_ccorg = 'hdqt_ccorg_cd';
                child_level = 'hdqt';
            }else if(org_col_nm === 'hdqt_ccorg_cd'){
                search_org = 'team_id';
                search_org_name = 'team_name';
                search_org_ccorg = 'team_ccorg_cd';
                child_level = 'team';
            }else{return;};

            let pl_column = [`${search_org_ccorg} as org_ccorg_cd`, `${search_org_name} as org_name`, ...pl_col_list] 
            let pl_where = (org_col_nm.includes('lv1')) ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: orgInfo.org_ccorg_cd };
            let pl_groupBy = [...pl_groupBy_cols, search_org_ccorg, search_org_name];

            // DB 쿼리 실행 (병렬)
            const [pl_data, account_pl_data, org_query] = await Promise.all([
                SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(account_pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
                SELECT.from(org_full_level)
            ]);

            // 데이터가 없을 때 빈 배열 반환
            if(!pl_data.find(oData => oData.sale_amount_sum > 0) && !account_pl_data.find(oData => oData.sale_amount_sum > 0)){
                return [];
            }

            //org 정리 및 ackerton 리스트 작성
            let org_query_data = [];
            let ackerton_list = [];
            org_query.forEach(data=>{
                if(data[org_col_nm] === orgInfo.org_ccorg_cd && data['org_level'] !== 'team' && data['org_level'] === child_level){
                    org_query_data.push(data);
                };
                if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                    if (!ackerton_list.find(data2 => data2 === data[search_org_ccorg]) && data[search_org_ccorg] && data['lv3_ccorg_cd'] === '610000') {
                        ackerton_list.push(data[search_org_ccorg]);
                    };
                };
            });

            let org_list = [];
            org_query_data.forEach(data => {
                if (!org_list.find(data2 => data2.id === data[search_org]) && data[search_org] && data.org_level !== 'team') {
                    let oTemp = {
                        id: data[search_org],
                        name: data[search_org_name],
                        ccorg: data[search_org_ccorg],
                        org_order: data['org_order'],
                        org_tp: data['org_tp']
                    };
                    
                    if((orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2') && data.org_tp === 'delivery' || data.org_tp === 'account'){
                        if(!ackerton_list.find(data3 => data3 === oTemp.ccorg)){
                            org_list.push(oTemp);
                        };
                    }else{
                        if(data.org_tp === 'delivery' || data.org_tp === 'account'){
                            org_list.push(oTemp);
                        }else if(orgInfo.lv3_ccorg_cd === '237100'){
                            org_list.push(oTemp);
                        }
                    }
                };
            });

            //1, 2레벨 검색시 ackerton 데이터 수집
            let ackerton_org, ackerton_rel_true_data={}, ackerton_rel_false_data={};
            if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                ackerton_org = org_query.find(data=>data.org_ccorg_cd === '610000');
                org_list.push({
                    id: ackerton_org['org_id'],
                    name: ackerton_org['org_name'],
                    ccorg: ackerton_org['org_ccorg_cd'],
                    org_order: ackerton_org['org_order'],
                    org_tp: ackerton_org['org_tp']
                });
                ackerton_rel_true_data[`${ackerton_org.org_ccorg_cd}`]={ccorg: ackerton_org.org_ccorg_cd, name:ackerton_org.org_name, relsco_yn:true, actual_curr_ym_value : 0, actual_last_ym_value : 0};
                ackerton_rel_false_data[`${ackerton_org.org_ccorg_cd}`]={ccorg: ackerton_org.org_ccorg_cd, name:ackerton_org.org_name, relsco_yn:false, actual_curr_ym_value : 0, actual_last_ym_value : 0};
            };

            //1, 2레벨 검색시 전체 합계 및 delivery소계, account소계 출력. 
            //pl_data에서는 delivery 데이터, account_pl_data에서는 account 데이터 얻음.
            let o_total = {}; 
            let total_rel_true = {"display_order": 0,"org_order":"001","org_id":"true_total","org_name":'합계',"relsco_type": "대내","type": "매출", "actual_curr_ym_value":0,"actual_last_ym_value": 0};
            let total_rel_false = {"display_order": 0,"org_order":"002","org_id":"false_total","org_name":'합계',"relsco_type": "대외","type": "매출", "actual_curr_ym_value":0,"actual_last_ym_value": 0};

            let o_pl_rel_true_data = {}, o_pl_rel_false_data = {};
            if(pl_data?.length && orgInfo.lv3_ccorg_cd!=='237100'){
                let s_total = org_col_nm_name;
                if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                    s_total = 'Delivery 소계';
                }else if(orgInfo.org_level === 'lv3' || orgInfo.org_level === 'div'){
                    s_total = '합계';
                };
                o_total.delivery_sale_true= {"display_order": 1,"org_order":"001","org_id":"delivery_true_total","org_name": s_total,"relsco_type": "대내","type": "매출", "actual_curr_ym_value":0,"actual_last_ym_value": 0};
                o_total.delivery_sale_false= {"display_order": 1,"org_order":"002","org_id":"delivery_false_total","org_name": s_total,"relsco_type": "대외","type": "매출", "actual_curr_ym_value":0,"actual_last_ym_value": 0};
                pl_data.forEach(data=>{
                    if(data.relsco_yn === true){
                        if(!o_pl_rel_true_data[`${data.org_ccorg_cd}`]){
                            o_pl_rel_true_data[`${data.org_ccorg_cd}`]={ccorg: data.org_ccorg_cd, name:data.org_name, relsco_yn:true, sale_amount_sum : 0, actual_curr_ym_value : 0, actual_last_ym_value:0};
                        };

                        if(data.year === year){
                            if(((orgInfo.org_level === 'lv1'||orgInfo.org_level === 'lv2') && data.org_tp === 'delivery') || (orgInfo.org_level !== 'lv1' && orgInfo.org_level !== 'lv2')){
                                o_pl_rel_true_data[`${data.org_ccorg_cd}`]['actual_curr_ym_value'] += data?.['sale_amount_sum'] ?? 0;
                                o_total.delivery_sale_true.actual_curr_ym_value += data?.['sale_amount_sum'] ?? 0;
                            };
                            total_rel_true.actual_curr_ym_value += data?.['sale_amount_sum'] ?? 0;
                        }else if(data.year === last_year){
                            if(((orgInfo.org_level === 'lv1'||orgInfo.org_level === 'lv2') && data.org_tp === 'delivery') || (orgInfo.org_level !== 'lv1' && orgInfo.org_level !== 'lv2')){
                                o_pl_rel_true_data[`${data.org_ccorg_cd}`]['actual_last_ym_value'] += data?.['sale_amount_sum'] ?? 0;
                                o_total.delivery_sale_true.actual_last_ym_value += data?.['sale_amount_sum'] ?? 0;
                            }
                            total_rel_true.actual_last_ym_value += data?.['sale_amount_sum'] ?? 0;
                        };
                    }else{
                        if(!o_pl_rel_false_data[`${data.org_ccorg_cd}`]){
                            o_pl_rel_false_data[`${data.org_ccorg_cd}`]={ccorg: data.org_ccorg_cd, name:data.org_name, relsco_yn:false, sale_amount_sum : 0,actual_curr_ym_value : 0, actual_last_ym_value:0};
                        };

                        if(data.year === year){
                            if(((orgInfo.org_level === 'lv1'||orgInfo.org_level === 'lv2') && data.org_tp === 'delivery') || (orgInfo.org_level !== 'lv1' && orgInfo.org_level !== 'lv2')){
                                o_pl_rel_false_data[`${data.org_ccorg_cd}`]['actual_curr_ym_value'] += data?.['sale_amount_sum'] ?? 0;
                                o_total.delivery_sale_false.actual_curr_ym_value += data?.['sale_amount_sum'] ?? 0;
                            }
                            total_rel_false.actual_curr_ym_value += data?.['sale_amount_sum'] ?? 0;
                        }else if(data.year === last_year){
                            if(((orgInfo.org_level === 'lv1'||orgInfo.org_level === 'lv2') && data.org_tp === 'delivery') || (orgInfo.org_level !== 'lv1' && orgInfo.org_level !== 'lv2')){
                                o_pl_rel_false_data[`${data.org_ccorg_cd}`]['actual_last_ym_value'] += data?.['sale_amount_sum'] ?? 0;
                                o_total.delivery_sale_false.actual_last_ym_value += data?.['sale_amount_sum'] ?? 0;
                            }
                            total_rel_false.actual_last_ym_value += data?.['sale_amount_sum'] ?? 0;
                        };
                    };

                    if(data.lv3_ccorg_cd === '610000' && (orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2') && data.org_tp === 'delivery'){
                        if(data.relsco_yn === true){
                            if(data.year === year){
                                ackerton_rel_true_data[`${ackerton_org.org_ccorg_cd}`]['actual_curr_ym_value'] += data?.['sale_amount_sum'] ?? 0;
                            }else if(data.year === last_year){
                                ackerton_rel_true_data[`${ackerton_org.org_ccorg_cd}`]['actual_last_ym_value'] += data?.['sale_amount_sum'] ?? 0;
                            }
                        }else{
                            if(data.year === year){
                                ackerton_rel_false_data[`${ackerton_org.org_ccorg_cd}`]['actual_curr_ym_value'] += data?.['sale_amount_sum'] ?? 0;
                            }else if(data.year === last_year){
                                ackerton_rel_false_data[`${ackerton_org.org_ccorg_cd}`]['actual_last_ym_value'] += data?.['sale_amount_sum'] ?? 0;
                            }
                        };
                    };
                })
            }

            let a_pl_rel_true_data = Object.values(o_pl_rel_true_data);
            let a_pl_rel_false_data = Object.values(o_pl_rel_false_data);
            if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                a_pl_rel_true_data.push(...Object.values(ackerton_rel_true_data));
                a_pl_rel_false_data.push(...Object.values(ackerton_rel_false_data));
            };

            let o_account_pl_rel_true_data = {}, o_account_pl_rel_false_data = {};
            if(account_pl_data?.length){
                let s_total = org_col_nm_name;
                if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                    s_total = 'Account 소계';
                }else if(orgInfo.org_level === 'lv3' || orgInfo.org_level === 'div'){
                    s_total = '합계';
                };
                o_total.account_sale_true= {"display_order": 2,"org_order":"001","org_id":"account_true_total","org_name": s_total,"relsco_type": "대내","type": "매출", "actual_curr_ym_value":0,"actual_last_ym_value": 0},
                o_total.account_sale_false= {"display_order": 2,"org_order":"002","org_id":"account_false_total","org_name": s_total,"relsco_type": "대외","type": "매출", "actual_curr_ym_value":0,"actual_last_ym_value": 0},
                account_pl_data.forEach(data=>{
                    if(data.relsco_yn === true){
                        if(!o_account_pl_rel_true_data[`${data.org_ccorg_cd}`]){
                            o_account_pl_rel_true_data[`${data.org_ccorg_cd}`]={ccorg: data.org_ccorg_cd, name:data.org_name, relsco_yn:true, actual_curr_ym_value : 0, actual_last_ym_value:0};
                        };

                        if(data.year === year){
                            o_account_pl_rel_true_data[`${data.org_ccorg_cd}`]['actual_curr_ym_value'] += data['sale_amount_sum'];
                            o_total.account_sale_true.actual_curr_ym_value += data?.['sale_amount_sum'] ?? 0;
                        }else if(data.year === last_year){
                            o_account_pl_rel_true_data[`${data.org_ccorg_cd}`]['actual_last_ym_value'] += data['sale_amount_sum'];
                            o_total.account_sale_true.actual_last_ym_value += data?.['sale_amount_sum'] ?? 0;
                        };
                    }else{
                        if(!o_account_pl_rel_false_data[`${data.org_ccorg_cd}`]){
                            o_account_pl_rel_false_data[`${data.org_ccorg_cd}`]={ccorg: data.org_ccorg_cd, name:data.org_name, relsco_yn:false, actual_curr_ym_value : 0, actual_last_ym_value:0};
                        };

                        if(data.year === year){
                            o_account_pl_rel_false_data[`${data.org_ccorg_cd}`]['actual_curr_ym_value'] += data['sale_amount_sum'];
                            o_total.account_sale_false.actual_curr_ym_value += data?.['sale_amount_sum'] ?? 0;
                        }else if(data.year === last_year){
                            o_account_pl_rel_false_data[`${data.org_ccorg_cd}`]['actual_last_ym_value'] += data['sale_amount_sum'];
                            o_total.account_sale_false.actual_last_ym_value += data?.['sale_amount_sum'] ?? 0;
                        };
                    }
                })
            }

            let a_account_pl_rel_true_data = Object.values(o_account_pl_rel_true_data);
            let a_account_pl_rel_false_data = Object.values(o_account_pl_rel_false_data);
            let a_total_data = Object.values(o_total);
            //1,2레벨에서만 전체 합계 출력
            if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                a_total_data.push(total_rel_true);
                a_total_data.push(total_rel_false);
            };

            //조직 정보를 바탕으로 데이터 최종 정리
            let org_data = [];
            org_list.forEach(data=>{
                let display_order = 1;
                if(data.org_tp !== 'delivery'){
                    display_order = 2;
                };

                let sale_true_data =
                {
                    "display_order": display_order,
                    "org_order": data.org_order,
                    "org_id": data.id,
                    "org_name": data.name,
                    "relsco_type": "대내",
                    "type": "매출",
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                };
                let sale_false_data =
                {
                    "display_order": display_order,
                    "org_order": data.org_order,
                    "org_id": data.id,
                    "org_name": data.name,
                    "relsco_type": "대외",
                    "type": "매출",
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                };

                let select_a_true_data, select_a_false_data;
                if(data.org_tp === 'delivery'){
                    select_a_true_data = a_pl_rel_true_data;
                    select_a_false_data = a_pl_rel_false_data;
                }else{
                    select_a_true_data = a_account_pl_rel_true_data;
                    select_a_false_data = a_account_pl_rel_false_data;
                };
                let o_rel_true = select_a_true_data.find(data2=>data2.ccorg === data.ccorg);
                let o_rel_false = select_a_false_data.find(data2=>data2.ccorg === data.ccorg);

                sale_true_data["actual_curr_ym_value"] = o_rel_true?.["actual_curr_ym_value"] ?? 0;
                sale_true_data["actual_last_ym_value"] = o_rel_true?.["actual_last_ym_value"] ?? 0;
                sale_false_data["actual_curr_ym_value"] = o_rel_false?.["actual_curr_ym_value"] ?? 0;
                sale_false_data["actual_last_ym_value"] = o_rel_false?.["actual_last_ym_value"] ?? 0;
 
                org_data.push(sale_true_data,sale_false_data);
            });

            oResult.push(...a_total_data);
            if(org_col_nm !== 'hdqt_id' && org_col_nm !== 'team_id'){
                oResult.push(...org_data);
            }

            //정렬
            let a_sort_field = [
                { field: "display_order", order: "asc" },
                { field: "org_order", order: "asc" },
            ];
            oResult.sort((oItem1, oItem2) => {
                for (const { field, order } of a_sort_field) {
                    // 필드가 null일 때
                    if (oItem1[field] === null && oItem2[field] !== null) return -1;
                    if (oItem1[field] !== null && oItem2[field] === null) return 1;
                    if (oItem1[field] === null && oItem2[field] === null) continue;

                    if (typeof oItem1[field] === "number") {
                        var result = oItem1[field] - oItem2[field];
                    } else {
                        var result = oItem1[field].localeCompare(oItem2[field]);
                    }

                    if (result !== 0) {
                        return (order === "asc") ? result : -result;
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