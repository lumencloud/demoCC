const check_user_auth = require('../../function/check_user_auth');

module.exports = (srv) => {
    srv.on('get_actual_q_account_sale_pl', async (req) => {
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
            //org_tp:account, hybrid일 경우 사용
            const account_pl_view = db.entities('pl').wideview_account_view;
            /**
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;
            const account_org_map = db.entities('common').account_org_map;
            const account_view = db.entities('common').account_view;
            // =================================================================================

            // function 입력 파라미터
            const { year, month, org_id } = req.data;
            const last_year = (Number(year) - 1).toString();

            // QUERY 공통 파라미터 선언
            /**
             * 매출 조회용 SELECT 컬럼
             */
            //쿼터 확인
            let q1 = ['01', '02', '03'];
            let q2 = ['04', '05', '06'];
            let q3 = ['07', '08', '09'];
            let q4 = ['10', '11', '12'];
            let q_month = [];
            if(q1.includes(month)){
                q1.forEach(data=>{ if(Number(data) <= Number(month)){ q_month.push(data) }; });
            }else if(q2.includes(month)){
                q2.forEach(data=>{ if(Number(data) <= Number(month)){ q_month.push(data) }; });
            }else if(q3.includes(month)){
                q3.forEach(data=>{ if(Number(data) <= Number(month)){ q_month.push(data) }; });
            }else if(q4.includes(month)){
                q4.forEach(data=>{ if(Number(data) <= Number(month)){ q_month.push(data) }; });
            };

            //검색 컬럼 생성
            let a_sale_column = [];
            q_month.forEach(data=>{
                a_sale_column.push(`sum(sale_m${Number(data)}_amt)`)
            })
            let s_sale_column = "ifnull(" + a_sale_column.join(' + ') + ',0) as sale_amount_sum';

            const pl_col_list = ['year', 'biz_tp_account_cd', s_sale_column];
            const pl_where_conditions = { 'year': { in: [year, last_year] }, 'src_type': { 'not in': ['WO', 'D'] }, 'biz_tp_account_cd': { '!=': null, and: { 'biz_tp_account_cd': { '!=': '' } } }, 'lv3_ccorg_cd' : '237100' };
            const pl_groupBy_cols = ['year', 'biz_tp_account_cd'];
            // DB 쿼리 실행 (병렬)
            const [pl_data, account_data, account_org_map_data, org_full_level_data] = await Promise.all([
                SELECT.from(account_pl_view).columns(pl_col_list).where(pl_where_conditions).groupBy(...pl_groupBy_cols),
                SELECT.from(account_view).columns(['biz_tp_account_cd', 'biz_tp_account_nm', 'sort_order']),
                SELECT.from(account_org_map).columns(["biz_tp_account_cd", "org_ccorg_cd"]),
                SELECT.from(org_full_level).columns(['org_ccorg_cd', 'org_name', 'org_sort_order'])
            ]);

            //pl 및 rodr 데이터 합계
            let o_data = {};
            account_data.forEach(data=>{
                if(!o_data[data['biz_tp_account_cd']]){
                    o_data[data['biz_tp_account_cd']] = {
                        biz_tp_account_cd:data['biz_tp_account_cd'], 
                        biz_tp_account_nm:data['biz_tp_account_nm'], 
                        sort_order:data['sort_order'],
                        curr_sale:0,
                        last_sale:0,
                    };
                };
                pl_data.forEach(data2=>{
                    if(data['biz_tp_account_cd'] === data2['biz_tp_account_cd']){
                        if(data2.year === year){
                            o_data[data['biz_tp_account_cd']]['curr_sale'] += data2['sale_amount_sum'];
                        }else if(data2.year === last_year){
                            o_data[data['biz_tp_account_cd']]['last_sale'] += data2['sale_amount_sum'];
                        };
                    };
                });
            });
            o_data = Object.values(o_data);

            //account 조직 정리
            let a_acc_org=[];
            account_org_map_data.forEach(data=>{
                const org = org_full_level_data.find(data2=>data.org_ccorg_cd === data2.org_ccorg_cd)
                let temp = data;
                temp.org_sort_order = org.org_sort_order;
                temp.org_name = org.org_name;
                a_acc_org.push(temp);
            });

            a_acc_org.forEach(data=>{
                let acc_data = o_data.find(data2=>data.biz_tp_account_cd === data2.biz_tp_account_cd);
                data.curr_sale = acc_data?.curr_sale ?? 0;
                data.last_sale = acc_data?.last_sale ?? 0;
                data.sale_gap = data.curr_sale - data.last_sale;
                data.acc_sort_order = acc_data.sort_order;
                data.acc_name = acc_data.biz_tp_account_nm.split('. ')[1];
            })
            
            //부문별 합계
            const org_sum = {};
            for(const item of a_acc_org){
                const key = item.org_ccorg_cd;
                if(!org_sum[key]){
                    org_sum[key] = {org_curr_sale_sum:0, org_last_sale_sum:0};
                }
                org_sum[key].org_curr_sale_sum += (item?.curr_sale ?? 0);
                org_sum[key].org_last_sale_sum += (item?.last_sale ?? 0);
            };

            let sum_result = a_acc_org.map(item=>({
                ...item,
                org_curr_sale_sum : org_sum[item.org_ccorg_cd]?.org_curr_sale_sum ?? 0,
                org_last_sale_sum : org_sum[item.org_ccorg_cd]?.org_last_sale_sum ?? 0,
                org_sale_sum_gap : (org_sum[item.org_ccorg_cd]?.org_curr_sale_sum ?? 0) - (org_sum[item.org_ccorg_cd]?.org_last_sale_sum ?? 0)
            }))

            // 정렬
            let a_sort_field = [
                { field: "org_sort_order", order: "asc" },
                { field: "acc_sort_order", order: "asc" },
            ];
            sum_result.sort((oItem1, oItem2) => {
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

            oResult.push(...sum_result);
            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true}
        } 
    });
}