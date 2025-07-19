const check_user_auth = require('../../function/check_user_auth');
const check_org_exception = require('../../function/check_org_exception');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_actual_sale_org_pl', async (req) => {
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
             * [실적]
             * [부문/본부/팀 + 년,month_amt,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const pl_view = db.entities('pl').wideview_org_view;

            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;

            //org_tp:account, hybrid일 경우 사용
            const account_pl_view = db.entities('pl').wideview_account_org_view;
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id, org_tp, display_type } = req.data;
            const last_year = (Number(year) - 1).toString();

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

            let sale_sum_col = "(" + a_sale_column.join(' + ') + ') as sale_amount_sum';
            let sale_sum_total_col = "(" + a_sale_total_column.join(' + ') + ') as sale_total_amount_sum';
            let margin_sum_col = "(" + a_margin_column.join(' + ') + ') as margin_amount_sum';
            let margin_sum_total_col = "(" + a_margin_total_column.join(' + ') + ') as margin_total_amount_sum';

            /**
             * org_id 파라미터값으로 조직정보 조회
             */
            let orgInfo = await SELECT.one.from(org_full_level).columns(['org_level', 'org_ccorg_cd', "lv1_name", "lv2_name", "lv3_name", "lv3_ccorg_cd", "div_name", "hdqt_name", "team_name", "org_name", 'org_tp']).where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level + '_id';
            let org_ccorg = orgInfo.org_ccorg_cd;
            let org_ccorg_col = orgInfo.org_level + '_ccorg_cd';
            let search_org, search_org_name, search_org_ccorg;
            const pl_col_list = ['year', 'div_ccorg_cd', sale_sum_col, sale_sum_total_col, margin_sum_col, margin_sum_total_col];
            if (orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2' || orgInfo.org_level === 'lv3') {
                search_org = 'div_id';
                search_org_name = 'div_name';
                search_org_ccorg = 'div_ccorg_cd';
            } else if (orgInfo.org_level === 'div') {
                search_org = 'hdqt_id';
                search_org_name = 'hdqt_name';
                search_org_ccorg = 'hdqt_ccorg_cd';
            } else if (orgInfo.org_level === 'hdqt' || orgInfo.org_level === 'team') {
                search_org = 'team_id';
                search_org_name = 'team_name';
                search_org_ccorg = 'team_ccorg_cd';
            } else { return; };

            const org_query = await SELECT.from(org_full_level).orderBy('org_order');
            let org_query_data = [];
            org_query.forEach(data=>{
                if(data[org_col_nm] === org_id && data['org_level'] !== 'team'){
                    if(org_tp){
                        if(data['org_tp'] === org_tp){
                            org_query_data.push(data)
                        }
                        if(orgInfo.org_level === 'div' && data['div_ccorg_cd'] === '241100' && data['org_tp'] === 'staff'){
                            org_query_data.push(data)
                        }
                    }else{
                        org_query_data.push(data)
                    }
                };
            })

            /**
             * DT 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            let aAddList = [search_org, search_org_name];
            pl_col_list.push(...aAddList);
            const pl_where_conditions = { 'year': { in: [year, last_year] } };
            let account_pl_where = orgInfo.org_level === 'lv1' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };
            let pl_where = (orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2') ? { ...pl_where_conditions, 'org_tp':'delivery' } : { ...pl_where_conditions, [org_col_nm]: org_id };
            const pl_groupBy_cols = ['year', 'div_ccorg_cd', search_org, search_org_name];

            // DB 쿼리 실행 (병렬)
            let [pl_data, account_pl_data, target_data] = await Promise.all([
                SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols),
                SELECT.from(account_pl_view).columns(pl_col_list).where(account_pl_where).groupBy(...pl_groupBy_cols),
                get_org_target(year, ['A01', 'A03', 'A02'])
            ]);

            if(display_type !== 'chart' &&!pl_data.length && !account_pl_data.length){
                //return req.res.status(204).send();
                return []
            }

            //ackerton 로직
            let ackerton_list = [];
            let ackerton_org;
            if((orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2') && org_tp !== 'account'){
                let ac_map = []
                ackerton_org = org_query.find(data=>data.org_ccorg_cd === '610000');
                org_query.forEach(data=>{
                    if (!ackerton_list.find(data2 => data2.id === data[search_org]) && data[search_org] && data['lv3_ccorg_cd'] === '610000') {
                        let oTemp = {
                            id: data[search_org],
                            name: data[search_org_name],
                            ccorg: data[search_org_ccorg],
                            org_order: data['org_order'],
                            org_tp: data['org_tp'],
                            lv3_ccorg_cd: data['lv3_ccorg_cd']
                        };
                        ackerton_list.push(oTemp);
                        ac_map.push(data[search_org])
                    };
                });
                let ac_pl_where = { ...pl_where, 'lv3_ccorg_cd' : '610000' };

                let ackerton_data = await SELECT.from(pl_view).columns(pl_col_list).where(ac_pl_where).groupBy(...pl_groupBy_cols);

                let ackerton_curr_sum_data = {
                    div_ccorg_cd: ackerton_org.org_ccorg_cd,
                    div_id: ackerton_org.org_id,
                    div_name: ackerton_org.org_name,
                    margin_amount_sum: 0,
                    margin_total_amount_sum: 0,
                    sale_amount_sum: 0,
                    sale_total_amount_sum: 0,
                    year: year
                };

                let ackerton_last_sum_data = {
                    div_ccorg_cd: ackerton_org.org_ccorg_cd,
                    div_id: ackerton_org.org_id,
                    div_name: ackerton_org.org_name,
                    margin_amount_sum: 0,
                    margin_total_amount_sum: 0,
                    sale_amount_sum: 0,
                    sale_total_amount_sum: 0,
                    year: last_year
                };

                //ackerton 하위 리스트
                ackerton_data.forEach(data => {
                    if(data.year === year){
                        ackerton_curr_sum_data.margin_amount_sum += data.margin_amount_sum;
                        ackerton_curr_sum_data.margin_total_amount_sum += data.margin_total_amount_sum;
                        ackerton_curr_sum_data.sale_amount_sum += data.sale_amount_sum;
                        ackerton_curr_sum_data.sale_total_amount_sum += data.sale_total_amount_sum;
                    }else if(data.year === last_year){
                        ackerton_last_sum_data.margin_amount_sum += data.margin_amount_sum;
                        ackerton_last_sum_data.margin_total_amount_sum += data.margin_total_amount_sum;
                        ackerton_last_sum_data.sale_amount_sum += data.sale_amount_sum;
                        ackerton_last_sum_data.sale_total_amount_sum += data.sale_total_amount_sum; 
                    }
                });
                pl_data = pl_data.filter(item=>!ac_map.includes(item[search_org]))
                pl_data.push(ackerton_curr_sum_data);
                pl_data.push(ackerton_last_sum_data);
            };
            
            //조직 리스트
            let org_list = [];
            org_query_data.forEach(data => {
                if (!org_list.find(data2 => data2.id === data[search_org]) && data[search_org]) {
                    let oTemp = {
                        id: data[search_org],
                        name: data[search_org_name],
                        ccorg: data[search_org_ccorg],
                        org_order: data['org_order'],
                        org_tp: data['org_tp'],
                        lv3_ccorg_cd: data['lv3_ccorg_cd']
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

            if((orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2') && org_tp !== 'account'){
                let oTemp = {
                    id: ackerton_org.org_id,
                    name: ackerton_org.org_name,
                    ccorg: ackerton_org.org_ccorg_cd,
                    org_order: ackerton_org.org_order,
                    org_tp: ackerton_org.org_order,
                    lv3_ccorg_cd: ackerton_org.lv3_ccorg_cd
                };
                org_list.push(oTemp);
            };

            // pl_data 결과 값 flat 하게 데이터 구성
            let flat_pl = pl_data.reduce((acc, item) => {
                let main = item[search_org];
                let sub = item['year'];
                let rest = { ...item };
                delete rest[search_org];
                delete rest['year'];
                Object.entries(rest).forEach(([key, value]) => {
                    acc[`_${main}_${sub}_${key}`] = value;
                });
                return acc;
            }, {});

            // pl_data 결과 값 flat 하게 데이터 구성
            let flat_account_pl = account_pl_data.reduce((acc, item) => {
                let main = item[search_org];
                let sub = item['year'];
                let rest = { ...item };
                delete rest[search_org];
                delete rest['year'];
                Object.entries(rest).forEach(([key, value]) => {
                    acc[`_${main}_${sub}_${key}`] = value;
                });
                return acc;
            }, {});

            // target 결과 값 flat 하게 데이터 구성
            let flat_target = target_data.reduce((acc, item) => {
                let main = item['org_id'];
                let rest = { ...item };
                delete rest['org_id'];
                Object.entries(rest).forEach(([key, value]) => {
                    acc[`_${main}_${key}`] = value;
                });
                return acc;
            }, {});

            let i_count = 0
            let total_data = [
                {
                    "display_order": i_count,
                    "org_id": "total",
                    "org_name": (orgInfo.org_level === 'hdqt' || orgInfo.org_level === 'team') ? orgInfo.org_name : '합계',
                    "type": '매출',
                    "target_curr_y_value": flat_target?.[`_${org_id}_target_sale`] ?? 0,
                    "target_last_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                    "actual_curr_ym_value_gap": 0,
                    "actual_curr_ym_rate_gap": 0
                },
                {
                    "display_order": ++i_count,
                    "org_id": "total",
                    "org_name": (orgInfo.org_level === 'hdqt' || orgInfo.org_level === 'team') ? orgInfo.org_name : '합계',
                    "type": '마진',
                    "target_curr_y_value": flat_target?.[`_${org_id}_target_margin`] ?? 0,
                    "target_last_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                    "actual_curr_ym_value_gap": 0,
                    "actual_curr_ym_rate_gap": 0
                },
                {
                    "display_order": ++i_count,
                    "org_id": "total",
                    "org_name": (orgInfo.org_level === 'hdqt' || orgInfo.org_level === 'team') ? orgInfo.org_name : '합계',
                    "type": '마진율',
                    "target_curr_y_value": (flat_target?.[`_${org_id}_target_margin_rate`] ?? 0) / 100,
                    "target_last_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                    "actual_curr_ym_value_gap": 0,
                    "actual_curr_ym_rate_gap": 0
                }
            ];
// return pl_data
            let org_data = [];
            org_list.forEach(data => {
                let pl_view_select;
                if((org_col_nm !== 'lv1_id' || org_col_nm !== 'lv2_id') && data.lv3_ccorg_cd === '237100' || data.org_tp === 'account'){
                    pl_view_select = flat_account_pl;
                }else{
                    pl_view_select = flat_pl;
                };

                let sale_actual_curr_ym_value = (pl_view_select?.[`_${data.id}_${year}_sale_amount_sum`] ?? 0);
                let sale_actual_last_ym_value = (pl_view_select?.[`_${data.id}_${last_year}_sale_amount_sum`] ?? 0);
                let sale_actual_last_y_total_value = (pl_view_select?.[`_${data.id}_${last_year}_sale_total_amount_sum`] ?? 0);
                let sale_data =
                    {
                        "display_order": ++i_count,
                        "org_id": data.id,
                        "org_name": data.name,
                        "type": "매출",
                        "target_curr_y_value": flat_target?.[`_${data.id}_target_sale`] ?? 0,
                        "actual_curr_ym_value": sale_actual_curr_ym_value,
                        "actual_last_ym_value": sale_actual_last_ym_value,
                        "actual_curr_ym_rate": (flat_target?.[`_${data.id}_target_sale`] ?? 0) === 0 ? 0 : sale_actual_curr_ym_value / ((flat_target?.[`_${data.id}_target_sale`] ?? 0)*100000000),
                        "actual_last_ym_rate": sale_actual_last_y_total_value === 0 ? 0 : sale_actual_last_ym_value / sale_actual_last_y_total_value,
                        "actual_curr_ym_value_gap": sale_actual_curr_ym_value - sale_actual_last_ym_value, // 당월 실적 - 전년 동기 실적
                        "actual_curr_ym_rate_gap": ((flat_target?.[`_${data.id}_target_sale`] ?? 0) === 0 ? 0 : sale_actual_curr_ym_value / ((flat_target?.[`_${data.id}_target_sale`] ?? 0)*100000000)) - (sale_actual_last_y_total_value === 0 ? 0 : sale_actual_last_ym_value / sale_actual_last_y_total_value) // 당월 진척도 - 전년 동기 진척도
                    };

                let margin_actual_curr_ym_value = (pl_view_select?.[`_${data.id}_${year}_margin_amount_sum`] ?? 0);
                let margin_actual_last_ym_value = (pl_view_select?.[`_${data.id}_${last_year}_margin_amount_sum`] ?? 0);  
                let margin_actual_last_y_total_value = (pl_view_select?.[`_${data.id}_${last_year}_margin_total_amount_sum`] ?? 0);  
                let margin_data =
                    {
                        "display_order": ++i_count,
                        "org_id": data.id,
                        "org_name": data.name,
                        "type": "마진",
                        "target_curr_y_value": flat_target?.[`_${data.id}_target_margin`] ?? 0,
                        "actual_curr_ym_value": margin_actual_curr_ym_value,
                        "actual_last_ym_value": margin_actual_last_ym_value,
                        "actual_curr_ym_rate": (flat_target?.[`_${data.id}_target_margin`] ?? 0) === 0 ? 0 : margin_actual_curr_ym_value / ((flat_target?.[`_${data.id}_target_margin`] ?? 0) * 100000000),
                        "actual_last_ym_rate": margin_actual_last_y_total_value === 0 ? 0 : margin_actual_last_ym_value / margin_actual_last_y_total_value,
                        "actual_curr_ym_value_gap": margin_actual_curr_ym_value - margin_actual_last_ym_value, // 당월 실적 - 전년 동기 실적
                        "actual_curr_ym_rate_gap": ((flat_target?.[`_${data.id}_target_margin`] ?? 0) === 0 ? 0 : margin_actual_curr_ym_value / ((flat_target?.[`_${data.id}_target_margin`] ?? 0)*100000000)) - (margin_actual_last_y_total_value === 0 ? 0 : margin_actual_last_ym_value / margin_actual_last_y_total_value) // 당월 진척도 - 전년 동기 진척도
                    };

                let margin_rate_curr = sale_actual_curr_ym_value === 0 ? 0 : margin_actual_curr_ym_value / sale_actual_curr_ym_value;
                let margin_rate_last = sale_actual_last_ym_value === 0 ? 0 : margin_actual_last_ym_value / sale_actual_last_ym_value;
                let margin_rate_data =
                    {
                        "display_order": ++i_count,
                        "org_id": data.id,
                        "org_name": data.name,
                        "type": "마진율",
                        "target_curr_y_value": (flat_target?.[`_${data.id}_target_margin_rate`] ?? 0)/100,
                        "actual_curr_ym_value": margin_rate_curr,
                        "actual_last_ym_value": margin_rate_last,
                        "actual_curr_ym_rate": 0,
                        "actual_last_ym_rate": 0,
                        "actual_curr_ym_value_gap": margin_rate_curr - margin_rate_last,
                        "actual_curr_ym_rate_gap": 0
                    };
                org_data.push(sale_data, margin_data, margin_rate_data);
            });
            // return org_data

            let select_data;
            if(org_tp === 'account'){
                select_data = account_pl_data
            }else{
                select_data = pl_data
            }

            select_data.forEach(data=>{
                if(data.year === year){
                    total_data[0].actual_curr_ym_value += data?.sale_amount_sum ?? 0;
                    total_data[1].actual_curr_ym_value += data?.margin_amount_sum ?? 0;
                }else if(data.year === last_year){
                    total_data[0].actual_last_ym_value += data?.sale_amount_sum ?? 0;
                    total_data[1].actual_last_ym_value += data?.margin_amount_sum ?? 0;
                    total_data[0].target_last_y_value += data?.sale_total_amount_sum ?? 0;
                    total_data[1].target_last_y_value += data?.margin_total_amount_sum ?? 0;
                }
            })

            total_data[0].actual_curr_ym_rate = (total_data?.[0]?.target_curr_y_value ?? 0) === 0 ? 0 : (total_data?.[0]?.actual_curr_ym_value ?? 0) / (total_data?.[0]?.target_curr_y_value*100000000);
            total_data[0].actual_last_ym_rate = (total_data?.[0]?.target_last_y_value ?? 0) === 0 ? 0 : (total_data?.[0]?.actual_last_ym_value ?? 0) / (total_data?.[0]?.target_last_y_value);
            total_data[0].actual_curr_ym_value_gap = (total_data?.[0]?.actual_curr_ym_value ?? 0)- (total_data?.[0]?.actual_last_ym_value ?? 0);
            total_data[0].actual_curr_ym_rate_gap = (total_data?.[0]?.actual_curr_ym_rate ?? 0) - (total_data?.[0]?.actual_last_ym_rate ?? 0);

            total_data[1].actual_curr_ym_rate = (total_data?.[1]?.target_curr_y_value ?? 0) === 0 ? 0 : (total_data?.[1]?.actual_curr_ym_value ?? 0) / (total_data?.[1]?.target_curr_y_value*100000000);
            total_data[1].actual_last_ym_rate = (total_data?.[1]?.target_last_y_value ?? 0) === 0 ? 0 : (total_data?.[1]?.actual_last_ym_value ?? 0) / (total_data?.[1]?.target_last_y_value);
            total_data[1].actual_curr_ym_value_gap = (total_data?.[1]?.actual_curr_ym_value ?? 0) - (total_data?.[1]?.actual_last_ym_value ?? 0);
            total_data[1].actual_curr_ym_rate_gap = (total_data?.[1]?.actual_curr_ym_rate ?? 0) - (total_data?.[1]?.actual_last_ym_rate ?? 0);

            total_data[2].target_last_y_value = (total_data?.[0]?.target_last_y_value ?? 0) === 0 ? 0 : (total_data?.[1]?.target_last_y_value ?? 0) / (total_data?.[0]?.target_last_y_value ?? 0);
            total_data[2].actual_curr_ym_value = (total_data?.[0]?.actual_curr_ym_value ?? 0) === 0 ? 0 : (total_data?.[1]?.actual_curr_ym_value ?? 0) / (total_data?.[0]?.actual_curr_ym_value ?? 0);
            total_data[2].actual_last_ym_value = (total_data?.[0]?.actual_last_ym_value ?? 0) === 0 ? 0 : (total_data?.[1]?.actual_last_ym_value ?? 0) / (total_data?.[0]?.actual_last_ym_value ?? 0);
            total_data[2].actual_curr_ym_value_gap = (total_data?.[2]?.actual_curr_ym_value ?? 0) - (total_data?.[2]?.actual_last_ym_value ?? 0);
            total_data[2].actual_curr_ym_rate_gap = (total_data?.[2]?.actual_curr_ym_rate ?? 0) - (total_data?.[2]?.actual_last_ym_rate ?? 0);

            oResult.push(...total_data);
            if (orgInfo.org_level !== 'hdqt' && orgInfo.org_level !== 'team') {
                oResult.push(...org_data);
            }

            /**
             * 조직 예외처리
             */
            // 1. org_level이 lv1 및 lv2일 때, div_ccorg_cd를 기준으로 Ackerton Partners 합치기
            // if (orgInfo.org_level === "lv1" || orgInfo.org_level === "lv2") {
            //     // Ackerton Partners 조직 정보 반환
            //     const db = await cds.connect.to('db');
            //     const org_full_level = db.entities('common').org_full_level_view;
            //     let oAckertonInfo = await SELECT.one.from(org_full_level).where({ 'org_ccorg_cd': '610000' });

            //     for (let i = aResult.length - 1; i >= 0; i--) {
            //         if (oResult[i].div_ccorg_cd === "610000") {

            //         }
            //     }
            // }

            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
}