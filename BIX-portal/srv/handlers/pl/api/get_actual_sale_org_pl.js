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
            let orgInfo = await SELECT.one.from(org_full_level).columns(['org_level', 'org_ccorg_cd', 'org_name', 'org_tp', 'lv3_ccorg_cd']).where({ 'org_id': org_id });

            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            //조직 정보를 where 조건에 추가
            let org_col_nm = orgInfo.org_level + '_ccorg_cd';
            
            let search_org, search_org_name, search_org_ccorg, child_level;
            const pl_col_list = ['year', 'lv3_ccorg_cd', sale_sum_col, sale_sum_total_col, margin_sum_col, margin_sum_total_col];
            if (orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2' || orgInfo.org_level === 'lv3') {
                search_org = 'div_id';
                search_org_name = 'div_name';
                search_org_ccorg = 'div_ccorg_cd';
                child_level = 'div';
            } else if (orgInfo.org_level === 'div') {
                search_org = 'hdqt_id';
                search_org_name = 'hdqt_name';
                search_org_ccorg = 'hdqt_ccorg_cd';
                child_level = 'hdqt';
            } else if (orgInfo.org_level === 'hdqt') {
                search_org = 'team_id';
                search_org_name = 'team_name';
                search_org_ccorg = 'team_ccorg_cd';
                child_level = 'team';
            } else { return; };
            let aAddList = [search_org, search_org_name, search_org_ccorg];

            /**
             * 매출 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            pl_col_list.push(...aAddList);
            const pl_where_conditions = { 'year': { in: [year, last_year] } };
            let account_pl_where = (orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2') ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: orgInfo.org_ccorg_cd };
            let pl_where = (orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2') ? { ...pl_where_conditions, 'org_tp':'delivery' } : { ...pl_where_conditions, [org_col_nm]: orgInfo.org_ccorg_cd };
            const pl_groupBy_cols = ['year', 'lv3_ccorg_cd', search_org, search_org_name, search_org_ccorg];

            // DB 쿼리 실행 (병렬)
            const [pl_data, account_pl_data, target_data, org_query] = await Promise.all([
                SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy_cols),
                SELECT.from(account_pl_view).columns(pl_col_list).where(account_pl_where).groupBy(...pl_groupBy_cols),
                get_org_target(year, ['A01', 'A03', 'A02']),
                SELECT.from(org_full_level)
            ]);

            if(display_type !== 'chart' &&!pl_data.length && !account_pl_data.length){
                //return req.res.status(204).send();
                return []
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
                    
                    if(orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2'){
                        if(!ackerton_list.find(data3 => data3 === oTemp.ccorg) && data.org_tp === org_tp){
                            org_list.push(oTemp);
                        };
                    }else{
                        org_list.push(oTemp);
                    }
                };
            });

            //1, 2레벨 검색시 ackerton 데이터 수집
            let ackerton_org, ackerton_data;
            if((orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2') && org_tp !== 'account'){
                ackerton_org = org_query.find(data=>data.org_ccorg_cd === '610000');
                org_list.push({
                    id: ackerton_org['org_id'],
                    name: ackerton_org['org_name'],
                    ccorg: ackerton_org['org_ccorg_cd'],
                    org_order: ackerton_org['org_order'],
                    org_tp: ackerton_org['org_tp']
                });

                ackerton_data = {
                    id:ackerton_org['org_id'], ccorg: ackerton_org['org_ccorg_cd'], name:ackerton_org['org_name'], 
                    curr_sale_ym_value : 0, last_sale_ym_value:0, curr_sale_y_total_value : 0, last_sale_y_total_value:0, 
                    curr_margin_ym_value : 0, last_margin_ym_value:0, curr_margin_y_total_value : 0, last_margin_y_total_value:0
                };
            };

            //합계용 데이터 베이스 준비
            let total_target = target_data.find(data2=>data2.org_ccorg_cd === orgInfo.org_ccorg_cd);
            let total_data = [
                {
                    "display_order": 0,
                    "org_order": "001",
                    "org_id": "total",
                    "org_name": (orgInfo.org_level === 'hdqt' || orgInfo.org_level === 'team') ? orgInfo.org_name : '합계',
                    "type": '매출',
                    "target_curr_y_value": total_target?.target_sale ?? 0,
                    "target_last_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                    "actual_curr_ym_value_gap": 0,
                    "actual_curr_ym_rate_gap": 0
                },
                {
                    "display_order": 1,
                    "org_order": "001",
                    "org_id": "total",
                    "org_name": (orgInfo.org_level === 'hdqt' || orgInfo.org_level === 'team') ? orgInfo.org_name : '합계',
                    "type": '마진',
                    "target_curr_y_value": total_target?.target_margin ?? 0,
                    "target_last_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                    "actual_curr_ym_value_gap": 0,
                    "actual_curr_ym_rate_gap": 0
                },
                {
                    "display_order": 2,
                    "org_order": "001",
                    "org_id": "total",
                    "org_name": (orgInfo.org_level === 'hdqt' || orgInfo.org_level === 'team') ? orgInfo.org_name : '합계',
                    "type": '마진율',
                    "target_curr_y_value": (total_target?.target_margin_rate ?? 0) / 100,
                    "target_last_y_value": 0,
                    "actual_curr_ym_value": 0,
                    "actual_last_ym_value": 0,
                    "actual_curr_ym_rate": 0,
                    "actual_last_ym_rate": 0,
                    "actual_curr_ym_value_gap": 0,
                    "actual_curr_ym_rate_gap": 0
                }
            ];

            //delivery용 데이터
            let o_pl_data = {};
            if(pl_data?.length && ((orgInfo.org_level !== 'lv1' && orgInfo.org_level !== 'lv2' && orgInfo.lv3_ccorg_cd!=='237100') || ((orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2') && org_tp === 'delivery'))){
                pl_data.forEach(data=>{
                    if(!o_pl_data[data[search_org_ccorg]]){
                        o_pl_data[data[search_org_ccorg]] = {id:data[search_org], ccorg: data[search_org_ccorg], name:data[search_org_name], 
                        curr_sale_ym_value : 0, last_sale_ym_value:0, curr_sale_y_total_value : 0, last_sale_y_total_value:0, 
                        curr_margin_ym_value : 0, last_margin_ym_value:0, curr_margin_y_total_value : 0, last_margin_y_total_value:0};
                    };

                    if(data.year === year){
                        o_pl_data[data[search_org_ccorg]].curr_sale_ym_value += data?.sale_amount_sum ?? 0;
                        o_pl_data[data[search_org_ccorg]].curr_sale_y_total_value += data?.sale_total_amount_sum ?? 0;
                        o_pl_data[data[search_org_ccorg]].curr_margin_ym_value += data?.margin_amount_sum ?? 0;
                        o_pl_data[data[search_org_ccorg]].curr_margin_y_total_value += data?.margin_total_amount_sum ?? 0;

                        total_data[0].actual_curr_ym_value += data?.sale_amount_sum ?? 0;
                        total_data[1].actual_curr_ym_value += data?.margin_amount_sum ?? 0;
                    }else if(data.year === last_year){
                        o_pl_data[data[search_org_ccorg]].last_sale_ym_value += data?.sale_amount_sum ?? 0;
                        o_pl_data[data[search_org_ccorg]].last_sale_y_total_value += data?.sale_total_amount_sum ?? 0;
                        o_pl_data[data[search_org_ccorg]].last_margin_ym_value += data?.margin_amount_sum ?? 0;
                        o_pl_data[data[search_org_ccorg]].last_margin_y_total_value += data?.margin_total_amount_sum ?? 0;

                        total_data[0].actual_last_ym_value += data?.sale_amount_sum ?? 0;
                        total_data[1].actual_last_ym_value += data?.margin_amount_sum ?? 0;
                        total_data[0].target_last_y_value += data?.sale_total_amount_sum ?? 0;
                        total_data[1].target_last_y_value += data?.margin_total_amount_sum ?? 0;
                    };

                    if(data.lv3_ccorg_cd === '610000' && (orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2') && org_tp === 'delivery'){
                        if(data.year === year){
                            ackerton_data.curr_sale_ym_value += data?.sale_amount_sum ?? 0;
                            ackerton_data.curr_sale_y_total_value += data?.sale_total_amount_sum ?? 0;
                            ackerton_data.curr_margin_ym_value += data?.margin_amount_sum ?? 0;
                            ackerton_data.curr_margin_y_total_value += data?.margin_total_amount_sum ?? 0;
                        }else if(data.year === last_year){
                            ackerton_data.last_sale_ym_value += data?.sale_amount_sum ?? 0;
                            ackerton_data.last_sale_y_total_value += data?.sale_total_amount_sum ?? 0;
                            ackerton_data.last_margin_ym_value += data?.margin_amount_sum ?? 0;
                            ackerton_data.last_margin_y_total_value += data?.margin_total_amount_sum ?? 0;
                        };
                    };
                })
            }
            let a_pl_data = Object.values(o_pl_data);
            if((orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2') && org_tp !== 'account'){
                a_pl_data.push(ackerton_data);
            };

            //account용 데이터
            let o_account_pl_data = {};
            if(account_pl_data?.length && (((orgInfo.org_level === 'lv1' || orgInfo.org_level === 'lv2') && org_tp === 'account') || orgInfo.lv3_ccorg_cd ==='237100')){
                account_pl_data.forEach(data=>{
                    if(!o_account_pl_data[data[search_org_ccorg]]){
                        o_account_pl_data[data[search_org_ccorg]] = {id:data[search_org], ccorg: data[search_org_ccorg], name:data[search_org_name], 
                        curr_sale_ym_value : 0, last_sale_ym_value:0, curr_sale_y_total_value : 0, last_sale_y_total_value:0, 
                        curr_margin_ym_value : 0, last_margin_ym_value:0, curr_margin_y_total_value : 0, last_margin_y_total_value:0};
                    };

                    if(data.year === year){
                        o_account_pl_data[data[search_org_ccorg]].curr_sale_ym_value += data?.sale_amount_sum ?? 0;
                        o_account_pl_data[data[search_org_ccorg]].curr_sale_y_total_value += data?.sale_total_amount_sum ?? 0;
                        o_account_pl_data[data[search_org_ccorg]].curr_margin_ym_value += data?.margin_amount_sum ?? 0;
                        o_account_pl_data[data[search_org_ccorg]].curr_margin_y_total_value += data?.margin_total_amount_sum ?? 0;

                        total_data[0].actual_curr_ym_value += data?.sale_amount_sum ?? 0;
                        total_data[1].actual_curr_ym_value += data?.margin_amount_sum ?? 0;
                    }else if(data.year === last_year){
                        o_account_pl_data[data[search_org_ccorg]].last_sale_ym_value += data?.sale_amount_sum ?? 0;
                        o_account_pl_data[data[search_org_ccorg]].last_sale_y_total_value += data?.sale_total_amount_sum ?? 0;
                        o_account_pl_data[data[search_org_ccorg]].last_margin_ym_value += data?.margin_amount_sum ?? 0;
                        o_account_pl_data[data[search_org_ccorg]].last_margin_y_total_value += data?.margin_total_amount_sum ?? 0;

                        total_data[0].actual_last_ym_value += data?.sale_amount_sum ?? 0;
                        total_data[1].actual_last_ym_value += data?.margin_amount_sum ?? 0;
                        total_data[0].target_last_y_value += data?.sale_total_amount_sum ?? 0;
                        total_data[1].target_last_y_value += data?.margin_total_amount_sum ?? 0;
                    };
                })
            }
            let a_account_pl_data = Object.values(o_account_pl_data);

            total_data[0].actual_curr_ym_rate = (total_data[0]?.target_curr_y_value ?? 0) === 0 ? 0 : (total_data[0]?.actual_curr_ym_value ?? 0) / (total_data[0]?.target_curr_y_value*100000000);
            total_data[0].actual_last_ym_rate = (total_data[0]?.target_last_y_value ?? 0) === 0 ? 0 : (total_data[0]?.actual_last_ym_value ?? 0) / (total_data[0]?.target_last_y_value);
            total_data[0].actual_curr_ym_value_gap = (total_data[0]?.actual_curr_ym_value ?? 0)- (total_data[0]?.actual_last_ym_value ?? 0);
            total_data[0].actual_curr_ym_rate_gap = (total_data[0]?.actual_curr_ym_rate ?? 0) - (total_data[0]?.actual_last_ym_rate ?? 0);

            total_data[1].actual_curr_ym_rate = (total_data[1]?.target_curr_y_value ?? 0) === 0 ? 0 : (total_data[1]?.actual_curr_ym_value ?? 0) / (total_data[1]?.target_curr_y_value*100000000);
            total_data[1].actual_last_ym_rate = (total_data[1]?.target_last_y_value ?? 0) === 0 ? 0 : (total_data[1]?.actual_last_ym_value ?? 0) / (total_data[1]?.target_last_y_value);
            total_data[1].actual_curr_ym_value_gap = (total_data[1]?.actual_curr_ym_value ?? 0) - (total_data[1]?.actual_last_ym_value ?? 0);
            total_data[1].actual_curr_ym_rate_gap = (total_data[1]?.actual_curr_ym_rate ?? 0) - (total_data[1]?.actual_last_ym_rate ?? 0);

            total_data[2].target_last_y_value = (total_data[0]?.target_last_y_value ?? 0) === 0 ? 0 : (total_data[1]?.target_last_y_value ?? 0) / (total_data[0]?.target_last_y_value ?? 0);
            total_data[2].actual_curr_ym_value = (total_data[0]?.actual_curr_ym_value ?? 0) === 0 ? 0 : (total_data[1]?.actual_curr_ym_value ?? 0) / (total_data[0]?.actual_curr_ym_value ?? 0);
            total_data[2].actual_last_ym_value = (total_data[0]?.actual_last_ym_value ?? 0) === 0 ? 0 : (total_data[1]?.actual_last_ym_value ?? 0) / (total_data[0]?.actual_last_ym_value ?? 0);
            total_data[2].actual_curr_ym_value_gap = (total_data[2]?.actual_curr_ym_value ?? 0) - (total_data[2]?.actual_last_ym_value ?? 0);
            total_data[2].actual_curr_ym_rate_gap = (total_data[2]?.actual_curr_ym_rate ?? 0) - (total_data[2]?.actual_last_ym_rate ?? 0);
            
            //최종 데이터 만들기
            let i_count = 0;
            let org_data =[];
            org_list.forEach(data=>{
                let select_data;
                if((org_tp==='account' || orgInfo.lv3_ccorg_cd === '237100') && data.org_tp !== 'delivery'){
                    select_data = a_account_pl_data.find(data2=>data2.ccorg === data.ccorg);
                }else{
                    select_data = a_pl_data.find(data2=>data2.ccorg === data.ccorg);
                };
                let target = target_data.find(data2=>data2.org_ccorg_cd === data.ccorg);

                let sale_actual_curr_ym_value = select_data?.curr_sale_ym_value ?? 0;
                let sale_actual_last_ym_value = select_data?.last_sale_ym_value ?? 0;
                let sale_actual_last_y_total_value = select_data?.last_sale_y_total_value ?? 0;

                let sale_data =
                    {
                        "display_order": ++i_count,
                        "org_order": data.org_order,
                        "org_id": data.id,
                        "org_name": data.name,
                        "type": "매출",
                        "target_curr_y_value": target?.target_sale??0,
                        "actual_curr_ym_value": sale_actual_curr_ym_value,
                        "actual_last_ym_value": sale_actual_last_ym_value,
                        "actual_curr_ym_rate": (target?.target_sale??0) === 0 ? 0 : sale_actual_curr_ym_value / ((target?.target_sale??0)*100000000),
                        "actual_last_ym_rate": sale_actual_last_y_total_value === 0 ? 0 : sale_actual_last_ym_value / sale_actual_last_y_total_value,
                        "actual_curr_ym_value_gap": sale_actual_curr_ym_value - sale_actual_last_ym_value, // 당월 실적 - 전년 동기 실적
                        "actual_curr_ym_rate_gap": ((target?.target_sale??0) === 0 ? 0 : sale_actual_curr_ym_value / ((target?.target_sale??0)*100000000)) - (sale_actual_last_y_total_value === 0 ? 0 : sale_actual_last_ym_value / sale_actual_last_y_total_value) // 당월 진척도 - 전년 동기 진척도
                    };

                let margin_actual_curr_ym_value = select_data?.curr_margin_ym_value ?? 0;
                let margin_actual_last_ym_value = select_data?.last_margin_ym_value ?? 0;
                let margin_actual_last_y_total_value = select_data?.last_margin_y_total_value ?? 0;
                let margin_data =
                    {
                        "display_order": ++i_count,
                        "org_order": data.org_order,
                        "org_id": data.id,
                        "org_name": data.name,
                        "type": "마진",
                        "target_curr_y_value": target?.target_margin??0,
                        "actual_curr_ym_value": margin_actual_curr_ym_value,
                        "actual_last_ym_value": margin_actual_last_ym_value,
                        "actual_curr_ym_rate": (target?.target_margin??0) === 0 ? 0 : margin_actual_curr_ym_value / ((target?.target_margin??0) * 100000000),
                        "actual_last_ym_rate": margin_actual_last_y_total_value === 0 ? 0 : margin_actual_last_ym_value / margin_actual_last_y_total_value,
                        "actual_curr_ym_value_gap": margin_actual_curr_ym_value - margin_actual_last_ym_value, // 당월 실적 - 전년 동기 실적
                        "actual_curr_ym_rate_gap": ((target?.target_margin??0) === 0 ? 0 : margin_actual_curr_ym_value / ((target?.target_margin??0)*100000000)) - (margin_actual_last_y_total_value === 0 ? 0 : margin_actual_last_ym_value / margin_actual_last_y_total_value) // 당월 진척도 - 전년 동기 진척도
                    };

                let margin_rate_curr = sale_actual_curr_ym_value === 0 ? 0 : margin_actual_curr_ym_value / sale_actual_curr_ym_value;
                let margin_rate_last = sale_actual_last_ym_value === 0 ? 0 : margin_actual_last_ym_value / sale_actual_last_ym_value;
                let margin_rate_data =
                    {
                        "display_order": ++i_count,
                        "org_order": data.org_order,
                        "org_id": data.id,
                        "org_name": data.name,
                        "type": "마진율",
                        "target_curr_y_value": (target?.target_margin_rate??0)/100,
                        "actual_curr_ym_value": margin_rate_curr,
                        "actual_last_ym_value": margin_rate_last,
                        "actual_curr_ym_rate": 0,
                        "actual_last_ym_rate": 0,
                        "actual_curr_ym_value_gap": margin_rate_curr - margin_rate_last,
                        "actual_curr_ym_rate_gap": 0
                    };
                org_data.push(sale_data, margin_data, margin_rate_data);
            })

            oResult.push(...total_data);
            if (orgInfo.org_level !== 'hdqt' && orgInfo.org_level !== 'team') {
                oResult.push(...org_data);
            }

            //값이 모두0이면 빈배열 리턴
            const chk_zero = oResult.every(data=>!data.target_curr_y_value && !data.actual_curr_ym_value && !data.actual_last_ym_value );
            if(chk_zero){ return []; };

            //정렬
            let a_sort_field = [
                { field: "org_order", order: "asc" },
                { field: "display_order", order: "asc" },
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